# Shared Controls

`live-controls.mjs` and `live-controls.css` provide one authored control system
for Ultra device panels and Alive. The visual reference is the installed Live
device language, retained in the research screenshot
`experiments/alive-live-reference-20261024/05-analog-device.png`: flat charcoal
surfaces, open dial arcs, cyan arcs and value accents, neutral numeric readouts,
and orange section switches. SVG geometry
and CSS are original. No application images, fonts or source are bundled.

This is Ultra's default family for new device controls and Alive shares the same
API. Keep one implementation rather than adding a second Max-looking default
family or a visual compatibility layer.

Import the stylesheet once, then use the factories with the owning document:

```js
import {createDial,createPanel} from './live-controls.mjs';

const cutoff=createDial(document,{
  label:'Cutoff',min:20,max:20000,value:1200,step:1,unit:'Hz',
  defaultValue:1200,
  onInput:value=>preview(value),
  onChange:value=>commit(value),
});
const panel=createPanel(document,{title:'Filter',controls:[cutoff]});
container.append(panel.element);
```

Factories are `createDial`, `createSlider`, `createNumber`, `createButton`,
`createToggle`, `createMenu`, and `createPanel`. Each returns an `element`.
Continuous controls also return the native range `input`, numeric `number`,
`update(value)`, `setDisabled(bool)`, `reset()`, and `dispose()`.
Menus return their native select `input` and `update(value)`; toggles expose
`update(bool)`. A panel exposes its `header` and `body` for composition.

## Interaction And Ownership

Dials drag vertically or horizontally; sliders drag horizontally. Both use
relative dragging: pressing retains the value. A 160px drag spans the range;
Shift provides ten times finer movement. Arrow keys adjust a hundredth of the
range, or the explicit numeric step; `keyboardStep` overrides that increment.
Shift also refines keyboard adjustment, while an integral step remains integral.
Page Up/Down move ten steps. Home/End select the limits. Double-click resets to
the explicit `defaultValue`, or the value supplied when the control was created.

`onInput` receives pointer previews. `onChange` runs at gesture completion, on
keyboard adjustment, reset, or accepted numeric entry. Escape during a pointer
gesture restores its initial value and closes the gesture. Pointer cancellation,
lost capture, or blur finishes the current value. Returning a preview to its
origin still emits the completion event so the owner can close its edit group.
The consumer owns host calls, rejection messages, persistence and undo.

The numeric editor commits valid values on Enter, change or blur. Invalid drafts
remain editable and expose `aria-invalid`; Escape restores the accepted value.
`update` preserves an unfinished numeric draft. Values are numeric in the supplied
range: no device-specific unit curves, enum mappings or DSP conversions are
inferred by the component. An optional `display` adapter supplies `format(raw)`,
`parse(text)` and `toDisplay(raw)` for physical readouts. The dial and its owner
retain raw values; typed physical values are converted and range-checked before
dispatch. Formatted fields retain Arrow Up/Down stepping, fine adjustment,
invalid drafts and Escape cancellation. Disabling a field abandons its draft.

## Existing Controls

`decorateRange(input,{doc,kind:'dial',defaultValue,step,unit})` wraps an existing
range input. It preserves its identity, ID, accessibility label and event
listeners, and emits standard `input`/`change` events. `decorateNumber(input)`
adds only the shared numeric appearance. These adapters leave existing draft,
controller and history logic with its current owner. After setting an admitted
range value or its disabled state, call the decorator's `update()` to repaint.

Perform uses these adapters for its bound parameters, retaining its existing
numeric draft and history handlers. Alive uses the same adapters for selected
device parameters, retaining one base commit on release and the separate
automation effective-value readout. Existing canvas object faces, including
numeric, toggle, slider and gain objects, are unchanged by this slice. The shared
API is available for future canvas defaults and native device views.
This slice does not provide a complete Analog device editor.

Theme tokens use the `--live-` prefix. Dial drawing scales through the
`.live-dial` dimensions without introducing a second skin. `controls-gallery.html`
is a static local component gallery with no native commands or audio execution.

The charcoal surface and control wells use `--live-surface` and `--live-well`;
`--live-accent` supplies cyan arcs, fill and value accents. `--live-selected`
supplies orange selected toggles, while numeric readouts use neutral
`--live-ink`. Units and ticks use `--live-muted`, and `--live-focus` and
`--live-error` keep focus and invalid drafts visible. The 10px unit annotation,
22px gallery heading, #141414 dial hover and #494949 button hover are intentional
local details. Liberation Sans with the Helvetica Neue fallback is the intended
font stack; detector warnings caused by splitting quoted family names are parser
false positives. Root `DESIGN.md` and `.impeccable/design.json` record the shared
tokens and their visual roles.

## Verification

Run the UI model/view suite with `node --test apps/ultra/ui/*.test.mjs`.
Rendered interaction coverage lives in `tests/ci/live-controls.spec.mjs`, with
Perform and Alive owner-boundary checks in `canvas-instrument.spec.mjs` and
`alive-chain.spec.mjs`. These browser tests qualify input and layout, not native
DSP, audio devices or persistence inside a desktop process.
