# Stopped Clip Launch Diagnostic

Status: the one authorized observed native journey exited 1 at a later audio-settings navigation failure. Its original stopped Launch Pulse Clip 1 pointer action and line-103 assertion succeeded. This does not explain or fix the earlier stopped-launch failure. Full original GREEN remains required before native2C. No product, test, index or HEAD edits, rebuild, push, user-desktop launch, retry, keyboard substitution or assertion relaxation was performed.

## Pin, Command And Exit

- Application/test source blobs and fixtures are pinned to `729dc9a555a389130304fe52b081bae351f814da`.
- Before and after manifests verify all 407 tracked apps blobs against that commit and record SHA256; two pinned release artifacts bring each manifest to 409 entries.
- Parent-owned docs/evidence work moved HEAD from `729dc9a555a389130304fe52b081bae351f814da` to `1194faff81170fe57d7283fac04488233610cfcd` during the run, as explicitly authorized. Application/test blobs and binary hashes remained identical.
- Local Alive SHA256: `bac50bb1af01c2d15d985d0cf345f21a1efcd6a0be450f0b77870df4356c3260`.
- Local adjacent release libultra_native.so SHA256: `4c54e3e0a2e7bf2007a56620d1006658e97b86d5f8828e08f13e9ffd3a1e9e70`.
- Original RED and corrected failing-run evidence under `/tmp/alive-workspaces-clip-navigation` is retained untouched; final verification checks all 62 original evidence hashes.

Outer runner, exit `1`:
```bash
/usr/bin/python3 /tmp/alive-workspaces-clip-launch-diagnostic/run_diagnostic.py
```
It performs before/after source and native checks and invokes exactly this command from `/home/venetanji/.codex/worktrees/edd5/alive`, also exit `1`:
```bash
env -u ALIVE_SYSROOT PATH=/usr/bin:/bin ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=/tmp/alive-workspaces-clip-launch-diagnostic/diagnostic_driver.py PYTHONUNBUFFERED=1 timeout --signal=TERM --kill-after=10s 480s bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-workspaces-clip-launch-diagnostic/original-observed
```
UTC interval: `2026-10-26T05:30:49.544053+00:00` to `2026-10-26T05:32:43.240828+00:00`. ALIVE_SYSROOT is unset and PATH is `/usr/bin:/bin`. The original wrapper provides private Xvfb/D-Bus/software PipeWire; the temporary driver imports the pinned original check_alive_desktop and delegates the unchanged check_alive_observability script with runpy.

Final read-only verification, exit `0`:
```bash
/usr/bin/python3 /tmp/alive-workspaces-clip-launch-diagnostic/verify_read_only.py
```
It proves current 409 source/fixture/native entries equal the before/after pinned manifests and all 62 original evidence files remain unchanged. Temporary drivers parse successfully before the native run. No permanent source or index mutation occurs in these scripts.

## Observation Boundaries And Overhead

The only wrapped action is the one original `alive.reorder_click("Launch Pulse Clip 1")`. The wrapper delegates the original once. It adds no focus, key, panel switch, selection, launch, Apply, edit, sleep, predicate or retry. Existing actions and waits remain in the same order. Snapshots query existing accessibility text/states/geometry, X focus/ownership and process mappings, then take screenshots. Each is bounded to 2000 nodes and four seconds; none truncated or reported errors. Original stream/capture resource bounds remain unchanged.

| Snapshot | UTC start | Monotonic start/end | Extra elapsed seconds | Named/text nodes |
| --- | --- | --- | ---: | ---: |
| before-original-launch | 2026-10-26T05:31:38.158367+00:00 | 11630.960976372 / 11631.602508546 | 0.641532174 | 305 |
| after-original-launch | 2026-10-26T05:31:38.913809+00:00 | 11631.716423626 / 11632.434134603 | 0.717710977 | 306 |
| original-failure | 2026-10-26T05:32:42.810201+00:00 | 11695.612818074 / 11695.987010487 | 0.374192413 | 200 |

The before snapshot adds 0.641532174 seconds before the original gesture, and the after snapshot adds 0.717710977 seconds before the original wait predicate starts. The failure snapshot occurs only after the later original failure. All reads within a snapshot are sequential and not atomic, so queued status and applied runtime text can coexist across its observation interval. This added time is a confounder; the result is not proof that the earlier failure was harmless timing.

## Confirmed Stopped-Launch Facts

| Field | Before original pointer gesture | After original pointer gesture |
| --- | --- | --- |
| Pulse clip runtime | Cued Clip 1 copy | Cued Clip 1 / request 2 applied for Clip 1 |
| Harmony clip runtime | Cued Clip 1 | Cued Clip 1 |
| Session status | Transport request 1 applied | request 2 queued for Clip 1 |
| Transport playing | false | false |
| Absolute frame | 421888 | 461312 |
| Native generation | 9 | 9 |
| Rejected commands | 0 | 0 |
| Pulse slot 2 selection | PRESSED true | PRESSED true |
| Native input focus / owned main window | 4194307 / 4194307 | 4194307 / 4194307 |
| Launch Pulse Clip 1 rectangle | [555,159,49,24] | [555,159,49,24] |
| Launch states | enabled/showing/sensitive, unfocused | enabled/showing/sensitive, focused |

