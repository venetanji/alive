# Live Device Resource Reader Implementation Plan

**Goal:** Read Analog's original panel from the user's installed Live resource
packs and render it through Ultra's shared controls, with explicit unresolved
behavior rather than guessed DSP bindings.

**Architecture:** A bounded, original JavaScript pack reader feeds a loadable-view
XML adapter and a reusable DOM renderer. The existing Analog test can display
the imported panel; no additional device executable or bundled Live resources
are introduced. This resource layer is intended for `live.device~`; registering
that executable canvas object requires a separate native instance/state contract.

**Scope:** Preserve exact source identities, nested model context and unknown
properties. Never execute XML expressions. Read resources from the installed
application at runtime. Do not infer ranges, values, enums or DSP slot numbers.

## Tasks

- [x] Pack reader: author synthetic pack fixtures and rejection tests first;
  implement absolute-offset decoding, exact installed-pack profiles, bounded
  recursive index traversal, safe paths and complete payload coverage checks.
  Files: `apps/ultra/ui/live-resource-pack.mjs` and corresponding Node test.
  Verify with `node --test apps/ultra/ui/live-resource-pack.test.mjs` and a private
  qualification against both installed packs and their independently parsed index.
- [x] Layout adapter: parse `PropertiesNode` properties, child views, nested
  resources and language files using the browser's XML parser. Preserve connection
  scope and expression text. Reject DTDs, cycles, malformed or excessive trees.
  File: `apps/ultra/ui/live-device-layout.mjs`; browser tests use authored XML.
- [x] Renderer: use shared controls for recognized control classes and preserve
  original geometry, box layout, cards and finger navigation. Disable controls
  without an explicit binding provider. Custom display classes remain visibly
  unresolved. Files: `live-device-view.mjs`, `live-device-view.css`.
- [x] Integrate resource loading into the existing Analog test page with local
  pack selection. Keep native audio controls independent and unchanged. Use the
  same reader/adapter/renderer that an eventual canvas object can call.
  Native integration also reads both packs automatically through bounded raw IPC.
- [x] Qualify the real Analog resource tree in a browser, keep all captures and
  extracted data private, and document supported behavior and remaining native
  object/model work. Run focused browser tests and the existing Node suite.

## Acceptance Boundary

An imported panel proves resource-driven layout rendering. It does not prove
functional synthesis controls, Live expression semantics, custom display drawing,
saved complete Analog state, a registered `live.device~` object, or Alive admission.
