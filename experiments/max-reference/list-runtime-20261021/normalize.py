#!/usr/bin/env python3
"""Retain typed collector observations without inventing numeric list atom tags."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def normalize(name):
    score_path = ROOT / 'fixtures' / (name + '.score.json')
    raw_path = ROOT / 'results' / (name + '.jsonl')
    score = json.loads(score_path.read_text())
    rows = [json.loads(line) for line in raw_path.read_text().splitlines()]
    assert rows[-1]['selector'] == 'complete'
    assert rows[-1]['atoms'] == [len(score['events'])]
    assert [r['seq'] for r in rows] == list(range(1, len(rows) + 1))
    assert [r['atoms'][0] for r in rows if r['selector'] == 'stimulus'] == [e['id'] for e in score['events']]
    targets = {t['id']: t for t in score['targets']}
    cases = []
    for event in score['events']:
        observed = [r for r in rows if r.get('input_id') == event['id']]
        delivered = [dict(selector=r['selector'], atoms=r['atoms']) for r in observed if r['label'] == '$delivery']
        if event.get('direct'):
            delivered = [dict(selector=event['selector'], atoms=event['atoms'])]
        expected = []
        for row in observed:
            if row['label'].startswith('$'):
                continue
            target, outlet = row['label'].rsplit(':', 1)
            expected.append(dict(target=target, outlet=int(outlet), selector=row['selector'], atoms=row['atoms']))
        assert len(delivered) <= 1, (name, event['id'])
        case = dict(input_id=event['id'], target=targets[event['destination']]['key'],
                    inlet=event['inlet'], message=event['message'],
                    delivery=bool(delivered), input=delivered[0] if delivered else None,
                    delivery_source='direct-js-target-call' if event.get('direct') else 'observed-message-box-outlet',
                    expected=expected)
        if event.get('direct'):
            case['direct_selector'] = event['selector']
            case['direct_atoms'] = event['atoms']
        if case['target'] == 'iter-reentrant-size':
            case['native_replay'] = 'requires-feedback-topology; separate raw observation'
        cases.append(case)
    return dict(schema='ultra-max-list-score-v1', fixture=name,
                evidence='observed Max 9.1.5; collector arrival order',
                numeric_list_atom_tags='unknown_numeric; JSON alone cannot prove per-atom int/float types',
                sources={str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
                         for path in [ROOT / 'fixtures' / (name + '.maxpat'), score_path, raw_path, ROOT / 'fixtures/probe.js']},
                targets=score['targets'], cases=cases)


if __name__ == '__main__':
    for score in sorted((ROOT / 'fixtures').glob('*.score.json')):
        name = score.name.removesuffix('.score.json')
        if (ROOT / 'results' / (name + '.jsonl')).exists():
            result = normalize(name)
            (ROOT / ('normalized-' + name + '.json')).write_text(json.dumps(result, indent=2) + '\n')
            print(json.dumps(dict(fixture=name, cases=len(result['cases']))))
