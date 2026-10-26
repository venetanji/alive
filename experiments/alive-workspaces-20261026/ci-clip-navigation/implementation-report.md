# Clip Navigation Regression Handoff

Status: the requested selected-clip navigation correction is committed and source/index are frozen. The unchanged native RED reproduced the expected missing Duplicate clip control. The corrected complete original journey was attempted once and passed that point, but stopped on a distinct unchanged runtime assertion. Full native GREEN is not achieved; no retries or weakened checks were introduced.

## Source And Scope

- Source base: `cb079f2b95d5d3d5755db85cf88d8744c4806caa`.
- Exact source commit: `729dc9a555a389130304fe52b081bae351f814da` (`test: route selected clip controls through Clip detail`).
- Only committed path: `apps/ultra/tests/alive_workspace_navigation.py`; 5 insertions and 1 deletion add all nine controls rendered by renderClipControls to existing Clip detail navigation.
- Existing visible-button routing, hosted-editor scope guard, diagnostic collapse, note/automation/device/track/mixer handling remain byte-identical outside that tuple expansion. Navigation does not launch, select clips/tracks, Apply, or mutate model state.
- Every original observability/clip/history/editor/stream/measurement/receipt/Quit assertion, action, wait and recorder/resource limit remains unchanged. Verification compared all other hashed test sources to the exact source base.
- Parent-owned PLAN.md, docs/superpowers/plans/alive-workspaces-20261026.md and untracked experiments were preserved and never staged. No app rebuild, settings-file edit, unrelated source change, push or subagent. The original private-session test itself exercises temporary audio settings as required.

## Actual Commands And Exits

All commands ran in `/home/venetanji/.codex/worktrees/edd5/alive`. The release launcher default was retained, system PATH was explicit and ALIVE_SYSROOT unset. Each native command launched fresh private Xvfb/D-Bus and software PipeWire using the original wrapper.

RED, exit `1`, `2026-10-26T05:21:28.588861+00:00` to `2026-10-26T05:22:02.434184+00:00`:
```bash
env -u ALIVE_SYSROOT PATH=/usr/bin:/bin ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/tests/check_alive_observability.py PYTHONUNBUFFERED=1 timeout --signal=TERM --kill-after=10s 480s bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-workspaces-clip-navigation/red
```

Corrected full native attempt (directory named green; result is not GREEN), exit `1`, `2026-10-26T05:22:26.360664+00:00` to `2026-10-26T05:23:23.336929+00:00`:
```bash
env -u ALIVE_SYSROOT PATH=/usr/bin:/bin ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/tests/check_alive_observability.py PYTHONUNBUFFERED=1 timeout --signal=TERM --kill-after=10s 480s bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-workspaces-clip-navigation/green
```

Preservation and syntax verification, exit `0`:
```bash
/usr/bin/python3 /tmp/alive-workspaces-clip-navigation/verify.py
```
The retained script parses helper Python syntax, checks git diff whitespace, proves the helper is the only changed hashed input, and compares every other hashed test source to the base. It adds no label-list tests. `git diff --check` also exited 0 before native execution.

Source commit, exit `0`:
```bash
git add -- apps/ultra/tests/alive_workspace_navigation.py
git diff --cached --stat
git commit -m "test: route selected clip controls through Clip detail"
```
The first two commands also exited 0. Cached diff contained only the helper. Freeze verification proves current helper bytes equal the committed blob and the staged index is empty.

## Native Evidence And Distinct Failure

- Original RED: check_alive_clips.py:75 -> navigation helper -> Missing native control: Duplicate clip. Original screenshot/tree show Devices detail active; final action is Duplicate clip. Original observability-errors.json is [].
- Corrected attempt passes duplication, note edit/undo/redo, invalid clip truncation rejection, selection continuity, create/Add note/delete/undo, saved default, Apply editor boundary, prepared saved-session assertions, and original audio settings sequence through line 102.
- Distinct unchanged assertion at check_alive_clips.py:103 expects `Cued Clip 1 /` plus `applied`; actual AT-SPI value from wait_value is `Cued Clip 1 copy`.
- Original native input log records exactly one press/release for Launch Pulse Clip 1, rect [555,159,49,24], owned frame 4194307 in native hit path [927,4194307]. Screenshot shows that Launch focused, Pulse slot 2 still selected and Clip 1 copy still cued. This establishes input targeting/focus, not native command submission or receipt application.
- Final original screenshot shows transport false, Absolute frame 782336, generation 9, 1155 audio callbacks, zero rejected commands/stream errors and audio failed false. Stream sampler errors remain []. These screenshot fields are transcriptions; there is no new accessibility dump.
- Raw runtime.requests/receipt serial/reason and Session status were not persisted by this original wait-value failure path. Product receipt behavior, click handling, and shell runtime-label projection cannot be distinguished conclusively from the retained data. Cause remains unproven; no production changes made.
- Failure precedes start_capture, later shared-source recovery, final three qualification cycles, complete observability report/final diagnostics, and final Save/Quit. Therefore there is no rendered-audio capture or successful original report to retain; do not infer completion from partial resource/epoch logs.

