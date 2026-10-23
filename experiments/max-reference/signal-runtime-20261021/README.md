# Original Max Signal Reference, 2026-10-21

This frozen batch contains three original authored fixtures executed in the
installed Max 9.1.5 Windows x64 under pinned Wine 11.13. It retains 1,604 ordered
message rows, 309 stimuli, and 14 frame-indexed sample files totaling 5,504
frames. Installed XML and help were inspected separately; their signatures and
hashes are in `source-inventory.json`. No installed documentation or help patch
bodies, scripts, media, binaries, credentials, or private daemon state are
redistributed here.

`results/*.jsonl` is raw executed-Max evidence. `analysis.json` is derived from
those files. `environment.json` records executable hashes, driver/settings,
isolation and each run. `manifest.json` hashes the retained artifacts. Source
inspection is not evidence that a behavior was executed, and neither kind of
evidence alone is a claim that Alive implements it.

This batch inspects all 14 requested reference/help pairs, not the entire
installed help corpus. Full-help conformance remains **0/2103**; passing the
bounded deterministic replay does not increment that count.

## Capture Conditions

All runs used standalone Max with NonRealTime driver index 4, sample rate
48,000 Hz, signal vector 64, I/O vector 512, Overdrive off, and Scheduler in
Audio Interrupt off. Raw `adstatus` menus and final outputs establish these
settings. `dac~` only instantiates the DSP graph; NonRealTime does not send
audio to hardware. Each run used a fresh Max process, a disposable reflink
clone of an already disposable Wine prefix, a private Xvfb server, and software
rendering. The original prefix and desktop were not launched or modified.

Samples are values read through JS from `buffer~` **float32 storage**. They do
not retain Max's internal DSP precision. Frame indices describe each recorded
buffer, not a global DSP clock. A one-shot buffer fills before DSP is stopped
by a wall-timed task, so the number of later processed frames is unknown. The
precision fixture also records a looping 64-frame stereo buffer, retaining the
last completed vector after DSP stops. That buffer establishes snapshot
offsets and restart continuity without inferring elapsed frames from wall time.

Message sequence numbers establish collector arrival order. `wall_ms` is not a
sample timestamp. `input_id` associates a synchronous result with the current
stimulus, but an automatic callback can still carry the most recently fired
stimulus ID. NaN and infinities, if encountered, are encoded as explicit
strings; they are not conflated with JSON null.

## Measured Arithmetic

The arithmetic fixture records 24 channels for six stages: each of `+~`, `-~`,
`*~`, `/~` has no signal cable, left only, right only, both, summed cables on
both, and left-only with creation argument 10. Signals are L=6 and R=2, with
additional cables 3 and 1 in the summed cases. It then sends scalars to every
operator: left 3, right 5, left 7, right 4, right 0. Every frame of a given
channel and stage is constant.

For each operator, one shared scalar C is updated by numeric input at either
inlet. With only the left signal connected the result is `L op C`; with only
the right signal it is `C op R`; with both connected it is `L op R`. With no
signals connected it is `0 op C`. A numeric message on the left does not create
an independent left constant. When both signal inputs are connected, numeric
messages have no visible effect on output. Multiple signal cables sum per
inlet: L=9 and R=3 produce 12, 6, 27 and 3 respectively.

All four fresh operators have effective C=0 in this installation. `/~` with
zero divisor emits zero. This contradicts the installed `/~` reference's
documented default divisor 1. Creation argument 10 initially gives 16, -4, 60
and approximately 0.6 with L=6; later scalar messages overwrite it. For example,
after left 3, the six outputs in topology order are:

| Operator | None | Left | Right | Both | Summed | Creation 10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `+~` | 3 | 9 | 5 | 8 | 12 | 9 |
| `-~` | -3 | 3 | 1 | 4 | 6 | 3 |
| `*~` | 0 | 18 | 6 | 12 | 27 | 18 |
| `/~` | 0 | 2 | 1.5 | 3 | 3 | 2 |

All six stages and exact retained values are in `analysis.json` under
`arithmetic`.

## Measured Sources And Modifiers

