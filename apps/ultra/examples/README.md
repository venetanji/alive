# Native Object Examples

These are original Ultra patches, authored for the supported native object
subset. They contain no installed Max help content. Use File / Open and choose a
`.ultra` file to open its own native window. Lock the canvas with Ctrl/Cmd E to
operate its controls. Control examples work with audio stopped; browser preview
only edits documents. Signal examples require Start audio to evaluate DSP, even
when their only output is a console observation. Help & Examples in the app
offers 125 original entries: help and an example for all 62 supported objects,
plus the starter. This directory also provides standalone control, list and
signal-object examples.

| File | Action And Expected Behavior |
| --- | --- |
| `int.ultra` | Click `12.75`: the bottom floating-point box shows `12`. The `int` hot inlet truncates toward zero. |
| `float.ultra` | Click `12.75`: the bottom box retains the fraction. |
| `subtract.ultra` | Click `7` to print floating-point `5` for `7 - 2`. Click the cold `4` control, then bang: the result becomes `3`. |
| `divide.ultra` | Click `7` to print floating-point `3.5` for `7 / 2`. The cold `4` control is silent; bang then prints `1.75`. |
| `modulo.ultra` | Click `7` to print integer `1` for `7 % 3`. Set the cold operand to `4`, then bang to print `3`. |
| `reverse_subtract.ultra` | Click `7` to print floating-point `3` for `10 - 7`. The cold `4` control followed by bang changes the result to `-3`. |
| `reverse_divide.ultra` | Click `7` to print floating-point `2` for `14 / 7`. The cold `4` control followed by bang prints approximately `0.571429`. |
| `abs.ultra` | Click `-7.5` to print floating-point `7.5` directly to Console. |
| `number_int.ultra` | Click `-3.9`: the integer box shows `-3` and prints it to Console. Tab from its value input prints `bang` under `physical-tab`; an incoming message named `tab` does not. |
| `flonum.ultra` | Click `1.25`, or edit the bounded numeric box. Tab from that box flashes the bang on its second outlet. |
| `slider.ultra` | Move the slider through 0..100. Its numeric output appears in the floating-point box. |
| `pack.ultra` | Edit the middle and right top boxes first, then the left box. Only the left field triggers a complete list; the three bottom boxes show the stored fields. The right field retains its fraction. |
| `unpack.ultra` | Click `12 34 5.5`: the three bottom boxes show the corresponding typed fields. |
| `select.ultra` | Move to 3 or 7 to flash the corresponding match bang. Other slider values appear at the unmatched outlet's number box. |
| `route.ultra` | Click `note 64 100`: the two left bottom boxes show 64 and 100. Click `color 7`: the right box shows 7. Routing strips the matched selector. |
| `trigger.ultra` | Click `12.75`: outlets execute float, integer, bang, from right to left. Numeric boxes show 12 and 12.75; the bang flashes. |
| `line.ultra` | Click `100 500` or `0 500`: the slider and number follow a 500 ms ramp, then the completion bang flashes. Click `stop` during a ramp to hold the current value without completion. |
| `print.ultra` | Open Console (Ctrl M). Click `note 60 100` for a labeled message, or move the float slider to print its -1..1 scaled output. Audio can stay off. |
| `send.ultra`, `receive.ultra` | Lock the patch and click the message to send a note pair through `ultra-help-notes` to Console. Receivers in other open windows using that name also hear it. Audio can stay off. |
| `iter.ultra` | Open Console and click the mixed list to emit each integer, float and symbol separately, in source order. |
| `prepend.ultra`, `append.ultra` | Click the mixed list to print prefixed or suffixed data. The `set` message changes the retained prefix or suffix silently. `append` ignores `bang`. |
| `zl_reg.ultra` | Click the mixed list to store and print it. The right-hand message replaces the retained list silently; `bang` requests it from the hot inlet. |
| `zl_join.ultra` | Click the short left list to print it with the saved right segment. The right-hand message changes the cold segment. |
| `zl_len.ultra` | Click the seven-atom mixed list to print its length. |
| `zl_iter.ultra` | Click the mixed list to print consecutive three-atom chunks; the final chunk is shorter. The right-hand message changes chunk size. |
| `zl_slice.ultra` | Click the mixed list to print its tail first, then its leading two atoms. Separate Console labels identify each outlet. |
| `zl_rev.ultra` | Click the mixed list to print its atoms in reverse order. |
| `zl_rot.ultra` | Click the mixed list to rotate it two places right. The right-hand `-2` message changes the distance to two places left. |
| `sig.ultra` | Start audio and open Console. Click `0.75 -0.25` to update two constant signal outlets; snapshots print them separately. |
| `signal_add.ultra` | The signal `0.25 + 0.5` prints `0.75`. Click the cold `0.75` message to change the result to `1`. |
| `signal_subtract.ultra` | The signal `0.25 - 0.5` prints `-0.25`; the cold `0.75` message changes it to `-0.5`. |
| `signal_multiply.ultra` | The signal `0.25 * 0.5` prints `0.125`; the cold `0.75` message changes it to `0.1875`. |
| `signal_divide.ultra` | The signal `0.25 / 2` prints `0.125`; the cold `0.75` message changes it to approximately `0.333333`. |
| `cycle.ultra` | A 2 Hz sine is sampled to Console every configured 100 ms. Click `4` to change the frequency to 4 Hz. |
| `phasor.ultra` | A 1 Hz ramp is sampled to Console; click `4` to change it to 4 Hz. |
| `noise.ultra` | Noise samples print through `snapshot~ 100`; no speaker output is connected. |
| `signal_clip.ultra` | Constant `2` clips to `1` with bounds -1..1. Click `-2` to change the output to `-1`. |
| `line_signal.ultra` | Click `1 1000` or `0 500` for a signal ramp. Snapshots print its progress; `ramp-complete` prints the completion bang. |
| `snapshot.ultra` | A 1 Hz sine feeds `snapshot~ 100`. Click the bang to request a sample; send `0` to the cold inlet to disable periodic reporting. |
| `signal_dac.ultra` | With low listening volume, Start audio for a 220 Hz sine scaled by `0.02` into physical channels 1 and 2; snapshots also print `output-sample`. |

