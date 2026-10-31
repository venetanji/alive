# Phase 2 known-bad baseline

Captured at source `70c356d54e846abb29e21be9e38dfefa14529c75`, branch `feat/alive-session-host`; local upstream `1ebf2161e0fa2a62484566fac65c7e940567f357`, release merge base `31033483eb3baf15edab1734b966cc6d55c4b8c7`. `git diff --stat 1ebf216 70c356d -- apps` is empty; the intervening checkpoint changes plans, review, and evidence only. Initial `git status --short --branch` showed the branch ahead one and untracked `experiments/phase2-20261028/`; the latter is the authorized baseline run. No tracked patch was present. Ref state is local observation: no fetch was performed because this lane is forbidden to change refs. All commands below ran with cwd `/home/venetanji/.codex/worktrees/edd5/alive`.

## Focused bug reproductions

Each command exits 0 by design while confirming defective outcomes. These are **not passing regression tests**. Complete output and script/log SHA-256 pins are in the adjacent logs and `manifest.json`.

```sh
node /home/venetanji/.codex/worktrees/edd5/alive/experiments/development-review-20261028/repro-ui-queues.mjs
node /home/venetanji/.codex/worktrees/edd5/alive/experiments/development-review-20261028/ultra-focused-save-repro.mjs
node /home/venetanji/.codex/worktrees/edd5/alive/experiments/development-review-20261028/ultra-repackage-repro.mjs
```

The first log records five Alive cases: independence followed by queued source length, rename, or note creation changes the shared original instead of the new source; changing only loop enabled leaves the brace enabled; a queued base edit after Open sends generation 2 and writes cutoff 1717 into the replacement project. The second records Ultra's focused numeric draft 42, while Save and close flush retain authoritative value 10 with zero commits. The third records Ultra repackaging changing presets `[Init, Soft, Pluck]` to `[Init]`; the development review also identifies replacement of custom binding/range metadata, which this particular output does not separately measure. The reproducers use production UI modules with synthetic/mock IPC/DOM or direct packaging; they do not prove native disk, window or audio behavior.

## Historical CI and native evidence

Read-only `gh run view 40421472750 --json databaseId,headSha,headBranch,status,conclusion,event,workflowName,url,createdAt,updatedAt,jobs` reports a completed failed Ultra CI PR run on `1ebf216`: UI and Chromium jobs succeeded, while Linux native failed the actual Alive desktop journey; later native gates were skipped. The review records the original assertion `Apply must close the old editor generation`, locally reproduced previously in `experiments/development-review-20261028/native-desktop/`. Whether Apply input was received is unknown; the failure does not establish a lifecycle cause. A new independent desktop run is owned by the controller in `native-desktop/`; its result is separately recorded there and is not inferred here.

Read-only `gh run view 40421472639 --json databaseId,headSha,headBranch,status,conclusion,event,workflowName,url,createdAt,updatedAt,jobs` reports the completed successful Ultra desktop packages PR run on `1ebf216`: Linux x86_64, Windows x86_64, macOS arm64 and macOS x86_64 succeeded; publication was skipped. Packaging is not playback qualification.

## Pins and contract findings

The local x86_64 Linux binaries and adjacent library match the historical build pins; their hashes, platform, runtime, reproducer hashes and outcomes are in `manifest.json`. They were not rebuilt in this metadata lane. `apps/ultra/PATCH_PROTOCOL.md` specifies validated versioned reusable device manifests, parameter/preset retention, distinct instrument/effect descriptors, and the headless `--instrument-probe`, which validates and renders two instrument instances but rejects effects. The workspace contracts preserve a shared native clock, source/occurrence identity, bounded admission and existing supported MIDI profiles; genuine WAV playback remains unadmitted. Stream observability requires separating actual playing frames and stream epochs from capture time and physical-device claims. The Phase 2 design keeps Master outside track ownership and requires explicit saved/native/IPC contract freezes. Native Apply receipt remains open for Task 5; this baseline accepts a known-bad state and does not approve P2.0.

## Fresh native baseline (controller)

The explicit Alive driver completed with exit 1 on the unchanged binaries, reproducing `Apply must close the old editor generation` at `check_alive_desktop.py:754`. The exact command, source identity, artifact SHA-256 values and scope are in `native-result.json`. Apply input receipt remains unknown; Task 5 owns attribution. `native-wrong-driver/` retains the earlier setup mistake and is not this result. Root fetched origin successfully before execution; current upstream and release foundation remain unchanged. The raw PCM is retained locally and pinned but excluded from the evidence commit.
