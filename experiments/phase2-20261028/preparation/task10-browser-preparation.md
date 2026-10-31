# Task 10 browser and Session preparation (read-only inventory)

This is a proposal for a later child contract, not a frozen API, implementation
lease, Live compatibility claim, or permission to delay P2.1. Task 10 starts
only after Q1 and explicit shared-file/resource leases; Task 11 follows Task 10
(`docs/superpowers/plans/2026-10-28-phase2-multi-agent-execution.md:230`).

## Identity and scope

- Checkout `/home/venetanji/.codex/worktrees/edd5/alive`; observed HEAD
  `13d3061ced9df759aa65201c4d7361d831cefbd9`; accepted application source
  `6f407a488478800b358228c53a73349c8cf72a0d` per `docs/PHASE2_HANDOFF.md:9`.
  `PLAN.md` and handoff are intentionally dirty/root-owned; this note does not
  qualify later Task 7 or Task 8 source. Rebase this inventory on the accepted
  post-Q1 identity before freezing a child contract.
- Plan: `docs/superpowers/plans/2026-10-28-phase2-live-max.md:433`;
  design `docs/superpowers/specs/2026-10-28-phase2-live-max-design.md:231`;
  product `PRODUCT.md:23`, `PRODUCT.md:107`; existing host scope
  `apps/alive/SESSION_CONTRACT.md:6` and `:65`.
- Four slots/scenes and measured profiles remain; no external folder scan,
  media indexing, drag/drop or audio-source playback implied. Native picker
  remains fallback. Structural device changes remain stopped, and the existing
  explicit Prepare / Apply boundary remains authoritative.

## What exists in Alive

- `apps/ultra/ui/alive.html:13` has a collapsible placeholder with picker-based
  Add instrument/effect and a supported-media explanation, not search or
  catalog rows. `apps/ultra/ui/alive-workspace.mjs:4` owns local visibility.
- Packaged resources in `apps/alive/src-tauri/tauri.conf.json:19` include
  `apps/ultra/examples/subtractive.ultra`, `utility.ultra`, and
  `stereo-lowpass.ultra`, and two `.alive` examples. Verify declared device
  kinds and resource resolution in the eventual bundled binary before offering
  them. `apps/ultra/ui/canvas-catalog.mjs:6` is an Ultra object catalog, not
  an Alive reusable-device catalog; do not treat all `.ultra` examples as
  host-admitted devices. Packaged-resource path/identity and Save As/reopen
  must be specified rather than assuming checkout paths survive installation.
- `apps/ultra/ui/alive.mjs:46` distinguishes selected slot from selected v4
  source; `:190` sends explicit launch with generation/preparation revision.
  `:275` renders prepared, draft-only, selection and runtime states separately.
  `:562` provides global Save/Space handling, not grid arrow navigation.
- `apps/ultra/ui/alive.mjs:278` offers track-owned source selection, create,
  source rename and assign to empty slot; `:300` offers clip name, duplicate,
  independent source and delete controls. They are detail controls, not an
  inline slot editor/context menu. V4 create currently sends source-create
  then slot-assign as two transactions (`:227`); a failed second step can leave
  a source and separate history entry. V3 uses separate clip edits, so shared
  source behavior must not be projected onto v3.
- `apps/ultra/src-tauri/src/session/workspaces.rs:156` defines typed v4 edits;
  `:1031` creates/renames sources, refuses deletion while any references remain,
  and clones one occurrence for independence (including fresh note IDs).
  `:1154` assigns only an empty slot, updates its own name, duplicates a slot
  with a fresh slot ID but the same source, and deletes only the occurrence.
  Validation enforces matching ownership/kind/offset and limits: `:400`,
  `:425`, `:607`; source names and slot names are distinct. Four sources per
  track, 32 per project and 64 placements are schema limits, not a license to
  exceed native admission. See `apps/alive/SESSION_CONTRACT.md:65` for profiles.
- `apps/ultra/src-tauri/src/session/desktop.rs:117` checks generation/revision,
  applies to a candidate, validates against prepared resources, merges live
  values, and records a single history entry on change. Source selection alone
  should never invoke that path. `:674` and `:697` implement stopped device/
  track changes with capacity checks, picker or explicit path, capture, prepare
  and install; `:650` limits effects and removes affected automation on device
  removal/replacement. These install paths must not be described as already
  undoable musical edits without examining their actual history semantics.
- Existing focused coverage: `apps/ultra/ui/alive-dom.test.mjs:84`, `:108`,
  `:118`, `:173` covers state distinctions, selection/creation and launches;
  `apps/ultra/ui/alive-model.test.mjs:110` covers draft/prepared separation;
  `apps/ultra/tests/ci/alive-chain.spec.mjs:333` exercises v4 source/placement
  edits; `apps/ultra/src-tauri/src/session/desktop.rs:1115` checks stale owner
  edits and `:1122` independence/history. Preserve quantized launch and scene
  receipt coverage in `apps/alive/SESSION_CONTRACT.md:107` and existing tests.

## Reference evidence and gaps

