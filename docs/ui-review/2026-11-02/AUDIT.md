# PR 12 continuation audit - 2 November 2026

Audited source: `11da097c27627a92629632ab62304d799e50099c`.
PR: https://github.com/venetanji/alive/pull/12 (open, draft, same head).
Work branch: `audit/pr12-native-20261102`.
Worktree: `/tmp/alive-pr12-native-20261102`.

The starting worktree is on `research/runtime-foundations-probes` at
`1f3439d87af9c6c54c37b0ef2471cabc21619e13`. Its six modified list-runtime
results and untracked research/build artifacts are unrelated and are preserved.
The existing `feat/alive-clip-view-live` worktree is clean at `6478e29`, behind
the requested PR. No checkout, reset, stash, merge, or application settings
change was performed in either existing worktree.

## Authority and boundaries

Read the 31 October implementation brief, implementation plan, M1a capability
map, original HTML study, reference action inventory, UI handoff and current
`apps/alive/SESSION_CONTRACT.md`. The M1a map describes an older checkpoint;
its exclusive Clip/Device wording is superseded by the independent footer
toggles in the current brief and source. The HTML includes simulated recording,
meters, presets, sends and expanded devices; these are design references.
The inventory's 20 supported equivalents, five unavailable and 115 unverified
rows are historical assessments, not a current command implementation count.

Retain compact controls, independent footer Clip/Devices, full-width Clip over
Help-left/Devices-right, pinned mixers, synchronized clip-only vertical scroll,
horizontal tracks, hover-only width brackets and narrow-track reflow. Do not
copy accumulated prototype CSS. Shared Ultra surfaces and native admission,
identity, acknowledgement, history and retirement rules remain authoritative.

## Native acceptance finding

CI https://github.com/venetanji/alive/actions/runs/41274569028 ran this head.
UI/protocol and Chromium jobs passed. Native build/adapter/Rust, desktop with
hosted editor and tooltip reorder, and Master save/Quit/restart passed.
Arrangement failed. Clip observation, saved clips/stream measurements, editor
resource bounds and CPAL software loopback were skipped. Sustained endurance
was not selected. None of these skipped stages establishes a pass.

The retained Stop evidence records one press/release on the correct accessible
`Stop Pulse track`, followed by `Session silence` and an applied native receipt.
That earlier issue is closed at the audited head.

The saved Arrangement contains Pulse placements at [0,8), [9.5,12), and
[12.5,15). The first gap is **[8,9.5) beats**, only about 0.804 seconds at
112 BPM. Global quantization is **1 Bar** and the song loop is [2,16).
The journey seeks to **4.1**, navigates, clicks Return, waits for a pending
label, navigates twice, waits for authority and only then reads active source.
Its failure screenshot shows position about 7.75 beats and the original [0,8)
placement active. The footer still has an earlier queued status string.

This does not establish an engine defect: request/receipt and position were
not captured together. Quantization outside the gap and an observation that
missed the gap remain hypotheses; wrong dispatch and wrong native source must
also be excluded. Keep the null-source expectation **inside a proven gap**.
Capture actual action, serial, preparation revision, captured quantization,
target absolute frame, receipt/member masks, native absolute frame and song
position, authority, source/slot/placement, and placement/gap boundaries from
the same native snapshot. Record sampling intervals and missing observations.
An engine change requires a separate explanation and bounded regression first.

### Instrumented local findings

Diagnostic commit `6e277a92728816d010ec5577663a2471df7972c5` is on the
separate audit branch. Manual CI:
https://github.com/venetanji/alive/actions/runs/41367960025.
PR 12 remains at the audited head. UI/protocol, Chromium, native adapter/release
Rust, headless rendering and Master passed. The desktop journey failed at Redo
(Note 1 pitch remained 60); Arrangement failed later at the Cutoff inspector.
The original 41274569028 desktop pass remains separate. Downstream clip/resource/loopback steps
were skipped again, not passed. Release Rust: 298 passes, four ignored.

An exact local rebuild passed startup and produced coherent native observations.
The original sequential authored-placement/source check failed before Return,
although native snapshots consistently paired the authored placement and source
inside its range. An initial test-only coherent observer passed that boundary.
The subsequent run retained the original Return sequence and exposed a more
serious false-pass path:

- The intended `seek(4.1)` dispatched **Scene slot index 2** instead of Seek.
  No native Seek(4.1) request exists in that trace. The native Scene request is
  serial 6 and can change both tracks; an unverified UI coordinate is insufficient.
