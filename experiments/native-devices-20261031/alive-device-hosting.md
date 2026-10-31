# Alive device hosting and saved Ultra presentation

Status: saved-presentation Tasks 1/2 are reviewed and installed on 2026-10-31 in
source `9ced05e` on `feat/phase2-ui-fidelity`. The shared saved surface, independent
instance values/drafts, both native window sizes, and editor closure during
software-audio playback have installed evidence in the
[saved-presentation checkpoint](../alive-presentation-checkpoint-20261031/README.md).
This retains catalog delivery 0's
[installed catalog evidence](../alive-device-catalog-20261031/README.md).
Presentation authoring, Max presentation import, and native hosting remain
pending; the broader roadmap stays paused. The remaining sections retain the
architecture and later delivery requirements.
The native-device inventory and adapter audit come from the separate `2a0f`
worktree. Its native runtime is not integrated into that Alive build. Proposed
presentation authoring and native Alive hosting remain to implement. Catalog
descriptors do not qualify any installed native candidate for loading.

Transport direction clarified on 2026-10-31: match Live's continuous device
lifecycle across ordinary playback, clip editing, launching, seeking and looping.
The current reset-on-transition implementation is a gap to remove, not a host
requirement to impose on every imported device. Extend one multipurpose
`live.device~` object through qualified device profiles and backend adapters.
See the [transport and shared-host findings](../alive-live-transport-20261031/README.md)
for official Live documentation, current source anchors and evidence limits.

User requirements are fixed: three musical device classes, composite
presets/racks, one shared Live-style control family, Ultra authoring, and the
saved presentation displayed in Alive. The audition keyboard is test scaffolding
and is not part of that presentation. Do not add old-format readers, migrations,
conversion paths or legacy UI fallbacks; update the current schemas, examples
and fixtures directly. Importing actual Live/Max documents is a separate product
capability, not a requirement to preserve earlier Alive formats.

## Current Alive baseline and integration boundary

- The browser requests bounded metadata pages for bundled Subtractive, Stereo
  Utility and Stereo Lowpass, saved Ultra devices in the user library, and
  installed Live implementation candidates. It combines these with project
  device references and Project Clips, with search and explicit refresh.
  Only qualified ready saved devices can activate or drag; installed candidates
  expose unavailable reasons. It does not import Live presets or construct DSP
  during discovery, selection or search.
- Browser devices can be dropped onto Session tracks, Arrangement rows or the
  horizontal Devices strip. Effects insert before/after a card using its X
  midpoint. Loading an instrument opens Devices and selects the accepted instance.
  Instruments need a MIDI track; audio effects can follow its instrument or
  process an audio track. No MIDI-effect stage exists yet.
- The strip already mounts a device's manifest controls inside its own card,
  alongside readings, warm bypass and editor/actions. It scrolls internally;
  unfinished parameter fields survive navigation. This is the integration point
  for saved presentations, rather than a separate bottom parameter inspector.
- MIDI and audio tracks are distinct. Ctrl+Shift+T inserts MIDI; Ctrl+T inserts
  audio. Clip creation and completed musical edits publish while transport runs,
  without edit confirmation. Launch quantization is shared by Session launches.
  Adding, replacing, removing or reordering devices still requires stopped
  transport. This is a current implementation limitation, not the target Live
  workflow. Prepare structural changes off the audio thread and publish them
  without stopping transport or restarting unrelated devices.
- The Clip detail shows MIDI notes or an audio waveform with independent Start,
  End and loop markers. A time selection can become a loop. Audio has Re-Pitch
  stretching; Arrangement retains its own loop and placement span. An empty MIDI
  slot/track must show an empty clip area; a real MIDI clip with zero notes still
  has an editor. Devices belong to tracks and do not require a clip to exist.
- The detail area resizes and maximizes. Preserve the usable 800x600 layout and
  keep wide device presentations within the horizontally scrolling strip.
