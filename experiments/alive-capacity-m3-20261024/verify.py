#!/usr/bin/env python3
"""Verify retained capacity evidence; optionally stream the temporary captures."""
import argparse
import array
import collections
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent


def read(path):
    return json.loads(path.read_text())


def digest(path):
    result = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(block)
    return result.hexdigest()


def epochs(path):
    data = read(path)
    assert data['complete'] and data['active'] is None
    assert data['native_quiescent'] and not data['coverage_gap']
    assert data['retiring_epoch_id'] is None
    completed = data['completed']
    assert [int(x['epoch_id']) for x in completed] == list(range(1, len(completed) + 1))
    metrics = [x['metrics'] for x in completed]
    for entry, values in zip(completed, metrics):
        assert entry['final'] and not entry['stale'] and not entry['failed']
        assert int(values['buffer_frames_min']) == int(values['buffer_frames_max']) == 512
        assert sum(map(int, values['duration_hist'])) == int(values['duration_samples'])
        assert sum(map(int, values['util_hist'])) == int(values['budget_samples'])
        for field in ('cpal_error_total', 'cpal_xrun_reports', 'cpal_non_xrun_reports',
                      'native_render_failures', 'invalid_callback_shape', 'clock_anomaly_count',
                      'counter_overflow', 'over_buffer_budget_count'):
            assert int(values[field]) == 0, (path, field)
    for field in ('callbacks_entered', 'valid_callbacks', 'output_frames', 'render_calls',
                  'duration_samples', 'duration_sum_ns', 'budget_samples'):
        assert sum(int(x[field]) for x in metrics) == int(data['lifetime'][field]), field
    for field in ('duration_hist', 'util_hist'):
        total = [sum(int(x[field][i]) for x in metrics) for i in range(len(metrics[0][field]))]
        assert total == list(map(int, data['lifetime'][field])), field
    return {'epochs': len(completed), 'callbacks': int(data['lifetime']['callbacks_entered']),
            'frames': int(data['lifetime']['output_frames']),
            'duration_max_ns': int(data['lifetime']['duration_max_ns'])}


def pcm(path, expected=None):
    result = hashlib.sha256()
    count, peak = 0, 0.0
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            assert len(block) % 8 == 0
            result.update(block)
            values = array.array('f')
            values.frombytes(block)
            if sys.byteorder != 'little':
                values.byteswap()
            assert all(math.isfinite(value) for value in values)
            count += len(values) // 2
            peak = max(peak, max(map(abs, values), default=0))
    observed = {'frames': count, 'seconds': count / 48000, 'peak': peak, 'sha256': result.hexdigest()}
    if expected:
        for field in ('frames', 'peak', 'sha256'):
            assert observed[field] == expected[field], (path, field)
    return observed


def resources(path):
    rows = [json.loads(line)['app'] for line in path.read_text().splitlines()]
    pss = [row['pss_kib'] for row in rows if row['pss_kib'] is not None]
    cpu = [row['cpu_percent'] for row in rows if row['cpu_percent'] is not None]
    return {'rows': len(rows), 'pss_first_kib': pss[0], 'pss_last_kib': pss[-1],
            'pss_max_kib': max(pss), 'cpu_max_one_core_percent': max(cpu),
            'coverage_gap_rows': sum(bool(row['coverage_gap']) for row in rows),
            'pids_max': max(len(row['pids']) for row in rows),
            'webkit_workers_max': max(sum(item['role'] == 'webkit_worker' for item in row['processes']) for row in rows)}


