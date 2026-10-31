# DMG failure diagnostic candidate

Base HEAD: e8c0d53. No index, ref, commit, cloud, package, build or native GUI actions performed.

## Candidate SHA-256

- `.github/workflows/ultra-desktop.yml`: `de6e90cf5a31f465635fe609477d4d3736a70c7b4f4ab6734cbd922849615d6b`
- `apps/ultra/scripts/diagnose_dmg.py`: `56077365510b6af0502c82389580d152bdc52186445bf9d9533628d860ee047f`
- `apps/ultra/scripts/test_diagnose_dmg.py`: `46159fba04bcb74ea1bdf34d49df1bd1869fd9add4a06e6abb99eb056da12034`

## Verification

- `python apps/ultra/scripts/test_diagnose_dmg.py`: exit 0, 7 tests. Initial red log records missing API errors plus workflow assertion failure; malformed XML red log records ExpatError. Green log records 7 passing tests.
- `python apps/ultra/scripts/test_release.py`: exit 0, 18 tests.
- `python apps/ultra/scripts/test_notices.py`: exit 0, 4 tests.
- `git diff --check -- .github/workflows/ultra-desktop.yml`: exit 0.
- An incidental local Linux `lsof -n -P -F0pcfn -- /tmp` syntax check ran and exited 0; this exceeded the instruction to mock platform commands. It was read-only and does not validate macOS.

## Self-review and limits

- The two steps require failure(), macOS, non-push, and the unsigned build outcome failure. The build remains failed and release steps and artifacts remain otherwise unchanged.
- No diagnostic processes run on a successful build. Helper has one 25-second deadline, 5-second command deadlines, 1 MiB total tool output, three mount probes and 256 KiB report cap. Child process groups are killed and pipes are nonblocking; reaping is bounded by the deadline.
- Only matching checkout bundle image paths and scoped lsof paths appear; stderr content is withheld, with status and stderr presence recorded to avoid leaking unrelated paths. Empty, error, timeout, truncated and late observations are inconclusive.
- Linux fixtures cannot validate hdiutil/lsof behavior on hosted macOS or identify the original holder. Workflow gating is checked structurally, not executed by GitHub Actions. Initial TDD red run includes missing-symbol errors rather than behavioral assertion failures, and a bad fixture was corrected before green; malformed XML was independently observed failing before the fix.
- No cloud retry authorized or performed. Independent specification and quality review remain for controller.

## Reviewer commands

```sh
python apps/ultra/scripts/test_diagnose_dmg.py
python apps/ultra/scripts/test_release.py
python apps/ultra/scripts/test_notices.py
git diff -- .github/workflows/ultra-desktop.yml
git diff --no-index /dev/null apps/ultra/scripts/diagnose_dmg.py
git diff --no-index /dev/null apps/ultra/scripts/test_diagnose_dmg.py
```

## Exact candidate diff

