# Task 10 Integration Notes After Task 8

Design only, 2026-10-24. Basis: completed Task 8 `edd7165`, its report and current
`session/desktop.rs`, Task 10 brief/workflow design/reconciliation. Task 9 remains
the sole active source mutator. No source/PLAN/Git changes or tests accompany
these notes. Task 10 remains session-v2, one clip per track and existing native
v2; no clip-bank/ABI/schema redesign is needed.

## Existing Contracts To Reuse

`Control` owns `draft: Option<Session>`, `generation`, host, driver, dirty/path
and authenticated editor bindings under the existing Desktop mutex. Snapshot
already supplies `document`, `draft`, `generation`, native `StateV2` and
`deviceInstances[instanceId] = {index, track, manifest}`. Prepared numeric indices
are state lookup only; musical automation retains instance ID/parameter key.

`musical_draft` already rejects format, track identity/order and complete chain
reference/identity/hash/order changes, then merges accepted live fields. Its
current checks cover text/count limits, not all musical ranges or rounded-frame
overlaps. Extend/factor score validation for Task 10 rather than treating this
helper as full piano-roll admission. Keep final source/hash/graph/native-density
preparation at Apply; a failed Apply must retain the editable draft/history.

`install` increments generation and clears editor bindings/draft only after host
installation succeeds. Keep this editor-generation boundary. Undo/redo and
ordinary musical edits must not reinstall graphs, stop audio, advance generation
or close editors. `ui_lock` remains nonblocking during native dialogs.

## Proposed Command And Snapshot Envelope

Use the existing Tauri flat camelCase argument convention. Proposed Rust command
signatures, omitting injected window/state arguments:

```text
alive_edit(document: Session, label: String,
           generation: u64, draft_revision: u64) -> Result<Snapshot, String>
alive_history(direction: HistoryDirection,
              generation: u64, draft_revision: u64) -> Result<Snapshot, String>
alive_apply(generation: u64, draft_revision: u64) -> Result<Snapshot, String>
alive_discard(generation: u64, draft_revision: u64) -> Result<Snapshot, String>
```

```js
invoke("alive_edit", {document, label: "Move notes", generation, draftRevision});
invoke("alive_history", {direction: "undo", generation, draftRevision});
invoke("alive_apply", {generation, draftRevision});
invoke("alive_discard", {generation, draftRevision});
```

HistoryDirection is a strict lowercase `undo | redo` enum. Labels are bounded
plain text (recommend nonempty after trimming, <=64 UTF-8 bytes, no control
characters), never HTML or an authority token. All four commands authenticate
the actual main window, then check both versions under the Desktop mutex.
Hosted editors retain only their existing authorized per-instance controls.

Add `draftRevision: u64` and this additive field to Snapshot:

```text
history: {
  canUndo: bool, canRedo: bool,
  undoLabel: string | null, redoLabel: string | null
}
```

Control owns the revision/history. Start revision at zero; advance once on each
successful non-no-op edit, undo, redo, explicit Apply/Discard scope boundary,
successful New/Open/structural installation, and reference-context relocation
by Save As. Keep it monotonically increasing rather than resetting on clears.
Generation continues to advance only at the existing successful install boundary.
Live base/bypass/mixer changes advance neither musical revision nor history.
Rejected/stale actions change neither; refreshing `alive_current` supplies the
authoritative draft and current revision. Empty undo/redo rejects harmlessly.

An identical musical edit is a no-op: no entry/revision/redo invalidation. Perform
identity, range/target/overlap and history-capacity validation before publishing
the new draft/history. A snapshot-read failure must not be mistaken for a
rejected edit after silently committing it; obtain necessary snapshot state
before the edit commit, or explicitly recover an already committed result.

Replace current `alive_apply(document, generation)` staging: Apply must apply
the authoritative retained draft at the supplied revision, not introduce another
unrecorded document. Remove registered `alive_draft` as a writable bypass and
update its callers during Task 10; if a compatibility alias is necessary, it
must require the revision and delegate to the same edit/discard gate. Old
generation-only calls must not silently bypass history.

Add generation/draftRevision preconditions to main-window file/structure request
envelopes when integrating Task 10, checked before their work under the mutex.
Their internal accepted Apply/Discard steps use Control directly, not the stale
revision originally supplied to the enclosing file action. WM close continues
through the existing main-window close-request/file-Quit flow.

## Focused History And Transactional Gestures

Store bounded before/after **musical projections**, not full prepared sessions:
title, tempo, lengthBeats, loopEnabled, and per-track ID/name/notes/automation.
Track/device identities and chain/reference order authenticate the current scope
but are not undoable payload. Exclude bases, bypass, mixer, graph/patch/runtime,
editor bindings, file origin/path and UI selection. Use at most 64 entries and
8 MiB combined before/after serialized musical payload across undo and redo;
count labels as overhead too. Allocate/evict under control ownership only.
Reject an entry that cannot itself fit before mutating state; evict oldest
entries otherwise. A new successful non-no-op edit drops redo atomically.

The current editable score is `draft ?? document`. Capture it with generation,
draftRevision and stable viewport geometry at pointer-down. Preview the gesture
locally without native staging. Pointer-up sends one final edit; pointercancel,
Escape or lost gesture context restores the authoritative score without history.
Selection alone does not dirty, play or create an entry. Serialize renderer
musical commands so each uses its predecessor's returned revision; do not send
two independently based documents with the same revision.

Keep the established 0.25-beat grid, off-grid displacement preservation, pitch
bounds, velocity 1..127, rounded-frame same-pitch overlap checks, and rejection
of truncating length changes. Numeric/table/tempo/length/automation edits share
the same command/history gate. Do not continuously send invalid partial numeric
input. One velocity gesture is one transaction. Keyboard shortcuts apply only
to the piano-roll editing context, never text inputs or Ultra editor undo.

