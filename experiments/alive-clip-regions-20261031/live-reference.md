# Live range, loop, start-marker and creation reference

Study date: 2026-10-31. Read-only reference task for Alive phase2 UI work.

## Direct runtime findings

Observed in Ableton Live 12.4.6 (Build 2026-09-10_0de5c8fa9a), running under
Wine in a new disposable prefix on private Xvfb display :176. Runtime binary
SHA-256: fdc11a99a6a02c715115ed028becc29c1a2e3b67604ca99e22a81bbfd9d96c6e.
This differs from the currently installed binary inspected statically below.

All screenshots, timestamped action receipts, launcher helper and cleanup
receipt are in `/tmp/alive-live-range-reference-20261031/`.

| Question | Observation | Evidence |
| --- | --- | --- |
| Empty Session MIDI clip | Double-clicking an empty MIDI slot creates the clip immediately; default Start/Position 1.1.1, End 2.1.1, Length 1.0.0, Loop enabled | 03-midi-created.png, 04-editor-expanded.png |
| MIDI time selection | Dragging blank piano-roll space selects a time range, visibly shading the full time span | 05-time-selected.png: Start 1.2.1, End 1.4.1, Length 0.2.0 |
| MIDI Ctrl+L | The selected range becomes the loop and the clip Start also moves to the selection start: Start 1.2.1, Position 1.2.1, Length 0.2.0. Clip End remains 2.1.1 | 06-clip-ctrl-l.png |
| Independent clip Start | Dragging the lower Start triangle from 1.2.1 back to 1.1.1 changes Start alone. Loop stays Position 1.2.1, Length 0.2.0 | 07-start-independent.png |
| Creation while transport rolls | With advancing transport, double-click an empty slot on MIDI track 2: clip appears and opens immediately with its default one-bar loop. No edit confirmation and no stop | 11-rolling-before-create.png (1.1.3) to 12-rolling-empty-clip-created.png (10.1.1) |
| Ctrl+T during playback | Inserts an audio track immediately after the selected MIDI track; selected empty slot changes to the new audio track, transport continues | 13-rolling-audio-track-created.png (10.2.3) |
| Ctrl+Shift+T during playback | Inserts a MIDI track immediately after the newly selected audio track; transport continues | 14-rolling-midi-track-created.png (10.3.4) |
| Arrangement range to loop | Dragging 5.1.1 through 13.1.1 selects eight bars. Ctrl+L moves the song loop brace to that range and enables the global loop button | 16-arrangement-time-selected.png, 17-arrangement-ctrl-l.png |
| Arrangement empty MIDI source | Ctrl+Shift+M over that selected MIDI-track span immediately creates an eight-bar MIDI clip, with local Start/Position 1.1.1, End 9.1.1, Length 8.0.0, Loop enabled | 18-arrangement-new-midi-clip.png |
| Audio range to loop | An owned eight-second WAV imported into an audio track has Warp enabled. Select sample time 2.1.1 through 4.1.1, then Ctrl+L: Start 2.1.1, Loop Position 2.1.1, Length 2.0.0, Loop enabled. End stays 5.1.1 | 28-audio-time-selected.png, 29-audio-ctrl-l.png, 30-audio-ctrl-l-fields.png |

The Start triangle sits in a lane below the loop brace. Moving it independently
allows an introduction before the repeating loop. Ctrl+L deliberately aligns
Start to the new selection start for both witnessed MIDI and audio clips.
Changing loop bounds did not crop the source or automatically change End.

### Runtime limitations

- Audio fixture: `/tmp/alive-live-range-reference-20261031/fixtures/RangeAudio.wav`,
  generated here, eight seconds, mono, 44.1 kHz, 16-bit PCM, all samples zero.
  This witnesses UI state changes, not audible transient quality or time-stretch.
- Audio sample editor used Warp on / Beats mode. Unwarped audio looping and
  Re-Pitch behavior were not exercised. The manual requires Warp for audio Loop.
- Transport was made to advance by switching only the disposable prefix's
  copied audio preferences from PipeASIO to MME/DirectX. Test Tone stayed Off.
  There was no microphone recording.
- No attempt was made to characterize the exact audio-buffer timing of edits
  or note retrigger/release semantics. That requires separate engine validation.
- Copied startup recovery and crash-report UI were dismissed only inside the
  disposable runtime. The application downloaded an update into that disposable
  prefix; it was never restarted or applied to the source/original installation.
- No ALS project was saved in this pass. Screenshot fields are direct runtime
  evidence; older retained ALS data below separately establishes saved fields.

## Official Live 12 documentation

Retrieved with Context7 from `/websites/ableton_en_live-manual_12` during this
task. Manual and direct runtime findings agree on these points:

- Ctrl+T creates an audio track; Ctrl+Shift+T creates a MIDI track.
- Empty MIDI Session slots: double-click, or select and use Ctrl+Shift+M.
  Empty MIDI clips default to a one-bar loop. Alt+double-click also arms and
  launches. Arrangement supports double-click or time selection + Ctrl+Shift+M.
