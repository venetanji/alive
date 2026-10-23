# Astra fix validation: Ultra before the instrument milestone

Decision: HOLD the milestone handoff. Native scoped Stop is repaired, but native macOS Quit still bypasses unsaved-document protection by source inspection, and pending history still loses numeric edits and completed drags in actual Linux Tauri interaction.

## Exact revisions and isolation

- PR: https://github.com/venetanji/alive/pull/2, `build/ultra-desktop-releases`.
- Initially fetched fix: `6d524cb474e54e6cea21897295921ed9cee5bb72`.
- Updated fix reviewed and built: `de663840346a12d0fe5b49eb669af1cc1788f25f`. Its only changes after 6d524cb are UTF-8 handling and a regression in the notice generator. Safety/frontend/native source is identical between these two revisions.
- Baseline build: `bfe42ff060931eb23384093d9c133ab873f02546`.
- Exact audited synthetic merge retrieved from GitHub: `b3bf4545fabfabc0fd329c77c4828e9d70183b97`, parents `821745888794e3b792e76e455962db2d61858755` and `bfe42ff060931eb23384093d9c133ab873f02546`.
- Baseline and audited snapshot have the identical tree `d4defc09357b888a44b4a1fbf647f45722eaf663`. `git diff` is empty.
- Updated fix tree: `cc661bfd4c1cd1dccde0d002e27270143b9547c0`.
- Validation used separate detached worktrees for the fix and baseline; the fix checkout was then given a new review branch solely for this evidence PR.

The original checkout already contained uncommitted instrument work and was left untouched. This PR adds validation evidence and standalone probes only, on top of the cloud fix branch. It does not implement production fixes, change release versions, merge, tag, or publish a release. A contracts test rewrote its generated native-build report during validation; that output was retained locally and only that validator-generated change was restored.

The full local evidence tree (raw one-second samples, full logs, temporary packages and scratch documents) remains outside Git. This directory includes compact primary results, original probes, selected screenshots, and reproduction instructions. Missing private Max evidence remains unavailable.

## Remaining findings

### P1: macOS native Cmd-Q still bypasses the guard

`apps/ultra/src-tauri/src/document_windows.rs:341` installs `PredefinedMenuItem::quit`. Locked Muda 0.17.2 maps this to Cocoa `terminate:`. Locked Tao 0.34.8 handles `applicationWillTerminate` by emitting `LoopDestroyed`, which locked tauri-runtime-wry 2.8.1 turns directly into `RunEvent::Exit`. That path does not emit the `ExitRequested` event intercepted at `apps/ultra/src-tauri/src/main.rs:874`.

Expected: native Cmd-Q flushes pending authoring work, then offers Save/Discard/Cancel for every dirty owner; Cancel preserves the application/documents. Actual source control flow: native termination never enters `request_quit`, so none of those gates runs. The new registry unit tests do not exercise the Cocoa menu selector.

Reproduction awaiting a Mac: open two documents, dirty both, leave an editor change pending, press Cmd-Q or Ultra > Quit. This finding is source-confirmed against the exact locked dependency implementation; it was not executed on macOS. The fix needs a native Quit entrypoint routed through the close gate or a cancellable Cocoa termination delegate. Also assess the stronger all-documents-survive-Cancel requirement: the current guard closes owners concurrently, so cancelling A cannot restore a clean B that already closed.

Evidence: `native/README.md` documents the locked dependency path and portable native probe.

### P2: pending Undo/Redo leaves a numeric edit visible but unsaved

`apps/ultra/ui/canvas-node.mjs:58` clears the numeric input's dirty state and updates its remembered displayed value before authoring is admitted. `apps/ultra/ui/canvas.mjs:311` catches the new history-barrier exception without returning failure to the control. The draft then appears committed to the control but is absent from the native document.

Actual release Tauri/WebKit reproduction with physical XTest input and an intentionally held history IPC:

1. Open original starter with number 150; edit it to 20.
2. Hold Undo, type 73, press Enter; release Undo.
3. Retry Enter. The input still shows 73, but Rust retains 150, reports `dirty:false`, and the unsaved indicator is hidden.
4. Blur the input: it changes back to 150. No native admission of 73 occurs.

