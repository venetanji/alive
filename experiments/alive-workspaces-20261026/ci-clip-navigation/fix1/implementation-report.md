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


# Fix Round 1: Audio Settings Opener And Original Native GREEN

This section records the explicitly authorized follow-up to the historical failures above. The complete original uninstrumented observability journey now exits 0 after a narrow second navigation correction. Earlier RED and diagnostic artifacts remain unchanged; this is a fresh full native result, not a retrospective waiver of their failures.

## Source And Retained RED

- Source base: `1194faff81170fe57d7283fac04488233610cfcd`; apps/test source blobs at that base match `729dc9a555a389130304fe52b081bae351f814da`.
- Exact source commit: `3522e31f36aba4f06afd853cf805b6e065a7a138` (`test: reveal audio settings before native pointer actions`). Only `apps/ultra/tests/alive_workspace_navigation.py` is committed, with 2 insertions/1 deletion.
- The existing overlay-clearing surface classification gains only the exact `Alive audio settings` opener. It reuses the existing conditional visible Audio details click, then performs the original opener click. Save/Close controls are not routed or synthesized; their presence still depends on the opener working.
- Every product/native source byte, original journey action/order/assertion/wait, hosted-editor scope guard, earlier selected-clip correction, and recorder/resource bound is retained. Before/after identity checks cover 407 tracked apps blobs plus both pinned release artifacts; only the helper differs from the source base.
- Retained RED is the single observed original run in `/tmp/alive-workspaces-clip-launch-diagnostic`: exit 1 at check_alive_observability.py:153, Missing native control: Save Alive audio settings. Its 0.641532174-second pre-launch and 0.717710977-second post-launch observations remain explicit in the separate diagnostic report. Parent independently checked the expanded diagnostics overlay, unexpanded/covered opener and absent settings panel before authorizing this source correction.
- The first selected-clip failure, earlier stopped-launch failure and observed late settings failure remain raw historical evidence. The earlier stopped-launch cause is still unproved; passing that assertion here does not assign a cause to its earlier failure.

## One Original Uninstrumented Run

Outer runner, exit `0`:
```bash
/usr/bin/python3 /tmp/alive-workspaces-clip-navigation-fix1/run_original.py
```

Exact native command, exit `0`, cwd `/home/venetanji/.codex/worktrees/edd5/alive`:
```bash
env -u ALIVE_SYSROOT PATH=/usr/bin:/bin ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/tests/check_alive_observability.py PYTHONUNBUFFERED=1 timeout --signal=TERM --kill-after=10s 480s bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-workspaces-clip-navigation-fix1/original
```

UTC interval: `2026-10-26T05:37:59.783442+00:00` to `2026-10-26T05:40:04.837236+00:00` (125.053794 seconds including wrapper/startup). There is one native run in this fix round. The original `check_alive_observability.py` is invoked directly: no temporary launch diagnostic driver, added observation delay, retry, changed predicate, replaced pointer input or relaxed assertion. Private software PipeWire/Xvfb and the existing 480-second outer bound are unchanged.

The run executes the original stopped-launch assertion, clip/history/editor/default/Apply and shared-source recovery checks, rendered capture, all three final qualification cycles, original final stop/stream checks, final Save and Quit path. The existing command exits 0 and original reports are retained. No distinct new failure appears in this run.

## Original Results And Integrity

- `observability-report.json`: complete=true; six completed epochs; 4.117333333333333 proven playing seconds; 15.51691969500098 excluded seconds; 115.40216780299852 measured journey wall seconds; sampling_errors=[].
- `observability-final.json`: complete=true, active=null, six completed stream epochs. `observability-errors.json` is []. No extra physical-audio or missed-work inference is made from those fields.
- `native-clips-report.json`: original editor continuity, Apply boundary, stopped/default reopen, failed shared replacement continuity and sequential recovery flags are true.
- Original stopped-launch observation is `Cued Clip 1 / request 2 applied for Clip 1`; original pointer record reports one press/release targeting Launch Pulse Clip 1 at [555,159,49,24], owned frame 4194307 in hit path [927,4194307]. The original subsequent pending/applied launch and per-track Stop runtime observations remain in the report.
- `clips-rendered.f32`: 417280 frames, 8.693333333333333 seconds, peak 0.19943729043006897; SHA256 `7cf3481bf99a41395111bd2c0e786d97b69d184b5c3c634531b427aed3a1b342`. Original finite/peak assertions pass.
- Capture supervision: complete=true, reason=requested_stop, recorder child returncode=1, audio_bytes=3338240. The child return code is retained accurately; the original supervisor accepts requested stop. Its wall/audio/metadata/stderr/disk limits are unchanged.
- Final verification checks report-declared action/resource/epoch byte counts and SHA256 against actual raw logs and verifies the audio capture hash. It also verifies all 62 first-round and 51 diagnostic frozen evidence file hashes.