- Arrangement time selection + Ctrl+L sets/enables the song loop brace.
- MIDI blank-space drag selects time (and enclosed notes). Enter switches
  between a time span and contained notes; Esc collapses the time selection.
- Clip Start and Loop Position/Length are independent. Launch begins at Start,
  so an introduction can precede the loop. Loop bounds can change during play.
- Audio Loop requires Warp enabled. Loop editing is nondestructive; cropping
  is a separate Ctrl+Shift+J operation.
- Selected Arrangement brace keyboard behavior: Left/Right nudge; Up/Down
  move by the loop length; Ctrl+Left/Right changes length; Ctrl+Up/Down
  doubles/halves length.

Sources:

- https://www.ableton.com/en/live-manual/12/clip-view/ (8.2.1, 8.9, 8.11)
- https://www.ableton.com/en/live-manual/12/editing-midi/ (10.3, 10.5.2, 10.7.3)
- https://www.ableton.com/en/live-manual/12/arrangement-view/ (6.6, 6.9)
- https://www.ableton.com/en/live-manual/12/mixing/ (18.2)
- https://www.ableton.com/en/live-manual/12/recording-new-clips/ (19.3.2, 19.3.3)
- https://www.ableton.com/en/live-manual/12/live-keyboard-shortcuts/

## Current installed binary: bounded static evidence

Artifact: `/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Program/Ableton Live 12 Suite.exe`.
SHA-256: f6a7e6c045c2dd19a0e0e5e8cd9cc0cb81972ebf4924ca2574c6678a081c91f6.
Architecture: x86_64 PE. REA open_binary succeeded; its native session is closed.
Ghidra is unavailable and Hopper had previously timed out, so no decompiled
control-flow conclusion is claimed. Bounded `strings -a -t x` found:

| File offset (hex) | Identifier |
| --- | --- |
| 6b2b5c8 | .ClipViewLoopBar.LoopStartMarker |
| 6b2b708 | .ClipViewLoopBar.StartMarker |
| 6b2b738 | .ClipViewLoopBar.LoopEndMarker |
| 6b2add8 | .LoopLength |
| 6c479d0 | InsertMidiTrack |
| 6c479e0 | InsertTrack |
| 6c47a68 | LoopSelection |
| 6cec7b8 | OSetLoopStartCommand |
| 6cec858 | OSetLoopLengthCommand |
| 6cec870 | OSetLoopStartAndLengthCommand |
| 6e54f00 | sMenuLoopSelectionOrActivateDeactivateLoop |
| 6e54f30 | sMenuLoopSelection |
| 6e566e0 | sInfoTextHeaderMenuLoopSelection |
| 6e56708 | sInfoTextMenuLoopSelection |

These identifiers corroborate separate concepts; they do not establish runtime
behavior for this newer binary. No authentication, licensing or protected media
was investigated.

## Existing retained evidence

`/home/venetanji/.cache/alive-arrangement-reference-20261026/` contains an older
Live 12.4.6 reference study with the same runtime SHA above: screenshots,
`observations.json`, `actions.jsonl` and an owned ArrangementStudy set. Its ALS
shows independent LoopStart, LoopEnd, StartRelative, LoopOn and OutMarker fields.
It also witnesses that extending an Arrangement placement repeats the clip
without extending the source loop bounds. It does not establish the newer
installed binary's behavior.

## Cleanup and isolation

`/tmp/alive-live-range-reference-20261031/cleanup.json` confirms:

- Original and source-prefix preference digests match the pre-launch values.
- `preferences_unchanged: true`.
- `owned_processes_after: []`.
- `xvfb_exited: true`.
- `prefix_removed: true`.

Only owned-prefix processes were terminated. The two source checkouts, user
projects, original Wine preferences, cloned source prefix and other session's
files were not edited. The removed private prefix was
`/home/venetanji/.cache/alive-live-range-runtime-20261031/wine-disposable`.

## Implementation consequences for Alive

1. A persistent time selection must be available in Arrangement and MIDI/audio
   clip editors, with Ctrl+L routed to the editor that owns keyboard focus.
2. Clip Ctrl+L sets/enables the selected loop and aligns clip Start to its start;
   a separately draggable Start marker stays available afterward.
3. Keep source length/end, loop range and Arrangement placement span separate.
   Editing the loop must not crop notes/audio or silently rewrite placements.
4. Create clips and tracks immediately while transport runs. Creation must not
   enter a pending Apply/Cancel state or require stopping playback.
5. Make track creation visible in menus/context menus, with Ctrl+T for audio and
   Ctrl+Shift+T for MIDI, and insert after the selected track as witnessed.
6. UI state parity alone is insufficient: validate engine loop boundaries,
   playback start offsets and live edit behavior separately with meaningful tests.