- Actual Return is the correct action for `track-1`, generation 1, preparation
  revision 1, serial 7, with captured `bar1` quantization.
- Pending snapshot 1978: absolute frame 4302848, position 362953 (14.114839
  beats), pending target 4351324. Pulse remains Session silence; Harmony is also
  Session silence after the unintended empty Scene.
- Target 4351324 maps to song-loop end 411429, then wraps to loop start 51429
  (beat 2), **outside every Pulse gap**.
- First applied snapshot 1988: absolute 4353536, position 53641 (2.086039
  beats), applied mask 1, Arrangement authority and the original [0,8) source
  and placement. That source is correct at this position.
- Only later, at snapshot 2016 (absolute 4510208, position 210313, beat
  8.178839), does the source become null in [205714,244286), the [8,9.5) gap.
  The old journey reported a Return-in-gap pass from late UI observations.
  This does not qualify Return applying inside a gap.

Full request, queued receipt, pending/applied snapshots, compiled placements,
gap bounds and a later gap observation are retained in
[`evidence/local-return-outside-gap.json`](evidence/local-return-outside-gap.json),
including actual executable/library identities. The run later failed at missing
`Cutoff point 1 value`; it is not a complete Arrangement pass.

The bounded correction is in the acceptance driver: require the actual Seek
payload/receipt, use owned accessible-hit verification for Seek and Return,
close transport options, prepare navigation before an early native bar, and
correlate the pending/applied Return with its **own** compiled gap occurrence.
Wrong dispatch, an out-of-gap target, missed sampling and a non-null source
inside a proved gap are distinct failures. A later loop cannot rescue the test.
The null-source/placement/slot expectation and sibling Session source remain
strict. No native engine behavior or production UI command is changed.

Ten observer regressions pass after their red/green checks; full helper
discovery now passes **141 tests**. The retained real false-pass trace is also
rejected by the new observer as an out-of-gap target. The corrected native
journey now passes locally; downstream acceptance is being rerun separately.

The instrumented CI independently reproduced Scene slot index 2 instead of
Seek(4.1). Its Return serial 7 targeted absolute frame **2959058**, song position
**308571** (beat 12), inside the compiled gap **[308571,321429)** ([12,12.5)).
Pending snapshot 1328 and first applied snapshot 1348 establish the native
result together: applied absolute 2961920, position 311433 (12.111283 beats),
Arrangement authority and null active source/placement/slot. The native engine
behaves correctly in that sampled gap. Harmony had already been silenced by
the unintended Scene, so the intended sibling-playing case still needs rerun.
See [`evidence/ci-return-short-gap.json`](evidence/ci-return-short-gap.json).
The original uninstrumented CI remains insufficient to reconstruct its exact
Return target; do not retroactively assign it a target from another run.

The corrected local input guard then blocked Seek before pressing anything:
its accessible rectangle was [1387,136,32,22], but accessible hit testing found
`Launch scene 3`. The screenshot shows **Master painting over the open
Transport & View popup** in Session. Session's sticky `.scene-column` has
z-index 10 while the transport's enclosing stacking context has z-index 8;
the popup's own z-index cannot escape that parent.

The production correction adds `isolation:isolate` to the existing
`#workspace-shell` rule in `alive-shell.css`. Workspace children keep their
internal ordering, including pinned Master above tracks, within the workspace
stacking context. Shell popups paint above them. No dimensions, approved control
layout, command handlers or native scheduling change.

Three browser regressions failed first with actual `Launch scene 3` hits at
800x600, 1280x800 and 1440x900. All three pass after the single property change;
six focused browser checks pass together, including Stop, drafts and Arrangement
Master geometry. The new tests repeat workspace/popup toggles, verify exact Seek
dispatch, resize/restore, unfinished fields and keyboard focus. Captures were
inspected at all three sizes. Full Chromium passes **316 tests** (9.1 minutes),
including shared Ultra. Fresh Node tests pass **668**, with zero failures/skips.
Full Python helper discovery passes **141**. Logs:
`/tmp/alive-pr12-browser-return.log`, `/tmp/alive-pr12-node-return.log` and
`/tmp/alive-pr12-helpers-return.log`.

### Corrected local Arrangement acceptance

