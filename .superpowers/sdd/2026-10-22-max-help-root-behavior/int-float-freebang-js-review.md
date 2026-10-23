# Int/float Freebang JS, Controller, Preparation And Runner Review

Date: 2026-10-22. Scope: independent read-only SPEC/QUALITY review of the
frozen implementation listed below, against the approved design, latest
protocol, API review, and private package-006 historical implementation.
Only this report is written. No implementation, score, comparator, public
schema, preparation, installed source, or runtime state is changed. No Max,
Wine, display, or runtime capture is launched. Licensed graph bodies and prose
are neither inspected nor reproduced.

## Findings

### High: Failed independent validation still publishes a controller-only positive close receipt

Location: `experiments/max-reference/int-float-runtime-20261022/run-runtime.py:232`
and `experiments/max-reference/int-float-runtime-20261022/numeric.py:352`.

The normal operation path calls `validate_close` before it advances the live
owner map, checks the action journal, or appends the operation ledger
(`run-runtime.py:135`). However, the `finally` block unconditionally reads the
complete private journal, calls `n.public_receipt` on every row, and writes
`receipts.jsonl` (`run-runtime.py:234`). `public_receipt` copies the existing
`closed_owner_absence_validated` member unchanged (`numeric.py:353`).

The controller appends a `step-complete` row with that member set to true before
the runner's independent gate (`controller.js:549`). Consequently, a successful
controller close followed by an independent rejection, such as a raw root-proof
mismatch or invalid typed/provenance evidence, reaches cleanup with the positive
row already in the journal. Cleanup publishes that row with
`closed_owner_absence_validated:true` even though Python refused the proof. The
session is marked `FAILED`, but the public close claim is still emitted.

This conflicts with the design's explicit ordering: independent validation
must precede projecting receipts, and the public boolean can be true only after
both the controller conjunction and independent Python validation pass. It is
an integration defect even though the successful execution path has the correct
ordering, and the projection loop itself existed in package-006.

Focused correction: keep private journal bytes unchanged, record which close
request IDs passed the independent gate, and prevent an unvalidated close row
from being projected with a positive boolean. The runner should also preserve
the final-barrier requirement before declaring a complete capture. Add a
runner-level synthetic regression where a controller-true close is present in
the journal and `validate_close` raises; assert that the failed public artifacts
contain no positive close claim for that request. Existing helper fixtures do
not execute this publication path.

## Checks And Scope Assessment

- Read the complete lifecycle observer, owner V8 reader, controller, runner,
  lifecycle fixture/tests, close tests, and preparation tests, plus the
  lifecycle additions in `numeric.py` and its public projection/retention paths.
- Compared `controller.js`, `v8-readback.js`, `numeric.py`, and `run-runtime.py`
  against `/home/venetanji/.cache/alive-ultra-evidence/int-float-package-006-historical`.
  Changes preserve the earlier original-object geometry, annotation, numeric
  mode, route, and score policies; additions are confined to the approved
  lifecycle instrumentation and private completion gate.
- Confirmed five declared physical observer inlets, control guard at physical
  inlet 0, owner N event mapping to physical inlet N+1, enclosed observer
  transition/persistence state, and unexpected-selector/non-bang refusal.
- Confirmed no authored manual lifecycle event or admission challenge in the
  reviewed production helpers. The automatic route is root freebang to private
  send, then surviving driver receive to its assigned event inlet.
- Confirmed V8-only actual box text and duplicate-sensitive input/output route
  reads, strict root additions and driver inventory, primitive positive route
  validity, and no assumed channel-name or generic inlet-count attribute.
- Confirmed accepted closes retain before-dispose plus 30 timed polls, the
  separately retained firstobject handle, all original Basic handles, both new
  root harness handles, the existing typed root/window diagnostics, and bounded
  convergence with no revival after a jointly invalid sample. Disposal occurs
  once between dispatch-start and dispatch-return; synchronous witnesses are
  supported.
- Confirmed raw ACK retention precedes independent close validation, and final
  completion uses a separate private barrier command. Public command-request
  collection excludes that barrier; the score/public command count and schema
  are not extended by these reviewed additions.
- Ran `node test_lifecycle.cjs` and `node test_close.cjs`: both pass. Ran
  `PYTHONDONTWRITEBYTECODE=1 python -m unittest test_prepare`: two tests pass.
  These fixtures are synthetic and do not establish installed Max capabilities.

The review found no additional confirmed defect in these files. Exact runtime
`boxtext`, patchcord endpoint exposure, retained Maxobj validity behavior, and
delivery of a top-level automatic freebang through the surviving driver remain
capability gates for a future controlled capture. Their absence must retain a
refusal; offline tests supply no positive lifecycle observation. The independent
Python validator itself is covered by a separate review.

## SHA-256 Bindings

Paths in the first table are relative to
`experiments/max-reference/int-float-runtime-20261022/`.

| Reviewed File | SHA-256 |
| --- | --- |
| `lifecycle-observer.js` | `9a886fa4044cb724786f50ea91f52de4d5719d7fff5def2ebba7df1b209f5fd9` |
| `v8-readback.js` | `99f9ab7e4462149db4f1be26fe8827f03fbe52ddcf5ae79c325c3dee1dac817a` |
| `controller.js` | `af353076e2529ed25fbbf0cce4bc19243a77954f40244c6cf3362de50c630aec` |
| `numeric.py` | `19885389ce908cf4f4aa4b6cd401209a5cb5445c79cfe899f1599c55a6b3a17f` |
| `run-runtime.py` | `7c9b7b5b5e64e88f157526d3335175c5c3fa3e641bc9b63af0d8828b9785891a` |
| `lifecycle-fixture.cjs` | `3a0f23f625b4d67af2e1708154c09a54552a1b8e4bbafe5e4c3b4c9d7278687d` |
| `test_lifecycle.cjs` | `800eeda1b023da103496a0696a49efccd2278167d198db8e8dffd4f83c25c9a7` |
| `test_close.cjs` | `662e5897c5cc9b51bfc4b895f490b3c2cfbc05a43d4696d1f36463a56265bf84` |
| `test_prepare.py` | `60e9353ab76a3a808fae27699136b08c84e4596ebb381f8335dd4fd829779f16` |

