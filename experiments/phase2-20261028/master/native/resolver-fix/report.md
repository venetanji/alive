# Task 7 Resolver Integration Fix

Candidate `81220d33348b2baa0890b0d74f1e517aa5474722` is a one-file test-harness change on `72af9f0031b298d723bd73df3ec84efacd05a600`; the delta SHA-256 is `039cb328837963618b9547ed1af4b59157e0abfa1574b19f5c81688a872863e9`. Only `apps/ultra/tests/alive_session_master_resolver_test.sh` changed. No production code, ABI, admission, timing policy, dependency or settings changed.

## Diagnosis

Root's independent native build passed; its original native suite exited 127 at the first old-library resolver fixture. The original root receipt/log are preserved in `task-7-root-validation/` and copied into `task-7-resolver-integration-fix-evidence/`. The failing loader named the Rust `StringError` Display symbol. The result is reproducible in bb01 with the project's pinned Rust 1.85.1 (`experiments/clockwork-faust/.deps/rust/bin/rustc`, LLVM 19.1.7); system Rust 1.99.1 did not reproduce it.

The pinned standalone test executable was linked against the full `libultra_native.so`. ELF dynamic symbols show 135 undefined Rust-mangled imports, including the exact `StringError` formatter. The full native image exports that symbol, but the minimal old fixture does not, so the executable fails in the loader before the resolver test executes. This is a test-binary linkage problem; it does not demonstrate a second engine or a production resolver failure.

The script now links that test executable against its already-built minimal old anchor, while its first runtime case still loads the actual full native library. Old, partial and dependency-collision cases still replace the same linked module through the existing library path. An ELF regression check rejects unexpected undefined Rust-mangled dynamic imports. Partial and dependency fixtures retain their trapped limits function, so their successful refusal still proves the resolver does not call an incomplete set. No basename lookup or second load was added to production.

## Evidence and verification

Machine-readable commands, explicit exit codes, compiler paths/versions, fixture ordering and hashes: `task-7-resolver-integration-fix-evidence/receipt.json` (SHA-256 recorded below). The fixture labels in the original logs are reconstructed from the ordered shell loop and four successful test outputs; those logs do not print labels. The original root exit 127 remains in `root-native-red.log`; the pinned bb01 reproduction also exits 127 in `alive-resolver-pinned-red.log`. `pinned-full-symbols.txt` and `pinned-anchor-symbols.txt` retain both ELF tables; `elf-counts.txt` records 135 versus 0 unexpected undefined Rust-mangled imports. Applying the new ELF invariant to the old full-linked executable exits 1 (`alive-resolver-elf-regression-red.log`).

- `PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" bash apps/ultra/tests/alive_session_master_resolver_test.sh`: exit 0, all four cases (`alive-resolver-pinned-green.log`).
- `bash apps/ultra/tests/alive_session_master_resolver_test.sh`: exit 0, all four cases with system Rust 1.99.1 (`alive-resolver-system-green.log`).
- The pinned minimal-anchor executable also passes against root's independently built full module by explicitly setting `LD_LIBRARY_PATH=/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/build` (`root-full-green.log`). Its SHA-256 is `29f81a069517dca619deee196e4cddb94d59d1d53ca58d74eb536f0952ce161d`; the bb01 full module is `3b031af38becf353fec0fa67722079a369beff30f315541e1204d6990709049b`.
- `PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" bash apps/ultra/tests/ci/check-native.sh`: exit 0 (`pinned-native-ci-green.log`), including resolver and the existing native corpus. It started before the commit using byte-identical script content; `cmp` against the retained 81220d3 script passed.
- `git diff 72af9f0031b298d723bd73df3ec84efacd05a600 81220d33348b2baa0890b0d74f1e517aa5474722 --check`: exit 0; the bb01 tracked worktree is clean. Original untracked evidence remains present.

Context7 Rust documentation was consulted for native `-l` linkage and static/dynamic dependency behavior; the pinned 1.85.1 ELF observations above determine this fix. Existing Task 7 profile measurements, four v3 timing excursions, provisional v4 profile-two limitations and foreign-runtime gates retain their prior attribution; this harness change does not waive or requalify them.

## Handoff

No owned native suite, build, audio, GUI or server process remains. The narrow bb01 test-harness/build lease and exclusive native test resource are released to the controller. Independent read-only review and root's integrated pinned-toolchain rerun remain pending; no integration, push, deployment or release was performed.
