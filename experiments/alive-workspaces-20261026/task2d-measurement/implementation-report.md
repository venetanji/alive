# Task 2D MIDI v4 Measurement Prerequisite

Status: DONE_WITH_CONCERNS. Measurement and correctness verification complete;
profile 2 fails the combined timing qualification. Awaiting independent review.
Shipping v4 remains disabled. The controller has selected only profile 1 for the
subsequent desktop admission slice, at measured practical buffers >=256 frames.

- Original dispatch base: `447023039a93944410b60d94d286a453a177f288`.
- Adjusted review base: `a1cf2e71d93c138f7c710440f765900ff81f32eb`, the parent's
  documentation/evidence checkpoint; native code is identical to dispatch.
- Scoped implementation commit: `8e177199c0f7d09b6a9380b67a37709b9ab4b31c` (four files, 790 insertions).
- Definitive measurement: `/tmp/alive-workspaces-task2d-measurement/final`.
- Additional checks/audits: `/tmp/alive-workspaces-task2d-measurement`.
- Source/test/index frozen. Scoped staged whitespace check passes; post-commit
  `git diff --cached --exit-code` exits 0 with an empty index. See `freeze.json`.

## Scope And Outcome

Four new files implement the test-only native measurement harness, immutable
runner, runner invariant tests, and native v4 policy documentation. No shared
runtime/header, ABI, ceiling, proof, shipping gate, original test, CI wiring,
Rust/UI source, launcher/application binary, backend setting or user setting was
changed. No subagent or push was used. Parent-owned planning/evidence changes
were not staged. This is the measurement prerequisite within existing Task 2D,
not completion of desktop integration or the user-facing MIDI journey.

The completed Task 2C native source is measured directly. Saved graph generation
is reused from the established fixture helper, but no v3 session is configured
and no v3 timing sample is imported. The exact complete MIDI envelope remains
the admission authority; refused shapes are not altered to manufacture a dense
benchmark. The current source compiled without the provisional define still
reports `PASS: v4 shipping admission remains disabled`.

**Profile 1:** proposed practical minimum 256 frames for the next desktop gate.
Both complete synthetic variants and every admitted authored case have zero
observed overruns at 256/512/1024. The 128-frame synthetic observations pass but
leave much less headroom; 64 frames fail. The controller confirmed that the
first desktop MIDI journey can use the two-instrument template (two roots),
with the admitted three-root shape available for a real effect.

**Profile 2:** explicitly unadmitted. Its heavy combined case fails even at the
maximum supported 1024-frame buffer. Passing two-chain or sparse eight-track
cases do not qualify the whole profile. This slice introduces no narrower
profile-2 structural rule and performs no additional qualification run to waive
that failure. Larger/effect-heavy v3 conversions must refuse transactionally
while preserving their existing project. Existing v3 eight-track support stays
unchanged. The later profile-2 task must establish and enforce a narrower scope
with its own measurement, or establish passing evidence for the complete scope.

## Reproduction And Provenance

Run from the repository root:

```sh
python3 apps/ultra/tests/run_alive_workspaces_measurement.py NEW_OUTPUT \
  --samples 1200 --guard-samples 20 --focused
python3 apps/ultra/tests/test_workspaces_measurement.py
bash apps/ultra/tests/ci/check-native.sh
```

The runner refuses an existing output directory. It copies all native/core
sources, actual example patches, generated saved graphs, test sources and the
existing core archive before building. `manifest.json` pins retained sources,
binaries, every raw callback sample, fixture and graph bytes. `commands.json`
contains exact argv/cwd/exits/elapsed times. The final runner retains 287 timing
distributions with 1200 samples each: **344400 raw samples**. Guard distributions
use 20 samples each: 5740 callbacks, with 23520 work rows including synthetic
supplements. Raw files are `timing/samples.csv`, `guards/samples.csv`, and
`guards/work.csv`; `summary.json` and `work-maxima.json` are machine-readable.

Host: AMD Ryzen 9 5900HS with Radeon Graphics, Linux 7.2.8-10-omarchy x86_64,
glibc 2.44, GCC 16.2.1 20260810, 48 kHz. Observed governors are `powersave`.
No affinity, scheduler, backend or governor setting was changed. Buffers are
1/31/64/128/256/512/1024. The two small sizes are logical/diagnostic observations.
This is finite software processing evidence, not physical-output or underrun
evidence and not a universal deadline guarantee.

