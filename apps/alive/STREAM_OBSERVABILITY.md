# Stream epochs and finite-run measurements

The accepted 2-track / 6-device / 8-clip native profile is unchanged. Stream
telemetry is host evidence, not a larger-profile admission or a hardware deadline
claim. `alive_audio_diagnostics` (main window only) and Ultra's
`audio_diagnostics` accept a canonical decimal `after` cursor. Alive's optional
Stream measurements disclosure fetches the bounded records once per second only
while both disclosures are open. Routine snapshots contain scalar summaries.

## Ownership and shutdown

One epoch is allocated after configuration/device validation for each open
attempt, including zero-callback native-init, build and play failures. Start on
an existing stream creates no attempt. The driver and each supplied data/error
closure own a strong reference to that attempt's metrics. No observer receives
an Arc or Weak. After retiring the stream, only successful `Arc::get_mut` on the
serialized driver's reference permits native cleanup and exactly-once merge.
Neither `stream=None`, a backend error, timeout, nor a reference-count estimate
proves quiescence. Late error actions can still use the retained native state.

One unresolved attempt occupies the only slot. Start, settings and replacement
return `retirement_pending` without consuming an epoch ID or discarding drafts,
history, generation or prepared roots. Scoped transport Stop remains available.
Diagnostics and normal snapshot polling recheck without waiting. Normal stream
retirement uses the same witness even on backends whose Drop joins.

Authorized Quit completes the existing save/discard/cancel decision first. If
retirement is pending at final Exit, the driver makes one bounded best-effort
nonblocking stderr write on Unix and calls libc `_exit`; Windows uses
`TerminateProcess`. This deliberately skips Rust and C++ destructors and does
not wait for detached backend callbacks. Driver destruction uses the same
terminal contingency during unwinding. This is process termination, never an
in-process recovery path. Unix evidence can be partial/unavailable when stderr
is blocked; Windows has no guaranteed final observation transport. Child-process
tests qualify the Linux terminal behavior; other targets remain source-reviewed.

## Measurements and wire format

All u64 counters, epoch IDs and monotonic nanoseconds cross JSON as canonical
decimal strings. Requested frames are distinct from actual last/min/max frames.
A process run identity prevents accidental cursor reuse. The active/retiring
record is provisional; the last 64 completed records and lifetime totals survive
Stop, Apply and settings changes. Eviction and cursor gaps are explicit. The
finite harness must capture every completed ID contiguously, and an unresolved
final epoch invalidates completeness.

A fixed ordinary callback accumulator publishes changed scalar slots and the
two touched histogram bins. All atomic publication/sequence accesses use SeqCst:
a reader accepting matching even sequence values encloses no writer stores in
the total order. Readers try three times and otherwise keep the previous coherent
payload, marked stale. Error counters are independent observations, not covered
by the data sequence. Supported targets require native 64-bit atomics. Counts
saturate; atomic error ingress latches overflow and presents saturated values
instead of silently exposing wrapped totals. Overflow invalidates exact evidence.

Duration bins have integer upper edges `round(1000 * 2^(i/16))` ns for
`i=0..254`, followed by overflow; diagnostics publish the actual precomputed
edges. Utilization bins have upper edges 0 through 200 percent followed by
overflow. Each positive valid buffer uses its own frames and rate with the exact
comparison `duration_ns * rate > frames * 1_000_000_000`, computed in u128.
Percentiles are bucket intervals with sample counts and the exact maximum,
never invented exact percentile timings. Startup outliers remain included.

Timing spans entry to and return from the complete fill operation: validation,
all render partitions, conversion, and silence/early returns. It excludes the
final clock read and histogram/publication tail. Separate paired release
measurements report those costs without subtracting means from percentiles.
`telemetry-disabled` builds retain shape/error/lifecycle counters and publication
but omit callback duration clocks/histograms; configuration labels that mode.
The warmed app-owned data fill/clock/publication path has no allocation/free,
blocking locks, retry loops, logging, serialization or device queries. Rust
allocator guards and native callback allocation/free/mutex wrappers qualify
separate portions of that claim.

CPAL's error callback receives an owned `Error` containing an optional owned
`Cow<str>`. Backend construction can allocate and dropping that argument can
free on its callback thread. The borrowed typed counter/native-action function
adds no message copy, format, log, retention or leak; it cannot remove CPAL's
ownership costs. An explicit owned-payload probe shows zero action allocations/
frees and a separate payload deallocation. There is **no universal allocation-
free or bounded realtime guarantee across CPAL error ingress/backend code**.
A separately reviewed dependency API change would be needed for that guarantee.

Each fixed numeric retained record is below 8 KiB; the 64-record fixed ring is
below 1 MiB. Diagnostics report actual sizeof values for the fixed record, ring,
and the one active accumulator/publication/cache machinery (about 12 KiB).
Decimal JSON text is larger and has its own finite bound. Device/config labels
and lifecycle metadata are bounded; no per-callback trace or perpetual audit
file is created by the app.

`cpal_xrun_reports`, `cpal_non_xrun_reports`, malformed shapes, native render
failures and processing budget exceedances remain distinct. Legacy
`stream_errors` is CPAL error reports plus malformed shapes only. Zero reported
xruns does not establish zero physical underruns. Software monitor capture is
always marked `physical_audio=false`.

## Finite harness

`stream_measurement.py` samples `/proc` by `(PID,starttime)`, parses after the
final comm parenthesis, uses SC_CLK_TCK, and rejects identity changes across
resource reads. Own user+system ticks exclude child cumulative ticks. First seen
identities establish baselines; missing/exited final deltas remain unknown.
Discovered identities survive reparenting. PSS/RSS/fd failures remain per-field
unavailable, with observed subtotals and CPU coverage limitations.

Raw samples/epochs append to bounded JSONL files, with final SHA-256 manifests.
A separate recorder supervisor independently enforces 2700 seconds, 1 GiB PCM,
64 MiB metadata/logs, 1 MiB stderr and disk reserve, including when sampling
stalls. RLIMIT_FSIZE enforces the PCM file limit. The supervisor drains bounded
stderr, terminates every live member of the owned recorder process group and
reaps adopted helpers even if the leader exits first. The parent knows the
group before recorder launch and kills its members if the supervisor stalls.
CPU sampling admits at most 64 simultaneous processes and 256 distinct
identities across the union of app, observer/capture and private-server groups;
group CPU reports remain separate. Epoch collection admits at most 256 attempts
and checks its own incremental cursor against an evicted retained-view prefix.
An already-collected prefix is valid; a genuinely missed epoch, provisional
completed record or counter overflow makes collection incomplete. PCM analysis streams
chunks rather than loading an endurance recording into memory.

Playing time includes only adjacent observed running snapshots with advancing
native frames, no intervening controlled action, and bounded observation gaps;
it is capped by both monotonic elapsed time and frame advance. Stopped frame
advance, actions and unobserved intervals do not qualify. The short native
observability journey does not replace Task 15's 1800-playing-second workload.

Run focused checks with `python3 -m unittest discover -s apps/ultra/tests -p
 test_stream_measurement.py`, release Rust audio tests, and the explicit ignored
`paired_release_overhead` test. Run actual native collection through
`ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_observability.py
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-observability`.
