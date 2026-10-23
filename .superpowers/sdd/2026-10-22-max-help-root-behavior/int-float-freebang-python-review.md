# Independent Python lifecycle review

Reviewed 2026-10-22. Scope: `lifecycle.py`, `test_lifecycle.py`, and the lifecycle integration in `run-runtime.py`. Read-only implementation review and synthetic/offline verification; no runtime launch, preparation, licensed graph body, private configuration, or private log was used or reproduced.

## Source bindings

All paths in the first three rows are relative to `experiments/max-reference/int-float-runtime-20261022/`.

| Source | SHA-256 |
| --- | --- |
| lifecycle.py | `7caab5208aedbf7c3faaa006855bb1abaf6610d17df226859db56f0ea5532376` |
| test_lifecycle.py | `d00bb978d5def29d9c9d68f86781c9673413a605027183ceba6b63584e55660b` |
| run-runtime.py | `7c9b7b5b5e64e88f157526d3335175c5c3fa3e641bc9b63af0d8828b9785891a` |
| int-float-freebang-protocol.txt | `0fab1b2abd9005d29767d8fcd2fe087dae5c33cdb39c1d4bd4150ab97ce06908` |
| int-float-freebang-design.md | `e054e87483e02a0f0d4c588bcb5b5ff068cdac11d07008c575f0f9a875f54fda` |

## Findings

1. **P1: Later close and barrier reports can rewrite or discard an already accepted history.** `lifecycle.py:402` replays each individual report correctly, but `lifecycle.py:531` and `lifecycle.py:554` never compare that report with previously retained and independently accepted close reports. The private `validated-close-<request>.json` records written at `run-runtime.py:138` are never read by the validator. A valid float close at request 125 can therefore be followed by an accepted int close at request 141 that changes the earlier float request to 124, changes its witness from synchronous to asynchronous, or removes the whole float prefix and resets that owner to monitoring. A barrier can similarly rewrite the accepted float request and can pass with no independently validated earlier close records at all. This violates preserved complete history and permits a later report to hide an earlier close or replace its binding. Existing replay catches malformed historical events, but a different self-consistent history passes. `test_lifecycle.py:369` currently exercises a barrier without first validating either close, and no test compares successive snapshots.

2. **P1: Failed independent validation still permits publication of a true public close flag.** `run-runtime.py:137` correctly gates the operation ledger on independent validation, but `run-runtime.py:232` unconditionally projects the entire private journal in `finally`. `numeric.py:352` copies `closed_owner_absence_validated` directly from each journal row. If the controller emits its true close row and Python refuses the lifecycle proof, the catch marks the session failed, but `receipts.jsonl` still receives a close row with `closed_owner_absence_validated: true`. The contract requires this public boolean to require both controller and Python acceptance and places receipt projection after that gate. The failed session status does not repair the published true flag.

## Focused reproduction

All reproduction data below is the shipped synthetic fixture, never a real preparation. The existing suite passes: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v test_lifecycle.py` reports 21 tests, OK.

This compact additional test reproduces finding 1 against the reviewed source:

```python
import test_lifecycle as t

with t.Fixture() as f:
    metadata = t.lifecycle.validate_close(f.work, f.config, f.command, f.ack)
    f.write_json(f.work / 'observations' / 'validated-close-125.json', metadata)
    ack = f.barrier()
    report = ack['lifecycle_evidence']['observer_report']
    for row in report['transitions'] + report['events'] + report['states']:
        if row['inlet'] == 2:
            row['request_id'] = 124
    f.write_json(f.work / 'observations' / 'ack-request-200.json', ack)
    # This must raise ValueError; reviewed implementation accepts it.
    t.lifecycle.validate_barrier(f.work, f.config, ack, {'int': 2, 'float': 2})
