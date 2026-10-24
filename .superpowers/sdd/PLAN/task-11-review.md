# Task 11 Review

Spec compliance: **Issues found.** The stopped-transport action reducer does not implement the frozen last-per-track-action supersession rule. The other inspected native requirements are substantially implemented; the limits below remain separate from that verdict.

Task quality: **Needs fixes.** One Important receipt-semantics defect is reproduced against the final native library. No Critical finding was identified.

Scope: `d1f8a6659730abe54b9037434a55c3ce92ce34a8` to `db96180772e59099cc96e0bab189ba2dc8825522`, using the supplied contextual diff, Task 11 brief, fixed interface, preflight, review context and implementer report. The diff was reviewed in manageable passes. The initial combined tool output truncated part of the report/header, so that missing portion was recovered; changed implementation functions were not reread separately.

## Strengths

- The v3 declarations preserve the old declarations and use the frozen inline layouts. Matching C++ and Rust fixtures check all eleven sizes and important config/state offsets: `apps/ultra/tests/alive_session_v3_layout_test.cpp:5`, `apps/ultra/src-tauri/src/session/tests.rs:4`. Profile 8x4 remains disabled, while the registered 2/6/8 profile retains 1024 stored events, 32/frame, 64/1024 frames, 64 commands and 128 receipt slots: `apps/ultra/src-tauri/native/alive_session_clip_policy.hpp:20`.
- This is one runtime, with the existing clock, queue, Stop mailbox, parameter and rendering paths. Legacy normalization keeps its own admission/timeline/chase rules; the widened publication is projected only after old-array bounds checks: `apps/ultra/src-tauri/native/alive_session.hpp:31`, `apps/ultra/src-tauri/native/alive_session.hpp:276`, `apps/ultra/src-tauri/native/alive_session.hpp:317`, `apps/ultra/src-tauri/native/alive_session.hpp:343`.
- Prospective admission traverses every stored/selectable clip, derives the rounded global boundaries, uses cyclic weighted pulses and the segment envelope, and includes empty-loop clears and nonloop termination: `apps/ultra/src-tauri/native/alive_session_clips.hpp:198`. The small independent scalar/trajectory oracle exercises duplicate weighted pulses, every 0..1024 horizon and multi-segment cases: `apps/ultra/tests/alive_session_envelope_test.cpp:52`.
- The optional admission code retains separate scheduled/optional history, checks the actual first candidate batch, then every history/future overlap; effective START/SEEK use it while playing START and quantized-only actions avoid the extra refusal: `apps/ultra/src-tauri/native/alive_session_clips.hpp:711`, `apps/ultra/src-tauri/native/alive_session_clips.hpp:756`, `apps/ultra/src-tauri/native/alive_session_clips.hpp:865`, `apps/ultra/src-tauri/native/alive_session_clips.hpp:929`. Reconstruction and strict-prefix chase share one scan, and scheduled scans are charged before reading: `apps/ultra/src-tauri/native/alive_session_clips.hpp:422`, `apps/ultra/src-tauri/native/alive_session_clips.hpp:1003`.
- Stop remains independent of queue/receipt/optional credits, keeps acquired-head-before-epoch ordering, cancels stale queued requests when drained, and has idempotent already-cleared cleanup. Receipt reuse requires a coherent terminal result matching the producer's reservation: `apps/ultra/src-tauri/native/alive_session.hpp:276`, `apps/ultra/src-tauri/native/alive_session_clips.hpp:490`, `apps/ultra/src-tauri/native/alive_session_clips.hpp:664`, `apps/ultra/src-tauri/native/alive_session_clips.hpp:804`. The deterministic epoch-race test and full-queue Stop test cover those important paths: `apps/ultra/tests/alive_session_v3_test.cpp:263`, `apps/ultra/tests/alive_session_v3_test.cpp:653`.
- The measured-family restriction checks actual graph contents rather than trusting descriptors. The dormant-control argument is supported by runtime reset, parameter and routing semantics, with the actual saved instrument and both effects exercised by generated fixtures: `apps/ultra/src-tauri/native/alive_session_clips.hpp:298`, `apps/ultra/tests/alive_session_v3_fixtures.py:22`, `apps/ultra/tests/alive_session_v3_measure.cpp:162`. Local launch/stop isolation is checked against 50,000 exact samples of the unaffected saved instrument/effect chain, including bypass: `apps/ultra/tests/alive_session_v3_measure.cpp:212`.

## Critical

None identified.

## Important

### I1. Stopped actions in one snapshot are all reported APPLIED instead of superseding earlier actions on that track

Location: `apps/ultra/src-tauri/native/alive_session_clips.hpp:907`, `apps/ultra/src-tauri/native/alive_session_clips.hpp:917`; the supersession helper only considers `pending_action` at `apps/ultra/src-tauri/native/alive_session_clips.hpp:696`.

