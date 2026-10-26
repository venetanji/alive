# Task 2B implementation report

Status: DONE_WITH_CONCERNS (bounded native slice implemented and verified; the
provisional gate and the explicitly deferred full-policy work remain mandatory
review/integration constraints).

Source base: `9bf3180665c7beae86ba8e8e72b40c84e7397a2e`.
Source/index frozen: `d7f8490a783762a7c864f07957e12fce045b4b5d`.

Commits:

- `db4a934` — feat(session): declare additive workspace v4 C and Rust ABI
- `d7f8490` — feat(session): prove bounded native MIDI Arrangement on shared scheduler

The source/index freeze was sent to the controller before this report. Subsequent
writes are this report and `/tmp/alive-workspaces-task2b` evidence only. Parent
PLAN/evidence changes are expected and were not staged or changed by this agent.

## Implemented

The complete additive C ABI is in `alive_session_workspaces.h`, included inside
the existing C linkage block at the end of `alive_session.h`. Rust `repr(C)`
mirrors and defaults are in `session/native_v4.rs`, re-exported by `native.rs`.
The independent C and Rust assertions cover all fourteen sizes, alignments and
significant offsets from contract section 4. Existing v3 C layout tests and
`session/tests.rs` were not edited. Defaults distinguish zero unused config
records from standalone active MIDI track/source defaults, and set the required
NONE/NO_FRAME sentinels in state/receipt records.

All eight requested exports are implemented beside v3 in backend.cpp:
`limits_v4`, `validate_v4`, `validate_prepared_v4`, `configure_v4`, `request_v4`,
`stop_v4`, `state_v4`, and `diagnostic_v4` (each prefixed `alive_session_`).
`configure_v4` retains the stopped-device-I/O refusal. Stop delegates to the
existing global mailbox. Base/bypass retain document/revision authentication;
track mixer and reset retain their existing owners.

An explicit Legacy/Clips/Workspaces mode now controls one AliveSession owner.
There is no second queue, clock, serial allocator, receipt owner, hosted-root
registry, audio loop, or copied clip scheduler. Request ingress converts checked
wire records into a small internal command record rather than casting v4 to v3.
The common request reducer handles admitted v4 START, while v3 retains its
existing launch/Stop/seek reduction. Applied occurrence state is updated only
after candidate acceptance.

The measured graph predicate is extracted as a DeviceV2 + bounded event span +
graph function with a caller diagnostic adapter. Its original whitelist, kernel
counts, parameter checks and ordering are preserved. No v3 clip bank is built
for v4 graph admission. Actual installed saved subtractive/utility/filter graphs
are rendered through the unchanged backend order: sample, native/Faust graph
work, render_sample, advance, coherent publication.

Shared chase and stepping use a borrowed source descriptor and chain-member
accessor. V3 keeps its strict-prefix automation chase; v4 adds fixed held-pitch
scratch and at most four synthetic note-ons in the same bounded dispatch batch.
A single reserved source scan handles prefix reconstruction and due-frame note
exclusions. Automation is restored before ordered dispatch. Arrangement entry
uses binary search on discontinuity and an endpoint cursor during playback;
occurrence identity distinguishes adjacent placements of the same source.
Full-chain resets keep effect output out of gaps and after cutoffs.

The finite, no-loop admission proof sorts at most 4144 bounded control-side
pulses, checks the six-forced-boundaries cap before width work, and scans widths
1..1024 without walking song frames. It accounts for starts/cutoffs, ordinary
source-local events, conservative offset chase, complete reset/prefix/parameter
cost, and four additional possible resume dispatches. Source events remain in
the original stored pool. The existing five-resource ledgers and all original
ceilings remain unchanged; separate bounded placement ledgers charge lookup and
2050 extra horizon comparisons. No PCM samples are read or pointers adopted.

Atomic publication now has maximum-sized backing but publishes exactly one
active payload: 16592 bytes for v3 or 16736 bytes for v4. Snapshot mode checks
come from the coherent header. Receipt reservation reads only coherent scalar
identity/status fields using version-selected state offsets, receipt strides
and receipt field offsets; v3 receipts start at 6352 and v4 at 6496. It never
copies a v3 state over a v4 payload. Old state output canaries remain untouched
when v4 is installed; old Start/Seek/base cannot bypass v4 mode identity.

