# Task 2C song brace loops and coincident boundary closure

Status: DONE_WITH_CONCERNS, awaiting independent review. Source/test/index frozen.
The concerns are intentional conservative full-shape admission refusals and the
remaining Task 2D qualification/integration gate, not a known native defect.

- Branch: `feat/alive-session-host`.
- Actual base: `0bbad1814dcd8eb58b39be42517aed1466e8a8f2`.
- Prior suffix/Seek approval: `a0c34e3006dc920632ec95609ff6e280a70769dd`.
- Scoped implementation: `5981cfeeefc52f6dcb0e1ee536c0bd3ff9ec9e4b`.
- Scope: four native source/test files, 545 insertions / 10 deletions.
- Evidence: `/tmp/alive-workspaces-task2c-song-loops`.
- Post-commit index check: exit 0, empty. No source/test/index edits follow.

The song-loop brief, binding Task 2C design brief, and accepted runtime contract
sections 2/3/4/6/8 govern this sub-slice. No subagents, public ABI change,
capacity increase, Rust/UI/audio implementation, shipping activation,
app/launcher rebuild, settings/release work, or push occurred. Existing parent
planning documents and evidence directories were left alone. The unrelated
frozen desktop diagnostic commit is only the base; those files were not edited.
This is native prerequisite completion, not completion of the user-facing MIDI
Arrangement journey or WAV/audio work.

## Runtime change

`alive_session_workspaces.hpp` now permits MIDI song-loop configurations only
through the existing provisional test gate. Validation, ownership/range rules,
complete MIDI envelopes, audio refusal, and shipping capabilities are unchanged.
The complete prepared envelope builder already covers the finite prefix and
cyclic brace region, so no proof or policy changes were needed.

The existing shared transition scratch now carries the prospective song position.
When playing reaches E, it resolves the sample at B, then applies due actions,
then resolves occurrence/suffix boundaries. Only Arrangement tracks re-resolve
because of a wrap. Due Launch/Stop replaces the old occurrence directly; due
Return resolves once at B. A wrap into the same source and placement still sets
the changed-track bit. All causes share the existing one-clear mask, fixed event
batch, reconstruction scan, full-chain reset and dispatch owner.

Placement allowances are reserved before searches. Actual position, cursor and
authority publication occurs after the sample's work/event reservation succeeds.
A fault at wrap therefore retains the last committed E position/cursors and
cancels pending members without reporting partial scene application. Session
phase, source, oscillator/effect state, authority and pending identity continue
through unaffected wraps. The common clock and ledgers remain the only owners.

`alive_session_clips.hpp` computes v4 action targets from the unchanged prepared
exact F(4*k) grid plus the loop-entry point B. B uses the separately prepared
seam envelope; it is not inserted into the grid and charged a second time.
Only prepared grid points before E are reachable. After the last point, the
absolute target is `now + (E - position)`; at a callback starting exactly at E,
normalization to B produces a due-now target. Addition is checked against the
NO_FRAME sentinel. Nonlooping unreachable targets still END_CANCEL immediately.
Seek at E or later now refuses while looping; the prefix before B remains valid.

Start/resume resolution uses the same normalized position. A discovered
loop-only edge case was corrected: when E equals song length, a global Stop at
E followed by Start is a loop resume, not a natural-end rewind of remembered
Session cues. Nonlooping natural-end restart keeps its existing behavior;
completed one-shot cues restart only after natural end, while explicit Track
Stop retains silence. All rolling history survives the transport/actions.

## RED evidence

`red-build.json` records a Werror build of the initial new behavioral test and
backend before any production changes, against actual base `0bbad18`; exit 0.
`base-backend.o`, `red-test`, `red-test.cpp`, base source pins and command/log
records are retained. `red-song` aborts at the expected valid song-loop configure
refusal, before runtime widening. Child exit is -6; the Python recorder returns
250 for that negative child code (ordinary shell SIGABRT is 134).

A second meaningful RED caught the E==length Stop/resume bug after the first
loop implementation. `stop-at-end-red` aborts at the exact expected B+1 song
position / preserved Session phase / active-slot assertion. Its test source and
executable are retained. This is an intermediate development build, not a
separate frozen commit. The final suite passes that assertion for both E<length
and E==length, with all 64 queue entries occupied before reserved Stop.

Historical `first-green` passes the new authority tests but then catches the
obsolete valid-song-loop refusal in the older MIDI test. That one expectation
was evolved as described below. Other intermediate logs are historical; only
final source pins and final command records identify the handoff build.

## New tests and evidence

All new behavior lives in `alive_session_v4_authority_test.cpp`, reachable as
`--song` and included in the complete authority suite.

