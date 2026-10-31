# Alive Session And Ultra Device Contract

Alive uses one current document model: a v4 workspace score inside a v6 saved
session envelope. Open and Save use this format directly. Previous Alive file
formats and conversion workflows are outside the application contract.
`PLAN.md` lists current product priorities; dated experiments retain the evidence
for their particular builds.

## Document And Devices

One session owns a shared transport, up to eight logical MIDI/audio tracks and
one stereo Master. Each track has four nullable Session slots. Slots and
Arrangement placements reference stable source identities; editing a source
updates its references until Make source independent is used. Track, slot,
placement, source, note and device identities are explicit.

A MIDI chain has an optional saved `.ultra` instrument. An empty MIDI track is
valid and silent. An audio chain plays prepared WAV sources. Either chain can
contain up to two ordered saved stereo effects. The admitted workspace profile
has at most six hosted DSP roots and four voices per instrument. Only profile 1
is available; logical track capacity does not increase the DSP work allowance.

Devices retain their source path, canonical graph fingerprint, manifest identity,
parameter bases and bypass. The host validates the saved graph, manifest,
parameter bindings and explicit stereo bundles. Instrument and effect instances
remain independent even when they reference the same source file. No patch copy
is embedded in a session. Missing or changed dependencies refuse Open without
replacing the working project. A replacement does not rewrite sibling hashes.

Graph loading, removal, replacement and reordering require stopped transport.
Device-panel controls and hosted Ultra editors share manifest-bound bases.
Unbound graph structure is read-only in a hosted editor. The editor does not own
DSP lifetime. Bypass keeps the wet effect processing while selecting dry output.

## Clock And Playback

The native callback owns the 48 kHz frame clock. Absolute frames advance while
Audio runs; musical position can stop, seek and loop independently. Beat-to-frame
conversion uses `round(beat * 48000 * 60 / tempo)` for each boundary. Intervals
are half-open. At a shared frame, termination precedes automation, then note-on.
Tempo is bounded to 30..240 BPM; song and MIDI source lengths are bounded to
256 beats and 512 seconds.

Session launch overrides that track's Arrangement authority. Track Stop retains
a silent Session override; Return resumes Arrangement at the current song
position. View navigation and selection do not change authority or start sound.
Global Stop releases notes and cancels outstanding musical publications. Seek,
loop and source boundaries use the native chase/reset rules and invalidate stale
work. Mute/solo suppress output while musical time continues; mute takes
precedence over solo.

Clip occurrences carry independent `start`, `end`, `loopStart`, `loopEnd` and
`loopEnabled` values in source beats. Start may precede the loop for an intro.
Selecting time and using Ctrl+L sets the clip loop and Start while retaining
source contents and End. An Arrangement selection sets the song loop instead.
Placement span, source content, occurrence markers and song loop are separate.

Enabled step/hold automation owns effective parameter values during playback.
Panel changes update the saved base without overriding an owning lane. Stop or
an unowned interval restores the base. Native playback handles landing-point
and held-note chase; renderer timers do not schedule musical events.

## Immediate Musical Editing

Completed note, automation, region, placement, tempo and empty-track edits use
one complete candidate publication. Pure model validation, graph/PCM preparation
and bounded native schedule admission precede installation. Admission never
trims content or increases work limits to make a candidate fit.

The native callback accepts a publication at a playback boundary. Rust commits
the document and Undo history only after observing the matching APPLIED receipt
and retired publication serial. Rejection or Stop cancellation retains installed
music and history. Both old and candidate PCM owners survive until native
retirement proves they are no longer referenced. Metadata-only saves retain the
installed schedule and PCM owners.

Undo/Redo uses the same publication path, with up to 64 entries and 8 MiB of
musical history. Projections preserve current mixer values, device bases and
bypass by stable identity. No-op edits do not consume history. Fresh IDs are
checked against current and retained history identities. UI commands carry their
session generation and edit revision; stale edits cannot modify a replacement
project. Numeric native revisions cross JSON as canonical decimal strings.

