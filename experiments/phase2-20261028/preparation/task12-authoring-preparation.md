# Task 12 authoring preparation

Status: read-only preparation, not a frozen contract, implementation lease,
native proof, Max compatibility claim, or a dependency of the P2.1 checkpoint.
All contract choices below are proposals requiring focused reference evidence,
owner review, explicit bounds, and a future isolated lease before implementation.

## Immutable basis and gates

- Application sources: `6f407a488478800b358228c53a73349c8cf72a0d`;
  containing feature checkpoint: `13d3061ced9df759aa65201c4d7361d831cefbd9`.
  Source paths below refer to application bytes at the former commit; plan,
  design and reference paths refer to the latter commit unless otherwise stated.
- `docs/PHASE2_HANDOFF.md`, read from the live worktree, SHA-256
  `89dd793dae0772e6e94e4de311f4547c6d64640f4e574a223ddaf7789c296390`;
  `PLAN.md`, SHA-256 `15dc309e0db970ad2d3a8a0784966439c2c3835d96fe4ae6dd278a722cb5f498`.
  Both were already modified. Task 7 owns native resources; Tasks 8/9 are gated.
- Task 12 in `docs/superpowers/plans/2026-10-28-phase2-live-max.md` requires
  reference cohorts, a child contract and separately reviewed authoring slices.
  `docs/superpowers/plans/2026-10-28-phase2-multi-agent-execution.md` places
  fragments in E0 after Q1, with ownership/contract first; Task 14 follows shared
  model work. `PRODUCT.md`, `DESIGN.md` and the Phase 2 design retain separate
  Ultra identity, focused-input safety, optional Inspector, and bounded admission.

## Observed source seams

- `apps/ultra/ui/canvas.mjs:24` maintains per-view primary selection plus a
  node set. Shift toggles a node; drag retains a previously selected group;
  background marquee clears first, Ctrl+A selects local nodes, arrows move the
  group, and delete removes it. Cable selection is an edge array index. Check
  actual context-click and selection behavior against captured cohorts; none of
  these source behaviors establishes Max semantics.
- `apps/ultra/ui/canvas.mjs:377` shows the primary node's Inspector even for
  multiple nodes; `canvas-inspector.mjs` edits single-node parameter/style drafts.
  `canvas-focused-drafts.mjs` and save/close preflight must remain in the route.
  Existing selection may change while focused drafts or a linked view are active.
- `apps/ultra/ui/canvas-model.mjs:240` edits a copied root via the active path,
  validates before replacing it, and records snapshot history. `removeMany`
  deletes incident local edges; `moveMany` uses translated midpoint geometry.
  There is no ordinary graph clipboard/duplicate operation in the planned scope.
- `apps/ultra/ui/canvas-hierarchy.mjs:3` limits authoring trees to 1 MiB,
  512 nodes, 1024 edges and 16 nested levels; IDs are unique across the tree,
  edges reference nodes in their own scope, boundary ports are ordered by x,
  and parent edges follow boundary identity on edits. Lowered execution is also
  checked against native 32 executable nodes/64 edges (`src-tauri/src/canvas.rs:12`).
  Root `device` and `helpShell` are distinct from a child `nodes`/`edges` scope.
- `apps/ultra/ui/canvas-shared.mjs:103` queues complete optimistic root snapshots
  against authoring revisions and restores authoritative descriptors on conflict;
  queue saturation and pending history block edits before mutation. Native
  `apps/ultra/src-tauri/src/documents_shared.rs:143` validates and admits before
  owner mutation, rejects stale revisions, and records one root snapshot per
  history commit; children resolve to that owner, with independent view paths.
  Undo/redo also admit before changing owner history. This is not permission to
  bypass runtime admission or assume a UI-local snapshot is authoritative.
- `canvas-cable-geometry.mjs` validates and translates retained midpoints when
  both endpoints move equally; `canvas-cable-path.mjs` renders them. Current
  canvas offers connect/disconnect and cable selection, not endpoint reconnect
  or bend editing. Array indices are unstable across edits and linked revisions.

## Reference evidence and missing questions

`docs/PHASE2_REFERENCE_20261028.md:81` says no fresh Max pass occurred and
requires bounded cohorts for unobserved clipboard, cable and Inspector actions.
`experiments/max-reference/float-cable-runtime-20261022/README.md` documents Max
9.1.5 Windows x64 executable SHA-256
`7a881318209a10d33c982db482297ab870327d5d2cb90aee6e4e01a13e279d8b`.
Its original five-route fixture observes box movement, initial cable appearance,
and no clipboard text/formats in those attempts; midpoint movement and compressed
copy are unqualified. Do not infer wire format, geometry updates or clipboard
precedence from that failed capture. Existing entry/lock/help observations are
reusable only within their documented scopes.

Minimum next licensed REA cohorts, when the reference resource is available:

1. Original synthetic connected and nested selections: copy/cut/paste/duplicate,
   repeated paste placement, internal versus external cords, parent/child views,
   text focus, undo/redo and cancellation; distinguish visible behavior from any
   successfully captured native formats. Preserve failures and unknowns.
2. Select/marquee with modifiers, crossing versus containment, context-click on
   selected/unselected objects and group move/resize; record exact input and zoom.
