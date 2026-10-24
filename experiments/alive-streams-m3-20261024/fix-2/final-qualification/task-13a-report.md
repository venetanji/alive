# Task 13a implementation / qualification report

Status: source checkpoint committed; qualification IN PROGRESS. The complete
release clip journey now passes; standalone CPAL, overhead controls and final
artifact association remain. This is not a completed-task acceptance claim.
Parent owns this PLAN/report retention and later independent review. All raw
local evidence is in `/tmp/alive-task13a-evidence/` pending parent retention.

## Source checkpoint

- Base: `16294e6`; implementation: `910fabf` (`Retain witnessed stream epochs and
  bound host measurements`). Only the16 listed app source/test/docs files were
  included. Parent PLAN/ledger/retained experiments changes were not committed.
- Existing strict-v3 fallback/history/receipts/capacities/native DSP remain.
  No native source, capacity, scene, schema, credential, persistent settings,
  release branch, tag, publish, MIDI or30minute run changes.
- Core units: `audio_epoch.rs` owns fixed counters/publication/witness/retention;
  `audio.rs` owns CPAL fill/start/stop/configure and terminal shutdown;
  `audio_instrumentation.rs` contains test-only allocation/clock/overhead probes.
  `stream_measurement.py` owns finite CPU/resource/capture/accounting helpers.
- `session/desktop.rs` gates install/Apply/file/configure and final Exit;
  `lib.rs` gates Ultra's start/stop/configure and final Exit. Host's precondition
  explicitly includes failed-open closures. Scoped native transport Stop keeps
  its accepted early bypass of generation/draft gates.
- Full records are served through bounded diagnostics commands; routine snapshots
  contain scalar summaries. Optional collapsed Stream measurements is inside
  existing Audio details. u64 audio/Ultra counters serialize as decimal strings.
- Contract: `apps/alive/STREAM_OBSERVABILITY.md`; README links it.

## Binding interpretations / limitations

Parent explicitly clarified the8KiB cap as fixed numeric payload per retained
record, not all copies or decimal JSON bytes. The active ordinary accumulator,
atomic publication and one coherent read cache are separately bounded/measured
(~12KiB);64records remain below1MiB. Diagnostics expose sizeof values and exact
histogram edges. Final measured values/wire bounds will be appended.

Pinned CPAL Error owns optional Cow message storage. Parent approved preserving
the dependency and qualifying the no-allocation/free/lock claim to the complete
app-owned data fill/clock/publication path and borrowed typed error action.
Backend Error construction and by-value payload destruction are explicitly
excluded: they can allocate/free and are NOT claimed bounded/RT-safe. A focused
owned-message test observes0 action allocations/frees and1 payload-drop free.
No message copying/logging/formatting/retention/leaking is introduced.

Linux terminal behavior is child-process tested. macOS `_exit` and Windows
`TerminateProcess` are source implementations, not runtime-qualified here.
Unix terminal evidence is best effort (nonblocking <=4096byte write, possibly
partial/unavailable); Windows lacks a guaranteed final observation transport.
Physical audio/xruns and transient/exited-worker final CPU deltas remain
unavailable; no inference fills these gaps.

## Tests and commands so far

Commands run from the workspace root. Rust environment:
`PATH=$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH`,
`CARGO_HOME=$PWD/experiments/clockwork-faust/.deps/cargo`,
`ULTRA_NATIVE_LIB_DIR=$PWD/apps/ultra/build`,
`LD_LIBRARY_PATH=$PWD/apps/ultra/build`.

| Check | Observed result | Raw evidence |
|---|---|---|
| Baseline Stop retention regression | expected FAIL:callbacks7->0 | `red-stop.log` |
| First lifecycle implementation |7pass/1private ignored | `green-audio-initial.log` |
| Focused epochs/fill/witness/concurrency/terminal tests |15pass/1ignored | `green-audio-focused.log` |
| Shared release Rust full lib suite |198pass/3explicit ignored | `rust-full.log` |
| Alive companion Rust suite |1pass | `alive-rust.log` |
| Final checkpoint focused audio tests incl allocation/owned Error |17pass/2explicit ignored | `audio-freeze.log` |
| Python new-helper red | missing module import (feature absence, not behavioral red) | `red-sampler.log` |
| Python CPU/capture/metadata/playing/PSS/reparent fixtures |5pass | `sampler-final.log` |
| Unchanged native app/ABI/admission/allocation/free/mutex guards |PASS through final43008sample stop stress | `native-guards-full.log` |
| Unchanged full contracts | Node/UI/reference checks pass until missing jsonschema environment dependency | `contracts-full.log` |
| Exact remaining contracts from failing jsonschema gate onward |PASS using ephemeral uv environment | `contracts-remaining.sh`, `contracts-remaining.log` |
| CPAL lifecycle source SHA-256 pins |4/4PASS | `cpal-source-hashes.log` |
| Initial paired overhead diagnostic |PASS,24distribution rows; predates final source hash and will rerun | `paired-overhead.log` |

