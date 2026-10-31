# Task 7: Ordered Native Chains

## Scope And Implementation

Native-only implementation on the reviewed Task 6 foundation (`cbe310a`), with
parent-owned documentation checkpoints through `f89ccb9`. No Rust session
migration, Rust ABI mirrors, persistence, chain UI, pool expansion or GUI harness
work is included. The task owner explicitly assigns Rust mirrors to Task 8.

One `ultra::AliveSession` now stores the v2 device table and chains. Checked v1
normalization maps the old tracks/events into instrument devices in that same
runtime. All v1 C layouts, enums and symbols remain unchanged. Existing direct
C++ methods and the entire original `alive_session_test.cpp` are preserved.
Legacy graph admission retains the original multiple-stereo-sink behavior;
legacy config-only admission still ignores old reserved fields and delegates
note-entry checks to graph admission. V1 base edits map through the instrument's
root handle. V1 state projects a single v2 publication, with instrument parameters
and track meters/mixer/voice counts, rather than publishing another state store.

V2 admission checks exact headers, bounded counts, flags/reserved fields,
independent roots, one owner per device, valid instrument/effect chain kinds,
track-owned event targets, native parameter constraints, density and loop seams.
Two tracks have one instrument and zero through two effects each. The existing
16 roots, 32 legacy voice banks, 16 parameters/device, 128 note pairs/track,
16 automated parameters and 256 automation points/track, 1024 scheduled events,
32 events/frame, 64 events/1024-frame window and 64 queued commands are retained.
The independent Stop epoch mailbox and command-head snapshot ordering remain.

Base and bypass ingress resolves `(document, revision)` against a fixed
16-entry ownership map before enqueue, then queues the resolved device index.
Stale/unowned handles and native parameter constraint violations reject before
application. Configuration/reset require stopped device I/O through the C ABI.
Graph replacement/close and ordinary canvas parameter/message ingress cannot
bypass hosted ownership for effects or instruments.

The callback applies schedule controls, computes the existing legacy engine
sample, renders instruments then effects in authored chain order, and sums each
post-mixer endpoint once. Hosted roots are skipped in the ordinary Ultra root
loop. Every root defers sampled notifications until both hosted and ordinary
signal evaluation finish. The ordinary Ultra route remains intact. There is no
new buffer, engine, alignment delay or clock; existing absolute frame advancement
continues once per sample. Native AOT Faust effects run alongside the existing
guest engine.

Bypass selects the same-frame dry pair after computing the wet pair, so wet
state continues advancing. Mute/solo suppress only the endpoint. Note-off permits
filter ringing. Stop, seek, loop seam, transport end, removal and replacement
clear active and bypassed state using the existing bounded runtime reset and
kernel clear. Chase initializes bounded device/parameter candidates, scans the
schedule once and applies the resulting values, rather than rescanning it per
parameter. No callback graph compilation, loading, destruction, allocation,
freeing or blocking lock was introduced.

## Frozen Public Native Interface

`apps/ultra/src-tauri/native/alive_session.h` appends the exact separate v2
records/constants and these seven entry points:

- `alive_session_validate_v2(config)`
- `alive_session_validate_device_v2(device, graph)`
- `alive_session_validate_prepared_v2(config, graphs, count)`
- `alive_session_configure_v2(config)`
- `alive_session_base_v2(document, revision, parameter, value)`
- `alive_session_bypass_v2(document, revision, bypassed)`
- `alive_session_state_v2(state)`

Transport/reset/seek/mixer/error use the existing shared functions. Config and
state require version 2 and their exact `struct_bytes`. Device indices and chain
order are independent of root handles. The C++ runtime exposes the corresponding
v2 validation/configuration/base/bypass/snapshot/render methods alongside the
old adapters. Initial unconfigured state also publishes valid v2 headers.

C++ static assertions confirm the frozen sizes on 64-bit targets:

| Record | Bytes |
| --- | ---: |
| AliveSessionParameter | 40 |
| AliveSessionDeviceV2 | 696 |
| AliveSessionTrackV2 | 32 |
| AliveSessionEventV2 | 32 |
| AliveSessionConfigV2 | 37064 |
| AliveSessionTrackStateV2 | 40 |
| AliveSessionDeviceStateV2 | 344 |
| AliveSessionStateV2 | 2216 |

The assertions are conditional on 64-bit pointers, rather than imposing guessed
alignment on other platforms. A dynamic-symbol comparison against the installed
Task 6 library preserved all 12 v1 session symbols and added exactly the seven
v2 names above.

### Confirmed Audio Input Policy

Self-review raised an extra admission restriction that was absent from the
frozen design. The task owner's explicit ruling is now implemented: the declared
effect input authenticates its bound node and one stereo per-instance bundle.
Additional audio.in~ readers may read that same bundle. Incidental readers in an
instrument receive zero external input. They introduce no independent bus,
physical capture or cross-instance audio. Descriptor kind/input/layout/bound-node
checks remain strict. The regression routes an additional effect reader to the
right output and incidental readers in both instruments to real output sinks;
its samples match the original single-chain reference exactly.

