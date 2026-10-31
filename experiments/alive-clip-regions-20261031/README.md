# Live Clip Regions, Immediate Creation And WAV Playback

Date: 2026-10-31. Base: `8dd4588`. Source worktree:
`/home/venetanji/.codex/worktrees/phase2-ui/alive`.

## Result

Ordinary workspace edits publish during playback without Prepare/Apply or an
edit-confirmation dialog. The current document and musical Undo history commit
only after the matching native APPLIED and retirement receipt. DSP roots,
current mixer/device/Master values and accepted pending launches retain stable
identity through sparse track/source/slot/placement changes.

- Ctrl+T inserts an empty Audio track; Ctrl+Shift+T inserts an empty MIDI track,
  immediately after selection. An empty MIDI track loads its instrument in a
  separate action. Eight logical tracks retain the existing six-root bound.
- Double-click an empty MIDI Session slot, or press Ctrl+Shift+M, for a one-bar
  looping clip. In Arrangement, Ctrl+Shift+M creates the selected MIDI span.
  Source plus occurrence creation is one Undo step, including while rolling.
- MIDI and audio share time selection, Ctrl+L, draggable Start/End markers and
  loop brace, and numeric Start, End, Loop Position and Loop Length controls.
  Clip Ctrl+L aligns Start with the selection and preserves End. Start can then
  move independently for an introduction before the repeated loop.
- Arrangement Ctrl+L sets the song loop from the timeline selection. Song loop,
  placement span and clip occurrence markers remain separate. Loop editing
  preserves the full original notes/sample data.
- Double-click an empty Audio slot to import a real bounded WAV. Prepared
  waveforms and stereo PCM feed native effects and the mixer. Warp is explicitly
  Re-Pitch; set tempo changes speed and pitch together.

The reference is the official Live 12 manual and a disposable Live 12.4.6
runtime. The newer installed executable was inspected separately for marker and
command identifiers. See `live-reference.md` for versions, hashes, actions,
limitations and cleanup. No undocumented binary behavior is inferred from strings.

## Verification

| Layer | Result |
| --- | --- |
| Node UI/model/controllers | 188 passed |
| Rust current-native session suite | 159 passed |
| Chromium region journeys | Six passed at 800x600, 1280x800 and 1440x1000 |
| Native | Publication, MIDI/Preview, shipping admission, ABI, launch and V1/V2/V3 pass |
| Envelope oracle | 110,195,654 assertions; independently rebuilt and passed |
| Independent reviews | Native, model/host and integrated UI clear after fixes |
| Actual desktop | Tauri/WebKit + AT-SPI/XTest + CPAL/private PipeWire journey passed |

The actual desktop journey uses the untouched Quantized MIDI music and its real
device graphs. It checks rolling typed track insertion, both empty MIDI creation
gestures, atomic Undo/Redo, MIDI selection/independent Start, WAV import and audio
selection, solo/launch/capture, Arrangement Ctrl+L and MIDI insertion, and
Save/Reopen. Saved source notes match the original. Final stream errors and
rejected commands are both zero.

Stereo capture contains 65,536 frames, peak 0.274658203125. An independently
generated four-second WAV has 330 Hz left and 550 Hz right; measured channel tone
energy fractions exceed 0.99999999. The capture, report and owned fixture are
retained here. This is software audio evidence, without a physical-device or
sustained-performance claim.

The final native library hash and exact desktop executable hashes are in
`artifact-sha256.txt`; source inputs are in `source-sha256.txt`. `commands.md`
records the commands and isolated build paths. No cloud CI was dispatched.

## Corrections From Verification

Native review caught queued Preview remapping, deletion of an active Session
slot sharing its source, optional-capability coupling, unnecessary work
reservation, and numeric ingress crossing a track-index change. Each has a
focused regression. Preview and mixer remain available when existing track
indices do not change; transport/launch retain the full publication fence.

The real Arrangement journey exposed a proof overcount: prefix-grid and
loop-grid maxima were added even when their nearest points were 96,000 frames
apart, beyond a 1,024-frame work window. The corrected half-open-window bound
takes their maximum when both cannot fit. Scalar threshold/extreme-coordinate
regressions and the original-music loop 9..13/new-placement/Undo/Redo/wrap
integration pass. Event/work ceilings remain unchanged.

UI review caught five selection/scope/capacity issues. All are fixed and
independently re-reviewed; see `independent-review.md`. Runtime output descriptions
also expose the actual visible values where WebKit's native text interface is
empty. The desktop harness checks descriptions/text through native accessibility.

Earlier desktop attempts are retained under their named `/tmp/alive-*` output
directories. They exposed a stale Alive binary (Ultra and Alive are separate
Cargo packages), an unavailable quantization choice, empty WebKit accessibility
text, a hidden diagnostic disclosure, and the real Arrangement proof overcount.
The final run keeps the original musical assertions and uses the supported
1 Bar launch setting rather than weakening playback checks. The local lld SIGBUS
was a build failure, outside playback; the build succeeded after moving this
session's target from tmpfs to disk. Its underlying cause is not established.

## Current Bounds And Next Work

WAV input is mono/stereo PCM 8/16/24/32-bit or float 32/64-bit, 8-192 kHz, at
most 24 MiB and 60 seconds per file. Prepared stereo 48 kHz PCM is bounded to
60 seconds/source and 64 MiB total. Source fingerprints and descriptor checks
remain strict. Save As rebases audio references and cannot overwrite the source.

Normal playback, fine launch and Preview have separate conservative workload
proofs. Some prefix/loop combinations refuse fine launch while 1 Bar remains
available; the retained diagnostic shows 84 against the 64-event window limit.
Refusals preserve installed music/history. Device graph changes remain stopped
operations. There is no format-conversion work in this feature.

Input routing, monitoring, record arm and live recording are next on the active
roadmap. The shared silent-video engine and the other session's native Live
device/preset work remain separate follow-up work. Existing user windows and
the other session's checkout/shared development library were preserved.