- `sig~` with no argument emits 0. `sig~ 0.25 -0.5 2` emits three constant
  signals. `list 0.75 0.5 -2.` followed by `set 1 0.125` gives 0.75, 0.125, -2;
  the tested `set` index is zero based.
- `cycle~ 1000` begins at 1 and follows cosine. A right scalar 0.25 adds a
  quarter-cycle phase offset. `cycle~` with no arguments emits 1 in the tested
  initial vector. `cycle~ 0` with right signal 0.25 emits cosine of a quarter
  cycle. `reset 0.25` before DSP start gives the same quarter-cycle start.
- `phasor~ 1000` begins at 0 and advances by 1/48 per sample. Negative 1000 Hz
  begins at 0 then 47/48, 46/48 and so on. Float32 storage can round a value just
  below the upper wrap boundary to 1. A right scalar 0.25 sets the next phase to
  0.25 in the tested stopped-DSP update.
- `clip~ -1 1` clips the tested values -2, -1, -0.5, 0, 0.5, 1, 2 as expected.
  The no-argument object maps input 2 to 0. Reversed `clip~ 1 -1` maps inputs
  -2, 0, 2 to 1, 1, -1. This establishes lower-bound testing before upper-bound
  testing for these inputs; it does not normalize or swap the bounds. Reversed
  endpoints themselves were not tested. `clip~ -1 1 @mode 1` gives 0 for both
  input 1.5 and 2; other mode-1 behavior is unmeasured.
- Default `noise~` and `noise~ @classic 1` produced distinct, bounded retained
  streams. Sending `seed 1` to two separate default nodes did not make their
  first 16 samples agree; sending it again before a later DSP start did not
  reproduce either first sequence. No deterministic seed, algorithm or sample
  equivalence is established. `noise~` has no documented seed method in the
  inspected reference. The error tap retained no rows, which does not establish
  that an undocumented message was accepted or implemented.
- `line~ 0.` with `1. 10` before DSP start emits `min(n/480, 1)`: first sample
  0, endpoint at sample 480, then 1. Its completion outlet emits bang. Collector
  timing does not identify the sample on which that bang was dispatched.

Maximum absolute differences from analytical cosine are
`3.524771463592202e-08` for both tested phase starts, and
`2.781550090258378e-08` for the line ramp. These include float32 buffer rounding.

## DSP Restart And Snapshot

`precision` retains the first vector and the last vector of three DSP runs:
initial, restarted without oscillator resets, and explicit reset. The last
phasor sample of the initial run is 0.6458333134651184; the next run starts at
0.6666666865348816, establishing continuous phase across the DSP off/on
transition. In contrast, `cycle~ 1000` starts the restarted run at 1 and follows
the phase-zero cosine again. Explicit phasor right 0.25 and `cycle~ reset 0.25`
start at 0.25 and approximately zero respectively. These observations concern
the tested default phase-offset configuration and should not be generalized to
all phase attributes or transport modes.

Before any DSP has run, snapshot bangs return float 0. After DSP stops,
`snapshot~` retains the latest completed vector. Offsets 0, 1 and 63 select
those exact samples, within float32 rounding of the independently retained
buffer. The first stopped vector gives:

| Offset | Snapshot Float | Retained Buffer Float32 |
| ---: | ---: | ---: |
| 0 | 0.33333333333404275 | 0.3333333432674408 |
| 1 | 0.35416666666737606 | 0.3541666567325592 |
| 63 | 0.6458333333340436 | 0.6458333134651184 |

Changing the three snapshot offsets to 63, 0 and 1 is also observed. Their
post-stop values select the new offsets in the last vector, rather than the
offset used previously. The full latest vector is needed to preserve that
behavior. All nine comparisons are in `precision_checks` in `analysis.json`.

Periodic reporting was observed after `start`, with an initial 10 ms interval
and a later right-inlet change to 5 ms. The collector counted 22, 31 and 70
automatic deliveries in the three stages; it keeps at most the first 32
values per stage and records total counts. These counts are **not cadence
measurements**: NRT processing duration varies, automatic reporting starts
before DSP, and messages carry no sample timestamps. The 1 kHz ramp repeats a
whole number of cycles at both tested intervals, further limiting inference.
Exact interval rounding, offset interaction with periodic delivery,
`sampleinterval`, high-priority scheduling and Scheduler in Audio Interrupt
remain unmeasured.

