# Task 10 focused child contract: proposal, not frozen

This is read-only preparation for the controller, not a lease, implementation,
acceptance, Live compatibility claim, or permission to begin before Q1. E0
requires Q1 and a controller-frozen child contract and exclusive leases;
Task 11 follows Task 10. Rebase and recheck all facts against the post-Q1
accepted application identity. Observed checkout HEAD is `0f1deae`; the
controller identifies accepted application source as `64fcacd`. Later
two-Windows scripts do not establish a newer compiled application. This note
does not reopen completed Tasks 1-8.

## Delta from the 13d preparation

- The current owner has v5 Master outside the musical score/history. New uses
  `new_session` to reset Master gain to unity; ordinary musical edits merge
  accepted live values into the candidate. Task 10 must preserve that owner,
  Master serial/observations, current mixer, bypass and device bases across
  edits, refusal, undo and Apply. Never reconstruct a session from a UI copy.
- The corrected reference attempt in
  `experiments/phase2-20261028/preparation/browser-reference-20261029/README.md`
  observed a result click select without visible load, double click load Analog
  to selected MIDI track, and an explicit No Results state. Return after result
  selection did not visibly change the screen, but focus was not established;
  no general Enter behavior is proven. No preview, sound or DSP is inferred.
- Empty and occupied grid arrows visibly moved selection without a transport
  change; Escape returned focus to track header with dim cell mark. Empty Return
  visibly did nothing; occupied Enter was not attempted. Ctrl+R committed on
  Return and canceled on Escape. Ctrl+D visibly replaced an occupied next row;
  source sharing, internal deletion and undo were not observed. The corrected
  run has action receipts and captures but no returned REA Evidence ID; the
  first attempt's lifecycle ID cannot be attributed to it.
- These observations inform interaction choices, not a mandate to overwrite
  music: propose empty destination only. The current v4 two-command create UI
  can leave an orphan source and two history entries on second-call failure;
  atomic create-and-assign is a prerequisite for that gesture.

## Proposed bounded interface and identity

Catalog is a static owner-controlled allowlist: `bundled:subtractive` instrument,
`bundled:utility` and `bundled:stereo-lowpass` audio effects, mapped to their
declared packaged Ultra resources, with labels Subtractive, Stereo Utility,
Stereo Lowpass. Confirm Subtractive's actual admission as instrument before
exposing it. Resolve IDs in the owner, parse and validate manifest kind and
fingerprint, and run existing graph/native admission. Do not accept a path, kind,
or fingerprint from the browser as authority. A missing, changed, corrupt or
wrong-kind entry yields a visible refusal; native picker stays available.
Packaged runtime resolution is unproven: current bundle config is inactive and
listing resource paths is not packaged execution evidence.

Project results come only from the current v4 score: `{generation, trackId,
sourceId, kind, name}`; v3 has clips, not reusable v4 sources, and must show an
honest empty/unavailable project-source section. Include unreferenced sources;
selection is local and never changes music. Stable unique IDs, not labels or
row positions, identify results; duplicate labels remain distinct. Search is
trimmed case-insensitive substring over labels, with deterministic category,
label, ID order and a proposed 128-character query bound. Empty query shows
all bounded entries, no match displays No Results. The schema source bounds
are not additional native admission. Exclude external indexing, media/WAV,
new slots and drag/drop.

Proposed typed intent at the UI/owner seam (names illustrative until frozen):

| Intent | Captured identity and owner action | Result |
| --- | --- | --- |
| Select result / cell | local `generation`, stable result or `trackId` and cell index | Focus/selection only; no edit, load, preview or launch |
| Load bundled | `generation`, `draftRevision`, catalog ID, `trackId`, explicit replace `instanceId` or effect-add position | Owner resolves and validates, then stopped structural install; no implicit target inference |
| Assign source | `generation`, `draftRevision`, `trackId`, empty slot index, `sourceId` | Existing v4 `slotAssign`, fresh slot ID, zero beat offset and explicit loop/name; reject cross-track/kind and occupied slot |
| Create MIDI in cell | `generation`, `draftRevision`, `trackId`, empty slot index, validated name and length | New atomic `sourceCreateMidiAndAssign` owner edit creates both IDs in one candidate and history record |
| Rename / duplicate / delete | generation/revision, `trackId`, stable v3 clip ID or v4 slot ID; duplicate has explicit empty destination index | v3 clip edit or v4 `slotUpdate`/`slotDuplicate`/`slotDelete`; rename slot name only |
| Make independent / delete source | generation/revision, v4 occurrence identity or `sourceId` | Existing independent clone with fresh IDs; delete source only when no slots or placements reference it |
| Launch | generation and `preparationRevision`, stable prepared track/clip or slot ID | Existing explicit launch path and receipt; never derived from selection or draft-only cell |

The atomic create operation allocates IDs against current and history-reserved
identities inside the owner, validates target vacancy, source and track kind,
schema limits and prepared-resource compatibility, then records/retains once.
No source, slot, selection or history change survives failure. Undo/redo removes
or restores both together. Existing v3 create remains its own single clip edit;
v4 duplicate shares the source, slot deletion removes only the occurrence, and
independence clones its source and notes. A source delete with any Session or
Arrangement reference refuses without partial changes. No claim about Live's
internal sharing or delete behavior is made.