The fixed interface explicitly requires that "the last surviving seek and per-track action supersede earlier same-purpose requests" during callback reduction (`.superpowers/sdd/PLAN/task-11-interface-design.md:368`). A running action records a pending serial, so a later action can finish its receipt as SUPERSEDED. A stopped action instead changes only the candidate's active clip/phase and increments its epoch; it leaves no pending action or other last-action identity. Consequently a later stopped launch or track stop cannot supersede its earlier same-track request, and both receipts remain APPLIED even though only the final candidate selection is committed.

Focused reproduction on the frozen final native library:

1. Configure one track with two valid empty clips, initial slot 0, and start external I/O while leaving musical transport stopped.
2. Enqueue serial 1: launch slot 1; enqueue serial 2: launch slot 0; render one sample.
3. Both ingress results are QUEUED. Transport remains stopped and the active clip is 0. The observed terminal statuses are `[APPLIED, APPLIED]`; the required result is `[SUPERSEDED, APPLIED]`.

This defeats the promised distinction between the surviving selection and a request replaced within the same callback snapshot. Track the last surviving action serial per track independently of pending quantization state, and apply the same reduction rule to stopped selections. Add focused launch/launch, launch/stop and stop/launch tests while stopped, including the combined optional-batch refusal path so old pending/selection state is still preserved on rejection.

Probe evidence: `/tmp/alive-task11-review-hpbno18w/stopped-action-receipts.json`. The probe loaded the immutable copy `/tmp/alive-task11-review-hpbno18w/libultra_native.so`, SHA-256 `8d1768cedb1f5b2208f8708deb8fccb663c727dcc4ecbdf183a257cbe9755f00`, matching the retained final Task 11 build manifest. It performed no build or source mutation and used only an isolated process's native state.

## Minor

### M1. Nonloop-end invariant failure always reports the root-clear resource

Location: `apps/ultra/src-tauri/native/alive_session_clips.hpp:978`.

The nonloop cleanup branch discards the resource returned by `scheduled_fits(charge)` and calls `fault_v3(...RESOURCE_ROOT_CLEARS)`. That charge also contains event scans and parameter writes; if either fails its invariant, the published resource is incorrect. Other call sites preserve the returned resource (`apps/ultra/src-tauri/native/alive_session_clips.hpp:1004`, `apps/ultra/src-tauri/native/alive_session_clips.hpp:1044`). Capture and forward the returned value here too. This does not weaken termination, but it misdiagnoses the failure the guard is intended to explain.

### M2. Reported Rust verification output is not warning-free

Evidence: `/tmp/alive-task11-final-rust-ultra.log:2` and `/tmp/alive-task11-final-rust-alive.log:2` report unused `QuitSession::reserve_native` at `apps/ultra/src-tauri/src/document_windows.rs:39`.

That source is outside this task's diff, so this is a scoped existing-output observation, not a new Task 11 regression or a request to expand the native fix. Both suites still report success. Preserve the warning in the verification record and handle its cleanup through the owning task.

## Measurement Assessment

- The final-source logs contain the claimed actual saved/maximal graph checks, 1200-sample timing rows, callback guards, scan-read traces and full publication. The combined case explicitly includes fixed live-edit/horizon/publication work and adds the registered reset/write/event allowances: `apps/ultra/tests/alive_session_v3_measure.cpp:268`, `apps/ultra/tests/alive_session_v3_measure.cpp:305`. This is meaningful offline evidence for the initial finite profile, not evidence for admitting profile 8x4.
- The allowed node types and kernel counts are enforced in code. Focused inspection confirms reset clears armed/timer state, allowed parameter writes do not forward control messages, scheduled PolyNote input does not forward control triggers, and admitted signal outputs cannot awaken the dormant control chain. LineSignal's completion outlet is a control source only after an armed ramp; reset clears ramps and the allowed parameter path cannot arm one. Hosted editor/MIDI ingress is excluded. See `apps/ultra/src-tauri/native/patch_graph.hpp:437`, `apps/ultra/src-tauri/native/patch_graph.hpp:466`, `apps/ultra/src-tauri/native/patch_graph.hpp:615`, `apps/ultra/src-tauri/native/patch_graph.hpp:960`, `apps/ultra/src-tauri/native/backend.cpp:402`, `apps/ultra/src-tauri/native/backend.cpp:646`.
- The synthetic scan loop reads scalar event frames (`apps/ultra/tests/alive_session_v3_measure.cpp:356`); it is not an exact CPU upper bound for every production chase branch. Actual dense chase and maximal voice-edge cases are measured separately, and the policy correctly discloses the finite measured-family argument rather than claiming exhaustive topology timing (`apps/ultra/src-tauri/native/alive_session_v3_policy.md:119`). Do not relabel these distributions as a proven worst-case callback duration.
- The final combined case reports 256-frame p99.9 1829.705 us and maximum 1832.692 us on the recorded host. The retained earlier 64-frame maximum is 3016.577 us, above the 1333.333 us buffer. The final run does not erase that observation. The current documentation limits practical evidence to 256-frame-and-larger buffers on this host: `apps/ultra/src-tauri/native/alive_session_v3_policy.md:140`.

