#!/usr/bin/env python3
"""Authenticate the authored hierarchy evidence bundle without launching Max."""
import argparse
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def manifest(root=HERE):
    files = []
    for path in sorted(root.rglob('*')):
        if not path.is_file() or '__pycache__' in path.parts or path.name == 'bundle.json':
            continue
        raw = path.read_bytes()
        files.append({'path': path.relative_to(root).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
    return {'schema': 1, 'provenance': 'ORIGINAL_MAX_EXECUTED_AND_INSTALLED_SOURCE_IDENTITIES',
            'contains_proprietary_bodies': False, 'files': files}


def validate(root=HERE, allow_unavailable=False):
    bundle = root / 'bundle.json'
    # Authored generators are public; these are local oracle outputs. A partial
    # output is an error, never grounds for treating modified evidence as absent.
    oracle_paths = ['sources.json', 'summary.json', 'results',
                    'fixtures/hierarchy.maxpat', 'fixtures/hierarchy.score.json',
                    'fixtures/boundary.maxpat', 'fixtures/boundary.score.json']
    if bundle.is_symlink():
        raise AssertionError('Hierarchy oracle bundle must be a regular file')
    if not bundle.exists():
        present = [name for name in oracle_paths if (root / name).exists() or (root / name).is_symlink()]
        present.extend(str(path.relative_to(root)) for pattern in ['*.maxpat', '*.score.json']
                       for path in (root / 'fixtures').glob(pattern) if str(path.relative_to(root)) not in present)
        if allow_unavailable and not present:
            return {'status': 'UNAVAILABLE', 'oracle_executed': False,
                    'reason': 'Optional local hierarchy oracle bundle is not published; no comparison performed.'}
        raise AssertionError('Hierarchy oracle bundle missing or incomplete: ' + ', '.join(present))
    assert not any(path.is_symlink() for path in root.rglob('*')), 'Oracle evidence symlinks are not allowed'
    encoded = json.dumps(manifest(root), indent=2, ensure_ascii=True) + '\n'
    assert bundle.read_text() == encoded, 'Evidence bundle bytes differ'
    return {'status': 'IDENTITY_VERIFIED', 'oracle_executed': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh-manifest', action='store_true')
    parser.add_argument('--allow-unavailable', action='store_true',
                        help='Report a wholly absent optional oracle bundle; partial or changed evidence still fails')
    args = parser.parse_args()
    if args.refresh_manifest:
        (HERE / 'bundle.json').write_text(json.dumps(manifest(), indent=2, ensure_ascii=True) + '\n')
    result = validate(allow_unavailable=args.allow_unavailable)
    if result['status'] == 'IDENTITY_VERIFIED':
        from summarize import summarize
        encoded = json.dumps(summarize(), indent=2, ensure_ascii=True) + '\n'
        assert (HERE / 'summary.json').read_text() == encoded, 'Summary differs from raw captures'
        result['status'] = 'RETAINED_CAPTURE_VERIFIED'
    print(json.dumps(result))
