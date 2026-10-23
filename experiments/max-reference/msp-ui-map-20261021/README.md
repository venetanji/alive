# UI And Basic MSP Object Map

This is a source-backed map of 18 Max objects for the next Ultra work: `print`,
eight UI classes, and nine basic MSP classes. It reads installed Max 9.1.5
Windows XML references and help JSON. It adds no runtime objects, imports no
installed help patch, and starts no Max, Wine, Ultra or audio process.

`map-objects.py` contains the reproducible reader and original contract notes.
`object-map.json` contains 36 installed file identities/hashes, method/argument
and attribute signatures, default lexemes, enum order, theme-role links,
102 saved target instances, 18 help graph anchors and 132 checked XML selectors.
It also links separate historical original Max captures and hashes the current
Ultra source snapshot. Proprietary documentation prose, patch bodies, helper
scripts, comments and assets are not copied into this folder.

## Message And UI Contracts

Ports use zero-based API indexes. The settings below are documented facts or
explicit conflicts, not newly observed behavior. Full signatures and source
selectors are in each JSON object record.

| Object | Max Ports | Defaults, Messages And State |
| --- | --- | --- |
| `print` | 1 in, 0 out | Optional word/number label; omitted label is `print`. Ordinary messages go to the console without selector interpretation. `array`, `dictionary` and `string` expand collection contents. Double-click opens the console. |
| `button` | 1 in, 1 bang out | Any message/click flashes and emits bang. `blinktime` metadata is 200 ms. No latching boolean value. |
| `toggle` | 1 in, 1 int out | Bang alternates on/off. Int input passes through unchanged; visible on means nonzero. Float converts to int. `set` is silent; `outputvalue` recalls. Historical input 7 emits int 7. |
| `slider` | 1 in, 1 numeric out | `bang` recalls, numeric input updates/emits, `set` is silent. `size` is float-valued, default 128; `min` 0, `mult` 1, `floatoutput` 0. Integer mode normalizes size below 2 to 2; float mode normalizes below 1 to 1. `setminmax lo hi` enables float output. |
| `number` | 1 in, 2 out | Default `format` is integer decimal. Other formats include hex, octal, binary, MIDI note labels, float, list and text. Default min/max are absent (`<none>`); bare `min`/`max` removes a bound. `set` is silent; right outlet is Tab bang. |
| `flonum` | 1 in, 2 out | Float value output plus Tab bang. `bang`, numeric input, silent `set`, optional `min`/`max`, and bare-bound removal. `numdecimalplaces` metadata is 0; displayed precision is separate from stored value. |
| `dial` | 1 in, 1 numeric out | Range/transform resembles slider: float-valued `size` 128, `min` 0, `mult` 1, integer output default. Multiply precedes offset. `setminmax` enables float output when its values are float atoms. `resize` changes pixels, while `size` changes numeric range. |
| `multislider` | 1 in, list + scalar out | Bang emits list; scalar fills all positions. Lists assign left-to-right and normally resize count. `set index value` and `setlist` are silent; one-based `fetch` uses right outlet. Size default 1, documented max 4096. Require explicit type/range because defaults conflict. |
| `kslider` | 2 in, pitch + velocity out | Left pitch emits right velocity first, then left pitch. Right velocity stores silently. `set` and `clear` are silent. Default mode mono; polyphonic/touchscreen add held-note and note-off behavior. `chord`/`flush` are separate contracts. |

Console attributes include `bettersymquotes`, `deltatime`, `floatprecision`,
`level`, `popup` and `time`, all with metadata default 0. Precision enum order
is regular/low/high; level enum values are print=0, warn=1, error=2 and bug=3. Error level also
reaches Max `error` objects. `time` uses scheduler time, not a wall-clock
timestamp. Exact console text, punctuation, float formatting, quoting and
timing prefixes have no retained original console oracle here. The original
JS logger is not evidence of how `print` renders messages.

The current Ultra subset contains a native `print` sink, `bang` as a button-like class, boolean
`toggle`, a generic two-inlet/one-outlet `number`, `flonum` and `slider`.
Its finite bounds, integer slider `size`, six-decimal flonum display default,
and number port shape are local profile choices. Existing saved documents need
an explicit migration/profile before those names change behavior. `dial`,
`multislider` and `kslider` are absent at the recorded registry snapshot.

