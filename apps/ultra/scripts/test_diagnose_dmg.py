import plistlib
import tempfile
import time
import unittest
from pathlib import Path

import diagnose_dmg as d


class DiagnosticTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.target = 'x86_64-apple-darwin'
        self.bundle = self.root / 'apps/ultra/src-tauri/target' / self.target / 'release/bundle'
        self.bundle.mkdir(parents=True)

    def plist(self, entries):
        return plistlib.dumps({'images': entries})

    def entry(self, image, mount='/Volumes/a space'):
        return {'image-path': str(image), 'system-entities': [{'mount-point': mount} if mount else {}]}

    def result(self, data=b'', status='ok', code=0):
        return d.Result(data, b'', status, code)

    def test_selection_rejects_sibling_and_symlink_escape_and_missing_mount(self):
        outside = self.root / 'outside'
        outside.mkdir()
        (self.bundle / 'escape').symlink_to(outside, target_is_directory=True)
        data = self.plist([self.entry(self.bundle / 'with space.dmg'),
                           self.entry(Path(str(self.bundle) + '-other') / 'bad.dmg'),
                           self.entry(self.bundle / 'escape/bad.dmg'),
                           self.entry(self.bundle / 'missing.dmg', None),
                           self.entry(self.root / 'unrelated.dmg')])
        selected, status = d.select_mounts(data, self.root, self.target)
        self.assertEqual(selected, [(str(self.bundle / 'with space.dmg'), '/Volumes/a space')])
        self.assertEqual(status, 'ok')

    def test_invalid_plist_and_no_mount_are_inconclusive(self):
        self.assertEqual(d.select_mounts(b'bad', self.root, self.target)[1], 'invalid plist')
        self.assertEqual(d.select_mounts(b'<?xml version="1.0"?><plist>', self.root, self.target)[1], 'invalid plist')
        self.assertEqual(d.select_mounts(self.plist([]), self.root, self.target)[0], [])
        report = d.collect(self.root, self.target, lambda *args: self.result(self.plist([])))
        self.assertIn('no remaining matching mount', report)
        self.assertIn('inconclusive', report)

    def test_lsof_filters_paths_and_does_not_emit_other_process_fields(self):
        data = b'p42\0cFinder\0f3r\0n/Volumes/a space/file\0f4\0n/Volumes/a space-sibling/secret\0p99\0cOther\0f1\0n/tmp/secret\0'
        output = d.parse_lsof(data, '/Volumes/a space')
        self.assertIn('42 Finder 3r /Volumes/a space/file', output)
        self.assertNotIn('secret', output)
        self.assertNotIn('Other', output)

    def test_errors_and_limits_are_inconclusive(self):
        for status in ('missing tool', 'permission error', 'timeout', 'truncated output'):
            with self.subTest(status=status):
                report = d.collect(self.root, self.target, lambda *args: self.result(status=status, code=None))
                self.assertIn(status, report)
                self.assertIn('inconclusive', report)
        entries = [self.entry(self.bundle / f'{i}.dmg', f'/Volumes/{i}') for i in range(5)]
        calls = []
        def runner(args, deadline, budget):
            calls.append(args)
            return self.result(self.plist(entries) if len(calls) == 1 else b'')
        report = d.collect(self.root, self.target, runner)
        self.assertEqual(len(calls), 4)
        self.assertIn('probe limit', report)
        self.assertLessEqual(len(report.encode()), 256 * 1024)

    def test_all_probes_share_one_deadline_and_one_byte_budget(self):
        entries = [self.entry(self.bundle / f'{i}.dmg', f'/Volumes/{i}') for i in range(3)]
        budgets, deadlines = [], []
        def runner(args, deadline, budget):
            deadlines.append(deadline)
            budgets.append(budget)
            return self.result(self.plist(entries) if len(budgets) == 1 else b'x' * min(budget, 400000))
        d.collect(self.root, self.target, runner)
        self.assertEqual(len(set(deadlines)), 1)
        self.assertLessEqual(deadlines[0] - time.monotonic(), 25)
        self.assertEqual(budgets[0], 1048576)
        self.assertLess(budgets[-1], budgets[1])
        self.assertGreaterEqual(budgets[-1], 0)

    def test_runner_enforces_timeout_and_output_cap_with_inherited_pipe(self):
        start = time.monotonic()
        result = d.run_command(['python3', '-c', 'import os,time; os.fork() or time.sleep(3); print("x"*100000, flush=True); time.sleep(3)'], time.monotonic() + .3, 1000)
        self.assertIn(result.status, ('timeout', 'truncated output'))
        self.assertLessEqual(len(result.out) + len(result.err), 1000)
        self.assertLess(time.monotonic() - start, 2)

    def test_workflow_has_failure_only_scope_and_separate_upload(self):
        text = (Path(__file__).resolve().parents[3] / '.github/workflows/ultra-desktop.yml').read_text()
        build = text.index('- name: Build unsigned or ad-hoc test packages')
        signed = text.index('- name: Build signed and notarized macOS release packages')
        block = text[build:signed]
        self.assertIn('id: unsigned_build', block)
        gate = "if: ${{ failure() && runner.os == 'macOS' && github.event_name != 'push' && steps.unsigned_build.outcome == 'failure' }}"
        for name in ('Diagnose failed macOS DMG build', 'Retain failed macOS DMG diagnostic'):
            with self.subTest(step=name):
                step = block.split('- name: ' + name + '\n', 1)[1].split('\n      - name:', 1)[0]
                conditions = [line.strip() for line in step.splitlines() if line.strip().startswith('if:')]
                self.assertEqual(conditions, [gate])
        self.assertIn('diagnose_dmg.py', block)
        self.assertIn('actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02', block)

    def test_workflow_runs_diagnostic_tests_only_on_macos(self):
        text = (Path(__file__).resolve().parents[3] / '.github/workflows/ultra-desktop.yml').read_text()
        validate = text.split('- name: Validate committed versions and release ancestry\n', 1)[1].split('\n      - name:', 1)[0]
        self.assertIn('if [[ "$RUNNER_OS" == macOS ]]; then\n            python apps/ultra/scripts/test_diagnose_dmg.py\n          fi', validate)



if __name__ == '__main__':
    unittest.main()
