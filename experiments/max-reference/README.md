# Local Max Reference Evidence

This is a bounded, self-created reference corpus for Alive/Ultra. It is not a Max
runtime or a broad Max/MSP compatibility claim. The initial fetched commit was
`9f9c225dfd6774342df21112ccd025197ee725a9`; the requested integration base is
`aa13d68`. Work stays in `experiments/max-reference/` on the separate branch
`research/max-reference-local-20261020`. No shared application/runtime files or
`PLAN.md` were edited, merged or pushed.

## Entry Points

- `manifest.json`: schema-conforming environment capture and link to the full index.
- `manifests/*.manifest.json`: one experiment/run-setting manifest, using
  `../max-subset/reference-manifest.schema.json` from `aa13d68`. Artifact paths are
  relative to this directory. `bundle-index.json` hashes all other bundle files
  except itself and the root manifest, avoiding recursive self-hashes.
- `fixtures/*.maxpat`: original runnable patches, with sibling ordered input
  scores and the original `probe.js` collector. `scoped-bus.maxpat` is reusable.
- `results/*.jsonl`: raw observed collector events. `expected/*.json` removes
  wall-clock timestamps while retaining stimuli and initialization. These are
  observed baselines, not independent certification. Raw JSONL retains Max's
  Windows CRLF line endings byte-for-byte. Expected annotations link events to
  operations and source outlets; numeric list atoms are marked `unknown_numeric`.
- `objects.json`: 32 bounded classes with documented arguments, ports, defaults,
  message vocabulary, relevant attributes, source hashes, aliases and evidence
  status. UI, message and DSP status are separate. Some installed XML port and
  argument entries contain placeholders; these are retained and flagged, not
  treated as exact port specifications. Unmeasured port details remain deferred.
- `format/observations.json` and `format/import-mapping.json`: JSON-path deltas
  and a proposed preservation-first mapping from our own JSON fixtures. Authored
  input deltas are labelled separately from any actual Max-saved snapshots.
- `dsp/max-reference.wav`: 48 kHz, four-channel IEEE float32 WAV, 1,920 frames.
  `max-samples.jsonl` is the direct Max `buffer~` export; the matching independent
  fresh-process capture is `max-samples-run1.jsonl`. Input events are in
  `fixtures/18-dsp.score.json`; `dsp/analysis.json` states errors and tolerances.

## Reference Environment

Max **9.1.5 (`3db35fa476d`, Windows x64)**, bundled with Live **12.4.6
(`2026-09-10_0de5c8fa9a`)**, running on Omarchy
`4.0.0.r7083.g81fd2d2`, Linux `7.2.8-9-omarchy`, x86_64, through the installed
patched **Wine 11.13** distribution `2026.08.30.1`. Exact settings and isolation
notes are in `docs/environment.json` and each manifest.

Message probes: **44,100 Hz, 64-frame signal vector, 512-frame I/O vector,
Overdrive off, Scheduler in Audio Interrupt off, DSP off**. The depth-first
fixture runs after the offline DSP probe at 48 kHz with DSP off. DSP capture:
**48,000 Hz, 64/512 frames, NonRealTime, Overdrive off, Scheduler in Audio
Interrupt off**. DSP switches off before the buffer export. Hardware I/O is
inactive under NonRealTime. Settings were queried with `adstatus`; menu indices
from its left outlet must not be mistaken for sample-rate/vector values from
its right outlet. Transport state was not queried; timer inputs use milliseconds.

All launches used disposable Btrfs reflink copies of the installed prefix,
private Xvfb and replacement empty folders for the copied profile's home-folder
symlinks. The original Live preference file still matches the independent copy;
no standalone Max preference file was created in the original profile. No
licenses, executables, bundled media, example patches or commercial projects are
included. No paid/cloud sessions were started.

## Executed Questions

| Fixture | Question / bounded observation |
| --- | --- |
| 00 | Read-only scheduler/audio settings and menu/value distinction. |
| 01, 19 | Trigger right-to-left and completion of the whole right branch before the left branch. |
| 02, 16, 17 | Fan-out with authored `order` fields, metadata and reversed edge array; order/layout disagreement remains unresolved. |
| 03 | `+` and `int` cold storage, hot bang and `set`. |
| 04-07 | Storage objects versus numeric UI: truncation toward zero, scalar type selectors, lists, symbols, bang and set. |
| 08, 09 | Pack storage/short and long lists; unpack outlet order, coercion, missing/excess values and bang. |
| 10, 11 | Select numeric coercion/right-inlet replacement; route selector stripping and rejection outlets. |
| 12 | Button conversion, toggle numeric pass-through and state, message substitution/cold replacement. |
| 13 | Saved initial parameter value 17, child loadbang, parent loadbang and subsequent hot bang. |
| 14 | Metro stop, delay stop/retrigger, pipe clear, defer and deferlow at collector arrival. |
| 15 | Named send into parent/nested receivers and isolated `#0` abstraction instances. |
| 18 | Offline oscillator/phase/envelope/gain product and settings. |

