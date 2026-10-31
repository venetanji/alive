#!/usr/bin/env python3
"""Collect bounded, failure-only evidence about this checkout's mounted DMGs."""
import argparse
from dataclasses import dataclass
import os
from pathlib import Path
import plistlib
import selectors
import signal
import subprocess
import time
from xml.parsers.expat import ExpatError

TARGETS = {'aarch64-apple-darwin', 'x86_64-apple-darwin'}
TOOL_LIMIT = 1024 * 1024
REPORT_LIMIT = 256 * 1024


@dataclass
class Result:
    out: bytes
    err: bytes
    status: str
    code: int | None


def run_command(args, deadline, budget):
    if budget <= 0:
        return Result(b'', b'', 'truncated output', None)
    end = min(deadline, time.monotonic() + 5)
    if end <= time.monotonic():
        return Result(b'', b'', 'timeout', None)
    try:
        proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                start_new_session=True, stdin=subprocess.DEVNULL)
    except FileNotFoundError:
        return Result(b'', b'', 'missing tool', None)
    except PermissionError:
        return Result(b'', b'', 'permission error', None)
    except OSError:
        return Result(b'', b'', 'tool error', None)
    buffers = [bytearray(), bytearray()]
    status = 'ok'
    sel = selectors.DefaultSelector()
    try:
        for index, pipe in enumerate((proc.stdout, proc.stderr)):
            os.set_blocking(pipe.fileno(), False)
            sel.register(pipe, selectors.EVENT_READ, index)
        while sel.get_map():
            remaining = end - time.monotonic()
            if remaining <= 0:
                status = 'timeout'
                break
            events = sel.select(remaining)
            if not events:
                status = 'timeout'
                break
            for key, _ in events:
                remaining_bytes = budget - sum(map(len, buffers))
                chunk = os.read(key.fileobj.fileno(), min(65536, remaining_bytes + 1))
                if not chunk:
                    sel.unregister(key.fileobj)
                else:
                    buffers[key.data].extend(chunk[:remaining_bytes])
                    if len(chunk) > remaining_bytes:
                        status = 'truncated output'
                        break
            if status != 'ok':
                break
        if status == 'ok':
            try:
                proc.wait(timeout=max(0, end - time.monotonic()))
            except subprocess.TimeoutExpired:
                status = 'timeout'
        if status == 'ok' and proc.returncode:
            status = ('permission error' if b'permission denied' in buffers[1].lower()
                      or b'operation not permitted' in buffers[1].lower() else 'tool error')
    finally:
        # Terminate the owned process group even if a descendant inherited a pipe.
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        sel.close()
        proc.stdout.close()
        proc.stderr.close()
        try:
            proc.wait(timeout=max(0, end - time.monotonic()))
        except subprocess.TimeoutExpired:
            pass
    return Result(bytes(buffers[0]), bytes(buffers[1]), status, proc.returncode)


def select_mounts(data, root, target):
    if target not in TARGETS:
        return [], 'invalid target'
    try:
        info = plistlib.loads(data)
        images = info['images']
        if not isinstance(images, list):
            raise ValueError()
    except (ValueError, KeyError, TypeError, plistlib.InvalidFileException, OverflowError, ExpatError, AttributeError):
        return [], 'invalid plist'
    root = root.resolve()
    bases = [root / 'apps' / product / 'src-tauri/target' / target / 'release/bundle'
             for product in ('ultra', 'alive')]
    mounts = []
    for item in images:
        if not isinstance(item, dict):
            continue
        image = item.get('image-path')
        if not isinstance(image, str) or not Path(image).is_absolute():
            continue
        path = Path(image).resolve()
        if not any(base.resolve() == base and path != base
                   and path.is_relative_to(base) for base in bases):
            continue
        entities = item.get('system-entities', [])
        if not isinstance(entities, list):
            continue
        for entity in entities:
            mount = entity.get('mount-point') if isinstance(entity, dict) else None
            if isinstance(mount, str) and mount and Path(mount).is_absolute():
                mounts.append((image, mount))
    return mounts, 'ok'


def parse_lsof(data, mount):
    pid = command = descriptor = ''
    lines = []
    base = Path(mount)
    for raw in data.split(b'\0'):
        field = raw.lstrip(b'\n').decode('utf-8', 'replace')
        if not field:
            continue
        kind, value = field[0], field[1:]
        if kind == 'p':
            pid, command, descriptor = value, '', ''
        elif kind == 'c':
            command = value
        elif kind == 'f':
            descriptor = value
        elif kind == 'n' and pid and command and descriptor:
            path = Path(value)
            if path.is_absolute() and (path == base or path.is_relative_to(base)) and '..' not in path.parts:
                lines.append(f'{pid} {command} {descriptor} {value}')
    return '\n'.join(lines)


def collect(root, target, runner=run_command):
    deadline = time.monotonic() + 25
    budget = TOOL_LIMIT
    lines = ['DMG failure diagnostic; all results are inconclusive.']
    def run(args):
        nonlocal budget
        result = runner(args, deadline, budget)
        budget -= len(result.out) + len(result.err)
        return result
    result = run(['hdiutil', 'info', '-plist'])
    lines.append(f'hdiutil: {result.status}; exit={result.code}; stderr={'present (redacted)' if result.err else 'empty'}')
    if result.status != 'ok':
        return '\n'.join(lines) + '\n'
    mounts, status = select_mounts(result.out, root, target)
    if status != 'ok':
        lines.append(status)
    elif not mounts:
        lines.append('no remaining matching mount')
    else:
        if len(mounts) > 3:
            lines.append('probe limit reached; remaining mounts omitted')
        for image, mount in mounts[:3]:
            lines.append(f'image: {image}\nmount: {mount}')
            result = run(['lsof', '-n', '-P', '-F0pcfn', '--', mount])
            lines.append(f'lsof: {result.status}; exit={result.code}; stderr={'present (redacted)' if result.err else 'empty'}')
            lines.append(parse_lsof(result.out, mount) or 'no matching open files observed')
    report = '\n'.join(lines) + '\n'
    encoded = report.encode('utf-8')
    if len(encoded) > REPORT_LIMIT:
        marker = b'\nreport truncated; inconclusive\n'
        return (encoded[:REPORT_LIMIT - len(marker)].decode('utf-8', 'ignore') + marker.decode())
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', required=True, choices=sorted(TARGETS))
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    report = collect(Path(__file__).resolve().parents[3], args.target)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report, encoding='utf-8')


if __name__ == '__main__':
    main()
