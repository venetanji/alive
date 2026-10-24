# Task 13 Callback And Resource Observability Design

Status: design only, against frozen `d1f8a66`, 2026-10-24. No capacity,
deadline, policy value or eight-track admission is established here. Task 11
owns native clip implementation; Task 13 measures admission; the final native
1800-playing-second soak belongs to Task 15.

## Baseline And Scope

Sources at `d1f8a66`:

- `apps/ultra/src-tauri/src/audio.rs`: `Metrics`, `Driver::start_stream/stop`,
  `fill`, `build`. Metrics are replaced on start and stop. The last callback's
  frame count is not a negotiated fixed period. `stream_errors` combines CPAL
  errors (including typed `ErrorKind::Xrun`) and malformed callback shapes.
  A native render return of zero silences the entire callback but is uncounted.
- `apps/ultra/src-tauri/Cargo.toml`: pinned CPAL 0.18.2, Linux PipeWire feature.
  `build` already classifies Xrun as nonfatal and other errors as fatal.
- `apps/ultra/src-tauri/src/lib.rs::device_status`,
  `apps/ultra/ui/alive.mjs`, `apps/ultra/ui/audio-settings.mjs`: existing snapshot
  and polled diagnostics are sufficient transport; no synchronous UI callback.
- `apps/ultra/tests/check_alive_desktop.py::process_sample/start_capture/
  finish_capture` and endurance block: descendant PSS/RSS/thread/fd sampling,
  raw software-loopback capture, repeated Stop/Apply/Start. No CPU ticks;
  resource read failures are silently omitted. The report's blanket claim that
  CPAL exposes no underruns is inaccurate for the typed error path above.
- `apps/ultra/tests/check_alive_editor_resources.py`: existing reopen workload
  and worker-count checks; preserve its meaning rather than extrapolate its
  tolerances into an eight-track timing gate.
- `task-11-interface-design.md`, sections "Repeated-Control Protection And
  Guaranteed Cleanup" and "State Projection, Measurements And Tests": fixed
  guard/command/publication/emergency costs, full 16.6 KiB publication, initial
  measured policy, practical buffers and advisory 50% p99.9 headroom.
- `task-13-lifecycle-preflight.md` and
  `task-13-lifecycle-source-sha256.txt`: pinned local CPAL sources; all four
  recorded SHA-256 identities were verified during this refinement. PipeWire
  `device.rs:674` waits for initialization; its error return at 682-684 drops
  the latch but does not join the worker. Successful control-thread stream
  drop joins in `stream.rs:114`. These are distinct retirement paths.

Smallest change is host-side bounded metrics plus harness sampling. Reuse the
single native renderer/state publication. No engine or v3 ABI change, second
clock owner, external MIDI, per-callback trace or perpetual audit file is needed.

## Epoch Lifecycle And Bounded Retention

Allocate one fixed metrics object before stream construction, with a monotonic
`epoch_id: u64` per open attempt after configuration/device validation. Capture
requested config, resolved host/device, sample format, rate/channels and build
provenance off callback. Keep zero-callback failed-open/play attempts too, with a
bounded lifecycle code. Start called on an existing stream creates no epoch.

Use the existing metrics Arc as the closure-lifetime witness. Driver retains
one strong reference; the supplied data and error closures each retain their
own strong reference for their entire lifetime, including unwinding. Do not
expose extra Arc/Weak observers or detach epoch references into asynchronous
work. After the host has discarded the stream and all build-local handles,
control calls `Arc::get_mut(&mut epoch.metrics)`: success proves that both
closure references are gone, including CPAL's internally shared error closure.
Do not substitute `Arc::strong_count`, a timed delay or build's return status.
Closure-only scratch has no destructor that accesses native state after its
metrics capture is dropped. The owning Driver reference prevents the final
metrics allocation from being freed on a callback/worker thread.

The state sequence is `opening -> running -> retiring -> finalized`, or
`opening -> retiring -> finalized` on initialization/build/play failure.
`failed` and `retire_reason` remain separate facts. Retiring means I/O is no
longer owned by the caller but closures may still execute. A fatal callback
marks its epoch failed; it does not finalize it or erase counters. Transport
Stop inside a still-open stream does not retire its stream epoch.

