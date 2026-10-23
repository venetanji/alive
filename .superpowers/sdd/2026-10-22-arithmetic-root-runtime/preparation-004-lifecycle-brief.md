# Preparation004 Independent Lifecycle Validation

Implement only `lifecycle.py` and `test_lifecycle.py` in
`experiments/max-reference/arithmetic-roots-runtime-20261022/`.
The main preparation worker reserved these files and will not edit them.
No other code changes, preparation, Max launch, commit or delegation.

Read `max-preparation-004-design.md` and `preparation-004-review-brief.md`
for the finite requirements and privacy boundary. Implement test-first with
original synthetic fixtures. Keep all source-owned graphs/operands/defaults,
full raw data/configuration and geometry vectors private and unprinted.

## Frozen Interface

The checkpoint policy/witness schema is now implemented in arithmetic.py:
`V8_REPRESENTATION_EVIDENCE`, `V8_ROOT_REPRESENTATION_PINS`,
`v8_representation_policy`, `validate_v8_representation_policy`, and
`validate_v8_representation_witnesses`. Synthetic `v8_fixture` in
`test_preparation.py` documents the accepted original fixture. Read those exact
functions/constants; do not guess fields or import arithmetic.py from the
independent lifecycle validator. Main worker will not change that schema
without coordination. Read current code, not historical003 for new fields.

The raw pre-close root proof adds `v8_representation_witnesses`, containing
exactly three numeric and two root rows. For close, operation_request_id equals
request.command_id, action is close, action_document is times, action_revision
is the closing revision, and request_id is the same close request. Root
originals retain actual jpatcher classes. Numeric default equality is required
only on install; a close must allow evolved finite scalar numeric values.
Each of the two times owners must independently obtain fresh witnesses.

Independent stdlib lifecycle validation must check exact evidence/policy/source/
helper/box/text/geometry/owner/request bindings, complete inventories and exact
five-row multiplicity, actual number + scalar format6 + scalar finite getter
for gated controls, and actual jpatcher + exact name/rect for root gates.
Keep source descriptors/runtime_classes unchanged. Apply the gates while
checking actual root proof originals; do not rewrite raw classes. Other roots
and all non-gated objects remain strict. Do not accept legacy singleton arrays.

`validate_close` must require valid witnesses on actual close, and
`validate_barrier` must transitively revalidate every retained pre-close proof
and all five witnesses from prior real closes. Preserve current source/helper,
owner absence, history/route/endpoint, path/link/type/private-permission and
request identity checks. No generic alias/policy transfer, diagnostic suppression,
new getter capabilities, score changes or qualification increments.

## Verification And Report

Run meaningful focused lifecycle tests including RED/GREEN acceptance and
corruption refusals (missing/duplicate/wrong owner or request/altered policy or
binding/incomplete inventory/wrong actual class/getter shape/format/nonfinite
value/changed exact geometry/forged retained history witness). Preserve existing
lifecycle tests. Do not run the full moving stage suite.

Persist report `preparation-004-lifecycle-report.md` with status, exact changed
file hashes, RED/GREEN counts and scope/limits. Send concise progress when an
interface issue appears. Return only report path/hash, tests summary and concerns.
