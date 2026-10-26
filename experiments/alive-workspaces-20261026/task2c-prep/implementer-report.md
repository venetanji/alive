# Task 2C-Prep implementation report

Status: DONE. Source and index frozen after the scoped commit. Independent task
review remains with the parent; this report makes no runtime-admission, native
deadline, GUI, audio-track or endurance claim.

## Pins and scope

- Base: `5abd9ebe8aeefcbf7d5aaa77d9c144d39a07d606`.
- Implementation: `c8f6522780b1b8c79b8c9056a94073d839518f90`.
- Commit: `feat(alive): prove complete bounded MIDI workspace envelopes`.
- Exactly five committed files: `alive_session.hpp`,
  `alive_session_workspaces.hpp`, new `alive_session_workspace_envelope.hpp`,
  new `alive_session_workspace_envelope_test.cpp`, and
  `apps/ultra/tests/ci/check-native.sh`.
- Evidence root: `/tmp/alive-workspaces-task2c-prep`.
- `pins.json` records the base/implementation, compiler, source hashes, focused
  oracle binary hash, generated saved-graph fixture hash, and hashes of the
  reused native library/core bundle. `evidence-sha256.json` hashes retained
  commands, logs and other artifacts.
- Parent-owned PLAN.md, PRODUCT.md, runtime-contract changes and the new desktop
  supplement remain outside the commit and unstaged. No source edits remain;
  `git diff --cached --exit-code` returned zero after commit.

## Preparation seam and unchanged runtime

`AliveSession::prepare_midi_envelopes_v4(ConfigV4, workspace_admission::Proof&)`
is the narrow C++ off-callback preparation seam. It validates the final MIDI
shape and invokes the production `workspace_admission::build_validated` builder.
It has no configure/request/cursor/authority effects and no C ABI export.
The next prepared-MIDI runtime slice must consume its `prepared` and `placement`
curves after its runtime behavior is independently proved.

The current finite `envelopes_v4`, ordinary `validate_v4`, configure/request
gates, feature bits, runtime renderer, owner, event pool, DSP, ledgers, publication
and ABI remain as accepted. The shared validator gains an explicit complete-MIDI
preparation mode; its default mode retains the existing provisional restriction.
The new test proves broader sparse preparation succeeds while ordinary validation
still refuses it. Shipping and provisional runtime regressions passed unchanged.

## Implemented bounds

The complete mode validates MIDI-only shape, four sources and eight placements
per track, existing four-slot ownership, gain 0..2, unused sources/events,
matching note intervals/four-held-pitch bound, parameter masks and aggregate
notes/lanes/points/event storage, and tempo-exact looping suffix minimums.
Existing checked endpoint/range validation prevents absolute-coordinate wrap.

The builder deduplicates at most 96 `(source,offset)` uses with finite/cyclic
eligibility flags. It streams one source profile into one track maximum, using
at most 1026 local weighted pulses and three six-curve scratch sets. It never
expands song, placement, or suffix repetitions. Both finite and cyclic profiles
include ordinary suffix events, full-chain reset/restore work and peak held-note
chase; finite profiles carry a separate clear/end pulse. Prefix events only
reconstruct. Actual `Prepared.reset[t][0]` stays zero; synthetic events are in
the conservative event curves and remain separately dispatched at runtime.

The six dimensions are events, roots, source-event scans, parameter writes,
guard comparisons and placement work. MIDI sample-payload reads are structurally
zero. Original five-resource tables, event limits, queue/receipt sizes,
scheduled placement 64/frame and 512/window, optional placement 2114 and original
optional guard 9252 remain unchanged.

Placement starts/ends are deduplicated into union points. Finite prefix and
translated cyclic loop-region point envelopes cover partial loops; grid and
global seam/end curves are added conservatively. Finite Session ends are already
carried by finite source profiles. Source suffix repetitions never become
placement endpoints. Every track's nondecreasing K is checked before any DP;
K[1024] above six rejects, guaranteeing at most seven positive-length pieces.

Source maxima are composed with the existing segment primitive and charged for
each forced transition plus arbitrary entry. Cross-track sums cover independent
phases/authorities. Checked addition/multiplication and pre-DP value bounds reject
overflow. Diagnostics expose resource, width, conservative flag, per-track
contribution/source/placement plus bounded proof context: all contributing
placement bits, grid count and loop brace/enabled state.

Detailed arithmetic reasoning is retained in `preparation-notes.md`.

## Independent oracle domains

The reference path uses scalar containment, source modulo, independent note
interval/automation dispatch and reconstruction state. It directly charges
clears, prefix/due/terminating-probe reads, reset/restore writes, ordinary and
synthetic dispatches, and boundary/lookup probes. It calls none of the production
resolver, cyclic, segment, boundary or transition helpers. Calls to those helpers
in the test are exclusively the subjects being checked.

Final focused and full-CI output:

```text
PASS: sources=8576 boundaries=7620 splices=144 authority=217600 native=12792 accepted=13 refused=1 assertions=106661824
```

- Source domain: lengths 1..7, every offset, every `0 <= start <= end <= L`
  interval (equal endpoints represent empty material), every automation frame
  or none, finite/cyclic eligibility, every entry phase and horizons 1..8.
  Added 188/375-frame suffixes with offsets 0/100 and all widths 1..1024.
  Combined count 8,576. Exact checks cover finite end pulses, no prefix replay,
  implicit note end, held entry, and exact note end/start at entry.
