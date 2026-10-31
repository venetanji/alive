# Task 1 Report: Current Document Contract And Host Projection

Status: implementation complete; self-review and verification complete. Commit: `18386c2` (`feat(canvas): save presentation schema history and host projection`). Review base: `c69d87e693fcadcff8d8f9a33c378e444851c4f6`; branch `feat/phase2-ui-fidelity`.

## Delivered Contract

Every current authored root and nested patcher requires its own explicit `presentation: null` or closed version-1 surface record. Reusable device roots require a non-null record; `items: []` is valid. JS and Rust validate the same 49-case corpus (14 valid, 35 invalid), including qualified injected installed-panel facts, document-wide IDs, subtree targets, dynamic event inlet counts, unknown fields, geometry, limits and empty surfaces. Numeric descriptors come from the current registry; ordinary Ultra may retain unexposed numeric/event controls. Current parameter defaults remain the existing node semantics, not surface inference.

Current device manifests accept only typed version 2, with 0..16 exposed scalar parameters. The version-1 device reader is removed. Instrument, effect, empty-document, import, help-library, desktop-test and saved-example producers/fixtures now author the current fields directly. Subtractive, Utility and Stereo Lowpass have explicit saved control layouts. Existing authored presentation survives packaging. Current `.alive` example references have their version and canonical source fingerprints refreshed; fingerprint checks are unchanged.

Presentation is validated on authored trees before lowering and omitted from lowered execution graphs and NativeGraph. Canonical document/history owns the saved metadata. Deletion removes dependent ancestor/descendant items in the same edit. Incompatible retypes fail atomically. Duplication remaps node IDs and copied item IDs, including nested surfaces and local surface references, while retaining paint order.

## Renderer Handoff: Exact Projection

`canvas::device::HostManifest` retains its existing serialized camelCase fields and adds:

```text
presentation: {
  version: 1,
  openOnLoad: boolean,
  size: {width: integer, height: integer},
  items: [ authoredItem plus resolved ]
}
```

The root record is non-null. Authored fields and array order are preserved. No nested surface is mounted/projected into the root. Do not save `resolved` back into an authored patch: authored records remain closed and reject it.

Parameter item additions:

```json
{"resolved":{"kind":"parameter","bindingId":"attack","descriptor":{"min":1.0,"max":10000.0,"integral":false,"unit":"ms"}}}
```

`bindingId` is the stable exposed parameter key from `HostManifest.parameters`, scoped by the receiving device instance. Exposed range/unit override registry range/unit; `integral` comes from the registry. For a valid excluded unexposed parameter, `bindingId` is null, range/integralness come from the registry and unit is null. The original discriminated target remains on the item.

Text item additions:

```json
{"resolved":{"kind":"text","text":"Hello","style":{}}}
```

`text` is the authored supported comment/message field, including existing message defaults when the node omits optional creation text. `style` is the node's validated appearance record, or an empty object when absent. Text is display-only.

Excluded event item additions:

```json
{"resolved":{"kind":"event","supported":false}}
```

Included root items require Alive capabilities even when `visible:false`. Missing exposed numeric bindings refuse with `Unsupported Alive presentation capability: parameter NODE.PARAM is not exposed`. Included root events refuse with `Unsupported Alive presentation capability: event NODE:INLET bang`. Excluded outline items and unmounted nested surfaces do not require Alive bindings, but every authored item is schema/target validated. Errors occur in `host_manifest`, before prepared candidates can replace accepted native state; catalog readiness uses that same path.

`livePanel` pure schema validation uses qualified injected source facts and exact `node.params.device` plus `node.params.state.profile` identity. JS facts are `registry.live_device.profiles = [{device,profile}]`; Rust pure tests inject `HashMap<u64,(String,String)>`. Current production registries contain no executable `live_device`, so neither included nor excluded panel records invent source/runtime admission. All 22 installed native candidates remain unavailable. No panel projection/resources/runtime binding is claimed in this delivery.

