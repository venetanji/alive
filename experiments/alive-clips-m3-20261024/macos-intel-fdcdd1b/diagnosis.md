# Task 12: Intel macOS packaging failure diagnosis

## Conclusion

The established failing boundary is Tauri's generated `bundle_dmg.sh` child
process while packaging **Ultra Research**, after successful native compilation,
Rust compilation/tests, `.app` assembly and ad-hoc app signing. The retained logs
do **not** expose the failing command or its diagnostic message inside that
script. They establish a non-success child status, not its root cause.

No app/native/compiler/toolchain fix is justified from this evidence. The
smallest supported next diagnostic step is to enable the pinned CLI's existing
Debug logging for the existing Intel package command on the next authorized CI
execution. This investigation did not rerun CI, change source/index/branches,
change settings or credentials, build software, or run an app/GUI.

## Exact failure and retained evidence

- Source: `fdcdd1b353f7560fdd3d448377168ec51a9cc2bf`.
- Run: <https://github.com/venetanji/alive/actions/runs/40069422711>.
- Failed job: <https://github.com/venetanji/alive/actions/runs/40069422711/job/120799742059>,
  `Package x86_64-apple-darwin`, step 9, `Build unsigned or ad-hoc test packages`.
- Evidence directory:
  `experiments/alive-clips-m3-20261024/macos-intel-fdcdd1b/`.
- Exact matrix receipt:
  `experiments/alive-clips-m3-20261024/packages-fdcdd1b.json`.
- Recomputed SHA-256 hashes of `failed-step.log`, `package-job.log` and `job.json`
  all match `manifest.json`.

The line anchors below refer to the retained complete `package-job.log`:

| Boundary | Observed evidence |
| --- | --- |
| Runner | Lines 10-19: macOS 26.6.1, build 25G76; reported image `macos-26`, version `20260824.0517.1`. The workflow selects `macos-26-intel` for this target. |
| Native build and ABI | Lines 948-953: native shared library/parser targets built; bounded numeric parser passes; native library loads and finite callback/stop/restart smoke passes. |
| Ultra Rust tests | Line 1487: 180 passed, 0 failed, 2 ignored. |
| Alive generated-context test | Lines 1797-1804: `tests::session_and_editor_context_can_listen_and_close_only_owned_windows` passes; 1 passed, 0 failed. |
| Ultra release binary | Lines 1842-1843: release build finishes and Tauri reports the built `ultra` application. |
| Ultra app assembly/signing | Lines 1844-1853: `Ultra Research.app` assembled; its dylib, executable, and app signed using `-`; execution advances to the DMG bundler. |
| First established failure | Lines 1854-1857: DMG bundling starts at 06:38:47.998Z; `bundle_dmg.sh` is run at 06:38:48.042Z; generic child failure appears at 06:39:14.176Z. No intervening script stdout/stderr is present. |
| Error propagation | Lines 1858-1868: Python raises `CalledProcessError` from the Tauri CLI, which exits 1; the workflow step exits 1. |

The generic error is:

```text
failed to bundle project: error running bundle_dmg.sh: `failed to run /Users/runner/work/alive/alive/apps/ultra/src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/bundle_dmg.sh`
```

The wrapper traceback is propagation of that error. Its `1` is the Tauri CLI
exit code; the retained log does not report the original script exit code.
The 90-minute job timeout was not reached. This was a failed step, not a
cancelled job.

The notarization warning is expected on this ad-hoc test-package path. It
precedes DMG invocation and appears in successful comparison jobs too; it is
not evidence that absent notarization credentials caused this failure.

## Frozen source trace

All local source inspection used `git show fdcdd1b:<path>` or comparisons of
commits, rather than relying on the concurrently changing worktree.

1. `.github/workflows/ultra-desktop.yml` selects the Intel native runner,
   installs the locked CLI using `npm ... ci`, and sets
   `APPLE_SIGNING_IDENTITY: '-'` for the unsigned/ad-hoc build step. That step
   calls `python apps/ultra/scripts/release.py build --target
   'x86_64-apple-darwin'`. This is the test-package path; the signed/notarized
   release step is skipped.
2. `apps/ultra/scripts/tooling/package-lock.json:11` pins `@tauri-apps/cli` to
   **2.8.4**, including the `cli-darwin-x64` optional native package. The app's
   Rust `tauri v2.8.5` compilation line is a different package/version and does
   not identify the CLI/bundler version.
3. `apps/ultra/scripts/release.py:320` copies the process environment and passes
   it to the CLI. Line 343 requests `app,dmg` for Darwin. The product order
   defined at line 21 is Ultra then Alive. Line 359 invokes Tauri, and line 360
   would verify that product's packaged payload only after Tauri succeeds.
