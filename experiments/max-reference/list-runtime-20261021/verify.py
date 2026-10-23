#!/usr/bin/env python3
"""Check retained evidence without launching Max or requiring licensed assets."""
import argparse
import hashlib
import json
from pathlib import Path

from normalize import normalize

ROOT = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def artifacts():
    return {str(p.relative_to(ROOT)): digest(p) for p in ROOT.rglob('*')
            if p.is_file() and p.name != 'bundle.json' and '__pycache__' not in p.parts}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--refresh-manifest', action='store_true')
    parser.add_argument('--installed', type=Path)
    args = parser.parse_args()
    if args.refresh_manifest:
        (ROOT / 'bundle.json').write_text(json.dumps(dict(schema='ultra-max-list-evidence-v1',
                                         files=artifacts()), indent=2) + '\n')
    bundle = json.loads((ROOT / 'bundle.json').read_text())
    assert bundle['files'] == artifacts(), 'Evidence artifact identities changed'
    case_count, raw_count, feedback_count = 0, 0, 0
    for path in sorted((ROOT / 'fixtures').glob('*.score.json')):
        name = path.name.removesuffix('.score.json')
        score = json.loads(path.read_text())
        normalized = json.loads((ROOT / ('normalized-' + name + '.json')).read_text())
        assert normalized == normalize(name), name
        patcher = json.loads((ROOT / 'fixtures' / (name + '.maxpat')).read_text())['patcher']
        boxes = {entry['box']['id']: entry['box'] for entry in patcher['boxes']}
        assert len(boxes) == len(patcher['boxes'])
        for line in patcher['lines']:
            edge = line['patchline']
            assert edge['source'][0] in boxes and edge['destination'][0] in boxes
        for target in score['targets']:
            assert boxes[target['id']]['text'] == target['creation']
            assert boxes[target['id']]['varname'] == target['key']
        varnames = {box.get('varname'): key for key, box in boxes.items()}
        for event in score['events']:
            assert event['destination'] in boxes
            if not event.get('direct'):
                assert boxes[varnames[event['id']]]['text'] == event['message']
        rows = [json.loads(line) for line in (ROOT / 'results' / (name + '.jsonl')).read_text().splitlines()]
        feedback_count += sum(row['label'] == '$feedback' for row in rows)
        raw_count += len(rows)
        case_count += len(score['events'])
    assert (case_count, raw_count, feedback_count) == (716, 2048, 8)
    comparison = json.loads((ROOT / 'comparison.json').read_text())
    assert comparison['compared'] == comparison['passed'] == 714
    assert comparison['mismatches'] == [] and len(comparison['skipped']) == 2
    for source in comparison['scores']:
        path = ROOT.parents[2] / source['path']
        assert digest(path) == source['sha256']
    inventory = json.loads((ROOT / 'help-usage.json').read_text())
    frozen = ROOT.parent / 'help-coverage-20261021/help-files.jsonl'
    assert inventory['frozen_corpus_sha256'] == digest(frozen)
    assert inventory['union_help_files'] == 302 and inventory['resolved_help_instances'] == 1028
    assert inventory['full_help_conformance'] == {'passing': 0, 'denominator': 2103}
    originals = {row['path']: row['sha256'] for row in map(json.loads, frozen.read_text().splitlines())}
    assert all(originals[entry['path']] == entry['sha256'] for entry in inventory['files'])
    if args.installed:
        for source in json.loads((ROOT / 'sources.json').read_text())['sources']:
            assert digest(args.installed / source['path']) == source['sha256']
        from inventory import inventory as regenerate_inventory
        assert regenerate_inventory(args.installed) == inventory
    print('Verified 6 original Max fixtures, 716 scored inputs, 2048 raw rows, 714 retained native matches, 2 explicit feedback exclusions')


if __name__ == '__main__':
    main()