## Canonical Mutation APIs

- `validatePresentation(document, registry, structural)` throws for invalid authored metadata; returns the root nullable presentation. `REGISTRY` specs provide `presentationInlets(node)` to resolve dynamic inlet domains consistently with `nodeSpec`.
- `CanvasDocument.setPresentation(value)` replaces the currently viewed scope's complete nullable record using the existing validated history transaction; returns a change Boolean. For root edits, navigate to the root first. It cannot null a reusable device root.
- `CanvasDocument.updatePresentationItem(id, changes)` shallowly replaces fields on an item in the currently viewed scope; returns a change Boolean. Supply complete nested `rect`, `style`, `target` objects. Identity, order, visibility, inclusion, widget and label changes all pass the same full document validation. Use `setPresentation` for insertion/removal/reordering/multi-item edits.
- `CanvasDocument.duplicateMany(ids, {dx=20,dy=20}={})` duplicates selected nodes in the current scope and their embedded trees, remaps internal cables and presentation identities, and returns new selected node IDs. One call is one history edit. Validation failures leave document/history/ID allocation unchanged.
- Existing `remove`, `removeMany`, `configure`, `undo`, `redo`, serialization and shared-window flows apply to presentation atomically. `configure` refuses incompatible target/widget changes; callers can explicitly rebind/remove items first using the canonical transaction API.
- Standalone `createCanvasController` exposes `setPresentation`, `updatePresentationItem`, `duplicateMany`; the first two only validate/change/emit and do not enter structural apply. Existing undo/redo execution comparison suppresses DSP work for presentation history.
- `createSharedCanvasController` exposes the same methods through existing optimistic document CAS/history publication. Captured document edits retain current owner/view/close/conflict guards. Canonical authoring revisions and dirty state advance; runtime revisions remain fixed for metadata edits.
- Pure helpers `removePresentationTargets(document, removedSet)` and `remapPresentation(presentation, nodeIdMap, itemIdAllocator)` implement canonical deletion/copy behavior. Rendering code should use document/controller APIs, not mutate these records directly.

A gesture should keep local preview geometry and commit once through one setter/update call; cancelling preview calls no mutation. No renderer or gesture editor is implemented here.

## Verification Evidence

Full logs are under `/tmp/alive-presentation-task1/`. Commands below run from this worktree.

Initial checkpoint red (before the coordinator pause and catalog baseline update):

```bash
node --test apps/ultra/ui/canvas-presentation.test.mjs
```

`js-red.log`: 5 tests, 0 pass, 5 fail; primary expected error `Unknown hierarchy field: presentation.` The corpus import also reports the not-yet-created module.

Historical Rust red command from that original checkpoint:

```bash
ULTRA_NATIVE_LIB_DIR=/tmp/alive-piano-live-edit-20261031 LD_LIBRARY_PATH=/tmp/alive-piano-live-edit-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml saved_presentation_current_schema --lib
```

`rust-red.log`: 0 passed, 1 failed, 284 filtered out. Expected failure: valid corpus `numeric` rejected (`left: false`, `right: true`). This command predates the updated brief; the obsolete runtime was not used after resume. All resumed Rust verification uses the current frozen publish runtime below.

Expanded focused JS red/green rounds:

```bash
node --test apps/ultra/ui/canvas-presentation.test.mjs
```

- `js-corpus-expanded-red.log`: rejects missing string-key validation; `js-corpus-expanded-green.log`: 5/5 pass after string/dynamic-inlet fixes.
- `js-history-expanded-red.log`: 7 pass, 1 fail (packaging overwrote authored surface); `js-history-expanded-green.log`: 8/8 pass after preservation fix.
- `js-defaults-red.log`: 8 pass, 1 fail (pure text metadata did not honor existing optional message text semantics); `js-defaults-green.log`: 9/9 pass after matching current node semantics. Lowering absence and unchanged executable JSON are explicitly asserted.

Affected JS integration rounds:

