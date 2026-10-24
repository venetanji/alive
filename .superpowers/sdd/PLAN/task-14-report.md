# Task 14: Atomic Scene Launching

Implementation based on `7b76c7e72d228ce7bc9a4ef8475013e09c85df54`, preserving
the accepted Task 13a/13b ownership, stopped-winner and publication changes.
Raw evidence is under `/tmp/alive-task14-evidence/`; parent owns durable
retention, independent review, acceptance and the separate Task 15 soak.

## Implemented Contract

- Native TRACK_ACTIONS accepts a valid multi-member mask only when the actual
  configured policy advertises ADMITTED and ATOMIC_TRACK_ACTIONS. Validation,
  one queue entry, reservation and one serial remain one ingress transaction.
  ABI sizes, strict v3 saved schema and every capacity/work ceiling are unchanged.
- One native target is computed in queue order. Fixed candidate scratch reduces
  each masked member; partial supersession, due completion, Stop, end and fault
  update only unresolved member bits. The accepted unpublished stopped-cue
  winner semantics remain per track. Previously published applied bits are final.
- Pending masks dominate scalar status; terminal combinations become MIXED.
  The ratified request-summary priority is RuntimeInvariant > StopCanceled >
  WorkLimit > EndCanceled > ReplacedRequest. No per-member reason is invented.
- Optional refusal preserves published pending choices and terminal candidate
  dispositions, rejecting only surviving provisional applied/pending members.
  Due work uses the existing whole-frame aggregate guard and emergency cleanup.
- The main-window-only `alive_launch_scene` command authenticates generation,
  canonical preparation revision, capability, slot and audio state. It reads
  immutable prepared slots once and submits one request; empty slots map to
  TRACK_STOP. Audio-off refusal is `Start Audio to launch a scene`.
- Four scene buttons retain incumbent bank/chain/editor styling, display
  prepared names and empty-member Stops, and capture preparation identity at the
  gesture. Common target and per-track outcomes are textual. Scene requests do
  not become transport notices or persistent active-scene state. Local selection,
  history, dirty state, saved defaults and device/editor ownership are preserved.

## Regression Evidence

The retained red phase precedes implementation: `red-1` fails at the old native
multi-bit refusal; `rust-red-2.log` fails the absent member-mask projection;
`ui-red-1.log` fails the three missing scene-control/receipt tests. The earlier
`rust-red-1.log` accidentally filters all tests and is not red evidence.
`rust-mapper-red.log` additionally records the expected disabled-profile mapper
failure before the feature bits were enabled. `green-1`, `expanded-1`,
`native-final-focused`, `rust-green-1.log` and `ui-green-1.log` retain subsequent
passes. `disabled-capability` independently disables both copied policy bits
and proves the native FEATURE_DISABLED refusal.

Native scenes cover two/eight-track member permutations; overlapping masks and
cumulative old-receipt updates; 64 stopped scenes; optional cheap/expensive
refusal and prior pending preservation; invalid final/unmasked members; full
queue and busy/+128 reuse; Start/Seek/end ordering; rounded-bar/short-seam sample
equivalence; whole-scene aggregate fault including already superseded members;
acquired-head Stop race and fresh post-Stop scenes. Saved-chain stereo equality
includes retrigger, empty clip/Stop, warm bypass and mute at partitions
1/31/64/256/1024. Rust additionally proves one remaining native queue slot
accepts the whole prepared scene and retains member identities. DOM regressions
cover draft/prepared labels, all-empty rows, partial masks, delayed identity,
focus and selection. Existing v1/v2, history, scoped Stop and Quit tests remain.

Completed full gates, all exit 0:

```sh
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" cargo test \
  --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked --lib
bash apps/ultra/tests/ci/check-native.sh
uv run --no-project --with jsonschema bash apps/ultra/tests/ci/check-contracts.sh
```

