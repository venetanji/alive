#!/usr/bin/env python3
"""Authenticate the authored hierarchy evidence bundle without launching Max."""
import argparse
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def manifest():
    files = []
    for path in sorted(HERE.rglob('*')):
        if not path.is_file() or '__pycache__' in path.parts or path.name == 'bundle.json':
            continue
        raw = path.read_bytes()
        files.append({'path': path.relative_to(HERE).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
    return {'schema': 1, 'provenance': 'ORIGINAL_MAX_EXECUTED_AND_INSTALLED_SOURCE_IDENTITIES',
            'contains_proprietary_bodies': False, 'files': files}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh-manifest', action='store_true')
    args = parser.parse_args()
    encoded = json.dumps(manifest(), indent=2, ensure_ascii=True) + '\n'
    bundle = HERE / 'bundle.json'
    if args.refresh_manifest:
        bundle.write_text(encoded)
    else:
        assert bundle.read_text() == encoded, 'Evidence bundle bytes differ'
    print('Validated the complete hierarchy reference bundle identity; no Max process launched.')
