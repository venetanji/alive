# Independent startup diagnostic review

2026-10-22. Scope: the diagnostic-only startup correction before capture008, compared directly with `/home/venetanji/.cache/alive-ultra-evidence/int-float-package-007-historical`. Read the implementation report and reviewed the actual five-file delta. No preparation, runtime launch, implementation edit, licensed graph body, private configuration dictionary, or runtime log was used or reproduced.

## Frozen sources

Paths are relative to `experiments/max-reference/int-float-runtime-20261022/`.

| Source | SHA-256 |
| --- | --- |
| controller.js | `dd98f2c01afb095aeb2c87ff8301a4531a5590ab65e23e81f079fc936024507e` |
| lifecycle-observer.js | `21d4efb26ad9001bf493679de927a08a447beef0aabe893766848804fa55ccac` |
| test_controller.cjs | `b1d558fdb5442a4a56b25526a3dd351176f413cdfcbc240492654e9d0c3474c8` |
| test_lifecycle.cjs | `cef2047a95f48ed699e9bd84b32157bb7d9c08b7cd0fee9fe456a15141d6c02f` |
| lifecycle-fixture.cjs | `716028c3e196eaee626c37b5d7bcf17b1111f9c254d048383ceb4765269fa4a6` |

## Finding

**P1: A falsy bootstrap exception lets the failure-only global argument fallback authorize a successful proof.** `lifecycle-observer.js:4` initializes `bootstrapError` to null, `lifecycle-observer.js:6` stores the thrown value, and `lifecycle-observer.js:147` and `lifecycle-observer.js:160` use its truthiness as the failure flag. JavaScript permits `throw null`, `throw undefined`, `throw false`, `throw 0`, and `throw ''`. In each case, a successful lexical-global argument lookup repairs the config path while the later truthiness test treats bootstrap as successful. An otherwise valid synthetic driver then emits `driver_route_proof` and `observer_report`, rather than a bootstrap `success:false` report. This violates the explicit requirement that global `jsarguments` only locate a failure destination and never repair successful runtime binding. The existing lexical-global fixture covers a truthy TypeError but misses all five falsy exceptions.

Minimal correction: keep an explicit `bootstrapFailed` boolean independent of the original exception value, set it in the catch, and use it at both refusal gates. Preserve the original thrown value for the typed error. Add all five falsy cases to the bootstrap fixture and require `success:false`, bootstrap stage, the exact primitive exception type/value, and no success proof fields.

## Reproduction

Executed from the package directory with synthetic in-memory Max APIs:

```javascript
const fs = require('fs'), vm = require('vm');
const create = require('./lifecycle-fixture.cjs');
for (const primitive of ['null', 'undefined', 'false', '0', '""']) {
  const fixture = create();
  const ctx = vm.createContext({
    File: fixture.ctx.File, inlet: 0, patcher: fixture.ctx.patcher
  });
  vm.runInContext(
    'let jsarguments=["v8","synthetic-config"];' +
    'Object.defineProperty(this,"jsarguments",{get(){throw ' + primitive + ';}});',
    ctx
  );
  vm.runInContext(fs.readFileSync('lifecycle-observer.js', 'utf8'), ctx);
  ctx.lifecyclecontrol('attest', -1, 0, 'startup');
  const report = JSON.parse(fixture.files['synthetic-report']);
  console.log(primitive, report.success === false ? 'FAILURE' : 'SUCCESS_PROOF');
}
```

Observed result: `SUCCESS_PROOF` for all five thrown values. No installed runtime behavior or capture007 root cause is inferred from this synthetic result.

## Checks and limits

- Fresh `node test_controller.cjs`, `node test_lifecycle.cjs`, and syntax checks for both JavaScript helpers passed. These existing successes do not cover the finding.
- The controller now retains typed private startup refusals with config/geometry/observer/startup stages and zero owner opens. Missing, stale, unreadable, explicit-failure, and dispatch-throw observer reports refuse. Explicit failures preserve diagnostics even when their epoch is unavailable. Fallback filenames require the exact `config.json` path component.
- V8 proof and persistence failures retain a separate `success:false` report containing actual readonly driver observations, bounded to 32 objects and 16 array elements. Once `failureDiagnostic` exists it is sticky and success proof fields are absent. A persistent destination failure continues to refuse through the controller boundary.
- Direct baseline diffs preserve the normal success report structure, actual class/text/geometry/topology predicates, five-inlet guard and IIFE, automatic lifecycle event policy, and existing close state machine. The changed code introduces no manual lifecycle injection, new route, admission challenge, or geometry adaptation. This review stays within the five-file diagnostic delta; broader offline checks remain with the parent.

## Verdict

REQUEST CHANGES for the explicit bootstrap failure flag before capture008. The diagnostic additions otherwise preserve strict refusal and existing successful behavior within this focused review.

End-of-review verification confirms all five source hashes remain identical to the frozen bindings above.

## Final re-review, 2026-10-22

**PASS. The bootstrap finding is resolved; no remaining finding in this focused diagnostic delta.** This supersedes the earlier REQUEST CHANGES for the revised sources bound here.

| Final source | SHA-256 |
| --- | --- |
| controller.js | `dd98f2c01afb095aeb2c87ff8301a4531a5590ab65e23e81f079fc936024507e` |
| lifecycle-observer.js | `97e549c5a3b439fdf245cf9a578cb07e4b525f6492f8b103fa4df6363bb307d6` |
| test_controller.cjs | `b1d558fdb5442a4a56b25526a3dd351176f413cdfcbc240492654e9d0c3474c8` |
| test_lifecycle.cjs | `f86c0500f20e1005769cc1f9d031d6bb91e96f5049584d8a3701f5414cde142c` |
| lifecycle-fixture.cjs | `38b25fb8b36e111134aed6676c3425d0fcc41eff058aec703f35cdf35ab93eaf` |

The actual observer source now initializes `bootstrapFailed` independently of `bootstrapError`, sets the flag on every bootstrap catch, and checks it at both the persistence and guarded control boundaries. Falsy exception values therefore remain available for exact typed diagnostics while always selecting refusal. The successful proof path cannot use the global argument fallback to repair a failed bootstrap.

The revised fixture installs the throwing property inside the VM context and preserves a separate lexical-global argument binding. The added tests cover null, undefined, false, zero, and empty-string exceptions; each requires the exact typed exception, no success proof fields, bootstrap stage, and sticky refusal.

Fresh `node test_controller.cjs`, `node test_lifecycle.cjs`, and both helper syntax checks pass. Independently reran the original five-case reproducer without relying on the new fixture option, then repeated each control with a fresh request. Every case produced `success:false`, bootstrap diagnostics, no driver/observer success proof, and continued refusal.

No implementation or preparation edits and no runtime launch occurred during re-review. This is an offline diagnostic-control-flow verdict, with no capture007 root-cause or installed runtime capability claim. Final hash verification confirms all five final sources remain unchanged at the bindings above.