def verification_fix():
    manifest = read(ROOT / 'retained-fix-1-223dd34.json')
    for entry in manifest['files']:
        path = ROOT / entry['path']
        assert path.stat().st_size == entry['bytes'] and digest(path) == entry['sha256'], path
    changed = subprocess.check_output(
        ['git', 'diff', '--name-only', manifest['base'], manifest['head']], cwd=REPO
    ).decode().splitlines()
    assert sorted(changed) == ['.superpowers/sdd/PLAN/task-13b-report.md',
                               'apps/ultra/tests/alive_session_capacity.cpp']
    test_path = 'apps/ultra/tests/alive_session_capacity.cpp'
    old, new = [subprocess.check_output(['git', 'show', commit + ':' + test_path], cwd=REPO)
                for commit in (manifest['base'], manifest['head'])]
    copied = ROOT / 'fix-1-final-verify/source/tests/alive_session_capacity.cpp'
    assert copied.read_bytes() == new
    marker = b'void measure('
    assert old[old.index(marker):] == new[new.index(marker):]
    lines = (ROOT / 'fix-1-final-verify/probe.log').read_text().splitlines()
    targets = [dict(item.split('=') for item in line.split(',')[1:])
               for line in lines if line.startswith('TARGET,')]
    assert {(int(item['track']), int(item['action'])) for item in targets} == {
        (track, action) for track in range(8) for action in (1, 2)}
    assert len(targets) == 16
    for item in targets:
        assert item['voices_before'] == '4' and item['voices_after'] == '0'
        assert item['receipt'] == 'applied'
        assert int(item['observed']) >= int(item['target'])
        assert item['phase'] == ('410' if item['action'] == '1' else '0')
    concurrent = next(line for line in lines if line.startswith('PASS: concurrent callback/'))
    values = dict(item.split('=') for item in concurrent.split() if '=' in item)
    assert int(values['accepted']) + int(values['refused']) == 4096
    assert int(values['render_overlap_snapshots']) > 0 and int(values['new_receipt_snapshots']) > 0
    assert 0 < int(values['first_overlap_callback']) < int(values['last_overlap_callback']) < 2048
    assert int(values['first_overlap_frame']) < int(values['last_overlap_frame'])
    results = read(ROOT / 'fix-1-mutations-1/results.json')
    rejected = [item for item in results if item.get('expected_assertion_observed')]
    assert len(rejected) == 2
    for item in rejected:
        assert item['expected_sigabrt'] and item['returncode'] == -6
        assert not item['outer_timeout'] and item['elapsed_seconds'] < 45
    assert read(ROOT / 'fix-1-mutations-1/complete.json')['expected_rejections'] == 2
    return {'retained_files': len(manifest['files']), 'target_action_witnesses': len(targets),
            'render_overlap_snapshots': int(values['render_overlap_snapshots']),
            'intentional_mutation_rejections': len(rejected), 'production_sources_unchanged': True}


