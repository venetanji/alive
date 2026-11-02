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
- Local correction, 2 November: qualify the fixed Device/Help row separately from the resizable Clip height; consolidate the Clip header, keep Save inside File, restore compact footer display controls, and test real menu ownership, draft preservation and resize/restore. This is the current bounded slice; broader command wiring and native/provider work remain separate. Execution and exact-build evidence: `../2026-11-02/SHELL-CORRECTION.md`.
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
- [x] Keep supported mixer controls pinned while the real four clip slots and scene rows scroll together; regular tracks scroll horizontally and Master remains docked. The present engine has no return-track objects to dock.
- [x] Compact supported mixer controls, thin transient scrollbars, per-track pointer/keyboard width control with hover-only bracket, and narrow-track reflow. Keep Browser results visible when upper space is short.
- [x] Correct same-source Arrangement occurrence draft identity separately from shared Audio source identity; keep the Launch selector visible in a short Clip inspector.
- [ ] Add actual return tracks, sends, routing/monitor/arm and recording only when the native contract supplies those capabilities. The approved staggered send geometry remains the design for that later capability work.
- [ ] MIDI event activity and mono output observations are not exposed by this build. An instrument-free MIDI track says MIDI only instead of showing simulated activity or an audio fader; tracks with actual audio output retain stereo observations.
- [ ] Parent review of min/intermediate/wide widths, many tracks, resize and preserved alignment remains the next gate; subsequent catalog and menu batches are separate.

## M3 — Browser
- [x] Preserve catalog-backed categories and show expandable device rows with keyboard navigation, passive selection, search and honest unavailable-preset messaging. Preserve qualified device loading and validated drag/drop.
- [x] Keep the Browser usable at compact heights and preserve selection, expansion and drafts through search, hide/reopen and resize. Correct the Session minimum on detail resize and constrain track action menus to the visible track bank.
- [ ] Preset parity remains blocked on the native Browser contract: catalog entries expose device metadata and qualification but no preset names or values, and the host manifest omits presets. There is no Browser operation to atomically load/apply a preset. Do not synthesize preset actions from the mockup.
- [ ] Tags, tag filtering and Browser audio preview also lack catalog/host contracts; do not present simulated working controls. Parent review of Browser hierarchy and the 800×600 compact state remains the next gate.

## M4 — Clip/Device detail
- [ ] Extend the M1b adaptive Clip options, footer overview and independent views with capability-backed expanded device surfaces when supported.
- [ ] Preserve MIDI/audio distinction, source/region identities, drafts, device ownership and native accepted edits.

## M5 — Menu and shortcuts
- [x] Add the application menu bar and compact existing global toolbar. A command inventory supplies menu labels, shortcuts and contextual Help while existing controls own execution. Navigate actions focus a workspace; View actions toggle visibility.
- [x] Classify all 140 reference rows in Live-reference-actions.json: 20 supported equivalents (with scope/format caveats), five unavailable, and 115 proposed or unverified. The embedded copy in the original mockup remains a historical capture. No unverified command is presented as working; snapshot-disabled state is not a permanent capability statement.
- [x] Guard shortcuts in editable and modal contexts, leave browser command chords to the browser in preview, and cover menu dismissal, keyboard navigation, dynamic state and draft preservation. Phase nudge remains absent because the native contract does not expose it.
- [ ] Parent visual review of menu/toolbar density, keyboard operation and the Clip inspector at 800, 1280 and 1440 remains the gate. Full CI, including native desktop journeys and the complete Ultra browser suite, must be reported separately from selected Alive regressions.

## M6 — Final acceptance
- [ ] Full current Node UI/controller/component suite; applicable browser regressions; supported native UI smoke without altering frozen audio libraries.
- [ ] Compare populated Session/Arrangement and panel-state matrix against latest design; verify narrow widths, horizontal tracks, return-bank alignment, draft preservation and no accidental audio changes.
- [ ] Independent final review and exact-head remote/CI inspection. Report passed, failed and unrun stages separately.
- [ ] Notify user branch/PR ready to pull with evidence and any unsupported features. Do not merge.

