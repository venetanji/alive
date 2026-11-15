# Native Device Generalization Audit

Audit date: 2026-10-31. This records the current implementation, evidence and
remaining work after Analog's original-panel, physical-value, installed-default
and routing followups. The later [live.device~ implementation](live-device-object.md)
now provides the reusable saved Ultra object. This audit retains the earlier
gap analysis and qualification checklist; Alive integration remains pending.

## Result

The experiment establishes a reusable route for this installed family of device
DLLs: execute their original DSP instructions on Linux x86-64, interpret their
installed editor resources, and connect them through Ultra's shared Live-style
controls. The common loader and renderer already exist. The object followup
extracts Analog's qualified profile and a persistent, multi-instance host from
the test implementation. Additional devices still need qualified semantic maps.

The intended product remains one `[live.device~ Analog]` object, with a device
name selecting a qualified profile. Its editor expands into the same shared
controls. An ordinary saved Ultra patch is then the unit hosted by Alive. A new
instrument must not require its own desktop executable or a second control skin.

This is reuse of installed machine code, not a reconstruction of portable source.
This audit's runtime investigation covers the seven standalone DLLs. The later
[installed-device catalog](device-catalog.md) also identifies fifteen Max device
externals and fifty-nine DSP blocks through static binary/reference evidence.
Finding editor XML for other Live devices does not establish a loadable DSP
boundary for them, or a route to running the whole Live application. See the
[Alive hosting proposal](alive-device-hosting.md) for presentation and typed I/O.

## What Already Generalizes

| Layer | Retained implementation | Remaining device assumptions |
| --- | --- | --- |
| PE loading and ABI | `pe_image.*`, `runtime_shim.c` | Exact qualified images/import paths; startup, TLS and Windows unwind registration omitted |
| DSP API | `external_device.*` | Analog/Electric hashes, descriptor offsets/record layout, expected counts, 48 kHz, 1..256 frames, placeholder transport |
| Installed resources | `live-resource-pack.mjs` | Exact installed GUI/Graphics pack identities |
| XML views and expressions | `live-device-layout.mjs`, `live-view-expression.mjs` | Supported classes/expressions only; layout entrypoint can be selected |
| Editor rendering | `live-device-view.mjs` | Some Analog detail-panel, sync-toggle and custom-display branches remain |
| Shared controls | `live-controls.mjs` and CSS | Reusable display/parser and binding interfaces already exist |
| Parameter transport | `analog-bindings.mjs`, `analog_play.cpp` | Useful batching/revision/generation pattern, but Analog facts and single test-host ownership |
| Physical values | `analog-parameter-display.mjs` | Device-specific curves, units, parsing and enum order |
| Default import | `analog-default-loader.mjs`, `analog-default-preset.mjs` | Bounded gzip decoder is reusable; XML traversal and model scopes are Analog-specific |
| Graph bridge | `patch_graph.hpp` research kinds 68/69 | Borrowed callbacks; no complete persistent external-device ownership or ordinary authoring registration |

All JS paths in this table are under `apps/ultra/ui`; native adapter paths are
under `apps/ultra/src-tauri/native/external_device`.

## The Profile Boundary

Each device needs a small, explicit interoperability profile. Names and ranges
can identify candidates, but cannot establish their meaning by themselves.

| Profile fact | Purpose |
| --- | --- |
| Device and adapter identity | Exact DLL hash, supported ABI/layout, descriptor signatures, import requirements and profile revision |
| Input/output contract | Instrument or audio effect, channels, supported sample rates/block sizes, MIDI and transport capabilities |
| Resource identity | Installed pack hashes, editor entrypoint, referenced resources and required custom displays |
| Model schema | Preset root, nested scopes, persistent properties and wrapper-owned settings |
| Model-to-DSP mapping | One-to-one or compound encode/decode functions, endpoint/sign/enum rules, validation and atomic batches |
| Physical display | Model-to-value formatting, units, inverse parsing, steps and enum labels |
| UI commands | Actions such as routing presets that change several properties rather than one DSP slot |
| Lifecycle and state | Initial state, complete serialized source state, restore ordering, reset/stop behavior and automation eligibility |

