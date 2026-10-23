# Native Patcher Windows

The completed Impeccable Max fidelity pass remains the visual baseline. This
phase replaces native inline patcher navigation with independent child windows
of one authoritative document. Browser preview retains inline navigation.

## Behavior

- Double-click or Enter on an embedded patcher opens its native child window;
  reopening focuses the existing view. The path bar focuses parent windows.
- All views share the complete root tree, saved baseline, undo/redo and runtime.
  Child Save writes the whole owner. Child close detaches only that view.
- Geometry, style and container-name changes retain runtime state. A validated
  single numeric change, including undo/redo, uses atomic parameter/hot-event
  admission. Other executable edits replace the owner's graph.
- Console polling uses a bounded owner cache with independent view cursors.
  Source links open and reveal the containing patcher, including a closed view.
- Closing flushes pending edits and pauses new authoring in participating views.
  Failed edits or rejected history cancel the close. Cancel restores editing;
  Save releases the barrier and rechecks all views before eventual close.
- Late-ready children join pending close requests. New child creation pauses
  during owner close. Root close prompts once and closes its children while
  independent roots keep running through the shared audio output.

## Review Findings Resolved

1. Asynchronous controller handoff could miss a startup owner broadcast. Shared
   controller adoption is synchronous, and events wait for initial adoption.
2. Whole-document load could reset a child view to root. Descriptor view paths
   now remain authoritative and repair removed containers.
3. An unchanged authored hot value could not restore a different live value.
   Numeric hot edits now admit even when the saved tree is unchanged.
4. Numeric history could replace the graph and reset live state. Native checks
   the complete prepared graph before selecting the atomic parameter path.
5. Native dirty state could miss queued frontend edits during OS close. A
   targeted token-based flush handshake covers the affected ready views.
6. Ordinary queue recovery swallowed admission failures during close flush.
   Real controller/session regressions now require failed acknowledgements for
   pending edit failures and CAS-rejected history.
7. The flush membership could become stale, and acknowledged views could edit
   again. Matching barriers block authoring until cancellation; newly ready
   views enroll, and removed views retire their outstanding acknowledgements.
8. Authoring revision could not order runtime-only or saved metadata updates.
   Owner-wide descriptorRevision now orders publications independently of CAS.
9. Native readiness could precede event registration. Subscriptions complete
   before document_current; early close events await shared-controller adoption.

Independent re-review reports no remaining findings on the bounded native,
controller and integration surfaces. Regressions for the material findings were
observed failing before their corresponding fixes.

## Verification

- Final JavaScript suite: 265 passed, 0 failed.
  `/tmp/ultra-native-views-js-final.log`
- Final Rust release suite: 87 passed, 0 failed, one existing private-audio test
  ignored. `/tmp/ultra-native-views-final-rust.log`
- Rendered Chromium: 72 passed. `/tmp/ultra-native-views-browser-final.log`
- Required contracts pass, including frozen message/signal/hierarchy evidence
  validation and native replay. `/tmp/ultra-native-views-contracts-final.log`
  The final history-CAS change was subsequently covered by focused and complete
  JavaScript runs.
- Release build exits 0. `/tmp/ultra-native-views-build-final.log`
- Atomic native FIFO/parameter/hot-event runtime regression exits 0.
  `/tmp/ultra-native-views-atomic-final.log`
- Final release desktop window/file/audio gate exits 0; result status passed.
  `/tmp/ultra-native-views-final-20261022-0027/documents-result.json`
  Startup also passes with 32 secondary deliveries. This run verifies the OS
  picker, help windows, typed cross-window messages, all ten list kinds, all
  twelve MSP kinds and the complete native child lifecycle. Runtime stays r1;
  captured peaks stay `[0.0625,0.05624999850988388]` through child open/close and
  reopen. Closing the owner leaves the other document at `[0,0.02500000037252903]`.
  Whole-tree child Save/reopen, console source reopening, deletion closure and
  owner Cancel/Discard pass. All private test processes are cleaned up.

Desktop harness investigation distinguished private-X keyboard focus from
product behavior. A visible GTK file chooser sometimes left focus on its parent;
explicit Files focus passed 30 open/cancel cycles. Inspector visibility,
offscreen diagnostics, prompt identity and ready-canvas focus assumptions were
also corrected in the harness. These corrections did not change production UI.
The last full-run accessibility lookup failure was independently captured while
the app remained alive: Inspector/list rerenders invalidated cached accessible
nodes. Scoped lookup now skips defunct nodes like the existing base helper.

## Limits

The v2 authoring limits remain 512 objects, 1024 cables, 16 embedded levels and
1 MiB compact JSON. Native execution retains 32 leaves/relays and 64 cables,
with 16 owner slots and 64 child views per owner. No ABI array expansion is
implied. Complete Max initialization, abstraction arguments/scoping, proprietary
help helpers/tabs and thousands of object behaviors remain pending. Installed
whole-help conformance remains 0/2103.

The bounded next-wave dependency map is recorded in `next-objects.md`.
