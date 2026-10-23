# Message And Number Runtime Evidence

Two original finite fixtures ran in installed Max 9.1.5 under Wine 11.13 on
2026-10-22 Asia/Hong_Kong (2026-10-21 UTC). `message-ui` contains 185 inputs and
490 collected rows; `message-display` contains 12 inputs and 41 rows. No original
help patch, helper code, proprietary asset, or preference file is copied here.

`results/*.jsonl` are raw captures. `summary.json` indexes every input and its
output rows, preserving raw sequence anchors. `screenshots/display-contact-sheet.png`
is a derived crop montage; the 12 original full screenshots are beside it.
The two `event_18*.png` images accompany the physical Tab observations.

## Message Contract Observed

The injector uses JS outlets wired directly to each target inlet. It does not
bang a message feeder, so `$1` and `$2` reach the target literally. The display
follow-up also taps those injector wires. This resolves an ambiguity in the
older `12-ui-message` capture, whose `new $1` feeder itself substituted `$1`
before delivering the cold message.

| Input / State | Observed Result | Evidence |
| --- | --- | --- |
| Authored `saved $1 $2`, initial bang | `saved 0 0` | `message-ui` event_0 |
| Hot int4, float3.75, list8 9 | `saved 4 0`, `saved 3.75 0`, `saved 8 9` | event_1 through event_3 |
| Hot list pear6, symbol apple, anything other2 | `saved pear 6`, `saved apple 6`, `saved other 2` | event_4 through event_6 |
| Cold `new $1 $2` | Silent; display changes to `new $1 $2` | event_7; display_2 |
| Hot9 after that cold replacement | `new 9 2`; bang repeats it | event_8 and event_9 |
| Cold numeric-leading list5 pear2.25 | Silent; display `5 pear 2.25`; hot9/bang emit that list | event_10 through event_12; display_4 |
| Cold float6.25 | Silent; later hot/bang emit float6.25 | event_13 through event_15 |
| Cold symbol kiwi | Silent; display `symbol kiwi`; later hot/bang emit selector symbol with atom kiwi | event_16 through event_18; display_5 and display_6 |
| Cold bang | Silent; display `bang`; later hot/bang emit bang | event_19 through event_21; display_7 |
| Hot `set fresh $1 $2` | Silent; subsequent list11 12 emits `fresh 11 12`; bang repeats it | event_25 through event_27 |
| Hot `set 1 apple` | Silent; subsequent hot/bang emit list1 apple | event_28 through event_30 |
| Hot bare `set` | Silent; clears display and suppresses subsequent hot/bang output | event_31 through event_33; display_9 |
| Authored empty message | No output for initial bang/int/float/list/symbol/anything | event_34 through event_40 |

Substitution memory is stateful: omitted replacement arguments retain earlier
values, and changing a nonempty template through the cold inlet does not reset
those argument values in the observed case. Bang recalls the latest substituted
arguments. In contrast, inputs sent while the initially empty box has no
template do not establish the later second argument: event_42 emits `new 9 0`.
These are finite cases; they do not establish all transitions through empty
templates or placeholder-count changes.

Screenshots establish that hot substitution leaves the displayed template
literal: `saved $1 $2` remains visible after list8 9; `new $1 $2` remains after
hot3. Hot `set fresh $1` displays `fresh $1`, which remains after hot7. The
display is not the last emitted substituted message.

**Empty-list limitation:** `outlet(..., "list")` with no atoms produced no
delivery-tap row in display_8. The corresponding first-fixture events therefore
do not establish a target-side empty-list method. They must not be implemented
as evidence that cold empty-list means bang or clear.

Message `getvalueof()` and `getattr("text")` returned null in this JS interface.
Those null snapshot fields do not mean empty content. Display claims above use
screenshots, and output claims use collected outlet messages. Physical text
editing and save/reload persistence were not tested.

## Number And Storage Contract Observed

The authored `number` and `flonum` each have one inlet and two outlets. No
nonexistent cold inlet is wired to either UI object. Cold storage belongs to
the separate `int` and `float` objects in this fixture.

- `number` truncates 3.9 to int3 and -3.9 to int-3. Numeric-leading multi-atom
  lists emit twice: list4 5 emits int4 twice; list6.75 kiwi emits int6 twice.
  Symbol kiwi emits nothing and preserves the current value. See event_102
  through event_109; the original 06-number baseline agrees.
