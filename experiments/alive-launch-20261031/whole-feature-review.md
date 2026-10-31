# Independent whole-feature review: Stage 1 launch quantization

## Findings

No material correctness, persistence, history, runtime, or UI integration findings. Remaining blocking finding count: **0**. Product integration is approved within the reviewed Stage 1 scope. The subsequently reproduced harness-only finding is **ADDRESSED** by `b71a2b6`; final execution qualification remains the controller's desktop rerun gate.

Reviewed product range: `dd574205f0dc151d6c89df31f55d91cad34d14d1..adaf6bc` in `/home/venetanji/.codex/worktrees/phase2-ui/alive`. Also reviewed the controller-requested final append: `check_alive_launch_desktop.py`, v6 envelope support in `check_alive_desktop.py` and `stage_alive_session.py`, the native policy clarification, and implementation-plan progress/adjustments. No product/index/HEAD/branch mutations or shared Rust builds were performed.

### Addressed harness-only finding

P2: `apps/ultra/tests/check_alive_launch_desktop.py:62` converts an AT-SPI callback reading using `int(s)` inside the polling predicate. The controller independently reproduced a transient empty string, raising `ValueError` before the existing 8-second polling window can observe the callback count. The controller's failure screenshot showed callbacks already advancing, so this is a false-negative harness failure, not evidence of a product audio failure. The active-voices predicate has the same susceptibility. The requested correction is to return false for empty/non-numeric readings, retain the positive threshold and unchanged timeout, and wait for the existing errors-equals-zero condition. The first final harness/docs append is committed as `0e20a81`; product code remains `adaf6bc`. **ADDRESSED in `b71a2b659e3a6c7391d16b1df833b9f2fdfeaecb`:** exactly the two numeric predicates now short-circuit with `s.isdecimal()`, and the stream-error assertion polls for the same `0` value. Positive thresholds, the shared 8-second timeout, authority/receipt/Stop assertions, and product sources are unchanged. I inspected the complete three-line change and independently exercised the actual predicates extracted from the Python AST against empty, non-numeric, zero, negative, fractional and positive values. All passed. No remaining finding from this fix.

## Assumptions and limits

- The accepted default remains the old native 1 Bar ABI. Other grids require the separate admitted capability and share the rolling 1024-frame Start/Seek allowance. The full unchanged `midi-arrangement.alive` workload's 72-versus-64 event refusal is intentional; it is not a regression finding. The sparse `quantized-midi.alive` fixture is the supported integration demonstration.
- This review inspected native integration, request capture and capability boundaries but did not repeat the enormous native envelope proofs. I read `/tmp/alive-launch-native-review-20261031/re-review-1418872.md`; its independent native approval is separate evidence. The appended policy text now preserves the reviewer's bar-zero/silent-track explanation.
- I did not run Rust, Chromium, or an actual desktop instance. The controller reported an independently passing direct current-library Rust session run (135/135), Node suite (608/608), and focused Chromium checks (14/14); the implementer reported the full browser run (68/68). These are not my execution results. The controller's independent desktop harness execution was still active when this report was prepared.
- Rust reproduction must bind the task-owned current native library. The controller found that Cargo prepends its target directory to the dynamic-library search path, selecting an older sibling library despite an outer `LD_LIBRARY_PATH`. Run the produced test executable directly with `LD_LIBRARY_PATH=/tmp/alive-launch-quantization`, or use a runner that reasserts that environment. No existing sibling library or symlink should be overwritten to make the test pass.
- The two additional UI probes use the repository's mock DOM/native adapter. They verify model/DOM state handling, not real pointer blur behavior or geometry. Browser/desktop evidence remains necessary for those dimensions.
- The new desktop harness verifies keyboard settings, serialized v6 content, reopen, a captured-grid receipt, native Session authority, positive active voices and reserved Stop. It does not assert captured PCM, exact onset timing, physical audio, or hardware latency. The existing Arrangement Return-gap and hosted Cutoff desktop observation gaps remain outside this approval; their assertions/timeouts were not changed by this append.
- Future audio/MIDI track creation, WAV playback, recording/routing and video are outside Stage 1 and were not treated as missing feature regressions.

## Inspection assessment

`Control::retain_launch` correctly separates draft occurrence ownership from prepared ownership: a pending deletion keeps the prepared occurrence's launch intent until Apply, existing occurrences receive live settings, and draft-only copies keep their overrides in draft metadata. Copy/delete, history materialization, structural track removal, Apply and Discard paths use the appropriate ownership boundary. `SavedSession::with_score` retains metadata across temporary preparation projections. Live launch edits avoid host installation, transport reset and device replacement, and preserve current Master/mixer fields.

Strict v6 has required `format`, `score`, `master` and `launch` fields; nested launch settings reject unknown fields, unsupported enums, duplicate IDs and foreign/missing occurrences. Old strict decoder dispatch remains separate, the original save-wire representation is retained until needed, and Master changes preserve V6. Serialization retains the 1 MiB bound and history accounting includes launch payloads within the existing 64-entry/8 MiB limits.

Rust resolves individual occurrence overrides while scenes, track Stop and Return capture Global. The captured enum accompanies the request before native consumption, and observation updates preserve it while native receipts supply actual target/status. Optional symbols resolve from the same native module as the score ABI; capability admission is checked against preparation identity. Unsupported saved intent is retained and explicit supported recovery is available.

The UI sends generation/preparation/draft fences through the existing serialized command path, rejects stale model snapshots, limits overrides to occupied Session occurrences, and distinguishes current effective intent from a pending request's captured grid/target. Source/placement selections do not gain occurrence overrides. The compact shared clip heading keeps the added control within the existing layout structure.

## Commands personally executed

From the reviewed worktree:

```sh
node --test --test-name-pattern='launch|scene|queued.*placement|view navigation' apps/ultra/ui/alive-dom.test.mjs
```

Result: **24 passed, 0 failed**. Log: `/tmp/alive-launch-whole-review-20261031/node-focused.log`.

```sh
node --test --test-name-pattern='review probe:' /tmp/alive-launch-whole-review-20261031/ui-probes.test.mjs
```

Result: **2 passed, 0 failed**. Owned probe source and log are in the report directory. The probes independently check (1) settings retain an unfinished note field and an existing musical draft without sending a musical edit, and (2) a delayed old-generation settings response cannot overwrite a newer project or its selector value. They reuse the existing DOM adapter and import the actual reviewed UI implementation; no checkout test source was edited.

```sh
git diff --check dd57420 adaf6bc
python3 apps/ultra/tests/stage_alive_session.py apps/alive/examples/quantized-midi.alive /tmp/alive-launch-whole-review-20261031/staged.alive
```

Result: diff check clean; staging succeeded. Separate Python assertions confirmed exact preservation of v6 launch/Master content and that all staged device paths exist. Python `compile()` checks passed for the three appended/updated desktop harness files without writing checkout bytecode.


Final append verification: `git diff --check 0e20a81 b71a2b6` passed. An AST-based probe exercised the three corrected actual lambdas without importing AT-SPI; all threshold/empty-value checks passed, all calls retain the existing default timeout, and Python syntax compilation passed. The unrelated proposed shared-video document is excluded from this Stage 1 review.
