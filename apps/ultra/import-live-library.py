#!/usr/bin/env python3
"""Inventory installed native artifacts and publish coordinator-qualified devices."""
import argparse
from collections import defaultdict
from contextlib import contextmanager
from dataclasses import dataclass
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import selectors
import signal
import stat
import struct
import subprocess
import sys
import tempfile
import time


SCHEMA = "ultra-live-library-import-v1"
REGISTRY_SCHEMA = "ultra-live-device-qualifications-v1"
STAGES = ("construction", "initialization", "audio", "mapping", "editor",
          "state", "instances", "lifecycle", "timing", "alive")
DSP_EXPORTS = {"CalcA", "CreateInstanceU", "DestroyInstanceU", "GetPlugInfoU",
               "ResetA", "SetParameterA", "SetSampleRateU"}
NATIVE_SUFFIXES = {".dll", ".mxe64", ".node", ".vst3"}
JSON_LIMIT = 2 * 1024 * 1024
ID_PATTERN = re.compile(r"[a-z0-9][a-z0-9._-]{0,47}\Z")
HASH_PATTERN = re.compile(r"[a-f0-9]{64}\Z")


class ImportFailure(ValueError):
    pass


class BudgetFailure(ImportFailure):
    pass


@dataclass(frozen=True)
class Limits:
    depth: int = 32
    entries: int = 100000
    file_bytes: int = 512 * 1024 * 1024
    total_bytes: int = 4 * 1024 * 1024 * 1024


class Budget:
    def __init__(self, limits):
        self.limits = limits
        self.bytes_read = 0

    def read(self, handle, count):
        if count > self.limits.total_bytes - self.bytes_read:
            raise BudgetFailure("total read byte limit exhausted")
        data = handle.read(count)
        self.bytes_read += len(data)
        return data


def fingerprint(metadata):
    return (metadata.st_dev, metadata.st_ino, metadata.st_size,
            metadata.st_mtime_ns, metadata.st_ctime_ns)


def absolute(path):
    return Path(os.path.abspath(os.fspath(path)))


def reject_symlink_ancestors(path):
    for item in reversed((path, *path.parents)):
        if item.is_symlink():
            raise ImportFailure(f"symlink path is not allowed: {item}")


def relative_path(value):
    if (not isinstance(value, str) or not 1 <= len(value) <= 1024
            or "\\" in value or any(ord(char) < 32 for char in value)):
        raise ImportFailure("invalid relative artifact path")
    parsed = PurePosixPath(value)
    if (not parsed.parts or parsed.is_absolute() or parsed.as_posix() != value
            or any(part in (".", "..") for part in parsed.parts)):
        raise ImportFailure("unsafe relative artifact path")
    return parsed.parts


@contextmanager
def installed_file(root, relative):
    parts = relative_path(relative)
    descriptor = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in parts[:-1]:
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                            dir_fd=descriptor)
            os.close(descriptor)
            descriptor = child
        child = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK,
                        dir_fd=descriptor)
        with os.fdopen(child, "rb") as handle:
            if not stat.S_ISREG(os.fstat(handle.fileno()).st_mode):
                raise ImportFailure("artifact is not a regular file")
            yield handle
    finally:
        os.close(descriptor)


def digest_file(handle, budget):
    before = os.fstat(handle.fileno())
    if before.st_size > budget.limits.file_bytes:
        raise BudgetFailure("individual file byte limit exceeded")
    handle.seek(0)
    digest = hashlib.sha256()
    remaining = before.st_size
    while remaining:
        data = budget.read(handle, min(65536, remaining))
        if not data:
            raise ImportFailure("file was truncated during hashing")
        digest.update(data)
        remaining -= len(data)
    if fingerprint(before) != fingerprint(os.fstat(handle.fileno())):
        raise ImportFailure("file changed during hashing")
    return before.st_size, digest.hexdigest(), fingerprint(before)


