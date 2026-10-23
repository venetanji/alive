# Ultra editable canvas

The native window opens `canvas.html`, supporting flat `ultra-canvas-v1` and embedded `ultra-patcher-v2` documents. Its compact interface follows the locally observed Max 9.1.5 patcher. Up to 16 root patch, help and example documents run independent graphs through one shared native audio engine and output device. Each root owns its tree, history, control state, timers and voices; native child views attach to that same owner. The old research patcher and fixed Chord lab remain available in the browser preview's File menu; native canvas windows hide these engine-wide legacy adapters. Playback uses native code, never WebAudio or a JavaScript note clock.

## Playable Subtractive Instrument

Open `apps/ultra/examples/subtractive.ultra` with File / Open, or search for
Subtractive in Help & Examples. Start audio, then open **Perform**. The seven
controls edit the saved ADSR, resonant filter and gain objects while sound runs.
Focus the keyboard and play A W S E D F T G Y H U J K, or hold an on-screen key.
Closing the panel, losing focus or hiding the window releases its held keys.
Lock the canvas and click the separate toggle to run the authored deterministic
score. Stop patch releases notes and stops the score; Panic mutes all documents.
Physical MIDI input remains absent on the CPAL desktop path.

To build it yourself, create `midiin`, `poly.note~ 4`, `saw.voice~`,
`lowpass.voice~ 2400 0.7`, `adsr.voice~ 10 150 0.65 300`, two `*.voice~`,
`mix.voice~`, `gain~ 90`, `join~` and `stereo.dac~` through N entry. Wire the
allocator's frequency to saw, gate to ADSR and velocity to the second multiply.
Filter the saw, multiply by ADSR then velocity, mix down to mono, apply gain,
duplicate into both join inputs and connect join to stereo output. Every route
is an editable cable. The four-lane voice bundles have their own dashed cord
style and cannot connect directly to mono/stereo ports.

**Package instrument** exposes the graph's one allocator, ADSR, filter and gain
through a versioned saved interface. Store named presets, then Save to retain
them. Recall edits the bound object parameters; it does not replace DSP state.
**New instance** copies the current authoritative graph into an independent
untitled document, with separate voices, parameters, history and file ownership.
Save/close/reopen restores the graph, values and presets; running notes/timers
are deliberately not serialized. Bindings also work across embedded patchers.

Alive session hosting is not connected. The standalone native host exercises
the same saved interface without creating a desktop or editor:

```sh
bash apps/ultra/build.sh
env -u DISPLAY -u WAYLAND_DISPLAY LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
  apps/ultra/src-tauri/target/release/ultra --instrument-probe \
  apps/ultra/examples/subtractive.ultra /tmp/ultra-instrument-probe
```

The probe writes float32 WAV segments and a checked JSON report for two instances,
presets, audible live controls, cable disconnection and isolated Stop/close.
See `../PATCH_PROTOCOL.md` for the interface and
`experiments/ultra-instrument-20261024/` for desktop/performance evidence.

## Embedded Patchers

Type `p basic` to create an embedded patcher. Double-click its object or press Enter on its focused header to open its native window; reopening focuses the existing child. The path bar focuses a parent window. Browser preview retains inline navigation. Create `inlet` and `outlet` objects inside it to expose parent ports, ordered by horizontal position. These boundaries pass both typed messages and mono signals. Every descendant shares one root native graph, history and saved file. Opening or closing a child preserves playback and live state; Save and export from a child include the complete tree. Edits broadcast across views and Undo/Redo follows the owner's history. Console links open and reveal the source's owning view, and each view receives console records independently. A root permits up to 64 child views without using additional audio slots. Comments are saved annotations. Max initialization and help helpers remain separate work.

V2 authoring allows 512 total objects, 1024 cables, 16 embedded levels and 1 MiB compact JSON. Native execution retains 32 leaves/relays and 64 cables. Over-limit graphs are rejected without truncation. Supported embedded Max graphs can be imported recursively; unsupported dependencies still require explicit partial-import acceptance. This does not establish complete installed-help execution.

## Editable canvas workflow

