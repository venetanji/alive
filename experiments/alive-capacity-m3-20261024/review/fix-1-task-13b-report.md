# Task 13b: measured eight-track admission

Status: production checkpoint and local measurement qualification complete;
independent review found two verification gaps, addressed in fix round 1 below.
Scoped independent re-review remains pending. The actual standalone eight-track
release journey passes. This report is not parent task acceptance. Parent owns PLAN/ledger,
retained experiments and independent review. Raw evidence root:
`/tmp/alive-task13b-evidence/`. No intermediate run is overwritten.

## Source and scope

Base: `e1f09e5be8398ac631aad84c31a82895e5f54caa`. The implementation adds work
policy 2 and explicitly advertises eight-track admission. Policy 1 remains
unchanged and is selected for sessions within two tracks/six devices. Strict v3
can use eight tracks/sixteen roots; valid legacy v2 retains two/six and the
existing fallback. ABI layouts, one renderer/frame clock/queue/Stop mailbox,
four slots/track, two effects/track, per-track note/lane/point bounds, 1024 stored
events, 32 events/frame, 64 events/1024 frames, 64 commands and 128 receipts remain.
Atomic multi-track actions stay disabled. No scene/schema/engine/MIDI work,
soak, cloud session, credentials, persistent settings or release publication.

Frozen implementation checkpoint: `a04f259` (27 owned files). Final report
updates follow separately. `checkpoint-source-manifest.json` hashes the exact
native/core/Rust/UI/configuration sources; `telemetry-binaries/manifest.json`
hashes the two diagnostic executables and their shared native library. Both
diagnostic builds pass compilation; the original full Rust gate preceded only
the later test-only raw clock/publication-array retention.

Native profile admission is carried through Rust preparation, validation, host
configuration, projection, structural controls and UI capabilities. The host's
shared configuration uses the already existing wide v3 storage; v2 projects its
original six devices/two tracks. Track/root limits reject before opening picker
dependencies; the explicit seventeen-root case rejects before any dependency
access. Desktop Stop-state checks use v3 state for larger clip sessions. Stable
IDs, editor/DSP separation, history, scoped Stop and automation ownership remain.

The actual release workflow exposed a stale adjacent-library ordering defect.
Cargo prepends its output directory to the loader path, so `release.py` now uses
its existing atomic installer before Cargo tests for every tested host. The
loader previously found a stale target-triple library missing
`alive_session_base_v2`; its SHA and export check are retained. Existing mappings
are preserved by fresh-inode installation. The regression first failed on stale
bytes, then all 18 release-script tests passed. Parent explicitly accepted this
necessary release prerequisite in the Task 13b brief.

## Policy derivation and pre-admission decision

| Work | Clears | Scans | Parameter writes | Guard comparisons |
|---|---:|---:|---:|---:|
| Scheduled frame |48|3072|1568|0|
| Scheduled 1024-frame window |288|18432|9280|0|
| Optional frame/window |16|1024|512|9252|
| Emergency per callback |32|0|512|0|

The existing three-pulse frame/eighteen-pulse window derivation scales root and
parameter work: `3*16=48`, `18*16=288`, reset/chase `2*16*16=512` writes,
scheduled writes `3*512+32=1568` and `18*512+64=9280`. Global event/scan and
guard horizons do not grow. Fixed control remains 64 commands/direct writes;
conservative first-frame preview is `8*11+32+8=128` reads. Publication remains
16,592 bytes. The accepted portable mask and stopped-winner reducer are shared.

Internal copied sources measured the proposed policy before shipping admission.
Saved subtractive/utility/stereo-lowpass graphs cover 2/6, 4/8 and 8/16, uneven
two-effect chains, four slots, every admitted voice, maximum graph/parameter
extensions, 1024 events, short loops, aligned switches, seek/reset/chase, full
command bursts, refusals and emergency cleanup. The synthetic combined case
adds 336 clears, 10304 parameter writes, 19456 scalar scans and 64 dispatches to
a real eight-track callback, deliberately overcounting actual work.
The added scan loop is a scalar scan-count surrogate, not every branch of the
runtime chase loop; this combined case is not a proved execution-time upper
bound. Actual dense/seek/refusal cases measure those native paths separately.

