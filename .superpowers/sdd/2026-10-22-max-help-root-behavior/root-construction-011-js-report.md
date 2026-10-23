# Capture011 Root Construction: JS Implementation

Date: 2026-10-22. Status: implemented and frozen for independent review.
Scope: `controller.js`, `v8-readback.js`, `test_controller.cjs`, and
`test_lifecycle.cjs` in the numeric experiment, plus this report. The parent
retains preparation, capture, and comparator ownership. No runtime was launched.

## Evidence And Change

The authoritative design is `int-float-root-construction-011-design.md`.
Capture010's bounded root diagnostics show a reader height of 133 and lifecycle
send height of 64, with their other rectangle components unchanged. They also
show V8 `jpatcher` for the two float-r1 root subpatchers at root/obj-2 and
root/obj-3, uniquely bound by source varname and exact live rectangle. The
initial captured failure is the harness predicate. The metadata does not
establish a resize mechanism or explain capture009's historical refusal.

Controller construction now authors reader `[-3000,-3000,160,133]` and send
`[-3400,-3000,200,64]`. The V8 lifecycle proof requires those exact rectangles.
Disposer and freebang remain height 22; all names, text, x/y/width, owner
channels, topology, original graph, and other construction are unchanged.

An internal `lifecycleRootV8Class` predicate selects only float revision 1 and
root/obj-2 or root/obj-3. For these selected entries it requires all of:

- The fixed float source digest and four fixed helper digests, independently
  checked against the definition, existing shell policy, and four-entry config
  helper inventory. Missing, extra, duplicate, or altered helper identities
  cannot satisfy the binding.
- Authored maxclass `newobj`, canonical runtime class `patcher`, and the exact
  ordered alias list `[patcher,p]`; the two fixed source-text digests and saved
  rectangles; zero saved incoming and outgoing routes.
- The exact existing source-bound float shell-height policy: document, source,
  anchor, source runtime class, text digest, helper map, saved/live rectangles,
  and route counts. Exact live height remains 22.

The selected profiles require actual V8 class `jpatcher`; legacy `patcher` and
`p` do not satisfy them. Outside this finite profile, `jpatcher` has no generic
original-class fallback. Existing source-varname equality, unique object
identification, exact live geometry, count/duplicate checks, and complete route
multiplicity checks remain enforced. Retained proof bytes keep raw `jpatcher`
without normalization. No config or proof field was added.

The Python worker independently implements the same finite binding using the
existing sealed definition. Shell geometry there uses the sealed source class
`patcher` while validating raw actual class `jpatcher`. The JS work does not
alter legacy-JS admission, Basic resolution, checkpoint validation, diagnostics,
close sampling, lifecycle history, or automatic-witness logic.

## TDD And Verification

Before implementation, controller and lifecycle tests were changed to require
the observed exact helper heights. Controller RED reported actual reader height
22 against expected 133; lifecycle RED reported `lifecycle-root-harness`.
After the two height corrections, controller was GREEN and lifecycle advanced
to the new two-subpatcher fixture, failing `lifecycle-root-original` for the raw
`jpatcher` classes. The finite predicate then made that fixture GREEN.

Focused fixtures retain raw class evidence and reject legacy classes, wrong
document/revision/source, wrong anchor or source name, altered canonical class
or alias list, text digest, saved/live geometry, saved incident route counts,
each helper digest at all three binding locations, malformed/extra shell-policy
fields, duplicate helper inventories, duplicate original identities, and extra
root routes. Existing diagnostic privacy/budget/falsy-exception tests remain
GREEN, and the old height-22 reader/send proofs now refuse.

Final checks passed:

- `node test_controller.cjs`
- `node test_lifecycle.cjs`
- `node test_close.cjs` (including the full 31-sample gate)
- `node test_readback.cjs`
- `node test_transport.cjs`
- `node test_shell.cjs`
- `node --check controller.js` and `node --check v8-readback.js`

These are synthetic fixtures. They establish the finite JS construction and
proof behavior, and preserve the tested surrounding gates. They establish no
automatic freebang delivery, successful close, numeric comparison result, or
installed-root qualification before a fresh actual run.

## Frozen SHA-256

Paths are relative to `experiments/max-reference/int-float-runtime-20261022/`.

| File | SHA-256 |
| --- | --- |
| `controller.js` | `5fe9d39423215a0eab2c7da778bcdc45e812908fed6c11b303031a2443ce9c46` |
| `v8-readback.js` | `11c77b01ff7a99dd7c3bfd2626a1bdc06522ecfa66cf0b70d4a1700186ddf2f9` |
| `test_controller.cjs` | `f192e413febcd63b55bfd76d4f4b89e36e193ed8af46039e16bfd56cf83e3ea1` |
| `test_lifecycle.cjs` | `50c473dcd3e9cf15aac27e30918cebc7d50cde3dac50ceee34937862ff6d3424` |

All four hashes were rechecked after writing this report and remained unchanged.
