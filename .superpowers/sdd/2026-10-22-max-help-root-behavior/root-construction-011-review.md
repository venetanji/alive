# Capture011 Independent SPEC And QUALITY Review

Final verdict: **SPEC PASS; QUALITY PASS for the six frozen files below. No
open findings remain.** The source-like Python float-rectangle mismatch found
during review is corrected and independently verified against archived010
definitions and retained metadata. This verdict authorizes no claim of actual
freebang delivery, successful Max close, completed numeric comparison, or
installed-root qualification.

Scope is the correction in `int-float-root-construction-011-design.md`, reviewed
against historical package010 aggregate
`de17f787c669fa992eaa15f1a85729a7c3bfd53ac4dd735fc6a63209f78bcaa0`.
The reviewer changed only this report. No source edit, preparation, application
launch, screenshot, clipboard action, or comparator execution occurred. Private
graph/configuration/helper bodies, box text, channels, and command arguments
are not reproduced. Tests use synthetic objects or temporary fixture files.

## Findings

No Critical, Important, or Minor findings remain in the final frozen group.

One blocking preparation mismatch was reproduced in the earlier Python group:
the two archived sealed original rectangles contain Python float components,
while their saved/live policy rectangles and the finite literal profiles use
integers. Canonical JSON comparison treated numerically equal geometry as
different. Changing only the fixture's saved rectangle components to floats
reproduced `Invalid lifecycle finite V8 root source`; the actual archived
definitions reproduced the same refusal when given a JS-generated root proof.

The final correction at `lifecycle.py:294` validates saved and live rectangles
with `_rect` before exact numeric list equality. This accepts equal integral
float coordinates without a tolerance, coercion, or global equality change.
Booleans, strings, nulls, NaN, infinities, and changed coordinates still refuse.
The canonical comparisons for class aliases, helper maps, complete shell
policies, raw evidence, and history are unchanged. Regressions at
`test_lifecycle.py:305` and `test_lifecycle.py:319` cover the source-like numeric
spelling and invalid numeric types. The finding is resolved in the final hashes.

## Design And Scope

Historical010 comparison changes exactly these six authorized files:
`controller.js`, `v8-readback.js`, `lifecycle.py`, `test_controller.cjs`,
`test_lifecycle.cjs`, and `test_lifecycle.py`. Every other historical package
file remains byte-identical, including `numeric.py`, preparation, runner,
schema, Basic/checkpoint validation, and observer implementations.

The entire controller implementation diff consists of the reader and send
height changes at `controller.js:379` and `controller.js:382`. The authored
rectangles are exactly `[-3000,-3000,160,133]` and `[-3400,-3000,200,64]`.
The V8 proof and independent Python inventory require those same rectangles.
All other rectangle components remain exact. Freebang and disposer retain
their original height22 rectangles; names, text, channels, topology, and
original graph construction are unchanged.

The V8 rule at `v8-readback.js:128` and Python rule at `lifecycle.py:286` agree
on the following finite disposition:

| Binding | Required Behavior |
| --- | --- |
| Document and revision | Only float revision1 and literal `root/obj-2` / `root/obj-3` select the disposition. Source validation occurs inside that selection. |
| Source and helpers | Fixed float source digest and all four fixed helper digests match the historical `numeric.py` constants. Definition helper maps, shell-policy helper maps, and the four-entry config inventory are independently bound. |
| Source classes | Authored `newobj`, canonical `patcher`, and exact ordered aliases `[patcher,p]`. |
| Source profile | Literal anchor-specific text hashes and saved rectangles, integer0 saved incident route counts, and the complete existing source-bound float shell-height policy. |
| Live class and geometry | Exact actual `jpatcher`, exact x/y/width, and live height22. Numerically equal finite int/float geometry is accepted in Python. |
| Other originals | Existing exact class/name/geometry rules continue; an actual `jpatcher` outside the finite profile refuses even if injected into caller aliases. |

Both implementations retain the source-varname match, unique original
identification, full root inventory/count checks, and exact route multiplicity.
A selected profile cannot fall back to legacy `patcher` or `p` by changing the
source digest, even when both shell-policy source digests are changed with it.
There is no int `jpatcher` disposition or global patcher/jpatcher alias.

Python's fixed config helper inventory is checked in `_configuration` before
close or historical validation. Its finite original rule independently checks
the fixed source inside the literal float-r1 anchor selection. An incorrect
source therefore cannot evade the class check by bypassing the config helper
condition or by supplying a legacy actual class.

