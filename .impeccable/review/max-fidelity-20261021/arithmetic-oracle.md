# Arithmetic original-Max oracle

The bounded arithmetic fixture has completed original Max execution: 300 ordered
inputs across 31 creations produced 218 typed scalar receipts. This is evidence
for the exact scored interactions, with whole-help qualification still **0/2103**.
It supersedes runtime hypotheses in `arithmetic-contract-map.md` only where the
receipts below answer them.

Package: `experiments/max-reference/arithmetic-runtime-20261022/`.
REA Evidence ID:
`ev_074aa48ec8f1ce9d52c4e240ffd330aeae2631d933ba683458e54f1de7ccda7e`.
The preserved capture ran 2026-10-22 00:44:33.521-00:45:04.876 UTC. The fixture
declares Max 9.1.5 Windows x64; its launcher's sampled copied executable digest
is `7a881318209a10d33c982db482297ab870327d5d2cb90aee6e4e01a13e279d8b`.
REA binds the original receipt/session/cleanup bytes by filesystem SHA-256.

## Observed

The `seq` values below identify rows in the original `results/receipts.jsonl`.
Every scored input also has a stimulus and completion row, so silence is a
recorded interval rather than a missing result inferred from console text.

| Question | Original observations | Receipt references |
| --- | --- | --- |
| Fixed creation mode | Integer-argument binary objects emit `int`; decimal-argument binary objects emit `float`, including whole-valued results. Fractional hot/cold input does not upgrade integer mode. | Startup receipts 6, 9, 15, 18; integer `+` hot -3.75 is int -1 at 78; float `/` hot -3.75 is float -1.875 at 566. |
| Bare arithmetic | After hot int 7, bare `+`, `*`, `-`, `/`, `%`, `!-`, `!/`, `abs` emit int 7, 0, 7, 7, 0, -7, 0, 7 respectively. | 794, 797, 800, 803, 806, 809, 812, 815. |
| Physical inlet behavior | Every physical inlet-1 stimulus is silent. Subsequent bangs observe the changed stored operand for numeric cold inputs; the tested two-number cold list does not alter it. | `+ 2` cold-list interval followed by int 15 at 116; `* 2` followed by int 44 at 173. All cold intervals are checked by `verify.py`. |
| Operand order and hot lists | With list 7 2, `+`, `*`, `-`, `/`, `%`, `!-`, `!/` emit int 9, 14, 5, 3, 1, -5, 0. One-element lists use the retained right operand. Lists with a third numeric atom use the first two tested atoms. | 96, 153, 210, 267, 324, 381, 438; one/three-element cases are indexed in `summary.json`. |
| Mixed-symbol lists | After list 9 4 2, list 11 probe-symbol updates the hot value while retaining right 4: outputs are 15, 44, 7, 2, 3, -7, 0. | 108, 165, 222, 279, 336, 393, 450. |
| Silent `set` | For `+`, `*`, `-`, `/`, `%`, integer `set 9.75` is silent and the next bang agrees with hot integer 9/right -2; float `set 8.5` is silent and affects the next bang. Reverse-operator `set` is silent and leaves the tested recall unchanged. | `+ 2`: 93 gives 7; `* 2`: 150 gives -18; float `/`: 579 gives 3.4000000000000004. `!-` remains 1 at 373/378 and float `!-` remains 10 at 612/617; float `!/` remains -0.3333333333333333 at 631/636. |
| Named inlet selectors | Integer-mode direct `in1 5.75` is silent and subsequent distinguishing results agree with stored integer 5. Direct `ft1 -2.25` changes reverse subtraction's stored right value to -2; tested ordinary operators retain the `in1` result. | `+`: 121 and 126 both 16; `*`: 178 and 183 both 55; `!-`: 406 gives -6, then 411 gives -13. |
| Floating modulo | `% 2.` emits float -1.75 for hot -3.75. `% 0.5` and `% 2.5` emit float -0.25 and -1.25. A tested negative exact-multiple list result retains negative zero. | 585, 765, 774; negative zero at 593. |
| Integer zero divisors | Integer `/` with stored right 0 after coercing 0.5 or negative zero returns the retained hot 11; restoring right 2 returns int 5. Integer `%` returns int 0 for those zeros. | `/`: 641, 646, 651; `%`: 671, 676. |
| Float zero divisors | Two float `/` results are Infinity; two float `%` results are NaN. Restoring ordinary cold operands produces finite 3.75 and -1.5 on bang. | Infinity 656, 661; NaN 686, 691; recovery 666, 696. |
| Reverse-divide zero | Both configured integer and float `!/` emit zero for the scored zero hot divisor, including bang recall, then recover on a nonzero hot input. | Integer negative-zero receipts 705, 708; float cases and recovery are indexed in `summary.json`. |
| Integer `abs` | `abs 2` accepts scalar fractions with integer output, and each tested list uses its first numeric atom. Startup bang, recall bang, `set`, symbol, direct `in1` and direct `ft1` produce no outlet receipt. | Scalar -3.75 gives int 3 at 474; lists give 9, 7, 3, 3 at 486, 489, 492, 495. |
| Float `abs` | Float -3.75 into `abs 2.` and `abs 0.5` produces float 3.75. Both tested startup bangs are silent; `abs 0.5`'s tested recall bang is silent. | 818, 789; the `abs 0.5` recall is input `290-op7-extra30-recall`. |
| Exponent creation spelling | `+ 2e0` and `/ 2e0` start with int 0 and produce int -3 for hot float -3.75; `abs 2e0` produces int 3. | 735, 738, 753, 756, 782. |

