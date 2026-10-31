# Alive eight-track capacity qualification

This is the retained Task 13b evidence for draft PR #6. The production source
checkpoint is `a04f259c753a7b644aa806830b1f96e24c1c5d2d`, based on
`e1f09e5be8398ac631aad84c31a82895e5f54caa`. The subsequent review correction is
test-only and has separate evidence. These results do not qualify scene
launching, the final 1800-playing-second gate, physical audio or final packages.

## Reproduce And Inspect

```sh
python3 experiments/alive-capacity-m3-20261024/verify.py
# While the original temporary captures and release build remain available:
python3 experiments/alive-capacity-m3-20261024/verify.py \
  --live-root /tmp/alive-task13b-evidence
python3 apps/ultra/tests/run_alive_capacity.py /tmp/alive-capacity-check \
  --verify --guards
```

`retained-final-a04f259.json` hashes 692 immutable non-PCM/non-executable files
(27,966,540 bytes) from `/tmp/alive-task13b-evidence`. The earlier 523-file
snapshot remains in `retained-initial.json`. `checkpoint-source-manifest.json`
associates 224 files with their exact committed checkpoint bytes. The verifier
checks all retained bytes, historical source, raw timing distributions, epoch
totals/histograms and stage CPU calculations. With `--live-root`, it also streams
the temporary PCM for finite samples/hashes, checks recorder-group cleanup and
checks current release artifacts against the recorded build hashes. Raw PCM and
executables are not retained in Git.

`parent-complete-verification.json` records the complete independent check.
The older `parent-native-verification.json` is preserved as historical output;
its playing-time label is superseded by the explicit reported-time qualification
in the complete receipt. Early verifier assumptions about `coverage_gap` and
warmup-array lengths were corrected in the verifier, without changing raw data.

The test-only correction is `223dd34b48869d3c548e7add2e39c8da959a154d`.
`retained-fix-1-223dd34.json` adds 327 separately hashed files (2,902,856 bytes),
including intermediate and final guards, copied-source mutations and the frozen
fix report/review package. `parent-fix-1-verification.json` checks the retained
bytes, committed test-source identity, unchanged measurement source suffix,
all sixteen target-action witnesses, 54,295 render/read overlap observations
and both intended SIGABRT mutation rejections. The two mutations discard actions
or defer the reader until completion; neither reaches its 45-second outer limit.
The new diagnostic executable is not substituted for a historical timing build.
The first scoped review accepts target actions (I1) and finds a remaining
Boolean ABA in the concurrency witness (I2): both rendering flags could be true
while the read occurs in the gap between different callbacks. Fix 2 at
`17683245a410e1c3c9f5d68911bfa6501b089d06` requires the same callback generation
around the read. `retained-fix-2-1768324.json` adds 199 files (1,792,008 bytes).
`parent-fix-2-verification.json` verifies those bytes, unchanged I1/timed source,
16 target witnesses, 51,077 same-callback observations and deterministic old-red/
new-green callback-gap proof. The focused check retains allocation/free/lock
guards; the threaded publication regression is a distinct check. A fresh scoped
review accepts I2 with no new breakage. Both findings are closed and Task 13b
is locally accepted; original review, both scoped reviews and the parent's
evidence-closure mapping are retained under `review/`.

## Admitted Profile

Policy 1 remains two tracks/six devices with its existing numerical ceilings.
Policy 2 admits up to eight tracks/sixteen independent roots, four slots per
track, four voices per instrument and at most two effects per track. Eight
instruments therefore leave eight effect roots in total. ABI/schema, renderer,
frame clock, 1024 events, 32 events/frame, 64 events/1024 frames, 64 commands and
128 receipts remain unchanged. Atomic multi-track actions remain disabled.

The explicit 40-event fixture rejects. Four populated 188-frame loop fixtures
retain their conservative refusal of 96 events against the 64-event envelope;
authored events were not retimed. Seventeen roots reject before dependency
access. Full-profile buffer guidance is at least 512 observed frames, preferring
1024 near admitted graph/work bounds; policy 1 retains its 256-frame guidance.
This is guidance, with no automatic settings change or physical deadline claim.

## Headless Timing And Regression Evidence

`final-release-matrix-1/` contains 145 distributions and 174,000 raw samples
(1200 per case). The verifier checks the exact printed C++ quantile indices.
The following separate nearest-rank p99.9 figures come from the worker report
for the eight-track combined case:

| Host frames | p99.9 ms | Maximum ms |
|---:|---:|---:|
|64|3.525|4.008|
|128|4.174|4.614|
|256|5.049|5.225|
|512|7.163|7.844|
|1024|11.154|11.203|

The largest eight-track 1024-frame maximum across cases is 12.642 ms. The
combined case adds deliberately conservative work to actual saved-graph DSP,
but its scalar scan surrogate is not proof of an execution-time upper bound.
Real dense/seek/refusal paths are measured separately. The 50% p99.9 headroom
target is advisory. Proposal measurements in `internal-release-matrix-1/` retain
their own source identities and are not relabeled as final timings.

