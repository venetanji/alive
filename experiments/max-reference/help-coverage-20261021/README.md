# Installed Max help map and interaction follow-up

Starting commit: `b41c9b0816644aae93f7405e6c1cf9ad89a60c40`.
Research branch: `research/max-help-coverage-20261021` (no PR branch merge).
Max 9.1.5 Windows x64 from legitimate Live 12.4.6 installation, Wine 11.13
patched d2d1/dcomp, private Xvfb. Original projects/preferences remain untouched.
This is a bounded compatibility investigation, not a general Max compatibility claim.

## What is measured

The frozen corpus is `resources/help/**/*.maxhelp`, package `**/*.maxhelp`,
and core `help/**/*.maxpat`. There are 2,103 help files (973 core, 1,130
package) and 42 supporting Max patches. All 2,145 files parse as JSON.
There are 966 core `p basic` tabs. `summary.json` records denominators.
`help-files.jsonl` records relative installed paths, SHA-256 and derived facts;
`object-usage.jsonl` retains namespaces. These files contain no copied patch,
script, comment, media, icon or binary payloads. Literal tokens are an inventory,
not a canonical count of objects: aliases, substitution, abstractions, gen/RNBO
and namespace-specific operators require resolution.

Inventory is 100%; full installed-help conformance in Ultra is **0/2,103**.
Object semantic coverage is undefined until object cases have explicit assertions.
Parsing, admitting, executing, matching messages, matching DSP and matching
appearance are separate results. Never count an adapted basic example as passing
its whole installed help file. Whole files include scripts, multiple tabs,
external dependencies, assets, attributes and unsupported runtime families.

## Runtime evidence

`fixtures/interaction.maxpat` and its original JS collector were opened in Max.
`results/ui-events.jsonl` records locked bang, toggle on/off and slider output.
`fixtures/interaction-query.maxpat` uses the numeric right outlet of
`adstatus switch` to query DSP without changing it. `results/dsp-query.jsonl`
records DSP = 0 followed by another locked bang and toggle on/off. The first
probe's left adstatus outlet sent a selector the collector did not handle;
it is not evidence of DSP state. The second probe corrects the measurement.

I, F, S were physically typed on the private display in the unlocked patch:
I creates an integer box, F a float box, S a vertical slider. The cropped
screenshot is evidence for visual creation only; these keyboard-created objects
were unsaved and are not claimed as Max-saved format snapshots. Both number UI
variants report `number` through JS `maxclass`, so that histogram alone cannot
prove which variant was created. The saved JSON classes are `number` and `flonum`.
Ordered sequence numbers describe collector arrival, not scheduler priority,
latency, or wall-clock accuracy. This follow-up performs no DSP render.

Ultra's present gap crosses the whole event path: UI readiness, JS event
admission and native `ultra_canvas_event` require running audio. Max's message
controls run with DSP off. Enabling a DOM button alone does not fix this.
A message executor and clock lifecycle independent of audio need a defined
contract before implementing new Max-like message objects.

## Backend and implementation map

`objects.json` maps the focused object families, installed basic tabs, official
reference links, backend candidates and acceptance gates. `focus-reference.json`
is derived from official installed XML; it is documentation evidence, not a
runtime pass. Earlier `../manifests/`, `../expected/` and `../results/` contain
executed original message and DSP references. Existing
`../../pd-cyclone-faust/` demonstrates selected real Pd/Cyclone messages and a
Faust voice; it does not establish general Max equivalence.

Prefer the existing pinned libpd message implementation where the reference
traces match; use selected Cyclone objects when needed and separately licensed.
Faust supplies DSP kernels, not Max's message scheduler, UI, saved state or
ramp event semantics. Pd `line`/`line~` are candidates pending matched scores.
Defer/deferlow priorities, symbols/lists, scoped names, coercion and initialization
remain explicit adapter obligations. Unknown classes/attributes must be reported.

`batch-map.json` defines six bounded proposed work packages with ownership and
integration gates. None was dispatched. The requested label "6.1 Luna" does not
exactly match an available model; `gpt-6-luna` is a related available name.
Resolve the exact model and budget before a paid/cloud trial. Some packages
have dependencies; six agents starting all runtime work simultaneously is not
an independent first batch.

## Runnable help as product design

Every supported Ultra object should ship an **original, small runnable patch**:
what enters each inlet, what leaves each outlet, the stored initial state,
a finite input score, expected ordered trace and any DSP tolerance. Help opens
a disposable copy without replacing the user's unsaved patch. Include editable
controls and visible results; distinguish message/UI/DSP contracts. Help and
acceptance fixtures should share the same schema and execution path. Each case
has one of untested, source-inspected, rejected, executed, or compared-pass;
"unsupported" is an informative result, not an approximation.

Import mapping extends the earlier `../format/` observations. Preserve unknown
JSON fields in an authoring document envelope. Relevant paths include
`$.patcher.boxes[*].box.{maxclass,text,patching_rect,presentation_rect,style}`,
`$.patcher.lines[*].patchline.{source,destination,order}`,
`$.patcher.boxes[*].box.patcher`, `$.patcher.styles`,
`$.patcher.dependency_cache`, and saved parameter attributes. Inspector appearance
(fonts, colors, sizes, presentation and style inheritance) belongs in authoring
metadata, separately from native DSP parameters. Resolve only supported fields
for display/execution; retain the remainder for round trips and show diagnostics.
Do not loosen the current strict `ultra-canvas-v1` runtime protocol by silently
passing all Max JSON through it. A validated importer must emit an admitted
bounded graph or explain unsupported features before replacing an active graph.

## Reproduce

Use your own licensed local Max installation; this bundle redistributes no
installed help patches or proprietary assets. Inventory only (never execution):

```sh
python3 inventory.py --resources /path/to/Max/resources --output /tmp/max-help-map
python3 -m unittest discover -s . -p 'test_*.py'
```

Open our fixture with its adjacent JS dependency and a writable `results/`
folder. Keep audio off, lock the patch and click bang, toggle twice and slider.
Query fixture reports current DSP state without setting preferences. Repeat
I/F/S in an unlocked disposable copy; discard it afterward. Exact settings not
queried in this follow-up remain null in its manifest. Official references:
https://docs.cycling74.com/userguide/patching/
https://docs.cycling74.com/userguide/inspector/
https://docs.cycling74.com/userguide/styles/
https://docs.cycling74.com/reference/slider/
https://docs.cycling74.com/reference/line/
https://docs.cycling74.com/reference/line~/
