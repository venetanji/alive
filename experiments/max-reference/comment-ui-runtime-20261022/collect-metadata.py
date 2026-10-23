#!/usr/bin/env python3
"""Record numeric/schema facts only; never copy installed patch text or assets."""
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as E

ROOT = Path(__file__).resolve().parent
MAX = Path('/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max')
sources = []


def source(path):
    data = path.read_bytes()
    sources.append(dict(resource=str(path.relative_to(MAX)), bytes=len(data),
                        sha256=hashlib.sha256(data).hexdigest()))
    return data


source(MAX / 'Max.exe')
ref = E.fromstring(source(MAX / 'resources/docs/refpages/max-ref/comment.maxref.xml'))
attributes = {}
for attr in ref.findall('./attributelist/attribute'):
    name = attr.attrib['name']
    if name not in ('bubble', 'bubbleside', 'bubblepoint', 'bubbletextmargin'):
        continue
    default = attr.find('./attributelist/attribute[@name="default"]')
    value = float(default.attrib['value'])
    entry = dict(type=attr.attrib['type'], default=int(value) if value.is_integer() else value)
    enums = attr.findall('./attributelist/attribute[@name="enumvals"]/enumlist/enum')
    if enums:
        entry['enum'] = {str(i): e.attrib['name'].lower() for i, e in enumerate(enums)}
    attributes[name] = entry
style = json.loads(source(MAX / 'resources/styles/greenroom/helpfile_label.maxstyle'))
theme = json.loads(source(MAX / 'resources/interfaces/themes/default.maxtheme'))
theme_facts = {k: theme['styledefaults'][k] for k in ('textcolor', 'bubble_bgcolor', 'bubble_outlinecolor')}
targets = []
for name in ('append', 'prepend', 'int', 'float'):
    patcher = json.loads(source(MAX / ('resources/help/max/' + name + '.maxhelp')))['patcher']

    def walk(patcher, path):
        for item in patcher.get('boxes', []):
            box = item['box']
            here = path + '/' + box['id']
            if box.get('maxclass') == 'comment':
                fields = {k: v for k, v in box.items() if k in (
                    'bubble', 'bubbleside', 'bubblepoint', 'bubbletextmargin',
                    'linecount', 'patching_rect', 'fontsize', 'fontname', 'style')}
                targets.append(dict(source=name, path=here, fields=fields,
                                    parent_default_fontsize=patcher.get('default_fontsize'),
                                    parent_default_fontname=patcher.get('default_fontname')))
            if 'patcher' in box:
                walk(box['patcher'], here)

    walk(patcher, 'root')

result = dict(attributes=attributes, linecount_in_comment_attribute_reference=False,
              documented_bubblepoint_range=[0, 1], named_style=style,
              installed_default_theme=theme_facts, targeted_comments=targets, sources=sources)
(ROOT / 'metadata.json').write_text(json.dumps(result, indent=2) + '\n')
print('Recorded schema, colors, style and 12 target comment layout facts without source text')