- Current Alive persistence uses a v6 envelope and v4 workspace score. Current
  admission bounds are eight tracks, six device roots and two serial effects per
  track. An imported rack's internal graph has separate executable-object/cable
  limits and foreign-DSP cost; it must not bypass any of these bounds.

Source for this baseline is the UI worktree, especially `alive-browser.mjs`,
`alive-device-drop.mjs`, `alive.mjs`, `alive-clip-view.mjs` and
`src-tauri/src/session/browser.rs` under `apps/ultra`. The source anchors later
in this document describe the separate native-device audit, not this build.

## Recommended approach

Use a saved Ultra device as the unit Alive loads. It contains an executable typed
graph, versioned complete device state, a reusable-device manifest and a saved
presentation. `live.device~` is one node type in that graph; a profile selects its
native backend and installed editor resources. A composite preset can contain
several such nodes and authored Ultra processing. One renderer serves Ultra's
presentation preview and Alive's device area.

Keep one user-facing object family for all supported Live devices, selected by
device/profile identity. The existing native-worktree `live.device~` object is
the starting point; Analog is its first admitted profile, not a separate host
architecture. Profiles declare instrument/audio-effect/MIDI-effect signatures,
actual ports, native parameter mappings, full state, resources, processing bounds
and lifecycle capabilities. Standalone DLL and Max external adapters implement
their respective ABIs behind that contract. A shared object does not imply every
device has the same ABI, stereo ports or parameter layout.

### Ultra library setup pass

After installing Ultra, offer a Live installation folder picker and a Build
Library action. The same action is available later as Rescan. Keep installation
selection and local dependency resolution in a shared library service consumed
by Ultra and Alive; do not require separate folder configuration in each app.

Run bounded background discovery of the selected installation's devices,
resources, defaults and supported presets. Match installed identities to the
host's qualified profiles/adapters, then generate ordinary saved `.ultra`
devices containing the typed graph, complete mapped state, manifest and saved
presentation. Generated native devices use the same multipurpose `live.device~`
object and installed-panel presentation item as authored devices. No per-device
application, manual wiring or manual control-panel recreation is required.

Publish generated devices and their index into the shared library, using the
existing `$XDG_DATA_HOME/alive/devices` root (normally
`~/.local/share/alive/devices`) as the current integration point. Alive discovers
the new library generation automatically and shows its entries in the browser.
Automatic availability does not instantiate every device or add tracks: actual
native construction follows explicit drag/load and the normal captured-target
admission path. Search and startup read bounded index pages, not the entire
generated graph/preset corpus. Generation runs off the audio/UI callback.

Use stable catalog identities and atomic library publication. A rescan updates
only changed inputs/profile mappings, retains user-authored copies and never
overwrites a source file referenced by an accepted or running session. Generated
source revisions can be immutable, with the catalog pointing at the current
revision; session references retain their accepted source identity/fingerprint.
This is ordinary live-edit ownership, not an old-format compatibility layer.
Installed DLLs and artwork stay at the selected local installation and resolve
through the profile; generated files do not embed or redistribute them.

Report separate counts for generated/loadable devices, unsupported device
families and unresolved dependencies/presets. A discovered implementation without
a supported mapping remains an explained catalog entry; do not generate a
pretend-playable device or infer parameter meanings from its name. A generated
file is loadable in Alive only after its profile's I/O, state and continuous
transport behavior pass the shared host contract. Additional profiles make the
next rescan produce more devices without changing the user workflow. Composite
presets wait for the required rack/child-device contracts, with unresolved
components visible instead of silently dropped.

Three approaches were considered:

| Approach | Tradeoff |
| --- | --- |
| Per-family native adapters plus saved Ultra devices | Reuses working Analog, existing host and controls; each new ABI is qualified separately. Recommended. |
| Start with a broad Max runtime compatibility layer | Could expose more externals, but object, scheduler, attributes, dictionaries, buffers and DSP semantics greatly expand the first milestone. A narrow Utility probe can establish the necessary subset. |
| Rehost the whole Live engine/application first | No stable standalone device boundary was established; adds application, OS and transport dependencies before delivering the requested Alive surface. |