Notable observed boundaries: `pack i f s` starts with `[0, 0., s]`; UI number
boxes and `int`/`float` do not handle multi-item lists identically; a toggle can
emit the received integer value rather than normalizing it to 1. Do not replace
these with convenient cross-engine approximations. Multiple-receiver order is
explicitly nondeterministic in the official docs, despite a concrete trace here.

## Reproduction

Use a legitimately accessible installed Max. Run only disposable copies. Do not
open all DSP fixtures together: global DSP state and duplicate buffer names can
interfere. Close the disposable standalone Max normally between isolated runs.
The source patch remains unchanged; opening it executes its score after 500 ms.
The collector writes to the sibling `results/` directory. `run_fixture.py`
refuses an already-running Max in the selected prefix and monitors completion.
It times out without force-closing apps or attempting authorization.

```sh
cd experiments/max-reference
python3 scripts/run_fixture.py 01-trigger \
  --wine /path/to/installed/wine \
  --prefix /path/to/disposable-prefix --display :97
# Close disposable Max before starting the next isolated experiment.
python3 scripts/run_fixture.py 18-dsp \
  --wine /path/to/installed/wine \
  --prefix /path/to/disposable-prefix --display :97
python3 scripts/analyze_dsp.py
```

For a private Xvfb, use `-fakescreenfps 60` or verify its RandR mode reports a
nonzero refresh before launching Live. The first local Xvfb mode reported zero;
adding a private 59.96 Hz mode was needed for the Live UI. All changes stayed on
that private display. Max standalone executes these probes but the installation
shows saving disabled; do not activate a trial or bypass authorization.

To regenerate authored inputs, run `scripts/generate.py` followed by
`scripts/add_probes.py`. Re-execute before replacing any evidence. To refresh
metadata, `scripts/inventory.py` takes the installed `resources/docs` directory.
To validate the delivered evidence without launching Max:

```sh
python3 scripts/verify.py
# If jsonschema is not installed, use an isolated tool environment:
uv run --no-project --with jsonschema scripts/verify.py
```

`verify.py` checks graph endpoints, complete ordered scores, trace normalization,
independent semantic assertions, both identical DSP captures, WAV encoding,
artifact hashes and every manifest against the shared JSON Schema. This checks
bundle integrity and bounded observations, not general compatibility.

## Known Gaps And Sources

`docs/semantic-gaps.md` is part of each experiment's evidence. In particular,
**JS preserves top-level int/float selectors but loses numeric atom types inside
lists**. Those atom types are unknown, not inferred from JSON spellings. Timing
is collector arrival; high-priority scheduling and exact metro counts are not
contract assertions. `gain~` taper/smoothing, real-time ramp interruption,
vector-boundary event offsets, hardware output, full UI interaction, additional
arithmetic operators and unsupported attributes remain deferred.

The file-format pairs in `format/` are original authored inputs. They must not
be described as before/after Max saves until a corresponding Max-produced file
is present and explicitly marked. Self-created AMXD boundary evidence is likewise
deferred until a legitimate editor save is obtained. Installed external metadata
inspection is limited to `docs/ad-nonreal-pe-resources.json`; no decompilation or
implementation-code inspection occurred.

Official documentation is cited with installed XML hashes in `docs/sources.json`
and alongside each object in `objects.json`. Key references:
[trigger](https://docs.cycling74.com/reference/trigger/),
[pack](https://docs.cycling74.com/reference/pack/),
[send](https://docs.cycling74.com/reference/send/),
[cycle~](https://docs.cycling74.com/reference/cycle~/),
[line~](https://docs.cycling74.com/reference/line~/),
[adstatus](https://docs.cycling74.com/reference/adstatus/),
[scheduler](https://docs.cycling74.com/userguide/scheduler/),
[patcher lifecycle](https://docs.cycling74.com/userguide/patcher_lifecycle/), and
[non-real-time processing](https://docs.cycling74.com/userguide/non_realtime/).
Documentation and observed runtime evidence are distinct; current web docs are
not a pinned guarantee for this Max build.
