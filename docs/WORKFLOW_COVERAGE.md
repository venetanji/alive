# Current Alive / Ultra Workflow Coverage

Updated 2026-10-26 against app product `6beb210`, test correction `cc7d541`
and test-only finite multi-track MIDI runtime `0606542`.
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
| Shared views, tracks and details | R3: hide/restore details preserves values; selecting a second device then returning preserves independent values. R2: compact grid/browser/detail layout. | Tab changes view only; same tracks/devices/selection; usable at 1440x900 and 1280x800. | Session shell implemented; Arrangement visibly unavailable. | N1 both Session sizes; N2 focus and playing view-switch checks. | Two real views of the same project still missing. P1. |
| MIDI Arrangement | R5: create/move/extend/undo occurrence; Session launch dims only its Arrangement track; scoped Stop keeps override; per-track/global Return restores Arrangement. | Create/place/select/drag/resize/undo/play MIDI, override one track, return at current position, save/Quit/reopen. | **Not an app feature.** Pure v4 model, independently reviewed complete envelopes and provisional finite multi-track native runtime; active Document remains v2/v3 and shipping v4 feature bits are zero. | N3 exact PCM, offsets/chase/Stop/partitions and shipping refusal. Preparation oracle at `c8f6522` passes 106,661,824 bounded assertions. `0606542` adds two-active-track PCM/dispatch/work/isolation and transactional refusal proofs; complete native CI passes in 157.49s and independent review approves. No deadline or GUI claim. | Authority/loops, 2D admission/readers, then MIDI timeline edits. P1. |
| Devices, effects and automation | R3: ordered effects; R1: stereo host connections and editor close/reopen with advancing transport. | Independent instances, explicit base/automation ownership, ordered effects, editor lifetime separate from DSP. | v3 app feature; instrument plus up to two effects, existing 8-track/16-instance bounds. | N5 full original journey passes after demonstrated native-tooltip test-input fix. | Exact-head remote CI still needed. P0. |
| Persistence and recovery | R5 saves two Arrangement occurrences plus a Session clip; New then Open restores them stopped. Invalid filename preserves project. | Restore musical/device/mixer state; actionable transactional dependency errors; pending/dirty Quit handling. | v1/v2/v3 app feature; v4 only pure model tests. | N5 full original save/reopen, source rejection and pending/dirty Quit passes locally. | Real v4 save/Quit/reopen missing. R5 does not prove process-restart persistence, device state or missing-media recovery. P0 then P1. |
| Imported WAV and mixed project | R3 shows empty Simpler/Sampler only; no sample import/playback observation. | Decode actual PCM, derive real peaks, play through shared effects, save portable mixed project. | **Not an app feature.** Proposed descriptors/ABI do not implement decoding or playback. | No imported-PCM native/app evidence. Rendered synth WAV output is a different operation. | Reference import/trim/loop/recovery; decoder, runtime, waveform and portability journey after MIDI. P2. |
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
- N1: `experiments/alive-session-ui-revision-20261026/`. Full native journey
  and both viewport screenshots at `e38676a`; narrower transition verification
  after `ad47d2a` / `6a8f644`. Linux Xvfb/WebKit, software PipeWire/CPAL,
  48 kHz/512 frames. Its 30.453333 capture seconds are not endurance or physical audio.
- N2: `experiments/alive-workspaces-20261026/task1-fix1/` and
  `native-followup-97533b8/`. The latter pins the full journey to exact `97533b8`
  release assets; it does not qualify later commits.
- N3: `experiments/alive-workspaces-20261026/task2a/`, `task2b/`,
  `task2b-fix1/`, `task2c-prep/`, `task2c-midi-preparation/`. Pure model through
  `59c6076`, provisional lane through `db39ab0`, complete oracle through
  `c8f6522`, finite multi-track runtime through `0606542`;
  production v4 configure/request still refused.
- N4: `experiments/ultra-instrument-20261024/`, with original source/build hashes.
- N5: `experiments/alive-workspaces-20261026/cutoff-ci-fix/`, test source
  `cc7d541`, unchanged pinned product binary. Demonstrated native-tooltip
  occlusion, focused RED/GREEN and complete original native journey in 199.087s;
  independent review approved. Software PipeWire/CPAL, 48 kHz/512 frames, zero
  final reported stream errors/rejections. 95.349333 capture seconds are not
  endurance. Harness accessibility/compositor warnings are retained.

Exact checkpoint `6beb210`: CI `40308165402` fails the desktop cutoff assertion
after passing UI/Chromium, native/Rust and offline renders; subsequent native
clip/resource/CPAL gates are skipped. Packages `40308165397` pass four targets
with publishing skipped. Complete earlier CI `40276304022` and packages
`40276304032` qualify `efa4280`, not current HEAD.

Checkpoint `5abd9eb` CI `40338484521` passes UI/protocol and Chromium. The Linux
job hits its 40-minute limit: Ubuntu dependency download takes 32m46s, native
build/checks pass, Rust build is canceled and downstream native journeys skip.
This is not a repeated cutoff-assertion failure. Packages `40338484480` pass
Windows and both macOS targets; Linux is still running at this check. None of
these results qualifies the later local native preparation commits.

## Reference Gaps For The Next Increment

R5 covers creation, movement, both edge edits/source offsets, Escape gesture
cancel, rename-focused Tab, delete/undo/redo, cross-track movement and partial
overlap cropping. Alive's initial overlap refusal is a deliberate scoped
difference. Playing override/return and save/new/open are observed; Return in a
gap is UI-only with No Audio and stationary transport. Running gap return,
precise queued state, process-restart persistence, hosted device state and
missing-media recovery remain unobserved in this study. Existing Session note-edit evidence can be
reused. Before WAV work, observe actual import/placement/trim/loop/waveform and
missing-source recovery.

Historical experiment READMEs and manifests retain their original findings,
including old feature counts, missing hosting and prior failed regressions.
They are source-pinned evidence, not current product status. Use this ledger,
`PLAN.md`, `PRODUCT.md` and the application READMEs for current scope.
