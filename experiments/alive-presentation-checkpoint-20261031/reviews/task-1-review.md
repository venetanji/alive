# Task 1 Combined Spec And Quality Review

Reviewed fixed range `c69d87e693fcadcff8d8f9a33c378e444851c4f6..18386c20e964e39c9a57b0d2c4e5481d104b4aa8` using the supplied `task-1-review.diff`, task brief, binding saved-presentation spec, and reviewer rubric. The implementation report was treated as claims to check.

## Findings

### Important / P2: Hierarchy validation aliases caller-owned presentation records

- Location: `apps/ultra/ui/canvas-hierarchy.mjs:75`.
- `scope()` assigns `presentation: patcher.presentation` directly into the validated hierarchy. `CanvasDocument` stores that validated result, so constructing or replacing a version-2 document retains the caller's surface, including its mutable size, items, targets and styles. This differs from the flat validation path, which deep-copies its result, and from the validated hierarchy's copied node parameters.
- A focused, in-memory Node probe constructed `new CanvasDocument(input)` from a valid empty version-2 surface, then set the original `surface.size.width = 0`. The result was `{"canonicalWidth":0,"history":0,"same":true}`. Invalid metadata therefore enters the canonical document without validation, dirty publication or history. Two documents created from the same input can also share this mutable surface until a normal transaction replaces it.
- Deep-copy each nullable presentation when admitting the hierarchy, or detach the complete validated document at the public validation boundary. Cover both root and nested surfaces, constructor/replacement inputs, and two instances created from the same input. Mutating the input after admission must leave canonical state and history unchanged.

### Important / P2: Rust event validation admits an executable relay port absent from the authored registry

- Location: `apps/ultra/src-tauri/src/canvas_presentation.rs:272`.
- The event branch uses the executable `inlet(&native, port)` function. An authored `inlet` node maps to native kind 50; `canvas.rs:388` admits port 0 for kinds 50 and 51 as `Mixed` so hierarchy lowering can wire the relay. The authored JS `inlet` registry has no inlets, so its presentation validator rejects the same target.
- Reproduction shape: a valid version-2 document containing `makeNode('inlet', 1)` and a button targeting `{kind:'event', node:1, inlet:0, action:'bang'}`. The focused JS probe rejects it with `Presentation: unsupported bang event target.` Static tracing of the Rust event branch accepts it: kind lookup succeeds, no argument rejection applies, and native relay inlet 0 is mixed. Hierarchy execution supports that relay, so the subsequent lowering does not repair the authored capability check.
- This violates JS/Rust agreement and the requirement to validate against authored, registry-supported targets before lowering. Explicitly reject authored `inlet` targets in Rust or use an authored event-port capability helper that distinguishes boundary ports from lowered relay ports. Add a shared invalid corpus case for this target, ideally alongside an allowed `outlet` case, and exercise non-profile corpus rows through both public document validators.
- No Rust build or suite was run for this finding; Rust acceptance is established by the inspected branch and its existing kind/port definitions. The current corpus has no boundary-relay event case.

### Important / P2: Generic instrument packaging infers a populated surface from a null root

- Location: `apps/ultra/ui/canvas-instrument.mjs:25`.
- `packageInstrument()` creates a seven-control layout from discovered envelope/filter/gain nodes whenever `patch.presentation === null`. That is a generated layout fallback for an arbitrary nondevice document, beyond authoring explicit layouts in known bundled producers. The binding constraints prohibit inferred surfaces.
- Preserve an existing nonnull authored surface. For generic packaging of an explicit null root, initialize a deliberate empty nonnull surface, as clarified by the controller during this review. Move the explicit seven-control authored layout into `subtractivePatch()` or its known bundled producer. Keep the existing preservation and empty-surface tests and add a null-root packaging assertion that `items` is empty.
- The expected cost is intentional: a newly packaged ordinary patch has an empty surface until authored. Rendering/editor work remains a later task.

## Spec Compliance

Verdict: **Needs fixes** for the three findings above.

The remaining task contract is substantially implemented:

- Both languages require explicit nullable current records on authored roots and child scopes; reusable roots require nonnull records, including deliberate empty surfaces. Closed fields, independent versioning, rectangles, ASCII IDs/labels, numeric/widget compatibility, option domains, global item/panel/byte bounds, and subtree target lookup are present.
- The shared corpus really contains 49 cases: 14 valid and 35 invalid. JS and Rust pure validators read the same JSON; Rust also runs the 45 rows without injected profile facts through `prepare`. Four injected-profile rows test pure panel validation, not executable/runtime admission. Source identity uses `params.device` plus `params.state.profile`; no production `live_device` registry admission appears in the diff.
- Corpus coverage includes unknown surface/item/target/size/rectangle/style/option fields, missing root/child records, non-string parameter keys, dynamic/default event inlets, empty/null surfaces, descendant targets, duplicate IDs, profile mismatch, excess items/panels, byte budget, and maximum geometry. It does not cover authored inlet relay events. The row named `outside subtree` also repeats the root item ID in the child, so duplicate-ID rejection masks the intended subtree failure; make that row's item ID unique when extending the corpus. The implementation itself does use per-scope descendant maps.
- Authored hierarchy metadata survives validation and is absent from execution lowering and `NativeGraph`. `setPresentation` and `updatePresentationItem` use canonical transactions; deletion removes dependent items across scopes; retypes fail validation atomically; subtree duplication remaps node/item identities and copied references. The input-alias finding is an exception to that ownership boundary.
- The standalone metadata methods do not invoke structural apply. Existing execution comparisons, the new history test, and the real native shared-history test support unchanged execution/native revisions and retained receipts through commit/undo/redo. No native DSP, capacity or playback-lifetime change is in the supplied diff.
- Manifest-v1 deserialization is removed in JS/Rust and session admission; zero exposed parameters are accepted. Current examples, instrument/effect/empty/import/help producers and fixtures are updated. `.alive` references are updated to manifest 2 and refreshed source fingerprints; fingerprint validation itself remains intact.
- `HostManifest.presentation` preserves the root version/openOnLoad/size/items and item order, adding immutable `resolved` data. Parameter resolution includes stable exposed binding ID and min/max/integral/unit; excluded unexposed parameters use a null binding ID and registry range. Text includes the supported authored/default text and appearance. Excluded events resolve as unsupported. Nested surfaces are validated but not mounted/projected into the root.
- Included root numeric/event targets require Alive capabilities even when hidden. Excluded root items and unmounted nested items still receive schema validation without requiring Alive bindings. `prepare_device` obtains `host_manifest` before returning a prepared candidate; no native mutation occurs in that preparation path. The readiness test uses the same host projection boundary. The paged catalog implementation is not changed.

## Task Quality

Verdict: **Needs fixes**.

The metadata module is separated from executable state, the host projection is centralized, and the new tests include meaningful history/native-receipt preservation rather than only mock structure assertions. The defects are localized: an ownership leak at hierarchy admission, an authored-versus-executable capability mismatch, and a forbidden packaging fallback. The existing passing runs do not cover those cases.

## Evidence And Review Limits

- Read the supplied diff in bounded passes. Large generated help/catalog changes were inspected by folding identical added/deleted lines; the new JSON corpus was parsed from the supplied diff and inspected as case summaries rather than dumping repeated item arrays. The diff was not regenerated, and no Git commands were run.
- Read existing log tails at `/tmp/alive-presentation-task1/js-final.log`, `/tmp/alive-presentation-task1/rust-final.log`, and `/tmp/alive-presentation-task1/rust-native-history.log`. They substantiate 577 JS passes; 292 Rust passes with 4 ignored; and the exact native shared-history test passing. No suites were rerun, and no builds or native library rebuilds were performed.
- A single focused in-memory Node command checked the two concrete doubts about caller aliasing and authored `inlet` event rejection. It wrote no files and did not mutate native state.
- Named outside-diff risk checks: (1) authored/executable event capability parity, inspecting existing `canvas.rs` kind/inlet/parameter definitions and JS registry/nodeSpec/structural rules; (2) canonical alias admission, reading hierarchy function context cut off in the hunk and probing constructor ownership; (3) refusal before native mutation, reading the rest of `session/prepare.rs::prepare_device` cut off in the diff and the `PreparedSession`/host installation boundary. An attempted lookup of `session/browser/discovery.rs` found no file; catalog behavior is supported by the supplied readiness-test hunk and existing run, without broadening into a catalog audit.
- Existing `SaveSnapshot` and audio `write` FFI warnings are the documented baseline, not new presentation findings. No unrelated warning cleanup is requested.
- Renderer, authoring UI, Max presentation-field import, resource adapters, browser/manual interaction and actual Analog/native admission are outside this task and were not graded as missing. Exact live-library hash checks were reported by the implementer; they were not recomputed during this read-only review.
- The sole review write is this ignored report. No source/index/HEAD edits, subagents, native installs or external publication occurred.
