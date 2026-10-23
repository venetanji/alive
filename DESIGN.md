---
name: Ultra Patcher
description: A compact Max-inspired workspace for authoring and playing bounded patches.
colors:
  object-name: "#efbb62"
  selection: "#91b9ed"
  control: "#bfc1c1"
  mono: "#d3df83"
  stereo: "#88c5c7"
  error: "#ffb0a4"
  chrome: "#252525"
  chrome-raised: "#303030"
  canvas: "#373737"
  object: "#202020"
  text: "#eeeeec"
  muted: "#b4b4b0"
typography:
  body:
    fontFamily: '"Liberation Sans", "Helvetica Neue", sans-serif'
    fontSize: "12px"
    lineHeight: 1.3
  title:
    fontFamily: '"Liberation Sans", "Helvetica Neue", sans-serif'
    fontSize: "18px"
    fontWeight: 500
  label:
    fontFamily: '"Liberation Sans", "Helvetica Neue", sans-serif'
    fontSize: "11px"
  code:
    fontFamily: '"Liberation Mono", monospace'
    fontSize: "11px"
    lineHeight: 1.6
rounded:
  object: "1px"
  input: "2px"
  control: "3px"
  message: "4px"
spacing:
  tight: "4px"
  control: "8px"
  inset: "12px"
  panel: "16px"
components:
  toolbar-button:
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "28px"
    padding: "4px 7px"
  object-box:
    backgroundColor: "{colors.object}"
    textColor: "{colors.object-name}"
    height: "24px"
    rounded: "{rounded.object}"
  object-entry:
    backgroundColor: "{colors.object}"
    textColor: "{colors.object-name}"
    width: "100px"
    height: "24px"
    rounded: "{rounded.object}"
---

# Design System: Ultra Patcher

## Overview

**Creative North Star: "The patch is the interface"**

The user chose a close Max/MSP match. The workspace follows the installed Max
9.1.5 reference: charcoal canvas, dark compact objects, amber names, light
arguments and small port rails. This is a working musical editor for sustained
desktop use, with enough unused canvas for the patch to grow.

The authored graph carries the visual hierarchy. Chrome stays compact and
panels open on demand. Controls respond immediately to editing and performance
state; there is no decorative entrance motion. Icons and controls are original
SVG/CSS, with no Max application assets in the build.

**Key Characteristics:**

- Compact, direct object editing.
- Distinct control, mono and stereo connections.
- Optional library, inspector and help.
- Visible keyboard focus and explicit lock state.

## Colors

Warm amber identifies object names against a neutral charcoal work surface.

### Primary

- **Object Amber** names classes and the editing state.
- **Selection Blue** identifies selection, keyboard focus and pending wiring.

### Secondary

- **Signal Yellow** identifies mono signal ports and segmented cords.
- **Stereo Teal** identifies explicit two-channel bundles.
- **Error Salmon** identifies errors and Panic.

### Neutral

- **Canvas Charcoal** carries the graph and editing dots.
- **Object Black** separates compact objects from the canvas.
- **Chrome Charcoal** and **Raised Charcoal** distinguish fixed editor controls.
- **Working White** carries arguments and controls; **Muted Gray** carries help.
- **Control Gray** carries message cords.

**The Signal Type Rule.** Color accompanies cord shape and textual port types;
it never supplies the only distinction between control, mono and stereo.

## Typography

Liberation Sans provides the compact workhorse character of the observed editor,
with Helvetica Neue and sans-serif fallbacks. Object labels use the body size.
Panel titles use the title size; status and port help use the label size. JSON
and literal examples use Liberation Mono. Numeric controls use tabular numerals.

**The Object Text Rule.** Names and arguments share one readable baseline.
Additional diagnostics belong in the optional inspector, not inside every box.

## Layout

The document bar is 31px high and the toolbar is 39px. A flexible, scrollable
canvas fills the remaining center. The assist bar is 27px and the audio footer
has a minimum height of 38px. Ordinary objects are 24px tall; gain controls are
30px by 100px. Their saved positions remain independent of zoom.

The optional details panel is 274px wide on desktop. Below 850px it overlays the
canvas; below 480px secondary toolbar labels recede while lock, creation, undo,
zoom, fit, inspector and help remain reachable. The shipped native target is
desktop. Small browser previews support document editing, without native audio.

## Elevation & Depth

Tonal layering and defined one-pixel edges separate objects, chrome and menus.
Menus, tooltips and inline entry use an opaque surface with an explicit edge.
Selection uses an offset outline; the JSON dialog dims its backdrop.

