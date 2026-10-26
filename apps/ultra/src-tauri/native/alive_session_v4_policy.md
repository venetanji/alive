# MIDI Workspaces v4 Measurement Policy

V4 remains disabled for shipping. These measurements exercise the completed
native MIDI implementation through `ULTRA_ALIVE_SESSION_V4_PROVISIONAL` only.
They neither enable desktop commands nor qualify audio/PCM sources. Subsequent
Task 2D desktop integration must validate the complete candidate, preserve
transactional Apply/rollback and history, and pass its own contract gates before
any explicit production feature activation. V3 measurements do not qualify v4.

## Fixed Admission Contract

The accepted runtime contract and current complete envelope remain unchanged.
Profile 1 stores at most 2 tracks, 6 roots, 8 sources, 8 slots and 16 placements;
profile 2 stores at most 8, 16, 32, 32 and 64 respectively. Both store 1024 events,
64 commands and 128 receipts, with four voices/instrument, 16 bound parameters
per root, and the established saved/extended 32-node/64-edge graph family.
Storage maxima are not a promise that all their combinations are admitted.

The event limit is shared: 32/frame and 64/1024-frame window, including held-note
chase. Resource entries below are roots / prefix scans / parameter writes /
guard comparisons / placement steps. MIDI sample-payload reads are zero.

| Family | Profile 1 | Profile 2 |
| --- | --- | --- |
| Scheduled frame | 18 / 3072 / 608 / 0 / 64 | 48 / 3072 / 1568 / 0 / 64 |
| Scheduled window | 108 / 18432 / 3520 / 0 / 512 | 288 / 18432 / 9280 / 0 / 512 |
| Optional frame and window | 6 / 1024 / 192 / 9252 / 2114 | 16 / 1024 / 512 / 9252 / 2114 |
| Emergency per callback | 12 / 0 / 192 / 0 / 0 | 32 / 0 / 512 / 0 / 0 |

Direct base commands have their existing separate fixed queue allowance of up
to 64 parameter writes. They are counted in addition to, and separately from,
the scheduled/optional/emergency writes. Failed expensive optional checks retain
their guard/placement charge; Stop does not reset rolling history.

## What The Runner Measures

`python3 apps/ultra/tests/run_alive_workspaces_measurement.py OUTPUT --focused`
requires a new output directory and defaults to 1200 timing samples and 20 guard
samples per case. It copies native/core sources, actual saved examples, fixture
generator, test sources and the existing core archive, then builds against those
retained inputs. The archive is copied and hashed, not rebuilt or shipped.
`manifest.json` pins every retained input, binary, fixture and raw sample file;
`commands.json` records argv, cwd, exits and elapsed time. No scheduler, audio
backend or user setting is changed.

The timing binary uses C++17, `-O2 -Wall -Wextra -Werror -pthread` and the
provisional test admission define. It has no trace define, allocator wrappers,
lock wrappers or trace callbacks. Assertions remain enabled. The timed interval
is `ultra_external_render`, plus the explicitly named synthetic supplement when
applicable. Fixture preparation, command enqueue, CSV writes and observation
reads are outside the timed interval. The separate diagnostic binary adds
allocation/free/mutex wrappers and trace hooks; its durations are not presented
as release timing. Clock overhead is included, without subtracting an estimate.

Buffers are 1, 31, 64, 128, 256, 512 and 1024 frames at 48 kHz. Samples retain
actual sounding-track/voice counts, playing state, song position, preparation
revision and latest receipt disposition. Quantiles use
`sorted[floor((n - 1) * p)]`. Every distribution includes its exact buffer
duration and count of observed overruns. Validation and configuration times are
recorded separately; process `ru_maxrss` is an observable high-water mark, not
an isolated allocator measurement or PCM-memory budget.

## Authored Fixtures And Refusals