Keep model-to-native conversion separate from model-to-physical display. Analog's
F1/F2 failure demonstrates why: the Live model uses 1 for F1, but the native mixer
uses 0 for its first output. An identity conversion appears correct at the
midpoint and can eventually route the installed default into a disabled chain.
The common binding now applies `1-x` to the noise and two oscillator balances for
import, edits, acknowledgments and polling. Display still uses the model domain.

Other mappings are compound: each signed oscillator pitch-envelope amount uses
both a magnitude slot and a sign slot. Future profiles must also allow
wrapper-owned values and commands, instead of forcing every visible control into
one DLL parameter index.

The future host needs independent instances, off-thread preparation/destruction,
bounded audio-thread communication, and versioned full device state. The current
six numeric node fields and sixteen host bindings cannot represent Analog's
complete state. Its parameter getter caches successful writes; it cannot recover
arbitrary internal state from the DSP. Restorable state must therefore be owned
explicitly by the host.

## Analog Coverage

The audit expands the actual installed panel and resolves it against the current
binding layer and the retained native descriptors. These are different measures,
not a single completion percentage:

| Measure | Current result |
| --- | --- |
| Reachable panel resources | 17 |
| Expanded view instances | 719 |
| Control instances | 175: 126 mapped, 49 unresolved |
| Admitted logical parameter mappings | 126: 124 direct facts plus two compound pitch-envelope controls |
| Native descriptors written by supported default import | 128 of 203 |
| Installed-default Manual fields | 172: 126 supported, 46 unsupported |

The other 75 native slots retain authored fallback settings. They are not
necessarily 75 independent missing controls: some descriptors are internal parts
of a logical property, and some Live properties belong to its host wrapper.
Unresolved panel controls remain disabled rather than presenting an unverified
working control.

The 49 unresolved control instances are:

| Group | Instances |
| --- | ---: |
| Filter type, both chains | 2 |
| Oscillator LFO pitch and pulse-width modulation | 4 |
| Filter LFO/key/envelope cutoff and resonance modulation | 12 |
| Amplifier LFO/key/envelope pan and LFO/key amplitude modulation | 10 |
| LFO gate reset | 2 |
| Four quick-routing commands | 4 |
| Global octave and transpose | 2 |
| Polyphony chooser | 1 |
| Unison voice chooser and toggle | 2 |
| Channel-pressure targets and amounts | 4 |
| MPE CC74 targets and amounts | 4 |
| Tempo-synced LFO rate | 2 |

The missing drawing classes are `AASLfoDisplay` and `LedView`. Envelope and pitch
graphs are authored normalized diagrams; exact time geometry, loop shapes and
Live drawing behavior remain unqualified. Some alignment, fonts and spacing also
remain approximate.

## Product Work Still Missing From Analog

- Register an ordinary `live.device~` authoring object with independent owned
  instances. `analog_play.cpp` currently owns one global `Player` and rejects a
  second open.
- Save and reopen complete source state and edits. Startup currently reloads
  the supported portion of the installed default; full preset import/export,
  browsing and roundtrip fidelity are not implemented.
- Admit the saved device into Alive with the actual note and state contract.
  Experimental graph callbacks alone are not Alive instrument admission.
- Route sustain, pitch bend, pressure, MPE and host tempo/transport. The current
  test ingress carries note pitch/velocity and note-off; low-level support for
  channel-message bytes is not complete host routing. Transport is a zero buffer.
- Qualify automation timing. Current test edits are applied at audio block
  boundaries; parameter events are not sample-accurately interleaved with notes.
- Qualify simultaneous instances, reset/panic, sample partitioning, realtime
  allocations/locking, CPU capacity and comparison against Live's rendering.
  No complete preset corpus or deterministic Windows-RNG equivalence is proven.

Note-off now reaches settled silence in the exercised Analog path, including a
long-idle render after the F1/F2 correction. This does not prove every envelope,
preset, sustain or lifecycle case. `ResetA` by itself is not a proven hard clear;
the desktop Stop quiesces the driver and destroys the instance.

