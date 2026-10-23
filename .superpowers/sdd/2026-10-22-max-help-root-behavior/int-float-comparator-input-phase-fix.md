# Int/Float Comparator Input Phase Correction

Date: 2026-10-22. Status: implemented and frozen for independent review.
Scope is only `compare-int-float.py`, `test-compare-int-float.py`, and this
report. No actual-data fixture, capture, product, score, native artifact,
historical result, or other source was changed. No comparator was run against
the actual capture. No preparation, runtime, app, or build was launched.

The authoritative design is `int-float-comparator-input-phase-design.md`.
The parent reports complete capture012 and independently identifies the
comparator's phase error: the native numeric destination and button receive
the same typed numeric message, then emit numeric and bang respectively. The
old helper required button bang in both phases. Its synthetic fixture copied
output messages into the input trace, concealing that error. This correction
makes no product scheduling claim.

## Minimal Change

`destination_pair` retains its exact document, destination anchors, port 0,
phase, one-per-destination cardinality, numeric selector/tag, and strict
numeric-before-button ordinal checks. Only for `phase == 'input'`, it now
requires `same(numeric_message, button_message)`. This compares complete typed
messages and retains the existing signed-zero semantics. Existing message
validation still rejects malformed, mistagged, boolean, and nonfinite numeric
values before comparison.

Native output and reference receipt phases retain the exact zero-atom button
bang rule. All source/capability/cleanup/coverage/value/tag/schema gates and the
final `all_comparison_gates_pass` conjunction remain unchanged. No result field
was added or renamed; whole-help qualification still adds zero.

The synthetic fixture now independently creates typed numeric input messages
at both destinations while preserving numeric/bang output messages. It does
not import actual capture data.

## TDD And Verification

The fixture was corrected before the comparator. The complete CLI fixture
then returned exit 1 under the old helper. A second focused RED run rejected
all four valid input pairs: int zero, negative int, float zero, and negative
fractional float. The phase-specific predicate then made both tests GREEN.

The final suite includes:

- Positive numeric inputs in both scalar modes, negative/fractional values,
  exact message agreement, and signed-zero mismatch refusal.
- Thirty CLI mutation subcases across int and float: missing or duplicate
  numeric/button inputs, reversed input order, wrong value, selector or scalar
  mode, wrong numeric/button anchor, wrong document, wrong numeric/button port,
  and button bang at input. Each leaves endpoint values, numeric states,
  prototypes, and destination output gates passing while the input gate and
  final conjunction fail.
- Existing strict input validation for wrong atom tags, infinity, and boolean
  values; unchanged native output order and bang requirements; existing
  reference output-order, endpoint, capability, close/reopen, score binding,
  raw-binding, source/helper preservation, and no-overwrite tests.

Final checks passed:

- `python3 -B test-compare-int-float.py`: 19 tests.
- `python3 -B test-compare.py`: 17 tests.
- In-memory Python `compile()` syntax checks for both changed source files,
  without generating bytecode artifacts.

These checks use original synthetic temporary inputs. Independent review and
the parent's separately named comparison of the unchanged retained capture
remain the next integration steps. The historical failed comparison012 and
its log remain immutable. The designated new output name is
`int-float-comparison-012-input-phase-001.json`; this worker did not create it
or change the verification index. Actual input-byte hashes belong to that
parent-owned comparison record.

## Frozen SHA-256

Paths are relative to `experiments/max-reference/help-roots-native-20261022/`.
The parent privately archived the originals under
`int-float-comparator-before-input-phase-001` before edits.

| File | Original SHA-256 | Corrected SHA-256 |
| --- | --- | --- |
| `compare-int-float.py` | `b0e962ace212eb787f26d7aaeb1681f9f1d62c2848d8729480294dbee3c36a62` | `5ee1d61bf111aa5901707d04790d1be39956358a560f037a9356ea5592d61367` |
| `test-compare-int-float.py` | `7f76750c9cfcc1d1cf5dd7b979fe82b784f0cdf75f05d5e11b2ca6fd30e7eb22` | `a39f456b93377a6a04ca262d668e217d6b4b4785ea8547c5f74a24129cf0e502` |

Both corrected source hashes were rechecked after writing this report.