Owner checks captured generation and draft revision under its lock, including
after file/dialog work; stale target IDs, occupied destination, kind mismatch,
capacity or validation failure preserve score, draft, history, live controls,
prepared schedule and playback. UI must not silently substitute a new target.
Keep a selection token so a late successful result cannot steal newer focus.
Musical edits are draft history entries, one per completed gesture, with stopped
Prepare / Apply and native validation; selection never prepares. Structural
device load requires stopped transport and resolved draft, validates prospective
candidate before install, and preserves existing base/automation ownership.
Replacement removes affected automation only under existing structural rules.
Current structural install is not established as undoable: spec requires
undoable musical actions, so freeze either a safely validated device-history
design or a clearly scoped explicit decision before implementing load; do not
promise undo from the current install path.

## Interaction proposal

Single click selects; double click on a catalog device invokes explicit load
to a captured compatible target. A visible Load button is the keyboard route;
Enter behavior for results is a product decision, not an observed Live rule.
Project-source Assign requires an explicit empty selected slot on its owning
track. Arrow keys move cell focus within existing track and four-row bounds,
without wrapping, edit or launch. Escape returns focus to track header; Tab
continues normal control navigation. In a cell, Ctrl+R opens inline rename;
Return commits one validated edit, Escape cancels. Context menu and keyboard
equivalent expose Rename, Duplicate, Delete, and v4 Make independent where
valid; dismissal restores focus. Duplicate chooses the next empty lower slot,
otherwise refuses without overwriting; it selects the new slot only if selection
has not since changed. Empty-cell double click creates an empty MIDI clip via
the atomic operation. Explicit launch button remains the only launch gesture
in this proposal; occupied Enter is an open decision, not a reference finding.
Menus and controls need accessible names, focus, disabled reasons and errors.

Four slots remain; strict v3 uses its admitted two-track/six-device or larger
eight-track/sixteen-device policy, and shipping v4 remains its admitted two-track
profile. Do not convert schema maxima into claims of admitted DSP capacity.
An unsupported track/source/device kind or full capacity refuses before any
working music is changed. Preserve bar-quantized launch and scene receipts.

## Resource and persistence boundary

Bundled key is catalog identity; a device instance has a fresh stable instance
ID and the existing canonical source SHA-256. It is not the key, label or path.
Resolve the key to an installed resource on the owner side, never a checkout
path supplied by the webview. Existing sessions persist source path and hash;
Save As rebases dependencies relative to the new session location and Open
verifies the hash. A portable contract needs a stable installed-resource locator
or an explicitly managed copy of the source, with missing/version-changed
resources producing normal recoverable errors, never silent refingerprinting.
Choose the persistence representation and migration/relocation policy before
freezing; do not assume a path into an installation survives relocation or an
upgrade. Picker-loaded references retain existing behavior. Confirm resource
availability and Save As/reopen in an actual packaged binary on supported
platforms; this proposal recommends no unverified Tauri-specific API.

## Red, green, and native acceptance (future only)

- Browser behavior: click and arrow among duplicate labels and occupied/empty
  cells; assert no launch/edit/load command, retained focus, No Results and
  bounded query; explicit Load/Assign targets captured IDs. Race a selection
  change with completion and verify no focus theft. Rename commit/cancel and
  keyboard menu dismissal have exact observable score and focus outcomes.
- Owner: start with working music and non-unity Master/live bases; attempt stale
  generation/revision, wrong kind/track, missing or altered catalog source,
  occupied slot, full source/device/native capacity, and referenced-source
  delete. Compare complete before/after score, history, revisions, Master,
  live controls, prepared identity and playback. Force failure after candidate
  source creation to prove no orphan or history entry; success and undo/redo
  create/remove both IDs in one step. Duplicate shares; independent clone
  isolates edits; slot delete retains source; last-reference source deletion
  succeeds and undo restores it. Check both v3 and admitted two-track v4.
- Integrate real owner/UI behavior: create, rename and assign while playing are
  draft-only; pre-Apply prepared launch and bar receipts remain authoritative;
  stopped Apply installs validated edits, preserving latest bases, automation
  ownership, mixer and Master. Structural load rejects while playing or draft
  pending, then succeeds after resolution; failed load leaves music audible and
  intact. Validate the selected undo policy rather than assuming device undo.
- Native packaged restart: exercise each admitted bundled instrument/effect and
  picker fallback, independent instance IDs, Save As to another directory,
  quit/restart/reopen, resource relocation/missing/changed recovery, full
  admitted v3 and two-track v4, and explicit Apply. Record binary identity,
  installed resources, action receipts and software/physical evidence separately.
  Preserve existing launch/scene regressions. These are future gates, not results.

## Proposed exclusive leases and decisions

Controller pins post-Q1 base and freezes DTOs before dispatch. UI lease:
`apps/ultra/ui/alive.html`, `alive.css`, `alive.mjs`, `alive-workspace.mjs`,
new browser module and focused UI tests. Host lease, serial with Tasks 11/13:
`apps/ultra/src-tauri/src/session/desktop.rs`, `workspaces.rs`, affected owner
tests and any separately named history/persistence files. Packaging lease only
if needed: `apps/alive/src-tauri/tauri.conf.json` and explicitly enumerated
resource/catalog files. Integration-test files, native/GUI runtime and shared
build resources need their own exclusive controller lease; UI and host may
implement only against the frozen seam, with serial integration/review.

Controller decisions: exact device-load undo model; durable bundled-resource
representation and upgrade recovery; Enter on focused result/occupied cell;
and whether duplicate scans later empty cells or refuses when the immediate next
cell is occupied. Proposed policy above scans lower empty cells and never
overwrites; it intentionally differs from the bounded observed Ctrl+D result.
Recheck catalog admission, versioned API names and exact capacity after Q1.
