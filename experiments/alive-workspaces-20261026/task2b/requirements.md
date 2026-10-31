# Task 2B Implementation Requirements

Read this first. This bounded slice follows approved Task2A model work and
proves one genuine native MIDI Arrangement lane before any desktop activation.
The source-informed brief below and accepted runtime-contract sections 4/6 are
the exact requirements, including values, signatures, operation order and
published offsets. Do not read the whole implementation plan.

Use TDD and one source writer; no subagents. Own only the proposed native ABI,
shared scheduler/backend refactors, Rust mirror, focused tests and CI test
registration named below. Parent owns PLAN/docs/ledger/evidence/PR and may read
sources/logs. Do not alter frontend, active Document, desktop, persistence or
PCM paths. Record any necessary ownership expansion before mutation. Preserve
working legacy modes, every original regression, reserved Stop and allocation/
lock guard. No release operations, deployments, settings or credential changes.

Retain exact source base, red/green logs, compile flags, source/fixture/binary
hashes and partition/guard output in /tmp/alive-workspaces-task2b. Refactor only
shared mechanics proved equivalent by existing fixtures; never copy a scheduler
or silently expand limits. An architectural ambiguity gets a narrow concrete
question/test, not guessed activation or unrelated features.

Commit targeted source/test changes in reviewable steps when stable. Freeze
source/index explicitly before report. Full report path:
.superpowers/sdd/alive-workspaces-20261026/task-2b-report.md. Include commands,
results, refused operations, remaining2C/2D gates, APIs and concerns. Return only
status, commits, one-line test result and report path. Production capability
bits stay zero and the test-only gate must later be reconciled in2D.

# Task 2B: Additive ABI and one native MIDI Arrangement lane

Planning deliverable only, 2026-10-26. No production/test/index changes or builds
were performed. The accepted runtime contract is
`docs/superpowers/specs/2026-10-26-alive-workspaces-runtime-contract.md`, SHA-256
`f7a387978922220434870be8ec95ebc9b8358ea8aa6844d7c24a9166c8f9d8ad`.
Its final schema/ABI and behavior remain binding. The controller's sequencing
ruling keeps ProjectV4 outside active Document and postpones the checked
adapters/Deref removal, Host/desktop integration and capability activation to
2D. This brief narrows implementation coverage without changing the final ABI.

## Deliverable and admission boundary

Implement full additive v4 C/Rust layouts plus a real native-only Arrangement
subset using the existing AliveSession, CanvasWorkspace, Ultra graph evaluator,
command queue, Stop mailbox, receipts and absolute frame clock. Prove one real
MIDI source appearing more than once, gaps, source offsets, held-note and
automation chase, cutoff and partition-independent output. Do not expose a
desktop v4 mode or pretend the complete contract is implemented.

The provisional runtime subset is deliberately exact:

- Profile/work policy 1; one MIDI track, one MIDI source, one to eight sorted
  nonoverlapping placements; one instrument and zero to two existing effects.
- Source and song obey the accepted tempo/length/event/note/lane limits. At
  most 128 notes, 16 enabled lanes, 256 automation events and four simultaneous
  held pitches. Source events are note-on/off or automation; reject sustain
  records because the v4 model has no sustain field in this slice.
- All placement loop flags and the song loop flag are zero. Keep valid loop
  range fields in the ABI even while disabled. All track slots are NONE;
  slot_count and audio_buffer_count are zero. No audio pointers are adopted.
- Native START (including a bounded resume after Stop), reserved global Stop,
  natural end, reset, base/bypass and mixer work. V4 SEEK and TRACK_ACTIONS
  return FEATURE_DISABLED, including in provisional tests. Mid-note entry is
  proved with a nonzero placement source offset, without implementing seek.
- Out-of-subset but structurally valid configurations refuse with
  FEATURE_DISABLED; malformed header, range, ownership or event data receives
  its specific error. No dropping extra tracks, slots, placements or loops.

### Concrete provisional gate

The controller accepts `ULTRA_ALIVE_SESSION_V4_PROVISIONAL` defined only on the
dedicated native test executable and its separately compiled backend object.
It changes only the v4 configure/request feature-admission gate. Both builds
use identical validators, scheduler and work checks. Both return zero v4
feature bits from `alive_session_limits_v4`; no ADMITTED, ARRANGEMENT or AUDIO
bit is temporarily fabricated. No environment variable, desktop toggle,
production CMake option or test-only alternate renderer is added.

