# Alive v3 work policies

Policy 1 admits profile `ALIVE_SESSION_V3_PROFILE_2X4`: at most two tracks,
six devices and eight clips, with four slots per track and two effects per
track. Policy 2 separately admits profile `ALIVE_SESSION_V3_PROFILE_8X4`:
eight tracks, sixteen devices and thirty-two clips. Both explicitly advertise
`ALIVE_SESSION_V3_FEATURE_ADMITTED`; storage or a successful limits query alone
does not admit a profile. Atomic multi-track actions remain disabled. Root
capacity stays 16. The desktop uses policy 1 for sessions within 2/6 and policy 2
when a larger strict v3 session needs it; playable legacy fallback remains v2.

## Registered ceilings

All counts are per absolute native frame or half-open 1024-frame window,
independent of transport phase and callback partition. Events retain their
separate 32/frame and 64/window limits; stored events remain bounded by 1024.

| Work family | Root clears | Event scans | Parameter writes | Guard comparisons |
| --- | ---: | ---: | ---: | ---: |
| Scheduled frame | 18 | 3072 | 608 | 0 |
| Scheduled window | 108 | 18432 | 3520 | 0 |
| Optional frame and window | 6 | 1024 | 192 | 9252 |
| Emergency per callback | 12 | 0 | 192 | 0 |

A root clear is the existing complete `CanvasRuntime::reset`, including all
Faust state; it is not a shortened voice-only reset. A track reset/chase has
charge `X=(roots, largest selectable clip event count, 2*bound parameters, 0)`.
The actual single strict-prefix scan can do fewer scans/writes. Track-local
clears never reset another track. Already-accepted base/bypass/mixer commands
have a separate fixed allowance of 64 commands per callback, including up to
64 direct parameter applications even when a seek is rejected.

The minimum period is 188 frames. A 1024-frame interval has at most six
quantization boundaries and seven positive-length segments. Across those
segments a cyclic reset pulse can contribute at most twelve times; adding
six forced splice pulses gives eighteen full-session charges. Thus
`18*6=108` roots, `18*1024=18432` scans and `18*192+64=3520` writes cover the
scheduled window. A frame conservatively admits a cyclic reset, a forced
splice and the extra nonloop-end charge: `3*6=18` roots, `3*1024=3072` scans,
`3*192+32=608` writes. The computed bar/seam table and component envelopes,
not these upper limits alone, decide whether each bank is admitted.

The first experimental frame candidate (12/2048/416) refused a full-six-root
nonloop fixture because its proof includes that third end allowance. The
registered frame ceilings reflect the structural three-pulse bound; the
fixture's events and times were not moved.

Optional work permits one full-session reset/chase per rolling window.
The fixed horizon loop performs `9*(1024+1)+27=9252` comparisons. Expensive
failed checks spend their guard allowance; cheap early refusals still have
the measured fixed callback/command-reduction overhead. Scheduled and optional
budgets are checked separately, including every retained-history overlap and
the exact candidate first frame. Quantized-only actions and a no-op START do
not need an arbitrary-phase horizon check.

Candidate first-frame preview is separate fixed control work: at most 22 binary
probes, 32 matching event records and two terminating reads, or 56 event reads
per callback. It is measured and directly traced, including on refused horizon
candidates. An early optional-budget refusal performs no preview or new chase.
Actual cursor reconstruction and strict-prefix chase share one forward scan
bounded by H_t, including its terminating probe. Scheduled scan credits are
checked and charged before those reads; optional scans were charged at accepted
batch admission. A later invariant failure cannot leave spent reads uncharged.

The emergency reserve is two full-session clears plus ownership release:
entry Stop, then a possible fault after fresh post-Stop control. Stopped cleanup
does no chase scan. A fault prevents rearming for the rest of that callback;
repeated Stop on already-clear roots performs no reset. Stop uses the same
independent mailbox as v1/v2, never the command or receipt capacity. Its epoch
saturates at UINT64_MAX and further transport requests require host restart.

## Measured graph family

Common v2 descriptor, graph, topology, node/edge and parameter-value checks
remain authoritative. The v3 profile additionally allows:

- An instrument with exactly one PolyNote, at most one each of SawVoice,
  FilterVoice and AdsrVoice, and no FilterStereo. PolyNote retains the native
  four-voice bound.
- An effect with no PolyNote or voice kernels and at most one FilterStereo.
- Supporting MultiplyVoice, MixVoice, AudioIn, LineSignal, SignalMultiply,
  SignalDac, Gain, Join and Dac nodes, within the native 32-node/64-edge bound.