The full native MIDI Arrangement journey passed using rebuilt Alive/Ultra and
the unchanged native library. Seek(4.1) dispatched correctly, with no unintended
Scene request. Return serial 7 targeted absolute frame **3364349**, song frame
**205714** (beat 8), inside the original compiled gap **[205714,244286)**.
Applied snapshot **1591** has absolute frame **3366400**, position **207765**
(about 8.080 beats), Arrangement authority and null source/placement/slot.
Harmony retains its original playing Session source. The pending/applied
records, exact binary identities and source hashes are retained in
[`evidence/local-return-first-gap.json`](evidence/local-return-first-gap.json).

Loop wrap, track gain, automation value 1781, hosted editor value 1777,
close/reopen, exact saved-document equality and process restart replay passed.
The private software-only PipeWire graph used 48 kHz / 512 frames. Playback and
reopened captures contain 6,636,032 and 705,536 frames, respectively, both with
peak 0.16578409. Rejected commands and stream errors are zero; Audio failed is
false. This is software qualification, not physical hardware qualification.

Native captures were inspected at
[800x600](captures/native-arrangement-800x600.png),
[1280x800](captures/native-arrangement-1280x800.png) and
[1440x900](captures/native-arrangement-1440x900.png).
Full local logs/artifacts: `/tmp/alive-pr12-arrangement-popup-fixed.log` and
`/tmp/alive-pr12-arrangement-popup-fixed/`.

Reviewed popup captures (browser fixture dispatch/geometry, no native success
simulation): [800x600](captures/transport-popup-800x600.png),
[1280x800](captures/transport-popup-1280x800.png),
[1440x900](captures/transport-popup-1440x900.png).
The native defect capture is
[Seek blocked before the fix](captures/native-seek-blocked-before-fix.png).

### Downstream local software checks

The previously skipped gates are now executed locally against the matching
native library; these are separate from the original CI's skipped results.

- Clip observation: all four modes pass (normal, failed receipt write, blocked
  input plus failed write, native input exception). The real native tooltip must
  cover the target before one owned disclosure click is attempted. The approved
  pinned-mixer layout needs an explicit 800x600 window for this precondition;
  restore 1280x800 before the musical journey. Blocked/input-failure paths make
  no document edit, so Quit correctly exits without an unsaved dialog. Normal
  and write-error paths still require Discard after actual edits.
- Saved clips and bounded measurements: complete pass, including independent
  source/occurrence identities, Undo/Redo, regions, persistence/reopen, editor
  continuity, shared-source replacement refusal and recovery. Six completed
  stream epochs, 7.324 seconds of proven playback, no sampling errors; wall time
  214.754 seconds. Each of three cycles proves base while stopped, automation
  while playing, then base after Stop. This follows SESSION_CONTRACT.md; the
  old extension incorrectly expected automation after Stop. Audio settings are
  saved only after explicitly stopping the private software Audio stream.
- Hosted editor resources: eight close/reopen cycles plus 25-second idle pass
  the unchanged bounds. First closed editor vs final idle: one WebKit worker
  each, 127 file descriptors each, PSS 422419 vs 424382 KiB. This is a bounded
  short-run resource check, not endurance or exhaustive process coverage.
- CPAL private software loopback: pass; 48000 Hz, stereo finite PCM, 152576
  captured frames, per-channel peak 0.13779527. The Rust probe passes exactly
  one ignored test, with observed callback size 512, no stream/native errors,
  and successful stop/start and saved configuration reload.
- Matching-library release Rust: **298 passed, 0 failed, 4 ignored**. An earlier
  run failed 20 configuration-header checks because Cargo's runtime path found
  an inherited release-library symlink into the older UI worktree. The private
  cache link was replaced with the same library used by the passing desktop
  binaries; the other worktree and its library were not modified. The original
  source also reproduced the header error with the stale link. No native source
  or ABI change was needed. Retain `/tmp/alive-pr12-rust-release-final.log`,
  `/tmp/alive-pr12-rust-release-baseline.log` and the corrected
  `/tmp/alive-pr12-rust-release-matched.log`.
- Latest Python helper discovery: **142 passed** after a red/green diagnostic
  navigation regression. One intervening 141-test run observed an empty helper
  PID file during recorder setup; its ten-test focused rerun and subsequent
  full discovery pass. The unrelated recorder fixture was not changed.