Shared Rust command: `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml
--release --locked --lib -- --nocapture`. Focused command substitutes `audio::`
for `--lib`. Companion uses `--manifest-path apps/alive/src-tauri/Cargo.toml
--target-dir apps/ultra/src-tauri/target`.

Python: `python3 -m unittest discover -s apps/ultra/tests -p
 test_stream_measurement.py`. Native: `bash apps/ultra/tests/ci/check-native.sh`.
Contracts: `bash apps/ultra/tests/ci/check-contracts.sh`; continuation:
`uv run --no-project --with jsonschema bash
/tmp/alive-task13a-evidence/contracts-remaining.sh`. The script is an exact tail
of the unchanged guard beginning at its failed schema gate; earlier expensive
unrelated suites were not repeated. Its generated tracked native-build receipt
was copied to `contracts-generated-native-build.json` then restored to the
pre-run repository bytes; no user edit was reverted.

Known pre-existing Rust warning: unused `QuitSession::reserve_native`.
Impeccable detector reports incumbent font/palette warnings in Alive's existing
surface (`ui-detector.json`); this slice preserves that language. No broad UI
redesign was performed.

## Build / runtime evidence in progress

Native was rebuilt in separate `/tmp/alive-task13a-native-build` with Release
CMake and target `ultra-diagnostic`; `native-configure.log` and `native-build.log`
show success. Newly linked library bytes were copied to temporary files beside
both `build/libultra_native.so` and the adjacent release library and installed
with `os.replace`. No mapped library inode was overwritten. Separate Ultra and
Alive release builds are logged in `build-ultra.log`, `build-alive.log`, and
`build-alive-final.log`. Current checkpoint executable/library hashes are in
`checkpoint-artifacts.json` (Ultra needs its final metadata-only source rebuild).

Actual command:
`ULTRA_TEST_ALIVE=1
ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_observability.py
bash apps/ultra/tests/check_canvas_desktop.sh OUTPUT`.

First run: `native-clips/` and `native-clips-runner.log`, retained as FAIL. The
expanded measurement explanation and2row textarea increased the fixed footer
until it covered the selected-device editor button at y529 (footer starts y531).
Click46 therefore did not open Pulse's editor; the unchanged editor-window
assertion failed at `check_alive_clips.py:89`. `native-focus-failure.png` and
`native-focus-failure.json` establish the overlay. Native callbacks continued
with stream errors0/failedfalse. Raw epoch rows preserve their embedded audio
source ID; library identity/build logs are retained. The first pre-correction
executable SHA-256 was not captured before rebuild and must not be invented.

Correction included in910fabf: explanatory text moved into the disclosure title,
textarea reduced to1row. No shared input guard or editor assertion was weakened.
Second run `native-clips-compact/` is underway with the rebuilt correction.

Remaining: finish exact-release native clip/chain repeated controls with epoch
coverage/resource summary, standalone CPAL capture, final source paired overhead,
telemetry-enabled/disabled release control evidence, final build hashes/self
review and report completion. No Task13a completion claim yet.

### Narrow harness follow-up checkpoint

`28a149d` follows910fabf, changing only `check_alive_observability.py`.
The compact-footer second run completed the entire accepted clip journey and
wrote `native-clips-compact/native-clips-report.json`. Its added stopped editor
cycle then failed because the reused legacy helper required Automation while
the actual stopped native parameter correctly reported `Base:900Hz`.
The added cycle now explicitly edits/still verifies Base ownership while stopped;
the accepted original helper/window assertions are unchanged. Stable main
accessibility nodes are cached. Defunct editor nodes cause explicit observation
gaps; missing transport resets the proven-playing anchor. Sampler/epoch errors
remain fatal, are persisted, and fail the next control action. Python compilation
and diff checks pass. The running `native-clips-final` attempt uses the same
293208e0 Alive binary, with the stopped-owner/cache correction; final gap-recording
lines were added after that harness process began and are separately reviewable.
Source review range is now16294e6..28a149d. Runtime qualification is still pending.


### Final native journey and review checkpoint

The new wrapper completes the unchanged original clip journey plus three short
Stop/Apply/configure/editor cycles in `native-accepted/`, exit 0 (runner log
`native-accepted-runner.log`). Evidence: six finalized contiguous epochs,
3808 callbacks, requested/observed 512-frame stereo buffers at 48000 Hz,
8.010979165995028 proven-playing seconds, 46.919748601998435 excluded seconds,
105.96830414699798 wall seconds. Typed CPAL errors, native render failures,
invalid shapes and over-buffer processing budgets are all zero. This is private
software PipeWire output, `physical_audio=false`, physical xruns unavailable.
No hidden/unobserved interval is credited as playing.

Raw resources/epochs/actions are respectively 401906/149932/5918 bytes, SHA-256:
- `7f8b77772b10b089d98e7b64567cad95a8f276a046426583d8b9419134e55166`
- `b28e71b77d79b999ac9291f5799e766171eb0d504b62efbbfd1f13f59c851072`
- `a70fa1de0b9b62ed5f46595b8116534bd1b2eb8e55bbd003440b61fd0c5d3c1b`

