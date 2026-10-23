# Int/float Root-Proof Failure Diagnostics

Date: 2026-10-22. Status: implemented and frozen for independent review. Task
scope is diagnostic-only changes to `v8-readback.js`, focused additions to
`test_lifecycle.cjs`, and this report. No preparation or runtime is launched;
the parent retains capture and comparator ownership.

The parent reports that capture009 passed driver startup and reached 42 score
operations, 82 checkpoints, and 19 destination-order pairs. Close request125
refused before disposal; its private root-proof file contained only the prior
generic refusal, samples were empty, and no disposal occurred. The underlying
cause remains unknown. This implementation supplies no construction, geometry,
text, capability, or source-policy adaptation.

## Diagnostic Change

`collectLifecycleProof` retains all existing proof predicates and its exact
success return object. An optional private progress object records the current
stage: request/root binding, owner map, inventory, geometry, harness, original,
count, patchcords, routes, or proof write. These assignments do not alter the
comparisons, inventory, route multiplicities, or accepted geometry/text.

On the existing guarded root-proof refusal path, `lifecycleproof` writes the
same `success:false`, request ID, and error code to the same configured private
root-proof destination, adding `failure_diagnostics`. It records the failing
stage and exact typed thrown value, with bounded error name/message where
available. No truthiness check distinguishes success from failure: null,
undefined, false, numeric zero, and empty-string exceptions remain refusals.

The readonly root scan records each object's independently typed varname,
class, and patching rectangle. Additional box-text and validity reads require
an exact known harness varname and its expected class: reader/v8,
disposer/thispatcher, freebang/freebang, or lifecycle_send/send. Truncated names
or classes cannot qualify. A rejected original comment that collides with a
harness varname does not qualify. Geometry remains diagnostic even when its
height differs from the required proof geometry. Throwing field getters remain
typed observations and do not prevent other fields from being observed.

Diagnostic bounds are explicit: at most 16 root objects, 256 characters per
string, 16 array members, and one array depth. String/array truncation retains
length and truncation markers. The scan reports completion, a limit hit, or a
typed scan exception. The complete failure JSON is estimated after ASCII
escaping and capped at 24,000 bytes, below the observed 32 KiB single-line
transport limit. If necessary, trailing diagnostic objects are omitted with
an explicit omitted-object count. The proof success writer and success schema
remain unchanged.

If collecting or budgeting diagnostics itself throws, the catch path still
writes `success:false` with the original typed exception and a separate typed
diagnostic exception. This fallback independently bounds both exceptions by
omitting array items while retaining array type, length, and explicit
truncation; primitive values and bounded name/message strings remain typed.
The fallback therefore also stays within the complete-record 24,000-byte
limit. Failure payloads never carry successful proof fields:
version, root ownership assertion, original/harness inventories, or route
lists. A transient success-write exception also enters the refusal path. An
unwritable private destination continues to refuse rather than authorizing a
proof.

As directed by the parent, this change adds no fallback destination or new
config/command/definition recovery mechanism. Existing setup failures before
the configured destination is resolved continue to refuse. No private body,
source text, graph, channel, or runtime log is printed by this implementation.

## TDD And Verification

The new focused diagnostic assertions were written before implementation.
The RED run failed because a wrong harness rectangle produced no stage or
private metadata. After implementation, the focused fixture covers:

- Wrong harness geometry and box text, original class mismatch, a throwing
  geometry getter with other harness fields retained, and exact typed falsy
  exceptions.
- A throwing first-object scan, a cyclic/oversized scan bounded to 16 entries,
  oversized strings and arrays with explicit truncation, and a larger payload
  that exercises whole-object omission to fit the total JSON byte budget.
- Request mismatch, a transient proof-write exception, and a diagnostic helper
  throwing false; every case retains a refusal without proof-success members.
- A normal success with no diagnostic field, plus an original box-text getter
  that fails the fixture if any diagnostic path reads it.

Independent review found two defects in the first frozen version. The focused
original-comment/harness-name collision regression first failed with one
forbidden text read. Requiring the expected class fixed that regression. The
next run exposed the fallback-budget regression: two thrown arrays containing
16 strings of 256 Unicode characters exceeded the ASCII JSON limit. Compact
fallback exceptions fixed it. Both regressions now pass, including exact typed
null, undefined, false, zero, and empty-string values in both fallback exception
positions. No proof predicate or construction policy changed.

Final verification passes: `node --check v8-readback.js`,
`node test_lifecycle.cjs`, `node test_close.cjs`, `node test_readback.cjs`, and
`node test_transport.cjs`. These synthetic Max fixtures establish diagnostic
control flow and preservation of proof gates; they do not establish installed
Max APIs, automatic lifecycle delivery, or the cause of capture009's refusal.

## Frozen SHA-256

Paths are relative to `experiments/max-reference/int-float-runtime-20261022/`.

| File | SHA-256 |
| --- | --- |
| `v8-readback.js` | `3ee0796804a9ec8c9274e85e75fe8e7f1849f9a0b940cdfe3c47404d05589704` |
| `test_lifecycle.cjs` | `8dca56b77fe79da4cf46c1e5a60b7a0374db6bc7f232907ca1c03e0902947abf` |

These supersede the initial review bindings
`1bf424ed0c9d236a8ffef69639e06361f95d6d633821a8f7f693552bde10c8d0`
and `eff1243d8582456bf98d1d75fde488cbb8afcb47982d7d8cb94683441e0e66e8`,
respectively; both review corrections are included in the current freeze.

The starting bindings were
`99f9ab7e4462149db4f1be26fe8827f03fbe52ddcf5ae79c325c3dee1dac817a`
for `v8-readback.js` and
`f86c0500f20e1005769cc1f9d031d6bb91e96f5049584d8a3701f5414cde142c`
for `test_lifecycle.cjs`. Both final hashes were rechecked after writing this
report and remained unchanged.
Independent review and any future preparation/capture remain with the parent.
