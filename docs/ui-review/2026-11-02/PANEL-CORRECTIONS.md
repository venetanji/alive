# Independent Rows And Panel Behavior

This correction implements the user's November 2 clarification: Browser and
Session/Arrangement share the upper row; Help and the editors occupy the lower
area. It supersedes the panel dimensions and screenshots in `HTML-FIDELITY.md`.
The approved HTML remains the visual reference; native capabilities, real
project contents and the user's later layout clarifications remain authoritative.

## Scope And Ownership

Starting commit: `9ca347abd172efa70f189d82520c9fb8aa647c37`, branch
`audit/pr12-native-20261102`, checkout `/tmp/alive-pr12-native-20261102`.
The separate dirty research checkout is preserved. No engine, DSP, Rust host,
device contract, recording, routing or automatic CI behavior changes.

| Owner | Result |
| --- | --- |
| `alive-shell.css`, `alive-workspace.mjs` | Browser and Session/Arrangement are flex siblings in the upper row. Browser drag below 180 collapses it; reverse drag reopens it; Escape/pointer cancellation restores its initial state; reopening preserves useful width. |
| `alive-ui-contract.css`, `alive-workspace.mjs` | Help has an independent fixed 231 px width. Devices restores its fixed 190 px row. Clip normally has a 224 px minimum, with a compact stacked fallback to retain the pinned upper mixer at 800x600. |
| `alive-clip-view.mjs`, `alive-piano.css`, `alive-ui-contract.css` | Clip fills its allocation without reserved inspector bands. Automatic/Horizontal/Vertical layout choices reuse mounted fields. Note and Automation remain real disclosures in the heading; long Note tables scroll inside their popup. MIDI Note inspector stays hidden for audio/empty clips. |
| `alive-info.mjs`, `creative-info.mjs` | Alive migrates recurring descriptions into contextual Help and removes floating tooltip titles. Shared Ultra Help keeps its existing default behavior. |
| `alive.mjs`, `alive-session-layout.css` | Gain readouts use dB; meters map existing native amplitude observations to a -60..0 dB scale with separate L/R lanes. Native linear gain fields, bounds, acknowledgement and history ownership are retained. |
| `alive.mjs`, `alive-browser.mjs`, `alive-timeline.mjs`, `alive-clip-view.mjs` | Action chrome uses original SVG icons and accessible names. Track/source identity, property labels, field values and menu commands remain meaningful text. |

Clip and Devices remain independent. Both open places full-width Clip above
Help-left / Devices-right. Help remains independently visible with both editors
closed. Maximize retains at least 96 px of upper track context and parks the
hidden mixer's unfinished draft until restore. Ordinary panel navigation,
hover and focus do not publish musical commands.

The [static Live code evidence](LIVE-UI-CODE-EVIDENCE.md) supports the 231/190/224
internal dimensions, with explicit limits on virtual-bound interpretation and
display scaling. Exact Live Browser hysteresis, automatic Clip orientation
threshold and fader taper remain unresolved. Alive's 180 px Browser collapse,
360 px automatic orientation and compact stacked fallback are its own rules.
No exact behavioral parity is claimed for those thresholds.

## Verification

Final application/test/probe source: `06f6ffa61153ce1a2dcc295a7d1ce07921acd8fa`.
Both debug executables include this source, built with system Rust/Cargo 1.99.1
and `cargo build --locked -j 2` using the shared target directory. The installer
records this supplied compilation commit separately from its tracked-clean
checkout context. Later documentation/evidence commits do not alter these apps.

Both **Alive (Test)** and **Ultra (Latest Build)** select snapshot
`test-c65c6268a66672448950` through
`/home/venetanji/.local/share/alive/current-test`. Reopen existing windows to use
this selection. Previous snapshots remain intact.

| Final check | Result |
| --- | --- |
| Full sandboxed Chromium suite, including shared Ultra | 343 passed, 0 failed, 0 skipped; retries disabled |
| Full Node UI/controller/component suite | 669 passed, 0 failed, 0 skipped |
| Python helper discovery | 144 passed, 0 failed, 0 skipped |
| Native WebKit compact option rendering regression | 1 passed |
| Focused final review regressions | 3 passed; long Note popup, audio/empty inspector visibility, compact dB/pan spacing |
| Both Cargo builds | Passed; four pre-existing Ultra library warnings remain |
| Both installed desktop entries and snapshot hashes | Validated; selected artifacts match the manifest |
| Actual desktop launches, running executable/library hashes and three-size resize/restore | Passed for both Alive and Ultra; no `LD_LIBRARY_PATH` override |
| Native panel, Browser collapse/cancel/reopen, layout modes, drafts and keyboard/focus | Passed; shrink/restore repeated at 800x600 and 1440x900 |
| Save through File menu | Passed; native acknowledgement and private staged-file write observed |
| Ultra startup and secondary file delivery | Passed; 32 repeated deliveries, initial main window preserved |
| Final screenshot inspection | Actual Alive and Ultra native windows inspected at all three sizes; expanded and horizontal Clip inspected |
| Source isolation and whitespace | Passed; application source unchanged since the tested source commit |
| New remote CI / Rust unit tests / full native audio journeys / CPAL loopback | Unrun for this local UI batch |
| Physical hardware, device settings, recording | Unrun; no audio started by the panel probe |

