# Native Live devices and shared Ultra controls

The practical route is to run the installed device DSP instructions through an
original Linux adapter, then read the installed editor layout into Ultra's own controls.
Analog now renders through the current Ultra `CanvasRuntime` without Wine.
The [ordinary live.device~ object followup](live-device-object.md) adds a saved,
multi-instance Analog object and embeds the installed editor in normal Ultra.
Alive instrument admission remains pending. The earlier dedicated keyboard
window is retained as a historical engine experiment.

The later [installed-device catalog](device-catalog.md) expands discovery beyond
these seven DLLs to the bundled Max device/DSP externals, serialized models and
composite presets. Its [Alive hosting proposal](alive-device-hosting.md) records
the saved-presentation, typed I/O, rack and lifecycle work still needed.

The current [generalization audit](generalization-audit.md) separates reusable
infrastructure, Analog's exact remaining coverage, and the qualification path for
the other devices. [Analog values](analog-values.md) records the later physical
display, partial installed-default import and F1/F2 routing work. Measurements
below describe their named experiments; earlier graph initialization and test
counts are not a current editor coverage report.

Work is isolated from the other session at base
`4dfc7be75923d90fd2cdee9a3474a7258d912d68`. Ordinary builds do not enable the
adapter and still reject the experimental graph kinds. An OFF-by-default CMake
option and a separate Cargo feature enable the dedicated desktop experiment.
No proprietary DLL, decompiled implementation, factory preset, font or artwork
is included. Tests take explicit paths to the user's installed resources.

## What is viable

These are x86-64 Windows PE libraries with a small custom seven-export API, not
VST plugins. Linux can execute their CPU instructions directly on x86-64 once
the image, relocations, imports and Microsoft calling convention are handled.
The new adapter supplies those boundaries; it does not reconstruct C++ source
or make a portable source build. ARM, macOS and other architectures remain
unqualified. Wine is absent from the tested process mappings.

This differs from a game source decompilation or static recompilation project.
It offers a much shorter path to testing these particular DSP libraries, while
retaining a dependency on exact installed binaries. Reconstructing portable
source would be a separate and substantially larger project. These results do
not establish the viability of porting the whole Live application, whose GUI,
application state and operating-system services are outside this investigation.

The original inventory below covers the seven standalone device DLLs in the installed
`Resources/Devices/Pc` directory. It does not cover every device in Live's
catalog or DSP embedded in its executable.

## Device evidence

| Device | Observed result | Retained C++ adapter | Current Ultra graph |
| --- | --- | --- | --- |
| Analog | 203 descriptors; finite note audio and exact no-note silence at 1 and 256 frames | Exact hash accepted | Real DSP through multipliers and DAC; note events, parameter callback and Stop checked |
| Electric | 33 descriptors; finite note audio and exact no-note silence at 1 and 256 frames | Exact hash accepted | Earlier separate experiment; not repeated in the current graph harness |
| Collision | Private probe: 139 initialized descriptors and finite note audio | Not accepted | Not tested |
| Tension | Private probe: 130 descriptors, 129 initialized, and finite note audio | Not accepted | Not tested |
| Corpus | Private probe: constructs, renders finite stereo input and destroys | Not accepted | Not tested |
| Amp | Private probe faults during construction at RVA `0x5d53c`, address `0x10` | Not accepted | Not tested |
| Cabinet | Private probe faults during construction at RVA `0x7081c`, address `0x10` | Not accepted | Not tested |

Collision, Tension and Corpus results use the older throwaway Python/C adapter,
not the retained runtime. They are feasibility evidence, not supported devices.
Those probes used `LC_ALL=C`. Small nonzero no-input residuals were observed for
Collision and Corpus; they are not described as exactly silent. Amp and Cabinet
also import USER32/COMDLG32 services. The cause of their constructor faults has
not been established; those faults do not prove either device is impossible.

The actual Analog graph uses research kinds 68 (instrument) and 69 (parameter
proxy), enabled only with `ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL`. It calls the
device for each sample, routes both outputs through built-in multipliers, and
collects DAC output for 48,128 frames. It verifies:

- No note gives exactly zero energy.
- A note with graph gain zero gives exactly zero energy.
- A note with gain 0.5 gives finite nonzero audio.
- A scheduled write to descriptor 29 reaches the adapter and audio stays finite.
- Note-on/off delivery, Stop silence and unbinding complete successfully.

This early graph test initializes midpoint continuous values, integer enum values
and enabled booleans. This is authored test state, not a factory preset. It does not establish
pitch accuracy, note-off/release behavior, an audible response to the parameter
write, preset fidelity or realtime capacity. Different constructions have
different RNG state; the 1-frame and 256-frame runs are not partition-equivalence
tests. Native RNG behavior is not certified against the Windows CRT.

