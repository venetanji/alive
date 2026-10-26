# Current Alive / Ultra Workflow Coverage

Updated 2026-10-27 against app product `4470230`, pushed checkpoint `ad706ca`
and independently reviewed test-only MIDI runtime through `5981cfe`.
Measurement commit `8e17719` is independently approved. MIDI v4 desktop source
`4b9a88b` enables measured profile 1 and passes local native qualification;
independent review approves it after queued slot field fix `ee83d30`. The
installed launcher is still the prior
coherent product. Profile 2 and audio sources remain unavailable.
This ledger distinguishes app features,
test-only work and historical verification. It supplements the existing
[workspace plan](superpowers/plans/alive-workspaces-20261026.md); it does not
change the architecture or admission bounds. New reference captures stay private.

Priority: P0 native CI failure; P1 real MIDI Arrangement journey; P2 imported WAV
and portable mixed project; P3 separately scoped general Ultra authoring.

| Workflow | Reference action and result | Expected behavior | Current implementation | Native verification | Gap / priority |
| --- | --- | --- | --- | --- | --- |
| Session MIDI editing | R1: empty-slot double-click creates clip; note add/move/resize/delete/undo changes and restores notes. R2: naming and duplication produce distinct clips. | Four playable slots, selection separate from launch, editable pitch/time/duration/velocity, focused history. | v3 app feature, including piano roll and stopped Apply. | N1 full journey; N2 unfinished-field regression. | Preserve; qualify current CI. P0/P1. |
| Clip/scene launch and track Stop | R1: queued B leaves A playing until launch; queued track Stop leaves global transport running. | Quantized native requests/receipts, atomic scene launch, scoped Stop. | v3 app feature; corrected legacy scene disclosure and stale receipts. | N1 full journey; targeted legacy-to-v3 native transition at `6a8f644`. | Original-app atomic scene timing is not measured; Arrangement authority missing. P1. |
| Shared views, tracks and details | R3: hide/restore details preserves values; selecting a second device then returning preserves independent values. R2: compact grid/browser/detail layout. | Tab changes view only; same tracks/devices/selection; usable at 1440x900 and 1280x800. | Session shell implemented; v4 Arrangement plays through Session controls, but the timeline editor is unavailable. | N1 both Session sizes; N2 focus and playing view-switch checks. | Two real views of the same project still missing. P1. |
| MIDI Arrangement | R5: create/move/extend/undo occurrence; Session launch dims only its Arrangement track; scoped Stop keeps override; per-track/global Return restores Arrangement. | Create/place/select/drag/resize/undo/play MIDI, override one track, return at current position, save/Quit/reopen. | **Timeline editing is not an app feature.** Active MIDI v4 desktop integration, strict sources/placements, measured profile 1, Session override/Return and transactional conversion are implemented at `4b9a88b`, independently approved after `ee83d30`. | N3 exact PCM, offsets/chase/Stop/partitions and shipping refusal. Preparation oracle at `c8f6522` passes 106,661,824 bounded assertions. `0606542` adds two-active-track PCM/dispatch/work/isolation and transactional refusal proofs; complete native CI passes in 157.49s. Reviewed authority actions through `74d92d4` add quantized Launch/Return/scoped Stop, unchanged-track PCM and pending-slot boundary coherence; full native CI passes in 171.14s. Reviewed suffix loops/Arrangement-only Seek at `a0c34e3` preserve Session PCM and pending requests across refused Seek; full native CI passes in 175.99s. Song loops/coincident boundaries at `5981cfe` pass exact PCM/dispatch/work tests and independent review; full native CI passes in 180.70s. No deadline or GUI claim. | MIDI timeline edits and the complete native create/place journey. N6 proves conversion/playback/persistence, not timeline editing. P1. |
| Devices, effects and automation | R3: ordered effects; R1: stereo host connections and editor close/reopen with advancing transport. | Independent instances, explicit base/automation ownership, ordered effects, editor lifetime separate from DSP. | v3 app feature; instrument plus up to two effects, existing 8-track/16-instance bounds. | N5 full original journey passes after demonstrated native-tooltip test-input fix. | Exact-head remote CI still needed. P0. |
| Persistence and recovery | R5 saves two Arrangement occurrences plus a Session clip; New then Open restores them stopped. Invalid filename preserves project. | Restore musical/device/mixer state; actionable transactional dependency errors; pending/dirty Quit handling. | v1/v2/v3 app feature; active strict MIDI v4 persistence at `4b9a88b`, independently approved after `ee83d30`. | N5 full original save/reopen, source rejection and pending/dirty Quit passes locally. | N6 proves MIDI v4 save/Quit/process-restart exact state and playback. Audio dependency recovery remains open. R5 does not prove reference process-restart persistence or missing-media recovery. P1/P2. |
| Imported WAV and mixed project | R6: mono/stereo import, real waveforms, move, left trim/undo, Warp+Loop extension and separate Session/Arrangement clips; ordinary Save retains external references. | Decode actual PCM, derive real peaks, play through shared effects, save portable mixed project. | **Not an app feature.** Proposed descriptors/ABI do not implement decoding or playback. | No imported-PCM native/app evidence. Rendered synth WAV output is a different operation. | Decoder, runtime, waveform and portability journey after MIDI. Reference restart/missing-file recovery remains unobserved; manual fallback recorded. P2. |
| Ultra device authoring | R4: edit mode, object entry/autocomplete, connections and unknown-object state. Recorded reference save attempt did not establish saved round-trip. | Author/debug/save reusable devices, independent instances and explicit supported limits. | Substantial bounded app feature; instrument/Perform/presets. Hosted structure remains read-only. | N4 authored instrument, save/reopen, two instances and software capture at historical checkpoint. | Fresh general-authoring journey separately scoped; no broad Max conformance claim. P3. |

