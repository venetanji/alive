#!/usr/bin/env python3
"""Original transport regressions; no installed Max assets are read."""
import argparse
import json
import math
from pathlib import Path
import subprocess
import tempfile

REPO = Path(__file__).resolve().parents[3]


def token(text):
    return text.encode('ascii').hex() or '-'


def execute(binary, fixture):
    result = subprocess.run([str(binary)], input=fixture, text=True, capture_output=True, timeout=20)
    assert result.returncode == 0, (result.returncode, result.stderr)
    return [json.loads(line) for line in result.stdout.splitlines()]


def check_contextual_messages(binary):
    fixture = '\n'.join([
        'help-root-native-v1 1', 'graph 0 2 1',
        f'1 53 0 0 0 0 0 0 0 0 {token("saved $1")}',
        f'2 25 0 0 0 0 0 0 0 0 {token("original")}', '1 0 2 0', '7',
        'install install 0 0 1',
        f'cold-template event 0 1 1 {token("fresh")} 1 2 0 {token("$1")}',
        'first event 0 1 0 - 1 0 7 -',
        f'set-template event 0 1 0 {token("set")} 2 2 0 {token("again")} 2 0 {token("$1")}',
        'second event 0 1 0 - 1 0 9 -',
        f'wrong-receiver event 0 2 0 {token("fresh")} 1 2 0 {token("$1")}',
        f'wrong-inlet event 0 1 0 {token("fresh")} 1 2 0 {token("$1")}',
    ]) + '\n'
    rows = execute(binary, fixture)
    assert [row['accepted'] for row in rows] == [True]*5 + [False]*2
    assert all(not row['failed'] for row in rows)
    assert rows[1]['snapshots'][0]['nodes'][0]['message_box']['placeholders'] == [1]
    for index, selector, value in [(2, 'fresh', 7), (4, 'again', 9)]:
        state = rows[index]['snapshots'][0]['nodes'][1]['last_message']
        assert state['selector'] == selector and state['atoms'] == [dict(tag='int', value=value)]
    print('contextual Message replacement contracts passed')
    return fixture, rows


def check_admitted_parameters(binary):
    fixture = '\n'.join([
        'help-root-native-v1 1', 'graph 0 1 0', '1 52 0 0 0 0 100 0 0 0 -', '9',
        'install install 0 0 1',
        f'runtime-min event 0 1 0 {token("min")} 1 0 -100 -',
        'refuse-max param 0 1 2 -50 0',
        'accept-max param 0 1 2 50 0',
        f'runtime-max event 0 1 0 {token("max")} 1 0 100 -',
        'refuse-min param 0 1 1 75 0',
        'accept-min param 0 1 1 25 0',
        'reinstall install 0 0 2',
        'refuse-original-max param 0 1 2 -50 0',
    ]) + '\n'
    rows = execute(binary, fixture)
    assert [row['accepted'] for row in rows] == [True, True, False, True, True, False, True, True, False]
    assert all(not row['failed'] and row['templates_unchanged'] for row in rows)
    assert rows[6]['snapshots'][0]['nodes'][0]['value'] == 25
    assert rows[7]['snapshots'][0]['nodes'][0]['value'] == 0
    print('admitted/runtime parameter separation contracts passed')
    return fixture, rows


def check(binary):
    self_test = subprocess.run([str(binary), '--self-test'], text=True, capture_output=True, timeout=20)
    assert self_test.returncode == 0, self_test.stderr
    print(self_test.stdout.strip())
    fixture = '\n'.join([
        'help-root-native-v1 1', 'graph 0 2 1',
        f'1 30 0 0 0 0 0 0 0 0 {token("tail 5")}',
        '2 53 0 0 0 0 0 0 0 0 -', '1 0 2 1', '8',
        'install-1 install 0 0 1', 'first event 0 1 0 - 1 0 7 -',
        'display-click event 0 2 0 - 0', 'second event 0 1 0 - 1 0 8 -',
        'close-1 close 0', 'install-2 install 0 0 2', 'empty event 0 2 0 - 0',
        'negative-zero event 0 1 0 - 1 1 -0.0 -',
    ]) + '\n'
    result = subprocess.run([str(binary)], input=fixture, text=True, capture_output=True, timeout=20)
    assert result.returncode == 0, (result.returncode, result.stderr)
    rows = [json.loads(line) for line in result.stdout.splitlines()]
    assert len(rows) == 8 and all(row['accepted'] and not row['failed'] for row in rows)
    assert all(row['templates_unchanged'] and not row['trace_overflow'] for row in rows)
    assert [r['phase'] for r in rows[1]['trace']] == ['input', 'output', 'input']
    assert rows[1]['trace'][-1]['port'] == 1
    receipt = rows[1]['trace'][1]['message']
    assert receipt['selector'] == 'list' and receipt['raw_selector'] == 'list'
    assert receipt['atoms'] == [dict(tag='int', value=7), dict(tag='symbol', value='tail'), dict(tag='int', value=5)]
    display = rows[1]['snapshots'][0]['nodes'][1]['message_box']
    assert not display['empty'] and display['generation'] == 2
    assert display['prototype'] == {**receipt, 'raw_selector': ''}
    assert len(rows[2]['trace']) == 2 and rows[2]['trace'][1]['phase'] == 'output'
    assert rows[3]['snapshots'][0]['nodes'][1]['message_box']['prototype']['atoms'][0]['value'] == 8
    assert rows[4]['snapshots'] == []
    assert rows[5]['snapshots'][0]['revision'] == 2
    assert rows[6]['snapshots'][0]['nodes'][1]['message_box']['empty']
    assert len(rows[6]['trace']) == 1, 'reopen must restore the authored empty Message'
    zero = rows[7]['trace'][1]['message']['atoms'][0]
    assert zero['tag'] == 'float' and zero['value'] == 0 and math.copysign(1, zero['value']) == -1
    malformed = fixture.replace('first event 0 1 0 - 1 0 7 -', 'first event 16 1 0 - 1 0 7 -')
    result = subprocess.run([str(binary)], input=malformed, text=True, capture_output=True, timeout=20)
    assert result.returncode != 0, 'out-of-bounds document slot was accepted'
    print('help-root transport contracts passed')
    return [(fixture, rows), check_contextual_messages(binary), check_admitted_parameters(binary)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--binary', type=Path)
    args = parser.parse_args()
    if args.binary:
        check(args.binary.resolve())
        return
    with tempfile.TemporaryDirectory(prefix='ultra-help-root-test-') as directory:
        binary = Path(directory) / 'runner'
        subprocess.run(['c++', '-std=c++17', '-O1', '-Wall', '-Wextra', '-Werror', '-pthread',
                        str(REPO / 'apps/ultra/tests/help_root_runtime_test.cpp'), '-o', str(binary)], check=True)
        cases = check(binary)
        plain = Path(directory) / 'no-trace-runner'
        subprocess.run(['c++', '-std=c++17', '-O1', '-Wall', '-Wextra', '-Werror', '-pthread',
                        '-DULTRA_HELP_ROOT_NO_TRACE', str(REPO / 'apps/ultra/tests/help_root_runtime_test.cpp'),
                        '-o', str(plain)], check=True)
        for fixture, traced in cases:
            untraced = execute(plain, fixture)
            assert all(row['trace'] == [] for row in untraced)
            assert [{**row, 'trace': []} for row in traced] == untraced
        print('compiled-out observer equivalence passed')


if __name__ == '__main__':
    main()
