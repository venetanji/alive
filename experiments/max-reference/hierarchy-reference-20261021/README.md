# Max Hierarchy And Whole Help Dependencies

This directory contains original analysis, source identities, and two finite
original probes of the installed Max 9.1.5 Windows x64 runtime under Wine 11.13.
It includes no installed help patch, documentation body, script, media, binary,
or license material. Static facts and observed execution are separated.
These captures do not execute a complete installed help file and do not change
the historical full-help conformance count of0/2103.

## Public checkout and optional local evidence

This public checkout retains the original probe generators and JavaScript, but
not `sources.json`, `bundle.json`, `summary.json`, generated patch files or raw
hierarchy captures. The historical observations below describe local evidence;
they are not newly reproduced results or public conformance passes.

Public CI runs original portable resource, import, graph and hierarchy tests.
The import module loads installed-source identities only when local resource
verification is requested; portable tests supply independently authored data and
explicit fixture hashes. Production recognition remains bound to the existing
installed-source hashes, and resource/helper byte checks remain mandatory.
Missing local identities produce an explicit error rather than recognition.

`verify.py --allow-unavailable` reports `UNAVAILABLE` only when the entire local
oracle output is absent. Partial outputs fail. If a bundle is present, exact
whole-bundle identities and the retained-capture summary must both pass; changed
or extra files still fail. The strict default continues to reject absent
bundles. No portable fixture is labeled as a Max observation. Reproduce local
evidence only against separately licensed resources with the commands below;
do not publish installed patches, helpers, binaries or documentation bodies.

## Whole Help Source Facts

`sources.json` identifies the complete installed `append`, `prepend`, `int`, and
`float` help JSON by SHA256. It inventories every patcher and box with JSON
anchors, saved ports, UI positions, script filenames, arguments, and dependency
identities. Text bodies are hashed, not copied. All four roots have four boxes
and no patchlines: a `js helpstarter.js` box, a `p basic` box, a `helpname.js`
jsui, and a `p ?` box. Both child patchers have `showontab=1`. Their current
`?` patchers are empty; Basic contains the examples and two jsui boxes for
details and arguments. Whole-tree totals are:

| Help | Patchers | Boxes | Patchlines |
| --- | ---: | ---: | ---: |
| append | 3 | 19 | 9 |
| prepend | 3 | 18 | 9 |
| int | 3 | 25 | 10 |
| float | 3 | 27 | 12 |

The local helper scripts were inspected as shipped artifacts, not executed.
Source hashes are recorded under `scripts`. `helpstarter.js` schedules a task
after100ms. It looks up scripting names `basic_tab` and `q_tab` and constructs
the corresponding patchers/header if absent. All four investigated saved
roots already contain both names, so that creation path is not required for
their existing saved shapes. General script behavior remains a separate
runtime dependency. The three jsui helpers paint the name, reference digest
and description, and object argument information; the latter two use Max's
reference dictionary. They also consult patcher theme colors. These boxes
cannot be silently removed while claiming the complete help UI works.

The `int` and `float` Basic tabs additionally depend on named `receive` delivery
for their `send goom` examples, aliases `i`/`f`, hot/cold inlets, number UI,
sliders, and buttons. `float` also uses multiplication. `prepend` examples use
`print @popup 1` and console output. `append` needs message-box display updates
as well as its target method handling. Complete-help operation therefore
includes support UI and messaging, not only instantiating the file's named
object. Exact token sets and all anchors are recorded in `sources.json`.

## Runtime Connector Findings

`fixtures/hierarchy.maxpat` and its sibling abstraction are original authored
inputs. `results/hierarchy.jsonl` retains42 actual rows for17 scored events.

- Parent port order follows child connector x position ascending in the tested
  saved files. Contradictory saved1-based `index` values do not override it.
- For equal x, y is ignored in these probes. Saved box-array order breaks the
  tie; reversing that array reverses the observed parent port mapping.
