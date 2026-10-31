# Stage 1 Launch Quantization Evidence

Date: 2026-10-31. Scope: configurable launching on existing MIDI tracks.
Product source is `adaf6bc`; final harness correction is `b71a2b6`. Later
documentation commits add this packet and the proposed shared-video design.

Global defaults to 1 Bar. Each occupied Session occurrence can follow Global
or choose None, 1/32, 1/16, 1/8, 1/4, 1/2, 1 Bar, 2 Bars, 4 Bars or 8 Bars.
Native receipts own timing and state. Accepted requests retain the grid captured before native
consumption, including when settings change while the request is queued.

## Independent Controller Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Full JavaScript UI suite at final product source | 608 passed, 0 failed | `/tmp/alive-launch-parent-node-adaf6bc.log` |
| Rust session suite against current native library | 135 passed, 0 failed | `/tmp/alive-launch-parent-rust-direct-final.log` |
| Chromium toolbar, browser, inspectors, piano and launch controls | 14 passed, 0 failed | `/tmp/alive-launch-parent-browser-final.log` |
| Required window sizes | Inspected 1440x900, 1280x800, 1024x768, 800x600; Stop/Master reachable, regional scrolling | [800x600 Arrangement capture](browser-arrangement-800x600.png) |
| Real Tauri/CPAL desktop journey | Exit 0; keyboard settings, Save As/reopen, native Session authority, positive voices, zero stream errors, global Stop | [Receipt](desktop-launch-report.json), [playing capture](native-session-playing.png) |
| Independent native review and scoped re-review | Both retained-proof findings closed; no blocking native finding | [Native review](native-review.md) |
| Independent complete feature review and harness re-review | No remaining blocker | [Whole-feature review](whole-feature-review.md) |

The implementer additionally ran the full Rust library (299 passed, 4 ignored),
the full Alive Chromium suite (68 passed), old-library recovery (6 passed),
and native target/trace/PCM, ABI, retained-history and admission suites. Native
review independently rebuilt the shipping backend and exercised the launch
fixture and both affected scalar envelope suites; the workspace suite made
109,758,400 assertions. The complete worker commands and logs remain in
`/tmp/alive-launch-quantization/report.md`.

The desktop receipt initially says queued because it captures acceptance;
the test subsequently requires observed native Session authority and positive
active voices before Stop. It does not infer playback from the acceptance
message. The reviewer report predates the controller's final desktop rerun;
that remaining execution gate passed after the report was prepared.

## Preserved Failures And Corrections

- Adding a separate settings row first broke two existing piano-height
  assertions. The control now shares the clip heading. Both original assertions
  and the complete 68-test browser suite pass without relaxing geometry.
- Cargo's launcher prepended the existing `target/debug` directory, selecting
  an older sibling native library. The controller's first session run had
  three missing-capability failures. Loader diagnostics confirmed the path;
  direct execution against the owned current library passed all 135 tests.
  The existing library/symlink was preserved.
- The first controller desktop run failed when AT-SPI briefly returned an
  empty callback string. Its screenshot showed running output and 379
  callbacks. `b71a2b6` waits through unparseable readings while preserving the
  positive callback/voice requirements, exact zero-error condition and eight-
  second timeouts. The corrected full journey passed independently.
- Original failure logs/captures remain under `/tmp/alive-launch-parent-*` and
  `/tmp/alive-launch-quantization/`; they were not overwritten by passing runs.

## Supported Limits And Controller Decisions

| Decision | Reason | Cost if wrong |
| --- | --- | --- |
| Keep the old ABI proof and resource ceilings; separately admit fine grids with one batch per rolling 1024 frames, sharing Start/Seek credit | Bounds arbitrary actions without expanding the timeline | An incorrect proof risks excess callback work; runtime guards, scalar oracles and independent review qualify it |
| Use `min(2, width - 1)` extra interior cuts | Same-sample changes coalesce; v3 bar zero gives `K(width) >= 1` even on silent tracks, and v4 charges its initial transition | Under-counting would invalidate admission; retained independent scalar regressions cover narrow windows |
| Preserve the full original MIDI Arrangement example and explicitly refuse its additive capability | Its augmented event bound is 72 against the unchanged ceiling of 64 | Fine-grid support can be more restrictive than necessary; the separate sparse demo provides an admitted workflow |
| Prune overrides at structural ownership changes, preserving metadata through temporary preparation projections | Generic pruning in `with_score` could lose valid occurrence settings | Incorrect ownership would orphan or erase settings; copy/delete/track-removal/history tests cover the boundary |
| Allow explicit 1 Bar recovery while retaining unsupported saved intent | A missing library or refused preparation must not trap the project | Incorrect recovery could permit an unsupported request; native checks still refuse unsupported effective grids |

At 48 kHz, 1024 frames is about 21.3 ms. Refused batches are not automatically
retried, and prior playback/pending actions remain intact. A scene is atomic.
The unchanged `midi-arrangement.alive` preserves original bar playback but
refuses the additive capability; use `apps/alive/examples/quantized-midi.alive`
to exercise the admitted fine-grid workflow.

## Reproduce

Build the current native engine and both app packages using the normal local
build tooling, or the task-owned commands in the worker report. The manifest
records [source and local artifact hashes](source-build-manifest.json). These
debug binaries are not release packages; the unchanged core archive is an
explicit reused input.

```sh
node --test apps/ultra/ui/*.test.mjs
ULTRA_NATIVE_LIB_DIR=/tmp/alive-launch-quantization cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib --no-run
# Use the test executable printed by Cargo; its hash suffix is build-specific.
LD_LIBRARY_PATH=/tmp/alive-launch-quantization apps/ultra/src-tauri/target/debug/deps/ultra_desktop-6951be0eecdd253e session:: --test-threads=1
ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_BINARY=/tmp/alive-launch-quantization/alive ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/quantized-midi.alive" ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_launch_desktop.py" bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-launch-rerun
```

From `apps/ultra/tests/ci`, run the local browser suite:

```sh
ALIVE_TEST_PORT=4186 npx --no-install playwright test alive-chain.spec.mjs --output=/tmp/alive-launch-browser-rerun
```

No cloud CI was dispatched for this feature. Ordinary pushes and PR updates
remain opt-in; desktop release builds run manually or on version tags.

## Remaining Qualification

The existing broad desktop Arrangement Return-gap and hosted Cutoff automation
observations remain open, with their original assertions and timeouts intact.
This focused private software-audio journey does not qualify physical audio
latency, hardware underruns or broad Phase 2 endurance.

Typed MIDI/audio creation, WAV playback and live recording/routing remain
later implementation stages. The [shared silent-video design](../../docs/superpowers/specs/2026-10-31-alive-ultra-shared-video-design.md)
is a proposed architecture; no video backend or playback implementation is
included in Stage 1.