- `song_fixture` / `song_playback`: 120 BPM, song 8192, brace [2400,4000),
  source L=2301/O=400/P=1901, which does not divide the 1600-frame brace.
  Prefix occurrence 0 dispatches once; placement 1 spans B and reconstructs at
  source phase 1200; placement 2 at E never leaks into the wrapped sample.
  Repeated same-occurrence wraps increment its epoch once. The gap variant
  proves 400-frame exact silence after B. Session phase and exact epoch counts
  remain independent; PCM is exactly equal to a nonlooping control trajectory.
- `song_targets`: requests before B, exactly B, after the last grid point,
  exactly E, and later wraps have exact absolute receipt targets and applied
  samples. A longer brace [90000,100000) covers the actual 96000 F(4*k) grid
  point, its exact sample, the following seam, and repeated absolute targets.
  Seek E, song-length-minus-one beyond E and UINT64_MAX refuse; prefix Seek
  applies at the claimed stopped position.
- `song_coincidences`: Return, Launch and Track Stop coincide with song wrap,
  a placement cutoff/start and old source suffix end, at both the first
  callback sample and an interior sample. Final authority/source/placement/
  phase are exact; two affected three-root chains charge six clears and each
  epoch increments once. Return reserves eight placement steps; Launch/Stop
  reserve only the other Arrangement track's four. A separately authored
  old-endpoint note-on is suppressed at the cut.
- `song_stop_resume`: the full 64-command queue is stale-canceled by reserved
  Stop at E, both for E<length and E==length. Session authority, active slot
  and phase persist. Start resumes at B without a natural-end cue rewind.
- `song_profiles`: profile 1's admitted two-track/two-root fixtures and profile
  2's admitted eight-track/eight-root sparse fixture execute real wraps and
  actions. An eight-track wrap charges exactly eight roots / 32 placement
  steps and increments each affected epoch once. Full-shape conservative
  refusals are explicit and retained, without weakening the proof.
- `song_fault`: an injected event-work invariant failure at wrap plus atomic
  two-track Launch emits no events or PCM, retains committed position and
  authorities/cursors, cancels both members, and latches cleanup for the rest
  of a 1024-frame callback.
- `song_first_sample`: Stop at E, retained scheduled event pressure, then
  Start+due Return fails final-first-frame admission transactionally. It spends
  guard/placement credit but performs zero reconstruction/reset work, retains
  the old stopped cursor/position, and retains scheduled pressure. Immediate
  retry also refuses because history remains charged; restart succeeds only
  after the history expires and resolves B correctly.
- `song_work_curves`: 11000 actual samples with Return, Launch, Track Stop and
  Seek, measuring all six scheduled resources at every relevant width 1..1024
  against the complete prepared envelope. Actual dispatch equals charged
  events, reconstruction reads/probes fit prior reservations, preview reads
  stay <=128, optional history stays within the original bounds and each
  affected track clears at most once per sample.
- `song_gestures`: identical absolute Seek/Stop/stopped-Seek/Start gestures
  compare exact PCM and dispatch across 1/31/63/64/127/1024 and mixed callback
  partitions. Unaffected Session PCM also matches a no-Seek control for real
  instrument-only, instrument+utility, instrument+utility+stateful-filter and
  instrument+filter chains. Loop-only PCM/dispatch has the same partition proof.

The complete earlier corpus remains in place: completed one-shot cue/explicit
Track Stop/natural-end restart; pending tokens and unrelated scene members;
strict-prefix held-note/automation reconstruction; exact 32-versus-33 combined
batch admission; rejected Seek with already committed pending scene and exact
continuation PCM; queue/receipt/Stop/serial saturation and callback races;
coherent observations and output canaries; live base/mixer/bypass behavior;
allocation/free/lock guards; original v1/v2/v3 fixtures and layouts. No older
source-format regression assertions were changed.

## Measured work and recordings

Six-root profile-2 song fixture, actual versus unchanged complete envelope:

| Resource | Actual frame / envelope | Actual 1024 / envelope |
| --- | --- | --- |
| Events | 2 / 10 | 4 / 18 |
| Root clears | 6 / 30 | 12 / 54 |
| Prefix scans | 2 / 10 | 4 / 18 |
| Parameter writes | 40 / 200 | 80 / 360 |
| Scheduled guards | 0 / 0 | 0 / 0 |
| Placement steps | 8 / 34 | 9 / 45 |

Optional frame/window maxima in this run: roots 6, scans 2, writes 40,
guards 9252 and placement 2058. Actual descriptor probes peak at three per
scheduled frame, four per scheduled window, and three optional probes per
frame/window. All six actual curves and the charged rolling history are in
`song-work.tsv`; `measurement-summary.json` records these values. Writes are
conservative charges, not a separate DSP instruction counter. MIDI processing
performs zero audio sample-payload reads.

