# Int/float Driver Construction Correction

Date: 2026-10-22. Status: implemented and frozen for independent review before
preparation/capture009. Only `numeric.py`, `test_prepare.py`, and this report are
edited for this task. No preparation or runtime capture is launched.

Capture008 failed at startup with zero operations. The parent supplied actual
typed driver metadata and its sealed-configuration comparison from evidence
`ev_d308e4df39ce222d93d16c7161d48073ebb1e107152026b9dcffb63f94fc14bd`.
All six driver objects had actual height 50 rather than prepared height 22;
their x, y, and width components matched exactly. Actual controller and observer
box text matched the prepared text with only quotation marks removed. Receiver
text/channel, classes, names, and primitive positive validity matched. This
report records those measured differences without attributing a cause.

## Construction Change

`prepare_private` now constructs the six owned driver inventory rectangles
with height 50, preserving every existing x/y/width component. The generated
driver uses those exact rectangles. Controller and observer object text now
contains the unquoted prepared configuration path, so their sealed expected
text and authored creation text are identical to the observed representation.

Before reading source metadata or creating any preparation directory, the
function checks the computed configuration argument. Whitespace and quotation
marks refuse construction because the path must remain one unquoted argument.
No path rewriting or quoting tolerance is introduced.

This changes construction of owned driver objects only. Actual runtime
inventory/text/geometry verification remains exact. Receiver channels and the
four literal receiver-to-observer routes remain unchanged. Original-source and
Basic geometry, the new owner-root reader/disposer/freebang/send geometry,
controller/V8 helpers, independent lifecycle validator, runner, successful
public schemas, score, 156 public command records, and comparator are untouched.

## TDD And Verification

The focused tests were added before implementation. Against the earlier
construction they failed on all-six inventory geometry, controller text,
observer text, generated driver geometry, and rejection of space/tab/newline
configuration paths. The added quotation-mark path case also failed before its
construction guard was implemented.

After the minimal construction correction,
`PYTHONDONTWRITEBYTECODE=1 python -m unittest test_prepare` passes all four tests.
The new assertions check exact rectangles in both sealed inventory and authored
driver, exact unquoted controller/observer arguments, unchanged receiver text,
the exact four physical event-inlet routes, and rejection before either the
preparation directory or public preparation manifest is created. Existing
source-copy, helper, permission, and sealed-manifest tests continue to pass.

The tests use temporary synthetic fixtures. They establish construction and
rejection behavior, not Max runtime capabilities or successful startup/close.
A future capture must still pass the unchanged runtime and independent proof
gates. No licensed source bodies, source dictionaries, or private channel values
are copied into this report.

## Frozen SHA-256

Paths are relative to `experiments/max-reference/int-float-runtime-20261022/`.

| File | SHA-256 |
| --- | --- |
| `numeric.py` | `bd84645ed42e65afe106d06c39c71f49cf4e409c34e482386a173cd634e9b273` |
| `test_prepare.py` | `642acf3aa322a58c57dfc05d6b39dee14d6f5f95b1f9b72da8687f051fec7764` |

The previous bindings were `19885389ce908cf4f4aa4b6cd401209a5cb5445c79cfe899f1599c55a6b3a17f`
for `numeric.py` and `60e9353ab76a3a808fae27699136b08c84e4596ebb381f8335dd4fd829779f16`
for `test_prepare.py`. Both final hashes were rechecked after report creation
and remained unchanged.
Independent review, broader checks, and any new preparation/capture remain with
the parent.
