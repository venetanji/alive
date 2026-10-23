# Cable midpoint model and import report

Implemented optional saved cable midpoint geometry in the flat v1 and hierarchical
v2 authoring contracts. This report covers model, importer and Rust preparation;
rendering and desktop/native integration evidence belong to the parent task.

## Contract and implementation

- `canvas-cable-geometry.mjs` exports `validateMidpoints(value)` and
  `translatedMidpoints(edge, positions, nodes)`. Valid values are cloned flat,
  even arrays containing 0..256 finite numeric coordinates in 0..4000. Empty
  arrays, repeated vertices, fractional coordinates and ordering are preserved.
  Null, wrong types, sparse arrays, odd lengths, excess vertices, nonfinite and
  out-of-range coordinates reject without coercion.
- Flat and hierarchical validation preserve the optional attribute, retain
  required endpoint fields and continue rejecting unknown cable fields.
- Moving one endpoint leaves bends absolute. Moving both endpoints by equal
  x/y deltas, allowing floating point subtraction roundoff, translates the
  bends; different deltas leave them absolute.
  Movement is local to the visible patcher. Translation beyond bounds rejects
  the complete cloned edit before document or history changes. Undo/redo restores
  complete saved geometry.
- Hierarchy lowering explicitly constructs endpoint-only edges. Standalone
  execution and topology fingerprints also explicitly construct endpoint-only
  edges, including flat v1 documents. Geometry edits and history therefore retain
  runtime revision and live observations without native graph/parameter calls.
- Rust deserialization validates optional midpoint arrays for both versions;
  explicit null is rejected rather than treated as absence. The validated field
  is authoring-only, and `NativeEdge`/native graph capacity and ABI are unchanged.
- Max import retains valid arrays on the correct cable through fanout ordering.
  Valid arrays no longer produce a midpoint appearance warning. Invalid geometry
  produces one `appearance-gap` warning for the attribute and is omitted while
  an otherwise executable cable is retained. Other diagnostics are unchanged.
- Existing shared-controller code already preserves observations when native
  runtime revision is unchanged; no production shared-controller change was
  required. `PATCH_PROTOCOL.md` records the contract and movement limitation.

## Verification

Red phase before implementation:

- `node --test apps/ultra/ui/canvas-cable-geometry.test.mjs apps/ultra/ui/canvas-model.test.mjs apps/ultra/ui/canvas-hierarchy.test.mjs apps/ultra/ui/canvas-max-import.test.mjs`
  failed as expected: 79 passed, 7 failed, covering the missing helper, rejected
  midpoint schema and dropped import geometry. Log:
  `/tmp/ultra-cable-model-red.log`.
- Focused Rust `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --locked cable_midpoints`
  failed as expected on `unknown field midpoints`. Log:
  `/tmp/ultra-cable-rust-red.log`.

Green phase after implementation:

- The same focused JavaScript command: **88 passed, 0 failed**. Log:
  `/tmp/ultra-cable-model-green.log`.
- `node --test apps/ultra/ui/canvas-shared.test.mjs`: **27 passed, 0 failed**.
  Log: `/tmp/ultra-cable-shared.log`.
- Focused Rust command: **1 passed, 0 failed**. It checks flat and nested valid
  and malformed geometry, unchanged native endpoint data, and matching native
  execution/revision despite authoring midpoint changes. Log:
  `/tmp/ultra-cable-rust-green.log`.
- Full debug `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --locked`:
  **109 passed, 0 failed, 2 ignored**. Log:
  `/tmp/ultra-cable-rust-full.log`.

Rust commands used the existing local toolchain and existing native library:

```sh
PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" \
CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo" \
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" \
LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --locked
```

## Qualification boundary

The movement policy is a documented Ultra editor policy pending direct Max
movement evidence. No Max/Wine process was launched, no native library rebuilt,
and no renderer or CSS files were edited by this work. The tests establish
authoring geometry preservation and execution exclusion; they do not establish
visual equivalence. Parent-owned renderer, browser, native owner/history and
desktop checks remain separate evidence. Whole-help conformance stays **0/2103**.

## Durable review verification, 2026-10-22

The earlier `/tmp` logs are historical references and are no longer available.
Fresh focused verification is retained under
`experiments/max-reference/cable-verification-20261022/results/`:

- `focused-js.log`: the geometry, SVG path, model, hierarchy, Max import and
  shared-controller test files run together: **121 passed, 0 failed**.
- `focused-rust.log`: `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml
  --locked cable_midpoints`: **2 passed, 0 failed, 110 filtered out**, using the
  existing local toolchain/native library and the environment listed above.
  In addition to schema/lowering checks, this runs the actual shared native
  owner/history regression in `document_commands_tests.rs`. Geometry commits
  from root and child views, stale CAS, Undo and Redo retain runtime revision,
  live message text and Print receipts. Clearing the sink and banging the
  source after every transition proves a fresh native recall still emits the
  retained value and pulse.
- `strict-delta-regression-red.log`: a controlled in-memory substitution of the
  former strict endpoint-delta comparison causes **3 passed, 2 failed** in the
  five geometry tests, specifically fractional equal movement and boundary
  roundoff. Repository source is unchanged by this red check. The retained
  operand-scaled tolerance passes those tests while different endpoint moves,
  genuine overflow and atomic document/history rejection remain covered.

Independent implementation review is recorded in `cable-code-review.md`.
No unresolved P1/P2 findings were found in the reviewed midpoint scope. This
focused verification does not rerun the full suite, rebuild native code, or
claim browser/desktop/Max movement equivalence; those remain parent/oracle
evidence responsibilities.
