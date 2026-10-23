#!/usr/bin/env python3
"""Index raw event rows without inventing message-box getter results."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
summary = {'schema': 1, 'status': 'observed-original-max', 'fixtures': []}
for name, expected_events, expected_rows in [('message-ui', 185, 490), ('message-display', 12, 41)]:
    score = json.loads((ROOT / 'fixtures' / (name + '.score.json')).read_text())
    rows = [json.loads(line) for line in (ROOT / 'results' / (name + '.jsonl')).read_text().splitlines()]
    assert len(score['events']) == expected_events and len(rows) == expected_rows
    assert rows[-1]['selector'] == 'complete' and rows[-1]['atoms'] == [expected_events]
    assert [row['seq'] for row in rows] == list(range(1, len(rows) + 1))
    result = dict(fixture=name, event_count=len(score['events']), row_count=len(rows), events=[])
    for event in score['events']:
        related = [row for row in rows if row['input_id'] == event['id']]
        output = [dict(seq=row['seq'], label=row['label'], selector=row['selector'], atoms=row['atoms'])
                  for row in related if not row['label'].startswith('$')]
        delivery = [dict(seq=row['seq'], selector=row['selector'], atoms=row['atoms'])
                    for row in related if row['label'] == '$delivery']
        snapshots = [json.loads(row['atoms'][0]) for row in related if row['label'] == '$state']
        result['events'].append(dict(input=event, outputs=output, delivery_tap=delivery, snapshots=snapshots,
                                     raw_sequences=[row['seq'] for row in related]))
    summary['fixtures'].append(result)
(ROOT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps({'fixtures': len(summary['fixtures']), 'events': 197, 'raw_rows': 531}))