Python uses the sealed source class `patcher` only for the existing shell
geometry comparison at `lifecycle.py:332`. The raw actual `jpatcher` stays in
the private proof and ACK. No retained bytes are normalized or rewritten, and
no public/config/protocol field is added. Close sampling, automatic witness,
history replay, final barrier, diagnostics, legacy-JS admission, and Basic or
checkpoint validation receive no relaxation.

## Independent Verification

All six final hashes were checked before review and again at report freeze.
The final Python files also pass in-memory compilation. Independent execution
of these unchanged JS fixtures and syntax checks succeeds:

- `node test_controller.cjs`
- `node test_lifecycle.cjs`
- `node test_close.cjs`
- `node test_readback.cjs`
- `node test_transport.cjs`
- `node test_shell.cjs`
- `node --check controller.js`
- `node --check v8-readback.js`

The updated controller and lifecycle tests fail as expected when a read-only
filesystem shim supplies the historical implementations. The historical reader
with only the two height constants corrected in memory advances to the new
finite fixture and refuses at `lifecycle-root-original`. No source file was
modified for these regression checks.

An independently authored full-root JS fixture accepts two valid profile
variants and refuses **159** mutations. These include every component of saved,
policy-saved, policy-live, and actual rectangles; legacy/wrong actual classes;
alias deletion/order/addition; wrong document/revision/source/anchor; coherent
source/helper tampering; all four helpers at each binding location; malformed
route counts; missing/extra/duplicate helper inventories; duplicate identities
and routes; and both old height22 harness rectangles. The fixture retains raw
`jpatcher` and the existing proof field set.

The final focused Python command succeeds:

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v test_lifecycle.py test_runner.py
Ran 44 tests in 1.997s
OK
```

An additional independent Python matrix accepts **three** numeric-spelling
profiles and **two** cases under unchanged legacy rules outside the finite
scope, while refusing **238** root mutations and **four** config-helper
inventory mutations. It checks both anchors and all four rectangle components,
including invalid numeric types, plus source/class/alias/helper/profile/name/
route/identity boundaries. Wrong-source legacy fallback remains refused for
the selected float-r1 anchors. A complete synthetic float close with saved and
live float coordinates, subsequent legacy int close, and final barrier replay
preserves the exact original raw float geometry and both `jpatcher` records.

Finally, a hybrid fixture uses the **actual archived010 sealed definitions**
and all **eight retained010 root-object metadata records**. It supplies only
synthetic root topology and owner handles. The final JS collector accepts the
fixture; Python accepts that generated proof against the archived definition,
including its all-float original rectangles and integer policy rectangles.
The four raw original classes remain `js`, `jsui`, and two `jpatcher` values.
Archived config, seal, and raw root-refusal bytes are unchanged. This fixture
is a synthetic metadata check, not a new runtime observation or a claim that
the captured failing proof itself succeeded.

## Frozen Files

Paths are relative to `experiments/max-reference/int-float-runtime-20261022/`.

| File | SHA-256 |
| --- | --- |
| controller.js | `5fe9d39423215a0eab2c7da778bcdc45e812908fed6c11b303031a2443ce9c46` |
| v8-readback.js | `11c77b01ff7a99dd7c3bfd2626a1bdc06522ecfa66cf0b70d4a1700186ddf2f9` |
| test_controller.cjs | `f192e413febcd63b55bfd76d4f4b89e36e193ed8af46039e16bfd56cf83e3ea1` |
| test_lifecycle.cjs | `50c473dcd3e9cf15aac27e30918cebc7d50cde3dac50ceee34937862ff6d3424` |
| lifecycle.py | `b1cca880849a5a8b533b454e96caa0873fd11e5cd08f6987314808806b6fc9c4` |
| test_lifecycle.py | `9dd5e95ff7289dccc59768143aa6c8173559f40377b1172453379b9af0849561` |

## Remaining Limits

The tests and metadata fixture establish the construction, finite class rule,
geometry handling, and tested evidence gates. An actual fresh capture is still
required to observe Max's root metadata, automatic freebang witness, successful
close convergence, and completion barrier. Int V8 root class behavior has no
captured metadata here and receives no speculative disposition. Capture009's
underlying predicate remains historically unknown. No qualification pass or
numeric semantic/native comparison is added by this review.
