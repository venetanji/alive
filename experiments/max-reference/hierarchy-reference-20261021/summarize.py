#!/usr/bin/env python3
"""Validate retained finite captures and derive a compact metadata-only report."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def readlines(path):
    return [json.loads(line) for line in path.read_text().splitlines()]


def summarize():
    hierarchy = readlines(HERE / 'results/hierarchy.jsonl')
    assert hierarchy[-1]['selector'] == 'complete' and hierarchy[-1]['atoms'] == [17]
    assert len(hierarchy) == 42
    scored = {}
    for row in hierarchy:
        if row['input_id'] is not None and row['label'] == 'event':
            scored.setdefault(row['input_id'], []).append({'selector': row['selector'], 'atoms': row['atoms']})
    expected_ports = [
        ('explicit-out-0', 'explicit-A', 100), ('explicit-out-1', 'explicit-B', 101),
        ('geometry-out-0', 'geometry-A', 110), ('geometry-out-1', 'geometry-B', 111),
        ('tie-y-out-0', 'tie-y-A', 120), ('tie-y-out-1', 'tie-y-B', 121),
        ('tie-array-out-0', 'tie-array-A', 130), ('tie-array-out-1', 'tie-array-B', 131),
        ('tie-reversed-out-0', 'tie-reversed-B', 140), ('tie-reversed-out-1', 'tie-reversed-A', 141),
    ]
    for i, (selector, tag, value) in enumerate(expected_ports):
        assert scored['event-' + str(i)] == [{'selector': selector, 'atoms': [tag, value]}]
    assert all('event-' + str(i) not in scored for i in [11, 12, 13])
    assert all(scored['event-' + str(i)] == [{'selector': 'lifecycle-value', 'atoms': [77]}] for i in [10, 14, 16])
    assert [row['selector'] for row in scored['event-15']] == ['lifecycle-load']
    startup = [{'seq': row['seq'], 'selector': row['selector'], 'atoms': row['atoms']} for row in hierarchy if row['input_id'] is None]
    a = next(row for row in startup if row['selector'] == 'abstract-0-out-0')['atoms']
    b = next(row for row in startup if row['selector'] == 'abstract-1-out-0')['atoms']
    assert a[1] != b[1] and a[2:5] == [17, 'alpha', 0] and b[2:5] == [23, 'beta', 0]
    assert a[5:] == [str(a[1]) + '-tail', 'tail-#0', '17-tail', 'tail-#1']
    assert b[5:] == [str(b[1]) + '-tail', 'tail-#0', '23-tail', 'tail-#1']
    nested = [row['atoms'] for row in startup if row['selector'] == 'abstract-nested']
    assert a[1:] in nested and b[1:] in nested
    for selector in ['root-load', 'root-nested', 'lifecycle-load', 'lifecycle-deep-load']:
        assert next(row for row in startup if row['selector'] == selector)['atoms'] == ['#0', '#1', '#2', '#3', '#0-tail', 'tail-#0', '#1-tail', 'tail-#1']
    boundary = readlines(HERE / 'results/boundary.jsonl')
    assert boundary[-1]['selector'] == 'complete' and boundary[-1]['atoms'] == [62]
    score = json.loads((HERE / 'fixtures/boundary.score.json').read_text())
    stages = {}
    for stage in ['initial', 'message7', 'message9']:
        samples = readlines(HERE / ('results/boundary-' + stage + '.samples.jsonl'))
        assert len(samples) == 64 and [r['frame'] for r in samples] == list(range(64))
        assert all(len(row['samples']) == 11 for row in samples)
        stages[stage] = []
        for i, channel in enumerate(score['channels']):
            values = sorted({row['samples'][i] for row in samples})
            assert len(values) == 1
            label = channel['label']
            expected = 5 if label == 'constant-outlet' else {'initial': 10, 'message7': 7, 'message9': 9}[stage] + (3 if label.endswith('mixed') else 0)
            assert values == [expected], (stage, label, values, expected)
            stages[stage].append({'label': label, 'constant_sample': values[0]})
    control = [row for row in boundary if ':' in row['label']]
    for label in ['relay-message-only:direct-control', 'relay-message-only:number', 'relay-mixed:direct-control', 'relay-mixed:number', 'fan-message-only:fan-number', 'fan-mixed:fan-number']:
        values = [r['atoms'] for r in control if r['label'] == label and r['selector'] == 'int']
        assert values == [[7], [9]], (label, values)
    marker_counts = Counter(row['label'] for row in control if row['selector'] == 'signal')
    assert marker_counts['relay-mixed:direct-control'] == 3
    assert marker_counts['relay-message-only:direct-control'] == 0
    settings = {}
    for name in ['sr', 'sigvs', 'iovs', 'overdrive', 'takeover', 'switch']:
        settings[name] = [r['atoms'][0] for r in boundary if r['label'] == name + '_right'][-1]
    menu = [row['atoms'] for row in boundary if row['label'] == 'driver_left' and row['selector'] == 'append'][:9]
    driver = [row['atoms'][0] for row in boundary if row['label'] == 'driver_left' and row['selector'] == 'set'][-1]
    assert driver == 4 and menu[driver] == ['NonRealTime']
    return {'schema': 1, 'evidence': 'ORIGINAL_MAX_EXECUTED',
            'hierarchy': {'raw_rows': len(hierarchy), 'scored_inputs': 17, 'startup_events': startup,
                          'scored_outputs': scored, 'port_rule': 'x ascending; equal x follows saved boxes array; saved index and y ignored in these fixtures'},
            'boundary': {'raw_rows': len(boundary), 'scored_inputs': 62, 'frames_per_stage': 64, 'channels': 11,
                         'stages': stages, 'control_messages': [{k: row[k] for k in ['seq', 'input_id', 'label', 'selector', 'atoms']} for row in control],
                         'signal_marker_counts': dict(marker_counts), 'settings_after_capture': settings,
                         'driver_index': driver, 'driver_menu': menu},
            'limitations': ['Finite original fixtures, not whole installed-help execution or conformance.',
                            'Collector order is JS arrival order, not scheduler-thread priority or timing.',
                            'Ties, index precedence, and substitution are observed for the exact authored shapes only.',
                            'No signal feedback, abstraction DSP, bpatcher, MC, poly~, or Jitter execution tested.',
                            'Print boxes were connected; only direct JS and number outputs were machine-collected.',
                            'DSP-start signal announcements are retained, not claimed implemented by Alive.']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    encoded = json.dumps(summarize(), indent=2, ensure_ascii=True) + '\n'
    path = HERE / 'summary.json'
    if args.check:
        assert path.read_text() == encoded, 'Summary differs from raw captures'
    else:
        path.write_text(encoded)
    print('Validated 42 hierarchy rows, 468 boundary rows, and 2112 samples from 3 stages x 64 frames x 11 channels.')