## Cannot Verify / Later Gates

- The earlier 64-frame observation's complete intermediate matrix and exact intermediate source snapshot are unavailable. The retained excerpt explicitly discloses that loss at `experiments/alive-clips-m3-20261024/task11-native/earlier-64-frame-observation.txt:1`. It establishes a reported earlier outlier, but cannot independently attribute the whole earlier run to the final source. The final-source full matrix is retained separately; this limitation does not invalidate it.
- Physical driver deadlines, scheduling lateness/xruns, uninstrumented end-to-end audio behavior and the final 1800-playing-second app soak are not established by these guarded offline durations. No such broader approval is given here; the task itself marks those as later gates (`apps/ultra/src-tauri/native/alive_session_v3_policy.md:101`, `apps/ultra/src-tauri/native/alive_session_v3_policy.md:140`).
- Task 12's desktop v3 integration/saved-format mapping, Task 13's measured eight-track admission, and Task 14's atomic scene execution remain unimplemented and intentionally disabled in this checkpoint. The separate Task 10 native walkthrough/harness issue is not resolved or graded by this native task review (`.superpowers/sdd/PLAN/task-11-review-context.md:59`).
- The new receipt tests exercise deterministic queue/epoch behavior and simple terminal reuse, but do not demonstrate a concurrent reader/producer stress of v3 publication and reuse while callbacks publish. Static inspection supports the atomic coherent snapshot and reservation design; the existing reported Stop stress is the legacy compatibility regression, not a substitute for that particular new stress case (`apps/ultra/tests/alive_session_v3_test.cpp:297`, `apps/ultra/tests/alive_session_v3_test.cpp:653`). This is a remaining verification limit, not a separately demonstrated race defect.

## Focused Checks Outside The Diff

- Risk: the new graph whitelist might admit an autonomous/control route that bypasses event accounting. Checked only the existing common graph/parameter validation, typed graph domains, runtime reset/parameter/PolyNote/LineSignal paths, and hosted ingress exclusions: `apps/ultra/src-tauri/native/alive_session.hpp:69`, `apps/ultra/src-tauri/native/alive_session.hpp:171`, `apps/ultra/src-tauri/native/patch_graph.hpp:28`, `apps/ultra/src-tauri/native/patch_graph.hpp:234`, `apps/ultra/src-tauri/native/patch_graph.hpp:437`, `apps/ultra/src-tauri/native/patch_graph.hpp:466`, `apps/ultra/src-tauri/native/patch_graph.hpp:615`, `apps/ultra/src-tauri/native/patch_graph.hpp:960`, `apps/ultra/src-tauri/native/backend.cpp:402`, `apps/ultra/src-tauri/native/backend.cpp:646`. The helpers omitted by diff context were checked for this concrete risk; no broader source crawl was performed.
- Risk: the new track-clear and graph-family claims could miss existing full DSP cleanup or notification ordering. Checked `CanvasRuntime::clear_voice_state/reset/stop`, the workspace stop delegation, and the native render/flush order: `apps/ultra/src-tauri/native/patch_graph.hpp:403`, `apps/ultra/src-tauri/native/patch_graph.hpp:437`, `apps/ultra/src-tauri/native/patch_graph.hpp:455`, `apps/ultra/src-tauri/native/canvas_workspace.hpp:52`, `apps/ultra/src-tauri/native/backend.cpp:416`. The implementation retains the full reset path and flushes deferred signal notifications after all roots.
- Risk: I1 might be only an interpretation of candidate state rather than externally visible receipt behavior. Checked existing C POD definitions to construct one minimal ctypes fixture, then ran the isolated one-callback probe documented in I1. No suite was rerun.
- Risk: reported test/timing success or the earlier outlier might lack retained evidence. Read the stated final logs, the parent-supplied manifest and earlier excerpt. Verified retained final timing, native result, Rust result and earlier-excerpt byte counts/SHA-256 against the manifest. The final native output reports all new gates plus the original 43,008-sample Stop comparison; Rust reports Ultra 179 passed/2 ignored and Alive 1 passed. The two ignored tests are the documented external-environment tests.

## Assessment

**Spec compliance: Issues found. Task quality: Needs fixes.** Fix I1 before treating the native receipt contract as ready for Task 12. M1 is a small diagnostic correction; M2 and the explicitly separated evidence limits do not establish additional runtime failures. The substantial admission, shared-runtime, Stop and actual-graph evidence supports keeping the repair focused.

Only this requested review report was written in the checkout. No source, index, HEAD, PLAN or ledger was changed; no build, GUI, broad test rerun or subagent was used.
