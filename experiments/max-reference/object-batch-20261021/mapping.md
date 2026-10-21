# Next Message, Control And UI Batch

This batch maps **int, float, flonum, slider, pack, unpack, select, route,
trigger and line** from the legitimate installed Max 9.1.5 reference XML and
core help JSON. `object-map.json` contains original implementation notes,
argument/method signatures, attribute defaults, saved port facts, file hashes,
whole-help token inventories and every nested declared dependency. It includes
no installed patch bodies, comments, scripts, media or documentation prose.

The ten installed help files parse as JSON and contain 523 boxes and 261
patchlines across 42 patchers. Each has a `p basic` tab. This establishes source
inventory, not execution. The separate help compatibility runner reports what
our canvas actually admits or rejects. This map performs no canvas execution.
The subsequent bounded implementations and tests are documented separately in
`runtime-batch.md`; source inventory alone does not certify Max compatibility.

## Interface Map

Port indexes are zero based. `N` means the selector or slot argument count,
with the documented no-argument defaults applied. Notes describe documented
behavior and pending acceptance work, not a claim of canvas behavior.

| Object | Creation And Default | Ports | Main Options And Behavior |
| --- | --- | --- | --- |
| `int` / `i` | Optional number, default `0` | 2 in, 1 integer out | Inlet 0 stores/emits; bang repeats; inlet 1 and `set` store silently. `send` uses named receivers without outlet output. |
| `float` / `f` | Optional float, default `0.` | 2 in, 1 float out | Same hot/cold shape as int; integer input becomes float. Preserve selector type and verify precision separately. |
| `flonum` | UI class; positional-argument XML is a placeholder | 1 in, numeric out + Tab bang out | `set`, `min`, `max`, `minimum`, `maximum`, `select`; drag/typed commits; `mouseup`, `cantchange`, `outputonclick`, `numdecimalplaces`. |
| `slider` | UI class; `size=128`, `mult=1`, `min=0`, `floatoutput=0` | 1 in, 1 numeric out | `set` is silent; `setminmax` enables float mode. Range, multiplier, offset, orientation and relative drag are separate settings. Drag range does not imply numeric input clipping. |
| `pack` | Typed initial slot atoms; default `0 0` | N in, 1 out | Only inlet 0 triggers output; later inlets store. Lists update successive slots. `set`, `nth`, `send`; retain untouched slots on short updates. |
| `unpack` | Outlet type atoms; default two integer outlets | 1 in, N out | Distribute/coerce list atoms; stored bang recall, short/excess list behavior and right-to-left order need the ordered trace contract. |
| `select` / `sel` | Mixed selector atoms; default `0` | N+1 out; input count has conflict below | Matching first item produces bang; unmatched input retains its original message. `matchfloat` (`exact` alias), `fuzzy`; duplicate numeric match chooses leftmost. |
| `route` | Mixed selector atoms; default `0` | N+1 out; saved help has N+1 in | A matching selector is removed; empty remainder becomes bang. Entire unmatched input goes right. Additional inlet roles remain unmeasured. |
| `trigger` / `t` | Formats `i f b l s` or constants; default `i i` | 1 in, N out | Synchronous right-to-left output; preserve typed conversions, zero/empty-symbol cases and literal constants. |
| `line` | Optional initial `0`, grain `20` ms | 3 in, numeric out + completion bang | Target, duration, grain; target/time pairs; `set`, `stop`, `pause`, `resume`, `clock`; `floatoutput=2`, `compatmode=0`, `maxpoints=129`. |

All direct XML attribute signatures and default lexemes are retained in
`reference.attributes`, including appearance fields. The default is read from
the nested metadata attribute's `value`, rather than its empty text node. This
corrects the empty-default extraction in the earlier focus inventory without
changing that historical file. Attribute names do not by themselves establish
that an option is meaningful or implemented in the canvas.

## Source Conflicts To Resolve

- `select`: the XML says a second inlet exists for a single integer selector
  or no arguments, but its installed float example saves **two inlets**. Keep
  both facts; probe single float, symbol, integer and multiple-selector cases
  before defining importer port creation.
- `route`: the XML has two template inlet rows, while the installed instances
  save **N+1 inlets** for N selectors. For example, its two-selector basic
  instance has three saved inlets. Existing route capture exercises inlet 0;
  it establishes no contract for those additional inlets.
