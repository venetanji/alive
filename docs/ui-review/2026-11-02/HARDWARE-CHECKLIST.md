# Proposed local hardware acceptance

Status: **not executed**. Software/native and private CPAL loopback evidence is
separate from physical hardware qualification. Agree this checklist and the
restoration procedure before consequential device/settings changes. Recording
and routing tests stay excluded until their native capture/routing contracts
and implementation exist.

## Agree and record the baseline

- Record tested Alive commit and Alive/Ultra/native-library hashes, OS/kernel,
  audio backend/driver versions, physical device make/model, connection and
  selected output channels. Resolve which physical output will be heard.
- Record original OS/default device, device profile, application audio settings,
  requested and observed rate/buffer size, hardware output level and Alive
  mixer/Master settings. Note other applications using the device.
- Agree a quiet output level, a way to silence it immediately, who performs
  reconnects and which rate/buffer changes are permitted. Do not infer this
  approval from the earlier software-only tests or general full access.
- Agree restoration: stop playback/Audio, restore the recorded application and
  OS/device settings and physical gain, reconnect the original device, reopen
  settings and compare requested/observed values. Verify an ordinary playback
  at the agreed quiet level. Record any setting that cannot be restored.

## Run supported behavior

| Check | Evidence and expected result |
| --- | --- |
| Stream start | Correct physical output, backend and device identity; requested and observed rate/buffers recorded separately; errors reported without invented success |
| Playback and global Stop | Hear both intended tracks at the agreed level; Stop releases notes and produces silence; stream lifecycle/transport state recorded separately |
| Session launch, track Stop and Return | Verify actual controls and pending/applied receipts; track Stop keeps silent Session authority; Return in a proved Arrangement gap has no active source while the sibling keeps playing |
| Seek and loop | Check landing in a note, in a gap and over loop boundaries; compare native position/authority/source/placement with authored half-open intervals; no stuck notes or unintended scene launch |
| Gain, mute and solo | Exercise one track at a time and both tracks; mute precedence, solo isolation and saved mixer values; use the established supported controls only |
| Master | Check ramped gain, Unity, stereo observations, digital overload latch/reset and save/reopen. A digital meter does not prove physical headroom; any deliberate overload check needs a separately agreed muted/quiet output procedure |
| Save/reopen/restart | Preserve source/slot/placement identities, note/automation/region edits, mixer/Master values and actual device bases; reopen stopped; verify subsequent playback and Stop |
| Reconnect and stream errors | With explicit agreement, stop output before disconnect/reconnect; record enumeration/default-device changes, error/failed state, release/cleanup and recovery. No silent device fallback or automatic OS reconfiguration |
| Restore | Apply the agreed baseline restoration procedure and compare all recorded settings; record remaining differences |

Keep a timestamped pass/fail/skipped/unrun row for each check, exact native
receipts, errors and captures where useful. Any audible artifact, unexpected
output, failed Stop or stream error is a failure to investigate before continuing.
Do not claim physical underrun or latency qualification from browser tests,
callback timing, digital peaks or software loopback alone.

## Continue to report unavailable features accurately

Pan, returns/sends, input routing, monitoring, arm and recording are not
qualified by this checklist. MIDI note Preview and Browser audio preview are
different capabilities. Multichannel output requires an agreed product/channel
contract before any wider-layout claim or hardware test.