## Admission boundary

Both normal and provisional builds return zero v4 feature bits for profiles 1
and 2. The normal library rejects configure/request admission transactionally.
`ULTRA_ALIVE_SESSION_V4_PROVISIONAL` is defined only for the dedicated test
executable and separately compiled backend object in `check-native.sh`. It
changes configure/request admission; validators, scheduler and work checks are
shared source. No environment activation, desktop toggle, CMake option, alternate
renderer, release binary or launcher change was added.

The admitted test subset is one profile-1 MIDI track/source, one to eight sorted
nonoverlapping placements, one instrument and up to two existing effects,
without looping, Session slots or audio. START/resume, reserved Stop, natural
end, reset, authenticated base/bypass and mixer work. SEEK and TRACK_ACTIONS
remain FEATURE_DISABLED when structurally valid. Unsupported loops, Session,
additional tracks/sources and audio remain unadmitted; malformed bounded MIDI
configurations receive field/source/placement/ownership/work diagnostics.

## TDD evidence

Evidence directory: `/tmp/alive-workspaces-task2b`.
Full exact compile/link commands are recorded in `commands.txt`; exit statuses
and complete source identities are in `exit-statuses.json`.

- C layout RED: compiling `alive_session_v4_layout_test.cpp` before the ABI
  declaration fails with missing AliveSessionTrackV4 and other v4 declarations;
  exit 1, `layout-red.log`. GREEN: all specified assertions pass,
  `final-layout.log`, exit 0.
- Shipping admission RED: linking the new v4 shipping test before wrappers fails
  on absent v4 symbols; exit 1, `shipping-red.log`. GREEN: the real normal shared
  library validates a known prospective saved-device subset, returns zero bits,
  rejects v4 admission against playing v3, preserves revision/position/receipts,
  and preserves malformed-output canaries; `final-shipping.log`, exit 0.
- Real MIDI RED: the first guarded saved-device test aborts at validation because
  native note-off kind 0 was mistakenly rejected; `runtime-red.log`, exit 134.
  The validator was corrected and the actual provisional configure/audio path
  implemented. GREEN: `final-provisional.log`, exit 0.
- Malformed request RED: unknown request kind 99 returned FEATURE_DISABLED rather
  than BAD_FIELD; `malformed-request-red.log`, exit 134. The shared v4 field
  predicate now separates malformed requests from disabled operations. The
  focused green test includes this assertion.
- Unused field RED: an unused device-parameter entry was accepted;
  `unused-fields-red.log`, exit 134. Native validation now rejects nonzero unused
  parameter records. The first broad `native-ci.log` also captures this same
  deliberate red assertion; `final-native-ci.log` is the subsequent complete
  passing run.

The C/Rust layout work and runtime test suite were developed incrementally;
not every later assertion had an independent preimplementation red run. The
specific missing-API and behavioral red/green failures above are retained rather
than representing all tests as independently red first.

## Final verification

All listed final commands returned exit 0:

1. `cmake --build apps/ultra/build --target ultra_native -j2`
   — `final-normal-build.log`; normal library has no provisional definition.
2. `bash apps/ultra/tests/ci/check-native.sh`
   — `final-native-ci.log`; original backend/sequence/canvas checks, native audio
   regressions, v1/v2/v3, C v3/v4 layout, envelope oracle, shipping gate,
   provisional v4, original v3 measurement/capacity/concurrency checks and the
   original Stop/baseline regression all pass. The Stop runs each complete 42
   cycles and the final comparison covers 43008 float samples.
3. The retained provisional backend/test compile commands from `commands.txt`,
   then `/tmp/alive-workspaces-task2b/v4-test`
   — `final-provisional-build.log` and `final-provisional.log`.
4. The retained normal-library shipping and C-layout compile/run commands
   — `final-shipping.log` and `final-layout.log`.
5. `env ULTRA_NATIVE_LIB_DIR=$PWD/apps/ultra/build LD_LIBRARY_PATH=$PWD/apps/ultra/build cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session:: -- --test-threads=1`
   — `final-rust-session.log`; 79 passed, 0 failed. This fresh run follows the
   intentional unused-re-export lint annotation. It preserves the existing
   suspicious runtime `write` symbol warning (not repaired as unrelated work).
