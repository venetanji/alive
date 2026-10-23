# Additional Control And List Object Map

This maps nine Max message classes and twelve practical `zl` modes that are not
covered as target classes by the two earlier ten-object maps. All 31 installed
`zl` mode references also receive a structural inventory; 19 have no behavioral
contract in this pass. The output records 41 unique XML files, 41 help files,
21 selected help anchors and 74 resolving XML citations.

`control-map.json` is the generated machine-readable evidence bundle.
`contracts.json` contains original behavioral notes, proposed bounded Ultra
contracts, uncertain cases and finite acceptance scenarios. `map-controls.py`
reads installed XML/help as data, validates citations and saved port shapes,
checks that target classes do not duplicate the earlier maps, and probes the
production Ultra authoring parser. No proprietary reference prose, creation
message text, complete help patch, helper source or artwork is redistributed.

## Current Ultra Boundary

All 21 selected message names, and the bare `zl` family name, are refused by
the current production authoring parser as unknown objects. These are admission
checks, not native behavior tests. Source identities for the registry, catalog
and native graph are retained by SHA-256.

Ultra's registry key `join` already means **audio `join~`**, with two mono inputs
and one stereo output. The parser accepts `join~` as that kind and rejects the
Max message spelling `join`. A new message implementation needs a distinct
kind, descriptor and authoring entry. Reusing the existing key would misroute
signal ports and change saved audio patches.

The earlier scheduler/migration contracts remain in
`../object-batch-next-20261021/`; the authored native scenarios and partial help
admission checks remain in `../help-next-20261021/`. This folder adds no timer,
whole-help execution or Max/native parity pass.

## Documented Interfaces

Numbers in the port column describe saved topology. For every selected `zl`
mode the help saves **2 inputs and 2 outputs**, even when the XML marks a port
inactive. Port indexes are zero-based; `zl.nth`'s data index is one-based.
An unknown creation default stays unknown rather than being inferred from a
help instance that explicitly supplies an argument.

| Class | Inputs / Outputs | Arguments, Messages And Active Roles |
| --- | --- | --- |
| `iter` | 1 / 1 | List atoms emit successively; numeric scalars pass; bang recalls. Help uses bare `iter`; the XML argument row is a template. |
| `spray` | 1 / N | N defaults 2, offset 0, listmode 0. Destination-tagged numeric input distributes right-to-left; -1 broadcasts; `offset` changes numbering; bare int reports an error. |
| `buddy` | N / N | N defaults 2. Wait for every inlet, then emit right-to-left; bang means 0; left `clear` deletes retained values. |
| `funnel` | N / 1 | N defaults 2, offset 0. Prefix each input with its inlet tag; bang recalls the inlet's stored number; `offset` and silent `set`. |
| `join` | N / 1 | N defaults 2, initial items are integer zeros. Variable-length per-inlet segments; `triggers` chooses hot inputs, -1 makes all hot. Bang at any inlet emits; `set` is silent. Trigger default is unstated. |
| `prepend` | 1 / 1 | Required symbol-led prefix; `set` replaces it silently. Constructed-message maximum 256 items is documented. Bang wording needs capture. |
| `append` | 1 / 1 | Optional suffix; `set` replaces retained message, bang recalls. What bang retains after ordinary input needs a trace. |
| `expr` | Up to 9 / 1 | Required expression; `$i`, `$f`, `$s` variables, initially 0. Hot left input/bang evaluates, cold inputs store; left list distributes then evaluates, `set` distributes silently. |
| `regexp` | 1 / 5 | Optional PCRE/replacement. Outputs substitution, captures, substrings, unmatched input and attribute reports. `re`, `substitute`, `tosymbol`, `binary`, `legacyoutputorder`. |
| `zl.group` | 2 / 2 | Collect into sized groups, retaining residual atoms; right size input; bang emits partial group; output 1 inactive. Initial numeric size unstated. |
| `zl.iter` | 2 / 2 | Sized consecutive list chunks; shorter final chunk allowed; right size input; output 1 inactive. Initial size unstated. |
| `zl.reg` | 2 / 2 | Optional initial list; left stores/emits, right stores silently, bang recalls; output 1 inactive. |
| `zl.join` | 2 / 2 | Optional initial right list; hot left segment plus cold right segment concatenate; bang emits; output 1 inactive. |
| `zl.len` | 2 / 2 | List length at output 0; input 1/output 1 inactive. Detailed per-mode method text contains placeholders. |
| `zl.nth` | 2 / 2 | One-based index, optional replacement; output 0 extracted atom, output 1 remainder or substituted list. Right input sets index/replacement. |
| `zl.slice` | 2 / 2 | Positive leading-slice size, also set on right input. Tail output 1 emits before leading output 0. Numeric initial size unstated. |
| `zl.rev` | 2 / 2 | Reverse atom sequence at output 0; input 1/output 1 inactive. XML creation argument is a template. |
| `zl.rot` | 2 / 2 | Positive distance rotates right, negative left; right sets distance; output 1 inactive. Numeric initial distance unstated. |
| `zl.sort` | 2 / 2 | Direction -1 descending, other values ascending; right sets order. Output 1 is reordered source indexes, not an inactive port. |
| `zl.queue` | 2 / 2 | Bang removes oldest FIFO item; output 1 is item count; input 1 inactive. List/message enqueue granularity needs capture. |
| `zl.stream` | 2 / 2 | Latest N atoms after warmup, then after later arrivals; readiness at output 1. Negative length reverses output; right sets length. Require explicit initial length pending capture. |

