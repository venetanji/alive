#!/usr/bin/env python3
"""Inventory licensed local help hierarchy without copying patch/script bodies."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET


HERE = Path(__file__).resolve().parent
DEFAULT = Path('/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources')
NAMES = ['append', 'prepend', 'int', 'float']
XML = {
    'patcher': ['./discussion', './objarglist/objarg', './attributelist/attribute[@name="showontab"]'],
    'inlet': ['./description', './methodlist/method[@name="(mouse)"]'],
    'outlet': ['./description', './methodlist/method[@name="(mouse)"]'],
    'loadbang': ['./description', './methodlist/method'],
    'loadmess': ['./description', './objarglist/objarg', './methodlist/method', './attributelist/attribute[@name="defer"]'],
    'thispatcher': ['./discussion', './methodlist/method[@name="setactivetab"]', './/entry[@name="front"]', './/entry[@name="loadbang"]', './/entry[@name="dispose"]'],
    'pcontrol': ['./methodlist/method[@name="open"]', './methodlist/method[@name="close"]', './methodlist/method[@name="load"]', './methodlist/method[@name="loadunique"]'],
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def identity(path, base):
    raw = path.read_bytes()
    return {'path': path.relative_to(base).as_posix(), 'bytes': len(raw), 'sha256': sha(raw)}


def inspect(base):
    result = {'schema': 1, 'evidence': 'installed-static-sources-not-executed', 'help': {}, 'xml': {}, 'guides': {}, 'scripts': {}, 'connector_shapes': {}}
    for name in NAMES:
        path = base / 'help/max' / (name + '.maxhelp')
        root = json.loads(path.read_text())['patcher']
        patchers = []
        queue = [(root, '/patcher', None)]
        for patcher, anchor, owner in queue:
            boxes, classes = [], Counter()
            for i, entry in enumerate(patcher.get('boxes', [])):
                box = entry['box']
                text = box.get('text', '')
                token = text.split()[0] if box['maxclass'] == 'newobj' and text else box['maxclass']
                classes[token] += 1
                fact = {k: box[k] for k in ['id', 'maxclass', 'numinlets', 'numoutlets', 'index', 'varname', 'patching_rect', 'ignoreclick', 'filename', 'jsarguments'] if k in box}
                fact.update(anchor=anchor + '/boxes/' + str(i) + '/box', token=token)
                if text:
                    fact['text_sha256'] = sha(text.encode())
                    if box['maxclass'] == 'newobj':
                        fact['creation_argument_count'] = len(text.split()) - 1
                if 'patcher' in box:
                    child = fact['anchor'] + '/patcher'
                    fact['child_patcher'] = child
                    queue.append((box['patcher'], child, box['id']))
                boxes.append(fact)
            patchers.append({'anchor': anchor, 'owner_box': owner, 'boxes': boxes,
                             'box_count': len(boxes), 'line_count': len(patcher.get('lines', [])),
                             'tokens': dict(sorted(classes.items())),
                             'attributes': {k: patcher[k] for k in ['showontab', 'openinpresentation', 'rect', 'bglocked', 'bgcolor', 'locked_bgcolor', 'editing_bgcolor'] if k in patcher},
                             'dependencies': [{k: dep[k] for k in ['name', 'type', 'implicit'] if k in dep} for dep in patcher.get('dependency_cache', [])]})
        result['help'][name] = {**identity(path, base), 'patchers': patchers,
                                'total_boxes': sum(p['box_count'] for p in patchers),
                                'total_lines': sum(p['line_count'] for p in patchers)}
    for name, queries in XML.items():
        path = base / 'docs/refpages/max-ref' / (name + '.maxref.xml')
        root = ET.parse(path).getroot()
        citations = []
        for query in queries:
            matches = root.findall(query)
            if not matches:
                raise ValueError((name, query))
            for element in matches:
                citations.append({'selector': query, 'attributes': dict(element.attrib),
                                  'element_sha256': sha(ET.tostring(element, encoding='utf-8'))})
        result['xml'][name] = {**identity(path, base), 'citations': citations,
                               'documented_attributes': [e.get('name') for e in root.findall('./attributelist/attribute')]}
    for name in ['patcher_lifecycle', 'abstractions', 'subpatchers']:
        path = base / 'docs/userguide/content' / (name + '.json')
        data = json.loads(path.read_text())
        result['guides'][name] = {**identity(path, base), 'headings': data['headings'],
                                  'content_sha256': sha(data['content'].encode())}
    for name in ['helpstarter.js', 'helpname.js', 'helpdetails.js', 'helpargs.js']:
        path = base / 'help/resources' / name
        result['scripts'][name] = identity(path, base)
    for name in ['patcher', 'inlet', 'outlet']:
        path = base / 'help/max' / (name + '.maxhelp')
        root = json.loads(path.read_text())['patcher']
        connectors = []
        queue = [(root, '/patcher')]
        for patcher, anchor in queue:
            for i, entry in enumerate(patcher.get('boxes', [])):
                box = entry['box']
                location = anchor + '/boxes/' + str(i) + '/box'
                if box['maxclass'] in ['inlet', 'outlet']:
                    connectors.append({'anchor': location, **{k: box[k] for k in ['id', 'maxclass', 'index', 'patching_rect', 'numinlets', 'numoutlets', 'outlettype'] if k in box}})
                if 'patcher' in box:
                    queue.append((box['patcher'], location + '/patcher'))
        result['connector_shapes'][name] = {**identity(path, base), 'connectors': connectors}
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--resources', type=Path, default=DEFAULT)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    encoded = json.dumps(inspect(args.resources), indent=2, ensure_ascii=True) + '\n'
    output = HERE / 'sources.json'
    if args.check:
        assert output.read_text() == encoded, 'Installed source facts changed'
    else:
        output.write_text(encoded)
    print('Validated four whole help trees, seven XML references, three guides, and four script identities; source inspection only.')