```bash
node --test apps/ultra/ui/canvas-{presentation,model,hierarchy,instrument,documents,shared,max-import}.test.mjs
```

`js-affected-first.log`: 141 pass, 25 fail (current fixture/producer schema updates needed). `js-affected-second.log`: 166 pass, 0 fail. `js-canvas-first.log`: 398 pass, 13 fail (remaining appearance, Perform fixtures and library child scopes); `js-fixtures-fix.log` confirms repaired fixture suites. `js-full.log` records the earlier full canvas/Alive run: 573 pass, 0 fail.

Final complete affected JS suites:

```bash
node --test apps/ultra/ui/canvas-*.test.mjs apps/ultra/ui/alive-*.test.mjs
```

`js-final.log`: `tests 577`, `pass 577`, `fail 0`, `cancelled 0`, `skipped 0`.

Current frozen Rust environment for every resumed Rust command:

```bash
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib
```

`rust-final.log`: `running 296 tests`; `292 passed; 0 failed; 4 ignored; 0 measured; 0 filtered out`. Earlier full logs `rust-affected-first.log` (212 pass, 76 fail) and `rust-affected-second.log` (285 pass, 3 fail) captured current fixture/version/fingerprint updates and preserved size-error wording. The new real native shared-history test initially revealed process-shared native slot revision reuse; it now uses an isolated subprocess, as existing native tests do.

Precise real native history regression:

```bash
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib document_windows::commands::tests::saved_presentation_shared_history_and_reopen_preserve_native_runtime_and_receipts -- --exact
```

`rust-native-history.log`: `1 passed; 0 failed; 0 ignored; 0 measured; 295 filtered out`. It exercises real `admit`, native message/status receipts, root/child canonical publication, undo/redo, dirty metadata and save/reopen. Fresh native values, pulses, active state and runtime revision survive every metadata transaction.

Other checks: `git diff --check` passes; Python AST parsing passes for all 40 desktop test producers; `bash -n apps/ultra/tests/check_canvas_desktop.sh` passes. Desktop producers are updated but no desktop launcher/browser/manual session is run in this task.

Frozen runtime SHA-256 verified:

`69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90  /tmp/alive-live-publish-native-20261031/libultra_native.so`

Read-only identity reference (no authored module imported/copied):

`1389e3b922fb9acff2a436011375786b98041a9784cc32685c428cdf86adea60  /home/venetanji/.codex/worktrees/2a0f/alive/apps/ultra/src-tauri/src/canvas_live_device.rs`

## Existing Warnings And Ignored Tests

The final Rust lib-test compile emits two existing warnings: unused `SaveSnapshot` import in `documents.rs:14`, and the existing `write` FFI declaration signature warning in `audio.rs:420`. No new warning originates in the presentation implementation. This task's exact log contains two warnings, not four.

The four existing ignored tests remain ignored for their declared reasons:

- `audio::instrumentation::native_saved_clip_release_overhead`: exact saved-fixture release measurement requires `ALIVE_MEASUREMENT_SESSION`.
- `audio::instrumentation::paired_release_overhead`: explicit release measurement, no timing acceptance threshold.
- `audio::tests::private_software_output`: requires the private software-only PipeWire graph from `check_cpal_audio.sh`.
- `help_reference::tests::local_identity_and_catalog_are_available`: reads the user's licensed local installation and emits identity/status facts only.

## Self-Review And Remaining Boundaries

Reviewed schema parity, closed fields, nullable record presence, dynamic targets, copied/deleted identities, canonical atomic failure, authored packaging preservation, absence from execution lowering, real native receipt/history preservation, zero parameters, root-only capability refusal, current source fingerprints and catalog readiness. Generated library data is regenerated using `node apps/ultra/ui/generate-canvas-library.mjs`. All changed paths belong to this task; no native tree, capacity, launcher, CI, push or hosting admission changed.

