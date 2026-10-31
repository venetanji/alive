# Task 2D Desktop Review

## Spec Compliance

Issues found. The measured profile-1 MIDI slice implements the requested architecture and exposure boundary, but queued slot controls can silently overwrite a previously accepted edit. This violates the brief's edit-preservation requirement; see Important I1.

Scope: `ad706cae443df77781b27842097c590b547febd3` through `4b9a88b721bba9728bb6b505e14cc4a14f7c8117`, using the supplied review package, desktop brief/report, runtime-contract sections 2/4/7/8, and desktop supplement. This is a task review, not a whole-branch review. Parent-owned later harness/docs changes are excluded.

## Strengths

- `apps/ultra/src-tauri/src/session/clips.rs:43` preserves original JSON for strict v4 decoding; `apps/ultra/src-tauri/src/session/document.rs:17` replaces mandatory-instrument dereferencing with checked version access and real optional instruments.
- `apps/ultra/src-tauri/src/session/prepare_workspaces.rs:14` refuses audio and unqualified storage shapes before dependency reads. Compilation at line 39 sorts sources deterministically, validates disabled bindings, compiles each source once, and uses endpoint differences for placement durations.
- `apps/ultra/src-tauri/src/session/host.rs:129` validates the complete native candidate before installation; `apps/ultra/src-tauri/src/session/desktop.rs:218` retains the shared driver/install boundary. `apps/ultra/src-tauri/native/alive_session_workspaces.hpp:562` advertises only measured profile 1; profile 2 stays refused.
- `apps/ultra/src-tauri/src/session/runtime_workspaces.rs:65` separates observed authority, pending authority, source/slot/placement IDs, and null silence/gap observations. `apps/ultra/src-tauri/src/session/workspace_edits.rs:7` derives command-primary IDs from the operation instead of sorted invalidations.
- `apps/ultra/src-tauri/src/session/desktop.rs:331` routes reserved Stop before ordinary identity checks; `apps/ultra/ui/alive.mjs:101` starts shared audio then sends Start with the original captured identity. `apps/ultra/src-tauri/src/session/runtime.rs:51` shares the ingress serial across v3/v4 transitions.

## Critical

None found in the pinned task range.

## Important

### I1. Queued slot updates overwrite accepted changes to other slot fields

Locations: `apps/ultra/ui/alive.mjs:260`, `apps/ultra/ui/alive.mjs:214`, and `apps/ultra/ui/alive.mjs:197`.

The offset control captures `slot.name` and `slot.loopEnabled` from its render, and the rename control captures the old source offset. Both construct a full `slotUpdate` before queue execution. `workspaceEdit` later attaches the current draft revision through `command`, so a second queued control submits stale sibling fields with a valid newer revision. The existing model intentionally replaces all three fields (`apps/ultra/src-tauri/src/session/workspaces.rs:1183`), and the backend accepts that current revision (`apps/ultra/src-tauri/src/session/desktop.rs:142`).

Focused reproduction against the real mounted UI: hold the first rename request, rename `Clip 1` to `Renamed slot`, then change its offset to `0.25` before releasing the first request. The UI emits:

1. revision 0: name `Renamed slot`, offset 0;
2. revision 1: name `Clip 1`, offset 0.25.

The final slot is again named `Clip 1`. Reversing the edit order similarly risks restoring the old offset. This is silent loss of accepted user intent during ordinary queued editing.

Fix by capturing the edited field and stable slot/source identity, then resolving the latest authenticated slot inside the queued callback to fill unchanged fields. Preserve the existing scope/rewire guards. Add a delayed-command regression covering rename then offset and offset then rename.

Evidence: `node /tmp/alive-task2d-review-slot-race.mjs` exited 0 and printed the two operations and reverted final name. The reproduction uses the existing DOM adapter with ordinary test registrations disabled; only this focused scenario executes. Its backend applies the exact existing full-slot replacement semantics. It does not claim native-browser focus coverage.

## Minor

None separately reported.

## Cannot Verify From Diff

- Independent profile timing/guard qualification and the practical >=256-frame recommendation depend on the accepted earlier measurement review. The diff preserves the fixed limits and profile-2 refusal; it cannot establish measured deadlines itself.
- Actual audio, hosted-editor lifetime, executable/library provenance, launcher preservation, and v3/v4 save/Quit/reopen journeys depend on retained external evidence. The report identifies build pins and run3-final observations; those journeys were not rerun or independently remeasured in this review. Parent should retain its existing evidence attribution and the reported bounded-observation limitations, including prior run2's over-budget observation.
- Original driver retirement, native callback allocation/locking guards, full scheduler correctness, and prior-version acceptance span unchanged components and earlier reviewed tasks. The scoped diff does not replace those gates.
- Timeline interaction and audio-source preparation/playback remain explicitly deferred to their accepted next tasks; this review does not qualify the full Arrangement or audio journey.

## Checks Performed

- Read the supplied full diff in bounded passes, recovering the omitted subsection after one truncated tool response. No whole-branch crawl, suite rerun, source/index edit, commit, or PR action.
- Inspected the unchanged `SlotUpdate` model branch to verify the concrete overwrite risk, and the controller's revision/history boundary because queued edits attach the latest revision. Inspected the existing DOM adapter solely to construct the focused reproduction.
- Inspected the persistence read/save entry surrounding its changed rebasing loop to check the concrete risk of bypassing strict v4 dispatch or altering preparation during Save As; no additional issue found.
- Read retained summaries: `56-rust-all.log` reports 252 passed / 0 failed / 4 ignored; `39-ui-green.log` reports 79 passed / 0 failed; `36-browser-all.log` reports 20 passed; `53-native-suite.log` contains the reported native PASS results. No suites were rerun. These passing runs do not cover I1's queued sibling-field overwrite.

## Task Quality

Needs fixes. The native/desktop separation, immutable prepared mappings, strict mode handling, and measured-profile gate are coherent. Fix I1's silent queued-edit loss before accepting this task; a narrow UI regression and scoped re-review are sufficient for that finding.