Host: AMD Ryzen 9 5900HS, Linux 7.2.8-10-omarchy, glibc 2.44, GCC 16.2.1,
native C++17 `-O2`, 48 kHz. Internal release matrix has 1200 raw samples/case:

| Frames | Eight-track combined p99.9 ns | Maximum ns | Buffer ns |
|---:|---:|---:|---:|
|64|3677869|4019445|1333333|
|128|3888958|4277493|2666667|
|256|4830077|4955904|5333333|
|512|7282491|10150420|10666667|
|1024|10827339|11079986|21333333|

These retain their proposal source hashes in `internal-release-matrix-1`; they
are not relabeled as final shipping timings. Release trace counters are disabled
and therefore unavailable, not evidence of zero work. The separate
`internal-matrix-guard-1` records diagnostic counters and allocation/free/lock
guards. Larger-profile guidance is observed buffers >=512, preferring 1024 near
the bounds; policy 1 keeps >=256. The 50% p99.9 target is advisory. Settings are
never changed automatically and no universal deadline/physical-xrun claim follows.

The original 188-frame populated four/eight-track fixtures reject unchanged:
eight stored events have a conservative 96-event splice envelope, limit 64.
`internal-verify-2` and `internal-verify-3` preserve those failures; the latter
records the typed reason. No authored event is retimed. Eight simultaneous triads
plus two automation events per track explicitly reject observed 40, limit 32.

## Verification to checkpoint

| Check | Result | Evidence below raw root |
|---|---|---|
| Initial native capacity regression | Expected disabled-profile failure | `preflight/red.log` |
| Isolated native verification | PASS | `internal-verify-4/` |
| Diagnostic matrix | PASS, guards/counters separate from release timing | `internal-matrix-guard-1/` |
| Proposed-policy release matrix | PASS, complete raw samples | `internal-release-matrix-1/` |
| Exact shipping native bounded verification | PASS | `final-native-verify-1/` |
| Rust larger-host regression | Red, then green after current adjacent library | `rust-capacity-red.log`, `rust-capacity-green-1.log`, `rust-capacity-green-2.log` |
| UI advertised-capacity regression | Red, then all 46 DOM tests pass | `ui-capacity-red.log`, `ui-capacity-green.log` |
| Native shared-library build | PASS | `native-build-1.log` |
| Full Rust library gate | 206 pass, zero fail, four explicit ignored | `full-rust-1.log` |
| Full native gate | PASS including original v1/v2 tests | `full-native-2.log` |
| Full contracts | Earlier portion PASS; missing jsonschema stopped final portion | `full-contracts-1.log` |
| Remaining contracts under isolated uv jsonschema | PASS, no repeated preceding gates | `contracts-resume.sh`, `contracts-resume-1.log` |
| Release staging regression | Expected red, then 18 pass | `release-order-red.log`, `release-order-green.log` |
| Actual release Rust/app build | Ultra and Alive tests/build PASS; local AppImage tool limitation | `actual-release-2.log` |
| Standalone native eight-track journey | PASS with complete final retirement | `native-eight-3/`, `native-eight-3-runner.log` |

The initial full native gate stopped at an obsolete assertion that profile 2 had
no features (`full-native-1.log`). Only that expectation now asserts exact
ADMITTED plus policy 2; all original v1/v2 tests and event timings are retained.
The checkpoint concurrent regression used callback/control/read threads, one
serialized producer and live roots: 2048 callbacks, 1387 accepted and 2709
queue/receipt refusals, 61159 coherent/receipt snapshots. Its reported
`overlapping_callbacks=38` was only the cumulative callback count at producer
completion; review correctly identified that it did not require reader overlap.
All tracks terminated after full-queue emergency Stop. Fix round 1 below replaces
that insufficient concurrency assertion. These historical counts retain their
original source identity and are not evidence for the stronger check.

