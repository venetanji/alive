# Windows Native Compile Failure

Pushed source: `dc76fa9e69f6a243b841faea8e0a2d9409ef5d05`.
Package run: https://github.com/venetanji/alive/actions/runs/40068666226
Failed Windows job: 120797175550, target `x86_64-pc-windows-msvc`.

The native build fails with MSVC C3861 for `__builtin_popcount` at
`alive_session_clips.hpp:146` and `__builtin_ctz` at
`alive_session_clips.hpp:899`. These new GNU compiler operations are not
available to the actual MSVC compiler. The dependencies and CMake setup finish;
the later Python release-wrapper exception reports this compiler failure.
The routine pthread feature-probe failures are not the identified cause.

`job.json` identifies the failed job/source. The raw downloaded job log preserves
terminal escape sequences; its companion strips ANSI CSI sequences only.
`manifest.json` records both byte counts and hashes. The ordinary `gh run view
--log-failed` command cannot provide logs while the whole matrix is still
running; the completed job's logs API returned this direct evidence.

A narrow C++17 portability correction is queued with the sole source
implementer. Its following actual Windows package build remains required;
no Linux/compiler-test result substitutes for MSVC qualification. Other
platform and native CI results remain separately tracked. No toolchain,
credentials, persistent settings, release branch or publishing action changed.
