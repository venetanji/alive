# Windows Master anchor source/spec review

Candidate `3212065c4b47c068c69e60e8f7a098966f65be4f` against `58057f980afd3365e106433c7102cfc19450c130`.

## Findings

No source/spec findings requiring a patch change. Source approval is limited to this two-file candidate; it is not Windows runtime or package qualification.

## Assessment

- `apps/ultra/src-tauri/src/session/native.rs:172`: the Windows-only link attribute is confined to the existing anchor declaration. The remaining declarations and non-Windows attributes and resolver paths are unchanged. The change is a plausible linkage hypothesis, not proof of the generated address or a confirmed fix.
- `apps/ultra/src-tauri/src/session/native_master.rs:203`: the fresh child calls the cached capability before helper diagnostics; line 204 checks that a second result has the same availability, and line 208 checks the expected availability. The Windows test build uses instrumented cache and resolver implementations, so this is evidence about that build, not an uninstrumented production binary. The repeat check compares availability, not capability identity, and has not yet been run for this candidate.
- The resolver still requires exact anchor/export equality, verifies each symbol belongs to the anchor module, balances acquired module references, resolves all six optional symbols and validates limits (`native_master.rs:55`, `:118`). Missing or partial optional ABI remains fail-closed, and no arbitrary DLL search fallback is introduced. This is source inspection, not proof of Windows fixture behavior.

## Evidence and limits

The retained Windows run on the base compiled, then failed its release test suite (275 passed, 9 failed, 4 ignored). In its fresh instrumented child the empty-cache initializer used an executable-owned address, whose anchor export was missing; later helper/direct addresses belonged to the real DLL, equaled its anchor export, and passed all six symbol ownership and limits checks. The trace does not establish instruction bytes, an import thunk, or the cause in earlier uninstrumented code; instrumentation can affect code generation and timing.

Candidate Windows compilation and fresh-child positive execution remain unverified. A Windows release rerun must establish first and second cached success with the staged real DLL and observe the initializer's anchor/export and ownership/limits checks. A passing instrumented test alone does not establish the production binary's generated behavior; package/staging checks are also required. Existing Linux ELF negative fixtures do not establish Windows negative coverage. The proposed separate Windows resolver fixture packet for old/partial exports, forwarded ownership, and invalid limits is not implemented; resolver-only fixtures would not prove production cached-path negatives. These are qualification gaps, not findings of a new source defect in this patch.

Reviewed the canonical candidate diff, both candidate files, producer report and retained runner report/log. `git diff --check` for the exact commit pair passed. No build, tests, native execution, GUI, audio or cloud action was performed in this review.
