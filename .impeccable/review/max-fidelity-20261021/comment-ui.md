# Comment UI Fidelity Pass

Completed the bounded comment phase on 2026-10-22, continuing the user's
authorized Max fidelity work. The larger all-objects/all-help goal stays active;
this pass establishes no complete installed help-root qualification.

## Findings And Repairs

The shared object header clipped comments to one line. Scoped comment layout
now preserves explicit newlines and wraps safe literal text within saved bounds;
unsized comments grow with their content. Callout rendering was absent. An
original SVG contour now implements all four observed sides and normalized
points, a 15px arrow reserve/base, approximately 10px corners, 5px body inset,
and slanted attachment near the side ends. Tiny dimensions scale safely.

Three strict comment-only style fields round-trip through JS/Rust validation,
history and Save: bubble integer 0..1, bubbleside integer 0..3, bubblepoint
finite 0..1. The Inspector exposes the shared field metadata and inherited
callout colors. Reset clears decoration and obsolete dimensions/colors without
native graph installation. A real-browser regression caught SVG hidden-property
handling; an explicit hidden attribute fixes actual visibility across reset.

Flat Max comments now retain v2 authoring nodes and source mappings instead of
being discarded as decoration. Missing comment font sizes can snapshot the
nearest valid patcher default, including selected fragments. Explicit invalid
box values are diagnosed and omitted without clamping. Font, named-style,
comment-port and linecount diagnostics remain visible.

The one-line object input also removed comment newlines. Its textarea successor
uses textbox semantics for comments, native Up/Down navigation, Shift+Enter for
a new line and Enter to commit. Exact literal whitespace and the 4096-character
annotation limit survive editing. An unchanged commit preserves original
CRLF/CR bytes despite browser textarea normalization. Ordinary object entry
retains its existing single-line paste and completion behavior.

Independent review found one P2 defect: textcolor also changed the separately
advertised outline color. The default SVG stroke now uses its own theme color;
explicit color overrides remain independent. The regression passed in the full
browser run. The scoped final review has no outstanding findings; see
`comment-code-review.md`.

## Oracle And Import Accounting

`comment-oracle.md` and
`experiments/max-reference/comment-ui-runtime-20261022/` record the bounded
original Max fixture, two runs/124 snapshots, metadata facts, contour fit limits
and exact copied-prefix cleanup. Screenshots remain under /tmp. No licensed
reference prose, application assets or help patch bodies are redistributed.

The original synthetic observations establish sides and normalized endpoints;
intermediate 0.11/0.75 interpolation and precise cross-platform font metrics
remain approximate. Max uses saved linecount to fit loaded width/height even
though it is absent from the attribute list. Ultra keeps the saved rectangle,
so linecount remains an explicit compatibility gap. The installed empty
helpfile_label style is an observation about this installation; its name is
not sufficient provenance to suppress a warning in the generic importer.

Metadata-only source accounting in /tmp/ultra-comment-source-preservation.json
retains all 89 source boxes and 40 cables across append/prepend/int/float, with
all 12 comments. Supported explicit bubble/side/point warnings fall by 18, from
554 to 536. Three labels now inherit fontsize 13. All12 comment-port and 9
linecount warnings remain, along with unresolved fonts/styles, cable geometry,
numeric format and arithmetic-semantic warnings. These are source-retention
facts, not complete execution results. Qualification remains 0/2,103.

## Verification

- Full JS: 336 passed, zero failed; /tmp/ultra-comment-js-full.log.
- Required contracts: exit 0 with the pinned requirements via uv;
  /tmp/ultra-comment-contracts-final.log.
- Full Chromium: 88 passed, including editor normalization, color independence,
  safe text, geometry, focus, editing, drag, reset and history;
  /tmp/ultra-comment-browser-full.log.
- Release Rust: 108 passed, 2 intentionally ignored, zero failed;
  /tmp/ultra-comment-rust-final.log.
- Release build: exit 0; /tmp/ultra-comment-build-final.log.
- Original Max evidence verifier: 2 runs / 124 snapshots and copied-prefix cleanup
  verified without launching Max again.
- Private native comment-only wrapper: exit 0 on its first run;
  /tmp/ultra-comment-desktop-final.log and comments-result.json beneath its
  matching output directory.
- Final git diff --check: clean.

The native run proves visible multiline text through AT-SPI character geometry,
four sides/points/fonts, safe literal text, minimum dimensions, Inspector
edit/reset/history, the actual Shift+Enter textarea flow, exact Save/export,
runtime revision 1 and remembered numeric value 77. The tight plain three-line
font 13 fixture fits its 54px rectangle at both window sizes.

A follow-up browser concern tightened the bubble fixture from 55px to the
source's 54px. Its initial assertion required a full 5px gap below the font's
line box; measured glyph rectangles were all inside the saved box with 4px
remaining. The assertion now checks the actual requirement: three visible
lines inside unchanged saved bounds. No product adjustment was needed. The
affected case passes in /tmp/ultra-comment-tight-height-final.log. This does
not remove the documented Max linecount/font-fitting limitation.

## Bounded Visual Pass

Root inspected one batch of front-window native captures at 1120x780 and 800x600:
/tmp/ultra-comment-desktop-final/native-comments-desktop.png and
native-comments-compact.png. Text, arrow shape, focus, palette and compact
scrolling are consistent with the committed workspace. No issue required a
visual correction or confirmation round. Completed Print/help-shell visual
passes were not restarted. Both native marker and Max copied-prefix cleanup
records contain zero remaining owned processes.
