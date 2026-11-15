# M-C candidate report

Base: c6df81f2d4fd6164930bca6847faf783b1949624
Candidate: 36ab4502ddf4dcd25de0a42b44ab4d1f5b24e022
Diff SHA-256 (git diff base candidate bytes): 0f396102aa796f280b609349782ae4d055119e806d87db1b534a85d12f4bce6b
Status: review candidate only; no freeze or consumer authorization.

## Complete committed file list

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

## Checks

- `python3 docs/contracts/alive-master-v1-fixtures/check.py`: exit 0, raw structure and duplicate scan verified; constructs boundary-size JSON values in memory. This is not an application decoder, and does not assert semantic validity or asset resolution. Fixture source paths are in the fixture README. Duplicate keys are literal raw bytes.
- `cc -std=c11 -Wall -Wextra -Werror -Iapps/ultra/src-tauri/native -Idocs/contracts -x c -c docs/contracts/alive-master-v1.h -o /tmp/alive-master-v1-c.o`: exit 0.
- `c++ -std=c++17 -Wall -Wextra -Werror -Iapps/ultra/src-tauri/native -Idocs/contracts -x c++ -c docs/contracts/alive-master-v1.h -o /tmp/alive-master-v1-cpp.o`: exit 0. Both compile against the actual session header and assert every declared offset, size and 8-byte alignment.
- `rustc --edition=2021 --crate-type lib docs/contracts/alive-master-v1.rs -o /tmp/alive-master-v1.rlib`: exit 0 using system rustc 1.99.1. The CI toolchain 1.85.1 is not installed (only stable is available); the required pinned-toolchain witness remains open. No toolchain installation was made under the lease.
- `git diff --cached --check`: exit 0 before commit.

## Handoff and limitations

Task 6 owns strict decode, real score validation, wrapper propagation, persistence and failure tests. Validate the eight-track candidate semantically and its external device references, plus actual 1 MiB enforcement. Its temporary seam does not authorize non-unity installation without native admission. Task 7 owns the native implementation, coherent publication, resolver, actual C/Rust cross-platform ABI, queues, DSP, restoration and measurement. Linux scratch evidence in the inherited draft is not production resolver proof; macOS/Windows and pinned Rust remain open. Task 8 owns UI bridge and rendered behavior. No v5 implementation, native DSP, real application decoder, UI, audio, production build, or performance test ran here. Contract and fixtures require independent review and G0 before consumer authorization.
