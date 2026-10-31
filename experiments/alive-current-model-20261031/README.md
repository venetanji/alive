# Current Session Model Cleanup

The active app now uses a v6 saved envelope with one v4 MIDI/audio workspace
score. Prior Alive session decoders, conversion commands, draft Apply/Discard,
old document modes and the `ultra --alive` entrypoint were removed. This is an
intentional format break for the experimental application; no migration is
provided. Historical experiment packets retain their original attribution.

Current behavior remains immediate musical publication, typed tracks, MIDI/WAV
clips, independent occurrence/Arrangement loops, launch quantization, Preview,
shared device ownership and bounded Undo history. Bundled examples and active
packaging/staging/desktop tests use the current format directly.

The two-instrument demo is deliberately reauthored as eight Pulse dyad notes and
four Harmony melody notes, retaining its timing, tempo and automation. Its old
simultaneous triads exceeded the current native workspace envelope (40 observed
events against the 32/frame bound). No admission limit was raised and no user
document was converted or trimmed.

## Workspace Boundaries

Source worktree: `/home/venetanji/.codex/worktrees/phase2-ui/alive`.
Baseline: `66c199db24b9f3d5d9794108958d8b5c6a98aaac`.
It was clean before this task. The main `/home/venetanji/Work/alive` checkout
belongs to concurrent native Live device work; at audit it had six modified
research-result files and 138 untracked items. Those were not cleaned or edited.

The native C++ implementation is unchanged. Verification uses the frozen
`/tmp/alive-live-publish-native-20261031/libultra_native.so`, SHA-256
`69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`.
Rust uses the owned on-disk target reached through
`/tmp/alive-live-regions-rust-target`. Shared developer-library symlinks remain
untouched. The concurrent native Live DLL experiment is not bundled here.

## Verification Commands

```sh
node --test apps/ultra/ui/alive*.test.mjs
python3 -m unittest discover -s apps/ultra/scripts -p test_release.py
python3 -m unittest discover -s apps/ultra/tests -p 'test_*.py'
cd apps/ultra/tests/ci
ALIVE_TEST_PORT=4287 ./node_modules/.bin/playwright test \
  --config playwright.config.mjs alive-chain.spec.mjs alive-clip-regions.spec.mjs
```

From the repository root, verify a standalone installation with its own native
library and resources (set `ULTRA_TEST_ALIVE_BINARY` to the installed path):

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 \
  ULTRA_TEST_ALIVE_BINARY=/path/to/build/bin/alive \
  ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/empty-workspaces.alive" \
  ULTRA_TEST_SCRIPT="$PWD/experiments/alive-current-model-20261031/verify_installed.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-installed-verification
