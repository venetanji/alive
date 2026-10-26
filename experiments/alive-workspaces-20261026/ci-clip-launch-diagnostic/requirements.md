# Isolate The Original Clip Journey's Stopped Launch Failure

Resume the existing clip-navigation task as an explicit diagnostic follow-up.
The narrow helper correction is independently approved at `729dc9a`, but full
task acceptance is incomplete. No full original GREEN is claimed. Parent may
curate/commit docs/evidence and push that reviewed draft checkpoint while you
work; application, native and harness sources remain pinned and frozen.

Read `ci-clip-navigation-report.md` and `ci-clip-navigation-review.md` beside
this brief. Retain the first RED and corrected failing run, without overwriting
their logs. Actual input targets Launch Pulse Clip 1, but the unchanged
`check_alive_clips.py:103` still observes `Cued Clip 1 copy`. This failure occurs
after the audio-settings stop/restart sequence and before recording. The first
run does not retain Session status or raw receipts, so pointer activation,
native request submission, receipt handling and label projection remain
distinct possible causes. Do not assume a harmless timing failure.

## Scope

Read-only production/test/index/HEAD work. No permanent source edits, app
rebuild, settings-file changes, subagents, pushes, launches on the user's
desktop, retry or assertion relaxation. Reuse the pinned release Alive and
adjacent native library from the original brief. All experiments use private
display/audio through the existing wrapper. Existing original journey actions,
order, sleeps, predicates, recorder/resource bounds and failure must survive.

Use systematic debugging. Create a temporary diagnostic driver under
`/tmp/alive-workspaces-clip-launch-diagnostic` that delegates the original
journey and records bounded extra observations around its one original
stopped Launch and on failure: all available clip-runtime, Session status,
transport/absolute-frame/generation/rejection/stream fields, relevant visible
accessibility nodes/state/geometry, native focus and hit ownership, screenshots,
input event counts and app/server logs. Record actual raw receipt fields only
if already observable through an existing interface; lack of access is an
explicit limitation, not permission to invent a value or add a product hook.
Observation queries must not switch panels, select/launch a clip, commit an
edit or retry a gesture. Record their overhead and explain which evidence is
before versus after the original gesture.

One diagnostic run of the original journey is meaningful because the retained
failure lacks those facts. This is not a rerun merely to see whether it passes.
If the run passes, retain it without calling the original cause fixed, and do
not keep rerunning until a preferred result appears. If it fails, isolate the
cause with the smallest bounded native probe that retains the relevant
audio-settings/launch ordering. A separately labeled targeted keyboard-versus-
pointer comparison is allowed as a diagnostic intervention, never as a silent
replacement for the original journey's pointer action or as full GREEN.

Prove a proposed harness or product fix with a reproducible failure and exact
causal evidence. Do not implement it in this phase; report the narrow source
change/reproduction needed to the parent. If the cause remains uncertain,
record what each observation rules in/out and the one next discriminating
experiment. Keep this investigation bounded; no broad suite or architecture
expansion.

## Evidence And Handoff

Retain exact commands, UTC/monotonic boundaries, exits, input/source/binary
hashes and actual process mappings in the new temporary evidence directory.
Verify original source and binaries remain unchanged. Write
`ci-clip-launch-diagnostic-report.md` beside this brief. Return concise status,
confirmed facts/root cause if established, and the narrow next step. Do not
claim production-v4, physical audio, full qualification or endurance.
