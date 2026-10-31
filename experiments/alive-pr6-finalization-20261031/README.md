# PR #6 Finalization And UI Baseline

Scope: checkpoint the implemented Alive/Ultra work, validate relevant existing
suites, integrate the release-foundation prerequisite, merge PR #6 into `main`,
then stop. No features, UI redesign, new workers, native-library rebuild, tags
or releases are part of this task. The separate native-device worktree is not
included. The broader goal remains paused.

## Source And Integration

Before finalization, PR #6's head was
`46b86a2a7545abf8832c50c1c8290c28dc56b33a` on
`feat/alive-session-host`, targeting `build/ultra-desktop-releases`.
Remote `main` was `821745888794e3b792e76e455962db2d61858755`, an ancestor
of both the prerequisite and feature branches. The prerequisite head
`31033483eb3baf15edab1734b966cc6d55c4b8c7` contained twelve commits absent
from main. PR #2 has seven successful exact-head checks: UI/reference,
Chromium, Linux native/Rust/CPAL and all four desktop package targets.
Its non-tag release-publication job was correctly skipped.

The integration path is to merge that existing prerequisite PR with a merge
commit, retarget PR #6 to `main`, recheck its head/checks/conflicts and merge
without rewriting history or bypassing required checks. GitHub's PR merge
receipts identify the resulting commits:

- Prerequisite: https://github.com/venetanji/alive/pull/2
- Alive baseline: https://github.com/venetanji/alive/pull/6

The finalization change updates only documentation, retained validation evidence
and the stale fixture described below. Product code is unchanged.

## Fresh Validation

The final existing suites completed with the results below. Raw local logs
and browser screenshots/traces remain in
`/home/venetanji/.cache/alive-verification/pr6-finalize-20261031/`.
Node is v26.13.0; Rust is 1.99.1. This local environment differs from cloud CI.

| Existing check | Result |
| --- | --- |
| `check-contracts.sh` with pinned CI Python requirements | Exit 0: 657 current UI tests, 6 Astra probes, reference/schema/launcher checks and standalone native tests pass; existing skip/unavailable cases remain explicit in the log |
| Rust library suite against frozen native library | 297 passed, 0 failed, 4 existing ignored |
| Focused Chromium: Alive chain, clip regions, Ultra instrument | 130 passed, 0 failed; sandbox enabled, one worker, no retries |
| Installed source/artifact/resource hash verification | Passed: 330 manifest source files, 14 resources, Alive/Ultra/native binaries and icon |
| Existing installed acceptance receipt consistency | Passed; rechecks historical receipts, not a fresh runtime journey |

The first contract attempt passed all 657 current UI tests and ten stream tests,
then six retained Astra probes failed before reaching their behavioral assertions.
Their root and child patcher fixtures lacked the now-required explicit nullable
`presentation` field. The only fix adds `presentation: null` to these two
fixtures. All six original assertions then pass unchanged. No compatibility
reader, fallback, skipped probe or relaxed validation was introduced. The
subsequent system-Python run stopped at the missing `jsonschema` dependency;
the final run uses the existing pinned CI requirements in an isolated environment.
All attempts are retained rather than relabeled as passing. The final contract
log explicitly reports the unpublished optional hierarchy oracle as UNAVAILABLE
(not executed), two excluded generic comparison cases and one existing Python
skip. These are not counted as comparison passes.

`validation.json` identifies final outcomes and retained logs. `browser-results.txt`
is a derived result-only excerpt of the full local HTTP/test log; screenshots
remain local. `raw-log-sha256.json` fingerprints the original local logs, and
`contracts.log` retains the complete passing contract output. Earlier failed
outputs are preserved in `contracts-initial-failure.log` and
`contracts-missing-dependency.log`.
The comparison runner rewrote its historical `native-build.json`; the fresh
receipt is retained here as `arithmetic-native-build.json` and the historical
file's original bytes are preserved. Raw Rust stdout retains its trailing blank
line; authored-file whitespace checks exclude only copied `*.log` evidence.

Commands, from the repository root:

```sh
uv run --isolated --no-project --with-requirements apps/ultra/tests/ci/requirements.txt bash apps/ultra/tests/ci/check-contracts.sh
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 \
LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 \
CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target \
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib
python3 experiments/alive-presentation-checkpoint-20261031/verify-install.py /home/venetanji/.cache/alive-verification/presentation-publish-compact-fwkhm2op /home/venetanji/.local/share/alive/builds/9ced05e
python3 experiments/alive-presentation-checkpoint-20261031/verify-receipts.py
```

The Chromium command is documented in `docs/ALIVE_UI_HANDOFF.md`.
CI remains opt-in. No fresh final-head cloud/package/endurance campaign is
claimed by this local integration checkpoint. Prerequisite PR #2's successful
cloud checks validate its exact head only. This baseline is experimental;
integration does not close the older full qualification milestones.

## Build And Existing Runtime Evidence

The local Alive (Test) launcher selects the immutable installed product source
`9ced05eb38e0620865e4c9401646657669c1f6ae` at
`/home/venetanji/.local/share/alive/builds/9ced05e`. All 330 manifest source
hashes still match the current tree. No product code/configuration has changed
since that build; later changes are tests, evidence and documentation. There
is no newly built or newly runtime-tested merge binary.

`source-consistency.json` and `install-hashes.json` record the fresh hash checks.
The earlier source archive and actual Tauri/WebKit acceptance remain in
`experiments/alive-presentation-checkpoint-20261031/`. That packet proves, at
its recorded scope, real bundled-device drag/drop, ordered effects, immediate
clip/note editing, saved instance independence, draft preservation, editor
closure during playback and actual 800x600/1280x800 windows. It includes
finite nonzero software PCM and zero observed stream errors/rejections.
The passing Alive receipt and separate passing Ultra follow-up remain distinct
from the initial full helper attempt that exited nonzero.

## Known Defects And Untested Behavior

- The retained broad native Arrangement journey fails its Return-gap
  observation; final restart checks are not reached. Historical `56720e5`
  cloud Linux Master fails hosted Cutoff automation ownership (`Base: 1333 Hz`).
  These have not been rerun or declared fixed. Older source-attributed failures
  remain in `docs/PHASE2_HANDOFF.md` and their original evidence packets.
- All 22 discovered installed Live candidates, including Analog, remain
  unavailable in this baseline. Successful native DLL hosting in another dirty
  worktree has not been integrated here.
- Device add/remove/replace/reorder requires stopped transport. Current chain
  transition resets and stopped/clipless mixer gating do not yet implement
  Live-style persistent device processing and effect tails. Continuous device
  lifetime and Ultra-generated shared Live libraries are proposals only.
- Presentation authoring/Max presentation import, native audio-effect input,
  Max backend, MIDI-effect output, preset/rack import, input routing/monitoring/
  record arm/live recording and the shared silent-video engine remain pending.
- No fresh full native journey, endurance, physical audio/interface/MIDI,
  foreign-DSP qualification or final-head cross-platform package run occurred.
  Existing Rust warnings and private-desktop environment noise remain disclosed.
  Browser fixtures are not evidence of native audio or physical timing.

## UI Handoff

`docs/ALIVE_UI_HANDOFF.md` is the next session's entry point. It maps the
architecture, files, state ownership, styling cascade, Live references, current
UI problems, preserved interactions and screenshot commands. The required
organization is transport at top, browser left, Session/Arrangement central,
Clip/Device detail below and contextual Help/Info at bottom-left. The redesign
belongs in a separate PR starting from the resulting `main` merge commit.
