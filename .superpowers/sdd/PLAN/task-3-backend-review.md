# Task 3 Backend Review

Scope: uncommitted Alive desktop backend, `main.rs`/`session/mod.rs` wiring,
window capability, and relevant resource declarations. Reviewed against
`apps/alive/SESSION_CONTRACT.md` and `task-3-brief.md`. Frontend behavior and
normal Ultra document ownership are outside this pass.

Verdict after follow-up review: APPROVE for this backend scope. No outstanding
Critical or Important findings. The initial review found two Important issues;
both were sent to the implementation owner and fixed during review. Historical
findings and validation limits are retained below.

## Important Findings

1. **ADDRESSED: Installed New/default startup missed the bundled session.**
   `apps/ultra/src-tauri/src/session/desktop.rs:208` searches
   `resource_dir/alive/examples/two-instruments.alive`, but
   `apps/ultra/src-tauri/tauri.conf.json:6` and
   `apps/ultra/scripts/release.py:59` both install the file at
   `alive-session/alive/examples/two-instruments.alive`. On a machine without
   the build-time checkout, `ultra --alive` fails during setup and New fails
   because the fallback points into that checkout. Align the runtime lookup
   with the declared package layout; retain the existing relative device path.
   Add coverage that checks the path actually consumed by the resolver against
   a temporary packaged resource tree, rather than only checking resource-map
   completeness.
   Follow-up: current line 208 now uses
   `alive-session/alive/examples/two-instruments.alive`. A fresh focused source
   comparison confirms it matches the package declaration. The package-tree
   test passes for all configured targets (one unittest with per-target cases).

2. **ADDRESSED: Opening a hosted editor could deadlock Windows.**
   `apps/ultra/src-tauri/src/session/desktop.rs:152` declares `alive_editor` as
   a synchronous Tauri command and creates a webview at line 160. The pinned
   Tauri 2.8.5 implementation explicitly documents this operation as deadlocking
   on Windows when used in a synchronous command and recommends an async
   command or a separate thread. Move creation off synchronous IPC handling,
   while keeping the generation/track/window authority checks serialized.
   Evidence: installed dependency
   `tauri-2.8.5/src/webview/webview_window.rs:62`. Linux walkthroughs cannot
   establish Windows safety for this path.
   Follow-up: current line 152 is `pub async fn alive_editor`, matching the
   pinned Tauri guidance. Fresh source inspection confirms this; the serialized
   window/generation checks remain in place. Windows runtime remains untested.

## Reviewed Properties

- The separate builder clears configured automatic windows and starts
  `alive.html`; normal Ultra startup remains on its existing builder.
- Main-only actions authenticate the actual Tauri window label. Bound editor
  writes authenticate both current generation and their own track label.
- One control mutex owns Host/Driver and serializes native control calls.
  UI polling uses `try_lock`, avoiding blocking the UI on worker-held native
  dialogs. The callback does not acquire this mutex.
- Installation checks stopped transport, performs prospective native admission,
  then drops/stops the Driver before Host resets/closes native slots. Final
  Exit follows the same Driver-before-native-destruction order.
- Draft staging validates structural identity/count bounds before assignment.
  Apply merges current live base/mixer values, prepares before native change,
  and clears the stored draft only after installation succeeds.
- Save/Open/Quit resolve stored drafts explicitly, and Save/Discard/Cancel
  results and errors preserve the current document unless a requested operation
  succeeds. Stale editor close releases UI rather than owning DSP teardown.

## Validation And Limits

Read `desktop.rs`, Host install/rollback/live updates, Driver start/stop/drop,
session preparation/persistence, native entrypoints and stopped lifecycle,
builder wiring, capabilities, and package resource mapping.

Ran a focused Python comparison of the configured bundle destination and the
runtime lookup before and after the fix: the initial mismatch is now resolved.
Read the pinned Tauri source documentation for the Windows deadlock finding.
Ran `python3 -m unittest
test_release.ReleaseTests.test_bundled_alive_example_resolves_its_external_device`
from `apps/ultra/scripts`: one test passed with all target subcases. A first
ad-hoc source comparison used the wrong working directory and failed to find
the config; rerunning it from the repository root passed. `git diff --check`
also passed. No Windows runtime, GUI walkthrough, or full test rerun was
performed for this independent backend review; parent owns the active
integration/test work. No production files were edited by this review.
