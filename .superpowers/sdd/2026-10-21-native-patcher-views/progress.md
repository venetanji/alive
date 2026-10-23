# SDD ledger — plan: docs/superpowers/plans/2026-10-21-native-patcher-views.md

Ruling: Continue in the existing dirty feature checkout, without commits — user explicitly authorized ongoing work and preservation; creating a clean worktree would omit the required prior uncommitted implementation.

| Tasks | Shared interface / consistency | Result |
| --- | --- | --- |
| 1 / 2 | Native descriptor, document_commit, document_history | Spec defines matching camelCase IPC fields. |
| 1 / 3 | View lifecycle, save, broadcasts | Root/child owner resolution and save snapshot are explicit. |
| 2 / 3 | Shared controller editor API and adopt/acceptDescriptor | Stable proxy will preserve existing mount consumers. |
| 1 | Tests vs implementation / files | Rust worker owns native admission and window layer. |
| 2 | Tests vs implementation / files | JS worker owns dedicated shared controller and tests. |
| 3 | Tests vs implementation / files | Root owns integration; desktop worker owns real hierarchy scenario. |

Task 1: in progress (/root/native_patcher_views).
Task 2: in progress (/root/shared_patcher_controller).
Task 3: in progress. Document session regressions first fail 3/9 for missing shared descriptor adoption, pre-save flush, and broadcasts; implementation then passes 9/9.
Ruling: Imported Max owners use shared:true with an empty canonical tree while compatibility analysis remains explicit; this ensures imported children use the same owner architecture after acceptance.
Ruling: document_open_patcher accepts node=0 for root and optional reveal; pending revealNode in descriptor covers new-window event subscription races.

Task 1: implementation reviewed; native79 tests pass, numeric undo/redo retains revision after a reproduced reset regression. Additional native close-flush handshake in progress to prevent unsent optimistic edits bypassing dirty close.
Task 2: complete. Shared52/model/hierarchy tests pass. Independent review found startup handoff race and child load path reset; both reproduced red, fixed, scoped re-review61 tests pass and no remaining findings.
Task 3: integration JS250 initially pass; required contracts pass; browser72 pass before static import/close additions. Release build passes. First desktop run passes startup/forwarding/save/dirty close, then native chooser location shortcut fails. Desktop worker investigates keyboard focus without guessing a product fix.
Ruling: Complete close-flush handshake in this phase — independent views can hold queued edits; native canonical dirty alone is insufficient during OS close. Cost is a bounded additional IPC lifecycle and associated tests.

Task 1: complete; final Rust87 pass/1 existing private-audio ignored at `/tmp/ultra-native-views-final-rust.log`. Added owner-wide descriptorRevision for runtime-only/save metadata ordering, without changing authoring CAS. Close-flush cancellation covers all members, including acknowledged and late-ready views; native new-child creation pauses during owner close.
Task 2/3: independent close review reproduced swallowed edit admission failure and stale ready-member set. Shared barriers now block new authoring and retain edit/history failure through close flush. Listener registration precedes readiness; early flush/cancel waits for shared-controller adoption. Ordering/handoff/history regressions observed red then green. Final JS265 pass at `/tmp/ultra-native-views-js-final.log`; browser72 pass at `/tmp/ultra-native-views-browser-final.log`; required contracts pass at `/tmp/ultra-native-views-contracts-final.log` (final subsequent history change covered by focused and full JS).
Desktop investigation: intermittent chooser failure was private-X focus remaining on parent; explicit accessibility Files focus fixes harness, stress30/30. Separate inspector visibility/diagnostic expansion/window readiness assumptions corrected in desktop harness. Production UI was not changed to mask these harness failures. Final release/native desktop rerun pending.
Independent final native/controller re-review: no remaining findings; real rejected-admission reproduction now sends error acknowledgement, holds authoring barrier and restores editing on matching cancellation.

Task 3: complete. Final release build exits0 (`/tmp/ultra-native-views-build-final.log`). Final full private native document wrapper exits0: `/tmp/ultra-native-views-final-20261022-0027/documents-result.json` and `startup-result.json` passed. Actual child windows, shared edits/history, whole-tree child Save/reopen, console source reopening, child detach/deletion and root Cancel/Discard all verified. Runtime remains r1 and captured peaks `[0.0625,0.05624999850988388]` through view lifecycle; owner close leaves other root `[0,0.02500000037252903]`. Startup covers32 secondary deliveries. Final AT-SPI failure was reproduced with app alive and fixed by skipping defunct lookup nodes, matching existing base helper. All private test processes cleaned.
Phase complete; overall all-Max/all-help goal remains active and whole-help conformance remains0/2103. Next object/help dependency batches documented in `.impeccable/review/max-fidelity-20261021/next-objects.md`.
