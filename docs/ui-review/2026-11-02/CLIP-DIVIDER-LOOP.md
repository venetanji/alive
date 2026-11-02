# Clip Expansion And Native Loop Display

The later [Clip options and lower-area collapse correction](CLIP-OPTIONS.md)
supersedes this report's Clip header, adaptive option layout and launcher
selection. The loop observation and acceptance limitations here remain relevant.

Application/test source: `58eb6829e6bfbf515564a4532f5804d01b9e9d17`, following
`9bbae1020c73a1f322ce1dc9c1fb9529691a89b3`, relative to the preceding report
commit `ad40d7d4132addef435a5e11b5d0452b671f5b36`.
Acceptance-helper alignment: `8c9b39f72346c1ea0db0475cdf7da5ae9f412e1f`.
That commit changes four helpers, not the compiled application source.
Branch: `audit/pr12-native-20261102`; checkout:
`/tmp/alive-pr12-native-20261102`. The unrelated research checkout is preserved.

This report supersedes the compact Clip scrolling and retained upper-context
rules in [PANEL-CORRECTIONS.md](PANEL-CORRECTIONS.md), following the user's
later screenshots and explicit clarification. It does not broaden engine,
device, routing, recording or transport capabilities.

## Result

- Clip and Devices remain independent. Both open places full-width Clip above
  the fixed Help-left / Devices-right row, with a 5 px separator matching the
  separator above Clip. Help remains 231 px wide; Devices remains 190 px high.
- Clip has a 224 px minimum and no outer scrollbar. Its properties retain their
  own scrolling; the piano roll and velocity lane fit inside the allocation.
  Horizontal, Vertical and Automatic layouts remain available.
- Dragging Clip to the top, keyboard End or Maximize covers the entire upper
  workspace, including Browser. Restore returns to the prior ordinary height.
  Pointer cancellation and unfinished drafts retain their existing ownership.
- A compressed Session hides its track and Master mixer elements. When enough
  space returns, the complete mixers return. Their required minimum does not
  depend on their temporarily hidden state. Clip banks retain vertical scrolling
  and tracks retain horizontal scrolling when those controls are visible.
- Transport buttons center their icons; compact selects use the same bounded
  arrow/padding treatment already qualified for the Clip select. Nudge Up/Down
  now have distinct icons and remain unavailable. Small-width rules still hide
  optional controls. Track menus scroll within the available upper workspace.
- The former receipt disclosure above each mixer is replaced by a passive loop
  disc and beat length. Existing Stop and Return buttons keep their handlers and
  accessible names. Receipt/authority details remain in contextual Help and the
  accessible track runtime output; there is no floating receipt popup.

## Native Observation Contract

`alive-model.mjs:clipPlayback` projects the existing native source phase and
installed Slot/Placement frame region. Track, source, occurrence and preparation
identities must match. Canonical frame strings are validated and phase arithmetic
uses BigInt before a bounded presentation ratio is calculated. Missing, stale or
invalid data clears the strip. The presentation handles an intro before the loop,
Start inside a loop and a one-shot region separately.

The disc's colour follows native playing/cued state; its needle changes only
when an accepted native phase changes. It has no renderer playback timer or
interpolation. Its beat length uses the installed frame span at the accepted
tempo and the existing 48 kHz clock contract.

Completed play count remains `--`. Native phase wraps at the loop boundary in
`alive_session_workspaces.hpp`; `runtime_workspaces.rs` exports source position,
not unwrapped elapsed plays. Neither polling nor track epoch proves a completed
play count. No count is synthesized from time or observed wraps.

[CAPABILITIES.json](CAPABILITIES.json) records two separate entries: the wired
native loop display and the missing completed-play-count contract. The latter
needs explicit reset/lifecycle/overflow semantics and native tests before an
engine change is proposed. No native, Rust host, DSP or persistence source
changes in this batch.

## Matching Launchers

Both **Alive (Test)** and **Ultra (Latest Build)** select
`/home/venetanji/.local/share/alive/builds/test-3ed29c6aa405049d4d06` through
`/home/venetanji/.local/share/alive/current-test`. Both debug binaries were rebuilt
sequentially from the application source above with system Cargo/Rust 1.99.1,
`cargo build --locked -j 2`, the shared target directory and matching native
library. Four pre-existing Ultra library warnings remain.