All signal examples except `signal_dac.ultra` are silent observation graphs.
`dac~` accepts independent mono inputs mapped only to this host's two physical
channels; repeated mappings sum. Legacy `join~` produces a stereo bundle for the
separate `stereo.dac~` authoring name, whose saved type remains `dac`. New signal
sources evaluate the current frame at the native 48 kHz sample rate; the custom
Voice path retains its existing 64-frame pipeline. Engine starts and graph
replacements mute the first 64 output samples as a guard while signal state
already advances.

Signal creation/control numbers are finite -100000..100000 unless a narrower
range applies. Signal arithmetic itself is not clipped to that control range.
`cycle~` and `phasor~` take one positional frequency, `line~` one initial value,
and `snapshot~` one interval. Buffer names, tempo units, unsupported execution
attributes and other output channel numbers are refused. `noise~` has a physical
control inlet but no supported method, including `seed`. Exact Max noise
sequences and periodic snapshot scheduling are not claimed. Frozen signal
observations and comparison scores are in
`experiments/max-reference/signal-runtime-20261021/`; these original examples do
not establish complete execution of installed Max help patches.

The list batch retains the existing native profile: at most eight typed atoms,
finite numbers from -100000 to 100000, and ASCII symbols of at most 31 bytes.
Prefix, suffix and joined segments must also fit that output capacity. Every
fixed `zl` mode retains two inlets and two outlets to preserve saved Max port
indices, including inactive ports. This does not add the other `zl` modes,
runtime mode changes, `fuzzy`, `zlmaxsize`, or Max's larger list capacity.

Bare `prepend` passes messages through, including `bang`; `prepend list`
explicitly produces a list. Bare `append` passes data through and every
`append` ignores `bang`. The initial chunk/slice size is zero: bare `zl.iter`
emits no chunks, while bare `zl.slice` sends the whole list from the right
outlet. The examples specify sizes 3 and 2 respectively. Direct empty list
input clears retained input silently in `iter`, `zl.reg`, `zl.iter`,
`zl.slice`, `zl.rev`, and `zl.rot`. `zl.len` emits zero; a hot empty list to
`zl.join` emits its retained right segment. A literal message box containing
only `list` emits nothing, so clicking it does not send that direct empty
input. Numeric singletons from `zl` use their integer/float selector, while symbol-headed
results use that symbol as the outgoing selector. Empty slice halves emit
nothing, and the right tail finishes before the left leading slice.
Either inlet of these `zl` modes accepts `zlclear`, which clears lists and
resets the numeric mode parameter to zero. `zlreset` clears lists while
keeping that parameter. The right data inlet stays inactive in `zl.len` and
`zl.rev`, but it still accepts those reset commands.

To try the shared bus, open both `send.ultra` and `receive.ultra`, open Console
in the receiver window, then trigger the message in the locked sender. Both
patches use `ultra-help-notes`; every open receiver with that name hears the
complete typed message. Receiver delivery order is unspecified. An unnamed
`receive` has an inlet for `set name`; a named receive has no inlet. Runtime
retargeting does not rewrite its saved creation name. Max `#0`/`---` patch-local
name expansion and signal-rate `send~`/`receive~` are unsupported.

Changing the graph or applying a structural edit resets only that document's
native state and stops its timers; continuous signals restart from reset state
when DSP is active. Stop patch freezes and silences only that document's signal
graph and clears its timers/voices. An accepted event, parameter change, incoming
Receive or explicit global DSP restart resumes its continuous signals. Changing
focus preserves playback. Closing a window disposes its graph. Stop audio and
Panic affect all open patches; starting DSP again resumes continuous signals in
every document but does not restart metros. Reopen a patch to restore its saved
initial values. Save writes Ultra JSON atomically, and closing modified content
offers Save, Discard or Cancel. Max `.maxhelp` files use a different schema and
require the separate compatibility intake; only a supported selection can run.
Save an imported selection to a separate Ultra file to preserve the Max source.

`message_box.ultra` demonstrates the compatible Message UI: trigger the
`8 9` input to substitute both arguments, bang to recall, use the right inlet
to replace its template silently, or send `set` to clear it. The displayed
text can change at runtime while the saved `saved $1 $2` text stays intact.
Use M or `message` for new boxes; saved legacy literals retain their original
contract and use the authoring spelling `message.legacy`.
