# Task 13a Review

Spec compliance: **Issues found** (T13A-R1, T13A-R2, T13A-R3, T13A-R4).
Task quality: **Needs fixes**.
Reviewed range: `16294e67ed2b94614b78f6ab1501d7918e8c6b79..68846ce`, using the supplied three-commit, 160461-byte complete review package. This is the Task 13a ownership/measurement gate, not the later whole-branch audit.

## Spec Compliance

- The main Driver/Alive lifetime path implements the required witness, bounded epoch retention, failure accounting and immediate terminal exit contingency, but Ultra native replacement callers do not all participate in the pending-retirement refusal (T13A-R1).
- The measurements are bounded within individual components, but the collector cannot consume 65 or more epochs even without losing one (T13A-R2), recorder process-group cleanup is incomplete (T13A-R3), and process budgets are not shared across the run's three sampled groups (T13A-R4).
- **CannotVerify CV-13A-1:** Final source/build/library association and final sequential enabled/disabled overhead controls remain pending. `.superpowers/sdd/PLAN/task-13a-report.md:3` explicitly leaves qualification in progress; `apps/ultra/src-tauri/src/audio_instrumentation.rs:145` supplies the native measurement seam but its existence does not establish a qualified result. The parent should close exact release executable/library hashes, common source/fixture/build provenance, observed buffers, clock/publication-tail distributions, and sampler/UI/capture controls before task acceptance. Do not infer these from the earlier paired run or failed overlapping native run.
- **CannotVerify CV-13A-2:** The parent independently inspected the accepted native clip/chain/control run: six contiguous finalized epochs, 3808 callbacks, 512 observed frames at 48 kHz, exact lifetime/histogram sums, zero CPAL/render/shape/budget errors, and 319488 finite capture frames with hash prefix `906ba53e`. This review does not rerun that journey or substitute it for pending artifact association. The raw accepted and diagnostic attempts remain parent-retained under `experiments/alive-streams-m3-20261024`.
- **CannotVerify CV-13A-3:** macOS/Windows terminal behavior is source-only here (`apps/ultra/src-tauri/src/audio.rs:413`); the Linux child-process seam is present at `apps/ultra/src-tauri/src/audio.rs:698`. Physical xruns and transient/exited-worker final CPU deltas remain unavailable, as required, rather than guessed.

## Strengths

- `apps/ultra/src-tauri/src/audio_epoch.rs:411` uses `Arc::get_mut` before taking the epoch, cleaning native state and merging once; `apps/ultra/src-tauri/src/audio.rs:259` gates native startup before allocating an attempt. The data/error ownership tests at `apps/ultra/src-tauri/src/audio_epoch.rs:503` independently retain owners and preserve late errors, and the 66-epoch test at `apps/ultra/src-tauri/src/audio_epoch.rs:530` verifies ring eviction and lifetime totals.
- `apps/ultra/src-tauri/src/audio_epoch.rs:251` uses a clear SeqCst publication protocol and updates only scalar slots plus touched histogram buckets. `apps/ultra/src-tauri/src/audio_epoch.rs:270` attempts at most three reads and retains the coherent cache on contention. The concurrent/coherent and forced-stale seams are at `apps/ultra/src-tauri/src/audio_epoch.rs:551` and `apps/ultra/src-tauri/src/audio_epoch.rs:565`.
- `apps/ultra/src-tauri/src/audio.rs:494` measures the full fill operation, including early returns and conversion, and `apps/ultra/src-tauri/src/audio_epoch.rs:481` exercises exact 256-frame budget edges. `apps/ultra/src-tauri/src/audio.rs:612` covers later-partition failure, whole-buffer silence, malformed/zero/post-failure callbacks and distinct counters.
- `apps/ultra/src-tauri/src/session/desktop.rs:171` propagates retirement refusal before Host installation; its regression at `apps/ultra/src-tauri/src/session/desktop.rs:740` preserves draft, history, generation and prepared roots. `apps/ultra/src-tauri/src/audio.rs:392` retains pending native ownership through immediate process termination instead of allowing normal destructors.
- `apps/ultra/src-tauri/src/audio_instrumentation.rs:124` preserves a reproducible owned-CPAL-payload probe, while `apps/alive/STREAM_OBSERVABILITY.md:69` explicitly separates the borrowed typed action from backend creation and owned-payload destruction. That approved API boundary is not a finding. The fixed Numeric record, active accumulator/publication/cache accounting and bounded ring at `apps/ultra/src-tauri/src/audio_epoch.rs:461` likewise follow the clarified per-retained-payload cap; JSON expansion and all active copies are not incorrectly charged to a single 8 KiB payload.
- `apps/ultra/tests/stream_measurement.py:26` parses complex process comm values and uses `(PID,starttime)` plus host HZ; missing resources remain unavailable rather than zero. `apps/ultra/tests/ci/check-contracts.sh:9` adds the lightweight units, and `.github/workflows/ultra-ci.yml:178` replaces the existing clip journey with the wrapper without duplicating it.