The saved graphs are the actual subtractive instrument, utility and stateful
stereo lowpass examples. Extended variants retain their connected graph and add
the admitted 32-node/64-edge/16-parameter shape. A second synthetic graph variant
uses more processing nodes and the saved parameter bindings.
The existing capacity-fixture helper supplies graph construction and chain
layout only. Every measured configuration, request, receipt and observation is
v4; no v3 session is configured and no v3 timing sample is imported.

Admitted musical candidates include profile 1 at 2 tracks/3 roots, profile 2
at 8 tracks/10 roots with one sounding track, and profile 2 with two sounding
tracks and two ordered instrument/utility/filter chains (6 roots). These are
specific prepared configurations, not blanket admission of every edit at those
counts. The eight-track sparse fixture must not be described as eight sounding
tracks. The two-chain Session and song fixtures actually sound both tracks.

The matrix covers Session sustain, Arrangement offset reconstruction, repeated
placements and gaps, the 188-frame suffix minimum at 240 BPM, partial song
braces, coincident song/suffix/placement/Return boundaries, 64-command
Return bursts, rejected Seek under retained history, and full ordinary queues
followed by reserved Stop. Every callback publishes the v4 payload. The unchanged
complete authority corpus additionally verifies pending receipt saturation,
concurrent coherent publication, exact PCM/dispatch partition invariance, and
continuation after refused Seek.

Full-root idle configurations and full source/event pools are measured separately.
Their stored notes do not sound without slots or placements. Full placement/slot
storage is attempted explicitly and retained as an admission refusal where the
complete envelope exceeds a resource ceiling. The two-track full placement/event
pool fixtures have real repeating music and gaps; they are not a proof of the
eight-track full-placement shape.

No refusal is weakened to obtain a dense timing case. The independently approved
song corpus retains profile-1 2-track/6-root roots 30 > 18 and profile-2 sparse
8-track/16-root roots 52 > 48. The runner supplies further exact counterexamples
with their own configuration bytes and diagnostic output. Full-root synthetic
timing never turns these refused musical projects into admitted projects.

## Synthetic Six-Resource Stress

An admitted full-root silent native callback drains 64 real base commands and
publishes v4. A separate graph workspace executes the complete registered
window reserves plus optional and emergency reserves. The synthetic counts are:

| Profile | Events | Roots | Scans | Writes including native queue | Guards | Placement |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 64 | 126 | 19456 | 3968 | 9252 | 2626 |
| 2 | 64 | 336 | 19456 | 10368 | 9252 | 2626 |

The 64 writes already performed by the native callback are subtracted from the
synthetic write supplement (3904 or 10304). Guard builds assert that the native
callback performs exactly that fixed work and no other charged resource work.
Trace family 3 records native controls; family 4 records only the added synthetic
work. Events are 64 total, not two separate 64-event reserves. Reset/parameter/
event operations use actual graph kernels. Prefix scans, guard comparisons and
placement probes/horizon comparisons use explicit scalar surrogates; the actual
runtime versions also execute in the authored Seek/Return and complete guard
corpus. Placement work includes 512 scheduled plus 64 optional descriptor probes
and 2050 additional horizon comparisons; none is silently dropped.

After resets and writes, 64 dispatches establish four voices on every instrument
in the synthetic workspace, and its full chains process the measured frame
count. This extra DSP bank is deliberately in addition to the silent native
callback's graph processing. It conservatively duplicates the silent graph cost;
it does not double-count any of the six charged resource ceilings. Synthetic
voice counts are stated separately from the native snapshot's zero sounding
tracks. Both maximum-parameter and heavier-processing graph variants are run.

Independent window maxima cannot necessarily coexist in an admitted authored
schedule, especially in a one-frame callback. This is a conservative combined
stress workload, not an authored project, a mathematical execution-time upper
bound, or permission to exceed a frame ceiling. The scalar surrogates and extra
DSP bank are explicit limitations of interpreting its timings.

## Measurement Conclusion

