# Task 13a: Reliable Stream Epochs And Bounded Measurements

This is the first reviewed checkpoint of Task 13. Read this first: these are
your requirements, with the exact values and interface decisions in
`task-13-observability-design.md`. That complete design and its lifecycle
preflight/source hashes are binding for this checkpoint. Reconcile its frozen
v2 source anchors with the accepted Task 12 v3 desktop, preserving the latter.

## Scope

Implement the design's stream ownership/lifetime witness, callback metrics,
bounded diagnostics and resource/capture sampler. Keep the accepted two-track,
six-device, eight-clip profile. No native capacity or scene enablement, new
saved-session schema, engine migration, physical MIDI, new reference research
or 30-minute run. The later Task 13b capacity checkpoint and Task 15 final soak
consume this implementation.

The app and existing native clip journey must remain usable at every checkpoint.
Parent owns PLAN, ledger, PR and retained experiments. You own the source,
tests, source contracts/README relevant to these changes, and a precise report.
Do not modify release branches, merge/tag/publish, change credentials or
persistent environment/settings, create cloud sessions, or spawn subagents.
One implementer owns the source lane; no parent index/commit work overlaps it.

## Implementation Boundaries

- Use closure-owned metrics Arcs and the serialized owner's `Arc::get_mut`
  witness. One unresolved opening/running/retiring attempt retains metrics and
  native ownership, refusing fresh start/replacement with retirement_pending.
  No finalization based on a return code, timeout or strong_count guess.
- Finalize every attempt exactly once after both closures are destroyed. Keep
  the active/retiring epoch, last 64 completed epochs, lifetime totals and
  explicit eviction/coverage/overflow metadata. Failed-open/play attempts count.
  Stop/Apply/settings changes must not erase observations. Counters and native
  identities cross JSON as canonical decimal strings where they are u64.
- Audit all native lifetime-changing callers of Driver stop/start/configure,
  including Ultra's alternate application path, Alive install/Apply/file/device
  operations, error unwinds, Drop and authorized Quit. Preserve drafts/history/
  roots on retirement_pending. Keep scoped transport Stop available.
- Preserve save/discard/cancel and authorized Quit. If callback retirement is
  unresolved at final exit, retain native ownership, emit bounded incomplete
  evidence and use the documented immediate process-exit contingency that
  avoids Rust/C++ destructors. Implement the equivalent on supported targets;
  test terminal behavior in child processes. Never disable Quit indefinitely.
- Measure the complete fill path including early returns, partitioning,
  conversion and silence. Implement the design's fixed histograms, exact
  buffer-budget arithmetic, typed CPAL Xrun/non-Xrun reports, distinct native
  render/shape/failure counters, lock-free publication and bounded stale reads.
  Timing excludes the final clock read/publication tail; expose this honestly.
- Keep callback allocation/free/locks/retries/logging/device queries/UI waits
  absent. Construct storage/edges outside callback. Each retained
  fixed numeric epoch payload stays at most 8 KiB; the completed ring stays below
  1 MiB plus bounded metadata. The one active epoch's fixed ordinary accumulator,
  atomic publication and single coherent-reader cache may total about 12 KiB;
  measure/report each copy and full active storage. This does not permit extra
  observers, dynamic copies, narrower wrapping counters or fewer histogram bins.
  Decimal-string JSON size is a separate bounded wire representation, not the
  fixed numeric-memory payload.
- Qualify that guard at the actual ownership boundary: complete app-owned data
  fill/clock/publication and typed error counter/native action work must pass.
  Pinned CPAL's by-value Error may own a Cow string, whose destruction frees
  backend-owned memory; backend error creation may also allocate. Retain a
  reproducible owned-payload probe, document this material limitation and do not
  claim universal no-free/RT safety for the complete CPAL error path. No message
  copying/formatting/logging/retention/leak workaround or dependency redesign.
- Add a bounded diagnostics command; keep routine UI snapshots compact.
  Surface useful retirement/error states without adding a large diagnostics UI.
- Implement truthful CPU/resource sampling by (PID,starttime), SC_CLK_TCK,
  missing/exited-worker gaps and per-field unavailable states. Stream bounded
  capture/sample artifacts incrementally. Independently enforce the design's
  wall/file/storage/process bounds and recorder cleanup, including a stalled
  sampler. Do not load complete long PCM into memory.
- Implement proven-playing-interval accounting for the later 1800-second
  workload; stopped frame advance alone is insufficient. Run short controlled
  verification here, leaving the full endurance workload to Task 15.

Prefer focused units for epoch/metrics ownership and sampler responsibility,
following existing source boundaries. If a new unit is becoming an entire
subsystem, report the concrete issue; do not bury it in audio.rs or rebuild
unrelated control architecture.

## Required Evidence

Use the design's focused test seams: exact histogram/budget edges, all fill
returns, later-partition render failure/silence, typed errors, varying callback
shapes, coherent/stale bounded reads, independent delayed closure destruction,
late error after build Err, play failure, pending saturation/native replacement
refusal, authorized terminal Quit, 65+ retired epochs and exactly-once totals.
CPU fixtures cover complex comm, non-100 HZ, PID reuse/exits and missing PSS;
short fake recorders prove independent bounds/cleanup without a long run.

Qualify allocation/free/lock and monotonic-clock/publication behavior with
appropriate focused instrumentation. Retain red/green evidence for concrete
regressions. Measure instrumentation enabled/disabled from the same sources
and document timing/clock/publication-tail overhead; do not subtract a mean
from a percentile. Native capacity measurements remain Task 13b.

Run affected tests plus the existing shared/Alive Rust and native app guards,
build separate Alive/Ultra with their adjacent native library, then exercise
the actual release clip/chain workflow with observed buffers >=256 on this
measured host. Include a short repeated Stop/Apply/configure/editor sequence
with complete epoch/resource evidence. Preserve pending-history, scoped Stop,
file/Quit, input readiness and package notice regressions. Run full unchanged
gates once where required; no repeated unrelated suites without a new concern.

Wire the new lightweight sampler unit suite into the existing Linux contracts
CI gate. Once the short native wrapper passes, use it in the existing saved-clip
CI step so all retained clip assertions plus epoch/control cycles run once;
preserve/extend artifact retention. Do not duplicate the full unchanged clip
journey or add the final long soak to CI.

Report to `task-13a-report.md`: status, commits/source/build IDs, changes,
commands/output paths and exit results, test/measurement claims with exact
provenance, actual hardware/backend/rate/requested/observed buffers, typed
errors versus processing overruns, software versus physical scope, warnings,
limitations and self-review. Keep raw evidence intact and identify its paths
for parent retention. Return only status, commits, one-line validation and
concerns. A later independent task review is the parent's responsibility.