Logs: `full-rust.log` (211 passed, 4 explicitly ignored measurement/private-audio
tests), `full-native.log`, `full-contracts.log` (including all 49 Alive DOM tests).
The native gate retains the exact 40-event and populated 188-frame 96 > 64 refusals,
guarded maximal six-root scene burst and prior concurrency regression.
The contract script regenerated an unrelated historical arithmetic manifest;
its generated receipt was retained in `full-gates/` and that file alone restored
to prior HEAD bytes with parent authorization.

## Bounds And Pre-Admission Measurement

The existing envelope proof already maximizes selectable clips per track and
sums simultaneous reset/chase work. Scenes introduce no new event or boundary.
No event, queue, receipt, graph, root or work ceiling changed. A 128-entry fixed
candidate receipt index adds 512 scratch bytes. Each callback drains <=64
commands and visits <=512 scene members; candidate lookup is O(1), checked
against the full serial. Old-pending fallback scans <=8 tracks, with <=8 old
pending dispositions. Aggregation tests four terminal masks; refusal visits
<=64 receipts; due/Stop/end visit <=8 pending tracks. Coherent publication remains
16,592 bytes. No callback allocation/free/lock is introduced.

Before production feature activation:

```sh
python3 apps/ultra/tests/run_alive_capacity.py \
  /tmp/alive-task14-evidence/proposed-verify-1 --verify --guards --scenes --proposed-scenes
python3 apps/ultra/tests/run_alive_capacity.py \
  /tmp/alive-task14-evidence/proposed-release-1 --scenes --proposed-scenes --samples 1200
```

Both pass. The runner modifies only the isolated copied policy source.
After enabling production bits, `enabled-native-source-equality.json` confirms
all 28 measured C/C++ files match production byte-for-byte; later policy Markdown
changes are documentation only. The guarded run reports 1,696,675 scene-receipt
observations and 49,785 MIXED observations under the accepted same-callback
render-overlap predicate. Trace maxima: two-track preview 14 accepted / 18 dense
against 56; eight-track 56 against 128; dense reconstruction 1024; cheap refusal
preview/chase 0. Scene-only quantized work performs no optional preview.

Release matrix host: AMD Ryzen 9 5900HS, Linux 7.2.8-10-omarchy x86_64,
GCC 16.2.1, C++17 `-O2`, logical 48kHz. There are 56 distributions of 1200 raw samples
(67,200 total), with copied source hashes, build commands and logs. Printed
quantiles use sorted index `floor((n-1)*p)`, including p=0.999. Combined cases:

| Tracks/roots | Frames | p99.9 ns | Maximum ns | Buffer ns |
| --- | ---: | ---: | ---: | ---: |
| 2/6 | 256 | 1,822,026 | 1,838,708 | 5,333,333 |
| 2/6 | 512 | 3,282,398 | 3,628,122 | 10,666,667 |
| 2/6 | 1024 | 4,687,786 | 4,989,236 | 21,333,333 |
| 8/16 | 64 | 3,639,671 | 4,310,186 | 1,333,333 |
| 8/16 | 128 | 4,003,287 | 4,540,039 | 2,666,667 |
| 8/16 | 256 | 5,606,953 | 5,912,639 | 5,333,333 |
| 8/16 | 512 | 8,477,349 | 9,065,259 | 10,666,667 |
| 8/16 | 1024 | 14,591,876 | 16,742,724 | 21,333,333 |

The combined diagnostic adds full scheduled-window, optional and two-clear
emergency reserves, 64 direct parameter writes, 64 dispatches and the retained
scalar scan surrogate to an actual 63-scenes-plus-seek callback. It deliberately
overcounts and is not a universal execution-time upper bound. Other measured
paths include 64 running scenes, 64 stopped scenes, accepted seek, repeated cheap
refusal, full-queue Stop and 1024-event reconstruction. Retain practical observed
buffer guidance >=256 at 2/6, >=512 at 8/16, preferring 1024 near its bounds. The
8/16 combined 256 case exceeds its buffer, and the larger combined cases miss
the advisory 50% p99.9 target. Partitions 1/31 are semantic tests, not driver claims.

Parent independently verified all 60 manifest files and 56x1200 raw distributions
in `/tmp/alive-task14-parent-raw-release-verification.json`. Its separate
nearest-rank p99.9 results for combined 8/16 at 256/512/1024 are 5,697,854 /
8,804,767 / 15,514,588 ns; these use a different quantile convention, not a rerun.