- `slider`: the `relative` prose describes relative mode as default, while
  nested attribute metadata records `value="0"`. Verify the actual instance
  default and drag behavior before selecting a canvas default.
- `line`: initial argument type is insufficient to summarize output behavior.
  `floatoutput` defaults to auto; the XML also describes conditional float
  output for a short distance and small step. Grain arguments below 1 reset
  to 20 according to argument prose, while grain attribute prose specifies a
  minimum of 1. Probe each configuration path separately.

The shipped `INLET_TYPE`, `OUTLET_TYPE`, `OBJARG_*` and `TEXT_HERE` markers are
templates. The normalized map does not treat them as actual type or argument
requirements. Saved `outlettype=""` similarly does not mean no messages.

## Installed Help Dependencies

Every file declares `helpdetails.js`, `helpname.js` and `helpstarter.js`.
`int`, `float`, `pack`, `unpack`, `select`, `route`, `trigger` and `line` also
declare `helpargs.js`. All four names resolve uniquely under
`help/resources/` in this installation; JSON retains each dependency's relative
path and SHA-256. Nested `dependency_cache` entries are included. Script bodies
and their dynamic or transitive loads are not resolved or executed.

| Help | `p basic` Direct Tokens, Including Support UI |
| --- | --- |
| `int` | button, comment, i, int, jsui, message, number, r, slider |
| `float` | *, button, comment, f, float, flonum, jsui, message, r, slider |
| `flonum` | comment, flonum, jsui, message, number, print |
| `slider` | button, comment, flonum, jsui, message, number, slider |
| `pack` | button, comment, flonum, jsui, message, number, pack, umenu |
| `unpack` | button, comment, jsui, message, unpack |
| `select` | button, comment, jsui, number, sel, select, slider |
| `route` | button, comment, jsui, message, print, route, textbutton |
| `trigger` | button, comment, flonum, jsui, message, print, t, trigger |
| `line` | button, comment, flonum, jsui, line, message, number, textbutton |

These are exact token sets from the installed basic tabs, not resolved class
identities or runnable adapted examples. Whole files also contain the help
scripts, other tabs and authoring metadata. Implementing the target object
alone therefore does not make its entire `.maxhelp` run in our canvas.

## Evidence And Implementation Order

Eight objects link existing original Max captures: `01-trigger`, `04-int`,
`05-float`, `07-flonum`, `08-pack`, `09-unpack`, `10-select` and `11-route`.
Their finite scores and raw/expected traces remain the semantic references.
The earlier UI probe records locked slider output. There is no retained
message-ramp `line` baseline. No Max session was started for this map.

Those captures used Max 9.1.5 Windows x64 under Wine, standalone scheduler,
DSP off. They cover only their scores. The JS logger loses int/float identity
inside list atoms and did not retain the Max Console error channel. No output
therefore cannot establish successful acceptance or silent rejection. See
`../docs/semantic-gaps.md` for the full capture boundary.

The following was the implementation order recommended by the inventory. The
native batch now adds these mechanisms, with remaining unsupported behavior
listed in `runtime-batch.md`.

1. Establish a typed message executor and clock lifecycle independent of audio.
2. Implement `int`, `float` and `trigger`; compare ordered traces, then add
   cold-inlet, alias and conversion cases. Keep unsupported inputs explicit.
3. Add `pack` and `unpack` with typed slots, hot/cold behavior, short/excess
   list handling, stored state and outlet ordering.
4. Add `select` and `route` after resolving the inlet conflicts; cover message
   categories, selector matching, stripped remainder and options.
5. Add `flonum` and `slider`: first message behavior, then locked/temporary
   operation, bounds, drag, focus and keyboard interaction with DSP off.
6. Capture an original `line` Max oracle before implementing a message clock,
   mode/grain behavior, completion, interruption, pause/resume and segments.

For each object, ship an original minimal runnable example with finite inputs
and expected outputs. Compare that case separately from installed whole-help
admission and execution; never count the original example as a whole-help pass.

Rebuild metadata with a local licensed installation:

```sh
python3 map-batch.py --resources /path/to/Max/resources
```

The command only reads installed files and writes `object-map.json` by default.
Use `--output /tmp/object-map.json` to verify deterministic reproduction.