Rendering, authoring UI, scoped runtime adapters and installed native playback are later tasks. The projection exposes sufficient immutable descriptor/text information without owning playback. Existing historical experiment captures remain historical and are not read through migrations. This report is an ignored local coordination ledger, retained at the requested path rather than force-added to the source commit.

## Changed Files

- `apps/alive/examples/midi-arrangement.alive`
- `apps/alive/examples/quantized-midi.alive`
- `apps/alive/examples/two-instruments.alive`
- `apps/ultra/examples/abs.ultra`
- `apps/ultra/examples/append.ultra`
- `apps/ultra/examples/comment.ultra`
- `apps/ultra/examples/cycle.ultra`
- `apps/ultra/examples/divide.ultra`
- `apps/ultra/examples/float.ultra`
- `apps/ultra/examples/flonum.ultra`
- `apps/ultra/examples/inlet.ultra`
- `apps/ultra/examples/int.ultra`
- `apps/ultra/examples/iter.ultra`
- `apps/ultra/examples/line.ultra`
- `apps/ultra/examples/line_signal.ultra`
- `apps/ultra/examples/message_box.ultra`
- `apps/ultra/examples/modulo.ultra`
- `apps/ultra/examples/noise.ultra`
- `apps/ultra/examples/number_int.ultra`
- `apps/ultra/examples/outlet.ultra`
- `apps/ultra/examples/pack.ultra`
- `apps/ultra/examples/patcher.ultra`
- `apps/ultra/examples/phasor.ultra`
- `apps/ultra/examples/prepend.ultra`
- `apps/ultra/examples/print.ultra`
- `apps/ultra/examples/receive.ultra`
- `apps/ultra/examples/reverse_divide.ultra`
- `apps/ultra/examples/reverse_subtract.ultra`
- `apps/ultra/examples/route.ultra`
- `apps/ultra/examples/select.ultra`
- `apps/ultra/examples/send.ultra`
- `apps/ultra/examples/sig.ultra`
- `apps/ultra/examples/signal_add.ultra`
- `apps/ultra/examples/signal_clip.ultra`
- `apps/ultra/examples/signal_dac.ultra`
- `apps/ultra/examples/signal_divide.ultra`
- `apps/ultra/examples/signal_multiply.ultra`
- `apps/ultra/examples/signal_subtract.ultra`
- `apps/ultra/examples/slider.ultra`
- `apps/ultra/examples/snapshot.ultra`
- `apps/ultra/examples/stereo-lowpass.ultra`
- `apps/ultra/examples/subtract.ultra`
- `apps/ultra/examples/subtractive.ultra`
- `apps/ultra/examples/trigger.ultra`
- `apps/ultra/examples/unpack.ultra`
- `apps/ultra/examples/utility.ultra`
- `apps/ultra/examples/zl_iter.ultra`
- `apps/ultra/examples/zl_join.ultra`
- `apps/ultra/examples/zl_len.ultra`
- `apps/ultra/examples/zl_reg.ultra`
- `apps/ultra/examples/zl_rev.ultra`
- `apps/ultra/examples/zl_rot.ultra`
- `apps/ultra/examples/zl_slice.ultra`
- `apps/ultra/src-tauri/src/canvas.rs`
- `apps/ultra/src-tauri/src/canvas_device.rs`
- `apps/ultra/src-tauri/src/canvas_hierarchy.rs`
- `apps/ultra/src-tauri/src/canvas_presentation.rs`
- `apps/ultra/src-tauri/src/canvas_tests.rs`
- `apps/ultra/src-tauri/src/document_commands_tests.rs`
- `apps/ultra/src-tauri/src/document_windows.rs`
- `apps/ultra/src-tauri/src/documents.rs`
- `apps/ultra/src-tauri/src/documents_tests.rs`
- `apps/ultra/src-tauri/src/instrument_probe.rs`
- `apps/ultra/src-tauri/src/lib.rs`
- `apps/ultra/src-tauri/src/session/browser/tests.rs`
- `apps/ultra/src-tauri/src/session/prepare.rs`
- `apps/ultra/src-tauri/src/session/probe.rs`
- `apps/ultra/src-tauri/src/session/tests.rs`
- `apps/ultra/src-tauri/src/session/workspaces.rs`
- `apps/ultra/src-tauri/src/session/workspaces_tests.rs`
- `apps/ultra/tests/check_alive_desktop.py`
- `apps/ultra/tests/check_cables_desktop.py`
- `apps/ultra/tests/check_canvas_desktop.py`
- `apps/ultra/tests/check_canvas_desktop.sh`
- `apps/ultra/tests/check_canvas_pinch.py`
- `apps/ultra/tests/check_comments_desktop.py`
- `apps/ultra/tests/check_document_startup.py`
- `apps/ultra/tests/check_documents_desktop.py`
- `apps/ultra/tests/fixtures/help-shell-schema.json`
- `apps/ultra/ui/canvas-appearance.test.mjs`
- `apps/ultra/ui/canvas-arithmetic.test.mjs`
- `apps/ultra/ui/canvas-catalog.mjs`
- `apps/ultra/ui/canvas-catalog.test.mjs`
- `apps/ultra/ui/canvas-console.test.mjs`
- `apps/ultra/ui/canvas-device.mjs`
- `apps/ultra/ui/canvas-documents-view.mjs`
- `apps/ultra/ui/canvas-documents.mjs`
- `apps/ultra/ui/canvas-documents.test.mjs`
- `apps/ultra/ui/canvas-dom.test.mjs`
- `apps/ultra/ui/canvas-effects.mjs`
- `apps/ultra/ui/canvas-hierarchy.mjs`
- `apps/ultra/ui/canvas-hierarchy.test.mjs`
- `apps/ultra/ui/canvas-instrument.mjs`
- `apps/ultra/ui/canvas-instrument.test.mjs`
- `apps/ultra/ui/canvas-library-data.json`
- `apps/ultra/ui/canvas-library.mjs`
- `apps/ultra/ui/canvas-list-objects.test.mjs`
- `apps/ultra/ui/canvas-max-dialog.test.mjs`
- `apps/ultra/ui/canvas-max-import.mjs`
- `apps/ultra/ui/canvas-message-ui.test.mjs`
- `apps/ultra/ui/canvas-model.mjs`
- `apps/ultra/ui/canvas-model.test.mjs`
- `apps/ultra/ui/canvas-numeric-ui.test.mjs`
- `apps/ultra/ui/canvas-object-batch.test.mjs`
- `apps/ultra/ui/canvas-object-examples.mjs`
- `apps/ultra/ui/canvas-presentation-cases.json`
- `apps/ultra/ui/canvas-presentation.mjs`
- `apps/ultra/ui/canvas-presentation.test.mjs`
- `apps/ultra/ui/canvas-preset.json`
- `apps/ultra/ui/canvas-print-ui.test.mjs`
- `apps/ultra/ui/canvas-send-receive.test.mjs`
- `apps/ultra/ui/canvas-shared.mjs`
- `apps/ultra/ui/canvas-shared.test.mjs`
- `apps/ultra/ui/canvas-signal-objects.test.mjs`