Redo has the same failure: native value remains 20 and blur discards the visible 73. Expected: the input preserves a retryable draft or editing is prevented before accepting the user's work. A notice alone does not preserve the edit. Object-entry text does remain retryable, so the failure is specific to control integration with the barrier.

Evidence: `frontend/native-history.md`, `frontend/native-history-2/result.json`, `frontend/native-history-2/snapshots.json`, `frontend/native-history-2/undo-retry-enter.png`; deterministic failing probes in `frontend/probes.test.mjs`.

### P2: drag completion during history throws and loses movement

`apps/ultra/ui/canvas.mjs:302` clears the active drag; line 303 invokes `moveMany` outside the UI error guard. During a held history request this throws `Error: Native history is pending. Wait before editing.` The physical drag is not admitted. Actual WebKit records the uncaught error; later polls restore the original position. The synthetic fixture additionally demonstrates a displaced preview until another render.

Expected: a pending-history policy prevents the gesture or preserves/queues the intended move, with coherent UI state. Actual: no movement commit and an uncaught error. Evidence is in the same native history bundle and `frontend/README.md`.

## Audit acceptance and test coverage

| Audit item | Result | Evidence class |
| --- | --- | --- |
| Scoped Stop with queued Gain edits | PASS for native runtime stress and document isolation | Real release native library, external-host render ABI; separate real CPAL desktop checks |
| macOS Quit / unsaved work | FAIL by locked source control flow; hardware unavailable | Source inspection; registry unit tests do not establish native Quit behavior |
| macOS application-wide File/Help menus | Source fix is appropriate; Mac interaction unverified | Source review and pure routing tests; Linux File/Help interaction passed |
| Earlier event followed by later deletion | PASS, including Stop/Panic invalidation | Held-IPC native-service fixture; unchanged parent sources fail regression |
| Edits during Undo/Redo | FAIL for numeric controls and movement | Deterministic fixtures plus actual instrumented Tauri/WebKit and physical input |
| Dependency inventory | All missing 51 restored: 568 third-party entries | Independent Cargo.lock/metadata comparison plus extracted package checks |
| Stopped-poll cable rebuild | Fixed in synthetic tests; native performance table below | Actual release WebKit counters and process measurements |

The Stop stress probe runs 42 cycles spanning 1, 7, 8, 9, 31, 63, and 64 accepted cold Gain edits; rejects the 65th without fault; repeats Stop 1..6 times; checks retained values, deliberate restarts, saturated global Stop, and full audio restart. The unaffected document is byte-identical to the control over 43,008 float samples, SHA256 `db265674da3bcad32b5582e699f5defa1efee1f24d931b72c279d57b93f9a0c3`. The same probe and current document-audio test fail against the baseline library at render safety admission. These are genuine native DSP executions, without physical output hardware.

Updated-head automated results: 124 Rust tests passed, 2 ignored; the full public contracts script passed after installing its declared Python dependencies into a local validation venv; four native suites (`document_audio`, `document_runtime`, `signal_audio`, `canvas_idle`) passed; real Clockwork envelope checks and portable numeric parser passed. Frontend review ran 84 focused and 68 adjacent existing tests. Parent-source replay fails exactly the three added event/history/cable regressions. Six additional synthetic probes yield four passes and the two history-UI failures above. Original strict test expectations were retained.

Actual Linux desktop results include startup/secondary file forwarding, hosted help, File New/Open, Save, dirty-close Save/Discard/Cancel, cross-window messages, all ten list objects with audio off/on, all twelve MSP objects, two-document audio, scoped Stop, named Receive, and global audio restart.

The full desktop suite did not pass. The canvas runner stops at an outdated expectation that `+ 7` exports only `{"rhs":7}`; actual physical creation exports valid `{"numericmode":1,"rhs":7}`. The document runner later times out opening its first nested patcher via double-click; its recorded input/expected title are consistent with source, but the trace cannot distinguish missing gesture delivery from an open failure. Downstream child lifecycle checks in that run are unverified. See `logs/desktop-staged.log`, and `logs/documents-desktop.log`. No failure was suppressed or converted to a pass.

