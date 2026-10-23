# Capture012 Int V8 Root Class: JS Implementation

Date: 2026-10-22. Status: implemented and frozen for independent review.
Authorized scope is `v8-readback.js`, `test_lifecycle.cjs`, and this report.
No preparation or runtime was launched. Parent retains capture ownership.

## Evidence And Change

The authoritative design is `int-float-root-class-012-design.md`. It records
that capture011 validated float-r1 close125 with 31 samples and one automatic
event, then reached 48 operations and 92 checkpoints before int-r1 close141
refused at the original-object proof. The bounded eight-object scan showed
matching owned harness geometry/classes and raw V8 `jpatcher` for int root/obj-2
and root/obj-3 at their sealed names and live rectangles. This establishes the
new int class observation; it does not complete the numeric comparison or
final barrier.

The existing finite predicate now uses a literal two-document source lookup:
the fixed int digest and the previously fixed float digest. Only revision 1
and roots obj-2/obj-3 qualify. Their saved rectangles and source-text hashes are
the same finite profiles already present in `numeric.py`'s int/float shell
constants. The existing policy must be exactly `source-bound-int-shell-height`
or `source-bound-float-shell-height`, with the selected document and fixed
source digest. The float rule is retained.

All previous checks remain exact: the four fixed helpers at definition,
policy, and config bindings; authored `newobj`; canonical `patcher`; ordered
aliases `[patcher,p]`; saved/live geometry; source text hashes; numeric-zero
incident route metadata; exact source name; unique inventory; and complete
root route multiplicities. Selected profiles require actual `jpatcher`,
including when their source claims are malformed, so they cannot fall back to
legacy classes. Raw proof `jpatcher` remains unchanged. The generic path still
refuses `jpatcher` regardless of caller-supplied alias lists.

No construction, checkpoint, Basic, legacy-JS, diagnostic, close-sampling,
lifecycle-history, success-schema, config, or public field changed. The
controller and controller-test hashes remain their capture011 bindings.

## TDD And Verification

The expanded two-document fixture was added first. Its float cases passed,
then its int-r1 positive case failed with `lifecycle-root-original`. The
literal int source lookup and document-specific existing shell-policy binding
made both int anchors GREEN.

The shared int/float matrix covers both exact raw class profiles and rejects
legacy classes, wrong document/revision/source/anchor, wrong source plus legacy
actual class, altered helpers/text/classes/aliases/policy fields, and caller
aliases outside the finite disposition. It checks every component of saved
entry geometry, policy saved/live geometry, and actual live geometry against
numeric drift, booleans, strings, null, NaN, and infinity. Source-style numeric
saved rectangles such as `10.0` remain equivalent to `10`. Route metadata
requires primitive numeric zero, rejecting false, string zero, null, and
nonzero values. Existing duplicate-inventory and extra-route rejection remain.

A synthetic float125 close followed by int141 close and the final barrier
passes with one event per owner, unchanged earlier event/transition prefixes,
and retained raw root-proof/report snapshots. Existing diagnostic bounds,
privacy, falsy exceptions, sticky refusal, lifecycle provenance, and barrier
fixtures continue to pass.

Final verification passed:

- `node test_lifecycle.cjs`
- `node test_close.cjs` (including full 31-sample close validation)
- `node test_readback.cjs`
- `node test_transport.cjs`
- `node --check v8-readback.js`

These synthetic checks establish the finite JS extension and surrounding
tested gates. They do not establish a complete actual capture, final barrier,
or strict numeric comparison result. The Python worker independently checks
the matching source disposition and immutable retained histories.

## Frozen SHA-256

Paths are relative to `experiments/max-reference/int-float-runtime-20261022/`.

| File | SHA-256 |
| --- | --- |
| `v8-readback.js` | `c212831c913ec1e132130710053b0afd1f87d50a81c663a9e74456957d192ae6` |
| `test_lifecycle.cjs` | `242d16be4db7dea637948c19f132ea5404cad0e1907b823c4db110d92bb45c63` |

The prior bindings were
`11c77b01ff7a99dd7c3bfd2626a1bdc06522ecfa66cf0b70d4a1700186ddf2f9`
and `50c473dcd3e9cf15aac27e30918cebc7d50cde3dac50ceee34937862ff6d3424`,
respectively. Both new hashes were rechecked after writing this report.

Unchanged construction bindings:
`controller.js` is
`5fe9d39423215a0eab2c7da778bcdc45e812908fed6c11b303031a2443ce9c46`;
`test_controller.cjs` is
`f192e413febcd63b55bfd76d4f4b89e36e193ed8af46039e16bfd56cf83e3ea1`.