```diff
diff --git i/.github/workflows/ultra-desktop.yml w/.github/workflows/ultra-desktop.yml
index 2a45c2b..fcffebd 100644
--- i/.github/workflows/ultra-desktop.yml
+++ w/.github/workflows/ultra-desktop.yml
@@ -91,11 +91,23 @@ jobs:
             libasound2-dev libpipewire-0.3-dev libspa-0.2-dev libclang-dev \
             libayatana-appindicator3-dev librsvg2-dev patchelf libfuse2t64
       - name: Build unsigned or ad-hoc test packages
+        id: unsigned_build
         if: github.event_name != 'push' || runner.os != 'macOS'
         env:
           APPLE_SIGNING_IDENTITY: '-'
           APPIMAGE_EXTRACT_AND_RUN: '1'
         run: python apps/ultra/scripts/release.py build --target '${{ matrix.target }}'
+      - name: Diagnose failed macOS DMG build
+        if: ${{ failure() && runner.os == 'macOS' && github.event_name != 'push' && steps.unsigned_build.outcome == 'failure' }}
+        run: python apps/ultra/scripts/diagnose_dmg.py --target '${{ matrix.target }}' --output test-results/dmg-diagnostic/report.txt
+      - name: Retain failed macOS DMG diagnostic
+        if: ${{ failure() && runner.os == 'macOS' && github.event_name != 'push' && steps.unsigned_build.outcome == 'failure' }}
+        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
+        with:
+          name: dmg-failure-diagnostic-${{ matrix.target }}
+          path: test-results/dmg-diagnostic/report.txt
+          if-no-files-found: warn
+          retention-days: 7
       - name: Build signed and notarized macOS release packages
         if: github.event_name == 'push' && runner.os == 'macOS'
         env:
diff --git 1/apps/ultra/scripts/diagnose_dmg.py 2/apps/ultra/scripts/diagnose_dmg.py
new file mode 100644
index 0000000..f84b628
--- /dev/null
+++ 2/apps/ultra/scripts/diagnose_dmg.py
@@ -0,0 +1,195 @@
+#!/usr/bin/env python3
+"""Collect bounded, failure-only evidence about this checkout's mounted DMGs."""
+import argparse
+from dataclasses import dataclass
+import os
+from pathlib import Path
+import plistlib
+import selectors
+import signal
+import subprocess
+import time
+from xml.parsers.expat import ExpatError
+
+TARGETS = {'aarch64-apple-darwin', 'x86_64-apple-darwin'}
+TOOL_LIMIT = 1024 * 1024
+REPORT_LIMIT = 256 * 1024
+
+
+@dataclass
+class Result:
+    out: bytes
+    err: bytes
+    status: str
+    code: int | None
+
+
+def run_command(args, deadline, budget):
+    if budget <= 0:
+        return Result(b'', b'', 'truncated output', None)
+    end = min(deadline, time.monotonic() + 5)
+    if end <= time.monotonic():
+        return Result(b'', b'', 'timeout', None)
+    try:
+        proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
+                                start_new_session=True, stdin=subprocess.DEVNULL)
+    except FileNotFoundError:
+        return Result(b'', b'', 'missing tool', None)
+    except PermissionError:
+        return Result(b'', b'', 'permission error', None)
+    except OSError:
+        return Result(b'', b'', 'tool error', None)
+    buffers = [bytearray(), bytearray()]
+    status = 'ok'
+    sel = selectors.DefaultSelector()
+    try:
+        for index, pipe in enumerate((proc.stdout, proc.stderr)):
+            os.set_blocking(pipe.fileno(), False)
+            sel.register(pipe, selectors.EVENT_READ, index)
+        while sel.get_map():
+            remaining = end - time.monotonic()
+            if remaining <= 0:
+                status = 'timeout'
+                break
+            events = sel.select(remaining)
+            if not events:
+                status = 'timeout'
+                break
+            for key, _ in events:
+                remaining_bytes = budget - sum(map(len, buffers))
+                chunk = os.read(key.fileobj.fileno(), min(65536, remaining_bytes + 1))
+                if not chunk:
+                    sel.unregister(key.fileobj)
+                else:
+                    buffers[key.data].extend(chunk[:remaining_bytes])
+                    if len(chunk) > remaining_bytes:
+                        status = 'truncated output'
+                        break
+            if status != 'ok':
+                break
+        if status == 'ok':
+            try:
+                proc.wait(timeout=max(0, end - time.monotonic()))
+            except subprocess.TimeoutExpired:
+                status = 'timeout'
+        if status == 'ok' and proc.returncode:
+            status = ('permission error' if b'permission denied' in buffers[1].lower()
+                      or b'operation not permitted' in buffers[1].lower() else 'tool error')
+    finally:
+        # Terminate the owned process group even if a descendant inherited a pipe.
+        try:
+            os.killpg(proc.pid, signal.SIGKILL)
+        except ProcessLookupError:
+            pass
+        sel.close()
+        proc.stdout.close()
+        proc.stderr.close()
+        try:
+            proc.wait(timeout=max(0, end - time.monotonic()))
+        except subprocess.TimeoutExpired:
+            pass
+    return Result(bytes(buffers[0]), bytes(buffers[1]), status, proc.returncode)
+
+
+def select_mounts(data, root, target):
+    if target not in TARGETS:
+        return [], 'invalid target'
+    try:
+        info = plistlib.loads(data)
+        images = info['images']
+        if not isinstance(images, list):
+            raise ValueError()
+    except (ValueError, KeyError, TypeError, plistlib.InvalidFileException, OverflowError, ExpatError, AttributeError):
+        return [], 'invalid plist'
+    root = root.resolve()
+    bases = [root / 'apps' / product / 'src-tauri/target' / target / 'release/bundle'
+             for product in ('ultra', 'alive')]
+    mounts = []
+    for item in images:
+        if not isinstance(item, dict):
+            continue
+        image = item.get('image-path')
+        if not isinstance(image, str) or not Path(image).is_absolute():
+            continue
+        path = Path(image).resolve()
+        if not any(base.resolve() == base and path != base
+                   and path.is_relative_to(base) for base in bases):
+            continue
+        entities = item.get('system-entities', [])
+        if not isinstance(entities, list):
+            continue
+        for entity in entities:
+            mount = entity.get('mount-point') if isinstance(entity, dict) else None
+            if isinstance(mount, str) and mount and Path(mount).is_absolute():
+                mounts.append((image, mount))
+    return mounts, 'ok'
+
+
+def parse_lsof(data, mount):
+    pid = command = descriptor = ''
+    lines = []
+    base = Path(mount)
+    for raw in data.split(b'\0'):
+        field = raw.lstrip(b'\n').decode('utf-8', 'replace')
+        if not field:
+            continue
+        kind, value = field[0], field[1:]
+        if kind == 'p':
+            pid, command, descriptor = value, '', ''
+        elif kind == 'c':
+            command = value
+        elif kind == 'f':
+            descriptor = value
+        elif kind == 'n' and pid and command and descriptor:
+            path = Path(value)
+            if path.is_absolute() and (path == base or path.is_relative_to(base)) and '..' not in path.parts:
+                lines.append(f'{pid} {command} {descriptor} {value}')
+    return '\n'.join(lines)
+
+
+def collect(root, target, runner=run_command):
+    deadline = time.monotonic() + 25
+    budget = TOOL_LIMIT
+    lines = ['DMG failure diagnostic; all results are inconclusive.']
+    def run(args):
+        nonlocal budget
+        result = runner(args, deadline, budget)
+        budget -= len(result.out) + len(result.err)
+        return result
+    result = run(['hdiutil', 'info', '-plist'])
+    lines.append(f'hdiutil: {result.status}; exit={result.code}; stderr={'present (redacted)' if result.err else 'empty'}')
+    if result.status != 'ok':
+        return '\n'.join(lines) + '\n'
+    mounts, status = select_mounts(result.out, root, target)
+    if status != 'ok':
+        lines.append(status)
+    elif not mounts:
+        lines.append('no remaining matching mount')
+    else:
+        if len(mounts) > 3:
+            lines.append('probe limit reached; remaining mounts omitted')
+        for image, mount in mounts[:3]:
+            lines.append(f'image: {image}\nmount: {mount}')
+            result = run(['lsof', '-n', '-P', '-F0pcfn', '--', mount])
+            lines.append(f'lsof: {result.status}; exit={result.code}; stderr={'present (redacted)' if result.err else 'empty'}')
+            lines.append(parse_lsof(result.out, mount) or 'no matching open files observed')
+    report = '\n'.join(lines) + '\n'
+    encoded = report.encode('utf-8')
+    if len(encoded) > REPORT_LIMIT:
+        marker = b'\nreport truncated; inconclusive\n'
+        return (encoded[:REPORT_LIMIT - len(marker)].decode('utf-8', 'ignore') + marker.decode())
+    return report
+
+
+def main():
+    parser = argparse.ArgumentParser()
+    parser.add_argument('--target', required=True, choices=sorted(TARGETS))
+    parser.add_argument('--output', required=True, type=Path)
+    args = parser.parse_args()
+    report = collect(Path(__file__).resolve().parents[3], args.target)
+    args.output.parent.mkdir(parents=True, exist_ok=True)
+    args.output.write_text(report, encoding='utf-8')
+
+
+if __name__ == '__main__':
+    main()
diff --git 1/apps/ultra/scripts/test_diagnose_dmg.py 2/apps/ultra/scripts/test_diagnose_dmg.py
new file mode 100644
index 0000000..866929d
--- /dev/null
+++ 2/apps/ultra/scripts/test_diagnose_dmg.py
@@ -0,0 +1,109 @@
+import plistlib
+import tempfile
+import time
+import unittest
+from pathlib import Path
+from unittest import mock
+
+import diagnose_dmg as d
+
+
+class DiagnosticTests(unittest.TestCase):
+    def setUp(self):
+        self.tmp = tempfile.TemporaryDirectory()
+        self.addCleanup(self.tmp.cleanup)
+        self.root = Path(self.tmp.name)
+        self.target = 'x86_64-apple-darwin'
+        self.bundle = self.root / 'apps/ultra/src-tauri/target' / self.target / 'release/bundle'
+        self.bundle.mkdir(parents=True)
+
+    def plist(self, entries):
+        return plistlib.dumps({'images': entries})
+
+    def entry(self, image, mount='/Volumes/a space'):
+        return {'image-path': str(image), 'system-entities': [{'mount-point': mount} if mount else {}]}
+
+    def result(self, data=b'', status='ok', code=0):
+        return d.Result(data, b'', status, code)
+
+    def test_selection_rejects_sibling_and_symlink_escape_and_missing_mount(self):
+        outside = self.root / 'outside'
+        outside.mkdir()
+        (self.bundle / 'escape').symlink_to(outside, target_is_directory=True)
+        data = self.plist([self.entry(self.bundle / 'with space.dmg'),
+                           self.entry(Path(str(self.bundle) + '-other') / 'bad.dmg'),
+                           self.entry(self.bundle / 'escape/bad.dmg'),
+                           self.entry(self.bundle / 'missing.dmg', None),
+                           self.entry(self.root / 'unrelated.dmg')])
+        selected, status = d.select_mounts(data, self.root, self.target)
+        self.assertEqual(selected, [(str(self.bundle / 'with space.dmg'), '/Volumes/a space')])
+        self.assertEqual(status, 'ok')
+
+    def test_invalid_plist_and_no_mount_are_inconclusive(self):
+        self.assertEqual(d.select_mounts(b'bad', self.root, self.target)[1], 'invalid plist')
+        self.assertEqual(d.select_mounts(b'<?xml version="1.0"?><plist>', self.root, self.target)[1], 'invalid plist')
+        self.assertEqual(d.select_mounts(self.plist([]), self.root, self.target)[0], [])
+        report = d.collect(self.root, self.target, lambda *args: self.result(self.plist([])))
+        self.assertIn('no remaining matching mount', report)
+        self.assertIn('inconclusive', report)
+
+    def test_lsof_filters_paths_and_does_not_emit_other_process_fields(self):
+        data = b'p42\0cFinder\0f3r\0n/Volumes/a space/file\0f4\0n/Volumes/a space-sibling/secret\0p99\0cOther\0f1\0n/tmp/secret\0'
+        output = d.parse_lsof(data, '/Volumes/a space')
+        self.assertIn('42 Finder 3r /Volumes/a space/file', output)
+        self.assertNotIn('secret', output)
+        self.assertNotIn('Other', output)
+
+    def test_errors_and_limits_are_inconclusive(self):
+        for status in ('missing tool', 'permission error', 'timeout', 'truncated output'):
+            with self.subTest(status=status):
+                report = d.collect(self.root, self.target, lambda *args: self.result(status=status, code=None))
+                self.assertIn(status, report)
+                self.assertIn('inconclusive', report)
+        entries = [self.entry(self.bundle / f'{i}.dmg', f'/Volumes/{i}') for i in range(5)]
+        calls = []
+        def runner(args, deadline, budget):
+            calls.append(args)
+            return self.result(self.plist(entries) if len(calls) == 1 else b'')
+        report = d.collect(self.root, self.target, runner)
+        self.assertEqual(len(calls), 4)
+        self.assertIn('probe limit', report)
+        self.assertLessEqual(len(report.encode()), 256 * 1024)
+
+    def test_all_probes_share_one_deadline_and_one_byte_budget(self):
+        entries = [self.entry(self.bundle / f'{i}.dmg', f'/Volumes/{i}') for i in range(3)]
+        budgets, deadlines = [], []
+        def runner(args, deadline, budget):
+            deadlines.append(deadline)
+            budgets.append(budget)
+            return self.result(self.plist(entries) if len(budgets) == 1 else b'x' * min(budget, 400000))
+        d.collect(self.root, self.target, runner)
+        self.assertEqual(len(set(deadlines)), 1)
+        self.assertLessEqual(deadlines[0] - time.monotonic(), 25)
+        self.assertEqual(budgets[0], 1048576)
+        self.assertLess(budgets[-1], budgets[1])
+        self.assertGreaterEqual(budgets[-1], 0)
+
+    def test_runner_enforces_timeout_and_output_cap_with_inherited_pipe(self):
+        start = time.monotonic()
+        result = d.run_command(['python3', '-c', 'import os,time; os.fork() or time.sleep(3); print("x"*100000, flush=True); time.sleep(3)'], time.monotonic() + .3, 1000)
+        self.assertIn(result.status, ('timeout', 'truncated output'))
+        self.assertLessEqual(len(result.out) + len(result.err), 1000)
+        self.assertLess(time.monotonic() - start, 2)
+
+    def test_workflow_has_failure_only_scope_and_separate_upload(self):
+        text = (Path(__file__).resolve().parents[3] / '.github/workflows/ultra-desktop.yml').read_text()
+        build = text.index('- name: Build unsigned or ad-hoc test packages')
+        signed = text.index('- name: Build signed and notarized macOS release packages')
+        block = text[build:signed]
+        self.assertIn('id: unsigned_build', block)
+        self.assertEqual(block.count("steps.unsigned_build.outcome == 'failure'"), 2)
+        self.assertEqual(block.count("github.event_name != 'push'"), 3)
+        self.assertEqual(block.count("runner.os == 'macOS'"), 2)
+        self.assertEqual(block.count('failure()'), 2)
+        self.assertIn('diagnose_dmg.py', block)
+        self.assertIn('actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02', block)
+
+
+if __name__ == '__main__':
+    unittest.main()
```
