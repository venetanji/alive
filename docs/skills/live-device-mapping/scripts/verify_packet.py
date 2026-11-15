#!/usr/bin/env python3
"""Verify an offline Live-device evidence packet without invoking REA or a DLL."""

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys


AUTHORITIES = {
    "rea-static", "native-runtime", "host-runtime", "installed-resource",
    "authored-analysis", "test-report",
}
STATUSES = {"observed", "inferred", "unknown", "contradicted"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def string(value, label, maximum=4096):
    require(isinstance(value, str) and 0 < len(value) <= maximum, f"invalid {label}")
    return value


def identifier(value, label):
    string(value, label, 100)
    require(re.fullmatch(r"[A-Za-z0-9_.-]+", value), f"invalid {label}")
    return value


def records(value, label, allow_empty=False):
    require(isinstance(value, list) and len(value) <= 4096, f"invalid {label}")
    require(allow_empty or bool(value), f"empty {label}")
    return value


def object_pairs(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"duplicate JSON key: {key}")
        result[key] = value
    return result


def invalid_constant(value):
    raise ValueError(f"nonfinite JSON constant: {value}")


def index_records(rows, label):
    indexed = {}
    for row in records(rows, label):
        require(isinstance(row, dict), f"invalid {label} record")
        key = identifier(row.get("id"), f"{label} id")
        require(key not in indexed, f"duplicate {label} id: {key}")
        indexed[key] = row
    return indexed


def verify_identity(path, row, label):
    count, expected = row.get("bytes"), row.get("sha256")
    require(type(count) is int and 0 <= count <= 2**31, f"invalid byte count: {label}")
    require(isinstance(expected, str) and re.fullmatch(r"[a-f0-9]{64}", expected),
            f"invalid SHA-256: {label}")
    require(path.is_file(), f"missing regular file: {label}")
    require(path.stat().st_size == count, f"identity mismatch: {label}")
    digest = hashlib.sha256()
    with path.open("rb") as source:
        remaining = count
        while remaining:
            chunk = source.read(min(1024 * 1024, remaining))
            require(bool(chunk), f"identity mismatch: {label}")
            digest.update(chunk)
            remaining -= len(chunk)
        require(not source.read(1), f"identity mismatch: {label}")
    require(digest.hexdigest() == expected, f"identity mismatch: {label}")


def verify_packet(manifest):
    manifest = Path(manifest).resolve(strict=True)
    require(manifest.is_file() and manifest.stat().st_size <= 2 * 1024 * 1024,
            "manifest exceeds 2 MiB")
    raw = manifest.read_bytes()
    data = json.loads(raw, object_pairs_hook=object_pairs, parse_constant=invalid_constant)
    require(isinstance(data, dict), "manifest must be an object")
    require(data.get("schema") == "live-device-evidence-v1", "unsupported packet schema")
    device = string(data.get("device"), "device", 100)
    require(type(data.get("revision")) is int and data["revision"] > 0, "invalid revision")
    acquisition = data.get("acquisition")
    require(isinstance(acquisition, dict), "invalid acquisition")
    string(acquisition.get("owner"), "acquisition owner", 100)
    require(acquisition.get("rea_status") in {"exported-and-closed", "not-needed"},
            "rea_status must declare exported-and-closed or not-needed before dispatch")

    artifacts = index_records(data.get("artifacts"), "artifacts")
    files = index_records(data.get("files"), "files")
    require(any(row.get("kind") == "dsp-dll" for row in artifacts.values()),
            "packet requires a dsp-dll artifact")
    for key, row in artifacts.items():
        string(row.get("kind"), f"artifact kind: {key}", 100)
        path = Path(string(row.get("path"), f"artifact path: {key}"))
        require(path.is_absolute(), f"artifact path must be absolute: {key}")
        verify_identity(path, row, f"artifact {key}")

    seen_paths = set()
    for key, row in files.items():
        value = string(row.get("path"), f"file path: {key}")
        relative = PurePosixPath(value)
        require(not relative.is_absolute() and "\\" not in value
                and all(part not in {"", ".", ".."} for part in value.split("/")),
                f"file requires a safe relative path: {key}")
        path = (manifest.parent / value).resolve(strict=True)
        require(path.is_relative_to(manifest.parent), f"file escapes packet directory: {key}")
        require(path != manifest and path not in seen_paths, f"duplicate payload path: {key}")
        seen_paths.add(path)
        require(row.get("authority") in AUTHORITIES, f"invalid authority: {key}")
        for source_id in records(row.get("artifact_ids"), f"artifact_ids: {key}"):
            require(isinstance(source_id, str) and source_id in artifacts,
                    f"unknown artifact reference: {key}")
        if row["authority"] == "rea-static":
            for evidence_id in records(row.get("evidence_ids"), f"evidence_ids: {key}"):
                require(isinstance(evidence_id, str) and re.fullmatch(r"ev_[a-f0-9]+", evidence_id),
                        f"invalid REA evidence id: {key}")
        verify_identity(path, row, f"file {key}")

    findings = index_records(data.get("findings"), "findings")
    for key, finding in findings.items():
        require(finding.get("status") in STATUSES, f"invalid finding status: {key}")
        string(finding.get("claim"), f"finding claim: {key}")
        ids = records(finding.get("file_ids"), f"finding file_ids: {key}",
                      allow_empty=finding["status"] == "unknown")
        for file_id in ids:
            require(isinstance(file_id, str) and file_id in files,
                    f"unknown file reference in finding: {key}")
        for limitation in records(finding.get("limitations"), f"limitations: {key}", True):
            string(limitation, f"limitation: {key}")
    for unknown in records(data.get("unknowns"), "unknowns", True):
        string(unknown, "unknown")
    return {
        "device": device, "revision": data["revision"],
        "manifest_sha256": hashlib.sha256(raw).hexdigest(),
        "artifact_count": len(artifacts), "file_count": len(files),
        "finding_count": len(findings),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(verify_packet(args.manifest), sort_keys=True))
    except (ValueError, OSError, RecursionError) as error:
        print(f"Packet verification failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
