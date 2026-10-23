# Numeric Comparator Input Phase Review

Verdict: SPEC PASS; QUALITY PASS. No findings in the frozen correction.
Independent review is limited to the two source files, their archived
predecessors, the authoritative design and implementation report, and bounded
synthetic checks. No comparison against the actual capture, capture/runtime,
product, app, or build was run. Only this review report was authored.

## Frozen Identity

| Source | SHA256 |
| --- | --- |
| `compare-int-float.py` | `5ee1d61bf111aa5901707d04790d1be39956358a560f037a9356ea5592d61367` |
| `test-compare-int-float.py` | `a39f456b93377a6a04ca262d668e217d6b4b4785ea8547c5f74a24129cf0e502` |

Paths are under
`experiments/max-reference/help-roots-native-20261022/`. Both archived originals
in private `int-float-comparator-before-input-phase-001` independently match
the original hashes in the implementation report: comparator
`b0e962ace212eb787f26d7aaeb1681f9f1d62c2848d8729480294dbee3c36a62`
and test
`7f76750c9cfcc1d1cf5dd7b979fe82b784f0cdf75f05d5e11b2ca6fd30e7eb22`.

## Review Evidence

- The production diff changes only `destination_pair`'s button message
  predicate and one explanatory comment. At lines447-456 it retains exact
  document/anchor/port/phase selection, one-per-destination cardinality,
  document-specific scalar selector/tag, and strict ordinal order. Input
  alone now requires equality of the complete typed messages via existing
  `same`, including signed zero. Existing `validate_message` at lines64-80
  and its call for every native receipt at line219 still reject malformed,
  boolean, mistagged, and nonfinite numeric values before this helper.
- Native output/reference receipt behavior retains the original exact numeric
  plus zero-atom bang predicate. Source, reference/capability, coverage,
  cleanup, numeric/value/tag/schema, retention, and final conjunction code are
  byte-for-byte unchanged outside the tiny helper diff. The final conjunction
  at lines527-529 still requires the native input gate.
- The synthetic fixture at test lines107-112 creates scalar numeric inputs
  independently of the numeric/bang outputs. It imports no actual capture.
  Test lines300-318 cover both scalar modes, zero, negative/fractional values,
  signed-zero disagreement, and unchanged output/reference-phase behavior.
- The thirty full-CLI cases at test lines320-356 isolate missing/duplicate
  inputs, reversal, wrong value/selector/type/destination/document/port, and
  button bang across int and float. Each explicitly proves CLI exit1 and a
  false input/final gate while all four other comparison gates stay true.
  Tests at lines358-385 cover strict message validation and preservation of
  native output-order/bang refusal.

Independently executed seven selected synthetic tests: complete lifecycle CLI
fixture; positive input phase; all30 isolated CLI input refusals; strict input
validation; native output-order/bang refusal; reference output-order refusal;
and unavailable synchronous capability. Result: `Ran 7 tests in 4.524s`, `OK`.

A separate in-memory probe fed the same realistic synthetic fixture to both
the archived and corrected helpers: all21 input pairs changed from refused to
accepted, and all21 numeric/bang output checks remained accepted under both.
Both final source files also passed in-memory compile checks, without bytecode
generation. Source hashes were rechecked after the review report was written.

No residual issue blocks the parent's separately named comparison of the same
retained complete capture. That actual-data comparison was outside this
review; no finite parity or whole-help qualification is claimed here.
