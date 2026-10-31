# Task 2C source suffix loops and Arrangement Seek

Status: DONE, awaiting parent independent review. Source/test/index frozen.

- Branch: `feat/alive-session-host`.
- Base: `65eb48693262dcb20d5d1585b7a3ab6e392ae68c`.
- Implementation: `a0c34e3006dc920632ec95609ff6e280a70769dd`.
- Prior finite authority approval: `74d92d407602d3fd7b8c2ac6161d59220eb09f1f`.
- Evidence: `/tmp/alive-workspaces-task2c-suffix-seek`.
- Scoped commit: five native source/test files, 606 insertions / 29 deletions.
- Post-commit index check passed. Only the parent's `PLAN.md` was dirty at
  handoff. No source, test, or index edits follow the implementation commit.

This is native prerequisite sub-slice 4, not completion of the end-user MIDI
Arrangement journey. The real application and WAV journey remain gated.
The suffix/Seek brief, binding 2C design brief, and accepted runtime contract
sections 2/3/4/6/8 governed this work. No subagents, app/launcher rebuild,
Rust/UI/audio implementation, song-loop activation, public ABI changes,
capacity increases, settings/release work, or push occurred.

## Implementation

`apps/ultra/src-tauri/native/alive_session_workspaces.hpp` admits source-loop
flags only through the existing dedicated provisional gate. Complete MIDI
envelopes remain the admission owner, unchanged. Shipping capabilities still
report zero. Song-loop and audio refusal remain intact.

The existing small resolved cursor now records its occurrence endpoint as well
as its next boundary. `placement_cursor_v4` resolves `O + elapsed % (L-O)` for
a loop and the original linear phase for a finite occurrence. The next
boundary is the earlier of suffix end and placement cutoff. A suffix seam
retains the same occurrence and next-placement cursor; a cutoff advances to
the next distinct occurrence or gap. Adjacent placements sharing source and
offset retain distinct occurrence identities and one full-chain reset at the
boundary. There is no expanded repetition/event list or new source clock.

The shared transition scratch handles Session suffix ends by repeating the
prepared slot offset when loop-enabled. Finite Session ends preserve the
existing ended cue and published silence rules. A cheap comparison against
the cached occurrence endpoint selects a one-step suffix reservation versus
the existing four-step Arrangement resolution allowance before descriptor
work. Session end descriptor work also spends one step. All existing scan,
event, root, write, guard, queue, receipt, and placement ceilings are unchanged.

`apps/ultra/src-tauri/native/alive_session_clips.hpp` admits versioned Seek
through the existing ingress validation, reducer, optional admission, and
receipt algebra. Seek cancels candidate pending actions with the existing
replacement reason, but only Arrangement tracks acquire resolution/clear
masks. Active and ended Session phase, authority, cue, oscillator/filter
state, and unaffected PCM persist. Invalid positions still refuse without
clamping. Stopped Session cues also persist.

Queued Seeks reduce to the last candidate before placement work. When the
same batch's final due track action replaces a Seek result, that track's
superseded Arrangement lookup is omitted; the shared transition scratch
resolves the final action for preview and dispatch. This is limited to the
new Seek case and retains the old finite START/action regression behavior.

Every fresh candidate occurrence explicitly derives pending slot from an
authoritative pending Launch token. The existing transition-scratch invariant
also remains in force at source seams, placement boundaries, and gaps. No
fresh cursor default becomes an independently published pending identity.

## RED and development checks

Before implementation, the initial new test compiled with Werror and failed
independently for valid suffix configuration and valid versioned Seek ingress.
Those original `red-test.cpp`, executable, build metadata, and RED logs are
retained. This first run linked the existing prior finite-proof backend
artifact; it did not establish exact-base binary provenance by itself.

An exact-base reconstruction subsequently compiled the initial RED test and
the carried pending regression against the pinned `65eb486` native headers.
`baseline-red.sh` and `exact-base-red-build.json` retain that build, exit 0.
Both original behavioral REDs repeat, and the carried test establishes an
already committed pending scene before failing at the old Seek gate:

- `exact-base-red-test --suffix`: SIGABRT, configuration not admitted.
- `exact-base-red-test --seek`: SIGABRT, valid Seek not admitted.
- `exact-base-pending-red-test --pending-seek`: SIGABRT at Seek ingress after
  the committed pending scene is asserted.

The exact-base command records store child return code -6. The Python recorder
itself returns 250 for that negative code; conventional shell SIGABRT is 134.
The pending harness adds only a command-line selection to the final test copy.
Its base native headers and both harnesses are explicitly inventoried; copied
dependency context is not bulk-inventoried.

A further targeted RED, `reduction-red.log`, caught redundant track-zero
Arrangement lookup for Seek followed by due Launch. It compiled and aborted
at the expected one-probe / 2054-placement assertion. The final implementation
passes that exact assertion. Intermediate development logs remain historical;
the final source pins and final commands identify the authoritative result.

