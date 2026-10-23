# Installed Max Help Import Evidence

The production importer now reads actual `.maxpat` / `.maxhelp` JSON, inventories
named nested patchers, and adapts a selected control graph into the bounded Ultra
document format. Unsupported boxes, cables, attributes, appearance and known
semantic differences are reported before import. A caller must explicitly enable
partial import when the selection contains any warning or omission.

This study imports the named basic tabs in 13 installed licensed help files. All
13 selections require partial import. It also executes the exact imported slider
graph in the production native control runtime. This adds one executed imported
fragment and zero whole-help execution passes; Max itself was not executed.

## Reproduce

```sh
node --test apps/ultra/ui/canvas-max-import.test.mjs
node experiments/max-reference/help-import-20261021/check-import.mjs \
  --max-root '/licensed/installation/Max' \
  --output experiments/max-reference/help-import-20261021/results.json \
  --export-slider /tmp/alive-imported-slider.ultra.json
```

The optional export writes the adapted graph only to the explicitly selected
local path. No proprietary source file or extracted graph is retained here.
The JSON report records installed source hashes and paths, selected box paths,
source/native box ID mappings, counts, diagnostics, imported graph hashes, and
native observations. The native driver is reused from
`../help-next-20261021/native-scenario.cpp` and requires `g++`.

## Observed Coverage

Counts refer to one selected basic tab in each source. Comments are counted
separately as decorations; they are not executable objects. Omitted boxes include
unsupported help chrome, scripts, print/receive objects and dynamic message
displays. Retained objects can still have explicitly reported behavior gaps.

| Help | Selected Patcher | Source Boxes / Cables | Retained Objects / Cables | Omitted Boxes / Cables | Comments |
| --- | --- | --- | --- | --- | --- |
| toggle | root/obj-2 | 19 / 9 | 9 / 5 | 2 / 4 | 8 |
| button | root/obj-3 | 9 / 4 | 4 / 3 | 2 / 1 | 3 |
| number | root/obj-2 | 17 / 10 | 11 / 4 | 2 / 6 | 4 |
| flonum | root/obj-2 | 17 / 10 | 11 / 9 | 2 / 1 | 4 |
| slider | root/obj-3 | 22 / 11 | 14 / 9 | 3 / 2 | 5 |
| int | root/obj-2 | 21 / 10 | 13 / 8 | 3 / 2 | 5 |
| float | root/obj-2 | 23 / 12 | 15 / 10 | 3 / 2 | 5 |
| pack | root/obj-2 | 12 / 5 | 4 / 3 | 4 / 2 | 4 |
| unpack | root/obj-2 | 15 / 8 | 6 / 5 | 5 / 3 | 4 |
| select | root/obj-2 | 16 / 7 | 9 / 7 | 2 / 0 | 5 |
| route | root/obj-2 | 24 / 16 | 11 / 9 | 11 / 7 | 2 |
| trigger | root/obj-2 | 20 / 14 | 7 / 5 | 11 / 9 | 2 |
| line | root/obj-2 | 20 / 8 | 8 / 6 | 5 / 2 | 7 |

The imported slider graph has 14 objects and 9 cables. In the installed selected
tab, `obj-17` maps to native slider 4, `obj-22` to native number 9, and `obj-23` to
native bang 10. Native events of 73 and then 21 at slider 4 inlet 0 propagate to
number 9 with values 73 and 21. Number 9 and bang 10 both receive one event per
input, increasing their pulse counts from 1 to 2. Eight assertions verify those
values and counts. The graph is passed unchanged from the importer; there is no
replacement authored scenario or removal of additional objects for this run.

## API And Boundaries

`analyzeMaxPatch(input, {sourceName})` accepts JSON text or an already parsed JSON
object and returns source totals and reports for actual nested patcher
boundaries. Each selection exposes its stable `id`, human-readable `name`, and
original box `path`. The importer never flattens subpatches or executes their
scripts. Root is `root`; descendants append URI-encoded original box IDs.

`importMaxPatcher(input, {patcherId, allowPartial, sourceName})` returns the
selection, a source-box-to-native-node `nodeMap`, diagnostics, counts and a
validated `patch` when allowed. `complete` means the selected graph has no
reported warnings or unsupported executable elements. It does not certify the
complete help file or Max runtime parity. `importable` means a valid nonempty
native candidate exists; `requiresPartial` identifies selections that require
the explicit `allowPartial: true` option. `partial` is true only when such a
candidate is actually returned. Cycles, duplicate cables, native size limits and
other graph errors return no patch, including in partial mode. Graphs are never
silently truncated or repaired.

Coordinates and saved port indices are retained. Unique explicit cable fanout
orders are sorted into native dispatch order. Missing or ambiguous fanout order
is reported; saved array order is retained without certifying Max geometric
ordering. Supported native appearance attributes and dimensions are preserved.
Unsupported or invalid styling is diagnosed, with no clamping.

The adapter supports a selected subset of Max UI/control objects. It refuses
Max counter and native-only namesakes with incompatible contracts. Number-box
integer coercion and Tab output, message cold replacement/editing, nonzero
toggle values, and metro behavior differences require partial acknowledgement.
Literal Max messages connected to receivers lacking their selector are reported
as unsupported cables. Dynamic/substituted messages, comma/semicolon message
programs, scripts, global sends/receives, dependencies and transport behavior are
not emulated. Line creation argument lexical type is preserved as the native
integer/float output mode.

Input analysis is bounded at 8 MiB, 250000 values, generic nesting depth 64,
256 patchers, patcher depth 24, 20000 boxes and 40000 cables. The generic nesting
limit can be reached before the patcher-specific limit. Recursive/shared object
inputs and malformed structure are rejected. Returned native documents retain
the existing 32-object, 64-cable, 64-KiB limits.

The study's runtime uses production `compile_canvas` and `CanvasRuntime` through
a research descriptor transport. It bypasses Rust preparation, browser/Tauri IPC
and the audio device, and does not execute Max or provide a Max timing oracle.
Appearance metadata belongs to the document/UI and is not evaluated by the
native runner. Desktop integration evidence, if collected separately, has a
different boundary and must be reported separately.

## Native Desktop Integration

`desktop-validation.json` records a separate built Tauri/WebKit test with real
X mouse input. It opens the original installed `slider.maxhelp` JSON through
the patch dialog, selects its basic tab, accepts the compatibility report and
imports 14 nodes/9 cables. Dragging imported slider 4 produces downstream
number 9 values 95 and 26 through Rust preparation and the native control runtime.
The test also exercises notch-adjacent toggle/button clicks and modifier numeric
and range dragging. It runs in a private X session without touching the user's
open window. Reproduce with:

```sh
bash apps/ultra/tests/check_canvas_desktop.sh --software-audio /tmp/ultra-max-import-desktop
```

The local licensed source is optional; `ULTRA_TEST_MAX_HELP` overrides its path.
The test records whether it is available. In the recorded run it was available
and the imported control branch executed. A separate original Ultra patch
verifies CPAL software audio; no audio or whole-help execution is attributed to
the imported help branch. This does not execute Max or establish Max parity.
