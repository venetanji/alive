# Task 11 Native Clip Bank Checkpoint

Baseline: `d1f8a6659730abe54b9037434a55c3ce92ce34a8`.
Scope: Task 11 brief, fixed interface design and preflight interpretations.
Implementation worker: `native_clip_runtime`. No desktop/GUI integration,
service/settings changes, release, push, eight-track admission or atomic scenes.

## Implementation

- Appended the exact fixed v3 C declarations and matching Rust `repr(C)` POD
  declarations. The eleven size fixtures and important offsets match the
  frozen interface (ConfigV3 47232 bytes, StateV3 16592 bytes).
- Kept one AliveSession, native clock, command queue, Stop mailbox, render
  path, ownership path and coherent publication. Internal storage expands to
  8 tracks/16 devices/32 clips; the only admitted profile is 2/6/8. Existing
  v1/v2 definitions and validation semantics remain separate and unchanged.
- Added stopped preparation, structural/ownership/graph/value validation,
  cyclic weighted envelopes, per-track segment DP, native bar quantization,
  track-local cursors and coalesced clear/chase/landing-event dispatch.
- Added preparation/request identities, bounded last-128 receipt slots,
  serialized producer reservations and callback-owned results. Invalid output
  headers do not write/enqueue. Null requests with valid output return a
  rejected BAD_HEADER receipt. Legacy identity-free start/seek reject in v3.
- Added scheduled/optional absolute-frame ledgers, a combined command reducer,
  first-frame checks and every-overlap future-envelope checks. Accepted live
  base/bypass/mixer commands still execute when optional changes are refused.
  Quantized-only actions and already-playing START avoid unnecessary horizon
  refusal. Stop has independent emergency capacity and preserves the existing
  acquired-head-before-epoch race ordering.
- Full native reset/clear semantics remain. Track switch/stop/wrap clears only
  that track, strict-prefix chase never retriggers old notes, and landing events
  dispatch once. Nonloop cleanup is visible at the exact end boundary. A
  forced invariant fault cancels a due launch before dispatch and clears all
  sound. Stop epochs saturate rather than wrap; exhausted transport identities
  require host restart.

The registered graph family, exact work ceilings, derivation and reproduction
commands are in `apps/ultra/src-tauri/native/alive_session_v3_policy.md`.
Profile 8x4 reports known structural limits with `features=0`; multi-bit actions
return FEATURE_DISABLED. Roots remain 16; event storage/frame/window limits
remain 1024/32/64; the queue snapshot remains 64.

## Red/Green Evidence

Local logs are under `/tmp`; they are evidence from this workspace, not
portable committed artifacts. The test sources and commands are committed.

| Check | Observed red | Corrected check |
| --- | --- | --- |
| C layout | `alive-task11-layout-red.log`: missing v3 declarations | compiled eleven sizes/important offsets |
| Cyclic/segment oracle | `alive-task11-envelope-red.log`: missing helper | exhaustive tiny weighted/duplicate periods and every horizon |
| v3 runtime entry points | `alive-task11-v3-red.log`: missing ABI symbols | native focused/CI runtime suite |
| Rust layout | `alive-task11-rust-layout-red.log`: missing v3 types | `native_v3_layout_matches_fixed_c_interface` |
| Exact nonloop end | `alive-task11-v3-edges-red.log` | end cleanup published at the boundary |
| Dependent START batch | `alive-task11-dependent-start-red.log` | both dependent STARTs reject if the combined discontinuity fails |
| Equal-priority order | `alive-task11-event-ties-release-red.log` | authored note-off precedes same-key sustain after sort |
| Null-request receipt | `alive-task11-abi-edges-red.log` | valid output receives BAD_HEADER; reset clears old metadata |
| Frame diagnostic contributions | `alive-task11-diagnostic-red.log` | 40/frame reports 20+20, not window contributions |
| Receipt-mask partition | `alive-task11-receipt-masks-red.log` | each transition clears previous masks; all observed masks remain disjoint and cover the request |
| Shared cursor/chase scan | `alive-task11-shared-scan-red.log` | a 1024-event seek now performs exactly 1024 reconstruction reads for its 1024-scan charge |
| Work policy candidate | `alive-task11-measure/nonloop-policy-red.log` | registered frame bound includes the conservative nonloop end pulse |

The first equal-priority test inspected active voices too soon: native release
has a minimum 1 ms tail. The corrected test renders 64 frames, still failed
with the old comparator, and passes with authored-order tie breaking. Another
test initially expected exactly 64 events split between frames 0 and 1023 to
reject; that expectation was wrong for the two-fragment proof. The corrected
boundary test accepts 64 and rejects a 65th event without shifting its times.

Initial Rust attempts without ULTRA_NATIVE_LIB_DIR/LD_LIBRARY_PATH failed in
build.rs or the dynamic loader; these were environment failures, not passing
layout runs. The focused Rust layout run with both variables passed (1 passed,
180 filtered). A late timing-probe compile caught `_IOL` instead of `_IOLBF`;
that test-only typo was corrected before timing execution.