## New behavioral coverage

All additions are in `apps/ultra/tests/alive_session_v4_authority_test.cpp`:

- `suffix_fixture` / `suffix_playback`: L=2000, O=400, period=1600 at 120 BPM;
  Arrangement and Session suffix repetition; nonzero offset; source-prefix
  reconstruction; note ending at offset excluded from chase; due automation;
  chased-before-ordinary ordering; actual instrument/utility/filter resets;
  literal identical PCM segments after each reset. Placement 0 ends at 3500,
  midway through a suffix, exactly on an old-source note-off; adjacent placement
  1 starts a distinct occurrence at the same source/offset. Final cutoff at
  5600 suppresses its old endpoint note-off and produces exact silence.
- `minimum_suffixes`: accepted real 375-frame suffix at 120 BPM and 188-frame
  suffix at 240 BPM; one-frame-shorter configurations refuse. Actual seam
  frame/phase/epoch checks, global Stop silence, and removed-configuration
  silence follow. Refused raw fixtures are retained.
- `seek_continuity`: exact real PCM comparison against unaffected-track
  controls for instrument-only, utility, utility+filter, and filter-only
  chains. Finite and looping Session tracks retain their independent phase and
  epoch progression while Arrangement seeks through notes, boundaries and
  gaps. Loop periods 1600 and 1901 do not divide one another.
- `seek_reduction`: 64 queued seeks resolve only the final cursor per track,
  with three actual optional binary-search probes, one 2058-step placement
  admission and correct superseded/applied receipts. A later Seek+due Launch
  resolves only the final track-zero source; only track one's one probe and
  total 2054 placement steps remain. Final source dispatch and one epoch
  increment agree with preview.
- `seek_boundaries`: accepted Seek into a held note, exact source seam,
  adjacent placement boundary, and gap; exact phase/dispatch counts and
  automation; gap clears ownership/tails; song-end/UINT64_MAX refuse; stopped
  Seek preserves a Session cue's phase and epoch.
- `seek_ended_cue`: Seek retains ended one-shot Session silence and the private
  cue that restarts at its offset only after natural song end.
- `suffix_pending`: sparse track-local slot 3 / global slot 5 remains coherent
  across repeated Arrangement source seams and applies at absolute 48000.
- `suffix_work_curves`: 10000 rendered frames with interior suffix/cutoff
  transitions and three seeks; dispatch equals charged events; reconstruction
  reads and descriptor probes fit prior reservations; preview reads stay <=128;
  every changed track clears at most once per sample; every relevant width
  1..1024 fits the unchanged complete proof and optional limits.
- The same absolute source-loop and Seek gestures compare exact PCM and
  dispatch across partitions 1/31/63/64/127/1024 and mixed partitions.

The existing first-sample preview, exact combined chased/ordinary batch
admission (32 accepted, 33 refused atomically), injected-fault scene cleanup,
Stop epoch race, receipt saturation, playing adjacent/gap pending projection,
and concurrent receipt/target tests remain intact and pass. They exercise the
same owner/transition/emission path; no new dispatch or fault path was added.

## Carried pending-survives-refused-Seek requirement

`refused_seek_pending` renders real instrument+utility+filter chains using a
local existing owner and workspace. At absolute 3072 it queues scene serial 2,
mask 3, including sparse local slot 3 / global slot 5. After one sample, the
published scene is genuinely pending at target 48000.

At absolute 3073 the test injects retained scheduled event pressure (31 events)
and proposes Seek to 48000. Its combined first-frame preview cannot fit.
The rejected candidate leaves the old pending receipt byte-identical, both
member tokens/slots/serials/targets unchanged, old position advancing normally,
and both epochs unchanged. It spends guard 9252 and optional placement 2058,
with no reconstruction/root charge or reads. Injected scheduled history also
remains retained. An immediate second Seek refuses because the first guard
history remains spent; it still cannot cancel the old scene.

After the history expires, another Seek applies and only then cancels the old
scene with replacement reason and canceled mask 3. `seek-receipts.tsv` records
all four stages. The 4099-frame interval containing both refusals is exactly
PCM-equal to a continuation control without those requests:

`b2df1e04d3f8e515ca75b1eb2123f4dbacbfe8c55a2325582eb9d5eb6dbcc442`

Both recordings contain 8198 nonzero scalar samples. This is a real waveform
continuity assertion, not just cursor counters or silent output.

## Work and PCM evidence

For the three-root suffix/Seek fixture, actual maxima versus unchanged proof:

| Resource | Actual frame / envelope | Actual 1024 / envelope |
| --- | --- | --- |
| Events | 4 / 13 | 13 / 32 |
| Root clears | 3 / 15 | 6 / 24 |
| Prefix scans | 8 / 40 | 16 / 64 |
| Parameter writes | 21 / 101 | 43 / 164 |
| Scheduled guards | 0 / 0 | 0 / 0 |
| Placement steps | 4 / 17 | 5 / 20 |