The latest complete local desktop journey passes through save/reopen, device
removal and Quit. Opt-in `ALIVE_HISTORY` request/result/snapshot tracing records
all three expected requests and matching native pitches 60, 61 and 61, with
APPLIED publications, no pending publication and corresponding history state.
See `evidence/local-history-trace.json` and `evidence/local-desktop.json`.
Earlier local input runs failed intermittently (Redo retained 60; a later Undo
retained 62), including one guarded-click run. Their precise dispatch cannot be
reconstructed without tracing; do not label an engine defect or claim that
intermittency is fully explained. The current helpers verify native ownership,
allow edit completion, and retain request/result evidence for any recurrence.
A late missing diagnostic disclosure also has a red/green navigation regression
using the existing owned input helper.

Current manual CI on `2a599bc` has passed desktop, Arrangement, UI, Chromium and
release Rust; Master and downstream results are still pending. Final helper
changes require a new exact commit and manual CI run. This diagnostic binary
pair has Alive SHA256 `38d542bc17e7e99ffbc310f4dfd662b51869d04d2ef05a0201da81b2631146cd`
and Ultra `e50bc9efe1d0d0238c4c4e701a244588a072f57a0ce2636f43fc6ffc7982d898`;
the native library remains `1652d52c581395a9919ea2dbe5a03c4d365c7f9a4da6d10cff233e590099eaa8`.
Fresh release Rust including the history diagnostic passes 298, with four
ignored. Hardware and sustained endurance remain unrun. The separate proposed
hardware checklist is `HARDWARE-CHECKLIST.md`; executing it requires agreement
on device/settings actions and restoration.

Selected reports are retained under `evidence/clip-observation-*.json`,
`evidence/local-clips.json`, `evidence/local-measurements.json`,
`evidence/local-editor-resources.json`, `evidence/local-cpal-probe.log` and
`evidence/local-cpal-capture.json`. Full logs/artifacts retain their matching
`/tmp/alive-pr12-*` directories.

Impeccable's mechanical check reports only pre-existing type/color advisories
in this stylesheet; the changed property adds none. Its design sidecar is stale
relative to `DESIGN.md`. Optional metadata refresh remains outside this batch.

## Capability map

Classes: W = already wired; E = existing capability needing another UI entry;
F = frontend work; N = missing native/provider contract; U = unresolved product
semantics. `CAPABILITIES.json` assesses each of the 140 captured menu rows and
the additional approved control families separately, with owner, prerequisite,
disabled reason, failure policy and test obligations. Classification is a
source audit; availability is still contextual and native evidence is separate.