`telemetry-final-1/` contains seven same-source runs and 60 raw distributions:
36 native arrays each retain 64 warmups plus 1200 measured callbacks, and 24
clock/fill/publication arrays each have 20,000 observations. Eight-track
512-frame enabled p99.9 ranges from 2.360 to 2.888 ms, disabled from 2.361 to
2.459 ms. Publication-tail median is 110 ns, p99.9 121-131 ns, maximum 6001 ns.
Full distributions remain available; noisy percentiles are not subtracted to
claim a causal overhead. Callback duration excludes the separately measured
final clock/publication tail.

`full-rust-1.log` records 206 passes and four explicit ignores. Full native
`full-native-2.log` preserves v1/v2 and guards. Contracts completed their earlier
checks in `full-contracts-1.log`, then stopped at unavailable jsonschema;
`contracts-resume.sh` and `contracts-resume-1.log` complete the remaining checks
under an isolated dependency environment. The 46 DOM tests pass. Release staging
has retained red/green evidence and 18 passing tests: the release script now
atomically installs the current native library before Cargo tests, preventing
loading a stale adjacent target-triple library. Earlier failures remain intact.

## Actual Standalone App

The retained build manifest identifies these actual release artifacts:

- Alive: `1d4e09709133fa0b6821cff8cfd07fd89075a8bd3780f592098baf674acb4f28`.
- Adjacent native library: `d486110aa5e53c4f5f0c6c471a4a0de57296bd394790d2f459e6de941439bb47`.
- DEB: `f1d558e4a289e86176e6569941982f99ec692d264652b4037622aadbb08c9bb9`.

The build preceded the source checkpoint commit; exact file hashes establish
association. `release-build-manifest.json` retains its original base field and
is not an invented claim that the build ran after the checkpoint commit.
The host was AMD Ryzen 9 5900HS, Linux 7.2.8-10-omarchy/glibc 2.44, GCC 16.2.1,
48 kHz stereo, private Xvfb/DBus/software PipeWire, requested/observed 512 frames.

`native-eight-3/` is the final native walkthrough: eight tracks/sixteen roots,
three held voices each, all eight applied clip switches, independent editor
base control retained through Close/reopen, automated cutoff ownership with a
new stored base, gain/mute/solo, local Stop leaving seven tracks playing,
Save/Open restoration, remove/add track, create/add-note/Apply/play and complete
retirement. The unsupported 128-frame request preserves the saved 512 setting.
Readable captures are `native-eight-3/capacity-playing.png` and
`native-eight-3/capacity-final.png`.

Its four final epochs total 8511 callbacks/4,357,632 frames, maximum fill
5,616,093 ns and zero typed CPAL/render/shape/clock/overflow/budget-error counts.
The streamed main capture contains 2,094,080 finite stereo frames (43.626667 s),
peak 0.13149361312389374, SHA-256
`28d90ca694c2472cbb2cbd5d114e5820e7039688d1920c6b82935a73d324cc92`.

Two earlier harness failures stay retained: `native-eight-1/failed-value.png`
shows a launch target scrolled under the sticky header, and `native-eight-2/`
later read intentionally collapsed diagnostics after Open. The final driver
uses focus/Return and explicitly opens diagnostics. Keyboard activation is
not a pointer fix; the pointer issue belongs to the final interface audit.

## Controls, Resources And Limits

`overhead-controls-eight-1/` runs the identical binary/library through two
eight-second repetitions of baseline, sampler, diagnostics and finite-capture
stages. Eight stage CPU endpoint calculations are independently reconstructed
from raw process identities/ticks; app CPU is 65.74-79.24% of one core, with
sampler/capture and server separate. The final two epochs total 8792 callbacks,
4,501,504 frames and maximum fill 7,277,322 ns. Both finite control captures
pass streamed checks and all recorder process groups are gone.

The helper reports 63.133925 live-checked playing seconds, but did not retain
its underlying monotonic/native-frame interval observations. This is reported
short-control time, cannot be independently replayed, and cannot count toward
the final 1800-second gate. Task 15 explicitly requires raw interval records.

Native resource samples: 109 rows, PSS 485858 -> 495939 KiB (maximum 615699),
maximum app CPU 143.970% of one core, eight coverage-gap rows, up to nine PIDs
and three WebKit workers. Controls: 58 rows, PSS 490745 -> 528018 KiB (maximum
528018), maximum CPU 114.079%, one gap row, up to three PIDs/two workers.
Startup per-row maxima and stage endpoint CPU are distinct observations. These
short records neither establish leak freedom nor complete process accounting.

The existing `reserve_native` warning and private-display/DRI3/portal noise
remain attributed in raw logs. Local AppImage bundling retains the Arch
linuxdeploy RELR/GTK failure; it is not package qualification. CI/all-platform
packages at the earlier `e1f09e5` checkpoint are documented with stream evidence
and do not qualify this later source. Final-source CI/packages remain required.
Software loopback, processing-budget counts and typed CPAL reports do not prove
physical underruns, scheduling lateness, crash isolation or cross-platform
runtime behavior. AOT Faust remains in the shared native evaluator alongside
Clockwork; this work does not migrate its kernels into the Clockwork guest.