On successful Stop, mark retiring, drop the stream from serialized control,
then check uniqueness. Pinned PipeWire's join should make this immediately
successful; nevertheless require the witness rather than assume it. On play
failure, retain the same ownership while dropping the returned stream and use
the identical check. If native initialization failed before closures were
supplied, there are no callback owners and finalization is immediate. On a
build error or timeout, retain the epoch after returning the operation error:
CPAL may still be connecting/unwinding and its error closure may run later.
Only witness success permits the final metrics copy, native audio cleanup,
one-time lifetime merge and completed-record insertion.

Allow exactly one opening/running/retiring epoch. A retiring epoch occupies
that slot until witnessed; keep its metrics and the old native state alive.
Before another start or native replacement, perform one nonblocking recheck.
If unresolved, return a finite `retirement_pending` control error, allocate no
attempt and consume no epoch ID. Polling diagnostics may recheck/reap under
the existing control lock; it never waits for the failed-open worker. A failed
worker that never releases a closure disables further I/O/replacement in this
process, visibly, rather than creating an unbounded list of failed attempts.
No deadline forces a retiring epoch into finalized state.

This conservative choice keeps late errors attached to the old native owner.
A lone atomic "retired" flag is insufficient: an error closure can read false,
then race native cleanup/replacement before calling `ultra_audio_panic`.
Making that alternative safe needs an in-flight native-access admission guard
or equivalent synchronization. Waiting for closure ownership to end avoids
that additional callback protocol and permits existing native failure actions
while retirement is pending. The failed-open latch suppresses ordinary data
processing on the named pinned path, but is not the proof of quiescence.

Required control integration points in frozen sources:

- `audio.rs::Driver::start_stream`: reap/refuse before `ultra_external_start`;
  build-error/play-error cleanup at 193/196 must retire/reap, not immediately
  call `ultra_audio_stop` without a witness. `Driver::stop` at 203 must expose
  completion versus pending; callers cannot infer completion from stream=None.
- `session/desktop.rs::Control::install` at 135: after stopping I/O, require
  witnessed quiescence before `self.host.install`. This central path covers
  Apply, file/session replacement and device edits; retain pending draft,
  history, generation and prepared roots if refusal occurs.
- `session/host.rs::Host::install/apply` at 80/96: its existing caller
  precondition includes unresolved failed-open callbacks; no native stop,
  reset, root close/install, rollback or configure may bypass that precondition.
- `alive_audio`, `alive_transport` start and `alive_audio_configure` delegate
  to that Driver gate; stopped transport/stream=None is not enough. Preserve
  scoped transport Stop even when another control action refuses. The alternate
  `lib.rs::audio_start/audio_stop/audio_configure` callers share the contract.

Quit remains available through the existing save/discard and `allow_exit`
flow; do not turn pending retirement into a permanent Quit refusal. At
`session/desktop.rs`'s Exit branch (497), ordinary witnessed retirement permits
existing reset/root cleanup. If unresolved, emit a best-effort bounded final
observation marked incomplete, retain the owning metrics/native memory, skip
native stop/reset/root destruction and terminate via an immediate OS process
exit path that does not run C++ static or Rust/Tauri destructors (Linux libc
`_exit`, which terminates the process, not a thread-only raw exit syscall). Apply the same
rule to the alternate `lib.rs` Exit branch. This is terminal process teardown,
never a way to reopen I/O in-process. Normal destructor-driven exit is not a
proven safe fallback: `native/backend.cpp` has global engine/session objects
while the detached worker may still call native panic. Do not unwind Driver
and release its final retained reference first. No synchronous wait for the
detached worker is added; authorized saves must finish before this exit path.

Driver retains the active epoch, the last 64 completed records, and lifetime
merged counters/histograms/maxima incorporating **every** completed epoch.
Expose `oldest_retained_epoch`, `last_completed_epoch`, `evicted_epoch_count`,
`retiring_epoch_id`, `native_quiescent` and overflow/coverage flags. Nothing
resets these on Stop, Apply or settings
changes. Per-epoch identity/config beyond the ring is explicitly unavailable;
lifetime sums do not pretend to reconstruct it. Process restart starts a new
run identity. Saturate counters and mark overflow rather than wrap silently.

Harness polls a bounded diagnostics command at 1 Hz and immediately before and
after each controlled stream transition; request completed epochs after a
cursor. Upsert active records by epoch ID, finalize each completed ID once,
and require contiguous epoch coverage from run start through final retirement.
Ring eviction before collection invalidates the evidence. The app stays bounded;
the finite harness run captures all its epochs (including failed attempts).
While retiring, publish provisional counters with `final=false`; late error
reports still update them. Finalized lifetime totals merge that epoch exactly
once after the witness, with no subtract/re-add cycle. Any live "all observed"
summary is finalized totals plus the current epoch once, marked provisional.
An unresolved epoch at timeout/terminal exit makes epoch coverage incomplete;
neither the harness nor lifetime totals may silently call its last read final.