The artifact [manifest](evidence/clip-divider/source-build-manifest.json) records
the supplied compilation commit separately from checkout context. Subsequent
report/probe/evidence commits do not change the application. Existing windows
retain their prior build; reopen to use this selection. Prior snapshots remain.

| Artifact | SHA-256 |
| --- | --- |
| `bin/alive` | `db249e2fc2793e5c56f7c5dab9fdad4ae86a658bc1c86833b5b7e1de87fbecbe` |
| `bin/ultra` | `129c4105400ab058c326631e2fad1a130279f84b0e88d96e701632105f65b031` |
| `bin/libultra_native.so` | `1652d52c581395a9919ea2dbe5a03c4d365c7f9a4da6d10cff233e590099eaa8` |

## Verification

Final results, artifact hashes, captures and reproducible commands are recorded
in [verification.json](evidence/clip-divider/verification.json), the bounded logs
and [native probe](evidence/clip-divider/native-panel-probe.py).

| Software check | Result |
| --- | --- |
| Full sandboxed Chromium, including shared Ultra | 351 passed, 0 failed, 0 skipped; retries disabled |
| Full Node UI/controller/component suite | 673 passed, 0 failed, 0 skipped |
| Python helper discovery (`test_*.py`) | 145 passed, 0 failed, 0 skipped |
| Adjacent menu, target, draft, toolbar and panel checks | 21 passed |
| Final whole-mixer and panel regression group | 16 passed; whole-mixer bounds failed before the fix |
| Both locked Cargo builds | Passed; four existing Ultra library warnings |
| Selected artifact hashes and desktop entries | All hashes match; both desktop files validate |
| Actual Alive and Ultra desktop-entry launches | Passed; exact selected executable and native library, without an `LD_LIBRARY_PATH` override |
| Native panel/resize/restore checks | Passed at 800x600, 1280x800 and 1440x900 for both apps |
| Brief native loop observation and track Stop | Passed; four changing positions, 8-beat loop, then Session silence and cleared disc |
| Application source since the recorded source commit | Unchanged |
| New remote CI, Rust unit tests, full native audio journeys and CPAL loopback | Unrun for this UI batch |
| Physical hardware and recording | Unrun |

The Clip separation/full-height, loop-strip and invalid-region regressions each
failed before their correction. Whole-mixer bounds also failed at 1280 before
fixing the hidden-state minimum calculation. The final tests retain native-target,
draft, keyboard, rejected-edit and shared Ultra assertions. Tests of ordinary
size memory use a normal resized height; End has separate full-maximize coverage.

Exploratory runs remain failures or interruptions. The first full run had 334
passes and 17 failures; an adjacent run had 17 passes and 2 failures. Obsolete
size assumptions and real toolbar/menu/minimum regressions were corrected. Two
later full runs were interrupted before completion. They are not final passes.
An incorrectly scoped Python discovery of standalone `check_*.py` drivers was
interrupted; only the completed `test_*.py` helper run counts as helper evidence.

The first native probe attempts selected the always-visible toolbar button named
Session workspace when checking the hidden workspace region. Captures showed
the correct full-height layout. The final probe uses unique track-header and
Browser targets, actual component geometry and fresh accessibility state.

An earlier playback probe omitted an explicit Running precondition and observed
no playing loop. Its cleanup was interrupted while looking for an unavailable
Stop Audio control. The final probe requests the private sink's advertised
512-frame buffer, observes Running, then starts playback with the existing 1 Bar
launch setting. An attempted None selection was removed because fine launch
grids are unavailable for this fixture. These earlier attempts are not passes.

The completed native probe observes an 8-beat loop at 5, 24, 37 and 46 percent.
Track Stop reaches its own native target, observes Session silence and clears
the disc. Save through File receives an acknowledgement and changes a private
staged file. Ultra initial and secondary file delivery pass. Transport and the
private software audio stream are stopped afterward. Raw native artifacts are
in `/tmp/alive-clip-divider-native-58eb682-v3`.

Reproduce the bounded native probe from this checkout:

