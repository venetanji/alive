# Native Object Batch

The ten mapped objects now have bounded native implementations, editor entries,
aliases, port help and original runnable examples. `line` was previously absent
because the earlier batch only mapped reference files and measured help intake;
rebuilding that earlier code could not add the object.

## Available Behavior

| Object | Implemented Contract |
| --- | --- |
| `int` / `i` | Truncate toward zero; hot store/output; cold store; bang recall; silent `set`; numeric list-head handling. |
| `float` / `f` | Floating-point storage/output with the same hot/cold, bang, `set` and numeric list-head behavior. |
| `flonum` | Native float box with bounds, decimal display, silent `set`, `min`/`max`, numeric input/list handling and second-outlet Tab bang. |
| `slider` | Raw pointer positions 0..size-1; `mult` and `min` scale the outlet as raw*mult+min. Integer/float output, numeric input, bang recall, silent `set` and runtime `setminmax`. |
| `pack` | Up to eight typed fields, hot first inlet, cold other inlets, short list updates preserving trailing fields, excess fields ignored, bang recall and silent `set`. Creation `i`/`f` mean zero integer/float slots; other symbols are literal initial symbol slots. |
| `unpack` | Up to eight typed outlets; synchronous right-to-left distribution, coercion, short/excess input behavior and stored bang recall. |
| `select` / `sel` | First-atom matching, integer-selector truncation, leftmost duplicate match, match bangs and unmatched message forwarding. A single selector has a cold replacement inlet. |
| `route` | Symbol/numeric selector matching, stripped matching remainder, empty remainder as bang, complete unmatched forwarding, and additional cold selector-store inlets. |
| `trigger` / `t` | Synchronous right-to-left output, with each downstream chain finishing first. `i/int`, `f/float`, `b/bang`, `l/list`, `s/symbol` conversions and literal constants. |
| `line` | Target/time ramps, three-element target/time/grain messages, bounded queued target/time pairs, three inlets, grain output, completion bangs, `set`, `stop`, `pause` and `resume`. Explicit integer/float output modes and bounded automatic output selection. |

`line 0 20` means initial value 0 and grain 20 ms. `@time` can supply the next
ramp duration; a numeric value in the middle inlet also supplies that duration.
Use a message such as `100 500` to specify target and time together. Consuming a
target consumes its stored duration, as documented by the installed reference.
Pause continues emitting the held value at grain intervals; stop cancels output.

All controls execute in native code with audio off. A 2 ms worker calls the
native clock entry point while holding the same control mutex as graph and
audio lifecycle commands. The audio callback owns the runtime while audio runs;
the worker advances it only after the engine has fully shut down. It discards
audio commands rather than opening an audio device. Both paths use the same
48 kHz frame scheduler and bounded dispatch. Catch-up after suspension is capped
at 100 ms per worker tick. Structural edits and audio start/stop reset graph
state and stop timers; layout changes do not.

## Limits And Reference Boundary

The document remains `ultra-canvas-v1`, with 32 objects, 64 cables and 64 KiB.
Typed messages and creation configurations have at most eight atoms, 127 ASCII
bytes of literal text, symbols up to 31 bytes, and numbers within
-100000..100000. A selector may precede eight payload atoms. Quotes, escapes,
substitution and comma/semicolon message syntax are rejected. Typed C ABI
messages retain int/float/symbol tags; JSON numeric arrays infer numeric tags.

This is a useful Max-oriented subset, not complete Max compatibility:

- Named global `send`/`receive`, pack `nth`/`send`, arbitrary Max attributes,
  dictionaries, scripts, dependencies and hierarchy remain unsupported.
- Select's `matchfloat`/`exact` and `fuzzy` options and route's special message
  category selectors are not implemented. Extra route inlet behavior follows
  Ultra's explicit selector-store contract; no original Max oracle was retained
  for those inlets.
- Slider supports a horizontal native range control. Appearance attributes,
  relative dragging and every Max size/mode normalization rule are not covered.
  Runtime `setminmax` changes scaling in native state; the editor's saved
  attributes remain the authored configuration.
- Flonum decimal places affect presentation, not stored precision. Max's full
  drag, selection and appearance behavior is not reproduced.
- Line supports at most four queued target/time pairs. There is no retained
  live Max line timing oracle. Automatic numeric output uses the documented
  distance/step rule but does not retain the lexical type of the initial
  argument; use `@floatoutput 0` or `@floatoutput 1` for explicit output type.
  Max clock selection and compatibility modes are not implemented.
- Native status exposes numeric values and pulse counts, not a full typed
  message trace or current runtime attribute inspector.

Existing retained Max scores informed scalar coercion, typed pack fields,
unpack ordering and recall, select truncation/unmatched bang, and route selector
stripping. New native tests exercise these cases directly. These tests do not
constitute a complete replay/comparison of every Max output or a new Max run.

## Examples And Verification

`apps/ultra/examples/README.md` describes ten original `.ultra` patches. The same
patches are embedded in `canvas-object-examples.mjs` for each object's Help /
Open runnable example patch action. Importing an example stops pending work;
lock and explicitly operate a control to run it.

The Rust/native FFI test admits every example through actual Rust preparation
and native installation, then exercises all ten object kinds with audio off.
The native object suite checks typed parsing, coercion, cold inlet silence,
depth-first outlet order, selector routing, paused/interrupted/queued ramps,
completion, runtime parameter retention and sample partition invariance. A
separate real C ABI test advances a timed line without an audio device. Editor
and rendered Chromium tests cover authoring, dynamic ports and UI operation.

The installed `.maxhelp` files still fail intake because no Max-document
importer exists. Their original helper classes and scripts are not these
original Ultra examples. `help-compat-results.json` reports 10 supported
canonical types separately from zero whole-help execution passes.

```sh
c++ -std=c++17 -O2 -Wall -Wextra -Werror \
  apps/ultra/tests/patch_graph_objects_test.cpp -o /tmp/ultra-object-tests
/tmp/ultra-object-tests
node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs
CARGO_HOME=/home/venetanji/.cargo bash apps/ultra/build.sh
CARGO_HOME=/home/venetanji/.cargo cargo test \
  --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
```
