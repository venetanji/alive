#!/usr/bin/env python3
"""Offline integrity and independent finite semantic assertions; launches no Max."""
from collections import defaultdict
from collections import Counter
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

sys.dont_write_bytecode = True
from derive import original_checkpoints, summary_from_receipts

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]


def read(path):
    return json.loads((ROOT/path).read_text())


def machine_check(session, preserved):
    matches = dict(prefix=[], display=[], display_servers=[])
    unreadable = 0
    for proc in Path('/proc').glob('[0-9]*'):
        try:
            environment = (proc/'environ').read_bytes().split(b'\0')
            for key, value, output in [('WINEPREFIX', session['prefix'], 'prefix'),
                                       ('DISPLAY', session['display'], 'display')]:
                if (key+'='+value).encode() in environment:
                    matches[output].append(int(proc.name))
        except PermissionError:
            unreadable += 1
        except (FileNotFoundError, ProcessLookupError):
            continue
        try:
            arguments = (proc/'cmdline').read_bytes().split(b'\0')
            if arguments and Path(arguments[0].decode()).name in {'Xvfb', 'Xorg', 'Xephyr', 'Xwayland'}:
                if session['display'].encode() in arguments:
                    matches['display_servers'].append(int(proc.name))
        except (PermissionError, FileNotFoundError, ProcessLookupError):
            continue
    assert not any(matches.values()), matches
    assert not Path(session['prefix']).exists()
    assert not Path('/tmp/.X11-unix/X'+session['display'][1:]).exists()
    preferences = {}
    for name, prefix in [('original', Path('/home/venetanji/.wine-ableton')),
                         ('source', Path(session['source_prefix']))]:
        rows = []
        for directory in (prefix/'drive_c/users').glob('*/AppData/Roaming/*'):
            if not directory.name.startswith(('Cycling', 'Ableton')):
                continue
            for path in sorted(directory.rglob('*')):
                if path.is_file() and not path.is_symlink():
                    rows.append([str(path.relative_to(prefix)), hashlib.sha256(path.read_bytes()).hexdigest()])
        assert rows == preserved[name], name+' preferences changed since capture'
        preferences[name] = dict(files=len(rows), unchanged=True)
    return dict(exact_owned_processes=matches, owned_prefix_absent=True, owned_display_socket_absent=True,
                unreadable_process_environments=unreadable, preferences=preferences,
                limitation='Unreadable process environments cannot be attributed; no unrelated process was changed.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check-native-current', action='store_true')
    parser.add_argument('--check-machine', action='store_true')
    args = parser.parse_args()
    manifest = read('manifest.json')
    artifact_names = [item['path'] for item in manifest['artifacts']]
    assert len(set(artifact_names)) == len(artifact_names)
    present = {p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*')
               if p.is_file() and p.name != 'manifest.json' and '__pycache__' not in p.parts}
    assert set(artifact_names) == present
    for item in manifest['artifacts']:
        assert not Path(item['path']).is_absolute() and '..' not in Path(item['path']).parts
        path=ROOT/item['path']
        assert path.stat().st_size==item['bytes'], item['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256'], item['path']
    sources = read('sources.json')
    for item in sources['recovered_original_sources']:
        path=ROOT/item['path']
        assert path.stat().st_size == item['bytes']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], item['path']
    assert read('summary.json') == summary_from_receipts()
    score, targets = read('fixtures/score.json'), read('fixtures/targets.json')
    raw=(ROOT/'results/receipts.jsonl').read_text()
    assert raw.endswith('\n')
    rows=[json.loads(line) for line in raw.splitlines()]
    assert [r['seq'] for r in rows]==list(range(1,len(rows)+1))
    assert [r['value'] for r in rows if r['kind']=='stimulus']==score
    assert len(score)==300 and len(targets)==31
    assert [r['value']['id'] for r in rows if r['kind']=='step-complete']==[e['id'] for e in score]
    assert not any(r['kind']=='harness-error' for r in rows)
    assert rows[0]['kind']=='ready' and rows[-1]['kind']=='complete'
    assert rows[-1]['value']['steps']==300
    outputs=defaultdict(list)
    current=None
    for row in rows:
        if row['kind']=='stimulus':
            assert current is None
            current=row['input_id']
        elif row['kind']=='step-complete':
            assert current==row['input_id']
            current=None
        elif row['kind']=='receipt':
            assert current==row['input_id']
            value=row['value'];outputs[current].append(value)
            assert value['selector'] in {'int','float'}
            assert len(value['atoms'])==len(value['finite'])==len(value['number_repr'])==len(value['negative_zero'])==1
            if value['finite'][0]:
                assert isinstance(value['atoms'][0],(int,float)) and math.isfinite(value['atoms'][0])
            else:
                assert value['atoms']==[None] and value['number_repr'][0] in {'Infinity','-Infinity','NaN'}
    assert sum(map(len,outputs.values()))==218
    assert max(map(len,outputs.values()))==1
    events={(e['target'],e['case']):e for e in score}

    def result(target, case):
        return outputs[events[target,case]['id']]

    def scalar(target, case, selector, value=None, representation=None, negative=False):
        got=result(target,case)
        assert len(got)==1,(target,case,got)
        got=got[0]
        assert got['selector']==selector,(target,case,got)
        if representation is not None:
            assert got['atoms']==[None] and got['number_repr']==[representation] and got['finite']==[False]
        else:
            assert math.isclose(got['atoms'][0],value,rel_tol=1e-14,abs_tol=1e-14),(target,case,got,value)
            assert got['finite']==[True]
        assert got['negative_zero']==[negative],(target,case,got)

    for event in score:
        if event['inlet']==1:
            assert not outputs[event['id']],event
        variant=next(t['variant'] for t in targets if t['label']==event['target'])
        for got in outputs[event['id']]:
            if variant in {'integer','bare'}:
                assert got['selector']=='int'
            elif variant=='float':
                assert got['selector']=='float'
    for op, value in enumerate([2,0,-2,0,0,2,0]):
        scalar(f'op{op}-integer','startup-bang','int',value)
        scalar(f'op{op}-float','startup-bang','float',value)
    for op, value in enumerate([7,0,7,7,0,-7,0,7]):
        scalar(f'op{op}-bare','hot-default','int',value)
    for op, value in enumerate([9,14,5,3,1,-5,0]):
        scalar(f'op{op}-integer','list-two','int',value)
    for op, value in enumerate([15,44,7,2,3,-7,0]):
        scalar(f'op{op}-integer','list-symbol-mixed','int',value)
        scalar(f'op{op}-integer','recall-after-cold-list','int',value)
    for op, value in enumerate([7,-18,11,-4,1,1,0]):
        assert not result(f'op{op}-integer','set-fraction')
        scalar(f'op{op}-integer','recall-after-set','int',value)
    scalar('op5-float','recall-after-set','float',10)
    scalar('op6-float','recall-after-set','float',-1/3)
    scalar('op0-integer','recall-after-in1','int',16)
    scalar('op0-integer','recall-after-ft1','int',16)
    scalar('op5-integer','recall-after-in1','int',-6)
    scalar('op5-integer','recall-after-ft1','int',-13)
    scalar('op0-extra24','hot-negative-fraction','int',-3)
    scalar('op3-extra26','hot-negative-fraction','int',-3)
    scalar('op7-extra29','hot-negative-fraction','int',3)
    scalar('op4-extra27','hot-negative-fraction','float',-.25)
    scalar('op4-extra28','hot-negative-fraction','float',-1.25)
    scalar('op7-extra30','hot-negative-fraction','float',3.75)
    scalar('op7-float','hot-float-format','float',3.75)
    for case in ['startup-bang','recall','set-fraction','recall-after-set','symbol','direct-in1','direct-ft1','recall-final']:
        assert not result('op7-integer',case),case
    for case, value in [('list-one',9),('list-two',7),('list-three',3),('list-symbol-mixed',3)]:
        scalar('op7-integer',case,'int',value)
    scalar('op3-integer','zero-coerced-bang','int',11)
    scalar('op3-integer','zero-negative-bang','int',11)
    scalar('op3-integer','zero-recovery-bang','int',5)
    scalar('op4-integer','zero-coerced-bang','int',0)
    scalar('op4-integer','zero-negative-bang','int',0)
    scalar('op3-float','zero-positive-hot','float',representation='Infinity')
    scalar('op3-float','zero-negative-hot','float',representation='Infinity')
    scalar('op4-float','zero-positive-hot','float',representation='NaN')
    scalar('op4-float','zero-negative-hot','float',representation='NaN')
    scalar('op3-float','zero-recovery-bang','float',3.75)
    scalar('op4-float','zero-recovery-bang','float',-1.5)
    for variant, tag in [('integer','int'),('float','float')]:
        scalar('op6-'+variant,'zero-negative-hot',tag,0)
        scalar('op6-'+variant,'zero-negative-bang',tag,0)
    scalar('op6-float','zero-recovery-hot','float',1.25)
    scalar('op4-float','list-two-fractions','float',0,negative=True)
    assert read('results/preferences-before.json')==read('results/preferences-after.json')
    cleanup=read('results/cleanup.json')
    assert cleanup['original_preferences_unchanged'] and cleanup['source_preferences_unchanged']
    assert cleanup['owned_prefix_after']==cleanup['owned_display_after']==[]
    assert cleanup['xvfb_exited'] and cleanup['prefix_removed']
    session=read('results/session.json')
    assert session['screenshot_count']==session['clipboard_actions']==0
    assert session['complete'] and not Path(session['prefix']).exists()
    evidence=read('rea-process-evidence.json')['structuredContent']
    inline = [c['text'] for c in read('rea-process-evidence.json')['content'] if c['type']=='text']
    assert len(inline) == 1 and json.loads(inline[0]) == evidence
    assert evidence['evidence_id']==manifest['rea_evidence_id']
    assert original_checkpoints(evidence) == manifest['original_capture_checkpoints']
    assert evidence['normalized_result']['exit']['code']==0
    assert evidence['normalized_result']['exit']['reason']=='exited'
    assert not evidence['normalized_result']['truncated']
    assert manifest['environment']['max_sha256'] == session['max_sha256']
    assert sources['executed_artifact']['sha256'] == session['max_sha256']
    assert manifest['whole_help_qualification']==dict(numerator=0,denominator=2103)
    comparison = read('results/native-comparison.json')
    assert [c['id'] for c in comparison['cases']] == [e['id'] for e in score]
    counts = dict(Counter(c['status'] for c in comparison['cases']))
    assert counts == comparison['status_counts'] == {
        'compared-pass':287, 'explicit-local-refusal':4, 'outside-qualified-creation':9}
    for case in comparison['cases']:
        assert case['reference'] == outputs[case['id']]
    build = read('results/native-build.json')
    expected_sources = {p.relative_to(REPO).as_posix() for p in [
        REPO/'apps/ultra/tests/canvas_arithmetic_test.cpp',
        *sorted((REPO/'apps/ultra/src-tauri/native').glob('*.hpp')),
        *sorted((REPO/'apps/ultra/src-tauri/native').glob('*.h'))]}
    stale = sorted(expected_sources.symmetric_difference(build['source_sha256']))
    stale += [name for name,digest in build['source_sha256'].items()
              if name in expected_sources and (not (REPO/name).is_file() or
                 hashlib.sha256((REPO/name).read_bytes()).hexdigest() != digest)]
    if args.check_native_current:
        assert not stale, dict(stale_native_sources=stale)
    result = dict(verified=True, inputs=300, typed_receipts=218, nonfinite_outputs=4,
                          manifest_artifacts=len(manifest['artifacts']),
                          evidence_id=manifest['rea_evidence_id'], native_status_counts=counts,
                          native_sources_current=not stale, stale_native_sources=stale)
    if args.check_machine:
        result['machine_check'] = machine_check(session, read('results/preferences-before.json'))
    print(json.dumps(result))


if __name__=='__main__':
    main()