```

Additional executed mutations and results:

| Synthetic check | Observed result |
| --- | --- |
| Second close request 141 rewrites the accepted request-125 prefix to 124 | ACCEPTED |
| Second close request 141 drops the accepted float prefix and returns its state to monitoring | ACCEPTED |
| Second close changes the earlier witness ordering while preserving valid local replay | ACCEPTED |
| Barrier contains both reported closes but no earlier validated-close records | ACCEPTED |
| Historical witness is moved before dispatch-start | REJECTED with ValueError |
| Current witness is removed, then validate_close is called | REJECTED with ValueError |
| The corresponding controller-true synthetic step-complete is projected by the finally-block projector | Public close flag remains True |

For the second-close cases, the fixture was copied to an int/revision-1 ACK and command with request 141 and exact owner-0 bindings; the matching synthetic raw root and ACK were retained. The first float close and its returned metadata were accepted and retained before mutating the second report. These results therefore exercise cross-snapshot integrity, rather than only malformed single-report input.

## Minimal correction

For history, factor the existing close checks into a non-retaining internal verifier so historical ACKs can be independently revalidated without colliding with exclusive root retention. Require the expected set of earlier accepted closes at every later close and at the barrier, with an independently anchored expectation rather than inferring it only from the new report or from whichever files happen to remain. For every earlier close, read the retained raw ACK, the retained raw root, and its strict private validation metadata; verify digest/size, parsed binding, and the semantic conjunction again. Then require canonical, type-sensitive equality of the earlier report's transition/event prefix in the new report, with the already closed owner's final state preserved. Do not accept a marker boolean or unchecked metadata as proof. Missing, replaced, rewritten, or reordered prior evidence must refuse. The expected set must also prevent a second close from omitting an earlier owner entirely.

For public projection, track successful Python close validation and refuse or gate any public true close flag that lacks it, including in the exception/finally path. Add a focused failure-path runner test that injects a controller-true close journal row while the validator raises and verifies that no true public close claim is published. Preserve the existing public row shape and successful 156-request count.

## Checks that passed

- Strict nested private schemas reject unknown fields; retained JSON parsing rejects duplicate object keys and nonfinite constants. Canonical JSON equality distinguishes booleans from numbers, and required numeric/integer fields reject bool substitution.
- Close raw ACK bytes are exclusively retained before validation. Python reads the bound raw root independently, compares it type-sensitively with the ACK proof, retains it exclusively, and computes its digest/size. Static symlink/path escapes, hard-linked private files, and wrong private modes are refused by the inspected path/read gates; retained root files use 0600 and private directory gates require 0700.
- Exact root originals plus four harness members, sealed geometry policy, primitive live proof values, freebang/send text, driver classes/text/geometry/count, duplicate-sensitive routes, and observer event ports 1 through 4 with five declared physical inlets are checked.
- All 31 samples are required with exact phase/attempt sequencing. Originals, reader, disposer, retained firstobject, freebang, and send require primitive positive validity before disposal and complete invalidity by the final poll without revival after the first joint-invalid sample. Root validity and window/firstobject diagnostics remain diagnostics.
- One nonthrowing disposal result and exactly one eligible bang between dispatch-start and close-validated are independently replayed. Synchronous and asynchronous witness ordering both pass; malformed order, duplicates, wrong owners, stale bindings, failures, and forged states refuse within a report.
- The runner validates the close before journal-bracket acceptance and ledger advancement. The pinned timeline produces 54 operations, 102 checkpoints, and 156 public requests; its close requests are 125 and 141. The additional private barrier is request 157, is validated before complete, and creates no new score/public command-request row. Barrier replay requires revision-1 owners closed with one witness and revision-2 owners monitoring with zero witnesses.

## Verdict

REQUEST CHANGES for the two P1 issues. The current local replay and close conjunction are substantial, but the evidence chain between accepted snapshots and the public failure path do not yet meet the frozen contract. No claim about installed Max runtime delivery is made by these offline checks.

End-of-review hash verification: all three reviewed implementation/test sources and both contract sources match the SHA-256 bindings recorded above.

## Independent re-review, 2026-10-22

Verdict: **PASS for the frozen Python lifecycle and runner corrections. No remaining finding in this scope.** This verdict supersedes the earlier REQUEST CHANGES for the revised sources bound here. It authorizes no claim about installed runtime delivery; that remains a controlled-capture requirement.

| Revised source | SHA-256 |
| --- | --- |
| lifecycle.py | `4c491651184680e8a40edb75219757d2cea61a35eb66735de24bb61ae055ce5d` |
| test_lifecycle.py | `0873013fcb255c677ba3d2a8b1cf7fbc4c1d5be2ac66af942696688788de243b` |
| run-runtime.py | `b265bfe0c822e1d32bf9dd78ef608d61124e6db4c6a0aaab8bd8cdede469374e` |
| test_runner.py | `3c0e3e7a33b78f38bcd94960b8deb3161c363ed58eb6922bd8a71af12ea3b057` |
| int-float-freebang-protocol.txt | `25a4382566b63a01a33b267f003a8e9226d4ea377626794ad88aac1273aeead9` |
| int-float-freebang-design.md | `9f707237c35e39c941151212657e1a0b60f66c8b1f481e3daffe7563cac4b234` |

Read the correction report and the latest FROZEN-REVIEW AMENDMENTS, then independently inspected the actual revised code and tests. The first four paths remain relative to `experiments/max-reference/int-float-runtime-20261022/`.

- **Finding 1 resolved:** `lifecycle.py:489` provides a non-retaining close verifier, while `lifecycle.py:552` reads and semantically revalidates the mandatory earlier close proofs. The expected predecessor set comes from fixed score order `(2, 0)`, rather than the later report or a directory scan. Strict metadata checks bind actual raw ACK/root bytes, hashes, exact integer sizes, retained paths, and owner/request identity; the original raw root must still equal the retained bytes. The complete typed sample/disposal/route/event conjunction is rechecked even when metadata hashes have been recomputed. `lifecycle.py:544` enforces type-sensitive transition/event prefixes and unchanged already-closed owner state. First-close invented history, omitted predecessors, and locally valid historical rewrites now refuse.
- **Finding 2 resolved:** `run-runtime.py:162` records accepted closes only after independent validation and private metadata retention. `run-runtime.py:36` checks each public positive close row against that accepted owner/request binding and rejects missing, mismatched, mistyped, or duplicate close claims. The actual cleanup path calls this projector at `run-runtime.py:258` before writing public receipts. Journal hashing now precedes projection, preserving the private diagnostic binding even if public projection refuses. Successful public row shapes remain unchanged.
- **Fresh verification:** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v test_lifecycle.py test_runner.py` passed all 35 methods: 29 lifecycle and 6 runner. The lifecycle suite now exercises a full accepted request-125 close, request-141 close, and barrier chain, including an asynchronous earlier witness. It also exercises missing/altered/unsafe predecessor files, strict metadata types and parsing, semantic historical refusal despite matching hashes, and historical prefix continuity.
- **Independent targeted probes:** reran a barrier that rewrites the accepted float request 125 to 124; deleted the int predecessor's validation metadata at the barrier; altered the original int raw-root bytes after acceptance; omitted the accepted float history from the second close; and attempted public projection of a controller-only positive close row. All five probes rejected with ValueError.

No implementation, test, preparation, or runtime edits were made during this re-review, and no runtime was launched. Final hash verification confirms all four revised Python sources and both requirements sources still match the bindings in this re-review.
