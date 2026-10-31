# Task 2 Fix Round 2 Scoped Re-Review

## Finding Verdict

**Ordinary cold hints can overwrite an active token's native preview -- ADDRESSED.**

`apps/ultra/src-tauri/src/document_commands.rs:105` now checks the authoritative owner's active gesture records for the exact numeric target node/key before `parameter_matches`, hot-event validation, or the native parameter setter. A matching active gesture causes refusal regardless of the caller-supplied hot flag. The check uses the existing `parameter_previews()` accessor over owner gesture state rather than the serialized descriptor field. An unchanged canonical patch with an ordinary cold hint therefore no longer bypasses ownership.

The matching-graph fast return still requires the absence of a numeric hint (`apps/ultra/src-tauri/src/document_commands.rs:101`), so a legitimate token-qualified baseline-return commit continues through reconciliation. The already-reviewed token finalization removes its validated gesture before canonical admission and restores it on failure; the new exact-target guard therefore permits that finalization while protecting other active targets. Explicit cancellation and owner settlement retain their existing authorization paths.

The new real-native linked-view regression at `apps/ultra/src-tauri/src/document_parameter_gestures.rs:70` exercises the ordinary commit/admission core used by `document_commit`. It checks that an unchanged-patch cold hint from the linked view is refused, the authoritative descriptor/history/token remain unchanged, no output occurs on refusal, and native RHS still evaluates as the accepted 0.4 preview. It then verifies legitimate owner commit and cancel each restore 0.65 and preserve the runtime revision. This tests actual native behavior in addition to descriptor state.

## New Breakage In The Fix Diff

None found. The two-file fix adds an exact-target owner check and its native regression without changing UI, schemas, IPC fields, source identity, hot classification, or installation behavior. The previously addressed three findings remain closed.

## Evidence And Scope

- Reviewed the supplied fix diff once, from `0c98d72de3c3e25c2363c151de40fbf02addce83` to `1b6cb68b2e379eaaa3fa87f5bca2741a180283db`, and the appended Fix Round 2 report. No unchanged source was reread or additional review scope opened.
- Inspected `/tmp/alive-presentation-task2/fix2-native-red.log`: the new regression fails before the guard with `ordinary unchanged-patch cold hint bypassed the active gesture token` (**0 passed, 1 failed**).
- Inspected `/tmp/alive-presentation-task2/fix2-native-green.log`: the linked-view regression passes after the guard (**1 passed, 0 failed**).
- Inspected `/tmp/alive-presentation-task2/fix2-native-affected.log`: **15 passed, 0 failed, 0 ignored**, with 286 unrelated tests filtered out. The passing set includes baseline-return reconciliation, unchanged-preview/changed-final hot behavior, cancellation, held audio, detached settlement, shared admission/history, metadata, and retirement protections.
- No suites or builds rerun. No source, git/index/HEAD, native tree, installation, desktop, or publication changes; no helper agents. Only this requested report was written.

## Out-of-Scope Observations

None newly identified. The two previously disclosed Rust warnings remain in the retained output and are outside this focused ownership fix.

## Verdict

**Fix round: All findings addressed, no new Critical/Important breakage.**

**Task 2 combined gate: Approved.** The three original Important findings and the subsequent cold-hint ownership regression are addressed. Later authoring/native-delivery and installation/publication qualifications remain separate from this task-scoped gate.