3. Same/mixed object Inspector, mixed values and applying a shared field, invalid
   values, cancel and undo; observe whether changes affect all selected objects.
4. Reconnect either endpoint and edit bends, compatible/incompatible ports,
   release outside, Escape, keyboard access, undo and saved/reopened geometry.
   Compare at equal DPI/zoom; do not assume visual contours prove stored data.

## Proposed child contract for review, not frozen

- A strict versioned Ultra-specific envelope with bounded serialized UTF-8 bytes,
  depth, counts, known keys and types; reject unknown versions, malformed or
  duplicate IDs/references before constructing a candidate. Specify exact wire
  MIME/clipboard fallback, limits and schema only after platform feasibility and
  capture; do not claim Max interchange. Enforce both fragment and full owner
  hierarchy/lowered runtime bounds, coordinate/midpoint/style/kind validation.
- Snapshot selected local nodes and complete selected patcher subtrees, preserving
  node parameters and admitted styles; preserve ordered local internal edges and
  their midpoint arrays and all internal child edges. Exclude edges crossing the
  fragment boundary and root `device`/`helpShell` manifests. Explicitly decide
  which root-bound helper nodes and metadata references are unsupported: reject
  rather than silently orphan or copy root state. Audit every typed ID-bearing
  field, including help/device roles if ever admitted; never rewrite arbitrary
  user strings. A map must assign fresh nonzero IDs globally across the target
  tree, rewrite every contained typed reference and edge endpoint once, preserve
  port ordering, reject exhaustion, and never reuse a source or target ID.
- Propose translation of top-level nodes and their internal cable bends by one
  deterministic target-scope delta; descendants retain their local coordinates.
  Define pointer versus original anchor, duplicate offset, repeated-paste cascade,
  bounds and reset rules from reference observations before freeze. Never clamp
  nodes or bends independently, which distorts geometry; refuse out-of-range.
  External clipboard contents and focused editable text take normal text copy,
  cut and paste precedence; graph shortcuts only consume admitted graph actions.
- Copy exports only after validating the selection; cut first proves clipboard
  publication and then requests one owner transaction removing selected nodes
  and all incident edges. Clipboard failure, stale revision, invalid draft or
  failed admission leaves owner/history untouched; specify explicitly whether a
  successful clipboard write followed by refused cut remains on the clipboard.
  Paste/duplicate construct and validate the complete candidate before a single
  commit; no incremental nodes, edges, revisions or undo entries on failure.
- Resolve source selection and target child path against the canonical owner and
  revision. Cross-window clipboard transports data, never owner authority; target
  admission applies to its current owner, and linked views observe one accepted
  root transaction. Stale paths/revisions, root-only contexts, queue pressure,
  install failure and all capacity errors refuse atomically with visible reason.
  Specify clipboard async races, concurrent edit/retry, owner-close and child
  deletion behavior; never replay a stale candidate onto a changed owner silently.
- Inspector and cable work are separate transactions: common supported fields
  and mixed indicators validate all members before one commit; appearance-only
  edits preserve running audio. Reconnect preserves edge order and geometry only
  under an explicitly captured rule, validates port domain/channel and duplicate
  constraints, and keeps old edge on cancel/refusal. Bend gestures preview
  locally, commit once, and restore exact prior geometry on Escape/cancel.

## Existing coverage and meaningful future red cases

Existing source tests include `canvas-hierarchy.test.mjs` (scope, IDs, boundary
remap, history and geometry), `canvas-cable-geometry.test.mjs`,
`canvas-cable-path.test.mjs`, `canvas-inspector.test.mjs`, `canvas-dom.test.mjs`
(selection/connection, focused drafts), `canvas-shared.test.mjs` and
`src-tauri/src/documents_tests.rs:203` (stale CAS, admission, linked history,
save and bounded snapshots). Browser/native journeys include
`tests/ci/canvas-hierarchy.spec.mjs`, `tests/ci/canvas-documents.spec.mjs`,
`tests/check_cables_desktop.py` and `tests/check_ultra_drafts.py`. These are
existing coverage, not evidence that Task 12 has passed.

Future tests should exercise connected-pair duplication with external edge
exclusion, subtree/global remap and boundary identity, geometry/style roundtrip,
repeated placement and text precedence; cut clipboard failure and stale CAS;
malformed, oversized, depth, coordinate, ID exhaustion, unsupported-root and
compiled-capacity refusal with exact owner/history unchanged; cross-owner paste
and linked-child undo/redo; concurrent deletion/close and runtime admission
failure. Separately cover common/mixed Inspector atomic failure and no audio
reset; reconnect both ends, invalid type/channel/duplicate, cancel and save/reopen
with original edge order and bends; native focused-input/menu/keyboard paths.

Future allowlist proposal: Task 12 plan files plus relevant focused model,
hierarchy, shared-owner, Inspector, cable, clipboard/shortcut/UI files and their
targeted tests; add any new IPC/native/clipboard integration files explicitly to
the lease only after contract review. Keep Task 7 host/native files and P2.1
artifacts outside that lease unless separately granted. No tests, builds, GUI,
runtime measurements, REA, commits or environment changes were performed here.