def verification_fix2():
    manifest = read(ROOT / 'retained-fix-2-1768324.json')
    for entry in manifest['files']:
        path = ROOT / entry['path']
        assert path.stat().st_size == entry['bytes'] and digest(path) == entry['sha256'], path
    changed = subprocess.check_output(
        ['git', 'diff', '--name-only', manifest['base'], manifest['head']], cwd=REPO
    ).decode().splitlines()
    assert sorted(changed) == ['.superpowers/sdd/PLAN/task-13b-report.md',
                               'apps/ultra/tests/alive_session_capacity.cpp']
    test_path = 'apps/ultra/tests/alive_session_capacity.cpp'
    old, new = [subprocess.check_output(['git', 'show', commit + ':' + test_path], cwd=REPO)
                for commit in (manifest['base'], manifest['head'])]
    assert (ROOT / 'fix-2-final-verify/source/tests/alive_session_capacity.cpp').read_bytes() == new
    for marker, end in ((b'std::vector<float> partitioned(', b'void concurrent_publication()'),
                        (b'void measure(', None)):
        assert old[old.index(marker):old.index(end) if end else None] == new[new.index(marker):new.index(end) if end else None]
    log = (ROOT / 'fix-2-final-verify/probe.log').read_text()
    targets = [line for line in log.splitlines() if line.startswith('TARGET,')]
    assert targets == [line for line in (ROOT / 'fix-1-final-verify/probe.log').read_text().splitlines()
                       if line.startswith('TARGET,')]
    concurrent = next(line for line in log.splitlines() if line.startswith('PASS: concurrent callback/'))
    values = dict(item.split('=') for item in concurrent.split() if '=' in item)
    assert int(values['accepted']) + int(values['refused']) == 4096
    assert int(values['same_callback_render_overlap_snapshots']) > 1
    assert 0 < int(values['first_overlap_callback']) < int(values['last_overlap_callback']) < 2048
    assert int(values['first_overlap_frame']) < int(values['last_overlap_frame'])
    gap = ROOT / 'fix-2-gap-probe-1'
    results = [item for item in read(gap / 'results.json') if item.get('expected_trace')]
    assert [item['returncode'] for item in results] == [-6, 0]
    assert all(item['expected_returncode'] and not item['outer_timeout'] and item['elapsed_seconds'] < 20
               for item in results)
    for directory, credited in (('checkpoint-predicate', 1), ('same-callback-predicate', 0)):
        trace = (gap / directory / 'probe.log').read_text()
        assert 'callback_before=0,callback_after=1,read_between_callbacks=true,credited_overlap=' + str(credited) in trace
    return {'retained_files': len(manifest['files']), 'target_action_witnesses': len(targets),
            'same_callback_render_overlap_snapshots': int(values['same_callback_render_overlap_snapshots']),
            'callback_gap_red_green': True, 'production_sources_unchanged': True}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--live-root', type=Path, help='temporary original evidence root for PCM/build checks')
    parser.add_argument('--receipt', type=Path, help='write independent verification receipt')
    args = parser.parse_args()
    manifest = read(ROOT / 'retained-final-a04f259.json')
    for entry in manifest['files']:
        path = ROOT / entry['path']
        assert path.stat().st_size == entry['bytes'] and digest(path) == entry['sha256'], path
    source = read(ROOT / 'checkpoint-source-manifest.json')
    for path, expected in source['files'].items():
        data = subprocess.check_output(['git', 'show', source['commit'] + ':' + path], cwd=REPO)
        assert hashlib.sha256(data).hexdigest() == expected, path
    review = read(ROOT / 'review-completion.json')
    assert review['I1'] == review['I2'] == 'ADDRESSED' and review['new_critical_important'] == 0
    for entry in review['files']:
        path = ROOT / entry['path']
        assert path.stat().st_size == entry['bytes'] and digest(path) == entry['sha256'], path
    native = epochs(ROOT / 'native-eight-3/capacity-final-epochs.json')
    controls = epochs(ROOT / 'overhead-controls-eight-1/final-epochs.json')
    control_report = read(ROOT / 'overhead-controls-eight-1/overhead-controls.json')
    assert control_report['complete'] and len(control_report['stages']) == 8
    rows = [json.loads(line) for line in (ROOT / 'overhead-controls-eight-1/control-resources.jsonl').read_text().splitlines()]
    boundaries = [row for row in rows if row['phase'] in ('start', 'end')]
    assert len(boundaries) == 16
    for index, stage in enumerate(control_report['stages']):
        start, end = boundaries[2 * index:2 * index + 2]
        assert start['mode'] == end['mode'] == stage['mode']
        for group in ('app', 'sampler_capture', 'server'):
            before = {(x['pid'], x['starttime']): x for x in start[group]['processes']}
            after = {(x['pid'], x['starttime']): x for x in end[group]['processes']}
            common = before.keys() & after.keys()
            seconds = sum(after[key]['ticks'] - before[key]['ticks'] for key in common) / end[group]['clock_ticks_per_second']
            elapsed = end[group]['monotonic'] - start[group]['monotonic']
            reported = stage['cpu'][group]
            assert math.isclose(seconds, reported['cpu_seconds_observed'], abs_tol=1e-10)
            assert math.isclose(100 * seconds / elapsed, reported['one_core_percent_observed'], abs_tol=1e-8)
    samples, results = collections.defaultdict(list), []
    for line in (ROOT / 'final-release-matrix-1/probe.log').read_text().splitlines():
        parts = line.split(',')
        if parts[0] == 'SAMPLE':
            samples[(parts[1], *map(int, parts[2:5]))].append(int(parts[-1]))
        elif parts[0] == 'RESULT':
            values = {key: int(value) for key, value in (part.split('=') for part in parts[2:])}
            key = (parts[1], values['tracks'], values['devices'], values['frames'])
            ordered = sorted(samples[key])
            assert len(ordered) == values['count'] == 1200
            assert ordered[600] == values['p50_ns']
            assert ordered[1199 * 99 // 100] == values['p99_ns']
            assert ordered[1199 * 999 // 1000] == values['p999_ns']
            assert ordered[-1] == values['max_ns']
            results.append(values)
    assert len(results) == len(samples) == 145
    telemetry = read(ROOT / 'telemetry-final-1/results.json')
    raw = list((ROOT / 'telemetry-final-1/raw').glob('*.json'))
    assert len(raw) == len(telemetry) == 60
    for path in raw:
        data = read(path)
        durations = data['duration_ns']
        if path.name.startswith('native-'):
            assert data['warmup_callbacks'] == 64 and len(durations) == 1264
            durations = durations[64:]
        else:
            assert len(durations) == 20000
        ordered = sorted(durations)
        candidates = [entry for entry in telemetry
                      if all(entry[key] == data[key] for key in ('frames', 'repetition'))
                      and (entry.get('mode') == data.get('mode'))
                      and (entry.get('telemetry_enabled') == data.get('telemetry_enabled'))
                      and (entry.get('fixture_sha256') == data.get('fixture_sha256'))]
        assert len(candidates) == 1, path
        entry = candidates[0]
        for name, permille in (('p50_ns', 500), ('p95_ns', 950), ('p99_ns', 990), ('p999_ns', 999)):
            assert entry[name] == ordered[len(ordered) * permille // 1000], (path, name)
        assert entry['max_ns'] == ordered[-1]
    receipt = {'retained_files': len(manifest['files']), 'historical_source_files': len(source['files']),
               'native': native, 'controls': controls, 'control_stages_cpu_recomputed': 8,
               'reported_control_playing_seconds': sum(stage['playing_seconds_proven'] for stage in control_report['stages']),
               'control_raw_native_frame_intervals_retained': False,
               'native_resources': resources(ROOT / 'native-eight-3/capacity-resources.jsonl'),
               'control_resources': resources(ROOT / 'overhead-controls-eight-1/control-resources.jsonl'),
               'native_distributions': len(results), 'native_raw_samples': sum(map(len, samples.values())),
               'paired_raw_distributions': len(raw), 'physical_audio': False,
               'test_only_fix': verification_fix(), 'test_only_fix2': verification_fix2(),
               'accepted_review_documents': len(review['files'])}
    if args.live_root:
        report = read(ROOT / 'native-eight-3/capacity-report.json')
        receipt['capture'] = pcm(args.live_root / 'native-eight-3/capacity-playback.f32', report['audio'])
        receipt['control_captures'] = [pcm(path) for path in sorted((args.live_root / 'overhead-controls-eight-1').glob('*.f32'))]
        captures = list((args.live_root / 'overhead-controls-eight-1').glob('*.capture.json'))
        captures.append(args.live_root / 'native-eight-3/capacity-playback.capture.json')
        for path in captures:
            group = read(path)['group_id']
            try:
                os.killpg(group, 0)
            except ProcessLookupError:
                pass
            else:
                raise AssertionError(('recorder group remains', group))
        for path, expected in read(ROOT / 'release-build-manifest.json')['files'].items():
            observed = Path(path) if Path(path).is_absolute() else REPO / path
            assert digest(observed) == expected, path
    if args.receipt:
        args.receipt.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
