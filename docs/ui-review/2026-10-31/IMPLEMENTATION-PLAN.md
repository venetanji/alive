# Alive guided UI implementation plan

Goal: implement the reviewed layout in small Terra-6.1 cycles without changing native audio/DSP behavior.
Spec: IMPLEMENTATION-BRIEF.md. Visual reference: Alive-layout-01.html. Command evidence: Live-reference-actions.json.
The prototype is not production code. Preserve native command ownership and all supported features. Unsupported mock features must not appear operational in the real app.

## Cycle discipline
- One independently reviewable slice per cycle; fresh source review before edits.
- Write a focused failing assertion, implement, run targeted and adjacent regressions, inspect actual rendered output, commit, push, stop for parent review.
- Keep raw Live screenshots private. Commit original design artifacts, derived documentation, tests and original app screenshots only.
- No native/audio changes, no merge, no release/deploy, no broad dependency upgrades. Do not weaken tests to get green.
- Observe and document baseline failures separately. Browser unavailable is a blocker to visual acceptance, not a pass.
- Each report gives exact head, changed files, tests/results, screenshots, limitations and next proposed slice.

## Initial checkpoint — parent
- [x] Commit original HTML, extracted menu inventory, consolidated design requirements and this plan on a new branch from verified main.
- [ ] Open new draft PR and verify exact remote head.

## M1a — Shell regions and Help
Files: apps/ultra/ui/alive.html, Alive-owned shell/workspace CSS/controller, focused frontend tests, apps/ultra/tests/ci/alive-chain.spec.mjs. Inspect current names before editing.
- [ ] Record baseline Node suite and representative browser fixture screenshots.
- [ ] Map existing native-backed controls versus reference-only controls; do not add unsupported behavior.
- [ ] Test Help as a genuine lower-left panel, independent hide/show with ? outside editable fields; preserve focus, drafts, navigation and no native mutation.
- [ ] Implement only this shell/Help slice; keep existing Clip/Device functions intact.
- [ ] Test 800x600, 1280x800 and 1440x900, including browser/detail hidden states, keyboard focus and repeated toggles.
- [ ] Commit/push and stop. Parent reviews before M1b.

## M1b — Lower panel topology
- [ ] Independent footer Clip/Device toggles, full-width Clip above Help-left/Device-right when both open; neither/single/both states, resize/maximize/restore.
- [ ] Tests assert rectangle ownership, no overlap, no draft loss, no musical commands from navigation. Commit/review gate.

## M2 — Track layout in separate slices
- [ ] Fixed controls and synchronized clip-only vertical scrolling; horizontal regular-track bank, right-docked returns/Master.
- [ ] Compact mixer/send geometry and transient thin scrollbars; responsive per-track width with hover-only bracket handle and narrow-track reflow.
- [ ] MIDI-only dots versus mono/stereo meters driven by real capabilities. Recording/arm/routing examples stay disabled if backend absent.
- [ ] Test min/intermediate/wide widths, many tracks, hide/show sections and preserved alignment. Each bullet is a separate commit/review cycle.

## M3 — Browser
- [ ] Real catalog-backed categories/device/preset hierarchy, filter/tag/preview layout with honest capability flags.
- [ ] Preserve existing validated drag/drop and rejection semantics. Test hide/reopen, search, focus, long names, empty/unsupported states.

## M4 — Clip/Device detail
- [ ] Context-aware horizontal vs vertical Clip options, miniature footer overview, independent views and capability-backed expanded device surfaces.
- [ ] Preserve MIDI/audio distinction, source/region identities, drafts, device ownership and native accepted edits.

## M5 — Menu and shortcuts
- [ ] Shared command registry maps real commands to menus, shortcuts and contextual Help; distinguish focus from visibility actions.
- [ ] Snapshot disabled states are not permanent capability facts; unsupported functions never execute simulated production success.
- [ ] Verify text-field shortcuts, Escape/outside dismissal, keyboard navigation, state updates and disposal.

## M6 — Final acceptance
- [ ] Full current Node UI/controller/component suite; applicable browser regressions; supported native UI smoke without altering frozen audio libraries.
- [ ] Compare populated Session/Arrangement and panel-state matrix against latest design; verify narrow widths, horizontal tracks, return-bank alignment, draft preservation and no accidental audio changes.
- [ ] Independent final review and exact-head remote/CI inspection. Report passed, failed and unrun stages separately.
- [ ] Notify user branch/PR ready to pull with evidence and any unsupported features. Do not merge.
