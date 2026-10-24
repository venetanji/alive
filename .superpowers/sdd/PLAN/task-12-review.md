# Task 12 Frozen Spec And Code-Quality Review

Reviewed checkpoint: `ecfed29fcaa4306568fe5041a962187da7296bfb`.
Base: `fdcdd1b353f7560fdd3d448377168ec51a9cc2bf`.

## Verdicts

- **Spec compliance: Needs Changes.** Two Important runtime-feedback findings
  remain in the frozen checkpoint. The saved format, compatibility branch,
  focused history, prepared identity, and shared-source recovery paths otherwise
  match the reviewed requirements on the inspected evidence.
- **Code quality: Needs Changes.** The native request result is now a value with
  explicit rejection states, but the transport caller still assumes that a
  resolved IPC promise means success. The separate immediate and polled receipt
  presentation also leaves asynchronous failures without actionable guidance.
- **Acceptance gate: CannotVerify.** Final exact-checkpoint build/native journey
  evidence was explicitly pending at dispatch. The parent is reconciling that
  evidence separately. Passing earlier native evidence is not substituted for
  this gate.

No Critical findings. Two Important findings follow. No separate Minor finding.

## Important Findings

### T12-R1: Start/Seek discard native rejection receipts and announce success

Locations: `apps/ultra/ui/alive.mjs:76`,
`apps/ultra/src-tauri/src/session/desktop.rs:269`,
`apps/ultra/ui/alive.mjs:125`.

In clips mode, `alive_transport` returns the serialized `RequestResult` from
`Runtime::request`. A native immediate refusal, such as queue/receipt pressure,
is an ordinary successful IPC return carrying `status: "rejected"` and a reason;
it is not an IPC error. The renderer's `transport()` discards that result,
refreshes, and unconditionally says `Transport playing.` or
`Transport seek queued.`. Even successful immediate QUEUED is not evidence that
Start has applied.

There is also no later visible observation for these requests. Start/Seek are
recorded with `track_id: None`, while the runtime outputs filter requests to each
track ID. An asynchronous rejection, cancellation, or unavailable result for
Start/Seek therefore never replaces the success message. This regresses the
former transport error path and violates the distinction between accepted,
queued, and applied native actions.

Preserve and display Start/Seek request identity and immediate status, then
reconcile their terminal state in a global transport status using the same
preparation/serial keys as track actions. Report playing only from authoritative
native state. Add focused UI coverage for immediate refusal, QUEUED before
application, and asynchronous refusal of a trackless request. These are
presentation tests; they do not require a second scheduler implementation.

### T12-R2: Asynchronous WORK_LIMIT has only a numeric reason and no recovery guidance

Locations: `apps/ultra/ui/alive.mjs:109`,
`apps/ultra/ui/alive.mjs:125`.

`clipAction()` maps reasons and provides the retained-playback/explicit-retry
guidance only from the immediate return. For the required asynchronous case,
the immediate return is QUEUED with reason zero. A later polled rejection is
rendered only as, for example, `request 4 rejected reason 12` in the track output.
No code maps that polled WORK_LIMIT to a human-readable explanation or states
that prior playback/pending state was retained and audio should advance before
an explicit retry.

The design explicitly calls for those messages because the ABI does not supply
full per-request callback contribution diagnostics. Existing native behavior and
receipt identity are preserved; the defect is that the user cannot understand
the refusal or its supported next step. Use a shared formatter for immediate
and polled receipt statuses, include the known track/clip/request context, and
do not invent synchronous contributor counts for this asynchronous result.
Add a focused QUEUED-to-REJECTED/WORK_LIMIT DOM regression that verifies the
guidance and unchanged active/pending presentation.

The parent reported that the implementer independently identified this same gap
after the freeze and is preparing a follow-up. That does not close the finding
against this reviewed checkpoint, and no forthcoming changes were inspected.

## Strengths And Requirement Trace

- Strict v3 storage is a separate wire shape with exact four-element nullable
  slots, required nullable defaults, unknown-field rejection, and a recursive
  duplicate-member pass on original v3 text. Legacy file decoding continues
  directly from original text without imposing the v3 map policy. Migration uses
  the specified length-prefixed SHA-256 identities and preserves authored values.
- The document and schedule variants make fallback explicit. A common legacy
  candidate is admitted first; conversion reuses its captured dependencies.
  Explicit invalid v3 fails admission, while graph-policy and conservative
  density examples retain v2. Save returns the exact atomically written/rebased
  document and does not implicitly retry conversion.
- Clip creation/duplication/note creation allocate identities in Rust, considering
  retained history, current score, and prepared score. Whole-document musical
  edits guard slot/default membership and note ownership. The existing focused
  history gate remains the mutation boundary, with live fields merged by stable
  identity and copied score IDs independent of device instances.
- Compilation keeps clip-local contiguous event ranges, exact v3 frame rounding,
  hard-clear termination at the seam, and enabled-empty-lane ownership. Aggregate
  saved bounds include disabled lanes. Configuration explicitly selects admitted
  2x4 policy and NONE values; it does not expand scenes, tracks, or device limits.