## Issues

### Critical

None established in this scoped review.

### Important

**T13A-R1 - Ultra native installation and root close bypass retirement_pending.**

References: `apps/ultra/src-tauri/src/lib.rs:408`, `apps/ultra/src-tauri/src/document_commands.rs:55`, `apps/ultra/src-tauri/src/document_windows.rs:547`, `apps/ultra/src-tauri/native/backend.cpp:626`, `apps/ultra/src-tauri/native/backend.cpp:738`.

The alternate Ultra audio start/stop/configure commands now honor the Driver contract, but the document admission and root-close routes still take only the document/audio control locks and call native installation/close without consulting AudioIo. A failed-open or play-failed epoch can remain retiring while native `running` is still true: native stop intentionally waits for the closure witness. In that state these native functions can still enqueue installation/close and update their admitted/requested root state. The brief requires native replacement refusal while that one unresolved epoch owns the native state; checking only the audio commands does not establish caller completeness. This is an unfulfilled ownership/refusal contract, not a claim that the existing native queue itself necessarily causes an immediate use-after-free.

Gate the centralized Ultra native replacement/root-close paths with the serialized Driver's nonblocking retirement check, preserving authoring state on refusal. Preserve the authorized terminal Quit contingency: pending native root cleanup must not make Quit permanently unavailable. Add focused pending-retirement tests for Ultra admission and root close, including authorized Quit, rather than only Driver start/configure and Alive Apply.

**T13A-R2 - A fully collected run fails as soon as epoch 65 is retained.**

References: `apps/ultra/ui/alive.mjs:382`, `apps/ultra/tests/stream_measurement.py:150`, `apps/ultra/src-tauri/src/audio_epoch.rs:461`.

The UI always requests `after:'0'`, while EpochCollector immediately rejects the resulting `coverage_gap` before checking its own cursor. Once the 64-record ring evicts epoch 1, the app truthfully marks the request-from-zero gap, even if the harness already finalized every epoch through 64. Consequently a run allowed up to 256 attempts is guaranteed to stop at 65. The existing 66-epoch Rust test correctly tests app eviction, but does not cover this consumer integration.

Focused probe result: `CONTIGUOUS_EPOCH_PROBE: collected=64, next=65, error=epoch_coverage_gap`. The probe fed each successive observation, with its complete last-64 ring, to the actual EpochCollector; no epoch was skipped.

Request completed epochs after the collector's cursor as designed, or explicitly distinguish an already-collected prefix from a genuinely missing interval when consuming the UI's retained-ring view. Add a 65+ epoch consumer test that succeeds with contiguous polling and a separate genuinely lost-epoch test that fails. Preserve complete per-epoch summaries in the incremental artifact when records leave the app ring.

**T13A-R3 - Recorder finish reports success with a live owned helper.**

References: `apps/ultra/tests/stream_measurement.py:225`, `apps/ultra/tests/stream_measurement.py:227`, `apps/ultra/tests/stream_measurement.py:229`.

The supervisor sends SIGTERM to the recorder process group, but escalates to SIGKILL only if `child.wait()` times out. That wait observes the group leader only. If the leader exits normally on SIGTERM while a helper ignores it, wait succeeds and the supervisor exits with `complete=true`; the helper remains alive. It can retain inherited output descriptors and continue consuming resources/writing after finish, so the required owned-recorder cleanup and independent post-exit bounds are not established.

