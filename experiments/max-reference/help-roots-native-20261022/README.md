# Native complete-help-chain scorer

This directory contains original scorer infrastructure. It does not contain
installed Max graphs, help prose, helper scripts or copied source payloads.
Installed roots and imported authoring trees must stay in a private temporary
directory. The coordinating importer/exporter supplies source hashes, scoped
anchor maps, authoring hashes and production-Rust-prepared native descriptors.

`apps/ultra/tests/help_root_runtime_test.cpp` executes those descriptors through
the production `compile_canvas`, `CanvasWorkspace` and `CanvasRuntime` paths.
It never opens Max, desktop windows or an audio device. The runner leaves the
input graph templates immutable and copies them on installation. It does not
add observer boxes/cables or reorder the imported executable graph.

## Build and original regression tests

```sh
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/help_root_runtime_test.cpp -o /tmp/ultra-help-root-native
/tmp/ultra-help-root-native --self-test
python experiments/max-reference/help-roots-native-20261022/test-runner.py
python experiments/max-reference/help-roots-native-20261022/test-replay.py
```

The Python test compiles fresh traced and untraced runners, drives an original
append-to-cold-Message fixture, and compares every nontrace result. The untraced
build defines `ULTRA_HELP_ROOT_NO_TRACE`, so the production headers contain no
observer fields or observer branches. C++ self-tests also compare a null
observer with a recording observer, check explicit fanout order, distinguish
cold Message input from output, retain a refused input without inventing an
output, skip Iter continuation pseudo-inputs, and check typed workspace sends
and receiver removal on close.

Transport regressions also check contextual `$1` replacement admission at the
Message cold inlet and hot `set` method, rejection at other receivers/inlets,
and authored parameter admission remaining separate from runtime bounds changed
by messages. Accepted parameter edits update the scorer's admitted plan;
ordinary runtime events do not.

For sanitizer checks add `-g -fsanitize=undefined
-fno-sanitize-recover=all` to the C++ build, then run both self-tests and the
Python tests with `--binary /tmp/ultra-help-root-native`.

## Private transport version 1

All fields are whitespace-delimited. Text is ASCII encoded as hexadecimal;
`-` means empty. Strings with a NUL byte are refused. No JSON escaping or shell
interpolation is involved. Native kind IDs and parameter slots come from the
production Rust exporter, rather than a second hand-maintained schema.

```text
help-root-native-v1 TEMPLATE_COUNT
graph TEMPLATE_ID NODE_COUNT EDGE_COUNT
NODE_ID KIND DEVICE COUNT P0 P1 P2 P3 P4 P5 TEXT_HEX_OR_DASH
...one row per node...
FROM OUTLET TO INLET
...one row per edge, preserving exact prepared order...
...additional graph templates...
OPERATION_COUNT
STEP_ID install DOCUMENT TEMPLATE_ID REVISION
STEP_ID event DOCUMENT NODE INLET SELECTOR_HEX_OR_DASH ATOM_COUNT TAG VALUE SYMBOL_HEX_OR_DASH ...
STEP_ID param DOCUMENT NODE SLOT VALUE HOT_0_OR_1
STEP_ID tab DOCUMENT NODE
STEP_ID close DOCUMENT
```

There are at most 16 templates/documents, 32 native nodes, 64 edges, 4,096
operations and eight atoms per message. Graph templates omit revision because
each installation supplies it. Revision must increase within a document slot,
including after close. Event/Tab/parameter operations use the installed
revision. Native atom tags are 0=int, 1=float and 2=symbol. A numeric atom has
symbol `-`; a symbol has numeric value 0. Scalar/bang input selectors are empty
in the native representation. A saved Message/button click is a bang event at
its source anchor; the scorer must not reproduce its source text as an input.

Invalid transport exits nonzero; discard partial stdout on any nonzero exit.
A well-formed runtime refusal produces a row with `accepted:false`. The caller
must check acceptance, graph failure, trace overflow and console drop counts
before making a passed comparison claim.

