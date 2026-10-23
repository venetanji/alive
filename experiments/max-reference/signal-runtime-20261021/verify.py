#!/usr/bin/env python3
"""Verify retained evidence without launching Max or reading private daemon state."""
import hashlib
import json
from pathlib import Path

from analyze import precision_checks, summarize

ROOT = Path(__file__).resolve().parent


def main():
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    assert manifest['evidence'] == 'ORIGINAL_MAX_EXECUTED'
    for entry in manifest['files']:
        path = ROOT / entry['path']
        assert path.stat().st_size == entry['bytes'], entry['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], entry['path']
    retained = {str(path.relative_to(ROOT)) for path in ROOT.rglob('*') if path.is_file()
                and path.name != 'manifest.json' and '__pycache__' not in path.parts}
    assert retained == {entry['path'] for entry in manifest['files']}
    reports = {name: summarize(name) for name in ['arithmetic', 'waves', 'precision']}
    precision_checks(reports['precision'])
    assert [len(reports[name]['stages']) for name in reports] == [6, 2, 6]
    inventory = json.loads((ROOT / 'source-inventory.json').read_text())
    assert len(inventory['sources']) == 14
    environment = json.loads((ROOT / 'environment.json').read_text())
    assert all(run['complete'] for run in environment['runs'])
    assert environment['isolation']['exact_prefix_processes_after_cleanup'] == []
    if (ROOT / 'native-replay.json').exists():
        replay = json.loads((ROOT / 'native-replay.json').read_text())
        assert replay['compared_cases'] == replay['passed_cases'] == 197
        assert replay['failed_cases'] == 0
        capture = ROOT / 'results/native-capture.jsonl'
        assert hashlib.sha256(capture.read_bytes()).hexdigest() == replay['native_input_sha256']
    print(json.dumps(dict(status='verified', manifest_files=len(manifest['files']),
                          message_rows=sum(report['message_rows'] for report in reports.values()),
                          stimuli=sum(report['stimuli'] for report in reports.values()),
                          sample_files=sum(len(report['stages']) for report in reports.values()))))


if __name__ == '__main__':
    main()