Focused probe result: `RECORDER_HELPER_PROBE: complete=True, reason=requested_stop, helper_survives_finish=True`. The artificial recorder forked one helper which ignored SIGTERM. The review probe explicitly killed and reaped that helper afterward; no process was left running.

Ensure the entire owned group is gone before reporting successful cleanup, even when its leader exits promptly, and cover that case in the short fake-recorder tests. Also make the supervisor-timeout fallback at `apps/ultra/tests/stream_measurement.py:180` terminate owned recorder processes before killing the supervisor; currently that fallback knows only the supervisor PID.

**T13A-R4 - Process limits apply separately to each tree instead of to the run.**

References: `apps/ultra/tests/check_alive_observability.py:23`, `apps/ultra/tests/check_alive_observability.py:24`, `apps/ultra/tests/check_alive_observability.py:25`, `apps/ultra/tests/stream_measurement.py:51`, `apps/ultra/tests/stream_measurement.py:77`.

The design fixes a run at 64 simultaneous sampled processes and 256 distinct process identities, while requiring separate reporting for app, sampler/capture and private-server overhead. Each of those three samplers currently owns an independent CpuTracker and receives the full limits. A run can therefore sample more than 64 processes, or retain more than 256 identities, without any limit firing. Separate accounting does not require separate admission budgets.

Enforce the limits on the union of sampled `(PID,starttime)` identities across the run, with distinct group attribution retained. Add a small fixture where each group is individually within its limit but their combined identities exceed the run limit, and require incomplete termination rather than a complete manifest.

### Minor

**T13A-R5 - Inherited validation warnings remain visible, outside this task's introduced defects.**

References: `apps/ultra/src-tauri/src/document_windows.rs:39`, `.superpowers/sdd/PLAN/task-13a-report.md:92`.

The inspected `audio-freeze.log` and `alive-rust.log` contain the pre-existing unused `QuitSession::reserve_native` warning. The report also identifies inherited Impeccable font/palette findings. These are not new callback/measurement regressions and are not blockers added by this scoped review; keep them attributed to their original scope and the planned full-surface audit rather than describing validation output as pristine.

## Checks And Review Boundaries

- Read the supplied complete diff in one logical pass. Two tool responses truncated portions of that package; only the omitted spans were recovered. No separate whole-file reread of changed source, git commands, suite reruns, branch/index/source edits or subagents were used.
- Named outside-diff risk: incomplete native lifetime-changing callers. Searched Rust callers of native stop/start/reset/root close and Driver control methods, then inspected Ultra's document admission/root-close routes, Alive file/device decisions, Host apply/reset, and the corresponding native queue-versus-immediate-install guards. This establishes T13A-R1 and confirms that Alive's central install propagates the witness refusal. Headless probes/test-only synchronous callers were distinguished from CPAL ownership paths.
- Named outside-diff risk: recorder bounds must cover the actual capture call sites. Checked the existing walkthrough/endurance and saved-clip capture calls; no alternate implementation was substituted for the new Recorder helper.
- Ran only two focused Python probes raised by concrete code doubts: contiguous 65-epoch collection and recorder helper cleanup. Imported source with `PYTHONDONTWRITEBYTECODE=1`; temporary probe files lived outside the checkout, and the helper was explicitly killed/reaped. Both probes reproduced the failures quoted above; no broad test suite was rerun.
- Inspected retained log result/warning lines: `/tmp/alive-task13a-evidence/rust-full.log:208` reports 198 passed/3 ignored; `/tmp/alive-task13a-evidence/audio-freeze.log:39` reports 17 passed/2 ignored; `/tmp/alive-task13a-evidence/alive-rust.log:21` reports 1 passed. These are the recorded runs, not a fresh final-source/build qualification by this reviewer.
- Fixed numeric memory accounting follows the parent's binding interpretation. The strict app-owned no-allocation/free/lock boundary excludes pinned CPAL's owned error creation/destruction exactly as specified. Neither accepted clarification is reopened as a missing universal backend realtime guarantee.

## Assessment

**Task quality: Needs fixes.** The core epoch witness, fill counters, bounded publication and Alive integration are well separated and have meaningful focused tests. The four Important findings leave native caller refusal, long-run epoch collection and run cleanup/budget guarantees incomplete; pending final build/overhead provenance remains a separate CannotVerify item for the parent.
