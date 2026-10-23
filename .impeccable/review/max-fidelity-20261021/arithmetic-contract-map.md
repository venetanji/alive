# Arithmetic contract map

Read-only prerequisite mapping on 2026-10-22 for `-`, `/`, `%`, `!-`, `!/` and
`abs`, including the existing `+` and `*` compatibility boundary. This is a
proposed contract for the next implementation, not a runtime qualification or
an implementation change. No Max process was launched, no tests were run, and no
licensed scripts, patch assets or reference prose were copied into the repo.
Reference statements below are paraphrases of installed metadata.

## Recommendation and alternatives

Extend the existing `add`/`multiply` kinds with an explicit structural numeric
mode, retain their old behavior when the mode is absent, and append six native
kinds for the missing operators. Use `numericmode:0` for legacy Ultra arithmetic,
`1` for integer arithmetic and `2` for floating arithmetic. Encode that same
value in native `p1`; leave `p0` as the stored right-inlet creation operand.
Keeping native zero as legacy preserves existing zero-initialized C ABI callers
as well as saved rhs-only Ultra documents.

Two other approaches are possible but less suitable for this bounded change:

- Separate Max add/multiply node types would isolate legacy behavior, following
  the existing legacy/new number and Message precedent, but require eight new
  kinds and parallel catalog entries for two nearly identical operations.
- Keeping raw creation-argument text as the only type signal would retain its
  spelling, but parameter editing, validation and native preparation would all
  need to parse it again. The existing numeric `rhs` authoring field would still
  need a migration rule. A saved explicit mode is smaller and easier to inspect.

The six missing classes can use two control inlets/one control outlet, except
`abs`, which has one control inlet/one control outlet. They do not require a
larger graph, atom count or ABI structure. Division/modulo zero behavior and
several method details need the new original-Max oracle before implementation
is finalized. Do not infer them from the signal operators.

## Evidence sources and limits

Installed reference root:

`/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources/docs/refpages/max-ref/`

Read `plus.maxref.xml`, `times.maxref.xml`, `minus.maxref.xml`, `div.maxref.xml`,
`modulo.maxref.xml`, `rminus.maxref.xml`, `rdiv.maxref.xml` and `abs.maxref.xml`.
Their object names map respectively to `+`, `*`, `-`, `/`, `%`, `!-`, `!/` and
`abs`. File names such as `div` are reference-page identifiers; they do not by
themselves establish additional Max creation aliases.

The available frozen arithmetic runtime evidence is narrower:

`experiments/max-reference/float-cable-runtime-20261022/manifest.json` and
`experiments/max-reference/float-cable-runtime-20261022/results/receipts.jsonl`
record an original `* 0.5` fixture with direct typed receipts before its flonum
display. The manifest explicitly excludes integer-creation multiplication,
`set` and `list`. The following are actual observed receipts, not predictions:

| Stimulus | Direct result | Receipt sequence |
| --- | --- | --- |
| Hot int 3, creation operand 0.5 | float 1.5 | 34 |
| Hot float 4, creation operand 0.5 | float 2 | 38 |
| Hot int -3 | float -1.5 | 42 |
| Bang with the retained -3 hot value | float -1.5 | 46 |
| Cold int 2, then bang | no cold receipt; float -6 on bang | 48, 52 |
| Cold float 0.5, then bang | no cold receipt; float -1.5 on bang | 54, 58 |
| Cold float -2.5, then hot int 2 | no cold receipt; float -5 | 60, 64 |
| Restore cold 0.5, then hot float 0.25 | float 0.125 | 66, 70 |
| Hot int 0 / hot float 0 | float 0 in both cases | 74, 78 |

The result does not become an integer message when its numeric value is whole.
The after-flonum receipts agree numerically, but the direct receipts establish
the arithmetic output type. This fixture does not establish defaults, integer
creation modes, any of the six new operators, list/set behavior or zero-divisor
semantics.

## What installed references declare

`H` means the value stored at the physical left inlet; `R` means the value at
the physical right inlet. For reverse operators, `R` remains the right-inlet
stored value, even though it is the left operand in the arithmetic expression.