class PEReader:
    def __init__(self, handle, budget):
        self.handle, self.budget = handle, budget
        self.size = os.fstat(handle.fileno()).st_size

    def read(self, offset, count):
        if offset < 0 or count < 0 or offset > self.size - count:
            raise ImportFailure("PE record outside file bounds")
        self.handle.seek(offset)
        data = self.budget.read(self.handle, count)
        if len(data) != count:
            raise ImportFailure("truncated PE record")
        return data

    def integer(self, offset, width=4):
        return int.from_bytes(self.read(offset, width), "little")

    def parse(self):
        if self.read(0, 2) != b"MZ":
            raise ImportFailure("not an MZ image")
        pe = self.integer(0x3C)
        if self.read(pe, 4) != b"PE\0\0":
            raise ImportFailure("missing PE signature")
        machine, count, _, _, _, optional_size, flags = struct.unpack(
            "<HHIIIHH", self.read(pe + 4, 20))
        if not 1 <= count <= 96:
            raise ImportFailure("unsupported PE section count")
        optional = pe + 24
        magic = self.integer(optional, 2)
        directory_offset, number_offset = {0x20B: (112, 108), 0x10B: (96, 92)}.get(
            magic, (None, None))
        if directory_offset is None or optional_size < directory_offset + 8:
            raise ImportFailure("unsupported or truncated PE optional header")
        self.read(optional, optional_size)
        headers = self.integer(optional + 60)
        sections = []
        for index in range(count):
            row = self.read(optional + optional_size + index * 40, 40)
            virtual_size, rva, raw_size, offset = struct.unpack_from("<IIII", row, 8)
            if raw_size and offset > self.size - raw_size:
                raise ImportFailure("PE section exceeds file bounds")
            sections.append((rva, max(virtual_size, raw_size), offset, raw_size))

        def locate(rva, size):
            matches = [(offset + rva - base, raw_size - (rva - base))
                       for base, span, offset, raw_size in sections
                       if base <= rva < base + span and rva - base <= raw_size - size]
            if rva < headers and rva <= self.size - size and rva <= headers - size:
                matches.append((rva, min(headers, self.size) - rva))
            if len(matches) != 1:
                raise ImportFailure("unmapped or ambiguous PE export RVA")
            return matches[0]

        def string(rva):
            offset, available = locate(rva, 1)
            result = bytearray()
            while len(result) < min(available, 1024):
                chunk = self.read(offset + len(result), min(64, available - len(result),
                                                          1024 - len(result)))
                if b"\0" in chunk:
                    result.extend(chunk.split(b"\0", 1)[0])
                    try:
                        return result.decode("ascii")
                    except UnicodeDecodeError as error:
                        raise ImportFailure("non-ASCII PE export name") from error
                result.extend(chunk)
            raise ImportFailure("unterminated or oversized PE export name")

        exports = []
        if self.integer(optional + number_offset):
            export_rva, export_size = struct.unpack("<II", self.read(optional + directory_offset, 8))
            if export_rva:
                if export_size < 40:
                    raise ImportFailure("truncated PE export directory")
                start, _ = locate(export_rva, 40)
                _, functions, names, function_table, name_table, ordinal_table = struct.unpack(
                    "<IIIIII", self.read(start + 16, 24))
                if names > 65536 or functions > 65536 or names > functions:
                    raise ImportFailure("PE export count exceeds bounds")
                if names:
                    names_offset, _ = locate(name_table, names * 4)
                    ordinals_offset, _ = locate(ordinal_table, names * 2)
                    functions_offset, _ = locate(function_table, functions * 4)
                    for index in range(names):
                        ordinal = self.integer(ordinals_offset + index * 2, 2)
                        if ordinal >= functions or not self.integer(functions_offset + ordinal * 4):
                            raise ImportFailure("invalid PE export ordinal or function")
                        name = string(self.integer(names_offset + index * 4))
                        if not name:
                            raise ImportFailure("empty PE export name")
                        exports.append(name)
                if len(exports) != len(set(exports)):
                    raise ImportFailure("duplicate PE export names")
        return {"format": "PE32+" if magic == 0x20B else "PE32",
                "architecture": {0x8664: "x86_64", 0x14C: "x86", 0xAA64: "arm64"}.get(
                    machine, f"machine-{machine:04x}"),
                "dll": bool(flags & 0x2000), "exports": sorted(exports)}


