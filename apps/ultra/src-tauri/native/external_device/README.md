# Experimental Native Device Runtime

This original Linux x86-64 research adapter executes locally supplied Ableton
device machine code. It is unavailable unless every runtime source is compiled
with `ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL`. CMake exposes that option with a default
of OFF; ordinary application builds do not include it. The adapter does not bundle
or modify DLLs, presets, or derived assets.

`external_device.h` is a serialized C API. `open` reads a local file, checks the
requested SHA-256 against both the file and the two qualified hashes, maps its PE
image, creates one instance, selects 48000 Hz, and resets it. Only the qualified
Electric (33 descriptors) and Analog (203 descriptors) builds are accepted.
`parameter` exposes bounded descriptors from those exact layouts. `auxiliary` is
the final descriptor float; its meaning has not been assigned. The commanded-value
getter reports the last successful API write, not DSP state or preset readback.
`reset` calls `ResetA`; buffered audio can remain after it returns. A graph must
disarm or flush its audio bridge separately when immediate silence is required.
Callers must supply an explicit initial parameter state. The early graph harness
uses midpoint values, integer enum values and enabled booleans; the desktop test
now applies the supported portion of the installed Analog default over its
authored fallback before enabling the keyboard.

`render` accepts 1..256 frames of planar float audio and at most 16 sorted MIDI
events with offsets relative to that call. Event offsets and parameter ranges are
checked. Rendered samples must be finite. Adapter-detected errors poison an
instance; close it and create a new instance after such a failure. Calls are
serialized per instance; nested/reentrant calls are unsupported. The C export-call
boundary restores the calling thread's locale on success and adapter error.

The PE parser validates input ranges, image/section bounds, alignment, overlaps,
relocation blocks, import/export indices, strings, and final memory protections.
Only x86-64 PE32+, DIR64 relocations, named imports, and direct exports are covered.
Executable sections and import traps become read/execute; writable/executable
sections are refused. The loader skips DLL startup, TLS callbacks, Windows unwind
registration, and DLL detach. Runtime adapters implement only qualified paths;
unimplemented imports return an adapter error if reached inside the export guard.

This is in-process research code, not a sandbox. Native faults and heap corruption
can terminate or corrupt the host. No signal handlers are installed. Adapter
errors use a C `setjmp` boundary; this skips device stack unwinding and is intended
only to report failure and discard that instance. It does not establish general
Windows exception/CRT compatibility. Per-module allocation, lock, locale-handle,
and RNG bookkeeping is released on close, including after an adapter failure.
The RNG follows libc behavior, not a certified Windows sequence. Threading,
formatting, locale, lifecycle, audible fidelity, preset compatibility, realtime
safety, and allocation behavior remain unqualified beyond the tested paths.

The standalone checks compile into a temporary directory and take explicit local
DLL paths:

```sh
python3 -B apps/ultra/tests/external_device_run.py /absolute/path/Analog_64.dll /absolute/path/Electric_64.dll
```

The runner builds the C shim with GCC and the loader/API/tests with C++17, linking
pthread and libm. It checks hash mismatch, missing resource, malformed PE layout,
SHA-256 vectors, recoverable cold imports, caller locale preservation, descriptor
and commanded-value access, finite nonzero note rendering, and exact no-note
silence at both 1-frame and 256-frame sizes. When the experimental graph harness
is present, Analog also passes through the actual Ultra signal graph, two built-in
multipliers, and DAC. The runner also checks the Analog keyboard bridge's note
queue, finite audio, gain mute, overflow silence and close. The device resources
are rehashed after testing.

`analog_play.h/cpp` is a single-instance desktop test bridge. Open/close require
the audio driver's quiescent callback fence; note/gain have one serialized control
producer and render has one callback owner. It is not the reusable device object
or saved graph interface intended for Ultra/Alive. The test window now includes
the installed Analog panel with shared controls, physical readouts and partial
default import. Its 126 admitted logical mappings encode 128 native descriptors;
49 of 175 control instances remain unresolved. See the current
[generalization audit](../../../../../experiments/native-devices-20261031/generalization-audit.md)
for coverage, the proposed profile boundary, and the remaining Ultra/Alive work.

## Owned live.device~ Sources

`live_device.h/.hpp/.cpp` now provide ordinary Ultra document ownership for the
first profile, `live12-analog-v1`. Each source owns an independent native instance
and its complete 203-parameter commanded state. Native profile facts live in
`profiles/analog.hpp`; `device_profiles.hpp` is the coordinator-owned admission
registry. The bank has bounded storage for up to 256 parameters per source and
iterates each qualified profile's descriptor count. Only Analog is registered;
Electric's lower-level loader acceptance does not admit an Electric object.

The C API keeps source state separate from the existing POD graph ABI:

- `ultra_canvas_install_live_devices_document` requires a stopped, callback-fenced
  driver. It prepares and validates every source before replacing the document,
  binds the graph callbacks, and then transfers ownership. A plain graph install
  cannot omit state for a native source.
- `ultra_canvas_live_devices_set_states_document` validates an entire batch of
  complete source updates before publishing one document epoch. The render owner
  applies a coherent snapshot before that callback's notes. Compound controls and
  simultaneous source updates cannot expose half-published command batches.
- `ultra_canvas_live_device_parameters_document` reports immutable descriptors
  and coherent requested/applied command cells and versions. It is not DSP state
  readback. Graph revision and source node identity reject stale access.
- `ultra_canvas_live_devices_rearm_document` reconstructs fresh instances from
  commanded state while stopped. Native audio startup also reconstructs owned
  sources before callbacks begin. This avoids relying on `ResetA` to clear tails.
- `ultra_canvas_close_document` requires a fenced driver when it owns native
  sources and destroys only that document's sources. Ordinary source-free
  document close retains its existing queued path.

The APIs have explicit unsupported stubs in default builds. Ordinary Alive
instrument admission remains separate. The bank does not qualify native realtime
allocation/locking, sample partitioning, expressive MIDI, transport or exact
render equivalence merely by owning the instances.

The deterministic bank test supplies its own tiny adapter double; it checks
independent instances, rejected whole-state transactions, concurrent coherent
multi-source updates, clean recreation and destruction without installed assets.
The backend test takes an explicit local Analog DLL and exercises the actual
native document API, including note audio, live state edits, Stop/rearm and
independent document close:

```sh
cmake -S apps/ultra -B /tmp/ultra-live-device-build \
  -DULTRA_EXTERNAL_DEVICE_EXPERIMENTAL=ON -DCMAKE_BUILD_TYPE=Release
cmake --build /tmp/ultra-live-device-build \
  --target ultra-live-device-bank-test ultra-live-device-backend-test -j 4
/tmp/ultra-live-device-build/ultra-live-device-bank-test
/tmp/ultra-live-device-build/ultra-live-device-backend-test /absolute/path/Analog_64.dll
```

With the option OFF, `ultra-live-device-disabled-test` verifies that the normal
library exports diagnostic stubs and rejects external-source graphs. Use a fresh
build directory for experiments; never replace a library mapped by a running app.