## Verification Commands

The final native build and complete native gate passed after the shared-scan
correction, including original v1/v2 tests and the original dynamic-library
Stop stress (42 edit and 42 baseline cycles, 43008 identical float samples).
The contract suite passed in the isolated uv environment. Release Rust passed
with Ultra 179 passed/2 ignored and Alive 1 passed. The two existing ignored
Ultra tests require the private software PipeWire graph and the user's licensed
local installation respectively; neither is a Task 11 unit-test failure.
The Rust suites were rerun against the final rebuilt library. `git diff --check`
also passed. Logs:

- `/tmp/alive-task11-final-native-build.log`
- `/tmp/alive-task11-final-native.log`
- `/tmp/alive-task11-final-contracts-env.log`
- `/tmp/alive-task11-final-rust-ultra.log`
- `/tmp/alive-task11-final-rust-alive.log`
- `/tmp/alive-task11-shared-scan-green.log`

```sh
bash apps/ultra/build.sh --native-only
bash apps/ultra/tests/ci/check-native.sh
uv run --no-project --with jsonschema bash apps/ultra/tests/ci/check-contracts.sh
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
  cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
  cargo test --manifest-path apps/alive/src-tauri/Cargo.toml \
  --target-dir "$PWD/apps/ultra/src-tauri/target" --release --locked
git diff --check
```

The normal contract command ran first and stopped at its explicit missing
`jsonschema` requirement. The isolated uv rerun supplies that dependency without
changing system packages. GUI/app-entrypoint tests are intentionally owned by
the parent and were not run by this worker.

The native CI gate now also builds/runs:

- `alive_session_v3_layout_test.cpp`;
- `alive_session_envelope_test.cpp`;
- `alive_session_v3_test.cpp` with callback allocation/free/mutex guards;
- `alive_session_v3_measure.cpp --verify`, using generated exact saved graphs,
  graph-control isolation, maximal preparation, local effect-chain isolation,
  and saved/maximal empty/populated/dense fixtures.

## Behavioral Coverage

The runtime suite checks invalid counts/profile/slot ownership/masks/lengths,
graph-control restrictions, failed configuration preserving the working
preparation, 32/33 and 64/65 event boundaries, a 40-event native frame refusal,
unsafe unselected clips, invalid seam offsets, prime clip periods, scalar and
mixed 1/31/63/64/127/1024 partitions, partial-bar/global-seam launch timing,
strict-prefix chase, empty owned lanes, ownership release/base recovery,
stopped selection, track stop, exact nonloop end/cancellation, stale identities,
queue saturation, receipt busy/reuse, supersession, dependent command batches,
repeated seeks with a dense future suffix, Stop with exhausted optional credits,
and the pre/post-Stop queue-head race. Every returned nonempty callback receipt
is checked for disjoint masks covering its requested track mask.

An additional exact saved-graph comparison solos the unaffected second track,
keeps one effect bypassed and the other active, and compares all 50000 output
samples across no action, first-track launch and first-track stop at native
bar 48000 under different partitions. The unaffected chain remains identical;
the test also proves it is non-silent and retains all four voices.

The pure oracle enumerates all masks for periods 1..7 with weighted duplicates
and compares every width 0..1024 to separately expanded scalar streams. It
enumerates concrete clip/phase pairs and every two-segment cut at every real
horizon, plus exhaustive small three-segment trajectories and the empty
188-frame reset pulse. The production code never expands an LCM/repeated
timeline, and keeps only two segment-DP rows at a time. Arithmetic stays far
below uint64 capacity under validated profile/event/parameter bounds.

The saved-graph check verifies that authored-on and already-running demo timers
are cleared by preparation/reset; repeated allowed parameter writes cannot
reactivate them. It rejects hosted editor events/hot parameters, a v2-valid
Toggle parameter binding and a v2-valid Snapshot-to-Toggle route. Thus the
dormant demo controls in the saved instrument cannot bypass scheduled event
accounting. See the policy document for the source-level activation argument.

## Measurements

Provenance: AMD Ryzen 9 5900HS, Linux 7.2.8-10-omarchy, GCC 16.2.1, 48 kHz,
static C++17 `-O2`, actual current core/Faust bundle. The generated header
records hashes of the three saved JSON files. Each timing row has 1200 samples.
Test-only work tracing and callback allocation/free/mutex wrappers are enabled;
these are guarded offline timing distributions, not uninstrumented driver
deadlines or a physical one-frame support claim.

The combined synthetic policy case adds all registered scheduled/optional/
emergency window ceilings to a real rendering/control/horizon/publication
callback: 126 full root resets, 3904 parameter writes, 19456 scalar event reads,
64 extra note dispatches, 63 accepted base edits and a seek/horizon check.
This intentionally overcounts work already done by the real callback. Scalar
scan reads are not claimed to be an exact worst-case chase branch benchmark;
the dense fixture separately exercises actual chase/rejection paths.

