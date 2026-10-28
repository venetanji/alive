# Windows anchor diagnostic specification review

Reviewed the supplied two-file diff from `d025c91a7b8341ad1ca4525b265cdc7ed147bd79..9c599fac6825c7242450f068762e20b269e206f1`, the Windows diagnosis and correction brief/report, and the immutable baseline resolver for the named failure-stage risk. The requested `task-reviewer-prompt.md` was not present under `.superpowers`; review follows the bounded method stated in the brief.

## Finding

- **P2 — Direct resolver result is omitted on an anchor-module failure** (`apps/ultra/src-tauri/src/session/native_master.rs:154`). The diagnostic returns immediately after reporting `stage=anchor_module`, before the `direct_resolve` output at line 191. This contradicts the correction report's promised direct resolver result for both declarations precisely on a relevant failure branch. The production cached result still prints later, but the direct declaration's actual resolver result does not. Report `resolve(anchor).is_some()` on this branch as well, while retaining the failure stage and leaving the production resolver unchanged. A null anchor also bypasses the Windows call, so the printed last OS error in that case is not necessarily related to the failure.

## Source verdict

Apart from that evidence-output gap, the scoped diff uses the production declaration for its test accessor and calls the actual cached `native::master_capability()` in the child process. The diagnostic follows the existing Windows resolver's anchor, same-owner symbol and exact limits checks, and the original test remains intact. The changes are test-only; no production resolver, ABI or callback behavior is changed. The expected-positive assertion is intended to reproduce the known failure and is not a claim of a fix. The test's fresh-process guarantee assumes `ALIVE_MASTER_DIAGNOSTIC_CHILD` is not already set in the invoking environment.

## Windows evidence still required

The Windows-only code has not been compiled or run in this review. Run the staged Windows release build and the exact diagnostic command recorded in `master-cloud-correction-report.md`, with the child sentinel unset, retaining stdout and stderr even if the expected-positive assertion fails. Inspect the two anchors, module paths, exports, stages, owners, limits and expectation environment together; if the production pointer lies in the executable, inspect its imports/disassembly. Actual Windows output is needed to identify the failing check and assess whether the thunk hypothesis holds. A diagnostic run alone is neither a Windows fix nor final acceptance; correction, positive and old/partial-library negative fixtures, the full Windows suite and final staged checks remain pending. No tests, builds or runtime processes were run for this review.
