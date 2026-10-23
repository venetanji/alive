#!/usr/bin/env python3
"""Verify finite retained observations and their explicit coverage limits; no Max."""
import hashlib
import json
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parent


def read(path):
    return json.loads((ROOT / path).read_text())


manifest = read('manifest.json')
for item in manifest['evidence_files']:
    path = ROOT / item['path']
    assert path.stat().st_size == item['bytes'], path
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], path

rows = read('results/receipts.json')
jsonl = [json.loads(line) for line in (ROOT / 'results/receipts.jsonl').read_text().splitlines()]
assert rows == jsonl
assert [r['seq'] for r in rows] == list(range(1, len(rows) + 1))
assert not [r for r in rows if r['kind'] in ('harness-error', 'unexpected')]
score = read('fixtures/score.json')
assert [r['value'] for r in rows if r['kind'] == 'stimulus'] == score


def receipts(input_id):
    return [r['value'] for r in rows if r['kind'] == 'receipt' and r['input_id'] == input_id]


def snapshot(input_id):
    matches = [r['value'] for r in rows if r['kind'] == 'snapshot' and r['input_id'] == input_id]
    assert matches, input_id
    return {o['name']: o for o in matches[-1]['objects']}


for name, selector, value in manifest['values']:
    assert receipts(name) == [dict(label=name, selector='float', atoms=[value])]
    stored = snapshot(name)[name]
    assert stored['value'] == [value]
    assert stored['format'] == 6 and stored['numdecimalplaces'] == 0
    assert stored['patching_rect'][2:] == [54, 23]

products = {'hot-int-3': 1.5, 'hot-float-4': 2, 'hot-int-negative-3': -1.5,
            'recall-half': -1.5, 'recall-cold-int': -6, 'recall-cold-float': -1.5,
            'hot-int-2': -5, 'hot-fraction': .125, 'hot-int-zero': 0, 'hot-float-zero': 0}
for input_id, value in products.items():
    assert receipts(input_id) == [dict(label=label, selector='float', atoms=[value])
                                  for label in ('multiply-after', 'multiply-direct')]
    assert snapshot(input_id)['after']['value'] == [value]
for input_id in ('cold-int-2', 'cold-float-half', 'cold-float-negative', 'cold-restore-half'):
    assert receipts(input_id) == []
assert receipts('entry-initial') == [dict(label='entry', selector='float', atoms=[1.25])]
assert receipts('entry-selected') == [dict(label='entry', selector='float', atoms=[-2.123456789])]
assert snapshot('entry-committed')['entry']['value'] == [-2.123456789]
assert snapshot('after-tab')['entry']['value'] == [-2.123456789]

initial = snapshot('scalar-score')
one, both, physical = [snapshot(stage) for stage in ('one-endpoint', 'both-script', 'physical-group')]
for i in range(5):
    source, sink = 'source' + str(i), 'sink' + str(i)
    for key, delta in ((source, [30, 20]), (sink, [0, 0])):
        assert [one[key]['rect'][j] - initial[key]['rect'][j] for j in (0, 1)] == delta
    for key in (source, sink):
        assert [both[key]['rect'][j] - one[key]['rect'][j] for j in (0, 1)] == [30, 20]
for key in initial:
    assert [physical[key]['rect'][j] - both[key]['rect'][j] for j in (0, 1)] == [10, 5]

patcher = read('fixtures/float-cable.maxpat')['patcher']
assert all('numdecimalplaces' not in b['box'] for b in patcher['boxes'] if b['box']['maxclass'] == 'flonum')
routes = [l['patchline']['midpoints'] for l in patcher['lines'] if 'midpoints' in l['patchline']]
assert routes == manifest['route_midpoint_coordinates']
assert routes[-2] == [651.5, 400, 651.5, 400] and routes[-1] == []
stages = ['initial', 'one-endpoint', 'both-script', 'physical-group']
session = read('results/session.json')
for stage in stages:
    assert not (ROOT / 'results' / (stage + '.clipboard.txt')).read_text().strip()
    native = [e for e in session['events'] if e['kind'] == 'windows-clipboard' and e['stage'] == stage]
    assert [e['mode'] for e in native] == ['normal', 'compressed']
    assert all(e['returncode'] == 0 and not e['formats'] for e in native)
assert session['events'][-1]['kind'] == 'completed'
assert not [e for e in session['events'] if e['kind'] == 'capture']
assert manifest['coverage']['midpoint_movement'] == 'unqualified'
assert manifest['coverage']['display_labels'] == 'parent-visual-review-narrow-face-only'
assert manifest['coverage']['general_float_format_algorithm'] == 'unqualified'
assert manifest['visual_observations']['float_labels_in_generator_order'] == [
    '0.', '2.', '2.5', '-2.5', '0.123', '0.000', '-0.', '0.']
assert manifest['visual_observations']['approximate_label_indices'] == [4, 5, 6, 7]
assert manifest['visual_observations']['rounding_versus_clipping'] == 'unqualified'
assert manifest['coverage']['physical_tab_outlet'] == 'not-observed'
assert manifest['coverage']['initial_cable_contour'] == 'parent-visual-review'

for directory in ('attempt-2-scalar-only/results', 'results'):
    cleanup = read(directory + '/cleanup.json')
    assert cleanup['owned_prefix_after'] == cleanup['owned_display_after'] == []
    assert cleanup['original_preferences_unchanged'] and cleanup['source_preferences_unchanged']
    assert cleanup['prefix_removed'] is True
old = read('attempt-1-incomplete/recovery-facts.json')
assert old['current_exact_prefix_processes'] == [] and old['marked_stale_copy_removed']
assert old['historical_cleanup_unavailable'] and old['historical_preferences_comparison_unavailable']
postflight = read('results/postflight.json')
assert not postflight['exact_prefix_processes'] and not postflight['exact_display_processes']
assert not postflight['xvfb_pid_exists'] and not postflight['marked_prefix_exists']
assert not postflight['display_socket_exists']

for item in manifest['external_artifacts']:
    path = Path(item['path'])
    if not path.exists():
        continue
    data = path.read_bytes()
    assert hashlib.sha256(data).hexdigest() == item['sha256']
    if path.suffix != '.png':
        continue
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    assert list(struct.unpack('>II', data[16:24])) == item['dimensions']
    offset, compressed, ended = 8, bytearray(), False
    while offset < len(data):
        length = struct.unpack('>I', data[offset:offset + 4])[0]
        kind, payload = data[offset + 4:offset + 8], data[offset + 8:offset + 8 + length]
        assert zlib.crc32(kind + payload) == struct.unpack('>I', data[offset + 8 + length:offset + 12 + length])[0]
        if kind == b'IDAT':
            compressed.extend(payload)
        offset += 12 + length
        if kind == b'IEND':
            ended = True
            break
    assert ended and offset == len(data) and zlib.decompress(compressed)

print(json.dumps(dict(receipt_rows=len(rows), scalar_inputs=len(score),
                      product_output_pairs=len(products), verified_motion='box coordinates only',
                      typed_value=-2.123456789, midpoint_movement='unqualified',
                      current_exact_prefix_processes=0, current_exact_display_processes=0)))
