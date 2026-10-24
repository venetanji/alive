#!/usr/bin/env python3
"""Verify retained acceptance receipts against their recorded source revision."""
import hashlib
import json
from pathlib import Path
import subprocess
import wave

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def read(name):
    return json.loads((HERE / name).read_text())


def main():
    manifest = read('evidence-manifest.json')
    for name, expected in manifest['files'].items():
        assert hashlib.sha256((HERE / name).read_bytes()).hexdigest() == expected, name
    revision = read('build-identity.json')['runtimeSourceCommit']
    current_differences = []
    for name, expected in manifest['sources'].items():
        source = subprocess.check_output(['git', 'show', f'{revision}:{name}'], cwd=ROOT)
        assert hashlib.sha256(source).hexdigest() == expected, name
        current = ROOT / name
        if not current.is_file() or hashlib.sha256(current.read_bytes()).hexdigest() != expected:
            current_differences.append(name)
    offline = read('headless-report.json')
    assert offline['passed'] and offline['partitionSamplesIdentical']
    assert offline['editorWindowsCreated'] == 0 and len(offline['devices']) == 2
    assert offline['loopProof']['wrapGenerations'] >= 2
    assert offline['loopProof']['secondCycleEnergy'] > 0
    assert offline['seekProof']['generationAdvanced']
    boundary = offline['savedDeviceBoundaryProof']
    assert boundary['offsets'] == [0, 1, 31, 63, 64, 127] and boundary['partitionsIdentical']
    assert {(o['track'], o['frame']) for o in boundary['observations']} == {
        (track, frame) for track in (0, 1) for frame in boundary['offsets']}
    for name in ('native-session-report.json', 'endurance-report.json'):
        report = read(name)
        assert report['physical_audio'] is False
        assert report['walkthrough']['peak'] > 0
        assert report['quit_cancel_preserved_session'] and report['quit_discard_exited']
        assert report['final_audio']['Audio sample rate'] == '48000'
        assert report['final_audio']['Audio buffer frames'] == '512'
        assert report['final_audio']['Audio stream errors'] == '0'
        assert report['final_audio']['Audio failed'] == 'false'
        assert report['final_audio']['Rejected commands'] == '0'
        for observation in report['operations']:
            audio = observation['audio']
            assert audio['Audio stream errors'] == '0' and audio['Audio failed'] == 'false'
            assert audio['Rejected commands'] == '0'
    sustained = read('endurance-report.json')
    assert sustained['playing_seconds_conservative'] >= 600
    assert sustained['endurance']['seconds'] >= sustained['playing_seconds_conservative']
    assert sustained['endurance']['peak'] > 0 and sustained['edit_transport_cycles'] > 10
    assert len(sustained['process_tree_samples']) > 10
    # Every cycle is observed before any possible Apply can reset driver metrics.
    before_stop = [o for o in sustained['operations'] if o['action'].endswith('before Stop/possible Apply')]
    assert len(before_stop) == sustained['edit_transport_cycles']
    resources = read('editor-resources-after-fix.json')
    assert len(resources) == 10
    assert all(s['web_processes'] == 1 for s in resources)
    assert resources[-1]['fds'] < resources[1]['fds'] + 100
    assert resources[-1]['pss_kib'] < resources[1]['pss_kib'] + 384 * 1024
    excerpt = read('excerpt.json')
    assert excerpt['sourceSha256'] == read('native-session-report.json')['walkthrough']['sha256']
    with wave.open(str(HERE / 'native-walkthrough-excerpt.wav')) as clip:
        assert (clip.getnchannels(), clip.getframerate(), clip.getsampwidth(), clip.getnframes()) == (2, 48000, 2, 192000)
    print(json.dumps({'passed': True, 'retained_files': len(manifest['files']),
                      'playing_seconds': sustained['playing_seconds_conservative'],
                      'cycles': sustained['edit_transport_cycles'],
                      'recorded_source_revision': revision,
                      'current_source_differences': current_differences,
                      'scope': 'retained receipt integrity; does not rerun native playback'}))


if __name__ == '__main__':
    main()
