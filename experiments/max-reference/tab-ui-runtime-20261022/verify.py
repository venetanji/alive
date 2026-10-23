#!/usr/bin/env python3
"""Verify retained original sources, bounded rows and screenshot integrity."""
import hashlib
import json
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'manifest.json').read_text())
for item in manifest['files']:
    path = ROOT / item['path']
    assert path.stat().st_size == item['bytes'], path
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], path
    if path.suffix == '.png':
        data = path.read_bytes()
        assert data[:8] == b'\x89PNG\r\n\x1a\n', path
        assert struct.unpack('>II', data[16:24]) == (1440, 1000), path
        offset, compressed, finished = 8, bytearray(), False
        while offset < len(data):
            length = struct.unpack('>I', data[offset:offset+4])[0]
            kind = data[offset+4:offset+8]
            payload = data[offset+8:offset+8+length]
            crc = struct.unpack('>I', data[offset+8+length:offset+12+length])[0]
            assert zlib.crc32(kind + payload) == crc, path
            if kind == b'IDAT':
                compressed.extend(payload)
            offset += 12 + length
            if kind == b'IEND':
                finished = True
                break
        assert finished and offset == len(data) and zlib.decompress(compressed), path
    if path.suffix == '.json':
        json.loads(path.read_text())

expected = {'root-hidden': 8, 'root-shown': 8, 'order-reversed': 8,
            'position-swapped': 10, 'nested-parent-hidden': 10,
            'isolated-root-shown': 10, 'isolated-nesting': 10, 'isolated-local': 10}
for fixture, count in expected.items():
    rows = json.loads((ROOT / 'results' / (fixture + '-complete.json')).read_text())
    assert len(rows) == count
    assert len({row['stage'] for row in rows}) == count
    for row in rows:
        assert (ROOT / 'results' / (fixture + '-' + row['stage'] + '.png')).is_file()
        if fixture.startswith('isolated-'):
            assert row['source_filepath'].endswith('/fixtures/' + fixture + '.maxpat')
    stages = {row['stage']: row for row in rows}
    assert stages['zeta-retained']['number_value'] == [77]

environment = json.loads((ROOT / 'environment.json').read_text())
assert not environment['remaining_prefix_processes']
print(json.dumps({'files_verified': len(manifest['files']), 'screenshots': sum(expected.values()),
                  'finite_rows': sum(expected.values()), 'remaining_prefix_processes': 0}))