## One default control family

`apps/ultra/ui/live-controls.mjs` and `live-controls.css` now provide original
dials, sliders, editable numbers, toggles, menus, buttons and compact panels.
They follow the retained Live reference: charcoal surfaces, cyan arcs and value
accents, neutral readouts, orange section switches and compact spacing.
There is one shared family for Ultra and Alive, without a second Max-style skin.

The first integrations are Ultra Perform and Alive's selected-device parameter
view. They retain existing input identity, numeric drafts, gesture/history
ownership and the separation between editable base values and automation's
effective values. Relative dragging, Shift fine adjustment, keyboard controls,
explicit-default reset, disabled states, interrupted gestures and invalid numeric
entry are covered. Existing canvas object faces are not migrated by this slice.

Use `apps/ultra/ui/controls-gallery.html` for the component gallery and
`apps/ultra/ui/live-controls.md` for the API and interaction contract. This is the
default API for new device controls. The later installed-resource renderer builds
Analog's panel from those controls, with 126 of 175 control instances mapped;
the remaining controls and drawings are listed in the generalization audit.

## Original editor and state

The retained Analog screenshot is
`experiments/alive-live-reference-20261024/05-analog-device.png`. It establishes
the two oscillator/filter/amplifier lanes, noise section, central selected detail
view and LFO strip. Original code and assets are not needed to draw those controls
in Ultra.

All seven DLLs have zero PE resource-directory entries and the same seven DSP
exports, with no exported editor factory. This bounds what can be reused from
those DLLs; it does not prove they contain no UI-related code. The installed
`GUI.alp` and `Graphics.alp` have now been decoded: the original Analog layout is
`Devices/UltraAnalog/Contents.xml` in GUI, with artwork in Graphics. An original
bounded reader and shared-control renderer load the original panel in the
existing test window. The subsequent [live-control qualification](live-controls.md)
connects 124 admitted parameter identities to that panel using native
block-boundary mailboxes. The new
[`ui-resources.md`](ui-resources.md) followup records the evidence and limitations.

Analog's 58 installed `.adv` factory presets are gzip XML with an `UltraAnalog`
schema. The observed 172 Manual fields include host settings such as MPE and do
not directly match the 203 DSP descriptor slots. Module/property names and ranges
are useful mapping evidence, but not sufficient to assign every DSP index its
display name, units, curve, enum meaning and persistence policy. The later
installed-default importer supports 126 logical properties encoded into 128 of
203 native slots. Full preset compatibility and complete state reconstruction
are not implemented; see [analog-values.md](analog-values.md).

## Why saved Alive hosting is still pending

The later [object followup](live-device-object.md) implements the versioned state,
ordinary authoring and document-owned lifecycle work described in items 1 and 2
below. The list records the earlier gap analysis; remaining editor coverage,
realtime qualification and Alive admission still apply.

Alive already hosts saved Ultra graphs as independent roots and can open their
Ultra editors. That is the intended architecture for these devices too. The
remaining work is specific:

1. Add a versioned device-state contract carrying adapter identity, installed
   resource hash and complete source state, with bounded live bindings. The
   current six numeric node fields and at most sixteen host bindings cannot
   represent all of Analog's state.
2. Complete the remaining parameter map, display conversions, custom drawings
   and preset conversion in the installed-panel renderer. Persist every accepted
   edit and test save/reopen; keep unresolved controls disabled.
3. Qualify lifecycle, sustain, reset, independent instances, sample partitioning,
   and realtime allocation/locking/capacity before admitting this graph family.
4. Extend the native Alive validators and note ingress deliberately. Current
   instrument admission requires `PolyNote` and measured graph families; the
   experimental source is not an admitted instrument. A dummy `PolyNote` does
   not constitute correct hosting.

`ResetA` is not a proven hard clear: the private Analog probe observed buffered
audio after reset. The borrowed callback bridge therefore disarms unqualified
instances on Stop/reset/panic until an explicit off-thread rebind. The adapter's
parameter getter is only a cache of successful writes, not native state readback.

The retained loader is in-process research code. Unsupported imports return an
adapter error through a C guard and the instance is discarded; raw device faults
and heap corruption are not contained. DLL startup, TLS callbacks and Windows
unwind registration are skipped. There are no global signal handlers. These
limits are documented in the adapter README and are why ordinary app builds do
not enable it.

## Dedicated keyboard window followup

The `ultra-analog-test` executable uses Ultra's existing audio driver and the
experimental graph bridge. It adds a 25-key piano, computer-key note input,
velocity, output gain, a meter, note release and a hard Stop that quiesces the
driver before destroying the instance. The later original-panel and live-control
followups connect oscillator, filter, amplifier, envelope and LFO parameters in
this same host; see [live-controls.md](live-controls.md) for measured coverage and
remaining conversion/drawing limits. The separate output-level dial controls the
graph's multipliers.