- **Ctrl E** locks/unlocks the patch. Edit mode selects and moves controls; locked mode operates them. Control objects work with audio stopped. For sound, start audio, lock, then click the top-left toggle to run `metro → counter → chord → makenote → voice`. Native code owns metro pulses, ramps and note-off scheduling; its background worker clocks controls when DSP is off. The separate bang/message chain triggers a note. The current CPAL desktop path has no physical MIDI ingress; `midiin` routing is exercised only through the legacy JACK adapter/tests. Ctrl/Cmd-click can operate a control while editing.
- **N** or double-click blank canvas creates an object at the pointer. Type its name and positional arguments, such as `metro 150`, `+ 12`, `line 0 20`, or `pack i f s`. Arrow keys select a suggestion, Tab completes, Enter commits and Escape cancels. B/M/T begin bang/message/toggle entry. I/F/S immediately create a number, float box or vertical slider at the pointer; each creation undoes in one step. Double-click an object, or select it and press Enter/F2, to edit its text. Unsupported classes and invalid arguments remain visible as errors without replacing the current object. The optional object palette lists 66 native kinds and the p/comment authoring constructs, including control/list processors and the twelve signal kinds `sig~`, `+~`, `-~`, `*~`, `/~`, `cycle~`, `phasor~`, `noise~`, `clip~`, `line~`, `snapshot~` and `dac~`.
- Every inlet is on the **top**, every outlet on the **bottom**, indexed left to right. Click an outlet, then a matching inlet. Control, mono audio and legacy stereo bundles have distinct ports and cable styles; mixed inlets accept control or mono signals. Hover or focus a port for help; right-click an inlet for **Accepts**, an outlet for **Emits**. These descriptions follow Ultra's contract. Multiple control sources may enter an inlet; mono signal sources sum at a signal input. Saved cable array order controls control-message fan-out order. Control and signal dependency graphs are checked separately, allowing sampled feedback through `snapshot~` while refusing a cycle within either graph.
- Drag object bodies/headers, Shift-select or marquee a group, and use arrow keys to nudge. Group moves/deletes undo in one step. Wheel or two-finger scrolling moves the view; Shift+wheel scrolls horizontally. Space+drag or middle-button drag also pans, including when starting over an object. **Z** zooms in around the pointer and **Shift Z** zooms out, following Max's key commands. Ctrl/Cmd+wheel (including browser trackpad pinch events) also zooms at the pointer; Ctrl/Cmd +/- zooms and Ctrl/Cmd 0 or Reset view restores 100% at the origin. Navigation works in edit and locked mode; typing and Ctrl/Cmd Z undo keep their usual behavior. Zoom and Fit change only the view, never graph coordinates or audio state. Ctrl I opens the optional inspector for all parameters; F1 or the context menu opens help with literal and runnable examples. Numbers, sliders and gain controls operate while locked. Range controls use flat position bars; gain uses a hatched track. Their output stays available in the Inspector and accessible value text. Locked UI controls hide their port markings while cords retain their endpoints. Native numeric observations update display without modifying saved parameters or feeding back as UI events.
- Select a cable or object and use **Delete selection** or Delete/Backspace. Undo/redo preserves stable IDs, cable order, parameters and positions. Numeric-parameter undo remains live; structural undo resets notes/timers. Layout undo never reapplies the native graph.
- Native shared views serialize authoring edits through owner CAS, retain at most 64 pending edit snapshots and coalesce adjacent updates within the same continuous gesture. Discrete history boundaries and intervening events remain ordered; a full backlog refuses a new edit before changing the document. Stop/Panic bypass waiting edits after the current IPC; pending hot numeric edits still save their authoring values but no longer emit control messages after that safety request. Global Stop Audio remains available if scoped canvas Stop rejects a fault. The standalone preview controller coalesces numeric updates while dragging. Compatible Message text edits update one box silently without replacing the graph; runtime cold/set messages change its live display without rewriting saved text. Message text editing is disabled while locked. Legacy message text, MIDI channel, voice device, node and cable changes remain structural. Structural edits prepare a replacement graph and reset only that document's timers, notes and signal state. Continuous signals run from reset state while DSP is on; controls and metros require an explicit new operation. This is **not seamless hot swapping**. Invalid local edits leave the document unchanged; native rejection resynchronizes shared views with the authoritative graph and cancels dependent queued events. Desired document and active native revisions are shown separately.
- **Stop patch** and Esc stop this document's native timers and notes and freeze/silence its signal graph, including when ordinary number/gain/Inspector inputs have focus. An accepted event, parameter change, incoming Receive or explicit global DSP restart resumes its continuous signals. Focus changes and hidden windows preserve playback. Closing a document disposes only its graph. Escape inside object entry cancels that edit instead; modal/context menus retain their dismissal behavior. **Start audio**, **Stop audio**, audio settings and **Panic** apply to the shared output. Stop audio clears timers and notes in every document; controls can be triggered again while audio is off. Starting audio resumes continuous signals in all documents without replacing graphs, ordinary values or runtime receive bindings; stopped metros remain off. Cycle restarts at its reset phase and Phasor retains its phase across DSP off/on. Panic latches native silence until Stop audio / Start audio. Event-queue overflow fails closed instead of discarding a possible note-off. Abrupt process termination still cannot guarantee webview IPC completion.
- **New** (Ctrl/Cmd N) and **Open** (Ctrl/Cmd O) create separate native patch windows. Open uses the OS file picker; dropping a patch file also opens a window. Reopening an already-open file focuses its window. **Save** (Ctrl/Cmd S) and **Save As** (Ctrl/Cmd Shift S) atomically write validated Ultra JSON through the OS, normally as `.ultra`; `.json` is also accepted. The title's asterisk follows saved content, including undo and edits during a pending save. Closing first flushes pending edits from the affected views and pauses new authoring until the close decision. Failed edit or history admission keeps the window open. Closing a modified patch offers Save, Discard or Cancel. Max source opens an empty document with a compatibility report and always saves to a separate Ultra file after import, including when the source used `.json`. **Advanced JSON / Max import** retains pasted JSON and explicit replacement of the current graph; **Export JSON** retains selectable JSON, Copy and Download. No autosave is implied. `canvas-preset.json` is the supplied starter. Per-document limits: 32 objects, 64 edges, 64 KiB; unknown fields/types, invalid values/ports, cycles within the separate control or signal dependency graphs, and unsupported bundle connections are rejected. Omitted known parameters receive protocol defaults.
- **Help & Examples** in the document toolbar searches 138 original entries by name, alias, description or topic: help and an example for each supported kind, plus the starter. Each opens a separate window, as do F1, Alt/Option-click and the object's context-menu or Inspector Help action. Opening the same help entry again focuses its existing window. The library also lists open native windows for focusing. The object palette remains a separate authoring tool.

