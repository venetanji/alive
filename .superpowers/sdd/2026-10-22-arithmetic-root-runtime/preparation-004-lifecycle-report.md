# Preparation004 Independent Lifecycle Implementation

Status: implemented and focused synthetic verification GREEN. The two owned code files are frozen for review. No known schema or parent integration concern remains.

## Frozen Files

Paths below are relative to `experiments/max-reference/arithmetic-roots-runtime-20261022/`.

| Changed file | SHA256 |
| --- | --- |
| `lifecycle.py` | `389d8b773f1fc0d4f3d8d4db1a323bc65a632796a1f9a4a0f37c3be6ec2a0f3b` |
| `test_lifecycle.py` | `ce81f4d54f909ea8754f0f0327d9444838dd941f0eab2dbdf2af0839000b8e42` |

No other code was edited. This report is the only additional task artifact. No real preparation, Max/Wine/display/browser/capture launch, commit, or subagent delegation occurred. The full moving stage suite was not run.

## Implementation

- `lifecycle.py:356` independently validates the frozen separate numeric/root policies against stdlib-owned immutable evidence and pin tables. It checks the times source, all four helper hashes, exact anchor/box/text/saved/live geometry/default bindings, unchanged source classes/runtime-class lists, exact root names, and zero saved root routes. It imports no arithmetic implementation.
- `lifecycle.py:391` validates complete bounded root and numeric inventory claims, exact three-numeric/two-root policy and witness multiplicity, source/helper/evidence/path/owner/request bindings, and the exact close action. The close request is also the operation request. Identity, revision, owner-inlet, inventory, and multiplicity counts retain strict integer types; booleans and floating count spellings are refused.
- Numeric rows require actual `number`, scalar format 6 from the declared getter, a finite scalar `getvalueof` result, exact geometry, and `receipt_tag_observed=false`. The source-derived default remains pinned in the policy, while live close values may evolve. Legacy singleton arrays are refused.
- `lifecycle.py:449` applies the independently validated root gates to actual pre-close originals. Both gated roots retain actual `jpatcher` classes and must match their exact source-bound names and measured live rectangles. Other originals keep the existing strict class/name/geometry checks. No raw or descriptor classes are rewritten.
- `lifecycle.py:319` compares geometry by exact finite numeric coordinates, accepting equivalent integer/floating JSON spellings without tolerance. Only rectangle fields receive this treatment; identity/count field type checks remain exact. This also covers the pre-existing observed-geometry policy.
- The existing `lifecycle.py:731` retained-history path re-enters `_verify_close` and `_root` for every earlier real close. Therefore both `validate_close` and `validate_barrier` revalidate all five retained witnesses, while preserving existing ACK/root byte/digest, observer-prefix, owner-absence, route/endpoint, private path/link/type/permission, source, and helper checks. Public function signatures and returned retention metadata keys are unchanged.

## Test-First Record

All test commands ran in the arithmetic runtime stage using `python3 -B -m unittest` and original synthetic data.

| Phase | Selected tests | Observed result |
| --- | --- | --- |
| Initial RED, before lifecycle implementation | Full then-current lifecycle module, 10 methods | 1 failure and 12 dependent subtest/setup errors; exact valid V8 witnesses were rejected by the old root field allowlist. |
| Isolated initial RED | Both-times-owner acceptance method | 1 test, 1 assertion failure, 0 errors, confirming refusal of the new valid evidence rather than a fixture typo. |
| Initial GREEN | Full lifecycle module | 10 tests passed. |
| Strictness/geometry RED | New V8 geometry-spelling and identity/count methods | 2 tests, 2 assertion failures: equivalent geometry was refused, and a boolean owner inlet was accepted. |
| Existing geometry RED | Existing observed-geometry method extended with equivalent float spelling | 1 test, 1 assertion failure. |
| Final GREEN | Full lifecycle module | 12 tests passed, 0 failures/errors; fresh final run completed in 2.238 seconds. |

The final suite preserves all four original lifecycle methods, extending the geometry method, and adds eight focused methods. New coverage includes:

- Fresh acceptance for each times revision with evolved finite close values and retained actual root classes.
- 35 live-witness/root-original corruption cases covering missing/duplicate rows, wrong owner/request/operation/action/step/path/source/helper/evidence, incomplete inventories, changed counts, wrong actual classes, getter shape/format/type/nonfinite values, exact geometry, uniqueness claims, receipt-tag claims, root names, and strict non-gated classes.
- 19 policy/source descriptor corruption cases covering missing/duplicate policies, generic policy substitution, altered evidence/helpers/source box/text/geometry/default/class lists/root names/routes, and transfer to another document.
- 12 strict identity/count type cases, plus equal numeric geometry spelling acceptance and refusal of representable drift below any former tolerance.
- Reuse of first-owner witnesses at the second close is refused.
- All five witness rows for each times owner are separately forged after accepting six closes. The synthetic root file, embedded ACK proof, retained root, and metadata digests/lengths are synchronized before the barrier check, so rejection proves semantic revalidation beyond digest equality. A separate next-close test forges an earlier numeric-format witness using the same rebinding technique.

Additional verification compiled both files in memory without bytecode writes, checked ASCII content, and checked that lifecycle imports remain exactly the pre-existing stdlib set. A scoped diff against the historical003 lifecycle file confirmed the new policy/witness gate and geometry comparison are the production delta; history and public API bodies are unchanged.

## Limits

This is synthetic implementation verification, not runtime evidence. No private licensed source bodies, creation operands, defaults, complete graphs/configuration, raw snapshots, or measured geometry vectors were printed or copied into fixtures. The real preparation004 package, full stage integration, and application behavior remain for the parent preparation/freeze review and any separately authorized capture. No score denominator, getter capability, diagnostic suppression, helper expansion, callback-order claim, or qualification increment was introduced.
