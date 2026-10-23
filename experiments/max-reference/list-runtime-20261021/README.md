# Max List Object Runtime Scores

These are six original finite probes of the installed Max 9.1.5 Windows x64
runtime, executed under the pinned Wine 11.13 distribution in an owned
disposable prefix and private Xvfb. They cover `iter`, `prepend`, `append`,
`zl.reg`, `zl.join`, `zl.len`, `zl.iter`, `zl.slice`, `zl.rev` and `zl.rot`.
This is bounded runtime evidence. Full installed-help conformance remains
**0 / 2,103**; these scores do not execute any complete installed help patch.

## Evidence And Scope

| Original Fixture | Inputs | Raw Rows | Native Replay |
| --- | ---: | ---: | ---: |
| `list-objects` | 411 | 1,084 | 411 |
| `list-edge` | 71 | 148 | 71 |
| `list-followup` | 90 | 270 | 88 |
| `iter-recall` | 41 | 180 | 41 |
| `list-cold` | 61 | 202 | 61 |
| `list-precision` | 42 | 164 | 42 |
| Total | 716 | 2,048 | 714 |

`fixtures/` contains our patches, ordered scores and JS collector. `results/`
retains actual Max JSONL, including timestamps and typed top-level selectors.
`normalized-*.json` maps object creation text and target identity to each scored
input and its ordered expected outputs. Every message-box outlet also reaches
a separate `$delivery` logger. `delivery=false` records an authored message that
the message box suppressed, and the native replay correctly sends no target
event. Direct JS calls isolate genuine target-level empty lists.

`comparison.json` records **714 / 714** matching native replay cases, compiler
identity and hashes of the source headers that were compiled. It checks ordered
outlets, selectors, scalar integer/float identity, atom counts and atom values.
The collector cannot preserve numeric int/float tags inside a list; those tags
are explicitly unknown and are not compared. Timestamps and JS arrival order
do not prove priority, scheduler timing, latency or arbitrary reentrancy.

Two `list-followup` cases for `iter-reentrant-size` are explicitly excluded from
the single-target native replay. Their original Max topology sends each output
through `t b` and message `3` back into the cold size inlet. Eight `$feedback`
records confirm delivery. Both the active seven-atom burst and its subsequent
bang use two-atom chunks. The native list suite separately exercises the same
effect using supported named-message feedback; that test is not counted among
the 714 replay cases. Other feedback, nested replacement and Max graph cycles
remain outside this evidence.

## Observed Decisions