The standalone and Max devices need different backend adapters, even when they
share an editor or public device name. Preset model names, UI resource names and
native parameter identities remain distinct profile facts. Reading an editor is
not sufficient to recover DSP or preset mappings.

## Browser population and loading contract

Use one catalog of loadable saved-device descriptors, with providers for bundled
Ultra devices, project references, user-authored devices and the user's local
Live installation/presets. Keep Project Clips as source entries with their current
source-selection behavior. A descriptor is not a runtime instance: scanning,
searching or selecting a browser row must not construct a DLL, install a graph or
change the current session.

Each device descriptor needs a stable catalog identity, provider, display name,
musical class, saved-device/preset identity, exact implementation profile and
dependencies, plus availability and qualification status with a useful reason.
Distinguish a discovered candidate from a qualified loadable device and from a
missing dependency. Unsupported presets/racks can remain visible with an explicit
reason, but activation must refuse them before changing the accepted session.
Do not promote all 22 binary candidates to working devices or treat a `.dll` as
a complete preset. Local installed resources stay local; saved identities resolve
through profiles rather than assuming one machine's installation path.

Keep startup catalog retrieval small and asynchronous. Index installed libraries
outside the UI/audio callback, with explicit refresh/invalidation and bounded
metadata batches; retain immediate search and selection during discovery. Qualify
the known Analog saved device first. Add preset families only after their actual
container, state and dependencies can be resolved into a saved Ultra device.

The proposed classes are `instrument`, `audioEffect` and `midiEffect`; the current
browser's `effect` means audio effect. Update all manifest/catalog/admission layers
together when adopting the final schema, without an old-schema translation path.
Offer class filters as classes become discoverable. MIDI-effect candidates need
an unavailable explanation until their timed event stage is implemented.

Route activation through the existing captured-target loading path. Preserve
generation, edit revision and stable track identity for a drag/load, resolve the
horizontal insertion destination, and preserve a newer user selection when an
asynchronous load completes. Recheck compatibility, pending edits and capacity
at native admission. A browser instrument activation may create a MIDI track;
an explicit drop on an incompatible audio track is refused with a clear reason.
Failures retain the previous accepted device, state and selection.

On successful load, open Devices and mount the saved presentation inside that
instance's existing card. Retain card selection, bypass, readings, actions,
automation ownership and unfinished field preservation across navigation. Bind
every nested panel to its root instance and source node; two cards loading the
same saved device must not share mutable state. Use the shared control family
and renderer rather than building a second Alive-specific native-device editor.

## Document and presentation

Persist the presentation independently of patch coordinates and cables. A bounded,
versioned presentation record contains stable item IDs, target node/control
identities, rectangles, ordering, inclusion/visibility and supported appearance.
An installed Live panel is an item referring to a qualified source node/profile;
the user's installed resources provide its layout at runtime. Resource navigation
and conditional visibility are separate from authored presentation inclusion.

Ultra edits wiring and presentation using the same canonical document/history.
Presentation changes must not reinstall DSP. The shared surface renderer mounts
the selected device's saved layout in Alive and optional detached views, using
an instance-scoped host interface for reads/writes. No keyboard is inserted
automatically. Device playback survives closing or hiding its editor.

Current manifest-generated card controls remain the ordinary surface for the
current bundled devices. When saved presentation becomes the document contract,
author and persist the required presentation for those devices and fixtures;
do not retain an old-document fallback or a second legacy inspector. Max
`presentation`, `presentation_rect` and `openinpresentation` can be imported after
the target schema exists. They are currently diagnosed and omitted. JS and Rust
must agree on the current schema and reject invalid/unsupported documents.

## Typed musical contracts

The next reusable-device manifest revision should declare `midiEffect`,
`instrument` or `audioEffect`, with independent event/audio endpoints, actual
channels and qualified event capabilities. Replace earlier manifest revisions
directly and update their callers/examples; no compatibility adapter is required.
Allow a device with no separately exposed scalar automation parameters; its full
native source state remains independent of the small public automation bank.

