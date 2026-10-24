# Live And Max Workflow Reference, 2026-10-24

This bounded study uses installed Live 12.4.6 Suite and Max 9.1.5 through Wine
11.13 on Linux. It fills piano-roll and clip-launch gaps in
`../alive-live-reference-20261024/` and reuses `../max-ui-reference/` for earlier
Max controls/patching observations. It supplies workflow reference for Alive,
without recovering proprietary implementation code or DSP.

## Observed Workflow

`LOCAL-WF-R1` means the screenshots, `actions.jsonl`, session metadata and cleanup
receipt in this directory. `coverage.json` links questions to exact frames.
These are actual application observations, except where explicitly marked as
inference or installed-documentation statements.

| Question | Observation | Evidence |
| --- | --- | --- |
| Create a clip | Double-clicking an empty MIDI slot creates a one-bar looping MIDI clip and opens its editor. Transport, slots and mixer stay visible above it. | `08-clip-created.png` |
| Add a note | A double-click in the fixed 1/16 grid adds and selects a 1/16 note: B1/MIDI 47 at 1.2.3, velocity 100. | `09-add-note.png` |
| Move a note | Dragging its body moved it one 1/16 step and two semitones: C#2/MIDI 49 at 1.2.4. Duration stayed 1/16. | `10-move-note.png` |
| Resize a note | Dragging its right edge preserved start/pitch, extending its end to 1.3.3, duration 3/16. | `11-resize-note.png` |
| Velocity | Dragging its velocity marker changed velocity from 100 to 1. The marker and note highlight identify the same note. Drag sensitivity was not measured. | `12-velocity.png` |
| Delete, undo, select | Delete removed the note. Ctrl+Z restored it. After adding a second note, clicking the original selected only it and restored its pitch/velocity readout. | `13-delete-note.png`, `16-selected-note.png` |
| Grid | The context menu shows Snap to Grid enabled and Fixed Grid 1/16 selected, with other fixed subdivisions and adaptive-grid options. | `15-grid-menu.png` |
| Clip metadata | The clip panel exposes position, loop length and signature. Its Launch section shows Trigger and Quantize=Global. | `18-launch-panel.png` |
| Duplicate and edit | Ctrl+D created a copy in the next slot with both notes. Changing its loop length to 2 bars left the original at 1 bar. | `19-duplicate-clip.png`, `20-duplicate-two-bars.png`, `21-original-one-bar.png` |
| Select versus play | Clicking the body selects a clip; its separate triangle launches it. A queued clip can be selected while another clip in that track plays. | `36-b-queued-phase1.png`, `38-b-running.png` |
| Quantized switching | With Global=1Bar at 40 BPM, A plays at 1.1.1. Requesting B leaves A playing at 1.2.1; B's indicator changes between queued captures. B later plays at 2.2.4, with A inactive. This is consistent with the displayed one-bar setting; no sample-accurate boundary was measured. | `35-a-running.png`, `36-b-queued-phase1.png`, `37-b-queued-phase2.png`, `38-b-running.png` |
| Track stop | A stop request at 2.3.1 leaves B playing initially. The stop indicator changes between captures. At 3.3.4 the track is stopped while global transport continues. | `39-stop-queued-phase1.png`, `40-stop-queued-phase2.png`, `41-track-stopped-transport-running.png` |
| Max host boundary | A Max Audio Effect loaded on audio track 3. The compact host view shows separate L/R connections from plugin~ to plugout~. Its context menu offers Edit in Max. | `44-device-context.png` |
| Editor lifetime | Edit in Max opened the patcher. Ctrl+W closed it while the host retained the device. Reopening/closing again left visible transport running: 9.4.3 during reopening, 13.1.2 after closing. This establishes UI/transport continuity only. | `49-host-running-editor-closed.png`, `50-editor-reopened-transport-running.png`, `51-editor-cycle-host-running.png` |

Earlier Live evidence already answers selected-track chain organization,
instrument followed by effects, pane visibility persistence, and independent
Delay values on two tracks. Its `LOCAL-R1` frames 13, 15, 17, 19, 21, 25 and 26
were reused rather than repeated.

## Max Metadata And Ownership

`LOCAL-WF-S1` is `max-documentation-inventory.json`: six installed source
identities, 20 parameter field names, short derived observations and limits.
It does not redistribute documentation bodies or factory patches.

- The plugin~ reference defines explicit host audio input channels, with two
  channels documented as the default and optional logical input arguments.
- The plugout~ reference defines output to the host for effects/instruments. Its
  prose includes legacy stereo descriptions alongside a Maximum Channels
  facility. Current multichannel layouts and limits were not exercised.
- Metadata distinguishes a Long Name unique per patcher hierarchy, compact
  Short Name, Type, Range/Enum, Initial, Unit Style, Steps, Exponent, Visibility
  and undo/update behavior. These support a compact generated parameter panel.
  Stable instance IDs remain an Alive design choice.
