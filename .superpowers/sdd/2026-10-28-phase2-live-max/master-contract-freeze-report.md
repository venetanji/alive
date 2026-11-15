# M-C round-one candidate report

Base: c6df81f2d4fd6164930bca6847faf783b1949624
Prior reviewed candidate: 36ab4502ddf4dcd25de0a42b44ab4d1f5b24e022
Candidate: f06486973dcef8da515b67a32aebcdfdbb2179b9
Base-to-candidate diff SHA-256: 248d53d2a1c6ee9dd68d4f9cd44efac4de3b8577b9ad1e102988c6f2b04c75a3
Prior-to-candidate diff SHA-256: 14ef0c747b2895998eb4444cdeb7cd5b5ee45b059ae6b3388dcb87fa61098573
Status: independent review required; not frozen; no consumer authorization.

## Complete base-to-candidate committed files

docs/contracts/alive-master-v1-fixtures/README.md
docs/contracts/alive-master-v1-fixtures/check.py
docs/contracts/alive-master-v1-fixtures/gain-0.5.json
docs/contracts/alive-master-v1-fixtures/gain-0.json
docs/contracts/alive-master-v1-fixtures/gain-1.json
docs/contracts/alive-master-v1-fixtures/gain-4.json
docs/contracts/alive-master-v1-fixtures/invalid-duplicate-master.json
docs/contracts/alive-master-v1-fixtures/invalid-duplicate-outer-master.json
docs/contracts/alive-master-v1-fixtures/invalid-duplicate-outer.json
docs/contracts/alive-master-v1-fixtures/invalid-duplicate-parameter-v2.json
docs/contracts/alive-master-v1-fixtures/invalid-duplicate-parameter-v3.json
docs/contracts/alive-master-v1-fixtures/invalid-duplicate-parameter-v4.json
docs/contracts/alive-master-v1-fixtures/invalid-duplicate-score.json
docs/contracts/alive-master-v1-fixtures/invalid-malformed.json
docs/contracts/alive-master-v1-fixtures/invalid-missing.json
docs/contracts/alive-master-v1-fixtures/invalid-negative.json
docs/contracts/alive-master-v1-fixtures/invalid-nested-v1.json
docs/contracts/alive-master-v1-fixtures/invalid-nested-v5.json
docs/contracts/alive-master-v1-fixtures/invalid-nonfinite.json
docs/contracts/alive-master-v1-fixtures/invalid-over.json
docs/contracts/alive-master-v1-fixtures/invalid-string.json
docs/contracts/alive-master-v1-fixtures/invalid-trailing.json
docs/contracts/alive-master-v1-fixtures/invalid-unknown.json
docs/contracts/alive-master-v1-fixtures/ipc-error.json
docs/contracts/alive-master-v1-fixtures/ipc-request-gain.json
docs/contracts/alive-master-v1-fixtures/ipc-request-reset.json
docs/contracts/alive-master-v1-fixtures/ipc-snapshot.json
docs/contracts/alive-master-v1-fixtures/ipc-success-gain.json
docs/contracts/alive-master-v1-fixtures/ipc-success-reset.json
docs/contracts/alive-master-v1-fixtures/legacy-v1.json
docs/contracts/alive-master-v1-fixtures/legacy-v2.json
docs/contracts/alive-master-v1-fixtures/legacy-v3.json
docs/contracts/alive-master-v1-fixtures/legacy-v4.json
docs/contracts/alive-master-v1-fixtures/v5-v2.json
docs/contracts/alive-master-v1-fixtures/v5-v3-eight.json
docs/contracts/alive-master-v1-fixtures/v5-v3.json
docs/contracts/alive-master-v1-fixtures/v5-v4.json
docs/contracts/alive-master-v1.h
docs/contracts/alive-master-v1.md
docs/contracts/alive-master-v1.rs

## Verification and evidence

