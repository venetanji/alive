# Alive Session And Ultra Device Contract

Implementation target, session version 3 with explicit legacy v2 compatibility.
Acceptance evidence is tracked in `PLAN.md`.

Alive owns one session, up to eight instrument tracks, four nullable clip slots per track, one
shared transport and a stereo master. Each track loads a saved `.ultra` instrument followed by zero, one or two
ordered saved effects through Ultra's versioned manifest and graph validator. Track identity and DSP
state are independent even when their device paths are identical. No DSP source
or patch copy is embedded in the Alive example or host.
Sessions span at most 256 beats and 512 seconds (30..240 BPM).

## Prospective Workspace Model

The separate `session::workspaces` module implements a strict v4 candidate
model for MIDI/audio sources, distinct Session slots and Arrangement placements,
transactional edits and deterministic legacy conversion. It is not part of
the active `Document` or app Open/Save/Apply paths. Candidate validation checks
pure bounds, identities, references and exact frame arithmetic without native
admission; resolved graph/manifest/PCM checks still precede future installation.
The staged wire/runtime target is documented in
`docs/superpowers/specs/2026-10-26-alive-workspaces-runtime-contract.md`.
No v4 playback capability is enabled by this model-only checkpoint.

The additive native v4 ABI and a native-only one-track MIDI Arrangement subset
are implemented at `db4a934` / `d7f8490`, with approved fixes at `db39ab0`.
The subset renders saved graphs with source offsets, held-note/automation
chase and finite nonlooping placements through the shared clock, queue,
receipts and evaluator. It has separate C/Rust layout, guarded render,
partition and shipping-refusal tests. Separate RED/GREEN regressions and scoped
re-review cover rejected START preserving transport/prior mixer reductions,
and same-frame termination/automation/chased-note/ordinary-note ordering.
Both builds still publish zero feature bits: only a dedicated native test
target may configure this provisional
subset. The shipping app, launcher and active Document remain v3. Multi-track
authority, seek, source/song loops, desktop integration, PCM and measured v4
admission are subsequent gates; this subset does not certify them.

## Clock And Execution

The native audio callback is the sole audio-frame clock owner at 48 kHz.
Absolute frames advance monotonically while audio is running, even if musical
transport is stopped. Musical position loops/seeks independently. Each
discontinuity clears notes and advances a generation; past-generation work
cannot rearm voices. Intervals are half-open and events at the right endpoint
belong to the next interval. At a shared frame, termination precedes automation,
which precedes note-on. Preparation converts beat positions to integer frames
using the independent expression `round(beat * 48000 * 60 / tempo)` for starts,
ends, points and lengths; native events carry exact frame offsets thereafter.
Authored beat values are never rewritten from frame positions.
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

The original policy admits two tracks and six devices; the separate larger
policy admits eight tracks and sixteen devices. Both retain four voices per instrument, 128 notes,
16 automation lanes and 256 automation points per track across all stored clips
and its entire chain, including disabled lanes,
16 manifest parameters per device and 1024 compiled events total. The native
root pool remains sixteen. Admission requires the native profile's explicit
ADMITTED feature and matching policy; wider ABI storage alone enables nothing.
Atomic multi-track actions remain disabled. Host callbacks
accept 1..1024 frames. Admission checks event density as well as total storage.
At most 32 events may share a frame and at most 64 may fall in any 1024-frame
window, counting repeated loop seams. One serialized control producer submits
at most 64 queued commands; the callback consumes a bounded snapshot.
Stop has out-of-band capacity; overload rejects edits without replacing the
working schedule. DSP compilation, allocation, initialization and destruction
are outside the callback. Callback command work has a fixed capacity/budget.
V3 additionally applies the native policy-1 graph family and conservative
per-track clip envelopes with queried work ceilings. The saved subtractive,
Utility and stereo-lowpass devices are supported. Arbitrary graphs accepted by
v2 may be refused by v3; Alive does not remove nodes or bindings to fit them.
Density/work errors identify available track/clip contributors, saturated counts
and conservative-envelope refusals. Reduce dense events or chain work and retry;
admission never silently trims the score or increases limits.

Parameters have saved base and runtime effective values. Enabled automation
owns its parameter during playback (step/hold interpolation). Panel/editor
changes update base state without overriding the automated effective value.
Disabling a lane or stopping restores base. V3 restart/seek/switch chase the most
recent point strictly before the landing phase; a point exactly at landing
dispatches once through its normal event range. V2 retains inclusive at/before
chase. Before the first point use base; enabled empty lanes still own the
parameter while playing. Notes already in progress are not chased. This applies
identically to device-panel and Ultra-editor bound parameter edits.

