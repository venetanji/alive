# Local Live UI Evidence

Inspected November 2, 2026. This is a behavioral reconstruction from the locally
installed shipped executable, not access to Ableton's original source project.
No proprietary source, resources or reference screenshots are included here.

Target: installed Live 12 Suite Windows x64 executable, 151396296 bytes,
SHA-256 `5f0afddc288b352e92672de2df9175eaf81c9898fb5bd5faef6a09f155c45d26`.
Evidence collector and private results remain at
`/tmp/alive-live-ui-code-20261102/collect_live_ui.py` and `evidence.json`.

| Owner | Observed Behavior | Location | Confidence |
| --- | --- | --- | --- |
| AInfoView | Visible sizing fixes width to 231, hidden width to zero; preserves incoming height. | 0x1447d7680 | Direct static observation. |
| AInfoView | Adjacent methods return (231,188) and (231,1073741823). | 0x1447d76e0 / 0x1447d76c0 | Constants observed; lower/upper bound semantics inferred from consistent virtual slots. |
| LDeviceDetailView | Bounds return (0,190) and (1073741823,190). | 0x1447d4420 / 0x1447d4400 | Strong structural evidence for fixed normal row height 190. |
| LClipDetailView | Bounds return (0,224) and unlimited width/height. | 0x1447d05c0 / 0x1447d05a0 | Strong structural evidence for minimum height 224 and expansion. |
| LBrowserView | Minimum delegates to child; alternate branch adds 22 height units. | 0x1441ef620 | No universal minimum Browser width established. |

These are internal logical units. Display zoom, external borders and conversion
to physical pixels were not measured. Alive uses width 231 and Device row 190;
Clip has a normal minimum 224 with a compact stacked fallback when needed to
retain the pinned Session mixer at the supported 800x600 window size.

The executable also contains explicit `ClipDetailViewLayoutAuto`,
`ClipDetailViewLayoutHorizontally`, `ClipDetailViewLayoutVertically` and
`ExpandClipDetailView` identifiers, plus `AClipDetailViewResponsiveLayout`.
Automatic reflow thresholds have not been traced. Alive's 360-unit automatic
threshold is its own presentation rule; the explicit layout choices reuse
mounted controls and do not change musical state.

Generic split-view properties include `AllowFirstViewAutoClosing`,
`AllowSecondViewAutoClosing`, `AutoClosingHysteresis`, `Snap Threshold`,
`Snap To First View's Min` and `SplitterPosition`. Exact Browser thresholds and
transition hysteresis remain unresolved. Alive collapses a pointer drag below
its existing 180-unit minimum and restores the useful pre-drag width. Keyboard
Home still selects the visible minimum; Escape/pointer cancellation restores
the pre-drag state.

Embedded Help tests reference independent Info visibility and active-control
description/header state. Those tests were observed statically, not executed.
Alive keeps Help independent of editor visibility and routes pointer/focus
descriptions there without floating tooltips. Ultra retains its existing
shared Help behavior through the default option.

Exact Live fader taper and meter tick positions remain unverified. Alive shows
dB readouts and a -60..0 dB stereo peak scale from its existing native amplitude
observations, with separate L/R lanes. Native linear gain bounds, admission,
application, persistence and Undo ownership are unchanged.

REA's Hopper bridge timed out; Ghidra was unavailable with the installed Java
runtime. The useful results came from PE RTTI/vtable parsing and installed
Capstone. No prerequisite, protection, Live runtime, device or audio setting was
changed. The collector verified the target digest and retained nine methods
and 21 strings locally.
