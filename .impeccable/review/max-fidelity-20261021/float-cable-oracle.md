# Float and Cable Runtime Evidence

The finite Max 9.1.5 / Wine 11.13 numeric oracle qualifies full precision
storage and typed outlet behavior for the default `flonum` face used by this
phase. Cable bend movement remains unqualified because Max exposed no
serialized clipboard patchlines. No product semantics were changed in this
evidence pass. Whole-help conformance remains 0/2,103.

Evidence is original synthetic data in
`experiments/max-reference/float-cable-runtime-20261022/`. The executable digest,
fixture scope, event records, script sources, incomplete attempts and cleanup
facts are retained there. The independent offline verifier distinguishes
successful numeric observations from unavailable cable serialization.

## Numeric Observations

FC-NUM-01: authored `flonum`, `format: 6`, rectangle 54 by 23, no authored
decimal-place override. Max reports runtime class `number`, format 6 and
`numdecimalplaces: 0`. These attributes describe the observed scope, not a
promise about other formats or explicit decimal settings.

FC-NUM-02: direct values `0`, `2`, `2.5`, `-2.5`, `0.123456789`, `1e-6`,
`-1e-7` and `1e-8` all emit selector `float`. `getvalueof` retains the exact
probe values. The first zero stimulus uses selector `int`, while the remaining
stimuli use `float`; the resulting outlet type is always float. These are
typed runtime observations, not conclusions derived from the visible labels.

FC-NUM-03: `* 0.5` emits matching float values before and after the flonum.

| Trigger | Direct Output | Post-Flonum Output |
| --- | --- | --- |
| hot `int 3` | `float 1.5` | `float 1.5` |
| hot `float 4` | `float 2` | `float 2` |
| hot `int -3` | `float -1.5` | `float -1.5` |
| bang recall | `float -1.5` | `float -1.5` |
| cold `int 2`, then bang | `float -6` | `float -6` |
| cold `float 0.5`, then bang | `float -1.5` | `float -1.5` |
| cold `float -2.5`, then hot `int 2` | `float -5` | `float -5` |
| cold `float 0.5`, then hot `float 0.25` | `float 0.125` | `float 0.125` |
| hot `int 0` | `float 0` | `float 0` |
| hot `float 0` | `float 0` | `float 0` |

Each cold update itself is silent. Every output step stores the matching value
in the downstream flonum. In the harness, the post-flonum receipt occurs before
the direct receipt because of this fixture's fanout scheduling; this does not
claim a general fanout ordering rule.

FC-NUM-04: physical keyboard entry replaces `1.25` with `-2.123456789`, emits
that exact value as float on Return, and preserves it in `getvalueof`. A later
physical Tab preserves the value. This fixture wires only the first numeric
outlet and cannot qualify the Tab bang outlet, blur behavior or dragging.
`set`, list input, other formats and integer-creation multiplication are also
outside the score.

The only current Max screenshot is
`/home/venetanji/.cache/alive-ultra-evidence/float-cable-20261022/initial.png`.
It belongs to the scalar-only recovery run. This worker did not open the
image. The parent inspected it in one batch with the Ultra captures and
reported the cable contours described below.

FC-NUM-05 (parent's visual review of that existing initial screenshot): labels
in generator order visually read `0.`, `2.`, `2.5`, `-2.5`, approximately
`0.123`, `0.000`, `-0.` and `0.`. The parent reports these as bounded visual
readings of a narrow 54 by 23 face. They support trailing decimal separators
and reduced visible precision while the corresponding stored values retain
the precision recorded in FC-NUM-02. Exact rounding versus clipping remains
unqualified, as does a general formatting algorithm. No additional image
review or runtime was used to obtain these readings.

## Cable Observations And Limits

FC-CABLE-01: the original fixture authors five routes: one point, two points,
four points, a repeated point and an explicit empty midpoint array. These
arrays establish the inputs. They do not establish how Max preserved them
after loading or moving boxes.

FC-CABLE-02: runtime object rectangles confirm the intended operations. The
one-endpoint script moves all five source buttons by `+30,+20` with destinations
fixed. The next script moves each source and destination by `+30,+20`.
Physical select-all followed by ten Right/five Down keys moves every object by
`+10,+5`. Those observations separate sequential scripted endpoint edits from
the physical group operation.

FC-CABLE-03: no cable midpoint coordinates were recovered. GTK3 clipboard
reads returned empty text. The original native Windows reader successfully
opened the clipboard but enumerated zero formats after Ctrl-C and after the
attempted Ctrl-Shift-C sequence at all four route stages. The `compressed`
event mode records that attempted sequence; activation of the Copy Compressed
menu item was not independently observed. No fresh movement screenshot was
taken after this failure. The saved rectangles therefore cannot prove or
contradict absolute bends, equal-delta bend translation, repeated-vertex
preservation, empty-array normalization or the rendered curve interpolation.

FC-CABLE-04 (parent's visual review of the initial screenshot): the routed
corners are rounded, with an approximate radius of 10 to 12 logical pixels.
The four-point route's final vertical segment visually aligns with the actual
destination port at logical x551.5; its authored final midpoint is x571.5.
This supports a render-time projection of the outer midpoint x coordinates
onto the endpoint port axes. It does not prove that Max changed its saved
midpoint array. The repeated identical points `[651.5,400,651.5,400]` produce
a rounded orthogonal dogleg toward the destination at x751.5. The visual result
does not match a vertical segment followed by a diagonal final segment.
The axis projection is an interpretation of the visible initial contour; the
radius is a fitted estimate, not a measured internal parameter. No movement
stage image is available to extend this interpretation to edited routes.

Ultra's policy of keeping bends absolute for one/different endpoint deltas and
translating them for equal endpoint deltas remains an explicit editor policy.
This run does not upgrade it to measured Max parity. The initial rounded
contour and repeated-point dogleg have the limited visual support above;
empty-array normalization and bend movement remain unobserved.

## Integrity And Cleanup

The first inherited attempt was incomplete: long-string writes truncated its
JSON at 32 KiB, GTK4 lacked the requested clipboard API, the four clipboard
files were empty, and its `/tmp` images/log no longer existed. Its historical
Xvfb PID was absent on recovery. An exact-prefix scan found no live owner; the
stale copy's dedicated marker was verified before removing it. Historical
preference comparison and historical owned-display cleanup are unavailable,
and the preserved recovery facts say so explicitly.

The scalar recovery and final noncapture run each used a new reflink copy and
explicit private Xvfb display `:135`. Both compare all original/source Max
preference file digests before and after; 4 original and 1,032 source files
match. Cleanup terminates only exact-prefix PIDs whose start times still match,
then finds no remaining exact-prefix or private-display process and removes
the marked copied prefix. Final postflight also finds no Xvfb PID or display
socket. No existing daemon was recreated or authenticated, and no original
Wine/Max preference was changed by either recovery run.

Verification command:

```sh
python experiments/max-reference/float-cable-runtime-20261022/verify.py
```

The verifier checks the finite observations, artifact digests and recorded
coverage limits. It does not treat the unavailable historical cleanup or
unsuccessful clipboard serialization as a pass, and it does not independently
interpret the parent's visual observations.