def classify(path, pe):
    if not pe["dll"]:
        return "executable", "PE executable; not an independently callable device DLL"
    if pe["architecture"] != "x86_64":
        return "unsupported-architecture", "native device adapter requires x86-64"
    exports = set(pe["exports"])
    if DSP_EXPORTS <= exports:
        return "standalone-device", "seven-export DSP candidate; qualification is separate"
    if "ext_main" in exports:
        name = PurePosixPath(path).name.lower()
        if name.startswith("abl.device."):
            return "max-device", "complete-device candidate requiring a qualified Max backend"
        if name.startswith("abl.dsp."):
            return "max-dsp-block", "lower-level Max DSP block; not a complete device"
        return "max-external", "Max external; no complete-device identity established"
    return "support-dll", "no recognized musical-device export boundary"


def scan_installation(root, budget):
    result = {"complete": True, "entries_visited": 0, "bytes_read": 0,
              "limits": vars(budget.limits), "errors": []}
    binaries = []

    def issue(path, message):
        result["complete"] = False
        result["errors"].append({"path": path, "reason": str(message)})

    def walk(descriptor, prefix, depth):
        remaining = budget.limits.entries - result["entries_visited"]
        with os.scandir(descriptor) as iterator:
            children = []
            for child in iterator:
                if len(children) >= remaining:
                    issue(prefix or ".", "filesystem entry limit exhausted")
                    break
                children.append(child.name)
        for name in sorted(children):
            if result["entries_visited"] >= budget.limits.entries:
                issue(prefix or ".", "filesystem entry limit exhausted")
                break
            result["entries_visited"] += 1
            relative = f"{prefix}/{name}" if prefix else name
            try:
                metadata = os.stat(name, dir_fd=descriptor, follow_symlinks=False)
                if stat.S_ISLNK(metadata.st_mode):
                    issue(relative, "symlink rejected; target was not followed")
                elif stat.S_ISDIR(metadata.st_mode):
                    if depth >= budget.limits.depth:
                        issue(relative, "directory depth limit exhausted")
                        continue
                    child = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                                    dir_fd=descriptor)
                    try:
                        walk(child, relative, depth + 1)
                    finally:
                        os.close(child)
                elif stat.S_ISREG(metadata.st_mode):
                    if metadata.st_size > budget.limits.file_bytes:
                        issue(relative, "individual file byte limit exceeded")
                        continue
                    child = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK,
                                    dir_fd=descriptor)
                    with os.fdopen(child, "rb") as handle:
                        if not stat.S_ISREG(os.fstat(handle.fileno()).st_mode):
                            raise ImportFailure("file type changed during discovery")
                        initial = budget.read(handle, min(4, metadata.st_size))
                        if initial[:2] != b"MZ" and Path(name).suffix.lower() not in NATIVE_SUFFIXES:
                            continue
                        size, digest, identity = digest_file(handle, budget)
                        item = {"path": relative, "bytes": size, "sha256": digest,
                                "format": "unknown", "architecture": "unknown", "exports": []}
                        if initial[:2] == b"MZ":
                            try:
                                item.update(PEReader(handle, budget).parse())
                                item["classification"], item["reason"] = classify(relative, item)
                            except BudgetFailure:
                                raise
                            except ImportFailure as error:
                                item.update(classification="malformed-pe", reason=str(error))
                        else:
                            item["format"] = "ELF" if initial == b"\x7fELF" else "unknown"
                            item.update(classification="unsupported-format",
                                        reason="not a supported Windows PE image")
                        if fingerprint(os.fstat(handle.fileno())) != identity:
                            raise ImportFailure("file changed during PE inspection")
                        binaries.append(item)
                else:
                    issue(relative, "nonregular filesystem entry rejected")
            except BudgetFailure as error:
                issue(relative, error)
                if "total" in str(error):
                    raise
            except (OSError, ImportFailure) as error:
                issue(relative, error)

    descriptor = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        try:
            walk(descriptor, "", 0)
        except BudgetFailure:
            pass
    finally:
        os.close(descriptor)
    result["bytes_read"] = budget.bytes_read
    return result, sorted(binaries, key=lambda item: item["path"])


