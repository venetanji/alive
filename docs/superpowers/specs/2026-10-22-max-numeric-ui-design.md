# Max Numeric UI Compatibility

This is the first independently shippable dependency of the complete append,
prepend, int and float help batch. The whole-help goal remains active; this
change alone qualifies no complete installed help file.

## Evidence And Scope

The original probes in `experiments/max-reference/message-ui-runtime-20261022`
directly inject typed messages into licensed Max. The retained earlier
`06-number` and `07-flonum` traces establish truncation toward zero, numeric
list repetition and silent set. The new probe distinguishes physical Tab
(outlet 1 bang) from the input selector `tab` (no output), and establishes
`send name` on int/float (stored typed value to every named receiver, no own
outlet, cold inlet ignored).

Implement those contracts with original code. Preserve the current compact
Max-inspired control appearance. No proprietary help or reference bodies are
added to distributed fixtures. Mutable message displays, print popup and the
help helper/tab adapter are subsequent independently reviewed changes.

## Document Compatibility

Keep saved type `number`, native kind 2, unchanged: two inlets, one outlet,
fractional value. Add saved type `number_int`, native kind 52 (`NumberInt`),
with one control inlet and two control outlets. Parameters are integer
`value`, `minimum`, `maximum`, defaulting to 0, -100000, 100000. Bounds must
be ordered and remain in the existing finite numeric profile. Existing ABI
struct sizes, 32 nodes, 64 cables, eight atoms and document counts stay fixed.

In authoring, `number` and alias `number.int` create the compatible integer
box. `number.legacy` addresses the old type, including when editing existing
objects. The I shortcut creates `number_int`; F remains flonum. Imported Max
`number` boxes map to `number_int` and preserve supported integral bounds.
Unqualified execution attributes and values outside the profile still report
explicit incompatibility.

## Native Behavior

NumberInt stores/emits an integer after truncating numeric input toward zero
and clipping to its bounds; bang recalls; set stores silently; numeric-led
lists repeat the resulting value twice, matching the retained oracle.
Minimum/maximum messages follow the observed flonum state machine with
integer bounds. Fractional NumberInt bound messages remain unqualified: the
runtime leaves them unchanged and literal import reports an unsupported edge.
Display values come from runtime observations, including
silent updates. Numeric parameter edits and undo/redo use the existing atomic
parameter/hot path without installing a graph or resetting another node.

Physical Tab is a UI action, never an invented Max input selector. Add
`ultra_canvas_tab_document(document, revision, node)`; it validates a live
Flonum/NumberInt node and queues one bounded action that emits a bang from
outlet 1 through the existing shared dispatch context. It runs with audio on
or off. The existing Tauri canvas_event command accepts optional `action:
"tab"`, exclusively with null value and inlet 0; normal selector `tab` is
ignored by both boxes. Wrong type, stale revision, closed document, other
action, or value/action combinations are rejected before admission.

Int and Float implement hot `send <single symbol>` using the shared named
message bus and the stored value's type. No ordinary output occurs, values
and destination names are unchanged, the cold inlet ignores it, and the
existing shared dispatch budget bounds cycles. Import admission accepts
plain-name send methods and refuses unresolved scoped names.

## UI And Verification

Reuse the existing numeric face, resize, theme fields, selection, Inspector
and lock behavior. Integer text entry truncates toward zero before hot
admission. Tab first commits pending text, then admits the distinct Tab
action in order, then allows browser focus navigation. Unlocked inactive
inputs do not emit. Descriptors, history, save, owner close and runtime
revision semantics remain unchanged.

Meaningful tests cover both signs, bounds, silent set, repeated list output,
port shapes, legacy preservation, runtime observation, hot edit/history
admission, selector/physical Tab distinction, cross-document typed send,
cold send, stale/invalid action rejection, and browser keyboard behavior.
Run relevant JS/native/Rust/browser suites and the existing required
contracts and build. Perform one bounded visual inspection using the
incumbent Impeccable world; do not restart the completed polish cycle.
