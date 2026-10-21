# Next Control Object Map

This is a source-backed implementation map for **metro, counter, delay, pipe,
change, gate, switch, split, clip and scale**, read from the installed Max 9.1.5
Windows reference XML and help JSON. It adds **no native objects**. Ultra already
has bounded `metro` and `counter` objects; the other eight names are absent from
the 25-kind registry at the source snapshot recorded in `object-map.json`.

`map-next.py` is the reproducible reader and contains original contract notes.
`object-map.json` is its machine-readable output: 20 source identities/hashes,
63 documented method signatures, 17 attribute signatures/default lexemes,
saved help port facts, 40 validated XML selectors, ten validated help anchors,
original help-use-case interpretations, bounded native requirements and pending
acceptance cases. No installed patch bodies, scripts, documentation prose or
media are copied. The ten help files contain 496 boxes and 264 patchlines in
43 patchers; these are static counts, not executed coverage.

## Interface And Implementation Priorities

Port counts refer to Max, with zero-based API indexes. Gate/switch selection
values are one-based; zero closes all routes. `N` is the data-slot/route count.
The proposed capacities and unsupported behavior below are Ultra design bounds,
not Max limits. Documentation establishes intended behavior, not observed parity.

| Priority | Object | Creation Arguments | Max Ports | Documented Messages And Required Behavior |
| --- | --- | --- | --- | --- |
| 1 | `change` | Initial number, default 0; optional `+`/`-` mode | 1 in, 3 out | Suppress repeated numbers; `set` silently changes comparison state; `mode +`, `mode -`, bare `mode`; separate zero/nonzero transition outputs. |
| 1 | `clip` | Min/max; none -> 0/0; one -> same bound twice | 3 in, 1 out | Scalar output type follows input int/float; clip numeric lists; cold limits and `set lo hi`; mode 0 clamps, nonzero mode outputs zero outside limits. |
| 1 | `gate` | N outputs, default 1; initial selection, default closed | 2 in, N out | Left int/float selects silently; left bang reports selection; `next` cycles; complete messages at right input pass to selected output. |
| 1 | `switch` | N data inputs, default 2; initial selection, default closed | N+1 in, 1 out | Left int/float selects, bang reports, `next` cycles; only the chosen data input forwards complete messages. |
| 1 | `split` | Explicit lower/upper bounds; missing defaults unknown | 3 in, 2 out | Numeric input routes inside/outside range; cold limits; lower-bound numeric type controls output conversion. |
| 2 | `delay` | Explicit milliseconds initially; default conflict below | 2 in, 1 out | Bang schedules; hot number sets delay and schedules; cold time affects future triggers; `stop` cancels; one-shot timer semantics need an overlapping-trigger score. |
| 2 | `metro` | Optional interval; documented default 5 ms | 2 in, 1 out | Bang/nonzero starts, zero/`stop` stops; cold interval update waits until next output before applying; recurring native timer. |
| 3 | `scale` | Four range endpoints, optional exponent; missing defaults unknown | 6 in, 1 out | Scalars/lists map without clipping; bang recomputes prior input with current ranges; typed integer conversion, modern/legacy curves and reversed ranges. |
| 3 | `counter` | Max; min/max; direction/min/max. No args: up, 0..2147483647 | 5 in, 4 out | Count/direction/reset/max inputs; count/min/max/carry outputs; `set`, `goto`, `jam`, `inc`, `dec`, `up`, `down`, `updown`, `min`, `max`, `setmin`, carry and compatibility modes. |
| 3 | `pipe` | Stored typed fields followed by delay; no args: one zero field, 0 ms | N+1 in, N out | Hot updates/bang queue snapshots; cold fields store; `clear`/`stop` cancel; `flush` emits pending values in reverse arrival order per outlet. |

Implement the five immediate control objects first, after capturing original
finite Max scores for numeric conversion and outlet ordering. They can reuse the
typed synchronous executor without adding clock state. Keep no documented bang
method distinct from a proven bang rejection: the current references do not
list bang for `change`, `split` or `clip`, so no recall behavior is proposed.

The proposed first native bounds are 1..8 routes/slots, at most eight numeric
list atoms, the existing finite scalar range and a fixed 64-record `pipe`
snapshot queue. Queue overflow needs explicit status, no silent eviction, and
bounded native dispatch. Timers must run with audio off and cancel on object or
graph replacement. Source-level queue design is still a proposal; this mapping
does not allocate a queue or implement a timer.

## Existing Ultra Names Need Migration

The read-only source snapshot links `apps/ultra/ui/canvas-model.mjs`,
`apps/ultra/ui/canvas-catalog.mjs` and
`apps/ultra/src-tauri/native/patch_graph.hpp` by SHA-256.

- Ultra `metro` currently defaults to 150 ms, accepts 20..2000 ms, and emits one
  tick on bang. The Max reference says bang starts the metronome. Preserve old
  saved-patch behavior through an explicit version/profile migration.
