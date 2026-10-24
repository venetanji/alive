# Task 13b Evidence Closure

Production checkpoint: a04f259c753a7b644aa806830b1f96e24c1c5d2d.
Independent source review: task-13b-review.md. Both I1/I2 are closed through
the scoped fix-2 review at 17683245a410e1c3c9f5d68911bfa6501b089d06, with no
new breakage. This file resolves the review's separately assigned evidence
questions. Task 13b is locally accepted; Task 15 final gates remain open.

## Final Same-Source Timing

`experiments/alive-capacity-m3-20261024/verify.py` independently validates all
692 retained raw-file lengths/hashes and 224 historical committed source hashes.
The authoritative original complete receipt is
`parent-complete-verification.json`. All 145 native distributions/174000 samples
and printed C++ quantiles reconstruct exactly. All 60 paired raw distributions
reconstruct, removing exactly 64 retained native warmups. Clock/publication-tail
arrays each retain 20000 samples. Proposal and shipping distributions retain
separate source manifests; no percentile subtraction or universal deadline
bound is inferred from the scalar-scan surrogate. Eight stage CPU endpoint
calculations reconstruct from `(PID,starttime)` ticks. The short-control
playing totals are helper-reported; raw interval observations were not retained.
They cannot satisfy the final endurance gate.

The 223dd34 verification-only fix leaves production, fixtures and runtime
artifacts unchanged. Parent checks the committed changed-path set and exact
measurement-source suffix; newly compiled diagnostic executable layout is not
treated as the historical measurement artifact. Any subsequent source change
requires its own impact assessment. Thus timing evidence is closed at the
actual measured production bytes, without falsely relabeling a rebuild.
Fix 2 adds only a same-callback-generation condition, its comment/output field
and report. Parent separately checks its 199 retained files, unchanged I1 and
timed source, 51,077 same-callback observations and deterministic gap red/green
in parent-fix-2-verification.json; scoped independent review accepts I2.

## Exact Standalone Runtime

The original release build preceded the a04f259 commit; the retained source
hashes establish association, rather than an invented after-commit build.
Parent `--live-root /tmp/alive-task13b-evidence` verification matches actual
Alive/library/DEB and fixture/harness hashes against the build manifest.
The native-eight-3 report, screenshots, accessibility/native state and final
epoch records cover eight independent tracks/sixteen roots, all eight applied
switches, selected-instance editor/base ownership, automation, local Stop,
mixer, Save/Open, remove/add/create/Apply/play and final note termination.
Parent visually inspects the actual retained capacity-playing screenshot.

All four epochs are final, complete and quiescent with no retirement/coverage
gap, 8511 callbacks and exact lifetime/histogram sums. Requested/observed size
is 512 at 48 kHz stereo; an unsupported 128 attempt preserves saved 512. The
two control epochs are separately final and sum to 8792 callbacks. Main and two
control captures stream-verify finite samples/hashes, and recorder process
groups are gone. Resource growth and incomplete identity rows remain explicit.
This closes the finite Linux/software-runtime question. It establishes no
physical audio, physical xrun, scheduling-lateness or final endurance claim.

## Preserved Prerequisites

Task 13a is accepted through 3024057 and pushed evidence e1f09e5, including witnessed
callback retirement, authorized Quit and scoped Stop. Task 12 accepted strict
saved-v3/history/identity/source-recovery through 813ba76 and evidence 16294e6.
Task 13b's full Rust gate records 206 passes/4 explicit ignores; full native preserves
original v1/v2 and guards. Contracts' preceding checks pass, with the final
missing-jsonschema portion resumed under isolated dependencies rather than
silently skipped. DOM 46 and release staging 18 pass. Native Faust/Clockwork,
automation ownership, editor lifetime and stable IDs retain their shared owners;
no engine/schema/ABI replacement is introduced. These retained prerequisites
and covering gates close the cross-task question for this slice; final full
source qualification remains mandatory after scenes/example behavior settles.

## Packages And Remaining Gates

The actual release binary and DEB exist and qualify the local native journey.
The Arch AppImage linuxdeploy RELR/GTK failures are retained and remain failed.
The previous exact e1f09e5 CI has 3 passing jobs, all 4 both-app package targets pass,
and all 4 Linux payloads are downloaded/checksum/notices/linkage/ABI/offline-render
qualified. None of that older qualification is promoted to a04f259 or later.

Ruling: retain final supported-runner packages as an explicit Task 15 gate,
while accepting the measured headless/native eight-track slice after I2 passes
scoped review. This matches the ordered plan's release-app prerequisite and
final exact-pushed-head package requirement; it does not label the failed local
AppImage or future source as qualified. Cost if wrong: a packaging regression
can surface before final acceptance, and must be corrected then. I2 is now closed
by the independent fix-2 review. Task 15 also owns pointer findings, final whole-branch
review and independently replayable 1800 playing seconds. Historical warnings,
resource growth and unknown physical underruns remain final limitations.