Both builds use `-std=c++17 -O2 -Wall -Wextra -Werror -pthread` and the test-only
`ULTRA_ALIVE_SESSION_V4_PROVISIONAL` admission define. The timing build contains
no `ULTRA_ALIVE_SESSION_TEST_TRACE`, callback trace hooks, allocation/free
wrappers or mutex wrappers. Assertions remain enabled. Each timed interval is
the external native render call, plus the explicitly named synthetic supplement
where applicable; command enqueue, fixture preparation, state reads, assertions
on snapshots and CSV output are outside ordinary callback intervals. Clock
overhead is included. The separate guard build adds trace hooks and wrappers;
its durations are not used as release timing or pooled with timing samples.

Selected final SHA-256 pins:

| Artifact | SHA-256 |
| --- | --- |
| Timing probe | `5e2d339f6ec8ad06bca1a764338b08287271b8fea741373fe5959919ce832597` |
| Guard probe | `5108d6d33c6f8095a64102c5061ed96020e9b8dd2fe9198890c3a96dda4c4d27` |
| Current-source shipping test | `acbadbbfbee5a264e86b7e80f8fecc315ca308f17ce7d66fe3325d1295b00f02` |
| Measurement C++ source | `15f5936f82f791cd465398e220aba0c4427acd5cb02abe5123aec770bf4b43c7` |
| Existing copied core archive | `23bc0108d83e4b6d6300651a2945621ed25ece9ca49bc913313b306f1f153402` |

All manifest hashes were recomputed with zero mismatches. All 36 retained native
files and seven retained test/helper files were compared with current files and
match exactly. The subsequently written policy document is documentation, not
a measured binary input; all four new scoped files have additional pins in
`scoped-source-pins.json`. Native source is unchanged from the approved Task 2C
implementation. Development probes are historical and are not relabeled as the
final run.

## Authored Workloads And Structural Refusals

The graphs come from the actual subtractive, utility and stereo-lowpass saved
examples. Extended variants reach the accepted 32-node/64-edge/16-parameter
shape while preserving the saved signal chain. The heavier synthetic variant
uses more processing nodes with the original saved parameter bindings.

| Fixture group | Profile / tracks / roots | Actual musical/storage scope |
| --- | --- | --- |
| Session, Arrangement, suffix, song | 1 / 2 / 3 | One sounding track; real instrument + utility chain and second prepared instrument. |
| Full two-track storage | 1 / 2 / 3 | 8 sources, 8 slots, 16 placements, 1024 stored events; two tracks sound during repeating placements, with real gaps. |
| Session, Arrangement, suffix, song | 2 / 8 / 10 | One sounding track; instrument + utility + filter, seven prepared silent instruments. |
| Two complete ordered chains | 2 / 2 / 6 | Both tracks sound in Session and partial-song-loop cases; full two-track 8-source/8-slot/16-placement/1024-event storage also runs. |
| Full roots idle | 1 / 2 / 6 and 2 / 8 / 16 | Zero sounding tracks; graph/control/publication cost only. |
| Full source/event pools idle | 1 / 2 / 6 and 2 / 8 / 16 | 8 or 32 sources, 1024 events, zero slots/placements and zero sounding tracks. |

The rows distinguish full source/event storage from full slot/placement storage,
and distinguish configured roots from sounding tracks. Actual per-callback
sounding/voice counts and preparation revisions are retained in the raw samples.
The graph/configuration file names identify profile, track/root counts, graph
variant and preparation revision. Every accepted fixture exports all six
prepared curves at every width 1..1024. Refused configurations and graph bytes
are retained too, with exact diagnostic values in the command log.

Concrete final counterexamples, with no envelope weakening:

- Profile 1, full 2-track/6-root sparse Session: roots 21 > 18. Two sounding
  Session tracks refuse at 24 > 18. Sparse Arrangement/suffix/song refuse at
  24 > 18. Full two-track storage refuses at 30 > 18.
- Profile 2, full 8-track/16-root sparse Session: roots 51 > 48. Eight sounding
  Session tracks refuse at event bound 40 > 32. Sparse Arrangement/suffix/song
  refuse at roots 54 > 48. Full source/slot/placement/event storage refuses at
  roots 80 > 48.
- Profile 2 full 32-source/32-slot/64-placement/1024-event storage still refuses
  at 8 roots: placement frame envelope 136 > 64. Maximum root count is not its
  only constraint.
- The unchanged complete authority suite separately reproduces the previously
  approved exact song counterexamples: profile 1 roots 30 > 18 and profile 2
  roots 52 > 48. These are their original fixtures, not the runner's different
  sparse shapes.