Retained intermediate failures remain separate: `native-clips-final/` exposed
concurrent AT-SPI transient/defunct windows during save; all UI collection now
runs on the driving thread and only /proc collection remains in the worker.
`native-clips-single-ui/` exposed empty hidden frame text; this now records an
unavailable gap and clears the playing anchor instead of interpreting zero.
`controls-probe/` independently passed the added cycles (five epochs,
4.2447 proven-playing seconds). The accepted original clip/window assertions
are unchanged.

The narrow follow-up source checkpoint adds those harness fixes, wires the five
sampler units into Linux contracts, and replaces the single saved-clip CI call
with the wrapper (same five-minute bound/artifact retention, no duplicate run).
It also adds an ignored release native-render overhead test with the exact
saved v3 fixture, three repetitions at each 256/512-frame buffer and 5000 timed
samples after 64 warmup callbacks. The warmup still contributes to metrics.
The first `overhead-enabled-final.log` failed on repetition two because the
harness reused request serial 1; the native strict-v3 monotonic-serial guard
correctly rejected it. Production runtime already increments serials. Only the
test harness serial is corrected. Its fake/native tests also overlapped, so
that failed timing run is not used as qualified overhead evidence. Sequential
reruns use `--test-threads=1`; no native admission/receipt/cap was changed.


### Source association, storage and completed overhead checks

Review checkpoint is `68846ce83b56e8e4c419b22685f8486a240764d8`, following
`910fabf` and `28a149d`. `source-checkpoint-manifest.json` lists each changed
source's current and committed SHA-256 and unchanged harness/native dependencies;
all changed paths match this commit. Production code is identical to910fabf;
the later commits change harness/CI/test-only code. Embedded audio source ID is
`c6dcbacaaa944b3ecb2ec2e0a69e0aba6a2d2bff11c2f5de90eb8fa1001b0a99`.
The accepted Alive executable SHA-256 is
`293208e065f39cee382354184d60b9d064a41b1c34a197bd6acc60110fc26eb7`;
the freshly built adjacent native library SHA-256 is
`36ca6d5dabb59949d04d600d57a5c529e79e17d144e7af35335ee4e91a43718c`.

Actual numeric storage:3856 bytes per ordinary record,3904 bytes for atomic
metrics,11616 bytes for active ordinary/atomic/coherent-cache machinery,246784
bytes for64 completed numeric payloads. The focused layout guard additionally
bounds64 complete Rust records below1MiB, with separately bounded strings.
`storage-wire-bounds.json` constructs a deliberately larger full-wire case:
64 completed+1 active+lifetime, all u64 values at20digits,512 maximally escaped
device characters and oversized finite string fields. It measures1017406 UTF-8
JSON bytes; the conservative stated wire bound is2MiB. This is distinct from
numeric-memory limits; live serde serialization has transient allocation cost
on the control thread and is optional, never on the callback.

Standalone unchanged CPAL capture guard passes:
`bash apps/ultra/tests/check_cpal_audio.sh /tmp/alive-task13a-evidence/cpal-final`.
`cpal-final/` retains probe/build/PCM/capture validation.150528 stereo frames
at48000Hz, all finite, both peaks0.13779526948928833. Capture exits1 after
intentional SIGINT, accepted only by the existing exact-version/empty-stderr
validator; this is retained raw and not presented as a generic successful exit.
It verifies software signal, stop/start and saved configuration reload, not a
physical output or xrun count.

Enabled and disabled native-render release tests each pass three repetitions
at256 and512frames,5000 samples per repetition with64 warmup callbacks retained
in metrics. Exact saved v3 fixture SHA-256:
`e50033d6bb2459ce4d7bdf541ba528bd5b3ad1f9a97b646b1b2746ae6b056c46`.
The recovered fixture has2tracks/4devices with absolute source references;
it does not change the admitted2track/6device/8clip profile. Same source/native
library/host are used; `telemetry-disabled` removes duration clocks/histograms
while retaining lifecycle/counters/publication. Backend is synchronous native
external render, so these are whole fill-path distributions, not CPAL dispatch
or physical deadline measurements. Guard allocator is present in the test
binary but inactive for these timings; native malloc/mutex diagnostics are a
separate build/measurement.

Commands use the documented Rust environment plus
`ALIVE_MEASUREMENT_SESSION=/tmp/alive-task13a-evidence/control-fixture.alive`:
- enabled: `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release
  --locked --lib audio::instrumentation:: -- --ignored --nocapture --test-threads=1`
- disabled: same with `--features telemetry-disabled
  native_saved_clip_release_overhead -- --ignored --nocapture --test-threads=1`

