# Native acceptance and command access continuation plan

Goal: finish software-native acceptance before adding small UI command entries.
Source and acceptance constraints: `AUDIT.md`, the 31 October implementation
brief and `apps/alive/SESSION_CONTRACT.md`. This is a bounded continuation plan;
later native/provider features require their own contracts and approval.

## A. Return-gap investigation and software-native acceptance

- [x] Verify PR/head, preserve dirty work, read required design/contracts, fetch
  recorded CI artifacts and establish actual frontend/helper baseline.
- [x] Add opt-in diagnostic records at the existing Rust control boundary,
  outside the callback. Capture actual Return input/result and one native poll's
  state/receipts with generation, preparation, tempo/loop and placement bounds.
  Keep runtime behavior and the null-source-in-gap assertion unchanged.
  Files: `apps/ultra/src-tauri/src/session/desktop.rs`,
  `apps/ultra/src-tauri/src/session/runtime_workspaces.rs`, native journey helper.
- [x] Build exact checkout binaries with matching unchanged native sources in an
  isolated build directory; record source diff and binary/library identities.
  Run the existing private X/DBus/PipeWire Arrangement journey with tracing.
- [x] Classify each Return: wrong UI target/action; quantized target outside gap;
  target inside gap but sampling missed it; native mismatch inside a proved gap;
  or insufficient evidence. Match both serial and preparation revision; use
  native absolute frame and musical position, half-open intervals, and song-loop
  mapping. Do not substitute a late source read for an apply-boundary observation.
  Local evidence proves an unintended Scene instead of Seek(4.1), a correct
  Return at loop end outside the gap, and a misleading late-gap UI pass.
  Instrumented CI confirms correct native Return inside the short second gap;
  the original uninstrumented CI cannot establish its exact target.
- [x] If the harness misses the gap, first add a failing regression for its
  timing/precondition logic. Make the native journey establish a usable window
  and observe the actual target and applied state together. Retain an explicit
  failure/inconclusive result for a missed or out-of-gap target, and retain the
  original short-gap case as diagnostic evidence. Do not widen expected musical
  semantics or edit the engine to compensate for test navigation.
  Ten observer regressions now pass; the corrected owned-input journey passes
  locally through save/restart. Full helper discovery: 141 passes. Three red/green
  browser regressions prove the popup stacking fix at all required sizes.
- [x] If an inside-gap native mismatch is proved, report the concrete native
  contract violation and proposed engine change before implementation/expansion.
  No mismatch is proved; no engine change is indicated or made.
- [ ] Re-run Arrangement to its end, then native clip observation boundaries and
  failure isolation, saved clips/stream epochs/bounded measurements, eight-cycle
  editor resources and private CPAL software loopback. Repeat desktop/Master
  against the same binary identity. Preserve failed and skipped stages honestly.
- [ ] Run required native adapter/Rust checks for any changed boundary. Inspect
  current UI at 800x600, 1280x800 and 1440x900. Dispatch only the existing manual
  CI workflow against a reviewable exact commit; do not add automatic triggers.

## B. Small UI batches after A

Recommended first production batch: **Undo/Redo global shortcut access and
Create MIDI Clip menu access**, using existing owners. Do not combine generic
clipboard, time edits or new engine contracts into this batch.

Files: `apps/ultra/ui/alive-commands.mjs`, `alive.mjs`,
`alive-commands.test.mjs`, `alive-dom.test.mjs`, and
`apps/ultra/tests/ci/alive-chain.spec.mjs`.

1. Write failing shortcut regressions for Ctrl/Cmd+Z, Shift+Z and the selected
   Redo convention; prove one history request when piano/velocity already handle
   the event. Editable fields retain text Undo. Repeats, modals, prevented events
   and browser-preview command chords remain owned by their existing contexts.
2. Write failing menu regressions for MIDI clip creation in the current active
   workspace, including menu focus outside Arrangement. Extract the current
   contextual key handler once; use it from shortcut and menu. Session needs an
   empty MIDI slot; Arrangement needs a MIDI track and valid range. Capture
   stable identities, retain publication acknowledgement/rejection/history.
3. Implement only these entries. Run focused Node/browser cases, full UI Node
   and browser suites including shared Ultra consumers. Verify native menu/key
   targets, rejected/pending/stale history, drafts and selection identity.
4. Inspect screenshots at all three required sizes, repeated panel toggles,
   resize/restore, focus and drafts. Record exact commit/files/logs/captures and
   manual CI link, then review this batch before the next one.

Following reviewable batches:

- B2: focus Clip, Devices and Browser search, distinct from visibility; optional
  existing maximize/restore menu. Test hidden/open/both panel states and no IPC.
- B3: contextual Duplicate/Delete/Rename/Make Independent, with explicit slot vs
  placement vs shared-source wording and captured destinations. Reuse existing
  empty-slot and `placementError` validation; never reinterpret as time/clipboard
  operations. Cover stale selection, same-source siblings, rejected publication
  and Undo/Redo. Source-only or track deletion is a separate decision.
- B4: menu access to Import WAV, contextual Loop Selection, local zoom/Fit, MIDI
  note Preview and Edit selected device. Reuse current native acknowledgements,
  preview release/work limits, device instance ownership and stopped structural
  guards. Browser audio preview stays unavailable.

Every batch starts with a failing behavioral regression, then implementation,
adjacent/full relevant checks, three-size actual UI inspection and exact-head
native/manual CI evidence. Do not rerun working features as new implementations.

## C. Catalog and device contract dependencies

Specify stable catalog/device/preset IDs and versions, nested preset metadata,
compatibility and provider failures; atomic complete preset application with
rollback, parameter-base ownership, automation interaction and Undo. Specify tag
schema/filter query ownership. Browser audio preview needs a separate bounded
decoder, gain/routing and lifecycle contract. Expanded editors need a versioned
instance-owned capability and bindings/resources with shared Ultra compatibility.
Only enable each UI action after its provider/native contract is implemented.

## D. Mixer, routing, then recording

First decide pan law/range, persistent mixer fields, stable return/bus/route IDs,
send topology/pre-post semantics, feedback policy, work/resource bounds and
meter observations. Define atomic native receipts, stale-target errors, saved
session format/validation and history/Undo projection. Preserve gain/mute/solo.

Then define input enumeration/reconnects, monitor states, arm exclusivity,
recording clocks/latency, channel format, buffering/backpressure, disk/file limits,
write/finalization failures, interruption recovery and save/reopen ownership.
Recording is complete only with real acknowledged capture and lifecycle support.
No armed red button or mock recording state substitutes for these contracts.

## E. Transport/MIDI and channel intent

Phase nudge requires a bounded native timing contract and Stop/seek/loop rules.
Define external MIDI, metronome/sync, capture/overdub and time-signature semantics
separately. Clarify multitrack versus multichannel intent before deciding channel
layouts, route formats, metering or export. None blocks unrelated B work after A.

## F. Final software and separate hardware acceptance

Complete supported end-to-end workflows, persistence/restart and unavailable
states for unfinished actions. Distinguish browser geometry, software-native
audio observations and physical device qualification in every report.

After A and CPAL loopback pass, agree a local hardware checklist: OS/driver/device,
safe output level, requested/observed sample rate and buffers, playback/Stop/seek/
loop, mute/solo/Master, overload reset, save/reopen/restart, device reconnects and
stream errors. Ask before consequential device/settings changes or recording;
record original settings and the agreed restore procedure. Add recording/routing
tests only after those features exist. No hardware test is part of this audit.