Shipping `validate_v4` / `validate_prepared_v4` may validate this bounded
prospective subset; validation success is not capability admission. Shipping
`configure_v4` and `request_v4` refuse FEATURE_DISABLED without adopting config,
roots, cursors, requests or reservations. Exact invalid-output-header canary
behavior still takes precedence. Refusals may update error/diagnostic/rejected
counters; they must not change the installed session or transport.

Compile the normal shared library without the definition. Run layout and
shipping-refusal tests against it, then run the same source validators and
actual audio loop in a static provisional test target with the definition.
This is a narrow test admission exception, not an unmeasured shipping feature.
At 2D remove the exception or replace it with the ratified measured admission
predicate after the complete policies pass; prove that the production build
then reaches exactly the scheduler exercised by these tests.

## Source-informed implementation boundary

Current ownership is concentrated in `native/alive_session.hpp`: `state_`
holds the absolute clock; `commands_[65]`, stop_epoch_, parameter plans and
document_devices_ have one owner. `_clips.hpp` owns the bounded cursor, chase,
candidate, reservations and ledgers inside that same class. In backend.cpp the
actual path is `session.sample`, native graph/Faust evaluation,
`session.render_sample`, `session.advance`, then coherent publication. Preserve
that ordering and use `ultra_external_start/render` for headless proof.

Make these shared changes, in independently reviewable steps:

1. Add the accepted `alive_session_workspaces.h` declarations and
   `session/native_v4.rs` repr(C) mirrors/default headers, re-exported by
   native.rs. Add the eight v4 C wrappers beside the v3 wrappers in backend.cpp.
   Configure retains the current `running || engine.status().ready` refusal.
   V4 Stop calls the existing `session.stop()` mailbox. Do not add a second
   queue, serial allocator, clock or hosted-root registry.
2. Introduce an internal explicit mode discriminator instead of stretching
   `clips_mode_` into several undocumented meanings. Keep v1/v2 legacy and v3
   behavior unchanged. Public old state/request entry points reject an active
   v4 mode with untouched output canaries; old base/start/seek cannot bypass
   the v4 identity-bearing request boundary. Reuse v2 document/revision base
   and bypass authentication and the existing track mixer.
3. Extract only the common measured-device graph check from `graph_v3`: accept
   a DeviceV2, bounded event span and graph, with a caller-specific diagnostic
   adapter. Its node whitelist, kernel counts, parameter checks and ordering
   must stay byte-for-byte equivalent in behavior for v3. Do not manufacture
   a fake v3 bank and pass it through v3 ownership validation.
4. Give shared stepping/chase code a small borrowed source descriptor
   (`event_begin/count`, length, ownership masks) and chain-member accessor.
   V3 reads its existing ClipV3 through that accessor. V4 reads SourceV4 and
   owns a bounded placement table/next-boundary cursor in the same Config.
   No occurrence expansion enters the stored 1024-event pool.
5. Add `resolve_arrangement(track, song_frame)` returning source, source phase,
   occurrence index and next endpoint. For this slice it resolves one track
   over at most eight placements. Use binary search on discontinuity and an
   endpoint cursor at steady state. Compare occurrence IDs/indices as well
   as source IDs: adjacent occurrences of the same source still reset.
6. Generalize the existing clear/chase helper to accept that resolved cursor.
   Preserve v3's exact automation-only chase. V4 adds a fixed held-pitch scratch
   set and at most four synthetic note-ons, excludes due note-offs at the
   entry frame, and restores ownership/base automation before note-ons. Feed
   synthetic records into the same bounded 32-event dispatch batch. Extract
   the reset/render mechanics; do not copy another whole clear/render loop.
7. Reuse the existing request ingress, receipt reservation and START reduction
   inside begin_v3 through a narrow mode adapter. V4 transports use validated
   internal command records; never reinterpret-cast RequestV4 as RequestV3 or
   let an old request operate the new mode. Only START is admitted here, so
   launch/Stop/return member reduction stays v3-only until 2C. Candidate
   preview must resolve the Arrangement entry before admission and must not
   mutate applied occurrence identity until the candidate is accepted.