- `experiments/alive-session-ui-reference-20261026/README.md` identifies
  Live 12.4.6 copy executable SHA-256
  `fdc11a99a6a02c715115ed028becc29c1a2e3b67604ca99e22a81bbfd9d96c6e`;
  `attempt2/07-focused.png` and `08-populated-grid.png` record empty-body
  double click, Ctrl+R rename and Ctrl+D duplication into the next row, plus
  selection distinct from launch. This is UI evidence, not source identity,
  clipboard, keyboard navigation, capacity or timing semantics.
- `experiments/alive-live-reference-20261024/README.md` records search and
  loading Analog/Simpler/Sampler and effects into selected tracks, with
  independent Delay UI settings; transient search screenshots were discarded
  and action receipts begin later. It does not establish exact select/load
  gestures, search ordering, missing result behavior or device DSP.
- `experiments/alive-workflow-reference-20261024/35-a-running.png` through
  `41-track-stopped-transport-running.png` are cited by the Session reference
  for previously observed running/queued/stopped states. These are visual
  observations, not evidence for Alive's scheduling contract.
- Narrow future licensed-runtime questions, only when resource ownership permits:
  (1) in a fresh bounded set, single-click vs double-click vs Enter on a search
  result: exact selection, preview/load and target, including wrong track kind;
  (2) focused occupied/empty slot arrow keys, Enter and Escape, and whether any
  launch occurs; (3) rename commit/cancel and context-menu duplicate/delete
  destination/selection with an occupied next slot; (4) duplicate and edit a
  clip then inspect original, including delete behavior. Record exact actions,
  targets, resulting names/selection and settled screenshots; distinguish UI
  observation from unobservable internal sharing and preserve cleanup evidence.
  Do not infer Live source-sharing semantics from appearance alone.

## Proposed child contract and owner boundary

- Freeze exact bounded catalog membership, unique stable keys, display labels,
  kinds, search normalization/order and result/query bounds; derive project
  rows from the current accepted snapshot, with source ID + owning track ID and
  generation. Define empty/no-match/invalid resource states and an explicit
  load/assign action. Selection and focus are presentation state only; never
  launch, change score, or silently preview/load. Do not trust a UI path or
  kind as authority: resolve known bundled keys at the owner boundary, then
  perform existing device validation and capacity checks before installation.
- Specify picker parity, bundled deployment and relocation/identity behavior,
  device kind mismatch and missing/changed resource handling. Determine whether
  device load is truly history-capable; if musical undo is required by design,
  design its safe prepared-owner transaction rather than promising it from
  the current immediate install. Preserve stopped/draft guards and independent
  device instance IDs. Do not bypass the native prepare/admission checks.
- Define v3 clip versus v4 slot/source action matrix, exact keyboard focus,
  boundaries, menu dismissal, text editing/commit/cancel and accessible names.
  Duplication in v4 shares source until explicit independence; deleting a slot
  leaves its source; deleting referenced source refuses with no partial edit.
  Define destination selection and refusal when all four slots are occupied.
- One user edit must be one validated owner transaction/history record; in
  particular define an atomic create-source-and-assign operation instead of the
  current two calls, if that gesture remains. Candidate failure, stale
  generation/revision, kind/track mismatch and capacity refusal leave score,
  history, prepared playback and selection intact. Revalidate stable target IDs
  after queued work; late results must not steal newer focus/selection. Keep
  selection distinct from native launch and preparation revisions.

## Proposed admission and regression cases

- Pure catalog tests: bounded ordering/filtering, case and empty/no-match,
  duplicate labels with distinct keys, resource unavailable and stale project
  rows; query limits and maximum admitted project cardinality.
- Owner tests: wrong device/source kind or track, occupied/full slot, maximum
  source/track/device capacity, stale generation/revision, missing/corrupt
  bundled device, referenced source deletion, and failed compound create:
  compare complete pre/post score, history, prepared identity and live values.
  Check v3 and two-track v4 separately; verify undo/redo and persistence only
  for operations actually included in the frozen history contract.
- Browser/DOM tests: selecting and arrowing rows/cells never dispatches launch
  or edit; explicit load/assign acts on captured stable target; Enter/Escape,
  keyboard-only menus and inline rename preserve focus and reject stale async
  completion. Check shared duplicate then independence and source deletion;
  retain existing bar-quantized launch/scene assertions and draft/prepared cues.
- Native later: packaged resource and picker fallback, save/quit/restart,
  independent instance identity, explicit Prepare / Apply, full v3 and admitted
  two-track v4 layouts, unchanged playback after refusal; use the exact accepted
  binaries and software/physical evidence labels. No execution performed here.

## Future non-overlapping leases (proposal only)

- UI owner: `apps/ultra/ui/alive.html`, `alive.css`, `alive.mjs`,
  `alive-workspace.mjs`, new `alive-browser.mjs` and matching UI tests, plus
  explicitly leased `apps/ultra/tests/ci/alive-chain.spec.mjs` sections.
- Host owner, serialized with Tasks 7/11/13: `apps/ultra/src-tauri/src/session/
  desktop.rs`, `workspaces.rs`, relevant focused owner tests and any separately
  negotiated history/resource files. Coordinate command DTO freeze before UI.
- Packaging/resource owner only if required: `apps/alive/src-tauri/tauri.conf.json`
  and explicitly named catalog/resource files; no implicit CI/harness ownership.
  Reviewers/read-only fixture work must not write leased files. Controller pins
  accepted base, exact allowlists, contract and native resource ownership first.