## Release Artifact And Actual Desktop Evidence

Fresh native build: CMake Release in `/tmp/alive-task14-evidence/native-build`,
then atomic fresh-inode installation recorded in `native-atomic-install.json`.
Ultra and standalone Alive are separately built with locked Cargo release
profiles into `apps/ultra/src-tauri/target`; the historical standalone target
tree remains untouched. `release-build-manifest.json` retains source, artifact,
inode and command identities; configure/build logs are alongside it.
`host-environment.json` records CPU/OS/compiler/tool versions and release linkage.

| Artifact | SHA256 |
| --- | --- |
| standalone Alive | `a5e8f4504e4a80a173619a82a0015c2c66b52ca63a3852b62487380e9024ffed` |
| Ultra | `ea63dad5520173b85941520794ffd52a3c56f1ecdaf7484fd4dde6f501d3f205` |
| native release library | `074f64ddc0b1668bfd2479099cb89ff8c90eb9354cfeb001bb94e095ab477324` |
| timing-probe core archive | `23bc0108d83e4b6d6300651a2945621ed25ece9ca49bc913313b306f1f153402` |
| fresh release core archive | `396ee93d6b12b45c25f6ca76f8996aa2c2dff45aaf46654692aa36f4fce58f83` |

The native release backend uses CMake `-O3 -DNDEBUG -fPIC`; both core archives
use `-O3 -DNDEBUG -std=c++20 -fPIC -g` with identical source/defines/includes.
Build directories and CMake versions differ (historical 3.31 versus fresh 4.4),
and the archives have different bytes. The `-O2` probe is a separate artifact;
its timing is not relabeled as this actual driver binary.

Actual release commands use the same explicit pair and private Xvfb/DBus/
PipeWire harness, with temporary XDG directories:

```sh
python3 apps/ultra/tests/alive_capacity_session.py /tmp/alive-task14-evidence/eight.alive
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_ALIVE_BINARY="$PWD/apps/ultra/src-tauri/target/release/alive" \
ULTRA_TEST_ALIVE_SESSION=/tmp/alive-task14-evidence/eight.alive \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_scenes.py" \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task14-evidence/native-scenes-1
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_ALIVE_BINARY="$PWD/apps/ultra/src-tauri/target/release/alive" \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_clips.py" \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task14-evidence/native-clips-1
```

`native-scenes-1` exits 0. It observes an all-empty scene while stopped, then
an occupied stopped cue; running scene 2 followed by Pulse Clip 1 produces serial 6
MIXED at common target 1723300 with Pulse superseded and seven applied. Serial 8
applies scene 2 to all eight at target 2011300. The actual text is retained in
`scenes-observations.json`; these are native receipt projections, not inferred
from current active clips. Local Stop leaves Pulse at zero voices and seven
tracks at three voices. Hosted editor close/reopen retains base 0.65 while
transport advances; bypass, history Undo, automated-base ownership, mixer, Save
As/reopen stopped defaults and remove/add/create/Apply all pass. The screenshot
`scenes-initial.png` was inspected: prepared member labels wrap within four
columns, distinct scene buttons/help remain above the incumbent bank, and cue
labels remain distinct from playback.

The first scene run records four witnessed finalized epochs, native quiescence,
no epoch coverage gap or eviction, PipeWire default_output stereo f32 at 48 kHz,
requested/observed 512 frames throughout. Each epoch has zero typed CPAL errors,
native-render failures, invalid callback shape, clock anomaly, counter overflow
and over-buffer-budget counts. Per-epoch histogram intervals are retained;
durations are processing observations, not exact percentiles from raw samples.

| Epoch | Callbacks | p99.9 interval ns (lower exclusive, upper inclusive) | Maximum ns |
| --- | ---: | ---: | ---: |
| 1 | 328 | (6,888,623, 7,193,609] | 7,179,906 |
| 2 | 6488 | (4,466,720, 4,664,478] | 5,477,679 |
| 3 | 1532 | (4,466,720, 4,664,478] | 4,606,818 |
| 4 | 1592 | (4,277,345, 4,466,720] | 4,390,991 |