## Exact Checks, Pins And Commit

Focused final verification, exit `0`:
```bash
/usr/bin/python3 /tmp/alive-workspaces-clip-navigation-fix1/verify_final.py
```

The retained script proves the helper is the only changed input across 409 entries, current input hashes equal the post-run hashes, Python helper syntax parses, committed helper bytes equal tested bytes, the commit changes only the helper, the staged index is empty, and report/log/capture integrity and prior evidence hashes match. `git diff --check` also exits 0 before and after the native run. No new tests mirror the label condition and no broad suites run.

Source commit commands, each exit `0`:
```bash
git add -- apps/ultra/tests/alive_workspace_navigation.py
git diff --cached --stat
git commit -m "test: reveal audio settings before native pointer actions"
```

Pins match before/after and actual `/proc` mappings during the original run:

- Alive release executable SHA256: `bac50bb1af01c2d15d985d0cf345f21a1efcd6a0be450f0b77870df4356c3260`.
- Adjacent release libultra_native.so SHA256: `4c54e3e0a2e7bf2007a56620d1006658e97b86d5f8828e08f13e9ffd3a1e9e70`.
- Tested/committed helper SHA256: `7d1a36062b631ce02af66244fd012b904b33a56ad29b295d99ea8cfc8ec41603`.
- Original observability script SHA256: `44041372e55f2001947c83e2928041e4b48066f6433aa4895606d69e347d37ab`.
- Original clip script SHA256: `cbd3c7156358ad8283229c105eea64d6065bb98960f144f33c99c754109c51f7`.
- Original wrapper SHA256: `e75bbd94e63ad4fc28476098e2b7bc1f8918c04706c709e7876fd8b47c2df574`.
- Original measurement/recorder SHA256: `e9318ebd9123e681e851a54cd47a14eaf98afa39c1e42d5dc833d4797d53d9cd`.
- All source/fixture Git blob+SHA256 and binary hashes are retained in before-input-sha256.json; pre-run/post-run manifests prove only helper changed and no input changed during the run. Binary hashes establish artifact identity, not an independently proven binary build source commit.

Original result hashes:

- `observability-report.json`: `ed9d207519df16b7a29b8be3ce9bd62907b12d86d8bd5acdc527aede3e3e2176`.
- `native-clips-report.json`: `d259c638e730334dbde1e5695083c88f8de480547f4314d6611791fc731c62b9`.
- Resources: `ac2c0326e87c945f79137ddfc99548f9430f2eaab1d5aeddd8634ee0f8080572` (416633 bytes).
- Epochs: `69298f9e7a1d9af11f736f931d35aa48958c767baf6f5af0dc6b5806ba3b0c1a` (193079 bytes).
- Actions: `662500a27310b3abb38632d35eb0bcce2062cb766593e70c66093f81a35b4ea7` (5842 bytes).

## Frozen Handoff And Limits

Evidence root: `/tmp/alive-workspaces-clip-navigation-fix1`. It retains exact command/exits/UTC, original.log and every original report, capture, screenshot, stream/error/measurement/input/action/session/device artifact under original/, before/pre-run/post-run hashes, actual running-native.json executable/library mappings, fix.diff, verification scripts/results, initial/final status and freeze.json. evidence-sha256.json covers raw evidence files except itself.

Source/index frozen at `2026-10-26T05:42:21.432148+00:00`, exact HEAD `3522e31f36aba4f06afd853cf805b6e065a7a138`; staged index empty. No further source edits or index operations after this freeze. Parent PLAN/docs/experiments changes are preserved and never staged. No push, app rebuild, permanent settings edit, product change, subagent or user-desktop launch. Original tests exercise only their existing temporary private-session audio settings.

This establishes one full original native GREEN on the pinned release app/library with private software audio. It does not explain the earlier intermittent stopped-launch failure, establish final-head CI, or claim physical audio, ordinary-desktop behavior, production-v4 or endurance. Independent scoped re-review and final-head CI remain separate parent steps.