Stop, seek, loop wrap, transport end, removal and replacement hard-clear voices,
sustain, pending old events and every effect kernel, including bypassed effects. Mixer mute/solo suppress output but keep the timeline
advancing; mute takes precedence over solo. Track gain is separate from the
device level binding (Alive UI range 0..2; native ABI admits 0..4). Meters are
per-callback peaks of post-mixer signal and stereo master, not RMS or loudness.

Selection, saved default, prepared clip, active clip/phase and pending action are
separate states. Stopped Launch cues a prepared clip at phase zero. Playing Launch
targets the next strict four-beat bar; single-track Stop silences only that track.
Global Stop has reserved capacity, invalidates pending actions and remains usable
with stale view identities. Global transport wrap resets active phases. Reopen
and Apply install saved defaults stopped at phase zero; Start resumes the current
cues rather than reselecting defaults.

Atomic scene launching uses one of the four prepared slot positions across all
configured tracks. Occupied members launch; empty members issue quantized track
Stop. An all-empty row is valid and preserves global transport. One scene has
one native request, queue entry, serial, receipt and target. Both the configured
profile's ADMITTED and ATOMIC_TRACK_ACTIONS capabilities must be enabled. Native
callers may address a nonempty subset; the desktop always includes every prepared
track. Invalid members, a busy receipt cell or a full queue reject the whole new
request before changing musical state. Global Stop retains its reserved mailbox.

`alive_launch_scene` accepts only generation, canonical decimal-string
preparationRevision and slot (0..3), from the main session window with audio
running. It maps the immutable prepared bank, independent of draft edits and
local selection. Scene gestures retain their preparation identity through the
UI command queue. Audio-off refusal is `Start Audio to launch a scene`.
Scene actions change neither saved defaults nor document, history, dirty state,
device/editor ownership or settings. No scene object is added to the saved schema.

After callback observation, the pending/applied/superseded/canceled/rejected
masks partition a track-action receipt's track mask. Status remains PENDING
while any member is pending, then becomes its sole terminal kind or MIXED.
Later actions supersede only overlapping unresolved members; the others retain
the common target. Candidate admission is all-or-none: old pending choices
survive optional refusal, while new surviving members become rejected and
already reduced superseded/canceled members retain their outcomes. Published
applied members are immutable. Stopped cues remain distinct from playback.

The scalar error is a request summary with priority RuntimeInvariant >
StopCanceled > WorkLimit > EndCanceled > ReplacedRequest. It does not assign that
reason to every member. Desktop projection retains all masks and each member's
track/clip identity, action and observed outcome. Missing terminal observations
remain unavailable; known terminal members remain known. Serial and preparation
must both match. A partially pending scene keeps its one receipt reservation;
a coherently observed terminal MIXED receipt permits reuse. No timer estimates
native targets and no automatic retry is performed.

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
explicit input/output bundles. The current session profile accepts
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
An observed buffer of at least 256 frames remains practical guidance for the
original 2/6 policy. The larger 8/16 policy uses at least 512 observed frames,
preferring 1024 near its work bounds. These are guidance, not automatic settings
changes or guarantees against physical underruns. Smaller buffers are diagnostic
choices. Stream epochs survive Stop and merge exactly once after witnessed
callback retirement; see `STREAM_OBSERVABILITY.md` for the bounded retention,
typed-error and timing boundaries. Polled zero errors do not prove zero physical
underruns.
Audio configuration requires both stopped musical transport and stopped device
I/O. Stop audio terminates transport and notes before reclaiming callback
ownership; starting audio does not start transport. Failed configuration leaves
the saved configuration/session unchanged. Unavailable saved outputs retain
their identifiers and require an explicit recovery selection after refresh.
New opens the packaged two-track template using the unchanged smaller policy.
Strict v3 permits one to eight tracks within the admitted profile; legacy v2
retains its two-track bound. Removing the last track is explicitly rejected. Musical changes
are retained separately from the prepared schedule until stopped Apply; latest
accepted live bases, bypass and mixer values are merged by stable instance ID
before preparation. Generic musical drafts cannot alter chain identity, source
hashes, bindings, order or reusable references. File and
Quit actions resolve draft Apply/Discard/Cancel before Save/Discard/Cancel.
Editor commands authenticate the actual native window binding to generation and
instance ID; stale editors cannot edit a replacement or another chain member.
Snapshots expose all manifests and native state indices by instance ID, plus
an instrument compatibility view. Capacity, add/remove controls, selection,
clip controls and per-track diagnostics use the admitted bounds. UI polling never blocks the
main thread behind a native file/message dialog. Neither editor lifetime nor
polling owns the callback. The JACK diagnostic retains its legacy 64-frame
latency declaration; Alive desktop uses CPAL and the tested native host profile.

