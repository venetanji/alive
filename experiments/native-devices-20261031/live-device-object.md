# Ordinary Ultra live.device~ Object

Date: 2026-10-31. This follows the earlier dedicated Analog test window and
[generalization audit](generalization-audit.md). The reusable object is now part
of ordinary Ultra authoring. Alive admission is a separate remaining step.

## Object And Saved State

Create `live.device~ Analog` in Ultra. It has one pitch/velocity message inlet,
two mono audio outlets, an embedded installed-resource editor, and a C4-C5
audition keyboard. Connect its outputs to the ordinary signal graph. The device
name selects a qualified profile; it does not select another executable.

The `live_device` node stores a versioned `live12-analog-v1` state with exact
DLL, GUI and Graphics hashes and all 203 commanded native values. Save/reopen,
clone and undo use the canonical document. No absolute installation paths enter
the patch. New objects import the supported fields from the user's installed
Analog default before admission, retaining authored fallback values for the
remaining slots. The authored help example uses the authored fallback throughout.
Factory preset data is not redistributed.

The installed resources are resolved through `ULTRA_LIVE_RESOURCES`, or the
existing `$HOME/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources`
installation. The directory name is a locator; the running DSP does not use Wine.
Identity, count, enum and range checks reject unsupported or malformed state.
Raw JSON numbers are checked before narrowing to native floats. Asynchronous
default import is canceled when its authoring target changes.

## Shared Host

Each document owns its native source bank, and each source node owns an
independent device instance. Construction, destruction and reconstruction run
under the audio driver's callback fence. Structural installs validate before
replacing the admitted graph. A failed admission preserves the prior graph and
source state.

Knob edits commit a complete source state through the document registry. All
changed sources in a state-only commit publish atomically at the existing graph
revision. The audio owner applies them before callback notes; the object does
not need to rebuild its graph or native instance for a knob edit. Parameter
snapshots report commanded/applied values, not arbitrary internal DSP readback.

Stop disarms native rendering. Startup reconstructs from commanded state off
the callback, because the DLL's reset function was not qualified as a hard tail
clear. Structural changes can stop/restart the shared driver and therefore reset
other documents' held notes. State-only edits avoid that fence.

The embedded editor reuses `live-controls`, installed XML/layout evaluation,
Analog binding conversions and physical formatting. It retains control DOM
identity across updates and saves edits through the same full-state contract.
Keyboard blur, visibility loss and disposal send note releases.

Source entrypoints:

- `apps/ultra/src-tauri/native/external_device/live_device.*`: native ownership,
  state publication, snapshots and reconstruction.
- `apps/ultra/src-tauri/native/external_device/profiles/analog.hpp`: qualified
  native profile facts; central admission is in `device_profiles.hpp`.
- `apps/ultra/src-tauri/src/canvas_live_device*.rs` and `live_device.rs`: strict
  admission facts, sidecar/FFI and installed-resource readers.
- `apps/ultra/ui/live-device-profile.mjs`: identity, full-state validation,
  installed-default conversion and catalog.
- `apps/ultra/ui/live-device-object.mjs`: embedded editor and canonical edits.

## Parallel Device Mapping

The portable [live-device-mapping skill](../../docs/skills/live-device-mapping/SKILL.md)
defines coordinator, mapping-worker and integrator roles. It is discoverable
through the local Codex skill directory. Terra workers can consume the same
instructions; no Terra launcher was available in this session.

Only the coordinator owns REA. It acquires evidence serially, exports immutable
private packets with pinned hashes, and closes the shared session. Workers may
not call any REA MCP tool, including readiness or status. They work in disjoint
device directories, queue missing evidence questions, and leave central loader
admission and registration to the integrator.

Fresh sequential REA acquisition produced Electric, Collision and Tension
packets under the private evidence root. Electric includes a fresh 33-descriptor
catalog from isolated construct/enumerate/close; this acquisition did not write
parameters or render notes. Collision and Tension packets retain explicit
descriptor/runtime gaps. Static findings and dated feasibility probes are
distinguished from fresh runtime observations.

An independent Codex worker exercised the skill against Electric revision 2
without REA or native execution. It verified all five artifacts and 17 payloads,
produced an evidence-linked inventory and eight focused follow-up questions,
and rejected a deliberately tampered packet before analysis. It qualified zero
semantic mappings from names/ranges alone. Its provenance finding prompted
Electric revision 3, which corrects historical wording while retaining every
payload unchanged; the index selects this revision. Conversion bodies and
runtime endpoint evidence still require a coordinator follow-up pass.

The packet index is
`~/.cache/alive-ultra-evidence/live-device-object-20261031/packets/index.json`.
It contains the packet paths, manifest hashes and ready worker assignments.
Proprietary DLLs, XML/artwork, presets, REA exports and captures remain private.
Authored mapping facts and tests may be integrated into source after review.

## Verification And Boundaries

