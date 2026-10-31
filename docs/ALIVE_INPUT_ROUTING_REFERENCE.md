# Live Input Routing And Record Arm Reference

Study date: 2026-10-31 (Asia/Hong_Kong). This is a bounded UI observation and
official-manual study, not proof of working input audio or recording in Alive.

## Sources And Evidence Boundary

Runtime target: Ableton Live 12 Suite 12.4.6, build `2026-09-10 0de5c8fa9a`,
Windows executable under the existing Wine 11.13 installation. The source PE
has 148,198,344 bytes and SHA-256
`fdc11a99a6a02c715115ed028becc29c1a2e3b67604ca99e22a81bbfd9d96c6e`.
A fresh disposable copy of the existing study prefix ran on private Xvfb
`:176`, 1600x1000. The ordinary desktop and original Wine prefix were not the
interaction targets. Recovery was declined and the crash-report pane closed.

REA 6.4.0 process-capture Evidence:
`ev_7dfcf1dbaf4de499342965bb8595cc297d9db9ff27f95690cdcaed1d7daa36b6`.
This records the Python wrapper's lifecycle, not an atomic binding to the
Windows executable or an automated record of GUI actions. XTest actions and
screenshots were collected separately and hashed alongside the lifecycle file.
The wrapper exited with code 0. Raw PTY frames were retained; cumulative
rendered terminal frames were truncated. Process observations were sampled,
ambient environment and network were not captured, and REA filesystem effects
were not requested. These limits also apply when reusing the Evidence ID.

Private artifacts remain outside the repository:

- Root: `~/.cache/alive-input-routing-reference-20261031/`.
- GUI evidence: `attempt2/01-startup.png` through
  `attempt2/35-record-preferences.png`, plus `attempt2/actions.jsonl`.
- Lifecycle: `attempt2/rea-process-evidence.json`, `scenario.json`,
  `runtime.py`, `session.json`, `target-identity.json`, `requested-stop.json`
  and `cleanup.json`.
- Official source copies and the detailed manual report: `manual/`.
- Sidecar inventory: `evidence-manifest.json`, SHA-256
  `7d47963d9b3a14acb53d43f765dc0a767a84ff9ebef64e53f1c54eb953346236`.

The first MCP attempt hit its client's 300-second cutoff. Its partial captures
and independently checked cleanup are retained at the private root, but it
produced no retained REA lifecycle Evidence. Findings below use attempt 2.
The second attempt used the CLI to avoid that client cutoff. The wrapper's
cleanup receipt confirms zero remaining prefix-owned processes, Xvfb exit,
removal of the marker-owned copy, unchanged source/original preference
inventories and unchanged source/original executables. Unrelated processes
whose ownership could not be inspected were left untouched.

Official Live 12 manual, fetched through Context7 and the official pages:

