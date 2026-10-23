#!/usr/bin/env python3
"""Generate original authored tab probes; no installed help content is copied."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FIX = ROOT / 'fixtures'
FIX.mkdir(parents=True, exist_ok=True)
(ROOT / 'results').mkdir(exist_ok=True)


def box(id, kind, rect, **fields):
    return {'box': {'id': id, 'maxclass': kind, 'patching_rect': rect, **fields}}


def patch(boxes, lines=(), **fields):
    return {'fileversion': 1, 'appversion': {'major': 9, 'minor': 1, 'revision': 5,
            'architecture': 'x64', 'modernui': 1}, 'rect': [100, 100, 780, 570],
            'openinpresentation': 0, 'default_fontsize': 16, 'default_fontname': 'Arial',
            'boxes': boxes, 'lines': list(lines), **fields}


def comment(id, text, y=90):
    return box(id, 'comment', [20, y, 660, 28], text=text)


for name, showroot, reverse in [('root-hidden', 0, False), ('root-shown', 1, False),
                                ('order-reversed', 0, True)]:
    local = patch([comment('title', 'LOCAL TAB: showontab 1 inside Zeta')], showontab=1)
    promoted = patch([comment('title', 'PROMOTED TAB: showontab 2 inside Zeta')], showontab=2)
    hidden = patch([comment('title', 'HIDDEN CHILD: showontab 0')], showontab=0)
    zeta = patch([
        comment('title', 'ZETA CONTENT: root header should be independently identifiable'),
        box('value', 'number', [20, 140, 90, 28], varname='value', parameter_enable=0),
        box('local', 'newobj', [330, 250, 100, 25], text='p Local', patcher=local, varname='local'),
        box('promoted', 'newobj', [200, 290, 120, 25], text='p Promoted', patcher=promoted),
        box('hidden', 'newobj', [20, 330, 120, 25], text='p Hidden', patcher=hidden),
        box('this', 'newobj', [20, 410, 100, 25], text='thispatcher', varname='this'),
    ], showontab=1, showrootpatcherontab=1)
    alpha = patch([comment('title', 'ALPHA CONTENT: second saved root tab')], showontab=1)
    children = [box('zeta', 'newobj', [450, 260, 90, 25], text='p Zeta', varname='zeta', patcher=zeta),
                box('alpha', 'newobj', [20, 100, 90, 25], text='p Alpha', patcher=alpha)]
    if reverse:
        children.reverse()
    root = patch([
        comment('header', 'ROOT HEADER: this belongs to root canvas only', 10),
        *children,
        box('probe', 'newobj', [20, 430, 260, 25], text='js probe.js ' + name),
        box('this', 'newobj', [20, 475, 100, 25], text='thispatcher', varname='this'),
    ], [{'patchline': {'source': ['probe', 0], 'destination': ['this', 0]}}],
       showrootpatcherontab=showroot, showontab=0, bglocked=1)
    (FIX / (name + '.maxpat')).write_text(json.dumps({'patcher': root}, indent=2) + '\n')
