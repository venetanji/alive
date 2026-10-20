# Headless Pd + Cyclone + the same Faust voice

This is an executed offline experiment, not a new production runtime or a Max-compatible product claim. It preserves the older `libpd-adapter` and `faust-reference` experiments unchanged.

## Run

From this directory run `./run.sh` on Linux x86_64 with C/C++17, Python 3, curl and the existing prepared sibling dependencies. The existing `libpd-adapter/build/libpd-.../libs/libpd.so`, `faust-reference/.deps` and generated reference header are required. If absent, prepare those sibling experiments using their documented scripts first. This script does not install software, open hardware, run a desktop or change sibling files.

The script verifies pinned input hashes, regenerates Faust into this experiment's build directory and checks it is byte-identical to the reference header. It compiles three **unmodified Cyclone source files** into loadable Pd externals and a custom `alivevoice~` external. A separate process opens `voice.pd` through libpd, which dynamically loads the externals and executes their DSP/message methods. The oracle is a direct instance of the existing `Voice`, not a simulation of Pd or a bypass around the Pd signal chain.

Outputs:
- `build/results.json`: machine-readable checks, dispatch trace and limitations. `results.snapshot.json` retains the verified 2026-10-20 run for source review; reruns update only build output.
- `build/audio.csv`: 1,536 frames of direct oracle, hosted voice and both real Cyclone clip paths.
- `build/test.log`, `build/runtime.log`: test results and Pd diagnostics.
- `fixture-catalog.json`: object/port shapes, concrete typed inputs/expected outputs and bounded ingress contract for UI/reference work.
- `dependencies.json`: component versions, source links, terms and checked SHA-256 inputs.

`build/` is ignored. No binary/runtime redistribution or product license selection is implied.

## What passes

1. **Same DSP, same host:** the monophonic Faust voice in a real Pd external is bit-exact to the direct generated `ReferenceVoice` for 24 ticks, with frequency/gain/gate/level and reset operations. Both use 48 kHz float32 and aligned 64-frame controls. This reuses the existing Voice primitive, **not** the four-voice MIDI allocation/sustain policy.
2. **Real Cyclone signal processing:** the hosted Faust signal passes through `cyclone/clip~`; a second clip path receives libpd input. Every output is checked against the corresponding clamp. `clip~` is deprecated upstream in favor of Pd's vanilla object; its diagnostic is expected, disclosed and not suppressed.
3. **Actual messages:** gate forwards bang, float, symbol, mixed list and arbitrary selector/atom messages. split's float classification/truncation and Pd trigger's right-to-left order are captured through libpd hooks. Outputs are already available before audio processing. These are observed pinned-Pd/Cyclone semantics, not inferred Max results.
4. **Instance/lifecycle:** identical receiver names do not cross devices. B's entire future parameter/gate sequence is bit-exact to its independent oracle while A is reset, replaced with a separately configured prepared instance, retired and processed. All preparation/swaps/free calls are stopped/offline, with no concurrent graph mutation claim.
5. **Admission:** fixed score capacity 256, 16 due events/tick and finite validated scalar controls. Invalid input, queue overflow and per-tick overload cancel future events, clear the sounding voice before the next tick and latch failure. A future accepted gate-on cannot survive a rejected termination. A fresh score can recover after reset. Equal-frame events retain insertion order.
6. **Negative controls:** remove each of the four external binaries in separate fresh-process fixture directories. Every case reports a missing object and fails the relevant behavioral test. A silent or disconnected external cannot give a false all-pass result.

## Timing and safety boundaries

Offsets 0/1/31/63/64/65/127 are checked against dispatch ticks 0/64/64/64/64/128/128, with every envelope/phase sample bit-exact to an oracle driven at the quantized frame. `build/timing.csv` records the requested, dispatched and first nonzero sample positions. A sub-tick event at frame 65 is delivered before tick 128. Direct libpd control calls are synchronous outside processing; this ceil rule is a conscious host Score policy, not a claim about every libpd scheduling API. This is **not** sample-offset parity with the direct host's sample-accurate score renderer. There is no arbitrary-chunk causal FIFO in this experiment and no extra FIFO latency added here. The earlier libpd-adapter separately tested such an adapter; its measurements should not be silently imported as new evidence.

“Bounded” applies to this fixture's offline host score admission and preflight, not arbitrary Pd execution. Pd calls lock; patch graphs may recurse/allocate/do unbounded work; trace hooks allocate strings/vectors; loading/freeing are not realtime safe. A fixed tiny message fixture directly invokes libpd without the scalar Score. No general typed-message quota, concurrent audio/control safety, callback allocation audit, sustained deadline qualification or hardware latency is established. A failed Score must apply its pending reset before any next processing call or recovery; callers cannot bypass that lifecycle contract.

`alivevoice~` catches allocation/preparation exceptions at object creation, but the fixture is not a hardened plugin ABI. Host constructor failures can still leak partially constructed libpd state; setup/teardown exception containment and full host fault recovery need production engineering. Scores use trusted internal static selector strings, not an exposed untrusted pointer API. The external is fixed to this 48 kHz profile.

No Max reference has been supplied. Max gate/split/clip~/trigger are only candidate matching objects. Do not claim Max equality, `.maxpat` compatibility, scheduler equivalence, Live integration, or all-Cyclone support from these tests.

## Pins and terms

- libpd `ba0dc63262901d658af8bbda5e619a60fa975e78`, Pure Data `f009fd8d7b537e209e09898d487fdf1bf547da2b` (0.56.5): preserved sibling MULTI build, Standard Improved BSD terms with notices/individual-file review.
- [Cyclone 0.9.4](https://github.com/porres/pd-cyclone/releases/tag/cyclone_0.9.4), commit `173ea9f376711035a76e3bbf2374fae6c6d236c8`: official release requires Pd >=0.56.2 and works with this pin. Cyclone 0.9.6 requires Pd >=0.57, so it is intentionally not substituted. Source is BSD-3-Clause. We compile selected files directly; no pd-lib-builder source is executed.
- [Faust 2.88.0](https://github.com/grame-cncm/faust/releases/tag/2.88.0): compiler is a pinned build-time dependency, not loaded by the rendering process. Unmodified architecture headers and the selected GRAME library sections have documented Faust exceptions; the wider libraries contain separately licensed sections. Reuse of this particular DSP does not clear every future Faust DSP or choose the application's license.

`dependencies.json` records source and compiler-library hashes, but the native C/C++ compiler is an environment tool, not hermetically provisioned. Its version is recorded in results. Reproducible behavior is tested; cross-toolchain binary identity is not promised. Full distribution/legal review is still pending.
