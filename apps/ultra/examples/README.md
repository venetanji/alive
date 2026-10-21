# Native Control Object Examples

These are original Ultra patches, authored for the supported native object
subset. They contain no installed Max help content. Use File / Open, choose a
`.ultra` file, and Import. Lock the canvas with Ctrl E to operate its controls.
Control examples work with audio stopped; browser preview only edits documents.

| File | Action And Expected Behavior |
| --- | --- |
| `int.ultra` | Click `12.75`: the bottom floating-point box shows `12`. The `int` hot inlet truncates toward zero. |
| `float.ultra` | Click `12.75`: the bottom box retains the fraction. |
| `flonum.ultra` | Click `1.25`, or edit the bounded numeric box. Tab from that box flashes the bang on its second outlet. |
| `slider.ultra` | Move the slider through 0..100. Its numeric output appears in the floating-point box. |
| `pack.ultra` | Edit the middle and right top boxes first, then the left box. Only the left field triggers a complete list; the three bottom boxes show the stored fields. The right field retains its fraction. |
| `unpack.ultra` | Click `12 34 5.5`: the three bottom boxes show the corresponding typed fields. |
| `select.ultra` | Move to 3 or 7 to flash the corresponding match bang. Other slider values appear at the unmatched outlet's number box. |
| `route.ultra` | Click `note 64 100`: the two left bottom boxes show 64 and 100. Click `color 7`: the right box shows 7. Routing strips the matched selector. |
| `trigger.ultra` | Click `12.75`: outlets execute float, integer, bang, from right to left. Numeric boxes show 12 and 12.75; the bang flashes. |
| `line.ultra` | Click `100 500` or `0 500`: the slider and number follow a 500 ms ramp, then the completion bang flashes. Click `stop` during a ramp to hold the current value without completion. |

Changing the graph or applying a structural edit resets native state and stops
timers. Focus loss and Stop patch also stop pending work. Reopen a patch to
restore its saved initial values. Max `.maxhelp` files use a different schema
and cannot be imported directly.
