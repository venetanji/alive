# Task 2C suffix loops and Seek: independent review

Verdict: APPROVED for native sub-slice 4. Spec compliance PASS; code quality
PASS. No blocking or nonblocking defect found in the reviewed change. This
approval does not activate shipping v4 or close the remaining Task 2C/2D gates.

## Scope and method

- Base: `65eb48693262dcb20d5d1585b7a3ab6e392ae68c`.
- Reviewed implementation: `a0c34e3006dc920632ec95609ff6e280a70769dd`.
- Read the task-specific brief first, the binding 2C design brief and runtime
  contract sections 2/3/4/6/8, the implementation report, and the supplied
  48,675-byte complete-context diff once. The change contains five native
  source/test files, 606 additions and 29 deletions.
- Focused surrounding-code reads addressed concrete risks in candidate
  cancellation/commit, final-source preview, deferred frame commit, source
  phase synchronization, shipping ingress and placement reservation. No
  unrelated source crawl, git operation, build, broad suite rerun, subagent,
  source/test edit or index/HEAD mutation was performed.
- The only written artifact is this review. Concurrent unrelated desktop input
  test work and the parent's PLAN/curated evidence are outside this verdict.

## Findings

None. No severity/file-line findings are raised. The following references
record the significant checked invariants rather than requested changes.

1. `apps/ultra/src-tauri/native/alive_session_workspaces.hpp:295` computes
   `O + elapsed % (L-O)` and caps the next boundary at the occurrence endpoint.
   `:343` retains the same placement and next-placement cursor at a suffix
   seam; a placement cutoff takes the distinct next occurrence/gap path.
   Descriptor work is reserved before the transition at `:403`. The Session
   branch at `:438` repeats the slot offset or retains the existing one-shot
   ended-cue behavior. No expanded repetition/event list or second clock is
   introduced. Validated offsets and minimum periods prevent zero division;
   endpoint-bounded addition avoids advancing beyond the validated placement.
2. `apps/ultra/src-tauri/native/alive_session_clips.hpp:1007` cancels candidate
   pending actions for Seek, then excludes Session authority from resolution
   and clearing. The existing phase advance synchronizes the live cursor at
   `:1306`. Active and ended Session cues therefore retain their phase and
   roots across Seek, including stopped cues. Resolution runs after reduction;
   `:1080` omits an Arrangement lookup replaced by a final due action, while
   `:1097` restores pending slot only from the authoritative Launch token.
3. The cancellation deltas at `apps/ultra/src-tauri/native/alive_session_clips.hpp:760`
   affect committed old receipts only after optional acceptance at `:1107`.
   Failed admission publishes the new rejected results without copying the
   candidate tracks/cursors or old pending deltas. Placement reservations are
   immediately retained; the expensive preview/horizon spends guard credit
   even on rejection at `:855`. The new tests establish this with an already
   committed pending scene and actual nonzero PCM continuity.
4. Preview at `apps/ultra/src-tauri/native/alive_session_clips.hpp:866` and
   actual sample execution at `:1172` use the same transition scratch. The
   final source selects chase/events. Scans are reserved before reconstruction
   at `:1199`; the combined synthetic/ordinary batch fits before transitions
   and pending action members commit at `:1244`. Changed tracks clear once
   after that admission. Existing exact-32/refused-33 and injected-fault tests
   continue to exercise this shared path.
5. Changes to old v4 expectations are limited to valid suffix-loop/Seek
   behavior that this slice now implements. Song-loop, audio, malformed,
   ownership/range/voice limits and shipping refusals remain. No public ABI,
   envelope algorithm, resource ceiling, queue/receipt capacity, or v1/v2/v3
   source/test expectation is changed in this range. Shipping request ingress
   remains explicitly disabled outside the provisional build.

## Evidence checked independently

Evidence root: `/tmp/alive-workspaces-task2c-suffix-seek`.

A read-only Python audit recomputed every entry in `source-pins.json` and
`artifact-inventory.json`: all 22 current source/fixture/library inputs match;
all 151 retained artifacts match both SHA-256 and size (106,919,451 bytes).
This includes the final native sources/tests, executables, scripts, exact-base
headers/harnesses, command records, raw traces and 71 accepted configurations.
The fixed native sources still match the reviewed pins despite unrelated
desktop work. Commit metadata identifies the requested base/head and records
the implementer's empty-index check; review did not rerun git to independently
assert current branch/index state.

