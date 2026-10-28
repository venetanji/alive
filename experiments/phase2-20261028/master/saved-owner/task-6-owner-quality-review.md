# Task 6 owner quality review

Candidate: `e6c5dd79cea2c4b5a704fe81fd69f5ea7519838d..30c8fa91253e4ab46b5f5fae48e93f990a830393` (32-file owner packet). The separately reviewed Node model packet is outside this review.

## Finding

- **P2 — Conversion notices misidentify the saved file format for V5 owners.** `apps/ultra/src-tauri/src/session/host.rs:73` always says “Save writes session v3” after legacy-to-clips conversion, including New (which explicitly starts with V5) and a V5 envelope containing a v2 score. `apps/ultra/src-tauri/src/session/desktop.rs:145` likewise says “Save writes v4” after workspace conversion, and `apps/ultra/ui/alive.mjs:324` repeats that statement. Serialization at `apps/ultra/src-tauri/src/session/persistence.rs:60` retains V5 for these owners, so the resulting outer format is v5 with a v3/v4 score. These notices are visible in the UI and give users the wrong compatibility/migration information. Describe the score upgrade separately from the file envelope, or choose wording using `saved.wire`; replace the string equality used to determine conversion dirty state (`desktop.rs:540`, `:740`) with an explicit signal if the text changes. Add witnesses for legacy and V5 owners undergoing each conversion.

## Review scope and limits

Reviewed the complete owner diff and relevant callers, raw duplicate and size boundaries, save commit ordering, wrapper retention, non-unity preflight, producer snapshot shape, and changed native-test staging. No other actionable findings identified. Existing worker evidence reports passing Rust, Node, staging and contract suites; this review did not rerun expensive suites or launch native GUI/audio. Actual native admission, gain promotion, rollback, and runtime observation remain Task 7 gates; the separate Node packet and real desktop witnesses remain separate review/qualification boundaries.

## Fix round 1 scoped re-review

Reviewed `30c8fa91253e4ab46b5f5fae48e93f990a830393..e716e43406cb6b15a9fcd90dc9471d853ef93c74`. The P2 conversion-notice finding is resolved: notices distinguish the outer V5 envelope from its score version, the immediate workspace status no longer claims a v4 file, and load dirty state follows the actual score conversion rather than notice text. The added tests exercise both wire choices and repeated saves; the staging unittest is wired into CI. No new actionable findings in the scoped changes. Did not rerun the worker's suites or launch native GUI/audio; prior review limitations remain.
