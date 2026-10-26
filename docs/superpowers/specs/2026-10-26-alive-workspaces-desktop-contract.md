# Alive Workspaces Desktop Contract

Status: accepted design supplement, 2026-10-26. Not implemented or admitted.
This pins the existing runtime contract section 7 and integration-map decisions;
it does not replace the architecture, implementation plan or safety bounds.
Task 2C-prep owns complete MIDI envelopes/oracle. Task 2D implements the MIDI
portion after its native prerequisites; audio-specific history belongs to
Task 3. Source references describe the inspected `5abd9eb` foundation.

Inspected boundaries: `session/workspaces.rs` strict model and focused edits;
`desktop.rs` Snapshot, edit/history, transport, Save As and device controls;
`runtime.rs` prepared clips/receipts; `history.rs` projections;
`persistence.rs` dependency rebasing; `native_v4.rs` declarations; and existing
`ui/alive-model.mjs`/`alive.mjs` readers. Paths are under `apps/ultra/`.

## 1. Minimal prepared and snapshot DTOs

Retain the existing Snapshot envelope, safe numeric generation/draftRevision,
canonical decimal preparationRevision/snapshotSequence, full document/draft,
history, state, audio, editor scope and deviceInstances. Add the fields below;
dispatch by `mode: "workspacesV4"`. For v4, `devices: []` and
`preparedClips: []`; neither old field becomes a partial compatibility list.
Old modes retain their existing payloads and behavior.

The following is an exact JSON shape, expressed as TypeScript types.
All listed fields are present; nullable means explicit JSON null, not omission.
`U64` means the existing canonical unsigned decimal string with u64 validation;
`Id` is the saved stable token. Native indices remain internal except the
existing device index and track index used by current readers.

```ts
type U64 = string;
type Id = string;
type Authority = "arrangement" | "session";
type TrackChainV4 = {
  trackId: Id;
  kind: "midi" | "audio";
  instrumentId: Id | null;
  effectIds: Id[];
};
type PreparedSourceV4 = {
  trackId: Id; sourceId: Id; kind: "midi" | "audio";
  name: string; lengthFrames: U64;
};
type PreparedSlotV4 = {
  trackId: Id; slotId: Id; slot: number; sourceId: Id;
  name: string; sourceOffsetFrames: U64; loopEnabled: boolean;
};
type PreparedPlacementV4 = {
  trackId: Id; placementId: Id; sourceId: Id;
  startFrame: U64; durationFrames: U64;
  sourceOffsetFrames: U64; loopEnabled: boolean;
};
type PreparedWorkspacesV4 = {
  preparationRevision: U64;
  sources: PreparedSourceV4[];
  slots: PreparedSlotV4[];
  placements: PreparedPlacementV4[];
};
// Additive Snapshot fields:
// trackChains: TrackChainV4[]             (empty in old modes)
// preparedWorkspaces: PreparedWorkspacesV4 | null (null in old modes)
```

`trackChains` follows prepared document track order; effectIds follows saved
effect order, independent of native root sorting. `deviceInstances` remains
`Record<instanceId, {index, track, manifest}>`: its manifest proves role/kind,
and trackChains names the real instrument/effects. Every listed device exists
exactly once on its own track; an empty audio chain has instrumentId null and
effectIds empty. No extra role/index alias is necessary. Draft musical edits
cannot change chain membership, so these maps safely serve current detail and
editor readers until the next successful structural install.

Prepared source/slot/placement arrays use the contract's preparation ordering,
include stable IDs and labels from the prepared document, and never derive
names, indices or source links from a pending draft. Empty slot cells have no
PreparedSlot record; `(trackId, slot)` absence is explicit empty membership.
All occurrence sourceId fields are nonnull because preparation requires a
resolved source. The inner preparationRevision equals the outer revision;
retain these records as one immutable preparation-scoped value. Draft edits
and Save As cannot mutate it. Saving may rewrite file paths, which these
reader DTOs deliberately do not contain. Runtime actions look up only this
preparation's maps; edit gestures look up the current draft and its revision.

