#!/usr/bin/env python3
"""Replay retained scene evidence, optionally checking original binaries and PCM."""
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent


def read(path):
    return json.loads(path.read_text())


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()


def committed(head, path):
    return subprocess.check_output(['git', 'show', head + ':' + path], cwd=REPO)


def raw_matrix(directory, count, live=False):
    manifest = read(directory / 'manifest.json')
    retained_count = 0
    for name, expected in manifest['files'].items():
        if Path(name).is_absolute():
            if live:
                assert digest(Path(name)) == expected, name
            continue
        retained_count += 1
        assert digest(directory / name) == expected, name
    samples, summaries, reads, scans = {}, {}, {}, {}
    lines = (directory / 'probe.log').read_text().splitlines()
    for line in lines:
        fields = line.split(',')
        if fields[0] == 'SAMPLE':
            key = (fields[1], *map(int, fields[2:5]))
            rows = samples.setdefault(key, [])
            assert int(fields[5]) == len(rows)
            rows.append(int(fields[6]))
        elif fields[0] == 'RESULT':
            data = dict(item.split('=', 1) for item in fields[2:])
            data = {key: int(value) for key, value in data.items()}
            key = (fields[1], data['tracks'], data['devices'], data['frames'])
            assert key not in summaries
            summaries[key] = data
        elif fields[0] == 'READS':
            data = dict(item.split('=', 1) for item in fields[2:])
            assert int(data['preview']) <= int(data['preview_bound'])
            key = (fields[1], int(data['tracks']), int(data['frames']))
            reads[key] = int(data['reconstruction'])
        elif fields[0] == 'COUNTERS':
            data = dict(item.split('=', 1) for item in fields[2:])
            key = (fields[1], int(data['tracks']), int(data['frames']))
            scans[key] = scans.get(key, 0) + int(data['scans'])
    assert len(samples) == 56 and set(samples) == set(summaries)
    combined = []
    for key, rows in samples.items():
        data, ordered = summaries[key], sorted(rows)
        assert len(rows) == data['count'] == count
        for index, name in ((count // 2, 'p50_ns'),
                            ((count - 1) * 99 // 100, 'p99_ns'),
                            ((count - 1) * 999 // 1000, 'p999_ns')):
            assert ordered[index] == data[name], (key, name)
        assert ordered[-1] == data['max_ns']
        if key[0] == 'scene_combined_policy_work' and key[1] == 8:
            combined.append({'frames': key[3], 'nearest_rank_p999_ns': ordered[math.ceil(.999 * count) - 1],
                             'max_ns': ordered[-1]})
    if manifest['diagnostic_guards']:
        assert reads and all(value <= scans[key] for key, value in reads.items())
        concurrent = next(line for line in lines if line.startswith('PASS: concurrent callback/control/read'))
        values = dict(item.split('=', 1) for item in concurrent.split() if '=' in item)
        assert int(values['accepted']) + int(values['refused']) == 4096
        assert int(values['same_callback_render_overlap_snapshots']) > 1
        assert 0 < int(values['first_overlap_callback']) < int(values['last_overlap_callback']) < 2048
    assert 'PASS: capacity probe complete' in lines
    return {'cases': len(samples), 'samples': sum(map(len, samples.values())),
            'retained_manifest_files': retained_count,
            'external_artifacts_checked': live,
            'combined_policy_surrogate': combined}


def epochs(directory):
    final = read(directory / 'scenes-final-epochs.json')
    assert final['complete'] and final['native_quiescent'] and not final['coverage_gap']
    assert final['active'] is None and final['retiring_epoch_id'] is None
    assert int(final['evicted_epoch_count']) == 0
    completed, lifetime = final['completed'], final['lifetime']
    assert [int(row['epoch_id']) for row in completed] == [1, 2, 3, 4]
    zero = ('callbacks_after_failure', 'clock_anomaly_count', 'counter_overflow',
            'cpal_error_total', 'cpal_non_xrun_reports', 'cpal_xrun_reports',
            'invalid_callback_shape', 'native_render_failures', 'over_buffer_budget_count',
            'silenced_callbacks', 'zero_frame_callbacks')
    for entry in completed:
        values, config = entry['metrics'], entry['config']
        assert entry['final'] and not entry['stale'] and not entry['failed']
        assert (config['channels'], config['rate_hz'], config['sample_format'],
                config['requested_buffer_frames'], config['host']) == (2, 48000, 'f32', 512, 'PipeWire')
        assert config['timing_enabled']
        assert int(values['buffer_frames_min']) == int(values['buffer_frames_max']) == 512
        assert int(values['output_frames']) == int(values['valid_callbacks']) * 512
        assert sum(map(int, values['duration_hist'])) == int(values['duration_samples'])
        assert sum(map(int, values['util_hist'])) == int(values['budget_samples'])
        assert all(int(values[key]) == 0 for key in zero)
    nonadditive = {'buffer_frames_last', 'buffer_frames_min', 'buffer_frames_max',
                   'duration_max_ns', 'max_utilization_ppm', 'duration_hist', 'util_hist'}
    for key in lifetime.keys() - nonadditive:
        assert sum(int(row['metrics'][key]) for row in completed) == int(lifetime[key]), key
    for key in ('duration_hist', 'util_hist'):
        assert [sum(int(row['metrics'][key][i]) for row in completed)
                for i in range(len(lifetime[key]))] == list(map(int, lifetime[key]))
    for key in ('duration_max_ns', 'max_utilization_ppm'):
        assert max(int(row['metrics'][key]) for row in completed) == int(lifetime[key])
    return {'epochs': len(completed), 'callbacks': int(lifetime['callbacks_entered']),
            'frames': int(lifetime['output_frames']), 'duration_max_ns': int(lifetime['duration_max_ns'])}


def resources(directory):
    rows = [json.loads(line) for line in (directory / 'scenes-resources.jsonl').read_text().splitlines()]
    result = {}
    for group in ('app', 'sampler_capture', 'server'):
        previous, checked = {}, 0
        records = [row[group] for row in rows]
        for record in records:
            for process in record['processes']:
                identity = (process['pid'], process['starttime'])
                old = previous.get(identity)
                if old is not None and process['cpu_percent'] is not None:
                    seconds = (process['ticks'] - old['ticks']) / record['clock_ticks_per_second']
                    expected = 100 * seconds / (process['monotonic'] - old['monotonic'])
                    assert math.isclose(process['cpu_percent'], expected, abs_tol=1e-8)
                    checked += 1
                previous[identity] = process
            if record['pss_kib'] is not None:
                assert record['pss_kib'] == sum(p['pss_kib'] for p in record['processes'])
        cpu = sorted(row['cpu_percent'] for row in records if row['cpu_percent'] is not None)
        pss = [row['pss_kib'] for row in records if row['pss_kib'] is not None]
        result[group] = {'samples': len(records), 'cpu_identity_intervals_checked': checked,
                         'cpu_p50_p95_max': [cpu[math.ceil(p * len(cpu)) - 1] for p in (.5, .95, 1)],
                         'pss_first_last_max_kib': [pss[0], pss[-1], max(pss)],
                         'coverage_gap_samples': sum(bool(row['coverage_gap']) for row in records),
                         'enumeration_gaps': sum(len(row['enumeration_gaps']) for row in records),
                         'unavailable_fields': sum(len(p['unavailable_fields']) for row in records for p in row['processes'])}
    return result


def pcm(path, expected):
    frames, peak = 0, 0.0
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            assert len(block) % 8 == 0
            values = array.array('f')
            values.frombytes(block)
            if sys.byteorder != 'little':
                values.byteswap()
            assert all(math.isfinite(value) for value in values)
            frames += len(values) // 2
            peak = max(peak, max(map(abs, values), default=0))
    assert frames == expected['frames'] and peak == expected['peak']
    assert digest(path) == expected['sha256']
    return {'frames': frames, 'peak': peak, 'sha256': expected['sha256']}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--live-root', type=Path)
    parser.add_argument('--receipt', type=Path)
    args = parser.parse_args()
    retained = read(ROOT / 'retained-2b1eab1.json')
    for entry in retained['files']:
        path = ROOT / entry['path']
        assert path.stat().st_size == entry['bytes'] and digest(path) == entry['sha256'], path
    sources = read(ROOT / 'final-source-manifest.json')['source_sha256']
    changed = subprocess.check_output(['git', 'diff', '--name-only', retained['base'], retained['head']], cwd=REPO).decode().splitlines()
    assert sorted(changed) == sorted(sources) and len(sources) == 20
    for name, expected in sources.items():
        assert hashlib.sha256(committed(retained['head'], name)).hexdigest() == expected, name
    native = read(ROOT / 'enabled-native-source-equality.json')
    for name, expected in native.items():
        path = 'apps/ultra/src-tauri/native/' + name
        assert hashlib.sha256(committed(retained['head'], path)).hexdigest() == expected, name
        for matrix in ('proposed-release-1', 'proposed-verify-1'):
            assert digest(ROOT / matrix / 'source/src-tauri/native' / name) == expected
    matrix = read(ROOT / 'proposed-release-1/manifest.json')
    for name, expected in matrix['files'].items():
        if not name.startswith('source/') or name.endswith(('alive_session_v3_policy.md', 'saved_graphs.hpp')):
            continue
        assert hashlib.sha256(committed(retained['head'], 'apps/ultra/' + name[7:])).hexdigest() == expected, name
    result = {'verified': True, 'head': retained['head'], 'retained_files': len(retained['files']),
              'committed_files': len(sources), 'measured_native_files': len(native),
              'release_matrix': raw_matrix(ROOT / 'proposed-release-1', 1200, bool(args.live_root)),
              'guard_matrix': raw_matrix(ROOT / 'proposed-verify-1', 4, bool(args.live_root)),
              'final_epochs': epochs(ROOT / 'native-scenes-2'),
              'resources': resources(ROOT / 'native-scenes-2')}
    scenes = read(ROOT / 'native-scenes-2/scenes-report.json')
    assert scenes['complete'] and scenes['atomic_scene_partial_override'] and scenes['all_empty_scene']
    assert scenes['saved_defaults_restored'] and not scenes['sampling_errors']
    assert scenes['observations'] == read(ROOT / 'native-scenes-2/scenes-observations.json')
    mixed = next(row['receipt'] for row in scenes['observations'] if row['label'] == 'scene-mixed-native-receipt')
    assert mixed.count(': applied') == 7 and mixed.count(': superseded') == 1
    applied = next(row['receipt'] for row in scenes['observations'] if row['label'] == 'scene-all-applied-native-receipt')
    assert applied.count(': applied') == 8
    assert read(ROOT / 'native-scenes-2/scenes-errors.json') == []
    clips = read(ROOT / 'native-clips-pointer-1/native-clips-report.json')
    assert all(clips[key] for key in ('draft_editor_continuity', 'apply_editor_boundary',
                                    'reopen_stopped_default', 'sequential_shared_source_recovery',
                                    'failed_shared_replace_editor_continuity'))
    assert (ROOT / 'check_alive_clips_pointer.py').read_bytes() == committed(retained['head'], 'apps/ultra/tests/check_alive_clips.py')
    click = next(row for row in clips['native_inputs'] if row['action'] == 'reorder click')
    assert click['presses'] == click['releases'] == 1
    build = read(ROOT / 'release-build-manifest.json')
    artifacts = read(ROOT / 'native-scenes-2/scenes-artifacts.json')['files']
    assert all(build['artifacts'][path]['sha256'] == value for path, value in artifacts.items())
    installs = read(ROOT / 'native-atomic-install.json')
    assert all(row['prior_inode'] != row['new_inode'] for row in installs)
    packages = read(ROOT / 'packages-7b76c7e.json')
    assert packages['headSha'] == retained['base'] and packages['conclusion'] == 'success'
    package_jobs = [row for row in packages['jobs'] if row['name'].startswith('Package ')]
    assert len(package_jobs) == 4 and all(row['conclusion'] == 'success' for row in package_jobs)
    result['historical_packages'] = {'head': packages['headSha'], 'targets': len(package_jobs), 'final_head_qualification': False}
    if args.live_root:
        for path, expected in build['artifacts'].items():
            assert digest(Path(path)) == expected['sha256'], path
        result['live_pcm'] = {}
        for name, report in (('native-scenes-2', scenes), ('native-clips-pointer-1', clips)):
            supervision = report['audio']['supervision']
            assert supervision['complete'] and supervision['reason'] == 'requested_stop'
            assert supervision['stderr_bytes'] == 0
            assert not Path('/proc/' + str(supervision['recorder_pid'])).exists()
            assert not Path('/proc/' + str(supervision['group_id'])).exists()
            result['live_pcm'][name] = pcm(args.live_root / name / report['audio']['path'], report['audio'])
    if args.receipt:
        args.receipt.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
