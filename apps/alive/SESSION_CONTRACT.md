# Alive Session And Ultra Device Contract

Implementation target, session version 2. Acceptance evidence is tracked in `PLAN.md`.

Alive owns one session, up to two instrument tracks, one clip per track, one
shared transport and a stereo master. Each track loads a saved `.ultra` instrument followed by zero, one or two
ordered saved effects through Ultra's versioned manifest and graph validator. Track identity and DSP
state are independent even when their device paths are identical. No DSP source
or patch copy is embedded in the Alive example or host.
Sessions span at most 256 beats and 512 seconds (30..240 BPM).

## Clock And Execution

The native audio callback is the sole audio-frame clock owner at 48 kHz.
Absolute frames advance monotonically while audio is running, even if musical
transport is stopped. Musical position loops/seeks independently. Each
discontinuity clears notes and advances a generation; past-generation work
cannot rearm voices. Intervals are half-open and events at the right endpoint
belong to the next interval. At a shared frame, termination precedes automation,
which precedes note-on. Preparation converts beat positions to integer frames
using round-to-nearest; native events carry exact frame offsets thereafter.
Panel/editor, mixer and transport commands enter a bounded control queue and
take effect at the next callback boundary. They do not claim a UI wall-clock
timestamp or sample-accurate physical controller ingress. Clip/automation
events within that callback retain their exact scheduled sample positions.

Ultra's AOT Faust kernels execute in its native signal evaluator, alongside the
existing Clockwork guest, not inside it. The guest's causal adapter adds 64
frames; the native evaluator has no intrinsic block delay. The first Alive
device profile accepts native signal instruments and rejects legacy Voice
nodes and cross-root named messages. Measure both paths and explicitly report
any chosen host alignment delay; never label startup muting as latency.

## Bounds And Ownership

At most six devices across two tracks, four voices per instrument, 128 notes,
16 automation lanes and 256 automation points per track across its entire chain,
16 manifest parameters per device and 1024 compiled events total. The native
root pool remains sixteen; larger track/device profiles require a new ABI. Host callbacks
accept 1..1024 frames. Admission checks event density as well as total storage.
At most 32 events may share a frame and at most 64 may fall in any 1024-frame
window, counting repeated loop seams. One serialized control producer submits
at most 64 queued commands; the callback consumes a bounded snapshot.
Stop has out-of-band capacity; overload rejects edits without replacing the
working schedule. DSP compilation, allocation, initialization and destruction
are outside the callback. Callback command work has a fixed capacity/budget.

Parameters have saved base and runtime effective values. Enabled automation
owns its parameter during playback (step/hold interpolation). Panel/editor
changes update base state without overriding the automated effective value.
Disabling a lane or stopping restores base. Restart/seek chase the most recent
point at/before position; before the first point use base. This policy applies
identically to device-panel and Ultra-editor bound parameter edits.

Stop, seek, loop wrap, transport end, removal and replacement hard-clear voices,
sustain, pending old events and every effect kernel, including bypassed effects. Mixer mute/solo suppress output but keep the timeline
advancing; mute takes precedence over solo. Track gain is separate from the
device level binding (Alive UI range 0..2; native ABI admits 0..4). Meters are
per-callback peaks of post-mixer signal and stereo master, not RMS or loudness.

## Channels And Lifecycle

Ports carry explicit bundle descriptors; mono and stereo are the supported
speaker layouts. Four discrete voice lanes are internal instrument data, not
speakers. Any mono-to-stereo route is explicit, never inferred from device IDs.
The PR #4 manifest declares a stereo output; authored mono primitives and their
explicit join remain real graph edges. Wider layouts are rejected.
This first device profile requires a declared stereo output; it does not
implicitly duplicate an arbitrary mono device at the track boundary.
Reusable manifests version 1 and 2 normalize to the same host descriptor.
Version 2 declares `kind`, nullable MIDI input, nullable bound audio input and
explicit input/output bundles. The current `alive-session-v2` profile accepts
instruments and declared stereo `audioEffect` devices. Old session-v1 files
strictly migrate into instrument-only v2 chains.
An absent note entry is represented as `noteNode:null`, never an invented node.
The shared `audio.in~` and `lowpass.stereo~` primitives and saved stereo effects
feed the ordered session evaluator. Each hosted root runs once per sample; only
track endpoints enter the master after gain/mute/solo. Live bypass selects the
exact dry sample while wet processing continues, so unbypass resumes warm state
without adding a frame or block delay. Bypass has no automation lane or crossfade.

