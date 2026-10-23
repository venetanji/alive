#!/usr/bin/env python3
"""Seal recovered arithmetic evidence offline; never launch or read installed Max."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ORIGINAL_SOURCES = ['generate.py', 'run-runtime.py', 'fixtures/arithmetic.maxpat',
                    'fixtures/probe.js', 'fixtures/score.json', 'fixtures/targets.json']


def write(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False)+'\n')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def summary_from_receipts():
    score = json.loads((ROOT/'fixtures/score.json').read_text())
    targets = json.loads((ROOT/'fixtures/targets.json').read_text())
    rows = [json.loads(line) for line in (ROOT/'results/receipts.jsonl').read_text().splitlines()]
    outputs = defaultdict(list)
    for row in rows:
        if row['kind'] == 'receipt':
            outputs[row['input_id']].append(dict(seq=row['seq'], **row['value']))
    cases = [dict(**event, outputs=outputs[event['id']]) for event in score]
    evidence = json.loads((ROOT/'rea-process-evidence.json').read_text())['structuredContent']
    return dict(schema_version=1, evidence='ORIGINAL_MAX_EXECUTED',
                   rea_evidence_id=evidence['evidence_id'], targets=targets,
                   input_deliveries=len(score), typed_receipts=sum(len(v) for v in outputs.values()),
                   raw_rows=len(rows), kind_counts=dict(Counter(row['kind'] for row in rows)),
                   nonfinite_receipts=[dict(input_id=row['input_id'], seq=row['seq'], **row['value'])
                                       for row in rows if row['kind']=='receipt' and not all(row['value']['finite'])],
                   cases=cases,
                   limitations=[
                       'Finite original fixture; no installed help root executed or qualified.',
                       'Numeric atom tags inside list stimuli/receipts are not independently measured by JS.',
                       'Bare reverse-divide right default 0 versus 1 is not distinguished by the chosen integer hot input 7.',
                       'Float-mode direct in1/ft1 and int input into float-configured abs are not tested.',
                       'Max console error text and scheduler/audio settings were not collected.',
                       'Exponent creation 2e0 was observed only for +, / and abs; other exponent spellings are unknown.',
                       'Infinity and NaN are observed; -Infinity is representable by the carrier but not observed in this score.',
                   ])


def original_checkpoints(evidence):
    result = evidence['normalized_result']
    paths = result['manifest']['scenario']['filesystem_observation_paths']
    checkpoints = []
    for item in result['files_after']:
        index = int(item['path'].split(':')[0].removeprefix('root_'))
        path = Path(paths[index])
        relative = path.relative_to(ROOT).as_posix()
        assert digest(ROOT/relative) == item['sha256'], relative
        assert (ROOT/relative).stat().st_size == item['size'], relative
        checkpoints.append(dict(path=relative, bytes=item['size'], sha256=item['sha256']))
    assert {p['path'] for p in checkpoints} == {
        'results/receipts.jsonl', 'results/session.json', 'results/cleanup.json'}
    return checkpoints


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--summary-only', action='store_true')
    args = parser.parse_args()
    evidence = json.loads((ROOT/'rea-process-evidence.json').read_text())['structuredContent']
    checkpoints = original_checkpoints(evidence)
    summary = summary_from_receipts()
    write(ROOT/'summary.json', summary)
    if args.summary_only:
        print(json.dumps(dict(inputs=summary['input_deliveries'], receipts=summary['typed_receipts'],
                              nonfinite=len(summary['nonfinite_receipts']))))
        return
    session = json.loads((ROOT/'results/session.json').read_text())
    sources_path = ROOT/'sources.json'
    if sources_path.exists():
        sources = json.loads(sources_path.read_text())
        for item in sources['recovered_original_sources']:
            assert digest(ROOT/item['path']) == item['sha256'], item['path']
    else:
        sources = dict(schema_version=1,
            executed_artifact=dict(sha256=session['max_sha256'],
                authority='runtime-launcher-prelaunch-sample-in-REA-bound-session',
                atomic_image_binding=False),
            recovered_original_sources=[dict(path=name, bytes=(ROOT/name).stat().st_size,
                sha256=digest(ROOT/name), authority='recovered-source-bytes-at-package-finalization')
                for name in ORIGINAL_SOURCES],
            documentation=dict(authority='mapping-only-no-preserved-historical-digests',
                reference_pages=['plus', 'times', 'minus', 'div', 'modulo', 'rminus', 'rdiv', 'abs'],
                limitation='Installed reference files were not reread or copied during finalization.'))
        write(sources_path, sources)
    artifacts = []
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or path.name=='manifest.json' or '__pycache__' in path.parts:
            continue
        artifacts.append(dict(path=path.relative_to(ROOT).as_posix(), bytes=path.stat().st_size, sha256=digest(path)))
    write(ROOT/'manifest.json', dict(schema_version=1, original_fixture=True,
          evidence='ORIGINAL_MAX_EXECUTED', rea_evidence_id=evidence['evidence_id'],
          runtime_invocations=1, input_deliveries=300, typed_receipts=218,
          capture_interval=dict(started_at=evidence['normalized_result']['manifest']['started_at'],
                                completed_at=evidence['normalized_result']['manifest']['completed_at']),
          original_capture_checkpoints=checkpoints,
          environment=dict(platform=evidence['environment']['platform'],
                           machine=evidence['environment']['architecture'],
                           wine='/home/venetanji/.local/opt/wine-d2d1-nspa-11.13/bin/wine',
                           max_sha256=session['max_sha256'],
                           fixture_declared_appversion='9.1.5 Windows x64',
                           screenshot_count=0, clipboard_actions=0,
                           audio_settings='not queried; no DSP or audio-device actions in this score'),
          native_artifacts=dict(paths=['results/native-build.json', 'results/native-comparison.json',
              'results/native-receipts.jsonl', 'results/native-stderr.txt'],
              freshness='Check source hashes separately with verify.py --check-native-current; reseal after replay.'),
          artifacts=artifacts, whole_help_qualification=dict(numerator=0,denominator=2103)))
    print(json.dumps(dict(artifacts=len(artifacts), inputs=300, receipts=218, evidence_id=evidence['evidence_id'])))


if __name__ == '__main__':
    main()