- [Routing and I/O](https://www.ableton.com/en/live-manual/12/routing-and-i-o/),
  especially Monitoring, External Audio In/Out, External MIDI In/Out,
  Resampling and Internal Routing Points.
- [The Live Mixer](https://www.ableton.com/en/live-manual/12/mixing/#the-live-mixer)
  and Keep Monitoring Latency in Recording Track Toggles.
- [Recording New Clips](https://www.ableton.com/en/live-manual/12/recording-new-clips/),
  especially Choosing an Input, Arming Tracks, Recording Into the Arrangement
  and Recording Into Session Slots.

## Observed Runtime Behavior

Capture names in this table are relative to private `attempt2/`. These findings
describe visible state; no input signal or recorded sample was verified.

| Action or surface | Observed result | Capture |
| --- | --- | --- |
| Click audio track 2 Arm | Arm becomes red, track is selected and its empty Session slots show circular Record controls. Transport remains at 1.1.1. | `04-audio-arm.png` |
| Click audio track 3 Arm ordinarily | Track 2 disarms; track 3 arms and gains the Record circles. | `05-exclusive-arm.png` |
| Ctrl-click track 2 Arm | Tracks 2 and 3 remain armed together, each with empty-slot Record circles. | `06-multiple-arm.png` |
| Switch to Arrangement | Track 3 retains its red arm state. Its unfolded I/O shows Ext. In, channel 1, Monitor Off and Main. The empty MIDI track shows All Ins, All Channels, Auto and No Output. | `18-arrangement-io.png` |
| Open audio source chooser | Ext. In, Configure, Resampling, other audio tracks, returns, Main and No Input are present. Empty instrumentless MIDI tracks are absent from this audio menu. | `19-audio-from-menu.png` |
| Open external channel chooser | Stereo 1/2, mono 1 and 2, activity indicator regions and Configure are visible. Menu entries alone do not prove a functioning device. | `20-input-channels.png` |
| Select Monitor In, then disarm | In and the numbered Activator become cyan; Arm returns gray while In remains active. Transport stays stopped. | `21-monitor-in-armed.png`, `22-monitor-in-unarmed.png` |
| Open empty MIDI track source chooser | All Ins, Computer Keyboard, Midi Through Port-0, Configure, the other MIDI track and No Input appear. | `23-midi-from-menu.png` |
| Open MIDI channel chooser | All Channels and Ch. 1 through Ch. 16 appear. | `24-midi-channel-menu.png` |
| Route audio track 3 from audio track 2 | Second chooser changes from physical channels to Pre FX, Post FX and Post Mixer. Post Mixer is selected in this capture. | `25-audio-taps.png` |
| Return to Session after Monitor In/disarm | Track 3 remains unarmed with a cyan Activator and a microphone indicator. Track 2 remains armed. | `26-session-mixer-context.png` |
| Choose audio source Configure | Global Audio Settings open, including Driver Type, Audio Device, Input Config, Output Config, sample rate and latency. The configured PipeASIO driver carries warning indicators. | `33-global-audio-settings.png` |
| Open Input Config without changing it | Separate Mono Inputs and Stereo Inputs groups show 1 & 2 and 1/2 enables. Text explains that a pair can expose one stereo or two mono inputs. | `34-input-config.png` |
| Open Record, Warp & Launch settings | Exclusive Arm and Solo are enabled; Start Transport With Record is On; Start Recording on Scene Launch is Off. These are this copied profile's values. | `35-record-preferences.png` |

The Arrangement I/O order is source, channel/subselection, Monitor In/Auto/Off,
then destination and any destination subsection. Arm sits in the mixer controls
beside Solo, separate from routing. Audio Off and MIDI Auto are observed track
states here; a pristine factory-template/new-track default was not isolated.

Session I/O visibility remains unresolved in this runtime study. The View >
Mixer Controls > In/Out menu was observed both checked and unchecked
(`28-session-io-setting.png`, `29-session-io-off-menu.png`), but the Session
selectors did not become visible in the captured layout. Keyboard/menu toggles
and attempted height changes do not establish the cause. Do not treat these
captures as a successful Session I/O layout reference. Keyboard track-creation
actions also produced unexpected counts; their shortcut/count behavior is
excluded from the findings.

## Documented Signal And Recording Semantics

Hardware selection and enabled mono/stereo inputs belong to global Audio
Settings. Tracks choose a source and channels from that configuration; they do
not each choose an independent physical device. MIDI port Track/Sync/Remote
enables belong to global MIDI settings. An instrumentless MIDI track has MIDI
output routing; an instrument converts its output to audio routing.

| Monitor mode | Input heard through the track chain | Existing clip output | Armed recording |
| --- | --- | --- | --- |
| In | Regardless of arm | Suppressed | Still possible |
| Auto | When armed and no clip is playing | Playing clip is heard and inhibits input monitoring | Still a separate recording action |
| Off | No software monitoring | Clip playback remains available | Still possible, including hardware direct-monitor workflows |

The manual's generic Auto recommendation and its Return to Default behavior
must not be conflated: it explicitly resets audio to Off and MIDI to Auto.
Keep Monitoring Latency in Recorded Audio is also a distinct documented
setting. A recording alignment policy needs measurement; this UI study does
not establish a sample offset or reproduce that setting.

Arm is shared between Session and Arrangement. It enables recording and selects
the track; it does not itself start transport or write samples. Exclusive Arm
can be disabled, the platform modifier permits multiple armed tracks, and
multi-selected tracks can arm together. Selection, monitoring, arm and capture
must therefore be represented independently.

| Recording action | Documented result |
| --- | --- |
| Empty Session slot Record | Creates a new clip on an armed track, using launch quantization for musical boundaries. |
| Session Record | Records selected-scene slots on armed tracks. |
| Press Session Record again, or the recording clip's Launch | Changes recording to looping playback. |
| Clip Stop or transport Stop | Stops the clip entirely. |
| Scene launch with the normal preference | Does not start recording empty armed slots. A separate preference can enable it. |
| Arrangement Record | Records armed inputs onto the Arrangement timeline; it is separate from Session Record and from capturing Session playback into Arrangement. |

These recording transitions were read in the official manual, not exercised
with functioning input in this session. Audio recording into empty Session slots
is documented. Destructive sample overwrite/audio overdub of occupied slots is
not established by the MIDI-overdub documentation.

Internal routes are typed. Audio-track taps Pre FX/Post FX/Post Mixer were
observed. The exact Audio From menu and meaning of Pre FX on a MIDI track
containing an instrument remain unverified. A similarly named MIDI From Post FX
tap means MIDI immediately before the instrument; it is not audio. Resampling
documentedly excludes/suppresses the receiving recording track's own output.
Arbitrary routing cycles and their runtime handling were not tested.

## Consequences For Alive

The proposed design is in
`docs/superpowers/specs/2026-10-31-alive-tracks-recording-launch-design.md`.
These are proposed changes, not implemented capabilities:

- Global audio hardware/channel configuration and per-track source/channel
  routes, with independent state shared across workspaces.
- Separate Monitor, Arm, queued capture, active recording, playback and durable
  finalization. Multiple armed/monitored tracks must not switch a hidden global
  route. Any initial simultaneous-capture limit rejects the recording request
  atomically and preserves routing/arm state.
- A compact I/O section above each Session mixer and alongside unfolded
  Arrangement tracks, preserving Alive's existing control language. The
  proposed Session geometry follows the manual structure, not a successful
  captured Session I/O strip.
- Native capability-based menus. External audio, internal taps, Resampling and
  physical MIDI ingress require their own working implementations; copying menu
  labels does not provide those capabilities.
- Immediate record-to-loop is the documented target. A finalization pause is
  an Alive limitation or intermediate checkpoint, not Live parity.

Unproven: physical capture, audible monitoring, MIDI input events, capture-to-loop
timing, input/output clock alignment, latency compensation, feedback topology,
occupied-slot record interactions and arbitrary window-size behavior in Live.
Responsive Alive checks remain required at the native 800x600 minimum and larger
desktop sizes; reference screenshots do not qualify that implementation.
