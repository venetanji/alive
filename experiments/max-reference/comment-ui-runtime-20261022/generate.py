#!/usr/bin/env python3
"""Generate original comment geometry fixtures; no installed patch text is used."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FIXTURES = ROOT / 'fixtures'
FIXTURES.mkdir(exist_ok=True)
(ROOT / 'results').mkdir(exist_ok=True)
boxes = []


def comment(name, text, rect, **attrs):
    obj = dict(id=name, varname=name, maxclass='comment', text=text,
               patching_rect=rect, numinlets=1, numoutlets=0,
               fontname='Arial', fontsize=13.0)
    obj.update(attrs)
    boxes.append(dict(box=obj))


for side in range(4):
    for row, point in enumerate((0.0, 0.5, 1.0)):
        comment('side%d-point%d' % (side, row), 'Alpha beta\ngamma delta',
                [20 + side * 175, 30 + row * 100, 145, 70],
                bubble=1, bubbleside=side, bubblepoint=point)

words = 'One two three four five six seven eight nine ten eleven twelve.'
for row, count in enumerate((None, 1, 2, 7)):
    attrs = {} if count is None else dict(linecount=count)
    comment('plain-count-' + str(count), words, [740, 30 + row * 100, 160, 70], **attrs)
    comment('bubble-count-' + str(count), words, [940, 30 + row * 100, 160, 70], bubble=1, **attrs)

for col, margin in enumerate((0, 5, 10)):
    comment('margin%d' % margin, 'Alpha beta\ngamma delta',
            [20 + col * 220, 470, 190, 70], bubble=1, bubbletextmargin=margin)
comment('plain-newline', 'Alpha beta\ngamma delta', [740, 470, 160, 70])
comment('plain-longword', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk', [940, 470, 160, 70])
comment('plain-smallrect', words, [740, 580, 160, 21], linecount=7)
comment('bubble-smallrect', words, [940, 580, 160, 21], bubble=1, linecount=7)
comment('inherited', 'Font inheritance specimen', [20, 610, 300, 40])
boxes[-1]['box'].pop('fontsize')
comment('named-style', 'Named style specimen', [350, 610, 300, 40], style='helpfile_label')
boxes[-1]['box'].pop('fontsize')
comment('explicit12', 'Explicit twelve specimen', [20, 680, 300, 40], fontsize=12.0)
comment('explicit13', 'Explicit thirteen specimen', [350, 680, 300, 40])
boxes.append(dict(box=dict(id='probe', maxclass='newobj', text='js probe.js',
                           patching_rect=[20, 760, 100, 22], hidden=1)))
patcher = dict(fileversion=1, appversion=dict(major=9, minor=1, revision=5, architecture='x64', modernui=1),
               classnamespace='box', rect=[0, 0, 1220, 840], default_fontsize=13.0,
               default_fontname='Arial', bgcolor=[1, 1, 1, 1], locked=1,
               boxes=boxes, lines=[])
(FIXTURES / 'comment-layout.maxpat').write_text(json.dumps(dict(patcher=patcher), indent=2) + '\n')
(ROOT / 'manifest.json').write_text(json.dumps(dict(
    original_fixture=True, comment_count=len(boxes)-1,
    questions=['side enum and point direction', 'arrow reserve and text margin',
               'linecount disagreement', 'wrapping, explicit newline, height', 'font inheritance'],
    requested=[w['box'] for w in boxes if w['box']['maxclass']=='comment']), indent=2) + '\n')