The native mono signal graph evaluates sources, arithmetic, clipping and ramps at 48 kHz. Mono cables can fan out, and multiple sources sum at an input. `dac~` accepts 1..8 mono inputs mapped to physical channel 1 (left) or 2 (right); repeated mappings sum. The older custom `voice → gain → join~ → stereo.dac~` path retains two prepared sine/ASR voice buses, at most one voice per logical device and one legacy join/sink per document. Its saved sink type remains `dac`, preserving old files; the new mono-input `dac~` has a separate kind. Gain evaluates independently on each branch. The custom Voice pipeline retains its 64-frame delay; new MSP sources run immediately at the native sample rate. Missing output paths are silent. Voice attack uses raw × 4 ms, release raw × 8 ms, and raw 0 means 16 frames, latched on note-on. Both paths mix into the same selected CPAL stereo device.

Browser preview supports editing, independent preview windows, normal file input and patch downloads. Native triggers and audio controls are disabled, and runtime readouts remain absent rather than simulating playback. Per-object values and pulse counts are polled native observations, not an audio timing scope.

Engine starts and graph replacements mute the first 64 output samples as a
guard while signal state already advances. New MSP evaluation has no per-path
64-frame delay; the legacy custom Voice pipeline remains delayed separately.

From the repository root, `bash apps/ultra/run.sh -- path/to/patch.ultra`
opens a file at startup or sends it to the existing native instance. Multiple
paths are accepted. `python3 apps/ultra/install-launcher.py` installs the latest
build's user desktop entry and MIME descriptions for `.ultra`, `.maxpat` and
`.maxhelp`, so a file manager can offer Open With Ultra.

### Canvas checks

```
node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs
node --check apps/ultra/ui/canvas-model.mjs
node --check apps/ultra/ui/canvas.mjs
```

`canvas-model.test.mjs` covers the strict registry/document, typed audio/control topology, snapshots, real command payloads, parameter coalescing, revision races, native rejection, stop, Panic, startup failure and cancellation, queue overflow, and numeric undo. `canvas-dom.test.mjs` executes the actual page module against a small DOM adapter for palette, wiring, deletion, message/numeric edits, native triggers, dragging, port orientation, import type changes and navigation. Rendered browser smoke is separate under `../tests/ci`; see that directory's README. DOM/static/browser-preview checks do not establish native audio output, hardware MIDI, latency or callback deadlines.

