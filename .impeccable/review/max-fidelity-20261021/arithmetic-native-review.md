# Independent native and Rust arithmetic review

Reviewed on 2026-10-22 in a fresh delegated context, after the scalar arithmetic
implementation. Scope: arithmetic descriptors and control runtime in
`canvas_message.hpp` and `patch_graph.hpp`, Rust schema/live admission in
`canvas.rs`, the arithmetic production-header test, and shared root/child
history coverage. The historical contract map is a proposal; frozen original
receipts and the current design determine the implemented behavior.

## Findings

- Fixed P2: the new arithmetic history test reused native document slot 14,
  already owned by the cable history test. Native close deliberately retains
  the admitted revision; the next test created a fresh Rust CanvasState and
  proposed revision 1, which native admission correctly rejected. The first
  failure then poisoned the test mutex and produced six secondary failures in
  the full suite. Changed only the arithmetic test to unused slot 15 and added
  a lifecycle comment in `apps/ultra/src-tauri/src/document_commands_tests.rs:21`.
  No production revision guard or close behavior changed.
- No additional blocking native or Rust findings were found within this scope.
  This is a bounded code review and replay result, not whole-class or installed
  help qualification.

## Review conclusions

- Existing IDs remain stable; the appended IDs are subtract=54, divide=55,
  modulo=56, reverse_subtract=57, reverse_divide=58, abs=59. The production-header
  test asserts existing/appended IDs and POD sizes (node 192, graph 7184,
  message 392 bytes).
- Native and Rust admission agree on numericmode: 0 is limited to legacy
  Add/Multiply; new kinds accept 1/2; fractional authored integer rhs rejects;
  abs has no rhs parameter and requires unused native p0 to be zero. Legacy
  rhs-only Add/Multiply documents retain mode 0 and rhs defaults 0/1.
- Numericmode cannot reach live parameter mutation. Mode changes instead
  install a new runtime revision; rhs changes use the existing cold live path.
  The shared owner test verifies root/child descriptors, Undo/Redo, retained
  hot state for rhs edits, stale-revision rejection after mode changes, and
  independent node state across cold edits versus structural reinstalls.
- Modern arithmetic emits explicit integer/float tags, including integral
  floating results. Legacy arithmetic retains its former output behavior.
  Integer coercion and zero normalization avoid integer division/modulo UB.
- Floating divide/modulo zero and other results outside the existing finite
  control envelope refuse locally with an arithmetic error receipt. Tests
  verify no output, no graph failure, retained previous displayed result, and
  recovery from retained operands after a subsequent cold update.

## Fresh verification

Before the fix, ran the six document-command tests with one test thread. The
arithmetic test passed, cable admission failed at its initial installation,
and the remaining four tests failed on the poisoned mutex. This reproduces the
first failure in `results/rust-full.log`; source inspection established the
shared slot and the intentional revision guard in `backend.cpp:471`.

After changing only the arithmetic test's slot:

| Check | Actual result | Evidence |
| --- | --- | --- |
| `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --locked` | 113 passed, 0 failed, 2 ignored; 115 total | `experiments/max-reference/arithmetic-verification-20261022/results/rust-full-green.log` |
| Fresh C++17 arithmetic production-header build with `-Wall -Wextra -Werror -fsanitize=undefined -fno-sanitize-recover=all`, then all descriptor/legacy/runtime/bounds groups | Exit 0; arithmetic contracts passed; no UBSan diagnostics | `experiments/max-reference/arithmetic-verification-20261022/results/native-review-ubsan.log` |
| `python experiments/max-reference/arithmetic-runtime-20261022/compare-native.py --binary experiments/max-reference/arithmetic-verification-20261022/results/arithmetic-native-review-ubsan` | 287 compared passes, 4 explicit local refusals, 9 excluded exponent-creation deliveries; 0 failures | `experiments/max-reference/arithmetic-verification-20261022/results/native-review-replay.log` |

Rust used the workspace's pinned Rust/Cargo directories and the existing
`apps/ultra/build/libultra_native.so` via ULTRA_NATIVE_LIB_DIR and
LD_LIBRARY_PATH. The two ignored Rust tests require a private PipeWire graph
or read the licensed local Max installation. Neither was enabled. This review
did not launch Max, generate images, rebuild the shared library, or modify
desktop/UI code.

## Remaining limits

- The original score contains 300 deliveries and 218 typed receipts. Nine
  deliveries use deliberately unsupported exponent creation. Four original
  floating zero-divisor receipts are nonfinite and receive explicit local
  refusals. Neither category counts as a parity pass.
- Bare reverse-divide's numerator default remains a metadata/design default
  of 1; this frozen score does not distinguish it. Do not report the default
  as directly established by these runtime receipts.
- Runtime comparison uses exact selector and negative-zero checks with numeric
  tolerance 1e-13. It does not qualify values outside the existing bounded
  control profile or qualify installed help patches.
- Locked release/browser/desktop validation belongs to the coordinating agent
  and is not asserted by this report.
