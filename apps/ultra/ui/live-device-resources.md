# Installed Live Device Views

Analog's original layout is `Devices/UltraAnalog/Contents.xml` inside the user's
installed `Resources/GUI.alp`. It references 16 other view documents in that
folder and artwork in `Graphics.alp`. These are layout resources, separate from
the standalone DSP DLL. Live's executable implements the control/model classes.

The original reader and adapters in this directory consume those installed
resources at runtime. No extracted XML, artwork, language files, fonts, presets,
or decompiled application implementations are bundled.

## Resource Pipeline

`live-resource-pack.mjs` decodes and indexes qualified packs. `openLiveResourcePack`
checks both length and SHA-256 before decoding. Only the two exact pack identities
in the current profile are supported; another Live installation/version requires
qualification. `parseResourcePack` and `decodeResourcePack` are lower-level format
functions used by authored synthetic tests, not identity admission functions.

The reader owns its input bytes and returns isolated payloads. It validates
recursive item syntax, sibling indexes, directory flags, depth/count/name limits,
safe resource paths, unique names, integer-safe ranges, and complete nonoverlapping
payload coverage. It finds the root within the metadata region rather than
assuming the header's metadata pointer points directly at a directory entry.
The metadata preamble and 27-byte footer are bounded but not semantically decoded.

`live-device-layout.mjs` uses the browser's XML parser to build an intermediate
view tree. It retains property tags/attributes, child resources, expressions,
localized labels, and explicit inherited connection scopes. For example, two
oscillator instances retain scopes `['SignalChain1']` and `['SignalChain2']`.
Nested envelope resources append `Envelope[0]` or `Envelope[1]`. The parser keeps
`doc` literally; the qualified Analog adapter resolves it within the enclosing
chain/envelope context.

DTDs, malformed XML, duplicate properties, unsafe resource names and dependency
cycles are rejected. Documents, nodes, properties, attributes, nesting and total
text have separate bounds. Repeated instances share immutable property metadata.
Expressions are data and are never passed to `eval`, `Function`, or a script VM.

`live-device-view.mjs` renders the tree through the shared `live-controls.mjs`
family. It handles fixed geometry, horizontal/vertical boxes, grid coordinates,
spans and gaps, embedded views, text, PNGs, card selection and finger navigation.
Clicking or focusing a module selects its central detail page. Noise retains the
current selection. ControlManager offsets, box gaps and fixed-length spacers
are retained; bounded managers can shrink numerical grids to keep all columns
inside the panel. Envelope-toolbar captions use their natural text widths.
Live's resize/alignment/font/color semantics are not fully reproduced: this is a
layout reconstruction, not a pixel-identical Live UI runtime.

## Binding Contract

The XML has symbolic connections, not DLL parameter indices, numeric ranges,
defaults, units, conversion functions, or complete chooser entries. Controls are
disabled unless a host explicitly supplies verified metadata and callbacks:

```js
const resource = await readLiveDeviceResources({guiBytes, graphicsBytes});
const view = createLiveDeviceView(document, {
  layout: resource.layout,
  graphics: resource.graphics,
  resolveBinding: verifiedModel.resolve,
  evaluateExpression: verifiedModel.evaluate,
});
container.append(view.element);
// On host teardown:
view.dispose();
```

An accepted numeric binding has `verified: true`, finite increasing `min/max`,
an admitted `value` or a live `getState()` snapshot, optional `step/unit`, and
`onInput/onChange` callbacks. A live snapshot separates `known`, `enabled`,
requested `value`, `applied`, `pending`, and an instance `generation` (null while
disconnected). Call `view.refresh()` when the model
changes; refresh preserves the mounted view, numeric drafts, and card navigation.
The host supplies each generation's actual startup commanded value as `initial`;
dial reset restores that value rather than the pre-connection placeholder.
Toggle bindings provide a value; menu bindings must provide their option list.
Providers receive the connection's explicit scope, the source node and all
applicable ancestor/control state expressions. Expressions keep controls disabled
unless the provider explicitly takes responsibility with `handlesExpressions`.
UI navigation between cards is local preview state and does not write DSP state.

`analog-bindings.mjs` connects the pinned Analog profile to 124 admitted parameter
identities in `analog-parameter-facts.mjs`. It joins the XML's symbolic scopes to
the DLL's named module/property records and validates the full descriptor at
runtime (index, module, property, type, range). Root Volume and oscillator pitch
offsets also have causal PCM corroboration. The table contains interoperability
facts only, with no factory values or copied resource implementation. `doc` does
not add another model scope within this qualified Analog adapter.