- Preview Mode documentation describes TWO device copies while editing: an
  editor copy and a track copy. Preview disables the track copy and adds
  latency. It says parameter state synchronizes when toggling preview, arbitrary
  object memory does not, and preview parameter edits are undoable in Live.
  These are documentation statements, not measured execution here.

Alive should preserve its specified single native audio owner and optional
editor view. Live/Max does not establish that ownership model; its documented
preview model differs. Sound, DSP object count, process sandboxing, callback
lifetime, parameter transfer and audio continuity were not measured by the
editor exercise.

## Environment And Preservation

`runtime.py` derives from the earlier harness. It uses a fresh reflink copy of
the existing disposable source prefix and checked private Xvfb `:164` at
1440x1000. XTest never targeted the desktop. Original executable hashes match
earlier evidence (`target-identities.json`). No original project, preference,
authorization state or setting was edited. The copied profile has no home-folder
symlinks.

The copy carried a stale recovery prompt and automatic-update setting. Recovery
was declined and the report pane closed; no report was sent. Live reported an
update downloaded for its next launch. No second launch occurred and the entire
runtime copy was removed.

Initially, the copied PipeASIO setting showed a stationary clock even with a
green play icon. Those attempts did NOT establish playback; their screenshots
were discarded. Changing ONLY the disposable copy to MME/DirectX started the
clock. The visible settings were 44100 Hz, input 8192 frames and output 4096
frames (`33-driver-confirm.png`). A MIDI track with no instrument supplied note
and clip indication. Sound/routing were not measured and the test tone stayed
off. This is UI scheduling evidence, not a physical audio/MIDI test or an audio
performance measurement.

Max also surfaced previous own test patchers restored from the copied profile.
They were not edited or saved. Only the device patcher received editing
shortcuts. The harness explicitly raised the owned Live window because this
private Xvfb had no window manager.

`cleanup.json` confirms the original Ableton/Max preference inventory (33 files)
and source-copy inventory (1081 files) retained before/after digests, all
readable processes matching the owned WINEPREFIX exited, Xvfb exited and the
copy was removed. This is a scoped preference hash check, not a trace of all
filesystem activity. REA separately retains inaccessible processes as unknown;
it does not certify every process on the machine.

## REA Evidence And Limits

The session initially had no bound target or retained record. Native UI
observation is macOS-only; Xvfb/XTest supplied actual Linux/Wine pixels/actions.
No native analysis session was opened, so none remained to close.

REA process Evidence ID:
`ev_38caa376a1ada0fb3b85fd4abb39d1449b48d9425ffbb1fb95e75ace861f43f1`.
It records the owned Python launcher and process lifecycle from 00:56:51Z to
01:08:02Z, exit code 0, untruncated terminal output and cleanup. The MCP client
stopped waiting after 300 seconds, but the server retained the completed record;
it was discovered by summary and exported once to `rea-evidence-bundle.json`.
The runtime was not repeated to recover that response.

That process record does not itself encode the separate XTest actions/pixels.
`LOCAL-WF-R1`, full action receipts, screen digests and preservation receipts
provide those observations. REA's four residual unknowns about full filesystem,
environment, process and network behavior remain open. The capture supplies
neither a security sandbox nor network isolation.

Basic editing questions are answered at UI level. Quantized launch/stop is
observed as queued-to-running/stopped state; exact audio boundary timing is
unresolved. Selected-track chains reuse prior evidence. Max ports/metadata are
partially answered by visible stereo connections and installed documentation.
Editor/host parameter transfer, source replacement, saved round trips, audio
continuity and current multichannel limits remain unresolved. No broader Max
compatibility or DSP claim follows.

## Verification And Reproduction

```sh
python3 experiments/alive-workflow-reference-20261024/verify.py
python3 experiments/alive-live-reference-20261024/verify.py
uv run --no-project --with-requirements apps/ultra/tests/ci/requirements.txt python experiments/max-ui-reference/verify.py
```

The verifier checks retained hashes, screenshot dimensions, original target
identities, action/coverage references and scoped cleanup. It does not run Wine.
All three commands passed. The Max verifier uses the repository's pinned
environment because system Python lacks jsonschema. `validation.json` records
the exact scope and results.
For another runtime, read `runtime.py`, select fresh evidence/cache paths and
check an unused private display. The harness refuses existing runtime/session
paths. Follow the action sequence using current screenshots: startup panes can
change geometry, so blind coordinate replay is not a reliable test.

Transient/startup and failed-launch screenshots were discarded. Their receipts
remain in `actions.jsonl`; the manifest lists retained/discarded captures. No
binaries, preset bodies, factory patch files, sample media, proprietary resource
payloads or implementation code are included.