## Installed Contract Inventory

The following is a paraphrase of installed reference/help inspection, except
where a measured result is explicitly mentioned. Paths below are relative to
the resource root in `source-inventory.json`; XML is under
`docs/refpages/msp-ref/` and help under `help/msp/`. The inventory contains
precise XML line anchors, JSON box anchors, file hashes and port signatures.
It preserves source placeholders and mistakes as source metadata.

| Object | Ports And Creation | Controls And Initialization |
| --- | --- | --- |
| `sig~` | One message/order inlet; one signal output per initial value, one by default. Numeric initial values. | Number changes output; list updates outputs; `set index value`; incoming signal imposes ordering rather than signal conversion. Measured default 0. |
| `+~`, `-~`, `*~`, `/~` | Two mixed signal/number inlets; one signal output. One optional numeric scalar. XML aliases `plus~`, `minus~`, `times~`, `div~`. | Number and signal methods. Defaults 0 for first three; `/~` documentation says 1, observed 0. Runtime scalar topology measured above. |
| `cycle~` | Two mixed inlets, one signal output. Frequency, optional buffer symbol, optional sample offset. A second numeric positional value is not a documented phase argument. | Frequency/phase input, `reset`, `set` and `setall`; `frequency` and `phase` attributes. Default cosine and phase behavior measured above; external buffers unmeasured. |
| `phasor~` | Two inlets, one signal output. Left frequency or time value; right numeric phase. Optional initial frequency/time argument. | `reset`, `phaseoffset`, `syncupdate`, transport-related controls. Right **signal** is a nonzero reset trigger to the phase offset, not a continuous phase input; this is documented, not captured here. Frequency attribute metadata says `0 ms`; no-argument frequency unmeasured. |
| `noise~` | One ignored/order inlet, one signal output; no documented positional argument. | `classic` attribute. XML contains an inlet-type placeholder. Exact startup/seed/algorithm unresolved. |
| `clip~` | Three signal/control inlets, one signal output. Minimum and maximum numeric arguments, both documented default 0. | Middle/right numbers or signals set lower/upper limits; `mode` attribute. A prose typo repeats middle inlet for maximum; signal methods and help establish the right inlet. |
| `dac~` | N signal inputs, no output. Default channels 1,2; integer channel arguments 1..1024 determine N. Initial symbol can choose a named mixer. | Numeric/global start/stop; `start`, `stop`, `startwindow`, routing list/`set`, audio-status `open`/`wclose`. Window-only start is scoped to the patch hierarchy. Routing and control behavior were not captured. |
| `ezdac~` | Two signal/control inputs, no output. UI button; positional XML argument is an unusable template placeholder. | Same DSP/routing/status family; click toggles DSP. `local 1` makes click use window-local start; attribute default local 0. Not runtime captured. |
| `gain~` | Left signal/raw-control inlet; optional interpolation-time inlet with `interpinlet 1`. First output signal, second raw control. No useful documented positional argument. | Bang outputs raw control; float truncates to integer; `set` suppresses control output while still ramping gain. Raw 0 mute, 128 unity, values above 128 headroom; initial raw value unestablished. `interp` metadata 10 ms, `interpinlet` 0, `size` 158. Not runtime captured. |
| `line~` | Two inlets; normally signal plus completion bang. Initial-value argument only, default 0. `activeout 1` adds an activity signal and shifts completion to outlet 2. | Right duration applies to the next scalar, left target/time pairs replace pending segments; pause/resume/stop differ. `activeout` and `maxpoints` are creation-only; maxpoints default 129 in help. No documented `set` selector. Only one ramp captured here. |
| `snapshot~` | Signal/bang/control input, right interval input, one float output. One reporting-interval argument, default 0; no second positional offset. | Bang reads vector at offset; `active`, `interval`, `offset`, `start`, `stop`, `sampleinterval`; offset range 0..vector-size-1. Left numeric enables/stops reporting, right numeric changes interval. Attribute/control selectors are specific; arbitrary selectors are not automatically controls. Only bang, tested offsets and reporting observations above are captured. |

