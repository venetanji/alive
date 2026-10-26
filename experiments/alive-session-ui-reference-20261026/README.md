# Live Session UI reference, 2026-10-26

The user tested Alive and requested a denser Live-style grid with more icons.
They confirmed presentation first, retaining Alive's four playable slots per
track. This investigation supplies observed reference for that bounded revision.

## Target and method

Actual Ableton Live 12.4.6 Suite runs through Wine 11.13 in a new disposable
copy of the previously retained installation prefix, on private Xvfb `:166`.
The startup screen identifies 12.4.6 (Build 2026-09-10_0de5c8fa9a). The copied
executable and source copy both hash to
`fdc11a99a6a02c715115ed028becc29c1a2e3b67604ca99e22a81bbfd9d96c6e`.
The current original installation has a different hash, recorded in
`target-identities.json`; its version/difference was not investigated. These
observations belong to the identified 12.4.6 copy, not an assumed latest build.

REA's native UI provider requires macOS. REA process captures retain the owned
launcher lifecycle; the scoped XTest harness records actions and ImageMagick
captures actual Linux/Wine pixels. No native analysis session was opened.
These observations do not recover code, proprietary icons or DSP.

## Questions and observations

`LOCAL-UI-R1` refers to the action receipts, screenshots and preservation records
in this directory. Paths below are under `attempt2/`.

| Question | Observation and evidence | Coverage |
| --- | --- | --- |
| How are slots organized? | `05-session-empty.png`: aligned narrow rows, neutral empty bodies, colored track headers and a left control gutter. `08-populated-grid.png`: occupied Verse/Chorus/Pad bodies carry the track color and readable names; launch triangles occupy a separate left segment. | Observed visual structure. |
| How is an empty clip created? | Double-click first-track empty body, then Ctrl+R/name/Enter yields Verse; `07-focused.png`. Repeating on the second track yields Pad in `08-populated-grid.png`. | Actual actions and resulting clip, no audio claim. |
| How are clips duplicated? | Ctrl+D on selected Verse followed by rename yields Chorus in the next row, while Verse remains. `08-populated-grid.png`. | Actual UI duplicate and rename. |
| Is selection distinct from launch? | Pad has a contrasting selection outline/launch-segment highlight; Verse and Chorus retain their fills. The helper did not click their launch triangles. Prior observed playing/queued behavior remains in `../alive-workflow-reference-20261024/35-a-running.png` through `41-track-stopped-transport-running.png`. | Selection observed now; playing/queued behavior reuses prior evidence, not rerun here. |
| What happens with fewer tracks than available width? | Ctrl+Alt+B hides the browser in `09-browser-hidden.png`: track widths remain compact and the center shows a real empty area, with returns/Main at right. | Observed. Alive's empty stage will not pretend to support dropping files. |
| How do icons and mixer fit? | Top transport/view buttons, narrow clip triangles, square Stop and compact lower mixer controls remain clear in `08-populated-grid.png` and `09-browser-hidden.png`. Audio/return strips have vertical faders/meters; empty MIDI tracks show MIDI activity indicators. | Visual structure only; no meter/audio measurement. |
| How does hiding detail affect rows? | After Shift+Tab and Ctrl+Alt+L, `10-detail-hidden.png` shows eight numbered scene rows and more grid/mixer space. Browser remains hidden. | Observed combined action result; not a maximum-slot limit or isolated shortcut attribution. |

The retained captures are 1440x900 root images. Live's owned window is at
(0,-30), width 1440 and height 900 after a requested resize; some lower controls
are outside the captured viewport. The study establishes the visible grid,
transport, browser and mixer geometry, not a complete viewport-fit qualification.
The initial and immediate post-action captures include startup/stale frames;
use the explicitly cited settled frames for findings.

## Application to Alive

The source audit records that UI, Rust persistence and native v3 ABI all admit
four slots per track. The user's answer explicitly chooses a denser grid first.
The implementation scope is therefore four actual compact rows, a left launch
icon, colored clip bodies, neutral empty cells, independently visible selection
and runtime states, original icons, vertical existing gain/peak controls and a
less crowded detail area. All visible controls must use real supported actions.
Live's empty-slot Stop, record, routing, sends and returns are not implemented
by this UI revision. Existing Alive per-track Stop and atomic scene semantics
stay authoritative. This mapping is an Alive design decision, not a claim that
Live has Alive's native timing, ownership or preparation model.

## Lifecycle and limitations

- First REA capture `ev_d221065d07c56dce4d05b54a9cb043080aee0bf5a8ff2bbb3b185d858ca2c052`
  ends on the default 30-second idle limit during startup. It establishes no
  Session behavior. Cleanup finishes with exit 0, and the original/source
  preference digests remain unchanged.
- The corrected explicit 600-second capture is
  `ev_b0d03bd3ace81f53b42740920f60f75672f9d340bda902ec53ba9c662fd05b9b`.
  The MCP client stops waiting at 300 seconds while the server continues. Its
  retained record was discovered and exported, without rerunning the session.
  At the 600-second bound, SIGTERM cleanup exits 0 in 8.931 seconds. This is a
  bounded reference observation ending by timeout, not an app test exit-0 claim.
- Recovery from the copied profile was declined, and the crash report pane was
  closed. No report was submitted. The runtime copy is removed after observation.
- Both cleanup receipts confirm original preference inventory (40 files) and
  source-copy preference inventory (1081 files) unchanged; no owned prefix
  processes remain and Xvfb exits. `target-preservation.json` independently
  verifies the original and source executable digests after cleanup.
- REA retains four unknowns about broader filesystem/environment/process/network
  behavior. Its Python executable digest is not a Live process-image binding;
  local artifact identities and scoped actions supplement that record. This is
  not a sandbox or a complete filesystem trace.
- No sound, sample timing, physical audio, engine internals, maximum track/slot
  count or plugin lifecycle was measured in this pass. No proprietary assets
  are added to Alive's product build.

`rea-evidence-bundle.json` retains the complete REA records. `manifest.json`
records each retained file's bytes and SHA-256. `runtime.py` is the bounded
harness; `attempt2/runtime.py` changes the cache path and adds an explicit X11
window resize action. Never replay the coordinates on the user's desktop.