`overhead-enabled-sequential.log`, `overhead-disabled-sequential.log` and
`overhead-comparison.json` retain all distributions, sample counts/maxima and
source IDs. Enabled256 p50 ranges317297..317628ns, p99.9 368624..498730ns,
max578891ns; disabled256 p50 318690..318810ns, p99.9 491386..621991ns,
max641007ns. Enabled512 p50 626951..627742ns, p99.9 693136..1081666ns,
max1117454ns; disabled512 p50 629596..630948ns, p99.9 731257..921846ns,
max1117205ns. Noise makes the disabled medians slightly higher; no overhead
mean is subtracted from any percentile and no speedup claim is made. Exact
fake-render clock/fill/tail distributions are retained alongside native rows.

Measured host:AMD Ryzen9 5900HS,8cores/16threads,x86_64 Linux,frequency scaling
and boost enabled (not pinned); `hardware.txt` retains lscpu/uname. This limits
small differential timing conclusions. Actual release journey uses private
PipeWire stereo48k, requested/observed512; native timing controls separately
exercise actual256/512 fill buffers.


### Additional checkpoint verification and unresolved controls

Separate final Ultra release rebuild passes (`build-ultra-final.log`). Its
SHA-256 is `924d21eb5c3c58c6cea923bb009db136f78266b6322cc932fd9d241235c53bd6`.
`checkpoint-final-artifacts.json` associates current Alive/Ultra, both native
library locations, harnesses, fixture and measurement scripts by exact bytes;
both native library locations match. Default production builds have timing
telemetry enabled. Final focused audio suite:17 passed/3 intentionally ignored
in `audio-checkpoint-final.log`; the new ignored native timing probe and older
fake timing/real-device probe were each executed explicitly elsewhere.

The independent review is underway on16294e6..68846ce; source remains frozen.
No final Task13a acceptance claim is made while that review is pending.

`overhead-controls/` retains two8second intervals for each baseline,1Hz sampler,
sampler+optional1Hz diagnostics, and sampler+diagnostics+software capture.
Each interval has >7.47 proven-playing seconds. Ordinary80ms UI polling and
1Hz transport AT-SPI reads remain constant. App/sampler-capture/private-server
observed CPU percentages (100%=one core), repetitions0/1:
- baseline:42.448/41.102 app;2.475/0.990 observer;0.371/0.495 server.
- sampler:39.095/40.055 app;7.919/7.913 observer;0.495/0.371 server.
- diagnostics:53.832/39.720 app;8.418/7.671 observer;0.371/0.495 server.
- capture:38.717/38.623 app;9.522/9.778 observer;0.495/0.248 server.
Both capture stages contain finite PCM with peak0.2225944548845291.

These per-interval measurements are retained but their optional-polling labels
are unqualified because disclosure state was not asserted. This control run is
**INCOMPLETE**: after all eight stages its final diagnostics assertion observed
a still-running epoch rather than a complete final record. Do not relabel that
snapshot final or use this run as complete epoch evidence. The accepted full
native journey has separate complete retirement evidence. A narrow closure
probe is investigating UI freshness/control sequencing; its first diagnostic
attempt itself incorrectly queried a hidden disclosure and failed with Missing
native control, retained separately in `closure-probe/`. No product or accepted
assertion change is made on this evidence alone. Exact raw metadata/logs are
retained, and no mean overhead is subtracted from callback percentiles.


The narrow `closure-probe-visible/` establishes that nested Stream measurements
was already expanded after reopening Audio details; the unconditional final
click collapsed it. The cached textarea then preserved the old running record,
while a fresh lookup correctly reported it hidden. This is a control-harness
observation error, not evidence that native retirement failed. The earlier
comparative labels are unqualified because blind toggles did not establish
actual optional-polling state. `overhead-controls-verified.py` explicitly asserts
expanded/collapsed state for every measurement stage and waits for fresh complete
diagnostics; its separate run is in progress. No product/source fix is inferred
from this ephemeral-probe failure.


## Fix round 1: T13A-R1 through T13A-R4

The accepted independent review found four Important defects, no Critical.
All four have focused corrections; source is ready for scoped re-review,
with rebuilt-app runtime qualification still pending. R5 warnings remain
attributed/deferred. Original incomplete/failed runs remain unchanged.

R1: centralized `admit_owned` and `close_owned` call the serialized Driver's
nonblocking retirement refusal. Desktop current/admit/commit/history/apply and
message-text paths retain the Driver lock through native admission. New/open/
instantiate and ordinary native Close/Discard reject pending retirement before
changing owner state. Normal running epochs still permit Ultra live authoring.
Application Quit approval bypasses ordinary-close refusal and retains roots until
existing final Driver exit/contingency. New tests preserve graph revision,
authoring/history and native roots with independent data/error owners, accept
normal running admission, and child-test approved Ultra terminal exit without
unwinding native ownership.

R2: the collector compares the retained view's oldest epoch with its own cursor;
an already-collected evicted prefix is valid, while a missing epoch remains
fatal.70 successive attempts preserve70 final records in JSONL. Run changes,
provisional completed records, overflow and attempt257 fail explicitly.