Timing includes 188-frame source suffixes at 240 BPM; offset/held-note entry;
repeating Arrangement endpoints and gaps; nonzero partial braces; Session
sustain; 64-command Return reduction; repeated optional Seek with retained
history; reserved Stop after all 64 ordinary queue entries; and coherent v4
publication on every callback. The two-chain Return stress arranges the old
suffix and placement endpoints at E, then applies 64 Returns at the song seam.
Every final receipt applies in all 8400 timing callbacks of that case.

Repeated Seek actually refuses: for each profile, the one-frame series has
1198 work refusals and two accepted Seeks; at 31 frames it has 1164 refusals and
36 accepts; at 512 it has 600 of each; at 1024 all 1200 apply. Reserved Stop's
latest receipt is STOP_CANCELED in all 8400 callbacks per profile. The unchanged
full v4 corpus independently covers running Session overrides, receipt-slot
saturation, queue rejection, serial/epoch limits, simultaneous publication,
pending-member identity, rejected-Seek continuation and exact real PCM across
arbitrary callback partitions. Those behavioral paths are not inferred from a
single timing distribution.

## Six-Resource Accounting And Synthetic Stress

Guard traces distinguish scheduled (family 0), optional (1), emergency (2),
direct controls (3), and the synthetic supplement (4). Actual dispatch equals
charged events; actual reconstruction reads fit prior scan reservations;
preview reads remain <=128; placement descriptor probes fit reserved placement
steps. Every observed scheduled callback charge fits that fixture's complete
prepared curve at the measured callback width. Allocation/free/mutex guards
pass for actual renders and the added synthetic kernels.

Maximum charged scheduled callback vectors across the diagnostic matrix, in
events/roots/scans/writes/guards/placement order, are `6/12/256/384/0/8` for
profile 1 and `6/18/256/576/0/32` for profile 2. These are maxima across callback
sizes, not one-frame or rolling-window maxima. Optional maxima are
`0/3/1/96/9252/2058` and `0/10/1/320/9252/2082`. Maximum observed reconstruction
reads/preview reads/probes are 6/1/6 in this matrix. `resource-audit.json` retains
all family maxima. Conservative scan charges can substantially exceed actual
prefix reads; they are not advertised as a DSP instruction counter.

The focused song work-curve corpus also retains its per-sample trace and actual
versus admitted frame/window evidence: events 2/10 and 4/18; roots 6/30 and
12/54; scans 2/10 and 4/18; writes 40/200 and 80/360; guards 0/0; placement 8/34
and 9/45. Its 11000-frame history test covers the intermediate widths and
coalesced causes. The independently retained oracle remains unchanged and
passes in native CI.

Where no authored schedule simultaneously reaches each independent ceiling,
the labeled synthetic workload executes the complete window/optional/emergency
reserves. Totals are:

| Profile | Events | Roots | Scans | Writes | Guards | Placement |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 64 | 126 | 19456 | 3968 | 9252 | 2626 |
| 2 | 64 | 336 | 19456 | 10368 | 9252 | 2626 |

The native idle callback drains 64 real base commands. Its 64 writes are counted
once: the added write loop performs only 3904/10304 writes. Guard assertions
verify that exact native contribution. Event work is one shared 64-event total,
not separate scheduled/optional 64-event copies. Reset, parameter and dispatch
operations use real graph kernels. Scans and comparisons use explicit scalar
surrogates with volatile guard-history loads: 19456 source scans, 9252 original
guard comparisons, 576 descriptor probes, and the additional 2050 placement
horizon comparisons. MIDI PCM sample-payload reads remain zero.

The extra workspace then processes four voices per instrument across all 6 or
16 roots. This adds a full DSP bank to the native callback's already processed
silent graph bank. That conservative duplication is explicit; no charged work
resource is silently counted twice. Synthetic voices are separate from the
native snapshot's zero sounding tracks. This is not an admitted authored
project or a mathematical execution-time upper bound. It intentionally bundles
window maxima even for one-frame intervals; it does not authorize violating
frame ceilings. Scalar surrogates and the duplicated idle DSP are limits of the
measurement's interpretation, not grounds to silently waive deadline failures.

## Timing Results And Admission Decision

Every distribution retains mean/p99/p99.9/max, raw samples and overruns against
its own exact 48-kHz buffer duration. Quantiles are sorted index
`floor((n-1)*p)`, not interpolated. The following table takes the worse p99.9 and
maximum of the two synthetic variants, with overrun counts summed across 2400
samples; it is not a pooled-distribution quantile.

