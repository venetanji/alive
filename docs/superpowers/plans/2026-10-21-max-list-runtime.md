# Max List Runtime Implementation Plan

**Goal:** Continue reimplementing all Max objects so that all installed help
files work. This work adds ten list-processing objects; it does not redefine
the complete-help requirement around those ten objects.

**Architecture:** Extend Ultra's existing native typed-message executor, Rust
document validation, authoring registry and Max importer. Preserve existing
kind IDs and saved documents. Read installed reference data and capture
original finite scores in an owned, private Max session before resolving
ambiguous bang, selector, storage and ordering behavior.

**Global constraints:** Preserve the existing dirty worktree; no commits or
proprietary asset copies. Preserve the current native ABI and bounded real-time
execution. Retain current message capacity while reporting excess explicitly;
eight-atom tests are not evidence of Max's larger capacities. Unknown execution
features remain visible. Full help conformance requires every patcher, message,
script/dependency, UI interaction and signal path, beyond admitting object names.

## Shared Contract

Append native kinds 28..37: `Iter`, `Prepend`, `Append`, `ZlReg`, `ZlJoin`,
`ZlLen`, `ZlIter`, `ZlSlice`, `ZlRev`, `ZlRot`. Document keys are `iter`,
`prepend`, `append`, `zl_reg`, `zl_join`, `zl_len`, `zl_iter`, `zl_slice`,
`zl_rev`, `zl_rot`. Text authoring uses `zl.<mode>` and equivalent `zl <mode>`.

`prepend`, `append`, `zl.reg` and `zl.join` accept initially empty `args`.
Bare `prepend` passes messages through; `prepend list` explicitly constructs
lists. Other list modes have no text configuration. Max runtime scores establish
that `zl.iter` and `zl.slice` default to integer `size=0` in 0..100000:
zero iterator size emits nothing; zero slice size emits the whole right tail.
`zl.rot` has integer `rotation=0` in
-100000..100000. These numeric parameters occupy p0 and are live. All other
numeric slots are zero. Every zl mode retains two inputs and two outputs,
including inactive ports. The other three kinds have one input and output.

## Tasks

- [x] Capture original ordered, typed Max scores and document unresolved cases.
  Owned files: `experiments/max-reference/list-runtime-20261021/`.
- [x] Test then implement native state, list conversion, cold storage, ordering,
  iteration, recall and atomic capacity refusal. Owned files:
  `native/patch_graph.hpp`, list helper header, `tests/canvas_list_objects_test.cpp`.
- [x] Test then implement registry/parser, importer, original examples and
  runnable help. Owned files: `ui/canvas-model.mjs`, `ui/canvas-catalog.mjs`,
  `ui/canvas-max-import.mjs`, example module/files and list authoring tests.
- [x] Test then implement Rust kind IDs, parameters, text validation and port
  validation in `src-tauri/src/canvas.rs` and `canvas_tests.rs`.
- [x] Integrate tests into CI; compare native emitted traces against Max scores;
  exercise native IPC, stopped/audio-on runtime and examples. Resolve any
  differences rather than changing the oracle to fit the implementation.
- [x] Build the release and update protocol/help coverage records, separating
  object admission, original trace comparisons and whole-help execution.

## Verification Commands

Run focused Rust canvas tests with `ULTRA_NATIVE_LIB_DIR` pointing at the built
native library. Compile the list runtime tests with C++17, warnings as errors,
then rerun the existing native graph/workspace tests. Run canvas JavaScript
tests and the existing browser suite after integration. Use the private
desktop harness for real Tauri/WebKit IPC and audio evidence; keep the user's
desktop and open documents untouched.

## Completion Evidence

- `node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs`:
  193 passing tests, `/tmp/ultra-list-js-final.log`.
- Full Playwright suite: 68 passing tests, `/tmp/ultra-list-browser-final.log`.
  The new list test authors all ten types, including legacy `zl rot` spelling,
  checks saved topology and opens runnable help in an independent window.
- Importer regression reproduced and corrected reserved-method acceptance on
  cold zl inlets. The existing hot-inlet refusal and ordinary data/reset paths
  remain covered.

- `bash apps/ultra/build.sh`: release succeeds,
  `/tmp/ultra-list-build-final.log`.
- Full Rust suite: 54 pass, one software-audio probe intentionally ignored by
  the default suite, `/tmp/ultra-list-rust-all-final.log`. Actual CPAL operation
  is checked separately in the private desktop run.
- Compiled native adapter checks and external-audio/document-runtime/document-
  audio tests pass, `/tmp/ultra-list-native-abi-final.log`.
- Independent native review found nonfatal list refusals stalled `line` grains
  and completion. The regression now checks two ticks at frames 0/48 and one
  completion, while retaining source-linked refusal diagnostics.
- Native list tests include the measured `zl.iter` feedback topology: cold
  edits arrive on every chunk, while the active burst and next bang preserve
  the original chunk size.

- Contracts suite passes with the repository's pinned Python requirements:
  `uv run --no-project --with-requirements apps/ultra/tests/ci/requirements.txt bash apps/ultra/tests/ci/check-contracts.sh`.
  This includes all native graph/object/workspace suites and evidence integrity.
  The first bare-shell attempt stopped at the existing schema check because
  `jsonschema` was absent; the pinned run executes that check and its tests.
  Final log: `/tmp/ultra-list-contracts-final.log`.
- Final native replay matches 714/714 recorded inputs. Two recorded feedback
  cases are explicitly outside the single-target runner; the dedicated native
  topology test covers their measured size-restoration effect separately.
  `experiments/max-reference/list-runtime-20261021/comparison.json` records
  frozen source identities, exclusions and atom-tag limits.
- Private native desktop runner succeeds against the rebuilt release:
  `bash apps/ultra/tests/check_canvas_desktop.sh --software-audio /tmp/ultra-max-list-desktop`.
  `result.json` and `documents-result.json` in that directory record actual
  WebKit/Rust IPC, OS picker/save/close actions, separate help windows, named
  cross-document messages, ten list kinds with audio off/on and shared CPAL
  audio with independent document Stop. The slider basic-tab import remains
  explicitly partial.
- Whitespace validation: `git diff --check` passes.

The ten new targets occur 1,028 times across 302 installed help files. These
weights do not establish any complete-help execution. All 2,103 installed help
files still require end-to-end qualification; the overall all-objects/all-help
goal remains active. The implementation retains eight-atom list storage and
explicitly refuses unsupported mode, capacity and fuzzy methods.
