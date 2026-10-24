### Task 14: Scene Launching

After individual clips and eight-track admission pass, add one atomic scene-row
command using the existing quantized track actions. Empty slots stop their
tracks. Prove sample equivalence to simultaneous individual requests, all-or-none
queue failure, supersession and Stop races. Preserve selection independence,
device ownership, persistence and the complete native workflow; no arrangement.

Read the full binding `task-14-scene-design.md` before implementation. Parent
supplies accepted Task 13a/13b commits/reports; reconcile the design's frozen
`79aec9d` source anchors against those accepted implementations. Task 12 strict
v3 desktop/persistence is already accepted at `ecfed29` + `93879f5`, qualified
through exact `813ba76`. The accepted stopped-winner reducer and portable mask
helpers are prerequisites, not obsolete code to replace with the frozen design.

The design's scalar mixed-result error priority is ratified:
`RuntimeInvariant > StopCanceled > WorkLimit > EndCanceled > ReplacedRequest`.
It is a request summary; authoritative member masks describe per-track results.
Never present one reason as the distinct reason for every terminal member.

Task 13 reconciliation: production capacity checkpoint `a04f259` uses policy 1
for <=2 tracks/6 devices and the separately admitted policy 2 for larger strict
v3 sessions up to 8/16. Both have four slots/track; 16 roots, 1024 events,
32/frame, 64/1024-frame, 64 commands and 128 receipts remain. Atomic actions are
still disabled on both profiles. Eight-track preview is already bounded at 128
reads and coherent publication at 16592 bytes; measure scene reduction and the
combined work before changing either profile's feature bits. Preserve explicit
40-event refusal and unchanged 188-frame populated-fixture refusals 96 > 64.
Task 13b measured guidance is observed buffers >=512, preferring 1024 near bounds;
policy 1 retains >=256. No hard new buffer gate or automatic setting changes.

Task 13a callback-retirement ownership is accepted through `3024057`, evidence
checkpoint `e1f09e5`. Retain closure-owned metric Arcs, witnessed retirement gates,
authorized terminal Quit and scoped Stop. Typed errors and duration histograms
are per stream attempt, with 64 retained completed epochs and lifetime totals.
Pinned CPAL owned error-payload allocation/free remains outside the strict
app-owned typed-action guard; timing excludes separately measured final
clock/publication tail. No universal backend RT, physical underrun or
scheduling-lateness claim. The narrow Task13b release prerequisite atomically
stages current native libraries before Cargo tests; preserve fresh inodes.

Read task-13b-report.md for final production measurement/native artifacts and
task-13b-evidence-closure.md for parent verification. Task 13b verification fixes
change tests/report only; use the accepted latest source supplied at dispatch,
while preserving historical a04f259 timing attribution. Do not rerun historical
baselines just to rename them. New scene paths require their own same-source
timing and actual release workflow. The final 1800-second soak remains Task 15.

Task 12 reconciliation anchors, observed from frozen `16294e6`:

- `session/desktop.rs::alive_clip_action` authenticates generation/preparation,
  resolves immutable `Schedule::Clips` IDs and calls `runtime.request` once.
  Add the scene counterpart through that same owner; no renderer request serial,
  draft-map launch, per-track IPC loop or automatic retry.
- `session/runtime.rs::RequestResult` currently has only one optional track/clip
  and scalar status/reason. Extend its bounded projection to retain every scene
  member's masks/identity/outcome; a scalar status is insufficient. Preserve both
  native identity checks, terminal reuse rules and unavailable observations.
- `alive_session_clips.hpp` still uses whole-receipt `finish/candidate_finish`
  and `session_bits::first` for single-member commands. Generalize member
  transitions and stopped-winner provenance as the design requires, preserving
  mask-zero START/SEEK and the reviewed receipt-presentation regressions.

Use the same v3 ABI and saved schema, one request/queue entry/serial/target for
each prepared row, with empty members mapped to TRACK_STOP. No saved scene
object, new root/clock or per-clip device instance. Scene actions preserve dirty
state, pending history, saved defaults, local selection, editor and DSP lifetime.
Expose stopped cues distinctly from playing and retain the reserved global Stop.

Measure changed fixed reduction/publication/refusal/emergency work and preview
bounds at both supported profiles before advertising ATOMIC_TRACK_ACTIONS.
Sixty-four scene commands may visit 512 members; do not inherit the old single
member timing result. Keep 16 roots, 1024 stored events, 32/frame and64/1024;
the explicit40event fixture must still reject. Preserve accepted typed epoch
measurements and practical actual-buffer limits. No full soak here.

Write focused failing regressions first, then the design's deterministic masks,
sample equivalence, ownership, overload, Stop/end/seek/fault races and bounded
concurrent publication tests. Keep v1/v2 and all existing native/UI/history/Quit/
scoped-Stop/notice gates. Build separate Alive/Ultra and run the actual release
scene/individual/chain/editor/save/reopen workflow with per-epoch diagnostics,
short bounded CPU/PSS/worker samples, finite software stereo and screenshots.

Parent owns PLAN/ledger/PR/retained experiments. You own this source/test/source
contract slice and commit it after verification/self-review; write commands,
results, raw paths, source/build IDs, actual hardware/backend/rate/requested and
observed buffers, warnings/limits to `task-14-report.md`. Do not spawn subagents,
edit release branches, merge/tag/publish/deploy, change persistent settings or
credentials, or create cloud sessions. Atomically install rebuilt native
libraries on new inodes. Parent schedules independent review after checkpoint.
