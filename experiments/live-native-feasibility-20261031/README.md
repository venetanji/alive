# Native Live Device Feasibility

Date: 2026-10-31. This is a bounded local research spike, not a shipping feature.

## Result

**Yes for at least one device:** the installed `Electric_64.dll` produced
MIDI-triggered audio in a Linux x86-64 process without Wine. A temporary modified
copy of Ultra's native backend also rendered that DLL through its signal graph.
The shared application source and installed DLL were not modified.

This used the original device's x86-64 instructions, an experimental PE loader,
and a small Windows calling-convention / C-runtime adapter. It did not recover
the original source or compile the device into a Linux ELF library. It is a
narrow compatibility implementation, and still has compatibility code even
though it has no Wine dependency.

Wine also executes x86-64 instructions directly on this machine. Removing Wine
does not by itself reduce the cost of the DSP calculations; the opportunity is
to host selected devices with a much smaller runtime and integration boundary.

## Evidence

- Source: the installed Live 12 Suite resources at
  `/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite`.
- Tested device: `Resources/Devices/Pc/Electric_64.dll`, 581120 bytes,
  SHA-256 `66a42b09161ca7d48861e1980523e2cb44dd4f08fbd04ac9c4231a56d79b2be8`.
- Target: Linux x86-64; device rate 48000 Hz; 188 blocks of 256 frames,
  48128 frames per case; planar float audio.
- Parameter setup: 33 initialized descriptors, explicitly set to the midpoint
  of their reported ranges. This is an experiment configuration, not a verified
  factory preset or a reconstructed Live preset mapping.
- MIDI: one note-on, velocity 100, at frame zero; note 60 or 72. No note-off,
  sustain, automation, or MPE behavior was qualified.
- Original instructions were loaded from the DLL into anonymous memory. The
  loader applied 2514 PE relocations and populated the 115-entry import table.
  Calls to unsupported imports terminate the experiment instead of succeeding
  through placeholder implementations.
- Observed calls used 32 implemented runtime entry points in the retained Ultra
  note case. Runtime adapters cover the paths actually reached, not all imports.
- The runner checked the process's memory mappings for Wine runtime libraries,
  verified the source DLL's SHA-256 after execution, and verified all 14 source
  files / core archive used for the Ultra snapshot against their original hashes.

`results.json` retains all five cases, process exit codes, empty stderr, frame
counts, signal measurements, runtime-call counts, and the explicit limits.

| Check | Result |
| --- | --- |
| Original Electric DLL, direct native call, note 60 | Nonzero finite audio |
| Electric inside the temporary Ultra graph, note 60, gain 8 | Nonzero finite audio |
| Same Ultra graph, no MIDI note | Exactly zero output |
| Same Ultra graph, MIDI note present, gain 0 | Exactly zero output |
| Same Ultra graph, note 72, gain 8 | Nonzero finite audio |

All five child processes returned zero without diagnostic stderr. The Ultra
cases consumed 48128 samples from the source and called its original `CalcA`
188 times. Ultra's initial 64-sample output mute remained in effect. The second
pitch case only checks successful rendering; pitch accuracy was not measured.

The device's returned silence/status flag has not been assigned a verified
meaning. Assertions use measured PCM, not that flag.

## How It Fits Into Ultra

Current Ultra has a fixed native object vocabulary, not a general device host.
The snapshot added experimental node kind 60, with zero inlets and two mono
signal outlets. A small C bridge renders the original DLL in 256-frame blocks
and exposes its samples to Ultra's existing per-sample graph traversal:

```text
Electric_64.dll / CalcA
        |
temporary LiveDevice source (kind 60)
        | left                  | right
     Ultra *~                Ultra *~
        |                       |
        +------ Ultra dac~ -----+
```

The runner installed this graph through `ultra_canvas_install_document` and
read audio through `ultra_external_render`. It used a separately compiled
`ultra-probe.so`, linked against an immutable copy of the existing core archive.
No audio device, JACK server, GUI, Wine prefix, or user project was opened.

The snapshot changed only `canvas_message.hpp`, `canvas_signal_objects.hpp`,
and `patch_graph.hpp`; none of those changes were applied to the shared source.
This demonstrates integration with Ultra's native rendering graph, not support
in the current desktop UI, document format, or normal application build.

Relevant production boundaries:

- `apps/ultra/src-tauri/native/patch_graph.h`: descriptor/message C ABI.
- `apps/ultra/src-tauri/native/patch_graph.hpp`: graph validation and signal loop.
- `apps/ultra/src-tauri/native/backend.h`: headless external rendering API.
- `apps/ultra/core/CMakeLists.txt`: Clockwork plugin hosting is disabled.
- `apps/ultra/ui/canvas-max-import.mjs`: approved Max JSON graph import,
  rather than a Max binary/external or AMXD runtime.

## Device Inventory And Viability

Seven standalone native device DLLs were found under `Resources/Devices/Pc`:

| Device DLL | Bytes | This investigation |
| --- | ---: | --- |
| Electric_64.dll | 581120 | Native audio and temporary Ultra integration passed |
| Collision_64.dll | 671744 | Export/import inventory only |
| Corpus_64.dll | 777216 | Initial loader attempt stopped at an unsupported math import; not qualified |
| Analog_64.dll | 816640 | Constructor attempt faulted after adapting its math import; not qualified |
| Tension_64.dll | 818688 | Export/import inventory only |
| Cabinet_64.dll | 1283072 | Export/import inventory only |
| Amp_64.dll | 1596928 | Export/import inventory only |

