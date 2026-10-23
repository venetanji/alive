#!/usr/bin/env python3
"""Compare native runtime samples with retained original Max buffer~ values."""
import argparse
import hashlib
import json
import math
import os
import re
import struct
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines()]


def binary32(value):
    return struct.unpack('f', struct.pack('f', value))[0]


def ulp_distance(a, b):
    def ordered(value):
        bits, = struct.unpack('I', struct.pack('f', value))
        return 0x80000000 - (bits & 0x7fffffff) if bits & 0x80000000 else 0x80000000 + bits
    return abs(ordered(a) - ordered(b))


def expected():
    selected, excluded = {}, []
    for fixture, stages in [('arithmetic', ['initial', 'left3', 'right5', 'left7', 'right4', 'right0']),
                            ('waves', ['initial', 'changed']), ('precision', ['initial', 'restarted', 'reset'])]:
        score = json.loads((ROOT / 'fixtures' / (fixture + '.score.json')).read_text())
        for stage in stages:
            samples = rows(ROOT / 'results' / (fixture + '-' + stage + '.samples.jsonl'))
            for channel, info in enumerate(score['channels']):
                label = info['label']
                reason = None
                if label.startswith('noise_'):
                    reason = 'Original noise algorithm and deterministic seed contract unresolved.'
                elif label in ['clip~ -1. 1. @mode 1', 'clip_mode1_1.5']:
                    reason = 'Measured original variant is explicitly unsupported by the native schema/importer in this phase.'
                elif (fixture, stage, label) in [('waves', 'changed', 'phasor_negative1000'),
                                                 ('precision', 'restarted', 'phasor1000')]:
                    reason = 'Continuous phase depends on unretained number of NRT frames before wall-timed stop.'
                key = (fixture, stage, label)
                if reason:
                    excluded.append(dict(fixture=fixture, stage=stage, label=label, reason=reason))
                else:
                    selected[key] = [row['samples'][channel] for row in samples]
    return selected, excluded


def capture_current_native():
    source = REPO / 'apps/ultra/tests/canvas_signal_objects_test.cpp'
    pending, dependencies = [source], set()
    while pending:
        path = pending.pop().resolve()
        if path in dependencies:
            continue
        dependencies.add(path)
        for include in re.findall(r'^#include "([^"]+)"', path.read_text(), re.M):
            dependency = (path.parent / include).resolve()
            if dependency.is_file():
                pending.append(dependency)

    def hashes():
        return {str(path.relative_to(REPO)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in sorted(dependencies)}

    before = hashes()
    compiler = os.environ.get('CXX', 'c++')
    version = subprocess.check_output([compiler, '--version'], text=True).splitlines()[0]
    with tempfile.TemporaryDirectory(prefix='ultra-max-signal-compare-') as directory:
        binary = Path(directory) / 'signal-capture'
        subprocess.run([compiler, '-std=c++17', '-O2', '-Wall', '-Wextra', '-Werror',
                        str(source), '-o', str(binary)], check=True)
        captured = subprocess.check_output([str(binary), '--capture'])
        binary_hash = hashlib.sha256(binary.read_bytes()).hexdigest()
    assert hashes() == before, 'Native sources changed during comparison; run after they stabilize'
    return captured, dict(compiler=version, flags=['-std=c++17', '-O2', '-Wall', '-Wextra', '-Werror'],
                          sources=before, binary_sha256=binary_hash)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--native', type=Path, help='Read an existing native capture; default compiles and runs current native sources.')
    parser.add_argument('--output', type=Path, help='Write a report only when explicitly requested.')
    parser.add_argument('--absolute-tolerance', type=float, default=2e-7)
    args = parser.parse_args()
    assert math.isfinite(args.absolute_tolerance) and args.absolute_tolerance >= 0
    reference, excluded = expected()
    provenance = None
    if args.native:
        raw_capture = args.native.read_bytes()
    else:
        raw_capture, provenance = capture_current_native()
    captured = {}
    for line in raw_capture.decode().splitlines():
        row = json.loads(line)
        key = (row['fixture'], row['stage'], row['label'])
        assert key not in captured, 'Duplicate native case: ' + repr(key)
        assert isinstance(row['values'], list)
        captured[key] = row['values']
    comparisons, failed = [], []
    for key, original in reference.items():
        case = dict(fixture=key[0], stage=key[1], label=key[2], expected_frames=len(original))
        if key not in captured:
            case.update(status='missing')
        elif len(captured[key]) != len(original):
            case.update(status='length_mismatch', native_frames=len(captured[key]))
        else:
            converted = [binary32(value) for value in captured[key]]
            errors = [abs(native - observed) for native, observed in zip(converted, original)]
            maximum = max(errors)
            worst = errors.index(maximum)
            passing = all(math.isfinite(value) for value in converted) and maximum <= args.absolute_tolerance
            case.update(status='pass' if passing else 'sample_mismatch', maximum_absolute_error=maximum,
                        exact_float32_values=sum(a == b for a, b in zip(converted, original)),
                        maximum_float32_ulp_distance=max(ulp_distance(a, b) for a, b in zip(converted, original)),
                        worst_frame=worst, native_float32_at_worst=converted[worst], original_at_worst=original[worst])
        comparisons.append(case)
        if case['status'] != 'pass':
            failed.append(case)
    report = dict(schema='original-max-vs-native-signal-v1',
                  native_input=str(args.native) if args.native else 'Current native sources, temporary compiled capture',
                  native_input_sha256=hashlib.sha256(raw_capture).hexdigest(),
                  original_evidence='ORIGINAL_MAX_EXECUTED', native_evidence='NATIVE_RUNTIME_EXECUTED',
                  original_representation='Retained Max buffer~ float32 values',
                  native_conversion='Round each native value to IEEE754 binary32 before comparison.',
                  absolute_tolerance=args.absolute_tolerance, compared_cases=len(reference),
                  full_help_conformance=dict(passing=0, denominator=2103),
                  compared_values=sum(len(values) for values in reference.values()),
                  passed_cases=len(reference)-len(failed), failed_cases=len(failed), comparisons=comparisons,
                  excluded=excluded,
                  additional_native_records=[dict(fixture=key[0], stage=key[1], label=key[2]) for key in captured if key not in reference],
                  limitations=['No internal 64-bit signal precision or hardware audio equivalence established.',
                               'Noise, wall-time-dependent phase and final-vector snapshots are outside direct sample comparison.',
                               'A numerical tolerance pass is not a claim of bit-identical samples.'])
    if provenance:
        report['native_provenance'] = provenance
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ['compared_cases', 'compared_values', 'passed_cases', 'failed_cases', 'absolute_tolerance']}))
    if failed:
        print(json.dumps(dict(first_failures=failed[:6])))
    raise SystemExit(1 if failed else 0)


if __name__ == '__main__':
    main()