6. `git diff --check` — passes.

The v4 native checks compare exact PCM under partitions 1,31,32,63,64,127,128,
256,512,1024 and a mixed original-partition sequence. Dispatches are exactly
512,2012,2512,4096,4572,5072,6072 relative to the render origin. Source index 0 is
reused with occurrence 0 then 1. Bounded audio windows detect genuine output;
first-sample nonzero is not required for Faust attack. Pre-placement, gaps and
post-cutoff samples are exactly zero. The real two-effect chain passes the
same callback allocation/free/mutex wrappers.

Further cases cover held/end-at-O/start-at-O notes, due automation, adjacent
same-source resets, source-end implicit termination, Stop during a note,
queue-full reserved Stop, bounded resume in a gap, natural end, repeated START,
failed config retention, stale preparations/serials and UINT64_MAX serial,
receipt collisions/reuse, overlap/overflow/source-range/five-held-note/forced-
boundary refusals, old mode output canaries, and base/bypass/mixer behavior.
The stop mailbox's saturating CAS itself is unchanged; this suite does not
attempt to execute 2^64 Stops to dynamically reach its exhaustion state.

After source/index freeze an evidence-only copy of the committed test was
written to `/tmp/alive-workspaces-task2b/work-trace.cpp`, connecting the existing
trace callback. Its executable asserts that all seven dispatched records,
including the generated chase, are charged to the scheduled event ledger.
`work-trace.log` reports scheduled events=7, roots=4, scans=16, writes=56,
guard=0; optional guard=9252; placement steps=2070 for the instrument-only case.
The chain case reports its larger actual reset/write counts. This supplemental
harness changes no repository source/index and makes no timing claim.

## Retained artifacts

- `source.sha256`: all changed source/test files at final commit.
- `binaries.sha256`: normal shared library, actual core bundle, provisional
  backend object/test, shipping test, layout test and work-trace executable.
- `fixtures.sha256`: actual saved subtractive, utility and stereo-lowpass files
  and the generated `saved_graphs.hpp`.
- `normal-flags.make`, `commands.txt`: normal build defines and exact dedicated
  provisional compile/link flags.
- `exports.txt`: all eight v4 exports in the normal shared library.
- `exit-statuses.json`: base/head, freeze status and final command exits.
- Red/green logs named above, plus `work-trace.cpp`, `work-trace.sha256` and
  `work-trace.log` for supplemental event/work evidence.

## Scope and remaining concerns

This proves a bounded native MIDI Arrangement slice, not complete Arrangement
support or production v4 admission. Full mixed-authority envelopes and timing
admission are not established. Conservative reset/chase admission can reject
otherwise playable dense input. START immediately after Stop may be rejected
until the unchanged optional rolling work allowance permits reconstruction;
the tests verify preserved occurrence identity on refusal and later success.

Task 2C still owns Session launch/track Stop/Back to Arrangement, mixed
authority, SEEK, suffix/global looping, pending/member receipts and multi-track
behavior. Task 2D still owns full envelopes/measurements, pure-model compilation,
Document adapters, checked ownership conversion/Deref removal, Host/desktop
integration, authenticated editing/history/Apply/save and measured capability
activation. The provisional definition must be removed or replaced with the
ratified admission predicate, and production must be proved to enter this same
scheduler. Task 3 retains PCM validation/preparation, pointer lifetime,
zero-root routing, sample-read accounting and AUDIO admission.

The backend's zero-root predicate is deliberately unchanged because this slice
always installs a real instrument. No UI, Document, host.rs, desktop.rs,
persistence, PCM path, settings, credential, release binary or launcher file
was changed. Existing compiler warnings are retained in raw logs. The native
CI's inherited v2/v3 timing output is not a new v4 deadline or capability claim.

The additional workspaces implementation remains a separate bounded validator,
finite proof and adapters inside AliveSession; `_clips.hpp` and the already
dense `alive_session.hpp` still warrant careful review. In particular the
review should examine wire-mode publication, receipt reservation and optional
admission together, rather than treating ABI and scheduler commits separately.
