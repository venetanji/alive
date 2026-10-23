# Preparation008 Python Independent Review

Date: 2026-10-23 (Asia/Hong_Kong).

## Findings

1. **P2 - Valid failed readbacks lose retained evidence and session byte bindings.** `arithmetic.py:1758` requires success-payload causing-operation fields before reaching retention, and `arithmetic.py:1764` performs full checkpoint validation before `retain_raw` and the request-record update. A genuine V8 refusal has the existing five-key failure envelope, which intentionally lacks those success-payload fields. Even with a valid trusted caller record and matching request ID, extraction raises `Trusted plus V8 causing-operation binding changed`, never retains the raw bytes and never records their hash/size in the session request. Success-shaped payloads that fail later checkpoint validation likewise bypass retention. This regresses the frozen runner's existing failed-readback evidence protocol and prevents later audits from using the normal original/retained/session binding. Separate trusted caller/context validation from successful-checkpoint admission: invalid or missing trusted context must still refuse before any record update, while a valid trusted request must retain/account its failed result before propagating checkpoint refusal. Add controls for both the failure envelope and a success-shaped payload failing later validation, alongside the existing invalid-trusted-record controls at `test_preparation.py:551`.

2. **P2 - Projection normalization hides non-integer source identity fields.** `arithmetic.py:239` includes `saved_edges` and `observer_leaves` without strict nested identity/count validation, then hashes them through `_source_canonical` at `arithmetic.py:190`, which normalizes whole-valued floats to integers. Consequently, changing an observer leaf's port or a saved edge's index from an integer to a float preserves the projection digest; both metadata validation and a full seven-state checkpoint accept those documents. A float source endpoint port also passes metadata preflight, although existing retention later rejects it. The accepted design explicitly requires Python `type(x) is int` for JSON identities/counts. Validate exact leaf/edge schemas and strict types before normalization; geometry/scalar equivalence must not erase identity typing. Extend `test_preparation.py:458` with integer-versus-float controls for leaf ports, edge indices and both source/destination ports, requiring early metadata refusal as well as checkpoint refusal.

Specification verdict: **CHANGES REQUIRED**. Code-quality verdict: **CHANGES REQUIRED**. The findings concern evidence retention and strict shared-schema enforcement; they do not establish a live admission or parity result.

## Frozen Review Inputs

| Artifact | SHA256 |
| --- | --- |
| Accepted design | `79e6d3bd2db09eb87a6d62f02752989c1d571411a2d4afcb8de019866c11943a` |
| Python worker report | `752932222cffda45c88289468c1d4e5a3d982707479fc69dc466cddb58021e48` |
| Python review diff | `f6f4cef90c73f6de44a814e2235b4650d92dc7ff5297c3a2ce875612043528ad` |
| Python review map | `ef16091535e977dc0701b7435c399536e6296b8b11c76a3d0067cf9e3aeb1198` |
| Frozen `arithmetic.py` | `83498823d4bf54c614ffe6a070edbba231144f2b31b9fcaef90eab9899a3205b` |
| Frozen `test_preparation.py` | `22db6ad9cb9005c4549f26ffb1261a47178eab4af94194bd0481daca67da2106` |

The review also applies the common and Python briefs, task-review contract and parent's operation ruling. No new serialized `op` field is required; original command context and the existing trusted runner record remain the binding interfaces.

## Focused Evidence And Scope

Read the frozen diff and matching implementation/test hunks. Reads outside the diff addressed two named interface risks: the frozen runner's request-record/retained-byte protocol, and whether existing retention rejects identity types that the new normalized projection admits. No broad re-audit or suite rerun occurred.

One `python3 -B` in-memory probe used the independent serialized positive fixture, copied dictionaries and mocked private I/O/retention. It wrote no temporary file or evidence. It produced:

| Mutation / Boundary | Metadata Accepted | Checkpoint Accepted | Other Observation |
| --- | --- | --- | --- |
| Observer leaf port changed to float | yes | yes,7 states | Strict source identity type lost |
| Saved edge index changed to float | yes | yes,7 states | Strict source identity type lost |
| Saved source endpoint port changed to float | yes | no | Refusal deferred beyond metadata |
| Existing failed-readback envelope with valid trusted record | not applicable | no | `retain_raw` uncalled; session raw hash/size absent |

The positive fixture constructs policy/witness data without the production policy/witness factories. The failed-envelope probe keeps the trusted record valid; it does not weaken the required invalid-context refusal.

Both required files have corresponding production/test hunks. The loader is independent of current package verification, historical executable imports and recursive metadata construction; it covers historical files, sealed inputs, owners, source reconstruction, trace and diagnostic semantics. The exact five-policy and witness schemas, pristine projection, source views, scalar shapes, both revisions/actions and trusted-record conjunction have substantial controls. Existing times behavior and tests remain in the frozen diff context. The two findings identify specific uncovered boundaries rather than a lack of broad test volume.

Worker-reported test-first evidence records meaningful initial missing-feature RED failures, then separate RED failures for source/driver correspondence and strict count/receipt controls, followed by GREEN results. Its recorded complete Python suite is77 tests,76 executed passes and one existing external-evidence skip. Those recorded tests were not rerun; parent independently owns the fresh complete suite. The focused checks answer doubts not covered by those recorded controls.

## Preservation And Remaining Gates

All26 private arithmetic inventories remain unchanged, including names, modes, sizes, mtimes, inodes, file hashes and link targets. Frozen Python files and review inputs retain the listed hashes. Concurrent JS edits are confined to the separately authorized task and are not treated as Python freeze violations. The accepted007 audit and exact five native originals remain intact.

Only this report is written. No code/private/history change, suite rerun, preparation, archive, native/target/display launch, capture, commit or delegation occurred. Parent queues test-first fixes; integrated JS/lifecycle compatibility, independent fix review and all later preparation/capture gates remain outstanding. Full denominators and qualification0/2103 remain unchanged.