The final-source measurement passed all callback guards, actual-read-vs-charge
assertions, fixture checks and runtime fault checks. Log:
`/tmp/alive-task11-measure/final-policy-traced.log`. The exact compiler/link
commands are in the policy document; the final invocation was
`/tmp/alive-task11-measure/probe > /tmp/alive-task11-measure/final-policy-traced.log 2>&1`.

| Combined policy frames | Mean us | p99 us | p99.9 us | Max us | Buffer us |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | 997.917 | 1148.940 | 1214.745 | 1232.879 | 1333.333 |
| 128 | 1218.868 | 1392.039 | 1423.529 | 1468.374 | 2666.667 |
| 256 | 1646.145 | 1792.325 | 1829.705 | 1832.692 | 5333.333 |
| 1024 | 4224.133 | 4348.743 | 4419.407 | 4431.871 | 21333.333 |

Representative maximal graph rows (1200 callbacks each):

| Case | Frames | Mean us | p99.9 us | Max us |
| --- | ---: | ---: | ---: | ---: |
| Short empty loop | 1024 | 3247.340 | 3371.950 | 3411.475 |
| Short populated loop | 1024 | 3511.609 | 3790.821 | 4447.902 |
| Dense controls/chase | 1024 | 3117.309 | 3293.361 | 3424.068 |
| Full queue then Stop | 64 | 201.003 | 233.260 | 235.054 |
| Maximum active voice edges | 1024 | 3612.129 | 3781.964 | 4045.852 |

The dense case reaches the optional maxima of 6 roots, 1024 scans, 192 writes
and 9252 guard comparisons; direct tracing observes 1024 reconstruction reads
and 18 preview reads. The Stop case reaches 6 emergency roots/96 writes and
64 accepted live base writes. The 188-frame populated case reaches 36 scheduled
root clears, 24 events/scans and 1152 writes in one 1024-frame callback; the
empty case still resets 36 roots and writes 1152 values despite zero events.
The synthetic case independently includes the larger full registered ceilings,
including the two-clear emergency reserve. Maximum-profile preparation takes
17.520 ms (8 clips/1024 events/6 roots/96 parameters; test bound 5000 ms).

An earlier traced run had a 64-frame maximum of 3.017 ms, exceeding its
1.333 ms buffer; the final run does not erase that observation. Practical
evidence is restricted to 256-frame-and-larger buffers on this host, with no
eight-track or universal scheduler guarantee. The optional 50% p99.9 target
remains advisory.

## Self-Review And Limits

Self-review corrected equal-key sorting, exact nonloop cleanup, a dependent
START group, due track-stop first-frame work, null-request/output handling,
reset metadata, receipt-mask transitions, frame diagnostics, double queue-full
rejection accounting, fault-time receipt publication, and duplicate landing
cursor/chase reconstruction. Forced invariant
fault injection is test-only and absent from the shipping build.

The shared-scan trace checks accepted maximum-range seek, repeated rejected
seek and effective START, local wrap, coalesced launch/wrap, an empty owned
lane, partial-bar global seam and empty-clip wrap. Scheduled reads are charged
before reconstruction; optional reads were already reserved at admission.
Rejected optional batches perform no new reconstruction. The separately traced
first-candidate preview is measured fixed control overhead bounded by 56 reads
per callback; it is not mislabeled as a reset scan or omitted on rejection.
Every saved/maximal measurement callback also asserts actual reconstruction
reads do not exceed its scheduled/optional/emergency scan charges and previews
stay within that fixed bound.

The callback owns no heap scratch or second publication. Candidate/ledger/DP
tables are bounded members or stopped preparation scratch; publication copies
word-by-word without a 16 KiB callback stack temporary. Producer reservation
reuse requires a coherent matching terminal receipt; stale publications cannot
release a new unconsumed reservation. Exact masks and headers are checked in
tests. v1/v2 normalization retains its own timeline, chase and length policies;
larger v3 states fail the legacy projection before writing any caller byte.

Compiled storage receipt (`/tmp/alive-task11-storage.log`): AliveSession 799408
bytes, including 573952 bytes for sixteen existing-shape CanvasPlans; the
remainder is 225456 bytes. Prepared envelopes/bars/reset charges use 41848
bytes, the two ledgers together 82080 bytes, and StateV3 16592 bytes. The shared
chase candidates are fixed members, not callback stack or heap allocation.

Residual scope: not every legal graph topology is exhaustively timed; the
finite kernel/node/edge profile and conservative synthetic stress supply the
initial measured gate. No hardware JACK/xrun/loopback claim, GUI claim, Task 12
saved-format integration, eight-track admission, atomic scene or final 30-minute
app soak is included. Independent code review remains the parent's next gate.