Command JSON records, scripts and actual logs agree on these final checks:

| Check | Recorded result | Evidence checked |
| --- | --- | --- |
| Focused authority/multi-track/one-lane v4 | Exit 0, 49.377 s | Final build uses provisional/trace definitions, Werror and allocation/free/lock wrappers; all new and carried regressions report PASS. |
| Complete bounded oracle | Exit 0, 4.571 s | 8,576 sources; 7,620 boundaries; 144 splices; 217,600 authority cases; 12,792 native cases; 106,661,824 assertions. |
| Complete native CI | Exit 0, 175.986 s | Original native/runtime/layout/envelope/scene/receipt/capacity checks and v4 checks pass; Stop stress records 42 edit plus 42 baseline cycles and 43,008 float samples. |
| Shipping build/refusal | Exit 0, 17.538 s | Script compiles without the provisional definition; shipping admission remains disabled. |
| Exact-base RED build | Exit 0 | Pinned baseline headers and original/pending harnesses compile. Each suffix/Seek/pending-Seek child exits -6 at the expected old admission assertion. |

The report accurately distinguishes the initial prior-backend RED from the
later exact-base reconstruction. The original reduction RED log fails at the
one-probe/2054-placement assertion now present in the passing final test.
No test executable was rerun during review: the code and retained raw evidence
resolved the concrete review questions without another build or broad suite.

Raw-data checks, independently recomputed rather than accepted from summary:

- `suffix-pcm.f32`: 6,000 frames, 11,200 nonzero scalar samples, SHA-256
  `38929dd8b90f6df1fbd5f00223860786c25919b66277500906827e16d7da642d`.
  Dispatch at 0/1600/3200/3500/5100 has termination, automation, chased note 64,
  then ordinary note 60. Occurrence changes from 0 to 1 at 3500 despite shared
  source/offset; frame 5600 has no old endpoint dispatch.
- `seek-gestures-pcm.f32`: 10,240 frames, 20,480 nonzero scalar samples, SHA-256
  `db3b9852e2a191c1d4dcdec46f316caca5c45741ab3b3ec25d561dd0136dc7e9`.
  Test assertions compare the same gestures across 1/31/63/64/127/1024 and mixed
  partitions; finite and 1600/1901-period Session controls compare exact PCM
  with instrument, utility and filter chains.
- Refused-Seek and continuation-control PCM are identical: 4,099 frames,
  8,198 nonzero scalar samples each, SHA-256
  `b2df1e04d3f8e515ca75b1eb2123f4dbacbfe8c55a2325582eb9d5eb6dbcc442`.
  The receipt TSV keeps scene serial 2 pending with mask 3 and target 48000
  through both refusals; only successful Seek serial 5 cancels that scene
  with replacement reason and canceled mask 3. The test additionally checks
  byte-identical old receipt, both member tokens, sparse global slot 5, epochs,
  retained scheduled pressure, guard 9252 and placement charge 2058.
- All 10,000 `suffix-work.tsv` rows have consecutive frame indices. Recomputed
  frame/rolling-1024 maxima match the report: scheduled events 4/13, roots 3/6,
  scans 8/16, writes 21/43, placement 4/5; optional guard 9252 and placement
  2054. Every recorded descriptor-probe count fits its same-frame reserved
  placement charge. The test checks widths 1..1024 against the unchanged
  envelopes, reconstruction reads against charged scans, preview reads <=128,
  and at most one epoch increment/full-chain clear per track/sample.

## Residual gates and limits

This approval covers native source suffix loops and authority-aware Seek only.
Partial song-brace loops, loop-entry quantization/reachable targets, and the
full coincident song-seam/action/occurrence closure still require the next
independently reviewed slice. The current refusal of song loops remains
required. Native trace/envelope correctness is not real-time deadline proof:
measured profile admission, Rust/desktop integration, and the actual MIDI
Arrangement user journey remain Task 2D gates. WAV/audio remains later work.
Shipping v4 features stay zero.

The review verifies retained verification evidence and its source/artifact
integrity; it does not claim a new native CI run, hardware execution, or a
separate full ABI audit. No unresolved slice-specific defect or additional
pre-widening repair is identified.
