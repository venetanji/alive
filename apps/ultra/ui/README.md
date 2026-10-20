# Ultra research patcher UI

Dependency-free HTML/CSS/ES modules packaged by the Rust/Tauri shell. It never creates a WebAudio fallback: opening a browser preview explicitly reports that native audio is unavailable.

## Supported workflow

The starter has two independent chains, assigned to JACK MIDI channels 1 and 2:

`note.in → faust.voice~ → gain~ → audio.out~`

Drag object headers. Select a header to target the typing keyboard (A W S E D F T G Y H U J K = MIDI 60–72). Pointer keys work independently per device. Click an outlet then the following object's inlet to connect. Select a cable or object and press Delete, or use the inspector. Missing chains are silent. The palette can restore a deleted object; there is at most one instance of each type per device. Graph validation is duplicated for immediate UI feedback, but native Rust validation controls the route mask and mutes on rejection.

Gain sends the Faust level parameter on slider release, avoiding a high-rate drag message flood. Sustain and pointer/keyboard release are explicit events. Blur/visibility loss releases held notes and sustain, then sends all-off. Panic is a sticky native safety fault; Stop and Start are required to recover. Removing a cable/object releases only its device; completing an incomplete route needs no reset. Releases remain deliverable while a patch command is pending. Global focus loss and Panic still affect both. After server loss, Stop remains available for cleanup and Start recreates the native client. Native event admission failure is shown, not silently treated as success. Status reports actual backend counters, not synthetic meters.

Export opens selectable JSON with clipboard/manual-copy and optional download; Open offers pasted JSON and the webview file picker and validates version, bounds, types, identifiers, graph edges, and file size before replacing the patch. Unsaved changes are not automatically persisted. Native GTK file-picker import and pasted-text import passed on the tested Omarchy desktop. Optional Download remains unverified; selectable JSON/manual copy is available. Device A routes to JACK left and device B routes to JACK right.

This is an editor for a fixed four-voice-per-device sine/ASR Faust guest, not a general DSP compiler, Pure Data implementation, or Max compatibility layer. Cable topology enables/disables these fixed routes; it does not create new DSP algorithms.

## Checks

From repository root:

```
node apps/ultra/ui/graph.test.mjs
node apps/ultra/ui/events.test.mjs
node --check apps/ultra/ui/app.mjs
bash apps/ultra/tests/check_isolated_desktop.sh /tmp/ultra-isolated-results
```

Graph checks cover complete/disconnected chains, cross-device and duplicate rejection, invalid coordinates/version, and IPC payload separation. Event checks execute actual controls with paused native IPC to verify key-up/focus releases during edits and reconnect behavior. The isolated runner requires the built native app, Xvfb/D-Bus/AT-SPI and an existing supported JACK server; see `../RUNNING.txt`. It uses a private display with no desktop-wide keyboard/pointer input and refuses another Ultra instance. Native and rendered UI execution must be reported separately. Static checks do not establish desktop usability, audio output, physical MIDI latency, or callback deadlines.