- Ultra `counter` currently has two inputs and one output, accepts a step count
  1..32, and emits an index before incrementing modulo that count. `counter 8`
  means 0..7 there; Max's single argument is a maximum of 8. Expanding the name
  to five inputs/four outputs and direction/min/max configuration must also
  version or migrate old patches.

## Evidence Traps And Pending Oracles

- `delay`: argument prose permits no argument and gives 5 ms; the same XML marks
  the argument `optional=0` and gives `delaytime` metadata default `0 ms`.
  Require an explicit delay until a no-argument runtime score settles this.
- `change`: argument table puts the mode second, but help saves `change +` and
  `change -` as single-argument instances. Capture both forms and all three
  outlets, especially directional modes and int/float equality.
- `pipe`: help has a 12-slot instance with 13 inputs, larger than the proposed
  eight-slot subset. Typed delayed fields, ordinary equal-deadline order,
  cross-outlet order, list updates and `flush` need new captures. Advanced help
  surrounds `pipe` with helper objects for arbitrary-length messages; that is
  not evidence that a bare `pipe` preserves any arbitrary message unchanged.
- `counter`: resets outside bounds can mutate minimum/effective maximum while
  retaining a requested maximum internally. Carry flags/counts, bounce endpoint
  behavior, first output, one-value/reversed ranges and simultaneous outlet
  order all require an ordered reference. The default maximum exceeds Ultra's
  finite numeric profile.
- `split`, `clip`, `scale`: numeric policies differ. Verify conversion before
  versus after range comparison, fractional bounds, mixed list atom tags,
  reversed/equal bounds and int-versus-float configuration paths.
- `scale`: the XML gives no missing-range/exponent defaults and no `classic`
  default metadata; the `classic` description also refers to `scale~`. Begin
  with explicit floating ranges and a linear exponent, then capture message
  `scale` modern/legacy curves and zero-input-span behavior before expanding.

Transport-relative time, notevalues, quantization, autostart, custom clocks and
priority queues are separate contracts. Initial millisecond support cannot be
called support for those options. `INLET_TYPE`, `OUTLET_TYPE` and `TEXT_HERE`
are shipped XML placeholders, not exact port/type specifications.

## Help Use Cases And Historical Runtime Evidence

Every object record cites a basic-tab target by its stable nested box path and
retains the incident source/destination endpoints with exact port indexes. For
example, `gate` cites `help/max/gate.maxhelp`, box `obj-2/obj-14`: selected route
control enters input 0, the counter stream enters input 1, and outputs 0..2 feed
three number displays. `switch` cites `obj-2/obj-26`, where a menu selects one of
four data inputs. Each record has an original interpretation and proposed finite
acceptance cases; there is no exported help patch body.

All ten files use helper JS, and the declared dependency names also include
`openTransport.maxpat`. Basic tabs introduce UI/helpers such as `jsui`, `umenu`,
`radiogroup`, `incdec`, `dial`, `print`, `clocker`, `qmetro` and `bpatcher`.
Implementing the target object alone does not make an installed help file run.
The parallel help investigation owns deeper intake/fixture work in
`../help-next-20261021/`; this map does no help import or execution.

Existing original `../fixtures/14-scheduler.maxpat` and its score/manifest/raw
and normalized captures cover only a small part of three objects:

- `metro 10`: start, then stop after a 55 ms score wait. Six bangs were collected
  in that run; exact tick count or scheduler timing is not an acceptance oracle.
- `delay 20`: bang, stop after 5 ms, bang again. One delayed bang was collected;
  this does not test replacing an already-pending trigger.
- `pipe 20`: queue 1/2, clear after 5 ms, queue 3. Only integer 3 was collected;
  this does not test flush, multiple typed fields or arbitrary-message delay.

These older Max captures used standalone Max 9.1.5 under Wine, DSP/Overdrive/
Scheduler in Audio Interrupt off. Logger arrival is not logical scheduler time;
causality, exact deadlines and console diagnostics were not captured. No new
Max/Ultra process, window, audio engine, native build or runtime comparison was
started for this mapping. Seven other objects have no retained original Max
oracle in this corpus. Static help facts are never counted as parity.

## Reproduce And Check

The local installed resource root used here is
`/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources`.
Only ordinary XML/help files are read; daemon state and preferences are unused.
Use your legitimately accessible installation:

```sh
python3 experiments/max-reference/object-batch-next-20261021/map-next.py \
  --resources /path/to/Max/resources
python3 experiments/max-reference/object-batch-next-20261021/map-next.py \
  --resources /path/to/Max/resources --check
```

Generation checks required method vocabularies, all 40 cited XML selectors,
all ten help anchors, fixed saved port counts and the registry presence
boundary. `--check` regenerates in memory and requires byte-identical retained
JSON, including hashes of historical evidence and the current Ultra sources.
After either installed docs or Ultra source files change, inspect and regenerate
the snapshot before relying on that check. These checks validate mapping
integrity and reproducibility, not behavior.