| Max name | Proposed authoring type | Calculation | No-argument stored right value declared/implied by reference | Creation mode |
| --- | --- | --- | --- | --- |
| `+` | `add` (existing) | H + R | 0 | integer unless a float argument is present |
| `*` | `multiply` (existing) | H * R | 0 | integer unless a float argument is present |
| `-` | `subtract` | H - R | 0 | integer unless a float argument is present |
| `/` | `divide` | H / R | 1 | integer unless a float argument is present |
| `%` | `modulo` | remainder of H / R | 1 | integer-only in this installed reference |
| `!-` | `reverse_subtract` | R - H | 0 | integer unless a float argument is present |
| `!/` | `reverse_divide` | R / H | 1, with contradictory operand terminology | integer unless a float argument is present |
| `abs` | `abs` | absolute value of input | not a binary operand | integer unless a float format argument is present |

The reference for `abs` calls its optional numeric argument a format selector;
its magnitude is not documented as a retained startup input. A float argument
selects float output. The reference for `%` supplies an integer creation
argument, integer output and float-input truncation; it does not declare a
float creation mode. Treat `% 2.`/`% 2.5` behavior as an oracle question rather
than extending the other operators' rule automatically.

Local method lists:

| Operators | Declared methods | Declaration boundary |
| --- | --- | --- |
| `+`, `*`, `-`, `/`, `%` | bang, int, float, in1, set, list | Binary scalar/cold storage, recall and list/set are declared locally. |
| `!-`, `!/` | bang, int, float, ft1, in1 | Their own files omit list/set; the shared `set` discussion in the plus reference also names both reverse operators. |
| `abs` | int, float | No local bang, list, set or cold-inlet method is declared. |

Important metadata ambiguities need actual receipts:

- The minus list description reverses the first/second operand order relative
  to its inlet formula. Do not encode that apparent documentation error.
- The rminus cold-inlet description mentions output, whereas ordinary binary
  cold storage and the left-trigger descriptions suggest otherwise. The rdiv
  argument paragraph calls the creation value a divisor even though its physical
  inlet formula uses the right inlet as dividend.
- Direct named `in1`/`ft1` messages and messages delivered physically to inlet 1
  should be distinguished. An internal proxy method name in reference metadata
  does not prove every named selector works from every inlet.
- Division references describe integer division by zero as effectively division
  by one, and float division by zero with a -2^31 output. The latter lies outside
  Ultra's current message envelope; these declarations are not frozen runtime
  evidence and must not be silently clipped into a claimed Max match.
- Modulo sign and zero behavior, extra list atoms, one-element lists, mixed
  symbols, silent set coercion and initialization of the hot operand are not
  established by the existing fixture.

## Current implementation boundary

`apps/ultra/ui/canvas-model.mjs:21` and
`apps/ultra/ui/canvas-model.mjs:22` define rhs-only saved `add` and `multiply`.
Their defaults are 0 and 1 respectively, and both accept fractional `rhs`.
`apps/ultra/ui/canvas-catalog.mjs:15` maps `+`/`add` and `*`/`multiply` onto those
types. Generic argument parsing converts the creation token with `Number`, and
`objectText` renders it with `String`, losing `2` versus `2.` identity.
Same-type edits also seed their params from the previous node, so omitted
arguments currently retain previous values.

The current native branch at
`apps/ultra/src-tauri/native/patch_graph.hpp:485` stores a scalar at inlet 1
without output; a hot scalar stores `state.hot`; bang recomputes with that hot
value. It ignores multi-atom numeric lists and named `set`. It clips sum/product
to +/-100000. Its aggregate result message leaves tags zero-initialized, so it
does not produce the required float tag even for a floating creation argument.
Legacy mode must preserve this old contract, including default multiply by 1;
it must not be retroactively presented as a qualified Max creation.

