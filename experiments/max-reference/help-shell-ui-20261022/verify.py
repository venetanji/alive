#!/usr/bin/env python3
"""Verify retained hashes, PNG framing/compression, finite actions and cleanup."""
import hashlib
import json
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'manifest.json').read_text())
for item in manifest['files']:
    path = ROOT / item['path']
    data = path.read_bytes()
    assert len(data) == item['bytes']
    assert hashlib.sha256(data).hexdigest() == item['sha256'], path
    if path.suffix == '.json':
        json.loads(data)
    if path.suffix == '.png':
        assert data[:8] == b'\x89PNG\r\n\x1a\n'
        assert struct.unpack('>II', data[16:24]) == (1440, 1000)
        offset, compressed, finished = 8, bytearray(), False
        while offset < len(data):
            length = struct.unpack('>I', data[offset:offset+4])[0]
            kind, payload = data[offset+4:offset+8], data[offset+8:offset+8+length]
            crc = struct.unpack('>I', data[offset+8+length:offset+12+length])[0]
            assert zlib.crc32(kind + payload) == crc
            if kind == b'IDAT':
                compressed.extend(payload)
            offset += 12 + length
            if kind == b'IEND':
                finished = True
                break
        assert finished and offset == len(data) and zlib.decompress(compressed)

events = json.loads((ROOT / 'results/events.json').read_text())
assert [row['stage'] for row in events if 'action' not in row] == ['initial', 'question', 'basic-return']
assert len([row for row in events if row.get('action') == 'click']) == 2
environment = json.loads((ROOT / 'environment.json').read_text())
assert not environment['remaining_prefix_processes']
assert not Path(environment['session']['prefix']).exists()
print(json.dumps({'files_verified': len(manifest['files']), 'screenshots': 3, 'pointer_actions': 2,
                  'remaining_prefix_processes': 0, 'disposable_prefix_removed': True}))
