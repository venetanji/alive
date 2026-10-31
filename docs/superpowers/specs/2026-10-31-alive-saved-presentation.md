# Saved Ultra Presentation In Alive

Delivery 1 of `experiments/native-devices-20261031/alive-device-hosting.md`.
The complete hosting goal remains active through the later native, device-family,
audio-input, MIDI-effect and composite-preset deliveries.

## Document Contract

Every current authored root and nested patcher stores `presentation: null` or
the following independently versioned record. A reusable device requires a
non-null root presentation; an empty `items` array is a deliberate empty surface.
Update current producers, examples and fixtures directly. No migrations,
old-document readers, inferred-layout fallbacks or second inspector.

```json
{
  "presentation": {
    "version": 1,
    "openOnLoad": false,
    "size": {"width": 640, "height": 220},
    "items": [{
      "id": "cutoff",
      "kind": "control",
      "target": {"kind": "parameter", "node": 7, "param": "cutoff"},
      "widget": "dial",
      "label": "Cutoff",
      "rect": {"x": 8, "y": 8, "width": 72, "height": 88},
      "included": true,
      "visible": true,
      "style": {"accent": "default", "labelPosition": "above"}
    }]
  }
}
```

- All objects are closed; reject unknown keys, unsupported versions and invalid
  target/widget combinations in JS and Rust. Validate authored nodes before
  hierarchy lowering; never put presentation into the executable graph.
- At most 128 items, 8 installed panels and 64 KiB of presentation JSON across
  the authored document. Never truncate. Existing graph/hierarchy bounds remain.
- Item IDs are document-wide unique ASCII `[A-Za-z_][A-Za-z0-9_-]{0,63}`.
  Surface dimensions are integers 1..8192. Coordinates are integers 0..8192;
  dimensions are 1..8192 and rectangles fit their owning surface. Array order
  determines paint/tab order; overlap is allowed. No redundant z-index field.
- `included` controls surface membership; `visible` is static authored visibility.
  Effective visibility also respects resource pages/conditions without changing
  those booleans. Excluded items remain available in the authoring outline.
- Control targets are `parameter {node,param}`, `event {node,inlet,action:"bang"}`
  or `text {node,param:"text"}`, with an explicit `kind` discriminator.
  Parameters must be live nonstructural numeric parameters. Events are restricted
  to registry-supported bang/message inlets; text is a display-only supported
  comment/message field. No scripts, arbitrary HTML/CSS, paths or native indices.
- Widgets: `dial`, `slider`, `number`, `toggle`, `menu`, `radio`, `button`, `text`.
  Numeric widgets require parameter targets, toggle a Boolean range, menu/radio
  an integer range and `options:[{value,label}]` covering its domain with at most
  32 unique choices. Button requires event; text requires text. Other items
  cannot contain options. Labels use 0..64 printable ASCII bytes; option labels
  use 1..64. Descriptor ranges/units/integralness belong to targets, not items.
- Style is `accent: default|cyan|orange|neutral`; controls also require
  `labelPosition: above|below|hidden`. Reuse validated comment appearance through
  text targets. Installed children retain their profile layout and colors.
- An installed panel item uses `kind:"livePanel"`,
  `target:{node,profile}`, `rect`, `included`, `visible`, and
  `style:{accent}`. Its source is an existing `live_device` with the exact saved
  profile identity. Installed resources resolve through that profile; neither
  machine paths nor proprietary resource bytes enter the document.
- Root items can target descendants; nested scopes target their own subtree.
  Alive mounts the root surface. Duplication remaps node and item identities;
  deleting nodes removes dependent items atomically. Retyping removes/rebinds
  incompatible items explicitly or refuses the edit.

Remove the manifest-v1 reader and update current instrument producers to the
existing typed manifest-v2 shape. Permit 0..16 exposed scalar parameters. The
later typed musical contract will add timed event output; no MIDI-effect host
admission is implied here.

## Canonical Ownership And Renderer

