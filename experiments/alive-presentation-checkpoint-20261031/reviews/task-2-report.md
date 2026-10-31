# Task 2 Report: Shared Saved Presentation Surface

Status: implementation and self-review complete. Review base: `80100f7ea29ed594b3bf64cb670a2fa7f8bd1d9d`; branch `feat/phase2-ui-fidelity`. Work was confined to `/home/venetanji/.codex/worktrees/phase2-ui/alive`. The implementation commit is recorded at the end of this report. No subagents, publication, installation, desktop configuration changes, native-library rebuilds, or changes to the concurrent source tree were performed.

## Delivered Surface And Adapters

`apps/ultra/ui/canvas-presentation-view.mjs` exports exactly:

```text
mountPresentation({doc,root,presentation,host,mode,onError})
  -> {update,dispose,hasDraft}
```

The renderer consumes saved size, item order, rectangles, inclusion, visibility, widget choice, labels, accents, options and label position. It uses the imported shared dial/slider/number/toggle/menu/radio/button factories and the resource-backed body. Supported text uses the resolved authored text, font size and text/background colors. Empty surfaces remain empty. Missing panel resources produce an error inside the original saved rectangle. The surface has natural-size internal scrolling, with no generated keyboard, player, note ownership or automatic audition footer.

Each mount captures the immutable full `{ownerId,generation,instanceId,sourceRevision}` before asynchronous work. Replies and callbacks are rejected after scope change/disposal. Mutable gesture state, dirty number text, resource pages, conditional state, pending requests and bitmap URLs belong to the mount. Disposal first revokes the mount, unsubscribes, and disconnects resource bindings before disposing the body, so the envelope's cleanup cannot restore native values. Retained detached controls cannot write. Surface hide/dispose performs zero note, stop or reinstall operations.

`canvas-presentation-hosts.mjs` supplies both adapters using the exact spec methods `resolve`, `snapshot`, `subscribe`, `beginGesture`, `write`, `writeBatch`, `sendEvent` and `acquirePanel`, plus the owner's internal `publish` and `dispose` integration hooks.

- Ultra resolves numeric, text and typed bang-inlet targets against the canonical root tree. Scope uses the controller owner ID, native runtime revision, root instance identity, and the structural source revision (shared runtime revision or standalone desired revision). Numeric snapshots distinguish owner previews from canonical authored values; typed events use `controller.deviceEvent`.
- Alive resolves only the accepted `manifest.presentation.items[].resolved` projection. Scope uses `ownerId:"alive-session"`, accepted generation, exact instance ID, and the immutable reference tuple `[sourceSha256,path,id,version]`. Snapshot sequence and mutable base values are not source identity. Scalar writes retain `alive_base` generation/instance/key authorization, with base, applied, effective and Automation ownership kept separate.
- Alive serializes adapter writes. A queued write checks the expected observed base immediately before native dispatch. Post-refresh/reply checks use immutable scope, so accepting the new base cannot reject the command's own acknowledgement. An observed competing base edit makes the old cancellation refuse rather than overwrite that owner's value.
- Real installed panel acquisition and compound native writes deliberately remain unavailable in both production adapters for this delivery. No Analog native admission is implemented or claimed.

The injected qualified panel acquisition result used by the shared renderer is:

```text
acquirePanel({scope,sourceNode,profile}) -> {
  resources: {
    identity,       // exact immutable artifact/profile/locale/entrypoint identity
    layout,         // read-only loaded resource layout
    graphics        // optional immutable has(path)/read(path) pack
  },
  bindings: {
    resolveBinding(connection,node,options),
    evaluateExpression(expression,options), // optional
    snapshot() -> {values:{bindingId:value,...}},
    observe(acceptedCompleteState),         // optional
    disconnect()
  }
}
```

`snapshot().values` contains the complete source state, including undisplayed fields. Resolved bindings carry their source `bindingId` and the verified shared body binding API. The renderer coalesces synchronous multi-axis edits into one complete `writeBatch({scope,sourceNode,gestureId,phase,values})`. Acknowledgements are `{values:{...completeAcceptedState}}`. Cancel writes the captured complete original state. Two mounts may receive the same immutable resource object, but never share bindings or object URLs.

Ultra's existing Perform panel now mounts this renderer; packaging, presets and New Instance remain outside it. Alive's existing card cache mounts the same renderer, includes source hash/ID/version in cache identity, retains drafts when navigating, publishes from the existing owner refresh loop, and disposes mounts on eviction. No per-card timer was added.