## Fix Round 1: Three Important Review Findings

Fix base: `18386c20e964e39c9a57b0d2c4e5481d104b4aa8`. Read the complete `task-1-review.md` and the controller ruling in `progress.md`; applied the code-review reception workflow to verify the three findings before editing production code. All three findings are addressed in one five-file fix wave.

1. Hierarchy admission now deep-clones every nullable root/nested presentation. Constructor and replacement tests create two documents from the same input, mutate the caller's surface sizes, rectangles, targets, styles and labels, and verify canonical content/history and the sibling document remain independent. This closes the mutation path outside canonical validation/history.
2. Rust presentation events now explicitly reject authored `inlet` sources, whose native input exists only as a lowered relay. Authored `outlet` inlet 0 remains accepted. Two shared corpus rows cover invalid inlet/valid outlet; all 47 non-profile rows now exercise both public document validators (`validatePatch` and `canvas::prepare`), alongside the pure metadata validators. The `outside subtree` row's child item now has a unique ID so it tests target scope rather than duplicate identity. The complete shared corpus is now 51 cases: 15 valid and 36 invalid.
3. Generic `packageInstrument` turns an explicit null root into the deliberate empty version-1 surface `{version:1, openOnLoad:false, size:{width:640,height:112}, items:[]}`. It preserves an existing nonnull authored surface. `subtractivePatch` explicitly authors its known seven controls against its fixed node identities; generic packaging performs no populated layout inference.

