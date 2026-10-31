# Live transport and the shared native-device host

Research and proposal correction, 2026-10-31. Product source remains the installed
`9ced05e` checkpoint; these findings do not implement or enable native hosting.
The separate native-device worktree is read only during this investigation.

## Questions and findings

| Question | Finding | Authority |
| --- | --- | --- |
| Does stopping playback require clearing effect DSP? | Unfrozen reverb/delay tails continue after playback stops. | Official Live 12 Audio Fact Sheet, section 39.2.7. |
| Must every persistent device calculate continuously? | Live can suspend inactive effects after their remaining tail calculations finish. | Official Live 12 resource guide, section 38.1.3. |
| Does stopping a Session clip stop global musical time? | The transport can keep running after an individual Session clip stops. | Official Live 12 Session View, section 7.1. |
| How are timeline jumps reflected in MIDI playback? | Live offers MIDI note chase; Legato launch can inherit the previous clip's play position. | Official Live 12 Arrangement View, section 6.3; Launching Clips, section 16.3. |
| Why does Alive currently reset devices? | Its transition cleanup couples schedule/voice cleanup to `runtime.reset(runtime.plan())` across the track chain. | Alive source at `d3c9960` (product source `9ced05e`). |
| Is a reusable Ultra object missing? | The native worktree already implements `live.device~`, currently with only Analog admitted as an ordinary profile. | Native-worktree object contract, registry and bank implementation. |
| Is Live's exact internal reset call sequence known? | No. The documentation establishes observable behavior; no new binary trace establishes whether or when Live calls a particular native reset export. | Explicit evidence limit. |

## Official documentation

Fetched through Context7 using `/websites/ableton_en_live-manual_12`:

