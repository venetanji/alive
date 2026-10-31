# Alive guided UI implementation plan

Goal: implement the reviewed layout in small Terra-6.1 cycles without changing native audio/DSP behavior.
Spec: IMPLEMENTATION-BRIEF.md. Visual reference: Alive-layout-01.html. Command evidence: Live-reference-actions.json.
The prototype is not production code. Preserve native command ownership and all supported features. Unsupported mock features must not appear operational in the real app.

## Cycle discipline
- Use independently reviewable, coherent batches; related layout and behavior may ship together after fresh source review. Stop for parent review after each batch.
- Write a focused failing assertion, implement, run targeted and adjacent regressions, inspect actual rendered output, commit, push, stop for parent review.
- Keep raw Live screenshots private. Commit original design artifacts, derived documentation, tests and original app screenshots only.
- No native/audio changes, no merge, no release/deploy, no broad dependency upgrades. Do not weaken tests to get green.
- Observe and document baseline failures separately. Browser unavailable is a blocker to visual acceptance, not a pass.
- Each report gives exact head, changed files, tests/results, screenshots, limitations and next proposed slice.

## Initial checkpoint — parent
- [x] Commit original HTML, extracted menu inventory, consolidated design requirements and this plan on a new branch from verified main.
- [x] Open new draft PR and verify exact remote head.

## M1a — Shell regions and Help (reviewed)
Files: apps/ultra/ui/alive.html, Alive-owned shell/workspace CSS/controller, focused frontend tests, apps/ultra/tests/ci/alive-chain.spec.mjs. Inspect current names before editing.
- [x] Record baseline Node suite and representative browser fixture screenshots.
- [x] Map existing native-backed controls versus reference-only controls; do not add unsupported behavior.
- [x] Test Help as a genuine lower-left panel, independent hide/show with ? outside editable fields; preserve focus, drafts, navigation and no native mutation.
- [x] Implement only this shell/Help slice; keep existing Clip/Device functions intact.
- [x] Test 800x600, 1280x800 and 1440x900, including browser/detail hidden states, keyboard focus and repeated toggles.
- [x] Committed and pushed as `4e415e983acf57c3f2e029c6509fea289bb57508`; parent review found no supported-native-size blocker. Carry the <=620px Browser/Help overlap into the panel batch.

## M1b — Lower panel topology
- [x] Include adaptive Clip options and the narrow-preview Browser/Help correction. Reviewed captures at 600x600 as preview hardening and at 800x600, 1280x800 and 1440x900 as supported sizes.
- [x] Independent footer Clip/Device toggles, full-width Clip above Help-left/Device-right when both open; neither/single/both states, resize/maximize/restore.
- [x] Tests assert rectangle ownership, no overlap, no draft loss, and no musical commands from navigation. Parent review remains the next gate.
- [x] Document device-specific expanded surfaces that lack an existing supported capability; do not simulate them.

Device expansion gap: the current saved-device presentation is embedded in the
rack and can open the selected device in Ultra. The current host manifest and
presentation surface do not expose a capability for a separate editor above
the rack. Keep that region deferred until a device supplies an explicit,
instance-owned expansion capability; no Wavetable-style control is implied.

## M2 — Track layout
- [ ] Fixed controls and synchronized clip-only vertical scrolling; horizontal regular-track bank, right-docked returns/Master.
- [ ] Compact mixer/send geometry and transient thin scrollbars; responsive per-track width with hover-only bracket handle and narrow-track reflow.
- [ ] MIDI-only dots versus mono/stereo meters driven by real capabilities. Recording/arm/routing examples stay disabled if backend absent.
- [ ] Test min/intermediate/wide widths, many tracks, hide/show sections and preserved alignment. Group related work into coherent reviewable batches.

## M3 — Browser
- [ ] Real catalog-backed categories/device/preset hierarchy, filter/tag/preview layout with honest capability flags.
- [ ] Preserve existing validated drag/drop and rejection semantics. Test hide/reopen, search, focus, long names, empty/unsupported states.

## M4 — Clip/Device detail
- [ ] Extend the M1b adaptive Clip options, footer overview and independent views with capability-backed expanded device surfaces when supported.
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
