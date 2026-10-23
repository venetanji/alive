# Focused Python lifecycle history correction

2026-10-22. The two implementation/test sources below are frozen for independent review. This task changed only `lifecycle.py`, `test_lifecycle.py`, and this report. It did not launch Max, prepare a capture, read a licensed graph body, or print private runtime evidence.

## Source bindings

Paths in the first two rows are relative to `experiments/max-reference/int-float-runtime-20261022/`.

| Source | SHA-256 |
| --- | --- |
| lifecycle.py | `4c491651184680e8a40edb75219757d2cea61a35eb66735de24bb61ae055ce5d` |
| test_lifecycle.py | `0873013fcb255c677ba3d2a8b1cf7fbc4c1d5be2ac66af942696688788de243b` |
| int-float-freebang-protocol.txt | `25a4382566b63a01a33b267f003a8e9226d4ea377626794ad88aac1273aeead9` |
| int-float-freebang-design.md | `9f707237c35e39c941151212657e1a0b60f66c8b1f481e3daffe7563cac4b234` |

The final two rows bind the latest existing requirements read during this task; neither requirements document was edited here. The original P1 reproduction and reviewed pre-fix source bindings remain in `int-float-freebang-python-review.md`.

## Change

The original validator replayed each ACK independently. Consequently, a later locally consistent snapshot could rewrite or omit an already accepted close, and a barrier could pass without either earlier close having passed independent Python validation.

`_verify_close` now applies the existing close conjunction without retention side effects. Current closes still exclusively retain their exact raw root and return the unchanged private metadata shape. Historical validation does not attempt exclusive re-retention.

The independently expected predecessors come from this existing finite score's documented `CLOSE_ORDER = (2, 0)`: float revision 1 closes before int revision 1. A first float close cannot invent an earlier int close; an int close requires the independently accepted float proof; a barrier requires both. No predecessor is inferred solely from the latest report or from whichever files happen to remain, and no new configuration field or generic importer behavior is introduced.

For every required predecessor, the validator reads the expected owner's retained root, derives its request ID, and reads the matching retained ACK and `validated-close-<request>.json`. Strict metadata schemas, positive exact integer sizes, SHA-256 values, the exact retained root path, actual raw bytes, parsed bindings, sealed owner/helper/config identity, driver/root topology, all 31 typed samples, disposal, and observer replay are checked again. The original bound raw root must also still match the retained bytes. A marker boolean or matching digest metadata cannot replace actual semantic proof validation. Existing private path, symlink, hard-link, mode, stable-read, duplicate-key, and nonfinite-JSON protections apply to these historical files.

Every accepted transition/event collection must remain an exact canonical, type-sensitive prefix of the following snapshot, and each already closed owner's full final state must remain unchanged. The barrier also verifies continuity between its two independently revalidated predecessor reports.

Public signatures, public receipt schemas, score operations, comparator code, JavaScript helpers, and the typed sample/convergence rules are unchanged.

## Red/green evidence

- Baseline: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v test_lifecycle.py` passed all 21 original tests.
- RED, before editing `lifecycle.py`: the expanded 29-test lifecycle suite failed with 57 expected `ValueError not raised` failures. The full valid two-close/barrier sequence still passed. The failures covered absent independently accepted predecessors; invented, rewritten, reordered, or dropped history; missing/altered/unsafe prior files; malformed metadata; and invalid historical conjunctions with freshly matching digest metadata.
- GREEN: the same 29 lifecycle test methods passed after implementation. The full chain additionally covers both synchronous and asynchronous earlier witnesses, and preserves the first retained raw bytes while revalidating them.
- Final focused integration check: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v test_lifecycle.py test_runner.py` passed all 35 tests (29 lifecycle, 6 runner). Runner sources/tests were owned by the parent task and were not edited here.
- Both assigned Python sources compiled successfully using in-memory `compile`, without creating bytecode files.

All verification here used synthetic/offline fixtures. Installed runtime delivery remains a separate capture requirement.
