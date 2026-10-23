#!/usr/bin/env python3
"""Validate the recorded UI evidence and exact bytes; never launches Max."""
import hashlib
import json
from pathlib import Path

import jsonschema

root = Path(__file__).resolve().parent
manifest = json.loads((root/'manifest.json').read_text())
schema = json.loads((root.parent/'max-subset/reference-manifest.schema.json').read_text())
jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker()).validate(manifest)
for item in manifest['files']:
    path = root/item['path']
    assert path.resolve().is_relative_to(root), item['path']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], item['path']
for name in ['ui-study.maxpat', 'snapshots/Untitled1.maxpat', 'snapshots/savedpatch.maxpat']:
    patch = json.loads((root/name).read_text())['patcher']
    ids = [b['box']['id'] for b in patch['boxes']]
    assert len(ids) == len(set(ids))
    for entry in patch['lines']:
        for key in ['source', 'destination']:
            assert entry['patchline'][key][0] in ids
assert (root/'snapshots/Untitled1.maxpat').read_bytes() == (root/'snapshots/savedpatch.maxpat').read_bytes()
print(json.dumps({'status': 'verified', 'schema': schema['$id'], 'hashed_artifacts': len(manifest['files']),
                  'scope': 'recorded UI evidence only; no Max execution or compatibility certification'}))
