# Ultra presentation components

Dependency-free native ES modules and scoped CSS for the Rust/Tauri webview. These are reusable **presentation controls**, not a new native graph or runtime. `../component-lab.html` is an interactive UI-only demonstration; its slider drives a passive meter locally. No Tauri commands, audio APIs, timers, networking, libraries, downloaded assets or npm dependencies are used.

The current main Ultra app still accepts only its existing two bounded chains. Nothing here changes its palette, Rust validator, patch serialization or DSP. View state must **not** be passed to `patch_apply`.

## Preview

Load `component-lab.html` from the bundled UI assets or an already authorized static asset server. It is not linked into the main application and does not start the engine. Browsers may block ES modules on `file://`; the page has an explicit module-loading status rather than silently appearing operational. No new development server is required or started by this package.

The layout is original compact gray/charcoal patch-control styling, with native focus outlines and native controls. It is inspired by Max's visual vocabulary, not copied assets. This change has headless DOM-adapter coverage, not a verified WebKit/Chromium render or native desktop interaction test.

## API

```js
import {createComponent, normalizeState, messagePayload, TYPES} from './components/index.mjs';
// Also load components/components.css once in your document.
const gain = createComponent({
  id: 'gain-preview', type: 'slider', label: 'Level',
  min: 0, max: 1, step: 0.01, value: 0.5
}, {onEvent(event) { console.log(event); }});
container.append(gain.element);
const json = JSON.stringify(gain.getState());
gain.setState({value: 0.75}); // silent host-to-view update
gain.setState({disabled: true});
gain.destroy(); // remove listeners and DOM; idempotent
```

`createComponent(state, options)` returns `element`, primary `control`, optional message `trigger`, `getState()`, `setState(partial)`, and `destroy()`. Options are `onEvent` (synchronous callback, default no-op) and `document` (default browser document; injectable for tests). Callback errors propagate to the caller/browser rather than being hidden. State is committed before the callback. Callbacks may apply a silent `setState` update without feedback loops.

`getState` returns a detached JSON-serializable snapshot. `setState` validates atomically, stays silent, replaces any in-progress visible draft, and cannot change `id` or `type`. Invalid updates throw without changing state. Calling it after destruction throws. Remount to change a view type.

## State and schema

`state.schema.json` describes canonical saved state, not abbreviated constructor input. `normalizeState` accepts omitted defaults, rejects unknown fields and explicit nulls except stateless `value`, bounds text, validates finite numbers and clamps numeric values. Use it after parsing JSON; JSON Schema alone cannot enforce cross-field range relationships or finite JavaScript values.

Common canonical fields:

- `version`: exactly `1`.
- `id`: nonempty string, at most 128 characters, unique within the host's component map. The factory does not impose global uniqueness or use it as an HTML ID.
- `type`: one of `object`, `message`, `button`, `toggle`, `number`, `flonum`, `slider`, `meter`, `inlet`, `outlet`.
- `label`: accessible name/caption, at most 256 characters; defaults to the type.
- `disabled`: boolean, default `false`.
- `value`: string for object/message (maximum 4096 characters); numeric `0` or `1` for toggle; finite number for numeric controls; `null` for button/inlet/outlet.

Numeric types additionally store `min`, `max`, `step`. Defaults: number/flonum bounds −1e9…1e9; slider/meter bounds 0…1; number step 1; all others step .01. All require `min < max` and finite positive step. Number bounds/step must be safe integers; values truncate toward zero then clamp. Flonum values clamp but do not quantize: step is the native spinner increment, not a validation grid. Meter is passive and ignores step visually.

Slider values quantize to the nearest valid step relative to min, ties upward, then clamp to the last valid step below or at max. An uneven range can therefore stop below max (0…1 with step .3 ends at .9). Arithmetic uses 15 significant decimal digits; range/step must be finite and at most 1e9. This prevents canonical state/readout from disagreeing with the native range input's step sanitization. This is a UI protocol, not a sample-accurate parameter mapping.

## Event contract (version 1)

Each callback receives one plain JSON object with `version`, `id`, `type`, `action` plus the fields below. No DOM nodes, timestamps or random IDs are included. No events are emitted during construction, silent updates or destruction. Disabled controls ignore UI actions; silent host updates remain allowed.

| Action | Extra fields | When |
| --- | --- | --- |
| `change` | `value` | Valid user commit that changes stored value; object/message Enter or native change, numeric Enter/change, toggle activation, slider change |
| `input` | `value` | Slider preview during native input events; does not commit state, and can repeat |
| `output` | `payload: {kind:'bang'}` | Bang button activation |
| `output` | `payload` below | Explicit message send activation; commits pending text first if needed |
| `connect` | `direction: 'inlet' | 'outlet'` | Port activation; intent only, no graph mutation |

Message preview payloads:

- Trimmed exact `bang` → `{kind:'bang'}`.
- One or more whitespace-separated finite decimal numbers → `{kind:'list', atoms:[...]}`. A single numeric token still produces a one-element list. Decimal exponents are supported; Infinity, hex literals and NaN are not.
- Anything else, including empty input → `{kind:'text', text: originalText}`.

There is **no Max message parser**: substitutions (`$1`), quoting, escapes, commas, semicolons, selectors, special list coercion, outlet dispatch and scheduler ordering are not evaluated. The host must explicitly translate these UI intents to a supported runtime. Shared view IDs `button`, `toggle`, `number`, `flonum`, `message` align with the subset catalog only as names. In particular the UI toggle is binary 0/1, not a claim about Max toggle integer message behavior. `object` is generic editable object text, not a Max `newobj` runtime. Slider, meter and ports are presentation-only and do not extend the initial compatibility catalog.

## Interaction and integration boundaries

- Native buttons support pointer, Enter and Space; native range/number controls provide keyboard behavior. Tab is never prevented. Object/message text is always editable rather than implementing patcher lock/unlock modes.
- Enter commits edits; Escape restores the last committed value; IME composition Enter is ignored. Editing a message does not emit an output. Sending a pending edit yields `change` before `output`.
- Empty/invalid numeric edits revert to the committed value and produce no event. Repeated unchanged commits are silent. Bounds, step and disabled state have native equivalents plus model-side guards.
- Root bubble listeners stop keyboard and pointer events from reaching patcher note shortcuts/dragging. Hosts with capture-phase handlers must ignore targets inside `.ultra-control` and release existing held typing notes on focus transitions. This kit does not own global note state or promise to intercept capture handlers.
- A meter only displays values supplied by the host. Do not present it as an actual audio meter without real backend measurements. Signal labels are descriptive, not type validation.
- Use the separate `input` preview for local display only; send `change` through an explicit bounded/validated IPC adapter when one is implemented. Do not forward all drag events to realtime ingress by default.
- All user text is assigned through DOM value/textContent, never interpreted as HTML.

## Checks

From repository root:

```sh
node --test apps/ultra/ui/components/components.test.mjs
node --check apps/ultra/ui/components/index.mjs
node --check apps/ultra/ui/components/lab.mjs
node apps/ultra/ui/graph.test.mjs
node apps/ultra/ui/events.test.mjs
```

The Node suite executes the real factory and lab handlers against a deliberately small DOM adapter. It covers JSON snapshots/guards, event shapes/order, duplicate commit suppression, numeric and slider normalization, IME/cancel, disabled state, disposal, keyboard propagation, and lab slider→meter/reset/snapshot behavior. It does not simulate browser native keyboard activation, accessibility APIs, CSS layout, pointer hit testing or native range sanitization; those require a permitted browser/Tauri test before integration is called verified.
