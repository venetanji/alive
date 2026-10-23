# Alive Session And Ultra Device Contract

Implementation target, version 1. Acceptance evidence is tracked in `PLAN.md`.

Alive owns one session, up to two instrument tracks, one clip per track, one
shared transport and a stereo master. Each track loads a saved `.ultra` file
through Ultra's versioned manifest and graph validator. Track identity and DSP
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

Ultra's AOT Faust kernels execute in its native signal evaluator, alongside the
existing Clockwork guest, not inside it. The guest's causal adapter adds 64
frames; the native evaluator has no intrinsic block delay. The first Alive
device profile accepts native signal instruments and rejects legacy Voice
nodes and cross-root named messages. Measure both paths and explicitly report
any chosen host alignment delay; never label startup muting as latency.

## Bounds And Ownership

At most two devices, four voices each, 128 notes and 256 automation points per
track, 16 manifest parameters and 1024 compiled events total. Host callbacks
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

Stop, seek, loop wrap and removal hard-clear voices, sustain, pending old
events and delay state. Mixer mute/solo suppress output but keep the timeline
advancing; mute takes precedence over solo. Track gain is separate from the
device level binding (Alive UI range 0..2; native ABI admits 0..4). Meters are
per-callback peaks of post-mixer signal and stereo master, not RMS or loudness.

## Channels And Lifecycle

Ports carry explicit bundle descriptors; mono and stereo are the supported
speaker layouts. Four discrete voice lanes are internal instrument data, not
speakers. Any mono-to-stereo route is explicit, never inferred from device IDs.
The PR #4 manifest declares a stereo output; authored mono primitives and their
explicit join remain real graph edges. Wider layouts are rejected.

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

## Persistence And Errors

An `alive-session-v1` JSON file records tempo, looping/range, tracks with stable
IDs, device path/stable ID/manifest version, parameter base values, clips,
automation lanes and mixer values. Device paths resolve relative to the session
file. Load validates all references and ranges before replacing active state;
missing/incompatible devices identify track, path and cause. Failed load/save
must preserve the current session and existing file. Save uses a same-directory
temporary file and atomic rename. No implicit overwrite of the source Ultra
instrument occurs when editing an instance's base parameters.