## TDD Evidence

Tests were added before the corresponding production changes. Initial v2 tests
could not compile against Task 6 because the separate API did not exist. Later
focused iterations caught and fixed two interface regressions and the clarified
input policy with actual failing assertions.

The focused compile command is the same static backend/core compilation used by
`tests/ci/check-native.sh` for `alive_session_v2_test.cpp`: C++17, `-O2 -Wall
-Wextra -Werror -pthread`, the existing core bundle, `-ldl -lrt`, and linker wraps
for malloc/calloc/realloc/free/pthread_mutex_lock.

| Iteration | RED | GREEN |
| --- | --- | --- |
| Initial v2 ABI/chain tests | Compile exits 1: `AliveSessionDeviceV2` and other v2 records/functions are not declared. `/tmp/alive-task7-red.log`. | Focused v2 executable passes actual authored order, bypass/warm state, partitions, ownership, resets, admission and guards. |
| V1 config admission | Runtime assertion `alive_session_validate(&c)` fails for the formerly admitted config with note-node zero. `/tmp/alive-task7-legacy-red.log`. | Private legacy policy restores old config admission; original graph/prepared semantics and unchanged v1 tests pass. |
| Initial state headers | Runtime assertion checks initial state version/size/configuration and fails. `/tmp/alive-task7-snapshot-red.log`. | Constructor initializes the one publication before any configuration; initial and subsequent snapshots pass. |
| Extra AudioIn readers | Runtime assertion `alive_session_validate_device_v2(&c.devices[0],&utility)` fails. `/tmp/alive-task7-readers-red.log`. | Extra-reader admission and actual output/isolation regression pass after removing the unapproved exclusion. |

The final focused regression also covers v1 base/snapshot adapters during a v2
configuration with instrument indices 2/5 and roots deliberately unrelated to
both table and chain order. Its final log is
`/tmp/alive-task7-focused-final-green.log`.

## Behavior Covered

- Actual impulse at frame 0, note-off plus Utility gain-zero automation at frame
  1: Utility then Lowpass retains a tail; reverse order suppresses it.
- Exact sample vectors over 1/31/63/64/127/1024-frame partitions, both orders;
  zero/one/two-effect chains; endpoint sum, post-mixer/master peaks.
- Exact dry bypass at frame 0 and wet resumption matching a continuously wet
  reference; mute and solo warm resumption; independent silent second instance.
- Instrument/effect base ownership, automation hold and Stop release to base;
  v1 projection/adapters; stale/wrong-root handles; hosted canvas edit/replace/
  close rejection; queue saturation and out-of-band Stop despite overload.
- All six termination kinds with both active and bypassed effects, ordinary
  note-off tail, prospective rejection preserving the configured session.
- Wrong ABI headers, reserved/flag fields, counts, duplicate/unowned/cross-track
  devices, incompatible chain/input/bound-node types, named/legacy restrictions,
  note/sustain targeting, note/lane/point limits, density and repeated loop seams.
- Existing v1 suite and callback allocation/free/mutex wrappers remain unchanged.

## Verification And Measurements

- Native object compilation uses the generated CMake backend object target.
  The generated native link command writes a new sibling temporary `.so`; Python
  `os.replace` publishes it atomically. The final build-library inode changes
  from 6797876 to 6798033; no mapped inode is overwritten. The installed release
  library remains owned by the parent's application build workflow.
- `cmake --build apps/ultra/build --target ultra-diagnostic --parallel 2` passes
  after atomic publication. `/tmp/alive-task7-native-final-build.log`.
- First complete native gate passes, including all unchanged v1 tests, actual
  ordinary Ultra/backends, callback guards and 42-cycle Stop stress.
  `/tmp/alive-task7-native.log`. It is repeated after the clarified reader policy.
- `uv run --no-project --with jsonschema bash
  apps/ultra/tests/ci/check-contracts.sh` exits 0. Primary Node suite: 447 passed,
  0 failed, plus all existing reference/schema/Python/portable native gates.
  `/tmp/alive-task7-contracts.log`.

The measurement fixture has all six devices, the full 1024-event schedule,
128 note pairs and 256 automation points per track, and exactly 64 events in
any repeated 1024-frame window. Each timing averages 100 callback invocations
under the callback wrappers. Seek targets frame 16380 so chase scans the full
schedule. The seek figure includes control enqueue and one rendered frame;
it measures that combined path, not isolated kernel-clear time.
Final native gate (`bash apps/ultra/tests/ci/check-native.sh`) exits 0 after the
reader-policy amendment, including the unchanged v1 suite and Stop stress.
`/tmp/alive-task7-native-final.log` records mean 1052.424 us for the dense
1024-frame callback and 32.308 us for seek plus one frame. A final separately
compiled focused run, including v1 adapters during the v2 table permutation,
also exits 0; see `/tmp/alive-task7-focused-final-green.log`.