Ctrl+T inserts an empty audio track; Ctrl+Shift+T inserts an empty MIDI track after
the selection. Double-click or Ctrl+Shift+M on an empty MIDI slot creates a
one-bar clip in one Undo step during playback. In Arrangement, Ctrl+Shift+M
creates a MIDI clip over the selected span. Musical editing has no confirmation
or separate Apply step. File actions retain ordinary unsaved-project decisions.

Preview starts disabled and auditions MIDI keys and note gestures through the
selected instrument/effects. It has separate workload admission and can start
Audio while transport is stopped. Ordinary editing does not start Audio.

## Quantized Requests

Global quantization supports None, 1/32, 1/16, 1/8, 1/4, 1/2 and 1/2/4/8 Bars
in fixed 4/4. Each occupied Session slot can inherit Global or use its own grid.
Settings affect future requests; a queued request retains its captured grid and
target. Scene launch, track Stop and Return use Global. Global Stop is immediate
and retains reserved command capacity.

A scene uses one slot position across all tracks. Occupied members launch and
empty members stop their tracks atomically. An all-empty row is valid. Requests
capture generation/preparation identity and refer to the installed bank, not
renderer selection. Scene actions do not change the saved document or history.

Receipts preserve pending/applied/superseded/canceled/rejected member masks and
track/source/slot identities. Serial and preparation revision must both match.
A terminal MIXED result retains each member's actual outcome. Missing native
observations remain unavailable; the renderer does not estimate targets or
silently retry. Fine launch grids have an independent conservative work proof
and may refuse even when a coarser grid is admitted.

## Audio Sources And Ownership

WAV import supports mono/stereo PCM 8/16/24/32-bit and float 32/64-bit files,
8..192 kHz, at most 24 MiB and 60 seconds per file. Import canonicalizes the path
before inspecting it. Preparation owns stereo 48 kHz PCM, bounded to 60 seconds
per source and 64 MiB across the session. Re-Pitch follows set tempo by changing
sample playback speed and pitch together. Source bytes remain external.
Audio source tempo is editable from 30..240 BPM. Changing it scales source beat
coordinates for automation and every slot/placement region, keeping their sample
positions; placement starts/durations remain fixed. The full source endpoint is
bounded to its recomputed duration. Prepared PCM is replaced through the same
acknowledged musical publication and retirement path as other audio edits.

Save As rebases resolved audio and device paths and prevents a session save from
overwriting a dependency, including symlink aliases. Retained history audio paths
rebase with the document. Input routing, monitoring, arm and recording remain
upcoming work. The separate native Live DLL experiment has not yet been integrated
into the installed session host.

## Master, I/O And Lifecycle

Master gain is saved in the v6 envelope and bounded to 0..4. It follows the
track/effect/mixer sum. Session and Arrangement display the same stereo peaks and
digital-overload latch; reset affects the latch, not playback. Peaks above full
scale indicate digital overload, not a physical clipping measurement.

Alive and Ultra are separate executables and application identities. Alive opens
one session and optional hosted editors; Ultra remains the patch editor. Audio
uses the shared CPAL driver at 48 kHz with separate per-app settings. Stop Audio
also stops transport and releases notes. Configuration changes require stopped
Audio and retain rejected saved values.

DSP compilation, allocation, initialization and destruction occur outside the
callback. Schedule limits include 32 events/frame and 64 events/1024-frame
window. Work admission remains independent of structural storage bounds. The
stream retirement witness, finite metrics ring and shutdown rules are documented
in `STREAM_OBSERVABILITY.md`. Observed errors, budget exceedances and physical
underruns remain distinct. Historical native measurement policies apply only to
the recorded fixtures/builds; they do not expand current admission.

Persistence is atomic and bounded to 1 MiB of UTF-8 JSON. Decoding rejects
unknown fields, duplicate members, invalid IDs, foreign references and unsupported
formats. Successful Save preserves exact current identities, Master and launch
settings. Failed Open or save validation leaves the working session available.