## Concrete Metric Record

All counts and elapsed units use unsigned 64-bit integers; JSON encodes large
integer counters/IDs as decimal strings to avoid JavaScript precision loss.
Configuration strings retain existing bounded validation. Store at most 8 KiB
of fixed numeric timing memory per retained epoch record; a 64-record ring
stays below 1 MiB plus bounded metadata. The one active epoch also needs fixed
ordinary accumulators, atomic publication and one last-coherent reader cache.
Their aggregate may be about 12 KiB and must be measured/reported separately;
the 8 KiB payload cap does not sum these necessary copies. No unbounded or extra
observer copies are permitted. This clarification preserves all bins and u64
counters rather than silently compressing/wrapping them. Decimal-string JSON
expansion has a separate bounded wire size; it is not this numeric-memory cap.
Separate these fields:

| Fields | Meaning / bound |
| --- | --- |
| `epoch_id`, `state`, `retire_reason`, `failed` | Identity and finite lifecycle codes, not a growing error string list |
| `opened_mono_ns`, `retired_mono_ns` | Host monotonic run-relative times, control thread only |
| `requested_buffer_frames`, `rate_hz`, `channels`, `sample_format` | Requested configuration, not a claim of negotiation |
| `callbacks_entered`, `valid_callbacks`, `output_frames` | Include all entries; frame totals include valid stereo shapes only |
| `buffer_frames_last/min/max`, `buffer_size_changed_count` | Actual delivered sizes; unknown before first valid callback; zero-frame callbacks separately counted |
| `render_calls`, `native_render_failures`, `silenced_callbacks` | A render return of zero is a software render failure; count the failing call and affected callback once |
| `invalid_callback_shape`, `zero_frame_callbacks`, `callbacks_after_failure` | Distinct host facts; preserve existing silence/panic behavior |
| `cpal_error_total`, `cpal_xrun_reports`, `cpal_non_xrun_reports` | Typed error callback reports; total equals the two subcounts |
| `duration_samples`, `duration_sum_ns`, `duration_max_ns`, `duration_hist[256]` | Whole `fill` path, including render partitions, conversion and silence |
| `budget_samples`, `over_buffer_budget_count`, `max_utilization_ppm`, `util_hist[202]` | Positive valid frame count only; compare each sample with its own frame/rate budget |
| `clock_anomaly_count`, `counter_overflow`, `snapshot_sequence` | Evidence quality and coherent timing generation |

Timing uses a warmed, verified allocation-free monotonic clock at callback entry
and immediately after `fill`, covering early returns too. This excludes the
final clock read and metric publication tail: disclose that boundary, measure
the tail/clock overhead separately, and do not call this an exact end-to-end
deadline measurement. An invalid shape still contributes duration, but has no
valid buffer budget. Do not time only the internal 1024-frame render partition.

Duration histogram: immutable precomputed integer-nanosecond upper edges,
approximately 1/16 octave from 1 us through about 60 ms, then an overflow bin;
publish the exact schema/edges. Utilization histogram: integer percentage upper
edges 0..200%, then overflow (202 bins). Compute utilization from nanoseconds and
actual positive frames at 48 kHz with bounded integer arithmetic. Compare
`duration_ns * rate_hz > frames * 1e9` without rounded milliseconds. Report
p50/p95/p99/p99.9 as bucket intervals, sample counts, overflow and exact maximum;
do not invent exact percentiles from a bucket or from a short run. The ratio
distribution remains meaningful when buffer sizes vary. Run separate epochs
for each requested desktop buffer; report actual min/max and changes rather
than assume the request was honored. A startup outlier remains in epoch data.

Keep legacy `stream_errors` only as an explicitly documented compatibility
aggregate; new acceptance uses the typed counters. Native render failure must
not be called a CPAL error. `cpal_xrun_reports=0` means no reports from this
backend, not zero physical underruns. One report need not equal one lost period.
No inferred count comes from sample discontinuities, render time or the separate
native/JACK status `xruns` field.

## Callback Ownership And Publication