All seven export the same names:
`CalcA`, `CreateInstanceU`, `DestroyInstanceU`, `GetPlugInfoU`, `ResetA`,
`SetParameterA`, and `SetSampleRateU`. This is a useful private device boundary;
it does not establish identical signatures, state layout, or compatibility
across devices and versions. They are not exposed as VST/CLAP devices here.

The five AAS device DLLs depend on Windows CRT API sets and KERNEL32. Amp and
Cabinet additionally import GUI, registry, shell, COM, and crypto APIs. Import
presence does not prove every API is reached during audio processing. Cabinet's
factory also has a host-executable-name condition visible in offline analysis;
it was not modified or spoofed in this study.

The main Live executable is 148198344 bytes and imports a much wider platform
surface, including graphics, multimedia, networking, UI, USB, and Windows C++
runtimes. `Ableton Live Engine.dll` is 28077512 bytes and exports ReWire-named
entry points rather than this small device interface. Their dependencies and
scale make whole-application porting a substantially larger project. No native
whole-Live execution was attempted, and the location of every other stock
device's processing code has not been established.

## Comparison With Game Decompilation

The approaches should be distinguished:

1. **Use original x86-64 device code with a small host/runtime adapter.** This
   experiment proves a bounded example. Since the device and machine share an
   instruction set, CPU instruction translation is unnecessary for these paths.
2. **Recover or lift DSP functions and rebuild a native library.** Plausible for
   a well-isolated kernel, but recovering types, state, indirect calls, static
   initialization, exceptions, and platform behavior remains engineering work.
   Decompiler pseudocode is not automatically buildable source.
3. **Port all of Live.** This includes far more than DSP: UI, scheduling, device
   state, media handling, projects, and OS integration. The bounded device result
   provides no demonstration of that work being feasible at an acceptable cost.

Game source reconstructions, static recompilation projects, and PS5 compatibility
layers use different techniques. Their successes do not supply Live's missing
host or runtime contracts. The small standalone device boundary is the reason
this particular experiment was tractable.

## Max For Live Is A Separate Route

An AMXD device can contain a patch graph, assets, scripts, Gen code, and/or native
externals. Porting an admitted graph to Ultra can avoid reusing the original
Windows code, but it requires implementing its objects and Live interactions.
Ultra currently imports a subset of Max JSON; it does not provide a general
AMXD decoder, Max external host, or Live object model.

Cycling '74's current SDK documentation confirms that Windows `.mxe64` files
are DLLs exposing `ext_main` and importing Max/MaxAudio APIs. Loading one would
require a compatible Max host boundary, not simply changing its extension or
relinking it. This pass chose a real stock DSP DLL rather than presenting a
reimplemented Max patch as execution of the original device binary.

Sources consulted through Context7:

- https://github.com/cycling74/max-sdk/blob/main/html/chapter_platform.html
- https://github.com/cycling74/max-sdk/blob/main/README.md
- https://github.com/microsoftdocs/cpp-docs/blob/main/docs/c-runtime-library/reference/create-locale-wcreate-locale.md

## Limits And Next Experiment

The loader skips DLL startup and TLS callbacks. Its C-locale, formatting,
threading, and allocation adapters are intentionally incomplete. For example,
the random-number adapter uses libc's generator, so its exact sequence is not
certified against Windows. No comparison with Live's PCM has been made. A
successful note render does not prove exact sound, preset fidelity, full
lifecycle correctness, or hard real-time safety.

An early sample-rate-change warning was traced to Windows `long` being 32-bit
while Linux x86-64 `long` is 64-bit. Translating the formatting/scanning length
modifier in the adapter removed those warnings; the final five cases all have
empty stderr. This is an example of the ABI details that a robust adapter must
handle, not evidence that all remaining ABI differences have been solved.

Recommended next milestone: reproduce one explicit Electric parameter state
and MIDI sequence in licensed Live and the native runner, then compare PCM,
note-off/release, block-size behavior, and state restoration. After that,
introduce a supported device-host boundary and lifetime management in Ultra.
Record/control the random seed and generator behavior for that comparison.
Other DLLs should each qualify independently.

## Retained Local Evidence

The throwaway C/Python harness, exact modified Ultra source snapshot and core
archive, build commands, five run records, audio sample, and complete REA evidence
are retained privately at:

`/home/venetanji/.cache/alive-ultra-evidence/live-native-feasibility-20261031/`

The temporary build directory is `/tmp/alive-live-native-TeB9PLLy/`. It is not
production code. No proprietary DLL, decompiled source, or factory patch is
included in this repository report. `manifest.json` in the private directory
records the retained files' hashes. The REA analysis session was closed.
`rebuild.sh` records the compiler/link commands and bounded verification entry
point; the original installed DLL remains a separate local prerequisite.

Key REA evidence identifiers (static observations, not execution evidence):

- Construction: `ev_e5f92e671fb2f8152fb56e2a4fa8620cf5ee1f2f717f65dcd96429b45866cf87`
- Exported audio wrapper: `ev_57c937968f7432ab5d180ae5815a804173fc7b8f640c8a2a157dbfa1ae51aae9`
- Parameter dispatch: `ev_442b5de0e6b3186894cc2f735da93fd7be006cc7de071bcf16135b9c2c6312a8`
- Inner audio dispatch: `ev_f52fff34b8efde9cdef20ffd1bc5858dad3bb86194bbd83299450c0783627c16`