MIDI effects require timed event output and deterministic bounded event expansion
before the instrument. Retain note destination ownership across pitch, channel,
zone and chain changes so note-off reaches the destination that received note-on.
Sustain, panic, pressure, bend and MPE are explicit capabilities, not implications
of a note inlet. Use the existing native scheduler rather than a browser clock.

Audio effects require explicit input buffers through profile, adapter, owned bank
and graph callbacks. Preserve actual port shapes: stereo is not universal, and
sidechain, analysis and envelope outputs are additional ports. Qualify silence,
tails, bypass, gain, sample rates, partitioning, latency and reset separately.

## Alive ownership, persistence and transport

Retain the whole prepared graph plus native-source sidecars in Alive. The current
preparation drops `Prepared.live_devices`, and the generic native install rejects
external instruments. Prepare fully validated owned banks off the audio thread,
publish ownership and routing atomically at a processing boundary, retain complete
state for rollback, and reclaim replaced instances off the audio thread. Resolve
local files from exact profiles rather than serializing machine installation
paths. The native worktree's destroyed-callback installation fence describes its
current implementation; ordinary device insertion/replacement must ultimately
work during playback without restarting the global audio driver.

Add session-authorized resource/state commands using generation, instance and
source-node identity. Persist accepted native-state edits as per-instance Alive
overrides without rewriting a shared `.ultra` source. Two instances of one saved
device must remain independent. Whole compound parameter writes remain atomic,
state-only edits preserve DSP identity, and stale views cannot write a new root.
Commanded/applied values remain distinct from arbitrary internal DSP readback.

Separate the musical timeline, note/event ownership and device lifetime. Alive's
current `discontinuity` and `clear_track` paths reset graph runtimes, including
effects. The native bank has no realtime-clear callback, so that reset also
disarms Analog. This is an Alive lifecycle mismatch to correct. Do not make hard
tail clearing or instance replacement a prerequisite for ordinary loops and clip
changes. Existing `ResetA` evidence does not establish that Live uses that export
for those operations, or that it provides a hard tail clear.

Keep unaffected device instances and their accepted state across Start/Stop,
seek, loop wrap, clip launch and completed musical edits. At the exact scheduled
sample boundary, reconcile outgoing note ownership and sustain, apply the new
event cursor and automation ownership, chase notes when enabled, and notify
devices of supported transport/tempo changes. A note-off must reach its original
destination. Per-device retrigger, phase-sync and reset policies need explicit
evidence; they are not a blanket reset of the whole track chain.

Ordinary Stop stops clip/event production and releases the appropriate voices;
it leaves the audio engine available to render releases, reverb and delay tails
and monitored/preview input. Preserve effect state across timeline jumps. Silent
devices may become idle once their work/tails finish. Device removal, replacement,
explicit panic/hard clear and audio-driver reconfiguration are separate lifecycle
operations with their own tested behavior. Full construction, destruction and
state reconstruction stay outside the audio callback.

Separate audible mixer output from the transport/active-clip flags as well:
the current `mix_track` gate suppresses a stopped or clipless track unless MIDI
preview is active. Removing runtime resets alone would still mute its tails.
Track audibility must include retained release/tail and monitored-input work,
subject to the intended mixer mute/solo and device lifecycle semantics.

For live structural edits, prepare the changed graph/bank off-thread, recheck
captured instance/revision ownership, publish the accepted route at a processing
boundary, release notes to their original destinations and retire replaced state
off-thread. Preserve unaffected roots and accepted music on preparation failure.
Retirement and optional tail handling must remain bounded. Never rebuild an
entire bank simply because the musical playhead moved.

This shared lifecycle applies to authored Ultra DSP and every supported Live
profile. First verify Analog, then a second instrument through the same object
and host path. Test Stop/Start, seek, loop seams, clip switches, tails, live edits,
failure silence and full-state rollback. A single-shot diagnostic may help
investigation, but it does not satisfy the product workflow.

## Racks and composite preset import

