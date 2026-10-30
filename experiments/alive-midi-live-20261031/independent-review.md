# Piano Live Edit / Preview Independent Review

Workspace: `/home/venetanji/.codex/worktrees/phase2-ui/alive`.
Base: `9105b1022225717f0ff828d9774098f70860cf63`.
Review is read-only; parent layout edits are excluded. Findings below record
their original evidence and final correction status.

## Final Assessment

**No unresolved confirmed findings remain in the reviewed snapshot.** Final
feature source hashes are recorded in `source-sha256.txt`. All issues found
during review were addressed, and native/Rust corrections were independently
verified against copied final artifacts. Parent owns integration/installation
and the separate detail-panel change.

## Findings Sent During Implementation

1. **P1: Source event-count decrease is rejected.** Original
   `alive_session_midi.hpp:189` copies all old events, then replaces the source
   and reduces `event_count` without zeroing the old tail. The existing
   `bounds_v4` unused-events check rejects Delete, Undo create and resize-to-end.
   Private native reproduction against a preserved original backend reports
   `delete accepted=0`. Independently verified fixed against corrected backend:
   `shrink-corrected.log` records `delete accepted=1`.

2. **P1: Stopped Preview survives global Stop audibly.** Original
   `alive_session_midi.hpp:75` sends a physical audition note without marking
   the track roots non-clear. `terminate_v3` then skips their reset. The native
   owner is released, but the Preview tail gate keeps audio audible. Private
   reproduction records `before Stop voices=1 preview=1`, then after 513 frames
   `voices=1 preview=0 peak=0.256555`. Parent confirmed immediate Stop semantics.
   Independently verified fixed against corrected backend: the same test now
   records zero active voices and exactly zero PCM after Stop.

3. **P1: Pending source notes can be promoted by a later live edit, then Undo
   does not restore the prior native source.** Original
   `desktop/midi.rs:45-48` tests only source shape/automation compatibility.
   Change automation A, edit note B (pending), restore automation C, edit note D:
   publishing D copies B+D from the draft, while Undo D publishes B although
   native playback before D had the original notes. The bounded fix now requires
   the before-source notes to equal the prepared source before choosing live
   publication. Worker has added a real Control/native regression, included in
   the independently rerun copied Rust native test executable.

4. **P2: The horizon retains immediate synthetic notes after they should expire.**
   Original `alive_session_midi.hpp:102-108` adds immediate note work to `past`
   but subtracts only existing ledger entries. At horizon 1024 the synthetic
   work remains. For the standard launch envelope (54 scheduled events plus
   a new 10-event MIDI reserve), every held edit is refused by `notes+64>64`.
   Synthetic expiry and double counting of past MIDI work against the future
   MIDI reserve are fixed. The standard fixture's playing/launch held-edit and
   Undo regression passes in the independently run native Rust test.

5. **P2: Explicit Preview release is dropped on Control contention.** Original
   `desktop/midi.rs:75` uses `ui_lock`/`try_lock` for release while live edits can
   hold Control for 40 ms. `alive-midi-preview.mjs:16` clears `current` before
   awaiting release and does not retry BUSY. A private producer test proves
   there is only one release attempt, even after another `release()` call.
   Native expiry therefore replaces pointer-up release for up to 2 seconds.
   Release now waits for Control rather than taking the lossy try-lock path;
   the command is explicitly moved off the Tauri main thread.

6. **P1 follow-up to release fix: A blocking Control lock must not execute on
   the Tauri main thread.** The first release fix used `.lock()` in a plain
   synchronous Tauri command. Official current Tauri 2 documentation confirms
   synchronous commands execute on the main thread unless annotated
   `#[tauri::command(async)]`. File/dialog work holds Control on a blocking
   worker and schedules dialog creation through `run_on_main_thread`, creating
   a UI freeze/deadlock risk. The command now uses
   `#[tauri::command(async)]`, moving that wait offmain.
   Source: https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/develop/calling-rust.mdx

7. **P1: AudioStop can publish false APPLIED for a newly consumed edit.**
   `alive_session_clips.hpp:984` assigns a new serial on command consumption but
   retains the old APPLIED status. The original `device_stopped` path calls
   `begin` and `publish` without applying the edit. Native reproduction against
   the first corrected backend: apply pitch64; enqueue pitch67; AudioStop;
   snapshot becomes serial2/status3/sourceRevision1 although pitch67 has not
   applied. Restart later rejects serial2 and plays pitch64. Rust would commit
   serial2's document/history while native retains serial1's music. MIDI
   completion now runs in the quiescent device-stop path, and status becomes
   QUEUED when a new serial is consumed. The independent reproduction now records
   REJECTED/status4, unchanged source revision1, and actual pitch64 on restart
   (`audio-stop-receipt-final.log`). The real Rust test also confirms unchanged
   model/history/revision after that rejection.