Useful reference anchors include: `sig~.maxref.xml` lines 49/82/93/105;
arithmetic aliases lines 54/65/79/93; `cycle~.maxref.xml` lines
60/68/76/87/107/118/141/313/324; `phasor~.maxref.xml` lines
57/68/77/91/123/132/147/193/204; `clip~.maxref.xml` lines
65/73/84/95/106/124; `dac~.maxref.xml` lines
47/61/72/100/114/123/132/141; `ezdac~.maxref.xml` lines
62/73/92/112/126/138/147/156; `gain~.maxref.xml` lines
71/80/91/127/146/244/259/447/462/528.

Known static conflicts are retained explicitly:

- `line~` XML labels completion output signal; installed help identifies bang,
  and the capture observes bang. Help `$/patcher/boxes/0/box/patcher/boxes/9/box`
  also establishes the three-port `activeout 1` arrangement.
- `gain~` XML labels the second outlet signal; installed help signatures show
  an empty message type and connect it to a number box. The one-inlet default
  and two-inlet `interpinlet 1` variants have anchors in the inventory.
- `gain~` interpolation is 10 ms in XML and 20 ms in a basic help comment.
  Scale prose says 7.94231 while metadata says 7.94321. Help describes maximum
  gain as +18 dB while XML describes 17.4 dB. Relative-mode prose and default
  metadata also disagree. These were not resolved by runtime capture.
- `snapshot~` XML labels its right inlet signal even though interval methods
  and help use it for numeric/time input. `noise~`, `line~`, `gain~` and
  `ezdac~` contain other template port/argument placeholders.

## Reproduction And Limits

Run `python analyze.py` to rederive the summaries and precision checks, then
`PYTHONDONTWRITEBYTECODE=1 python verify.py` to verify hashes, event order,
completion counts and sample dimensions without launching Max. `generate.py`
authors fixtures only; its output is not runtime evidence. `build-metadata.py`
reads installed source metadata and local capture-session metadata, checks
cleanup, and regenerates the source/environment/manifest files.

`run-runtime.py` requires an explicitly disposable prefix and refuses to
overwrite existing raw captures. The current capture batch is frozen; do not
rerun it over these files. The private display and owned Max process were
closed, and an exact-prefix process scan found none remaining. The runner
performs no original-prefix launch, reauthentication, desktop changes or broad
process-name kill. After freezing the captures, the owned disposable prefix was
removed; its session metadata and log hashes remain in `environment.json`.

`python compare-native.py` compiles the current native capture runner in a
temporary directory and compares admitted, deterministic signal cases with the
retained Max samples, without modifying frozen evidence. It requires only the
system C++ compiler. `--native results/native-capture.jsonl` instead compares
the retained native execution, and `--output native-replay.json` explicitly
writes a report. Each native
value is first rounded to IEEE754 binary32; the default maximum absolute
tolerance is 2e-7. The report distinguishes exact float32 values from numerical
agreement. It excludes noise, two continuous-phase cases whose captured start
depends on unretained NRT frame count, and measured mode-1 clip variants that
the native phase explicitly rejects. Final loop vectors and snapshot cadence
are outside direct sample comparison. The replay report and raw native capture,
when present, are native execution evidence, not additional Max executions.

The retained replay passes 197 of 197 cases across 114,560 values, with
114,386 exact float32 matches. The largest absolute difference is
`8.824306776573463e-14`, at a cosine zero crossing. ULP distance near such zero
crossings can be large while the absolute error is tiny; the report includes
both and uses its declared absolute tolerance for the pass decision.

Gain transfer/interpolation, dac/ezdac routing and global/window control,
transport/time syntax, phasor signal-reset semantics, oscillator external
buffers, line pause/resume/multiple segments, and snapshot exact cadence remain
documented-only or explicit gaps. Noise retains empirical samples without an
algorithm-equivalence claim. The earlier `../dsp/analysis.json` baseline is a
separate historical capture and is not part of this batch.
