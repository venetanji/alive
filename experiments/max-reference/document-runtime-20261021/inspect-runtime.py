#!/usr/bin/env python3
"""Inspect installed Max reference/help data without evaluating or launching it."""

import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET


HERE = Path(__file__).resolve().parent
DEFAULT_RESOURCES = Path('/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources')
XML = {
    'send': ('max-ref', ['./description', './discussion', './objarglist/objarg[@name="name"]', './methodlist/method[@name="anything"]']),
    'receive': ('max-ref', ['./description', './discussion', './objarglist/objarg[@name="name"]', './methodlist/method[@name="set"]']),
    'pcontrol': ('max-ref', ['./methodlist/method[@name="load"]', './methodlist/method[@name="open"]', './methodlist/method[@name="close"]']),
    'thispatcher': ('max-ref', ['./discussion', './/entry[@name="front"]', './/entry[@name="title"]', './/entry[@name="write"]']),
    'dac~': ('msp-ref', ['./methodlist/method[@name="int"]', './methodlist/method[@name="start"]', './methodlist/method[@name="stop"]', './methodlist/method[@name="startwindow"]']),
}
GUIDES = {
    'objects': ['help-files-and-reference'],
    'documentation_window': ['documentation-window', 'using-the-object-reference'],
    'patcher_lifecycle': ['opening-a-patcher', 'subpatchers', 'object-initialization', 'patchcord-connection', 'loadbang-and-loadmess', 'window-activity', 'dspstate~-and-signal-processing', 'closing-a-patcher'],
    'abstractions': ['unique-identifiers'],
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_fact(path, resources):
    data = path.read_bytes()
    return {'path': path.relative_to(resources).as_posix(), 'bytes': len(data), 'sha256': digest(data)}


def inspect(resources):
    result = {'schema': 1, 'evidence': 'installed-static-documentation-and-saved-help-shapes',
              'xml': {}, 'guides': {}, 'help': {}}
    for name, (directory, selectors) in XML.items():
        path = resources / 'docs/refpages' / directory / (name + '.maxref.xml')
        root = ET.parse(path).getroot()
        citations = []
        for selector in selectors:
            matches = root.findall(selector)
            if len(matches) != 1:
                raise ValueError(f'{name}: {selector} resolved {len(matches)} times')
            element = matches[0]
            citations.append({'selector': selector, 'attributes': dict(element.attrib),
                              'element_sha256': digest(ET.tostring(element, encoding='utf-8'))})
        result['xml'][name] = {**file_fact(path, resources), 'citations': citations,
                              'method_names': [method.get('name') for method in root.findall('./methodlist/method')],
                              'arguments': [dict(arg.attrib) for arg in root.findall('./objarglist/objarg')]}
    for name, headings in GUIDES.items():
        path = resources / 'docs/userguide/content' / (name + '.json')
        data = json.loads(path.read_text())
        available = {heading['id']: heading for heading in data['headings']}
        for heading in headings:
            if heading not in available:
                raise ValueError(f'{name}: missing heading {heading}')
        # The content field is compiled MDX JavaScript. Hash it as data; never execute it.
        result['guides'][name] = {**file_fact(path, resources),
                                 'headings': [available[heading] for heading in headings],
                                 'content_sha256': digest(data['content'].encode())}
    for name in ['send', 'receive']:
        path = resources / 'help/max' / (name + '.maxhelp')
        data = json.loads(path.read_text())
        queue = [(data['patcher'], [])]
        boxes = []
        for patcher, parent in queue:
            for item in patcher.get('boxes', []):
                box = item['box']
                location = parent + [box['id']]
                if isinstance(box.get('patcher'), dict):
                    queue.append((box['patcher'], location))
                words = box.get('text', '').split()
                if box.get('maxclass') == 'newobj' and words and words[0] in ['s', 'send', 'r', 'receive']:
                    boxes.append({'box_path': location, 'class': words[0], 'argument_count': len(words) - 1,
                                  'creation_sha256': digest(box['text'].encode()),
                                  'numinlets': box.get('numinlets'), 'numoutlets': box.get('numoutlets')})
        if not boxes:
            raise ValueError(f'{name}: no matching saved help boxes')
        result['help'][name] = {**file_fact(path, resources), 'bus_boxes': boxes}
    send = result['xml']['send']
    receive = result['xml']['receive']
    assert send['arguments'][0]['optional'] == '0'
    assert receive['arguments'][0]['optional'] == '1'
    assert 'set' not in send['method_names'] and 'set' in receive['method_names']
    expected = {('s', 1, 1, 0), ('send', 1, 1, 0), ('receive', 0, 1, 1), ('r', 1, 0, 1), ('receive', 1, 0, 1)}
    actual = {(b['class'], b['argument_count'], b['numinlets'], b['numoutlets'])
              for help_file in result['help'].values() for b in help_file['bus_boxes']}
    assert expected <= actual, expected - actual
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--resources', type=Path, default=DEFAULT_RESOURCES)
    parser.add_argument('--output', type=Path, default=HERE / 'evidence.json')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    encoded = json.dumps(inspect(args.resources), indent=2, ensure_ascii=True) + '\n'
    if args.check:
        if args.output.read_text() != encoded:
            raise SystemExit('Installed evidence differs from the saved report')
    else:
        args.output.write_text(encoded)
    print('Validated 5 XML references, 4 guide files, and 2 help files; no Max process launched.')


if __name__ == '__main__':
    main()
