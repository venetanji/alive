# Native Live Devices In Ultra And Alive

The owner authorizes this work to proceed autonomously with parallel device
workers on 2 November 2026. Prefer a few complete instruments/effects over broad
partial coverage. Preserve the approved Alive shell. UI checkpoint
`ca161c488ee2dcb0c6ba1efa1c43c7b1e36da4af` is pushed on
`audit/pr12-native-20261102`; implementation uses
`feat/alive-native-library-20261102` in the existing isolated worktree.

## Product

One ordinary Ultra `live.device~` family hosts qualified local Live DSP profiles.
An ordinary saved `.ultra` device is the unit Alive loads. Its saved presentation
uses the original installed device layout and Ultra's shared control renderer.
Do not add a separate application, audition keyboard or wiring to Alive's rack.
The fixed Device row and existing Clip/Help/footer behavior remain intact.

Provide a repeatable command-line import script under `apps/ultra` accepting a
Live installation root and an optional library destination. It inventories every
DLL under that installation without executing discovered code. Include Max
externals in the inventory, distinguish support DLLs from musical candidates,
and record unsupported or unknown candidates with precise reasons. Discovery
does not start audio, create devices, modify the installed application or qualify
its binaries.

The script builds ordinary Ultra instruments/effects only for registered,
qualified profiles. Publish to the existing `$XDG_DATA_HOME/alive/devices` library
(fallback `~/.local/share/alive/devices`) only after Alive qualification passes.
Files use immutable generated revisions; preserve user-authored files and source
paths referenced by accepted sessions. Identical rescans are no-ops. Keep the
inventory report separate from playable library entries.

## Existing Work And Evidence

The retained implementation in worktree `2a0f` is uncommitted and must be
preserved. The coordinator froze 86 authored files and the tracked diff under
`~/.cache/alive-ultra-evidence/native-library-20261102/source-reference-r1`.
Port reviewed pieces onto the newer checkpoint; never replace whole newer shell
or controller files with the research versions.

The old object contract supports Analog full commanded state, revision-scoped
access, atomic state batches and document-owned native instances. This spec
extends that architecture to multiple profiles and Alive. Original DLLs,
presets, resource XML/artwork, decompilations and original captures remain in
private local evidence. Authored interoperability facts, adapters and tests may
enter Git. A native write acknowledgement is not internal DSP readback.

The currently installed GUI/Graphics packs differ from old packets. Fresh
acquisition is retained in private `resources-r1`; old packets stay immutable.
New packet revisions must identify the current packs and distinguish reused
unchanged DLL evidence from newly acquired resource facts. Changed resource
color/property representations require renderer tests, not blind hash replacement.

## Host And Session Contract

Persist exact profile/version and DLL/resource identities plus complete bounded
commanded native state. Resolve installation paths locally. Validate finite
ranges, integer enums, complete descriptor signatures and initialization before
notes. Each device instance owns its state independently, even for a shared
saved source. Keep source state separate from Alive's 16 scalar public bindings.

Prepare/destroy foreign instances off the audio callback. Driver fences,
transactional admission, rollback and stale generation/revision rejection stay
mandatory. Parameter groups apply coherently and participate in the owning
document/session Undo semantics; saved edited state survives destruction/reopen.

Alive currently assumes PolyNote and loses native sidecars during preparation.
Integrate an explicit native note capability and retained sidecars through host
installation, rollback, persistence and instance-scoped panel commands. Do not
enable a manifest until every native validation layer accepts the same contract.

Current musical reset paths would disarm the research native callbacks. Resolve
note release, Stop/Start, seek, loop and clip transitions with a bounded continuous
lifecycle before Alive admission. Do not construct in the callback or assume
`ResetA` establishes hard silence. Preserve tails/continuous device ownership as
appropriate to the tested transport contract. Unsupported expressive MIDI remains
explicit. Effects require real caller audio inputs, not instrument-only tests.

Keep existing track, graph, device, event and resource bounds. Foreign DSP needs
measured admission covering rendering, state application and discontinuities.
No limit increases to make a fixture pass. Ordinary no-adapter builds continue
to reject native devices clearly and retain working documents.

## Import Pipeline Interface

The coordinator owns `apps/ultra/live-device-qualifications.json`, schema
`ultra-live-device-qualifications-v1`, with a `profiles` list. Each profile has
`id`, `device`, `class` (`instrument` or `audioEffect`), `artifacts` (relative
installation path, byte count, SHA-256), `stages`, `evidence`, and `generator`.
Each required stage is `passed`, `failed`, `partial` or `unrun`; only all-passed
profiles may publish. Required stages are construction, initialization, audio,
mapping, editor, state, instances, lifecycle, timing and alive.

The importer verifies registry and artifact bounds and invokes only the fixed
repository helper `apps/ultra/export-live-device.mjs` for qualified generation.
It passes JSON on stdin with `{device,profile,installation,resources}`; successful
stdout is one JSON saved Ultra document. The helper uses shared profile/default
and saved-device validation, not duplicate parameter conversion tables. Registry
entries cannot supply arbitrary executable commands. Generator failures and
invalid/oversized output prevent publication and retain installed library files.
An empty registry is a valid complete inventory with zero qualified exports.

Use a destination-local lock, staged files, hashes and atomic publication.
Reports distinguish complete discovery with unsupported candidates from an
incomplete scan. Bound depth, entry count, individual file size and total bytes;
reject symlink escapes, duplicate JSON keys and unsafe output names.

## Parallel Ownership And Acceptance

The coordinator owns shared REA acquisition, central registration, Alive session
integration, shared presentation wiring and final build selection. Device workers
receive immutable verified packets, disjoint source/test files and private build
paths. They never call REA MCP or change central admission. Questions go to their
own JSONL files. Begin with a small forward test, including packet-tamper rejection.

Analog is the first host-integration target; Electric proves another instrument
profile. Qualify Corpus's effect inputs before treating it as the first effect.
For each device independently prove construction, complete initialization, real
audio, semantic mappings/physical values, every promised panel control/drawing,
edited save/destroy/reopen, multiple instances, transport/lifecycle, measured work
and actual Alive loading. Original Live screenshots may be acquired through the
authorized installed application without physical settings changes or recording.
Do not label partial controls or static evidence as a finished instrument.

For each batch retain a failing regression, adjacent checks and full relevant
suites. Inspect actual Ultra/Alive UI at 800x600, 1280x800 and 1440x900; verify
drafts, rejected changes, focus, exact native targets, hide/show and resize.
Build into private directories and select matching Alive/Ultra launchers only
after verification. Manual CI only. No merges, releases, deployments, security
bypasses, physical settings changes or recording. Earlier UI/native acceptance
gaps remain separate until exercised against the new source.
