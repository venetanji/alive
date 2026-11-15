#!/usr/bin/env python3
"""Raw structure check only, not an Alive decoder or implementation test."""
import json
from pathlib import Path
D = Path(__file__).resolve().parent
class Duplicate(ValueError): pass
def pairs(items):
    result = {}
    for key, value in items:
        if key in result: raise Duplicate(key)
        result[key] = value
    return result
def parse(text):
    return json.loads(text, object_pairs_hook=pairs, parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))
for path in sorted(D.glob('*.json')):
    if path.name.startswith('ipc-'): continue
    raw = path.read_text()
    try: value = parse(raw)
    except (ValueError, json.JSONDecodeError):
        assert path.name.startswith(('invalid-duplicate-', 'invalid-malformed', 'invalid-trailing', 'invalid-nonfinite')), path
        continue
    if path.name.startswith('invalid-duplicate-'): raise AssertionError(path)
    if path.name.startswith('v5-') or path.name.startswith('gain-'):
        assert value['format']=='alive-session-v5' and set(value)=={'format','score','master'}
        assert value['score']['format'] in ('alive-session-v2','alive-session-v3','alive-session-v4')
        assert set(value['master'])=={'gain'} and 0 <= value['master']['gain'] <= 4
    if path.name=='v5-v3-eight.json': assert len(value['score']['tracks'])==8
# Whitespace padding is valid JSON and counts toward the complete raw file bound.
raw=(D/'v5-v3.json').read_bytes().rstrip()
for size in (1048576,1048577):
    content=raw+b' '*(size-len(raw))
    assert len(content)==size and parse(content.decode())['format']=='alive-session-v5'
print('raw structure and duplicate scan verified; size boundaries 1048576/1048577; no decoder invoked')