8. **P2: Whole-Session note-change detection treats unrelated live mixer/base/
   bypass values as musical changes.** `desktop/midi.rs:17` restores only notes,
   then compares all Project fields. With a pending tempo draft, a later live
   mixer/base/bypass command updates prepared state but leaves those fields in
   the draft unchanged. The next workspace edit clones that draft as `before`,
   then merges current live fields into `after`. The whole-Project comparison
   now fails despite the musical delta being note-only, and the note gesture
   falls back to Apply. Compare the musical projection or merge live fields in
   `before` before detection. Master coverage cannot expose this since Master is
   outside the score. Musical Projection comparison now fixes eligibility; the
   real pending tempo + live mixer/base/effect-bypass + note-edit regression
   passes against the copied final library.

## Independent Evidence

- `node-review.log`: 122/122 focused producer, piano view and DOM tests passed
  at the first review checkpoint.
- `shrink-repro.cpp`, `shrink-repro.log`: real native delete rejection.
- `stop-preview-repro.cpp`, `stop-preview-repro.log`: real stopped-Preview Stop
  residual PCM/voice evidence. Callback allocation/free/mutex wrappers enabled.
- `release-busy-repro.mjs`, `release-busy-repro.log`: producer loses a failed
  release rather than retrying the held token.
- `midi-corrected.log`: full current native fixture passes independently with
  callback allocation/free/mutex guards after the first correction set.
- `node-corrected.log`: 123/123 focused UI tests pass after UI corrections.
- `rust-native-corrected.log`: copied worker Rust executable passes its real
  native APPLIED, pending tempo/Master, history, launched source and provenance
  regression against the copied corrected library. No Cargo build performed.
- `offline-repro.log`: clean AudioOff has native flags0 and processes a source
  replacement synchronously to APPLIED without a callback. A temporary Rust
  blanket AudioOff-to-draft guard was identified as unnecessary and removed.
- First corrected `backend-corrected.o` SHA-256:
  `10425ebea60da75e25a561f49be23bfae6aae1e859f01703cab7984c46382fd9`.
- First corrected library SHA-256:
  `e36b9f5083b4fb169aa26baf3ef82566cd83d708eb4b6bb8ff70c89f301b5df5`.
- Copied Rust executable SHA-256:
  `fcf77ea47d61cefa6a2d29d92a8165352852ebd2da8b9df5170d61392f2a8eac`.
- `midi-final.log`: full final 14-case native fixture passes independently with
  callback guards. Measured 256-frame reconciliation: median 200.5 us, p95
  219.9 us, maximum 253.7 us across 32 samples with one instrument, against a
  5333.3 us deadline. This is a local measurement, not a universal worst-case
  timing claim.
- `rust-native-final.log`: final real-native Control test passes independently
  after live-field eligibility and AudioStop corrections. Includes offline
  source edit/Undo, running launch edits, APPLIED fences, rejected AudioStop
  state/history, unrelated live fields and pending-source provenance.
- `node-final.log`: final focused UI suite passes 123/123.
- `git diff --check` passes on the final reviewed workspace.
- Final native object SHA-256:
  `c527115de805aaf6df71e345a588263402f20f9a979ee995877c146c62e8030e`.
- Final native library SHA-256:
  `5786ef4b55c07a4812d94082766f3ad30ac4e1dd70cb9c3ff1672e0336b4375d`.
- Final copied Rust executable SHA-256:
  `7e98c7e6b5c667d7320717cb18937cb3d2db0619055af692cdf82d605306471a`.
- Worker desktop report was inspected, not independently rerun:
  `/tmp/alive-piano-live-edit-20261031/desktop-final/midi-report.json` reports
  the unmodified standard fixture, Preview PCM peak 0.0547476, playing edit,
  Undo/Redo, Save/reopen, stopped transport and zero stream errors. It captures
  isolated virtual audio and explicitly does not establish physical playback.
- Preserved original `backend-prefixed.o` SHA-256:
  `def8872051a4d2b2b7ba5d23bde90fe1b1703c4ce4cbd6ca95d726c653fb22ce`.
- Preserved original `libultra_native-prefixed.so` SHA-256:
  `5e5b8c3bbb8b91187a9b95385bbdff004cc9e9183462b36e3202e53e36031077`.

## Reviewed Paths / Remaining Evidence

Reviewed immutable event-bank handoff, retirement ordering, callback dispatch,
source cursors, APPLIED publication, Preview ownership/release/expiry, old-ledger
transition proof, Rust staged document/history commit, Undo/Redo, Save/Discard
fences, frontend producer and gesture routing. The pending sentinel is released
only after coherent publication, so the inspected bank lifecycle has no
established ABA/reuse defect. Native events, source descriptors and proof lookups
use the active bank, and occurrence maps retain the same indices.

No Rust build was run by this reviewer; final Rust verification executes a copied
worker-built binary against the copied final native library. The release lock's
Tauri execution policy was verified from current official documentation and the
command annotation; no independent desktop dialog-contention test was run.

The fixed 10-event optional allowance preserves the engine's existing ceilings.
Preparations whose full future launch envelope cannot leave that allowance
expose unavailable Preview/live edit and retain the draft path. The four-held
dense fixture verifies refusal while ordinary playback continues. Incompatible
pending shape/automation or already-pending source notes also retain the draft
path to avoid promoting unaccepted notes. These are current bounded-capacity
policies, not migration or legacy-support requirements.
