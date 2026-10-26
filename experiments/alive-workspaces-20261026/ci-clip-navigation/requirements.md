# Restore The Existing Clip/Observability Journey's Workspace Navigation

Source base will be pinned at dispatch after the CI timing review/fix loop.
Parent owns PLAN/docs/PR/evidence; you alone own targeted source/test/index.
No subagents, UI/runtime changes, app rebuild, settings, releases or pushes.
Use systematic debugging and TDD with the actual existing native journey.

## Observed Failure And Concrete Cause

Exact pushed `87cb416`, CI40271664266, passes the actual full desktop journey
in267seconds (05:07:13..05:11:40UTC) under the original300s limit. The following
saved-clips/stream/measurement step fails at05:12:15UTC:

```
check_alive_observability.py -> clips.run()
check_alive_clips.py:75 -> ui.click('Duplicate clip')
alive_workspace_navigation.py:56 -> click(name)
check_canvas_desktop.py:81 -> AssertionError: Missing native control: Duplicate clip
```

Downloaded artifact: `/tmp/alive-ci-87cb416-clips`. Read its
`missing-control.png`, `missing-control.json`, `observability-actions.jsonl`
and native input-event logs. CI attribution comes from exact-head run metadata;
these input logs do not contain binary hashes. Screenshot shows **Devices** detail active
after editing the selected utility. Clip is visibly available but not selected.
The accessibility tree contains Clip/Devices detail controls and device rows,
and lacks the hidden Duplicate clip control. The last action is Duplicate clip.

`apps/ultra/tests/alive_workspace_navigation.py` prepares Clip detail for notes,
automation and Add note, but omits the selected clip-control group. In
`apps/ultra/ui/alive.mjs:renderClipControls`, that group includes Enable clip bank,
Create clip, Clip name, Selected clip length, Duplicate destination, Duplicate
clip, Delete clip, Set Saved Default and Clear Saved Default. They live in the
Clip detail surface. The original old-form journey must navigate the new shell
before interacting, just as the existing helper already does for device and
note controls. This is a test navigation omission; do not change product layout
or synthesize a click on a hidden element to make the journey pass.

## Required Change And Verification

- Reproduce the failure with the unchanged actual observability/clip journey
  and pinned Session app before fixing, retaining RED command/exit/artifacts.
- Extend the existing navigation helper narrowly so actions/text editing for
  the complete selected-clip control group use the visible Clip detail surface.
  Preserve current device/note/automation/track/mixer/diagnostic routing and
  hosted editor scope guards. Use the established visible-button interaction;
  do not auto-launch, commit pending edits, switch clips/tracks or mutate model
  state merely to expose a control. Normal unfinished-field rules still apply.
- Keep every original clip/observability/history/editor/stream/measurement/
  receipt/Quit assertion, wait and recording/resource bound. No retries,
  weakened checks, removed actions or new application test hook.
- Run one complete original actual `check_alive_observability.py` journey
  through `check_canvas_desktop.sh` with private software PipeWire and the same
  pinned release executable/library. Retain GREEN original report, captures,
  error/measurement/stream/action metadata, exact command exits and hashes.
  This protects the first native gate previously skipped behind CI timeouts.
- No unrelated full suites or new tests that only mirror the label list. The
  actual native RED/GREEN is the meaningful regression. Python syntax and
  targeted assertion/diff preservation checks are appropriate. If the original
  journey exposes a distinct new failure, isolate/report it without weakening
  the assertion or silently expanding into unrelated production changes.

## Local Execution And Handoff

Use the existing environment, `ALIVE_SYSROOT` unset and system tools in
`/usr/bin`. The private wrapper defaults to the separate release Alive and
adjacent native library. Pinned Alive SHA256 is
`bac50bb1af01c2d15d985d0cf345f21a1efcd6a0be450f0b77870df4356c3260`, release
native `4c54e3e0a2e7bf2007a56620d1006658e97b86d5f8828e08f13e9ffd3a1e9e70`.
Development `apps/ultra/build` is not the launcher's native library.

```
env ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT=/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/tests/check_alive_observability.py \
  PYTHONUNBUFFERED=1 timeout --signal=TERM --kill-after=10s 480s \
  bash apps/ultra/tests/check_canvas_desktop.sh OUTPUT
```

Retain evidence under `/tmp/alive-workspaces-clip-navigation`. Write
`.superpowers/sdd/alive-workspaces-20261026/ci-clip-navigation-report.md`,
commit targeted changes, explicitly freeze source/index, and return exact
commit/test exits/report path. Parent will inspect evidence and obtain one
independent scoped review before checkpoint push. No desktop/physical-audio,
production-v4 or endurance claim beyond what the actual artifact proves.
