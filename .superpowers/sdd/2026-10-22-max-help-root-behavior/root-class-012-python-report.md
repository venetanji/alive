# Capture012 Python Root Class Extension

Status: implementation frozen for parent and independent review. Scope is only
`lifecycle.py`, `test_lifecycle.py`, and this report. The implementation follows
`int-float-root-class-012-design.md`. No preparation or runtime was launched.

## Frozen Sources

| File | SHA256 |
| --- | --- |
| `experiments/max-reference/int-float-runtime-20261022/lifecycle.py` | `973c3c29e53b3d0fee63cbf5f981c9a7d7d5c702e29185623e7517699630a44d` |
| `experiments/max-reference/int-float-runtime-20261022/test_lifecycle.py` | `316d0466c2ec0d91c60de685026cb4b32e2299fe6790a16e11b97429b40062c8` |

The reviewed class011 starting hashes were
`b1cca880849a5a8b533b454e96caa0873fd11e5cd08f6987314808806b6fc9c4`
for `lifecycle.py` and
`9dd5e95ff7289dccc59768143aa6c8173559f40377b1172453379b9af0849561`
for `test_lifecycle.py`.

## Implementation

- A literal source map now selects int or float revision1. Int is pinned to
  `bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61`;
  the existing fixed float source is unchanged. Both use only original anchors
  `root/obj-2` and `root/obj-3`, with their existing common saved rectangles and
  source-text digests. The private helper is now `_finite_root_class`.
- Selection uses the literal document, revision1, and anchor before validating
  the supplied source. A changed source cannot fall back to legacy class
  matching. Selected originals must report actual `jpatcher`, authored
  `newobj`, canonical `patcher`, and exactly ordered `[patcher,p]` aliases.
  Actual `jpatcher` elsewhere remains refused, including caller-added aliases.
- The complete shell profile stays type-sensitive and exact, with only its
  literal document/source/kind varying between the two fixed documents.
  Int requires `source-bound-int-shell-height`. All four literal helper
  digests, source-text digest, source geometry, live height22, and integer0
  saved incoming/outgoing route counts remain mandatory.
- The sealed config helper inventory is checked when either revision1
  definition selects its fixed source. Int therefore requires its four fixed
  helpers even when the float definition is unrelated synthetic metadata.
- Geometry still passes `_rect` to refuse booleans and nonfinite values, then
  compares exact numeric values with no tolerance. Source-like `10.0` equals
  literal `10`; type sensitivity outside geometry is unchanged. Raw ACK/root
  evidence is never normalized or rewritten.

Owned geometry/construction, all other original classes, legacy JS matching,
Basic admission, checkpoint validation, lifecycle samples/witness/disposal,
history replay, public projection, score, and comparator were not changed.

## TDD Evidence

Before changing production code, a new fully finite synthetic
float125 -> int141 -> final-barrier test passed the float close and failed at
the int finite-owner check with `Invalid lifecycle finite V8 root owner`.

Further new tests failed with `ValueError not raised` for all four malformed
int config-helper inventories when the float definition lacked a finite
profile, and for a combined int wrong-source + changed policy source + actual
legacy `patcher` fallback. Extending the literal source lookup, finite
selector, shell kind/document binding, and config helper check made these
regressions and the complete suite pass.

Coverage includes:

- Both int anchors with 28 class/source/helper/profile/route mutations each;
  both float anchors retain their previous 26-mutation matrix.
- Every saved/live geometry component for both anchors and both documents,
  plus boolean, NaN, positive-infinity, and negative-infinity refusals.
- Wrong document, revision, source, anchor, legacy actual class, caller aliases,
  helper inventory, text/class/ordered aliases, policy kind/document/source,
  and typed integer-zero route counts. The combined wrong-source legacy
  fallback regression remains covered for each document.
- Source-like floating-point saved rectangles for both fully finite documents
  in the complete float125 -> int141 -> barrier chain. Both retained roots
  remain byte-for-byte unchanged and keep both actual `jpatcher` records.
- Existing immutable-history mutation/refusal tests, all31 ordered typed
  samples, automatic witness/dispose evidence, final-barrier requirements, and
  unchanged public journal tests.

## Verification

Executed from `experiments/max-reference/int-float-runtime-20261022/`:

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v test_lifecycle.py test_runner.py
Ran 49 tests in 2.588s
OK
```

All43 lifecycle methods and all6 runner/public-journal methods passed. Both
edited Python files passed in-memory `compile(..., 'exec')`. Hashes were taken
from those final source bytes.

A bounded read-only helper verification used archived011 `config.json` and
typed `observations/lifecycle-root-int-r1.json` under
`/home/venetanji/.cache/alive-ultra-evidence/int-float-max-20261022-prepared-011/`.
The fixed varname/live rectangle selected exactly one captured `jpatcher`
diagnostic object for each int anchor. Both `_finite_root_class` calls accepted
and returned source class `patcher`; deep comparisons confirmed that actual,
owner, and definition inputs were unchanged. Output contained only document,
anchor, class, acceptance, and immutability status, without source text or
private channels.

These offline checks establish no actual int close, complete54-operation
capture, validated live final barrier, numeric comparison, or installed-root
qualification. Parent alone performs fresh preparation/capture after review.