A rack is a typed composite graph with stable child/chain identities. Each chain
is ordered; compatible chains run in parallel and merge at explicit boundaries.
An instrument rack can contain MIDI processing -> instrument -> audio effects
per branch; an audio rack distributes audio; a MIDI rack merges timed events.
Drum racks add note routing and send/return branches. Preserve chain mixers,
zones/fades, selectors, mute/solo, macros and source dependencies as authored data.

Macro targets need logical parameter identities, target ranges, inversion/curves,
enum behavior and atomic compound updates. Define ownership when direct edits,
macros and automation address one target. Keep physical display conversion
separate from model-to-native encoding. Route note releases to original chains
when a selector/zone changes. Qualify mix headroom, pan laws and latency alignment;
do not normalize summed branches implicitly.

The current graph already supports fanout and summed signal inlets, providing a
foundation for small static racks. It is limited to 32 executable objects and 64
cables; hierarchical authoring still lowers into that limit. Alive currently
supports one instrument and up to two serial audio effects, with no MIDI-effect
stage. The horizontal device-strip UI is already implemented; parallel chains,
macros/zones and composite rack semantics described here are not. A rack importer
must reject capacity overflow explicitly, never truncate
devices to fit. Graph capacity is a separate measured change when real presets
require it.

Parse `.adv`, `.adg`, `.alc` and `.als` through their actual container forms into
an intermediate graph. Resolve exact implementation profiles and private sample,
plugin/Max dependencies before playback admission. Keep unresolved nodes visible
and explain missing properties/dependencies. Imported topology and saved state
do not establish audio equivalence until constituent mappings and host semantics
are qualified.

## Source anchors for current gaps

These references describe the original audited `2a0f` working-tree source, with
exact hashes retained in the private hosting manifest. Line numbers belong to
that audit and must be refreshed against the native session's final commits
before implementation; they do not describe the installed UI build:

| Gap | Source |
| --- | --- |
| Manifest note input requires `poly_note` | `apps/ultra/ui/canvas-device.mjs:26`; `apps/ultra/src-tauri/src/canvas_device.rs:160` |
| Alive drops native source sidecars | `apps/ultra/src-tauri/src/session/prepare.rs:245` |
| Specialized install/state APIs exclude configured Alive sessions | `apps/ultra/src-tauri/native/backend.cpp:716`; `apps/ultra/src-tauri/native/backend.cpp:753` |
| Musical Start resets the runtime | `apps/ultra/src-tauri/native/alive_session.hpp:325` |
| Reset disarms unqualified external clears | `apps/ultra/src-tauri/native/patch_graph.hpp:524`; `apps/ultra/src-tauri/native/external_device/live_device.cpp:100` |
| Max presentation is diagnosed and omitted | `apps/ultra/ui/canvas-max-import.mjs:190` |
| Native render API has outputs/events but no caller audio input | `apps/ultra/src-tauri/native/external_device/external_device.h:34` |

## Ordered delivery

0. **Complete: catalog contract and provider boundary.** Retain the existing browser/drag/card
   behavior, define descriptor identity and unavailable reasons, and index a
   bounded local metadata set without runtime construction. Start with the known
   saved Analog device; enable loading only with the qualified host in step 2.
   Installed acceptance found all 22 local implementation candidates and refused
   Analog activation without changing accepted music. No saved Analog descriptor
   is loadable in this build; its host integration remains step 2.
1. Saved presentation in Ultra: panel/control items, canonical persistence/history,
   a shared renderer in Ultra preview and Alive cards, no automatic keyboard,
   current-schema examples/fixtures and deliberate Max presentation import.
2. Shared native-device hosting in Alive: extend the existing multipurpose
   `live.device~` object and profile/adapter contract, typed note entry, full
   prepared sidecars, transactional bank ownership, authorized resource/state
   APIs and per-instance saved overrides. Replace blanket transport resets with
   continuous device lifetime and bounded note/chase/transport reconciliation.
   Verify Analog first and a second instrument through the same path; mount each
   device's saved panel and qualify structural edits during playback.
