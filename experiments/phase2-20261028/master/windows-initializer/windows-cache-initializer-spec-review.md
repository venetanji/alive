# Windows cache-initializer source specification review

Verdict: **Changes requested** for the reliability of early-failure evidence. Reviewed candidate `d79f2281d3c57877127ee06efe58826fe7e0afb1` against base `da7c6fb30c14a42502461a2ef2f4297b075b34ec` and the frozen two-file diff.

## Finding

- **P2: The reported Windows error may not belong to the failing lookup.** At `d79f228:apps/ultra/src-tauri/src/session/native_master.rs:149` and `d79f228:apps/ultra/src-tauri/src/session/native_master.rs:164`, `diagnostic!` checks the sentinel with `var_os` before evaluating `last_os_error()`. That intervening Windows operation can change the thread's last-error value, so an initializer lookup failure can be attributed to an unrelated error. The combined failure-or-null branch can also report a stale error if the API succeeds but returns a null handle. Smallest correction: capture the API return and, on API failure, capture `last_os_error()` immediately before any sentinel check or other operation; report a distinct null-handle stage without claiming an API error. Apply this to both lookups.

## Conformance and limits

The test path calls `master_capability` before the separate helper/direct diagnostics, and instruments the actual closure's anchor, its single resolver attempt, failure stages, result and cached return. `OnceLock::get()` cannot distinguish uninitialized from initialization in progress; the logged thread and ordering help, but an already initialized cache does not identify its caller. Symbol lookup, owner and exact-anchor checks, limits checks and retained module ownership match the base logic on static inspection. The selected non-test bodies remain unchanged, instrumentation is Windows/test gated, and new logging is sentinel gated. No guessed link or thunk correction is introduced.

The prior real Windows child resolved both measured anchors successfully while the cached capability was false; the helper address was not the initializer address. This diagnostic is intended to observe that missing path, not establish its prior behavior. Instrumentation changes code generation, allocation and timing; a subsequent pass or failure alone establishes neither cause nor a production fix. Source review does not establish Windows compilation or execution. No tests, builds, runtime workloads, cloud actions, source or ref changes were performed for this review. Independent quality review and a staged Windows run remain necessary.