- The same observations hold for both inlet and outlet mapping. The fixture
  tags each branch, avoiding an apparent pass caused by two reversed maps
  canceling each other.
- A direct top-level file and its embedded `p` patchers retain literal `#0`
  and `#1` tokens. An external abstraction receives its own unique `#0`, binds
  `#1` and `#2` to its creation arguments, and replaces missing `#3` with0.
- An embedded `p` inside an abstraction inherits its enclosing substitutions;
  its own arguments after the subpatcher name do not establish new bindings.
  Prefixes such as `#0-tail` and `#1-tail` expand; `tail-#0` and `tail-#1` remain
  literal. Both `loadmess` arguments and message-box text were exercised.
- `pcontrol open/close/open` preserves a child's stored integer77 and produces
  no additional startup messages. Explicit `loadbang` sent to that child's
  `thispatcher` retriggers its local `loadmess`; it does not retrigger the
  nested grandchild's `loadmess` in this fixture.
- On initial load, the grandchild reports before its parent, and all children
  report before the root. Sibling order is retained as evidence, not promoted
  to a general compatibility guarantee.

Installed source citations are in `sources.json`: `patcher.maxref.xml`
discussion and `showontab`; inlet/outlet descriptions and mouse methods;
loadbang/loadmess descriptions and methods; thispatcher `front`, `loadbang`,
`dispose`, and `setactivetab`; pcontrol `open`, `close`, `load`, and
`loadunique`. The compiled userguide content is hashed and identified by
heading, never evaluated. Relevant anchors are
`patcher_lifecycle#subpatchers`, `#object-initialization`,
`#patchcord-connection`, `#parameter-initialization`, `#loadbang-and-loadmess`,
`#window-activity`, and `#patcher-arguments`; `abstractions#arguments-and-attributes`
and `#unique-identifiers`; and `subpatchers#inlets-and-outlets` and
`#abstractions-vs-subpatchers`.

These official sources describe separate creation, connection, parameter,
restoration, startup-message, window, patcher-argument, and DSP phases, with
children preceding parents within a phase. Existing observed capture
`../expected/13-initialization.json` independently records parameter17, child
loadbang, then root loadbang. A window becoming visible is therefore not a new
patch instance or an automatic initialization event.

## Signal And Message Boundaries

`fixtures/boundary.maxpat` is an original11-channel signal/control probe.
`results/boundary.jsonl` retains468 actual message rows for62 scored events.
Three float32 buffer captures each retain64 frames in11 channels:2112 samples.
The private runtime selected the NonRealTime audio driver,48000Hz,64-frame
signal vectors,512-frame I/O vectors, overdrive0 and takeover0; final DSP is0.
No hardware audio driver was used by the authored score.

| Boundary To `+~ 10` | Initial | Numeric 7 | Numeric 9 |
| --- | ---: | ---: | ---: |
| Bare relay, no input signal | 10 | 7 | 9 |
| Bare relay, input `sig~3` | 13 | 10 | 12 |
| Inlet to inner `+~10`, no signal | 10 | 7 | 9 |
| Inlet to inner `+~10`, input `sig~3` | 13 | 10 | 12 |

The numeric inputs set the operator's scalar operand, matching the existing
arithmetic reference;7 is not expected to add to the original argument10.
Child inlet fanout to a number box, two child inlets feeding the same
operator, and another embedded level produce the same DSP values. An internal
`sig~5` through an outlet records5 throughout. An undriven generic relay
therefore does not create an active zero signal that suppresses scalar state.

Generic relays preserve both domains. Even when a parent outlet carries the
incoming `sig~3`, subsequent int7 and int9 pass through to a number box and a
direct JS tap outside the subpatcher. An inlet fanned to an internal number
box similarly forwards those numeric messages through a separate outlet.
Audio samples themselves do not cause number-box outputs. A parent outlet
driven by the actual `+~` has no numeric control output for these inputs.
Print boxes were connected to the parent outlets, but print's console text
was not machine-collected; assertions cover the JS and number outputs.

