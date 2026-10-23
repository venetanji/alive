# Max Comment Layout And Callouts

Continue the user-authorized Max fidelity work in the existing checkout. This
phase fixes comment rendering and import; it does not qualify a complete Max
help root or add an executable object. Preserve the extensive existing changes,
user files, licensed installation and completed Print/help-shell work.

## Evidence And Direction

The retained next-wave review identifies nine bubble comments and clipped
multiline headers across append, prepend, int and float. The generic object
header imposes a one-line height and nowrap on comments. Use the existing
compact Max-inspired visual world, saved rectangles and original rendering.

The installed comment reference identifies bubble as on/off, bubbleside as
0 Top / 1 Left / 2 Bottom / 3 Right, and bubblepoint as a normalized position.
Omitted defaults are bubble0, side1 and point0.5. Saved linecount is absent from
the comment attribute list, but the disposable runtime establishes that the
loader uses it to fit width and height. Keep its compatibility diagnostic; do
not use it as a line limit or discard it as inert metadata. Exact geometry
observations and their limits belong in
`.impeccable/review/max-fidelity-20261021/comment-oracle.md`.

## Authoring Schema And Import

Add three comment-only appearance fields in the existing optional style map:

- bubble: integer 0..1, labeled Off/On.
- bubbleside: integer 0..3, labeled Top/Left/Bottom/Right.
- bubblepoint: finite number 0..1.

JS and Rust reject invalid types, fractional enums, nonfinite values and values
outside these bounds. Other object kinds reject the fields. Common width
12..1200, height12..800, font size8..48 and RGBA validation stay in effect.
Style edits preserve native executable descriptors and execution revisions;
Save, history and shared windows retain the exact authoring fields.

Import valid explicit values without clamping. A missing comment fontsize may
use the nearest patcher default_fontsize that fits the supported font-size
range. Explicit invalid box values remain diagnosed rather than replaced by
inheritance. Imported effective font size is an ordinary supported style
snapshot. Keep diagnostics for unresolved named styles, fonts and patcher
defaults that affect other objects. The installed helpfile_label style is empty
in this installation, but the provider does not establish that style's identity;
its name alone is insufficient to suppress a warning.

Retain flat comments by selecting the existing v2 authoring profile when needed,
as well as comments inside nested patches. Comments remain authoring-only and
are explicitly excluded from lowering and executable capacity. Original
fixtures cover root/child/default inheritance, invalid explicit values and
unrelated diagnostics. Do not redistribute licensed patch text or references.

## Rendering And Interaction

Keep the existing comment header as the text, focus and drag target. Text is
assigned through textContent. Honor explicit newlines, wrap within the saved
width and use the saved height instead of the generic 22px header. A bounded
rectangle may clip text beyond its capacity, but must not discard all but the
first line. Unsized comments may grow to their wrapped content.

Render an original callout outline behind text, with no application assets or
script execution. Its body and arrow reserve follow the observed Max geometry
where established. The normalized point and all four sides must remain bounded
at the permitted minimum dimensions. Account for the final appearance width,
height and font size after style application. Reset and repeated runtime polls
must remove obsolete geometry, padding and colors.

Inspector uses the shared appearance controls. Existing keyboard selection,
drag, double-click editing, lock state and context actions remain available;
the callout decoration is noninteractive and hidden from assistive technology.
Keep focus visible, preserve safe literal text, and introduce no global key
handling change or animation.

Comment editing must preserve literal whitespace and newlines on an unchanged
commit, including the original CRLF/CR bytes despite textarea normalization.
Allow the existing annotation limit of 4096 printable ASCII characters with
tabs/newlines rather than the ordinary 160-character object-text limit. Use a
multiline textbox for comments; Shift+Enter inserts a line and Enter commits.
Up/Down move the caret in comments and retain suggestion navigation elsewhere.
Escape cancels without document changes. Other objects retain single-line paste
behavior. Do not alter their creation, argument completion or validation.

## Verification And Limits

First establish meaningful failing regressions for strict shared validation,
import preservation/inheritance and the rendered clipping defect. Verify safe
literal text, explicit newlines, four sides/point bounds, saved dimensions,
font changes, reset/history, keyboard focus and ordinary editing. Test that
appearance-only changes do not reinstall the executable graph.

Run the affected JS suites, shared Rust schema cases, full existing contracts
and browser suite. Build the release and verify the shipped WebKitGTK/native
surface in a private desktop session with original fixtures. Use one batched
visual inspection and at most one confirmation round for this comment phase;
do not restart completed Print/help visual passes. Preserve screenshots in
/tmp, document exact commands/results, and clean marked processes. Unsupported
font/style/layout behavior and complete-root qualification remain explicit.
