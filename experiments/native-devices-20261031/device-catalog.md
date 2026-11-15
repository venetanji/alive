# Installed Live device catalog

Inventory date: 2026-10-31. This extends the earlier seven-DLL investigation.
It catalogs installed implementation boundaries, serialized models, resources
and composite presets. It does not admit additional devices to Ultra or Alive.
The companion [machine catalog](device-catalog.json) contains exact candidate
identities and the separate qualification status of each implementation family.
The [Alive hosting proposal](alive-device-hosting.md) describes the next work.

## Search coverage

The static binary scan enumerated 49,578 files across the installed Live root,
named Ableton/Max user roots and the installed ReWire directory. It found:

| Boundary | Count | Meaning |
| --- | ---: | --- |
| Native binary paths | 991 | 989 distinct hashes; includes support libraries |
| Literal `.dll` paths | 95 | Seven are standalone Live device candidates |
| PE DLL paths, including other suffixes | 963 | `.mxe64`, `.node` and `.vst3` can also be DLLs |
| Max externals | 864 | Includes ordinary Max objects and dependencies |
| `abl.device.*` externals | 15 | Complete-device candidates using the Max ABI |
| `abl.dsp.*` externals | 59 | Lower-level DSP blocks, counted separately |

The installation contains 986 of the 991 native paths. All 985 PE images were
parsed without reported read/parse errors; six other images are ELF/Mach-O
copies. Independent `objdump` comparisons of normal imports and named exports
agree for 28 selected images. No target code was executed during this catalog.

Scope includes the actual installed Core Library, preferences and metadata-derived
user locations. It excludes arbitrary other Wine prefixes, Windows system DLL
directories, unknown custom plugin locations, network storage, archives and
embedded installer payloads. An absent file in these roots is not a global
absence claim. The complete private manifest lists every native path, hash,
size, architecture, exports, normal/delayed imports and role; its report lists
all 95 literal DLLs.

## The three device classes

These are outer musical signatures, independent of binary packaging:

| Class | Input | Output | Composition |
| --- | --- | --- | --- |
| MIDI effect | Timed MIDI events | Timed MIDI events | Before an instrument, or inside a MIDI rack |
| Instrument | Timed MIDI events | Audio | Followed by audio effects; parallel in instrument racks |
| Audio effect | Audio | Audio | Serial effects or parallel audio-effect rack branches |

Additional ports and host capabilities remain explicit: mono/stereo layouts,
sidechain inputs, envelope/analysis outputs, samples, tempo, latency and supported
MIDI messages. A pitch/velocity pair implementation does not imply full MIDI/MPE.
Racks, mixers and macro mappings are composition utilities rather than another
DSP implementation for every preset name.

## Seven standalone device DLLs

Location: `Resources/Devices/Pc` under the installed Live root. All seven export
`CalcA`, `CreateInstanceU`, `DestroyInstanceU`, `GetPlugInfoU`, `ResetA`,
`SetParameterA`, and `SetSampleRateU`.

| Device | Musical class | Current qualification |
| --- | --- | --- |
| Analog | Instrument | Ordinary saved `live.device~` in Ultra; Alive admission pending |
| Electric | Instrument | Exact hash accepted by the low-level adapter; no ordinary object profile |
| Collision | Instrument | Historical feasibility probe produced audio; current adapter not admitted |
| Tension | Instrument | Historical feasibility probe produced audio; current adapter not admitted |
| Corpus | Audio effect | Historical stereo-input probe worked; retained host has no native audio-input path |
| Amp | Audio effect | Historical constructor fault; cause unresolved |
| Cabinet | Audio effect | Historical constructor fault; cause unresolved |

Only Analog is admitted by the normal object registry. Its current editor has
126 mapped control instances out of 175; all 203 commanded native values are
saved, while unresolved controls stay disabled. Full Live preset fidelity,
remaining controls, MPE and transport equivalence remain unqualified. Historical
probe results do not upgrade another device into supported runtime admission.

Analog/Electric/Collision/Tension/Corpus import a relatively small Windows/CRT
boundary. Amp and Cabinet additionally import UI, shell, COM, version and crypto
services. Their shared exports alone do not establish equivalent constructors.
Exact facts and prior runtime evidence are linked by the machine catalog and the
[earlier results](README.md).

## Fifteen additional complete-device candidates