## Native Parameter Gesture Ownership

The controller approved a focused extension to the native document bridge because audible continuous preview must preserve one canonical history commit. `canvas-parameter-gestures.mjs` holds owner state independently of surface lifetime. Both controllers expose:

```text
beginParameterGesture(node,key) -> localGestureId
writeParameterGesture(localGestureId,phase,value)
settleParameterGestures()
```

The new calling-window-scoped commands are:

```text
document_parameter_gesture({request:{
  ownerLabel,runtimeRevision,token,node,key,phase,value
}}) -> {token,document}

document_settle_parameter_gestures() -> document
```

The first command accepts native `begin|preview|commit|cancel` phases; `begin` uses `token:null`, while subsequent phases require the returned bounded token. The server validates owner/runtime/calling view/token/target. Each document has at most 16 active tokens. `Document.parameterPreviews` is a descriptor-only observation, never saved authored metadata.

Preview sends the qualified native parameter setter using a clone of canonical `CanvasState`, then records the accepted value in the owner. The canonical comparison remains unchanged, so presentation metadata or another live parameter edit neither reinstalls the graph nor loses a preview. Commit persists the final value once through normal canonical history. Cancel restores only that token's baseline. Structural edits, same-target edits/history and forced installations cannot replace unsettled gestures. Save/close barriers explicitly settle accepted previews, including tokens whose child UI has detached; saving/closing refuses if settlement failed. Close barriers are installed before flushing, preserving existing close-error reporting.

For hot value targets (number/toggle/slider family), preview emits hot output. The owner derives the commit's cold hint only if the final value equals an actually accepted preview for that authoritative token. An unchanged final value emits no duplicate hot output; a changed final value emits once; cancel emits one baseline restore. The client cannot choose suppression. Native command wrappers broadcast the authoritative descriptor after accepted or rejected command handling, including partial multi-token settlement.

A refused begin retains a retryable local gesture and refreshes its canonical baseline; it does not retain an obsolete baseline forever. Cancelling an unstarted gesture sends no native command. Asynchronous rejection reconciles accepted owner state while preserving a newer numeric draft. Hiding/disposing the surface does not settle or cancel playback; explicit document save/close does.

## Imported Authored Sources

All eight files came from `/tmp/alive-presentation-surface-snapshot-20261031`, using its manifest. Snapshot bytes remain unchanged and destination modes are 0644. These are original source hashes, before the documented draft/phase/cleanup adaptations:

| UI File | Original SHA-256 |
| --- | --- |
| `live-controls.mjs` | `b7a505b0c1114b86ceef6761fdfe0ef34d5b66bf9c5d9cd8ad1d497badf68fe5` |
| `live-controls.css` | `0073ee881aeca2cc5afb6a6efb5c905328453da2e439ebbb2a81388852279ad1` |
| `live-device-view.mjs` | `63ae8aedd5a0590e56401798230e1d3d4f965850f289fe31e3c9fea2a2e93cc4` |
| `live-device-view.css` | `5ba5a7edd06a3a3d91c689c2b53d155a98716f95549436cd4d15fd2c07db8c02` |
| `live-device-layout.mjs` | `10311bfddbefde77bd9d7018179dcb6f9b133c0f70c2ccb9453232b9e40c08e9` |
| `live-envelope-editor.mjs` | `1a5c98ac13898035aab5ced92ac436fe5712380f9052313a7431f5e92138ac23` |
| `live-envelope-editor.css` | `942d27a6db7a209d85b84a78183ea6cba3da1afb75f533e77e545270bf1b51c5` |
| `live-resource-pack.mjs` | `8690f19de415f3e8c7e049ea1d23808eaf65f204d6c04e34ea5ab37038c0242e` |

No installed GUI, Graphics, preset, XML, image or binary payload was copied. The resource browser test uses a tiny authored synthetic PNG; its white 24px squares are that bitmap, not an unstyled product control. The imported resource body retains its own compact control typography; the harness intentionally excludes product card chrome.

## Verification And TDD Evidence

All logs are under `/tmp/alive-presentation-task2/`. Source commands run from the task worktree; Playwright commands run from `apps/ultra/tests/ci`.

Initial shared renderer red/green:

```bash
node --test apps/ultra/ui/canvas-presentation-view.test.mjs
```