Add capability booleans `workspaces`, `arrangement`, `audioSources` and numeric
`maxSources`, `maxPlacements` to existing capabilities (false/zero in old
modes). Keep existing fields, including atomicTrackActions; v4 clipBank means
its four-slot Session bank. Derive each v4 value from the selected v4 profile's
actual negotiated limits/features: no v3 capacity fallback, no inferred eight
track qualification, and no audio feature inferred from schema support.
`workspaces` requires admitted plus Arrangement; atomicTrackActions additionally
requires its bit. `audioSources` requires admitted AUDIO and its real desktop
preparation/readers. This introduces no larger capacities.

Controller ruling: additionally expose the required boolean
`capabilities.workspaceConversionAvailable`. In legacy/v3 mode it offers the
explicit conversion operation when a measured, admitted native v4 Arrangement
profile and its desktop conversion support are available; it does not promise
admission of this project. It is false once v4 is active. This discovery flag
is independent of installed-mode workspaces/arrangement/audioSources and
capacity fields, which retain the meanings above. The conversion command still
strictly prepares and admits the complete candidate against an applicable v4
profile, and refuses unsupported music or capacity without changing the current
session. Cost is one capability field and the existing conversion control's
gate. Check v2/v3 discovery with supported versus unavailable backends, false
discovery in active v4, and transactional refusal when discovery is true but
the complete candidate fails validation or admission.

```ts
type WorkspaceTrackObservationV4 = {
  trackId: Id;
  authority: Authority | null;
  activeSlotId: Id | null; activePlacementId: Id | null;
  activeSourceId: Id | null; phase: U64 | null; epoch: U64 | null;
  pendingAction: "launch" | "stop" | "return" | null;
  pendingAuthority: Authority | null;
  pendingSlotId: Id | null; pendingSerial: U64 | null;
  pendingFrame: U64 | null;
};
type WorkspaceRequestMemberV4 = {
  trackIndex: number; trackId: Id;
  slotId: Id | null; sourceId: Id | null;
  action: "launch" | "stop" | "return";
  authority: Authority;
  status: string; // existing closed status vocabulary
};
type WorkspaceRequestResultV4 = {
  kind: "launch" | "stop" | "return" | "scene" | "start" | "seek";
  preparationRevision: U64; requestSerial: U64;
  status: string; reason: number;
  trackId: Id | null; slotId: Id | null; sourceId: Id | null;
  sceneSlot: number | null; targetFrame: U64 | null;
  trackMask: number; pendingMask: number; appliedMask: number;
  supersededMask: number; canceledMask: number; rejectedMask: number;
  members: WorkspaceRequestMemberV4[];
};
type WorkspaceRuntimeViewV4 = {
  tracks: WorkspaceTrackObservationV4[];
  requests: WorkspaceRequestResultV4[];
  requestedStopEpoch: U64; appliedStopEpoch: U64;
};
```

`Snapshot.runtime` is this view in v4 (existing v3 view in v3). A coherent v4
native observation always has authority and epoch. Null authority/phase/epoch
means unavailable, never Arrangement by default. The smallest implementation
preserves runtime.rs's existing failed/incoherent poll error instead of
manufacturing partial observations; null types keep reader fallback honest.
Map source phase only with an active source; gaps and Session silence have
null phase and active IDs. Authority still distinguishes them. Active slot and
placement are mutually exclusive. For a pending launch/Stop, pendingAuthority
is Session; for Return it is Arrangement; with no pending action every pending
field is null. Do not predict a Return's future placement/source from submit
time. Native owns resolution at its application frame.

For requests, keep existing statuses, masks, receipt reconciliation and 128
tracked-request bound. `kind` comes from the submitted typed action, because
native TRACK_ACTIONS alone does not distinguish scene/global return. Launch
has top-level track/slot/source IDs; Stop has trackId only. Return and Scene
use members (top-level IDs null); only Scene has sceneSlot. Start/Seek have
empty members and null top-level IDs. Member authority names the requested
target, never an observation: launch/Stop -> Session, Return -> Arrangement.
Only launch members carry slot/source IDs; empty scene cells are Stop members.
Request IDs and labels survive draft deletion through prepared maps.

Cost/checks: additive serializers and exhaustive mode branches in existing
readers, not a second document model. Check explicit null serialization,
decimal extremes, same-preparation labels after draft edits, effect-at-index-0,
empty audio-chain fixtures, both silent authorities, pending versus observed
authority, global-return classification, and late snapshots/receipt members.