R3: the supervisor owns a session/group established by the parent before recorder
launch. It adopts grandchildren on Linux, signals/kills all live group members
and reaps helpers even after a leader exits promptly. Parent timeout freezes
and kills owned members before killing the stalled supervisor group, waits,
writes an incomplete manifest and raises. Real short fork tests cover both an
ignoring helper with a promptly exiting leader and a SIGSTOP-stalled supervisor;
no live helper is deliberately retained. Group IDs are in capture manifests.

R4: `ProcessGroups` enforces64 simultaneous/256 lifetime identities on the union
of app, observer/capture and server reports. Separate per-group CPU values remain
unchanged. Both the native clip wrapper and legacy walkthrough/endurance use
one such budget per run. Fixtures independently exceed the union's process and
identity bound while every constituent group fits.

Focused red evidence: `fix1-sampler-red.log` reproduces epoch65 rejection and
live-helper survival; `fix1-union-both-red.log` reproduces both combined budget
escapes; `fix1-ultra-red.log` reproduces pending admission (its following close
test hit the intentionally poisoned lock), and independent
`fix1-ultra-close-red.log` reproduces root-close bypass. Extra collector-quality
red is `fix1-epoch-quality-red.log`. Green: `fix1-owner-corrected.log`19 pass,
`fix1-sampler-freeze.log`10 pass, `fix1-rust-full.log`203 pass/4 explicit ignored,
`fix1-alive-rust.log`1 pass. Commands are the existing documented cargo release
lib/companion and unittest discover gates; Python compilation/diff checks pass.

Two new-test mistakes are retained, not product regressions:
`fix1-owner-green.log` used a native slot whose retained revision collided with
another test and an incorrect exact child-test module filter (zero matches).
Distinct owned test slots and the correct lifecycle_tests path fix the probes;
the terminal assertion caught the zero-match mistake. A sampler test's /proc
exists-then-read race during successful helper disappearance is retained in
`fix1-sampler-all-green.log`; the test now treats ENOENT/ESRCH as gone and still
fails for any live process. The final ten tests pass.

Timing impact assessment: no native source, fill/clock/histogram/publication or
error callback work changes in this fix. `audio.rs` changes only cfg(test) owner
seams, which changes its embedded source digest but not the production callback.
The previously sequential enabled/disabled distributions remain measurements of
their explicitly named68846ce/c6dcbac source checkpoint; they are not relabeled
as new binary measurements. Rebuilt binaries/harnesses and final runtime evidence
will carry corrected source IDs separately.

The disclosure investigation is resolved at the input layer:
`disclosure-probe/expanded.png` shows the long title tooltip covering the native
summary center. State/geometry logs report expanded before and after a center
click; focused Return changes it to collapsed. This introduced pointer/tooltip
interaction remains visible for the later full-surface audit. Keyboard activation
can verify optional-polling stages without claiming mouse behavior repaired.
Original blind-toggle comparative labels remain unqualified; explicit keyboard
state-controlled comparisons are pending against rebuilt corrected binaries.


### Corrected ccba93b runtime evidence

Fix1 source is `ccba93b2e0a76915a9b060d604cc8c62a8f72c29`.
`fix1-source-manifest.json` verifies current/committed hashes for every changed
path; `fix1-artifacts.json` associates binaries, native library, harnesses,
fixture and the exact corrected-control script. Both default release builds
pass (`fix1-build-ultra.log`, `fix1-build-alive.log`). Native bytes remain
`36ca6d5dabb59949d04d600d57a5c529e79e17d144e7af35335ee4e91a43718c`;
`fix1-adjacent-libraries.json` records atomic replacement on fresh inodes.
Alive SHA-256 `a2f7ea6a57a7c7669c6b43b66d4db7c20cf129c59afd7912b25a51679b7401a0`;
Ultra SHA-256 `1fed1a6a2f0bc2d6fbb11fd9e1337ad1e73368916a0ff61bbd98006ad223ac12`;
embedded audio source `db3937551d59a00e195d7ed23440fb0d2b5d6cacf37fb2534e98e34c25c09d75`.

Normal Ultra native document journey passes (`fix1-ultra-documents/`, runner
exit0): live/shared edits, owner undo/redo, Save/Discard/Cancel, New/Open and
path forwarding, independent help/editor/child windows, ten list objects,
twelve MSP objects, scoped Stop and global restart. This is the unchanged
`check_documents_desktop.py` through the private desktop runner.

Corrected complete Alive clip wrapper passes (`fix1-native-accepted/`, runner
exit0): six final contiguous epochs,3826 callbacks,512 observed min=max at48k,
7.986888447354159 proven-playing seconds,48.20276750896301 excluded,
106.36061740999867 wall, no sampler errors. Typed CPAL errors, native render
failures, invalid shapes, counter overflow and processing-budget exceedances
are zero. Native clip/source/receipt assertions remain unchanged. This is
software audio only, not physical xrun or deadline qualification.
Raw resource/epoch/action bytes are404633/149923/5915 respectively, SHA-256:
- `084d082b3f2d27f68b1e88c75a54334ad64948775bc0496ea7a8cf81a2525b95`
- `7f19badec0a7cc93f6e4c524a977d13bdeedb24d38eeae04f8d1af3374c3380b`
- `2c5f5a9c353b29ff33af7492613f6501098a0c5dceceb8a83c75e8026a639683`

