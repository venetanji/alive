# Clip Journey Fix Round 1: Reveal The Audio Settings Opener

Source base: `1194faff81170fe57d7283fac04488233610cfcd` (apps/test blobs remain
identical to `729dc9a`). Complete the read-only launch diagnostic report before
editing source. Original reviewer approves the selected-clip routing, but the
complete original journey GREEN requirement remains open. This is an explicit
scope extension based on the next isolated failure, not a retrospective pass.

## Confirmed New Failure

The one observed original run passes stopped Launch and all clip/shared-source
recovery assertions, then fails `check_alive_observability.py:153` because
`Save Alive audio settings` is absent. Its original screenshot/tree and
bounded failure snapshot show Audio details expanded, the audio-settings
opener unexpanded at [1093,768,95,27], and no settings panel or Save/Close
controls. The opaque expanded footer diagnostics covers that coordinate.

The shared-shell helper collapses diagnostics before device/clip/track/mixer
actions. It does not classify `Alive audio settings` as a surface needing that
preparation. The qualification loop's original unconditional Audio details
toggle opens diagnostics after the helper previously collapsed it. The next
original pointer action consequently hits the overlay instead of its opener.
Parent independently checked the captured state, screenshot and original
qualification code. Native-window ownership alone cannot detect this DOM
overlay. Earlier stopped-launch failure has a separate, unproved cause and
must retain that attribution.

## Required Source Correction

In `apps/ultra/tests/alive_workspace_navigation.py`, include the exact
`Alive audio settings` opener in the existing overlay-clearing surface
classification. Reuse the established conditional visible Audio details click.
Keep the original opener click; do not open the sidebar by a test hook or
synthesize a hidden click. Preserve all existing classifications, scope guard,
hosted-editor behavior, original journey actions/order/assertions/waits,
recording/resource bounds and every product/native source byte.

Do not route the settings Save/Close controls by silently opening their panel;
their presence remains a real assertion of the original opener's success.
No retry, extra arbitrary delay, automatic musical edit, dialog workaround,
product rebuild or unrelated test. Use the retained new failure as RED, with
the diagnostic driver's extra observations and their overhead explicit.

Run one full original `check_alive_observability.py` journey through the
existing wrapper after this source correction, without the temporary
diagnostic driver or its before/after snapshots. This checks the original
stopped-launch assertion and all late qualification/report/Quit gates. Reuse
the original pinned app/library and existing command/bounds. Retain exact
commands/exits, original reports/capture/metadata and before/after source,
fixture and binary hashes. Syntax and focused preservation checks are
appropriate; no new tests mirroring the name condition and no broad suites.
If a distinct failure appears, isolate/report it without expanding again or
weakening the original assertion.

## Handoff

You alone own targeted helper source/index. Parent owns docs/PR/evidence. No
subagents, settings-file changes, pushes or user-desktop launches. Keep raw
earlier failures untouched. Evidence goes in
`/tmp/alive-workspaces-clip-navigation-fix1`; append fix results to
`ci-clip-navigation-report.md`. Commit only the helper correction, freeze
source/index and report exact commit, results, provenance and honest limits.
Original reviewer will perform scoped re-review. Full original GREEN, earlier
launch root-cause attribution and final-head CI are distinct claims.