Message transport validates bounded fields and defers target/inlet syntax to
production event admission. Parameter action acceptance mirrors backend
parameter admission: a later optional hot trigger can emit a refusal receipt
without undoing the admitted parameter. Inspect console and ordered receipts
when asserting output behavior; acceptance alone is not a parity assertion.

## Private JSONL output and public evidence

Each operation emits one JSON object containing `step_id`, `action`,
`document`, `accepted`, `failed`, `templates_unchanged`, `trace_overflow`,
`trace`, `console` and `snapshots`. `snapshots` lists every live document and
its native revision, numeric observations and Message content. Message state
contains `empty`, `generation`, `prototype`, `arguments` and `placeholders`.
An empty Message's placeholder prototype is not evidence of a received bang:
always inspect `empty` separately. Reinstallation starts from the unchanged
template, independently of the prior runtime's cold display contents.

Trace records contain step-local `ordinal`, `document`, `node`, `phase`, `port`
and `message`. The production scheduler invokes a bounded, allocation-free
observer at scheduled input processing and at actual output before edge pushes.
Inputs later refused by their receiver still have an input receipt and no false
output; the step's acceptance records the refusal. Continuation scheduling
items are not exposed as inputs. The trace gives global interdocument ordering;
the console array is drained in document order and must not be used to infer
global ordering.

Messages contain semantic `selector`, diagnostic `raw_selector`, and `atoms`
objects with named `tag` (`int`, `float`, `symbol`) and `value`. An empty raw
selector maps to bang, scalar int/float/symbol, or list according to atom count
and type. Explicit raw selectors are retained. Max's list numeric subtype can
be `unknown-number` in reference evidence; do not manufacture an exact subtype.
Cold Message replacement can normalize raw `list` to an empty raw selector
while preserving semantic selector/atoms. `raw_selector` is therefore not a
required Max serialization parity field.

The output contains source-owned runtime text and is private. The orchestrator
maps native IDs to scoped source anchors and replaces source-owned symbol/text
payloads with stable aliases/digests before retaining public evidence. Persist
source hashes and assertion outcomes, never private complete imported graphs
or raw runtime payloads. `templates_unchanged` checks native descriptor copies;
the importer/exporter must independently compare the full authored-tree digest.

This runner supplies native execution and message-order evidence. It does not
establish physical entry/drag/Tab interaction, visual formatting, exact-source
recognition, import diagnostic completeness, Rust preparation or installed-root
qualification by itself. Those gates belong to the coordinating workflow.

## Production Import Replay

`import.mjs` verifies a recognized installed root and all helper identities,
then calls the production importer and hierarchy lowering. It creates a new
private bundle outside the worktree. `help_root_export.rs` calls production
Rust preparation on that authoring JSON; exported text is reversible hex and
the new native file therefore uses owner-only permissions.

`replay.py` consumes these exact descriptor fields and the scoped source map,
without rebuilding the graph or maintaining native kind/parameter tables. Its
finite event score binds each step to the imported source hash and an actual
executable anchor. Raw transport and runner output remain in a new mode-0700
private directory. Public results hash source-owned symbols/custom selectors
through the same `help_runtime.public_message` function as the Max harness.
Acceptance, failure, trace overflow, Console drops, immutable templates, full
operation coverage and authoring/descriptor retention must all pass.

Without `--explicit-lifecycle`, replay retains the event-only score format and
automatically installs each document at revision 1 before the declared events.
Use `--explicit-lifecycle` for a timeline that declares every owner operation;
this mode inserts no installs. Every row requires a unique safe `step_id`,
`action`, `document` and the bundle's exact `source_sha256`.

| Action | Additional Required Fields |
| --- | --- |
| `install` | Positive integer `revision`; installs that document's unchanged template into its existing slot. |
| `event` | Executable `anchor`, integer `inlet` and typed `message` with `selector`/`atoms`, as in the legacy score. |
| `tab` | Executable `anchor`; invokes the native Tab callback. |
| `close` | None; removes that independent owner. |