Location: `Resources/Max/resources/packages/ableton-dsp/externals`. The installed
package is version 2.0.0 and declares Max 9 or later. Each image exports
`ext_main`, uses `MaxAPI.dll`/`MaxAudio.dll` and has installed reference/help files.
The I/O below is installed documentation evidence, not a native execution result.

| Class | Candidate devices |
| --- | --- |
| Instruments | Drift, Drum Sampler |
| Audio effects | Auto Filter, Channel EQ, Compressor, Delay, Drum Buss, Echo, Limiter, Redux, Reverb, Roar, Spectral Resonator, Spectral Time, Utility |
| MIDI effects | None documented in this family |

This gives 22 complete-device binary candidates across the two families: six
instruments and sixteen audio effects. It does not give 22 working Ultra devices.

The Max effects do not all have the same ports. Compressor documents mono audio
plus envelope output; Reverb has mono input and stereo output; Limiter adds an
envelope output; Roar adds a dictionary output; Auto Filter has stereo sidechain
inputs. Some Auto Filter type fields still contain documentation placeholders.
The machine catalog retains port indices/types and these limitations.

Utility was inspected serially through REA to establish the second ABI boundary.
At preferred VA `0x1800041f0`, `ext_main` registers `abl.device.utility~`, its
constructor, destructor, DSP64 method and attributes. Its constructor at
`0x180003740` rejects Max versions below `0x900`, allocates a Max object, uses
DSP setup and creates signal outlets. Its DSP64 method at `0x180003460` registers
a callback through `dsp_add64`. This is static evidence of a Max host dependency;
the existing seven-export adapter cannot call it unchanged.

Retained REA evidence IDs:

- Registration: `ev_65004680e2480ab4fec8152efbda2d751ca0f8cbe79a09bb6b9781b61ce678d2`.
- Constructor: `ev_2e2f953e8d13479eeedcb1765c61946e52bc961b7441a20a88b3d2db54022477`.
- DSP64: `ev_caa0ae11eabb1e286a63c168832ad5158ffdee2668e4ff80cf6c65de59fd8e04`.

The evidence bundle was exported and the owned REA session closed. No Max
external was executed, and no standalone callable internal-DSP ABI is claimed.

## Other implementation and resource families

The 59 `abl.dsp.*` objects include oscillators, filters, modulation, distortion
and analysis blocks. Their inventory is useful for future Ultra objects, but
they are not 59 more complete Live devices. Control signals and audio signals
must also be distinguished when classifying their ports.

Other discovered binaries include 790 ordinary Max externals/dependencies,
33 Max runtime/support binaries, 51 Qt framework/plugins and Live support
components. The main Live executable and `Ableton Live Engine.dll` are possible
containers for host-embedded DSP; no callable per-device boundary was established
inside them in this pass. A system/support DLL is not a device profile.

The hash-gated existing resource reader also indexed both installed packs:

| Pack | Entries | Device directories | Device XML payloads |
| --- | ---: | ---: | ---: |
| GUI | 2,696 | 79 | 252 |
| Graphics | 2,022 | 16 | 0 |

Directory presence is editor/resource evidence only. The GUI directories include
host utilities, old/new variants, placeholders and test devices, so 79 is not a
count of runnable devices. MIDI-related resources include Arpeggiator, CC
Control, Chord, Note Length, Pitch, Random and Scale. Serialized MIDI Velocity
appears in presets even though no matching top-level GUI directory was observed.
Their individual native DLL boundaries were not found in the scanned roots.

`GUI.alp`/`Graphics.alp` hashes match the existing admitted reader. No XML,
artwork, factory presets, binary payloads or decompiled implementations enter
the repository; private indices contain names, lengths and hashes.

## Presets and racks

All 4,005 candidate files were inspected: 4,004 XML documents parsed and one
legacy binary `.adv` was rejected explicitly. Successful files comprise 2,556
`.adv`, 1,072 `.adg`, 350 `.alc` and 26 `.als`. No configured parser budget was
reached. The private evidence records every candidate's identity and limitation.

The 78 observed model tags comprise 71 leaf model classes, four rack classes
and three mixer tags. The leaf classification is 13 MIDI-to-audio, eight
MIDI-to-MIDI and 50 audio-to-audio. These are serialization classes, including
legacy/current variants and shared Max wrappers, not counts of independent DSP
implementations. Analysis/control devices can inhabit the audio-effect category
without proving an identical audio-through processing contract.