`fix1-resource-summary.json` derives74 resource samples and per-action counts
from the raw resources. App PSS has73 available/1 unavailable values: first
available513996KiB,last501254KiB,p50551104KiB,p95609707KiB,max613485KiB,
endpoint delta-12742KiB. Observed app CPU max133.564% of one core;15 identity
coverage gaps,2..3 WebKit workers. Separate app/observer-capture/private-server
PSS/RSS/CPU/thread/fd/sample-duration distributions and endpoint changes are in
the summary. These short endpoint decreases are not a no-growth claim and
CPU remains an observed-identity lower bound with unknown exited final deltas.

Scoped review interim identifies remaining R1 `canvas_param` direct headless
admission, including its initial runtime installation branch. ccba93b therefore
is not final acceptance despite its passing normal/runtime checks. Source stays
frozen pending the scoped report; final keyboard/state-verified overhead
controls are deferred to the final corrected artifact checkpoint. The same
ProcessGroups budget instance spans every stage of that pending control script.

### Fix round 2: remaining canvas_param caller

Against ccba93b, the actual Tauri `canvas_param` now locks registry -> Audio ->
AudioIo and invokes a focused production `canvas_parameter` helper containing
its existing revision validation, nested-node update and registry commit. Its
admission closure uses `admit_owned`; no native or authoring/history mutation
precedes the witnessed retirement check. Numeric hints and revision-zero forced
installation retain their previous successful behavior. Other command gates,
authorized Quit and scoped Stop are unchanged.

The two new native-backed regressions call the exact production helper. They
cover nested child numeric changes with both undo and redo populated, unchanged
native status/revision and owner/view descriptors on refusal, data-only and
error-only ownership in opposite release orders, successful history replay after
witnessed retirement, live authoring while running with a real native render,
and initial revision-zero install followed by undo. Stale revision and unknown
node validation remain checked.

All paths below are in `/tmp/alive-task13a-evidence/`:
- `fix2-numeric-red.log`: exit101, numeric edit passed unresolved retirement.
- `fix2-initial-red.log`: exit101, revision-zero route installed during retirement.
- `fix2-owner-green.log`: first corrected run exposed a test assumption: the
  live native command is queued until render, so immediate status still read2
  instead of4. Following failures were poisoned-lock fallout. The test now
  renders256 native frames before asserting the value; no product workaround.
- `fix2-owner-corrected.log`: exit0,21 owner/command/lifecycle tests pass, including
  authorized terminal Quit. Command: cargo test --release --manifest-path
  apps/ultra/src-tauri/Cargo.toml --lib document_windows:: -- --nocapture.
- `fix2-ui-routing.log`: exit0, existing canvas-model, canvas-arithmetic,
  canvas-hierarchy and canvas-shared Node tests pass, preserving command shape
  and existing numeric/history routing. `git diff --check` passes.

Finite caller audit: `fix2-admission-callers-final.txt` retains the complete rg
search for admit_owned, direct commands::admit, admit_message, native root
install and close. All six desktop Ultra admission routes are gated: document
current/commit/history and canvas apply/message-text/parameter. Direct headless
`commands::admit` production calls remain only in instrument_probe. The only
production `admit_message` calls are the gated wrapper and the explicit headless
wrapper. Ultra ordinary native root close uses close_owned; authorized Quit
retains the terminal path. Alive Host::apply roots are reached from initial
setup before Driver creation or from Control::install after Driver::stop; exit
root cleanup follows authorized_exit. Remaining direct install/close sites are
headless instrument/session probes or cfg(test) native qualification. No new
matching desktop bypass was found; this is a finite source audit, not a claim
of race coverage on every platform.

No fill, clock, histogram, publication, error, sampler, native or UI source
changes occur in this round. Prior timings and ccba93b normal Ultra/Alive
journeys keep their original source identities. Rebuilt artifact comparison,
targeted real Ultra authoring and explicit-state overhead controls follow the
source freeze; no Task13a acceptance claim is made here.

### Final 3024057 builds and affected Ultra workflow

Frozen source: `30240579dde52edb9de6c5fdcb7741fa1524b95c`; the scoped fix-two
review accepts R1 with no new breakage. R2/R3/R4 remain accepted. The source-only
commit changes three Ultra command/test files; source is frozen throughout
qualification. `fix2-source-manifest.json` verifies all changed source hashes
against this commit. The exact fix-range diff check is retained separately in
`fix2-diff-check.json` (exit0). The earlier Node log contains84 passing tests.