- `python3 docs/contracts/alive-master-v1-fixtures/check.py`: exit 0. Verifies exact gain values, exact duplicate key/path and clean first-member projection, other negatives, IPC examples, identities, repository asset paths and canonical SHA-256 fingerprints, and constructs 1,048,576/1,048,577-byte valid JSON. This is not the application v5 decoder. Independent scratch mutations replacing gain-4 and invalid-over with gain-1 both made the checker exit 1. Prior reviewed fixtures are preserved in `master-contract-round1/prior-fixtures/`; prior report is preserved beside them.
- `experiments/clockwork-faust/.deps/rust/bin/rustc --version`: `rustc 1.85.1 (4eb161250 2025-03-15)`; `experiments/clockwork-faust/.deps/rust/bin/rustc --edition=2021 --crate-type lib docs/contracts/alive-master-v1.rs -o /tmp/alive-master-v1-pinned.rlib`: exit 0. The prior report's statement that pinned Rust was unavailable was incorrect.
- `cc -std=c11 -Wall -Wextra -Werror -Iapps/ultra/src-tauri/native -Idocs/contracts -x c -c docs/contracts/alive-master-v1.h -o /tmp/alive-master-v1-c.o` and corresponding `c++ -std=c++17` command: exit 0, using actual session headers and all declared layout asserts.
- Existing headless release probe: extract `score` from each `v5-{v2,v3,v4,v3-eight}.json` using Python JSON into `.probe-{version}.alive` sibling files, then run `env -u DISPLAY -u WAYLAND_DISPLAY apps/ultra/src-tauri/target/release/alive --session-probe docs/contracts/alive-master-v1-fixtures/.probe-{version}.alive .superpowers/sdd/2026-10-28-phase2-live-max/master-contract-round1/probe-{version}`, with each version substituted. Temporary files removed afterward. v2 exit 0; v3 exit 1 `Use identity-bearing v3 requests`; v4 exit 1 `This operation requires a legacy or v3 clip document`; eight-track v3 exit 1 `The session proof requires two saved device references`. In the inspected source `read(path)` occurs before these probe-specific refusals, establishing that the existing binary decoded and prepared each extracted bare score. The probe executes offline native work for v2; no audio device or GUI launched. Binary SHA-256 `174e4091e02945d3871cafb1b904a4ce51448b0a41f07293a24e57609bbfcfb2`; its exact source revision was not independently established. Logs and output are in `master-contract-round1/`. This is not a v5, v3/v4 rendering, or cross-platform witness.
- `git diff --cached --check`: exit 0 before commit.

## Handoff and outstanding gates

Task 6 owns real v5 decode/migration/save/history tests and actual size enforcement; Task 7 owns native ABI/resolver/runtime, queue, DSP, restoration and measured profile evidence; Task 8 owns the specified bounded producer state machine and rendered UI tests. The eight-track bare score reached the later probe limitation but native admission, actual v5 decoder, platform resolver and performance remain unproved. Independent review and G0 precede any consumer authorization.

## Round-two checker revision

Candidate: 6638858d1ffb65d48b9952e64b7e3c768f3379d1 (parent f06486973dcef8da515b67a32aebcdfdbb2179b9). Base-to-candidate diff SHA-256: 12089c70b2347fc790a09a2307917c00ab01c372ff5cde006f958fba8a356f46. Parent-to-candidate diff SHA-256: 63cdb9ce432bf0bc05dfc04aad4c611b597ffd0f861d4a485f9e082b3f52c88e. Only committed changed file in this revision: docs/contracts/alive-master-v1-fixtures/check.py.

The checker uses JSON-type-aware recursive structural equality (number integer/float equality is allowed; booleans are distinct), and scans every duplicate value recursively while retaining only the first member for its projection. Command: canonical: exit 0: fixture identities, exact duplicate paths, dependencies and boundaries verified; application decoder not invoked
gain-1.json boolean: exit 1
gain-0.json boolean: exit 1
nested duplicate in second master: exit 1
gain-4.json replaced by gain-1: exit 1
invalid-over.json replaced by gain-1: exit 1. Exit 0; canonical fixture checker exit 0; mutations gain 1 to true, gain 0 to false, duplicate gain in second master, and replacement of gain-4 and invalid-over with gain-1 each made the checker exit 1. Script and full receipt are retained in master-contract-round1/check-mutations.py and check-mutations.log.  passed before commit. Fixture data did not change; no additional preparation probe ran. Earlier probe attribution and limitations above remain unchanged. Candidate remains for independent review; no freeze or approval.
