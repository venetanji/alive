#!/usr/bin/env python3
"""Create original finite hierarchy probes; no installed help bodies are copied."""
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
FIXTURES = HERE / 'fixtures'
BUS = 'alive-hierarchy-reference-20261021'


def patch():
    return {'fileversion': 1, 'appversion': {'major': 9, 'minor': 1, 'revision': 5, 'architecture': 'x64', 'modernui': 1},
            'classnamespace': 'box', 'rect': [0., 0., 1000., 800.], 'boxes': [], 'lines': []}


def box(p, ident, text=None, cls='newobj', x=20, y=30, **attrs):
    b = {'id': ident, 'maxclass': cls, 'patching_rect': [float(x), float(y), 180., 24.], **attrs}
    if text is not None:
        b['text'] = text
    p['boxes'].append({'box': b})
    return ident


def line(p, src, dst, source=0, inlet=0):
    p['lines'].append({'patchline': {'source': [src, source], 'destination': [dst, inlet]}})


def startup(p, label, y=100):
    a = box(p, label + '-load', 'loadmess ' + label + ' #0 #1 #2 #3 #0-tail tail-#0 #1-tail tail-#1', y=y)
    b = box(p, label + '-send', 's ' + BUS, y=y+40)
    line(p, a, b)


def port_probe(name, mode, coords, order):
    p = patch()
    for side in order:
        x, y = coords[side]
        # A is intentionally index2 and B index1, regardless of geometry.
        attrs = {'index': 2 if side == 'A' else 1} if mode == 'explicit' else {}
        a = box(p, 'in-' + side, cls='inlet', x=x, y=y, numinlets=0, numoutlets=1, **attrs)
        b = box(p, 'tag-' + side, 'prepend ' + name + '-' + side, x=x, y=y+70)
        c = box(p, 'out-' + side, cls='outlet', x=x, y=y+140, numinlets=1, numoutlets=0, **attrs)
        line(p, a, b)
        line(p, b, c)
    return p


def abstraction():
    p = patch()
    a = box(p, 'scope', 'loadmess abstract #0 #1 #2 #3 #0-tail tail-#0 #1-tail tail-#1')
    b = box(p, 'out', cls='outlet', x=20, y=160, index=1)
    line(p, a, b)
    child = patch()
    startup(child, 'abstract-nested')
    box(p, 'embedded', 'p embedded childArg 99', patcher=child, x=300, numinlets=0, numoutlets=0)
    c = box(p, 'msg-bang', 'loadbang', x=20, y=220)
    d = box(p, 'literal', '#0 #1 #2 #3 #0-tail tail-#0 #1-tail tail-#1', cls='message', x=20, y=260)
    e = box(p, 'msg-tag', 'prepend abstract-message', x=20, y=300)
    f = box(p, 'msg-out', cls='outlet', x=20, y=350, index=2)
    line(p, c, d)
    line(p, d, e)
    line(p, e, f)
    return p


def main():
    FIXTURES.mkdir(exist_ok=True)
    (HERE / 'results').mkdir(exist_ok=True)
    root = patch()
    collector = box(root, 'collector', 'js collector.js', varname='collector')
    r = box(root, 'bus', 'r ' + BUS, x=250)
    line(root, r, collector)
    startup(root, 'root-load', y=100)
    embedded = patch()
    startup(embedded, 'root-nested')
    box(root, 'scope-embedded', 'p scope ownArg 42', patcher=embedded, x=500, numinlets=0, numoutlets=0)
    for i, args in enumerate(['17 alpha', '23 beta']):
        obj = box(root, 'abstract-' + str(i), 'hierarchy-abstract ' + args, x=400+i*200, y=120, numinlets=0, numoutlets=2)
        for outlet in [0, 1]:
            tag = box(root, 'abstract-tag-' + str(i) + '-' + str(outlet), 'prepend abstract-' + str(i) + '-out-' + str(outlet), x=400+i*200, y=180+40*outlet)
            line(root, obj, tag, outlet)
            line(root, tag, collector)
    events = []

    def event(text, destination, inlet=0):
        ident = 'event-' + str(len(events))
        msg = box(root, ident, text, cls='message', y=350+len(events)*3, varname=ident)
        line(root, msg, destination, inlet=inlet)
        events.append({'id': ident, 'message': text, 'destination': destination, 'inlet': inlet})

    modes = [
        ('explicit', 'explicit', {'A': (50, 20), 'B': (250, 20)}, ['A', 'B']),
        ('geometry', 'none', {'A': (50, 20), 'B': (250, 20)}, ['B', 'A']),
        ('tie-y', 'none', {'A': (50, 200), 'B': (50, 20)}, ['A', 'B']),
        ('tie-array', 'none', {'A': (50, 20), 'B': (50, 20)}, ['A', 'B']),
        ('tie-reversed', 'none', {'A': (50, 20), 'B': (50, 20)}, ['B', 'A']),
    ]
    for i, (name, mode, coords, order) in enumerate(modes):
        obj = box(root, name, 'p ' + name, patcher=port_probe(name, mode, coords, order), numinlets=2, numoutlets=2, x=20+i*180, y=260)
        for outlet in [0, 1]:
            tag = box(root, name + '-out-' + str(outlet), 'prepend ' + name + '-out-' + str(outlet), x=20+i*180, y=300+outlet*30)
            line(root, obj, tag, outlet)
            line(root, tag, collector)
        event(str(100+i*10), obj, 0)
        event(str(101+i*10), obj, 1)
    lifecycle = patch()
    a = box(lifecycle, 'counter-in', cls='inlet', index=1)
    b = box(lifecycle, 'stored', 'int 3', y=90)
    c = box(lifecycle, 'counter-out', cls='outlet', y=150, index=1)
    line(lifecycle, a, b)
    line(lifecycle, b, c)
    a = box(lifecycle, 'patcher-in', cls='inlet', x=300, index=2)
    b = box(lifecycle, 'patcher', 'thispatcher', x=300, y=90)
    line(lifecycle, a, b)
    startup(lifecycle, 'lifecycle-load', y=200)
    grandchild = patch()
    startup(grandchild, 'lifecycle-deep-load')
    box(lifecycle, 'deep', 'p deep', patcher=grandchild, x=450, numinlets=0, numoutlets=0)
    obj = box(root, 'lifecycle', 'p lifecycle', patcher=lifecycle, x=500, y=450, numinlets=2, numoutlets=1)
    tag = box(root, 'lifecycle-tag', 'prepend lifecycle-value', x=500, y=500)
    line(root, obj, tag)
    line(root, tag, collector)
    pc = box(root, 'pcontrol', 'pcontrol', x=700, y=400)
    line(root, pc, obj)
    event('77', obj)
    event('open', pc)
    event('close', pc)
    event('open', pc)
    event('bang', obj)
    event('loadbang', obj, 1)
    event('bang', obj)
    for name, value in [('hierarchy', root), ('hierarchy-abstract', abstraction())]:
        (FIXTURES / (name + '.maxpat')).write_text(json.dumps({'patcher': value}, indent=2) + '\n')
    (FIXTURES / 'hierarchy.score.json').write_text(json.dumps({'events': events}, indent=2) + '\n')
    print('Generated two original patches and 17 scored input events.')


if __name__ == '__main__':
    main()
