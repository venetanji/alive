# Task 6: Reusable Effect Foundation

Implemented against `548b1a1`, with the parent's independent packaging checkpoint
`848f53e` as the eventual commit parent. Task 6 changes only reusable metadata,
shared signal objects, original effects/help, affected callers and their tests.
No chain runtime/editor, pool/track increase, packaging change or new DSP engine.
No push, PR, release, branch/configuration change or native GUI harness run.

## Frozen Normalized Host Interface

The names and shapes below are the Task 7 integration contract. These types live
in `apps/ultra/src-tauri/src/canvas_device.rs`; they carry no DSP or UI ownership.

```rust
struct HostManifest {
    version: u32,
    id: String,
    name: String,
    kind: DeviceKind,
    note_node: Option<u32>,
    input: Option<HostAudioInput>,
    output: ChannelBundle,
    parameters: Vec<HostParameter>,
}
enum DeviceKind { Instrument, AudioEffect }
struct HostAudioInput { node: u32, bundle: ChannelBundle }
struct ChannelBundle { channels: u32, layout: String }
struct HostParameter {
    key: String, label: String, node: u32, param: String,
    slot: u32, min: f64, max: f64, base: f64,
    integral: bool, unit: Option<String>,
}
```

Serialization uses camelCase for HostManifest/HostParameter and DeviceKind:
`kind:"instrument"` or `kind:"audioEffect"`, `noteNode:1` or `noteNode:null`.
An instrument serializes `input:null`; an effect serializes
`input:{node:1,bundle:{channels:2,layout:"stereo"}}`. Output is
`{channels:2,layout:"stereo"}`. Option fields remain present as JSON nulls.
`version` retains the source manifest version, not the document version.
The normalized descriptor intentionally does not include presets: authored
presets remain in the saved manifest, while hosts receive resolved live slots
and saved bases. There is no invented MIDI node for an effect.

## Saved Manifest Admission

Version 1 retains its exact strict schema, MIDI `node/inlet` binding, zero audio
inputs and stereo output. Version 2 has strict version-specific structs and
requires `kind`, `midi:{input:{node,inlet}|null,output:null}` and
`audio:{input:{node,bundle:{channels,layout}}|null,output:{channels,layout}}`.
All I/O fields, including nulls, are mandatory. Unknown fields reject at every
level. Instruments require inlet 0 of an authored poly.note~ and no audio input;
effects require no MIDI and an authored audio.in~ input. Only declared stereo
input/output is admitted. Mono, wider/mismatched layouts and wrong node kinds
reject visibly. Existing bounded parameter, preset, identifier and range checks
apply equally to both versions.

Rust and JS implement matching v1/v2 admission rules. Mirrored tests cover both
kinds, wrong binding nodes, mismatched layouts, unsupported kind, non-null MIDI
output, missing required nulls and version-1 preservation. Actual saved effects
also pass both validators, expose the same parameter keys and resolve their live
native slots. A version-2 instrument works in the existing session and headless
instrument probe. Session references must match the loaded manifest version.
`alive-session-v1` explicitly rejects effects with an instruments-only/chain
runtime error before applying device bases. The native session-v1 ABI is intact.
Its required integer note field uses zero only as a fail-closed conversion
fallback; normal preparation admits only manifests with an actual note entry.

## Shared Native Signal Objects

- `audio_in` / `audio.in~`: native kind 66, C constant
  `ULTRA_CANVAS_AUDIO_IN`, no inputs/parameters, two mono outputs.
- `filter_stereo` / `lowpass.stereo~`: native kind 67, C constant
  `ULTRA_CANVAS_FILTER_STEREO`, mono audio inlets 0/1, control cutoff/resonance
  inlets 2/3 and mono audio outlets 0/1. Cutoff p0 is 20..20000 Hz, default 2400;
  resonance p1 is 0.1..20 Q, default 0.7. Both are live parameters. Unused
  descriptor fields must be zero.
- Evaluator API: `signal_sample(voice_a, voice_b, next_offset, emit,
  defer_notifications=false, std::array<double,2> external_input={})`. The final
  pair supplies external host audio; it is independent of the legacy Voice
  pair. Default `{0,0}` preserves silence in ordinary roots. No physical input,
  cross-root audio bus, allocation or new C session API is introduced.
- Stereo filtering calls the unchanged generated `UltraFilterKernel` on lanes
  0/1 of each node's existing `CanvasVoiceKernels` storage. Initialization remains
  outside callbacks. Hard Stop/reset clears the bounded allocated kernel state;
  accepted live edits retain the filter tail. The evaluator remains alongside
  the existing Clockwork guest and adds no alignment delay.
- C/C++ constants, native port/admission/control handling, Rust registry/ports,
  JS registry/catalog/appearance and original help manifest agree on the new
  objects. Native graph/POD sizes, capacities and ownership remain unchanged.

## Original Saved Effects And Panel

`apps/ultra/examples/utility.ultra` has stable ID `org.alive.utility` and key
`gain`. Node 1 is audio.in~, node 2 is line~ (value default 1, bound range 0..2),
nodes 3/4 are signal multiplies and node 5 is dac~ 1 2. One authored line~ feeds
both multiplier right inlets. Unity/Half/Silence presets retain the authored
parameter binding and separate stereo routing.

`apps/ultra/examples/stereo-lowpass.ultra` has ID `org.alive.stereo-lowpass`,
keys `cutoff`/`resonance` and authored input node 1, filter node 2, sink node 3.
Presets are Init/Warm/Resonant. `canvas-effects.mjs` is the original source for
the saved graphs and library entries. The existing generator updates them and
the native/browser library manifest. Help & Examples now has 144 original
entries: 68 native kinds plus two authoring constructs, two entries each, with
four named starter/device examples. Existing subtractive and Alive examples are
unchanged.