Both default production release builds pass, with commands matching fix1:
`fix2-build-ultra.log` and `fix2-build-alive.log`. `fix2-artifacts.json` records
all exact binary/library/harness/fixture/control-script hashes; the embedded
audio source remains db3937551d59a00e195d7ed23440fb0d2b5d6cacf37fb2534e98e34c25c09d75.
Alive:13561240 bytes, SHA6748f33372741244b417d0610a5105b926b893fbd7b742c8297b499dbc220ebd.
Ultra:17418400 bytes, SHA83217a1b207b9c2d29543d9f6bc0639349aeaf53ba6dc5d1ca1713a1ef36766e.
Native:12921768 bytes, SHA36ca6d5dabb59949d04d600d57a5c529e79e17d144e7af35335ee4e91a43718c
in both native locations. `fix2-adjacent-libraries.json` records fresh-inode
atomic replacement while no test app was running. No mapped library is overwritten.
Alive bytes changed through the shared Rust build despite no Alive behavior or
callback source edits; the parent approved one final unchanged short wrapper
rerun for exact executable association. The full ccba93b normal Ultra document
journey remains under its original identity.

`fix2-ultra-numeric-accepted/` and its runner log pass on the final Ultra
executable (exit0). The real native window performs live number-box edit7,
undo1, redo7, Save7, stopped edit11, audio restart retaining11, Save11 and window
Close. This is the existing shared-authoring desktop path; the legacy
canvas_param route is covered by its actual production helper in Rust, not a
claim that the ordinary shared desktop invokes that legacy IPC.

Two temporary-probe setup failures remain intact, including their scripts:
`fix2-ultra-numeric/` used the storage `int` rather than `number_int` UI type,
so the requested numeric-face accessible did not exist. The next
`fix2-ultra-numeric-ui/` edited successfully but requested Undo while locked;
the established UI intentionally disables history until unlocked. The accepted
script explicitly unlocks for history and relocks for ordinary face entry.
No product source/input guard changed to accommodate these probes.

Build/runtime warnings remain visible: inherited unused QuitSession::reserve_native,
private Xvfb Mesa DRI3 acceleration warnings, and private portal attempts to find
Wayland/:0 while the tested app successfully uses its isolated X display. They
are not counted as passing audio or GPU guarantees.

### Final explicit-state overhead controls

`fix2-overhead-controls/` passes (runner exit0) on the final3024057 Alive binary
with the exact saved2-track/4-device control fixture. `fix2-controls-summary.json`
and `fix2-verify-evidence.py` retain derived values and verification.
The exact keyboard script is `overhead-controls-keyboard.py`, SHA-256
`dc43edaf54300e32d9881e4b3b1699db783f40227abe6824443e12d8749c8210`;
fixture SHA-256 remains
`e50033d6bb2459ce4d7bdf541ba528bd5b3ad1f9a97b646b1b2746ae6b056c46`.
One ProcessGroups instance spans all8 stages. Every transition asserts actual
expanded/collapsed state, each stage proves more than6 playing seconds, and
final diagnostics are freshly read after witnessed audio stop. All8 stages
complete with63.23000499231841 proven-playing seconds. Ordinary UI80ms polling
and1Hz cached AT-SPI transport reads are held constant in every mode.

Observed endpoint CPU percent of one core (two8-second repetitions; not
complete-tree CPU or causal timing estimates):

| Mode | App R0 / R1 | Observer/capture R0 / R1 | Server R0 / R1 |
| --- | --- | --- | --- |
| baseline | 42.0540% / 42.7830% | 2.5979% / 1.1130% | 0.3712% / 0.3710% |
| sampler_1hz | 38.6279% / 41.9688% | 7.6771% / 7.8001% | 0.4953% / 0.3714% |
| sampler_plus_diagnostics | 53.6807% / 42.4592% | 8.6586% / 7.9230% | 0.3711% / 0.2475% |
| sampler_diagnostics_capture | 44.8030% / 41.5569% | 9.5294% / 9.7699% | 0.4949% / 0.6185% |

The58 resource rows observe a union maximum10 simultaneous and12 lifetime
process identities. App PSS461980->499640KiB (+37660KiB); p50487437KiB,
p95499268KiB,max499640KiB. All58 PSS samples are available; app identity
coverage has1 initial gap, observer/capture4, server1. Separate RSS, threads,
fds, sampling duration and observed CPU distributions remain in the summary.
This short increase is not a leak finding or a no-growth result; longer
editor/Apply/endurance characterization remains required.

Two final contiguous epochs contain8824 callbacks/4517888 output frames at
48k stereo f32 on the private PipeWire default_output, requested512 and observed
min=max512. All lifetime counters and both histograms match completed-epoch
sums. Typed CPAL Xrun/non-Xrun errors, render failures, invalid shapes, counter
overflow, clock anomalies and processing-budget exceedances are0. Duration
p50 is(980586,1024000]ns, p95(1448155,1512270]ns,
p99(1579224,1649142]ns, p99.9(1961172,2048000]ns,
maximum2279092ns over8824 samples; max utilization213664ppm. These are
aggregate instrumented epochs including setup/transitions, not per-mode exact
percentiles or hardware presentation deadlines. Final clock read/publication
tail remain excluded by the recorded timing boundary.

