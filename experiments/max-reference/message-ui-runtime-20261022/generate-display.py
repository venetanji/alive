#!/usr/bin/env python3
"""Derive a smaller original display probe from the original message fixture."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
patch = json.loads((ROOT / 'fixtures/message-ui.maxpat').read_text())
keep = {'template', 'empty', 'literal', 'harness'}
patch['patcher']['boxes'] = [item for item in patch['patcher']['boxes'] if item['box']['id'] in keep]
patch['patcher']['lines'] = [item for item in patch['patcher']['lines']
                            if item['patchline']['source'][0] in keep and item['patchline']['destination'][0] in keep]
for item in patch['patcher']['boxes']:
    if item['box']['id'] == 'harness':
        item['box']['text'] = 'js probe-display.js message-display'
for lane in range(6):
    patch['patcher']['lines'].append({'patchline': {'source': ['harness', lane], 'destination': ['harness', 63]}})
score = json.loads((ROOT / 'fixtures/message-ui.score.json').read_text())
score['fixture'] = 'message-display'
score['targets'] = score['targets'][:3]
score['labels'] = score['labels'][:3] + ['unused'] * 60 + ['$delivery']
cases = [
    ('template', 0, 0, 'bang', []), ('template', 0, 0, 'list', [8, 9]),
    ('template', 1, 1, 'new', ['$1', '$2']), ('template', 0, 0, 'int', [3]),
    ('empty', 3, 1, 'list', [5, 'pear', 2.25]), ('literal', 5, 1, 'symbol', ['kiwi']),
    ('literal', 4, 0, 'bang', []), ('literal', 5, 1, 'bang', []), ('literal', 5, 1, 'list', []),
    ('template', 0, 0, 'set', []), ('empty', 2, 0, 'set', ['fresh', '$1']), ('empty', 2, 0, 'int', [7]),
]
score['events'] = [dict(id='display_' + str(i), target=target, lane=lane, inlet=inlet,
                        selector=selector, atoms=atoms, wait_after_ms=1200, screenshot=True)
                   for i, (target, lane, inlet, selector, atoms) in enumerate(cases)]
for name, value in [('message-display.maxpat', patch), ('message-display.score.json', score)]:
    (ROOT / 'fixtures' / name).write_text(json.dumps(value, indent=2) + '\n')
probe = (ROOT / 'fixtures/probe.js').read_text().replace('if (e.keyboard) {', 'if (e.screenshot) {')
probe = probe.replace('JSON.stringify({id: e.id, key: e.keyboard})', 'JSON.stringify({id: e.id, screenshot: true})')
(ROOT / 'fixtures/probe-display.js').write_text(probe)