**The Stable Canvas Rule.** Objects and cords retain their position while
runtime observations update. Editing actions and state changes need no entrance
animation or ornamental movement.

## Shapes

Ordinary objects have nearly square corners. Message boxes are slightly rounded;
bangs use a ring and toggles use crossed strokes. These shapes communicate their
role. Port rails stay horizontal, with inlets above and outlets below. Control
cords are thin gray strokes, mono cords are dashed, and stereo cords are wider.

## Components

### Toolbar and buttons

Controls use small corners, compact padding and a consistent 18px SVG icon
stroke. Hover darkens the surface; keyboard focus draws a blue two-pixel outline
with an offset. Disabled buttons reduce opacity and lose the pointer cursor.

### Document windows and file actions

Each native patch, help or example uses the same compact canvas shell. The
document title carries an asterisk when its saved content differs. New and Open
create windows; reopening an existing file focuses its window. Native file
pickers handle Open and Save As, and a modified window offers Save, Discard or
Cancel before closing. Max intake opens its compatibility report in a separate
document and preserves the source file when saving the converted patch.

Help & Examples is a searchable dialog with original runnable patches and an
open-window switcher. F1, Alt/Option-click and Object Help open or focus the
matching help window. Its list remains scrollable at the native minimum window
size. Each window retains its selection, view, undo history and optional panels;
changing focus does not stop playback. The footer's audio controls are shared,
while Stop patch applies to the current document.

### Object boxes and controls

Text objects expose their name and arguments in one line. Bang, toggle, message,
number, flonum, slider and gain have dedicated compact faces. Editing selects and moves them;
locking enables the whole performance face without port-hit interference.
Locked controls hide their port rails while connected cords retain their endpoints.
Ctrl/Cmd-click or drag can operate while editing. Numeric boxes support vertical
dragging, finer Shift dragging and direct entry. Ranges respect saved dimensions
and automatic/horizontal/vertical orientation. Interrupted gestures cancel cleanly.
Runtime numeric observations update the visible value without rewriting saved
parameters.

Sliders and gain use a flat blue bar across the track, with a hatched gain track.
Their default faces omit numeric readouts; the accessible range input exposes the
scaled output and retains keyboard operation. Saved knob colors override the bar
color; sliders also support a saved track color.

Selected buttons, toggles, sliders and gain controls expose a compact bottom-right
resize handle. Pointer movement follows canvas zoom and updates attached cords;
release saves one undoable dimensions change. Escape, lock, blur and lost capture
cancel the preview. Focused handles accept arrows, with Shift for ten-pixel steps.
Gain keeps a 30px minimum width for its two ports; preview and saved rendering
use the same minimum so changing height preserves width.
The slider inspector names numeric range, output offset/multiplier and Integer or
Float output, with a calculated range summary. Integer readouts and native output
both truncate the final scaled value toward zero.

Variadic objects derive their inlet and outlet rails from their creation atoms.
The native control clock operates while audio is off. Flonum keeps display
precision separate from stored values; Tab uses its dedicated bang outlet.
Slider pointer position is raw, while min/mult scale its numeric output.
Object Help opens the corresponding original runnable patch in its own window.
Send and receive retain ordinary compact object faces; named receive has no
inlet, while unnamed receive exposes its runtime-name inlet. Changing the saved
name updates the port layout through an ordinary structural edit.

### Inline entry

Name-and-argument entry appears near the pointer or edited object as a compact
object-sized field. Its size and type track canvas zoom; text expands its width.
Suggestions and argument help occupy a separate unscaled overlay, placed above
or below the field to fit the viewport. Suggestions use amber names, positional
signatures, a plain explanation and a blue active row. A compact argument guide
highlights the parameter at the caret with its
range and default. Typing @ lists supported named options; enum parameters offer
their named values. Arrow keys choose, Tab completes the current token, Enter
commits and Escape cancels. Errors remain visible without changing the patch.

I, F and S create number, float and vertical slider controls immediately at the
pointer. S creates a 20px by 140px slider as one undoable action.

Comments use a multiline textbox in the same entry surface. Up/Down move the
caret, Shift+Enter inserts a line, Enter saves and Escape cancels. Literal body
whitespace and unchanged CRLF/CR text survive editing, within the existing 4096
character annotation bound. Ordinary object entry retains single-line paste
and suggestion behavior.

### Comments and callouts

Comment text wraps within its saved rectangle and honors explicit newlines.
Unsized annotations grow with their content; saved height remains authoritative.
Comments keep the same focus, selection, drag and edit target as ordinary text.
They expose no executable ports or runtime state.

