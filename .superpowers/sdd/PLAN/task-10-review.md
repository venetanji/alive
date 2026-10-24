### Spec Compliance

- Issues found: queued renderer edits can cross a successful structural scope boundary and silently edit another track. See Important finding at `apps/ultra/ui/alive.mjs:32` and `apps/ultra/ui/alive.mjs:289`.
- CannotVerify: actual release edit/play/save/reopen, editor resource behavior, and build-to-source provenance cannot be independently established from this diff. Controller should retain/check the final native receipt, resource receipt, build log and source association referenced in `.superpowers/sdd/PLAN/task-10-report.md:159` and `.superpowers/sdd/PLAN/task-10-report.md:211`. No GUI or reported green suites were rerun.

### Strengths

- `apps/ultra/src-tauri/src/session/desktop.rs:96` authenticates both versions before musical admission; `apps/ultra/src-tauri/src/session/desktop.rs:157` obtains native snapshot state before committing the edit. History and Discard use the same pre-read pattern.
- `apps/ultra/src-tauri/src/session/history.rs:31` bounds combined undo/redo payload and validates a prospective entry before dropping redo or evicting; its projection excludes live controls and paths. Tests at `apps/ultra/src-tauri/src/session/history.rs:55`, `apps/ultra/src-tauri/src/session/history.rs:68` and `apps/ultra/src-tauri/src/session/history.rs:78` exercise no-op/redo, relocation and byte/count bounds.
- `apps/ultra/src-tauri/src/session/desktop.rs:104` restores music onto current structure and merges live controls; `apps/ultra/src-tauri/src/session/desktop.rs:91` centralizes scope clearing. Accepted inner file resolutions remain boundaries even if outer dialogs cancel.

### Issues

#### Critical

- None found.

#### Important

- `apps/ultra/ui/alive.mjs:32` and `apps/ultra/ui/alive.mjs:289`: non-indexed queued edits capture a numeric track index but acquire generation/revision only when dequeued. The list guard applies only to `indexed` edits, and ordinary Add note has no gesture context. While an asynchronous Remove track is pending, click Add note on the still-visible original track; after removal, the queued edit uses the new versions and adds the note to the surviving track at the reused index. A focused DOM reproduction using the existing adapter delayed `alive_device`, removed Pulse (`track-1`), then released queued Add note: Harmony (`track-2`) changed from 12 to 13 notes, with `alive_edit` authenticated as generation 2 / revision 1. This violates origin-track ownership and scope-boundary cancellation despite passing the backend version gate. Capture a renderer scope token/generation for every queued musical intent, reject intents whose scope changed before execution, and address tracks by their originating stable ID. Preserve predecessor-returned revisions for ordinary same-scope edits. Add a focused regression covering successful track removal followed by queued Add note, and the corresponding New/Open boundary for global musical fields.

#### Minor

- `.superpowers/sdd/PLAN/task-10-report.md:103` and `.superpowers/sdd/PLAN/task-10-report.md:227`: reported verification output is not pristine: the build retains an unused `reserve_native` warning and native harnesses emit portal/display warnings. These are disclosed as existing/environmental noise and do not explain the Important finding, but the controller should retain that classification with the evidence rather than describe output as warning-free.

### Checks

- Read the supplied diff in chunks; the initial oversized output truncated its middle, so unread/truncated sections were recovered in smaller chunks. No Git commands, source changes, index/HEAD/branch changes, subagents or helper files were used.
- Named risk: factoring `compile_music` could omit rounded-frame overlap, truncation or disabled-lane validation. Checked the hunk's cut-off function body at `apps/ultra/src-tauri/src/session/prepare.rs:97`; same-pitch frame intervals, note end bounds and all automation lanes validate before retention.
- Named risk: undo could overwrite accepted live values or change automation identity. Checked the omitted `merge_live`/`same_chain` context at `apps/ultra/src-tauri/src/session/desktop.rs:60` and `apps/ultra/src-tauri/src/session/desktop.rs:72`; devices merge by instance ID within track, mixer by track ID, and chain identity/order/reference checks remain intact.
- Named risk: accepted inner Apply/Discard might be rolled back or omitted after canceled file actions. Checked the omitted `alive_file` continuation at `apps/ultra/src-tauri/src/session/desktop.rs:360`; it preserves accepted inner boundaries, while renderer finally-refresh covers None/Err outcomes.
- Ran one focused inline Node DOM reproduction for the unanswered queued-edit/structural-boundary doubt. Output: `{"remainingId":"track-2","remainingNotes":12,"editTrack":"track-2","editedNotes":13,"editGeneration":2,"editRevision":1,"notice":"Device updated. Start transport when ready."}`. No existing suite was rerun.
- Diff changes no native ABI or DSP implementation; runtime/audio ownership acceptance remains subject to the controller's retained native evidence.

### Assessment

- Task quality: Needs fixes.
- Reasoning: the Rust history/admission gate and focused gesture behavior are coherent, but renderer version acquisition currently authenticates an old user intent against a new structural scope. The reproduced wrong-track mutation blocks approval.
- Report path: `.superpowers/sdd/PLAN/task-10-review.md`.