## 2. Command-primary affected IDs

Use the existing clip response pattern:

```ts
type WorkspaceEditResultV4 = {
  snapshot: Snapshot;
  affected: {
    trackId: Id | null; sourceId: Id | null; slotId: Id | null;
    placementId: Id | null; noteId: Id | null;
  };
};
```

These are primary command context, not the pure model's complete invalidation
set. All five fields are required. Deleted primary IDs are returned as IDs;
the UI clears selection if that record no longer exists. For an accepted no-op,
return its same target IDs without advancing history/revision. Source edits
with several readers do not arbitrarily pick one occurrence.

In this table, `-` means null; `new` means the new candidate record; `old`
means resolve from the authenticated pre-edit document.

| Existing edit operation | trackId | sourceId | slotId | placementId | noteId |
| --- | --- | --- | --- | --- | --- |
| SourceCreateMidi | input track | new source | - | - | - |
| SourceRename / SourceLength / AutomationSet | owning track | input source | - | - | - |
| SourceDelete | old owning track | deleted source | - | - | - |
| SourceIndependent(Slot) | occurrence track | new source | retained slot | - | - |
| SourceIndependent(Placement) | occurrence track | new source | - | retained placement | - |
| NoteCreate | source track | input source | - | - | new note |
| NoteUpdate / NoteDelete | source track | input source | - | - | input/deleted note |
| SlotAssign | input track | input source | new slot | - | - |
| SlotUpdate | input track | slot source | input slot | - | - |
| SlotDuplicate | input track | retained source | new destination slot | - | - |
| SlotDelete | input track | old slot source | deleted slot | - | - |
| PlacementCreate | input track | input source | - | new placement | - |
| PlacementUpdate | placement track | retained source | - | input placement | - |
| PlacementDuplicate | placement track | retained source | - | new placement | - |
| PlacementDelete | old placement track | old placement source | - | deleted placement | - |
| TransportRange | - | - | - | - | - |
| TrackPresentation | input track | - | - | - | - |

Derive new IDs by the specific destination record or typed before/after ID
set difference; never use position zero of sorted affected_ids. Make
Independent reads the occurrence's post-edit sourceId and intentionally
returns no primary note among its cloned notes. Preserve the pure model's
complete affected_ids internally for source-reference invalidation. The full
snapshot is sufficient for current readers; no second public diff format is
needed. Selection updates retain the existing gesture scope/selection-token
guard and must not issue a runtime Return.

Future audio import returns created/existing track plus new source, other IDs
null; relocate/replace returns owning track and unchanged explicit source ID.
No implicit occurrence is added. Tests should cover every table row, deleted
records, a shared source whose lexical ID order differs from its occurrence,
Make Independent with multiple cloned notes, no-op redo retention and late
command completion after selection changes.

## 3. Stopped structural track route

Use one small additive typed endpoint alongside existing device controls:

```rust
alive_workspace_track(operation: WorkspaceTrackOperationV4,
    generation: u64, draft_revision: u64) -> WorkspaceEditResultV4
enum WorkspaceTrackOperationV4 {
    AddMidi { path: Option<PathBuf> },
    Remove { track_id: String },
}
```

Use strict tagged camelCase serde arguments. AddMidi selects/captures a real
saved Ultra instrument through the existing device dialog and manifest checks;
it accepts no browser track or instrument ID. Cancel returns an unchanged
snapshot and all-null affected fields. The owner generates both IDs against
the union of prepared/draft/all retained-history identities before install,
using the existing fresh-token machinery. Create a track with existing default
name/gain/mute/solo, deterministic valid persisted palette color, zero effects,
four null slots and no sources/placements. Return its new trackId, other
affected fields null. Subsequent source/occurrence creation is explicit.

Remove names a track directly, for either kind, and atomically removes that
track, all its sources/placements/slots and actual devices. Refuse removal of
the last track. Return the deleted trackId, other affected fields null. These
are structural installs, not pending musical history entries: retain current
stopped/resolved-draft checks, full-source verification, prospective admission,
driver retirement/rollback, generation/editor-scope update and history clearing
only on success. Check admitted track/root capacity before opening dependencies.
Communicate that a successful reinstall resets to stopped Arrangement at zero.