- The saved example's dormant MidiIn, Toggle, Metro, Counter, Chord and
  MakeNote demo controls. Other control/autonomous nodes are rejected.
- At most sixteen bound parameters per device, targeting only Gain,
  FilterVoice, AdsrVoice, FilterStereo, LineSignal or PolyNote.

Dormant controls cannot invalidate the count model. Configuration and every
discontinuity reset clear the runtime timers/armed flags and Toggle/Metro
activity, even when authored on or prearmed through the editor. Bound
parameter changes do not emit control messages; LineSignal parameter changes
stop its ramp. Hosted MIDI/editor events and hot editor parameters are refused.
PolyNote accepts the scheduled note/sustain messages without forwarding a
control trigger; typed voice/signal edges cannot activate the dormant control
chain. Snapshot and other signal-to-control/autonomous sources, Send/Receive,
and bound timer/control parameters are outside the admitted family.

`profile_control_isolation` verifies authored-on and prearmed saved demos stay
silent across 100*1024 samples with repeated accepted base writes. It also
verifies rejection of hosted editor ingress, a v2-valid Toggle binding, and
a v2-valid Snapshot-to-Toggle route. This restriction leaves the exact saved
subtractive instrument, utility effect and stereo lowpass usable in v3.

## Measurement method and practical scope

Host: AMD Ryzen 9 5900HS (8 cores/16 threads), Linux 7.2.8-10-omarchy,
GCC 16.2.1, 48 kHz, C++17 `-O2`. The static test executable links the same
core/Faust bundle as the native host and wraps malloc/calloc/realloc/free and
pthread_mutex_lock around every measured callback. Test-only work tracing is
enabled; it is absent in the shipping library. No timing result is a universal
deadline guarantee. These original policy-1 measurements cover two tracks only;
the separate policy-2 evidence is recorded below.

The fixture generator reads the actual three saved JSON examples and records
their SHA-256 digests in the generated C++ header. Measurements include their
unaltered graphs, 32-node/64-edge/16-parameter extensions on all six roots,
and a separate extension maximizing active voice edges. Cases cover sustained
voices, 188-frame empty/populated loops, 1024 stored events, 64-command bursts
with base/bypass/mixer edits, repeated seeks, Stop after a full queue, and the
16,592-byte coherent state publication. Buffers 1 and 31 exercise logical
partition behavior; they do not establish practical driver deadlines.

The combined policy stress adds 126 root resets, 3904 parameter writes,
19456 scalar event reads and 64 extra note dispatches to a real callback with
63 accepted base writes, a seek/horizon check, DSP rendering and publication.
These are the sums of the full scheduled-window, optional-window and emergency
ceilings even for a 64-frame callback, and overcount work already performed
by that callback. Scalar event reads isolate the scan component; exact chase
branches are also exercised by the dense-control fixtures. This is a
conservative synthetic workload measurement, not an exhaustive CPU-time proof
over every graph topology or scheduler disturbance.

Each timing case records 1200 samples, mean, p99, p99.9 and maximum. The
checkpoint report records the final-source distributions and their raw log.
The final-source traced combined run measured:

| Frames | Mean us | p99 us | p99.9 us | Max us | Buffer us |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | 997.917 | 1148.940 | 1214.745 | 1232.879 | 1333.333 |
| 128 | 1218.868 | 1392.039 | 1423.529 | 1468.374 | 2666.667 |
| 256 | 1646.145 | 1792.325 | 1829.705 | 1832.692 | 5333.333 |
| 1024 | 4224.133 | 4348.743 | 4419.407 | 4431.871 | 21333.333 |

The practical evidence supports 256-frame-and-larger buffers on this host;
64 frames has little headroom. An earlier traced run observed a 3016.577 us
outlier at 64 frames, exceeding that buffer, so the final run does not establish
a deadline guarantee. Maximum-profile preparation (8 clips, 1024 events,
6 roots, 96 bound parameters) took 17.520 ms against the test's 5000 ms wall-time bound.
A 50%-of-buffer target
is advisory rather than a promised maximum. This historical table describes
policy 1 only. Arbitrary control patchers, atomic scenes and the final app soak
have separate gates.

## Policy 2: Eight Tracks

Policy 1's registered values and measured graph family remain unchanged.
Policy 2 retains four slots and two effects per track, four voices per instrument,
sixteen parameters per device, 1024 stored events, 32 events/frame, 64 events per
1024-frame window, 64 commands and 128 receipts. Sixteen roots permit eight
instruments plus eight effects; a seventeenth root rejects before dependency
access. Eight triads plus two automation events each total 40 events and reject.

