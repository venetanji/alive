# Task 2C: finite multi-track MIDI preparation report

Status: DONE. Source and index frozen for independent scoped review. This is
native finite MIDI proof, not shipping Arrangement, deadline qualification,
authority-action support, audio support or the final desktop journey.

## Pins and ownership

- Base: `e5b905fa378e5f8d8644a4fd6f9adb5c8437207a`.
- Approved complete preparation consumed unchanged:
  `c8f6522780b1b8c79b8c9056a94073d839518f90`.
- Implementation: `0606542c505f5ba615f43404b639f6c5f63e6e37`.
- Commit: `feat(alive): prepare finite multi-track MIDI workspaces`.
- Five committed files: `alive_session.hpp`, `alive_session_clips.hpp`,
  `alive_session_workspaces.hpp`, new `alive_session_v4_midi_test.cpp`, and
  native CI registration in `tests/ci/check-native.sh`.
- Evidence root: `/tmp/alive-workspaces-task2c-midi-preparation`.
  `pins.json` records source/binary/fixture hashes, compiler, base, approved
  prerequisite and implementation. `final-source/` preserves the five files.
  `evidence-sha256.json` hashes retained artifacts, including mutation source.
- Parent-owned PLAN, WORKFLOW_COVERAGE and ALIVE_ARRANGEMENT_REFERENCE changes
  remain unstaged and outside this commit. Post-commit cached diff is empty.
  This report is the requested implementation handoff, outside the source commit.

## Implementation

The dedicated `ULTRA_ALIVE_SESSION_V4_PROVISIONAL` backend now admits finite
MIDI Arrangement shapes under the existing profile limits, per-track four-source
and eight-placement caps, and complete resource admission. It still refuses
Launch, Track Stop, Return, Seek, slot/source suffix loops, song loops and audio.
Shipping configure/request remains refused and both profiles report zero v4
features. The ordinary non-provisional validation gate stays at its prior subset;
the complete preparation seam remains available without enabling playback.

The old finite single-source pulse builder is replaced by consumption of the
approved complete builder's `Proof.prepared` and `Proof.placement`. Both reset
costs and all future widths feed the existing scheduled/optional ledgers and
retained-history horizon. The complete builder and its oracle are unchanged;
there is no alternative validator, envelope narrowing workaround or ceiling
increase. Bounds validation reuses its complete-MIDI checks in the provisional
runtime, including validation of unused sources and unlaunchable slot descriptors.

Immutable native configuration now copies slot descriptors/count, per-track
local-to-global slot maps, per-track source maps/counts, and loop fields. It
retains the single source event pool and existing graph owner, renderer, clock,
queue, receipts, voice and parameter stores. `ResolvedCursor` includes initial
Arrangement authority, active/pending/remembered global slot tokens, ended flag
and remembered ended phase; the existing candidate cursor copy commits those
fields with the candidate. No Session authority is exposed. Projection now
publishes slot count and cursor metadata, with NONE/zero for missing sources and
NONE/NO_FRAME for absent slots/actions.

START reserves four lookup probes per configured track before any lookup. With
up to eight placements per track this covers each binary search; reduction of
64 STARTs performs only the final lookup pass. The previous one-lane 4 + 2050
reservation and exact rejected-START regression remain intact. A test-only probe
hook checks reservation precedes each read. No new callback allocation, lock,
queue, timer, event scratch or DSP implementation is added.

## Real runtime coverage and admission limits

- Two active tracks use distinct saved instrument parameters and source phases,
  a shared source across adjacent placements, a later different source and a gap.
  Accepted four-sources-per-track metadata and eight-placements-per-track lookup
  fixtures also exercise the structural limits and global slot descriptors.
- Sparse eight-track Arrangement uses eight unique real instrument roots, one
  sounding Arrangement lane and seven Arrangement-silent lanes; sources and
  four-slot descriptors are retained on the first two tracks. This is not a
  claim that eight sounding placement lanes fit the complete conservative proof.
- The two-active-track no-effect fixture uses profile 1. Utility, standalone
  stateful filter and utility-to-filter two-track fixtures use profile 2 with
  four or six roots. Full shape capacity is not an admission promise: an early
  two-track/four-root profile-1 fixture correctly refused 20 scheduled roots
  against its 18/frame ceiling, and the eight-track/two-active-placement variants
  correctly refused placement work before the final sparse fixture was chosen.
- A retained shape-valid eight-track/four-slots-per-track fixture explicitly
  refuses at 66 placement steps against 64/frame. No source or policy change was
  made to accept it. Earlier fixture exploration refusals were observed in the tool output; those
  exploratory log files were subsequently replaced by later runs.
- Actual PCM and exact source/occurrence dispatch frames match under fixed
  1/31/63/64/127/1024 and mixed partitions. START/Stop/resume use identical absolute
  boundaries. Two-track dispatch frames are 0,512,2560,7550,8194; the sparse
  eight-track lane dispatches at 512,2560,8194.
- Muting the changed first lane produces sample-identical second-lane PCM with
  and without the first lane's placements, for no effect, utility, standalone
  filter and utility/filter. This independently proves the other oscillator and
  effect chain were neither reset nor silenced; phase and epoch assertions also
  cover the same offset/adjacent/gap boundaries.