`apps/ultra/src-tauri/native/canvas_message.hpp:10` defines native kinds 0..53,
ending in `MessageBox`. Numeric tags are 0 integer, 1 float, 2 symbol. Literal
string parsing preserves the decimal/exponent spelling, but the validator
deliberately permits fractional numeric values with tag 0 for old callers.
`canvas_scalar(value, tag)` already provides explicit typed output. The Rust
literal parser at `apps/ultra/src-tauri/src/canvas.rs:593` uses the same lexical
float rule. The JSON-array event path at
`apps/ultra/src-tauri/src/canvas.rs:1088` infers float only from a nonzero
fractional part; `[2]` cannot carry the distinction between int 2 and float 2.
Use a literal string such as `2.` or the native typed message for that probe.
Fixed creation modes make arithmetic output type independent of this JSON
input limitation; type-sensitive input tests still need explicit typed input.

ABI layout already has six numeric slots. `UltraCanvasNode` is 192 bytes,
`UltraCanvasGraph` 7184 bytes and `UltraCanvasMessage` 392 bytes, pinned in the
existing native tests. Adding kinds and using `p1` does not require resizing
these structures. Existing kinds and signal arithmetic IDs must not move.

## Proposed saved contract

Both document versions retain their current profile names. New optional fields
remain strict: unknown params, null, nonfinite values and out-of-range enum
values reject. `numericmode` is an integer authoring parameter, not a style or
runtime output-format preference.

| Saved type | Default params when loaded | Allowed modes | Native kind proposal |
| --- | --- | --- | --- |
| `add` | rhs=0, numericmode=0 | 0 legacy, 1 integer, 2 float | 4 unchanged |
| `multiply` | rhs=1, numericmode=0 | 0 legacy, 1 integer, 2 float | 5 unchanged |
| `subtract` | rhs=0, numericmode=1 | 1, 2 | 54 |
| `divide` | rhs=1, numericmode=1 | 1, 2 | 55 |
| `modulo` | rhs=1, numericmode=1 | 1 only until contrary runtime evidence | 56 |
| `reverse_subtract` | rhs=0, numericmode=1 | 1, 2 | 57 |
| `reverse_divide` | rhs=1, numericmode=1 | 1, 2 | 58 |
| `abs` | numericmode=1 | 1, 2 | 59 |

Every new Max-compatible symbolic/text/import creation sets the mode explicitly.
For new `*` with no argument, it also writes rhs=0 explicitly. Loading an old
rhs-only `multiply` therefore continues to mean legacy multiplication with its
old rhs/default. Low-level `makeNode('multiply')` can retain its legacy default;
all user-facing creation paths must use a separate creation-default decision.
Do not change the loader default to fix the palette.

For integer mode, saved `rhs` is integral. Reject a manually authored fractional
rhs paired with integer mode, keeping saved/native intent unambiguous. Runtime
float inputs at either physical inlet are instead coerced as Max declares.
Float and legacy rhs remain finite numbers within +/-100000. `abs` has no rhs;
the creation argument selects mode only, so canonical text may use `abs 0` or
`abs 0.`. This choice needs initial-argument/bang oracle confirmation before
being finalized.

Mode is fixed for the installed graph. It is structural (`live:false` in Rust),
so changing it applies a new graph and resets that owner's runtime under the
existing structural-edit policy. A live rhs edit remains cold and leaves mode
unchanged. For integer mode, authoring rhs parameter edits obey integral
validation; incoming runtime cold float messages are truncated and do not
rewrite saved authoring data.

## Creation and object-text round trips

Parse the original numeric token before converting its value. An integer token
selects mode 1; a decimal/exponent token selects mode 2. Tokens like `2.`, `2.0`
and `2e0` must retain float mode after save, reopen and object-text editing.
Scientific-notation classification follows the existing atom parsers, but its
Max creation equivalence belongs in the oracle matrix. An absent argument uses
the operator's explicit integer-mode creation defaults above.

On a same-type arithmetic edit, recalculate mode and positional defaults from
the supplied text. Do not inherit the old mode when `* 2.` becomes `* 2`, and do
not retain rhs=2 when the user deletes the argument to leave bare `*`.

Round-trip examples for the proposed representation:

| Creation or saved node | Saved meaning | Canonical editor text |
| --- | --- | --- |
| New `+ 2` | add, rhs=2, numericmode=1 | `+ 2` |
| New `+ 2.` | add, rhs=2, numericmode=2 | `+ 2.` |
| New bare `*` | multiply, rhs=0, numericmode=1 | `* 0` |
| New `* 0.5` | multiply, rhs=0.5, numericmode=2 | `* 0.5` |
| Old rhs-only add with rhs=2 | add, rhs=2, legacy mode | `add.legacy 2` |
| Old rhs-only multiply with rhs=0.5 | multiply, rhs=0.5, legacy mode | `multiply.legacy 0.5` |
| New `abs 2.` | abs, numericmode=2 | `abs 0.` |

Recommended legacy escape spellings are Ultra-only `add.legacy` and
`multiply.legacy`, recognized by editor parsing and emitted by `objectText` for
mode 0. They keep saved node types/IDs intact. Existing English `add`/`multiply`
aliases may remain legacy aliases to preserve Ultra text usage; symbolic `+`
and `*` become the explicit Max creation path. Max import should accept only
the actually qualified Max spellings and reject Ultra-only aliases/options.
An explicit Ultra `@numericmode` option could also preserve round trips, but
reserved legacy spellings avoid treating the enum as a Max creation attribute.

All creation surfaces need the same decision: object text, palette, help/example
generation, configured node replacement and Max import. Saved legacy graphs,
including existing library data, retain their original mode when loaded. A
newly generated demonstration must intentionally choose its mode rather than
receive a global migration.

## Proposed runtime behavior within the numeric envelope

The following finite, nonzero-divisor behavior is a concrete candidate for
oracle comparison. It is not yet a claim that the six new classes match Max.

- Integer mode truncates each hot/cold float operand toward zero before storing
  and calculating; it never upgrades after a float input. Integer division
  discards the fractional quotient toward zero. Float mode retains numeric
  precision for both operands and always emits tag 1, including integral
  results and bang. Integer mode emits tag 0. Legacy mode preserves its existing
  arithmetic and tag behavior.
- Hot scalar stores `H`, computes once and emits once. Cold scalar stores `R`
  silently. A hot bang recomputes using both current stored operands; it cannot
  simply resend a cached result after a cold update. Candidate initial `H` is
  zero, pending direct startup-bang receipts. The reverse formulas are R-H and
  R/H, with physical left trigger/right storage pending their oracle.
- For `+`, `*`, `-`, `/` and `%`, an exactly two-number hot list tentatively
  updates `R` before `H`, computes once and emits once. Named `list` and the
  corresponding unselected numeric list should agree. Noncommutative order
  must be observed rather than taken from the minus list prose. A one-number
  list can share scalar handling only after comparison. Extra atoms, symbols
  and cold lists must receive an explicit evidence-backed policy.
- For the five operators with local `set`, candidate hot `set n` changes `H`
  without emitting; the next bang computes with current `R`. The plus reference
  extends this concept to reverse operators, but local reverse metadata omits
  it. Compare actual reverse `set`/list receipts before adding them. Do not
  implement the words `in1`/`ft1` as general named messages solely because they
  name inlet proxy methods.
- `abs` accepts one numeric scalar, coerces by its fixed mode, computes absolute
  value and emits the corresponding tag. Do not invent bang recall or list/set
  support; test those to establish whether they are unsupported or inherited.
- Keep the existing +/-100000 input/result envelope for this phase and document
  it as an Ultra profile limit, not a Max limit. Legacy clipping remains exact.
  If new arithmetic also uses bounded results, retain a semantic limitation for
  outputs beyond that envelope; a local clip is not a certified Max result.

Zero division/modulo is a separate unresolved contract decision. The native
implementation must guard a divisor *after* integer coercion: an incoming 0.5
can become integer zero. Never call integer `% 0`, allow NaN/Infinity to reach
an outlet, or borrow signal `/~`'s zero-output policy. The new oracle must choose
the actual operand-state, output, type and error behavior for `/`, `!/` and `%`
at positive zero, negative zero and coerced zero. If observed output falls
outside the current envelope, either define an explicitly unqualified local
refusal with diagnostic or design a separate numeric-envelope extension. Do
not silently clamp a documented sentinel and remove the semantic warning.

## Native and controller implementation seams

