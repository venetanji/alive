# Live Device Reference, 2026-10-24

Live 12.4.6 (`2026-09-10_0de5c8fa9a`, Windows x64) ran through the installed
Wine 11.13 build on a disposable reflink prefix and private Xvfb display `:162`.
This investigation supplies architecture and UI reference for Alive's two-track
Ultra host. It does not recover or reproduce Ableton DSP.

## Findings And Evidence

| Question | Evidence | Finding and boundary |
| --- | --- | --- |
| Session/device relationship | `LOCAL-R1`: `05-analog-device.png`, `07-simpler-device.png`, `09-sampler-device.png` | A common transport and track mixer remain above a selected-track device view. Loading Analog on track 1 and Simpler, then Sampler, on track 2 changes that track's instrument and displayed name. This is observed UI behavior, not a complete model of Live's host engine. |
| Analog structure | `LOCAL-R1`: `05-analog-device.png` | Two visible oscillator/filter/amplifier lanes surround a context detail area; noise, LFO, routing, global and voice controls remain in the device. The host supplies the track mixer and common device header. No oscillator, filter or voice algorithm was reconstructed. |
| Sample instrument scope | `LOCAL-R1`: `07-simpler-device.png`, `09-sampler-device.png`, `11-sampler-zones.png` | Simpler presents Classic, 1-Shot and Slice modes with sample start/length/loop controls. Sampler exposes Sample, Pitch/Osc, Filter/Global, Modulation and MIDI pages plus an expanded Zone editor with Key/Vel/Sel tabs. Empty sample instruments were inspected; sample playback, mapping semantics and warping were not executed. |
| Basic effects | `LOCAL-R1`: `13-utility-device.png`, `15-filter-device.png`, `17-delay-device.png` | Utility follows Analog in the chain and has separate input mode, width/mono, gain, balance, mute and DC controls. Auto Filter follows Utility with cutoff/resonance, filter response, modulation and dry/wet. Delay follows Auto Filter with linked stereo time/sync controls, feedback, filter, smoothing and dry/wet. This establishes UI organization and chain insertion; signal routing and sound were not measured. |
| View lifetime | `LOCAL-R1`: `19-detail-hidden.png`, `21-detail-restored-end.png` | Delay dry/wet was edited from 50% to 25%; Ctrl+Alt+L hid the device detail view, then restored it. The chain remained represented in the overview and Delay still displayed 25%. UI state outlives panel visibility. Audio continuity and native object destruction were not measured. |
| Per-track instance state | `LOCAL-R1`: `25-second-track-75.png`, `26-first-track-still-25.png` | A newly loaded Delay after Sampler on track 2 was edited to 75%. Returning to track 1 showed its Delay still at 25%. These parameter edits are independent at the UI/model boundary. Voice, buffer and DSP isolation are untested. |
| Serialized state boundaries | `LOCAL-S1`: `artifact-inventory.json` | Default `.adv` files are gzip XML. Device class tags are `UltraAnalog`, `OriginalSimpler`, `MultiSampler`, `Delay`, and `AutoFilter2`. Common fields include `On`, `IsExpanded`, `IsFolded`, `UserName`, and view data. Parameter containers commonly contain `Manual`, `AutomationTarget`, `ModulationTarget` and `MidiControllerRange`. These are file-shape observations; automation ownership and runtime arbitration cannot be deduced from them. |
| Native module lifecycle surface | `LOCAL-S2`: `analog-export-inventory.json`; `LOCAL-R2`: `runtime-mappings.json` | `Analog_64.dll` exports `CreateInstanceU`, `DestroyInstanceU`, `SetSampleRateU`, `ResetA`, `SetParameterA`, `CalcA`, and `GetPlugInfoU`. The library was mapped in the Live process during observation. Separate lifecycle and processing operations are a reasonable inference from names; signatures, call order, synchronization and realtime safety remain unknown. |

`LOCAL-R1` denotes the retained screenshots and the bounded interaction record in
`actions.jsonl`. Action receipts began at the Sampler acquisition; earlier
Analog/Simpler acquisition is documented in the reproduction steps rather than
claimed as a complete machine action log. Transient search/startup captures were
discarded; a receipt may name a deliberately discarded frame. Retained files and
their digests are listed in `evidence-manifest.json`.

REA PE-resource evidence is retained inline in `rea-analog-pe.json`, Evidence ID
`ev_0256d1a36685c81f0508e046ea29c2b17f95a8d6a0d4ec46fcdfcd797af498e5`.
It identifies the 816,640-byte PE32+ Analog library with SHA-256
`4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133` and reports no
PE resource entries. This does not imply the library has no UI-related code.

The XML state-container counts are 172 for Analog, 109 for Simpler, 81 for
Sampler, 31 for Delay, and 45 for Auto Filter. They count serialized elements
having an immediate `AutomationTarget` child in these installed defaults, not a
complete public parameter API. The defaults identify their creator as Live
12.4d1; they must not be mistaken for newly saved 12.4.6 session snapshots.
The XML inventory retains only state field names, paths, counts and identities,
without serialized parameter values or factory preset content. Screenshots show
the controls' visible values. No sample media or implementation code is included.

## Lessons For Alive

1. Keep session transport, clip scheduling, track mixer and device instance state
   under host ownership. Expose the selected device's bound parameters in a
   compact panel and let the Ultra editor be an optional view of that instance.
   The observed hierarchy supports this design; it does not prescribe process
   boundaries or a second audio clock.