Ultra `print` is implemented as native kind 25 with one message inlet and no
outlets. Its admitted settings are an ASCII label (one token, 1..31 bytes,
default `print`) and integer level 0..3 (default 0). It preserves accepted typed
messages in a 128-record native queue, with a 512-row UI history, dropped-record
count and Clear action. These are Ultra bounds. Collection expansion,
`bettersymquotes`, `floatprecision`, `time`, `deltatime`, `popup`, Max
`error`-object routing and exact Max console formatting remain unsupported.
This folder inspects that implementation's source; its runtime tests belong
to the implementation work and are not claimed by this map.

## Appearance And Settings

Keep semantic settings separate from appearance. A knob color never changes
its range or message type; a display precision setting must not round native
state. Number bounds, slider transforms, dial tracking and kslider input modes
need the same native admission path for mouse input and connected messages.

| UI Class | Object-Specific Appearance And Interaction Settings |
| --- | --- |
| `button` | `bgcolor`, `blinkcolor`, `outlinecolor`, `blinktime` |
| `toggle` | `bgcolor`, `checkedcolor`, `uncheckedcolor`, `size`, `thickness`, optional `svg` |
| `slider` | `bgcolor`, `elementcolor`, `knobcolor`, `drawoffcolor`, `knobshape`, `thickness`, `orientation`, `relative` |
| `number`, `flonum` | Background/text/triangle colors, triangle drawing/scale, decimal-place display, edit/click output policies; `number` also has format-dependent behavior |
| `dial` | `bgcolor`, `needlecolor`, `outlinecolor`, `degrees`, `thickness`, seven drawing modes, clipping and vertical/circular tracking |
| `multislider` | `slidercolor`, `peakcolor`, background, candycane colors, draw style, orientation, spacing, thickness, signed bars, shadows and pointer output policy |
| `kslider` | White/black/selected/active key colors, displayed key range, offset, input interpretation and operational mode |
| `scope~`, `meter~` | Background/trace/grid or meter segment colors, rectangle-dependent orientation, display range and update settings |

The XML often stores `dynamiccolor_default` theme-role names and `stylemap`
links alongside `legacydefault` RGBA values. Those legacy values are not the
current rendered theme. The map retains the links and marks obsolete/invisible
attributes so the renderer does not blindly expose old border/RGB aliases as
modern controls. Inherit theme/style roles when the patch omits overrides;
save an explicit per-object color only when the user chooses one.

`patching_rect`/presentation geometry, shared fonts and style inheritance live
outside these object-specific attribute lists. This folder does not invent
default geometry from help examples or claim pixel parity. Parameter enabling,
mapping and `param_connect` are additional runtime contracts, even where their
attribute names are listed.

## Basic Signal Contracts

| Object | Max Ports | Documented Behavior And Initial Scope |
| --- | --- | --- |
| `sig~` | 1 in, N signal out | Initial value count sets outlet count; list assigns outlets; `set index value` is zero-based. Input signal is ignored for values but can force DSP order. First Ultra proposal admits one explicit constant and one outlet. |
| `cycle~` | 2 in, 1 signal out | Frequency left, phase right; default waveform uses an internal cosine table. `reset phase` sets phase. Buffer-backed `set`/`setall` differ. Begin with explicit Hz and cosine only. |
| `phasor~` | 2 in, 1 signal out | Frequency/time left; number at right jumps phase, but right signal triggers reset to `phaseoffset`. `syncupdate`, jitter and transport lock are separate. Begin with explicit Hz and numeric phase reset. |
| `line~` | 2 in, 2 out normally | Signal ramp plus completion bang. Initial value 0. Right duration is consumed by next scalar target; new targets replace queued segments. Lists describe target/time pairs; stop/pause/resume differ. Creation-time `@activeout 1` adds an activity signal before completion bang. |
| `*~` | 2 mixed in, 1 signal out | Multiply inlet signals/fallback constants. Right default constant 0. A signal connection supersedes constants; multiple signals to an inlet are summed in Max. Begin with one edge per inlet and explicitly bounded constants. |
| `+~` | 2 mixed in, 1 signal out | Add inlet signals/fallback constants; right default 0. Same connection/implicit-summing obligations as `*~`. |
| `snapshot~` | 2 in, 1 float out | Default interval 0 means bang-only. Reads a latest-vector sample at offset; scheduler mode can alter sample selection. Start/stop/interval and sampleinterval are separate timing paths. |
| `scope~` | 2 in, 0 out | Time trace or X/Y display, not an audio output. Metadata: buffer 128, calculation count 256, range -1..1. Triggers/decimation/click hold need distinct observation contracts. |
| `meter~` | 1 in, 1 float out | Displays and reports peaks; numeric input simulates peak. Interval 10..2000 ms, default 50; LED step 3 dB, default LED count 12. Peak/RMS/decay/overload are not interchangeable algorithms. |

