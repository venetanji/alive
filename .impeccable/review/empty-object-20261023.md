disposition: ship

Bounded refinement of Ultra's existing Max-inspired editor. The retained
Max autocomplete and control captures establish the compact box and rail
direction; this pass adds no new Max runtime observations.

New object entry is blank and focused, with standard top/bottom rails.
Completion appears after typing. Empty Enter cancels new creation; clearing
an existing object still shows its validation error. Comments retain their
multiline editor. Outlet notches mirror inlet notches without changing
port dimensions, hit areas or cable endpoint calculations.

Verification: 334 JavaScript tests pass. Of 71 browser checks, 70 passed on
the first run; one new check used the wrong starter-object ID. After that
test correction, both new checks pass. Existing wiring, zoom, controls,
completion and multiline-comment checks pass. Independent code review
found no actionable issues.

Desktop and narrow-browser screenshots were inspected together. WebKitGTK
captures confirm blank entry, focus and proportional rails at 100% and 200%,
typed creation and empty cancellation. The release rebuild succeeds, and
the actual-app startup and native pinch regressions pass.

Evidence: `/tmp/alive-empty-ui-tests.log`,
`/tmp/alive-empty-browser-tests.log`,
`/tmp/alive-empty-browser-confirm.log`,
`/tmp/alive-empty-confirm/webkit/`, `/tmp/alive-empty-build.log`,
and `/tmp/alive-empty-native/`.

The original CSS shapes require no shipping raster assets. Browser and
WebKitGTK captures show Ultra's own UI; they establish the rendering and
editing path, not pixel-identical Max conformance or hardware audio.
