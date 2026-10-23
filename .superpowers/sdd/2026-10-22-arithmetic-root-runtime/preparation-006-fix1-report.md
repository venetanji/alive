# Preparation006 Fix1: Terminal Install Failure Latch

Fixed the parent-reproduced P1 in exactly `controller.js` and `test_helpers.cjs`. The initial006 implementation, report and review artifacts remain historical. The review base is `arithmetic-package-006-review-base`, whose `binding.json` SHA256 revalidates as `535b41f2e055757a78b301c04e086267f743df84bfd2fdaa39884153c0a46839`.

## Failure And Correction

Both initial and recurring install sites schedule a callback before writing the `poll-scheduled` trace marker. If that write refuses instrumentation, normal failure handling publishes a negative ACK and deactivates tracing, but the already queued callback can still run. In initial006 that callback could make capability calls, attach helpers, reschedule, append journal rows and overwrite the instrumentation refusal with an ordinary refusal or success.

The correction adds a closure-local terminal-failure boolean owned by each invocation of `install`. An initial scheduling/marker exception sets it before propagating to the existing failure path. A poll exception sets it before invoking existing failure handling. Every poll checks that boolean before any trace, host/property access, validation, binding, file activity or rescheduling. It remains true independently of any later global trace identity. No Task cancellation API or additional host capability is required.

The healthy scheduling order, trace schema/counters and existing failure path remain unchanged. No source descriptor, class/numeric admission, setter/message, timeout, capacity, retry count or polling interval changed.

## RED And GREEN

The new regression matrix explicitly executes callbacks already queued when their trace marker fails:

- Initial and recurring sink failures, each with strict-refusal and otherwise successful real-bind fixtures.
- Each sink case both with its original global trace state and after another install starts, replacing the global trace identity while leaving the stale callback at the front of the queue.
- Initial record-bound refusal at the reserved terminal marker, again with both strict-refusal and successful-bind fixtures.

All ten cases snapshot target/property/geometry activity, capability-call order, helper activity, File construction, schedule history and exact ACK/journal/trace bytes after refusal. They then drain the old callback, or run it once ahead of a newly queued install callback, and require no change and the expected remaining queue. The valid-bind cases exercise the path that previously changed a failed installation into success. The bound cases prove that the same latch covers explicit instrumentation-limit refusal.

Before the production correction, the complete Node suite reached the new assertion and printed:

```json
{"scheduledFailureCases":10,"casesWithPostFailureActivity":10,"casesWithChangedAck":6,"casesWithUnexpectedQueue":4}
```

After the correction, the complete suite exits0 and prints:

```json
{"scheduledFailureCases":10,"casesWithPostFailureActivity":0,"casesWithChangedAck":0,"casesWithUnexpectedQueue":0}
```

All prior tests remain GREEN: trace identity/path/bounds, durable partial observations, direct host-return markers, capability result/exception preservation, original refusal context, settling success, callback-cost timing and all005 P1/P2 direct/serialized controls. The twelve identity and eight geometry invalid cases still have zero calls and zero direct/serialized observations. The healthy 80-poll trace remains exactly 1740 records, 644956 bytes, maximum947 bytes per record and 420 original capability calls. The 70-poll trace remains1710 records. The runner's ten-second ACK wait, 100ms scheduling, 70/80 attempt bounds and settling criteria remain unchanged.

Verification commands all exit0:

```text
node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
```

These tests exercise the real controller in the existing synthetic Max/File/Task environment. Virtual callback invocation and its test clock can advance after refusal; the callback itself performs no additional measured activity. No live runtime or target behavior is claimed.

## Frozen Scope And Bindings

Read-only comparison against all sixteen files in the exact initial006 archive finds only the authorized two differences. The other fourteen files and frozen score remain byte-identical. The initial006 report still hashes to `5e0a7e17b1b0322abdd6a0c14d251ee35914de149d389b469dcdf78aa05049eb`.

| Binding | SHA256 |
| --- | --- |
| `controller.js` | `c0b0a45ef7a72a484fa976774f5a10e1ca9fcf6892603f723fb7df6c220a3d97` |
| `test_helpers.cjs` | `e266842aeef514da31f4528ad4d141605f3f3b7fcb5e966e0d070d00a44b0631` |
| Two-file map | `682004a9bc4235e82b2c6390eb3976ee949650c54ffba53f08b171add62d2dd0` |
| Current ten-file package | `b140eddbac9d134e162ff4cfdf2388be1285cf45b9127bd8bcc0d253ff0e99e5` |
| Current sixteen-file map | `c6132cd1dc86becaad8b129a41dfe9a8bf778edc95bc6351f917e7fcabcefc9c` |
| Frozen score | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |

Map bindings use canonical sorted filename/SHA256 JSON with compact separators. The ten-file package uses the unchanged `PACKAGE_FILES` list. These are frozen code bindings, not a preparation or capture identity.

No preparation, launch, commit or delegation occurred. No private evidence, licensed source body/vector, creation operand or numeric value/default is reproduced or changed. Parent owns scoped re-review, combined verification and any fresh preparation/capture. Capture005's timeout cause and actual plus behavior remain unresolved; no class admission, numeric/V8 inference, runtime parity, silence, saved-order or qualification claim follows from this fix.
