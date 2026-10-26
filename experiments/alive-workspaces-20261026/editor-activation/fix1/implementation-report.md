## Fix Round 1: Diagnostic Output Isolation

Review finding I1 was verified at base
`6d8880319f60840d7ae3c005f5d803b347be052d`: receipt serialization and writes
were outside the callback exception guards. A queued write failure interrupted
the original click's continuation; a result write failure interrupted success
or replaced the original missing-window exception. This was a diagnostic
noninterference defect, not evidence explaining CI a1cf2e7.

`check_alive_desktop.py` now guards the complete two editor-observer callbacks,
including setup, native/accessibility observations, serialization and output.
An outer decorator returns normally on diagnostic exceptions and retains at
most three in-memory unavailable records with observer, error type and at most
512 message characters. Its fallback collector is also guarded and never
attempts another write. It does not manufacture input/ownership receipts or
declare an unobserved focus successful. The original `editor_edit` focus call,
exception re-raise, native input, timeouts, assertions and observer chaining /
restoration remain unchanged.

`check_alive_editor_diagnostics.py` injects an OSError at the actual receipt
write for queued or result callbacks. It checks one original activation and
focus continuation, normal hosted-editor assertions on success, and the exact
same original AssertionError object when focus searches an absent title. It
also directly checks callback setup failures, the three-record evidence bound,
absence of fabricated native receipts, and failure of the fallback collector
itself. These are error-isolation/helper checks, not new causal probes of the
unexplained editor miss.

All new raw evidence is under
`/tmp/alive-workspaces-editor-ci-probe/fix-1`; the initial root report,
inventory and all 153 initial artifacts remain byte-identical, verified by
`initial-audit-preserved.json`. The workspace report receives this appendix;
its fix copy is stored only under `fix-1`, preserving the original audit.

Exact native command form (the retained `run.py` sets the selected environment,
removes ALIVE_SYSROOT, uses PATH=/usr/bin:/bin and records argv/source hashes):

```sh
ALIVE_TEST_EDITOR_WRITE_ERROR=queued /usr/bin/python3 \
  /tmp/alive-workspaces-editor-ci-probe/fix-1/run.py STAGE-queued-write \
  "$PWD/apps/ultra/tests/check_alive_editor_diagnostics.py"
ALIVE_TEST_EDITOR_WRITE_ERROR=result /usr/bin/python3 \
  /tmp/alive-workspaces-editor-ci-probe/fix-1/run.py STAGE-result-write \
  "$PWD/apps/ultra/tests/check_alive_editor_diagnostics.py"
ALIVE_TEST_EDITOR_WRITE_ERROR=result ALIVE_TEST_EDITOR_FOCUS_FAILURE=1 \
  /usr/bin/python3 /tmp/alive-workspaces-editor-ci-probe/fix-1/run.py \
  STAGE-result-write-focus-failure \
  "$PWD/apps/ultra/tests/check_alive_editor_diagnostics.py"
```

`STAGE` is `red` before the callback guards and `green` afterward. The serial
matrix commands were `/usr/bin/python3 .../fix-1/matrix.py red` and the same
command with `green`. Every invoked runner delegates to the unchanged private
`check_canvas_desktop.sh` with ULTRA_TEST_ALIVE=1, its selected script and the
existing 480-second outer guard. No native focus timeout was extended.

| Check | Exit | Wall Seconds | Result |
| --- | ---: | ---: | --- |
| red-queued-write | 1 | 11.114112304 | Injected write OSError escapes and blocks focus |
| red-result-write | 1 | 9.844539729 | Injected write OSError interrupts success |
| red-result-write-focus-failure | 1 | 18.043050222 | Write OSError replaces original focus exception |
| green-queued-write | 0 | 14.535600327 | Original focus/editor continuation completes |
| green-result-write | 0 | 12.957216194 | Original focus/editor continuation completes |
| green-result-write-focus-failure | 0 | 19.357936108 | Original exception object identity preserved |
| helpers-final | 0 | 14.528580863 | Normal native action, setup/fallback failures, bounded evidence, Quit |

The final helper command selects the same diagnostic script with no fault
environment flags. No causal reproduction, product rebuild or unrelated DSP /
browser suite was added. Existing private-Xvfb portal messages, including
`[CRITICAL] Couldn't connect to a wayland compositor`, remain in the logs and
are environmental noise; they are not described as clean output or as a new
observer regression. Explicit check exits and retained receipts establish the
listed results.

Fresh preservation checks and Python compilation pass:

```sh
/usr/bin/python3 /tmp/alive-workspaces-editor-ci-probe/fix-1/verify-preservation.py
/usr/bin/python3 -m py_compile apps/ultra/tests/check_alive_desktop.py \
  apps/ultra/tests/check_alive_editor_diagnostics.py
git diff --check -- apps/ultra/tests/check_alive_desktop.py \
  apps/ultra/tests/check_alive_editor_diagnostics.py
```

All 76 original assertions and normalized original functions/classes remain
identical; original generic input/native focus sources and all pinned binaries
are unchanged. The final source and full-journey hashes/cleanup/freeze follow.


The full original native journey ran once after final source, with no fault
flags, inspector, temporary driver substitution or product rebuild. It exited
0 in 193.828069653 seconds, from 2026-10-26T19:01:32.235171+00:00 to 2026-10-26T19:04:46.063267+00:00. Exact source snapshots, argv, environment
and hashes are in `fix-1/full-original-run.json` and
`fix-1/full-original-sources/`. It reaches `journey-complete` and
`observer-stop`. All original saved-value/history/refusal, two Editor opens,
scoped Stop and final Quit Discard assertions pass. Exactly three first
activation receipts remain; final stream errors and rejected commands are
zero.

`fix-1/cleanup-verification.json` retains recorder supervision and confirms
that the owned capture group, recorder process and Alive process no longer
exist. Capture reports complete/requested_stop, 34029568 bytes, 4253696 frames,
zero stderr bytes and raw recorder returncode 1, retained unchanged.
`fix-1/final-verification.json` retains final diagnostics, flags, native
receipts, exact pins and source/run correspondence. No sustained endurance or
physical-output qualification is claimed.

Fix commit: `6d8c95a937a72c54db199f59fe556c0161ff662b`,
`test(alive): isolate editor diagnostic output failures`. It contains only
`check_alive_desktop.py` and `check_alive_editor_diagnostics.py`; no parent
docs/evidence were staged. Source/index frozen at 2026-10-26T19:06:39.019661+00:00, index empty, tree
`40b65489a638b31073499f1531dbfec71c9ce508`. Exact hashes are in
`fix-1/source-freeze.json`; changed source hashes are:

- `apps/ultra/tests/check_alive_desktop.py`: `3834422bf05a9844e3c756bbd8ec818879a2d477cd2529163e2d27d45c3c6489`.
- `apps/ultra/tests/check_alive_editor_diagnostics.py`: `8ae16daddeeb6bec355831de0a257d09b92ccc36fb03989b98ee83f6d76d319b`.

Alive, Ultra and both native-library hashes remain the exact initial pinned
values listed earlier in this report. The initial 153-artifact audit and
initial root report/inventory remain unchanged; the separate fix inventory
is `fix-1/hash-inventory.json`. Source/index ownership is released to the
parent for scoped independent re-review before push. The CI activation cause
remains unknown; actual desktop MIDI integration is still the next product
work. No settings, release, capacity, runtime/DSP/ABI or push changes occurred.
