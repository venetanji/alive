# After Comments: Next Four-Root Qualification Work

Read-only assessment after the comment implementation, 2026-10-22. This does
not reopen Print, help-shell or comment polish. No product code, diagnostic
policy or installed source changed; no Max/Wine process was launched. Complete
help qualification remains **0/2,103**. The earlier full diagnostic inventory is
`/tmp/ultra-help-next-blockers.json`; its counts describe that earlier checkpoint,
not a new post-comment census.

The smallest defensible next implementation is saved cable geometry: its loss
is demonstrated. In parallel, prepare one original float-example qualification
fixture covering the exact `format:6` and `* 0.5` cases. Those numerical warnings
identify unqualified behavior, but do not by themselves establish incorrect
values in these saved examples. Keep their diagnostics until evidence supports
an exact, finite disposition.

## Exact Float Anchors

All anchors below are in `float.maxhelp`, Basic scope `root/obj-2`. Cable indices
are zero-based indices in that source scope's saved `lines` array.

| Box | Saved Facts | Source Connections |
| --- | --- | --- |
| `obj-16` | `flonum`, `format:6`, rectangle `[194,230.5,54,23]` | Edge7 from `obj-23:0`; edge0 to `obj-22:0`. |
| `obj-17` | `flonum`, `format:6`, rectangle `[265,230.5,54,23]` | Edge3 from `obj-19:0`; edge1 to `obj-22:1`. |
| `obj-21` | `flonum`, `format:6`, rectangle `[220,330.5,54,23]` | Edge5 from `obj-22:0`. |
| `obj-33` | `flonum`, `format:6`, rectangle `[117,380.5,54,23]` | Edge11 from `obj-32:0`. |
| `obj-19` | Creation `* 0.5`, rectangle `[265,200.5,38,23]` | Edge2 from slider `obj-18:0`; edge3 to `obj-17:0`. |
| `obj-23` | Creation `* 0.5`, rectangle `[194,200.5,38,23]` | Edge4 from slider `obj-20:0`; edge7 to `obj-16:0`. |

The four flonums specify neither `numdecimalplaces` nor explicit numeric bounds.
`obj-22` is `float 5.8`; `obj-32` is `r goom`. Neither multiply has a cable into
its cold inlet. These facts delimit the saved example paths without reproducing
comment or reference prose.

## Format 6: Known And Unknown

The local `number.maxref.xml` format enumeration puts decimal floating-point at
index6. This is a mode selector, not a request for six decimal places. The
`flonum` class already expresses floating numeric storage. A source-specific
decision must therefore distinguish a redundant mode declaration from a real
display or interaction difference; it should not add unrelated format modes.

Current import maps `flonum` but leaves `format` as a semantic diagnostic
(`apps/ultra/ui/canvas-max-import.mjs:123`). The model supplies
`numdecimalplaces:6`; the renderer uses `toFixed(numdecimalplaces)` when not
editing (`apps/ultra/ui/canvas-node.mjs:206`). The control entry path rounds
committed values to nine decimal places and clamps to the local finite bounds
(`apps/ultra/ui/canvas-node.mjs:51`). Thus mode, displayed precision and stored
precision are separate questions. Whether fixed trailing zeros or narrow
54-pixel readouts match Max in these exact cases is not established here.

Existing seams are the native scalar checks in
`apps/ultra/tests/patch_graph_objects_test.cpp:55`, physical numeric actions in
`apps/ultra/tests/canvas_numeric_ui_test.cpp:40`, and browser drag/direct-entry
and stored-precision tests in
`apps/ultra/tests/ci/canvas-controls.spec.mjs:300` and
`apps/ultra/tests/ci/canvas-controls.spec.mjs:329`. They cover useful numeric
contracts; they do not compare the exact imported format6 display against Max.
The retained `message-ui-runtime-20261022/README.md` explicitly excludes
alternate number-format qualification.

Next matrix: compare incoming `0`, integral floats, positive/negative halves,
fractional values and small exponents; direct entry, drag, focus/blur, cold
storage, recall and physical Tab. Use the actual saved width and compare
displayed text separately from emitted values/types. Reuse the existing
numeric contracts; add behavior only for a demonstrated difference.

## Multiply: Source-Specific Evidence Needed

Both creations are floating `* 0.5`. The importer's unconditional Add/Multiply
warning about integer creation coercion
(`apps/ultra/ui/canvas-max-import.mjs:160`) is broader than these two source
cases. It is not evidence that their multiplication results are wrong.