8. Share sample/advance mechanics: resolve the v4 occurrence before ordinary
   event gathering, coalesce a due boundary with an optional clear, and skip
   v3's automatic clip wrap/independent clip-phase rules for v4. Mix by track
   activity determined from the resolved source, not a fabricated Session
   clip. Retain the existing instrument/effect loop and full-root resets.
9. Project coherent StateV4 with Arrangement authority, true active placement/
   source indices, slot NONE and empty pending actions. Use the same publication
   sequence; publish only the active wire payload. The v3 loop still publishes
   exactly 16592 bytes. A maximum-sized atomic backing array is acceptable;
   publishing both whole snapshots on every callback is not. Snapshot mode
   checks must come from the coherent publication, not an unsynchronized mode
   read that can race the copied payload.
   Receipt reservation also needs a coherent internal receipt reader that
   understands the active layout: v3 receipts start at byte 6352, v4 at 6496.
   Do not call the old v3 payload copier on v4 or reinterpret its receipt cells
   simply because individual ReceiptV3/ReceiptV4 sizes match.

The new `_workspaces.hpp` contains v4 bounds, finite-placement resolution and
adapters inside AliveSession. A small v4 branch in a shared sequenced callback
is acceptable. Copying the 1170-line `_clips.hpp` scheduler, maintaining a
second candidate/receipt owner, or building a standalone Arrangement engine
is outside scope. Keep refactors narrow enough that all original v3 fixtures
continue to exercise their existing paths and work counters.

## Minimal work proof required in 2B

Deferring full mixed-authority envelopes to 2D does not permit unchecked work
in provisional callbacks. For the no-loop, one-source subset prepare a finite
work-pulse proof off callback: placement starts/cutoffs, ordinary events inside
each half-open occurrence, and at most four offset-chased note-ons per entry.
Charge a complete chain reset, source-prefix scan and parameter restoration
at each relevant boundary, conservatively counting adjacent end/start pulses
even if runtime coalesces them. Keep the accepted six-forced-boundaries per
1024-frame cap before any segment work.

At most eight placements times (512 source events + four chased notes + two
boundaries) gives 4144 temporary control-side pulse records. This is a bounded
admission scratch table, not a second playback schedule or stored event pool.
Sort it and derive maximum costs for widths 1..1024 using a finite-window
scan. Do not walk every possible frame of the song. Include an extra maximum
four held-note dispatches in future event envelopes for an arbitrary resumed
START; its reset/chase and first-frame work use the existing optional ledger
and admission path. All actual generated dispatches are charged before emit.

Reuse the existing scheduled/optional/emergency ledgers and profile-1 resource
ceilings unchanged (32 events/frame; 64/window; 1024 stored). Add the accepted
bounded placement-work counter. Preserve failed guard charging, same-frame
preview and reconstruction-read reservation before scans. MIDI-only sample
reads remain zero. Unexpected excess faults through the existing reserved
cleanup path rather than partially dispatching. This finite proof is not the
2D proof for source looping, arbitrary Session phases or atomic authority
changes, and must not be advertised as such.

## ABI and tests

Use every field, constant, signature and offset in accepted contract section 4,
including declarations for not-yet-supported audio/slots/actions. Do not create
a smaller temporary ConfigV4 and change its ABI again in 2C. Required sizes:

| V4 type | Bytes |
| --- | ---: |
| Track / Source / Slot / Placement | 64 / 104 / 24 / 40 |
| AudioBuffer / Config | 48 / 51160 |
| TrackAction / Request / Receipt | 8 / 112 / 80 |
| Work / Limits / Diagnostic | 48 / 352 / 152 |
| TrackState / State | 104 / 16736 |

C++ assertions cover alignment and all accepted significant offsets; Rust
`size_of/align_of/offset_of` assertions independently match them. Preserve
`tests/alive_session_v3_layout_test.cpp` and `session/tests.rs` v1/v2/v3 layout
assertions unchanged. Default constructors must initialize exact headers and
required NONE sentinels without relying on an invalid all-zero live track.

Add focused tests rather than substituting new expected values into old ones:

- Shipping gate: zero features for both profiles; known valid prospective
  subset validates; configure/request refuses transactionally against an
  already playing v3 session; roots/revision/position/receipts remain intact.
  Wrong header/size/null count/reserved fields and output canaries are checked
  on the real normal library as well as the provisional target.
- Layout/mode isolation: exact C/Rust layouts; v3 and legacy commands cannot
  control provisional v4; v4 requests cannot control legacy/v3; stale revisions,
  stale serials, exhausted Stop and receipt collisions retain existing rules.
