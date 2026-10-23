#!/usr/bin/env python3
"""Validate the private CPAL capture; --self-test needs no audio server."""
import array
import json
import math
import pathlib
import sys
import tempfile
import unittest


KNOWN_SIGINT_VERSIONS = {
    ('pw-cat', f'Compiled with libpipewire {version}', f'Linked with libpipewire {version}')
    for version in ('1.0.5', '1.6.9')
}


def analyze(out, capture_status):
    out = pathlib.Path(out)
    # The shell writes this only after the probe passes and kill -INT succeeds.
    assert (out / 'capture-stop.txt').read_text() == 'SIGINT\n'
    assert 'test result: ok. 1 passed; 0 failed;' in (out / 'probe.log').read_text()
    assert not (out / 'capture.log').read_text().strip()
    # These versions' do_quit() only quits the main loop. main() starts with
    # EXIT_FAILURE and returns success only after playback drain; a deliberate
    # recording SIGINT therefore returns 1. Never normalize other failures.
    # https://github.com/PipeWire/pipewire/blob/1.0.5/src/tools/pw-cat.c#L1916-L1921
    # https://github.com/PipeWire/pipewire/blob/1.6.9/src/tools/pw-cat.c#L2655-L2660
    known_sigint = (
        capture_status == 1
        and tuple((out / 'capture-version.txt').read_text().splitlines()) in KNOWN_SIGINT_VERSIONS
    )
    assert capture_status == 0 or known_sigint, capture_status
    samples = array.array('f')
    samples.frombytes((out / 'loopback.f32').read_bytes())
    assert len(samples) % 2 == 0, len(samples)
    assert len(samples) // 2 > 48000, len(samples)
    assert all(math.isfinite(x) for x in samples)
    peaks = [max(abs(x) for x in samples[channel::2]) for channel in (0, 1)]
    assert all(.001 < peak < 1 for peak in peaks), peaks
    report = {
        'scope': 'private software-only CPAL PipeWire loopback, no physical outputs',
        'rate_hz': 48000,
        'channels': 2,
        'frames': len(samples) // 2,
        'peaks': peaks,
        'all_finite': True,
        'capture_exit_status': capture_status,
        'capture_known_sigint_exit': known_sigint,
        'capture_note': 'Recording stopped with SIGINT after the passing Rust test; '
                        'frame count varies. Status 1 is allowed only for the '
                        'documented PipeWire 1.0.5 or 1.6.9 recording shutdown, with empty '
                        'stderr and valid PCM; raw status is retained.',
        'note_score': 'both channels A4 / MIDI 69 velocity 70; on at +2s, off +2.6s; '
                      'score wall times approximate, not latency measurements',
        'observed': 'probe.log records requested and observed callback size; '
                    'successful stop/start and saved configuration reload',
    }
    (out / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


class CaptureRegression(unittest.TestCase):
    def check(self, *, status=1, version='1.0.5', linked_version=None, stopped=True, log='',
              samples=None, probe_ok=True, valid=False):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            if samples is None:
                samples = array.array('f', [.1] * 100000).tobytes()
            (root / 'loopback.f32').write_bytes(samples)
            (root / 'capture.log').write_text(log)
            (root / 'capture-version.txt').write_text(
                f'pw-cat\nCompiled with libpipewire {version}\nLinked with libpipewire {linked_version or version}\n')
            (root / 'probe.log').write_text(
                'test result: ok. 1 passed; 0 failed; 0 ignored;\n' if probe_ok
                else 'test result: FAILED. 0 passed; 1 failed;\n')
            if stopped:
                (root / 'capture-stop.txt').write_text('SIGINT\n')
            if valid:
                self.assertEqual(analyze(root, status)['capture_exit_status'], status)
            else:
                with self.assertRaises((AssertionError, FileNotFoundError)):
                    analyze(root, status)

    def test_known_planned_sigint(self):
        self.check(valid=True)

    def test_known_planned_sigint_1_6_9(self):
        self.check(version='1.6.9', valid=True)

    def test_mismatched_compile_link_versions(self):
        self.check(version='1.6.9', linked_version='1.0.5')

    def test_clean_zero(self):
        self.check(status=0, version='1.4.9', valid=True)

    def test_unknown_version_nonzero(self):
        self.check(version='1.4.9')

    def test_missing_sigint(self):
        self.check(stopped=False)

    def test_failed_probe(self):
        self.check(probe_ok=False)

    def test_timeout(self):
        self.check(status=124)

    def test_signal_failure(self):
        self.check(status=130)

    def test_stderr_failure(self):
        self.check(log='stream error')

    def test_silence(self):
        self.check(samples=array.array('f', [0] * 100000).tobytes())

    def test_clipping(self):
        self.check(samples=array.array('f', [1.1] * 100000).tobytes())

    def test_nan(self):
        self.check(samples=array.array('f', [float('nan')] * 100000).tobytes())

    def test_truncated_frame(self):
        self.check(samples=array.array('f', [.1] * 100001).tobytes())

    def test_short_recording(self):
        self.check(samples=array.array('f', [.1] * 1000).tobytes())


if __name__ == '__main__':
    if sys.argv[1:] == ['--self-test']:
        unittest.main(argv=[sys.argv[0]])
    else:
        print(json.dumps(analyze(sys.argv[1], int(sys.argv[2]))))
