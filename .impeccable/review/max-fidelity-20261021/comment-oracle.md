# Comment Multiline And Callout Oracle

Bounded observation of installed Max 9.1.5 on 2026-10-22. Metadata was read
first; one original synthetic runtime batch and one confirmation establish the
facts below. This report does not qualify complete installed help patches.

## Supported Schema Recommendation

Represent `bubble` as a boolean, default false; `bubbleside` as the exact enum
0 top, 1 left, 2 bottom, 3 right, default 1; and `bubblepoint` as a finite float
in [0,1], default 0.5. These are actual comment attributes. Preserve the saved
rectangle and apply ordinary word wrapping plus explicit newline preservation.
Use the saved font or the selected child patcher's default font settings.

For the current nine saved bubbles the only authored point values are 0.11
and 0.75, plus the omitted default 0.5; the authored sides are 2 and 3, plus
the omitted default 1. Runtime tested every side with point 0, 0.5 and 1.
Intermediate point interpolation follows the documented normalized range and
observed endpoint geometry; it was not separately sampled at 0.11 or 0.75.

Keep `bubbletextmargin` at its observed default 5 internally unless explicitly
supporting the field. Runtime additionally tested 0 and 10, establishing the
effect, but those values are absent from these nine source comments. Do not
silently accept custom bubble colors, `bubbleusescolors`, underline or arbitrary
styles based on this batch. Their explicit rendering semantics were not tested.

Keep a `linecount` compatibility diagnostic. It is neither inert metadata nor
a CSS line clamp: the loader uses it to fit text geometry. An implementation
that preserves saved rectangles and wraps text can improve these imports, but
it has not reproduced Max's loader's fitted-width algorithm.

The finite `helpfile_label` style is safe to resolve as no appearance overrides:
its installed style metadata is `default: {}`, `multi: 0`. All three selected
labels sit inside child patchers that save Arial, 13 px defaults. They should
inherit 13 px, rather than the root's 12 px. This establishes this one style;
it is not a generic named-style engine qualification.

## Bubble Geometry

Observed logical units, normalized from the screenshot's 1.6 pixel scale:

| Property | Observation | Evidence strength |
| --- | --- | --- |
| Arrow side | 0 top; 1 left; 2 bottom; 3 right | Reference enum and runtime |
| Arrow depth/reserve | 15 px inside the overall saved rectangle | Rectangle differences and pixels |
| Body text margin | 5 px by default on each body edge | Attribute query and margin 0/5/10 comparison |
| Arrow base width | Approximately 15 px | Pixel contour fit |
| Body corner radius | Approximately 10 px | Outer contour fits 9.6 to 10.4 px |
| Outline stroke | Approximately 1 px | Pixel contour estimate |
| Point direction | Left to right for top/bottom; top to bottom for left/right | Runtime endpoints and center |
| Tip position | Approximately `5 + point * (L - 10)` along the full side length L | Runtime endpoints and center |
| Base attachment | Center appears clamped to `17.5 .. L-17.5`, with half-base 7.5 | Slanted endpoint contour fit |

For left/right arrows, reserve 15 px from width before laying out the rounded
body. For top/bottom arrows, reserve 15 px from height. The arrow occupies that
reserve; it should not protrude outside the overall authored rectangle.
Text margin applies inside the body, after the arrow reserve.

At point 0 and 1, Max's arrow tip remains about 5 px from the end of the side,
while its base stays clear of the rounded corner. The triangle therefore slants.
A centered triangle translated to `point * L` does not reproduce these ends.
The clamp formula is a reconstruction from pixels, with about one screen pixel
(0.625 logical px) tolerance, not a recovered implementation. Dimensions so
small that the clamp interval inverts were not tested.

The installed default theme provides bubble fill `[0.235,0.235,0.235,1]` and
outline/text `[0.85,0.85,0.85,1]`, corresponding approximately to #3c3c3c and
#d9d9d9. These are theme-dependent facts, not hardcoded colors for every Max
theme. The synthetic patch deliberately saved a white canvas, so plain comment
text looks pale in the runtime screenshot.

## Wrapping, Height And Linecount

Every row below starts with the same original 63-character sentence and a saved
160 by 70 px rectangle at Arial 13 px. Values are loaded runtime rectangles:

| Saved linecount | Ordinary width x height | Left bubble width x height |
| --- | --- | --- |
| Omitted | 160 x 51 | 160 x 55 |
| 1 | 366 x 21 | 382 x 25 |
| 2 | 198 x 36 | 216 x 40 |
| 7 | 86 x 111 | 102 x 115 |

This establishes a loader layout hint: explicit linecount influences both width
and height to fit that many lines. It does not merely clip a pre-existing box.
`getattr('linecount')` returns null for every comment, while the installed comment
attribute reference contains no such attribute. The observed loader effect must
therefore not be dismissed from absence in the attribute list.

Changing the two-line boxes' width to 90 px at runtime produced ordinary 90 x 96
and bubble 90 x 115 rectangles. Max reflowed the text and fitted height; it did
not preserve the old two-line limit. A long unbroken token produced a 36 px
ordinary height at width 160, consistent with two lines; its position was outside
the captured viewport, so exact token break characters are not qualified. An
explicit newline remained a line break.
Ordinary text is top-aligned with small built-in padding; bubble text is padded
inside the rounded body.

The same two-line explicit-newline bubble with margins 0, 5 and 10 loaded as
91 x 30, 101 x 40 and 111 x 50. Top/bottom versions at default margin loaded
86 x 55; left/right versions loaded 101 x 40. This directly establishes both
the 15 px arrow reserve and the additive 2*margin height/width effect.

With these runtime font metrics, ordinary one-line height is 21 px at size 13
and 20 px at size 12. Ordinary wrapped lines add 15 px; a default-margin bubble
has 25 px for one line, 40 for two, and 55 for three. The installed target
comments save 40 px for two lines and 54 px for three, and the bottom-arrow
two-line comment saves 55 px. Those serial rectangles already encode their
intended layouts, but the one-pixel third-line discrepancy shows why this batch
does not establish an exact cross-version text-fitting algorithm. Preserve the
saved geometry for bounded rendering and retain the linecount limitation.

Sending `set Short` to two synthetic comment boxes did not establish a text
mutation through the JS object API, and text queries returned null. No runtime
text-setting semantics are claimed from that attempted stimulus.

## Evidence And Limits

Evidence bundle: `experiments/max-reference/comment-ui-runtime-20261022/`.
The original manifest and fixture contain 31 comments; two stages in each of
two runs retain 124 object snapshots. The first run's screenshot was obscured
by Welcome; only the confirmation supplies geometric pixels. One batch plus
one confirmation was the capture ceiling, and no further Max runtime was run.

REA evidence IDs:

- First metadata run: `ev_d514e28b289f015b544b74dae6fc8f351f6465c755fbf455264ee664521ed3c6`.
- Visible confirmation: `ev_6106d478fbca6cffc7afeaffe3ba4fc0afa2de335d671788c689984d117a93d4`.

Full inline records are retained as JSON. Process observations are sampled,
network is unobserved, and no syscall or filesystem observation was requested.
The application ran in a copied marked Wine prefix on a private Xvfb display.
Original preferences, installed files and user projects were not edited.
Exact-prefix and display process cleanup plus removal of the marked copy are
recorded in `environment.json`. All screenshots remain under `/tmp`.

The original source enum/defaults, empty style and target geometry are recorded
without proprietary prose or text. No installed source, help patch, font, image
or application asset is included. No product file was edited by this oracle.