The full event matrix is `summary.json`; this table highlights decisions rather
than replacing the journal. Scalar receipt type comes from JS `msg_int` versus
`msg_float`, not from the number of decimal digits in a displayed value.

Four nonfinite results have JSON `atoms:[null]`, paired with `finite:[false]`
and `number_repr:["Infinity"]` or `["NaN"]`. JSON converted the JS nonfinite
number to null; Max did not emit a null atom. Negative zero is recorded separately
using the sign of its reciprocal. `-Infinity` is representable by the recorder
but was not observed.

## Inferred

The selected integer results agree with truncating fractional operands toward
zero before arithmetic. Bangs after silent updates agree with retained hot and
cold operands rather than a cached prior result. The tested three-element lists
agree with ignoring extra atoms; the mixed-symbol second atom agrees with
retaining the preceding right operand. These are models of the scored sequence,
not claims about every message shape or numeric range.

The exponent-creation observations agree with `2e0` being ignored as a numeric
creation operand and leaving default integer behavior for the three tested
classes. They do not support treating exponent spellings as float creation.
The current modern authoring/import surface deliberately refuses exponents;
native replay excludes those nine scored inputs.

Integer zero division agrees with an effective divisor of one. The receipt does
not distinguish replacing stored zero with one from substituting one only while
calculating. Bare `!/` at hot 7 gives zero for either numerator 0 or numerator 1,
so its omitted numerator remains unresolved. The local native default of one is
a deliberate implementation choice, not an observed distinction.

## Native Replay

The refreshed production arithmetic replay consumes 291 of the 300 original
inputs and records **287 compared passes**, **4 explicit local refusals** and
**9 outside-qualified-creation cases**. Finite values compare with absolute and
relative tolerance `1e-13`; selectors and zero signs compare exactly. The four
nonfinite outputs are refused locally with `arithmetic-result-out-of-range`
and no outlet message. They remain explicit behavioral differences, not passes.

`results/native-build.json` records the supplied production test binary and the
hashes of its replay harness and all production native headers. The separate
arithmetic-verification package owns its compile/sanitizer record. Generated
native report hashes and source freshness are checked separately from the
immutable REA-bound capture. `verify.py --check-native-current` requires the
current source bytes to match this replay.

## Unknowns And Boundaries

- Float-mode direct `in1`/`ft1` and integer input into float-configured `abs`
  were not tested and receive no qualification from this fixture.
- JS does not independently identify numeric atom subtypes inside lists. The
  scorer selected scalar `int`/`float` messages explicitly, but cannot prove all
  internal list atom tags.
- Other exponent spellings, omitted `!/` numerator 0 versus 1, general numeric
  overflow, full sign combinations, unscored selectors/atoms, DSP/scheduler
  settings and Max console error text remain unknown.
- REA samples process trees and before/after files, rather than observing every
  syscall or atomically binding the Max image. Ambient environment and network
  traffic were not captured; seven unrelated unreadable process environments
  were left untouched.
- Recovered fixture/harness source hashes are frozen at package finalization;
  only the journal, session and cleanup had capture-time REA file checkpoints.
  No absent historical reference-document digests are claimed.

Capture cleanup records no owned prefix/display processes, the private prefix
removed, and original/source preference snapshots unchanged across 33/1081
files. The final offline machine check also scans only the exact prefix,
`:149` environment or X server argument; it does not print process environments
or terminate unrelated processes. Screenshot and clipboard counts are zero.
No installed help graph was executed or qualified: **0/2103** remains the whole
help denominator result.

At package finalization,
`python3 experiments/max-reference/arithmetic-runtime-20261022/verify.py --check-native-current --check-machine`
exited zero: all 24 artifact hashes and three REA checkpoints matched; native
source hashes were current; the exact readable prefix/display/X-server scans
had no matches; prefix/socket were absent; current preferences matched all
33/1081 saved digests. Unreadable process environments are reported as a count
by each check and remain outside its process-attribution claim. Python syntax
parsing also passed for all five package scripts.