Existing alive_device can continue real instrument replacement and effect
add/replace/remove/reorder on v4 after checked role adapters, but require an
existing v4 track and explicit instanceId for replace/remove/reorder. V4 load
must not create a track from an unknown ID, and removing a MIDI instrument must
direct callers to the explicit track Remove route. Effect at index zero never
acts as a track sentinel. Audio import remains its contract-defined future
creation route; no empty synthetic MIDI instrument is introduced.

Accepted addition: section 7 previously omitted this endpoint. This
addition is smaller than expanding the strict musical edit enum to carry
device I/O and keeps current structural transaction semantics. Required checks:
forged IDs/origin/revisions, no driver-independent playing bypass, pending draft
refusal, canceled picker, last-track removal, global ID collisions including
redo-only IDs, capacity refusal before reads, first effect removal, and failed
capture/admission/retirement leaving the old preparation and history intact.

## 4. Reserved global Stop dispatch

Keep `alive_transport(action: "stop", ...) -> {stopEpoch: U64}` as the common
UI entry, including Space. After main-window authentication and acquiring the
existing control lock, select the endpoint from the current prepared schedule:
Workspaces -> alive_session_stop_v4; Legacy/Clips -> the existing
alive_session_stop_v3 compatibility path. Preserve the old no-session behavior.
Do this before generation/preparation validation, driver checks, counters or
ordinary request allocation, matching the existing reserved Stop behavior.
Neither a stale UI generation nor full request/receipt bookkeeping may block
the musical Stop. Reject an internal document/schedule mismatch rather than
silently selecting a different dialect. Poll stop epochs through that same
mode's state ABI. This operation neither changes authority to Arrangement nor
retires I/O; runtime track Stop remains a separately authenticated v4 action.

The Rust v4 Stop extern already exists (`native_v4.rs:472`). No new ABI or
ordinary RequestV4 kind is necessary. Check stale generation, full queue/busy
receipts, saturated counters, retained Session authority, pending cancellation,
wrong editor origin, and unchanged v1/v2/v3 behavior.

Controller ruling: preserve section 7's running-driver prerequisite at
alive_workspace_action while making v4 UI Play orchestrate two existing
authenticated operations. Capture generation and preparationRevision when the
Play operation is initiated. First await alive_audio(action: "start") using
that captured generation; then submit WorkspaceActionV4::Start using the
ORIGINAL captured generation and preparationRevision. The existing
alive_audio handler (`desktop.rs:310`) authenticates the main window/generation
and starts the driver without changing preparation. Do not refresh or adopt a
different session between these calls. A session/preparation change must reject
the stale playback request rather than start whichever session is now current.
V4 Start/Seek requests still go exclusively through alive_workspace_action;
v3 Start retains its current behavior. Play requires no detour through Audio
Settings and introduces no new runtime endpoint or relaxed authentication.

If audio start fails, submit no runtime request. If the subsequent Start
request is refused or rejected, report its actual result and that audio may
remain running silently; do not roll back an independently shared driver owner.
Keep main-window and running-driver checks on the second operation even after
the first succeeded. Cost is a sequential UI operation plus clear error/status
handling, with no new native transaction. Required checks: audio-start failure
submits no Start; wrong origin rejects either call; session generation or
preparation change between calls rejects playback with the original identity;
intervening driver stop rejects Start; queue/admission refusal retains the
driver's actual state and reports it; repeated Play respects existing request
semantics; and v3 behavior remains unchanged.

## 5. Audio paths in retained history through Save As

Current history excludes device paths; cloning SourceV4 would newly include
relative audio paths. `resolve_draft` can return immediately after undo to the
prepared baseline while redo entries still exist. Clearing that history on
Save As would break established continuity.

Use origin-independent audio references inside the v4 musical
projection: normalize each projected AudioFileV4.path to its resolved absolute
dependency path at capture, keeping fingerprint/descriptor and source ID.
Use the verified source-resolution map from preparation/import, not a fresh
filesystem read or PCM copy per musical edit. Make Independent's clone inherits
that same verified file target; retained entries keep their own target even if
their source is absent from the current document. This is private history
representation; the saved document remains the accepted relative-path wire.