- Boundary domain: periods 1..7, nonzero/zero prefix B=0..3, every subset of
  positions before E, finite/looping transport, all enumerated starting absolute
  phases and widths 1..8. 7,620 configurations; first-prefix-to-loop joins are
  included. Near-UINT64_MAX cyclic coordinates and overflowing weights are
  explicit arithmetic cases.
- Cut domain: independently recurse over every cut, stream choice and phase for
  two weighted streams, zero/two allowed cuts and horizons 1..8. 144 exact
  dimension/width equalities; additional six-versus-seven and overflow checks.
- Authority domain: two-track sums, source lengths 5/7, all authority masks,
  independently enumerated Session phases, all initial song phases 0..16,
  Launch/Stop/Return/no-action cuts on both tracks, gaps/touching placements,
  same/different source identity, and partial brace [3,17). 217,600 scalar
  trajectories and all six dimensions at horizons 1..8. These domains are
  deliberately factored; they are not a claim of an unbounded Cartesian proof.
- Native complete-builder domain: 12,792 scalar trajectories over all six
  resources and widths 1..1024, including 188/375-frame suffixes, offsets 100,
  nondividing [2400,4000) song loop, prefix/brace seam windows, all active masks
  at one/three/eight tracks and deterministic independent Session phases.
  Finite Session silence and cyclic slots are both covered. A two-root
  instrument/effect descriptor case checks actual automation, prefix reads,
  due automation and full-chain writes. Thirteen sparse variants accept;
  one dense eight-track/four-voice minimum-period variant refuses events.

The abstract tiny periods are only mathematical helper inputs. They never
bypass the real preparation seam's tempo-dependent native minimum.

Additional builder tests cover the full 96 distinct uses, repeated source/offset
deduplication across finite/cyclic slots, invalid ownership/duplicate/unowned
slots, source/placement caps, invalid offsets, unused-source note overlap/five
voices, parameter ownership, storage and integer limits. Source count and
placement contributor diagnostics are checked on refused preparations.

## K-before-DP and conservative refusals

- A later track with four separated union endpoints plus grid/end reaches K=6
  and is accepted. Adding a touching occurrence produces K=7; a separated one
  produces K=8. Both refuse with `segment_calls == 0`, including zero calls for
  the earlier valid track. Diagnostics identify track 1/source 1 and cap six.
- The lower-level composition seam independently proves K=6 enters exactly six
  resource DPs and K=7 enters none. Overflowing source values also enter none.
- Prefix and loop maxima are summed instead of maximizing exact join splits.
  This deliberately overestimates first-entry work, including width one.
- Forced reset/chase pulses and the extra arbitrary-entry pulse may duplicate
  pulses already present in a local source profile. Peak held voices and reset
  scans also include validated unused sources. All are deliberate conservative
  narrowing; no cost is removed to force acceptance.
- Tracks without placements reserve two descriptor steps for Launch and no
  placement search for Return; a source seam still costs one step. This structural
  distinction permits useful sparse eight-track scores without changing 64/512.
- The 96-use maximum shape refuses on placement work at width one, cap 64,
  after all 48 resource DPs. Shape capacity is not a playback-admission promise.
- Dense eight-track minimum suffix content refuses on the unchanged event cap.

## RED/GREEN and verification

Exact commands/exits/log paths are in `red-green-commands.json`.

1. Initial RED: compile exit 0; run exit 134 at the expected sparse two-track
   configuration assertion against the existing finite `validate_v4` gate.
   This establishes the missing complete preparation capability. GREEN moves
   that acceptance assertion to the new seam and separately asserts the old
   gate still refuses; compile/run exit 0.
2. Sparse eight-track RED: compile exit 0; run exit 134 because charging a full
   placement search on tracks with zero placements conservatively refused the
   fixture. The structural no-placement descriptor bound gives GREEN without
   raising any ceiling; subsequent complete oracle runs exit 0.
3. Final focused command: `c++ -std=c++17 -O2 -Wall -Wextra -Werror
   apps/ultra/tests/alive_session_workspace_envelope_test.cpp -o
   /tmp/alive-workspaces-task2c-prep/envelope-test`, compile exit 0; binary run
   exit 0. Logs `final-oracle-build.log` and `final-oracle-run.log`.
4. Exactly one complete native CI after final shared-helper changes:
   `bash apps/ultra/tests/ci/check-native.sh`, exit 0, elapsed 144.071532 seconds.
   `complete-native-ci.log` and `.json` retain raw output and command/exit/time.
   It passes the new oracle, unchanged original v3 primitive oracle, v1/v2/v3
   runtime/layout/receipt/scene/guard suites, unchanged v4 real-device/refusal
   regression, shipping feature refusal, capacity verification and the original
   queued-edit Stop stress (42 edit and 42 baseline cycles; 43,008 float samples).
5. Generated the same saved-graph fixture header with
   `python3 apps/ultra/tests/alive_session_v3_fixtures.py
   /tmp/alive-workspaces-task2c-prep/saved_graphs.hpp`, exit 0, for retained pinning.
6. `git diff --check` and post-commit `git diff --cached --exit-code` both exit 0.

No app build, unrelated Rust/UI suite, release operation, push, merge, branch
switch, credential/environment setting or subagent work was performed.