No hardware audio, physical MIDI, GUI, concurrency-scheduler guarantee or realtime
deadline claim is added. Full existing CanvasRuntime reset semantics are retained;
its measured cost must inform later track expansion and short-buffer policy.

## Files And Self-Review

- `apps/ultra/src-tauri/native/alive_session.h`: appended separate C ABI.
- `apps/ultra/src-tauri/native/alive_session.hpp`: one normalized evaluator,
  ownership, validation, queue commands, chain rendering and publication.
- `apps/ultra/src-tauri/native/backend.cpp`: v2 ingress and endpoint integration.
- `apps/ultra/tests/alive_session_v2_test.cpp`: new actual-backend regressions,
  layout/root-budget assertions, callback wrappers and measurements.
- `apps/ultra/tests/ci/check-native.sh`: execute v2 suite in the existing gate.
- `.superpowers/sdd/PLAN/task-7-report.md`: this evidence and public contract.

Self-review found and resolved the legacy config admission, initial state-header
and extra-reader issues recorded above. No remaining known functional issue.
No parent-owned PLAN/progress/documentation changes are staged. Contracts
regenerated the historical arithmetic native-build.json receipt; it remains
unstaged and is not part of this checkpoint.

## Review Fix Round 1: Shared Graph Admission

Independent scoped review found duplicated graph-profile and parameter-binding
validation in the v1 and v2 paths. This was a structure/maintenance finding;
the reviewer found no functional rendering defect. The amendment replaces both
implementations with one private `validate_graph_common` helper and explicit
private `GraphAdmission::{LegacyV1,DeviceV2}` policy.

The v1 public graph method adapts the old track into an instrument descriptor
and invokes that helper under the legacy policy. It retains the original
standalone graph checks, their ordering and their messages. In particular it
does not acquire v2 document, flag, reserved-field or declared-range checks.
Under the v2 policy, the helper retains strict descriptor validation before
graph compilation.
Compilation/revision, entry-node kind, Voice/Send/Receive exclusions, stereo
sinks, structural numeric exclusions and native base compatibility now have one
implementation. Multiple stereo sinks and the confirmed AudioIn-reader policy
remain admitted. No callback/ABI/rendering code or test assertions changed.

This is a behavior-preserving off-callback extraction covered by the existing
contract tests, rather than a new behavioral fix with a claimed runtime RED.
Both focused executables were compiled afresh from the amended header/backend
with exactly the existing static-core and callback wrapper settings:

```sh
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE apps/ultra/tests/alive_session_test.cpp apps/ultra/src-tauri/native/backend.cpp apps/ultra/build/core/libultra_core_bundle.a -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock -ldl -lrt -o /tmp/alive-task7-fix1-v1
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread apps/ultra/tests/alive_session_v2_test.cpp apps/ultra/src-tauri/native/backend.cpp apps/ultra/build/core/libultra_core_bundle.a -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock -ldl -lrt -o /tmp/alive-task7-fix1-v2
/tmp/alive-task7-fix1-v1 > /tmp/alive-task7-fix1-v1.log 2>&1
/tmp/alive-task7-fix1-v2 > /tmp/alive-task7-fix1-v2.log 2>&1
git diff --check
```

Both compiler commands exit 0 without diagnostics. Both test commands exit 0;
complete output is:

```text
placement input=0 native=0 legacy=64 host_alignment=0
placement input=1 native=1 legacy=65 host_alignment=0
placement input=31 native=31 legacy=95 host_alignment=0
placement input=63 native=63 legacy=127 host_alignment=0
placement input=64 native=64 legacy=128 host_alignment=0
placement input=127 native=127 legacy=191 host_alignment=0
PASS: Alive exact frames, partitions, ownership, overload Stop, seek, loop, isolation, mono join, mixer and callback guard
six-device dense 1024-frame callback mean_us=1052.995; six-device seek+one-frame mean_us=33.488 (wall clock, no deadline claim)
PASS: v2 ordered chains, exact bypass/warm state, partitions, ownership, resets, admission, overload and callback guard
```

`git diff --check` exits 0 with no output. Self-review confirms that the helper
is private, all shared profile/binding checks occur once, v1 standalone admission
uses its legacy policy, and v2 descriptor validation still precedes graph
validation. The existing original v1 suite and new v2 suite are unchanged.
No native library replacement/build or broad native/contracts rerun was needed
for this scoped helper extraction. Files changed in this fix are only
`apps/ultra/src-tauri/native/alive_session.hpp` and this report. The two minor
coverage suggestions remain assigned to Task 8 by the task owner.
