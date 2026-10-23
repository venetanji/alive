#!/usr/bin/env python3
"""Regenerate/check notices using Cargo's complete, unfiltered locked metadata."""
import argparse
import json
from pathlib import Path
import subprocess
import tomllib

APP = Path(__file__).resolve().parents[1]
INVENTORY = APP/'THIRD-PARTY-CRATES.json'


def inventory(metadata, app=APP):
    root = tomllib.loads((app/'src-tauri/Cargo.toml').read_text())['package']['name']
    lock = tomllib.loads((app/'src-tauri/Cargo.lock').read_text())
    locked = {(p['name'], p['version']): p for p in lock['package'] if p['name'] != root}
    packages = []
    for p in metadata['packages']:
        if p['name'] == root:
            continue
        key = p['name'], p['version']
        if key not in locked:
            raise ValueError(f'Metadata package absent from lock: {key}')
        source = p['source']
        if source is None:
            # Retain the local fork identity instead of claiming it is the registry crate.
            crate_source = Path(p['manifest_path']).parent.relative_to(app).as_posix()
        elif source.startswith('registry+'):
            crate_source = f"https://crates.io/crates/{p['name']}/{p['version']}"
        else:
            crate_source = source
        packages.append({
            'name': p['name'], 'version': p['version'], 'license': p['license'],
            'license_file': Path(p['license_file']).name if p['license_file'] else None,
            'repository': p['repository'], 'crate_source': crate_source,
            'checksum': locked[key].get('checksum'),
        })
    actual = {(p['name'], p['version']) for p in packages}
    if actual != set(locked) or len(actual) != len(packages):
        raise ValueError(f'Incomplete metadata: missing {sorted(set(locked) - actual)}')
    return {
        'scope': 'Complete locked Rust app dependency graph across all platforms, including build and target-specific packages; excludes the first-party root package. Not proof each package is linked; upstream files control actual terms. Clockwork native component provenance is in THIRD-PARTY.txt.',
        'generator': 'python apps/ultra/scripts/notices.py --write (cargo metadata --locked --format-version 1, without target filtering)',
        'packages': sorted(packages, key=lambda p: (p['name'], p['version'])),
    }


def validate(app=APP):
    metadata = json.loads(subprocess.check_output([
        'cargo', 'metadata', '--manifest-path', str(app/'src-tauri/Cargo.toml'),
        '--locked', '--format-version', '1'], text=True))
    expected = inventory(metadata, app)
    if json.loads((app/'THIRD-PARTY-CRATES.json').read_text()) != expected:
        raise ValueError('Third-party inventory is stale; run python apps/ultra/scripts/notices.py --write')
    return expected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    if args.write:
        metadata = json.loads(subprocess.check_output([
            'cargo', 'metadata', '--manifest-path', str(APP/'src-tauri/Cargo.toml'),
            '--locked', '--format-version', '1'], text=True))
        INVENTORY.write_text(json.dumps(inventory(metadata), indent=2) + '\n')
    else:
        validate()

if __name__ == '__main__':
    main()