The retained Task 2D run is
`/tmp/alive-workspaces-task2d-measurement/final`: 287 distributions, 1200 raw
timing samples each (344400 total), plus separate 20-sample guard distributions
and the unchanged complete v4 corpus. Host: AMD Ryzen 9 5900HS, Linux
7.2.8-10-omarchy, glibc 2.44, GCC 16.2.1 20260810, 48 kHz. The observed CPU
governors were `powersave`; no setting was changed. Source and binary hashes,
full commands, all quantiles and every callback sample are retained there.

The following entries are the worse p99.9 and maximum across the two synthetic
graph variants, not quantiles of a pooled distribution. Overrun counts sum both
1200-sample variants. Each synthetic row includes the explicit extra DSP bank
and scalar-surrogate limitations described above.

| Profile | Frames | Worst p99.9 us | Worst max us | Buffer us | Overruns / 2400 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 64 | 1427.146 | 1474.505 | 1333.333 | 48 |
| 1 | 128 | 2147.682 | 2354.651 | 2666.667 | 0 |
| 1 | 256 | 2665.116 | 2729.507 | 5333.333 | 0 |
| 1 | 512 | 4371.928 | 5039.374 | 10666.667 | 0 |
| 1 | 1024 | 8125.903 | 11348.427 | 21333.333 | 0 |
| 2 | 256 | 6939.320 | 7030.371 | 5333.333 | 2400 |
| 2 | 512 | 11625.951 | 13171.640 | 10666.667 | 240 |
| 2 | 1024 | 21444.734 | 23391.107 | 21333.333 | 3 |

**Only profile 1 is a candidate for subsequent desktop admission, with practical
buffers of at least 256 frames.** Its 128-frame synthetic cases pass this finite
run but leave substantially less headroom; 64 frames fail. Across all admitted
non-synthetic profile-1 cases there are no overruns at 31 through 1024 frames;
the logical one-frame cases have 186 observed overruns. These observations do
not lower the proposed 256-frame practical minimum.

**Profile 2 remains unadmitted.** Its heavier synthetic 1024-frame case has mean
19167.205 us, p99.9 21444.734 us and maximum 23391.107 us; 3/1200 samples exceed
the deadline. The mean itself consumes about 90% of the buffer, leaving little
room for the observed tail. The 512-frame heavy case overruns 215/1200 samples;
the maximum-parameter variant also overruns 25/1200. These are deadline failures,
even though the measurement executable and all correctness assertions pass.
The synthetic workload combines fixed maximum work with an extra full DSP bank;
it is deliberately conservative, but its failure cannot be waived to advertise
the full profile. No supported buffer up to 1024 passes both combined variants.

Particular profile-2 musical configurations do pass: the extended two-chain
song case at 512 frames has p99.9 1867.384 us and maximum 2291.572 us, with both
tracks sounding. All admitted non-synthetic profile-2 cases have zero overruns
at 31 through 1024 frames. These narrower observations are retained for future
work; they do not qualify profile 2 or create a new structural admission rule.
The smallest future qualification task is to agree and enforce a narrower
profile-2 candidate envelope/graph scope and measure that scope independently,
or otherwise establish passing evidence for the existing complete profile.
Neither occurs in this measurement slice.

The first desktop MIDI journey can use the existing two-instrument template
under profile 1; the measured 2-track/3-root configuration also permits a real
effect. Conversion of larger or more effect-heavy projects must refuse
transactionally and preserve their existing v3 projects. Existing v3 eight-track
support and policy remain unchanged. No v4 timing result is inherited from v3.

Validation takes 8.491-80.465 ms and configuration 8.799-51.550 ms in the timing
process across the attempted fixtures; these stages exclude graph installation
and evidence export. Peak process RSS is 138180 KiB (138744 KiB in the guard
process). Guard durations include tracing and allocation/lock checks and are
not used in the deadline table.

Finite software measurements establish neither universal callback deadlines
nor physical-output/underrun behavior. Logical 1/31-frame tests are correctness
and diagnostic observations. Desktop integration must still validate the whole
candidate and pass preparation/history/snapshot/rollback and actual driver
gates. Both shipping v4 feature sets remain disabled in current source.