`rust-capacity-green-1.log` failed because Cargo's adjacent non-target library
was stale despite LD_LIBRARY_PATH; `native-atomic-install-1.json` records fresh
inode replacement. `release-stale-library-1.json` records the separate stale
target-triple library and missing export; `actual-release-1.log` retains exit 127.
An early copied-source compile lacked `core/` (`internal-verify-1`), also retained.

## Actual standalone release and desktop evidence

Actual binary:
`apps/alive/src-tauri/target/x86_64-unknown-linux-gnu/release/alive`, SHA-256
`1d4e09709133fa0b6821cff8cfd07fd89075a8bd3780f592098baf674acb4f28`.
Adjacent library SHA-256:
`d486110aa5e53c4f5f0c6c471a4a0de57296bd394790d2f459e6de941439bb47`.
Standalone DEB SHA-256:
`f1d558e4a289e86176e6569941982f99ec692d264652b4037622aadbb08c9bb9`.
`release-build-manifest.json` records paths, fixture/driver hashes and platform.
The production sources were still uncommitted at build time; checkpoint source
association is by exact hashes, not an invented historical build commit.

`native-eight-3` uses the exact standalone binary via ULTRA_TEST_ALIVE_BINARY,
private Xvfb/DBus/PipeWire and temporary settings. Eight independent tracks/
sixteen roots play three held voices each, switch to Clip 2 with applied native
receipts, retain a .65 effect base through editor Close/reopen, retain automated
cutoff ownership while base becomes 1777, exercise gain/mute/solo, and locally
Stop Pulse while all other seven tracks keep their voices. Save/Open preserves
the full document and bases; remove/add track, create clip, Add note, Apply and
playback pass. Final Stop audio witnesses all four epochs retired, native
quiescence and all voices zero. Screenshots: `capacity-playing.png` and
`capacity-final.png`; original script copy: `journey.py`.

Requested and observed PipeWire output are both 512 frames at 48 kHz. The
unsupported-128 attempt preserves the saved 512 configuration. Final lifetime
8511 callbacks, four completed epochs, coverage_gap=false, complete=true,
duration maximum 5616093 ns; zero typed CPAL errors/xrun reports/native failures,
zero invalid shape/clock anomalies/budget exceedances in this finite run. The
main epoch p99.9 histogram interval is (4277345,4466720] ns. These are processing
intervals and backend observations, not physical underrun proof. The complete
per-epoch histograms and metadata are in `capacity-final-epochs.json` and the
cursor-collected `capacity-epochs.jsonl`; resources/worker identities/PSS are in
`capacity-resources.jsonl`. Software capture is 43.626667 seconds, 2094080 frames,
peak .1314936131, finite, SHA-256
`28d90ca694c2472cbb2cbd5d114e5820e7039688d1920c6b82935a73d324cc92`.

The journey has 109 resource samples. Observed application process PSS spans
453185-615699 KiB and threads 98-135; observed one-core CPU median is 104.31%,
maximum 143.970%. First/last observed application PSS is 485858/495939 KiB
(+10081 KiB); the larger intermediate maximum remains visible. This includes UI/test interaction and stopped intervals, not
playback-only utilization. Eight application samples have identity coverage gaps
and two have unavailable observations. Sampler/capture CPU median is 27.96%,
maximum 61.25%; these costs are separate from app CPU. `resource-summary.json`
retains the bounds and limitations; transient/exited workers are not invented.