Fields belonging to a different action are refused. The existing `row`,
`ordinal` and `interaction` annotations are optional; other extra fields are
refused. Installation revisions must fit a positive uint64 and increase within
the document slot, including after close. A declared later install can replace
a live owner and reset its runtime; use an explicit close first when the score
requires receiver removal. Event/Tab on an absent owner and repeated close are
refused before execution. An authoring-only source anchor cannot be an event or
Tab target. Target/inlet and Tab-kind admission remain in production native code.
Bang messages require no atoms; scalar `int`/`float` messages require exactly
one atom with the matching tag. Named `symbol`, explicit `list` and custom
selectors retain their native meanings. Contextual Message replacement syntax
continues to be admitted by the production target/inlet rules.

Explicit replay requires exactly the declared result IDs, actions and document
slots in order. Every result must contain exactly the modeled live owners and
their current revisions, with one snapshot of every prepared native node.
Duplicate/missing owners or nodes, stale reinstall revisions, receipts from a
closed owner and unknown receipt nodes fail the run.
Every event's first native input must match its declared owner, executable
anchor, inlet and semantic selector/typed atoms, including the sign of float
zero. A Tab must start with the declared control's outlet-1 bang. Diagnostic
`raw_selector` is ignored for this binding. The same source-owned text
redaction and all runtime/retention gates apply; every bundle remains covered by
before/after hashes even while its owner is closed. The original replay tests
compile a fresh runner and exercise delayed receiver installation, typed named
send, Tab, close/removal and revision-2 reset, plus the CLI and refusal gates.
Native Tab evidence alone does not establish physical keyboard interaction or
shared product-view behavior.

`compare.py` requires a completed original-Max capture with source protection,
owned cleanup and a proven nonvisual Message-readback capability. It checks the
actual score-file hash, declared inputs, initial/per-step checkpoints and every
Message anchor before comparing outlet values and observed Message contents. A
missing checkpoint cannot become a successful empty comparison. Numeric types
inside Max JS lists remain unknown; per-anchor equality does not prove the
relative order of original destination deliveries or Print rendering.

The default `private-serialization` method retains its serialization checks.
The explicit `v8-boxtext` method instead requires validated initial/live Message
strings, exact runtime box/endpoint retention counts, unique independently
recorded request identities and unchanged working files. Its result reports
`all_message_states_match` while `all_serialized_message_states_match` is null.
It preserves `saved_order_observed=false` and explicitly leaves saved authoring,
order, view and gesture gates unresolved. Method/status mixtures, missing
requests, false capability gates and additional retention claims fail closed.

Original tests for these bridges run in `check-contracts.sh`. The Rust exporter
integration tests also require a built `help_root_export` example. A first
33-action native append/prepend score produced 59 output and 89 input receipts
with all native gates passing. A fresh lifecycle-compatible replay retains all
148 receipts exactly. Capture008 now supplies a completed original-Max score:
`results/append-prepend-comparison-008.json` reports matching values for all
59 outlets and matching content for all 231 Message checks over 35 checkpoints.
The comparison preserves 27 unknown numeric list-atom tags, unobserved saved
cable order and null serialized-state parity. Independent evidence review finds
no material issue. This finite comparison adds no installed-root qualification.

`int-float-score.json` extends the native-only evidence to the complete private
int/float production bundles with 48 original events and six explicit lifecycle
operations (four installs, two closes). The retained UBSan run completes all
54 operations with 168 input and 174 output receipts and no runtime failure,
overflow, Console drop or stderr diagnostic. Independent read-only verification
passes 644 assertions: each of 21 main actions emits one typed numeric-display
output before one button bang, and 13 named sends produce 23 exact deliveries
to the currently live receivers. Cold storage, half-scale float arithmetic,
display-only edits, source-reset reinstall and surviving-owner retention are
checked separately.

Public evidence is `results/int-float-native-score-current.json` and
`results/int-float-native-assertions-current.json`; the latter binds the score,
binary, replay source, private raw output and retained private verifier hashes.
The coordinator's fresh verifier output is
`results/int-float-native-verification-current.log`. Source-owned initial values
are read from the private prepared checkpoints rather than copied into the
score. This does not establish Max parity, physical/shared-view behavior or
installed-root qualification; all qualification increments remain zero.
