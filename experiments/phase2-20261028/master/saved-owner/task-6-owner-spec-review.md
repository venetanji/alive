# Task 6 owner spec review

Candidate: `e6c5dd79cea2c4b5a704fe81fd69f5ea7519838d..30c8fa91253e4ab46b5f5fae48e93f990a830393` in `/home/venetanji/.codex/worktrees/bb01/alive`.

Verdict: changes requested. The wrapper, raw decoding and native preflight are aligned with the Task 6 seam in the paths inspected, but conversion feedback still makes an incorrect claim about the file written, and the new staging regression is not wired into CI.

## Findings

1. **P2 - Conversion notices claim the wrong saved file format for V5 owners.** `apps/ultra/src-tauri/src/session/host.rs:73` says Save writes session v3 even when a V5 envelope contains the converted v3 score. `apps/ultra/src-tauri/src/session/desktop.rs:145` and `apps/ultra/ui/alive.mjs:324` likewise say Save writes v4 after workspace conversion, including for all new sessions (which explicitly use V5). Serialization at `apps/ultra/src-tauri/src/session/persistence.rs:60` writes the v5 envelope in these cases. This misleads users about the file format and conflicts with the brief's requirement to preserve accurate conversion and migration notices. Preserve the conversion information while distinguishing the inner score from the outer file; account for the existing exact notice comparisons used for dirty tracking at `desktop.rs:546` and `desktop.rs:740`.

2. **P2 - New staging test is not run by CI.** `apps/ultra/tests/test_stage_alive_session.py:9` covers the new V5 staging helper, but `apps/ultra/tests/ci/check-contracts.sh:9` selects only `test_stream_measurement.py`, and `.github/workflows/ultra-ci.yml:45` lists other Python tests individually. Neither invokes this new test. A regression in envelope retention or device rebasing can therefore pass the normal CI checks. Wire the test into an existing CI entry point.

## Scope and limits

Reviewed the candidate diff and the frozen Task 6 brief, source preparation, report and master contract, with attention to strict duplicate scanning, raw score dispatch, bounds, wrapper propagation, transactional save, unavailable snapshot and refusal before retirement. The separately accepted Node DTO packet was treated as an interface dependency; its internals were not re-reviewed. The added raw fixtures and owner tests cover the principal deterministic paths, with non-unity history testing explicitly using an injected owner and refusing installation. Actual gain admission, promotion by an admitted gain command, native observations and fader behavior remain Task 7/8 gates, not evidence supplied by this review. No full suite, native GUI/audio, or native build was run for this independent review; the candidate report records the implementer's test evidence.

## Fix round 1 scoped re-review

Candidate: `30c8fa91253e4ab46b5f5fae48e93f990a830393..e716e43406cb6b15a9fcd90dc9471d853ef93c74`; cumulative diff SHA-256 reported as `2bd0298738199287fb80ac6f152aee91548268b39b2545382e3c64a4997a157e`.

Verdict: both original findings resolved; no new findings in the scoped fix. Conversion notices now distinguish the outer V5 file from the score, and load dirty state follows the actual score transition rather than notice text. The staging unittest is explicitly invoked in the CI workflow. The added tests exercise both wire cases; the report records the initial native harness failure and the retained cases after reusing the host.

This was a review of the fix and its introduced regressions, not a repeat of the full candidate review or test suites. No native GUI/audio or builds were run. Task 7/8 and separate DTO integration limits remain as stated above.