The contract paths are relative to this report's directory.

| Contract File | SHA-256 |
| --- | --- |
| `int-float-freebang-design.md` | `e054e87483e02a0f0d4c588bcb5b5ff068cdac11d07008c575f0f9a875f54fda` |
| `int-float-freebang-protocol.txt` | `0fab1b2abd9005d29767d8fcd2fe087dae5c33cdb39c1d4bd4150ab97ce06908` |
| `int-float-freebang-api-review.md` | `4ef8593f38dca04918dca52f086bf8f33e503c4235a32300cd6900387a658097` |

The historical paths are relative to
`/home/venetanji/.cache/alive-ultra-evidence/int-float-package-006-historical/`.

| Historical File | SHA-256 |
| --- | --- |
| `controller.js` | `49d79f9787a65823b859007f9c33678377fbc05872e34c6c581a0c4df9b0af21` |
| `v8-readback.js` | `c43d903053bb0834b52ee8d87948090dd260027b90d958224ee6d9237f7b925e` |
| `numeric.py` | `a16f54a60c54f476da8af70d0eb306ee44ab21bf96e7b4512699a721ce2bbe67` |
| `run-runtime.py` | `40f1348e8fd582ccc16a3ca51f65bad6ac3a772b316e534a7dd89a7668a35774` |

## Verdict

SPEC/QUALITY review: changes requested for the public receipt projection gate.
The reviewed lifecycle architecture otherwise follows the frozen protocol,
subject to the separate independent Python review and future runtime capability
proof. After report creation, SHA-256 was rechecked for all nine implementation/
test files, all three contracts, and all four historical files. Every value
remained identical to the bindings above.

## Re-review: 2026-10-22 Public Receipt Gate Correction

Scope: independently review the parent's runner correction and new
`test_runner.py`, against the latest design and protocol frozen-review
amendments. This section supersedes the original High finding and verdict for
the final source bindings below. Concurrent authorized edits to `lifecycle.py`
and `test_lifecycle.py` belong to the separate Python review and are excluded
from this re-review's freeze.

No further confirmed findings. The original public projection issue is fixed.

`project_public_journal` (`run-runtime.py:36`) requires an independently
accepted request before projecting any close completion or any row carrying
the close boolean. It checks the request, step, action, owner, owner revision,
source digest, primitive true boolean, and uniqueness of the completion row.
A missing, mismatched, or duplicate positive close refuses the entire
projection. Accepted rows still pass through the existing `public_receipt`
function, preserving their public record shape.

The accepted request map is populated only after `validate_close` returns,
its private validation metadata is retained successfully, and the ACK boolean
is confirmed true (`run-runtime.py:155`). Validator refusal, retention failure,
or a false/missing ACK boolean therefore cannot populate that map. Cleanup uses
the same gate before writing `receipts.jsonl` (`run-runtime.py:258`). The gate
builds its complete result list before the file write, so a refusal after
earlier rows also withholds the entire output file. The output directory must
be new under the existing runner preflight.

The existing `private_journal_sha256` assignment now precedes journal parsing
and projection (`run-runtime.py:255`). Raw private journal bytes remain on disk
with a public digest binding even when parsing or projection refuses; no new
public field is added. `public_rows` is set only after successful receipt-file
output. Final completion remains after the independently validated private
barrier.

Verification performed:

- Ran `PYTHONDONTWRITEBYTECODE=1 python -m unittest test_runner`: six tests pass.
  Cases cover an independently refused controller-true close, unchanged
  successful public shape, request/owner/revision/source/step mismatch,
  non-primitive true, wrong row kind, missing positive claim, duplicate close,
  and projectable ordinary failure diagnostics.
- Independently exercised the actual `execute` failure/cleanup path in a
  temporary synthetic environment with process launch, runtime APIs,
  preparation verification, and source access mocked. Injected a successful
  controller ACK plus a true close-completion journal row, then made
  `validate_close` raise. The resulting session is `FAILED`, its operation
  ledger stays empty, no `receipts.jsonl` is created, the raw private journal is
  unchanged, its recorded SHA-256 matches the bytes, and projection refusal is
  recorded. No external process or Max runtime was started.

| Final Re-reviewed File | SHA-256 |
| --- | --- |
| `experiments/max-reference/int-float-runtime-20261022/run-runtime.py` | `b265bfe0c822e1d32bf9dd78ef608d61124e6db4c6a0aaab8bd8cdede469374e` |
| `experiments/max-reference/int-float-runtime-20261022/test_runner.py` | `3c0e3e7a33b78f38bcd94960b8deb3161c363ed58eb6922bd8a71af12ea3b057` |
| `int-float-freebang-design.md` | `9f707237c35e39c941151212657e1a0b60f66c8b1f481e3daffe7563cac4b234` |
| `int-float-freebang-protocol.txt` | `25a4382566b63a01a33b267f003a8e9226d4ea377626794ad88aac1273aeead9` |

Final verdict: PASS for the reviewed JS/controller/preparation/runner scope,
with the original publication finding resolved. The earlier runtime capability
limitations and separate Python-validator review still apply. After this section
was written, all four final SHA-256 bindings were rechecked and remained unchanged.