| Work family | Root clears | Event scans | Parameter writes | Guard comparisons |
| --- | ---: | ---: | ---: | ---: |
| Scheduled frame | 48 | 3072 | 1568 | 0 |
| Scheduled window | 288 | 18432 | 9280 | 0 |
| Optional frame and window | 16 | 1024 | 512 | 9252 |
| Emergency per callback | 32 | 0 | 512 | 0 |

The existing three-pulse frame and eighteen-pulse window derivation applies:
`3*16=48`, `18*16=288` clears, and a full-session reset/chase has at most
`2*16*16=512` parameter writes. Scheduled writes are `3*512+32=1568` and
`18*512+64=9280`. The global event bound leaves scan ceilings unchanged.
Optional work allows one full-session reset/chase per rolling window, with the
same fixed horizon comparisons. Emergency work reserves two full clears and
one full-session base restoration. Fixed control still consumes at most 64
commands and 64 direct parameter applications, separately from these ledgers.
The conservative first-frame preview bound becomes `8*11+32+8=128` reads:
binary probes, matching events and terminating reads. Full publication remains
the existing 16,592-byte v3 payload. The portable mask helper and stopped-winner
reducer remain shared; enabling eight tracks adds no multi-track action feature.

The retained pre-admission matrix uses actual saved subtractive, utility and
stereo-lowpass graphs at 2/6, 4/8 and 8/16. Larger fixtures have uneven two-effect
chains, four slots per track, all admitted voices, 32-node/64-edge/16-parameter
extensions, 1024 events, short loops, aligned switches, reset/chase, full command
bursts, repeated work refusals, publication and emergency Stop. The 4/8 fixture
uses the proposed eight-track policy's conservative ceilings. Populated
188-frame fixtures with eight stored events reject their unchanged 96-event
splice envelope against the 64-event window cap; no event is moved to pass.

Release timing and allocation/free/lock diagnostics are separate binaries.
The combined synthetic upper-bound case adds all registered scheduled-window,
optional and emergency work (336 clears, 10304 writes, 19456 scalar scans and
64 extra dispatches) to a real callback. It overcounts actual work; it does not
prove every topology or scheduling disturbance. On the named Ryzen 9 5900HS,
48 kHz, GCC 16.2.1 `-O2` host, 1200 retained samples per case give:

| Frames | Combined p99.9 us | Exact max us | Buffer us |
| ---: | ---: | ---: | ---: |
| 64 | 3677.869 | 4019.445 | 1333.333 |
| 128 | 3888.958 | 4277.493 | 2666.667 |
| 256 | 4830.077 | 4955.904 | 5333.333 |
| 512 | 7282.491 | 10150.420 | 10666.667 |
| 1024 | 10827.339 | 11079.986 | 21333.333 |

For the larger profile use observed buffers of at least 512 frames; prefer
1024 for workloads near the admitted bounds. The proposed 50% p99.9 target
remains advisory, and even 512 has little observed maximum headroom here.
Policy 1 retains its existing 256-frame guidance. Settings are never changed
automatically. Requested and delivered desktop buffers, typed epoch errors,
telemetry enabled/disabled comparisons, actual release app provenance and
limitations are recorded in `.superpowers/sdd/PLAN/task-13b-report.md`.
These distributions retain their internal proposal source hashes; they are not
relabeled as a later build. Physical underruns and the Task 15 soak remain
separate from processing cost and software capture.

`python3 apps/ultra/tests/run_alive_capacity.py /tmp/new-capacity-run` retains
exact copied sources, commands, hashes and every release timing sample. Add
`--verify --guards` for the bounded diagnostic/partition/concurrent-publication
regression, or `--guards --samples 20` for work counters and guard checks. Output
directories must be new so failed or earlier evidence cannot be overwritten.

## Reproduction

Run from the repository root after `bash apps/ultra/build.sh --native-only`:

```sh
mkdir -p /tmp/alive-task11-measure
python3 apps/ultra/tests/alive_session_v3_fixtures.py /tmp/alive-task11-measure/saved_graphs.hpp
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE \
  -c apps/ultra/src-tauri/native/backend.cpp -o /tmp/alive-task11-measure/backend.o
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE \
  -I/tmp/alive-task11-measure apps/ultra/tests/alive_session_v3_measure.cpp \
  /tmp/alive-task11-measure/backend.o apps/ultra/build/core/libultra_core_bundle.a \
  -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock \
  -ldl -lrt -o /tmp/alive-task11-measure/probe
/tmp/alive-task11-measure/probe
```

`probe --verify` runs graph isolation, maximum-profile preparation and the
saved/maximal shortest/dense fixtures without the timing matrix. The native
CI gate includes it, the pure envelope oracle, ABI layout and runtime tests.