The long Note table, audio/empty inspector and compact dB spacing regressions
each reproduced a failure before their final correction. Their bounded red
logs and focused green result are retained alongside the final full suite.
Earlier exploratory runs include an adjacent 201-pass/9-fail run and a full
331-pass/10-fail run; those are superseded by the final 343-pass run. Their
raw logs remain `/tmp/alive-panel-adjacent.log` and `/tmp/alive-panel-full.log`.

Full browser raw output: `/tmp/alive-panel-verified/` and
`/tmp/alive-panel-verified.log`. Bounded logs, build logs, the exact 18-file
[source inventory](evidence/panel-corrections/changed-source-files.txt), captures
and launcher evidence are retained in
[`evidence/panel-corrections/`](evidence/panel-corrections/).
The [verification manifest](evidence/panel-corrections/verification.json),
[runtime launcher results](evidence/panel-corrections/native-shell-results.json)
and [artifact manifest](evidence/panel-corrections/source-build-manifest.json)
record the matching final source and snapshot. Native raw output remains at
`/tmp/alive-panel-native-06f6ffa/` and `/tmp/alive-panel-native-06f6ffa.log`.

| Artifact | SHA-256 |
| --- | --- |
| `bin/alive` | `f87afbd247db8f58c0262fd59f5206963224e5d5b9a3b2dc196ec21658498482` |
| `bin/ultra` | `b094f0d5340bb81dc26c296bd9f838ce8c2af952f51a813479c0a18b8cb9c3eb` |
| `bin/libultra_native.so` | `1652d52c581395a9919ea2dbe5a03c4d365c7f9a4da6d10cff233e590099eaa8` |

Native command, using only a private display and software audio services:

```sh
env ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 \
  ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/current-test/bin/alive \
  ULTRA_TEST_SCREEN_SIZE=1600x1000 \
  ULTRA_TEST_SCRIPT="$PWD/docs/ui-review/2026-11-02/evidence/panel-corrections/native-panel-probe.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh --software-audio /tmp/alive-panel-native-06f6ffa
```

Uncovered details: no dedicated `pointercancel` regression beyond Escape/native
drag cancellation, and no new meter endpoint calibration for silence/-60 dB or
clipping. The exact Live fader taper and UI scaling remain unqualified. At
800x600 with both editors open, Clip contents scroll within its compact
allocation while the upper mixer and fixed Help/Devices row remain available.

## Screenshots

The retained Chromium captures show the default simultaneous panels at
[800x600](evidence/panel-corrections/chromium-both-800.png),
[1280x800](evidence/panel-corrections/chromium-both-1280.png) and
[1440x900](evidence/panel-corrections/chromium-both-1440.png), plus
[vertical Clip](evidence/panel-corrections/chromium-clip-vertical.png) and
[expanded Clip with track context](evidence/panel-corrections/chromium-clip-expanded.png).

| Actual selected native build | 800x600 | 1280x800 | 1440x900 |
| --- | --- | --- | --- |
| Clip above Help / Devices after resizing | [Capture](evidence/panel-corrections/alive-both-800x600.png) | [Capture](evidence/panel-corrections/alive-both-1280x800.png) | [Capture](evidence/panel-corrections/alive-both-1440x900.png) |
| Devices-only fixed row | [Capture](evidence/panel-corrections/alive-devices-800x600.png) | [Capture](evidence/panel-corrections/alive-devices-1280x800.png) | [Capture](evidence/panel-corrections/alive-devices-1440x900.png) |
| Help with both editors closed | [Capture](evidence/panel-corrections/alive-help-without-editors-800x600.png) | [Capture](evidence/panel-corrections/alive-help-without-editors-1280x800.png) | [Capture](evidence/panel-corrections/alive-help-without-editors-1440x900.png) |
| Ultra launcher | [Capture](evidence/panel-corrections/ultra-launcher-800x600.png) | [Capture](evidence/panel-corrections/ultra-launcher-1280x800.png) | [Capture](evidence/panel-corrections/ultra-launcher-1440x900.png) |

Additional native captures: [expanded Clip](evidence/panel-corrections/alive-expanded-1440x900.png),
[horizontal Clip](evidence/panel-corrections/alive-horizontal-1440x900.png) and
[Display menu](evidence/panel-corrections/alive-display-menu-1440x900.png).
The isolated native Browser accurately reports the absent private user library;
available catalog items load. Launch-grid admission errors remain visible for
the staged fixture. No missing capability or meter activity is synthesized.

## Acceptance Still Open

No new remote CI has run for this local presentation batch. The last recorded
manual run remains [41381006275](https://github.com/venetanji/alive/actions/runs/41381006275),
at `c8f4cb3091b9754fa5c94e8a40718e72954aab14`, overall failed. Arrangement Return
through save/restart and Master passed there. The separate desktop journey
failed at its first live-fixture Save As with an unexpected hosted editor;
causal dispatch remains unresolved. Downstream clip observation, saved-clip
measurements, resource bounds and CPAL loopback were skipped in that run.

This panel/launcher probe starts no audio. Full current-build audio journeys,
loopback and physical hardware qualification remain unrun. Browser/software
display checks do not replace those gates. Broader work remains ordered by
`CONTINUATION-PLAN.md` and `CAPABILITIES.json`; no new capability is promoted by
this visual correction. No merge, release, deployment or security bypass occurs.