Each DSP start also sends a `signal` selector to direct JS taps on observed
signal-bearing parent outlets. The undriven bare relay emits no such marker.
This is retained runtime behavior, not a claim that Alive implements the
announcement. Effective signal connectivity must follow real upstream signal
sources across hierarchy without replacing ordinary control routing.

## Architecture Implications

Preserve the entire authoring tree, box-array order, comments, unsupported
boxes, patchlines, metadata, and tab membership. Runtime IDs must be qualified
by patcher ownership because saved IDs repeat across levels. The document owns
the graph; child windows and help tabs are views of its patchers. They share
one runtime instance and retain state while hidden or closed. Closing a child
view must not unregister its receivers, destroy DSP, or rerun initialization.

Compile generic inlet/outlet boundaries as message relays plus signal paths.
Determine active signal sources across nested boundaries before evaluating
scalar fallback. Do not mark every relay as an active source. Preserve
message delivery on a boundary carrying signal, and retain the distinction
between a relay forwarding numeric messages and an MSP operator emitting
audio only. Existing flat signal/control validation still applies inside the
qualified graph; hierarchy does not itself establish feedback compatibility.

Handle initialization in explicit document phases, distinct from opening a
view, changing tabs, committing edits, or restarting DSP. External abstraction
binding contexts are distinct from embedded-patcher ownership. They need a
separate instance namespace and inherited substitution context. No claim is
made here that loadbang, abstractions, arbitrary scripting, or all2103 help
files have been implemented.

## Provenance And Reproduction

The Max and Wine executable hashes, private session PIDs/displays, capture
timestamps, and runtime-log hashes are in `environment.json`. Max was launched
only in a new reflink clone of the earlier disposable list prefix, using its
own Xvfb and software llvmpipe renderer. Copied home-folder symlinks had already
been replaced by empty directories; the new clone was checked before launch.
The original installation, projects, preferences, user desktop and original
Wine prefix were not launched or edited. No activation, authorization, save,
or license modification was attempted. Ordinary Quit ended both owned Max
sessions. Exact-prefix process checks were empty before cleanup.

Static source verification and retained-capture verification do not launch Max:

```sh
python3 experiments/max-reference/hierarchy-reference-20261021/inventory.py --check
python3 experiments/max-reference/hierarchy-reference-20261021/summarize.py --check
python3 experiments/max-reference/hierarchy-reference-20261021/verify.py
```

Original fixture generation is separate from execution:

```sh
python3 experiments/max-reference/hierarchy-reference-20261021/generate.py
python3 experiments/max-reference/hierarchy-reference-20261021/generate-boundary.py
```

The signal fixture generator imports the existing original recorder builder
from `../signal-runtime-20261021/generate.py`; no installed content is copied.
For a legitimate local runtime rerun, archive raw captures first, create a
new disposable prefix, and never point the runner at an original profile:

```sh
python3 experiments/max-reference/hierarchy-reference-20261021/run-runtime.py \
  --fixture boundary --prefix /path/to/new-wine-disposable \
  --wine /path/to/pinned/wine --work /path/to/private-boundary-run
python3 experiments/max-reference/hierarchy-reference-20261021/run-runtime.py \
  --fixture hierarchy --prefix /path/to/new-wine-disposable \
  --wine /path/to/pinned/wine --work /path/to/private-hierarchy-run
```

The runner refuses existing raw result files and original `.wine` or
`.wine-ableton` profile names. The collector's ordered message boundary is JS
arrival, not a scheduler timestamp. These finite observations do not cover
signal feedback, native Windows/macOS behavior, bpatcher, MC, poly~, Jitter,
abstraction DSP, or arbitrary dynamic dependencies. No REA tool was exposed;
this is direct local JSON/XML/script inspection and actual private runtime
execution, not REA-generated evidence.
