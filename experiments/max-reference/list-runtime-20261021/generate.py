#!/usr/bin/env python3
"""Generate original finite scores; read installed docs only for source identities."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TARGETS = ['iter', 'prepend', 'append', 'zl.reg', 'zl.join', 'zl.len',
           'zl.iter', 'zl.slice', 'zl.rev', 'zl.rot']


def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


class Patch:
    def __init__(self):
        self.boxes, self.lines, self.labels, self.events, self.targets = [], [], [], [], []

    def add(self, text, cls='newobj', **kwargs):
        bid = 'obj-' + str(len(self.boxes) + 1)
        self.boxes.append({'box': dict(id=bid, maxclass=cls, text=text,
                          patching_rect=[20. + len(self.boxes) % 6 * 180,
                                         60. + len(self.boxes) // 6 * 40, 170., 22.], **kwargs)})
        return bid

    def wire(self, src, dst, outlet=0, inlet=0):
        self.lines.append({'patchline': {'source': [src, outlet], 'destination': [dst, inlet]}})

    def target(self, text, key):
        bid = self.add(text, varname=key)
        outlets = 2 if text.startswith('zl.') else 1
        for outlet in range(outlets):
            self.labels.append(key + ':' + str(outlet))
            self.wire(bid, 'logger', outlet, len(self.labels) - 1)
        self.targets.append(dict(id=bid, key=key, creation=text, outlets=outlets))
        return bid

    def event(self, dst, text, inlet=0, case=None):
        name = 'event_' + str(len(self.events))
        message = self.add(text, 'message', varname=name)
        self.wire(message, dst, inlet=inlet)
        self.wire(message, 'logger', inlet=63)
        self.events.append(dict(id=name, message=text, destination=dst, inlet=inlet, case=case or text))

    def direct(self, dst, selector, atoms=None, inlet=0):
        name = 'event_' + str(len(self.events))
        self.events.append(dict(id=name, message=selector, selector=selector, atoms=atoms or [],
                               destination=dst, inlet=inlet, direct=True, case='direct ' + selector))

    def save(self, name='list-objects'):
        labels = self.labels + ['$unused'] * (62 - len(self.labels)) + ['$feedback', '$delivery']
        self.boxes.append({'box': dict(id='logger', maxclass='newobj', text='js probe.js ' + name,
                          numinlets=64, numoutlets=0, varname='logger', patching_rect=[20., 20., 480., 22.])})
        write(ROOT / ('fixtures/' + name + '.maxpat'), {'patcher': dict(fileversion=1,
              appversion=dict(major=9, minor=1, revision=5, architecture='x64', modernui=1),
              classnamespace='box', rect=[0., 0., 1200., 900.], boxes=self.boxes, lines=self.lines)})
        write(ROOT / ('fixtures/' + name + '.score.json'), dict(fixture=name, labels=labels,
              targets=self.targets, events=self.events, drain_ms=100))


def generate(resources):
    (ROOT / 'fixtures').mkdir(exist_ok=True)
    (ROOT / 'results').mkdir(exist_ok=True)
    p = Patch()
    common = ['bang', '42', 'bang', '42.', 'list 42', 'list 42.', 'list apple',
              'symbol apple', 'apple', 'apple 3 pear', 'list apple 3 pear',
              'list 1 2. apple 4', 'bang', 'list', 'bang', 'set 8 9', 'bang',
              'zlclear', 'bang', 'zlreset', 'bang']
    creations = ['iter', 'prepend head 9', 'append 9 tail', 'zl.reg', 'zl.join tail 9',
                 'zl.len', 'zl.iter 2', 'zl.slice 2', 'zl.rev', 'zl.rot 1']
    for creation, key in zip(creations, TARGETS):
        target = p.target(creation, key)
        for text in common:
            p.event(target, text)
        if key.startswith('zl.'):
            for text, inlet in [('list 1 2 3 4 5', 0), ('bang', 1), ('bang', 0),
                                ('list 7 8', 1), ('bang', 0), ('3', 1), ('bang', 0),
                                ('0', 1), ('bang', 0), ('-1', 1), ('bang', 0),
                                ('list', 1), ('bang', 0), ('zlreset', 0), ('bang', 0),
                                ('zlclear', 0), ('bang', 0)]:
                p.event(target, text, inlet, 'cold-and-recall: ' + text)
    for key, creation in [('prepend-default', 'prepend'), ('append-default', 'append'),
                          ('reg-initial', 'zl.reg first 7.'), ('join-default', 'zl.join'),
                          ('iter-default', 'zl.iter'), ('slice-default', 'zl.slice'),
                          ('rot-default', 'zl.rot')]:
        target = p.target(creation, key)
        for text in ['bang', 'list 1 2 3', 'bang', 'list', 'bang', 'set', 'bang']:
            p.event(target, text)
    for key, creation in [('prepend-list', 'prepend list'), ('prepend-numeric', 'prepend 7'),
                          ('append-symbol', 'append tail')]:
        target = p.target(creation, key)
        for text in ['bang', '8', 'list 8', 'symbol apple', 'apple 3', 'set foo 9',
                     'bang', '8', 'set', 'bang', 'list 1 2']:
            p.event(target, text)
    p.save()
    p = Patch()
    for text in ['zl.iter 2', 'zl.slice 2', 'zl.rot 1']:
        target = p.target(text, text.split()[0])
        for message in ['list 1 2 3 4 5', 'zlclear', 'list 1 2 3 4 5', 'bang',
                        'zlreset', 'list 1 2 3 4 5', 'bang']:
            p.event(target, message)
    # Direct JS calls distinguish target-level empty input from the message
    # box's own suppression/canonicalization of an empty authored list.
    for text in ['iter', 'prepend head', 'append tail', 'zl.reg', 'zl.join 9',
                 'zl.len', 'zl.iter 2', 'zl.slice 2', 'zl.rev', 'zl.rot 1']:
        key = text.split()[0] + '-direct'
        target = p.target(text, key)
        for selector, atoms in [('list', [1, 2, 3]), ('list', []), ('bang', []),
                                ('symbol', ['apple']), ('bang', [])]:
            p.direct(target, selector, atoms)
    p.save('list-edge')
    p = Patch()
    for creation, key in [('append', 'append-empty'), ('prepend', 'prepend-empty')]:
        target = p.target(creation, key)
        for message in ['bang', '8', '8.', 'list 8', 'list apple', 'symbol apple', 'apple',
                        'apple 3', 'set tail', '8', 'set', 'bang', '8', '8.', 'list 8',
                        'list apple', 'symbol apple', 'apple', 'apple 3']:
            p.event(target, message)
    target = p.target('iter', 'iter-symbol-recall')
    for message in ['symbol apple', 'bang', 'apple 3 pear', 'bang', 'list apple 3 pear',
                    'bang', 'list symbol apple', 'bang', 'symbol apple', 'bang']:
        p.event(target, message)
    for creation, key in [('zl.reg first 7', 'reg-cold-reset'), ('zl.join tail 9', 'join-cold-reset'),
                          ('zl.iter 2', 'iter-cold-reset'), ('zl.slice 2', 'slice-cold-reset'),
                          ('zl.rot 1', 'rot-cold-reset')]:
        target = p.target(creation, key)
        for message, inlet in [('list 1 2 3 4 5', 0), ('zlclear', 1), ('bang', 0),
                                ('list 1 2 3 4 5', 0), ('3', 1), ('zlreset', 1),
                                ('bang', 0), ('list 1 2 3 4 5', 0)]:
            p.event(target, message, inlet)
    # Downstream cold updates are finite because the cold inlet emits no data.
    target = p.target('zl.iter 2', 'iter-reentrant-size')
    replacement = p.add('3', 'message')
    trigger = p.add('t b')
    p.wire(target, trigger)
    p.wire(trigger, replacement)
    p.wire(replacement, target, inlet=1)
    p.wire(replacement, 'logger', inlet=62)
    p.event(target, 'list 1 2 3 4 5 6 7')
    p.event(target, 'bang')
    p.save('list-followup')
    p = Patch()
    for key, messages in [
        ('fresh-symbol', ['symbol apple', 'bang', 'bang']),
        ('fresh-anything', ['apple 3 pear', 'bang', 'bang']),
        ('list-symbol', ['list symbol apple', 'symbol apple', 'bang', 'bang']),
        ('list-numbers', ['list 8 9', 'symbol apple', 'bang', 'bang']),
        ('list-long', ['list 8 9 10 11', 'foo 8 9', 'bang', 'bang']),
        ('anything-repeat', ['foo 8 9', 'bang', 'foo 8 9', 'bang', 'pear 1', 'bang']),
        ('bare', ['apple', 'bang', 'pear', 'bang']),
        ('grow', ['foo 1', 'bang', 'foo 1 2', 'bang', 'foo 1 2 3', 'bang',
                  'list 1 2', 'bar 3 4 5', 'bang', 'bar 1 2 3 4 5', 'bang',
                  'short', 'bang']),
    ]:
        target = p.target('iter', key)
        for message in messages:
            p.event(target, message)
    p.save('iter-recall')
    p = Patch()
    for text in ['zl.iter 1', 'zl.slice 1', 'zl.rot 1']:
        target = p.target(text, text.split()[0])
        p.event(target, 'list 1 2 3 4 5')
        for message in ['list 2 apple', 'list 2.9 8', '2.9', '-2.9',
                        'symbol 3', 'apple 2', 'list apple 2']:
            p.event(target, message, 1)
            p.event(target, 'bang')
    for key, first, second in [('list3', 'list 1 2 3', 'foo 1 2 3'),
                               ('list5', 'list 1 2 3 4 5', 'foo 1 2 3 4 5'),
                               ('scalar-first', '8', 'foo 1'),
                               ('list1-first', 'list 8', 'foo 1'),
                               ('list-empty', 'list 1 2 3', 'foo 1 2 3 4')]:
        target = p.target('iter', key)
        p.event(target, first)
        if key == 'list-empty':
            p.direct(target, 'list')
        p.event(target, second)
        p.event(target, 'bang')
    p.save('list-cold')
    p = Patch()
    for key, first, messages in [
        ('list3-growth', 'list 1 2 3', ['foo 1 2 3', 'bang', 'foo 1 2 3 4 5', 'bang',
                                     'foo 1 2 3 4 5 6', 'bang']),
        ('list5-growth', 'list 1 2 3 4 5', ['foo 1 2 3 4 5', 'bang',
                                         'foo 1 2 3 4 5 6 7', 'bang']),
    ]:
        target = p.target('iter', key)
        p.event(target, first)
        for message in messages:
            p.event(target, message)
    for creation in ['zl.iter 2', 'zl.slice 2', 'zl.rot 2']:
        target = p.target(creation, creation.split()[0])
        p.event(target, 'list 1 2 3 4 5')
        for message in ['symbol 3', 'apple 2', 'list apple 2']:
            p.event(target, '2', 1)
            p.event(target, message, 1)
            p.event(target, 'bang')
    p.save('list-precision')
    sources = []
    for target in TARGETS:
        for pattern in ['docs/refpages/**/' + target + '.maxref.xml', 'help/**/' + target + '.maxhelp']:
            for path in resources.glob(pattern):
                data = path.read_bytes()
                sources.append(dict(target=target, path=str(path.relative_to(resources)), bytes=len(data),
                                    sha256=hashlib.sha256(data).hexdigest()))
    write(ROOT / 'sources.json', dict(resource_root=str(resources), sources=sources))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--resources', type=Path, default=Path('/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources'))
    generate(parser.parse_args().resources)
