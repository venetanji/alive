# Executable Embedded Patchers

The Max fidelity review is complete; its compact canvas, controls, inspector,
console and keyboard refinements remain the visual baseline. This phase adds
the executable document hierarchy needed by Max help patches. It does not
claim whole-help conformance or implement JavaScript help dependencies.

## Ownership And Scope

One root file owns one saved tree, undo history and native graph. Embedded
patchers do not allocate audio slots. The first editor view navigates that tree
with a compact breadcrumb and double-clickable `p` objects. Navigation must not
apply, stop or reset the graph. Independent native child views are the next
ownership phase; they must attach to this same document, rather than create
another runtime. Existing independent root windows retain their behavior.

An explicit version-2 envelope is used:

```json
{"version":2,"profile":"ultra-patcher-v2","nodes":[],"edges":[]}
```

A container node has the existing id/x/y/style shape, type `patcher`, params
`{"name":"basic"}`, and a `patcher` field containing `{nodes,edges}`. Names are
1-127 printable ASCII characters. All node IDs, including containers and
comments, are globally unique integers 1 through 4294967295. A comment uses
type `comment` and params `{"text":"..."}` (at most 4096 printable ASCII bytes,
with tab/newline allowed). Connectors use type `inlet` or `outlet`, params `{}`.
Unknown fields are rejected. Version 1 remains strict and flat.

Authoring limits are 1 MiB serialized JSON, 512 total nodes, 1024 total cables,
and 16 embedded-patcher levels. Execution retains the existing 32 native nodes
and 64 native cables, counting boundary relays. Exceeding a limit produces a
specific error and never truncates the document. This executable subset does
not yet admit unresolved objects or retain unimplemented Max execution attrs.

## Boundaries

Each child inlet/outlet remains an explicit native relay (kinds 50/51).
Containers and comments do not execute. Parent destinations/sources map to
the child's inlet/outlet relay at port zero. Internal and parent edge array
order are preserved. Connector order is ascending x; ties retain saved node
array order. Saved Max `index` and y do not override this ordering.

Relays carry control and mono signals independently. Control dispatch remains
synchronous and depth first; signal inputs sum once per sample. Signal
activity propagates from actual DSP sources through relays, so an undriven
relay does not disable a downstream arithmetic object's scalar fallback.
Signal samples do not emit numeric control events. Distinct relay paths
remain distinct and sum even when their ultimate endpoints coincide.

Surface ports differ from executable relay ports: an inlet connector has no
surface inlet and one mixed outlet; an outlet connector has one mixed inlet
and no surface outlet. Containers expose their ordered child boundaries.
Cables stay within their authoring scope. Mixed boundaries allow control-only
taps from signal-bearing outlets; each edge carries only domains accepted by
its target. Control and active signal cycles are checked separately.

## Editor And Import

The visible patcher and complete saved document are distinct. IDs survive
navigation and edits. Undo/redo operates on the whole tree; returning to a
parent preserves all edits and live observations. Save/export always includes
the root tree. Geometry and appearance changes keep playback running.
Reordering boundary positions must remap parent cables to the same boundary
identities in the same history transaction. Removing a boundary removes its
parent cables. Structural edits retain the current documented runtime reset
behavior; view navigation never triggers it.

Max import remains data-only and diagnostic. Supported embedded `p` graphs,
comments and generic inlet/outlet boxes can become v2 trees. Unsupported
helpers, scripts, attributes and initialization remain explicit blockers or
partial-import diagnostics. A supported basic fragment is not a complete
help-file implementation. No proprietary help bodies are checked in.

## Verification

Use the original disposable-Wine probe evidence in
`experiments/max-reference/hierarchy-reference-20261021/` for connector order,
mixed boundaries and view lifecycle. Test both JS and independent Rust schema
validation/lowering, malformed cross-scope edges, duplicate global IDs,
separate cycles, boundary rewiring, tree history and complete serialization.
Native tests cover message/audio coexistence, undriven fallback, nested
relays, signal sums and distinct parallel paths. Browser tests cover navigation
without graph installation and return/save behavior. Existing required ABI,
native, Rust, JS and browser checks must continue to pass.

## Deferred Contracts

Child native window ownership, document-wide native CAS/history, creation-time
initialization, external abstractions, #0/#1 substitution, help JS adapters,
larger executable plans and Max's signal-connection announcement are separate
work. None is represented by a silent no-op. Whole-help conformance remains
0/2103 until complete original files execute with supporting evidence.