```sh
env ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 \
  ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/current-test/bin/alive \
  ULTRA_TEST_SCREEN_SIZE=1600x1000 \
  ULTRA_TEST_SCRIPT="$PWD/docs/ui-review/2026-11-02/evidence/clip-divider/native-panel-probe.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh --software-audio \
  /tmp/alive-clip-divider-native-58eb682-v3
```

The acceptance-helper alignment removes attempts to open the replaced runtime
disclosure. Runtime reads are passive; owned disclosure/input-failure probes use
the existing Source / Clip control. The passive-read regression failed before
correction and the complete helper suite passes. The exact four-file inventory
is [changed-helper-files.txt](evidence/clip-divider/changed-helper-files.txt).
Full modified Arrangement and clip-observation native journeys remain unrun;
their Return, pending/applied, rejection and Quit expectations are retained.

## Screenshots

The Chromium captures use the current application source and controlled native
observation fixtures. They qualify visual/state handling, not physical audio.

| Current Chromium view | 800x600 | 1280x800 | 1440x900 |
| --- | --- | --- | --- |
| Clip above fixed Help / Devices | [Capture](evidence/clip-divider/chromium-stacked-800.png) | [Capture](evidence/clip-divider/chromium-stacked-1280.png) | [Capture](evidence/clip-divider/chromium-stacked-1440.png) |
| Clip covering the upper workspace | [Capture](evidence/clip-divider/chromium-expanded-800.png) | [Capture](evidence/clip-divider/chromium-expanded-1280.png) | [Capture](evidence/clip-divider/chromium-expanded-1440.png) |
| Empty slot with both panels | [Capture](evidence/clip-divider/chromium-empty-800.png) | [Capture](evidence/clip-divider/chromium-empty-1280.png) | [Capture](evidence/clip-divider/chromium-empty-1440.png) |

The [loop-strip fixture capture](evidence/clip-divider/chromium-loop-strip.png)
shows a quarter-position disc and a four-beat installed loop; its count remains
unavailable.

The following captures come from the actual selected native desktop entries.
All three viewport sizes and the native playback capture were visually inspected.

| Current native view | 800x600 | 1280x800 | 1440x900 |
| --- | --- | --- | --- |
| Clip above fixed Help / Devices | [Capture](evidence/clip-divider/alive-stacked-800x600.png) | [Capture](evidence/clip-divider/alive-stacked-1280x800.png) | [Capture](evidence/clip-divider/alive-stacked-1440x900.png) |
| Clip covering the upper workspace | [Capture](evidence/clip-divider/alive-both-800x600.png) | [Capture](evidence/clip-divider/alive-both-1280x800.png) | [Capture](evidence/clip-divider/alive-both-1440x900.png) |
| Matching Ultra launcher | [Capture](evidence/clip-divider/ultra-launcher-800x600.png) | [Capture](evidence/clip-divider/ultra-launcher-1280x800.png) | [Capture](evidence/clip-divider/ultra-launcher-1440x900.png) |

[Native playback capture](evidence/clip-divider/alive-native-loop-playing-1440x900.png)
shows the observed loop disc and 8-beat length. Its count remains unavailable.

## Acceptance Still Open

The brief native playback observation in this batch uses private Xvfb/DBus and
software-only PipeWire, with its advertised 512-frame buffer explicitly requested
and the existing 1 Bar launch setting. Broad quantized admission remains a separate
acceptance gate. No physical
devices, user audio settings or recording are involved. It does not qualify
audio output, quantized launches, resource bounds or CPAL loopback.

No new remote CI was dispatched for this local UI correction. Last recorded
manual run: [41381006275](https://github.com/venetanji/alive/actions/runs/41381006275),
at `c8f4cb3091b9754fa5c94e8a40718e72954aab14`, overall failed. Arrangement Return
through save/restart and Master passed there; the separate desktop journey failed
at the first live-fixture Save As target with an unexpected hosted editor. The
causal dispatch remains unresolved. Clip observation, saved-clip measurement,
resource bounds and CPAL loopback were skipped in that run.

Current full native audio journeys, loopback and physical hardware qualification
remain open. The broader roadmap stays in [CONTINUATION-PLAN.md](CONTINUATION-PLAN.md).
No merge, release, deployment, security bypass or engine expansion occurred.