- Original gesture interval: monotonic 11631.604258684 to 11631.716315726; original input record at 11631.716147273 reports exactly one press and one release, with main owner 4194307 in hit path [927,4194307]. No keyboard comparison was run.
- Original line-103 predicate succeeds; execution continues through transport/playback, editor continuity, per-track Stop, audio capture, relocated Save/Open, shared-source replacement rejection and sequential recovery assertions.
- This rules out a deterministic inability of the pinned product to perform a stopped pointer cue after that audio-settings sequence, and rules out an inevitable mismatch between applied cue and its projected runtime label. It establishes success only in this observed run.
- It does not determine whether the earlier failed gesture was unactivated, rejected before submission, lost at native request handling, or misprojected. The earlier run lacks status/raw receipt evidence; current snapshots add observation time.
- Existing Session status and runtime text expose request serial/status projections. No raw preparation revision, receipt slot, masks, error code or raw request structure is accessible in these recorded nodes. Stream diagnostics expose audio epochs, not clip request receipts; no raw receipt values are invented and no test/product hook is added.

## Distinct Later Failure And Narrow Proposed Correction

The full run fails at `check_alive_observability.py:153`, reached from the unchanged Quit action in `check_alive_clips.py:167`, during the first final qualification cycle. `ui.wait_for("Save Alive audio settings")` preserves its original failure: Missing native control. All original clip assertions before Quit have run, but final stream qualification and actual Quit have not completed.

Actual failure snapshot/tree/screenshot support a separate navigation omission:

- Audio details has recorded AT-SPI EXPANDED=true. The Alive audio settings opener remains a visible/enabled accessible at [1093,768,95,27], with EXPANDED=false. The original missing-control tree and failure snapshot contain neither Save Alive audio settings nor Close audio settings; the panel is absent.
- The original missing-control.png visibly shows expanded diagnostics covering the footer area, including the opener coordinates. Accessibility SHOWING/VISIBLE alone does not establish pointer visibility beneath an overlay.
- Pinned `alive.html:42` puts the opener before the Audio details sibling in the footer. Pinned `alive.css:4` makes open Audio details an opaque absolute overlay at bottom:0, left:0, right:0 with z-index:10. `alive.mjs:395` sets the opener aria-expanded when its panel opens; the recorded AT-SPI expanded state is false. Raw DOM aria-expanded and DOM elementFromPoint were not queried.
- The pinned helper collapses diagnostics for track actions such as Open Pulse editor, but excludes Alive audio settings from its surface classification. The original qualification loop then unconditionally clicks Audio details immediately before the settings opener. This recreates the overlay before the original pointer click.
- Failure fields: Session status Schedule prepared and applied. Start transport when ready.; transport false; absolute frame 1397248; generation 20; rejected commands 0; audio failed false; stream errors 0; audio status Audio is off. These are actual existing AT-SPI reads, not inferred receipt outcomes.

Proposed narrow helper correction for parent review: include `Alive audio settings` in the existing overlay-clearing surface classification so Audio details is collapsed before executing the original opener click. Preserve every original qualification/open/Save/start/close action and wait. This proposal targets the supported later occlusion; it is not implemented or verified here and does not explain the earlier stopped-launch failure. No unrelated product fix is justified by this evidence.

The original opener itself lacks a dedicated input/DOM event trace in this run. Thus screenshot, recorded expanded/panel state, pinned layering and original action order support the occlusion explanation; a post-fix original native regression is still required to prove the correction.

## Retained Capture And Qualification Limits

- Original native-clips-report.json is retained with draft/editor continuity, Apply boundary, stopped/default reopen, failed shared replacement continuity and sequential recovery flags true.
- Original clips-rendered.f32 contains 432640 frames (9.013333333 seconds), peak 0.19943729043006897, SHA256 `55427c5947f9844f17d7ad66dddadb4f29baf50ab2538fba33d2368aa984beab`; original finite/peak assertions passed.
- Capture supervision reports complete=true, reason=requested_stop, recorder child returncode=1, audio_bytes=3461120 and original wall/audio/metadata/stderr/disk bounds. The nonzero child return code is retained as recorded; it is not represented as a zero-exit recorder.
- Original partial observability action/resource/epoch/error logs are retained; errors=[] does not imply successful qualification. There is no complete observability-report.json or observability-final.json, final Save, or completed Quit.
- No physical audio, normal-desktop, production-v4, full stream qualification or endurance claim is made.

## Evidence And Next Step

Raw root: `/tmp/alive-workspaces-clip-launch-diagnostic`. It contains temporary diagnostic_driver.py/run_diagnostic.py/verify_read_only.py, exact command.json/log, 409-entry before/after source SHA256+Git-blob manifests, original-observed/ with all untouched native outputs and three added screenshot/tree/state/geometry snapshots, original gesture boundaries/input counts, process mapping hashes and diagnostic-summary.json. evidence-sha256.json hashes retained files except itself. The previous failure evidence remains in its original directory and passes its original hash manifest.

Only one native diagnostic run was executed. No targeted native probe or keyboard intervention followed because the stopped-launch failure did not reproduce in this observed run. No source/index/HEAD operation, app rebuild or push was performed by this worker.

Next source step supported by current evidence is the separately reviewed helper change for the occluded Alive audio settings opener, followed by a complete original native journey with every assertion retained. The stopped-launch cause stays open. If its cause must be discriminated independently, use one separately authorized run with the same audio-settings/launch order and failure-only snapshots, omitting the pre/post-gesture observation delays; retain the one original pointer gesture and predicate, and do not repeat until passing.