## Persistence And Errors

Admitted clip-bank saves use strict camelCase `alive-session-v3` JSON; legacy
fallback saves remain v2. `Track.device` is the
instrument and `Track.effects` is its ordered effect list. Each instance has a
persisted UUID-shaped `instanceId`, independent of reusable manifest `id`, source
path, chain position and transient root handle. Automation addresses that
instance ID and a stable parameter key. Reordering retains IDs, bases, bypass
and lanes; effect removal/replacement removes only the affected instance lanes
across all stored clips.
The compatibility instrument Remove action removes its entire track, chain and
lanes, preserving every other track; an instrument-less track is never retained.

The original session-v1 shape remains a separate strict migration input. Each
instrument gets `legacy-` plus the first 32 hexadecimal SHA-256 characters of
its track ID, with empty effects, bypass false and retargeted lanes. Migration
validates unique IDs and fingerprints dependencies before returning v2. Missing
v2 fields are errors and never trigger legacy inference.

V2-to-v3 migration moves each track's unchanged score into slot 0, names it
`Clip 1`, copies the global length into its independent clip length, sets it as
the saved default and leaves three null slots. Track/device IDs, source hashes,
bases, mixer and authored values stay unchanged. Clip IDs are `clip-` plus the
first 32 lowercase SHA-256 hex characters of the length-prefixed UTF-8 parts
`["alive-v2-v3-clip", track.id]`; note IDs use `note-` and
`["alive-v2-v3-note", track.id, canonical_zero_based_note_index]`. Each part is
prefixed by its unsigned 32-bit big-endian byte length. Collisions reject.

Open first prepares a playable legacy candidate. Conversion uses the same
captured dependencies without refingerprinting. Stricter v3 graph, frame,
density or work refusal retains the runnable v2 candidate and the exact reason.
Missing/changed sources, invalid v2 and invalid explicit v3 fail normally and
preserve the working session. Successful conversion is dirty in memory; Open
does not rewrite disk. An explicit stopped Enable clip bank action retries after
resolving drafts; Save and ordinary Apply do not implicitly retry fallback.

V3 tracks have exactly four required nullable `slots` and required nullable
`defaultClipId`. Each clip contains `id`, `name`, `lengthBeats`, `notes` and
`automation`; each note has a required globally unique ID. Track/device/clip/note
IDs are unique within their own namespaces. Defaults name a clip on their own
track or null. Empty banks are valid. Unknown fields, duplicate JSON members
(including parameter-map keys), missing fields, invalid values and unsupported
formats reject. The duplicate-member pass reads original v3 text, preserving
legacy decoder semantics. Notes and points fit their own clip, including disabled
lanes; duplicate `(instanceId,key)` lanes within one clip reject.

Every reference requires `sourceSha256`, 64 lowercase hexadecimal bytes over
recursively key-sorted canonical JSON of the complete original source, before
saved instance bases are applied. Arrays and numeric values are preserved;
formatting and paths do not affect the hash. Graph, manifest, preset or appearance
changes require explicit Load/Replace to capture a new fingerprint. Ordinary
Open/prepare/Save compare it and identify track, instance and path on missing,
changed or incompatible dependencies. Shared paths are resolved canonically,
including symlink aliases. Selected Replace cannot install while another
reference still expects the original hash of a changed shared file. Preserve
the changed source at a new path, restore a matching original backup at the
shared path, then explicitly Replace each intended instance. Recovery requires
that matching original backup; siblings are never silently refingerprinted.

Paths resolve relative to the session file. Save As relocates every instrument
and effect dependency and preserves IDs, hashes and saved values. A session
cannot overwrite any dependency. Session files remain bounded to 1 MiB and saves
use a same-directory temporary file with atomic rename. Only bases are saved,
never an automation sample or raw runtime memory. All candidate graphs, values
and aggregate density receive prospective native validation before device I/O
stops. Failed admission leaves the working model and playback intact. Root
revisions increase per slot even through failed application and rollback; live
base/bypass update the saved model only after native queue admission.
Save returns the exact atomically written/rebased document instead of reopening
and potentially changing its mode. Saved defaults are persisted; selection,
active/pending clips, phase, receipts and runtime counters are not.