Polling may update native meters and latest live controls during a gesture;
it must not replace the gesture's geometry/draft with an older response. A new
generation/revision invalidates the gesture; cancel/refetch rather than applying
indices to another note list. Task 10's v2 notes need no new persistent IDs:
selection can be revision-scoped local indices, invalidated/remapped after edits.
Before file/structure/Apply/history commands, settle an active gesture explicitly:
recommend canceling an unfinished drag, then operating on the last committed
draft. A late pointer-up must not commit after that scope boundary.

## Live Merge, Dirty State And Scope Boundaries

Materialize undo/redo onto the **current** canonical session structure, then use
the existing `merge_live`. Device bases and bypass merge by instance ID within
their owning track; mixer gain/mute/solo merge by **track ID**, not device ID.
Do not merge by path, manifest ID, chain position or prepared device index.
Same-source effect instances must retain different accepted live values.
Rejected native base/bypass/mixer queue requests never become merge sources.
Reapply this merge before Apply as Task 8 already does.

Normalize a restored musical projection equal to the prepared one to draft=None,
while retaining redo. Snapshot dirty stays `control.dirty || draft.is_some()`;
undo must not clear dirty from accepted live controls. Saving/Save As with no
draft need not clear redo/history: projections exclude relocated device paths.
Successful path/reference relocation advances draftRevision to invalidate old
full-document gestures but does not close the history scope or device editors.

| Operation / outcome | History and draft effect |
| --- | --- |
| Successful edit/undo/redo | Commit one revision atomically; preserve live state; no native install |
| Direct failed edit/undo/redo/Apply | Preserve draft, entries, cursor and revision; report error |
| Explicit successful Apply | Keep Task 8 stopped prepare/install; clear history/draft and advance revision at successful commit |
| Explicit Discard | Clear pending draft and both stacks; advance revision; do not roll back live controls |
| Successful New/Open or structural install | Clear scope after successful installation; preserve Task 8 editor-generation handling |
| Failed prospective Open/dependency check | Existing prevalidation occurs before draft resolution; preserve draft/history |
| Canceled picker or dialog before any accepted scope boundary | Preserve draft/history |
| Save/Save As without an accepted Apply/Discard | Preserve musical history; update saved dirty/path context only on success |
| Transport/audio/editor open-close/live knobs | Preserve focused musical history |

Structural commands keep Task 8's stopped requirement and reject while a draft
exists. They do not automatically discard history. After explicit resolution,
successful effect add/remove/reorder/replace or whole-track instrument removal
clears the scope; failed preparation/install/canceled picker does not. Preserve
the established instrument-remove meaning: remove its whole track, not just the
instrument. Reorder retains lane targets; removal/replacement uses Task 8's
explicit affected-instance lane deletion. History cannot resurrect removed IDs.

Parent ruling for the existing multi-dialog file flow: **successful explicit
Apply/Discard clears history immediately, even if a later enclosing file/Quit
dialog cancels or fails.** These are independently accepted user operations.
Do not implement outer transactional rollback. Thus Apply edits -> Cancel at
the unsaved-session dialog leaves the edits applied and the history cleared;
Discard edits -> canceled save picker leaves them discarded. Conversely, direct
failed Apply and prospective Open failure before draft resolution preserve
history. Never clear merely because a file action was requested. Refresh the
authoritative snapshot even when a later file action returns None/Err, because
an earlier accepted resolution may have changed generation/draftRevision.

## Recommended Focused Tests

1. Main-only authorization; stale generation/revision; two edits based on one
   revision; identical no-op edit; old draft/Apply payload cannot bypass history.
2. One drag/velocity gesture produces one entry; Escape/pointercancel/context
   change produces none; scroll/viewBox conversion, stable pitch viewport,
   off-grid edits and tempo-rounded overlap/length-truncation rejection.
3. Undo/redo and eviction/oversized-entry rejection; redo invalidation; undo to
   baseline clears draft but retains redo; invalid commands preserve full state.
4. Interleave edits/undo with different bases/bypass on same-source instrument
   and effect instances and with mixer changes. Preserve accepted values by
   instance/track ID; native queue rejection must not enter saved/history state.
5. Failed musical preparation/source/native Apply preserves history; successful
   Apply clears once and keeps existing editor-generation/close behavior.
6. Prospective missing-source Open preserves history before dialogs. Separately
   test successful explicit Apply -> outer Cancel, explicit Discard -> canceled
   save picker, and failed Apply -> no clear. Refresh UI on None/Err outcomes.
7. Save As relocation with redo retained; stale pre-relocation document rejects.
   Successful structure changes clear; blocked/failed/canceled ones preserve;
   instrument removal and effect-scoped lanes retain Task 8 behavior.
8. Existing native file/Quit and nonblocking-dialog tests; actual release
   piano-roll edit/undo/Stop/Apply/play/save/reopen with the selected effect
   editor open. Native ABI/audio regression coverage remains unchanged.

No new product ambiguity remains after the parent file-flow ruling. These are
implementation recommendations for Task 10 after M2 acceptance, not changes to
the currently active Task 9 UI work.

Parent carry-forward from Task9 screenshot inspection: existing toolbar copy
says musical edits require stopped transport, although edits can be drafted
during playback. While adding the piano roll/history controls, say that
Prepare/Apply requires stopped transport. Preserve the explicit prepared-versus-
draft automation ownership text. Update the public README and session contract
for the interactive editor, revision gate and focused history scope.
