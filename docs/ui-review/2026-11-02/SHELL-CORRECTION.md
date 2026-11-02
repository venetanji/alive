# Local shell correction, 2 November 2026

Historical topology correction. The user rejected its visual fidelity; the
current build, screenshots and launcher selection are recorded in
[HTML-FIDELITY.md](HTML-FIDELITY.md).

The user's local clarification keeps Clip and Devices independently enabled.
When both are open, Clip spans the row above Help-left / Devices-right. The
bottom row has a fixed height; resizing Clip must not resize Devices. Returning
to Devices-only restores its default height. The Browser stays beside the upper
Session/Arrangement workspace. Save belongs inside File, and compact display
controls belong at the footer's right edge.

This correction is scoped to shell presentation and existing action access.
The original `Alive-layout-01.html` remains unchanged. Its SHA-256 is
`3c98147cd66cf83f962b403fe74d8641c43a91ec50c43c2d9bfb07948dfa46a3`.
The original study is still available at
`../2026-10-31/Alive-layout-01.html`; its title is Alive / Layout study 03.

## Bounded plan and implementation

1. Reproduce the reported Save, resizer and footer omissions with failing
   browser/structure checks. Check the actual branch and preserve unrelated
   work. Baseline for this slice: `9ae01fbd0fa9e58dffbff10a4fb24be05b972ee8`
   on `audit/pr12-native-20261102`, in `/tmp/alive-pr12-native-20261102`.
2. Separate remembered Clip height from the fixed 180 px Device row. Resize,
   maximize and pointer cancellation apply to Clip. Keep upper mixer controls
   pinned, clip-only vertical scrolling, horizontal tracks, hover-only brackets
   and narrow-track reflow. Keep Help independently hideable. Consolidate the
   duplicate Clip header into one contextual control row.
3. Move the actual Save control into File, retaining its existing handler and
   native acknowledgement. Update native test navigation to open File first.
   Put Clip/Devices, maximize/restore, collapse and Display options together at
   the footer's right edge. Browser and Help entries forward to existing owners;
   mixer visibility is local presentation. In/Out, Sends, Track Options,
   Crossfader, Performance Impact and Return Tracks remain disabled with reasons.
4. Verify keyboard, focus, drafts, all panel combinations, resize/restore and
   rejected native changes with the adjacent and full relevant suites. Build
   both native apps from the final source; select that pair in both launchers;
   inspect native output and runtime hashes at 800x600, 1280x800 and 1440x900.

The fixed rack keeps its guidance accessible without consuming a separate
visible text row. Device action titles continue to explain stopped-transport
and edit-pending guards; command failures still use the session status. Device
controls and their native owners are unchanged. Shared Ultra styles and engine
sources are unchanged.

## Verification record

Initial new regressions failed for Save outside File, Device resizing and
missing footer controls. Additional regressions caught Clip height being lost
on collapse and missing Display keyboard navigation. Both failures were fixed
at their shell owners. A first broad Chromium run was stopped after four layout
failures (61 passed, one interrupted, 256 unrun); preserve its log at
`/tmp/alive-shell-browser-full.log`. The refined focused run passed 14 cases and
failed the last-Tab popup dismissal. After its focus-out correction, the focused
keyboard test passed. These preliminary runs are not full acceptance.

The later diagnostic Chromium run finished with 321 passes and four failures:
wrapped piano controls intercepted Fit, empty slots lost Source / Clip, nested
source labels were hidden, and an old assertion expected the source popup to
cover Add note. The first three were corrected at their CSS owners. The last
assertion now proves Add note is reachable with the consolidated header both
before and after closing the source popup; it retains the actual native-command
identity assertions. The focused correction run passed all five cases.

Native probing also caught lost mixer and Browser visibility after repeated
popup navigation. The old focusout handler closed the popup when relatedTarget
was absent. Display options now checks the settled active element before
dismissing. Its missing-relatedTarget browser regression failed before that
correction and passed afterward. The first native run's lost mixer state is retained at
`/tmp/alive-native-shell-20261102`. A rerun with that fix restored both Browser
and mixers, then failed because the probe used the placeholder Search library
instead of the loaded native Browser's accessible name, Search browser. That
failed run is retained at `/tmp/alive-native-shell-final-20261102`; only the
probe label was corrected for the next run.

| Check | Result | Local evidence |
| --- | --- | --- |
| Fresh full Chromium, 2 workers | 325 passed, 0 failed, 0 skipped | `/tmp/alive-shell-final-gates.log` |
| Full UI Node | 668 passed, 0 failed, 0 skipped | `/tmp/alive-shell-final-node.log` |
| Full Python helper discovery | 144 passed, 0 failed, 0 skipped | `/tmp/alive-shell-helpers-verified.log` |
| Ultra debug build | Passed; existing Rust warnings retained | `/tmp/alive-shell-ultra-final-build.log` |
| Alive debug build | Passed; existing Rust warnings retained | `/tmp/alive-shell-alive-final-build.log` |
| Actual desktop entries and native shell | Both apps passed at all three sizes and repeated shrink/restore | `evidence/shell-correction/native-shell-results.json` |

