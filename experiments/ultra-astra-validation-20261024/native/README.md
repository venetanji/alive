# Native Gain/Stop probe and source review

This bundle validates Astra's changes in `6d524cb474e54e6cea21897295921ed9cee5bb72`
against parent `bfe42ff060931eb23384093d9c133ab873f02546`. The later
`de663840` delta changes packaging notices only. The probe is validation code;
it does not modify the application's production sources or build configuration.

## Run

Prerequisites: Python 3.8+, a GCC-compatible C++20 compiler (`CXX` can select it),
and an already built native library with its matching repository headers.
The runner supports Linux and macOS; the recorded execution is Linux only.
It never starts JACK, opens a physical audio device, or rebuilds the application.

```sh
python3 native/run.py /path/to/alive --output /tmp/ultra-fix-probe
python3 native/run.py /path/to/libultra_native.so --repo /path/to/alive
python3 native/run.py /path/to/parent/alive --expect-failure --output /tmp/ultra-parent-probe
```

Run from `experiments/ultra-astra-validation-20261024`, or adjust the
`native/run.py` path.
Output directories must be empty or absent. Omit `--output` for a fresh temporary
directory. Binaries and raw samples stay outside this bundle. Compilation uses
`-O2 -UNDEBUG`, so every assertion executes. The runner saves build/runtime logs,
raw float buffers, library/probe SHA256 hashes, and `results.json`. Normal mode
requires both probe invocations to pass and compares their audio byte-for-byte.
`--expect-failure` succeeds only for the edits invocation's `SIGABRT` assertion
mentioning `ultra_external_render`; setup/build errors are failures.

The probe's `baseline` argument means the no-edit control invocation against
the same library. It does not mean the parent commit. Both invocations include
the restart and final saturation checks; only the 42-cycle edit stream differs.

## Coverage and recorded results

The original `gain_stop_regression.cpp` exercises two document graphs through
the real native C ABI and Clockwork/Faust library. It covers 42 stop cycles:
1/7/8/9/31/63/64 admitted Gain edits, six repetitions each, and 1..6 Stop requests.
It checks rejection of the 65th FIFO edit, retained runtime Gain, healthy engine
flags, finite audio from the other document, zero/nonzero Gain on deliberate
restart, full-FIFO global Stop, and full engine shutdown/restart.

The reviewed library passes. The other document's output matches the no-edit
control exactly: 43,008 floats / 172,032 bytes, SHA256
`db265674da3bcad32b5582e699f5defa1efee1f24d931b72c279d57b93f9a0c3`.
The identical probe fails against the parent library at the render assertion.
Small logs and hashes are in `results/`; no binaries, raw audio, third-party
source, or proprietary Max data are included. Existing assertions-enabled
`document_audio_test`, `document_runtime_test`, `signal_audio_test`, and
`canvas_idle_test` also passed against the reviewed library.

This is real native library execution into memory buffers. Physical audio
playback/listening was unavailable. The probe checks retained runtime values;
it does not establish disk-save serialization or native desktop menu behavior.

## Remaining P1: native macOS Cmd-Q bypasses the close gate

Source review locates the issue at
`apps/ultra/src-tauri/src/document_windows.rs:341` and
`apps/ultra/src-tauri/src/main.rs:874`. The new menu uses
`PredefinedMenuItem::quit`; the new editor flush/Save/Discard/Cancel gate listens
for `RunEvent::ExitRequested`. The exact locked dependency path bypasses that
event for native Quit:

| Locked dependency | Source location | Behavior |
| --- | --- | --- |
| `tauri 2.8.5` | `src/menu/predefined.rs:318` | Wraps Muda's predefined Quit item |
| `muda 0.17.2` | `src/platform_impl/macos/mod.rs:854` and `:992` | Creates the native item with Cocoa `terminate:` |
| `tao 0.34.8` | `src/platform_impl/macos/app_delegate.rs:63` and `:131` | Observes `applicationWillTerminate`, calls `AppState::exit`; has no `applicationShouldTerminate` override |
| `tao 0.34.8` | `src/platform_impl/macos/app_state.rs:272` | Emits `LoopDestroyed` |
| `tauri-runtime-wry 2.8.1` | `src/lib.rs:4004` | Converts `LoopDestroyed` directly to `RunEvent::Exit` |
| `tauri-runtime-wry 2.8.1` | `src/lib.rs:4135` and `:4175` | Emits cancellable `ExitRequested` for last-window destruction or `Message::RequestExit` |

The dependency sources above are identified by package/version and relative
file path under Cargo's registry source directory; they are not vendored here.
No app/pinned dependency termination override was found that routes native
`terminate:` through the guarded close logic. Consequently the new hook does
not intercept Cmd-Q and cannot flush pending editors or show dirty-document
choices on that path. Registry helper tests do not exercise the native selector.

Hardware reproduction still required on macOS: dirty two documents, leave a
numeric edit pending, then press Cmd-Q or Ultra > Quit. Expected: each editor
flushes and each dirty owner receives Save/Discard/Cancel; cancelling retains
the app. Source predicts native termination before the gate. No macOS run is
claimed. A custom Quit action routed into guarded close logic, or a cancellable
Cocoa termination delegate, is needed to cover this entrypoint.

The app-wide File/Help routing appears consistent by source review: it installs
one application menu, resolves the focused window at invocation, and maps valid
child views through their owner registry. Native macOS focus/menu execution is
unverified. Separately, guarded Quit closes owners concurrently; cancelling one
preserves that owner/app, while other owners may already close. It does not
implement an all-documents transaction if any Cancel must retain every window.