`dom-red.log`: 0/4 pass against the unimplemented mount. `dom-green-first.log`: 4/4 pass after the renderer. The final seven renderer tests additionally cover complete atomic batches, independent resource pages, conditional visibility, two-axis envelope cancellation, and revoked acquisition/disposal. `panel-red.log` is a historical misnamed intermediate green log (6/6), not claimed as failing evidence.

Initial adapter and owner red/green:

```bash
node --test apps/ultra/ui/canvas-presentation-hosts.test.mjs
node --test apps/ultra/ui/canvas-parameter-gestures.test.mjs
```

`hosts-red.log` and `gesture-js-red.log` fail because the requested modules did not exist. `hosts-green-first.log` and `gesture-js-green.log` record the first passing implementations. `alive-owner-cancel-red.log` has 4 pass/1 fail because cancellation overwrote another owner's observed edit; the final adapter tests reject it and exercise pre-dispatch assertions plus post-refresh scope assertions. `gesture-begin-retry-red.log` has 2 pass/1 fail (`baseline 1 !== 2`); `gesture-begin-retry-green.log` has 8/8 across owner and adapter tests after the retry/cancel fix. `gesture-owner-final.log` is the final focused 8/8 owner/adapter check.

Native owner red/green used the frozen environment in the command below, with filter `parameter_gestures`. `gesture-rust-red.log` fails to compile the missing `Registry.begin_parameter_gesture` API. `gesture-rust-green-first.log`/`gesture-rust-green-second.log` record the owner implementation checks. `gesture-rust-hot-exact-green.log` verifies the actual native regression, with isolated native slots, downstream values/pulses, no duplicate commit output, one changed-final output, one cancel restore, and held Subtractive audio across preview, metadata, another parameter edit and cancel. It also covers detached child settlement, history, canonical isolation and unchanged native runtime revision.

Final complete affected Node suites:

```bash
node --test apps/ultra/ui/canvas-*.test.mjs apps/ultra/ui/alive-*.test.mjs
```

`js-final.log`: **595 tests, 595 pass, 0 fail, 0 skipped/cancelled**.

Final Rust library suite:

```bash
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib
```

`rust-final.log`: **295 pass, 0 fail, 4 ignored**. The same two existing warnings remain: unused `SaveSnapshot`, and the existing `audio.rs` runtime `write` declaration signature warning. The four ignored tests retain their declared measurement/private-output/local-installation prerequisites; none is newly ignored. This is not a warning-free output claim.

Final full affected Chromium suites:

```bash
ALIVE_TEST_PORT=4198 npx playwright test canvas-instrument.spec.mjs alive-chain.spec.mjs --reporter=list --output=/tmp/alive-presentation-task2/browser-final-results
```

`browser-final.log`: **117/117 pass**. After the last owner retry/cancel changes, the entire `canvas-instrument.spec.mjs` rerun also passes **8/8**, logged in `browser-owner-final.log`, with output `/tmp/alive-presentation-task2/owner-final-results`. Playwright output contains the environment's existing Node deprecation/color notices and HTTP server logs.

Focused final visual command:

```bash
ALIVE_TEST_PORT=4198 npx playwright test alive-chain.spec.mjs canvas-instrument.spec.mjs --grep 'saved .* surface|resource panel errors' --reporter=list --output=/tmp/alive-presentation-task2/visual-final-results
```

`browser-visual-green.log`: **6/6 pass**, including full ratio-1 visibility of ownership outputs. All six captures were inspected at actual sizes and copied to `/tmp/alive-presentation-task2/screenshots/`:

- `saved-alive-800x600.png`
- `saved-alive-1280x800.png`
- `saved-ultra-800x600.png`
- `saved-ultra-1280x800.png`
- `saved-resource-error-800x600.png`
- `saved-resource-error-1280x800.png`

The production captures demonstrate focused `123` drafts alongside the still accepted `Base: 10 ms` owner value, correct native-scale dials, and internal horizontal scroll without whole-window overflow. Resource captures show two independent instances, missing-resource errors with retained size, and independent per-view object URLs; the test disposes the views and verifies both URLs are revoked.

## Interaction Fixes Versus Fixture Changes

Real Chromium exposed a shared-control blur commit during Alive navigation/hide. `browser-first.log` records 107 pass/4 fail. The existing capture-phase workspace blur handler now suppresses blur while the input is parked and hidden. The same four original assertions passed in the 12-test focused rerun (`browser-focused.log`), then the full suite passed. Deliberate visible blur/change commits remain enabled.