Two harness failures precede the passing run. `native-eight-1/failed-value.png`
shows a mouse target under the sticky transport bar: Track 4 never received a
launch request, while the other tracks switched. Focus+Return qualifies the
keyboard journey; it does not claim a pointer repair. `native-eight-2` completed
Save/Open but tried to read hidden transport diagnostics; the harness now opens
the disclosure before reading. Each failed directory retains its exact journey
script. Parent carries the pointer issue into Task 15's single UI audit.

Local release packaging retains the known Arch AppImage tool limitation: cached
linuxdeploy strip cannot read .relr.dyn sections. `actual-release-2.log` contains
the failure after the standalone binary and DEB build. A bounded NO_STRIP probe
from the wrong working directory discovered Ultra and then failed the known GTK
plugin copy path; `actual-release-bundle-3.log` is not Alive qualification. No
source or persistent packaging workaround was added. Parent's final Ubuntu CI
owns AppImage qualification; prior e1f09e5 package results remain prior results.

## Commands and remaining qualification

Commands are from repository root. Rust/build environment adds
`experiments/clockwork-faust/.deps/rust/bin` (and CMake 3.31.6 for release),
sets CARGO_HOME to `.deps/cargo`, ULTRA_NATIVE_LIB_DIR and LD_LIBRARY_PATH to
`apps/ultra/build`. No shell setting is made persistent.

- `bash apps/ultra/tests/ci/check-native.sh`
- `bash apps/ultra/tests/ci/check-contracts.sh`, then
  `uv run --no-project --with jsonschema bash /tmp/alive-task13b-evidence/contracts-resume.sh`
- `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked --lib -- --nocapture`
- `python3 -m unittest discover -s apps/ultra/scripts -p test_release.py`
- `python3 apps/ultra/scripts/release.py build --target x86_64-unknown-linux-gnu --product alive`
- `ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_BINARY=<actual binary above>
  ULTRA_TEST_ALIVE_SESSION=/tmp/alive-task13b-evidence/eight.alive
  ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_capacity.py
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task13b-evidence/native-eight-3`

All planned measurement stages are now complete: same-source telemetry-enabled/
disabled at 2/6,4/8,8/16; clock/publication-tail controls; final shipping native
release matrix; same-binary UI/sampler/diagnostic/capture controls; exact source/
build hash association. Diagnostic raw files use exclusive create and retain
64 warmups separately from the reported 1200-sample native distributions.
Existing Task 13a boundaries remain: the final clock/publication tail is excluded
from the in-callback duration and measured separately; CPAL owned Error
construction/destruction can allocate/free and is excluded from the borrowed
typed-action guard. No physical audio, deadline guarantee or endurance claim.

## Same-source telemetry qualification

`telemetry-final-1/complete.json` records all seven ignored-probe executions
passing. `commands.json` retains exact executable, environment and fixture
arguments; `results.json` retains summary rows and `raw/` all 60 distributions.
Native raw files contain 64 warmups plus 1200 reported callbacks each, three
repetitions/buffer/mode at 2/6, 4/8 and 8/16 (36 files). Clock/fill/publication
controls retain 20000 samples/distribution (24 files). No source or build runs
occurred during the sequential probes. Fixtures use actual saved graphs; each
is hashed in the release manifest. Order is enabled then disabled per size.

| Tracks/devices | Frames | Enabled p99.9 range ns | Disabled p99.9 range ns |
|---|---:|---:|---:|
|2/6|256|453311-552114|456797-604290|
|2/6|512|861458-906491|862159-1379017|
|4/8|256|639086-676334|661558-682216|
|4/8|512|1240701-1416938|1230563-1274424|
|8/16|256|1269886-1379088|1253727-1451404|
|8/16|512|2360170-2888489|2361633-2459294|

These synchronous native measurements include the whole external fill call,
including its tail, and have no CPAL scheduling. They establish separate
distributions, not a causal percentile subtraction or a universal telemetry
cost bound. Eight-track/512 medians are 2177420-2179554 ns enabled and
2179344-2180828 ns disabled. All native render failure counters are zero.