```

Rust tests must load the same frozen native library as the application. The
actual desktop journey uses its own display, application bus and software audio
server. It does not qualify physical output or close user windows. CI remains
manual; no cloud run is dispatched for this cleanup.

## Verified Results

| Check | Result | Evidence |
| --- | --- | --- |
| Alive Node model/DOM tests | 141 passed | `logs/node.log` |
| Rust library tests | 268 passed, 4 existing ignored | `logs/rust.log` |
| Python harness/helper tests | 121 passed | `logs/python.log` |
| Release packaging tests | 20 passed | `logs/release.log` |
| Chromium workspace/chain/region suite | 83 passed | `/tmp/alive-current-browser-final.log` |
| Responsive browser captures | 2 capture journeys passed; no page errors or whole-window overflow | `captures/`, `/tmp/alive-current-ui-review/captures.log` |
| Separate Alive and Ultra Cargo builds | Both passed | `/tmp/alive-current-cleanup-build-comment.log` |
| Standalone default session and bundled instrument | Passed through actual controls and native chooser | `reports/installed-report.json` |
| Actual MIDI Preview, rolling edits, Undo/Redo, save/reopen | Passed; nonzero Preview PCM, zero stream errors | `reports/midi-report.json` |
| Actual MIDI/audio regions, rolling track/clip creation, Arrangement loop, save/reopen | Passed; independent 330/550 Hz stereo PCM, zero stream errors or rejected commands | `reports/regions-report.json` |
| Core desktop checks in three scoped phases | Audio settings, reorder/bypass, hosted editors, history/save, dependency failures, removal, dirty guards and terminal Quit passed | `reports/native-session-report.json` |
| Installed build and launcher | Final-path smoke and mapped desktop window passed | `reports/installed-report.json`, `reports/launcher-verification.json` |

The responsive captures cover Session, Arrangement and expanded Detail at
800x600 and 1440x900. Resizing Detail in Arrangement retains a 96px timeline
below its toolbar and Master strip; explicit Maximize/Restore is separate.

The standalone smoke confirms the running executable and mapped native library
belong to the package directory. It loads Subtractive through the browser and
saves its reference inside `lib/Alive/alive-session/ultra/examples`, proving the
installed resource lookup does not depend on the source checkout.
Release configuration explicitly includes every device in the browser catalog;
its regression rejects a missing stereo-lowpass resource for every target and
both products.

Independent current-model review found and corrected a Preview admission
regression: musical publication and note Preview now check their own native
capabilities. Final review has no remaining correctness findings. Current
regressions retain native queue ownership, retirement, changed-source recovery,
failed-edit transactionality, atomic save and queued UI identity protection.

The broad core checks use three explicit evidence phases: stopped chain and
audio preflight (`core-desktop-r6`), live editor/history/save/reopen
(`core-desktop-resume3`), and the saved-file/dependency/removal/dirty-guard/Quit
tail (`core-desktop-tail2`). The final tail exits 0, captures 52.373 seconds of
nonzero software PCM and reports zero stream errors or rejected commands.
This is scoped coverage; no uninterrupted broad-core or endurance pass is
claimed. Test fixes await the exact acknowledged Undo/Redo values, navigate
current disclosures and read diagnostic output titles only where the UI
explicitly mirrors its current value into that accessibility description.

## Candidate Identity

The source-build manifest records 238 source files. A final rebuild after a
comment-only cleanup produced byte-identical executables to those used by the
standalone MIDI/regions journeys:

| Artifact | SHA-256 |
| --- | --- |
| `bin/alive` | `b3869e5375c8c985f7f4d01682739d0275225042ae403f79c9852bb822a71a75` |
| `bin/ultra` | `1ca7a7879b2bf90406924ec1978807f5c62e386dff6a04b3779bf36e3beabe64` |
| `bin/libultra_native.so` | `69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90` |

## Installed Launcher

Production source commit: `da5901f89076fd50c5f6a6cba1782e851a37d7c8`.
Installed build: `/home/venetanji/.local/share/alive/builds/da5901f`.
The manifest in that directory records the source commit, all 238 source hashes
and all three artifact hashes. The subsequent receipt commit changes only this
evidence packet and the task checklist.

`Alive (Test)` uses the validated desktop entry
`~/.local/share/applications/org.alive.session.test.desktop`. Its Exec selects
the installed Alive binary with `LD_LIBRARY_PATH` removed, and its icon and
working directory select the same versioned build. The previous entry is backed
up inside the installed directory. The Ultra launcher is untouched.

Final activation used `gtk-launch org.alive.session.test` in a transient user
service with `ExitType=cgroup`, retaining the application after the command
session ends. The running executable and mapped native library match this build;
its mapped window occupies workspace 7 at 1176x629. Other user windows, including
the native Analog experiment, remain open. No persistent desktop configuration
or shared developer-library link changed.

This packet validates Linux with software audio capture. It does not qualify
physical microphone/output devices, macOS/Windows packaging, or the separate
native Ableton DLL experiment. Existing work limits remain enforced.

The shared-owner clip harness uses Pulse instrument + Utility and an
instrumentless Harmony MIDI track + Utility, preserving two owners of the same
external effect source within three DSP roots. The old four-root composition
refused at observed 20 / limit 18. The authored fixture passes native admission,
buffer-partition equality and stereo rendering (peak 0.377297); the generic
offline probe later stops at its two-instrument-only assertion. This is not a
full probe or clip-wrapper GUI pass. Measured WAV identity and the explicit
partial-probe result are in `reports/clips-admission-render.json` and
`reports/clips-partial-probe.json`. Fixture preservation has isolated unit
coverage. Full clip/observability wrappers and the broad Arrangement Return-gap
and hosted Cutoff automation observations retain their existing qualification
gaps; see `docs/PHASE2_HANDOFF.md`.