The added full-visibility assertion exposed an actually clipped ownership readout (`browser-ownership-red.log`). After initial sizing, `ownership-diagnostic.log` measured status bottom 227.297 against saved item bottom 226 (intersection ratio about .892). The scoped saved-control CSS now uses a 44px dial, 18px numeric field and 2px grid gaps, preserving every saved rectangle and readable natural scale. Full visibility assertions were retained; there is no clipping/masking workaround.

Separate test maintenance supplies the current explicit saved presentation/projection in old DOM/IPC fixtures, supplies a required nested `presentation:null`, and mocks the new gesture command. Tests that previously asserted automatic keyboard behavior now assert its required absence. The prior source-replacement test now checks that an old focused draft survives without redirecting its write into the replacement. No production inference was added to accommodate fixtures. Existing browser drop, atomic failed-load rollback, rack/cache and deliberate-commit assertions remain in place.

## Packaging And Self-Review

`packaging.log` records a checked relative JS/CSS/HTML closure of **68 assets**, both products' existing frontendDist paths embedding the same UI, all **seven unchanged resource mappings per product** resolving to files, and the unchanged frozen native SHA-256:

`69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`

Both CSPs add only `blob:` to `img-src`; script/connect/object/base restrictions remain identical. Current Tauri v2 CSP documentation was fetched through Context7 (`/tauri-apps/tauri-docs`) before that platform configuration change. No optional mapping/profile/resource-picker module, wrapper keyboard CSS, installed payload or package was imported.

Self-review checked common rendering in both hosts, immutable scope capture, stale requests and replies, native owner token authority, independent drafts/pages/URLs, accepted/rejected state reconciliation, explicit cancel, full compound state, save/close settlement, zero surface-owned playback operations, current fixture projection, full readout visibility and packaging closure. `git diff --check` passes. The native bridge regression exercises the frozen existing setter/graph contract; it does not claim actual Analog state/resource/native playback delivery. Existing large controller/view files were edited narrowly rather than reorganized.

No remaining implementation correctness concern is known. Independent review and integration remain the controller's responsibility. The report is an ignored local coordination ledger, consistent with Task 1, rather than a product source file.

## Changed Files

New UI modules: `canvas-presentation-view.mjs/.css`, `canvas-presentation-hosts.mjs`, `canvas-parameter-gestures.mjs`, their three test modules, and the eight imported authored `live-*` files listed above. New fixture helper: `apps/ultra/tests/presentation-dom.mjs`. New native modules: `document_parameter_gestures.rs`, `documents_gestures.rs`.

Existing UI integration: `canvas-device-panel.mjs`, `canvas-model.mjs`, `canvas-shared.mjs`, `canvas.mjs`, `canvas.html`, `alive.mjs`, `alive.html`, `alive-workspace.mjs`, `canvas-dom.test.mjs`, `alive-dom.test.mjs`, `tests/ci/canvas-instrument.spec.mjs`, `tests/ci/alive-chain.spec.mjs`.

Existing native integration: `canvas.rs`, `document_commands.rs`, `documents.rs`, `documents_shared.rs`, `documents_save.rs`, `documents_close.rs`, `lib.rs`, and both products' `tauri.conf.json`.

Implementation commit: `36aaba1` - `feat(presentation): share scoped saved surfaces and owner parameter gestures`. The 39-file source commit contains 1,780 additions and 181 deletions. Post-commit worktree status is clean; this ignored local report remains available for the controller's independent review.

## Fix Round 1: Three Important Review Findings

Fix base: `36aaba1c670060cbf900b1573047695c87cb6c41`. Scope is exactly the three Important findings in `task-2-review.md`, retaining every ruling in `task-2-review-handoff.md`. Installation and push belong to the controller; this worker performed neither. No later roadmap task, native rebuild, concurrent tree edit, desktop change or subagent was started.

### Changes And API Semantics

1. **Cold final-value reconciliation.** The matching-canonical-graph fast return in `document_commands.rs::admit_message` now applies only when there is no numeric parameter hint. An explicit cold hint passes through the existing full-plan/exact-target `parameter_matches` validation and qualified native setter even if the authored final value equals the canonical baseline. It remains cold, produces no hot event and does not install a graph. No new IPC field or client-selected reconciliation flag is added. The existing gesture command still validates owner, calling view, runtime, token and exact target before constructing its transient hint. Its authoritative accepted-preview check still determines hot suppression. A new isolated native test previews a multiply RHS from 0.65 to 0.4, commits 0.65 without previewing that final value, then sends a real native message and observes 0.65 downstream. It also asserts that commit emitted no output, removed its preview and left runtime revision unchanged. The retained hot regression verifies unchanged-preview commit does not duplicate output, changed-final commit emits once, and cancel restores once.

