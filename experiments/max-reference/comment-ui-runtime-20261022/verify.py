#!/usr/bin/env python3
"""Check bounded evidence consistency; this does not launch Max."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
read = lambda path: json.loads((ROOT / path).read_text())
metadata = read('metadata.json')
assert metadata['attributes']['bubbleside']['enum'] == {'0': 'top', '1': 'left', '2': 'bottom', '3': 'right'}
assert metadata['named_style']['default'] == {}
assert len(metadata['targeted_comments']) == 12
assert sum(c['fields'].get('bubble', 0) for c in metadata['targeted_comments']) == 9
for folder in ('attempt1', 'results'):
    stages = read(folder + '/snapshots.json')
    assert [s['stage'] for s in stages] == ['initial', 'changed']
    objects = {s['stage']: {o['name']: o for o in s['objects']} for s in stages}
    a, b = objects['initial'], objects['changed']
    assert len(a) == 31 and len(b) == 31
    for count, plain, bubble in [(None, [160, 51], [160, 55]), (1, [366, 21], [382, 25]),
                                  (2, [198, 36], [216, 40]), (7, [86, 111], [102, 115])]:
        assert a['plain-count-' + str(count)]['patching_rect'][2:] == plain
        assert a['bubble-count-' + str(count)]['patching_rect'][2:] == bubble
    assert b['plain-count-2']['patching_rect'][2:] == [90, 96]
    assert b['bubble-count-2']['patching_rect'][2:] == [90, 115]
    for margin, size in [(0, [91, 30]), (5, [101, 40]), (10, [111, 50])]:
        assert a['margin' + str(margin)]['patching_rect'][2:] == size
    for name in ('inherited', 'named-style'):
        assert a[name]['fontsize'] == 13
    assert all(o['linecount'] is None for o in a.values())
    assert read(folder + '/runtime.json')['complete'] is True
cleanup = read('environment.json')['cleanup']
assert cleanup['remaining_exact_prefix_processes'] == []
assert cleanup['owned_display_processes_remaining'] == []
assert cleanup['marked_disposable_prefix_removed'] is True
print('Verified 2 runs, 124 object snapshots, 9 target bubble metadata records and exact-prefix cleanup')