def json_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ImportFailure(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def parse_json(data):
    if len(data) > JSON_LIMIT:
        raise ImportFailure("JSON byte limit exceeded")

    def invalid_constant(value):
        raise ImportFailure(f"nonfinite JSON constant: {value}")

    try:
        value = json.loads(data, object_pairs_hook=json_object, parse_constant=invalid_constant)
        remaining = 200000
        pending = [(value, 0)]
        while pending:
            item, depth = pending.pop()
            remaining -= 1
            if depth > 64 or remaining < 0:
                raise ImportFailure("JSON structural limit exceeded")
            if isinstance(item, float) and not math.isfinite(item):
                raise ImportFailure("nonfinite JSON number")
            if isinstance(item, dict):
                if len(item) > remaining:
                    raise ImportFailure("JSON structural limit exceeded")
                pending.extend((child, depth + 1) for child in item.values())
            elif isinstance(item, list):
                if len(item) > remaining:
                    raise ImportFailure("JSON structural limit exceeded")
                pending.extend((child, depth + 1) for child in item)
        return value
    except (UnicodeError, ValueError, RecursionError) as error:
        raise ImportFailure(f"invalid JSON: {error}") from error


def bounded_bytes(path, maximum=JSON_LIMIT):
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, "rb") as handle:
        if not stat.S_ISREG(os.fstat(handle.fileno()).st_mode):
            raise ImportFailure("expected a regular file")
        data = handle.read(maximum + 1)
    if len(data) > maximum:
        raise ImportFailure("file byte limit exceeded")
    return data


def load_registry(path):
    registry = parse_json(bounded_bytes(path))
    if (not isinstance(registry, dict) or set(registry) != {"schema", "profiles"}
            or registry["schema"] != REGISTRY_SCHEMA
            or not isinstance(registry["profiles"], list) or len(registry["profiles"]) > 128):
        raise ImportFailure("unsupported qualification registry")
    seen = set()
    for profile in registry["profiles"]:
        if (not isinstance(profile, dict) or set(profile) != {
                "id", "device", "class", "artifacts", "stages", "evidence", "generator"}):
            raise ImportFailure("invalid qualification profile fields")
        identifier = profile["id"]
        if not isinstance(identifier, str) or not ID_PATTERN.fullmatch(identifier) or identifier in seen:
            raise ImportFailure("unsafe or duplicate profile ID")
        seen.add(identifier)
        if (not isinstance(profile["device"], str) or not 1 <= len(profile["device"]) <= 100
                or any(ord(char) < 32 for char in profile["device"])
                or profile["class"] not in ("instrument", "audioEffect")
                or profile["generator"] != "export-live-device.mjs"):
            raise ImportFailure("invalid device identity, class or fixed generator")
        stages = profile["stages"]
        if (not isinstance(stages, dict) or set(stages) != set(STAGES)
                or any(not isinstance(value, str) or value not in {"passed", "failed", "partial", "unrun"}
                       for value in stages.values())):
            raise ImportFailure("invalid or incomplete qualification stage declarations")
        evidence = profile["evidence"]
        if (not isinstance(evidence, list) or not 1 <= len(evidence) <= 64
                or any(not isinstance(value, str) or not value.strip() or len(value) > 4096
                       for value in evidence)):
            raise ImportFailure("nonempty bounded qualification evidence references are required")
        artifacts = profile["artifacts"]
        if not isinstance(artifacts, list) or not 1 <= len(artifacts) <= 64:
            raise ImportFailure("invalid artifact list")
        paths = set()
        for artifact in artifacts:
            if not isinstance(artifact, dict) or set(artifact) != {"path", "bytes", "sha256"}:
                raise ImportFailure("invalid artifact identity fields")
            relative_path(artifact["path"])
            if artifact["path"] in paths:
                raise ImportFailure("duplicate profile artifact path")
            paths.add(artifact["path"])
            if (type(artifact["bytes"]) is not int or not 0 <= artifact["bytes"] <= 2 * 1024**3
                    or not isinstance(artifact["sha256"], str)
                    or not HASH_PATTERN.fullmatch(artifact["sha256"])):
                raise ImportFailure("invalid artifact byte count or SHA-256")
    return registry


def verify_artifacts(root, profile, budget):
    errors = []
    for artifact in profile["artifacts"]:
        try:
            with installed_file(root, artifact["path"]) as handle:
                if os.fstat(handle.fileno()).st_size != artifact["bytes"]:
                    raise ImportFailure("artifact byte count changed")
                size, digest, _ = digest_file(handle, budget)
                if size != artifact["bytes"] or digest != artifact["sha256"]:
                    raise ImportFailure("artifact SHA-256 changed")
        except (OSError, ImportFailure) as error:
            errors.append(f"{artifact['path']}: {error}")
    return errors


