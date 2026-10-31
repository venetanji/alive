# Saved Presentation Installed Checkpoint

Reviewed Tasks 1/2 are installed from product source
`9ced05eb38e0620865e4c9401646657669c1f6ae` at
`/home/venetanji/.local/share/alive/builds/9ced05e`. This source is accepted
Task 2 fix head `1b6cb68` plus the independently approved two-value Ultra native
minimum correction. The later commit containing this packet adds acceptance
helpers/evidence/documentation only; it is not the binary source commit.

The scoped installed acceptance passes using three explicit receipts:

- `reports/final-9ced05e/device-drop-report.json`: actual browser-to-track
  Subtractive drag, two ordered effects, immediate clip/note creation, native
  save, scheduled playback and finite nonzero software PCM. Stream errors and
  rejected commands are zero. The exact installed executable maps its adjacent
  frozen library.
- `reports/final-9ced05e/alive-surface-report.json`: same-source independent
  instances retain accepted values and an unfinished empty number field across
  navigation. Actual XTest number input accepts 23 and 47; an actual saved dial
  keyboard gesture changes only the first instance to 122.99. Saved session
  comparisons verify both accepted values and unchanged other parameters.
  Actual 800x600 and 1280x800 layouts retain readable ownership and contained
  scrolling. Opening/closing the real hosted editor preserves playback.
- `reports/final-9ced05e/ultra-surface-report.json`: the separate installed Ultra
  follow-up exits 0 at both exact native sizes. Its observed seven sliders match
  the installed 640x112 saved presentation, with no automatic keyboard. Repeated
  native Shift+wheel in the blank saved top gutter reveals each end while chrome
  stays fixed and parameter values remain unchanged. Closing/reopening Perform
  retains its source value. Executable/library hashes match the final manifest.

`reports/final-9ced05e/combined-verification.json` cross-checks all three against
the final manifest. The initial final saved-surface process exited nonzero after
the passing Alive checks because its Ultra wheel target moved outside the
viewport. The separate follow-up completes Ultra acceptance without rerunning
passing browser/drop/Alive checks. Neither that process nor earlier exploratory
attempts are mislabeled as wholly passing. See `attempts/README.md` and retained
logs/diagnostics.

## Source And Install Identity

`build/final-9ced05e/` contains the unchanged prepared runner, both build logs,
archive verification, source-build manifest, installation verification and
explicit resource-map verification. All 8,759 tracked blobs match the complete
fixed git archive before and after both locked development-profile Tauri builds.
All 330 selected build-source hashes, all 14 explicit resources across product
directories `Alive` and `Ultra Research`, executable/native hashes, icon and
installed manifest verify. Both binaries actually map their adjacent native
library. No frozen native compilation occurs.

The raw manifest's inherited `runtime_native_dir` records the frozen build-library
input `/tmp/alive-live-publish-native-20261031`. The accepted runtime receipts,
rather than that field, prove each process maps the adjacent installed
`bin/libultra_native.so` with the frozen hash. The raw manifests remain unchanged.

| Artifact | SHA-256 |
| --- | --- |
| `bin/alive` | `fef9b441bfa142d8492fd4425dd55b1699db1a355909f8413da76a34610e569c` |
| `bin/ultra` | `eeb76c2758bb4a9233fb80b2250e5d354a82397569f6d772496b661a250fed78` |
| `bin/libultra_native.so` | `69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90` |

The final run is
`/home/venetanji/.cache/alive-verification/presentation-publish-compact-fwkhm2op`.
The earlier complete `1b6cb68` archive/install remains intact; its build packet is
in `build/initial-1b6cb68/`. The initial `/tmp` quota failure and owned-output
recovery are documented in `build/archive-recovery.md`. Both previous installs
and both launcher byte sequences were checked unchanged in
`reports/final-9ced05e/preserved-install-and-launchers.json`.

## Commands And Local Outputs

Run from `/home/venetanji/.codex/worktrees/phase2-ui/alive`:

```bash
python /home/venetanji/.cache/alive-verification/presentation-publish-compact-fwkhm2op/build_install.py 9ced05eb38e0620865e4c9401646657669c1f6ae
python experiments/alive-presentation-checkpoint-20261031/verify-install.py /home/venetanji/.cache/alive-verification/presentation-publish-compact-fwkhm2op /home/venetanji/.local/share/alive/builds/9ced05e
bash experiments/alive-presentation-checkpoint-20261031/reproduce-installed.sh /home/venetanji/.local/share/alive/builds/9ced05e /home/venetanji/.cache/alive-verification/presentation-installed-final-9ced05e
```

