# Task 1 Independent Review

## Spec Compliance

**Verdict: Issues found.** The transitional Session shell meets the requested layout and workspace-navigation scope, but detail navigation can publish unfinished edits. This violates the local-navigation/draft-preservation behavior asserted by the new detail-toggle test and intended by the shared shell. Finding I1 must be fixed before this task passes.

- True Session columns, four vertical slots, per-column mixer and right-aligned scenes are implemented in `apps/ultra/ui/alive.mjs:155`, `apps/ultra/ui/alive.mjs:200`, `apps/ultra/ui/alive.css:17` and `apps/ultra/ui/alive.css:24`. The two viewport browser cases verify eight columns, four matching scene/slot rows, internal scrolling and access to track 8 in `apps/ultra/tests/ci/alive-chain.spec.mjs:111`.
- The shared browser, top transport, bottom Clip/Devices detail, secondary inspectors and separator appear in `apps/ultra/ui/alive.html:12`, `apps/ultra/ui/alive.html:21` and `apps/ultra/ui/alive.html:24`. Resize uses pointer capture, keyboard limits and Escape/cancel restoration in `apps/ultra/ui/alive-workspace.mjs:25` and `apps/ultra/ui/alive-workspace.mjs:34`.
- Session remains the default. Arrangement is explicitly unavailable and contains no fabricated placement/waveform data in `apps/ultra/ui/alive.html:19`; the surface context accurately limits Task 1 in `.impeccable/surfaces/alive-session.md:16`.
- Plain Tab navigation excludes interactive ancestors and all requested modifiers in `apps/ultra/ui/alive-workspace.mjs:39`. Workspace switching does not invoke native commands, rebuild controls or replace model selection: `apps/ultra/ui/alive-workspace.mjs:27` only changes presentation state. Existing command invocation signatures remain unchanged in `apps/ultra/ui/alive.mjs:15`.
- Native clip launch/selection remain separate controls and retain original stable IDs and receipt logic in `apps/ultra/ui/alive.mjs:155`. The diff adds grouping/data attributes rather than changing command payloads. Original native/browser assertions remain; native harness changes navigate inspectors and restore piano focus before the original keyboard assertions in `apps/ultra/tests/check_alive_desktop.py:489`.
- No Rust/C++ contracts, native runtime, examples, unrelated Ultra design context or parent-owned project documents appear in the nine-file diff.

**Cannot verify from this diff alone:** Actual audio continuity, native editor lifecycle, build asset embedding and visual capture quality require retained runtime evidence. I checked the existing 500/500 UI log, 11/11 browser log, final native report and original-journey report without rerunning them. Final native evidence records unfinished-gain preservation, editor opening, advancing audio, zero rejections/stream errors and Quit; the original journey records pending-history/Quit preservation. `provenance.json` pins source commit `238c427708a0de9790a4c8e5d95aa06045b1cac5` and explicitly distinguishes the original journey before the CSS-only header correction. Parent supplied final screenshot inspection. These establish Task 1 evidence within their reported software-audio limits; Arrangement/audio product acceptance remains outside this task. Red-before-green chronology is not independently established by a source diff.

## Strengths

- `apps/ultra/ui/alive-workspace.mjs:2` separates presentation state from the native model and keeps existing editor nodes mounted, making the workspace-navigation boundary easy to identify.
- `apps/ultra/tests/ci/alive-chain.spec.mjs:111` tests actual geometry at both requested viewport sizes, including access after scrolling; it does more than assert class names or static markup.
- `apps/ultra/tests/ci/alive-chain.spec.mjs:137` checks three unfinished-gain round trips and exactly one later intentional mixer commit. The maximum-height and header-content checks address concrete discovered failures.
- `apps/ultra/tests/alive_workspace_navigation.py:16` adapts real accessibility navigation while retaining the original journey's behavioral assertions. The report and provenance clearly separate final focused native evidence from the preceding full native journey.

## Findings

### Critical

None found in this task's diff.

### Important

**I1. Detail navigation commits an unfinished device/note edit.** `apps/ultra/ui/alive-workspace.mjs:31` and `apps/ultra/ui/alive-workspace.mjs:33` hide the active detail subtree without parking its focused input. Only the Session-to-Arrangement path calls `park()` (`apps/ultra/ui/alive-workspace.mjs:27`). Preventing pointer focus transfer at line 30 does not prevent the browser's change/blur when the subtree becomes `display:none`. Consequently a presentation action sends a native mutation.

Focused Chromium reproduction at 1280x800:

1. Open Devices, fill `Cutoff base` with `1717` without blurring it, click Clip, then return to Devices. This emits `alive_base` with `{instanceId:'instrument-0', key:'cutoff', value:1717}`.
2. Fill `Note 1 pitch` with `73` without blurring it, then collapse Detail. This emits `alive_edit` with label `Edit note` and the changed pitch.

Reproduction: `/tmp/alive-task1-review-detail.mjs`; raw result: `/tmp/alive-task1-review-detail-result.json`. The fixture intentionally returns its unchanged snapshot, so its displayed reset is not evidence of a native application data-loss outcome; the unexpected mutation itself is established. The new `apps/ultra/ui/alive-dom.test.mjs:54` detail-toggle test misses this because its synthetic focus/blur implementation does not generate browser change events and the changed input is never focused.

Park/suppress and restore unfinished inputs for each detail subtree before Clip/Devices switching and Detail collapse, and protect restored values from normal snapshot polling where necessary. Add a focused browser regression asserting zero native mutations across repeated hide/show trips and exactly one commit after a later intentional user blur/change, including device-base and clip/note fields.

### Minor

None additional. Existing compiler/private-display warnings are disclosed baseline conditions, not new findings from this task.

## Checks And Scope

- Read the brief, implementer report, binding design and retained owner PR comment before reviewing the exact `c511f14..238c427` diff. Initial tool output was truncated; recovered the omitted diff ranges. Did not rerun git or inspect unrelated source.
- Named risk: hidden detail inputs might bypass Session-only parking. Read only the otherwise cut-off `numeric()` handler in `apps/ultra/ui/alive.mjs:19` to identify its native change path; checked the unchanged Playwright config to reuse its sandboxed Chromium/server setup. Ran only the focused reproduction above, using the existing example as a fixture. No suite reruns.
- Existing evidence inspected: `/tmp/alive-workspaces-task1/full-ui-final.log`, `/tmp/alive-workspaces-task1/browser-header-final.log`, `/tmp/alive-workspaces-task1/provenance.json`, `/tmp/alive-workspaces-task1/native/native-report.json`, `/tmp/alive-workspaces-task1/original-final/native-session-report.json`.
- Checkout source, index, HEAD and parent documents were untouched. This review document is the only repository file written by the reviewer.

## Assessment

**Task Quality: Needs fixes.** The layout and workspace controller are appropriately scoped, with strong browser/native evidence and preserved command contracts. The detail input lifecycle leaves a reproducible hole in the same no-mutation navigation guarantee already enforced for Session gains; fix I1 and verify that focused case before approval.
