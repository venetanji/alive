#!/usr/bin/env python3
"""Verify reference evidence identities and cleanup without launching applications."""
import hashlib
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'evidence-manifest.json').read_text())
for row in manifest['files']:
    path = ROOT / row['path']
    raw = path.read_bytes()
    assert len(raw) == row['bytes'], path
    assert hashlib.sha256(raw).hexdigest() == row['sha256'], path
    if path.suffix == '.png':
        assert raw[:8] == b'\x89PNG\r\n\x1a\n', path
        assert struct.unpack('>II', raw[16:24]) == (1440, 1000), path

session = json.loads((ROOT / 'session.json').read_text())
cleanup = json.loads((ROOT / 'cleanup.json').read_text())
assert cleanup['preferences_unchanged']
assert cleanup['preferences_after'] == session['preferences_before']
assert not cleanup['owned_processes_after']
assert cleanup['xvfb_exited'] and cleanup['prefix_removed']
assert cleanup['work_directory_removed']
assert not Path(session['prefix']).exists()
assert not Path(session['prefix']).parent.exists()

for row in json.loads((ROOT / 'target-identities.json').read_text())['files']:
    path = Path(row['path'])
    if path.exists():
        assert path.stat().st_size == row['bytes'], path
        assert hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256'], path
    assert row['matches_prior_evidence']

docs = json.loads((ROOT / 'max-documentation-inventory.json').read_text())
for row in docs['files']:
    path = Path(docs['source_root']) / row['relative_path']
    if path.exists():
        assert path.stat().st_size == row['bytes'], path
        assert hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256'], path

actions = [json.loads(line) for line in (ROOT / 'actions.jsonl').read_text().splitlines()]
assert all(row['display'] == session['display'] == ':164' for row in actions)
captures = {row['args'][1] for row in actions if row['args'][0] == 'capture'}
retained = set(manifest['retained_captures'])
discarded = set(manifest['discarded_captures'])
assert retained.isdisjoint(discarded)
assert captures == retained | discarded
assert retained == {path.name for path in ROOT.glob('*.png')}

coverage = json.loads((ROOT / 'coverage.json').read_text())
for question in coverage['questions']:
    assert question['status'] in {'answered', 'partially-answered', 'unresolved'}
    for name in question['files']:
        assert (ROOT / name).is_file(), name

bundle = json.loads((ROOT / 'rea-evidence-bundle.json').read_text())
record = next(row for row in bundle['records']
              if row['evidence_id'] == coverage['runtime_evidence_id'])
assert record['operation'] == 'capture_process_scenario'
assert record['authority'] == 'controlled-replay'
assert record['normalized_result']['exit']['code'] == 0
assert not record['normalized_result']['truncated']
assert len(bundle['unknowns']) == 4
assert all(row['status'] == 'open' for row in bundle['unknowns'])
assert not any(path.suffix.lower() in {'.adv', '.adg', '.als', '.amxd', '.maxpat',
                                     '.dll', '.exe', '.wav', '.mxe64'}
               for path in ROOT.rglob('*'))
print(json.dumps(dict(pass_=True, files=len(manifest['files']),
                     screenshots=len(retained), actions=len(actions),
                     coverage_questions=len(coverage['questions']),
                     original_preferences_unchanged=True,
                     owned_prefix_and_cache_removed=True,
                     rea_runtime_evidence_id=record['evidence_id'],
                     rea_residual_unknowns=4)))