Data callback alone owns fixed ordinary accumulators. Publish changed scalar
fields and the two touched histogram buckets to preallocated atomic integer
slots with an odd/even sequence and a reviewed ordering protocol; do not copy
every histogram bucket on every callback. No shared non-atomic reads. Readers
attempt at most three coherent copies, then return the last coherent copy marked stale. The
callback never waits for a reader. Error callback may execute independently:
its three typed atomic counters and failure flag are separate observations,
not falsely claimed to share the data callback's sequence. Final retirement
collects both after quiescence. Require lock-free atomics on supported targets;
an unsupported target must not quietly substitute a lock in the callback.

No callback allocation/free, blocking lock, retry loop, formatted error,
logging, process I/O, serialization, device query or synchronous UI. Build all
histogram edges/storage before play and destroy after retirement. Keep ordinary
UI snapshots small: current/last epoch summary and lifetime error totals;
fetch complete retained timing records only through the diagnostics command.
No histogram sorting or percentile calculation in callback. Test monotonic
publication and whole-retirement totals rather than assume a live cross-thread
error/timing snapshot is globally atomic.

Implementation preflight clarification: the strict allocation/free/lock guard
covers the complete app-owned data fill/clock/publication path and typed error
counter/native action work. CPAL 0.18.2 `error.rs:138` owns an optional
`Cow<'static, str>` in its by-value Error; backend message creation may allocate
and error-parameter destruction may free that owned payload. PipeWire's command
error sites construct owned formatted messages. This API boundary cannot support
a universal no-free claim for the complete CPAL error closure with bounded
storage. Retain a focused owned-error probe and disclose the limitation; do not
clone/format/log/retain messages, leak them or redesign the pinned dependency in
this slice. A complete backend error-path RT guarantee would require a separately
reviewed CPAL/error-ingress contract. Data fill guards remain unchanged.

## Scheduling And Audio Evidence

Callback execution duration divided by delivered frame duration is processing
utilization. Entry-to-entry time includes backend batching, buffering and
scheduling; it cannot alone identify lateness. The minimum pipeline does not
claim a scheduling-lateness counter. Record CPAL timestamp capability/backend
provenance if later measuring delivery/dispatch timing, with clock-domain and
backend semantics verified first. Do not mix timestamp deltas into execution
histograms or infer hardware presentation from them.

Software PipeWire monitor capture checks finite output, stereo, signal,
silence/tails and continuity hypotheses. Mark `physical_audio=false` explicitly.
Physical xrun evidence requires an identified physical device/backend counter
or independently instrumented hardware path; otherwise report unavailable.
Keep reported xruns, processing-budget exceedances and capture observations as
three separate results.

## Harness CPU And Resource Sampling

Extend `process_sample` with monotonic start/end timestamps and per-process
identity `(pid, /proc/PID/stat.starttime)`. Parse stat after its final `)` so
spaces in comm are safe. Record `utime` and `stime` (fields 14/15), starttime
(22), and `os.sysconf('SC_CLK_TCK')`; never assume 100 Hz. Recheck identity
around associated resource reads to reject PID reuse. Use only own user+system
ticks, not `cutime/cstime` added again to individually sampled descendants.

For identities present in successive samples, CPU seconds = delta ticks / HZ;
CPU percent = 100 * CPU seconds / monotonic elapsed seconds (100% is one core,
may exceed 100%). First-seen identities establish a baseline. Missing/exited
processes have unknown final deltas; PID reuse starts a new baseline, never a
negative delta or fabricated zero. Preserve last observations and mark exit,
new-process and enumeration gaps. Aggregate CPU is observed coverage, a lower
bound when gaps occur; do not claim complete tree CPU for transient workers.
Track already-seen identities through temporary reparenting until confirmed
exit, and declare any initial discovery/reparenting coverage limitation.

At 1 Hz sample app descendants' PSS KiB, RSS KiB, process/thread/fd counts and
role/comm, explicitly identifying WebKit worker identities. Collect app tree
and sampler/capture/private audio-server overhead separately. Missing or denied
smaps/fd reads produce per-field unavailable/coverage flags, not zero. Report
initial/final, distributions, maxima and trends, including editor reopen and
Apply boundaries; preserve raw finite-run samples for review. Slow sampling
records its duration and missed cadence rather than overlapping samplers.

## Thirty-Minute Bounds And Measurement Gates

