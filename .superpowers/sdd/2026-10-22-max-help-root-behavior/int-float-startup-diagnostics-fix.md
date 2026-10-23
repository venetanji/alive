# Int/float Startup Diagnostics Fix

Date: 2026-10-22. Status: implemented and frozen for independent review before
another private preparation or runtime capture.

Capture007 failed at startup with zero score operations: no readiness result,
ACK, journal entries, lifecycle report, or opened owner roots. The retained
runtime stderr establishes no JavaScript/V8 error. Its evidence identity is
`ev_d54bb2d47d54e88599849f63fee4427e2e212736e9ae4bce83687df9a1de6978`.
This change does not identify or assume that failure's root cause. The consumed
preparation007 is not reused. The private package007 archive binding supplied
by the parent is
`66e2e0daff2d21776c441f9c2bbe8ab6e21e65f1c821318d26f598891dacfa1f`.

## Change

The controller catches startup errors and writes an existing private readiness
result with `ready:false`, no live owners, zero opened source roots, and
`startup_diagnostics`. Its explicit stage is `config`, `geometry`, `observer`,
or `startup`; its error uses the existing typed exception representation.
No command ticker starts following a refusal. A partially initialized ticker
is cancelled if its startup fails. Configuration-read failure uses a fixed
sibling `ready.json` fallback only when the helper argument ends in the exact
`config.json` path component; another basename cannot select an arbitrary
fallback target.

The lifecycle control boundary distinguishes dispatch throws, an absent report,
an unreadable report, a stale binding, and an explicit V8 failure report.
Explicit failure reports always refuse, including failures whose epoch was
unavailable during bootstrap/configuration. Their private details are retained
in the failed readiness result. Success reports still require the same exact
epoch/request/step/control binding and observer state as before.

The V8 observer retains control/proof/persistence exceptions under the existing
private lifecycle report path when that path can be written. A failure report
contains `success:false`, its epoch/request/step/control binding, a typed error,
the failing stage, and readonly actual driver object observations of varname,
class, box text, geometry, and validity. The diagnostic scan is bounded to 32
objects and geometry array observations to 16 elements; it records incomplete
or throwing reads explicitly. These observations are diagnostics only. Failure
reports contain neither `driver_route_proof` nor `observer_report` success
members. The first failure is sticky, and later controls cannot turn it into a
successful proof. A failed write gets one attempt to retain the failure report;
if the report destination itself is unwritable, the controller still refuses
through the absent/unreadable/stale/dispatch error boundary.

The observer also catches the narrow bootstrap exception that can arise while
reading `runtime.jsarguments[1]`. The documented global `jsarguments` may locate
the private failure destination in that case. It never repairs the successful
runtime binding or authorizes a proof. This covers a hypothesis supplied by the
parent and does not establish that the installed Max runtime has this behavior.

The owner freebang route, five-inlet mapping, guarded callback/IIFE policy,
geometry/text policies, private channels, typed close conjunction, 31 accepted
close samples, bounded convergence, independent Python gate, final barrier,
score, and public successful schemas are unchanged. No named bus, route
challenge, manual lifecycle event, source geometry adaptation, or source body
is added. Only the five files bound below and this report are edited; Python
and product files are untouched.

## TDD Evidence

Tests were written and run before implementation:

- Controller RED: the new startup fixture failed because a configuration read
  exception escaped with no private readiness result. GREEN covers config,
  geometry, absent/stale/unreadable report, dispatch, explicit failure,
  unavailable failure epoch, startup task creation, normal startup, no ticker
  or owner opens after refusal, and exact fallback basename enforcement.
- Observer RED: an actual synthetic driver text mismatch escaped instead of
  retaining a private refusal. GREEN covers typed actual metadata, bound
  failure identity, no success proof, sticky refusal after the mismatch is
  repaired, route mismatch, throwing geometry, and transient/persistent write
  failure.
- Bootstrap RED: a lexical global `jsarguments` with no matching property on
  `this` threw during observer construction before guarded callbacks existed.
  GREEN retains a bound bootstrap failure through a guarded control callback,
  with no successful route proof.
- Primitive-exception RED: a `throw null` geometry read caused a secondary
  property access error in diagnostic handling. GREEN retains its exact typed
  null exception as a refusal.
- Private-detail RED: an explicit failure with unavailable epoch lost its
  diagnostic payload at the controller boundary. GREEN retains those details
  while continuing to refuse.

Final verification passed: `node --check controller.js` and
`node --check lifecycle-observer.js`, plus all eight existing Node suites:
`test_controller.cjs`, `test_lifecycle.cjs`, `test_close.cjs`,
`test_transport.cjs`, `test_shell.cjs`, `test_annotations.cjs`,
`test_float_mode.cjs`, and `test_readback.cjs`.

All fixtures use synthetic Max APIs. They establish diagnostic control flow and
continued strict refusals, not installed Max/V8 API capabilities, automatic
freebang delivery, or a successful runtime close. No private preparation or
runtime launch is performed for this implementation task.

## Frozen SHA-256

Paths are relative to `experiments/max-reference/int-float-runtime-20261022/`.

| File | SHA-256 |
| --- | --- |
| `controller.js` | `dd98f2c01afb095aeb2c87ff8301a4531a5590ab65e23e81f079fc936024507e` |
| `lifecycle-observer.js` | `21d4efb26ad9001bf493679de927a08a447beef0aabe893766848804fa55ccac` |
| `test_controller.cjs` | `b1d558fdb5442a4a56b25526a3dd351176f413cdfcbc240492654e9d0c3474c8` |
| `test_lifecycle.cjs` | `cef2047a95f48ed699e9bd84b32157bb7d9c08b7cd0fee9fe456a15141d6c02f` |
| `lifecycle-fixture.cjs` | `716028c3e196eaee626c37b5d7bcf17b1111f9c254d048383ceb4765269fa4a6` |

After writing this report, all five source hashes were rechecked and remained
unchanged. Independent review and a future bounded diagnostic capture remain
with the parent.
