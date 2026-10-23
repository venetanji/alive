# Revision003 Focused Review Corrections

Status: corrected implementation frozen, 2026-10-22. Both review findings are
addressed in one focused wave. No application launch or real preparation003
was performed by this worker. The initial003 package was review-only and was
not consumed by a preparation or runtime capture.

## Exact Controller Geometry

The representation candidate search used the existing 0.01 rectangle
tolerance, and the observation entry point did not recheck the actual saved
rectangle. A synthetic 0.005 displacement therefore reached the numeric gate.

`controllerNumericRepresentationObservation` now obtains the live rectangle
and requires exact `sameNumbers` equality before any format/value capability
probe. This protects both the resolver path and direct observation calls.
Unavailable, undefined or thrown geometry reads refuse before format/getter
probes, input messages or state setters.

RED: after adding the regression cases, the Node helper command failed with
`Missing expected exception: exact live geometry must precede probes through resolve`.
GREEN: the same command passed after the exact recheck. Cases cover the
sub-tolerance drift, unavailable getter/rectangle and thrown rectangle getter
through both entry points, with no capability or mutation calls on refusal.

## Incomplete V8 Inventory

Bounded traversal previously marked overflow as a mismatch but still treated
the observed prefix as a complete source search. A source duplicate beyond
the bound could therefore leave an apparently unique prefix candidate and
permit numeric capability probes.

Traversal now distinguishes complete, overflow, unavailable and thrown
outcomes. If either required inventory is incomplete or unavailable, all
seven diagnostic rows remain, strict refusal remains set, and every numeric
capability probe is suppressed. Incomplete root traversal also prevents
deriving Basic from a prefix candidate. No unique runtime class, rectangle or
complete candidate count is asserted from incomplete required coverage.

Private diagnostics add `inventory_complete` and `inventory_coverage` for root
and numeric scopes, including completion/status, observed-prefix count,
complete count (null when unknown) and bound. Row `candidate_count` is null
when coverage is incomplete; `observed_candidate_count` retains only the
observed prefix count and `candidate_count_complete` is false. Unique-object
class/rectangle claims and numeric capability values remain null. Raw root
prefix candidates remain private observations, not unique source assertions.

RED: after adding root/numeric overflow and unavailable traversal cases, the
Node helper command failed with `root-overflow must suppress all numeric capability probes`,
showing six forbidden numeric capability calls from the truncated prefix.
GREEN: all cases pass with no numeric probe/input/setter calls, seven retained
rows and strict refusal. Coverage includes hidden duplicates beyond both
root and numeric bounds, unavailable root/numeric inventory and thrown
numeric traversal. Failed-readback transport retains the complete diagnostics.

## Verification And Freeze

Fresh commands passed:

- `python -B -m unittest discover -s experiments/max-reference/arithmetic-roots-runtime-20261022 -p test_preparation.py`: 12 tests.
- `python -B -m unittest discover -s experiments/max-reference/arithmetic-roots-runtime-20261022 -p test_lifecycle.py`: four tests.
- `node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs`: passed.
- `node --check` for controller/readback and Python AST checks: passed.
- Real private metadata/evidence check: three times controller profiles,
  zero plus/minus profiles and unchanged original flonum class descriptors.

Exactly three files differ from the archived003 review base. The other seven
owned files remain hash-identical; no policy, score, parent integration,
lifecycle alias or runtime-capability scope was expanded.

| Changed File | Corrected SHA-256 |
| --- | --- |
| controller.js | `d8d8730386d7b7dbd1228af9071394d4a50ce0864290d7741d0b9fe1f6452304` |
| v8-readback.js | `764f8b9a5c98ff7da31339c410c6474b9d0c0cf67903eb99b0d68c34d435e87f` |
| test_helpers.cjs | `42dd8c4bbbb6c1058e9f4734c9127df3c2eda66324a81f2f203eab6863e2d5b9` |

Corrected ten-file package digest:
`1a37b65abda2ade5da04ec2ef0f9f396c3c86021a0967adea1328d46e8b9b129`.

Initial ten-file003 review package:
`68c6d3e1f17a84955c8947d8910f9e228b02973728b0b7b673bae4441f81f59c`.
Its immutable `max-preparation-003-report.md` remains at
`df292f345b3954080ff02c2d007616d2d257a99c2b7af059d696b541ca207507`.
The parent-preserved 16-file review-base binding remains
`2bb8881d6fadd011a227780aee598b6f5de0391cf29bc4eac39f78a50440ade6`.
The frozen score remains
`95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb`.

All changes are under `experiments/max-reference/arithmetic-roots-runtime-20261022/`.
The parent owns review, fresh preparation003 and the controlled observation.
V8 probes remain diagnostics; original runtime classes remain strict.
Source-derived defaults are not authored values. No actual V8 capability or
arithmetic parity beyond capture002 has been established.