| Profile | Frames | Worst p99.9 us | Worst max us | Deadline us | Overruns |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 64 | 1427.146 | 1474.505 | 1333.333 | 48 |
| 1 | 128 | 2147.682 | 2354.651 | 2666.667 | 0 |
| 1 | 256 | 2665.116 | 2729.507 | 5333.333 | 0 |
| 1 | 512 | 4371.928 | 5039.374 | 10666.667 | 0 |
| 1 | 1024 | 8125.903 | 11348.427 | 21333.333 | 0 |
| 2 | 256 | 6939.320 | 7030.371 | 5333.333 | 2400 |
| 2 | 512 | 11625.951 | 13171.640 | 10666.667 | 240 |
| 2 | 1024 | 21444.734 | 23391.107 | 21333.333 | 3 |

Profile 2's 1024 heavy-DSP distribution has mean 19167.205 us, around 90% of
the 21333.333 us buffer. That high steady processing cost leaves little slack
for the observed tail; p99.9 and max both cross the deadline. At 512 it overruns
215/1200 samples; the other variant also overruns 25/1200. This diagnoses a
failed combined timing budget, not a correctness fault, and not a harmless
process-exit success. The measurements do not isolate OS scheduling from kernel
variance sufficiently to assign the entire tail to either; no tuning or
unsupported buffer increase is used to dismiss it.

All admitted non-synthetic cases have zero observed overruns at 31..1024 for
both profiles. Their worst 256-frame maxima are 1048.232 us (profile 1) and
2569.093 us (profile 2); worst 512-frame maxima are 2269.800 and 5081.681 us.
The two sounding extended three-root chains at 512 frames have song p99.9/max
1867.384/2291.572 us and coincident-Return p99.9/max 1870.951/2077.990 us.
These useful profile-2 observations are retained, but the controller ruling
correctly keeps profile 2 unadmitted after its complete combined failure.

Logical one-frame non-synthetic cases record 186 overruns for profile 1 and 2834
for profile 2. They exercise correctness/fixed overhead and are not proposed
desktop buffer sizes. No deadline guarantee is inferred from any finite series.

Validation time in the timing process ranges 8.491473-80.464509 ms across all
attempted fixtures; configuration ranges 8.799472-51.549914 ms for accepted
fixtures. Those stages exclude graph installation and evidence export. Peak
process RSS is 138180 KiB for timing and 138744 KiB for guards. This high-water
RSS includes the native host, graphs and harness; it is not isolated prepared
storage, a claim about PCM ownership, or a physical-output measurement.

## RED, Final Verification And Freeze

`runner-red.log` and `red-evidence.json` retain the initial failing runner test:
the required module did not exist, so import failed with exit 1 before runner
implementation. The final four unit tests verify exact quantile/deadline
calculation, refusal of empty samples, refusal of missing sixth-resource traces,
and separation of timing versus trace/guard flags. This is test-harness RED
evidence; no production behavior was changed. Intermediate fixture refusals and
the corrected repeated-install revision handling remain historical probes.

Final command records are retained with full output:

1. `python3 apps/ultra/tests/run_alive_workspaces_measurement.py
   /tmp/alive-workspaces-task2d-measurement/final --samples 1200
   --guard-samples 20 --focused`: all commands exit 0. Timing process 522.224 s;
   guard process 14.943 s. Separate builds use the exact retained current source.
2. Focused unchanged current-source v4 tests: one-lane 0.537 s, multi-track MIDI
   3.200 s, complete authority 11.670 s; all exit 0. The full authority suite
   includes original finite, suffix/Seek and song/collision cases, real PCM,
   receipt saturation, coherent observations and callback guards.
3. Current source without provisional admission: shipping test exit 0, 0.033 s
   after a 16.856 s build. Features remain disabled.
4. `bash apps/ultra/tests/ci/check-native.sh`: exit 0, 180.370225 s. Exactly one
   complete native CI run after the final harness changes. Original v1/v2/v3
   regression suites, v4 corpus and oracle pass. Stop stress passes 42 edit plus
   42 baseline cycles and 43008 float samples. Some legacy smoke tests load the
   existing native library; Alive suites compile current native source, and the
   separate shipping check above also compiles current source directly.
5. Final runner invariant tests: four tests pass, exit 0. Artifact hash audit:
   zero mismatches; all 36 native files and seven relevant tests/helpers match
   current source. `git diff --check` passes; scoped staged and post-commit index
   checks are recorded with the final commit.

Passing command exits mean the benchmark and assertions completed. They do not
turn the explicitly reported profile-2 deadline failures into timing passes.
The next work remains the existing Task 2D integrated profile-1 desktop slice,
under its accepted desktop contract; audio/PCM reads and shipping profile-2
admission are outside this completion claim.