All selected `zl` modes declare `fuzzy` and `zlmaxsize`. The family reference
documents maximum-list-length default 256 and upper limit 32767. Most per-mode
attribute details are placeholders; no epsilon default is established. Runtime
`mode` switching, `zlclear` and `zlreset` are listed methods. Family prose says
`zlreset` preserves mode parameters that `zlclear` zeroes for `iter`, `nth`,
`rot`, `slice` and `sort`; group size survives either reset. Do not flatten these
into a universal reset operation without original scores.

`regexp` defaults to text rather than binary processing. `tosymbol` offers
0/1/2 output policies, but its initial value is not explicitly established by
this XML. Max 9.1 changed capture/substring outlet order: new objects use the
corrected order, while legacy saved patches retain a compatibility flag.
Binary mode emits count/group/done messages and is a separate protocol.

## Bounded Follow-Up

First capture original finite Max scores for `iter`, `buddy`, numeric `funnel`,
explicit-prefix/suffix objects and fixed-mode `zl.reg`, `zl.join`, `zl.len`,
`zl.iter`, `zl.slice`, `zl.rev`, `zl.rot`. Add message `join` only with a distinct
kind and explicit trigger inputs. These can use the existing synchronous
typed-message executor after their edge policies are measured.

The proposed initial Ultra limits are 2..8 multi-inlet slots, 1..8 spray outputs,
eight total typed atoms per retained/output list and the existing finite numeric
and ASCII symbol profile. These are proposed product bounds, not Max bounds.
Reject excess combined length before state mutation or partial output. In
particular, funnel's tag, join segments and prepend/append expansion consume
capacity. Immediate iteration must preserve downstream completion between
outputs and remain within a graph-wide event budget.

Next cover `spray`, `zl.group`, `zl.nth`, `zl.sort`, `zl.queue` and `zl.stream`:
their extra outlets, buffer semantics, partial groups, count/readiness flags,
index rules, equal-key order and reset behavior need ordered traces. The bundle
includes specific finite scenarios for each. Avoid deciding whether queue input
is a message or an atom from contradictory generic wording.

`expr` follows after a separately validated bounded expression parser and typed
numeric contract. The current literal parser rejects syntax needed by these
expressions. Keep tables, random/noise, extension functions and unsupported
operators explicit. `regexp` is last: choosing an appropriate PCRE engine,
quoting/UTF-8 policy, bounded matching and legacy-order migration precedes
admission. JavaScript regex semantics cannot establish Max compatibility.

## Evidence Limits And Reproduction

No Max/Wine process, app window, native graph, audio device, installed helper or
installed help graph was launched, modified or executed. Only production
authoring-name parsing was executed. Static help edges establish port usage,
not emitted message types, ordering or compatibility. Incidental target uses
in every historical corpus patch were not exhaustively searched, so this map
claims no retained Max oracle rather than claiming that none could exist.

Use licensed local Max resources and Node plus Python 3.9 or newer:

```sh
python3 experiments/max-reference/control-map-20261021/map-controls.py \
  --resources '/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources'
python3 experiments/max-reference/control-map-20261021/map-controls.py \
  --resources '/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources' \
  --check
```

`--check` regenerates in memory and requires byte-identical JSON, including
installed-source hashes, prior-map boundaries, authored contracts, generator
and Ultra source hashes. It fails if a researched name enters the current
authoring vocabulary so the unsupported boundary cannot silently go stale.
After related source changes, inspect the differences and regenerate. This
validates evidence integrity and reproducibility; it does not validate Max
behavior, native implementation or help compatibility.
