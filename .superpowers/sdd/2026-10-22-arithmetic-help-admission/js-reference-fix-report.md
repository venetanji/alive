# Arithmetic Reference Frontend Review Fix

Frozen 2026-10-22. The frontend Reference catalog still contained only the 13
earlier safe IDs. Its shared membership check rejected arithmetic responses,
blocked opening arithmetic Reference pages and disabled safe related links.
The production fix adds exactly `times`, `plus` and `minus` to that finite
catalog in `canvas-help-view.mjs`; no other production behavior changed.

The parent archived both owned files before this fix under the private
`arithmetic-help-admission-review-fix-baseline-20261022` evidence directory.
This wave edits only `canvas-help-view.mjs` and `canvas-help-view.test.mjs`.
Earlier admission source hashes remain unchanged. Impeccable's craft floor
was read before editing; the existing shell appearance is preserved.

## TDD And Verification

- RED: the focused view suite reported seven expected failures: safe response
  acceptance and shell Reference rendering for each arithmetic ID, plus safe
  related-link navigation. Existing focus/interaction cases passed.
- GREEN: 40/40 tests pass across help-view, arithmetic-help import, legacy
  help import/schema and max-dialog suites. The view suite has 14 passing
  cases, including eight new original synthetic cases.
- New checks cover each exact safe response identity, mismatched identities,
  opening/rendering each shell's Reference, literal markup-shaped plain text,
  enabled safe related navigation, and disabled/refused symbolic, path and
  unknown aliases. Bounds and malformed field checks remain enforced.
- Existing delayed response, focus, keyboard, helper drag and width-reset
  tests pass. Both edited modules pass `node --check`.
- No CSS, redesign, app/Max/browser launch, licensed prose, subagent or commit.

Command:

```sh
node --test apps/ultra/ui/canvas-help-view.test.mjs apps/ultra/ui/canvas-help-arithmetic-import.test.mjs apps/ultra/ui/canvas-help-import.test.mjs apps/ultra/ui/canvas-help-shell.test.mjs apps/ultra/ui/canvas-max-dialog.test.mjs
```

## Frozen SHA-256

| File under `apps/ultra/ui/` | SHA-256 |
| --- | --- |
| canvas-help-view.mjs | `3569262b2566c58e5f46730d9249ec008b7773fc2bb805be848d61616e92e8ac` |
| canvas-help-view.test.mjs | `cafc460c90c03387d0660dbffc7b1af59e9ef8040e0379064774473a704d6c84` |

Rechecked unchanged earlier admission hashes:

| File under `apps/ultra/ui/` | SHA-256 |
| --- | --- |
| canvas-help-shell.mjs | `41a128d14bb0479eaab27feb1b88533758934b047f6a1c0bf6da6346b886caa0` |
| canvas-max-import.mjs | `bcd8dd1a7a7d2ab229383f15a533b8df080b1c8015370b61ec4a297993217aed` |
| canvas-help-arithmetic-import.test.mjs | `12a5d704215211446d5a94310b42ca5b5fc3b37fe9000b83b9675bdc5736c07e` |