1. Append kinds 54..59 in `canvas_message.hpp` and the Rust `kind()` name array;
   preserve IDs 0..53. Expand C++ inlet count tables and all maximum-kind checks
   currently written as `kind <= MessageBox`/`kind > MessageBox`. Expand Rust
   `inlet()`/`outlet()` matches. Binary ports stay control, abs has one control
   inlet, and all six produce one control outlet.
2. Use p0=rhs and p1=numericmode for binary nodes; abs uses p0=0, p1=mode. Leave
   p2..p5, device, count and text zero. Specialize Add/Multiply compile checks,
   which currently reject nonzero p1 in the default branch. New kinds reject
   legacy mode; `%` initially accepts only integer mode. Preserve ABI sizes.
3. Add mode validation to Rust parameter tables with `live:false` and mirror
   conditional integer-rhs checks in JS/Rust/native compile validation.
   `canvas_param_valid` and runtime parameter admission must also refuse live
   mode changes for raw C callers. Native `change_canvas_param` recompiles a
   candidate graph, which is a useful seam for mode-aware rhs validation.
4. Route new-mode arithmetic through explicit coercion and typed scalar output.
   Avoid changing the existing legacy Add/Multiply branch globally. Validate
   candidate messages before mutating retained operands, especially lists and
   zero-sensitive operations. Runtime cold storage is separate from saved
   `rhs`; geometry/view changes must continue retaining runtime values.
5. Mark mode structural in standalone `parameter()`, topology/history
   fingerprints, history replay and the view's locked structural-parameter
   predicate. Merely setting Rust `live:false` is insufficient: the current JS
   paths would otherwise enqueue `canvas_param` and fault on a mode edit/Undo.
   Shared native owner admission already compares complete prepared descriptors;
   mode changes should replace the owner graph, rhs-only changes stay live.
6. Extend UI registry/catalog, completion choices, port help, generic appearance
   type allowlists, original object examples and generated library manifest.
   Keep example/help discoverability distinct from installed-root qualification.
   The generic object renderer can handle these ports; no new widget is needed.
7. Extend Max import's native-type set, qualified creation handling and literal
   selector admission. `receiverAcceptsLiteral` currently rejects arithmetic
   `set` cables and accepts generic numeric arrays/lists too broadly. Its
   arithmetic branch must follow the chosen runtime method contract. Replace
   the current blanket add/multiply warning only for modes/methods/ranges
   actually established by evidence; retain limits elsewhere.

## Oracle decisions needed before shipping

The next operator oracle should use small original graphs, direct typed
receipts and a retained-state recall after each cold or silent update. This
mapping runs none of the following; these are evidence requirements:

- For all eight names: bare creation, integer 2 and float 2. creation where
  meaningful; startup behavior; hot int, whole-valued float, fractional positive
  and negative float; fixed output type; post-cold bang; repeated bang.
- For `-`/`!-` and `/`/`!/`: asymmetric values such as hot 7/right 2 to resolve
  orientation, cold silence and list operand order. Verify omitted-argument
  reverse-division initialization independently of its conflicting prose.
- For `/`, `!/`, `%`: both signs of operands, fractional coercion, zero in each
  physical inlet, zero divisor after integer truncation, and an ordinary next
  event to establish retained state and recovery after the edge case.
- For `%`: float creation spelling, fractional values in both inlets and output
  tags. Keep integer-only reference support separate from actual observed
  acceptance. For `abs`: float format argument versus initial value, negative
  fractions, negative zero and undeclared bang/list/set.
- For every declared list/set method: exactly two numbers, one number, extra
  numbers, symbol-containing input, cold-inlet delivery, typed float payloads,
  no-output setters followed by bang, and whether unsupported selectors mutate
  either operand. Reverse direct `in1`/`ft1` requires its own receipts if it is
  to be supported as a named message.

After that oracle resolves behavior, implementation checks should protect old
rhs-only JSON/native descriptors, new-mode text/save round trips, parity of
flat/nested validation, typed C++ dispatch with audio off/on, mode versus rhs
history behavior, import method admission and a small desktop example. Those
checks are proposed work, not passed results in this report.

The mapper's corpus opportunity does not change whole-help qualification.
Adding six classes or reducing import omissions is separate from qualifying a
saved help root and its interaction paths.
