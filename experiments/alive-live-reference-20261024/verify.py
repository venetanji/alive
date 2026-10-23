#!/usr/bin/env python3
"""Verify retained research evidence without launching Live, Wine or audio."""
import hashlib
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'evidence-manifest.json').read_text())
for row in manifest['files']:
    path = ROOT / row['path']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256'], path
    assert path.stat().st_size == row['bytes'], path
    if path.suffix == '.png':
        raw = path.read_bytes()
        assert raw[:8] == b'\x89PNG\r\n\x1a\n'
        assert struct.unpack('>II', raw[16:24]) == (1440, 1000)
inventory = json.loads((ROOT / 'artifact-inventory.json').read_text())
for row in [inventory['executable'], inventory['analog_library'], *inventory['devices']]:
    path = Path(row['path'])
    if path.exists():
        assert hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256'], path
cleanup = json.loads((ROOT / 'cleanup.json').read_text())
session = json.loads((ROOT / 'session.json').read_text())
assert cleanup['preferences_unchanged']
assert cleanup['preferences_after'] == session['preferences_before']
assert not cleanup['owned_processes_after']
assert cleanup['xvfb_exited'] and cleanup['prefix_removed']
assert not Path(session['prefix']).exists()
assert not any(path.suffix in {'.adv', '.adg', '.als', '.dll', '.exe', '.wav'} for path in ROOT.iterdir())
print(json.dumps(dict(pass_=True, files=len(manifest['files']),
                     screenshots=sum(row['path'].endswith('.png') for row in manifest['files']),
                     original_preferences_unchanged=True, owned_prefix_removed=True)))