- A two-track O=1000 fixture checks exact ending-note removal, prefix/due
  automation, chased 64 before ordinary 60, separate same-source adjacent
  occurrence identity, one epoch increment per changed track, and unchanged
  other-track phase/epoch. The original one-lane entry-order tests remain intact.
- 29 malformed/ownership/unused-source/overflow/range/profile/layout/loop/audio
  cases refuse; future Launch/Stop/Return/Seek refuse explicitly. Live C ingress
  preserves the current playing configuration. Direct native-owner tests bypass
  the C stopped-configuration guard and verify shape, graph-plan and complete
  envelope rejection preserve playing v3/v4 publication byte-for-byte except
  the rejection counter, then continue without changing epochs.
- Global Stop silences every track across callback fragments and stale queued
  START cannot rearm. Removing configuration clears all real instrument/effect
  output for eight subsequent 1024-frame blocks. Original natural-end and
  failed-START atomicity regressions pass unchanged.

## Work evidence

The new suite traces ledger charges per rendered frame and checks every rolling
width 1..1024 against the complete prepared curves, scheduled limits and optional
limits. Independently counted actual dispatches equal charged event counts;
actual reconstruction reads, lookup probes and root clears never exceed their
reservations. Preview reads stay within 128. The new lookup hook asserts the
reservation exists before each descriptor probe. Parameter-write figures below
are conservative runtime ledger charges, not a separate DSP instruction counter.

Resource order: events, roots, reconstruction scans, parameter writes, guard,
placement steps. Entries are actual ledger maximum / admitted envelope maximum.

| Fixture | Frame | Any window through 1024 |
| --- | --- | --- |
| Two tracks, six roots, profile 2 | 1/12, 3/30, 1/10, 20/200, 0/0, 4/34 | 2/24, 3/48, 1/16, 20/320, 0/0, 4/40 |
| Eight tracks, eight roots, profile 2 | 1/11, 1/27, 1/9, 14/378, 0/0, 4/60 | 1/21, 1/32, 1/14, 14/448, 0/0, 4/65 |

Optional guard 9252, optional placement 2114, scheduled placement 64/frame and
512/window, event 32/frame and 64/window, global stored events 1024, 64 queue
commands and 128 receipts remain unchanged. MIDI sample-payload reads remain
zero. The two-track/eight-placement 64-START fixture records eight lookup probes
and 2058 total optional placement charges, exactly one horizon pass.

## Verification

Exact commands/exits are retained in `red-green-commands.json`, `focused.sh`
and the named command metadata; raw logs and binaries are hashed.

1. Initial meaningful RED: compile exit 0; `midi-test` exit 134 at the new
   two-track `alive_session_validate_v4` assertion against the old gate. The
   original failed executable and `red.log` remain. That test source evolved
   into the final suite; the first small test source was not separately copied.
2. Independent lookup mutation RED: retained isolated source restores the old
   constant four-probe reservation. Compile exit 0; `lookup-mutation/test
   --lookups` exits 134 at the fifth descriptor read, before the horizon can
   provide misleading later credit. Current source's bounded lookup test passes.
3. Final focused v4 plus multi-track tests: `bash
   /tmp/alive-workspaces-task2c-midi-preparation/focused.sh`, exit 0,
   30.204186810995452 seconds. This compiles the current provisional backend and
   both suites with callback allocation/free/lock wrappers and Werror.
4. Unchanged complete envelope oracle: compile exit 0, execution exit 0;
   `sources=8576 boundaries=7620 splices=144 authority=217600 native=12792
   accepted=13 refused=1 assertions=106661824`.
5. Exactly one full native CI after final shared-helper changes:
   `bash apps/ultra/tests/ci/check-native.sh`, exit 0,
   157.49073595500522 seconds. Includes new suite, original v1/v2/v3 runtime,
   envelope, layout, scene, receipt, capacity and guard proofs; original v4;
   complete oracle; shipping refusal; 42 edit + 42 baseline Stop-stress cycles
   and 43,008 float samples.
6. Additional focused shipping proof compiles the existing shipping test directly
   with the current `backend.cpp` without the provisional definition. Compile
   and run both exit 0: `PASS: v4 shipping admission remains disabled`. This
   supplements CI's existing shipping test against its prebuilt native library.
7. `git diff --check` and post-commit `git diff --cached --exit-code` exit 0.

During test construction, direct snapshot equality initially included the
intentionally changing atomic rejection count; the corrected test exempts only
that field and verifies it increases. A nested graph rejection may increment the
counter more than once, so it deliberately does not assert an invented increment
count. Retained intermediate failure logs distinguish this test expectation from
runtime failures. No original test or expected value was weakened.

## Narrow next slice

Independent review is next. Then the existing stopped/playing authority-action
slice may implement local-slot Launch, Track Stop and Return using these immutable
maps, candidate metadata and complete curves. It must prove one-shot remembered
cue semantics, global-slot projection, receipt/member atomicity and final-sample
preview/coalescing before widening ingress. Source/song loops, Seek, desktop
integration, timing qualification, audio and production activation remain gated.

No app rebuild, Rust/browser suite, release, push, settings edit or subagent was
performed. No unresolved implementation issue is known; conservative accepted
shape limits above are intentional and do not substitute for later measurement.
