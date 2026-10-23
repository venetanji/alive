# Comment Phase Code Review

Scoped review on 2026-10-22 of the new comment schema, Max import, wrapping and
callout rendering, Inspector defaults, and textarea editing integration. The
existing dirty checkout was preserved; no product files or commits were made by
this reviewer. The parent-owned CRLF preservation and ordinary newline paste
regressions were excluded from duplicate findings.

## Final Findings

No outstanding findings in the scoped final re-review.

The accepted **P2 - Text color unexpectedly controls the independent callout
outline** is resolved. `apps/ultra/ui/canvas.css:47` now defaults SVG stroke to
`var(--comment-outline)` independently of text color. The existing explicit
`style.color` inline override in `apps/ultra/ui/canvas-appearance-view.mjs:37`
remains intact, and omitting/resetting that override clears the inline stroke
so the independent theme default returns. Inspector outline defaults therefore
match the rendered outline even when text is transparent.

The original browser regression at
`apps/ultra/tests/ci/canvas-comment-entry.spec.mjs:50` imports
`{bubble:1,textcolor:[1,0,0,0]}` without `color`, checks transparent text and an
opaque gray outline, then checks that an outline opacity edit preserves gray
RGB. Its initial run failed for the intended reason: expected
`rgb(217, 217, 217)`, received `rgba(255, 0, 0, 0)`. It passes in the parent's
full 88-test browser run, whose completion was read from
`/tmp/ultra-comment-browser-full.log` during the final review.

No other concrete new defects were identified in this bounded review. Shared
validation rejects invalid comment-only attributes; import retains flat
comments and supported inherited font sizes; text uses literal `textContent`;
callout geometry remains bounded at permitted minimum dimensions; reset and
runtime polls retain their existing interaction target and executable revision.

## Verification

From `apps/ultra/ui`:

```sh
node --test canvas-appearance.test.mjs canvas-catalog.test.mjs canvas-max-import.test.mjs canvas-dom.test.mjs canvas-inspector.test.mjs canvas-comment-ui.test.mjs
```

Result: 112 passed, zero failed in this reviewer's focused run. Rust
shared-corpus consumption was inspected.

From `apps/ultra/tests/ci`:

```sh
npx playwright test canvas-comment-entry.spec.mjs --grep 'independent inherited color'
```

Result: one expected regression failure before the parent repair; the parent's
full browser run subsequently passes 88/88 including this regression. The
reviewer's temporary Playwright server finished and port 4173 was released.

Parent-reported broader verification: full JS 336 passed; contracts exit 0;
release Rust 108 passed and 2 ignored; updated release build exit 0; native
comment-only first run exit 0. Parent inspected one visual batch at 1120x780
and 800x600 with no additional issue or confirmation pass required. These
checks were not rerun by this reviewer. A later test-only tightening of the
typography fixture from height 55 to its saved height 54 remains the parent's
targeted verification; this final re-review only qualifies the outline repair.

No screenshot was viewed or additional server, runtime, broad test, or visual
pass started during the final re-review. Shipped native behavior and font
metrics are bounded by the parent's original fixtures and inspected sizes.
The accepted linecount loader-fit gap, unresolved fonts/styles, local
saved-rectangle rendering approximation, and complete-root qualification
limits remain explicit. This report makes no additional Max color-parity
claim beyond the local independent Inspector control contract.
