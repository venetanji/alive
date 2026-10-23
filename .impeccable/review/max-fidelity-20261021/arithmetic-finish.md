# Scalar arithmetic: verified finish

Completed the bounded scalar arithmetic batch on 2026-10-22 under the existing
Max-fidelity/Impeccable request. The compact generic object faces and Inspector
remain the established visual direction. This batch adds no new visual-polish
cycle and does not qualify an installed help root.

## Product behavior

- Added native subtract (`-`), divide (`/`), modulo (`%`), reverse subtract
  (`!-`), reverse divide (`!/`) and absolute value (`abs`). Existing IDs and ABI
  stay stable; the new IDs are 54 through 59. There are now 60 native kinds
  and 62 authored object types, including patcher and comment.
- Symbolic `+` and `*` and the new arithmetic objects retain integer or float
  creation mode. Integral float results retain float identity. Mode is
  structural throughout native admission, shared documents, Undo/Redo and
  Inspector locking; rhs remains a live cold parameter.
- Old rhs-only Add/Multiply patches keep legacy mode, defaults and behavior.
  English and explicit `.legacy` spellings keep those semantics. Symbolic `*`
  defaults to zero; legacy multiplication defaults to one.
- Cold input, hot lists, `set`, bang, integer coercion and zero divisors follow
  the scored original observations. Float modulo is supported. Nonfinite and
  out-of-profile results produce a local Console error and retain operands
  for subsequent recovery. Modern exponent creation refuses explicitly.
- Six original standalone examples and matching help/library entries are
  available through File Open and Help & Examples. The generated library has
  125 original entries. Licensed Max help bodies/assets are not bundled.

## Review findings and fixes

1. P2, fixed: scientific-to-decimal formatting of valid tiny float rhs values
   could exceed the ordinary 160-character object-text limit. Opening and
   committing the unchanged object failed. Arithmetic text now permits 384
   characters; other ordinary object text remains bounded at 160. Unit cases
   cover both signs of the smallest subnormal and the smallest normal double;
   the browser case commits unchanged negative-subnormal text successfully.
2. P3, fixed: legacy multiplication completion advertised modern rhs=0 and
   modern type selection. It now uses the authored alias to present rhs=1 and
   legacy decimal/exponent semantics. Symbolic multiplication still offers 0.
3. P2 in verification, fixed: the new shared arithmetic history test reused
   native document slot 14 from the cable history test. Because close retains
   the admitted revision, the following fresh test proposed a stale revision
   and failed. Moving the new test to unused slot 15 fixes the full suite
   without changing production revision guards or lock behavior.
4. Verification integration, fixed: the required contract gate called the
   arithmetic replay with `--native`; its CLI uses `--binary`. Corrected the
   invocation. Two existing browser assertions still expected 56 palette
   entries; updated them to the new 62-entry contract.

Independent native/Rust and UI reviews report no remaining blocking finding
within their bounded scopes. See `arithmetic-native-review.md` and
`arithmetic-ui-review.md` beside this report.

## Verification

Durable results are under
`experiments/max-reference/arithmetic-verification-20261022/results/`.

| Check | Result | Evidence file |
| --- | --- | --- |
| Source-first UI review regressions | Two expected initial failures; 19 focused tests pass after fixes | `ui-review-red.log`, `ui-review-green.log` |
| Required contract gate | Exit 0; all 365 JS tests and all native/Python gates pass | `contracts-final-green.log` |
| Full locked Rust | 113 pass, zero fail, two intentionally ignored | `rust-full-green.log` |
| Native arithmetic strict build and UBSan | All descriptor, legacy, runtime and boundary groups pass | `native-review-ubsan.log` |
| Frozen original-Max replay | 287 matching deliveries, four explicit local refusals, nine exponent exclusions, zero unexpected mismatches | `contracts-final-green.log` |
| Browser suite | 95/97 pass initially; two stale palette-count assertions corrected; both affected scenarios pass on rerun | `browser-final.log`, `browser-count-green.log` |
| Locked release build and atomic native-library installation | Exit 0 | `release-build-final.log` |
| Actual native File Open/WebKitGTK/C++ execution | All six repo examples pass with audio off; cold updates silent; bang recall and exact authoring retention pass | `native-desktop-final.log`, `native-desktop-result.json` |
| Native desktop cleanup | No remaining processes with the exact output-directory environment marker | `native-desktop-cleanup.json` |
| Offline oracle integrity and current native source check | 24 artifacts verified; original receipt/session/cleanup hashes match REA; native source hashes current | `oracle-seal-final.log`, `oracle-verify-final.log` |

The two ignored Rust cases need a private PipeWire graph or the licensed local
Max installation; this batch does not claim they ran. The passing arithmetic
desktop test uses an isolated session and creates no screenshots. The two
browser reruns disable automatic artifacts and their explicit preview captures.
No further cable contour inspection or correction was performed.

The original oracle contains 31 creations, 300 ordered deliveries and 218 typed
receipts. Its four nonfinite JSON carriers are null only because JSON cannot
encode NaN/Infinity; receipt metadata preserves the actual numeric result.
They are not Max null atoms or native parity passes. Generated native artifacts
are sealed separately from the immutable original capture. The final offline
machine check finds no readable exact-owned process matches, no owned prefix or
display socket, and unchanged preference hashes across 33 original/1081 source
files. Unreadable process environments remain an explicit attribution limit.

## Remaining scope

- All arithmetic remains in Ultra's finite +/-100000, eight-atom control
  profile. Max's nonfinite results intentionally differ through local refusal.
- Bare `!/`'s default numerator of one remains an implementation choice; the
  original hot-7 score does not distinguish zero from one.
- Float named-inlet variants, integer input to float-configured Abs, other
  exponent spellings, arbitrary messages and full numeric ranges remain
  unqualified by this oracle.
- This batch verifies object behavior and original demos. Whole installed-help
  qualification remains **0/2,103**. Normal F1/library help continues to use
  original demos; routing qualified installed roots is a later integration.
- Next work follows `after-cables-next-wave.md`: score complete append/prepend
  Basic chains, then int/float together, and explicitly resolve saved metadata
  and interaction diagnostics before declaring a complete installed root.

The overall all-Max-objects/help goal remains active. No commit was made.
