# Native History Findings

Actual release Rust/Tauri/WebKit with sandbox enabled, private Xvfb+twm, physical XTest typing and pointer gestures, and test-only WebKit instrumentation. Instrumentation intentionally holds `document_history` before forwarding to real Rust IPC; it reads DOM and legitimate native descriptors without replacing native admission results. Audio remains off. This establishes native behavior under synthetic delay, not typical production IPC timing.

## P2: Rejected Numeric Draft Cannot Be Retried

Start with an original starter numeric object15 saved as150. Physically edit it to20, then:

1. Hold history IPC and click Undo.
2. Enable numeric editing, focus object15, select its value, type73, and press Enter.
3. Observe history-pending notice and visible73. Release history IPC.
4. Press Enter again without leaving the input. The draft remains visible73, but canonical native value is150, dirty is false, and the unsaved star is hidden.
5. Blur: input resets to150. Redo repeats the failure with canonical20.

| Snapshot | Canonical | Focused Display | Dirty | History |
| --- | ---: | --- | --- | --- |
| Baseline edit | 20 | unfocused20 | true | canUndo |
| Undo pending, Enter rejected | 20 | 73 | true | canUndo |
| Undo released, Enter retried | 150 | 73 | false | canRedo |
| Undo after blur | 150 | unfocused150 | false | canRedo |
| Redo pending, Enter rejected | 150 | 73 | false | canRedo |
| Redo released, Enter retried | 20 | 73 | true | canUndo |
| Redo after blur | 20 | unfocused20 | true | canUndo |

Only numeric admission in this sequence is baseline20; attempted73 is never admitted. The clean native descriptor with visible73 makes the rejected draft appear saved. `canvas-node.mjs:58` clears dirty/updates displayedValue before `canvas.mjs:311` swallows the history-barrier refusal at `canvas-shared.mjs:168`.

Evidence: `native-history-2/result.json`, `native-history-2/snapshots.json`, `undo-retry-enter.png`, `redo-retry-enter.png`. The snapshots retain actual authoring revisions and dirty/history flags. No Save was performed and the original starter file was not modified.

## P2: Drag Completion Throws Unhandled

While another Undo is held, physically drag object15's header. Actual WebKit global error instrumentation records `Error: Native history is pending. Wait before editing.` No movement commit occurs; canonical position remains(180,50). `canvas.mjs:302` clears drag before unguarded `moveMany` at line303, registered directly on pointer events at line435.

Native periodic polling restores the preview before the snapshot is captured. The synchronous DOM probe separately establishes that the displaced preview persists until another render. This native sequence follows the numeric probe's existing notice, so it does not independently establish absence of a new notice.

Evidence: `drag-before`, `drag-rejected`, `drag-after-release` entries and errors in `native-history-2/snapshots.json`.

## Existing Desktop Assertion

Physical creation of `+ 7` succeeds natively with params `{"numericmode":1,"rhs":7}`. An existing desktop check expecting only `{"rhs":7}` has a stale assertion. This does not invalidate the history findings.