The Inspector provides Bubble, Bubble Side and Bubble Point. The arrow remains
inside the saved rectangle on Top, Left, Bottom or Right; its point runs 0..1
along that side. A 15px arrow reserve and 5px body inset follow the retained Max
observation, with rounded corners and a slanted arrow near the ends. Very small
boxes scale the decoration to stay bounded. The default bubble fill is #3c3c3c,
and outline/text is #d9d9d9; explicit RGBA overrides and reset update both the
face and Inspector swatches. The noninteractive outline stays out of the
accessibility tree while the text retains visible keyboard focus.

Max import retains flat comments as v2 authoring content and can snapshot an
inherited comment font size from the nearest patcher default. Saved linecount
still carries a compatibility warning because Max fits loaded width/height
from it. Named styles and font resources remain unresolved where diagnosed.

### Port help and menus

Drag between bottom outlets and top inlets in either direction to wire objects.
Clicking both ports or activating focused ports with Enter/Space also connects.
The pending cord highlights destinations accepted by the graph validator and
snaps near a port. Invalid targets show their rejection in the assist bar;
invalid or empty drops leave the document intact. Escape, lost pointer capture,
focus loss, locking and history actions clear the gesture and its feedback.
Port hit areas grow outward to preserve the compact face for object dragging;
variadic objects keep enough width to target adjacent ports independently.

Hover and focus provide concise help. The inlet menu lists accepted messages;
the outlet menu lists emitted data. Both expose original per-object help. The
outlet menu is an Ultra addition, not an observed Max feature.

### Panels and JSON dialog

Console opens independently beneath the canvas from the toolbar or Ctrl/Cmd M.
The shortcut also closes it while a Console filter has focus and returns focus
to the canvas.
Its compact rows use source labels and message text, with warning/error color,
text and severity filters, Clear and a close control. Source labels select only
objects from the same current native revision. The native queue is bounded and
reports drops; the view keeps 512 rows and follows the bottom unless scrolled up.
Browser preview explains that messages come from native execution. A locked
print object opens Console on double-click. The narrow toolbar keeps Console,
Inspector and Help reachable down to 320px.

The object palette and inspector are optional. Help includes literal guidance
and runnable examples within the bounded profile. Advanced JSON / Max import
uses a focused dialog because it can replace the current document; validation
precedes replacement. Normal Open creates a separate patch window.

The inspector groups runtime parameters and appearance. Appearance uses supported
Max attribute names with RGB swatches and separate alpha values; omitted attributes
inherit the theme. Dimensions, font size, borders and applicable control colors
round-trip without stopping the graph. Reset removes all appearance overrides.

Opening Max JSON inventories actual named patchers/help tabs and exposes a
compatibility report. Raw source becomes compact while the report is open.
Unsupported or differing selections require explicit partial-import acceptance.
The selected graph retains supported dimensions, attributes, saved port indices
and explicit fan-out order. No scripts or nested patchers execute implicitly.

### Hosted Help Shell

The recognized append, prepend, int and float help shells retain their complete
authoring tree and initially show Basic. A compact Basic tab stays selected while
the adjacent question button opens a Reference / Related Objects menu. Details
and argument annotations use their saved canvas rectangles; the root name helper
does not overlay Basic. Helpers have no runtime ports or generic palette entry.

Reference text is read from the local licensed installation and rendered as plain
text in a read-only pane. Missing references have an explicit readable state.
The pane overlays the Inspector while the question menu remains reachable above
it. Escape dismisses the menu or pane and returns focus to its trigger or Basic.
Asynchronous updates preserve the focused menu item. The pane destination and the
Basic tab's Open Basic in New Window context action are Ultra additions; the
retained Max observation establishes the Basic/question menu behavior.

Tabs, menus and references are local to each window. Navigation preserves native
execution, live control values and the canonical patch. A console source inside
Basic dismisses the reference and selects its object locally. Native child
windows keep their bound scope and independent overlays. Saves include helper
roles and geometry, with reference text and navigation state kept out of patches.

## Do's and Don'ts

### Do:

- Do preserve compact Max-inspired object dimensions and direct text editing.
- Do place inlet and outlet descriptions beside the interaction they explain.
- Do keep authoring state distinct from runtime observations.
- Do use shape and text alongside signal colors.

### Don't:

- Don't replace the patch with permanent object cards and debug readouts.
- Don't imply that a familiar name guarantees Max semantics.
- Don't replace native execution with a simulated browser audio state.