- Genuine sound: generate fixtures with the existing
  `alive_session_v3_fixtures.py` from saved `subtractive.ultra`; include the
  real utility/filter fixture for a chain case. Place one source twice with a
  gap and different offsets. Assert exact dispatch frames and nonzero sound
  where expected, complete silence before/gaps/after cutoff, source identity
  reuse and correct occurrence identity. Faust attack may start at zero, so
  use event trace plus a bounded audio window rather than requiring a nonzero
  first sample on the note-on frame.
- Chase boundaries: a held note across O retriggers once; a note ending at O
  does not retrigger; a note starting at O dispatches once; due automation wins
  over prefix chase; implicit source-end note termination works. At adjacent
  placements old termination precedes new automation/note-ons, and old effects
  do not leak into gaps. Validate the four-held-note bound natively.
- Continuity: Stop during a note, queue-full reserved Stop, START resume in a
  placement/gap, natural song end, repeated START no-op, and failure of a
  prospective config retain the expected state. Reject overlap, overflow,
  invalid source ranges and unsupported looping/Session/audio inputs visibly.
- Partition and guards: compare PCM, event/occurrence transitions and final
  state across the original partition set plus 1 and 31, and splits at
  start/end/O-note boundaries. Exercise begin/sample/render/advance/publish
  under existing malloc/calloc/realloc/free/mutex wrappers. Preserve original
  v3 reconstruction-read and first-preview expectations; new chase dispatches
  must appear in v4 event/work traces.

`tests/ci/check-native.sh` already compiles backend.cpp into a static traced
object and links the real core bundle with allocation/lock wrappers. Add a
separate provisional backend object and v4 test; do not put the definition on
the shared v3 object or normal library. Keep the normal-library refusal test
separate. `apps/ultra/CMakeLists.txt` owns native compilation (`ultra_native`
from backend.cpp); `src-tauri/build.rs` only links the existing library and
watches its path. Header-only additions need compiler dependency tracking,
not a new Rust-side native compilation mechanism.

Proposed new files are `native/alive_session_workspaces.h`,
`native/alive_session_workspaces.hpp`, `session/native_v4.rs`,
`tests/alive_session_v4_layout_test.cpp`,
`tests/alive_session_v4_shipping_test.cpp` and
`tests/alive_session_v4_test.cpp`. Existing native/header/native.rs changes are
limited to the shared refactors, wrappers and test registration listed here.
No frontend, desktop.rs, host.rs, persistence.rs, Document or PCM edits belong
to 2B. Rust mirrors can be tested without adding v4 to Document.

## Deferred work, conflicts and acceptance evidence

2C owns Session launch/track Stop/Back to Arrangement, mixed authority, seek,
suffix/global loops, pending multi-track/member receipts and eight-track
behavior. 2D owns full envelopes/measurement, Document adapters, compilation
from the pure model into real prepared projects, authenticated desktop edits,
history/Apply/save integration and measured feature admission. Task 3 owns
PCM, pointer lifetime and zero-root signal routing. This MIDI slice always has
a real instrument root, so changing backend's zero-root predicate now adds
unnecessary risk; record that obligation without implementing it prematurely.

There are three concrete staging conflicts and small resolutions:

1. Unadmitted v4 cannot be configured to prove audio: use the accepted
   test-target-only feature gate, identical runtime, zero published features
   and shipping failure tests. Remove/integrate that gate at 2D.
2. Existing state/cursors name a clip, and render silence is based on
   active_clip: add an internal resolved-source/occurrence adapter and mode
   projection. Do not stuff placements into Session slots to satisfy v3.
3. Full work admission is scheduled for 2D, but callbacks need bounded work
   now: implement only the finite no-loop subset proof described above;
   refuse the rest. Do not substitute the v3 cyclic-bank proof for placements.

Retain red failure logs, focused green commands, normal and provisional build
flags/hashes, generated real-graph hashes, guard results and partition/event
evidence. Run original native v1/v2/v3, envelope/capacity verification and Rust
session/layout regressions after the shared refactors; keep fixtures intact.
Measure no timing claim into this slice: its success means the narrow native
subset works and old behavior remains protected, not that v4 is production
admitted or Task 2/Arrangement is complete. The actual implementation report
must list refused operations and the remaining 2C/2D gates explicitly.
