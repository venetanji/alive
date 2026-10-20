# Ultra research patcher UI

Dependency-free HTML/CSS/ES modules packaged by the Rust/Tauri shell. It never creates a WebAudio fallback: opening a browser preview explicitly reports that native audio is unavailable.

## Supported workflow

The starter has two independent chains, assigned to JACK MIDI channels 1 and 2:

`note.in → faust.voice~ → gain~ → audio.out~`

Drag object headers. Select a header to target the typing keyboard (A W S E D F T G Y H U J K = MIDI 60–72). Pointer keys work independently per device. Click an outlet then the following object's inlet to connect. Select a cable or object and press Delete, or use the inspector. Missing chains are silent. The palette can restore a deleted object; there is at most one instance of each type per device. Graph validation is duplicated for immediate UI feedback, but native Rust validation controls the route mask and mutes on rejection.

Gain sends the Faust level parameter on slider release, avoiding a high-rate drag message flood. Sustain and pointer/keyboard release are explicit events. Blur/visibility loss releases held notes and sustain, then sends all-off. Panic is a sticky native safety fault; Stop and Start are required to recover. Removing a cable/object releases only its device; completing an incomplete route needs no reset. Releases remain deliverable while a patch command is pending. Global focus loss and Panic still affect both. After server loss, Stop remains available for cleanup and Start recreates the native client. Native event admission failure is shown, not silently treated as success. Status reports actual backend counters, not synthetic meters.

Export opens selectable JSON with clipboard/manual-copy and optional download; Open offers pasted JSON and the webview file picker and validates version, bounds, types, identifiers, graph edges, and file size before replacing the patch. Unsaved changes are not automatically persisted. Native GTK file-picker import and pasted-text import passed on the tested Omarchy desktop. Optional Download remains unverified; selectable JSON/manual copy is available. Device A routes to JACK left and device B routes to JACK right.

This is an editor for a fixed four-voice-per-device sine/ASR Faust guest, not a general DSP compiler, Pure Data implementation, or Max compatibility layer. Cable topology enables/disables these fixed routes; it does not create new DSP algorithms.

## Chord lab: connected, playable fixed patch

Open **Chord lab** from the patcher context bar. The separate `chord-lab.html` page exposes a fixed native study:

`transport → metro 16n → cycle → chord/modulo/div/octave → transpose/clamp → sine voices`

`keyboard / JACK MIDI → sine voices → linked gains → explicit join [A,B] → one stereo bus → JACK outputs`

This page does not edit arbitrary routing, compile objects, create WebAudio, or schedule notes using browser timers. The connections are a read-only diagram of the native configuration. It reuses the dependency-free controls from `components/`. Browser preview leaves play controls and piano keys disabled; the pitch map can still be edited and is explicitly a calculation, not native playback.

1. Start a supported JACK server and open the native Ultra app. Entering the lab validates and applies both fixed routes, stops any inherited transport, and releases held notes.
2. Press **Start audio**, then **Run**. Audio start/restart reapplies level, attack, and release to both devices after the native reset and keeps transport stopped.
3. A plays the native sequence; the on-screen/typing keyboard always plays B. The sequence reserves A while armed, so physical MIDI channel 1 does not compete for its notes. MIDI channel 2 plays B throughout.
4. Choose major, minor, or sus4; root 24–84; 1–8 steps; tempo 30–240; gate 10–90%; velocity 1–127; transpose −24…24. At zero-based step `i`, pitch is `clamp(root + triad[i % 3] + 12 * floor(i / 3) + transpose, 0, 127)`. Sequence-setting changes stop transport; press Run again. UI status polling (at most 10 Hz) is only observational, not a timing scope.
5. External clock mode requires **Arm MIDI**, then JACK MIDI Start (`FA`) or Continue (`FB`). Six `F8` pulses advance one sixteenth; MIDI Stop (`FC`) releases the note but remains armed. The UI says **MIDI armed**, not that it has verified the clock is running.

Attack/release are linked to both devices and latch per note: edits affect the next notes. Raw value 0 means 16 samples (0.333 ms at 48 kHz); values 1–127 mean attack in 4 ms increments or release in 8 ms increments. The sliders display both raw values and mapped durations. Gain is linked, 0–127; these are not claimed to be decibels. Sliders transmit on commit, not every drag event. Rapid committed updates use a bounded in-flight plus latest-value serialized queue.

All audio ports represent buses, including mono. A/B are logical instruments, not permanent left/right channels. Their mono outputs enter an explicit join into a two-channel cable, then the output node maps channels 0/1 to L/R. The page imports and validates the `audio-bus.mjs` descriptor. This is the existing fixed stereo native adapter, not arbitrary-N DSP rendering, runtime channel remapping, or an ambisonic encoder/decoder.

**Preset…** offers copy/paste JSON export and validated import, including controls, envelope/level, and the named adapter. `chord-lab-preset.json` is the supplied “Triad stair” patch. Import validates the whole document before mutation, rejects unknown fields and files over 64 KiB, stops transport and held notes, and never autoruns. Presets are deliberately distinct from the general patcher's v1 graph files.

Pointer up/cancel/lost capture, keyboard key-up, focus loss, hidden page, and safe navigation release notes. Focus loss also disarms transport. The backlink awaits native audio stop so the original patcher cannot inherit changed envelope settings. Unexpected control IPC failure latches a visible fault and makes a best-effort native Panic request; Stop/Start remains the recovery route. Page-hide cleanup is best effort, not a guarantee that an abruptly terminated webview can finish IPC.

## Checks

From repository root:

```
node apps/ultra/ui/graph.test.mjs
node apps/ultra/ui/events.test.mjs
node --test apps/ultra/ui/chord-lab.test.mjs apps/ultra/ui/chord-lab-dom.test.mjs apps/ultra/ui/audio-bus.test.mjs
node --check apps/ultra/ui/app.mjs
node --check apps/ultra/ui/chord-lab.mjs
bash apps/ultra/tests/check_isolated_desktop.sh /tmp/ultra-isolated-results
```

Graph checks cover complete/disconnected chains, cross-device and duplicate rejection, invalid coordinates/version, and IPC payload separation. Event checks execute actual controls with paused native IPC to verify key-up/focus releases during edits and reconnect behavior. The isolated runner requires the built native app, Xvfb/D-Bus/AT-SPI and an existing supported JACK server; see `../RUNNING.txt`. It uses a private display with no desktop-wide keyboard/pointer input and refuses another Ultra instance. Native and rendered UI execution must be reported separately. Static checks do not establish desktop usability, audio output, physical MIDI latency, or callback deadlines.

Chord lab tests exercise the actual control model with deterministic command admission: startup order and inherited-engine adoption, edits during startup, explicit Run, parameter-change stop, stale Run cancellation, B note ownership/deduplication, release while note-on is pending, bounded latest commits, native Panic on IPC failures, panic recovery, strict preset round trips, view-only preview, and the page wiring contract. They are not a rendered/native UI qualification.