Replace the v4 projection's context-free conversion with a narrow fallible
capture helper receiving its source-resolution context. Musical equality must
use the same normalization for current prepared and draft projections. On
materialize, re-express those targets relative to the current resolved origin
parent, merge onto current live chains/mixer/bases, and run existing focused
validation before cursor/revision advance. Final Apply still performs real
dependency/fingerprint preparation. No audio bytes or runtime state enter
history, and absolute path bytes count against the existing 8 MiB bound.

Save As rebases the active saved document against the resolved destination
parent, as today, and leaves the normalized retained projections unchanged.
Before the atomic write, include retained-history audio targets in the
dependency-overwrite refusal set as well as current audio/device targets;
resolve an existing destination symlink before comparison. A source found
only in redo must neither be overwritten nor later resolve against the new
directory by accident. No history identity changes or eviction is needed just
because the origin moved. Failed save leaves origin/document/history/cursor
and revisions unchanged. Source relocate/replace remains a stopped resolved-
draft structural transaction; successful reinstall clears its prior scope.

Accepted choice: use normalized private history references rather
than a transactional rewrite of every before/after entry on each Save As.
Cost: context-aware v4 projection capture/materialization and protected-target
collection; no persistent asset registry or history PCM ownership. Required
tests: undo to baseline with redo-only independent audio source, Save As across
directories and through a session symlink, redo resolving the original bytes,
missing/changed file refusal at preparation, overwrite collision with a
history-only source, non-UTF-8/path-limit and history-capacity failure without
cursor movement, and failed atomic save preserving the whole prior state.
This policy is pinned now; its audio implementation belongs to Task 3.

## 6. Exposure boundary and existing staging

The existing plan already gives complete MIDI envelope construction/oracle to
Task 2C-prep, before later authority/loops/receipts slices. Task 2D consumes
that reviewed proof and measures actual admitted MIDI profiles; it does not
rebuild the proof or qualify looping/mixed-authority schedules with Task 2B's
finite subset. Keep the fixed capacities/work policy and single source-writer
sequence. No shipping feature follows from this contract or pure model support.

Before active v4 exposure, finish explicit Document/chain adapters, strict
decode, source/manifest preparation, transactional history/install/persistence,
these authenticated DTO/routes, and safe existing Session/mixer/device/editor/
MIDI detail readers. Open/conversion must admit the actual project, including
its default looping placements; refusal leaves the prior session intact. Do
not silently remove tracks, loops, sources, placements or downgrade to v3.
Only measured passing profiles advertise their actual Arrangement/action bits.

The user's MIDI-first priority means complete the MIDI Arrangement application
and the MIDI portion of the existing Task 4 two-view editing work after MIDI
admission, before WAV implementation. This changes delivery order within the
existing tasks, not wire/runtime architecture or acceptance requirements.
MIDI source sharing, occurrence edits, Return controls, undo/Apply/Save/reopen
and uninterrupted existing device/detail/navigation behavior must be usable
and verified together. Native MIDI admission alone is not that app completion.

Audio wire shapes and nullable chain readers may be fixture-tested early, but
active audio documents/import/source recovery/peaks remain unavailable until
their real Task 3 dependencies and admitted AUDIO profile exist. Unsupported
audio open must fail usefully with the current session retained. No fake root,
fabricated peaks, placeholder audio notes, PCM-less import success or browser
timer playback. Exposing a field in a DTO does not advertise its capability.

## Accepted Interface Decisions

1. Use the exact additive DTO names/null rules and command-primary ID table.
   This fills previously unspecified interface details; no architecture change.
2. Add the strict structural `alive_workspace_track` endpoint, retiring only
   v4's instrument-sentinel and browser-ID creation paths.
3. Recorded ruling: keep section 7's live-driver prerequisite and implement v4
   UI Play as authenticated audio-start then Start with the original captured
   generation/preparation identity, including explicit partial-failure status.
4. Use normalized absolute audio targets privately in retained history, with
   relative materialization and history-only dependency protection on Save As.
5. Recorded ruling: expose workspaceConversionAvailable independently of the
   installed mode; available conversion still requires full candidate admission.

Reserved Stop endpoint selection and MIDI-first/audio-gated exposure follow
existing native declarations, accepted semantics and current user priority;
they need no new runtime design. None of these decisions authorizes parallel
source writers or skips the existing staged tests and independent reviews.