- [Audio Fact Sheet, 39.2.7](https://www.ableton.com/en/live-manual/12/audio-fact-sheet/): unfrozen effects process tails in realtime, and those tails continue after playback stops. Frozen tails are rendered clip audio and can stop with clip playback.
- [Computer Audio Resources and Strategies, 38.1.3](https://www.ableton.com/en/live-manual/12/computer-audio-resources-and-strategies/): idle effects can stop calculating once their remaining tail work finishes.
- [Session View, 7.1](https://www.ableton.com/en/live-manual/12/session-view/): clip Stop and global transport Stop are distinct operations.
- [Arrangement View, 6.3](https://www.ableton.com/en/live-manual/12/arrangement-view/): MIDI note chase can sound notes whose starts precede the new playback position.
- [Launching Clips, 16.3](https://www.ableton.com/en/live-manual/12/launching-clips/): Legato launch inherits clip position.
- [Working with Instruments and Effects, 23.2.4](https://www.ableton.com/en/live-manual/12/working-with-instruments-and-effects/): Hot-Swap replaces compatible device presets; MIDI effects, instruments and audio effects have distinct placement and I/O roles.

These are behavior requirements, not proof of Live's private threading,
allocation, graph-publication or device-instance implementation. The proposed
ownership/publication mechanism below is an Alive design choice to meet those
requirements. Persistent logical device lifetime does not require continuous
calculation by every silent device.

## Current source diagnosis

In the UI worktree at `d3c9960`:

- `apps/ultra/src-tauri/native/alive_session.hpp`, `discontinuity`: resets each configured device runtime before automation chase. Its callers include transport changes.
- `apps/ultra/src-tauri/native/alive_session_clips.hpp`, `clear_track`: clears MIDI bookkeeping, then resets the instrument and every effect before restoring chased parameters. `terminate_v3` routes ordinary Stop through track cleanup.
- `apps/ultra/src-tauri/native/alive_session.hpp`, `mix_track`: also suppresses output for a stopped or clipless track unless preview output is active. Retaining DSP alone would not make tails audible; the mixer gate needs the same lifecycle correction.
- `apps/ultra/src-tauri/native/alive_session_midi.hpp`: already contains held-note/preview ownership and immutable schedule-bank publication machinery. This is reusable groundwork; clearing its note table alone would lose the destinations that still need note-offs.
- `apps/ultra/src-tauri/src/session/prepare.rs`, `prepare_device`: retains the compiled graph but has no structured native-source sidecar ownership.

In the separate native-device worktree, inspected without editing:

- `docs/superpowers/specs/2026-10-31-live-device-object.md` specifies one reusable `live.device~` object, saved source state and independent document/node ownership.
- `apps/ultra/src-tauri/native/external_device/device_profiles.hpp` registers only `AnalogLiveDeviceProfile`; `apps/ultra/ui/live-device-profile.mjs` likewise rejects other devices.
- `apps/ultra/src-tauri/native/external_device/live_device.cpp`, `bind`: binds external processing without a realtime-clear callback. `patch_graph.hpp`, `clear_external_state`, disarms bindings that cannot clear in realtime.
- `apps/ultra/src-tauri/native/backend.cpp`, `ultra_canvas_install_live_devices_document` and native-state updates: exclude configured Alive sessions and use the current stopped-driver ownership fence.
- `apps/ultra/src-tauri/native/external_device/external_device.cpp`, render: passes a zero-filled placeholder transport array to foreign DSP. Supported timing/tempo data needs an explicit adapter contract; do not guess an undocumented memory layout.

Consequently, qualifying a universal hard reset is the wrong prerequisite for
ordinary clip launching and looping. Release/retrigger policy, transport
notification, automation chase and device destruction must become distinct
operations. Existing reset-based event/work bounds must change with that
separation; blindly deleting reset calls could leave stuck notes or incorrect
automation.

## Corrected shared-host direction

One `live.device~` object selects a qualified device profile. Profiles define the
musical class, event/audio ports, native identities, parameter/state mappings,
resources, supported transport/events and processing bounds. Backend adapters
handle standalone DLL or Max-external interfaces. Each device keeps its own
editor and state while using the common control family and hosting lifecycle.

1. Separate clip schedule and transport state from device-instance lifetime. Apply scheduled changes at their exact sample boundary; retain unaffected DSP and effect memory.
2. Reconcile outgoing notes/sustain and automation at Start/Stop, seek, loop and clip changes. Chase notes according to the selected policy. Deliver releases to their original instance/route, including during edits.
3. Keep the engine available after transport Stop for voice releases, effect tails and monitored/preview input. Idle processing only when supported and no audible work remains. Panic/hard clear, device removal and driver changes are separate operations.
4. Prepare structural graph/device changes off-thread; publish validated ownership/routing at a processing boundary; reclaim replaced resources off-thread. Failed preparation leaves accepted music intact. Bound retirement and any retained-tail work.
5. Extend the existing profile registry rather than copy the Analog app. Prove the shared instrument path with Analog and a second qualified profile; add explicit native audio-input and event-output contracts for effects.

An instrument proof does not establish the Max ABI or an audio effect's input
path. Corpus needs native audio-input support; Max-based devices need their own
backend adapter; MIDI effects need timed event output. These remain extensions
of the same user-facing host, not separate applications.

## Ultra installation-to-library pass

The user's follow-up selects the product workflow: after Ultra installation,
choose the Live installation folder and build a shared device library. Alive
automatically sees generated devices. Interpret automatic loading as browser
availability; devices are instantiated when explicitly dragged/loaded into a
track, not all at scan time.

Proposed flow:

1. Ultra records the selected local installation in the shared library service and starts bounded background discovery of implementations, resources, defaults and presets.
2. Qualified profiles/adapters translate supported entries into ordinary saved `.ultra` devices with typed I/O, complete source state, manifest and presentation. Each native wrapper contains the same `live.device~` object family.
3. Atomically publish generated files and a metadata index into the shared library. The current Alive user-library root is `$XDG_DATA_HOME/alive/devices`, normally `~/.local/share/alive/devices`; `session/browser.rs` already discovers it. Alive observes the new index generation and refreshes without separate configuration or restart.
4. Explicit browser drag/load creates the instance through the session's normal revision/track/compatibility checks. Unsupported profiles or unresolved presets remain visible with a specific reason and do not alter the session.
5. Rescan incrementally when the installation, profile mappings or defaults change. Preserve user-authored copies and accepted source references; publish a new generated source/index revision instead of overwriting a file used by a running session.

Generation can automate known mappings and wrapper creation. It cannot recover
an unknown DSP ABI, semantic parameter conversion or rack behavior merely by
finding a DLL or editor XML. New qualified profiles expand what the same setup
pass generates. No proprietary implementation or artwork is copied into the
repository or embedded in the generated wrapper; dependencies resolve locally.

The installed catalog currently reads saved devices and discovers unavailable
Live candidates. The folder-selection workflow, generated library/index and
automatic refresh are proposed work, not capabilities already present in the
installed checkpoint. Verify generation failure/cancellation, identical rescans,
new profile revisions, missing/moved dependencies and rescans during playback.

## Binary evidence boundary

Read-only REA session inspection reports the installed Live executable SHA-256
`f6a7e6c045c2dd19a0e0e5e8cd9cc0cb81972ebf4924ca2574c6678a081c91f6`
as the open target. The retained-evidence summary returns no records for that
target. No target was opened, closed or switched, and no Live process or native
constructor was executed by this investigation. The existing shared session is
left intact. Exact internal transport-to-DSP reset calls remain an unanswered
binary-tracing question; the design must not present a guess as observed Live
implementation.

## Acceptance before enabling browser loading

- Stable device identity through ordinary transport, clip changes and live musical edits; no construction/destruction caused merely by moving the playhead.
- Correct note-off ownership, sustain, note chase on/off, loop retrigger/legato behavior and stopped preview/monitoring; no stuck or duplicated notes.
- Retained delay/reverb tails after clip/transport Stop, continued audio on unrelated tracks, and explicit device-specific phase/retrigger policies.
- Device insertion/replacement/removal/reordering during playback with bounded publication and failure rollback; independent instances, full state save/reopen and editor closure without playback teardown.
- The same shared path exercised by two supported device profiles; audio-effect input and MIDI-effect output verified separately; processing and retirement costs measured against callback deadlines.

The [hosting proposal](../native-devices-20261031/alive-device-hosting.md) now
records this direction. Runtime implementation, native-device admission, fresh
build/install and publication remain separate work; this research does not
resume the paused broad goal or relabel the installed checkpoint.