The adapter evaluates bounded resource expressions using
`live-view-expression.mjs`, with no script execution. Mapped toggles gate their
dependent controls, and supported `ShowWhen` conditions select alternate views.
Unknown conditions remain disabled/hidden. Model/native values retain their raw
scale; `analog-parameter-display.mjs` converts admitted readouts and typed input
using the pinned host's numerical tables, units and verified chooser ordering.
This covers frequency, level, envelope times, detune, pan, routing and percentages.
Oscillator octave/semitone expose the verified signed offsets. Both
pitch-envelope initial controls expose a signed -1..1 value using qualified
magnitude/sign descriptor pairs. Other paired signed modulation, FilterType,
LFOSync, wrapper polyphony/unison/MPE and missing gate-reset associations remain
unresolved. Qualified enums, including Loop, show their original labels; other
enums retain raw numbers.

UI edits coalesce to one in-flight IPC request and one latest pending value per
logical parameter, including each magnitude/sign pair. Generations reject old-instance edits; acknowledgment revisions prevent
stale polls from replacing newer optimistic values. The native player maintains
203 lock-free packed value/revision mailboxes. A bounded, nonspinning callback
snapshot applies complete publications, including both members of a pair, before
that callback's MIDI notes. A concurrent incomplete publication is deferred.
Requested/applied
snapshots describe commanded state, not an undocumented DLL getter. Mailboxes
are separate from the MIDI queue, so a drag cannot exhaust note-release capacity.
This is block-boundary control, not sample-accurate interleaved automation.

`live-envelope-editor.mjs` supplies authored SVG pitch and ADSR editors in the
original graph positions, using shared control tokens. Handles and numeric fields
share bindings; dragging, keyboard adjustment, fine adjustment, reset and Escape
cancellation work on those same values. LIN/EXP are separate options; Legato and
Free use square switches. A disconnect, disabled field or changed generation
abandons an active gesture without writing into a replacement device.

The drawings still show normalized native parameter positions. Graph geometry,
loop shapes and Live's compiled drawing behavior are not fully qualified. The installed
layout supplies the graph classes, placement and context, not their drawing code.
The qualified Global selector exposes its Global/MPE subpages. The returned report
still identifies unresolved controls and unimplemented `AASLfoDisplay` and `LedView`
drawing classes; other generated button managers remain unsupported.

## Current Host And Boundary

The existing `analog-test.html` uses this pipeline. In the native test it reads
both packs automatically from the Resources folder containing the selected DLL.
The Rust command accepts only GUI/Graphics, bounds reads, runs off the UI thread,
and sends raw IPC bytes. The browser preview also accepts local pack selection.
An unsuccessful import leaves the previously loaded view intact.

The original Analog layout expands to 719 view instances and 175 control
instances from 17 unique view resources. This count includes hidden detail pages
and repeated embedded envelope/LFO resources; it is not a DSP parameter count.

The pipeline is reusable by the intended `[live.device~ Analog]` object. That
executable canvas object is **not registered** in the current authoring/runtime
schema. Its native instance ownership in the canvas, complete saved state,
remaining mappings/conversions, custom drawing behavior, and Alive admission
remain necessary work. Live synthesis controls are currently qualified in the
existing native Analog test host.

Startup reads `Core Library/Defaults/Instruments/Analog.adv` from that same
installation. Compressed and expanded data are independently bounded to 1MiB;
the parser admits one UltraAnalog model, direct Manual values and known scopes.
The current profile validates and encodes 126 supported logical properties into
128 native descriptors in one batch before enabling notes. Remaining settings
keep the authored neutral fallback values. Original preset content is not bundled.
Post-start transport failures stop the stream and leave the keyboard disabled.

## Verification

Run the Node suite with `node --test apps/ultra/ui/*.test.mjs`. Browser tests in
`tests/ci/live-device-resources.spec.mjs` use authored XML and cover context,
geometry, grids, state gating, control ownership/disposal, missing generated
controls, parser budgets, invalid resources, and import errors. Binding tests also
cover paired scopes, coalescing, stale polls/completions, invalid metadata/ranges,
linked controls, toggles, host IPC, and stop/restart behavior. Native tests and
private held-note PCM probes verify the production mailbox path, mute, pan and
cutoff effects independently of the browser mock.

An optional private qualification uses `LIVE_RESOURCE_DIR` pointing at the
installed Resources folder. Set `ULTRA_TEST_NO_CAPTURES=1` when running that test
so proprietary page captures/traces are not written into repository test output.
Private manual captures must stay outside the repository.