## Environment and measurement scope

Machine: AMD Ryzen 9 5900HS, 8 cores / 16 threads, Omarchy `4.0.0.r7235.g967bbdd`, Linux `7.2.8-10-omarchy` x86_64. Host desktop is Hyprland 0.56.2 Wayland. Native validation uses private Xvfb 21.1.25 displays with X11 input; performance additionally uses twm 1.0.13.1 for real iconification. WebKitGTK 2.54.1, GTK 3.24.52, Mesa 26.2.5. Xvfb reports no DRI3 acceleration, so this is a software-rendered native-app workload, not a measurement of the user's Wayland/GPU path.

Audio: real Rust CPAL with PipeWire 1.6.10 / WirePlumber 0.5.18, private `Ultra-Software-Output` null sink, device `default_output`, 48,000 Hz stereo, requested and observed 512 frames. No physical audio/MIDI device, acoustic latency, realtime deadline, or macOS hardware validation was performed. No sandbox-disabling environment flags or permission bypasses were used.

Release builds used GCC 16.2.1 and Rust/Cargo 1.99.1, locked dependencies, pinned Clockwork/Faust sources copied into the isolated worktrees, and CMake Release. Native regression harnesses explicitly retain assertions. Build commands/logs, complete versions, source trees, and executable/native-library hashes are in `environment.json`, `logs/`, and `native/README.md`.

Missing private Max hierarchy evidence remains explicitly `UNAVAILABLE`; no comparison pass is claimed. No newly captured proprietary reference data was added to the repository or evidence bundle.

## Performance method

Compare the audited-tree baseline release against the updated fix release on the same original 16-node, 16-edge patch (32 SVG paths), with no interaction during each sample. Measure two 30-second samples per condition: audio off/on and visible/minimized. Native counters are collected using an external WebKit user-script preload: SVG path writes, cable container rebuilds, geometry reads, 100 ms poll callbacks, ordinary Tauri command counts, document visibility, engine flags and stream errors. The app's sources, capability checks, CSP and WebKit sandbox remain intact. The instrumentation wraps the public invoke function and forwards to the real native backend. Performance runs hold no IPC requests.

Process-tree CPU comes from per-process `/proc/PID/stat` tick deltas, expressed as percent of one logical CPU, without double-counting child times. Proportional memory comes from all tree members' `smaps_rollup`. Raw one-second records, first/last JS counters, screenshots, and private PipeWire graph descriptions are retained. Separate display/audio daemons are outside the application process tree. Other user workloads continued; this is a local comparison with contention and shared-memory accounting limits, not an isolated hardware benchmark.

The first baseline run completed all eight samples and wrote its summary, then the wrapper exited 2 because this validator edited its launcher while Bash still had it open. Only launcher cleanup parsing was affected; app/driver/instrumentation sources did not change during samples, and processes were cleaned up. `logs/baseline-wrapper-status.txt` records this harness error. Subsequent launchers are immutable copies. Pilot attempts are retained separately and excluded from all reported samples.

Native performance totals and artifact results follow.

## Additional actual Tauri acceptance

The focused cache/persistence followup uses actual release Rust/Tauri/WebKit, physical XTest input, and an original scratch copy. Movement, zoom, window resize, and keyboard port wiring each cause fresh path writes, followed by zero additional path writes/rebuilds over 13-14 stopped polls. The added cable is present in the authoritative native document. Two Gains each admit the ordered keyboard values 0..7; Stop followed by native Save retains 7/7 in the scratch JSON and leaves the document clean. This establishes real persistence with ordinary IPC timing; the saturated backlog/other-document sound proof is the independent native rendering stress test.

Focused patcher-header Enter opens an actual child, whose independent empty canvas remains stable across stopped polling. A port-drag attempt did not admit a cable; the supported keyboard port sequence did. The full hierarchy double-click failure is still unresolved and not relabeled a pass. `frontend/native-cache-gain.md` records exact counters, screenshots, saved JSON, and separate limits for each run.

