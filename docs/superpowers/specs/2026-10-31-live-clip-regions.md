# Live Clip Regions And Immediate Musical Editing

The reference is Live 12's Clip View, Arrangement View, editing MIDI and keyboard
shortcut documentation, corroborated by a disposable Live 12.4.6 runtime. The
installed current executable was also inspected for marker/command identities;
static strings do not establish runtime behavior. Runtime evidence is recorded
in `/tmp/alive-live-range-reference-20261031.md`.

## Behavior

- Ctrl+T inserts an empty Audio track after the selected track; Ctrl+Shift+T
  inserts an empty MIDI track. Instrument selection is a separate device action.
- Double-clicking an empty MIDI Session cell creates a one-bar clip immediately,
  including during playback. Source and occurrence creation form one Undo step.
  Audio empty cells are not fabricated MIDI-style empty clips.
- Completed musical gestures publish to playback without Prepare, Apply, edit
  confirmation, transport restart or resetting retained device roots.
- MIDI and audio editors select a time range. Ctrl+L sets and enables the
  occurrence loop from that range and moves Start to the selection start,
  matching the observed Clip View command. Arrangement Ctrl+L sets and enables
  its global loop from the selected timeline range.
- Start, End, Loop Position and Loop Length are independent named controls.
  The brace moves/resizes the loop. Start can subsequently move independently.
  Loop edits preserve source notes/audio outside the loop.
- Audio import reads real bounded WAV PCM and plays it through track effects
  and mixer. Initial audio Warp mode is explicitly Re-Pitch: tempo/rate changes
  change pitch. There is no claim of elastic time stretching or video/audio
  recording completion in this task.

## Model And Preparation

Slots and placements contain `region: ClipRegionV4` with source-beat fields
`start`, `end`, `loopStart`, `loopEnd`, `loopEnabled`. Sources retain independent
content extent. MIDI content can expand when markers expand; it is never cropped
by loop selection. Audio sources retain original file metadata plus
`sourceTempo` and `warpMode: "repitch"`; beat extent follows original duration
and source tempo. Preparation creates immutable interleaved stereo 48k PCM at
the set/source tempo ratio, owned by the prepared schedule using Arc storage.
No format migration or backward ABI compatibility is required.

MIDI instruments are optional in the saved and prepared models. Instrumentless
tracks retain editable notes and dispatch no note events. Device roles are
validated explicitly. Up to eight sparse logical tracks share the existing
six-root capacity; profile 2 and greater DSP/event work remain unadmitted.

Native occurrences use prepared `start_marker`, `end_marker`, `loop_start`,
`loop_end` frame fields and `loop_enabled`. Placement `start_frame` and duration
remain Arrangement coordinates. For looping, playback first traverses Start to
Loop End, then repeats Loop Start to Loop End. Nonlooping stops at End.

## Publication And History

Publish a complete immutable candidate schedule against unchanged ordered
device roots. Request layout: version/bytes/changed_tracks/reserved u32;
preparation_revision/bank_revision/serial/stop_epoch u64; old-to-new track[8],
source[32], slot[32], placement[64] u32 maps. NONE means removal. Native validates
ownership, correspondence, root identity and proof before callback activation.

The callback switches the bank at a boundary without allocation, free, decoding
or mutex use. Retained transport, Master, mixer/device state, active clips and
accepted pending launches survive by stable identity. Only affected sounding
tracks reconcile; unaffected roots must not reset. Removed launch targets are
explicitly canceled. Existing event and callback-work ceilings remain in force.

Publication state identifies status/error, preparation, serial, bank revision,
applied frame, Stop epoch and retired serial. Rust commits saved music/history
only after the exact matching APPLIED receipt. Pending/current/retired PCM owners
remain alive until native retirement. Rejection preserves prior music/history.
Stop cancels pending work coherently. Internal serialization may briefly show
busy state; it is not an approval workflow.

History supports empty typed track insertion/removal and restores music by
stable identity while merging current live mixer/device values. Device graph
replacement remains a separate stopped operation; empty tracks need no roots.

## Verification

Focused tests cover independent markers/intro/loop seams, source preservation,
actual PCM and effects/mixer, malformed WAV, sparse empty tracks, exact APPLIED
history commit, Undo/Redo and Stop. Native callback guards and existing launch,
MIDI Preview and shipping tests remain meaningful. Actual desktop journeys cover
rolling track/clip creation without dialogs, range-to-loop in all editors and
responsive editor controls. User application windows and the other session's
source worktree/shared development library are not replaced.