4. Thus the failed Intel job did not reach Ultra's packaged-payload verification
   or Alive's Tauri bundling. Passing the Alive context test is not evidence
   that an Intel Alive installer was produced. The matrix receipt shows the
   collection/upload steps skipped after the failure; publishing is skipped.

## Why the root-cause message is missing

Inspected upstream source at the version tag matching the installed CLI:

- [CLI v2.8.4 Cargo manifest](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.8.4/crates/tauri-cli/Cargo.toml#L50):
  its path dependency is `tauri-bundler` **2.6.1**.
- [DMG bundler](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.8.4/crates/tauri-bundler/src/bundle/macos/dmg/mod.rs#L77):
  writes the embedded script as `bundle_dmg.sh`, builds its arguments and,
  at lines 184-191, runs it from the macOS app bundle directory through
  `CommandExt::output_ok()`, adding the `error running bundle_dmg.sh` context.
- [Command output handling](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.8.4/crates/tauri-bundler/src/utils/mod.rs#L48):
  logs the command/arguments at Debug (line 50), pipes stdout/stderr and logs
  their lines at Debug (lines 68 and 87), then on non-success returns only
  `failed to run {program}` (lines 102-107). The final error omits captured
  streams and the child's numeric status. This matches the retained error.
- [CLI verbosity parsing](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.8.4/crates/tauri-cli/src/lib.rs#L231):
  parses `TAURI_CLI_VERBOSITY` as the numeric verbosity before initializing
  logging. Lines 309-315 map `0` to Info, **`1` to Debug**, and `2` or greater
  to Trace. The CLI also defines global counted `-v`/`--verbose` at lines
  140-142.

This establishes an observability limitation in the pinned bundler. It does
not establish why its DMG subprocess failed.

The embedded [DMG shell script](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.8.4/crates/tauri-bundler/src/bundle/macos/dmg/bundle_dmg#L9)
uses `set -e` and `set -o pipefail` and performs several independent operations,
including disk-image creation, resize, attach, file attributes, detach, and
conversion. The wrapper message cannot select among those operations. Tauri's
DMG module lines 174-181 normally append `--skip-jenkins` when `CI=true` unless
`TAURI_BUNDLER_DMG_IGNORE_CI=true`; the script lines 480-519 use that flag to skip
Finder AppleScript. The failed log does not print the actual script arguments
or those variable values. There is consequently no evidence for attributing
the failure to AppleScript either.

## Working comparisons

1. **Same source, other platforms:** the exact matrix receipt records successful
   Linux, Windows/MSVC and Apple Silicon package jobs. Read-only retrieval of
   the same-source Apple Silicon job log (`120799742021`) confirms both Ultra
   and Alive DMG scripts finish with `Finished 2 bundles at:`. The runner image
   is `macos-26-arm64`, so it is not an identical Intel environment.
2. **Earlier Intel success:** retained receipt
   `experiments/alive-piano-m3-20261024/packages-d1f8a66.json` records all package
   targets successful at source `d1f8a6659730abe54b9037434a55c3ce92ce34a8`.
   Read-only retrieval of
   <https://github.com/venetanji/alive/actions/runs/40062078658/job/120777555277>
   confirms Ultra's DMG script runs at 05:02:04.462Z and completes at
   05:02:36.076Z; Alive's runs at 05:08:29.632Z and completes at
   05:08:41.230Z. Both app/DMG pairs succeed and the package collection/upload
   steps pass.
3. **Same reported Intel image:** that successful Intel job reports the same
   macOS 26.6.1/build 25G76 and image version `20260824.0517.1` as the failed job.
   This does not establish identical host state or a transient cause.
4. **Packaging configuration comparison:** `git diff d1f8a66 fdcdd1b --` for
   `.github/workflows/ultra-desktop.yml`, `apps/ultra/scripts/release.py`,
   `apps/ultra/scripts/tooling/package-lock.json`, and both app
   `src-tauri/tauri.conf.json` files is empty. App/native code and resulting
   payloads can differ; unchanged packaging configuration alone does not
   eliminate a payload-dependent problem.

The comparison logs were retrieved read-only with `gh run view <run> --job
<job> --log`; they were not new executions. The retained exact failed-job log
and its matching hashes remain the primary evidence for the failing boundary.

## Minimal next diagnostic step

For the **next authorized source push**, the preferred diagnostic change is
one explicit `-v` argument on the existing Tauri build invocation in
`apps/ultra/scripts/release.py:359`, as detailed in the follow-up below. This
enables Debug child logging without an environment-setting change. The earlier
process-local `TAURI_CLI_VERBOSITY=1` suggestion is superseded by the user's
constraint against environment-setting changes. Neither approach was executed
against a build or CI job during this investigation.

Expected additional evidence is the actual `bundle_dmg.sh` command/arguments
and its emitted stdout/stderr, including the last progress message and any
underlying tool error. Retain the completed raw Intel job log and exit result
again. Investigate the first newly visible failing operation before choosing
a fix. Debug logging captures emitted diagnostics; it cannot guarantee that
an underlying failing command emits a useful error. If the command succeeds,
that success is additional evidence but does not identify the original cause.

## Established facts versus remaining unknowns

**Established:** the native/Rust build and tests finish; Ultra app assembly and
ad-hoc signing advance to DMG packaging; the generated DMG child returns a
non-success status; pinned bundler Debug-only child logging explains the lack
of its diagnostic output; the wrapper propagates failure and prevents later
Intel artifact production/verification.

**Unknown:** the first failing shell operation, original script/tool exit code,
its stdout/stderr, disk/mount/resource state, and whether the cause is payload,
environment, timing, or another condition. One failed execution and previous
successes do not establish reproducibility or a runner transient.

**Source-fix decision:** no functional source fix is justified now. Enable the
verified diagnostic logging on the next authorized execution, obtain the
underlying failure evidence, and only then form/test a specific fix hypothesis.

## Follow-up: verified explicit verbosity argument

The pinned **Tauri CLI 2.8.4** accepts both `tauri -v build ...` and
`tauri build --verbose ...`. Prefer `-v` before `build` to make the argument's
ownership unambiguous. It must be before the existing `--` separator; arguments
after that separator are forwarded to the build runner. A single `-v` selects
Debug logging; it does not select the separate `-d`/`--debug` application build.

Verification performed without a build or CI execution:

```bash
node apps/ultra/scripts/tooling/node_modules/@tauri-apps/cli/tauri.js --version
node apps/ultra/scripts/tooling/node_modules/@tauri-apps/cli/tauri.js -v build --help
node apps/ultra/scripts/tooling/node_modules/@tauri-apps/cli/tauri.js build --verbose --help
```

All three commands exit 0. The version output is `tauri-cli 2.8.4`. Both help
forms list `-v, --verbose...` as "Enables verbose logging" and separately list
`-d, --debug` as "Builds with the debug flag". These were parser/help operations
using the already-installed Linux native CLI; no application build, bundling,
GUI, package installation or environment configuration was invoked. macOS flag
acceptance is corroborated by the platform-independent pinned parser source.

Verified source anchors at `tauri-cli-v2.8.4`:

- [Global flag declaration](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.8.4/crates/tauri-cli/src/lib.rs#L139):
  lines 140-142 declare `verbose: u8` with `short`, `long`, `global = true`,
  and `ArgAction::Count`. This supports the short/long spellings and placement
  before or after the subcommand.
- [Logging selection](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.8.4/crates/tauri-cli/src/lib.rs#L231):
  lines 231-241 select `cli.verbose` absent an existing numeric verbosity
  override, and initialize the global log filter. Lines 309-315 map one
  occurrence to `Level::Debug`.
- [Build dispatch](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.8.4/crates/tauri-cli/src/lib.rs#L285):
  forwards `cli.verbose` to the build command. The
  [build options](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.8.4/crates/tauri-cli/src/build.rs#L31)
  define a distinct `debug` flag at lines 31-33 and describe runner argument
  forwarding after `--` at lines 59-60.
- [Child output logging](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.8.4/crates/tauri-bundler/src/utils/mod.rs#L48):
  lines 50, 68 and 87 emit the DMG command, stdout and stderr at Debug level.

Minimal recommended source change, for the sole source implementer to include
with the next authorized push (not applied by this diagnosis):

```diff
-        run(*cli, 'build', '--target', args.target, '--bundles', bundles, '--config', config, '--', '--locked', cwd=app, env=env)
+        run(*cli, '-v', 'build', '--target', args.target, '--bundles', bundles, '--config', config, '--', '--locked', cwd=app, env=env)
```

This adds one Tauri argument on the existing call, preserves the workflow
command and its signing configuration, and exposes child diagnostics for both
products/all package targets using this wrapper. It requires no new flag on
the Python wrapper, environment field, machine setting, toolchain change or
blind rerun. The source push supplies a reviewable instrumentation change; CI
then executes through the already configured workflow. This is a diagnostic
change, not a claimed packaging fix. Inspect and retain the first newly visible
DMG failure output before proposing a functional correction.