## Pending Musical Edits And Piano Roll

The selected-clip editor supports v3 and the retained single-score v2 mode. Its fixed 1/16-note grid
is 0.25 quarter-note beat. Double-click adds a selected note with duration 0.25
and velocity 100; body movement snaps displacement and pitch in semitones,
right-edge resizing snaps duration displacement. Imported fractional offsets and
durations remain exact. Numeric fields retain precise editing. Note pitch is
0..127, velocity 1..127, duration at least one rounded audio frame. Same-pitch
half-open frame intervals cannot overlap. Length changes cannot truncate notes
or automation, including disabled lanes. Gesture geometry is captured on pointer
down; cancellation, Escape or version changes discard an unfinished gesture.
Selection alone changes no score, history or transport. One completed pointer or
velocity gesture is one transaction. Keyboard editing/undo is scoped to the roll.

Rust Control owns focused musical projections (title, tempo, length, looping,
track IDs/names, clip slots/IDs/names/lengths/defaults, notes/IDs and automation),
bounded to 64 entries and 8 MiB combined
serialized before/after payload plus labels across undo/redo. Oldest entries are
evicted; an individually oversized entry rejects atomically. Live parameter
bases, bypass and mixer, device identity/graphs, paths, runtime and UI selection
are excluded. Restoring a projection uses current chain structure and accepted
live fields by instance ID, with mixer fields by track ID. Undo to prepared music
removes the draft and retains redo; accepted live-control dirty state survives.

Main-window `alive_edit(document, label, generation, draftRevision)` and
`alive_history(direction, generation, draftRevision)` authenticate both versions
under the desktop mutex. Labels are plain text, 1..64 UTF-8 bytes without control
characters. Direction is strictly `undo` or `redo`. Musical ranges, targets and
rounded frames validate before retention using current manifests; final source,
graph and native-density admission remains at Apply. An identical projection is
a no-op. Rejected or stale requests preserve the draft, history and revision.
There is no writable `alive_draft` bypass. Snapshot exposes monotonic
`draftRevision` and `history` availability/labels. Renderer edits serialize and
use returned revisions, and failed/ambiguous outcomes require authoritative
refresh. File and structural requests also authenticate the current revision.

Apply takes only generation/revision and prepares the retained authoritative
draft. Successful Apply/Discard/New/Open/structural installation clears history;
failed direct Apply or prospective Open preserves it. A successful explicitly
accepted Apply/Discard is an immediate scope boundary even if a later file/Quit
prompt cancels or fails. Canceled dialogs before a boundary preserve history.
Save/Save As without a boundary preserves history; reference/path relocation
advances revision to reject pre-relocation documents while retaining redo and
editor bindings. Live controls, transport, audio and editor lifecycle do not
advance musical revision or history. Undo/redo do not reinstall DSP, stop audio,
advance desktop generation or close editors. Ultra patch undo remains separate.

Focused authenticated clip operations create, duplicate, delete, rename, change
length/default or create a note through that same history gate. Rust allocates
fresh IDs checked against prepared, draft and retained history identities.
Duplication deep-copies score data with new clip/note IDs and keeps the existing
track devices. Deletion leaves a null slot and clears a deleted saved default;
it never compacts slots. Whole-document edits may only retain current clip
membership and existing note identities. They cannot invent, reassign or
resurrect IDs. Delayed renderer intents capture originating track/clip/note IDs
and scope; selection changes cancel unfinished gestures.

Draft-only clips cannot launch. Modified prepared clips can explicitly launch
their prepared version. A draft deletion does not silence an active prepared
clip; its runtime identity remains visible and track Stop remains available.
Draft/history/selection/launch/Stop/Save As preserve editor bindings; successful
Apply and structural installation retain the existing editor-close boundary.

Native preparation revisions advance for every install attempt and rollback;
desktop generation still denotes successful installation. Canonical decimal
strings carry native 64-bit frames, epochs, serials and preparation identities
to JavaScript. Snapshots carry an ordering sequence, mode, bounded capabilities,
prepared ID maps and coherent runtime state. The renderer rejects late snapshots.
Single-track launch/Stop requests name prepared persistent IDs and current
preparation. Bounded observations match both native request keys and distinguish
queued, pending, applied, rejected, superseded, canceled and unavailable states.
A queued return does not imply application; receipt eviction never implies
success. Poll failure marks state unavailable while retaining observations.