| Controls | Class | Existing owner / required work | Preconditions and failure behavior | Tests |
| --- | --- | --- | --- | --- |
| New/Open/Save/Save As/Quit | W | `alive.mjs:file`, native `alive_file` | Existing unfinished-input and unsaved-project handling; failed Open/Save retains project | DOM, browser file actions; native Master restart |
| Play/Stop/seek/song loop, quantization, scenes, launch/track Stop/Return | W | `transport`, `clipAction`, `launchScene`; runtime workspace owner | Generation/preparation identity, captured targets and member receipts; no estimated or retried success | DOM/timeline, native Arrangement gate still open |
| Track gain/mute/solo and Master gain/meters/reset | W | `mix`, `alive-master.mjs`, native mixer/Master | Native accepted values; overload is digital; MIDI-only track has no audio meter | Master producer/DOM/browser; native Master passed in recorded CI |
| Notes/velocity/automation, source length/tempo, markers, placements | W | `workspaceEdit`, `setRegion`, `placementEdit`, native publication/history | Source and occurrence IDs; pure validation, APPLIED/retirement before document/history commit | Model/clip/timeline/DOM/browser and Rust/native tests |
| Device load/replace/order/remove/bypass/parameters/Ultra editor; qualified Browser loads | W | `structural`, `loadBrowserEntry`, `openDevice`, browser/drop owners | Device structure requires stopped transport; qualified metadata and resource bounds; preserve drafts and instance ownership on refusal | Browser/drop/rack/DOM/shared surfaces; native desktop |
| Clip/Devices/Help/Browser visibility, widths, detail resize/maximize/restore | W | `alive-workspace.mjs`, `alive-info.mjs` | Local presentation; preserve drafts and selection; no musical IPC | Commands/info/DOM/browser geometry at three required sizes |
| Undo/Redo shortcuts | E | Existing `history()` and buttons; add registry chords | Existing menu/buttons work; global chords absent, piano/velocity already own Ctrl/Cmd+Z and Shift+Z. Honor editable/modal/defaultPrevented/repeat; one native history call | Failing shortcut ownership and rejected/pending/stale history regressions; adjacent browser drafts |
| Create MIDI Clip menu | E + F | Reuse contextual handler currently in document keydown | Current Arrangement detection uses event target ancestry; a menu click loses that ancestry. Resolve active workspace, selected track/range or empty Session slot explicitly. Never overwrite occupied/audio slots | Both workspaces, menu focus, empty/occupied/audio, stale selection and rejected publication |
| Duplicate/Delete Session slot | E | `slotDuplicate`, `slotDelete` through existing handlers | Capture track/slot/source; duplicate requires an explicit empty destination on same track; delete slot does not delete shared source | Occupied/no-empty destination, shared source identity, rejection, Undo/Redo |
| Duplicate/Delete Arrangement placement | E | Existing timeline handlers, `placementError` | Capture placement/source; duplicate start must satisfy song bounds and non-overlap; delete occurrence only | Invalid range/overlap, same-source siblings, stale target, native acknowledgement |
| Rename slot / source | E | `workspaceSlotEdit`, `sourceRename`, existing fields | Label the target scope. Slot rename is independent; source rename affects all references. Placement has no independent name field | Draft parking/caret, sibling identity, cancellation, stale/rejected rename |
| Make Independent | E | `sourceIndependent` for slot or placement occurrence | Requires explicit occurrence identity; creates a new source for that reference. Source-only selection is insufficient | Slot vs placement, same-source siblings, history/resource refusal |
| General Cut/Copy/Paste, time edits, generic source/track Duplicate/Delete | U | Product/selection and clipboard owners must be defined | Contextual occurrence handlers do not establish a general clipboard or time-edit contract. SourceDelete exists natively but must not be substituted for slot/placement delete | Contract cases before enabling |
| Import WAV menu | E | `importAudio`, existing native picker/preparation | Empty audio slot only; WAV/PCM/session bounds, cancel and changed-session protection | Audio fixtures, picker cancel, occupied/stale target, resource refusal |
| Loop Selection menu | E + F | `loopClipSelection` or timeline loop selection | Select owner by active editing context, not menu focus; clip occurrence loop vs song loop; no implicit loop deactivation semantics | MIDI/audio/Arrangement, missing range, drafts and rejection |
| Zoom/Fit menu | E | Clip viewport navigation or timeline buttons | Local viewport only, correct selected editor; no commit on focus/blur | Existing viewport tests plus menu target and no musical IPC |
| MIDI note Preview menu | E | Existing `alive-midi-preview.mjs` and clip Preview toggle | Native capability/selected instrument; off initially; explicit audition may start Audio; release on cancellation/focus/lifecycle | Preview unit/DOM/browser; refusal/work budget and release |
| Edit selected device menu | E | `openDevice` and existing selected-device button | Capture instance/session; missing selection disabled; preserve same-source per-instance binding and editor lifetime | Rack/hosted editor ownership; stale target/refusal |
| Focus Clip/Devices/Browser search | F | Workspace open methods + explicit focus destination | Ensure visible without toggling closed; preserve drafts/selection, repeated invocation idempotent; Escape/modal/editable/OS conflicts | Keyboard/menu focus, hidden/already-open states, all panel combinations |
| Maximize/restore menu | E | Existing `maximize-detail` | Reuse existing requested height and resize restore behavior; optional after focus work | Repeated toggle/resize/restore, compact window |
| Browser full-height / supported mixer section visibility | F | Local layout ownership, after existing geometry reviewed | Presentation only; do not reveal unavailable routing, sends or return controls as functional | Three-size panel/scroll/focus matrix |
| Preset tree + atomic application | N | Catalog + manifest + native device application/history contract | Need stable IDs, compatibility/versioning, complete values and one acknowledged transaction; no partial preset success | Missing/incompatible/stale preset, bound values, rollback/Undo, limits |
| Tags/filtering | N | Catalog metadata schema and Browser query owner | Stable tag identity, provider coverage, query pagination/cancellation/errors; no invented results | Qualified/missing entries, filter combinations, preserved search/selection |
| Browser audio preview | N | Separate provider/decoder/preview lifecycle contract | Not MIDI note Preview. Define routing, gain, admission, lifetime, cancellation and observation | Missing/unsupported file, stop/replace/reconnect, resource/error bounds |
| Device-specific expanded editor | N | Manifest capability + per-instance presentation ownership | Need supported schema/bindings/resources/lifecycle; rack height is not an expanded editor contract | Unsupported device, instance switch, stale gesture, close/reopen/shared Ultra |
| Pan, return tracks/sends, crossfader, track delay/latency | N | Mixer schema, DSP/routing graph and persistence/history owner | Current mixer only gain/mute/solo. Define stereo pan law and bounds, route IDs/cycles, bus/send limits, atomic acknowledgements and errors | Save/reopen, Undo, rejected/stale routing, DSP/resource/meter proofs |
| Input routing, monitor, arm, capture/record/overdub/punch | N | Native I/O/capture lifecycle, file ownership and recording model | Device permission/settings approval, format/buffer/storage limits, durable finalization, cancellation/recovery and observed errors | Actual capture/lifecycle tests only after implemented; safe hardware plan later |
| MIDI activity dots / mono output / performance impact | N | Explicit native observations | No inferred MIDI activity from audio peaks; input WAV channel count does not establish mono output | Typed unavailable/stale observations, correct track type |
| Phase nudge/Link/sync/metronome/time signatures/external MIDI | N | Transport/MIDI and scheduling contracts | No renderer timer scheduling; define target, bounds, persistence, receipts and Undo first | Timing/seek/loop/Stop and work-admission regressions |
| Multichannel intent | U | Product decision, then mixer/routing contracts | Clarify multiple tracks vs wider speaker layouts, channel counts, route formats, metering and export before implementing | Contract-dependent |
| Other captured Live-only actions | U or N | Per-row assessment in JSON | Captured enabled/disabled states do not establish Alive support or desired semantics | Keep unavailable until scoped and verified |

