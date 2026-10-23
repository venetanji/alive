# Int/Float Independent Source Review

2026-10-22. **SPEC: PASS. QUALITY: PASS**, for the frozen offline numeric
reference package and comparator after one bounded integration review round.
No material finding remains open in this source-review scope. Three blocking
producer/consumer mismatches were found, reported together to the coordinator
and both implementers, fixed, and rechecked against their frozen sources.

These verdicts establish source readiness for a separately reviewed fresh
preparation/capture. They do not establish actual Max API capability, a Max
comparison pass or installed-root qualification. This reviewer performed only
source/document reads, literal score projection and file-byte hashing. No
tests, preparation, native scorer, Max, product, browser, desktop, screenshot
or clipboard operation was run. The capture008 section of `bridge-review.md`
was not changed.

## Material Findings And Resolution

| Finding | Original Consequence | Frozen Resolution And Evidence |
| --- | --- | --- |
| Missing stimulus inlet/port in producer | The controller emitted a stimulus without `port`, while the comparator required exact int port 0. A genuine event capture would be refused despite synthetic comparator fixtures passing. | `experiments/max-reference/int-float-runtime-20261022/controller.js:172` requires inlet 0 and `:177` records it as stimulus port. `experiments/max-reference/help-roots-native-20261022/compare-int-float.py:319` validates that actual port against the score. The controller fixture asserts explicit stimulus port 0 and refuses inlet 1. |
| Readback raw-identity fields disagreed | Extraction added `raw_sha256` / `raw_bytes` to the public request ledger, but the comparator's exact expected rows omitted both. Every actual populated request ledger would fail comparison. | `experiments/max-reference/int-float-runtime-20261022/numeric.py:179` retains and validates the same payload bytes, adds their binding to the request, and returns it on the checkpoint. `experiments/max-reference/help-roots-native-20261022/compare-int-float.py:361` now includes both fields in each expected request and `:392` compares the full ledger. The producer's actual `retain_raw` function supplies synthetic bytes in the new cross-package regression at `experiments/max-reference/help-roots-native-20261022/test-compare-int-float.py:360`; a changed request hash is refused. |
| Full internal operations disagreed with public ledger shape | The runner appended full score rows, retaining install `revision` and event `anchor` / `inlet` / `message`; the comparator accepted only its nine-field public projection. Genuine install/event ledger rows would be refused. | `experiments/max-reference/int-float-runtime-20261022/numeric.py:97` defines the exact public projection and `experiments/max-reference/int-float-runtime-20261022/run-runtime.py:179` uses it. The full internal operation still drives dispatch/checkpoint logic. Its projection matches the exact consumer shape at `experiments/max-reference/help-roots-native-20261022/compare-int-float.py:296`. The producer regression at `experiments/max-reference/int-float-runtime-20261022/test_numeric.py:192` projects every actual score operation. |

The same round also tightened public journal sequence coverage from merely
increasing to exactly contiguous `1..N`, matching the producer's private
journal requirement. The missing-public-row regression is at
`experiments/max-reference/help-roots-native-20261022/test-compare-int-float.py:372`.
The consumer now pins the actual source census of 21/23 Basic boxes and
20/22 observer leaves, with the six UI classes checked independently of the
native executable inventory. This closes the relevant finite coverage gap;
no unrelated legacy harness or product changes were requested by this review.

## Frozen Identities

Both implementers explicitly announced code freeze. Independent file-byte
hash reads match their final identities. The coordinator separately confirmed
the same package/comparator identities after its final checks.

