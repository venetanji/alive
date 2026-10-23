# Float and Cable Oracle, 2026-10-22

This finite, original synthetic fixture observes Max 9.1.5 Windows x64 through
the installed Wine 11.13 build. The runtime executable SHA-256 is
`7a881318209a10d33c982db482297ab870327d5d2cb90aee6e4e01a13e279d8b`.
No installed help prose, application code, fonts or assets are retained here.

`results/receipts.jsonl` is the authoritative event stream. Each original Max
`File` write contains one bounded JSON value; `results/receipts.json` is its
parsed equivalent. Snapshots record numeric `getvalueof`, format attributes and
object rectangles. Runtime `maxclass` reports `number` for authored `flonum`,
so both names are admitted by the probe. Stored values, outlet selectors and
visible labels are separate evidence categories.

The qualified numeric scope is `flonum`, `format: 6`, a 54 by 23 logical pixel
box, and no authored decimal-place override. Max reports
`numdecimalplaces: 0` for this default. All eight direct scalar inputs emit a
float and retain their complete input value, including `0.123456789`, `1e-6`,
`-1e-7` and `1e-8`. The original `* 0.5` score covers hot integers/floats,
cold integers/floats, bang recall, fractional products and both zero selectors.
Direct and post-flonum outputs agree in value and selector for all ten output
steps; the four cold updates are silent. Physical keyboard entry commits and
emits float `-2.123456789` without changing the stored precision. A subsequent
physical Tab leaves that stored value intact; its second outlet is not wired,
so this fixture makes no Tab-outlet claim.

In the already completed initial-image review, the parent visually reads the
eight narrow labels in generator order as `0.`, `2.`, `2.5`, `-2.5`,
approximately `0.123`, `0.000`, `-0.` and `0.`. These observations support
trailing decimal separators and reduced visible precision in this 54 by 23
face. They do not distinguish rounding from clipping or establish a general
number-formatting algorithm. The stored values and typed receipts remain the
separate full-precision observations above.

The five original cables have one, two, four, repeated, and empty midpoint
arrays. The retained movement snapshots establish box movement only: scripting
one endpoint moves it by `+30,+20`, scripting both endpoints then moves each by
`+30,+20`, and physical select-all followed by ten Right/five Down keys moves
every box by `+10,+5`. Midpoint movement is **unqualified**. Four GTK clipboard
reads expose no text; the Windows reader returns no clipboard formats after
normal Ctrl-C and the attempted Ctrl-Shift-C sequence. The latter event's
`compressed` label describes the attempted key sequence and does not prove
execution of Max's Copy Compressed menu command. No serialized patchline data
was obtained. No further runtime or capture attempt was made after this bounded
failure. In particular, these snapshots do not validate Ultra's equal-delta
midpoint translation policy.

`attempt-1-incomplete/` preserves the original failed capture: GTK selected
version 4, its four clipboard files are empty, and a single long Max write was
truncated at 32 KiB. Its `/tmp` screenshots and historical cleanup result were
unavailable on recovery. The saved Xvfb PID was absent and the exact prefix
process scan was empty; the marked stale prefix was then removed. Historical
preference preservation cannot be reconstructed from that attempt.

`attempt-2-scalar-only/` preserves the first recovery run. Its scalar JSONL is
valid, and its only screenshot remains outside the repository at
`/home/venetanji/.cache/alive-ultra-evidence/float-cable-20261022/initial.png`.
It stopped at the empty-text clipboard precondition. The final `results/` run
uses the same five-route fixture, records all motion and typed-entry stages,
and takes no additional screenshots. The initial image has not been inspected
by this evidence worker. The parent's single batched image review reports rounded initial
cable corners, approximately 10 to 12 logical pixels, endpoint-aligned outer
segments, and an orthogonal dogleg for the repeated-point route. These are
visual observations of the initial state, with approximate contour fits; they
do not establish saved midpoint normalization or movement. The manifest
records the image digest and PNG dimensions. The evidence worker did not open
the image.

Both recovery runs used a fresh reflink copy of the existing disposable source
prefix, explicitly private display `:135`, and no reauthentication. Original
and source Max preference digests were identical before/after each recovery
run (4 and 1,032 files). Ctrl-Q did not stop all Wine processes within the
bounded grace period, so cleanup sent signals only to PIDs whose exact
`WINEPREFIX` and saved process start time still matched. Exact-prefix and
private-display scans were empty; each marked copied prefix was removed. The
final postflight repeats those scans and verifies the Xvfb PID is absent. The
historical `:0` display now belongs to the user's Xwayland session and was
neither selected for recovery nor terminated.

Run `python experiments/max-reference/float-cable-runtime-20261022/verify.py`
for offline evidence validation. The verifier checks digests, score ordering,
typed outputs, stored values, movement rectangles, explicit coverage limits,
historical limitations and recovery cleanup. It verifies available external
artifact bytes and PNG integrity without opening images. Reproduction requires
new evidence directories and a fresh marked copy; `run-runtime.py` refuses to
overwrite existing results. The native clipboard reader is original source;
its generated executable stays outside the repository.
