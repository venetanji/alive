#!/usr/bin/env python3
"""Replay the frozen original score through the production arithmetic C++ seam."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
KINDS = {'+':4, '*':5, '-':54, '/':55, '%':56, '!-':57, '!/':58, 'abs':59}
DEFAULTS = {'+':0, '*':0, '-':0, '/':1, '%':1, '!-':0, '!/':1, 'abs':0}


def write(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False)+'\n')


def atom(value, force_float=False, negative_zero=False):
    if isinstance(value, str):
        assert not any(c.isspace() for c in value)
        return value
    if negative_zero:
        return '-0.0'
    text=repr(float(value)) if force_float else str(value)
    return text


def run(binary):
    score=json.loads((ROOT/'fixtures/score.json').read_text())
    targets=json.loads((ROOT/'fixtures/targets.json').read_text())
    observed=defaultdict(list)
    for line in (ROOT/'results/receipts.jsonl').read_text().splitlines():
        row=json.loads(line)
        if row['kind']=='receipt':
            observed[row['input_id']].append(row['value'])
    lines=[];excluded=set();indexes={t['label']:i for i,t in enumerate(targets)}
    for i,target in enumerate(targets):
        parts=target['creation'].split()
        argument=parts[1] if len(parts)>1 else None
        if argument and 'e' in argument.lower():
            excluded.add(target['label']);continue
        mode=2 if argument and '.' in argument else 1
        rhs=0 if target['operator']=='abs' else float(argument) if argument is not None else DEFAULTS[target['operator']]
        lines.append(f'target {i} {KINDS[target["operator"]]} {mode} {rhs}')
    compared=[]
    for event in score:
        if event['target'] in excluded:
            continue
        values=[atom(v,event['selector']=='float',event['negative_zero'] and i==0)
                for i,v in enumerate(event['atoms'])]
        if event['selector'] in {'int','float'}:
            message=' '.join(values)
        else:
            message=' '.join([event['selector'],*values])
        lines.append(f'event {event["id"]} {indexes[event["target"]]} {event["inlet"]} {message}')
        compared.append(event)
    result=subprocess.run([str(binary),'replay'],input='\n'.join(lines)+'\n',capture_output=True,text=True,timeout=30)
    (ROOT/'results/native-receipts.jsonl').write_text(result.stdout)
    (ROOT/'results/native-stderr.txt').write_text(result.stderr)
    assert result.returncode==0,dict(code=result.returncode,stderr=result.stderr[-3000:])
    actual=[json.loads(line) for line in result.stdout.splitlines()]
    assert [row['id'] for row in actual]==[event['id'] for event in compared]
    by_id={row['id']:row for row in actual};cases=[];counts=Counter();failures=[]
    for event in score:
        expected=observed[event['id']]
        case=dict(id=event['id'],target=event['target'],creation=event['creation'])
        if event['target'] in excluded:
            case.update(status='outside-qualified-creation',
                        reason='Modern exponent creation is deliberately unsupported; import refusal is tested in the UI suite.',
                        reference=expected)
        else:
            got=by_id[event['id']];nonfinite=any(not all(item['finite']) for item in expected)
            if nonfinite:
                okay=not got['accepted'] and not got['receipts'] and got['errors']==['arithmetic-result-out-of-range']
                case.update(status='explicit-local-refusal' if okay else 'fail',reference=expected,native=got)
            else:
                okay=got['accepted'] and not got['errors'] and len(got['receipts'])==len(expected)
                for want,have in zip(expected,got['receipts']):
                    okay=okay and want['selector']==have['selector'] and want['negative_zero']==have['negative_zero']
                    okay=okay and len(want['atoms'])==len(have['atoms']) and all(
                        math.isclose(x,y,rel_tol=1e-13,abs_tol=1e-13) for x,y in zip(want['atoms'],have['atoms']))
                case.update(status='compared-pass' if okay else 'fail',reference=expected,native=got)
            if case['status']=='fail':
                failures.append(case)
        counts[case['status']]+=1;cases.append(case)
    report=dict(schema_version=1, original_input_deliveries=300,
                native_input_deliveries=len(compared), status_counts=dict(counts), cases=cases,
                comparison=dict(value_relative_tolerance=1e-13,value_absolute_tolerance=1e-13,
                                scalar_selector_and_zero_sign='exact',
                                nonfinite='explicit local refusal, not a parity pass'),
                limitations=[
                    'Exponent-creation refusal belongs to importer/catalog tests, not the native graph replay.',
                    'Bare reverse-divide numerator default is not distinguished by this original score.',
                    'No installed help root executes in this native replay; qualification stays zero.',
                ])
    write(ROOT/'results/native-comparison.json',report)
    print(json.dumps(dict(native_input_deliveries=len(compared),status_counts=dict(counts),failures=len(failures))))
    if failures:
        print(json.dumps(failures[:10],indent=2))
        raise SystemExit(1)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--binary',type=Path)
    args=parser.parse_args()
    source=REPO/'apps/ultra/tests/canvas_arithmetic_test.cpp'
    hashes={str(p.relative_to(REPO)):hashlib.sha256(p.read_bytes()).hexdigest()
            for p in [source,*sorted((REPO/'apps/ultra/src-tauri/native').glob('*.hpp')),
                      *sorted((REPO/'apps/ultra/src-tauri/native').glob('*.h'))]}
    if args.binary:
        write(ROOT/'results/native-build.json',dict(binary=str(args.binary),source_sha256=hashes))
        run(args.binary);return
    with tempfile.TemporaryDirectory(prefix='ultra-arithmetic-replay-') as directory:
        binary=Path(directory)/'arithmetic-replay'
        command=[shutil.which('c++') or 'c++','-std=c++17','-O2','-Wall','-Wextra','-Werror','-pthread',str(source),'-o',str(binary)]
        build=subprocess.run(command,capture_output=True,text=True,timeout=90)
        write(ROOT/'results/native-build.json',dict(command=command,returncode=build.returncode,
              stdout=build.stdout,stderr=build.stderr,source_sha256=hashes,
              temporary_binary_removed_after_run=True))
        assert build.returncode==0,build.stderr[-3000:]
        run(binary)


if __name__=='__main__':
    main()