`canvas-documents.test.mjs` checks saved-content tracking, edits during pending
saves, cancelled Save As, native new/open isolation and save-before-close.
`canvas-send-receive.test.mjs` checks aliases, name bounds, creation-dependent
ports, structural name edits, supported Max intake and document-local disposal.
`canvas-library.test.mjs` validates all original help/example graphs and their
checked native manifest. Native window/file/audio execution is checked separately
by the private desktop runner described below.

`canvas-signal-objects.test.mjs` covers signal creation, mixed ports, summed
inputs, separate dependency graphs and Max intake boundaries. Frozen signal
reference observations and production-native replay are in
`experiments/max-reference/signal-runtime-20261021/`; they do not establish
complete execution of installed Max help patches.

`canvas-catalog.mjs` is the UI name/argument/port-help contract over the same
66-kind native registry plus two authoring constructs. It rejects Max classes and execution attributes that
lack runtime support. `cycle~` is supported for numeric frequency/phase behavior;
waveform buffers, `ezdac~`, transport scheduling and signal feedback remain
unsupported. `int` and `flonum` are separate runtime kinds;
`i`, `f`, `sel` and `t` resolve to int, float, select and trigger when typed as
object names. `canvas-entry.mjs` owns inline entry
and `canvas-node.mjs` owns compact object faces. The reference observations and
user-supplied Max-saved snapshots live in `experiments/max-ui-reference/`.

Inline autocomplete shows each object's positional signature, highlights the
argument at the caret, and describes its range and default. Enumerated parameters
offer named choices (for example `chord` shape 0 Major / 1 Minor / 2 Sus4).
Type `@` to list supported named creation parameters; `metro @interval 250` and
`metro 250` configure the same value. Positional arguments precede named options;
duplicates, unsupported options and invalid values leave the patch unchanged.
Tab or a suggestion click completes the current token while preserving text
after the caret. Enter commits the typed arguments without substituting defaults.
These option names describe Ultra's registry, not the complete Max attributes.

`cycle~` and `phasor~` take one positional frequency, `line~` one initial value,
and `snapshot~` one interval. The editor's `@phase`, `line~ @time` and
`snapshot~ @offset` options preserve inspector settings; Max intake refuses
unqualified execution attributes. Signal creation/control values are finite
-100000..100000 unless a narrower field range applies. DSP calculations can
exceed that control bound. `noise~` retains a physical control inlet but accepts
no methods, including `seed`; its exact sequence is not claimed to match Max.
`snapshot~` bang samples an offset in the latest completed 64-frame vector;
positive periodic cadence is a bounded native approximation rather than exact
Max scheduling. Signal examples require shared DSP to run even for console-only
observations; control `line` continues working with DSP off.

`pack`, `unpack`, `select`, `route` and `trigger` create their port counts from
up to eight creation atoms. Typed literals and named selectors can be sent from
message boxes, for example `note 64 100`, `set 12`, and `pause`. `flonum` is a
floating-point UI box with a physical Tab bang outlet. `number` creates the
integer UI box (saved type `number_int`), with one inlet, two outlets and
integer minimum/maximum. Incoming floats and direct text entry truncate toward
zero. Existing saved Ultra `number` objects retain their fractional value and
two-inlet/one-outlet behavior; their object text is `number.legacy`. Physical
Tab first commits pending entry, then emits from outlet 1; the input message
`tab` does not emit. `int` and `float` accept `send name` at their hot inlet to
send the stored typed value to matching receivers across documents without
ordinary outlet output. `slider` is an independent control
slider rather than an audio gain. `line` has target/time/grain inlets and a
completion outlet. The native clock runs it with audio off. Original runnable
examples and operation instructions are in `../examples/README.md`; start with
`../examples/line.ultra`. See `../PATCH_PROTOCOL.md` for bounds and the supported
subset. Max `.maxpat`/`.maxhelp` intake provides named-patcher compatibility
reports and imports only the supported selection; whole-help execution is not
supported. `print` is a native console sink with a saved label and severity.
Open Console in the toolbar or press Ctrl/Cmd M; filtering and Clear are local
to the visible history. Selected button/toggle/slider/gain controls have direct
resize handles, and the slider inspector shows its scaled output range and
Integer/Float output mode. Appearance and resize edits retain native execution.

`send` / `s` requires a name; `receive` / `r` may be unnamed. Matching names
deliver complete typed messages across open documents, including with audio off.
Multiple-receiver delivery order is unspecified. An unnamed receiver has a control
inlet for `set name`; a named receiver has no inlet. Inspector name edits are
structural and refresh the visible port layout. Original `send.ultra` and
`receive.ultra` examples use the shared name `ultra-help-notes`. A `set` selector
received through the bus is emitted as data rather than retargeting the receiver.
Runtime retargeting does not change its saved creation name. Names are literal
ASCII tokens of 1..31 bytes; only receive can have an empty creation name. Max
`#0`/`---` patch-local expansion and signal-rate `send~`/`receive~` are unsupported.