def qualify(root, registry, binaries, budget):
    by_path = {item["path"]: item for item in binaries}
    results = []
    for profile in registry["profiles"]:
        reasons = [f"{stage}: {profile['stages'][stage]}" for stage in STAGES
                   if profile["stages"][stage] != "passed"]
        result = {"id": profile["id"], "device": profile["device"], "class": profile["class"],
                  "stages": profile["stages"], "evidence": profile["evidence"],
                  "status": "unqualified" if reasons else "eligible", "reasons": reasons}
        errors = verify_artifacts(root, profile, budget)
        if not any(artifact["path"] in by_path and by_path[artifact["path"]].get("dll")
                   and by_path[artifact["path"]]["architecture"] == "x86_64"
                   and by_path[artifact["path"]]["classification"] != "malformed-pe"
                   for artifact in profile["artifacts"]):
            errors.append("profile has no discovered valid x86-64 PE DLL artifact")
        if errors:
            result["status"] = "artifact-mismatch"
            result["reasons"].extend(errors)
        results.append(result)
    return results


def canonical_json(value):
    return (json.dumps(value, sort_keys=True, ensure_ascii=True, separators=(",", ":"),
                       allow_nan=False) + "\n").encode("utf-8")


def saved_document(data, profile):
    value = parse_json(data)
    if (not isinstance(value, dict) or value.get("version") != 1
            or value.get("profile") != "ultra-canvas-v1"
            or not isinstance(value.get("nodes"), list) or not value["nodes"]
            or not isinstance(value.get("edges"), list)
            or not isinstance(value.get("presentation"), dict)
            or not isinstance(value["presentation"].get("items"), list)
            or not isinstance(value.get("device"), dict)
            or value["device"].get("version") != 2
            or value["device"].get("kind") != profile["class"]):
        raise ImportFailure("generator did not return a saved Ultra device document")
    # Semantic graph/profile validation belongs to the fixed shared exporter.
    encoded = canonical_json(value)
    if len(encoded) > JSON_LIMIT:
        raise ImportFailure("canonical saved device byte limit exceeded")
    return encoded


def run_generator(helper, request, timeout):
    process = subprocess.Popen(["node", str(helper)], stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               start_new_session=True)
    buffers = {"stdout": bytearray(), "stderr": bytearray()}
    pending = canonical_json(request)
    selector = selectors.DefaultSelector()
    for stream, label, event in [(process.stdin, "stdin", selectors.EVENT_WRITE),
                                  (process.stdout, "stdout", selectors.EVENT_READ),
                                  (process.stderr, "stderr", selectors.EVENT_READ)]:
        os.set_blocking(stream.fileno(), False)
        selector.register(stream, event, label)
    deadline = time.monotonic() + timeout
    try:
        while selector.get_map():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise ImportFailure("fixed generator timed out")
            for key, _ in selector.select(min(remaining, 0.1)):
                if key.data == "stdin":
                    try:
                        written = os.write(key.fd, pending)
                        pending = pending[written:]
                    except BrokenPipeError:
                        pending = b""
                    if not pending:
                        selector.unregister(key.fileobj)
                        key.fileobj.close()
                    continue
                data = os.read(key.fd, 65536)
                if not data:
                    selector.unregister(key.fileobj)
                    key.fileobj.close()
                else:
                    buffer = buffers[key.data]
                    buffer.extend(data)
                    if len(buffer) > (JSON_LIMIT if key.data == "stdout" else 65536):
                        raise ImportFailure(f"fixed generator {key.data} byte limit exceeded")
        try:
            code = process.wait(timeout=max(0.001, deadline - time.monotonic()))
        except subprocess.TimeoutExpired as error:
            raise ImportFailure("fixed generator timed out") from error
        if code:
            detail = buffers["stderr"].decode("utf-8", errors="replace")[:1024]
            raise ImportFailure(f"fixed generator exited {code}: {detail}")
        return bytes(buffers["stdout"])
    finally:
        selector.close()
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGKILL)
        process.wait()
        for stream in (process.stdin, process.stdout, process.stderr):
            if not stream.closed:
                stream.close()


def output_path(path, installation):
    path = absolute(path)
    reject_symlink_ancestors(path)
    if path == installation or installation in path.parents:
        raise ImportFailure("outputs must be outside the read-only Live installation")
    return path


