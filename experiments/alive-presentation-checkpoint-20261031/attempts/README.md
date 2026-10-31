# Preserved Initial Attempts

These attempts use the first immutable install, source `1b6cb68`, at
`/home/venetanji/.local/share/alive/builds/1b6cb68`. They remain separate from
the final `9ced05e` acceptance. Complete local output roots remain under
`/home/venetanji/.cache/alive-verification/presentation-installed-20261031/`.
The packet retains each original attempt log in `../logs/surface-N.log` and
selected original output here. The final helper remains strict about actual
native window sizes, saved values, and horizontal reachability.

| Attempt | Result And Cause |
| --- | --- |
| `surface-1` | Fixture preparation mistakenly replaced the supplied canonical source fingerprint with the raw file SHA-256. Startup correctly refused the invalid fixture, and the helper then could not find its window. This is an acceptance-fixture error. The corrected fixture preserves the supplied canonical fingerprint and uses the actual installed resource path. |
| `surface-2` | Independent number/dial writes and unfinished-field navigation passed. Accessibility focus alone did not scroll the last control fully into the compact viewport. The old assertion reports Level at x752, width61, in an800px window. This helper had not issued a scroll gesture. |
| `surface-3` | Independent values and draft checks passed again. X horizontal wheel buttons6/7 did not scroll this WebKit surface, leaving the same Level bounds. |
| `scroll-probe` | Actual Shift+vertical wheel over the saved dial scrolls the surface: Level moves to x686, width61. `debug_scroll.py`, original native accessibility tree, before/after captures, and original log are retained. |
| `surface-4` | The helper applied Shift+wheel over the number field, which consumed the wheel rather than scrolling its viewport. Level stayed at x752. The final helper targets the actual saved range/dial and retains the reachability assertion. |
| `surface-5` | All installed Alive checks passed: both exact sizes, internal scrolling, independent saved values, unfinished draft, editor open/close while playing, finite nonzero PCM and zero errors/rejections. Actual Ultra Perform opened the saved surface without an automatic keyboard, then exact800x600 resize failed because its native configuration still declared minimum900x620. This is the product configuration limitation corrected in source commit `9ced05e`, with a separate controller source review. |

No failed assertion caused a product fallback, fabricated IPC state, a native
size-hint bypass, or weakened compact-window acceptance. The original source
archive and immutable install remain available. Final native verification uses
a fresh install and fresh private fixture/output/session roots.

## Final-Source Follow-Ups

The exact final `9ced05e` drop journey passes. Its initial focused process passes
Alive's independent values/draft, both native sizes and editor closure/audio,
then fails in Ultra scrolling; it remains nonzero in
`../logs/final-surface-initial.log`. The cached Attack dial moved outside the
viewport after focusing Level, so the wheel hit the patch canvas. Its original
failure capture and report remain in `final-surface-initial/`.

`final-ultra-1/` fixes the input point within the viewport and confirms real
scroll movement, but one batch of native wheel input does not reach the endpoint.
`final-ultra-2/` uses bounded repeated wheel batches and reaches Level at both
exact native sizes. Its receipt reports passing, but visual/self-review finds
the initial 1280 view is still partially scrolled at the left; it is not the
final Ultra receipt. These diagnostics/logs remain intact.

The accepted Ultra receipt is `../reports/final-9ced05e/ultra-surface-report.json`
from local root
`/home/venetanji/.cache/alive-verification/presentation-installed-final-ultra-9ced05e-3`.
It exits 0. Native input targets the saved blank top gutter, resets the first
field inside the actual panel bounds, reaches Level with two bounded wheel
batches, leaves first/last values unchanged, and keeps chrome fixed at both
exact sizes. This completes the supplementary Ultra checks without rerunning
the passing final drop/Alive journeys. No additional product edit is needed.
