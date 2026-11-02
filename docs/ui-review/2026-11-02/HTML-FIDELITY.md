# Local HTML fidelity correction, 2 November 2026

The earlier shell correction passed its recorded topology and behavior checks,
but the user rejected its visual result. This correction uses the approved
[original HTML](../2026-10-31/Alive-layout-01.html) as the visual authority. It
supersedes the earlier shell screenshots for visual review. The original HTML
is unchanged: SHA-256
`3c98147cd66cf83f962b403fe74d8641c43a91ec50c43c2d9bfb07948dfa46a3`.

## Bounded scope

The starting commit is `a039b1b381bce6b70bdff4818469df8d1b44130d`, branch
`audit/pr12-native-20261102`, checkout `/tmp/alive-pr12-native-20261102`.
The separate research checkout and its unrelated modified results are preserved.
This work changes Alive presentation and focused regression/probe coverage.
It adds no engine, native/provider, recording or routing capability.

1. Compare rendered app and original HTML, record concrete geometry/palette
   differences, and reproduce them with a failing reference comparison.
2. Correct the existing style owners and real control markup. Preserve native
   acknowledgements, IDs, draft parking and existing handlers. Keep unsupported
   reference controls disabled with reasons.
3. Inspect all three supported window sizes and panel combinations; qualify
   actual pointer targets, keyboard/focus, shrink/restore and drafts. Run the
   adjacent/full UI checks, build both apps, select the matching launcher pair
   and verify the running native executables and library hashes.

## Presentation ownership

| Owner | Change |
| --- | --- |
| `alive.css` | Reference tokens/reset; remove accumulated duplicate shell and mixer rules; retain source/automation/device/Arrangement/settings styles. |
| `alive-shell.css` | 27 px menu bar, 35 px compact transport, shell insets, workspace sizing, history/footer and audio disclosure. |
| `alive-ui-contract.css` | Menus, independently visible Help, full-width stacked Clip, fixed 180 px Help/Devices row and compact footer overview/toggles. |
| `alive-session-layout.css` | 108 px strips, 21 px headers, 20 px slots, pinned mixer, vertical activator/solo column, adjacent fader/meter, width brackets and narrow reflow. |
| `alive-browser.css`, `alive-browser.mjs` | Real catalog/category/search/load owners; compact search/refresh and category/results split; disabled filtering and audio preview. |
| `alive-piano.css`, `alive-clip-view.mjs` | Purple Clip properties band, compact tools, track-coloured MIDI notes, teal velocity and subdued loop brace. |
| `alive-workspace.mjs` | Requested Browser width survives compact-window clamping; maximized Clip uses the space released by moving history into the footer. |
| `alive.html`, `alive.mjs` | Compact control grouping and footer markup; actual handlers/acknowledgements remain the owners. |

The Browser defaults to 334 px, or 290 px at compact widths. It restores the
requested width when room returns. The footer is 26 px. Browser and Help use
`#393939`; mixers use `#414141`; detail uses `#3b3b3b`. Typography follows the
HTML's Arial/Helvetica family and compact sizing. This is a clean rewrite at
the style owners, not a transplant of the prototype's accumulated overrides.

Clip and Devices remain independent. Both open places resizable full-width
Clip above Help-left / Devices-right; Devices-only restores 180 px. Help has
its own toggle and remains visible with both editors closed. The initial new
Help-only regressions passed on the starting source; that particular report
was not reproduced in those paths. Native proof on the selected build is
recorded separately rather than inferred from those browser results.

The useful 310 px requested Clip height, fixed Devices row, actual source/rack
contents and compact-window scrolling take precedence over the prototype's
illustrative content and very short small-window detail. The current four-slot
bank and actual catalog are retained. No illustrative return tracks, sends,
presets, waveforms, meter activity or musical state are synthesized.

Gain stays linear and native-owned. The meter labels show normalized linear
peaks, matching the actual display mapping. The numbered track activator keeps
the existing mute accessible name and pressed/muted semantics. Master keeps
its native gain, peak, overload and acknowledgement ownership. Actual history
buttons move into compact footer space; Edit menu access remains available.

## Unavailable affordances

The existing [capability map](CAPABILITIES.json) and
[dependency roadmap](CONTINUATION-PLAN.md) remain the implementation inventory.
Showing a disabled reference affordance does not promote its classification.

| Visible family | Owner / prerequisite | Disabled reason / errors / tests |
| --- | --- | --- |
| Link, Tap, phase nudge, metronome, global scale, overdub, capture/recording, punch ranges, draw/computer-keyboard/map modes | Static Alive transport markup; requires its real product/native/input lifecycle contract before enabling. | Disabled with individual reasons, no listeners or success states. Existing transport and native-disabled/menu regressions remain in force. |
| Pan and arm/record on strips | Static Alive strip presentation; mixer currently supports gain/mute/solo only. | Disabled with explicit native/capture reasons. No saved pan, arm state or recording activity is invented. |
| Browser filter groups | Browser presentation; needs catalog tags/filter contracts. | Disabled with catalog reason. Real category/search and qualification errors retain their existing owners. |
| Browser audio preview | Browser presentation; needs provider/native preview and lifecycle support. | Disabled, with explicit reason and regression. MIDI note Preview remains the existing distinct capability. |
| In/Out, Sends, Track Options, Crossfader, Performance Impact, Return Tracks | Existing Display menu; each requires the missing native or observation contract. | Existing disabled reasons and keyboard/target checks retained. |

## Verification

Final results, source commit, launcher snapshot and screenshots are recorded
after the final native run. Preliminary red runs are retained in `/tmp`:

- `/tmp/alive-html-fidelity-red.log`: geometry/palette/mixer regression failed;
  three Help-without-editors cases passed.
- `/tmp/alive-html-note-red.log`: note colour failed before using track colour.
- `/tmp/alive-html-browser-red.log`: Browser width did not restore after shrink.
- `/tmp/alive-html-max-red.log`: maximized Clip retained obsolete history space.
- `/tmp/alive-html-final-gates.log`: the full run caught Note inspector being
  covered by Automation inspector; no pointer-force workaround was added.
- `/tmp/alive-html-velocity-red.log`: compact editor clipped the velocity
  control after ordinary outer-panel scrolling. Intrinsic Clip sizing replaces
  fixed assumptions about wrapped toolbars and keeps inspector hit targets apart.
- `/tmp/alive-html-hover-red-confirmed.log`: the global hover background erased
  Master's coloured surface and its text contrast. Header owners now retain
  their identity colours on hover without dispatching a command.

Screenshots and native probes use Chromium with its sandbox, and a private
Xvfb/DBus/software-only PipeWire session. They do not qualify physical hardware.
The native shell probe starts no audio and changes no physical-device settings.

## Remaining acceptance

No new remote CI is triggered by this local visual correction. The last
recorded manual run remains
[41381006275](https://github.com/venetanji/alive/actions/runs/41381006275), at
`c8f4cb3`, overall failed. Arrangement Return through save/restart and Master
passed there; Desktop stopped at its first live-fixture Save As with an
unexpected hosted editor and unproved causal dispatch. Clip observation,
saved-clip measurements, resource bounds and CPAL loopback were skipped there.
Those journeys are not replaced by the narrower native shell/launcher probe.

No full audio journey or downstream native/loopback acceptance is claimed for
this build. Physical hardware qualification remains unrun. No merge, release,
deployment, automatic CI, security bypass or engine expansion is performed.