- Rust resolves launch IDs from prepared metadata, assigns serials, and retains
  bounded observations matched on both preparation and request identity. Native
  owns scheduling and receipt reservation. Snapshot sequencing and decimal-string
  native identities avoid JavaScript ordering/precision mistakes. Stop bypasses
  stale view generation/preparation checks and retains the native reserved path.
- Shared-source checking groups canonical paths and reports candidate stale
  siblings using original dependency groups after selected replacement. The
  guidance explicitly requires preserving the changed copy, restoring a matching
  original backup, and replacing intended instances separately. No sibling hash
  mutation or batch refingerprint path was added.
- The UI keeps selection, saved default, prepared launch, active state, and
  pending state distinct; draft-only launch is disabled and prepared identities
  remain visible after draft deletion. Captured clip/note IDs and the focused
  result token protect delayed edits and selection. The native journey harness
  is additive to the retained desktop journey, with separate CI artifacts.

## Evidence Inspected

Implementer assertions were treated as claims until supported by code or the
following retained outputs. No suite, build, GUI, or native journey was rerun by
this review.

| Evidence | Observed result and limit |
| --- | --- |
| `/tmp/alive-task12-final-focused.log` | 46 passed, zero failed; includes real native host/fallback child test. |
| `/tmp/alive-task12-rust-final.log` | 187 passed, zero failed, two ignored. |
| `/tmp/alive-task12-ui-final.log` | 486 passed, zero failed. No coverage shown for T12-R1/R2. |
| `/tmp/alive-task12-browser-checkpoint.log` | Five passed; includes the four-slot minimum-desktop test. |
| `/tmp/alive-task12-native2/native-clips-report.json` | Earlier actual release journey: stopped cue, pending then applied switch, one-track Stop while Harmony continues, stopped saved default after reopen, both shared-source errors and sequential recovery. |
| Native2 rendered-output record | 318,976 frames, 6.6453 seconds, peak 0.2225944549, observed 512-frame buffer; private software PipeWire, not physical audio qualification. |

The source tests also inspect explicit v3 graph refusal versus valid legacy
graph playback/save, conservative density fallback without score removal,
disabled aggregate bounds, deterministic literal expected IDs, Save As,
independent copies, delayed clip/note identity, and receipt matching. Existing
reviewed Task 11 scheduling tests remain the sample-boundary/pressure authority;
this review did not requalify that native scheduler or broaden capacity.

### Warning Calibration

The inspected native2 app/startup logs retain the two MESA-EGL DRI3 warnings from
the software Xvfb display. They are environment warnings, not evidence of new
clip-bank failure, and are not a reason to suppress logging or redesign this
task. The scanned retained Rust test log did not expose a compiler warning.
The implementer's design-detector advisories concern inherited compact desktop
typography/palette; this review does not promote those claims to a new breakage
finding or claim a comprehensive accessibility audit. Final native logs still
need the parent's warning review alongside their result.

## CannotVerify Gates

- **CV1 - Exact-checkpoint release association and final native journeys.** At
  dispatch these were running on frozen source. During review the parent reported
  that the exact release clip journey passed and that source/build hashes were
  verified, while the retained full native journey remained in progress. I did
  not inspect the new evidence; the parent must reconcile and close this gate.
  The earlier native2 report is corroboration, not final-build association.
- **CV2 - Separate Alive Cargo check and Task 12 CI/package checks.** The frozen
  implementation report marked the local Alive check pending and left CI/package
  acceptance parent-owned. Their final outputs were outside this read-only
  review. Prior-checkpoint portable-helper CI is not Task 12 CI.
- **CV3 - Follow-up fixes for T12-R1/R2.** No later source or tests are included in
  this verdict. The frozen suite/native success does not verify these refusal
  presentations. Re-review the focused changes and relevant test evidence before
  accepting the task.

Physical audio latency/underrun guarantees, eight-track admission, scenes, and
new telemetry were intentionally outside Task 12, not additional blocked gates.

## Review Method And Scope Exceptions

Requirements read first: `task-12-brief.md`, `task-12-integration-design.md`, and
`shared-source-recovery-analysis.md` in this PLAN directory. The implementation
report and frozen `task-12-review.diff` were then inspected in sequential passes.
No git command, source/index/HEAD/branch mutation, subagent, broad repository
review, or competing app/build activity was used. Only this report was written.

Necessary missing-context reads were limited to:

- `desktop.rs:76` to complete the cut `musical_draft` chain/format guards.
- `prepare.rs:141` to complete cut note/automation frame validation and seam rules.
- `alive-model.mjs:1` because tool output cut `accept`/`applied` in mid-function.
- `alive.mjs:60` to complete cut refresh/file/transport helpers; this exposed R1.
- The previously truncated `alive-model.test.mjs` diff block, to finish the
  original diff inspection rather than infer its assertions.

One focused unchanged-native risk check confirmed that the shared stop entry
point handles legacy mode and that the v2 state projection remains valid under
v3. The backend wrappers and existing v3 compatibility assertion answered that
question; it is not a finding. No additional focused runtime experiment was
needed to establish the two presentation defects from their direct call paths.
