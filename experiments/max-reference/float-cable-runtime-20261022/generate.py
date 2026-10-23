#!/usr/bin/env python3
"""Build an original finite float and routed-cord observation fixture."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
boxes, lines = [], []


def box(name, kind, rect, **attrs):
    item = dict(id=name, varname=name, maxclass=kind, patching_rect=rect)
    item.update(attrs)
    boxes.append(dict(box=item))


def line(source, destination, **attrs):
    value = dict(source=source, destination=destination)
    value.update(attrs)
    lines.append(dict(patchline=value))


values = [('zero', 'int', 0), ('whole', 'float', 2), ('half', 'float', 2.5),
          ('negative', 'float', -2.5), ('fraction', 'float', .123456789),
          ('small', 'float', .000001), ('tinyneg', 'float', -.0000001),
          ('tiny', 'float', .00000001)]
for i, (name, selector, value) in enumerate(values):
    box('label-' + name, 'comment', [25+i*105, 25, 100, 20], text=name)
    box(name, 'flonum', [25+i*105, 50, 54, 23], format=6, numinlets=1, numoutlets=2, outlettype=['', 'bang'])
    line(['probe', i], [name, 0], hidden=1)
    line([name, 0], ['probe', i], hidden=1)

box('arithmetic-label', 'comment', [25, 110, 450, 20], text='Original scalar multiplication receipts: direct and after flonum')
box('multiply', 'newobj', [25, 140, 54, 23], text='* 0.5', numinlets=2, numoutlets=1)
box('after', 'flonum', [150, 140, 54, 23], format=6, numinlets=1, numoutlets=2, outlettype=['', 'bang'])
line(['probe', 10], ['multiply', 0], hidden=1)
line(['probe', 11], ['multiply', 1], hidden=1)
line(['multiply', 0], ['probe', 10], hidden=1)
line(['multiply', 0], ['after', 0], hidden=1)
line(['after', 0], ['probe', 11], hidden=1)
box('entry-label', 'comment', [310, 110, 270, 20], text='Physical number entry / blur / Tab / drag')
box('entry', 'flonum', [310, 140, 54, 23], format=6, numinlets=1, numoutlets=2, outlettype=['', 'bang'])
line(['probe', 12], ['entry', 0], hidden=1)
line(['entry', 0], ['probe', 12], hidden=1)
box('next-entry', 'flonum', [420, 140, 54, 23], format=6, numinlets=1, numoutlets=2, outlettype=['', 'bang'])
line(['next-entry', 0], ['probe', 13], hidden=1)

routes = [[51.5, 400], [251.5, 380, 371.5, 380],
          [451.5, 360, 500, 360, 500, 445, 571.5, 445],
          [651.5, 400, 651.5, 400], []]
for i, points in enumerate(routes):
    sx, dx = 40+i*200, 140+i*200
    box('route-label-'+str(i), 'comment', [sx, 270, 180, 20], text=['one point', 'two points', 'four points', 'repeated point', 'empty points'][i])
    box('source'+str(i), 'button', [sx, 310, 24, 24], numinlets=1, numoutlets=1, outlettype=['bang'])
    box('sink'+str(i), 'number', [dx, 490, 54, 23], numinlets=1, numoutlets=2, outlettype=['', 'bang'])
    line(['source'+str(i), 0], ['sink'+str(i), 0], midpoints=points)

box('probe', 'newobj', [25, 565, 100, 22], text='js probe.js', hidden=1)
patcher = dict(fileversion=1, appversion=dict(major=9, minor=1, revision=5, architecture='x64', modernui=1),
               classnamespace='box', rect=[15, 15, 1050, 625], default_fontsize=13.0,
               default_fontname='Arial', bgcolor=[1, 1, 1, 1], locked=0, boxes=boxes, lines=lines)
(ROOT/'fixtures/float-cable.maxpat').write_text(json.dumps(dict(patcher=patcher), indent=2)+'\n')
events = []
for lane, (name, selector, value) in enumerate(values):
    events.append(dict(id=name, target=name, lane=lane, selector=selector, atoms=[value]))
events.append(dict(id='entry-initial', target='entry', lane=12, selector='float', atoms=[1.25]))
arithmetic = [('hot-int-3', 10, 'int', [3]), ('hot-float-4', 10, 'float', [4]),
              ('hot-int-negative-3', 10, 'int', [-3]), ('recall-half', 10, 'bang', []),
              ('cold-int-2', 11, 'int', [2]), ('recall-cold-int', 10, 'bang', []),
              ('cold-float-half', 11, 'float', [.5]), ('recall-cold-float', 10, 'bang', []),
              ('cold-float-negative', 11, 'float', [-2.5]), ('hot-int-2', 10, 'int', [2]),
              ('cold-restore-half', 11, 'float', [.5]), ('hot-fraction', 10, 'float', [.25]),
              ('hot-int-zero', 10, 'int', [0]), ('hot-float-zero', 10, 'float', [0])]
for name, lane, selector, atoms in arithmetic:
    events.append(dict(id=name, target='multiply', lane=lane, selector=selector, atoms=atoms))
(ROOT/'fixtures/score.json').write_text(json.dumps(events, indent=2)+'\n')
(ROOT/'manifest.json').write_text(json.dumps(dict(original_fixture=True, values=values, arithmetic=arithmetic,
    route_midpoint_coordinates=routes, format_scope=dict(format=6, rect=[54,23], explicit_decimal_places=False),
    exclusions=['set', 'list', 'other number formats', 'integer-creation multiplication']), indent=2)+'\n')