The final Rust suite passes 297 tests with four existing ignored tests; all 74
standalone canvas tests pass. The ordinary release desktop build succeeds.
Independent review found two boundary issues, both regression-tested and fixed:
raw-number narrowing before validation and stale asynchronous default import.
Scoped re-review reports no findings.

The final UI checks pass 663 Node tests and three focused browser tests. The
earlier full browser run passed 213 tests with two existing skips. Browser tests
exercise canonical transport with mocks and installed resources; real DSP is
verified independently by the native backend tests.

Native bank checks cover independent instances, complete state restore,
rejected transactions, 1,000 concurrent multi-source updates without torn state,
and Stop/reconstruction. AddressSanitizer and UndefinedBehaviorSanitizer pass.
The real installed Analog backend test covers two ordinary document roots,
finite audible note output, state edits, stale revision rejection, Stop/rearm
and independent close. The default native build exports explicit disabled
stubs and rejects experimental source execution. The skill validator and all
10 packet-helper tests pass; all three real packets verify, and a tampered copy
is rejected.

Private build/test logs and the ordinary `Analog.ultra` demo are retained under
`~/.cache/alive-ultra-evidence/live-device-object-20261031/`. Compile to a fresh
native output directory and launch with that directory explicitly selected by
`LD_LIBRARY_PATH`. Never rebuild a library mapped into a running app.

The ordinary `Analog.ultra - Ultra` window was launched on workspace 8, with the
installed Analog panel, audition keyboard, two gain nodes and stereo DAC visible.
Its process maps `native-build-final/libultra_native.so` and no Wine library.
The screenshot confirms the shared native patch is ready. Audio is initially
off; use the ordinary Start audio button before auditioning. This desktop check
does not substitute for the separate real-DLL render test.

## Opening And Structural Edit Performance

A desktop followup exposed long pauses when opening the patch or changing
objects/cables. The adapter tracked allocations in a singly linked list and
searched the whole list on each free, including null frees. Instrumentation
observed 1,062,616,715 list visits during one Analog initialization. DLL file
reading, qualification hashing and image mapping took about 16 ms; restoring all
203 values took about 5 ms. The delay came from adapter bookkeeping during the
constructor and sample-rate setup.

`runtime_shim.c` now indexes allocation records by pointer and removes cleanup
records through a doubly linked list. Null free returns immediately; failed
reallocations retain their original records and bounds. Cleanup and readable
range checks preserve the existing contracts. A new deterministic allocator
regression test is included in CMake and the retained adapter runner.

| Native operation | Before | After |
| --- | ---: | ---: |
| Analog open | 10.7 s | 200 ms |
| Owned source install | 9.28 s | 180 ms |
| Audio startup reconstruction | 9.52 s | 220 ms |
| Full-state publication | 0.006 ms | 0.007 ms |

An actual combined structural stop/install/restart measured 374 ms, compared
with about 18.8 s for the earlier install/restart phases. The source lifecycle
still reconstructs on structural edits and explicit Stop; no instance-reuse
redesign was needed. Ordinary knob edits remain on the state-only path. A pure
Rust canonical knob commit measured 0.20 ms median across 2,050 edits, with zero
structural installs.

The full Analog/Electric adapter runner, concurrent bank test, real Analog
backend test, allocator and real-DLL sanitizer checks pass after the fix. The
existing Rust test executable passes 297 tests with four ignored tests against
the new library. Independent review reports no findings. Measurements are
observations under workstation load, rather than timing assertions in tests.

The updated immutable library is
`~/.cache/alive-ultra-evidence/live-device-object-20261031/build-perf-fix/libultra_native.so`,
SHA256 `fdd5b6b34efa0a5ba92f3678f2212d04fcd5d6f1bd743be0c1bea9ac4dd76473`.
The same ordinary Ultra executable loads it through `LD_LIBRARY_PATH`; no Rust
rebuild was required. The user's seven-object edited patch was saved, its prior
on-disk version backed up, and the patch reopened on workspace 8. The new process
maps this exact library with no Wine library, and the installed editor and audio
running state were visually verified. Detailed phase and verification logs are
in the private evidence root's `perf/` directory.

Only Analog is admitted by the ordinary object registry. Its editor retains
126 mapped control instances out of 175; the other 49 remain unresolved. The
installed-default importer covers 126 logical properties encoded into 128 native
slots, with authored fallback in the remaining 75 slots. Saving all 203 commanded
values does not establish complete Live preset or wrapper fidelity. Filter and
modulation choices, sync/polyphony/unison/transposition/MPE cases, some custom
drawings and exact envelope graphs remain in the audit's qualification list.

Alive's instrument validator and note ingress do not yet admit this source.
The loader remains experimental, in-process and qualified only for the exact
installed x86-64 identities. It reuses installed machine code rather than
reconstructing portable source. Native faults are not process-isolated; realtime
capacity, complete transport/expressive MIDI behavior and render equivalence
remain unqualified. The existing dedicated test window and installed app are
preserved.
