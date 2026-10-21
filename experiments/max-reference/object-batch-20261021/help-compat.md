# Installed Help Compatibility Check

The ten installed `.maxhelp` files do not load or run in the current Ultra
canvas. All ten are valid source JSON. Eight fail the actual production parser
on the Max `patcher` root field. `pack.maxhelp` and `line.maxhelp` exceed the
64 KiB input limit first. Compacting each source removes the size blocker but
all ten still fail the root schema. The ten selected canonical types and their
documented authoring aliases are now admitted by Ultra's own document and
object-entry parsers. Their implementations and original runnable examples are
documented in `runtime-batch.md`; this does not convert Max help documents.

This is an executed compatibility check, with expected refusals. It does not
implement an importer or substitute for runtime object tests.

| Object | Original Bytes | First Production Parser Refusal | All Saved Boxes | Basic Tab Boxes / Edges |
| --- | ---: | --- | ---: | ---: |
| int | 26,001 | Unknown patch field: patcher. | 25 | 21 / 10 |
| float | 28,070 | Unknown patch field: patcher. | 27 | 23 / 12 |
| flonum | 41,266 | Unknown patch field: patcher. | 39 | 17 / 10 |
| slider | 52,156 | Unknown patch field: patcher. | 51 | 22 / 11 |
| pack | 67,352 | Patch exceeds 64 KiB. | 68 | 12 / 5 |
| unpack | 46,425 | Unknown patch field: patcher. | 47 | 15 / 8 |
| select | 42,264 | Unknown patch field: patcher. | 39 | 16 / 7 |
| route | 57,546 | Unknown patch field: patcher. | 55 | 24 / 16 |
| trigger | 54,093 | Unknown patch field: patcher. | 53 | 20 / 14 |
| line | 111,616 | Patch exceeds 64 KiB. | 119 | 20 / 8 |

All saved boxes counts embedded patchers recursively, including comments and
helpers. Those counts describe the source, not a proposed flattening algorithm.
Eight whole examples contain more than 32 saved boxes; every isolated basic tab
has at most 32 direct boxes. Neither fact establishes conversion or execution:
the basic tabs still contain unsupported types, ports, Max messages, attributes
and helpers. The report retains exact target port shapes and token inventories
as derived metadata; name overlap with a registry key does not establish Max
semantics.

## What Was Actually Executed

`help-compat.mjs` imports Ultra's real `canvas-model.mjs` and
`canvas-catalog.mjs`. It passes every original file to `parsePatch` and
`createCanvasController.load`, checks the precise refusal, and confirms that
the previous document survives every failed load. It probes a correctly shaped
single-node Ultra graph for each canonical selected type, and probes canonical
and alias names through `parseObjectText`. All ten target node probes are now
accepted. The ten isolated basic-tab Max wrappers also reach
the production parser and fail its schema. The chooser's advertised file types are currently
`.json,.ultra,application/json`; renaming or manually pasting Max JSON still
reaches the rejecting parser.

Eleven assertions also exercise actual intake boundaries: 32 versus 33 nodes,
64 versus 65 cables, 65,536 versus 65,537 source bytes, and refusal of unknown
parameters, nonexistent outlets and control cycles, acceptance of selector
messages, and refusal of unsupported message substitution.

Two independently authored Ultra fixtures are admitted by `parsePatch`,
converted through a small experiment-only descriptor transport, and compiled
and executed against the actual production native `compile_canvas` and
`CanvasRuntime` header. Their five input operations have 23 checked observation
fields, including explicit cold-store-before-hot-read order, fractional numeric
storage, cold inlet silence, bang readback and incompatible list suppression.
These are original existing-Ultra smoke fixtures, not implementations of
`int`, `float`, `flonum` or the other selected Max objects. Their success counts
as zero adapted selected-object helps and zero full installed-help passes.

This direct native core run bypasses Rust preparation, Tauri IPC, the browser
and the audio host. It opens no audio device and runs no Max process. Separate
C ABI tests now exercise control execution and native ramp timing with audio off.
The earlier `experiments/max-subset` tool is an offline inventory; its success
would not change any of these execution results.

## Remaining Functionality

To run a selected basic example, Ultra needs a Max-document conversion layer
that resolves class aliases and arguments, translates saved IDs, ports and
coordinates, preserves unsupported authoring attributes, and refuses unresolved
nodes or edges before replacing an active graph. The ten selected types now
have bounded native implementations with typed atoms, hot/cold state,
argument-dependent ports, outlet ordering, selectors, UI controls and ramp
timing. The supported subset and remaining differences are explicit in
`runtime-batch.md`; a supported name does not certify all Max methods.

Full installed help additionally needs supported hierarchy, tabs, helper
patchers, scripts, assets and dependency resolution, with explicit handling of
the current graph and intake limits. Simply raising limits or discarding helper
nodes does not produce a runnable whole help. Before calling an example compatible, execute a finite original
input score in Max and Ultra and compare the typed ordered outputs; compare UI
and timed ramps separately. Object-specific evidence and gates are in the
adjacent object map.

## Reproduce

Use a licensed local Max installation; only source hashes and derived metadata
are written to the report. No proprietary patch text, script or asset is copied
into this bundle. The independently authored fixtures are redistributable.
The runner uses Node.js and `g++`, creates its native probe in a temporary
directory, and removes that directory when finished.

From the repository root:

```sh
node experiments/max-reference/object-batch-20261021/help-compat.mjs \
  --max-root '/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max' \
  --output experiments/max-reference/object-batch-20261021/help-compat-results.json
```

Exit 0 means the assertions in this bounded check passed, including expected
refusals. It does not mean the Max files are compatible. Changed admission or
refusal results must be reviewed against an executable contract.
`help-compat-results.json` records the installed
source hashes, production and runner source hashes, native observations, exact
errors and explicit execution limits.