| Artifact | SHA-256 |
| --- | --- |
| Numeric package aggregate, 11 Python/JS/CJS files | `90708a93cd7dc5a355dde65e98ed627d80085dc8ea6679723c45493e05fdd91e` |
| Numeric controller | `3d081a01604268dc778038081ff4789755bd6c7aad7cda68fd584028bc4f535c` |
| Numeric validation/preparation module | `9f7ed6fa7acb7c4f6965b124bf9898aa99a8f544d76d560470ce0e33b75229f7` |
| Numeric launcher | `40f1348e8fd582ccc16a3ca51f65bad6ac3a772b316e534a7dd89a7668a35774` |
| Numeric original-outlet observer | `48fd558df7025f96044ab1207646abd3d36c01dc9ba8ad74ea72b4fb5ab916e4` |
| Numeric V8 readback | `c612124ecbc36139c762f1ce681301df39f0722c1d49493977e846864f5434c3` |
| `compare-int-float.py`, 39769 bytes | `b0e962ace212eb787f26d7aaeb1681f9f1d62c2848d8729480294dbee3c36a62` |
| `test-compare-int-float.py`, 25777 bytes | `7f76750c9cfcc1d1cf5dd7b979fe82b784f0cdf75f05d5e11b2ca6fd30e7eb22` |
| Unchanged public `int-float-score.json`, 16369 bytes | `0ea52e269e960d64f7a55f137a1925d2186119cd6d960afabc21730e3c2fad30` |
| Imported audited help-root launcher | `c515cdfda7fc658329d696dffc1336611bda0e78abd83466fe9b842bc99e3c51` |
| Imported audited `help_runtime.py` | `91ed9c6ba4cdb5a52c4f84c1f8177283e58ece8a936023a1ab9b8ce61912c144` |

The aggregate is SHA-256 of the sorted filename-to-SHA-256 map serialized as
compact sorted JSON, matching `numeric.py:102`. Its full file map is available
through the package's verification interface; that interface was not executed
by this reviewer. README/schema/report documents are outside this executable
aggregate. The worker's implementation details and individual script hashes
are recorded in `int-float-max-report.md` beside this review.

## Specification Assessment

The literal score matches the approved 48-event/six-lifecycle-operation plan.
It starts with int alone, executes E01, then opens float. Two independent
closes and fresh revision-2 reinstalls preserve the surviving owner and reset
only the reopened owner. There are exactly 54 operations, 102 all-live-owner
checkpoints (52 int, 50 float), six original numeric UI states per checkpoint
and therefore 612 UI observations. The unchanged score hash binds the specific
typed values, source anchors and action order; the comparator CLI also checks
score bytes/hash/size and native score binding.

The complete int/float source requirements remain 25/27 full-tree boxes,
14/16 executable nodes and 10/12 saved cables. The isolated aliases remain
in the native node/state inventory. Preparation derives original anchors,
metadata and saved routes from pinned private sources and uses distinct
pristine/working files for both revisions. It does not rebuild a Basic-only
graph or substitute demo objects. The coordinator independently checked the
installed source metadata and existing production native bundles; this reviewer
did not reread the installed numeric roots or rerun their preparation.

The controller starts with no opened roots and performs bounded full-tree
settling/binding on each install. A close uses only the containing root's
thispatcher `dispose`; it acknowledges closure only after root, reader and
disposer validity become explicitly false/zero. Receipt validation then rejects
closed/stale owners. There is no wrapper-equality shortcut, dropping of handles
as proof, or view close substituted for owner close. Actual API behavior still
must be demonstrated in the capture.

Numeric readback is separate from receipt typing. The V8 reader accepts only
finite scalar numbers or singleton numeric arrays from the documented getter,
with exact number/flonum/slider class and integral integer-control checks.
Initial values must match source defaults; subsequent getter values must
match actual UI output or the preceding unchanged value. Getter reads are
bracketed by unchanged journal sequence. Null, missing, boolean, malformed,
coerced and nonfinite values refuse capability. Class-implied semantic tags
explicitly retain `receipt_tag_observed:false`; stores and isolated aliases
have no invented getters. The original Message prototype is checked exactly
at every live checkpoint, using private text and public hash/length only.

All original declared outlets are observed directly by zero-output leaves,
including numeric outlet 1 and the saved Message command outlet. The consumer
compares the union of reference/native endpoint streams and does not filter
the 13 source-owned Message command emissions. Custom selectors and symbol
atoms use the shared hash normalization; injected inputs remain strict
bang/int/float. Unknown list numeric tags remain unknown. Native actual input
and reference actual stimulus are each bound to the declared anchor, inlet,
selector and typed atoms, including the sign of a float zero where present.