The finite capture contains 2,482,176 frames / 51.712s, all finite, both channel
peaks 0.131493613, and SHA256
`94da8ae34b0f0244846b5f24acb13fc953fdc704b37a2b36ae23e840de7d181f`.
The fixture produces matching channels (zero unequal samples after setup), so
this is a finite two-channel capture, not a claim of nonidentical stereo content.
The bounded recorder ends through requested_stop; its supervised pw-cat return 1
is the intentional termination outcome, with zero stderr bytes.

`verify-scenes.py` independently rereads the raw audio, JSONL hashes, histogram
totals, per-epoch configuration/counters and final retirement into
`native-scenes-1/scenes-verified.json`. Both resource/epoch manifests match the
final raw files. The executed harness is retained alongside the run; self-review
then made sampler shutdown precede manifest hashing to eliminate a prospective
race (the first run's hashes already match).

Resource observations span 124s / 125 samples. CPU percentages are relative to
one core and include the discovered process subtree; initial/transient/
reparented-before-discovery workers may be absent. The moving workflow has
different windows and stopped/playing phases, so first/last PSS is not a leak
or steady-state claim. App CPU p50/p95/max 106.75/125.91/142.05%; PSS first/last/
max 487224/496167/620939 KiB (+8943 KiB), maximum 130 threads/225 FDs. Sampler/capture
CPU 28.16/33.86/57.81%; private server 0/1.01/2.00%. App/sampler/server identity
coverage-gap sample counts 7/7/1 include discovery and lifecycle changes. No
unavailable fields, process records or enumeration gaps are observed. Maximum
app cadence 1.012s, sampler/server 1.678s; maximum collection duration 0.708s;
reported missed cadences 0. PID/start-time/worker identities and all values remain
in raw JSONL and the verifier output. No long-run growth conclusion follows.

The original clip journey's first run stops at its unchanged line 79 assertion:
after the pointer launch, native text remains `Cued Clip 1 copy` and shows no
individual request. `native-clips-diagnostic-1` preserves click/assertion cadence
and reproduces that failure with identical used/after rectangle 223,241,59,28.
`native-clips-diagnostic-2` adds synchronous native owner/hit-path observations;
its launch succeeds, with the owned window in both paths, then its later editor
pointer action fails to open the editor. These observations do not establish
the exact cause of the original launch or the separate remote `7b76c7e` Undo
failure. No product change is attributed to either.

The copied keyboard isolation run (`native-clips-keyboard-1`) passes all original
assertions, and records a focused editor target at 1109,638,79,24 inside the
expanded Audio details rectangle 0,594,1200,206. This proves the lower editor
control's spatial occlusion. Keyboard isolation is not substituted for the
pointer acceptance gate. With parent authorization, the canonical clip harness
now closes/restores the disclosure explicitly around that pointer action and
uses the existing bounded motion-flush/stable-owned-target pointer dispatcher
for the initial launch. It sends one press/release, never retries an action,
and preserves every original native receipt/state/editor/history assertion.

The copied corrected pointer harness (`check_alive_clips_pointer.py`) passes the
complete journey in `native-clips-pointer-1`, exit 0, and is installed byte-for-
byte as `apps/ultra/tests/check_alive_clips.py`. Its retained native input record
has owner 4194307 in path [927,4194307], one press and one release. New/Open,
duplicate/note Undo/Redo/Apply, individual quantized launch/Stop, hosted editor
continuity, base/bypass, relocated Save As/default reopen, stale shared-source
refusals and the original preserved-copy/restore/sequential-replacement recovery
all pass. The final native view is stopped, audio off, zero typed stream errors,
zero rejected commands and zero voices. Its finite software capture has 529,408
frames / 11.029333s, peak 0.222594455 and SHA256
`534ac1092516502cac73263662dd1ee009ecd178799932d53487b96180b5d3ca`.
The input prerequisite and failed/query-sensitive runs remain review evidence;
Task 15 retains the end-user native pointer audit and the remote CI diagnosis.

Final `native-scenes-2` repeats the identical production pair with the final
sampler-shutdown harness, exits 0, and passes the independent raw verifier.
Its `/proc` executable/library mapping hashes match the artifact table. Both
JSONL manifests match after the worker has stopped; all original scene/editor/
persistence assertions pass. Serial 6 is MIXED at 1737636 with one superseded
and seven applied members; serial 8 applies all eight at 2025636. Four finalized
epochs retain 48 kHz / 512 requested and observed frames, zero typed errors,
native failures, shape/clock/overflow faults and over-budget callbacks, with no
epoch gaps or evictions and witnessed native quiescence:

| Epoch | Callbacks | p99.9 interval ns (lower exclusive, upper inclusive) | Maximum ns |
| --- | ---: | ---: | ---: |
| 1 | 334 | (3,922,343, 4,096,000] | 3,968,024 |
| 2 | 6503 | (4,466,720, 4,664,478] | 5,013,437 |
| 3 | 1536 | (4,664,478, 4,870,992] | 4,719,337 |
| 4 | 1601 | (4,277,345, 4,466,720] | 4,426,820 |

The final finite capture is 2,482,688 frames / 51.722667s, both channel peaks
0.131493613 and SHA256
`ff88b82a146ad4b9f4180cf9be29fed2a2e0deb0fb092a4957afcb874e92b843`.
Raw verification confirms every sample finite. Final resource observations are
125 samples / 124.003s. App CPU p50/p95/max is 105.85/127.10/145.02% of one core;
PSS first/last/max 486910/492992/615643 KiB (+6082 KiB), maximum 129 threads/226
FDs. Sampler/capture CPU is 28.01/33.01/81.90%; server 0/1.01/2.02%. Identity-gap
sample counts are 7/9/1; each group has one process-enumeration gap. One observed
zombie pw-cat has unavailable RSS/PSS, retained as two unavailable fields; no
unavailable process records are reported. Maximum app/sampler/server cadences
are 1.012/1.016/1.019s, collection durations 0.047/0.034/0.030s, missed cadences 0.
These explicitly incomplete process-discovery observations do not establish
steady-state resource growth. The final report, raw epochs/resources, executed
harness and `scenes-verified.json` remain under `native-scenes-2`.

## Self-Review And Handoff

Self-review checks the design's one-transaction ingress, member masks, stopped
winner provenance, optional rollback, identity/reuse and whole-frame fault
behavior against the final source and retained regressions. Production native
sources remain identical to the measured proposal. Scene IPC/UI use only the
prepared row, capability and authenticated identities. No history, schema,
work ceiling or driver policy changed. The narrow pointer-harness prerequisite
is included for independent review; it does not claim to fix the unidentified
launch or remote Undo causes. Final Python syntax checks and `git diff --check`
pass. The full tests are not rerun solely for subsequent report or harness-only
changes; the final actual harness paths have their own passing evidence.

The final source manifest, copied harness equality and release artifact hashes
are retained in `final-source-manifest.json`. Parent owns acceptance, retained
experiment publication, the independent review and Task 15 qualification.

## Warnings And Limits

Existing compiler warnings: Rust's typed `write` declaration at `audio.rs:420`
uses `*const u8` versus the standard symbol's `*const c_void`; release builds
also report unused `QuitSession::reserve_native` at `document_windows.rs:47`.
These are not introduced by scenes.
The Impeccable detector ran once (`ui-detector.json`) and reported incumbent
literal palette/font/compact heading findings; no scene palette/font redesign
was performed. The actual scene screenshot review is recorded above. Private
Xvfb logs include expected unavailable Wayland portal/DRI3 warnings; these do not
establish physical-device behavior.

Typed app-owned callback guards do not cover pinned CPAL owned error-payload
allocation/free. Measured callback processing excludes the separately documented
final clock/publication tail. Finite software captures cannot establish physical
underruns, scheduling lateness, universal backend realtime behavior or long-run
resource stability. No 1800-second soak, persistent audio/settings change,
publishing or cloud session is part of this task.
