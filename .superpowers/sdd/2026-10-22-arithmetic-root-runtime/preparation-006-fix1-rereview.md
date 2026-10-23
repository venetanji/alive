# Preparation006 Fix1 Scoped Re-review

Verdict: **ready**. Specification readiness: **ready**. Quality readiness:
**ready**. The initial006 P1 is addressed; no remaining in-scope finding was
reproduced.

This is a scoped re-review of the queued-callback failure identified in
`preparation-006-scoped-review.md`, SHA256
`215231a4388ea6bbfed9f6e6b048a1b7d37f14b6388b3563770351474883cb99`.
The comparison base is exact initial006 at
`/home/venetanji/.cache/alive-ultra-evidence/arithmetic-package-006-review-base`,
not consumed005 or the initial005 review-base.

## Finding Disposition

**P1 addressed**, `controller.js:595`, `controller.js:602`,
`controller.js:635` and `controller.js:640`.

The terminal-failure flag belongs to each invocation of `install`. Every
queued poll checks it before touching the global trace, host properties,
validation, files, capabilities, helpers or scheduling. Both the initial
scheduling/marker catch and the recurring poll catch latch failure before
entering the existing failure handler. A failure in that handler therefore
cannot reactivate the old callback. Exceptions before initial scheduling have
no pending callback to invalidate.

The guard stays effective after the global trace identity changes. It requires
no Task cancellation capability or additional target probe. Healthy scheduling,
trace schema, setters/messages, settling requirements and refusal behavior are
unchanged. The production diff is limited to the local flag, early callback
guard and the two exception paths. No class, numeric or V8 policy changed.

## Fresh Verification

Commands ran from `experiments/max-reference/arithmetic-roots-runtime-20261022`:

- `node test_helpers.cjs`: exit 0. All ten queued-failure regressions report
  zero post-failure activity, zero changed ACKs and zero unexpected queues.
  They preserve exact ACK/journal/trace bytes and the measured target,
  geometry, capability, helper, File-construction and scheduling activity.
- `node --check controller.js`: exit 0.
- `node --check test_helpers.cjs`: exit 0.
- Independent in-memory reruns of the original initial/recurring sink failures,
  with both strict-refusal and otherwise successful bind fixtures: four cases
  pass. Draining each queued callback produces no additional measured activity
  and preserves the original refusal ACK and journal bytes. The previously
  successful bind no longer proceeds after the instrumentation refusal.
- Four further sink controls replace the global trace pointer with an active
  object whose property reads throw. Every old callback stays inert, with zero
  reads of the replacement trace and unchanged measured activity/ACK/journal.
- Four record-bound controls fill the test trace budget at the initial or
  recurring scheduling boundary, with both bind fixtures. Each retains the
  explicit terminal marker at record 2048, then drains the queued callback
  without activity, ACK/journal changes or rescheduling. Synthetic budget
  filling exists only in the test VM; production bounds remain unchanged.

Independent probe totals: 4 original sink cases, 4 active-global cases and
4 bound cases; zero post-failure activity, changed ACK bytes, changed journal
bytes, unexpected queues or replacement-global property reads. Probe SHA256:
`094e85003e9b9118f9787c35459d12edb25ca60ab04f7768baf521a8cc14c179`.

The complete suite retains all earlier trace/capability/error and settling
controls. The healthy 80-poll trace remains 1740 records, 644956 bytes, maximum
947 bytes per record and 420 original capability calls; the persistent-refusal
trace remains 1710 records. Existing005 P1/P2 regressions still cover 12 invalid
identity and 8 invalid geometry cases with zero calls and direct/serialized
observations. The 100ms schedule and 70/80 attempt bounds remain unchanged.

## Frozen Bindings

All sixteen initial006 base files and sixteen fix1 files were verified against
the exclusive review map. Exactly `controller.js` and `test_helpers.cjs` differ;
the other fourteen files and the score are byte-identical. All ten package
files match the canonical package digest. Canonical maps use sorted compact
filename/SHA256 JSON; the base archive binding hashes its `binding.json` bytes.

| Binding | SHA256 |
| --- | --- |
| Initial006 review archive binding | `535b41f2e055757a78b301c04e086267f743df84bfd2fdaa39884153c0a46839` |
| Fix1 brief | `b2117b44c9e7e63346d5d1bf3c1728e94ba2f5bff969bc87b8f6b8ac296c7f5d` |
| Fix1 worker report | `396a5e83a9d1a91ee5e45af90728757022069ef03b883f7720c7244e4e3327dd` |
| Fix1 review diff | `e75d3171158fe554df5b9f7b1fe22db48fde1febfd10ba7dea21e90c95f1f6ca` |
| Fix1 review JSON | `adb423a3c0644cd8eb8c44bf0a7548932e40ed9c73aaa351331f910fc4017188` |
| Fix1 controller.js | `c0b0a45ef7a72a484fa976774f5a10e1ca9fcf6892603f723fb7df6c220a3d97` |
| Fix1 test_helpers.cjs | `e266842aeef514da31f4528ad4d141605f3f3b7fcb5e966e0d070d00a44b0631` |
| Fix1 two-file map | `682004a9bc4235e82b2c6390eb3976ee949650c54ffba53f08b171add62d2dd0` |
| Fix1 ten-file package | `b140eddbac9d134e162ff4cfdf2388be1285cf45b9127bd8bcc0d253ff0e99e5` |
| Unchanged score | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |

Only this report was written. No preparation, application/runtime/native
launch, commit, delegation or private-evidence mutation occurred. This verdict
establishes the scoped offline failure-latch correction. It does not identify
the capture005 timeout cause or establish005 capability results, live trace
overhead, runtime parity or saved order. Qualification remains 0/2103, with
78 operations / 504 states / 141 emissions / six independent closes still
required. Parent owns subsequent preparation and runtime gates.