Clock pair median is 60 ns, p99.9 range 61-81 ns, maximum 43872 ns. Fixed fake
render fill medians are 140-260 ns without timing and 310-441 ns with timing
(the range spans 256/512 buffers). Histogram/publication tail median is 110 ns,
p99.9 121-131 ns, maximum 6001 ns. These test executable controls preserve the
accepted excluded-tail boundary and do not replace native/render or real-app
costs. The full raw outliers remain evidence.

## Final native matrix

`python3 apps/ultra/tests/run_alive_capacity.py
/tmp/alive-task13b-evidence/final-release-matrix-1 --samples 1200` passes on exact
copied checkpoint sources. Its `manifest.json` binds commit a04f259, every copied
native/core/fixture source, the executable and core archive; `commands.json`
retains compile/run arguments. `probe.log` contains all 174000 raw samples across
145 distributions. Twenty-four cases observe refused controls. Four unchanged
populated-short cases reject at their exact authored 188-frame length, for the
saved/extended variants at 4/8 and 8/16.

`nearest-rank-summary.json` recomputes quantiles as `ceil(n*p)-1` from the raw
durations and retains every per-case budget-exceedance count. The probe's
historical RESULT estimator uses the lower order statistic `floor((n-1)*p)`;
`reported-summary.json` preserves those values separately. Neither histogram
intervals nor estimates from a different source are relabeled as these values.

| Frames | Final 8/16 combined nearest-rank p99.9 ns | Exact maximum ns | Samples over buffer budget |
|---:|---:|---:|---:|
|64|3525106|4007907|1200/1200|
|128|4174016|4613947|1200/1200|
|256|5049000|5225159|0/1200|
|512|7162854|7843956|0/1200|
|1024|11153695|11203075|0/1200|

The largest 8/16 maximum at 1024 across all cases is 12641795 ns in the heavy
voice-edge case (p99.9 11555810 ns). At 256 the combined maximum nearly reaches
the 5333333 ns buffer budget; it does not justify relaxing larger-profile
guidance. At 512 the final combined maximum is below its 10666667 ns budget,
but the earlier proposal's 10150420 ns maximum remains evidence of little
headroom. Keep >=512 and prefer 1024 near the bounds. The 50% p99.9 target is
advisory and is not achieved by every maximum-work case. These software budget
observations remain distinct from physical underruns.

The final matrix is uninstrumented release timing: its zero-valued COUNTERS
fields mean trace counters unavailable, not zero work. Separate diagnostic
counter/guard evidence remains in `internal-matrix-guard-1` at its own exact
proposal source hashes, and the final source bounded guards/partition/concurrent
regression remains `final-native-verify-1` plus `full-native-2.log`.

## App overhead controls and self-review

The exact same standalone executable/library passes
`overhead-controls-eight-1`, using the retained Task 13a explicit-disclosure
control script copied to `overhead-controls-keyboard.py` (SHA-256
`dc43edaf54300e32d9881e4b3b1699db783f40227abe6824443e12d8749c8210`).
The invocation is the native journey command above with ULTRA_TEST_SCRIPT set
to that copied file and a new output directory. `build-manifest.json` confirms
the unchanged app/library hashes. Two repetitions of eight seconds each cover
baseline, sampler at 1 Hz, sampler plus diagnostics, and sampler/diagnostics/
capture. Its helper reports 7.43-8.00 live-checked seconds of advancing playing
transport per stage, 63.133925 seconds total. The report retains these computed
totals but not the helper's underlying frame/monotonic observations, so the
interval arithmetic cannot be independently replayed from the retained raw
files. This limitation is accepted only for this short overhead comparison;
Task 15 must retain the raw running intervals/frames for its 1800-second gate.