The current Ultra audio graph only admits `voice -> gain -> join -> dac`,
with one source per audio inlet and distinct control/mono/stereo types. None
of these nine MSP classes is registered in the recorded snapshot. Existing
`voice~` and raw-127 `gain~` do not implement their contracts. Adding basic MSP
requires a general bounded mono graph, mixed signal/control inlet admission,
fallback constants, arity validation, native sample-boundary events and
signal-to-message scheduling. UI redraw must never advance DSP.

## Conflicts And Missing Oracles

- Slider `relative`: metadata default 0 with enum `[Absolute, Relative]`, but
  prose calls relative the default. `inputrangemode` has a placeholder
  description. Capture both modes; do not infer the input transform.
- Multislider `settype`: metadata default 1 means float; prose says integer 0.
  Range metadata is -1..1 while prose also gives integer 0..127. Require
  explicit configuration until a fresh saved object and typed trace settle it.
- Kslider `offset`: metadata is 36, but prose calls the unit octaves. Keep
  the exact source fact and capture units. Default velocity is also unmeasured.
- `line~` outlet 1 XML type says signal while description names bang. Normal
  help saves `[signal, bang]`; activeout help saves `[signal, signal, bang]`.
  `snapshot~` interval inlet also has a misleading signal type in XML.
- `cycle~` no-argument frequency, `sig~` no-argument value/outlet count,
  phasor startup phase, snapshot audio-off state and meter peak windows need
  original finite scores. Explicit initial settings avoid inventing defaults.

Retained original captures cover a narrow subset: `06-number`, `07-flonum`,
`12-ui-message`, the physical locked controls in `help-coverage-20261021`, and
`18-dsp`. The latter is one fresh 48 kHz/64-frame NonRealTime render of 1 kHz
cosine, a 10 ms ramp, their product and constant 0.25. It does not cover phase
modulation, generic graph events, completion, arbitrary oscillator rates or
meter/scope/snapshot. No runtime capture was made by this mapping.

Each object record has proposed finite scope and pending acceptance cases.
Suggested first bounds (eight atoms, up to four signal ramp segments, one
`sig~` outlet and eight multislider values), plus the implemented 128-record
console queue/512-row history, are Ultra design choices, not Max limits.
Keep source-inspected, admitted, executed and
compared-pass statuses separate. An installed help anchor proves a saved
interface/use context; it does not prove that the whole help file runs.

## Reproduce

The local installed resources used for generation are at
`/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources`.
Use legitimately accessible Max resources; no preferences or private daemon
state is read. Paths in JSON are relative to that resource root or the stated
repository/reference root.

```sh
python3 experiments/max-reference/msp-ui-map-20261021/map-objects.py \
  --resources /path/to/Max/resources
python3 experiments/max-reference/msp-ui-map-20261021/map-objects.py \
  --resources /path/to/Max/resources --check
```

Generation validates object identity, every cited XML selector, saved fixed
port counts and every selected help anchor. `--check` regenerates in memory
and requires byte-identical JSON, including current Ultra and historical
source hashes. After related Ultra source changes, review the boundary notes
and regenerate. These checks verify reproducibility and internal evidence
links, not runtime behavior, DSP equivalence or appearance.