Current native Multiply stores a double right operand, updates it silently on
the cold inlet, remembers the hot value, multiplies on hot scalar/bang and
bounds the result (`apps/ultra/src-tauri/native/patch_graph.hpp:485`). Its output
uses legacy aggregate message construction, leaving numeric tag0; it does not
retain a lexical floating creation mode. The downstream flonum emits explicit
float tag1 (`apps/ultra/src-tauri/native/patch_graph.hpp:570`). Consequently, a
typed-output difference immediately after Multiply could be hidden by the
saved flonum stage. This is a concrete test seam, not a new Max runtime result.

The retained native graph test checks an Add5/Multiply2 chain yielding24
(`apps/ultra/tests/patch_graph_test.cpp:65`). It does not assert the type of
`* 0.5` output or a direct Max comparison. The local `times.maxref.xml` declares
an optional integer-or-float creation argument and methods including bang,
integer, float, cold-input, set and list. Method presence does not establish
every coercion/order rule; set/list are outside the two saved input paths.

Next matrix: original `* 0.5` with hot integer/float values producing both
integral and fractional results, cold replacement, bang recall and typed
receipts directly at the multiplier, then after a flonum. Keep the existing
saved Multiply profile and bounds unless the evidence requires an explicit
compatible extension. Do not silently retrofit a generic integer-creation
mode or claim all arithmetic methods from this fixture.

## Cable Geometry: Confirmed Loss

Fifteen source midpoint arrays are present; none is retained as authoring
geometry. The exact scopes/indices are:

| Source | Scope | Cable Indices | Example Exact Saved Array |
| --- | --- | --- | --- |
| append | `root/obj-5` | 0,1,2,3,4,5,6,7,8 | Edge3: `[109.5,315,81,315,81,345,29.5,345]` |
| int | `root/obj-2` | 0,1,4,5,8 | Edge4: `[204.5,339,230.5,339]` |
| float | `root/obj-2` | 10 | `[174.5,265.5,203.5,265.5]` |
| prepend | Basic | none | No saved midpoint array. |

The inventory also includes repeated vertices, such as append edge1
`[467.5,171,467.5,171]`. Preserve valid coordinates and ordering; do not infer
fan-out execution order from bend geometry.

Import warns and drops midpoints
(`apps/ultra/ui/canvas-max-import.mjs:309`). JS flat/v2 schemas and Rust `Edge`
accept only endpoints/ports (`apps/ultra/src-tauri/src/canvas.rs:284`). Rendering
always generates a cubic curve from current port positions
(`apps/ultra/ui/canvas.mjs:315`). The existing import regression explicitly
expects a midpoint warning (`apps/ultra/ui/canvas-max-import.test.mjs:349`).
This is demonstrated representation loss, while its exact visual discrepancy
still needs a scoped rendered comparison.

An independent implementation can add bounded authoring-only bend points,
shared JS/Rust validation and explicit stripping during executable lowering.
JS `lowerHierarchy` currently spreads edge fields, so extending only the saved
schema is insufficient. Save/history/CAS must preserve geometry, while native
graph comparison must ignore it; `document_commands.rs:41` already reuses the
active revision when prepared execution matches. Define how bends behave when
one endpoint or a selection moves, and preserve boundary-remap identity.
Use original cases for malformed/odd/oversized coordinates, repeated vertices,
round-trip, undo/redo, pan/zoom and click hit-testing. Verify unchanged native
revision, timers, receivers and numeric/Message/Print state after geometry edits.
This requires no new native object, ABI or execution capacity.

## Independent Next Tasks And Gates

1. Implement and test bounded saved cable geometry as a pure authoring feature;
   retain unsupported geometry diagnostics until the exact field is handled.
2. Capture one small original float fixture in the next runtime-evidence phase,
   with separate display and typed-arithmetic outcomes. No Max launch occurred
   during this mapping. Keep format6 and arithmetic diagnostics until that
   comparison supports a finite rule.
3. After both tracks, run the complete four-root interaction matrix and resolve
   remaining source-specific diagnostic dispositions. Do not equate zero
   omissions, matching helper hashes or passing isolated numeric cases with
   complete-root qualification.

Read-only original synthetic checks in this assessment confirmed that format6
still produces a warning, `* 0.5` retains its warning, midpoint import drops the
array, and both JS authoring schemas reject an added midpoint field. Existing
native/browser tests above were inspected for coverage, not rerun for this
report. All product diagnostics and the 0/2,103 qualification count remain intact.