Captures contain418304 and419328 finite stereo frames, both peak
0.2225944548845291, with empty stderr and complete supervisor manifests. The
verification additionally confirms both recorded owned process groups are gone.
The existing pw-cat version returns1 on requested stop; the manifest retains
that code, bounded cleanup and empty stderr rather than treating code alone as
a quiescence witness. Capture SHA-256 values:
- `82547b05d6587a0e0d333bc40acd5275ad225ce36a9de42d701b7c0a7c6feda1`
- `1cfbb2e4e50f4bcc073bd368bbcf13cdee15e674fbeaa32bd72074de6906110f`

Physical audio is false; physical xruns are unavailable. Hardware scaling/boost
remains unpinned. No noisy-mean subtraction from a percentile, significant
speedup claim, universal CPAL error-ingress RT claim or final soak claim is
made. The original blind-toggle and failed mouse/closure probes remain intact
and unqualified; successful keyboard control does not repair the deferred
summary-tooltip pointer interaction. Prior enabled/disabled native timing
distributions retain their68846ce source identity and impact assessment.

### Final exact-binary clip journey and self-review

`fix2-native-accepted/` and `fix2-native-accepted-runner.log` pass (exit0) on
final Alive6748f333, using the unchanged complete original clip journey plus
its existing short observability/control wrapper. Commands:

    ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_observability.py" bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task13a-evidence/fix2-native-accepted
    ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_SESSION=/tmp/alive-task13a-evidence/control-fixture.alive ULTRA_TEST_SCRIPT=/tmp/alive-task13a-evidence/overhead-controls-keyboard.py bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task13a-evidence/fix2-overhead-controls
    ULTRA_TEST_SCRIPT=/tmp/alive-task13a-evidence/fix2-ultra-numeric-accepted.py bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task13a-evidence/fix2-ultra-numeric-accepted

The clip wrapper records105.71084703200904 wall seconds,
8.178363923348448 proven-playing seconds and47.839950484994915 excluded
observed seconds; setup/unobserved time is not promoted to playing time.
Six contiguous final epochs contain3787 callbacks and1938944 output frames,
requested/observed512min=max,48k stereo PipeWire. All counters and both
histograms match the final lifetime aggregate. CPAL Xrun/non-Xrun errors,
render failures, malformed shapes, overflow, clock anomalies and processing
budget exceedances are0; maximum measured fill duration2263079ns. No sampler
errors are reported. Original clip receipt/quantization/scoped Stop, pending
editor/history/source recovery, Apply, file/save/reopen and input assertions
remain unchanged and pass.

`fix2-resource-summary.json` derives73 samples from401390 raw bytes, SHA-256
`10be3a32da84406b4a5766779984f06cfdcb404a262f427c52bd81d685d6cdf2`.
App PSS:73 available/0 unavailable,527170->497237KiB (-29933KiB),
p50560385KiB,p95620438KiB,max624672KiB. Observed app CPU max119.98795333077402%
of one core;14 coverage-gap samples. Shared union budgets observe maximum16
simultaneous/28 lifetime identities. Separate role distributions, WebKit count
and per-action sample counts remain in the summary. Unknown worker final deltas
remain unknown; a short endpoint decrease is not no-growth evidence.
Epoch JSONL152918 bytes SHA
`986e5f3526750ce3d94fd50a666e1693bb29dbf8ec3c7545b46c2256ea11c1a5`;
action JSONL5915 bytes SHA
`78b9e6fd6d4cb81fa24fdb585116dcbbb68f6f05afc723f92120aada1012369d`.

The original software clip capture contains317952 finite stereo frames (6.624s),
peak0.2225944548845291, SHA
`ed8767c361fcd83b201f4ce63abacab3e26197b6ef320811ded29f7656083e97`.
`fix2-native-capture-verified.json` records a separate incremental finite/hash/
size check and confirms the owned recorder group no longer exists. The completed
supervisor manifest records empty stderr, requested stop and exact bounds.
Physical audio remains false and physical xruns unavailable.

Final evidence verification command:

    python3 /tmp/alive-task13a-evidence/fix2-verify-evidence.py native

`fix2-final-evidence-verified.log` passes. `fix2-artifacts.json` associates exact
source, final executable/adjacent native library, fixture and every final
qualification script. `fix2-evidence-index.json` hashes all fix2 artifacts,
including failed probes and red logs. No source changes follow3024057; final
source-manifest hashes continue to match the frozen commit.

Self-review: all four source findings are addressed according to the two scoped
reviews; the final real workflows and state-controlled comparisons now provide
the previously missing qualification material for parent verification. Source
scope remains the accepted2-track/6-device/8-clip profile. Older timings,
ccba93b journeys, first failed controls and every failed intermediate probe keep
their actual identities. The8KiB numeric-payload interpretation, active/ring/wire
storage accounting, CPAL owned-error allocation/free boundary, excluded timing
tail, Linux/software-only scope, transient CPU coverage, unpinned frequency,
deferred tooltip input limitation and later full endurance requirement remain
material limitations. No merge, release, capacity, cross-platform runtime,
physical-audio, universal RT or final Task13a acceptance claim is made by this
implementation report; parent owns acceptance and CannotVerify closure.
