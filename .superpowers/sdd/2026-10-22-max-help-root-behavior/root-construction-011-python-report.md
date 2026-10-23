# Capture011 Python Root Construction Correction

Status: implementation frozen for parent and independent review. This report
covers only `lifecycle.py` and `test_lifecycle.py` in
`experiments/max-reference/int-float-runtime-20261022/`.

## Frozen Sources

| File | SHA256 |
| --- | --- |
| `lifecycle.py` | `b1cca880849a5a8b533b454e96caa0873fd11e5cd08f6987314808806b6fc9c4` |
| `test_lifecycle.py` | `9dd5e95ff7289dccc59768143aa6c8173559f40377b1172453379b9af0849561` |

The implementation follows
`int-float-root-construction-011-design.md`. No JS, product source, original
graph, public score/schema, comparator, or source resource was edited by this
implementation task. No preparation or actual runtime capture was launched.

## Changes

- The independent harness inventory expects reader rectangle
  `[-3000,-3000,160,133]` and send rectangle `[-3400,-3000,200,64]` exactly.
  Freebang and disposer stay height22; every other component stays exact.
- Float revision1 original anchors `root/obj-2` and `root/obj-3` select a finite
  V8 class check. Selection precedes source validation, so a changed source
  digest cannot evade that check by reporting a legacy class. Their actual
  class must be `jpatcher`; `patcher` and `p` are refused for these anchors.
- The finite check binds the fixed float source digest; fixed four helper
  digests in the document and sealed config helper inventory; exact authored
  `newobj`, canonical `patcher`, ordered aliases `[patcher,p]`; literal saved
  rectangles and live height22; literal source-text digests; typed integer0
  saved incoming/outgoing route counts; and the exact complete existing
  source-bound float shell-height policy.
- Saved/live geometry first passes `_rect`, which requires four finite
  primitive numbers and refuses booleans. Exact numeric rectangle equality
  accepts equivalent integer and floating-point representations such as
  `10` and `10.0`, with no tolerance. Type-sensitive JSON equality remains in
  force for the complete shell policy, aliases, helper maps, and raw evidence;
  saved route counts still require integer0.
- The source class used by the shell-height comparison is `patcher`. The raw
  root proof and ACK are never rewritten; the retained actual class remains
  `jpatcher`. Any actual `jpatcher` elsewhere is refused, including one added
  to a caller-supplied class alias list. No int disposition was introduced.
- Generic synthetic fixtures use `root/obj-4` for their unrelated patcher so
  their invented source is independent of the two literal finite anchors.
  The finite fixture explicitly supplies both selected root objects.

## TDD Evidence

1. The new exact-geometry tests first failed with the prior reader/send
   expectations. Updating only the owned harness rectangles made the geometry
   test pass while the positive finite V8 proof still failed at the original
   class check.
2. The finite source/class/profile rule made the positive proof and mutation
   matrix pass. A further regression changed the bound source digest, changed
   both shell policies to that digest, and supplied actual legacy `patcher`.
   That test failed with `ValueError not raised`, proving that a selector
   conditioned on the correct source digest could fall back to legacy rules.
3. Selecting by float revision1 and literal anchor, with fixed-source checking
   inside the finite rule, made the regression and complete Python suite pass.
4. Parent review identified that archived010 prepared source rectangles use
   floating-point elements while the literal expected rectangles use integers.
   A source-like floating-point rectangle regression failed in both saved-only
   and saved/live cases with `Invalid lifecycle finite V8 root source`.
   Replacing only the two geometry `_same` comparisons with validated exact
   numeric equality made both cases pass. Direct bounded helper tests still
   refuse boolean, NaN, and positive/negative infinity in saved and live
   rectangles for both anchors.

The tests cover both anchors with 26 profile/class mutations each, missing /
extra / duplicate / changed config helpers, document/revision/source/anchor
boundaries, legacy-class fallback under a changed source, and injected aliases.
Exact owned geometry has positive and negative cases, including refusal of the
old reader/send heights and changed freebang/disposer heights. A complete
synthetic float close, subsequent legacy int close, and barrier replay retain
the original float root bytes and its two raw `jpatcher` records.

## Verification

Executed from `experiments/max-reference/int-float-runtime-20261022/`:

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v test_lifecycle.py test_runner.py
Ran 44 tests in 2.003s
OK
```

All38 lifecycle methods and all6 runner/public-journal methods passed. Both
edited Python files also passed an in-memory `compile(..., 'exec')`; their
SHA256 values were computed from the same final bytes listed above.

Bounded read-only verification also used the archived010 `config.json` and
typed `observations/lifecycle-root-float-r1.json` at
`/home/venetanji/.cache/alive-ultra-evidence/int-float-max-20261022-prepared-010/`.
For each literal anchor, its saved rectangle had four actual Python floats;
the captured class/name/live rectangle selected exactly one diagnostic object.
Both `_float_root_class` calls accepted and returned source class `patcher`,
with all input metadata unchanged. Output contained only the two anchor names,
numeric-type summaries, captured class, and acceptance; no source text or
private channel was printed.

Existing strict JSON/raw equality and private-file retention, history replay,
all31 ordered typed samples, automatic witness/dispose evidence, final barrier,
and public projection gates are exercised by the complete passing suite. This
synthetic verification establishes no actual freebang delivery, successful Max
close, numeric comparison, or installed-root qualification. A fresh actual run
remains the parent's next evidence step after independent frozen-source review.