Presentation belongs to the canonical `CanvasDocument` and its existing history,
dirty/save/shared-window flow. A move/resize is local preview followed by one
history edit; Escape cancels. Presentation edit/undo/redo must leave desired and
applied execution revisions, active notes, graph banks and transport unchanged.
Never reinstall DSP to change surface layout.

One `mountPresentation({doc,root,presentation,host,mode,onError})` renders Ultra
preview and Alive cards; it returns `update`, `dispose` and draft inspection.
Use shared `live-controls` and the installed-resource body renderer. No automatic
keyboard, wires, canvas node chrome, audition footer or path chooser.

Each mount receives an instance-scoped host adapter:

```text
scope = {ownerId, generation, instanceId, sourceRevision}
resolve(target) -> {bindingId, descriptor, capabilities}
snapshot(bindingId) -> {commanded, applied, effective, owner, enabled, revision}
subscribe(callback) -> unsubscribe
beginGesture(bindingId) -> gestureId
write({scope,bindingId,gestureId,phase,value}) -> accepted snapshot
writeBatch({scope,sourceNode,gestureId,phase,values}) -> accepted complete state
sendEvent({scope,target,action}) -> accepted result
acquirePanel({scope,sourceNode,profile}) -> immutable resources + scoped bindings
```

Phases are `preview|commit|cancel`; the adapter owns persistence/history.
Preserve commanded/applied/effective distinctions and atomic compound writes.
Immutable resource caches can be shared by exact artifact identity. Mutable
bindings, drafts, resource pages, pending replies and selection are per mount.
Capture scope before async work; stale replies and writes cannot affect another
root/instance. Use owner-level observation, not one polling timer per card.
Hiding or disposing a surface only disposes its UI subscription; playback stays
owned by the track/document host.

Ultra resolves numeric/event/text targets against its canonical authored tree.
Alive routes exposed controls through existing authorized base/effective
ownership and publishes the validated saved surface in `HostManifest` snapshots.
For this delivery, Alive refuses a required unexposed numeric/event target at
admission with its exact unsupported capability before replacing accepted state.
Text is display-only. This preserves useful Ultra authoring without claiming
unsupported Alive controls work. Installed panel binding can be verified with a
fake scoped host here; actual Analog state/resource commands and native playback
remain delivery 2. Missing resources render a stable sized error surface without
mutating native state.

The existing card cache remains responsible for field drafts during navigation.
Surface replacement participates in focused-draft guards. Card selection,
bypass, effective readings, automation, actions and horizontal insertion remain.
Wide surfaces scroll at natural scale inside Devices at 800x600 and larger
windows; they do not overflow the whole window or shrink controls unreadably.

## Authoring And Max Import

Use existing toolbar, Inspector, lock/edit conventions and shortcuts. Provide
Patch/Presentation modes, include/exclude, target/widget binding, selection,
multi-move, resize, order, rectangle, visibility/style and preview controls.
Mode navigation preserves invalid drafts. Surface gestures produce one undo;
controls operate in preview and presentation authoring can run during audio.

Import actual Max `presentation`, `presentation_rect`, `openinpresentation`
per patcher scope while preserving patch coordinates. Valid missing presentation
rectangles initialize from Max patching rectangles; malformed explicit rectangles
produce diagnostics rather than silently clipped geometry. Preserve box order,
inclusion and scope default mode. Supported numeric/toggle/slider/bang/message/
comment presentations must operate with their existing Ultra patch semantics.
Unsupported widgets/styles retain source/scope diagnostics under the existing
strict/partial import policy. Do not claim arbitrary Max presentation support.

## Acceptance

JS/Rust agree on a shared valid/invalid corpus, bounds, identities, nested targets
and empty surfaces. Save/reopen/shared-document history preserves the layout;
presentation edits do not call canvas apply. Both hosts render the same saved
surface with no keyboard. Two same-source cards remain independent, including
automation and unfinished drafts; stale writes fail. Fake installed panels prove
resource/page/compound binding behavior without claiming native host admission.
Actual browser load/drop, failed-load rollback, source selection, editor closure
and compact/normal sizing continue working. All installed authored resource and
source hashes are checked for the tested build before launcher/PR integration.