## Hashes And Provenance

Local preexisting release artifacts match brief pins before and after execution:
- Alive executable SHA256: `bac50bb1af01c2d15d985d0cf345f21a1efcd6a0be450f0b77870df4356c3260`.
- Adjacent release libultra_native.so SHA256: `4c54e3e0a2e7bf2007a56620d1006658e97b86d5f8828e08f13e9ffd3a1e9e70`.
- Actual /proc executable and mapped-library paths/hashes were captured independently during RED and corrected runs in red-running-native.json and green-running-native.json. apps/ultra/build is not used as the launch library.
- These binary hashes prove local artifact identity; they do not independently establish the release artifacts source build commit. Test/harness source is pinned to the base plus the committed helper correction.
- CI reference comes from /tmp/alive-ci-87cb416-clips, attributed by the dispatch brief to exact-head 87cb416 / CI40271664266. Its native-inputs.json is input-event evidence, not a hash manifest; no CI binary hash claim is made.

Key final harness/fixture SHA256 values (all unchanged from RED except the helper):

- `apps/ultra/tests/check_alive_observability.py`: `44041372e55f2001947c83e2928041e4b48066f6433aa4895606d69e347d37ab`.
- `apps/ultra/tests/check_alive_clips.py`: `cbd3c7156358ad8283229c105eea64d6065bb98960f144f33c99c754109c51f7`.
- `apps/ultra/tests/check_alive_desktop.py`: `01fa550262a00a1204484582f2d4c495a755c45e2601ecad50fd2516a5e8194d`.
- `apps/ultra/tests/check_canvas_desktop.sh`: `e75bbd94e63ad4fc28476098e2b7bc1f8918c04706c709e7876fd8b47c2df574`.
- `apps/ultra/tests/stream_measurement.py`: `e9318ebd9123e681e851a54cd47a14eaf98afa39c1e42d5dc833d4797d53d9cd`.
- `apps/ultra/tests/alive_workspace_navigation.py`: `d06b777a6ce533a7afef589c8db584ca96fa292f049b024ddf3c7d07f881ede6`.
- `apps/ultra/tests/cpal-software-pipewire.conf`: `b9dcfd2e1ab82dbafd3bbeb54b3b78db80bab889da8570c0934b002056871419`.
- `apps/alive/examples/two-instruments.alive`: `2fac165677f2fabec83f87131d93aedfc9e80d89ac529be70874dd2fb24c349b`.
- `apps/ultra/examples/subtractive.ultra`: `57abff57231ecdb2c56e908c644a1b456f0d8f53c645dc15376797e178a58283`.
- `apps/ultra/examples/utility.ultra`: `b800a01bf8722b60206ea491181d3461f33f175fd8f5bd7ad4cb1a5889c6f107`.

Complete before/after/final manifests: red-input-sha256.json, green-input-sha256.json and final-input-sha256.json. They cover test Python/shell files, software PipeWire configurations, Alive session examples, Ultra device fixtures and native artifacts.

## Retained Raw Evidence And Freeze

Root: `/tmp/alive-workspaces-clip-navigation`. No native rerun after the distinct failure.

- `red/`, `red.log`, `red-command.json`: original screenshot/tree, initial/session/shared-device fixture copies, native input events, action log, error log and startup/server/app logs.
- `green/`, `green.log`, `green-command.json`: original failed-value/audio-settings/initial screenshots, prepared session, native input events, action/resource/epoch/error logs, fixture copies, and startup/server/app logs.
- `ci-reference/`: copied original CI screenshot/tree and event/action/error logs for comparison.
- `distinct-failure-isolation.json`: exact expected/actual runtime strings, original native input record, screenshot observations with provenance and explicit receipt limitations.
- `navigation-fix.diff`, `verify.py`, `verification.json`, `preservation-check.json`, input SHA256 manifests, native mapping manifests, initial/final git status and parent-preexisting.diff retain scope/identity evidence.
- `freeze.json` records exact source commit/tree, helper hash, empty staged index, and frozen UTC. `evidence-sha256.json` hashes all retained evidence files except itself.

Source/index frozen at `2026-10-26T05:25:49.370482+00:00`. No further source edits or index operations after this freeze; parent may inspect and independently review the committed correction.

Qualification is limited to actual standalone release Alive on private software PipeWire/Xvfb. No physical audio, normal desktop, production-v4, endurance, complete stream qualification, successful receipt journey or full original-GREEN claim.
