# Gain slider colors, 2026-10-21

Ultra's vertical gain slider displayed its blue value region above the thumb
at intermediate levels in Linux WebKitGTK. Chromium displayed the value region
below the thumb. This was a rendering difference between engines: the saved
gain value and the thumb's upward movement were already correct.

## Evidence and cause

The real `canvas.html` page was rendered at gain values 0, 64 and 127 in the
installed WebKitGTK 2.54 and sandboxed Playwright Chromium. At 0, both engines
showed an empty track and a bottom thumb. At 127, both showed a filled track and
a top thumb. At 64, WebKitGTK painted the upper track blue while Chromium
painted the lower track blue.

The gain input combined `-webkit-appearance: slider-vertical` with
`writing-mode: vertical-lr` and `direction: rtl`. Controlled comparisons of the
same input established that WebKitGTK's native track painter placed the fill
incorrectly with this combination. Changing appearance to `auto` while keeping
the vertical writing mode still reproduced the reversal. Keeping the native
vertical appearance and removing the writing-mode/direction overrides restored
bottom-up progress in both tested engines.

The CSS change preserves the existing 22 by 65 CSS-pixel input, native thumb,
blue accent, and compact 30 by 100 gain object. It changes no gain calculation,
graph data, or control event handling. The active canvas inspector uses numeric
inputs and textareas; its audio footer has no range inputs. The affected selector
is `.node .gain-input`.

## Max reference boundary

The existing `screenshots/max-controls.png` shows a dark vertical Max gain
control with a pale blue horizontal handle near its lower edge. This single
resting image does not establish Max's appearance at every gain value.

The installed Max 9.1.5 reference page
`resources/docs/refpages/msp-ref/gain~.maxref.xml` was read in place under the
legitimate local Max installation. It identifies `knobcolor` as the value color
for the knob and value stripes, and `stripecolor` as the slider's off color.
This supports distinguishing the value region from the inactive region; it
does not require Ultra to reproduce Max's striped rendering or gain scale.
No installed Max files, original patches, preferences, or proprietary assets
were changed or copied into the implementation.

## Verification

The focused regression loads the real page in an ephemeral WebKit context and
serves checked-in UI files on an automatically assigned loopback port. It runs
on a private Xvfb display and reads rendered track pixels above and below the
midpoint thumb. Before the CSS change, the midpoint samples were blue
`(145, 185, 237)` above and gray `(58, 58, 58)` below, causing the expected failure.
After the change, the test passes: the minimum is unfilled, the midpoint is
filled below the thumb, and the maximum fills the track.

```sh
xvfb-run -a python3 apps/ultra/tests/ci/check_gain_slider_webkit.py
```

The existing canvas DOM and catalog tests also passed (23 tests). A separate
Chromium render check covered 0/64/127, a lower-end click producing 0, an
upper-end click producing 127, and Arrow Up increasing 64 to 65. The check
retained Chromium's sandbox. Whitespace validation passed.

These observations cover the installed Linux WebKitGTK engine and the pinned
Chromium browser. They do not establish every WebKit version, a pixel-identical
Max control, native audio behavior, or results from a launched Tauri executable.
The focused WebKit test is an optional local regression because it requires
system GI, Cairo, GTK, WebKitGTK, and Xvfb packages beyond the Node/browser tests.