2. Give each loaded instance its own parameter state and identity, including
   when two instances refer to the same device source. Track gain and the
   instrument's internal level control must remain separate. The two Delay
   values provide a small direct reference case for instance independence.
3. Keep saved parameter bases, automation metadata and presentation state as
   explicit concepts. The file shapes support separating them; Alive's chosen
   base/effective arbitration remains its own contract until a dedicated Live
   automation experiment establishes comparable behavior.
4. Prepare, configure, reset, process and destroy devices through an explicit
   lifecycle. The export names support this decomposition as an architectural
   reference. Alive still needs its own callback ownership, allocation and
   event-generation tests; no Live artifact observation substitutes for them.
5. Keep sample asset handling and advanced mapping outside the first small
   instrument-host milestone. Sampler's zone editor is a substantial optional
   editing surface. A future sample device should own asset handles, regions,
   loop settings and mappings without conflating them with track or voice IDs.
6. Effects need their own units, domains and semantic modes: Utility gain in dB,
   filter cutoff in Hz and delay timing in synchronized divisions or free time.
   Do not infer DSP equations, smoothing rules or reset/tail behavior from
   these controls. Alive's stop/seek hard-clear policy is a local design choice.

## Reproduction

Read `runtime.py` first. It intentionally names this machine's existing
disposable source prefix and installed Wine. It refuses existing work/capture
paths. It never runs against the original prefix.

```sh
python3 experiments/alive-live-reference-20261024/inventory.py
python3 experiments/alive-live-reference-20261024/runtime.py launch
# Use a second shell while the owned runner is alive:
python3 experiments/alive-live-reference-20261024/runtime.py capture new-frame.png
python3 experiments/alive-live-reference-20261024/runtime.py key Control_L+f
python3 experiments/alive-live-reference-20261024/runtime.py text Analog
```

The runtime steps were:

1. Reflink the existing disposable source prefix. Its copied profile contains
   no home-folder symlinks. Start Xvfb at 1440x1000 with `-fakescreenfps 60`,
   software rendering, the copied prefix, and the installed Wine binary.
2. Decline the stale recovery prompt in the copy and close its crash-report
   side pane. No report was submitted. Search for Analog and load the plain
   device, then select MIDI track 2 and repeat for Simpler and Sampler.
3. Inspect Sampler's Filter/Global page and toggle Zone. Return to track 1;
   search and load plain Utility, Auto Filter, and Delay after Analog.
4. Double-click the Delay dry/wet numeric value, enter 25, and press Return.
   Hide and show Detail using Ctrl+Alt+L. Use the bottom device overview to
   scroll to the chain end and verify 25 remains.
5. Select track 2, load a separate plain Delay after Sampler, enter 75, and
   return to track 1 to verify its value remains 25.
6. Signal the owned Python runner with SIGTERM. Its finally block terminates
   only processes whose `WINEPREFIX` matches the owned copy, stops its Xvfb,
   compares original/source preference hashes and removes the marked copy.

The complete Wine launch command and process environment overrides are in
`runtime.py`; they are process-local. No system environment or desktop settings
were changed. XTest control validates the addressed Xvfb process before opening
its display, and clipboard shortcuts operate only on that private display.
An exploratory copy/paste attempt did not insert a second Delay; the independent
instance check instead loaded the second device from the browser. No conclusion
depends on that unsuccessful attempt.

## Coverage And Limits

| Checklist | Status |
| --- | --- |
| Actual Live session layout and selected device host | Answered for this UI session. |
| Analog UI and small native module lifecycle surface | Answered at UI/static export level; internal architecture partial. |
| Simpler and Sampler basic UI and serialized state shapes | Answered for empty instruments; playback, zones and resampling unresolved. |
| Gain/filter/delay effect UI and insertion | Answered at UI level; DSP and routing behavior unresolved. |
| Pane visibility state retention and per-track parameter independence | Answered for the explicit 25%/75% cases. |
| Audio scheduling, callback ownership, voice processing, latency and tails | Unresolved; no audio or MIDI measurement. |
| Automation arbitration, persistence round trip and editor/DSP continuity | Unresolved; no saved Live set, automation execution or render capture. |

REA's session reported no configured native decompiler: Ghidra was unavailable
and its detected Java runtime did not meet that provider's requirements. No
provider installation, environment repair or alternative code extraction was
attempted. The Live executable also exceeds REA's 64 MiB PE-resource parser
limit, so that attempted inventory returned `resource_constraint`. The smaller
Analog DLL was supported. GNU `objdump -p` supplied the separate static export
inventory. No disassembler/native session was opened and none remained to close.

The first `-displayfd` attempt chose the inherited display number and the runner
assertion stopped before launching Wine. The successful attempt used checked,
explicit display `:162`. The copied Live settings carried a stale recovery flag
and enabled automatic updating. The UI reported an update downloaded for the
next launch inside the disposable copy; that copy was deleted without another
Live launch. No preference or authorization setting was changed to facilitate
this investigation. The already installed application was used as available.

`cleanup.json` confirms original Ableton preference inventory (29 files) and
the disposable source inventory (49 files) retained their before/after digests,
the owned prefix had no remaining processes, Xvfb exited, and the copy was
removed. This preference check covers the Ableton roaming tree, not every file
on the machine. Original executable/preset identities are independently checked
by `verify.py`. No original project was opened or modified, no authentication
occurred, and no original authorization state is printed or included here.