Stereo 48 kHz little-endian float32 recordings:

| Artifact | Frames | Nonzero scalar samples | SHA-256 |
| --- | --- | --- | --- |
| `song-pcm.f32` | 10401 | 20802 | `4840a47ae199e2146c186e444f319e0b8f0ddbfcaaadc919d98856a76d19f4a0` |
| `song-session-pcm.f32` and control | 10401 | 20802 | `1173cf0a17222bba91361b7c0c235ecbb4792271b6cdb23cfa7e1f149d1e732a` |
| `song-gestures-pcm.f32` and control | 20480 | 28672 | `0d7cd3cfcead0540a126385c2d69d79f13ef9d059bba117f42a15c401fa11888` |

Matching dispatch TSVs, receipt TSVs, raw accepted/refused fixtures and earlier
suffix/Seek artifacts are retained. `fixture-index.json` decodes the config
headers of 128 retained fixtures. `source-pins.json` pins 33 current source,
fixture and library inputs; base source pins identify `0bbad18`. Final source
copies exclude the large prebuilt libraries, whose hashes remain recorded.
`artifact-inventory.json` pins retained binaries, sources, fixtures and evidence.
The complete CI's temporary binaries are not retained; the independently built
current-source focused and shipping binaries are retained and pinned.

## Final verification

Every final command has exact argv/cwd/exit/elapsed time in its JSON record and
full stdout/stderr in the matching log. No source/test edits followed these runs.

1. `env ALIVE_AUTHORITY_EVIDENCE=/tmp/alive-workspaces-task2c-song-loops bash
   /tmp/alive-workspaces-task2c-song-loops/focused.sh`: exit 0,
   54.60472674600169 seconds. Current backend, full authority corpus including
   song tests, finite multi-track v4 and original one-lane v4; Werror and guards.
2. `bash /tmp/alive-workspaces-task2c-song-loops/oracle.sh`: exit 0,
   4.579905582999345 seconds. Unchanged independent full proof:
   `sources=8576 boundaries=7620 splices=144 authority=217600 native=12792
   accepted=13 refused=1 assertions=106661824`.
3. `bash apps/ultra/tests/ci/check-native.sh`: exit 0,
   180.69877967299544 seconds. Exactly one complete native CI after final shared
   changes. Original v1/v2/v3 runtime/layout/envelope/scene/receipt/capacity and
   guard proofs, all v4 suites and oracle pass. Stop stress passes 42 edit +
   42 baseline cycles over 43008 float samples. Some general legacy smoke
   tests load the existing pinned native library; the Alive regression suites
   compile current source. No app/native-library shipping rebuild was performed.
4. `bash /tmp/alive-workspaces-task2c-song-loops/shipping.sh`: exit 0,
   17.463721387000987 seconds. Current backend compiled without provisional
   admission; `PASS: v4 shipping admission remains disabled`.
5. `git diff --check`, pre-commit index check, post-commit
   `git diff --cached --exit-code`: all exit 0.

The coherent pending regression observes 26483 playing-pending reads in focused
verification and 27889 in full native CI, boundary mask 7 and two applied reads
in each. These are actual scheduling-dependent observations, not fixed timing
claims. Full native concurrent capacity observation also passes with 51475
coherent snapshots and 46147 same-callback render-overlap snapshots.

## Exact evolved assertion and remaining concerns

Only one obsolete expectation in an existing test changed:
`alive_session_v4_midi_test.cpp:458` previously set a valid configuration's
`loop_enabled=1` and expected feature refusal; it now asserts validation succeeds.
The full behavioral song tests independently exercise the newly allowed path.
Malformed fields, ownership/ranges, invalid offsets/suffix periods, audio,
shipping and all v1/v2/v3 assertions remain unchanged.

The unchanged complete envelope conservatively refuses these valid shapes:

- Profile 1, two tracks / six roots, song fixture: root bound 30 > frame limit 18.
- Profile 2, eight tracks / sixteen roots, sparse song fixture: root bound
  52 > frame limit 48.

The controller explicitly confirmed retaining these refusals. Admitted sparse
profile 1 two-track/two-root and profile 2 eight-track/eight-root runtime proofs,
and profile 2's six-root fixture, are not complete-profile timing evidence.
Task 2D must measure the actual full profiles, choose admitted default-project
profiles, integrate desktop/Rust and preparation/history/snapshots, and only
then consider production feature activation. Independent review of this frozen
commit comes first. The real MIDI Arrangement journey remains mandatory; the
unrelated desktop diagnostic repair and later audio/WAV task are separate.
