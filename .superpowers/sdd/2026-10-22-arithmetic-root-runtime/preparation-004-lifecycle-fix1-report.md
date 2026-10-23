# Preparation004 Lifecycle Fix Round 1

Status: independent lifecycle portion of accepted P1 implemented and focused synthetic verification GREEN. The two owned code files are frozen for review. No known interface concern remains. Main-worker collection and P2 diagnostic changes are outside this report's verification scope.

## Frozen Bindings

Requirements: `preparation-004-fix1-brief.md`. Accepted review SHA256: `5dc92022e0df68dc95aea0fca95b6322d33c455d23569f01cf1dd30584ce3656`. Initial004 review-base archive binding SHA256: `92677edf00fad9cabb88ad69b1e4f4a5f6b937c9f7018bdec9c2f814ba78fae9`.

The following paths are relative to `experiments/max-reference/arithmetic-roots-runtime-20261022/`:

| Changed file | SHA256 |
| --- | --- |
| `lifecycle.py` | `74cc5c1ecd05f32d840dcd6c5516878ed678c55e81c3e7b32f85ba0321ab8508` |
| `test_lifecycle.py` | `4bce4ff00b50974cc2c35c74c54ebee3369d0003ac1781c9a95c80567a96d0b6` |

Initial implementation reports remain unchanged. No other code was edited. No real preparation, application/display/capture launch, commit, delegation, or full moving-stage suite occurred.

## Change

`lifecycle.py:559` now requires the exact private `basic_retention` envelope on every pre-close root proof, for all six source owners. `lifecycle.py:449` independently checks its version, strict integer request/operation/revision identities, close action/step, source owner, working path, and sealed Basic name. The same source Basic container must appear in the outer root inventory with its sealed source name and patcher descriptor; existing outer class/geometry/owner checks remain in force.

The new validator derives original varnames and observer leaves from the sealed source definition without importing arithmetic or the main-worker implementation. It validates unique source IDs/anchors/names, complete matching source descriptors, unchanged source class metadata, source text hashes and empty flags, strict source inlet/outlet counts, and exact observer definitions. Message capability and other unadmitted source policies remain refused.

Actual Basic inventory must contain exactly every original and observer leaf once. Original classes remain strict, except the three numeric representations admitted by the already-independent five-witness validator. Original geometry must match exact finite source coordinates or an already-admitted, independently validated measured geometry policy. Equivalent integer/floating coordinate spellings compare numerically without tolerance. Observer leaves require actual `js` and finite rectangle observations. No live text, port-count, setter, or additional numeric getter capability is introduced.

Both independently observed endpoint arrays are validated with strict integer ports, known identities, source port bounds, and separate duplicate-sensitive counters. Expected counters include every source edge with its original multiplicity and every observer leaf cable.

`lifecycle.py:842` continues to replay each retained close through `_verify_close` and `_root`, so every historical Basic payload receives the same semantic checks as an actual close. Existing root/ACK bytes and digest equality, request/source/helper binding, private file/path/link/permission checks, owner absence, observer history, route checks, five representation witnesses, public function signatures, and returned lifecycle metadata keys remain intact. The production diff against initial004 consists of the new validator, the required root field, and its invocation.

## Test-First Verification

The initial targeted RED command ran the new mandatory-proof and all-owner acceptance methods before production edits. It produced seven assertion failures across two test methods: missing Basic evidence was accepted for all six owners, while a valid new Basic envelope was rejected by the old field allowlist. There were zero test errors.

After implementation, the full focused lifecycle module passed 19 methods. An additional source-bound measured Basic geometry regression then passed with the full module. Final fresh command, run from the arithmetic stage:

```sh
python3 -B -m unittest test_lifecycle
```

Result: 20 tests passed, zero failures/errors, 4.486 seconds. All initial 12 methods remain and pass with complete original synthetic Basic metadata; eight methods were added for this fix.

Coverage includes:

- Complete Basic retention acceptance for all six owners, including both gated times revisions, duplicate source cables, and the final empty-owner barrier.
- Mandatory nested proof refusal for every owner.
- 35 actual-payload corruption cases: nongated/gated classes, missing/duplicate/extra originals and leaves, leaf class, exact/nonfinite/boolean geometry, wrong owner/request/operation/step/action/path/name/source, unknown fields, boolean identities, and independent input/output multiplicity/endpoint/port errors.
- 17 sealed-source corruption cases: invalid source port bounds/types, boolean inlet/outlet counts, source text/empty integrity, Message capability, missing/inconsistent source descriptors, observer definitions and port types, duplicate/colliding identities, and Basic container binding.
- Acceptance of equal finite coordinate spellings and the exact existing source-bound measured Basic geometry; refusal of representable drift without tolerance.
- Corrupted retained Basic leaf class for each of the six owners after synchronizing the original root, embedded ACK, retained root, and metadata bytes/digests. The barrier refuses each forgery through semantic revalidation rather than stale digest detection alone.
- A corrupted retained endpoint multiset at the next real close after the same outer rebinding.

Both files compile in memory, contain ASCII, and retain the exact prior stdlib-only lifecycle import set. No bytecode files were written by the test commands.

## Limits

Verification uses original synthetic source-shaped fixtures and private temporary files. No licensed source bodies, creation operands, defaults, complete source graphs/configuration, raw captures, or measured geometry vectors were printed or copied into fixtures. This report does not verify JavaScript collection, P2 diagnostic retention, real preparation004 behavior, full-stage integration, getter silence, arithmetic score operations, or parity. Combined verification and scoped re-review remain parent work. No score, qualification, callback-order claim, getter capability, helper expansion, or representation witness schema was changed.