The immutable build runner refuses to overwrite an existing version directory;
the first command records the build already performed. The reproduction helper
requires a fresh output directory and retains the supplied canonical fingerprint
when staging actual installed resources. Its initial final run passed drop and
Alive, then exposed the Ultra scroll-target issue retained in
`logs/final-surface-initial.log`. After correcting only the helper, the passing
Ultra follow-up command was:

```bash
ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 ALIVE_PRESENTATION_ULTRA_ONLY=1 \
ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/builds/9ced05e/bin/alive \
ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_saved_presentation_desktop.py \
bash apps/ultra/tests/check_canvas_desktop.sh /home/venetanji/.cache/alive-verification/presentation-installed-final-ultra-9ced05e-3
python experiments/alive-presentation-checkpoint-20261031/verify-receipts.py
```

Final native outputs and raw PCM remain local in
`/home/venetanji/.cache/alive-verification/presentation-installed-final-9ced05e/`.
Ultra follow-up outputs remain in the separate `...final-ultra-9ced05e-3/` root.
Final selected screenshots are in `captures/final-9ced05e/`; they include actual
Alive and Ultra start/end scroll views at both sizes, independent unfinished
field, hosted editor while playing, and editor closed with transport/diagnostics.
All are unmodified private-desktop captures; a smaller foreground Ultra window
may show the owned test Alive window behind it. No user windows are involved.

## Software Audio

| Journey | Frames / Seconds | Peak | PCM SHA-256 |
| --- | --- | --- | --- |
| Final drop/scheduled clip | 195072 / 4.064 | 0.09684687107801437 | `ad4a14164a553d0a5a04506cea1728181f68dcc5e1aed222edcfd83cc141ddcb` |
| Final editor closure |751104 / 15.648 | 0.4655124545097351 | `892e80c3796c6409187113224acedc495f70f6dbd5d1f9b1a2947d1f71b4e168` |

The capture helper checks every float sample for finiteness. All 16 one-second
editor-closure peaks are nonzero. Initial silence in the drop capture reflects
scheduled bar launch; capture also includes stopping transport. Both journeys
report zero stream errors and rejected commands. Recorder returncode 1 reflects
the supervisor's requested stop, with `complete:true`, no stderr and full PCM
statistics retained. Raw `.f32` files stay local. This qualifies private software
PipeWire/CPAL at 48 kHz/512 frames, not physical audio or foreign DSP capacity.

## Review And Remaining Scope

`reviews/` preserves Tasks 1/2 source reviews, both Task 2 fix diffs/logs and final
approved re-review, plus the native-minimum brief/review and narrowly fetched
Tauri Context7 documentation. The only new product change is Ultra
`minWidth:900->800`, `minHeight:620->600` in source commit `9ced05e`; initial
1280x840 size and all other config remain unchanged. No mirrored unit test was
added for those two reversible scalar settings. Fresh native size assertions
are the meaningful verification. Already-passing Node/Rust/Chromium suites
were not rerun. Helper Python compilation, shell syntax, receipt consistency,
fresh install/resource hashes and whitespace checks on authored files pass.
Unmodified copied raw logs/diffs retain their original trailing/EOF whitespace;
`reports/raw-evidence-whitespace.txt` records the whole-packet check diagnostics.
The authored-file check excludes only `logs/`, `reviews/*.log` and
`reviews/*.diff` so those original evidence bytes remain intact.

Presentation authoring, Max presentation import and native hosting remain
pending; the broader roadmap stays paused. All 22 native candidates remain
unavailable. This checkpoint does not qualify real Analog hosting, proprietary
editor/resource acquisition or physical audio. No proprietary DLL, graphics,
editor or preset bytes are added. Four existing Rust warning categories remain
in both build logs; private Xvfb/portal/DRI3 warning noise is retained too.
The acceptance worker changes no launcher, user configuration/window, other
source tree, earlier install, release/tag/merge or cloud CI dispatch.

## Publication Status

The evidence gate is approved with no Critical/Important findings; its full review
is archived in `reviews/task-2-install-review.md`. The controller subsequently
switched Alive (Test) to the tested source `9ced05e`; the previous installation,
research launcher and existing user windows remain preserved. The successful
controller script and verification are archived in `publication/`. This worker
does not execute that script again. PR push remains controller-owned. Existing
build/private-harness warning noise remains disclosed and deferred.
