# Scalar arithmetic implementation plan

Design: `docs/superpowers/specs/2026-10-22-max-scalar-arithmetic-design.md`.
Use existing user authorization; preserve all unrelated work and do not commit.

1. Freeze the original Max oracle in its owned experiment directory. Use typed
   JSONL receipts, small original fixtures and a private prefix/display; retain
   source/preference digests and exact process cleanup. Resolve disputed methods
   and zero divisors before completing runtime semantics.
2. In native `canvas_message.hpp`/`patch_graph.hpp`, append the six kinds and add
   numericmode validation/admission. Add a focused production-header test, watch
   expected failures, then implement observed coercion/state/output. Preserve
   IDs, ABI, legacy arithmetic and global envelope. Keep any oracle mismatch
   explicit and block a compatibility claim.
3. In `src-tauri/src/canvas.rs`, add matching kinds/ports/parameters and cross-
   field validation; numericmode is structural, rhs is live. Extend Rust tests
   for old patches, all modes, unsupported live changes and shared document
   root/child history. Native/Rust work has one owner to avoid overlap.
4. In UI model/catalog/import/controller/view modules, preserve lexical creation
   mode and whole floating text, legacy spellings/defaults, mode fingerprints,
   structural parameter/history handling and lock behavior. Extend existing
   unit/browser tests first. Reuse compact generic appearance and inspector
   components. UI work has one owner and does not edit native/Rust files.
5. Update original examples and generated library through its generator, extend
   protocol, run focused and required contract checks, build the locked release
   and obtain an independent code review. Update evidence/remaining limits and
   tracking from actual results. Do not re-open completed visual surfaces or
   infer whole-help qualification from class coverage.

Executed 2026-10-22. All five steps are complete within the design's finite
scope. Final results, review fixes and remaining limitations are recorded in
`.impeccable/review/max-fidelity-20261021/arithmetic-finish.md`; durable logs
are in `experiments/max-reference/arithmetic-verification-20261022/results/`.
