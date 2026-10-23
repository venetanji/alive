#!/usr/bin/env python3
"""Author signal/control boundary probes using the existing original recorder."""
import importlib.util
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('original_signal_generator', HERE.parent / 'signal-runtime-20261021/generate.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.ROOT = HERE
Patch = module.Patch


def child(op=None, fan=False, merge=False, constant=False, deep=False):
    boxes, lines = [], []

    def add(ident, text=None, cls='newobj', x=30, y=30, **attrs):
        box = dict(id=ident, maxclass=cls, patching_rect=[float(x), float(y), 160., 24.], **attrs)
        if text is not None:
            box['text'] = text
        boxes.append(dict(box=box))
        return ident

    def wire(source, target, outlet=0, inlet=0):
        lines.append(dict(patchline=dict(source=[source, outlet], destination=[target, inlet])))

    if constant:
        last = add('constant', 'sig~ 5')
    else:
        last = add('in', cls='inlet', index=1)
    if deep:
        nested = add('nested', 'p nested', y=100, patcher=child(op=op), numinlets=1, numoutlets=1)
        wire(last, nested)
        last = nested
    elif op:
        node = add('op', op, y=100)
        wire(last, node)
        last = node
        if merge:
            second = add('in2', cls='inlet', index=2, x=300)
            wire(second, node)
    out = add('out', cls='outlet', index=1, y=200)
    wire(last, out)
    if fan:
        number = add('number', cls='number', x=300, y=100)
        wire('in', number)
        second = add('out2', cls='outlet', index=2, x=300, y=200)
        wire(number, second)
    return dict(fileversion=1, classnamespace='box', rect=[0., 0., 700., 400.], boxes=boxes, lines=lines)


p = Patch('boundary', 64)
signal = p.add('sig~ 3')
targets = []
cases = [
    ('relay-message-only', None, False, False, False, False),
    ('relay-mixed', None, True, False, False, False),
    ('inner-plus-message-only', '+~ 10', False, False, False, False),
    ('inner-plus-mixed', '+~ 10', True, False, False, False),
    ('fan-message-only', '+~ 10', False, True, False, False),
    ('fan-mixed', '+~ 10', True, True, False, False),
    ('merge-message-only', '+~ 10', False, False, True, False),
    ('merge-mixed', '+~ 10', True, False, True, False),
    ('deep-plus-message-only', '+~ 10', False, False, False, True),
    ('deep-plus-mixed', '+~ 10', True, False, False, True),
]
for label, op, driven, fan, merge, deep in cases:
    obj = p.add('p ' + label, patcher=child(op=op, fan=fan, merge=merge, deep=deep),
                numinlets=2 if merge else 1, numoutlets=2 if fan else 1)
    targets.append((obj, 1 if merge else 0))
    if driven:
        p.wire(signal, obj)
    source = obj
    if op is None:
        # A relay with no DSP object must preserve downstream scalar fallback.
        source = p.add('+~ 10')
        p.wire(obj, source)
    p.channel(source, label, creation='generic inlet/outlet', topology='signal' if driven else 'message-only')
    number = p.add(None, 'number')
    p.wire(obj, number)
    p.tap(number, label + ':number')
    p.tap(obj, label + ':direct-control')
    printer = p.add('print ' + label)
    p.wire(obj, printer)
    if fan:
        p.tap(obj, label + ':fan-number', 1)
constant = p.add('p constant', patcher=child(constant=True), numinlets=0, numoutlets=1)
p.channel(constant, 'constant-outlet')
number = p.add(None, 'number')
p.wire(constant, number)
p.tap(number, 'constant:number')
p.tap(constant, 'constant:direct-control')
error = p.add('error')
p.tap(error, 'max-error')
p.recorder()
p.capture('initial')
for value, stage in [('7', 'message7'), ('9', 'message9')]:
    for obj, inlet in targets:
        p.event(value, obj, inlet)
    p.capture(stage)
p.save()
shutil.copyfile(HERE.parent / 'signal-runtime-20261021/fixtures/probe.js', HERE / 'fixtures/probe.js')
print('Generated original 11-channel dual-domain boundary probe.')
