# Live MIDI Editing and Preview Design

Scope: current V4 profile1 workspaces. No legacy format conversion or migration.
User goal: hear completed piano edits immediately during playback, and audition
piano keys/added/selected/moved notes with a set-wide Preview toggle.

## Reference evidence

Official Live12 manual, fetched via Context7 library
`/websites/ableton_en_live-manual_12`:
https://www.ableton.com/en/live-manual/12/editing-midi/

Section10.1 item6 and10.4.2 establish Preview above the piano ruler, sound through
an instrument on key/add/select/move actions, and a setting applied to all MIDI
tracks. Section10.2.2 describes Chase MIDI Notes as a separate control. These
sources do not establish exact duration, physical retrigger or held-edit semantics.
Parent owns requested reference-binary investigation. No unverified native binary
semantics are asserted by this implementation.

## Architecture

Off-callback ingress compiles a note-only source replacement against prepared
tempo, preserves source automation and all other sources, validates complete
ordinary/fine-launch work proofs, and writes one inactive immutable bank. Callback
consumes a bounded request after current-frame ordinary dispatch, reconstructs
held pitch ownership at actual source phase, verifies old-ledger/new-future guard,
then activates bank index. No configure, graph install, root reset, timing in JS,
callback allocation/free/locks, or transport restart is used for source edits.

Two banks are sufficient because only one edit may be pending; callback retirement
is published after a coherent APPLIED/rejected receipt. New serial starts QUEUED.
AudioStop resolves/cancels pending MIDI before publishing; ordinary AudioOff can
commit synchronously through existing quiescent native ownership.

Rust stages candidate/history off callback. Only APPLIED commits prepared source
notes/events/schedule and one musical history transaction. Rejected edits preserve
music/history/revision. Latest live mixer/device/base/bypass/Master fields are
merged into surviving unrelated drafts. Musical projection controls eligibility;
before-source notes must equal prepared notes so earlier pending notes cannot be
silently promoted. Incompatible/unprepared source changes keep explicit draft/Apply.

## Preview and ownership policy

Preview is transient, set-wide and initially off. UI sends coalesced note intent
with stable generation/preparation/track/source and releases exact returned tokens.
Real native instrument/effect/Master processing runs while transport is stopped.
Same-pitch scheduled notes share physical voice ownership without retrigger or an
early physical off. Velocity-only source edits affect future note-ons.

Preview lasts through pointer/key gesture, with native expiry2sec and ordinary
release tail bounded0.5sec. Completion/cancel/blur/scope/toggle-off/dispose release.
GlobalStop/AudioStop reset Preview DSP roots/tail immediately. Existing source
loop/launch/seek/root discontinuities terminate Preview token; no restoration is
charged outside proof. These timings/discontinuity choices are explicit local
policy. Native release mailbox is independent of queue saturation; Rust release
waits for Control off Tauri main thread.

## Bounds and refusal

Global ceilings remain32 MIDI events/frame and64/rolling1024frames. Additional
MIDI work is capped10 events/window including one guaranteed release. Past and
future MIDI work share that allowance. Source reconstruction scan/horizon work is
reserved before execution. Dense preparations lacking the complete optional proof
refuse capability, leaving ordinary V4 admission unchanged. Runtime exhaustion
refuses visibly, retains prior music/history, and never schedules timed retries.
Untouched Quantized MIDI fits54+10=64; the four-held-note fixture's fine proof72
exceeds64 before reserve and remains intentionally unsupported for optional MIDI.

UI preserves existing compact charcoal/LiberationSans piano design. Toolbar wraps
at narrow widths; native callback refusal is surfaced and pending edit disables
Apply/Discard until receipt. See report.md and commands.md for exact verification.