Device loading/removal and graph structure changes require stopped transport
and stopped callback ownership during preparation/application. A supported live
bound-parameter edit preserves DSP state. An Ultra editor is optional and opens
only on request. Closing it releases UI resources while the hosted device lives
until track removal/session replacement. Saving records base parameters, never
an accidental automation sample or raw runtime memory.
After device I/O stops, `alive_session_reset` releases hosted graph ownership;
only then may the host close or replace document slots. Revisions increase per
slot even across removal and rollback. Prospective native admission runs before
replacement. An unexpected apply failure attempts restoration of the prior
prepared state with fresh revisions and reports any restoration failure.

The desktop exposes `alive [session.alive]` as a separate executable and app
identity (`org.alive.session`). Its shared Rust library/native engine also serve
the `ultra` patch editor; the optional hosted editors remain in Alive's process.
Each binary generates exactly one Tauri context/embedded macOS plist. The legacy
`ultra --alive [session.alive]` entry remains compatible. Both applications can
run at once, with separate native runtime state and application data directories.
Alive's audio settings use the same Rust/CPAL driver and save to its own
`org.alive.session/audio-settings.json`, independently of session files and Ultra
preferences. Host, output and requested buffer are explicit; rate is fixed at
48 kHz/stereo. Automatic and 32..8192-frame requests are admitted only when the
selected device advertises support. Driver callbacks larger than 1024 frames
are partitioned into bounded native calls without losing scheduled offsets;
the observed driver buffer is reported separately from the request.
Audio configuration requires both stopped musical transport and stopped device
I/O. Stop audio terminates transport and notes before reclaiming callback
ownership; starting audio does not start transport. Failed configuration leaves
the saved configuration/session unchanged. Unavailable saved outputs retain
their identifiers and require an explicit recovery selection after refresh.
New opens the packaged two-track template. The current profile permits one or
two tracks and rejects removal of the last track explicitly. Musical changes
are retained separately from the prepared schedule until stopped Apply; latest
accepted live bases, bypass and mixer values are merged by stable instance ID
before preparation. Generic musical drafts cannot alter chain identity, source
hashes, bindings, order or reusable references. File and
Quit actions resolve draft Apply/Discard/Cancel before Save/Discard/Cancel.
Editor commands authenticate the actual native window binding to generation and
instance ID; stale editors cannot edit a replacement or another chain member.
Snapshots expose all manifests and native state indices by instance ID, plus
an instrument compatibility view for the existing two-track UI. UI polling never blocks the
main thread behind a native file/message dialog. Neither editor lifetime nor
polling owns the callback. The JACK diagnostic retains its legacy 64-frame
latency declaration; Alive desktop uses CPAL and the tested native host profile.

## Persistence And Errors

New saves use strict camelCase `alive-session-v2` JSON. `Track.device` is the
instrument and `Track.effects` is its ordered effect list. Each instance has a
persisted UUID-shaped `instanceId`, independent of reusable manifest `id`, source
path, chain position and transient root handle. Automation addresses that
instance ID and a stable parameter key. Reordering retains IDs, bases, bypass
and lanes; effect removal/replacement removes only the affected instance lanes.
The compatibility instrument Remove action removes its entire track, chain and
lanes, preserving every other track; an instrument-less track is never retained.

The original session-v1 shape remains a separate strict migration input. Each
instrument gets `legacy-` plus the first 32 hexadecimal SHA-256 characters of
its track ID, with empty effects, bypass false and retargeted lanes. Migration
validates unique IDs and fingerprints dependencies before returning v2. Missing
v2 fields are errors and never trigger legacy inference.

Every reference requires `sourceSha256`, 64 lowercase hexadecimal bytes over
recursively key-sorted canonical JSON of the complete original source, before
saved instance bases are applied. Arrays and numeric values are preserved;
formatting and paths do not affect the hash. Graph, manifest, preset or appearance
changes require explicit Load/Replace to capture a new fingerprint. Ordinary
Open/prepare/Save compare it and identify track, instance, path and Replace
recovery on missing, changed or incompatible dependencies.

Paths resolve relative to the session file. Save As relocates every instrument
and effect dependency and preserves IDs, hashes and saved values. A session
cannot overwrite any dependency. Session files remain bounded to 1 MiB and saves
use a same-directory temporary file with atomic rename. Only bases are saved,
never an automation sample or raw runtime memory. All candidate graphs, values
and aggregate density receive prospective native validation before device I/O
stops. Failed admission leaves the working model and playback intact. Root
revisions increase per slot even through failed application and rollback; live
base/bypass update the saved model only after native queue admission.
