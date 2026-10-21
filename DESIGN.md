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
    backgroundColor: "#232323"
    textColor: "{colors.object-name}"
    width: "370px"
    rounded: "{rounded.input}"
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

### Object boxes and controls

Text objects expose their name and arguments in one line. Bang, toggle, message,
number, flonum, slider and gain have dedicated compact faces. Editing selects and moves them;
locking enables performance controls. Ctrl/Cmd-click can operate while editing.
Runtime numeric observations update the visible value without rewriting saved
parameters.

Variadic objects derive their inlet and outlet rails from their creation atoms.
The native control clock operates while audio is off. Flonum keeps display
precision separate from stored values; Tab uses its dedicated bang outlet.
Slider pointer position is raw, while min/mult scale its numeric output.
Object Help opens the corresponding original runnable patch for the new batch.

### Inline entry

Name-and-argument entry appears near the pointer or edited object. Suggestions
use amber names, positional signatures, a plain explanation and a blue active
row. A compact argument guide highlights the parameter at the caret with its
range and default. Typing @ lists supported named options; enum parameters offer
their named values. Arrow keys choose, Tab completes the current token, Enter
commits and Escape cancels. Errors remain visible without changing the patch.

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

The library and inspector are optional. Help includes literal and runnable
examples within the bounded profile. JSON uses a focused dialog because import
can replace the entire document; validation precedes replacement.

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