## Verification record

Fresh checks at the audited head before diagnostics:

- Node UI/controller/components: **668 passed, 0 failed, 0 skipped**.
- Python desktop/measurement helper discovery: **131 passed**.
- Chromium: **313 passed in 12 files**, sandbox enabled, including shared Ultra.
  Inspected actual both-panel captures at 800x600, 1280x800 and 1440x900.
- Fresh unchanged native engine and instrumented Alive/Ultra debug builds: pass.
- Diagnostic gap-boundary regression: failed first with the missing helper,
  then passed; covers unsorted placements, all three gaps, exact adjacency,
  empty tracks and leading/trailing gaps using compiled frame coordinates.
- Local Rust debug suite: **296 passed, 1 failed, 4 ignored**. The existing
  `audio::instrumentation::cpal_owned_error_destruction_is_separate_from_the_typed_action`
  expects one deallocation but observes zero. A focused rerun also fails. This
  is not the release-profile check used by CI; no audio change was made.
  The same focused failure was reproduced on untouched `11da097` source in a
  detached baseline worktree with local Rust 1.99.1.
- Local native journey: **failed prerequisite** in `check_document_startup.py`
  (`Both startup documents must retain healthy native graphs`). The actual
  Arrangement driver did not run, so no Return trace exists from this attempt.
  Private portal/a11y warnings are in the logs; their causal role is unproved.
- Downstream clip/resource/loopback and physical hardware: unrun locally.
  Historical CI results above remain separate.

Logs are under `/tmp/alive-pr12-*-baseline.log`; original CI artifacts are under
`/tmp/alive-pr12-evidence-41274569028`. Keep failures and diagnostic records.
No automatic workflow trigger, merge, release, deployment, hardware/settings
change, recording, or security relaxation is authorized by this audit.

Reviewed browser screenshots (fixture observations, not native audio evidence):
[800x600](captures/browser-both-800x600.png),
[1280x800](captures/browser-both-1280x800.png),
[1440x900](captures/browser-both-1440x900.png). Full test captures also include
panel toggle/restore, compact menus, track widths, keyboard/drafts and rejection
cases under `/tmp/alive-pr12-browser-baseline/`.

The diagnostic adds opt-in `ALIVE_TRACE_ARRANGEMENT=1` JSON records in the Rust
control owner, with the exact dispatched action, native receipt and coherent
polled snapshots plus compiled gap bounds. It does not change scheduling or
accepted state. The manual workflow enables it only for Arrangement. A manual
run on a separate audit branch is the next evidence source; PR 12 stays at the
audited head until a reviewed change is explicitly integrated.