### Session 6 acceptance checklist
- Implemented UI: compact toolbar and menus, contextual Help, independently visible Clip and Devices, real source and rack controls, pinned Session mixer and clip scrolling, Browser search and qualified device loading. Selection and visibility are distinct from playback.
- Reference-only or unavailable: the mockup's complete Live toolbar and 140-action inventory are not a claim of parity. Browser presets, tags and preview, returns/sends, routing/monitor/arm/recording, phase nudge, multichannel and unsupported expanded device surfaces require their own native contracts.
- Native gate: baseline CI run 41233289513 passed UI and Chromium but failed the real desktop, Arrangement and Master journeys. Its native evidence showed an unavailable reorder target, a Source / Clip disclosure closed after source rename, and a Help output whose accessible name collided with a device button. A browser reproduction also showed the moved reorder action outside the rack viewport. Session 6 adds focused regressions and UI fixes; only an exact-head native run can establish whether all journeys now pass.
- Local native limit: the private software-only desktop startup could not launch WebKit's network helper at its compiled system path in this managed sysroot. No host security setting or WebKit sandbox was changed. The exact error and CI evidence are retained in the session report.
- Hardware: no physical audio hardware, recording or routing qualification was run. Software PipeWire and browser fixtures are not hardware evidence.

### Session 7 final gate
- The design is a supported subset, not Live parity: the reference inventory has 20 supported equivalents, five unavailable entries and 115 proposed or unverified entries. Presets, tags/preview, returns/sends, native routing/recording and unsupported expanded devices remain capability gaps.
- Exact-head CI on session 6 commit `3973c2418f99d8e79d15fe79f2f34b9d00f62e85` passed the UI and Chromium jobs and the native Master save/quit/restart journey. Its native desktop journey performed the first reorder but failed to establish a covering tooltip; the Arrangement journey advanced past source length but found no first note. Subsequent clip, resource and CPAL steps were skipped.
- The Arrangement source popup covers the Add note center in a reproduced browser state. The native journey now closes that popup through its disclosure before the real click; the browser test verifies both hit ownership and the resulting note operation. The tooltip test still requires a real native tooltip over the target and one admitted press/release.
- Final software CI and local checks must be reported against their actual commit. Physical audio hardware, recording and routing remain untested and require separate user-approved acceptance.

### Additional native diagnostic cycle
- CI run 41236658817 on `7893013442b05d657114ef86e494752d812e2fff` passed UI, Chromium and the native Master save/quit/restart journey. The native desktop journey performed its first reorder but could not establish the required covering tooltip; Arrangement created, saved and played the authored source, then observed Arrangement authority after track Stop where Session authority was expected. Clip observation, saved clips, resource bounds and CPAL loopback were skipped after the failures.
- The diagnostic fixture places the actual device-path hover near the private X screen edge and still requires the real tooltip window to own the reorder target before the existing native click. The Arrangement test records the original Stop pointer's native/accessibility hit path and the existing runtime receipt; it retains the Session-authority assertion. Native results for these changes must be established by their exact-head CI run.
- CI run 41268337709 on `1857fefa34a6d7d5a51f35abcb046b9df7f38326` passed UI, Chromium and Master but failed the native desktop tooltip precondition and the earlier Arrangement Delete placement assertion. The captured tooltip hover landed on the rack scrollbar; the fixture now aims at the top of the path label. Arrangement selection, independence and deletion clicks now record their actual native/accessibility hit paths before the unchanged history assertions.
- CI run 41269843274 on `8ae5debda1b83a3eab5cb8ca4c6b4e636e64266d` passed the full desktop/hosted-editor journey: a real tooltip owned the reorder target before Alive regained it for exactly one press/release. Arrangement's Delete click reached its intended accessible, but the saved document lacked the duplicate after the final Undo; Master did not create its requested first Cutoff automation point. The fixture now waits for each visible placement-history transition and admits those pointer actions only when both the native window and intended accessible own the point. Stop authority remains unmodified and must be verified by a subsequent exact-head run.
- Native Arrangement evidence on `98e04ac88064f20d68e9798c0d71da9f8cc67d1e` identified the Stop mis-hit: AT-SPI reported a 63-pixel Stop rectangle whose center belonged to the adjacent Return button. The Stop control is now icon-only with its accessible name retained, removing its overflowing visible label. A browser regression verifies the control fits and issues Stop; exact-head native verification remains required.
- CI run 41273141705 on `ae25b618ff2e014ce5b318db4240aa80fb42fdbb` passed UI, Chromium, desktop/hosted-editor and Master, but Arrangement stopped during Redo on a transient AT-SPI error while the application remained visible. The complete placement snapshot is now retried for bounded transient accessibility errors; persistent errors still fail and all placement/history assertions remain in force. Stop and the downstream native clip/resource/CPAL checks require a subsequent exact-head run.
- Browser fixtures and private software PipeWire are not physical hardware qualification. Do not mark the draft PR as full Live parity or complete hardware acceptance on their evidence.