The loader remains in-process research code. Its C guard reports qualified
adapter errors, but cannot contain arbitrary native faults or heap corruption.
Skipping DLL startup/TLS/unwind work and testing one installed version are explicit
compatibility limits, not general Windows-library support.

## Next Devices, Based On Existing Evidence

| Device | Native evidence | Original GUI entrypoint | Next step |
| --- | --- | --- | --- |
| Analog | Current editor/keyboard; 203 descriptors | `Devices/UltraAnalog/Contents.xml` | Complete its profile and persistent host contract |
| Electric | Retained adapter accepts exact hash; 33 descriptors and finite note audio | `Devices/LoungeLizard/Contents.xml` | Best second instrument to prove the shared host/profile boundary |
| Collision | Older private probe: 139 initialized descriptors and finite note audio | `Devices/Collision/Contents.xml` | Requalify in retained runtime, then map its model and controls |
| Tension | Older private probe: 130 descriptors, 129 initialized, finite note audio | `Devices/StringStudio/Contents.xml` | Requalify in retained runtime, then map its model and controls |
| Corpus | Older private probe: finite stereo input processing | `Devices/Corpus/Contents.xml` | Add and qualify the audio-effect input path |
| Amp | Constructor fault at RVA `0x5d53c`, address `0x10` | `Devices/Amp/Contents.xml` | Investigate construction/import dependencies |
| Cabinet | Constructor fault at RVA `0x7081c`, address `0x10` | `Devices/Cabinet/Contents.xml` | Investigate construction/import dependencies |

The GUI entrypoints were enumerated through the retained pack reader against the
qualified installed GUI pack. The installed Electric and Tension defaults confirm
the `LoungeLizard` and `StringStudio` model names. Their panels have not yet been
rendered or bound in Ultra.

Only Analog and Electric are accepted by the retained adapter. The other native
results belong to throwaway probes, not current support. Collision and Corpus
showed small no-input residuals. Amp/Cabinet import USER32/COMDLG32 services, but
the cause of their constructor faults is still unknown.

## Repeatable Qualification Checklist

1. Pin installed artifact identities; inventory exports/imports and select the
   observed model/UI entrypoint. Reject unsupported revisions explicitly.
2. Construct, enumerate and destroy in the retained runtime; establish a bounded
   neutral starting state and instrument/effect I/O before attaching an editor.
3. Verify finite note or input audio, silence/release expectations, idle behavior,
   repeated notes, reset/stop and failure handling. State residual-noise limits.
4. Match model paths to complete descriptor signatures. Verify endpoints,
   sign/offset, enum order and audible causality; midpoint agreement is insufficient.
5. Qualify physical formatting and inverse parsing separately. Use the same
   encode/decode path for defaults, edits, acknowledgments and polling.
6. Expand the real panel, report mapped/unresolved controls and custom displays,
   and test visibility/navigation. Keep unqualified controls disabled.
7. Restore complete defaults/presets transactionally before enabling notes;
   verify edited-state save/reopen, independent instances and interrupted restore.
8. Qualify transport, expressive MIDI, automation timing, sample partitioning and
   realtime capacity, then admit the saved Ultra device into Alive.

The next implementation should prove this boundary with Analog plus Electric
before scaling the same mechanism to Collision and Tension. Corpus then proves
that the abstraction also supports an effect with audio inputs.

## Evidence And Reproduction

- Current value/default/routing findings: [analog-values.md](analog-values.md).
- Resource reader/rendering scope: [ui-resources.md](ui-resources.md) and
  [live-device-resources.md](../../apps/ultra/ui/live-device-resources.md).
- Earlier native measurements and artifact identities: [results.json](results.json).
  These are dated probe results, not a claim of new testing in this audit.
- Private coverage report:
  `~/.cache/alive-ultra-evidence/analog-values-20261031/qa/coverage-audit.json`.
- Private installed-resource inventory:
  `~/.cache/alive-ultra-evidence/analog-values-20261031/qa/device-all-entrypoints.json`.

Coverage was inspected with the actual installed packs/default and production
bindings against retained descriptors; UI transport was mocked for enumeration.
This audit did not rerun another device or rebuild the native app. Original DLLs,
presets, resource XML/artwork, decompilations and captures remain outside the repo.
