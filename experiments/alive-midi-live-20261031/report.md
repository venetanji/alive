# Live MIDI editing and Preview qualification

Date: 2026-10-31. Workspace: `/home/venetanji/.codex/worktrees/phase2-ui/alive`.
Base parent timeline fix: `9105b10`. Feature uncommitted and uninstalled; parent
owns independent review and integration. User applications/projects and shared
native symlinks were not changed. All builds/captures use the private tmp folder.

## Result

Current V4 profile1 source-note gestures publish to the native owner while Audio
runs, without Prepare/Apply, transport restart or DSP-root replacement. Normal
AudioOff also commits immediately through existing quiescent native ownership.
Rust changes prepared music/history only after native APPLIED. Undo/Redo use the
same transaction. Shared source references, pending launch target/grid, source
automation, prepared tempo, device/base/bypass/mixer/Master values and unrelated
pending musical edits are preserved.

Preview is set-wide transient session UI state, initially off. Piano keys, note
selection/move, keyboard moves and Add note gestures use real native instrument
sound. A coalescing producer handles exact returned tokens and late responses.
Release/cancel/blur/scope/dispose terminate ownership; native expiry is2 seconds.
Ordinary release allows up to0.5 seconds of native release tail. Global Stop and
AudioStop clear Preview roots/tails immediately. Loop/launch/seek/root resets end
Preview ownership; they do not attempt an unbudgeted retrigger. This is explicit
local policy, not an assertion about undocumented Ableton internals.

## Admission and honest refusal

Existing global32-event/frame and64-event/rolling1024-frame ceilings are unchanged.
The optional MIDI feature reserves10 events per1024 frames, including a guaranteed
future Preview release. The actual MIDI ledger shares this allowance across source
reconciliation and Preview. Complete ordinary/fine-launch proofs and old scheduled
ledger/new candidate horizon must pass. Source scan and horizon guard work is
charged before callback execution; no callback allocation, free or mutex.

Untouched Quantized MIDI proves15/frame36/window ordinary and15/frame54/window
fine;54+10 fits64. Earlier16 allowance was rejected by the window proof. A four-held
note test source proves21/frame48/window ordinary but21/frame72/window fine and
therefore refuses optional capability while ordinary playback remains valid.
The arithmetic8 reconciliation events+1 release fits10, but that dense fixture
cannot obtain the prerequisite complete fine proof. No4-held rollout claim.

A source with already-pending notes, pending incompatible length/automation, or no
prepared identity stays on the explicit draft/Apply path. Prior pending notes are
never silently promoted by a later gesture. Runtime guard exhaustion refuses the
edit and preserves music/history; UI reports refusal. There is no timed retry.

## Verification

- Native feature fixture:17 scenarios passed, callback malloc/free/mutex guards.
  Held replacement, unchanged held pitch, velocity-only future note-on, inactive
  source activation, stopped PCM,
  collision, expiry, immediate Stop, exact note-off/loop, stopped consecutive
  edits, shrinking4->2->1->0 events (delete/source-end/Undo-create shape), shared
  slot offsets and same-frame pending launch, event ceilings/reserved release,
  dense capability refusal, AudioStop receipt/restart consistency.
- Native timing sample:32 reconciliation callbacks at256 frames, one instrument:
  median218.2us, p95229.4us, max231.9us versus5333.3us block duration. This is a
  local sample, not a new worst-case profile certification. O2 backend, guards on.
- Existing launch regression and V4 shipping admission fixture passed on final
  native object/library. Ordinary admission ceilings remain unchanged.
- Rust session suite139 passed. Actual native host test uses untouched Quantized
  MIDI (no simplification), stopped and launched held-note publication, Undo/Redo,
  pending tempo plus live gain/base/effect-bypass/Master, queued AudioStop rejection
  retaining history/revision, pending-note provenance and AudioOff immediate Undo.
- Node UI suite168 passed, including concurrently added parent panel tests.
- Browser12 focused tests passed; Preview tested at1440x900,1280x800,1024x768,
  800x600, plus compact maximized toolbar non-overlap. Four captures inspected.
- Real isolated desktop journey passed on standard Quantized MIDI using actual
  AT-SPI/XTest, CPAL/PipeWire and native app: Preview PCM peak0.0547476 over39424
  frames; launched playback pitch/velocity edits without Apply; Undo/Redo;
  Save/reopen notes; Stop; zero stream errors. No synthetic IPC or browser audio.
  First run's Undo click was obstructed by the diagnostics disclosure; explicit
  disclosure closure fixed the test navigation. Failure artifact retained.
- Impeccable detector reports only inherited palette advisories. Preview toolbar
  now wraps without overlapping Time at800px. `git diff --check` passes.

## Independent review fixes

Unused source event suffix is zeroed before proof. New serial immediately receives
QUEUED, never an earlier APPLIED status. AudioStop completes/cancels queued MIDI
before coherent publication; restart plays the last APPLIED notes. Immutable bank
retirement happens after coherent publication. Stop clears stopped Preview roots
and tails. Tauri release waits off the main thread, preserving release behind a
brief control transaction. Past/future optional work shares one allowance and
synthetic current events expire correctly in the horizon. Note eligibility uses
musical projection, excluding stale pending-draft copies of live mixer/device
fields, and separately requires before-notes to match prepared notes.

## Artifacts and limits

Small evidence is archived at `experiments/alive-midi-live-20261031`. Build outputs,
PCM and intermediate screenshots remain `/tmp/alive-piano-live-edit-20261031`.
`source-sha256.txt` and `artifact-sha256.txt` identify the reviewed implementation
and private binaries. `commands.md` gives exact reproduction commands.
Independent native/Rust review reports no unresolved confirmed findings. Parent
integration and any installation remain outstanding. No legacy
format migration, old-library compatibility rollout, or new audio-source support.

Final desktop-verified run uses the exact frozen Alive/Ultra/native hashes in
artifact-sha256.txt; all journey assertions passed again after final Rust fixes.