def sync_directory(path):
    descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


@contextmanager
def library_lock(destination):
    destination.mkdir(parents=True, exist_ok=True)
    reject_symlink_ancestors(destination)
    directory = os.open(destination, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    descriptor = None
    try:
        descriptor = os.open(".live-library.lock",
                             os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW | os.O_NONBLOCK,
                             0o600, dir_fd=directory)
        if not stat.S_ISREG(os.fstat(descriptor).st_mode):
            raise ImportFailure("library lock is not a regular file")
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise ImportFailure("library is busy; another importer holds the lock") from error
        yield directory
    finally:
        if descriptor is not None:
            os.close(descriptor)
        os.close(directory)


def check_destination(destination, directory):
    reject_symlink_ancestors(destination)
    current, locked = destination.stat(), os.fstat(directory)
    if (current.st_dev, current.st_ino) != (locked.st_dev, locked.st_ino):
        raise ImportFailure("library destination changed during import")


def publish_one(destination, directory, root, profile, helper, helper_digest, budget, timeout):
    check_destination(destination, directory)
    errors = verify_artifacts(root, profile, budget)
    if errors:
        raise ImportFailure("inputs changed before publication: " + "; ".join(errors))
    revision = hashlib.sha256(canonical_json({"profile": profile,
        "installation": str(root), "helperSha256": helper_digest, "pipeline": SCHEMA})).hexdigest()
    prefix = f"{profile['id']}-{revision}-"
    existing = []
    with os.scandir(directory) as iterator:
        for count, entry in enumerate(iterator):
            if count >= budget.limits.entries:
                raise ImportFailure("library entry limit exhausted")
            if entry.name.startswith(prefix) and entry.name.endswith(".ultra"):
                existing.append(entry.name)
    if len(existing) > 1:
        raise ImportFailure("multiple files occupy this immutable generated revision")
    if existing:
        name = existing[0]
        path = destination / name
        expected = name[len(prefix):-6]
        if not HASH_PATTERN.fullmatch(expected):
            raise ImportFailure("unsafe occupied generated revision; preserved existing path")
        descriptor = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
        with os.fdopen(descriptor, "rb") as handle:
            if not stat.S_ISREG(os.fstat(handle.fileno()).st_mode):
                raise ImportFailure("occupied generated revision is not a regular file")
            data = handle.read(JSON_LIMIT + 1)
        if len(data) > JSON_LIMIT:
            raise ImportFailure("occupied generated revision exceeds byte limit")
        if hashlib.sha256(data).hexdigest() != expected:
            raise ImportFailure("generated revision was edited; existing user file preserved")
        saved_document(data, profile)
        return {"profile": profile["id"], "status": "unchanged", "path": str(path),
                "sha256": expected, "input_revision": revision}
    request = {"device": profile["device"], "profile": profile["id"],
               "installation": str(root), "resources": str(root / "Resources")}
    generated = saved_document(run_generator(helper, request, timeout), profile)
    errors = verify_artifacts(root, profile, budget)
    if errors:
        raise ImportFailure("inputs changed during generation: " + "; ".join(errors))
    if hashlib.sha256(bounded_bytes(helper)).hexdigest() != helper_digest:
        raise ImportFailure("fixed generator changed during generation")
    check_destination(destination, directory)
    digest = hashlib.sha256(generated).hexdigest()
    target = destination / f"{prefix}{digest}.ultra"
    stage = ".live-library-stage-" + secrets.token_hex(16)
    created = False
    try:
        descriptor = os.open(stage, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW,
                             0o600, dir_fd=directory)
        created = True
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(generated)
            stream.flush()
            os.fsync(stream.fileno())
        # link publishes a complete staged inode atomically and never replaces a user path.
        os.link(stage, target.name, src_dir_fd=directory, dst_dir_fd=directory,
                follow_symlinks=False)
        os.fsync(directory)
    finally:
        if created:
            os.unlink(stage, dir_fd=directory)
    return {"profile": profile["id"], "status": "published", "path": str(target),
            "sha256": digest, "input_revision": revision}


def publish(destination, root, registry, results, budget, timeout):
    eligible = {item["id"] for item in results if item["status"] == "eligible"}
    if not eligible:
        return []
    outcomes = []
    try:
        destination = output_path(destination, root)
        helper = Path(__file__).resolve().with_name("export-live-device.mjs")
        reject_symlink_ancestors(helper)
        helper_digest = hashlib.sha256(bounded_bytes(helper)).hexdigest()
        with library_lock(destination) as directory:
            for profile in registry["profiles"]:
                if profile["id"] not in eligible:
                    continue
                try:
                    outcomes.append(publish_one(destination, directory, root, profile, helper, helper_digest,
                                                budget, timeout))
                except (OSError, ImportFailure) as error:
                    outcomes.append({"profile": profile["id"], "status": "failed", "reason": str(error)})
    except (OSError, ImportFailure) as error:
        outcomes.extend({"profile": identifier, "status": "failed", "reason": str(error)}
                        for identifier in sorted(eligible))
    return outcomes


def atomic_report(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    reject_symlink_ancestors(path)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".live-inventory-", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        sync_directory(path.parent)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def arguments(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("installation", type=Path, help="installed Live root containing Resources and Program")
    data_home = os.environ.get("XDG_DATA_HOME")
    default = Path(data_home) if data_home and Path(data_home).is_absolute() else Path.home() / ".local/share"
    parser.add_argument("--library", type=Path, default=default / "alive/devices")
    parser.add_argument("--registry", type=Path,
                        default=Path(__file__).resolve().with_name("live-device-qualifications.json"))
    parser.add_argument("--dry-run", action="store_true", help="inventory and qualify declarations; do not generate or publish")
    parser.add_argument("--report", type=Path, help="also write the inventory JSON atomically outside the installation")
    parser.add_argument("--max-depth", type=int, default=32)
    parser.add_argument("--max-entries", type=int, default=100000)
    parser.add_argument("--max-file-bytes", type=int, default=512 * 1024 * 1024)
    parser.add_argument("--max-total-bytes", type=int, default=4 * 1024**3)
    parser.add_argument("--generator-timeout", type=float, default=30)
    args = parser.parse_args(argv)
    limits = Limits(args.max_depth, args.max_entries, args.max_file_bytes, args.max_total_bytes)
    if (not 0 <= limits.depth <= 64 or not 1 <= limits.entries <= 100000
            or not 1 <= limits.file_bytes <= 512 * 1024 * 1024
            or not 1 <= limits.total_bytes <= 4 * 1024**3
            or not 0 < args.generator_timeout <= 30):
        raise ImportFailure("limits must be positive and cannot exceed documented maximums")
    return args, limits


def main(argv=None):
    report = {"schema": SCHEMA}
    report_path = None
    try:
        args, limits = arguments(argv)
        root = absolute(args.installation)
        reject_symlink_ancestors(root)
        if not root.is_dir():
            raise ImportFailure("installation must be an existing real directory")
        if args.report:
            candidate = output_path(args.report, root)
            if candidate.suffix.lower() == ".ultra":
                raise ImportFailure("inventory reports cannot use the playable .ultra extension")
            report_path = candidate
        registry = load_registry(args.registry)
        budget = Budget(limits)
        scan, binaries = scan_installation(root, budget)
        groups = defaultdict(list)
        for item in binaries:
            groups[item["sha256"]].append(item["path"])
        results = qualify(root, registry, binaries, budget)
        publication = []
        if scan["complete"] and not args.dry_run:
            publication = publish(args.library, root, registry, results, budget, args.generator_timeout)
        scan["bytes_read"] = budget.bytes_read
        report.update(installation=str(root), dry_run=args.dry_run, scan=scan, binaries=binaries,
                      duplicate_content=[{"sha256": digest, "paths": paths}
                                         for digest, paths in sorted(groups.items()) if len(paths) > 1],
                      profiles=results, publication=publication)
        code = int(not scan["complete"] or any(item["status"] == "artifact-mismatch" for item in results)
                   or any(item["status"] == "failed" for item in publication))
    except (OSError, ImportFailure) as error:
        report["error"] = str(error)
        code = 2
    data = json.dumps(report, sort_keys=True, indent=2, ensure_ascii=True, allow_nan=False).encode() + b"\n"
    if report_path is not None:
        try:
            atomic_report(report_path, data)
        except (OSError, ImportFailure) as error:
            report["error"] = f"cannot write inventory report: {error}"
            data = canonical_json(report)
            code = 2
    sys.stdout.buffer.write(data)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