Public mutation signatures and HostManifest projection shape are unchanged. Admission returns detached surface records; no caller-owned metadata can mutate canonical state. The generic packaging behavior described above supersedes the initial populated fallback. No native source, renderer/editor UI, capacity, catalog publication or admission capability changes occur in this fix.

### Exact Red/Green Evidence

All commands run from `/home/venetanji/.codex/worktrees/phase2-ui/alive`. Logs are retained under `/tmp/alive-presentation-task1/fix-round1/`.

```bash
node --test apps/ultra/ui/canvas-presentation.test.mjs
```

`js-red.log`: 12 tests; 9 pass, 3 fail. The two hierarchy-admission tests detect root/nested input aliasing; the generic packaging assertion detects seven generated items instead of an empty surface. `js-green.log`: 12 tests; 12 pass, 0 fail.

```bash
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib presentation
```

`rust-red.log`: 2 passed, 2 failed, 0 ignored, 292 filtered out. Both the pure corpus and public document corpus tests wrongly accept `authored inlet has no event inlet` (`left: true`, `right: false`). `rust-green.log`: 4 passed, 0 failed, 0 ignored, 292 filtered out. This green also includes host projection and the real native shared-history/receipt regression. The two pre-existing compile warnings remain the `SaveSnapshot` unused import and audio `write` FFI declaration.

Final affected JS integration suites, run once after the fixes:

```bash
node --test apps/ultra/ui/canvas-{presentation,hierarchy,model,instrument,shared,library,documents,dom}.test.mjs
```

`js-affected.log`: 218 tests; 218 pass, 0 fail, 0 cancelled, 0 skipped.

Exact bundled source/fingerprint verification (the temporary script is retained beside its log):

```bash
node /tmp/alive-presentation-task1/fix-round1/check-bundled-fingerprints.mjs
```

`fingerprints.log`:

```text
PASS: explicit subtractive producer preserves exact bundled document bytes
PASS: 7 current saved .alive references retain canonical source fingerprints and manifest versions
```

The script compares the producer's complete pretty-serialized document bytes to `subtractive.ultra`, then hashes recursively key-sorted compact JSON for every current `.alive` source reference and checks manifest versions. No `.ultra`, generated library or `.alive` bytes change, so no fingerprint updates are required.

`git diff --check` passes. Frozen runtime SHA-256 remains `69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`. No unrelated suites or desktop launches were run in this fix round.

Changed paths:

- `apps/ultra/ui/canvas-hierarchy.mjs`
- `apps/ultra/ui/canvas-instrument.mjs`
- `apps/ultra/ui/canvas-presentation-cases.json`
- `apps/ultra/ui/canvas-presentation.test.mjs`
- `apps/ultra/src-tauri/src/canvas_presentation.rs`

Self-review: constructor/replacement ownership and cross-document isolation are exercised at root and nested scope; corrected scope corpus checks the intended missing-subtree target; boundary event parity is tested through both languages' public and pure validators; nonnull authored layout preservation and deliberately empty generic packaging both pass. Existing canonical transaction, projection, source fingerprint and native receipt boundaries are preserved. Renderer/authoring/native hosting work remains deferred as before. No additional concern remains from the three reviewed findings.

Fix round 1 commit: `80100f7` (`fix(canvas): isolate saved surfaces and authored event capabilities`).
