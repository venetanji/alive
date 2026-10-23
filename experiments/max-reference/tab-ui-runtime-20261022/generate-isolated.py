#!/usr/bin/env python3
"""One source per fresh prefix/display avoids retained foreground windows."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FIX = ROOT / 'fixtures'
for name, source in [('isolated-root-shown', 'root-shown'), ('isolated-nesting', 'nested-parent-hidden')]:
    data = json.loads((FIX / (source + '.maxpat')).read_text())
    root = data['patcher']
    for entry in root['boxes']:
        box = entry['box']
        if box['id'] == 'probe':
            box['text'] = 'js probe-isolated.js ' + name
        if box['id'] == 'zeta':
            for item in box['patcher']['boxes']:
                if item['box']['id'] == 'promoted':
                    item['box']['varname'] = 'promoted'
    if source == 'root-shown':
        root['boxes'].append({'box': {'id': 'pcontrol', 'maxclass': 'newobj', 'patching_rect': [350, 475, 90, 25], 'text': 'pcontrol'}})
        root['lines'] += [{'patchline': {'source': ['probe', 1], 'destination': ['pcontrol', 0]}},
                          {'patchline': {'source': ['pcontrol', 0], 'destination': ['zeta', 0]}}]
    (FIX / (name + '.maxpat')).write_text(json.dumps(data, indent=2) + '\n')

runner = (ROOT / 'run-runtime.py').read_text()
runner = runner.replace('import os\n', 'import os\nimport sys\n')
runner = runner.replace("Path('/home/venetanji/.cache/alive-max-tabs-20261022-wine-disposable')", "Path('/home/venetanji/.cache/alive-max-tabs-' + sys.argv[1] + '-20261022-wine-disposable')")
runner = runner.replace("Path('/home/venetanji/.cache/alive-max-tabs-20261022-run')", "Path('/home/venetanji/.cache/alive-max-tabs-' + sys.argv[1] + '-20261022-run')")
runner = runner.replace("['root-hidden', 'root-shown', 'order-reversed']", '[sys.argv[1]]').replace('len(seen) == 8', 'len(seen) == 10')
(ROOT / 'run-one.py').write_text(runner)

data = json.loads((FIX / 'isolated-nesting.maxpat').read_text())
for entry in data['patcher']['boxes']:
    box = entry['box']
    if box['id'] == 'probe':
        box['text'] = 'js probe-local.js isolated-local'
    if box['id'] == 'zeta':
        for item in box['patcher']['boxes']:
            if item['box']['id'] == 'promoted':
                item['box']['patcher']['showontab'] = 0
(FIX / 'isolated-local.maxpat').write_text(json.dumps(data, indent=2) + '\n')
probe = (FIX / 'probe-isolated.js').read_text()
probe = probe.replace('["initial", "promoted", "root", "zeta-set77", "alpha", "zeta-retained", "promote-runtime", "open-zeta", "zeta-local", "zeta-return"]', '["initial", "open-zeta", "zeta-local", "zeta-return", "zeta-set77", "alpha", "zeta-retained", "promote-runtime", "root", "promoted"]')
probe = probe.replace('if (label === "open-zeta") outlet(1, "open");', 'if (label === "open-zeta") { outlet(1, "open"); zeta.getnamed("this").message("front"); }')
probe = probe.replace('if (label === "root") outlet(0, "setactivetab", id + " (root)");', 'if (label === "root") { outlet(0, "front"); outlet(0, "setactivetab", id + " (root)"); }')
(FIX / 'probe-local.js').write_text(probe)