`canvas-shared.mjs` owns native optimistic editing, serialized CAS admission,
conflict recovery and owner broadcasts. Native Rust owns the saved baseline and
history, bounded by 100 snapshots and 16 MiB. Geometry, appearance and patcher
names do not reinstall execution; single live numeric changes and their undo
use atomic parameter/hot-inlet admission. Other executable edits replace the
owner graph. `canvas-documents.mjs` owns document metadata and native calls;
`canvas-documents-view.mjs` owns the file controls, native events/drop intake,
browser fallback and searchable library. `canvas-library.mjs` creates the
original runnable fixtures. Native windows embed the checked
`canvas-library-data.json` manifest; after changing the catalog or library, run
`node apps/ultra/ui/generate-canvas-library.mjs`. The library test checks that
the native manifest and browser patches remain identical.

The navigation comparison is recorded in
`experiments/max-ui-reference/navigation.md`. Max's installed 9.1.5 key-command
map identifies Z/Shift Z as cursor-centered zoom. The official
[Patching guide](https://docs.cycling74.com/userguide/patching/#zooming) documents
these keys and pinch; the [Patcher Window guide](https://docs.cycling74.com/userguide/patcher_window/#top-toolbar)
documents Ctrl/Cmd = and -. Space/middle dragging and Ctrl/Cmd 0 are retained
Ultra conveniences, not verified Max shortcuts. Max's exact zoom increments,
wheel sensitivity and platform-specific hand-drag gestures were not measured.

`bash apps/ultra/tests/check_canvas_desktop.sh --software-audio /tmp/ultra-canvas-results` exercises
the built Tauri canvas on private Xvfb/D-Bus/AT-SPI, reopens authored JSON and
captures the connected bang/message audio path at gain 4. This mode starts a
disposable 48 kHz / 512-frame PipeWire server on a private socket, with policy-only
WirePlumber and no hardware discovery. The current script always uses private
software audio (the optional `--software-audio` flag is retained for compatibility).
It never qualifies the user's physical output. The committed desktop captures were
made on the local Arch environment; the portable CI gate is the separate
`check_cpal_audio.sh` real CPAL loopback, not an automated desktop UI test.

The same desktop runner checks file delivery during initialization before invoking
`check_documents_desktop.py` for real native
windows, secondary file arguments, same-path focus, native file actions and
Save/Discard/Cancel. It also checks original help opening, typed send/receive
with audio off, all ten list objects with audio off/on, all twelve new MSP kinds,
two-document audio, stopping only one patch, named Receive resuming signals and
global DSP restart. Set
`ULTRA_TEST_DOCUMENTS_ONLY=1` before the runner to execute only those document
checks in its private session. See `../tests/ci/README.md` for the exact commands
and prerequisites; these checks remain separate from browser bridge fixtures.

## Legacy research patcher

The JACK routing/MIDI observations below describe the earlier adapter. The current
Tauri app uses CPAL for all pages: on-screen controls and internal clocks remain
available, but physical MIDI and external MIDI clock are not connected.

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

## Compatible Message Boxes

M, `message` and `msg` create a two-inlet `message_box`, empty by default.
Its cold inlet replaces the displayed template silently; hot `set` replaces
it and bare `set` clears it. Empty boxes send nothing. Nonempty templates
substitute standalone `$1`/`$2` payload atoms under a fixed selector or numeric
first atom; bang recalls the remembered arguments. The displayed template
keeps its literal placeholders. A head placeholder, `symbol $1`, other dollar
syntax, commands with commas/semicolons and quoted/escaped atoms are refused.

Text edits and a single-text Undo/Redo use atomic native admission, retaining
unrelated values, timers and audio state. Editing back to the already saved
text also restores a different live template. Shared views read non-consuming,
serial-matched typed snapshots. Authored text remains limited to 127 ASCII
bytes; typed runtime displays can reach 287 bytes within the eight-atom and
31-byte-symbol profile. Saved legacy `message` boxes retain their one-inlet
literal contract and are authored explicitly as `message.legacy`.

Hot append/prepend/setargs, cold set and zero-atom cold list remain outside
the qualified profile. Clearing or editing a template resets its remembered
arguments to zero as a local policy, not a verified Max transition.