## Evidence And Attribution

- R1: `experiments/alive-workflow-reference-20261024/` (`coverage.json`,
  `actions.jsonl`, README), LOCAL-WF-R1. Live 12.4.6 / Max 9.1.5 on Wine 11.13.
  Actions/results establish UI behavior, not audible or sample-accurate timing.
- R2: `experiments/alive-session-ui-reference-20261026/`, LOCAL-UI-R1;
  settled `attempt2` frames. Dense Session reference, no Arrangement journey.
- R3: `experiments/alive-live-reference-20261024/`, LOCAL-R1.
- R4: `experiments/max-ui-reference/` and
  `experiments/ultra-instrument-20261024/reference/`.
- R5: LOCAL-ARR-R1/R2, private Live 12.4.6 studies on 2026-10-26. Derived findings:
  [Arrangement reference](ALIVE_ARRANGEMENT_REFERENCE.md). Captures and project
  remain outside the repository. No sound capture or timing measurement.
- R6: LOCAL-AUDIO-R1, private Live 12.4.6 study on 2026-10-26. Derived findings:
  [WAV reference](ALIVE_AUDIO_REFERENCE.md). All 113 private artifacts verify.
  No playback/timing claim; bounded restart failure and updater attribution
  limits are retained. Alive direct-PCM loops deliberately differ from Warp.
- N1: `experiments/alive-session-ui-revision-20261026/`. Full native journey
  and both viewport screenshots at `e38676a`; narrower transition verification
  after `ad47d2a` / `6a8f644`. Linux Xvfb/WebKit, software PipeWire/CPAL,
  48 kHz/512 frames. Its 30.453333 capture seconds are not endurance or physical audio.
- N2: `experiments/alive-workspaces-20261026/task1-fix1/` and
  `native-followup-97533b8/`. The latter pins the full journey to exact `97533b8`
  release assets; it does not qualify later commits.
- N3: `experiments/alive-workspaces-20261026/task2a/`, `task2b/`,
  `task2b-fix1/`, `task2c-prep/`, `task2c-midi-preparation/`,
  `task2c-authority-actions/`, `task2c-authority-actions-fix1/`,
  `task2c-suffix-seek/`, and `task2c-song-loops/`. Pure model through
  `59c6076`, provisional lane through `db39ab0`, complete oracle through
  `c8f6522`, finite multi-track runtime through `0606542`, reviewed finite authority through
  `74d92d4`, suffix-loop/Seek through `a0c34e3`, song-loop closure through `5981cfe`;
  production v4 configure/request still refused.
- N4: `experiments/ultra-instrument-20261024/`, with original source/build hashes.
- N5: `experiments/alive-workspaces-20261026/cutoff-ci-fix/`, test source
  `cc7d541`, unchanged pinned product binary. Demonstrated native-tooltip
  occlusion, focused RED/GREEN and complete original native journey in 199.087s;
  independent review approved. Software PipeWire/CPAL, 48 kHz/512 frames, zero
  final reported stream errors/rejections. 95.349333 capture seconds are not
  endurance. Harness accessibility/compositor warnings are retained.

- N6: `experiments/alive-workspaces-20261026/task2d-desktop/`, source `4b9a88b`.
  Full native/Rust/UI/browser and unchanged v3 desktop pass. Final native v4
  first plays v3, converts an admitted progression, edits notes/automation,
  exercises Session override/Return/scoped Stop and editor lifetime, then
  Save/Quit/restarts with exact state and resumed playback. Both Session sizes
  are captured. Final short-run observed 512-frame epochs have zero reported
  CPAL errors/Xruns/over-budget callbacks; provisional run2's one 13.34 ms
  callback remains retained. 15.562667 final capture seconds are not endurance
  or physical-audio evidence. Independent review approves after queued slot
  field fix `ee83d30`, with both delayed edit orders reproduced before the fix
  and passing afterward; 85 UI and two focused browser checks pass. Broad
  native evidence remains pinned to `4b9a88b`.


The saved-clip harness correction is independently approved through `a634f4d`.
A controlled launch has 30.85 ms left pending while its accessibility traversal
takes 71.58 ms; bounded early-bar synchronization preserves the original pending
and applied assertions. A separate covering-tooltip reproduction establishes
runtime disclosure interception; existing owned-window readiness fixes it.
Recording and failure screenshots cannot mask original input errors. All twelve
native checks pass on harness `6ab7775` with product `4b9a88b`; the final
screenshot guard has focused RED/GREEN coverage. Parent verifies 563712 finite
software capture frames (11.744 seconds), with zero final reported errors,
rejections or voices. This is not endurance. Original remote causation remains
unproved and exact-head remote CI remains open. Evidence:
`experiments/alive-workspaces-20261026/clip-observation/`.

