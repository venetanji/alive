# Max scalar arithmetic

Extend the existing arithmetic path to support Max-style typed creation for
`+`, `*`, `-`, `/`, `%`, `!-`, `!/` and `abs`. The user authorized autonomous
implementation and parallel agents. Preserve the dirty checkout and all
completed cable/comment/help/Print work. Do not commit or alter original Max
preferences. No visual redesign or screenshot cycle is part of this batch.

## Representation and compatibility

Keep existing native IDs and ABI sizes. Append subtract=54, divide=55,
modulo=56, reverse_subtract=57, reverse_divide=58, abs=59. Binary objects use
p0=rhs and p1=numericmode. Abs uses p0=0 and p1=numericmode.

Numeric mode is structural: 0 retains legacy Ultra Add/Multiply behavior,
1 is integer, and 2 is float. Old rhs-only Add/Multiply documents default to
mode 0, preserving multiplication's old default rhs=1 and old output behavior.
The six new kinds accept only their supported nonlegacy modes, including
floating modulo, which the original runtime establishes despite integer-only
reference metadata. Strict JS,
Rust and C++ validation must agree; a fractional authored rhs with integer
mode rejects, whereas runtime numeric coercion follows observed behavior.

Text/import creation explicitly selects mode before numeric token spelling is
lost. Float text retains a decimal marker for whole values and expands small
scientific Number strings to plain decimal without rounding. Modern arithmetic
creation refuses exponent tokens explicitly: the original `2e0` probe instead
selected default integer behavior, so treating it as float would be incorrect.
Legacy aliases retain their prior scientific numeric spelling. Omitted arguments
reset creation defaults rather than inheriting the previous edited object.
Legacy English aliases and explicit `add.legacy`/`multiply.legacy` preserve
old text round trips. New symbolic +/* use Max creation defaults. Low-level
saved document defaults remain backward compatible. Native numericmode edits
must refuse live IPC; UI parameter/history/fingerprint/lock paths must all
recognize this structural change.

## Evidence gate and numerical limits

The frozen float/cable oracle already proves that `* 0.5` emits float even for
integral results and that cold operands are silent. The arithmetic oracle in
`experiments/max-reference/arithmetic-runtime-20261022/` must decide the new
operators' startup, creation typing/defaults, scalar coercion, hot/cold state,
bang, set, list ordering and zero-divisor behavior before semantic completion.
Installed XML declarations are design inputs, not substitutes for receipts.
Do not invent named in1/ft1, abs recall, reverse list/set or exponent semantics.

Keep the existing bounded control profile (-100000..100000 and eight atoms).
Do not silently clamp an observed Max zero-divisor sentinel into a claimed
equivalent. If a result cannot be represented, use an explicit local refusal
and retain the relevant import limitation; broader envelope changes need a
separate design. The frozen oracle produces Infinity for floating `/` by zero
and NaN for floating `%` by zero, so those cases require a visible local refusal.
Integer `/` treats a coerced zero divisor as one; reverse `!/` by zero produces
typed zero. Never permit undefined modulo, NaN or Infinity. Confirm
candidate operand/state mutation behavior with the oracle and local tests.

## Integration

Add the six ordinary compact text objects to catalog, port help, appearance,
completion and original help/example generation. Reuse the existing inspector;
mode gets clear integer/float/legacy labels. Preserve generated original demos
and disclose profile limits. Max import accepts only qualified Max creation
spellings and keeps unresolved behavior warnings.

Required verification includes source-first failing tests; native header replay
against frozen receipts; Rust/JS schema parity, legacy document compatibility,
mode text round trips, runtime structural/live admission, Undo/Redo and shared
root/child state behavior; contract gate; locked release build. Browser checks
exercise mode creation/editing and structural lock behavior without opening a
new visual polish cycle. Whole-help qualification stays separate.

## Tracking

- [x] Freeze original Max typed arithmetic matrix and cleanup evidence.
- [x] Native kinds, schema and evidence-backed runtime with regressions.
- [x] Rust admission and owner-history retention/structural tests.
- [x] JS creation/model/import/controller/inspector integration and regressions.
- [x] Original help/examples, protocol documentation and generated catalog.
- [x] Independent review, required verification and remaining-gap report.

Completion record: `.impeccable/review/max-fidelity-20261021/arithmetic-finish.md`.
This closes the bounded arithmetic batch, not whole-help qualification. The
frozen score yields 287 matching deliveries, four explicit nonfinite refusals
and nine excluded exponent-creation cases. Bare `!/`'s default and the other
unmeasured cases remain explicit limits. Complete installed-root qualification
is still 0/2,103.