2. **Alive conflict recovery.** Both mutable-base checks (adapter dispatch and the owner's actual pre-dispatch callback) now revoke only the conflicting local gesture. Terminal failures carry an Error with `{code:"PRESENTATION_GESTURE_ENDED",gestureId}`. Subsequent requests using an already revoked gesture also receive that terminal identity. The renderer clears only that matching ended gesture; scope and newest-request checks still precede reconciliation, and retryable failures retain the existing retry behavior. It never restores the obsolete baseline or cancels the competing owner's accepted value. Numeric dirty text remains intact, and the next deliberate gesture captures the current base. Two real renderer-plus-Alive-adapter regressions cover preview 1.2, another owner's published 1.6, rejected cancel, and successful fresh 1.7. One retains a new numeric draft across the conflict reply; the other commits the new gesture before the old conflict reply and proves the late reply cannot discard it.

3. **Mounted canonical text and appearance.** Text items now register a scoped refresher. Owner publication or `update()` resolves current text and validated style into the same element, including clearing removed font size, foreground color and background color. A real controller/Ultra adapter/renderer regression updates a comment via owner publication, a message-box template via `update()`, changes font size, clears all appearance, and verifies stable DOM identity. Replacing the source makes the old refresher inert. No presentation JSON or executable-revision change is needed for ordinary text/style observations.

### Red/Green Evidence

All new logs are under `/tmp/alive-presentation-task2/`.

```bash
node --test apps/ultra/ui/canvas-presentation-hosts.test.mjs
```

`fix1-host-text-red.log`: **5 pass, 2 fail** before implementation. The real conflict recovery fails `1.6 !== 1.7`, and canonical comment refresh fails `'Before' !== 'After'`. An initial invalid text-widget fixture was corrected to the required `widget:"text"` before retaining this behavioral red run. The final two conflict timings are covered in the affected green run below.

```bash
node --test apps/ultra/ui/canvas-presentation-hosts.test.mjs apps/ultra/ui/canvas-presentation-view.test.mjs
```

`fix1-host-text-green.log`: **14/14 pass** after the three implementation changes, before adding the second late-conflict timing. This covers the new real integration regressions and all seven existing shared renderer tests.

```bash
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib non_hot_baseline_return_commit
```

`fix1-native-red.log`: **0 pass, 1 fail**, with actual native downstream `0.4` versus final expected `0.65`: `baseline-return commit left native rhs at its earlier preview`. `fix1-native-green.log`: **1/1 pass** after the admission fast-return fix, with no reinstall or hot output.

### Covering Affected Checks

```bash
node --test apps/ultra/ui/canvas-{presentation,presentation-view,presentation-hosts,parameter-gestures,dom,shared}.test.mjs apps/ultra/ui/alive-dom.test.mjs
```

`fix1-js-affected.log`: **262/262 pass**, no failures/skips/cancellations. Includes both new Alive conflict timings, current/cleared text appearance, stale source/reply protection, owner gesture retry/cancel, draft/disposal, resource batches and existing shared close/save guards.

```bash
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib document_windows::commands
```

`fix1-native-affected.log`: **14/14 pass**, 286 unrelated tests filtered out. This covers the new cold baseline-return native case plus the retained native hot-output/held-note/detached-settlement regression and existing admission/history/retirement/message-text tests. The same two previously disclosed Rust warnings remain; no warning cleanup is bundled.

```bash
ALIVE_TEST_PORT=4198 npx playwright test canvas-instrument.spec.mjs alive-chain.spec.mjs --grep 'saved .* surface|retains.*draft|unfinished|focused|commit|base' --reporter=list --output=/tmp/alive-presentation-task2/fix1-browser-results
```

`fix1-browser.log`: **34/34 pass**. These are the saved surface size/focus checks at 800x600 and 1280x800 plus affected unfinished-input, navigation/cache, base-value and deliberate-commit checks. Output remains in `/tmp/alive-presentation-task2/fix1-browser-results`. Full unrelated suites were not rerun. Frozen native SHA-256 was rechecked and remains `69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`.

### Self-Review

Re-read the five-file fix diff and checked that the no-op admission branch still avoids installation for pure metadata, explicit hints cannot bypass complete-plan qualification, cold reconciliation cannot emit a hot event, native token authority is unchanged, terminal errors identify only the revoked gesture, newest-request guards protect an already-started replacement gesture, dirty number drafts survive rejection, and text refresh clears previously applied style properties while respecting captured source scope. No known implementation concern remains. Existing warning noise and delivery boundaries remain as described in the original report. `git diff --check` passes.

Fix Round 1 commit: `0c98d72` - `fix(presentation): reconcile final values and refresh mounted state` (five source/test files, 71 additions, 9 deletions). Post-commit worktree status is clean. The ignored local report contains the full evidence for independent review.

## Fix Round 2: Ordinary Hints Cannot Bypass Active Gesture Ownership

Fix base: `0c98d72de3c3e25c2363c151de40fbf02addce83`. The three original findings remain addressed. This round fixes only the new Important ownership regression in `task-2-rereview.md`.

### Change And Ownership Semantics

The common numeric-hint admission branch in `document_commands.rs::admit_message` now checks the authoritative owner's active gesture map for the exact node/key before target validation, hot dispatch or the native setter. A matching active token makes an ordinary numeric hint refuse, including an unchanged canonical patch with a cold hint. The check applies independently of a caller-supplied hot flag. It uses the existing `Document.parameter_previews()` method, which reads the authoritative gesture state, rather than a serialized descriptor list.

No IPC, schema or client-visible authorization flag is added. Legitimate token-qualified commit and explicit owner settlement already remove their validated gesture from the registry immediately before canonical admission, restoring it on admission failure; their cold reconciliation still reaches the qualified setter. Other active gesture targets remain protected. Cancel still restores through the validated gesture command. Pure metadata without a numeric hint retains its no-op admission behavior. No native installation, hot classification, canonical conflict rule, UI behavior or source-scope contract changes.

### Regression And Red/Green Evidence

The new isolated real-native regression `linked_view_cold_hint_cannot_overwrite_an_active_parameter_gesture` opens a linked child view. A root-owned token previews multiply RHS 0.4 from canonical 0.65. The linked view then attempts the ordinary `Registry.commit` plus `admit_owned` path used by the public `document_commit` endpoint, supplying the unchanged canonical patch and an explicit cold 0.65 hint without a token.

The regression verifies an ownership-specific refusal, unchanged authoritative descriptor/history/preview/token, no emitted output during refusal, and continued actual native RHS 0.4 on a subsequent input message. It repeats the attempt before legitimate owner commit and before legitimate cancel, verifies both restore native 0.65, confirms preview removal, and checks the runtime revision stays fixed. The test exercises the endpoint's real commit/admission core with a second linked caller; it does not mock the setter or require a desktop IPC window.

```bash
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib linked_view_cold_hint
```

`/tmp/alive-presentation-task2/fix2-native-red.log`: **0 pass, 1 fail**, with `ordinary unchanged-patch cold hint bypassed the active gesture token` before the guard. `/tmp/alive-presentation-task2/fix2-native-green.log`: **1/1 pass** after the ownership guard.

```bash
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib document_windows::commands
```

`/tmp/alive-presentation-task2/fix2-native-affected.log`: **15/15 pass**, zero failures/ignored, 286 unrelated tests filtered out. Covers the new linked-view refusal, retained non-hot baseline-return reconciliation, unchanged-preview/changed-final hot output, cancel, held note, detached settlement, history, metadata receipts and native retirement protections. The same two pre-existing Rust warnings remain. No unaffected JS/browser suite was rerun, as neither UI code nor its API changed.

### Self-Review And Boundaries

Read the two-file fix diff and checked all numeric-hint entry paths converge on the guard, exact target ownership is checked before any event/setter, legitimate commit removes only its already-validated token before admission, unrelated active targets stay protected, and failure restoration remains intact. The real-native test verifies both data/descriptor retention and native execution retention, avoiding a descriptor-only assertion that could miss silent cold setter mutation. `git diff --check` passes. Frozen runtime SHA-256 remains `69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`.

No known implementation concern remains. No UI edits, native rebuild, subagents, concurrent tree edits, desktop changes, install or push were performed. Independent re-review, installation and publication remain with the controller. The fix commit is recorded below.

Fix Round 2 commit: `1b6cb68` - `fix(presentation): guard token-owned parameters during numeric admission` (two source/test files, 38 additions). Post-commit worktree status is clean. The ignored local report retains the exact red/green and covering native evidence.