The MIDI models are `MidiArpeggiator`, `MidiChord`, `MidiNoteLength`, `MidiPitcher`,
`MidiRandom`, `MidiScale`, `MidiVelocity` and the shared `MxDeviceMidiEffect`
wrapper. The native instrument models are `UltraAnalog`, `LoungeLizard`,
`Collision`, `StringStudio`, `Drift`, `DrumCell`, `InstrumentImpulse`,
`InstrumentMeld`, `InstrumentVector`, `MultiSampler`, `Operator` and
`OriginalSimpler`, alongside the shared `MxDeviceInstrument` wrapper. The complete
78-model classification, including audio effects, is in the companion machine
catalog. An installed schema adds 26 device-like classes absent from these files;
that set includes internal/test classes and is not a list of extra playable devices.

Four different containers must be handled deliberately:

| Container | Observed representation |
| --- | --- |
| Ordinary `.adv` | Device model directly below `Ableton` |
| `.adg` rack preset | `GroupDevicePreset`, branch presets, ordered device presets, separate mixers |
| `.alc` clip | `LiveSet`/typed device chains, potentially nested rack branches |
| `.als` set | Tracks/device chains plus arrangement, clip and host state |

Example: the installed `Basic Analog Bass.adg` contains
`UltraAnalog -> Compressor2 -> Vinyl -> Delay -> Delay -> Reverb`. It is a
composite instrument preset, not six binary instruments or an additional DSP DLL.
Another preset named `Analog Bass.adg` uses Drift. Filenames cannot identify the
underlying implementation reliably.

A chain preserves device order. A rack can contain parallel child chains,
chain mixers, key/velocity/selector ranges, macro mappings and nested racks.
Instrument branches can each run MIDI processing, an instrument and audio
effects, then sum their audio returns. MIDI racks merge events; audio racks
split and mix audio. Drum racks add note routing and return/send branches.
The scan found 837 parallel rack occurrences across 628 files and 477 return
branches across 265 files. It also recorded 26,807 structural KeyMidi records;
these are binding evidence, not 26,807 verified macro-to-DSP mappings.
Gain/pan laws, zone fades, routing, latency and macro conversions need their own
qualification; parsing the topology does not prove audible preset equivalence.

The scanner distinguishes actual local Core Library/Packs files from a virtual
pack database catalog. Referenced sample/plugin/Max paths are dependency facts;
the importer must resolve them and report unsupported nodes before admission.
Silently dropping an effect or replacing an instrument would misrepresent the
preset. A parsed rack with unknown implementations can still be shown as an
unresolved import graph.

## Reuse and remaining work

One `live.device~` object selects a qualified profile. Backend families remain
separate: seven-export standalone DSP, Max external, and unresolved host-embedded
DSP. The proposed profile contract owns exact identities, typed ports, semantic
parameter conversions, installed editor entrypoints, source state and lifecycle
capabilities. Current native profiles contain identity/count/descriptor facts;
several I/O and lifecycle assumptions are still hardcoded or missing.

Mapping can proceed in parallel from immutable evidence packets after one
coordinator's serial REA acquisition. The existing
[mapping skill](../../docs/skills/live-device-mapping/SKILL.md) already provides
that ownership/qualification workflow. Its existing Electric/Collision/Tension
packets retain their original scope; this catalog does not add missing runtime
evidence to them. Max-boundary acquisition and host changes belong to the
coordinator/integrator before profile workers can rely on that interface.

The next integration work is saved Ultra presentation and Analog ownership,
state and lifecycle in Alive. Alive should mount the saved panel without the
audition keyboard or graph cables. Native audio input, MIDI output, rack
composition and preset import are separate contracts described in the
[hosting proposal](alive-device-hosting.md).

## Retained private evidence

Base: `~/.cache/alive-ultra-evidence/live-device-catalog-20261031/`.

- `binaries/inventory.json`: all 991 binaries, exact identities and dependencies.
- `binaries/report.md`: complete 95-DLL listing, candidates, ports and scan bounds.
- `presets/inventory.json`: per-file hashes, serialized topology and dependencies.
- `presets/report.md`: taxonomy, examples, counts and parser limitations.
- `resources/inventory.json`: pack directory/payload index and hashes.
- `hosting/report.md`: current source evidence and the Alive admission gates.
- `hosting/inventory.json`: hashes of the 37 source files used by the audit.
- `rea/utility-evidence.json`: five retained static evidence records.

The machine catalog pins final manifest hashes. This inventory pass changes no
running app, mapped native library, installed executable or device admission.
