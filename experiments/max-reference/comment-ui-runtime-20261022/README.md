# Comment Layout Oracle, 2026-10-22

This bounded local observation uses original synthetic comment text in Max
9.1.5, Windows x64, through the installed wine-d2d1 Wine 11.13. It qualifies
comment appearance and documents a loader behavior that remains outside a
simple CSS renderer. It does not qualify whole Max help files.

`metadata.json` retains only numeric/schema facts and resource digests from the
installed reference, named style, theme and twelve target comment records.
No installed help text, application code, fonts or assets are redistributed.
`fixtures/comment-layout.maxpat` and `fixtures/probe.js` are original.

`results/snapshots.json` contains two stages for 31 comments, including all four
arrow sides and point values 0, 0.5 and 1. `attempt1/` preserves the first run:
its metadata is valid, but Max's Welcome window covered its screenshots. The
single confirmation added `this.patcher.front()` and captured the synthetic
patch. No third run or additional runtime capture was made.

Screenshots remain outside the repository:

- `/tmp/alive-max-comment-20261022-run/initial.png`: obscured first attempt.
- `/tmp/alive-max-comment-20261022-confirmation/initial.png`: geometry source.
- `/tmp/alive-max-comment-20261022-confirmation/changed.png`: width change.
- `/tmp/alive-max-comment-20261022-confirmation/geometry.png`: local crop/resize
  of the existing confirmation, not another application capture.

The original prefix was copied with Btrfs reflinks into a marked cache folder.
Home-folder symlinks inside the copied user profile were replaced with empty
directories. Max ran only on its owned private Xvfb display. Ordinary Ctrl-Q
did not complete within eight seconds, so the script terminated its verified
exact-prefix launcher; Wine returned -9. Exact-prefix and owned-display process
scans were empty before the marked copy was removed. The original install and
preferences were read or copied, never launched or edited.

The pixel image is scaled at approximately 1.6 screen pixels per logical Max
pixel despite the 100% patch zoom label. Arrow reserve and margin are confirmed
by both object rectangles and pixels. Radius, stroke and attachment clamping
are contour fits, with about one screen pixel (0.625 logical pixel) uncertainty.
Colors are theme facts; the synthetic patch explicitly uses a white canvas but
retains the installed default dark object theme.

Run `python experiments/max-reference/comment-ui-runtime-20261022/verify.py`
to validate the retained evidence without Max. Reproduction needs a fresh
marked disposable prefix and preserved/relocated result files; the harness
refuses to overwrite existing completion evidence.

The complete factual interpretation and supported-schema recommendation live in
`.impeccable/review/max-fidelity-20261021/comment-oracle.md`.
