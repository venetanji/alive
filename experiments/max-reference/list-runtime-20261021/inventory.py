#!/usr/bin/env python3
"""Count aliases in the frozen corpus using SHA-256-matched local originals."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FROZEN = ROOT.parent / 'help-coverage-20261021/help-files.jsonl'
TARGETS = ['iter', 'prepend', 'append', 'zl.reg', 'zl.join', 'zl.len',
           'zl.iter', 'zl.slice', 'zl.rev', 'zl.rot']


def inventory(resources):
    counts = {t: dict(literal_help_instances=0, literal_help_files=0,
                     resolved_help_instances=0, resolved_help_files=0,
                     support_instances=0, support_files=0) for t in TARGETS}
    used = []
    for line in FROZEN.read_text().splitlines():
        entry = json.loads(line)
        if not any(x['namespace'] == 'box' and (x['token'] in TARGETS or x['token'] == 'zl')
                   for x in entry['class_counts']):
            continue
        path = resources / entry['path']
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == entry['sha256'], entry['path']
        local, literal = Counter(), Counter()

        def walk(patcher, inherited='box'):
            namespace = patcher.get('classnamespace', inherited)
            for entry in patcher.get('boxes', []):
                box = entry['box']
                tokens = box.get('text', '').split()
                token = tokens[0] if box.get('maxclass') == 'newobj' and tokens else box.get('maxclass', '')
                if namespace == 'box' and token in TARGETS:
                    literal[token] += 1
                if token == 'zl':
                    index = 2 if len(tokens) > 1 and tokens[1].isdigit() else 1
                    if index < len(tokens):
                        token = 'zl.' + tokens[index]
                if namespace == 'box' and token in TARGETS:
                    local[token] += 1
                if 'patcher' in box:
                    walk(box['patcher'], namespace)

        walk(json.loads(data)['patcher'])
        for target in TARGETS:
            frozen_literal = sum(x['count'] for x in entry['class_counts']
                                 if x['namespace'] == 'box' and x['token'] == target)
            assert frozen_literal == literal[target], (entry['path'], target)
        for target, number in local.items():
            count = counts[target]
            if entry['kind'] == 'help':
                count['literal_help_instances'] += literal[target]
                count['literal_help_files'] += bool(literal[target])
                count['resolved_help_instances'] += number
                count['resolved_help_files'] += 1
            else:
                count['support_instances'] += number
                count['support_files'] += 1
        if local:
            used.append(dict(path=entry['path'], sha256=entry['sha256'], kind=entry['kind'], counts=dict(local)))
    return dict(corpus_help_files=2103, corpus_support_files=42,
                frozen_corpus_sha256=hashlib.sha256(FROZEN.read_bytes()).hexdigest(),
                full_help_conformance={'passing': 0, 'denominator': 2103},
                inventory='static inventory; classic zl mode aliases resolved against hash-matched local JSON',
                union_help_files=sum(entry['kind'] == 'help' for entry in used),
                resolved_help_instances=sum(c['resolved_help_instances'] for c in counts.values()),
                counts=counts, files=used)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--resources', type=Path, default=Path('/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources'))
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    text = json.dumps(inventory(args.resources), indent=2) + '\n'
    if args.check:
        assert (ROOT / 'help-usage.json').read_text() == text
    else:
        (ROOT / 'help-usage.json').write_text(text)
    print('Frozen corpus inventory checked' if args.check else 'Frozen corpus inventory written')