Exact checkpoint `6beb210`: CI `40308165402` fails the desktop cutoff assertion
after passing UI/Chromium, native/Rust and offline renders; subsequent native
clip/resource/CPAL gates are skipped. Packages `40308165397` pass four targets
with publishing skipped. Complete earlier CI `40276304022` and packages
`40276304032` qualify `efa4280`, not current HEAD.

Checkpoint `5abd9eb` CI `40338484521` passes UI/protocol and Chromium. The Linux
job hits its 40-minute limit: Ubuntu dependency download takes 32m46s, native
build/checks pass, Rust build is canceled and downstream native journeys skip.
This is not a repeated cutoff-assertion failure. Packages `40338484480` pass
Windows and both macOS targets; Linux was canceled for the newer PR run. None of
these results qualifies the later local native preparation commits.

Checkpoint `65eb486` CI `40360213014` passes UI/Chromium, native/Rust and
offline renders, then fails to observe the first Replace chooser. The original
cause remains unconfirmed; local diagnostic runs pass the unchanged journey.
Review found a new fatal BadWindow risk in diagnostic-only commit `0bbad18`;
scoped correction `0d9ccd6` passes its native regressions. Its full original
journey fails a later changed-source status assertion: a temporary snapshot
error replaces the expected dependency guidance. Product repair `4470230`
reproduces both masking paths in mounted-view tests and preserves operation errors
alongside refresh health. Its 508 UI/18 browser tests and unchanged full native
journey (193.11s, fresh build) pass, with independent approval. No native
assertion is weakened. Packages `40360212684` pass
all four targets, with tag publication skipped. Song-loop native commit
`5981cfe` passes its full suite and independent review, but awaits measured
shipping admission; it does not add an available Arrangement interface.

Checkpoint `a1cf2e7` CI `40374437793` passes UI/Chromium, native/Rust and
offline renders, then fails to observe the first Pulse instrument editor
window. Earlier Replace choosers and effect-editor/history operations pass.
The failing activation lacks an input/invocation receipt, so its cause remains
unresolved; focus/scroll timing is a hypothesis. Later native gates skip.
Evidence: `experiments/alive-workspaces-20261026/ci-a1cf2e7/`.
Packages `40374437738` pass all four targets; tag publication is skipped.
Bounded local editor probes pass, leaving the CI cause unresolved. Diagnostic
receipts at `6d88803` preserve the original activation; review identifies a
receipt-write isolation gap. Correction `6d8c95a` passes three native RED/GREEN
failure paths and the unchanged full journey in 193.83s, with scoped re-review
approval and no remaining finding. Evidence is under `editor-activation/` in the same experiment root.

Checkpoint `ad706ca` CI `40384189184` passes UI/protocol, Chromium, native/Rust,
offline renders and the full actual desktop/editor journey. The subsequent
clip/observability journey fails waiting for transient "pending launch", while
the requested copy is already Playing/applied. Timing diagnosis is in progress;
no product cause or completed clip journey is claimed. Later resource/CPAL
gates skip. Packages `40384188941` pass all four targets, with tag publication
skipped. Retained exact-head results: `experiments/alive-workspaces-20261026/ci-ad706ca/`.

MIDI measurement `8e17719` completes 287 distributions / 344400 timing samples
with separate callback guards, full native CI and current-source shipping
refusal checks. Independent review approves with one nonblocking runner
completeness gap; the audited final run is unaffected. The desktop scope is
profile 1 at practical buffers of at least 256 frames. Profile 2 remains
unadmitted because its combined synthetic stress exceeds the deadline even at
1024 frames. Synthetic workload limitations and all failures are retained in
`experiments/alive-workspaces-20261026/task2d-measurement/`. This is software
processing evidence, not a desktop feature or physical audio qualification.

## Reference Gaps For The Next Increment

R5 covers creation, movement, both edge edits/source offsets, Escape gesture
cancel, rename-focused Tab, delete/undo/redo, cross-track movement and partial
overlap cropping. Alive's initial overlap refusal is a deliberate scoped
difference. Playing override/return and save/new/open are observed; Return in a
gap is UI-only with No Audio and stationary transport. Running gap return,
precise queued state, process-restart persistence, hosted device state and
missing-media recovery remain unobserved in this study. Existing Session note-edit
evidence can be reused. R6 now covers actual WAV import/placement/trim/loop and
mono/stereo waveform display. Its bounded restart failed, so missing-source
recovery uses clearly labeled official documentation fallback. The native Alive
WAV journey must still prove restart, dependency errors and portable recovery.

Historical experiment READMEs and manifests retain their original findings,
including old feature counts, missing hosting and prior failed regressions.
They are source-pinned evidence, not current product status. Use this ledger,
`PLAN.md`, `PRODUCT.md` and the application READMEs for current scope.
