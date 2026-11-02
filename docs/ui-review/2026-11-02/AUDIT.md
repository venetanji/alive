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