## Release performance results

Each cell is the mean of two 30-second samples; CPU parentheses show the observed range. CPU percentages represent one logical CPU. PSS is proportional resident memory summed over the app process tree.

| Condition | Baseline CPU % | Fixed CPU % | Baseline / Fixed PSS MiB | Baseline / Fixed polls/s | Baseline / Fixed rebuilds per sample |
| --- | ---: | ---: | ---: | ---: | ---: |
| off-visible | 28.3 (26.2-30.3) | 20.4 (18.9-21.9) | 265 / 314 | 9.26 / 9.50 | 279.0 / 0.0 |
| off-minimized | 15.8 (15.5-16.2) | 11.9 (9.7-14.1) | 285 / 309 | 9.28 / 9.45 | 278.5 / 0.0 |
| on-visible | 28.5 (26.7-30.2) | 22.0 (20.9-23.1) | 449 / 433 | 9.33 / 9.50 | 281.0 / 0.0 |
| on-minimized | 20.3 (18.3-22.3) | 14.8 (12.6-17.1) | 447 / 430 | 9.30 / 9.45 | 279.0 / 0.0 |

Baseline samples rewrote all 32 paths on every poll (8,864-8,992 path writes per sample). All eight fixed samples had zero path writes and zero cable-container rebuilds, including minimized audio-on samples. The fixed app still polls around 9.5 times/second and performs approximately 45 geometry reads per poll (12,735-12,870 per sample). There were no recorded native faults, JavaScript errors, stream errors or xruns in these instrumented samples.

A separate corroboration with the preload absent repeated stopped/visible twice for 30 seconds: baseline process-tree CPU 31.9% (31.9-32.0), fixed 22.1% (21.6-22.5); WebKit subprocess CPU 27.3% versus 18.1%; PSS 347 versus 333 MiB. Counters are unavailable without instrumentation. These sequential runs have background-load and memory-sharing confounds and do not isolate the cost of cable paths. No stack profiler was run. The user's approximately 23% WebKit CPU must not be attributed entirely to this bug.

See `performance/README.md` for reproduction, all four `summary.json` files for per-sample values and engine status, and `performance/comparison.json` for aggregates including WebKit-only CPU. Actual Wayland/GPU and physical audio measurements remain unavailable.

## Packaged notices

The generated inventory now has 568 third-party dependencies, exactly matching the final lockfile's 569 entries minus the first-party crate. Independent metadata checks found no missing, extra or duplicate entries. All 51 audited omissions are repaired. Eleven packaging tests pass at the updated head.

Actual artifacts from CI run [39988671475](https://github.com/venetanji/alive/actions/runs/39988671475) were downloaded and extracted: Linux DEB/AppImage, Windows NSIS and Apple Silicon DMG. Each contains all four required resources: `THIRD-PARTY.txt`, `THIRD-PARTY-CRATES.json`, `Alive-LICENSE` and `fast_float-MIT`. Unix bytes match source; Windows content matches after recorded CRLF normalization. ZIPs match GitHub artifact digests; installer hashes match CI checksums. The CI merge checkout `61a9fecf578e73d7b06983ba96214c115bb21fb1` has exactly the reviewed head's tree.

At the packaging snapshot `2026-10-23T17:11:39Z`, the Intel macOS job was still running and had not produced an inspectable DMG. That artifact check remains pending. Archive inspection is not local macOS/Windows GUI execution. `packaging/findings.md` and the three `*-bundled-notices.json` files contain package and notice hashes. No full legal compliance determination is implied.

## Handoff

Keep the instrument milestone gated on the Quit and pending-history findings above. Repeat the native Quit/menu matrix on macOS after its entrypoint fix, run the history probes until all six pass without relaxing assertions, and resolve or reproduce the two incomplete desktop runner checks. The source/menu checks and virtual-audio/native-app results cannot replace the unavailable physical hardware or private Max evidence.
