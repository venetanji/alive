#!/usr/bin/env python3
"""Generate original, bounded arithmetic fixtures; no installed graph is read."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
(ROOT / 'fixtures').mkdir(exist_ok=True)
(ROOT / 'results').mkdir(exist_ok=True)
targets, score = [], []
operators = ['+', '*', '-', '/', '%', '!-', '!/', 'abs']


def target(op, variant, argument):
    label = f'op{operators.index(op)}-{variant}'
    targets.append(dict(label=label, operator=op, variant=variant,
                        creation=op + ((' ' + argument) if argument else '')))
    return label


def emit(label, case, selector='bang', atoms=None, inlet=0, negative_zero=False):
    score.append(dict(id=f'{len(score):03d}-{label}-{case}', target=label,
                      case=case, inlet=inlet, selector=selector, atoms=atoms or [],
                      negative_zero=negative_zero))


for op in operators:
    for variant, argument in [('bare', ''), ('integer', '2'), ('float', '2.')]:
        label = target(op, variant, argument)
        emit(label, 'startup-bang')

for op in operators[:-1]:
    label = f'op{operators.index(op)}-integer'
    cases = [
        ('hot-int', 'int', [7], 0),
        ('hot-positive-fraction', 'float', [3.75], 0),
        ('hot-negative-fraction', 'float', [-3.75], 0),
        ('cold-positive-fraction', 'float', [2.75], 1),
        ('recall-after-cold-fraction', 'bang', [], 0),
        ('cold-negative-int', 'int', [-2], 1),
        ('recall-after-cold-int', 'bang', [], 0),
        ('set-fraction', 'set', [9.75], 0),
        ('recall-after-set', 'bang', [], 0),
        ('list-two', 'list', [7, 2], 0),
        ('recall-after-list-two', 'bang', [], 0),
        ('list-one', 'list', [5], 0),
        ('list-three', 'list', [9, 4, 2], 0),
        ('list-symbol-mixed', 'list', [11, 'probe-symbol'], 0),
        ('recall-after-symbol-list', 'bang', [], 0),
        ('cold-list-two', 'list', [8, 3], 1),
        ('recall-after-cold-list', 'bang', [], 0),
        ('direct-in1', 'in1', [5.75], 0),
        ('recall-after-in1', 'bang', [], 0),
        ('direct-ft1', 'ft1', [-2.25], 0),
        ('recall-after-ft1', 'bang', [], 0),
    ]
    for case, selector, atoms, inlet in cases:
        emit(label, case, selector, atoms, inlet)

abs_cases = [
    ('hot-int', 'int', [-7]), ('hot-negative-fraction', 'float', [-3.75]),
    ('hot-positive-fraction', 'float', [3.75]), ('recall', 'bang', []),
    ('set-fraction', 'set', [-8.5]), ('recall-after-set', 'bang', []),
    ('list-one', 'list', [-9]), ('list-two', 'list', [-7, 2]),
    ('list-three', 'list', [-3, 2, 4]),
    ('list-symbol-mixed', 'list', [-3, 'probe-symbol']),
    ('symbol', 'symbol', ['probe-symbol']), ('direct-in1', 'in1', [-2.75]),
    ('direct-ft1', 'ft1', [2.75]), ('recall-final', 'bang', []),
]
for case, selector, atoms in abs_cases:
    emit('op7-integer', case, selector, atoms)

for op in operators[:-1]:
    label = f'op{operators.index(op)}-float'
    for case, selector, atoms, inlet in [
        ('hot-int', 'int', [7], 0),
        ('hot-negative-fraction', 'float', [-3.75], 0),
        ('cold-positive-fraction', 'float', [2.75], 1),
        ('recall-after-cold-fraction', 'bang', [], 0),
        ('list-two-fractions', 'list', [-7.5, 2.5], 0),
        ('set-fraction', 'set', [8.5], 0),
        ('recall-after-set', 'bang', [], 0),
    ]:
        emit(label, case, selector, atoms, inlet)

for op in ['/', '%']:
    i = operators.index(op)
    for variant in ['integer', 'float']:
        label = f'op{i}-{variant}'
        if variant == 'integer':
            actions = [
                ('zero-coerced-cold', 'float', [.5], 1, False),
                ('zero-coerced-bang', 'bang', [], 0, False),
                ('zero-negative-cold', 'float', [0], 1, True),
                ('zero-negative-bang', 'bang', [], 0, False),
                ('zero-recovery-cold', 'int', [2], 1, False),
                ('zero-recovery-bang', 'bang', [], 0, False),
            ]
        else:
            actions = [
                ('zero-positive-cold', 'float', [0], 1, False),
                ('zero-positive-hot', 'float', [7.5], 0, False),
                ('zero-negative-cold', 'float', [0], 1, True),
                ('zero-negative-hot', 'float', [-7.5], 0, False),
                ('zero-recovery-cold', 'int', [-2], 1, False),
                ('zero-recovery-bang', 'bang', [], 0, False),
            ]
        for case, selector, atoms, inlet, negative in actions:
            emit(label, case, selector, atoms, inlet, negative)

for variant in ['integer', 'float']:
    label = f'op6-{variant}'
    actions = [
        ('zero-coerced-hot' if variant == 'integer' else 'zero-positive-hot',
         'float', [.5 if variant == 'integer' else 0], False),
        ('zero-first-bang', 'bang', [], False),
        ('zero-negative-hot', 'float', [0], True),
        ('zero-negative-bang', 'bang', [], False),
        ('zero-recovery-hot', 'int', [2], False),
        ('zero-recovery-bang', 'bang', [], False),
    ]
    for case, selector, atoms, negative in actions:
        emit(label, case, selector, atoms, 0, negative)

for op, argument in [('+', '2e0'), ('*', '0.5'), ('/', '2e0'),
                     ('%', '0.5'), ('%', '2.5'), ('abs', '2e0'), ('abs', '0.5')]:
    label = target(op, f'extra{len(targets)}', argument)
    emit(label, 'startup-bang')
    emit(label, 'hot-negative-fraction', 'float', [-3.75])
    emit(label, 'recall', 'bang')

for op in operators:
    emit(f'op{operators.index(op)}-bare', 'hot-default', 'int', [7])
emit('op7-float', 'hot-float-format', 'float', [-3.75])

assert len(score) == 300
labels = {t['label']: i for i, t in enumerate(targets)}
for e in score:
    e['lane'] = labels[e['target']] * 2 + e['inlet']
    e['operator'] = targets[labels[e['target']]]['operator']
    e['creation'] = targets[labels[e['target']]]['creation']
boxes, lines = [], []
for i, t in enumerate(targets):
    boxes.append(dict(box=dict(id=t['label'], varname=t['label'], maxclass='newobj',
                              text=t['creation'], patching_rect=[20 + (i % 8)*100, 30 + (i//8)*70, 85, 22])))
    for inlet in range(1 if t['operator'] == 'abs' else 2):
        lines.append(dict(patchline=dict(source=['probe', i*2+inlet], destination=[t['label'], inlet], hidden=1)))
    lines.append(dict(patchline=dict(source=[t['label'], 0], destination=['probe', i], hidden=1)))
boxes.append(dict(box=dict(id='probe', varname='probe', maxclass='newobj', text='js probe.js',
                          patching_rect=[20, 350, 150, 22], hidden=1)))
patcher = dict(fileversion=1, appversion=dict(major=9, minor=1, revision=5, architecture='x64', modernui=1),
               classnamespace='box', rect=[10, 10, 900, 450], locked=1, boxes=boxes, lines=lines)
for name, value in [('targets.json', targets), ('score.json', score),
                    ('arithmetic.maxpat', dict(patcher=patcher))]:
    (ROOT/'fixtures'/name).write_text(json.dumps(value, indent=2)+'\n')
print(json.dumps(dict(targets=len(targets), ordered_input_deliveries=len(score))))
