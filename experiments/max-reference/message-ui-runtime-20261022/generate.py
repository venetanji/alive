#!/usr/bin/env python3
"""Original direct-wire probes; no message feeder can substitute dollar atoms."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
for child in ['fixtures', 'results']:
    (ROOT / child).mkdir(exist_ok=True)
boxes, lines, targets, lanes, labels, events = [], [], [], {}, [], []


def wire(src, outlet, dst, inlet):
    lines.append({'patchline': {'source': [src, outlet], 'destination': [dst, inlet]}})


def target(key, cls, text=None, inputs=1, outputs=1, **attrs):
    box = dict(id=key, varname=key, maxclass=cls,
               patching_rect=[30 + len(boxes) % 4 * 260, 100 + len(boxes) // 4 * 90, 220, 28], **attrs)
    if text is not None:
        box['text'] = text
    boxes.append({'box': box})
    targets.append(dict(key=key, maxclass=cls, text=text, inlets=inputs, outlets=outputs))
    for inlet in range(inputs):
        lane = len(lanes)
        lanes[(key, inlet)] = lane
        wire('harness', lane, key, inlet)
    for outlet in range(outputs):
        wire(key, outlet, 'harness', len(labels))
        labels.append(key + ':' + str(outlet))


def event(key, selector='bang', atoms=None, inlet=0, **kwargs):
    events.append(dict(id='event_' + str(len(events)), target=key, inlet=inlet,
                       lane=lanes[(key, inlet)], selector=selector, atoms=atoms or [], **kwargs))


target('template', 'message', 'saved $1 $2', inputs=2)
target('empty', 'message', '', inputs=2)
target('literal', 'message', 'fixed 7 pear', inputs=2)
target('integer', 'number', outputs=2)
target('bounded', 'number', outputs=2, minimum=-5, maximum=5)
target('fractional', 'flonum', outputs=2)
target('intstore', 'newobj', 'int 3', inputs=2)
target('floatstore', 'newobj', 'float 3.5', inputs=2)
target('receiver_a', 'newobj', 'receive message_ui_probe', inputs=0)
target('receiver_b', 'newobj', 'receive message_ui_probe', inputs=0)

for key in ['template', 'empty', 'literal']:
    for selector, atoms in [('bang', []), ('int', [4]), ('float', [3.75]), ('list', [8, 9]),
                            ('list', ['pear', 6]), ('symbol', ['apple']), ('other', [2])]:
        event(key, selector, atoms, case='initial hot')
    for selector, atoms in [('new', ['$1', '$2']), ('list', [5, 'pear', 2.25]), ('float', [6.25]),
                            ('symbol', ['kiwi']), ('bang', []), ('list', [])]:
        event(key, selector, atoms, inlet=1, case='cold replacement')
        event(key, 'int', [9], case='hot after cold replacement')
        event(key, case='bang after cold replacement')
    for selector, atoms in [('set', ['fresh', '$1', '$2']), ('set', [1, 'apple']), ('set', [])]:
        event(key, selector, atoms, case='silent set')
        event(key, 'list', [11, 12], case='hot after set')
        event(key, case='bang after set')

for key in ['integer', 'bounded', 'fractional']:
    for selector, atoms in [('bang', []), ('float', [3.9]), ('float', [-3.9]), ('list', [4, 5]),
                            ('list', [6.75, 'kiwi']), ('symbol', ['kiwi']), ('set', [12]), ('bang', []),
                            ('min', [-2]), ('max', [2]), ('float', [9.9]), ('float', [-9.9]),
                            ('set', [8.9]), ('bang', []), ('min', []), ('max', []), ('float', [9.9]),
                            ('tab', []), ('bang', [])]:
        event(key, selector, atoms)

for key in ['intstore', 'floatstore']:
    for selector, atoms, inlet in [('bang', [], 0), ('float', [8.75], 1), ('send', ['message_ui_probe'], 0),
                                  ('bang', [], 0), ('set', [-4.75], 0), ('send', ['message_ui_probe'], 0),
                                  ('send', ['message_ui_probe'], 1), ('bang', [], 0), ('send', [], 0),
                                  ('send', [42], 0), ('send', ['missing_message_ui_probe'], 0), ('bang', [], 0)]:
        event(key, selector, atoms, inlet=inlet)

# Physical Tab is separate from the arbitrary selector named tab above.
for key in ['integer', 'fractional']:
    event(key, 'select', [], keyboard='Tab', wait_after_ms=1200, case='physical selected Tab')

boxes.append({'box': dict(id='harness', varname='harness', maxclass='newobj',
                         text='js probe.js message-ui', numinlets=64, numoutlets=64,
                         patching_rect=[30, 30, 600, 28])})
patch = {'patcher': dict(fileversion=1, appversion=dict(major=9, minor=1, revision=5, architecture='x64', modernui=1),
                        classnamespace='box', rect=[0, 0, 1200, 800], openinpresentation=0,
                        boxes=boxes, lines=lines)}
score = dict(fixture='message-ui', labels=labels, targets=targets, events=events, drain_ms=150)
for name, value in [('message-ui.maxpat', patch), ('message-ui.score.json', score)]:
    (ROOT / 'fixtures' / name).write_text(json.dumps(value, indent=2) + '\n')
print(json.dumps(dict(targets=len(targets), lanes=len(lanes), events=len(events))))
