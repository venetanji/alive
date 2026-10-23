# Scalar Arithmetic UI Review

Independent bounded review of the scalar arithmetic UI on 2026-10-22. Both
initial findings were fixed by the implementation owner and independently
rechecked. No open findings remain in the reviewed scope. Product files were
not edited by this reviewer.

## Resolved Findings

1. **P2: Some valid saved float operands cannot round-trip through object text.**
   `apps/ultra/ui/canvas-arithmetic.mjs:21` expands scientific Number strings to
   plain decimal, but `apps/ultra/ui/canvas-catalog.mjs:121` rejects any object
   text longer than 160 characters before the fix. A valid saved modern Add with
   `{rhs: Number.MIN_VALUE, numericmode: 2}` passes `validatePatch`, renders as
   328 characters, and immediately fails `parseObjectText(objectText(node))`.
   The same problem starts with ordinary finite values around `1e-157`, without
   needing a subnormal value. Opening the saved object and pressing Enter on
   unchanged text therefore failed. The original small-number regression
   stopped at `1e-25`.
   Resolution: `apps/ultra/ui/canvas-catalog.mjs:128` now gives arithmetic text
   a 384-character budget and keeps other object text at 160. The extended
   arithmetic unit regression covers both signs of `Number.MIN_VALUE` and the
   smallest normal double; a browser regression covers unchanged negative
   subnormal editing. Independent direct checks pass for 42 tiny-float round
   trips across all seven binary kinds; the longest tested text is 330
   characters. Status: **resolved and independently verified**.

2. **P3: Legacy multiplication completion inserts the modern default and gives
   incorrect typing guidance.** `apps/ultra/ui/canvas-completion.mjs:29`
   originally took the default operand from `ARITHMETIC.multiply.rhs` for every
   spelling.
   Consequently `completionFor('multiply ')` and
   `completionFor('multiply.legacy ')` offer `0`, labeled `Default rhs`, although
   `parseObjectText('multiply')` and `parseObjectText('multiply.legacy')` correctly
   produce `{rhs: 1, numericmode: 0}`. Accepting the advertised default changed
   legacy multiplication from passthrough to zero output. The same completion
   detail claimed a decimal marker selected float mode and exponent syntax was
   unsupported, whereas these legacy aliases keep mode 0 and accept scientific
   spelling.
   Resolution: `apps/ultra/ui/canvas-completion.mjs:28` now derives legacy
   operand defaults and guidance from the invoked spelling. The new regression
   checks all four legacy spellings and contrasts symbolic multiplication.
   Independent direct checks confirm the six legacy/modern defaults agree
   with parsing and legacy scientific tokens retain mode 0. Status:
   **resolved and independently verified**.

## Verification And Scope

- Read the approved design and plan, the frozen original runtime summary's
  targets/cases/limitations, the arithmetic module, model/catalog/appearance/
  inspector/completion/import/canvas integrations, shared-controller arithmetic
  admission, original examples, and generated library integration.
- Independently ran `node --test apps/ultra/ui/canvas-arithmetic.test.mjs
  apps/ultra/ui/canvas-arithmetic-examples.test.mjs
  apps/ultra/ui/canvas-shared.test.mjs`: **38 passed, 0 failed**.
- After the fixes, independently ran `node --test
  apps/ultra/ui/canvas-arithmetic.test.mjs
  apps/ultra/ui/canvas-completion.test.mjs`: **12 passed, 0 failed**, plus the
  direct cross-kind tiny-float/default checks described in the resolutions.
- Confirmed both findings using direct module calls. Tiny-float reproduction:
  build `makeNode('add',1,0,0,{rhs:Number.MIN_VALUE,numericmode:2})`, validate a
  one-node patch, then run `parseObjectText(objectText(node))`. Completion
  reproduction: compare `completionFor('multiply.legacy ').choices` with
  `parseObjectText('multiply.legacy').params`.
- Inspected the recorded complete JS run `ui-full-green.log`: **348 passed,
  0 failed**. The new browser suite covers six faces, typed text and reset
  defaults, Undo/Redo, inspector lock behavior with live rhs, legacy text,
  exponent refusal, fractional integer refusal, and palette defaults. The
  implementation owner owns the full browser rerun and native desktop check;
  this review did not duplicate those runs or produce captures.

No additional material defects were found in the reviewed paths. Mode is
structural across standalone parameter changes/history, shared root/child
admission, lock gating, and inspector/help identities; rhs remains live.
Old rhs-only Add/Multiply documents retain mode 0 and multiplication rhs=1;
symbolic creation uses the new typed defaults. Float modulo and explicit
modern exponent refusal agree with the frozen evidence and approved scope.

The finite oracle does not qualify arbitrary values or installed whole help
roots. It explicitly leaves bare reverse-divide's exact numerator default,
float named-inlet variants, integer input to float-configured abs, additional
exponent spellings, and Max console error wording unmeasured. The bounded
profile warning and bare `!/` import warning remain necessary. This review
does not change whole-help qualification from 0/2103 or claim all Max behavior
is complete.