| Mode | Observed app one-core CPU range | Sampler/capture CPU range |
|---|---:|---:|
|Baseline|65.74-71.30%|0.99-2.48%|
|Sampler 1 Hz|66.21-67.40%|7.67-7.80%|
|Sampler plus diagnostics|67.56-79.24%|7.67-8.79%|
|Sampler/diagnostics/capture|67.71-67.87%|9.39-9.64%|

Regular UI polling remains 80 ms and constant accessibility transport reads
1 Hz. This is short observed-identity evidence, not a complete-tree CPU claim
or causal subtraction of noisy stages. Raw resource samples, identity coverage,
two finite capture records, disclosures and stage boundaries are retained.
First/last observed application PSS is 490745/528018 KiB (+37273 KiB), maximum
observed app CPU is 114.079%, and one resource row has an identity coverage gap.
These short traces do not establish a memory-growth rate or leak-free endurance.
Final two epochs are witnessed retired, complete=true, coverage_gap=false,
8792 callbacks, observed 512 frames, maximum duration 7277322 ns, zero typed
CPAL/native errors and zero observed processing-budget exceedances. No physical
device or physical xrun count is claimed.

Self-review confirms fixed roots/events/queues, strict v3 and legacy fallback,
all eight projected tracks, pre-dependency root refusal, unchanged original
policy/tests/timings, stable ownership and editor separation. The release
ordering bug is covered by a meaningful red/green regression. First failures,
startup observations, raw outliers, empty/short fixture refusals and missing
physical/worker coverage remain visible. Independent review found zero Critical,
two Important verification gaps (I1/I2), and one Minor warning-attribution item.
Fix round 1 addresses I1/I2 without changing production source. The unused
`reserve_native` warning, Xvfb/DRI3 warnings and portal startup failures remain
visible in retained logs and are deferred to parent's whole-branch triage;
the successful runs are not warning-free. Task 15 owns pointer polish and the
full endurance/audit work.

## Fix round 1: target outcomes and concurrent observations

Review package: `task-13b-review.md`; contract: `task-13b-fix-1-brief.md`.
I1 identified that an inaudible target's ignored launch/Stop could pass the
other-track audio comparison. The revised `partitioned()` retains every
original partition and all 50000 compared frames, and first proves four active
voices on the target. For each issued serial it then requires the exact applied
receipt/mask, no pending/rejected/canceled/superseded bits, the expected active
clip, phase at the unchanged authored boundary, zero target voices and no fault.
Final target state must remain correct. All eight tracks pass both empty-clip
launch and local Stop: sixteen `TARGET` witnesses, launch phase 410 at its first
observation and Stop phase zero. Existing other-track sample equality still passes.

I2 identified that a reader scheduled only after rendering could satisfy the
old assertions. The test now has bounded startup and batch-progress coordination,
with one absolute 30-second deadline. Every wait stays outside the actual native
render call. The single producer first saturates the 64-command queue, then
submits 4096 total requests while callbacks and the reader advance together.
Successful overlap observations require rendering before and after the coherent
state read, an active producer, unfinished callbacks, and consumed requests newer
than the startup prefix. It requires callback/frame advancement across those
observations. Roots stay live until both joins, and final emergency Stop still
leaves every track's voices at zero. This is verification-only coordination;
production callbacks acquire no new lock, wait or allocation.

Exact-current-source command:
`python3 apps/ultra/tests/run_alive_capacity.py
/tmp/alive-task13b-evidence/fix-1-final-verify --verify --guards`.
It passes all allocation/free/lock guarded capacity, exact event/root refusal,
all-eight partition/action and concurrent publication checks. Complete output is
`fix-1-final-verify/probe.log`, compiler output is `build.log`, exact arguments
are in `commands.json`, and source/archive/executable hashes are in `manifest.json`.
The outer log is `fix-1-final-verify-runner.log`. Observed concurrency:

- 1488 accepted and 2608 queue/receipt refusals, 2048 callbacks.
- 58331 coherent snapshots; 56278 snapshots with consumed live-phase requests.
- 54295 render-overlap snapshots, callback endpoints 64 and 1984.
- Overlap frame endpoints 1262431 and 1321920; producer endpoint callback 1984.

The compiled test source matches the worktree exactly, SHA-256
`1ff32e1136f738f7def9fafc665468b7a5f29ee78cb32936188f42527bf5e6f7`.
Guard probe SHA-256:
`f66ad90853ceb4210b84d405bf3865d88200809637e8154e85c4d6f9921aeee5`.
Fixture SHA-256 remains
`484e1d59a91db0bc5be429e9e52ba166ebfbb824917b740c0a6766891d6d0c25`.
Earlier focused steps remain in `fix-1-local-verify/` and
`fix-1-complete-verify/` with their own copied sources/logs; the final run includes
the producer-active/endpoint observation ordering correction.

The allocation/free/lock wrappers cover the single-thread render checks.
As at the checkpoint, the concurrent test calls the real renderer directly;
its process-global allocation-wrapper flags are not used for the threaded
regression. This separates the guard fact from the concurrent publication fact.

Two bounded negative probes run against copied source only via
`python3 /tmp/alive-task13b-evidence/run-fix-1-mutations.py`:

- `fix-1-mutations-1/discarded-action/` drops the local action while preserving
  a unique requested serial. It aborts on the `witnessed_action`/target-voice
  assertion with SIGABRT after 0.364 seconds, as required.
- `fix-1-mutations-1/late-reader/` waits for callback completion before allowing
  any reader observation. It aborts on the 30-second progress deadline after
  30.160 seconds, with explicit reader/callback-progress timeout diagnostics.

Both copies use a diagnostic-only entry selecting the affected existing test
function, preserving the actual production renderer/fixture. Each retains its
exact mutation, copied-source hashes, compiled binary and `probe.log`;
`commands.json` records compile/run argv and time limits, `results.json` records
return codes/durations, and `complete.json` records both intended rejections.
Core dumps are disabled and each execution has a separate 45-second outer
limit; neither reaches that outer limit. The runner hash is
`e55c5146a79ca2c7ea7bb1c26a0514f3b0bfc75ae192b55fbea4d3a697767faf`.
These intentional failures demonstrate the stronger checks, not production bugs.

Impact assessment: this fix changes only `partitioned()` and
`concurrent_publication()` in the capacity verification executable, plus this
report. Fixtures, authored timings, production native/Rust/UI code, shared
library and standalone app are unchanged. The `measure()`/`timing()`/`main()`
source suffix is byte-identical to a04f259, SHA-256
`42229acc3427efcc38fcdad79f32edaf65eec6f29a5802ad0e1cf4d7f243dd07`.
Recompiling the probe can still change executable layout, so the new diagnostic
binary is not substituted for any historical timing artifact. Final native
timing, enabled/disabled telemetry and actual app distributions retain their
original a04f259 source/artifact associations; no runtime rebuild or new timing
claim follows from this test-only checkpoint. Unchanged full Rust/contracts/GUI
suites are not repeated for these verification-only edits.

Parent independently checked the retained measurement artifacts via
`experiments/alive-capacity-m3-20261024/verify.py`, with receipt in
`parent-native-verification.json`: 692 retained files, 224 historical source
hashes, 145 native distributions/174000 raw samples, 60 paired raw distributions,
complete epoch sums/histograms/errors, eight CPU-stage endpoints recomputed from
PID/start-time ticks, all three software captures stream-verified and artifact
hashes matched. The control helper's playing-duration totals remain subject to
the explicit missing raw interval/frame retention limitation above; the receipt's
historical `proven_control_playing_seconds` field does not strengthen that fact.
Source review acceptance, final supported CI/packages and Task 15 endurance stay
with parent. Scoped re-review should assess I1/I2 and any new verification
breakage; no self-dispatched reviewer or broader production change is included.