The final native probe exited 0. It verifies the selected executable hashes and
mapped library in each running process, a fixed 180 px Help/Devices row while
Clip resizes, Device-only restoration, disabled Device-only maximize, repeated
Browser/mixer toggles, disabled Sends/Return Tracks, unchanged admitted gain
while preserving its unfinished numeric draft, Display arrow/Escape focus,
and Save inside File with a native acknowledgement plus staged-file mtime
change. Ultra reaches its native ready state at each size. The full shell
probe output is `/tmp/alive-native-shell-verified-20261102.log`.

Screenshots were inspected in Chromium and the native apps. Native examples:

| View | 800x600 | 1280x800 | 1440x900 |
| --- | --- | --- | --- |
| Clip above Help/Devices | [Capture](evidence/shell-correction/alive-both-800x600.png) | [Capture](evidence/shell-correction/alive-both-1280x800.png) | [Capture](evidence/shell-correction/alive-both-1440x900.png) |
| Fixed Devices-only row | [Capture](evidence/shell-correction/alive-devices-800x600.png) | [Capture](evidence/shell-correction/alive-devices-1280x800.png) | [Capture](evidence/shell-correction/alive-devices-1440x900.png) |
| Shared Ultra | [Capture](evidence/shell-correction/ultra-launcher-800x600.png) | [Capture](evidence/shell-correction/ultra-launcher-1280x800.png) | [Capture](evidence/shell-correction/ultra-launcher-1440x900.png) |

The [Display popup](evidence/shell-correction/alive-display-menu-1440x900.png)
opens upward from the footer and retains unavailable sections.
The [original cloud HTML capture](evidence/shell-correction/original-html-1440x900.png)
is included for comparison. Its reference-only musical controls remain a design
reference. At 800x600 both-open mode keeps the fixed rack and useful upper
mixer visible; the Clip interior scrolls to its remaining content. Closing
Devices or maximizing Clip provides more piano-editing space.

Browser verification retains Chromium's sandbox. Native launcher checks use
private Xvfb/DBus and software-only PipeWire, with no physical device or
audio-settings changes. This shell probe does not start audio.

## Build and launcher identity

The production source is `f827d1b17c22ed08a1f980cbdacbae9e49476501`.
Both apps were rebuilt sequentially from that clean tracked checkout, with
`cargo build --locked -j 2` and the matching native library. These are debug
builds. Main shell correction commit: `bb931b2df067b97193daea87e1eec83e43b5ea14`.
The following evidence-only changes do not alter the built UI.

Both **Alive (Test)** and **Ultra (Latest Build)** select
`/home/venetanji/.local/share/alive/builds/test-4a416239997e76aeec08`, through
`/home/venetanji/.local/share/alive/current-test`. Existing windows retain their
old process. The durable selection rule is in `apps/AGENTS.md`.

| Artifact | SHA-256 |
| --- | --- |
| Alive | `8d7a24dffb4b9e5babc6c4e5429bad0cb648af6ba68423aedeae0e2426165d31` |
| Ultra | `fd19aa8738a7d929f65322e4226966ae92d85b3c801bc49e8e7340c6a558ad7c` |
| Matching unchanged native library | `1652d52c581395a9919ea2dbe5a03c4d365c7f9a4da6d10cff233e590099eaa8` |

## Changed files

Relative to shell baseline `9ae01fb`, the implementation changes
`apps/ultra/ui/alive-workspace.mjs`, `alive-shell.mjs`, `alive-commands.mjs`,
`alive-info.mjs`, `alive.mjs`, `alive.html`, `alive-ui-contract.css`,
`alive-piano.css` and `alive.css`. Regressions change
`apps/ultra/ui/alive-architecture.test.mjs`, `alive-dom.test.mjs`,
`apps/ultra/tests/ci/alive-chain.spec.mjs`,
`apps/ultra/tests/alive_workspace_navigation.py` and
`apps/ultra/tests/test_alive_workspace_navigation.py`.
The implementation brief and plan record the user's fixed-row clarification.
This report and `evidence/shell-correction/native-shell-probe.py` record the
bounded plan and verification. `LAUNCHERS.md` links to the current selection;
the evidence directory retains screenshots, the build manifest, native runtime
results and `verification-results.json` with counts and log hashes.
Shared Ultra CSS and engine sources are unchanged.

The design detector reported existing compact-spacing, 10/11 px typography and
palette-documentation warnings. The pinned compact design and original palette
remain authoritative; this batch does not rewrite the historical design tokens.
The report is retained at `/tmp/alive-shell-design-detect.json`.

## Remaining acceptance

This slice does not claim overall native acceptance. Latest manual CI:
https://github.com/venetanji/alive/actions/runs/41381006275, on `c8f4cb3`.
Arrangement Return through save/restart and Master passed there. Desktop failed
at its first live-fixture Save As with an unexpected hosted editor visible; the
original causal dispatch remains unproved. Downstream clip observation,
saved-clip measurements, resource bounds and CPAL loopback were skipped in that
run. Earlier separate local passes remain historical evidence.

The full desktop/hosted-editor, Arrangement and Master audio journeys,
clip observation, saved-clip measurements, resource bounds and CPAL software
loopback were not rerun on this shell build. The new shell probe's staged Save
check does not close the earlier CI Save As/input failure. Physical hardware
qualification remains unrun. No new CI was dispatched for this correction;
automatic runs remain disabled.

The capability map and dependency roadmap remain `CAPABILITIES.json` and
`CONTINUATION-PLAN.md`. No broader command batch, engine expansion, recording,
routing or hardware qualification is implied by this shell correction. No new
automatic CI trigger, merge, release or deployment is authorized.
