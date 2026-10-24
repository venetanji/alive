#!/usr/bin/env python3
"""Check immutable raw scene timing samples and their printed statistics."""
import hashlib
import json
import math
from pathlib import Path

root = Path('/tmp/alive-task14-evidence/proposed-release-1')
manifest = json.loads((root / 'manifest.json').read_text())
for name, expected in manifest['files'].items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, name

samples, summaries = {}, {}
for line in (root / 'probe.log').read_text().splitlines():
    fields = line.split(',')
    if fields[0] == 'SAMPLE':
        key = (fields[1], int(fields[2]), int(fields[3]), int(fields[4]))
        rows = samples.setdefault(key, [])
        assert int(fields[5]) == len(rows), (key, fields[5], len(rows))
        rows.append(int(fields[6]))
    elif fields[0] == 'RESULT':
        data = {k: int(v) for k, v in (f.split('=', 1) for f in fields[2:])}
        key = (fields[1], data['tracks'], data['devices'], data['frames'])
        assert key not in summaries, key
        summaries[key] = data

assert len(samples) == 56 and set(samples) == set(summaries)
verified = []
for key, rows in samples.items():
    data, ordered = summaries[key], sorted(rows)
    count = len(rows)
    assert count == data['count'] == 1200
    # Preserve the probe's conventions; derive nearest-rank figures separately.
    for index, name in ((count // 2, 'p50_ns'),
                        ((count - 1) * 99 // 100, 'p99_ns'),
                        ((count - 1) * 999 // 1000, 'p999_ns')):
        assert ordered[index] == data[name], (key, name)
    assert ordered[-1] == data['max_ns']
    verified.append({'case': key[0], 'tracks': key[1], 'devices': key[2],
                     'frames': key[3], 'printed': data,
                     'nearest_rank_p999_ns': ordered[math.ceil(.999 * count) - 1]})

receipt = {
    'status': 'pass',
    'qualification': 'raw distributions only; not final committed-source or native-runtime acceptance',
    'manifest_sha256': hashlib.sha256((root / 'manifest.json').read_bytes()).hexdigest(),
    'probe_log_sha256': hashlib.sha256((root / 'probe.log').read_bytes()).hexdigest(),
    'verified_files': len(manifest['files']), 'cases': len(samples),
    'samples': sum(map(len, samples.values())), 'results': verified,
    'parent_initial_probe': 'Initial ad-hoc check wrongly interpreted printed quantiles as nearest rank and rejected p50; corrected to inspect actual probe indices. Raw input unchanged.',
}
Path('/tmp/alive-task14-parent-raw-release-verification.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({k: v for k, v in receipt.items() if k != 'results'}, indent=2))