Count 1800 **playing** seconds from proven native transport-running intervals
and advancing native frames, cross-checked against monotonic time. Absolute
audio frames advance while transport is stopped and cannot alone prove this.
Exclude unobserved transitions conservatively; keep Stop/Apply time separate.
Use uninterrupted observed running segments with a looping fixture and all
transport/reconfiguration actions controlled and recorded by the harness;
exclude intervals containing those actions. A stop/fault cannot silently resume
without a controlled action. The current wall-time loop plus one final playing
assertion is insufficient; no new native playing-frame counter is required.

Raw stereo float32 48 kHz is 384,000 bytes/s: exactly 691,200,000 bytes for
1800 captured seconds, excluding pauses/setup. Give each run explicit limits:
2700 elapsed seconds, 1 GiB audio, 64 MiB numeric/metadata artifacts, 1 MiB
capture stderr, 256 stream epochs, 64 simultaneous sampled processes and 256
distinct process identities. These are harness storage/time bounds, not capacity
or audio timing acceptance gates; terminate and report incomplete on exhaustion.
Check free disk with reserve before capture, supervise size/free space during
capture, cap/drain stderr, terminate/wait the owned recorder on every exit, and
process PCM in chunks. A stalled sampler must not allow unbounded capture:
enforce the recorder file/time bounds independently (file-size limit/watchdog).
Do not preload a 30-minute PCM file or repeatedly rewrite unbounded JSON arrays.
Write finite-run bounded samples incrementally, with final manifest/checksums.

Before admission, compare release builds with telemetry enabled/disabled using
the same exact sources, CPU/build/driver/rate/requested and observed buffers,
fixture and repetitions. Measure clock-only, histogram/publication tail and
total instrumented/uninstrumented callback or native-harness distributions and
maxima. Allocation/free/lock guards are separate diagnostic builds. Include
sampler/UI polling/capture overhead controls; do not subtract noisy mean
overhead from a p99.9 or hide instrumented guard costs. Native harness timing
must separately expose fixed commands, guard rejection, full publication and
emergency reserve from the Task 11 policy, without adding an engine evaluator.

Measure initial 2/6, internal 4/8, then 8/16 exact saved Faust fixtures with
uneven two-effect chains, all admitted voices/events/parameters, short loops,
aligned switches, seek/reset/chase, receipt publication/reuse, 64-command
bursts and cleanup. Retain sixteen roots; reject eight instruments plus nine
effects before dependency access. Preserve 32/frame and 64/1024 limits and the
explicit 40-event triad-plus-automation rejection. Do not shift authored events.
Attach counter maxima and timing distributions to the exact source/build IDs.
No larger profile is enabled by this design or by software loopback alone;
50% p99.9 headroom remains advisory. Task 15 consumes the complete epoch and
resource evidence for its actual native clip/chain workflow soak.

## Focused Test Seams

Inject monotonic times around `fill` and fake render return values: ordinary,
mixed-size/partial blocks, zero/malformed/oversized buffer, failure on a later
partition, post-failure callbacks, histogram edges/overflow and exact budget
comparison. Assert silence, typed counts and no lost duration sample on return.
Inject CPAL error classification without a device; test Xrun/non-Xrun totals
and existing failure semantics separately from native render failure.

Use a fake stream lifecycle for open/play failure, stop/start/configure/Apply,
reader contention/stale result, retirement and 65+ completed epochs: each final
counter reaches the ring/lifetime aggregate once, eviction is visible, harness
cursor gaps invalidate collection. Hold each closure independently past build
Err and inject a late error: native ownership and counters survive, no premature
merge occurs, new attempts/replacement of native roots refuse, and finalization
requires both witnesses. Exercise delayed play-failure and successful drop,
pending-attempt saturation, final metrics destruction on control, provisional
exit evidence and the authorized terminal exit fallback. Carry forward reliable
Quit, pending-history preservation and scoped-Stop regressions; no failed-open
test may wait indefinitely. Test stat fixtures with complex comm,
non-100 HZ, PID reuse, disappearing workers and missing PSS; CPU gaps must stay
unknown. Test capture bounds/cleanup with a short artificial recorder, not a
new 30-minute test. Real capacity and final soak remain measured follow-ups.

No architectural blocker remains in this bounded host design. The named
failed-open quiescence risk requires the witness/control/terminal-exit contract
above; normal teardown alone is insufficient. Backend-specific retirement,
the immediate-exit integration and timing overhead need implementation verification;
missing physical-xrun or complete exited-worker CPU evidence must remain
explicit limitations, not be replaced by guessed counts.