3. Parallel profile mapping from existing Electric/Collision/Tension packets,
   with one coordinator acquiring new REA evidence serially. Profile workers do
   not change loader admission or shared host contracts.
4. Ultra library setup: choose the Live folder, build generated saved devices and
   publish the shared index; Alive refreshes it automatically. Include defaults,
   supported presets, incremental rescan, stable source identities and explicit
   unavailable reasons. Folder discovery/UI work can proceed independently, but
   loadable generation depends on the shared host and admitted profiles.
5. Qualify native audio input and Corpus; investigate Amp/Cabinet constructors.
   In parallel, acquire a narrow Utility Max-boundary packet, then prove Utility
   audio before expanding to Drift and the other Max device candidates.
6. Add MIDI-effect routing/output, rack semantics, dependency resolution and
   composite preset import, then publish qualified results through the catalog.
   First import a small fully supported instrument-plus-
   effects preset, then a parallel rack with macros/zones and deterministic mixing.

Presentation and host work can be separate implementation scopes with a shared
binding contract. Analog is the first vertical acceptance; Electric then tests
that the implementation is profile-driven. A native effect and MIDI effect each
need their own I/O acceptance instead of inheriting the instrument result.

## Verification for the first vertical slice

Use new private native build/output paths; never rebuild a library mapped by a
running app. Check scheduled notes and release, normal Stop/Start/seek/loop/clip
behavior without blanket device resets, full state save/reopen, two instances of
the same source, independent edits, stale view rejection, failed preparation
rollback and missing/changed
artifact rejection. Verify editor closure does not affect playback and Alive
shows the saved panel without keyboard or wiring. Normal builds without the
adapter must fail explicitly before changing an accepted session.

Assert stable instance identity across ordinary transport/clip operations and
retained effect tails after clip/transport Stop. Cover note chase on/off, sustain,
held-note ownership at loop/clip/seek boundaries, preview/monitoring while stopped,
live device insertion/removal/reordering and unchanged audio on unrelated tracks.
Any device-specific phase/retrigger behavior must match its observed Live policy.
Prove reuse with a second profile instead of introducing a second device host.

Verify the setup pass from a chosen installation through generated current-schema
devices to automatic Alive browser refresh and explicit loading. Repeat an
unchanged rescan without duplicate entries or rewritten sources. Test a changed
profile/default, moved or missing installation, unresolved preset dependencies,
interrupted generation, user-authored copies and rescan while a session plays.
Failed generation must leave the previous accepted library/session usable.

Exercise the real browser path as well: discovery/search without DSP construction;
missing or unqualified profiles; duplicate saved-device references; compatible and
incompatible Session/Arrangement drops; before/after card insertion; stale drag
and pending-edit refusal; asynchronous completion after selection changes; and
rollback after failed loading. Verify independent panels and automation for two
instances, unfinished fields across navigation, editor closure during playback,
and resizing/scrolling at 800x600 and larger windows. Empty MIDI tracks/slots stay
blank until a clip/source exists, including after Undo; a real empty clip restores
its editor while track devices remain available independently.

Measure and budget foreign DSP rendering, native-state application, note/chase
reconciliation and structural publication/retirement before realtime admission.
Update the existing reset-based admission costs to match the actual operations;
do not simply remove reset calls without replacing their note-cleanup contract.
The current bank calls the DLL
per sample and can apply many state writes; existing graph/event operation counts
do not cover that cost. Test maximum admitted workload and supported audio block
sizes against callback deadlines. Two-instance functional playback alone does
not qualify realtime capacity.

Full source-audit references and the twelve current admission gates are retained
in `~/.cache/alive-ultra-evidence/live-device-catalog-20261031/hosting/report.md`.
The companion `experiments/native-devices-20261031/device-catalog.md` in the
native-device worktree records which implementation boundaries actually exist;
catalog delivery adds bounded descriptor fields but no native runtime
qualification. The remaining presentation and hosting proposals grant no loader
admission. The native-worktree copy retains the earlier proposal; this UI copy
records the installed catalog completion without changing that worktree.
