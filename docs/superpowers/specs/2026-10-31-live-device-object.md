# Live Device Object

User-approved direction: build the working Analog as an ordinary `live.device~`
Ultra object, then package instructions for Terra workers mapping more DLLs.

## Contract

- `live.device~ Analog` creates a `live_device` node with one pitch/velocity
  control inlet and two mono audio outlets, rendered as the installed Analog
  panel using the shared controls. The audio graph routes its outlets normally.
- Params are `{device:'Analog',state:{version:1,profile:'live12-analog-v1',
  dllSha256,guiSha256,graphicsSha256,values:[203 full native values]}}`.
  Exact identities match the current qualified installation. Validate all native
  values, identities, parameter count, finite bounds and integer enums. Persist
  source state, not instance pointers or local installation paths.
- Ordinary node creation imports the supported portion of the installed Analog
  default over authored fallback state before admission. Browser-only creation
  can use the authored fallback. Existing saved state is never reinitialized.
- Native instances belong to documents and node IDs. Construct/destroy under the
  existing stopped driver fence. Atomic full-state updates keep the graph and
  instance alive. Any failed admission retains the prior graph and source state.
- UI writes use canonical document commits and undo/history. Native queries
  carry the graph revision; stale asynchronous work cannot mutate a new instance.
- Keep unresolved mappings disabled. This work preserves Analog's admitted
  parameter coverage; it does not silently claim the remaining mappings.
- Add the object to normal Ultra; keep native compatibility opt-in at build time
  and fail explicitly without it. Alive admission remains a separate qualification.
- No proprietary DLLs, preset/XML/artwork payloads, or decompilations enter source.
  Descriptor identities and authored interoperability conversions are facts.
- One coordinator owns REA acquisition. Parallel mapping workers consume
  immutable private packets and own separate profile/output files. New evidence
  requests go to the coordinator; workers do not open/close the shared REA session.

## Components

Native C ABI provides transactional graph/source install, atomic state updates
and revision-keyed parameter snapshots. Rust validates bounded sidecars, locates
installed resources, fences ownership changes and commits persistent state. JS
profiles define full state metadata, reuse existing Analog conversion/binding
modules and mount the editor inside the node. Saved patches need no device binary.

The mapping skill links this contract and the generalization audit. It defines
packet provenance, exclusive acquisition, per-device ownership, control coverage,
model/native/display separation, endpoint/audio tests and explicit unknowns.

## Acceptance

Create Analog from object text, connect notes and stereo output, edit native
controls without instance replacement, save/reopen retaining edits, release to
silence, stop/restart, and run two independent nodes. Test invalid/stale state and
admission rollback. Verify normal no-adapter builds still work. Validate the skill
and exercise an offline worker without REA access.