The isolated native build was necessary to include the PE adapter and audio
bridge, which the installed Ultra did not contain. This test executable is not
the intended device format. The product path is one reusable native-device object
plus an ordinary Ultra patch for the editor/keyboard, with the full device state
contract described above. Adding a device editor should not require a separate
Ultra executable for that device. The installed Ultra has not been replaced.

From a development checkout with Ultra's existing native/Cargo dependencies:

```sh
apps/ultra/launch-analog-test.sh /absolute/path/Analog_64.dll
```

This builds the native library in `apps/ultra/build-analog-test` with
`ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL=ON` and the dedicated Cargo binary with
`native-analog-test`. The launcher selects that native library through
`LD_LIBRARY_PATH`. Stop audio before closing or restarting the test.

Verification of this followup: the native keyboard bridge test passes note audio,
gain mute, bounded queue overflow silence and close. Three browser tests pass
pointer/computer note pairs, focus-loss release, Escape Stop, startup failure and
desktop/narrow layout. The native window was opened and its real audio driver
advanced the render counter; its process mapped the experimental library and no
Wine libraries. Native held-key automation was not established, so the browser
tests and native render evidence remain separate. None of these checks qualify
the full Analog editor, presets, saved patch hosting or realtime safety.

## Reproduce and inspect

From the isolated checkout, with GCC/G++ on Linux x86-64 and local device files:

```sh
python3 -B apps/ultra/tests/external_device_run.py \
  /absolute/path/Analog_64.dll /absolute/path/Electric_64.dll

c++ -std=c++17 -O2 -Wall -Wextra -Werror \
  -DULTRA_EXTERNAL_DEVICE_EXPERIMENTAL \
  apps/ultra/tests/canvas_external_test.cpp -o /tmp/ultra-external-graph-test
/tmp/ultra-external-graph-test

c++ -std=c++17 -O2 -Wall -Wextra -Werror \
  apps/ultra/tests/canvas_external_test.cpp -o /tmp/ultra-external-default-test
/tmp/ultra-external-default-test

node --test apps/ultra/ui/*.test.mjs
```

The native runner uses a temporary build directory and rehashes the DLLs after
execution. It includes disabled-build, SHA-256, malformed-PE, unsupported-import,
locale preservation and allocation-bookkeeping checks. A review found a
`realloc` bookkeeping lifetime error; it was fixed, regression-tested and
independently reviewed. The runner compiles the shim with
`-Werror=use-after-free -Wuse-after-free=3` to retain that check.

The browser suite is `apps/ultra/tests/ci`'s `test:browser` script. Final UI
verification recorded 605 passing Node tests and 77 passing browser tests.
An independent review opened desktop/narrow gallery, Perform and Alive captures
and found no material visual or interaction issues. Browser tests do not qualify
native DSP, audio hardware or desktop persistence.

`results.json` records artifact identities, private probe measurements and the
verification boundaries. Private runtime logs, analysis bundles and screenshots
are retained under `~/.cache/alive-ultra-evidence/analog-native-20261031/`.
The earlier Electric-only packet at
`experiments/live-native-feasibility-20261031/` belongs to an older engine snapshot;
its kind 60 must not be transplanted into this branch, where 60 is `PolyNote`.

## Evidence index

These REA records are static observations; the standalone and graph harness logs
provide execution evidence. Complete decompilation records stay in the private
cache, outside the repository.

| Question | Record or source | Status |
| --- | --- | --- |
| Analog constructor boundary | `ev_60fb43c946b8208b953c9871c8607bc54e9d7c0fa906e7ded6ac0124358703fd` | Inspected |
| Analog parameter export | `ev_185a4ae6afa9f3468eba71cbe5e50aa0c6d4471ea89fa3fa87af814a8e37103d` | Inspected; complete UI mapping pending |
| Corpus constructor | `ev_59d792c98c8e0f1681c64458def998e7ea82352ad923099dff891bd3e257215c` | Inspected |
| Corpus processing export | `ev_70d5b691bbd595d99bed7368030ab409710bdbdb31f74226055772d77656d27d` | Inspected |
| Corpus processing core | `ev_6d87bdce8f2add6bad6c1e3763c4166b9e1ffe9678697caba1f02def7454de94` | Stereo-buffer interpretation corroborated by private input probe |
| Relative slider behavior | `https://docs.cycling74.com/reference/live.slider` via Context7 | Reference used; no Max compatibility layer added |
| Complete Live application | Outside seven-DLL inventory | Unresolved; no whole-app feasibility claim |

REA native sessions were exported and closed after analysis.
