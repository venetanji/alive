# Corrected Arithmetic Comparison Review

Review outcome: no remaining findings in the corrected frozen comparison
implementation. This report records an independent review of parent-owned
`compare.py` and `test_comparison.py`, with focused verification of the runner
coverage changes they consume. The reviewer made no implementation edits.

## Resolved Findings

1. **Unexpected private states were silently truncated.** `compare_capture`
   originally checked that there were 72 readback requests and then paired
   them with snapshots using `zip`, allowing an extra trailing snapshot to be
   ignored. The corrected `pair_readbacks` requires exactly 72 requests and
   72 states, unique positive integer request IDs, and matching IDs in order.
   Original regression tests reject extra, missing and reused states.

2. **Native evidence content hashes did not enforce privacy.** The CLI
   originally read native private artifacts using ordinary file reads, so an
   identical world-readable or worktree copy could satisfy its hashes. The
   corrected `read_native_private` requires an external, nonsymlink 0700
   directory with exactly the five expected artifacts and reads each through
   the existing strict private-file reader. That reader checks regular files,
   0600 mode, a single link, nonsymlink paths and stable file identity. The CLI
   also checks that the retained native bytes remain unchanged throughout
   comparison. Original tests cover invalid file permissions, directory
   permissions and symlinks.

3. **Historical close evidence was not tied to scored close request IDs.**
   The final barrier already independently revalidated all six historical
   close proofs, but the comparison originally constructed its accepted close
   map solely from the operation ledger. A consistently renumbered close in
   the ledger and journal could therefore remain detached from its retained
   proof. The corrected `bind_close_proofs` ties all six validated historical
   root proofs to the scored request, step, owner, revision and source identity
   before publishing accepted close receipts. Original tests reject changed
   proof identities and an extra proof.

4. **Boolean fields could satisfy integer identity comparisons.** Independent
   original-fixture probes confirmed that `True` was accepted as sequence 1,
   journal revision 1, ledger action revision 1 and snapshot revision 1.
   Corrected checks require exact integer types. Runner coverage additionally
   requires the contiguous operation/readback request sequence from 1 through
   150. The four boolean mutations and a renumbered close request now fail.

## Verification

Working directory: `/home/venetanji/Work/alive`.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 experiments/max-reference/arithmetic-roots-runtime-20261022/test_comparison.py
PYTHONDONTWRITEBYTECODE=1 python3 experiments/max-reference/arithmetic-roots-runtime-20261022/test_runner.py
```

Both commands exit 0: nine comparison tests pass and nine runner tests pass.
The reviewer also repeated the five focused original-fixture mutation probes
described in finding 4; all are refused after correction.

Static review confirms that comparison results expose counts, hashes and
finite outcomes only. Exact typed original-output multisets and all 504
numeric states are checked against the separately verified native result.
Observer callback order is not promoted to saved cable order:
`saved_order_observed=false`. Installed-help qualification passes added: 0.

## Frozen Review Binding

Paths in this table are relative to
`experiments/max-reference/arithmetic-roots-runtime-20261022/`.

| Reviewed Artifact | SHA-256 |
| --- | --- |
| `compare.py` | `f7705ebd3cef64dde2d7104892f9bf01284796f9667ba3ba508bff44eb14487b` |
| `test_comparison.py` | `24e1ed270ec63f08ec84340dfac0bab0e8d2afaa4c20ddec92fa4623562778c8` |

The final hash check matched the files inspected and tested. The previously
reported findings apply to earlier revisions and are resolved at this binding.

## Remaining Validation Gap

The complete `compare_capture` CLI remains unexecuted against a completed Max
capture. Capture 001 failed before its first install completed, so it provides
no full comparison result. A separate investigation of source-bound geometry
diagnostics is underway. These facts do not change the finite native score or
establish Max parity.

This review launched no Max process and repeated neither native scoring nor
the exhaustive native corruption run. No further native run accompanies this
report.
