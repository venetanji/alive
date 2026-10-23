# Independent root-proof diagnostic review

2026-10-22. Verdict: **REQUEST CHANGES** for the two diagnostic-only issues below. Reviewed the capture009 independent audit, diagnostic implementation report, actual source diff, and focused synthetic tests. No implementation, preparation, runtime, or product changes were made. No licensed graph, actual private configuration dictionary, original box text, or private runtime log is reproduced.

## Source bindings

Paths are relative to `experiments/max-reference/int-float-runtime-20261022/`.

| Source | SHA-256 |
| --- | --- |
| v8-readback.js | `1bf424ed0c9d236a8ffef69639e06361f95d6d633821a8f7f693552bde10c8d0` |
| test_lifecycle.cjs | `eff1243d8582456bf98d1d75fde488cbb8afcb47982d7d8cb94683441e0e66e8` |
| Baseline v8-readback.js | `99f9ab7e4462149db4f1be26fe8827f03fbe52ddcf5ae79c325c3dee1dac817a` |

## Findings

1. **P1: An original object can be read as harness text after a name collision.** `v8-readback.js:225` permits box-text and validity reads solely from the typed varname. When an original synthetic comment's varname is changed to `__alive_numeric_freebang`, proof collection refuses its wrong class, but the diagnostic scan then reads the original comment's boxtext. This violates the explicit no-original-boxtext rule on exactly a refused classification path. The existing test's original-text getter catches the read if this mutation is added. Require the actual expected harness name and class before extra reads, and reject truncated classification fields. Keep geometry independently diagnostic so a wrong harness height remains visible. The successful proof predicates need no change.

2. **P2: The diagnostic-exception fallback bypasses the complete-record byte cap.** `v8-readback.js:251` budgets the normal diagnostic record, but `v8-readback.js:256` installs a replacement containing the original and diagnostic exceptions without applying that budget. Both exceptions can legally be arrays of 16 strings, each string containing 256 non-ASCII characters. A synthetic geometry getter throwing such an array, together with a diagnostic helper throwing another such array, produces a failure record estimated at **51,009 ASCII JSON bytes**. That exceeds both the stated 24,000-byte cap and the observed 32 KiB single-line boundary. The record remains `success:false`, but its intended private diagnosis can again become unreadable. Apply a guaranteed bounded representation or a final complete-record budget to fallback exceptions as well, without promoting any failure into success.

## Reproduction

The following uses only shipped synthetic fixtures. Execute in the package directory; the VM context runs the existing test file and exposes its test helper without editing it:

```javascript
const fs = require('fs'), vm = require('vm');
const context = { require, __dirname: process.cwd(), console: { log() {} } };
vm.createContext(context);
vm.runInContext(
  fs.readFileSync('test_lifecycle.cjs', 'utf8') +
  '\nglobalThis.reviewRootDiagnostic=rootDiagnostic;', context
);

// Throws the fixture assertion: diagnostics cannot inspect original box text.
context.reviewRootDiagnostic(({ boxes }) => {
  boxes[0].varname = '__alive_numeric_freebang';
});
```

Run the second probe separately after exposing the same helper:

```javascript
const failure = context.reviewRootDiagnostic(({ boxes, reader }) => {
  const large = Array(16).fill('\u4e00'.repeat(256));
  boxes[3].getboxattr = () => { throw large; };
  reader.lifecycleFailureDiagnostics = () => { throw large; };
});
const bytes = JSON.stringify(failure)
  .replace(/[\u007f-\uffff]/g, '\\u0000').length;
console.log(bytes, failure.success); // 51009 false
```

## Checks that passed

- Fresh lifecycle, close, readback, and transport Node suites pass, as does `node --check v8-readback.js`.
- Removing only the optional progress parameter and exact progress-stage assignment lines from the revised `collectLifecycleProof` makes its complete function text byte-identical to the historical baseline. Its predicates, exact expected root geometry/text, original inventory, duplicate checks, routes, and success return are therefore unchanged.
- Normal failures retain typed stage/error observations, including all five falsy thrown values; getter and scan exceptions stay explicit. Normal diagnostics bound object count to 16, strings to 256 characters, arrays to 16 items and one depth, and omit trailing objects when the normal record exceeds its budget.
- Failure reports retain the configured private destination and `success:false`, request ID, and refusal code, without successful proof fields. A transient proof-write failure refuses. Setup failures before resolving the destination remain refusals, as explicitly scoped by the parent; no fallback or success repair is added.
- Capture009 provides no identified root-proof predicate cause. This change introduces no construction or geometry/text adaptation, manual injection, or route challenge.

End-of-review hash verification confirms both reviewed final source hashes remain unchanged at the bindings above. A corrected frozen version needs focused re-review before another controlled capture.

## Final re-review, 2026-10-22

**PASS. Both focused findings are resolved; no remaining finding in the reviewed diagnostic delta.** This supersedes the earlier REQUEST CHANGES for the corrected sources bound here.

| Final source | SHA-256 |
| --- | --- |
| v8-readback.js | `3ee0796804a9ec8c9274e85e75fe8e7f1849f9a0b940cdfe3c47404d05589704` |
| test_lifecycle.cjs | `8dca56b77fe79da4cf46c1e5a60b7a0374db6bc7f232907ca1c03e0902947abf` |

The actual diagnostic classifier now requires an own member of the harness name map, its exact expected class, successful primitive string reads for both fields, and no truncation of either classifier. The original-comment name-collision probe now refuses without touching original text or validity. Geometry remains an independent observation: the wrong-height harness probe still records height 50 and the actual harness text while the unchanged proof refuses.

The fallback now renders both exceptions in compact mode, preserving primitive types/values and bounding error name/message strings while summarizing array type/length/truncation with no items. The original two-large-Unicode-array reproducer now emits a **325-byte** ASCII JSON failure instead of 51,009 bytes. Additional independent probes combine each falsy exception, a large Unicode string, and a large Unicode array with long Unicode name/message fields against a large diagnostic exception. All seven remain `success:false`, omit success proof fields, and fit the complete-record cap; the largest observed record is **6,609 bytes**. The source's compact representation bounds both exceptions independently of the failed diagnostic scan, including when the normal diagnostic budgeting itself throws.

Fresh lifecycle, close, readback, and transport suites and reader syntax checks pass. Repeated the complete-function comparison against the historical reader: removing only the optional progress parameter and progress-stage assignment lines leaves `collectLifecycleProof` byte-identical to baseline, including every success predicate and the return object.

No source edit, preparation, or runtime launch was performed during this re-review. This verdict covers bounded private refusal diagnostics and preservation of the existing proof gates; it does not establish capture009's predicate cause or installed runtime close behavior. Final hash verification confirms both corrected sources remain unchanged at the bindings above.
