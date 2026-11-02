# Local shell correction, 2 November 2026

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

Final suite, screenshot, native-build and launcher identities are recorded here
after completion. Browser verification retains Chromium's sandbox. Native
launcher checks use private Xvfb/DBus and software-only PipeWire, with no physical
device or audio-settings changes.

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

The capability map and dependency roadmap remain `CAPABILITIES.json` and
`CONTINUATION-PLAN.md`. No broader command batch, engine expansion, recording,
routing or hardware qualification is implied by this shell correction. No new
automatic CI trigger, merge, release or deployment is authorized.