- `set 12` is silent; bang emits int12. Dynamic min-2/max2 clamp stored state
  silently and subsequent input/output; `set 8.9` stores the clamped int2.
  Bare min/max remove those bounds; float9.9 then emits int9. See event_108
  through event_118. The separate bounded number starts with minimum-5/maximum5.
- `flonum` retains fractional output and follows the observed silent set/bounds
  and duplicate-list pattern. See event_140 through event_158.
- Sending selector `tab` emitted nothing. Sending `select`, then a physical
  XTest Tab key on the private display emitted exactly one bang from outlet1
  for each UI control. See event_183 and event_184. This qualifies the physical
  action; an implementation may use a private internal event to represent it.
- `int` cold float8.75 stores int8 silently; `float` stores float8.75 silently.
  Hot `send message_ui_probe` delivers that stored typed scalar to both named
  receivers without emitting from the storage object's outlet. Silent set
  -4.75 changes subsequent sends to int-4 / float-4.75. See event_159 through
  event_178. Receiver arrival order in this run is B then A; this is not a
  portable receiver-order guarantee.
- Cold `send name`, hot `send` with no argument, hot `send 42`, and send to an
  absent name produce no captured outlet/receiver output in these cases. A
  later bang confirms the stored value is unchanged. Console errors were not
  collected, so silent acceptance versus rejection is not established.

## Scope And Implementation Boundaries

This evidence supports a bounded literal message subset with cold replacement,
empty display, silent set, and optional explicit `$1`/`$2` template support.
It does not qualify arbitrary placeholder indexes, comma/semicolon commands,
quoting/escaping, `$0` or patcher-instance expansion, dictionaries, arrays,
large messages, numeric overflow, transport, reversed bounds, alternate number
formats, or print popup behavior. Those need their own contract or refusal.
Ultra's eight-atom, 31-byte-symbol, 127-byte-text, and finite numeric bounds are
local design limits, not Max limits established by this probe.

The existing native `Number=2` stores fractional values with two inlets and one
outlet, so replacing it silently would change saved-document behavior. Preserve
that kind/profile or migrate explicitly. Existing `Message=1` is literal-only;
an initially empty compatible box needs a distinct empty state from bang.
Runtime message display content, substitution arguments, and canonical authored
text are distinct state. This probe does not decide when runtime changes should
dirty an Ultra document or enter authoring history.

## Isolation, Provenance And Reproduction

`environment.json` records binary hashes, prefix identity, sessions, cleanup,
and settings limits. The prefix is a fresh task-specific reflink clone of an
already disposable reference prefix. Its copied user profile has no symlinks.
Both runs use dynamic private Xvfb displays, the existing wine-d2d1 runtime,
and software rendering. Neither run launches the original user prefix. Both
complete with ordinary Ctrl-Q and termination of their owned Xvfb. An exact
prefix process scan is empty after each run. No reauthentication, activation,
license changes, preference commands, or production rebuild was performed.

REA process evidence is retained in `rea-process-evidence.json` and
`rea-display-evidence.json`, with IDs
`ev_3aa98415a5d63d5c52ffaa31280377d9cf49d86f755a4a851374c1e65777e546` and
`ev_df810b489e8dddcf06f2d296589e97d2c3d42f9003300acb80543428f0acb160`.
These attest to the controlled runner process; the separately hashed Max/Wine
binaries and raw JS captures provide target-specific provenance. REA process
trees are sampled, inherited environment/network effects are not fully
observed, and inaccessible unrelated processes were left untouched.

The JS collector records arrival order, not scheduler priority or proven
causality. `input_id` names the current finite stimulus window. Scalar selector
int/float is preserved; JS numeric atom types inside lists are not. DSP,
overdrive, sample rate and scheduler-in-audio-interrupt were not queried; these
fixtures contain no audio commands. This is finite observed behavior, not
whole-object or whole-help certification.

Generate inputs with `python3 generate.py` and `python3 generate-display.py`.
Validate/index retained results with `python3 summarize.py`. To capture again,
use a new result directory or fixture identity and a new disposable prefix;
the runners refuse to overwrite an existing raw capture. Remove only the
previous run's transient `results/keyboard-request.json` before a separate
visual run. Pass the new prefix, the existing wine executable, and a new work
directory to `run-runtime.py` / `run-display.py`. Do not use an original prefix.
The runners use ordinary Quit; their fallback terminates only the recorded
launcher PID after checking its exact prefix identity.