Perform exposes parameters/presets for either kind, understands nested v2 MIDI
input and hides/disables the MIDI keyboard and Release all when MIDI is absent.
Its keyboard shortcut handler does not consume keys for effects. Effects get
an explicit host-audio/default-silence explanation. Instrument packaging is
disabled for an already authored effect. The original history/flush/Quit,
scopedStop, notice and device-player release behavior remains in use.

## Retained RED/GREEN Evidence

Test changes were written and exercised before the corresponding implementation.
The following are captured failure excerpts, not inferred failures. Full local
logs are `/tmp/alive-task6-*-red.log` and the gate logs listed below.

| Test Phase | Expected RED | GREEN |
| --- | --- | --- |
| JS v2 manifests | 6 passed / 2 failed: `Device: unknown field kind.` and `Unknown object type: audio_in.` | Both kinds and malformed cases pass; saved effects/presets pass. |
| Rust v2 manifests | 0 passed / 2 failed: version-two manifest rejected for unknown v2 audio `input` field | v1/v2 normalize; nullable note/input, binding slot and strict malformed I/O checks pass. |
| Native object admission | `Assertion compile_canvas(effect(filter),p) failed` for kind 66 | Both new objects compile with exact ports and silent default host audio. |
| Explicit external samples | Compile fails: `candidate expects 5 arguments, 6 provided` | Supplied stereo channels remain separate; legacy Voice pair does not become external input. |
| Effect panel | `false !== true` for hidden keyboard | Effect controls and preset recall work; keyboard/Release hide; v2 instrument MIDI sends node 1/inlet 0. |
| Saved effects | `ENOENT ... examples/utility.ultra` | Saved examples validate, keys remain stable, presets edit real bindings. |
| Session v2 | Unsupported manifest version 2, rather than explicit effect rejection or v2 instrument acceptance | v2 instrument loads; version mismatch rejects; effects report instruments-only/chain runtime. |
| Headless effect probe | `Instrument probe requires a cutoff binding` | Effects reject explicitly before creating render output. |
| Headless v2 instrument | `Option::unwrap() on a None value` at raw v1 MIDI lookup | Probe uses normalized note_node; full two-instance v2 instrument render passes. |

Supplemental native tests verify impulse tail persistence, hard Stop/reset,
deterministic reset response, silent opposite channel, live cutoff/resonance
energy differences, finite samples and the shared Utility line~ gain affecting
both channels. The actual backend callback test exercises both new kinds,
filter tails and Stop/resume with malloc/calloc/realloc/free/mutex wrappers;
there are no callback allocations, frees or blocking locks.

## Verification

- Standard native target rebuild: `cmake --build apps/ultra/build --target
  ultra-diagnostic --parallel 2` passes. Log: `/tmp/alive-task6-native-build.log`.
- Native gate: `bash apps/ultra/tests/ci/check-native.sh` passes, including
  stereo-filter callback guard, exact Alive event frames, seven callback
  partitions, shared ownership, overload Stop and 42-cycle Stop stress.
  Log: `/tmp/alive-task6-native.log`.
- Rust: `cargo test --locked --lib` with command-scoped native library paths
  passes 158 tests, 0 failures, 2 existing ignored tests. Both headless instrument
  versions and the saved two-track Alive headless probe pass.
  Log: `/tmp/alive-task6-rust-all.log`.
- Node/DOM: all 447 tests pass in the contracts gate. This includes existing
  pending-history/Quit, scopedStop/notices and asynchronous admission tests.
- Contracts: `uv run --no-project --with jsonschema bash
  apps/ultra/tests/ci/check-contracts.sh` exits 0, including all 447 Node tests,
  schema/reference checks and portable native effect/runtime tests.
  Log: `/tmp/alive-task6-contracts.log`.
- Chromium: `npm run test:browser` in `apps/ultra/tests/ci` passes all 103 tests
  (1.6 minutes), using Chromium's normal sandbox. No native GUI harness runs.
  Log: `/tmp/alive-task6-browser.log`.
- Mechanical detector reports no findings in changed JS targets. The existing
  canvas HTML inherits compact-padding/11px-text warnings; its only changed
  content is the stale Alive-hosting explanatory sentence, preserving the
  explicitly requested existing compact visual language.
- `git diff --check` passes.

## Limits And Concerns

No hardware audio, physical MIDI, microphone input, native GUI rendering or
realtime deadline claim is added. Browser/DOM tests are UI evidence; native
headless/guard tests establish DSP and bounded callback behavior. Chain routing,
bypass, device pools and session-v2 are intentionally Task 7 work.

An initial unrestricted CMake all-target build hit the existing unused
`clockwork_comms` target's missing generated `clockwork_osc.h`; the repository's
standard ultra-diagnostic target rebuild passes. The first broad contracts run
stopped at system Python's missing jsonschema. The temporary
`uv run --no-project --with jsonschema` environment resolves that prerequisite;
no persistent environment or repository setting changed.

The contracts runner regenerates
`experiments/max-reference/arithmetic-runtime-20261022/results/native-build.json`.
This historical receipt is left unstaged and is not part of the task commit.
Parent-owned `PLAN.md` and `.superpowers/sdd/PLAN/progress.md` changes are also
left unstaged. Existing notices/dependency/kernel sources are untouched.