One stimulus and one completed bracket are required for each event; lifecycle
steps emit neither stimuli nor control output. Request IDs, revisions,
live-owner sets and four distinct working paths are validated across ledger,
receipts and all requested checkpoints. Basic original/leaf inventories and
both duplicate-sensitive input/output endpoint multisets are validated before
their public retention summaries are accepted. Missing, extra, stale or
duplicate operation/checkpoint/endpoint evidence cannot reduce the denominator.

Destination order is a separate result from endpoint equality. Twenty-one
main actions require one original numeric-display outlet 0 receipt before one
original pulse-button bang, with a same-dispatch witness on the reference.
The native destination input order is reported separately as native-only.
Unavailable synchronous capability preserves endpoint/state evidence while
keeping the order result null and the overall comparison gate false. The
consumer does not require portable order among receivers in different owners,
and continues to report `saved_order_observed:false` and serialized-state
parity null. Physical gestures and shared product views are outside this score.

## Quality And Safety Assessment

Raw observation extraction hashes, retains and parses the same bytes read
from the private request file; it does not hash one payload and validate a
second read. Retained raw creation is exclusive and owner-only. The public
request/checkpoint bind the same raw hash and byte length. Source/pristine/
every working revision, helper copies, package scripts and imported safety
modules are verified before and after extraction, including refusal paths.
Acknowledgement payload bytes are also privately retained with request-bound
public hash/size records.

The new public preparation manifest pins the private config and seal hashes,
so changing both private files does not silently recreate their admission
baseline. Preparation refuses to overwrite that manifest, requires a new
private evidence directory, and uses owner-only files/directories. No source
owned graph body, helper script or Message string is included in public
results. Cleanup verifies both installed and private helper copies and all
four working revisions rather than checking only the active owner.

The launcher imports the previously audited marker/prefix/display/PID-start
and pidfd utilities instead of adding a second ownership implementation.
It uses the new exact copied-prefix path, explicit host-display exclusion,
private Xauthority and high private Xvfb display. Active work is bounded to
150 seconds plus cleanup. Signals require all ownership fields and process
lifetime revalidation; removal requires the matching capture marker and no
remaining owned/prefix/marker processes. Original/reusable preferences must
remain equal. No display-only process attribution, ordinary quit, save/dirty,
authorization-setting operation or shared-prefix mutation was introduced.

The final producer/consumer fixes preserve a strict public schema instead of
weakening comparison to ignore arbitrary fields. The new regression fixtures
exercise real producer projection/raw-binding functions with original
synthetic data. They cover missing rows, exact source/helper identities,
private helper preservation, typed stimuli, close/reopen paths and stale
revisions, malformed/duplicate numeric states, method/status mixtures,
exclusive output files and reversed destination outputs despite matching
per-endpoint streams. No further material correctness or safety defect was
identified in this bounded source inspection.

## Verification Boundary And Remaining Gates

The implementers report 20 producer Python tests, both JS fixture suites,
three JS syntax checks, six Python AST checks, package verification and the
default dry-run passing. The comparator worker reports 15 new and 17 legacy
comparison tests passing. The coordinator independently reran the frozen
producer and new comparator checks and confirmed the retained native artifact's
54-operation/102-checkpoint admission. Those executions were not performed
by this reviewer. Relevant coordinator logs include
`experiments/max-reference/help-roots-native-20261022/results/int-float-comparator-tests-current.log`
and the numeric package's `results/*current.log` files.

Actual numeric getters, getter silence, typed float dispatch, helper settling,
strict runtime class/geometry matching, full original endpoint inventories,
destination synchronous observation and dispose invalidity remain capture
admission gates. A real preparation must be checked against the frozen package,
public preparation manifest and private config/seal before the coordinator's
fresh bounded capture. A failed capability must retain explicit partial
evidence and stop that gate; the source verdict is not a substitute for it.
Saved authoring/order, physical entry/drag/Tab, shared views, rendering, fonts,
metadata dispositions and complete installed-root qualification remain
unresolved. This review adds zero qualifications.
