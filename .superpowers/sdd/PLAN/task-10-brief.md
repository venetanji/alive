### Task 10: Piano Roll And Pending-Edit History

After M2 acceptance, make the existing single-clip SVG interactive without a
new audio ABI. Add/select/move/resize/delete notes, velocity and keyboard edits
on a fixed 1/16-note grid (0.25 quarter-note beat). Preserve imported off-grid
offsets; validate rounded-frame overlaps and reject truncating length changes.
Use pointer capture, stable gesture geometry and cancellation; one gesture is
one transaction. Keep precise numeric fields and keyboard access.

Rust owns focused pending-musical-edit history, bounded to 64 entries and 8 MiB
combined payload. `alive_edit` and `alive_history` authenticate generation and
draft revision; stale requests preserve state. Route existing musical fields
through this gate. Undo merges accepted live bases/bypass/mixer by instance ID.
Successful Apply/Discard/New/Open/structural change clears the scope; direct
failure preserves it. An explicitly accepted Apply/Discard remains a scope
boundary if a later enclosing file/Quit action is canceled or fails. Keep Ultra
undo unchanged. Test gestures, cancellation, off-grid
rounding, ownership and failed Apply, then actual native edit/play/save/reopen.
Detailed recommendations: `.superpowers/sdd/PLAN/task-10-workflow-design.md`
and `task-10-reconciliation.md`; this task has no clip-bank or capacity increase.
