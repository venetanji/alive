#!/usr/bin/env python3
"""Decouple x ordering and inspect nesting/root attributes in original probes."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FIX = ROOT / 'fixtures'
for name, parenttab, rootshown in [('position-swapped', 1, 0), ('nested-parent-hidden', 0, 1)]:
    data = json.loads((FIX / 'root-hidden.maxpat').read_text())
    root = data['patcher']
    root['showrootpatcherontab'] = rootshown
    for item in root['boxes']:
        box = item['box']
        if box['id'] == 'zeta':
            box['patching_rect'][:2] = [20, 260]
            box['patcher']['showontab'] = parenttab
        if box['id'] == 'alpha':
            box['patching_rect'][:2] = [450, 100]
        if box['id'] == 'probe':
            box['text'] = 'js probe-followup.js ' + name
    root['boxes'].append({'box': {'id': 'pcontrol', 'maxclass': 'newobj', 'patching_rect': [350, 475, 90, 25], 'text': 'pcontrol'}})
    root['lines'] += [{'patchline': {'source': ['probe', 1], 'destination': ['pcontrol', 0]}},
                      {'patchline': {'source': ['pcontrol', 0], 'destination': ['zeta', 0]}}]
    (FIX / (name + '.maxpat')).write_text(json.dumps(data, indent=2) + '\n')

runner = (ROOT / 'run-runtime.py').read_text().replace("['root-hidden', 'root-shown', 'order-reversed']", "['position-swapped', 'nested-parent-hidden']").replace("alive-max-tabs-20261022-run'", "alive-max-tabs-followup-20261022-run'").replace('len(seen) == 8', 'len(seen) == 10')
runner = runner.replace('alive-max-tabs-20261022-wine-disposable', 'alive-max-tabs-followup-20261022-wine-disposable')
(ROOT / 'run-followup.py').write_text(runner)
