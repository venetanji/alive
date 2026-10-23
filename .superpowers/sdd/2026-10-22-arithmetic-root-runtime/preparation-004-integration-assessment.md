# Preparation 004 Parent Integration Assessment

Verdict: no functional parent integration change identified under the supplied preparation004 contract. The existing runner and comparator preserve complete private checkpoint dictionaries and raw payloads, and the comparator revalidates retained readbacks before comparing them. This assessment does not approve the moving worker implementation or authorize a capture.

## Scope and Evidence Binding

Read-only review of the following files under `experiments/max-reference/arithmetic-roots-runtime-20261022/`:

| File | SHA256 |
| --- | --- |
| `run-runtime.py` | `50450027c202b5ebed6ee3a1e7df1de46c04a47849d25b45307cb9267edd2abb` |
| `compare.py` | `f7705ebd3cef64dde2d7104892f9bf01284796f9667ba3ba508bff44eb14487b` |
| `test_runner.py` | `f8815e7d10d901f7183cd7fff0bdc124793135815ad146bde2699977bc1a10fc` |
| `test_comparison.py` | `24e1ed270ec63f08ec84340dfac0bab0e8d2afaa4c20ddec92fa4623562778c8` |

No worker implementation files were inspected for this assessment. No runtime, capture, Max, Wine, display, browser, or test suite was launched. Only this report was written.

## Supplied Contract

The parent supplied these assumptions; their implementation remains for the worker freeze review:

- `arithmetic.validate_checkpoint` independently validates the exact times-only V8 policies and witnesses, and retains the evidence.
- Gated numeric states preserve actual `class_name`, add `source_class`, retain `semantic_tag='float'`, use the existing key `semantic_tag_basis` with value `source-flonum-and-live-v8-format6`, and set `receipt_tag_observed=false`.
- Raw readbacks and pre-close proofs carry `v8_representation_witnesses` with three numeric and two root witnesses.
- `lifecycle.py` independently validates pre-close witnesses.
- Existing function signatures and retention result keys are unchanged.

The `semantic_tag_basis` spelling incorporates the parent's correction to its initial shorthand.

## Integration Trace

1. `run-runtime.py:174` retains the complete command ACK payload privately before parsing and accepting it. No parent ACK schema projection drops added witness fields.
2. `run-runtime.py:239` invokes `lifecycle_validation.validate_close(work, config, command, ack)` before accepting any scored close or publishing the closed-owner claim. The parent passes the full ACK and private work directory to the validator and retains the validator's complete returned metadata. The preparation004 pre-close witness checks therefore fit the existing validation boundary.
3. `run-runtime.py:275` delegates raw retention and checkpoint validation to the unchanged `extract_checkpoint` interface. It reads the complete retained raw payload for causing-action checks, then adds only action-binding fields to the returned checkpoint. `run-runtime.py:285` appends that full result directly; `run-runtime.py:346` writes the full private snapshots. There is no state-field allowlist that would erase `source_class`, `semantic_tag_basis`, or `receipt_tag_observed`.
4. `run-runtime.py:62` publishes an allowlisted identity/count projection with `raw_sha256` and a canonical hash of the full checkpoint. Thus raw witness bytes remain bound by the raw digest, and added validated state metadata is committed by the full checkpoint digest without being published. `run-runtime.py:348` uses this projection for every checkpoint.
5. `compare.py:215` pairs all retained readbacks with their private snapshots. It reads each complete raw payload, checks byte length and digest against both request metadata and the snapshot, and checks causing-action binding. `compare.py:226` then calls `validate_checkpoint` again on the complete raw object. `compare.py:229` requires full dictionary equality with the private snapshot after restoring the existing raw/action bindings. Added metadata cannot be silently stripped or altered on this path if the supplied validator returns it as specified.
6. `compare.py:93` compares the seven source-bound state anchors, scalar values, and `semantic_tag` with the native result. It imposes no second observed-class-equals-source-class check. The actual V8 class can therefore remain distinct from `source_class` while the independently validated semantic tag supplies the comparison meaning. `compare.py:113` also hashes each full checkpoint set in the comparison result.
7. `compare.py:231` invokes `lifecycle.validate_barrier(work, config, retained_barrier_ack, {})` before binding all six retained close proofs to scored requests at `compare.py:239`. `run-runtime.py:296` invokes the same barrier validator during capture. The worker freeze review must confirm that this existing barrier path revalidates every retained pre-close witness; `bind_close_proofs` itself checks owner/request identity and does not validate witness contents.
8. `compare.py:243` reconstructs the public checkpoint projection from the fully revalidated states and requires equality with the captured public artifact. `compare.py:116` continues to report getter scalar tags as unobserved, consistent with semantic inference and `receipt_tag_observed=false`.

The runner's typed-float dispatch check at `run-runtime.py:250` consults the unchanged authored target descriptor. It does not infer source class from the newly measured V8 representation, so preparation004 needs no change at this dispatch boundary.

## Tests and Residual Limits

`test_runner.py:59` already checks that private checkpoint fields and numeric values stay out of the public projection, but its minimal fixture does not explicitly exercise preparation004 metadata or witness fields. Its coverage fixtures at `test_runner.py:87` intentionally exercise counts and owner/request binding rather than worker validation semantics.

`test_comparison.py:21` supplies minimal, already validated states. The comparison tests cover complete denominators, values/tags, state anchors, owner binding, private readback pairing, private native retention, and scored-close identity binding. They do not exercise `compare_capture` end to end with the new worker metadata and witnesses. This is a narrow regression-coverage limit, not evidence of a required parent code change.

If the parent adds preparation004 regression coverage, useful synthetic assertions are that added private metadata changes the full checkpoint digest while staying out of the public projection, and that a validated float semantic tag still compares correctly when actual and source class metadata differ. Evidence policy rejection and retained pre-close witness revalidation belong in the worker's focused validator tests and freeze review.

This report establishes compatibility of the four reviewed parent files with the supplied contract. It does not establish that worker004 implements its times-only gates correctly, that the lifecycle barrier transitively revalidates the new witnesses, or that any complete runtime operation has passed.
