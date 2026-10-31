# Alive Arrangement And Session Workspaces

Authority: the current user goal and PR #6 comment 6383966857. The October 24
exclusion of Arrangement and the testing pause are superseded by this explicit
resumption. Existing runtime evidence remains historical, not acceptance of the
new interface. Continue the existing isolated feature branch and draft PR.

## Product And Interaction

Alive opens into a working musical surface. Arrangement has horizontal track
lanes, a bar/beat ruler, a native-clock playhead, a loop brace, and zoom/pan.
Session has track columns, vertically stacked slots, scenes aligned on the
right, and mixer strips below the corresponding columns. Eight tracks fit by
intentional horizontal/vertical scrolling, without scrolling the whole app.
Keep original compact charcoal controls and readable small type. Track colors,
names and stable identities agree across both views.

A compact top transport, collapsible left browser, and resizable bottom detail
area surround the workspaces. Detail selects Clip or Devices independently of
the workspace. MIDI selection opens the existing piano roll; audio selection
opens a waveform derived from decoded samples and audio details. Numerical note
tables, diagnostics and structural controls remain reachable in inspectors.

Plain Tab outside editable/interactive controls toggles views; visible view
buttons do the same. Inside controls, Tab/Shift+Tab retain normal navigation.
View changes perform no backend mutation, transport command, preparation, clip
launch, selection replacement, history reset or editor lifecycle action. Keep
in-progress gestures and focus predictable; Escape cancels gestures.

## Shared Project And Distinct Playback

One saved project owns tracks, mixer and independent Ultra instances. Session
slots and Arrangement placements are separate collections. A placement has a
stable ID, track/source identity, start, duration, source offset and loop flag.
Nonoverlapping placements per track are the initial admitted policy; reject
overlap visibly. Duplicating a placement preserves source identity but receives
a new occurrence identity. MIDI note/source editing has a stated scope, with
independent copies available rather than accidental aliasing.

Arrangement follows global song time. Launching a Session clip/Stop overrides
only that track at the existing quantized boundary; override persists until an
explicit per-track/global Back to Arrangement operation. Returning reconstructs
the Arrangement state at the current song position. Tab never changes this
authority. Show pending and applied authority explicitly. Preserve reserved
global Stop and receipt semantics.

Support genuine imported WAV audio with mono/stereo channel descriptors.
Decode, validate, fingerprint and prepare bounded immutable audio off callback.
Publish waveform min/max data from that same decoded source; no invented
waveforms or silent audio-to-instrument conversion. Playback uses the common
frame clock and shared Ultra audio effects, then the track mixer. State the
supported PCM/rates, resampling policy, duration/memory bounds and rejected
formats. Recording, warping, time stretching and physical MIDI remain excluded.

Add strict versioned persistence rather than weakening v1/v2/v3 validation.
Existing files still open with their original supported behavior. Missing or
changed sources reject transactionally with actionable context. Save/reopen
preserves placements, offsets/looping, slots, source identities, automation,
chains and mixer; runtime authority/selection are not disguised as saved clips.

## Runtime And Verification

Reuse the native Faust evaluator, root ownership and one authoritative audio
frame clock. Do not launch a full Ultra app per track, duplicate DSP, move AOT
kernels into Clockwork, or depend on synchronous UI scheduling. Bound tracks,
roots, placements, audio memory, events, queues and per-callback work. Prepare,
load and destroy outside callbacks. Preserve existing admission refusals,
allocation/free/lock guards, pending history, scoped Stop, Quit and notices.
Any new runtime policy needs explicit tests and measurement, not inherited v3
timing claims.

Prove placement timing, source offsets, repeated sources, gaps, overlap refusal,
seek/loop/Stop and every ownership handoff under arbitrary supported buffer
partitions. Prove audio samples and effects using known input PCM, including
mono/stereo mapping, instance isolation and state reset. DOM/browser tests prove
layout, focus, view-only navigation, edits/undo and persistence interactions.
Actual native app evidence proves the same mixed MIDI/audio project in both
views, repeated switches during playback, editors, save/Quit/reopen and sound.
Capture Arrangement/Session at 1440x900 and 1280x800 plus an interaction recording.
Use generated original example audio and reusable saved Ultra files in packages.

Final qualification includes affected/full regression suites, new runtime
measurement and the outstanding playback/endurance gates on the resulting
interface, exact pushed-commit CI and packages. Preserve failures and report
software-loopback/physical limits honestly. No merges, tags, publishing,
deployment, credential changes or new cloud coding sessions.

## Reference Evidence

Official Live 12 Arrangement, Session and Live Concepts pages linked by the PR
were read on 2026-10-26. They describe independent clip collections, per-track
Session override until Back to Arrangement, Tab navigation, aligned scene rows
and shared detail panels. They guide interaction, not implementation code.
Existing installed Live 12.4.6/Wine 11.13 observations and REA evidence are in
`experiments/alive-workflow-reference-20261024/`; reuse them. Any additional
captures stay private, use disposable sets and preserve original preferences.
No Ableton code, fonts, icons or media ship in Alive.