- Bare `prepend` preserves the input's scalar/list/selector identity. `prepend
  list` forces a list, including singleton lists; numeric prefixes also work.
  A nonempty prefix appends literal `bang` when triggered by bang. `set` replaces
  the prefix silently; empty `set` restores pass-through.
- `append` bang is silent, including after data or `set`, in this Max build.
  This contradicts the installed XML's bang prose; the actual finite scores
  take precedence. An empty suffix preserves explicit singleton lists and
  scalar types. Appending to a symbol-headed explicit list preserves `list`.
- Zl output converts a symbol-headed sequence into an arbitrary selector and a
  single numeric atom into an integer or float scalar. The explicit message
  `symbol apple` contributes two sequence atoms for these operations: `symbol`
  and `apple`; it is not interchangeable with `list apple`.
- True empty-list target input clears stored input. `zl.len` emits and recalls
  zero; `zl.join` emits its retained right segment; other tested zl transforms
  and `iter` emit nothing. The authored message-box text `list` itself emits
  nothing and therefore cannot test this behavior without a direct target call.
- Zl operation defaults are zero: `zl.iter` emits no chunks, `zl.slice` emits
  the entire input on its right outlet, and `zl.rot` preserves order. Right
  numeric-head lists consume their first atom even with a symbolic tail;
  floating sizes truncate, symbolic heads set zero, and iter/slice clamp
  negatives to zero. Hot bang recomputes the retained source with the current
  cold parameter. Slice emits the right half before the left and suppresses
  empty halves.
- `zlclear` clears stored lists and resets the operation parameter to zero.
  `zlreset` clears stored lists while preserving that parameter. Both act from
  the cold inlet as well. A `set` message is ordinary list data for zl objects.
- `iter` immediately emits an arbitrary selector followed by its arguments.
  Subsequent bang recall depends on prior storage growth: when adding the
  selector exceeds retained capacity, recall omits the selector; otherwise it
  retains it. Independent fresh-target and growth scores reproduce this. A
  bounded capacity model that reserves `max(new count, old capacity * 2)` matches
  every retained case up to eight atoms. This is an inference from observable
  behavior, not a claim about Max's implementation or memory allocation.

## Inventory And Provenance

`help-usage.json` resolves classic `zl mode` spellings as well as dotted names
against SHA-256-matched originals from the frozen help inventory. These ten
targets occur **1,028 times across 302 of the 2,103 help files**. These are usage
weights for prioritization, not execution or conformance counts. Supporting
patches are counted separately. `sources.json` retains reference XML/help source
identities and hashes without redistributing their bodies.

`environment.json` pins the Max/Wine executable identities and isolation. These
message-only probes did not query DSP, sample-rate or scheduler settings, so
those fields remain null. No authored DSP/device/start/stop command ran. The
original installation, user desktop, projects and preferences were untouched;
no activation, license change or authorization bypass occurred. Software
llvmpipe rendering was needed to keep the private Max session running. The
final private process required a PID/prefix-checked SIGTERM after ordinary Quit
did not finish; its private Xvfb then stopped.

No installed patch, script, media, artwork, binary or documentation body is
included. The documented reference links are
https://docs.cycling74.com/reference/iter/,
https://docs.cycling74.com/reference/prepend/,
https://docs.cycling74.com/reference/append/ and
https://docs.cycling74.com/reference/zl/.

## Reproduce

Integrity and native comparison need no installed Max:

```sh
python3 experiments/max-reference/list-runtime-20261021/verify.py
python3 experiments/max-reference/list-runtime-20261021/compare-native.py --output /tmp/list-comparison.json
```

Native comparison creates and compiles a temporary C++ runner against the
current production headers, requires no JSON library, reports every mismatch
and returns a failing status if any compared case differs. It asserts scalar
types through selectors but deliberately does not invent numeric list tags.
Run it again after native code changes; the retained report pins a prior run.

To regenerate authored input and source inventory, use a legitimate local Max
installation and the exact frozen corpus. Generation does not launch Max:

```sh
python3 experiments/max-reference/list-runtime-20261021/generate.py --resources /path/to/Max/resources
python3 experiments/max-reference/list-runtime-20261021/inventory.py --resources /path/to/Max/resources --check
python3 experiments/max-reference/list-runtime-20261021/verify.py --installed /path/to/Max/resources
```

For actual Max execution, create a fresh disposable prefix on the same Btrfs
filesystem with `cp -a --reflink=always`; use a new destination and replace the
copy's home-folder symlinks with empty directories. Never use the original
profile or an existing user session. Archive generated results before reruns;
the runner refuses to overwrite raw evidence. Run one fixture at a time:

```sh
python3 experiments/max-reference/list-runtime-20261021/run-runtime.py \
  --fixture list-objects --prefix /path/to/wine-disposable \
  --wine /path/to/pinned/wine --work /path/to/private-run-logs
python3 experiments/max-reference/list-runtime-20261021/normalize.py
```

The runner allocates its own private Xvfb, refuses an existing Max instance in
the selected prefix, and tries ordinary Quit after capture. If Quit stalls it
terminates only its own PID after verifying the disposable prefix identity.
After intentional evidence changes, inspect the new raw/normalized results and
native comparison before refreshing `bundle.json` with
`python3 experiments/max-reference/list-runtime-20261021/verify.py --refresh-manifest`.