Optional maxima are roots 3, scans 8, writes 20, guards 9252 and placement
2054 per frame/window for this one-track fixture. Actual descriptor probes
peak at one scheduled / two optional per frame, below their reservations.
The separate two-track refusal uses 2058 optional placement steps. The fixed
2114 optional placement and all original ceilings are unchanged. Parameter
write values are conservative charges, not a separate DSP instruction counter.
MIDI processing reads no audio sample payloads.

Retained little-endian float32 stereo recordings at 48 kHz:

- `suffix-pcm.f32`: 6000 frames, 11200 nonzero scalar samples, SHA-256
  `38929dd8b90f6df1fbd5f00223860786c25919b66277500906827e16d7da642d`.
- `seek-gestures-pcm.f32`: 10240 frames, SHA-256
  `db3b9852e2a191c1d4dcdec46f316caca5c45741ab3b3ec25d561dd0136dc7e9`.
- `refused-seek-pcm.f32` and `refused-seek-control-pcm.f32`: identical hash
  stated above, 4099 frames each.

Corresponding dispatch TSVs, `suffix-work.tsv`, `seek-receipts.tsv`, raw
accepted and refused configurations, and the original finite authority traces
are retained. `measurement-summary.json` contains measured maxima and PCM
statistics; `evidence-description.json` defines formats and columns.

## Final verification

All commands ran from the shared repository root. Exact argv, exit and elapsed
time are retained in matching JSON records alongside logs.

1. `env ALIVE_AUTHORITY_EVIDENCE=/tmp/alive-workspaces-task2c-suffix-seek bash
   /tmp/alive-workspaces-task2c-suffix-seek/focused.sh`: exit 0,
   49.37706915000308 seconds. Current backend plus authority, finite multi-track
   and original one-lane v4 suites; Werror and allocation/free/lock wrappers.
2. `bash /tmp/alive-workspaces-task2c-suffix-seek/oracle.sh`: exit 0,
   4.571226378000574 seconds. Unchanged exhaustive proof:
   `sources=8576 boundaries=7620 splices=144 authority=217600 native=12792
   accepted=13 refused=1 assertions=106661824`.
3. `bash apps/ultra/tests/ci/check-native.sh`: exit 0,
   175.98621089100197 seconds. Exactly one full native CI after final shared
   source/test changes. All original v1/v2/v3 runtime/layout/envelope/scene/
   receipt/capacity/guard proofs, all v4 suites and the unchanged oracle pass.
   Stop stress passes 42 edit + 42 baseline cycles over 43008 float samples.
4. `bash /tmp/alive-workspaces-task2c-suffix-seek/shipping.sh`: exit 0,
   17.53791554000054 seconds. Compiles current backend without the provisional
   definition; `PASS: v4 shipping admission remains disabled`.
5. `git diff --check`, pre-commit index check and post-commit
   `git diff --cached --exit-code`: exit 0.

Original concurrent pending projection observes 27221 playing-pending reads,
boundary mask 7 and two applied reads in focused verification; full native CI
observes 28338, mask 7 and two. These are scheduling-dependent observations,
not hardcoded expectations.

`source-pins.json` pins 22 current source/fixture/library inputs.
`artifact-inventory.json` pins 151 focused retained files (106919451 bytes),
including exact-base headers/harnesses, final source copies, binaries, scripts,
command records, traces and fixtures. It deliberately excludes copied baseline
dependency directories and symlinks. `commit.json` records the scoped commit,
base, branch and empty-index result. No source edit followed final verification.

## Evolved obsolete assertions

Only formerly valid feature-disabled expectations changed in old v4 suites:

- `alive_session_v4_test.cpp`: valid source-loop placement now validates;
  versioned Seek now queues and applies to exact position 0 after existing
  unreachable-action assertions and guard expiration.
- `alive_session_v4_midi_test.cpp`: valid loop placement and loop slot now
  validate; original unreachable actions still END_CANCEL with unchanged
  authority/phase checks, then versioned Seek applies at position 0 and phase
  701. The receipt index follows the last action now that no rejected Seek is
  inserted ahead of that check.

Malformed fields, ownership, ranges, gain, source/voice/event bounds, invalid
song loop, audio, shipping, and all v1/v2/v3 assertions remain unchanged.

## Remaining gate

No unresolved native defect is identified in this slice. Parent independent
review precedes widening. The next native slice is partial song-brace loops,
reachable loop-entry quantization, and coincident song-seam/action/occurrence
closure. Then measured profile admission, desktop/Rust integration and actual
MIDI Arrangement UX remain required; WAV/audio is later work. Shipping v4 is
still disabled. The parent-reported unrelated desktop chooser CI issue is
outside this source commit and its native verification.
