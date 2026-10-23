# Max fidelity refinement, 2026-10-21

This pass refines the existing Ultra patcher using the retained Max 9.1.5
screenshots and recorded interactions. It does not add new Max runtime traces.

## Reference and resulting changes

- `screenshots/max-controls.png` shows a broad hatched gain channel with a
  pale blue position bar. `../max-reference/help-coverage-20261021/results/
  max-locked-controls.png` shows a flat horizontal slider and plain locked UI
  faces. Ultra now renders original flat bars for all sliders and gains, with
  a hatched gain channel. Locked UI controls hide port markings while existing
  cords retain their endpoints. Numeric readouts are available through the
  Inspector and accessible value text instead of an overlay on the track.
- The physical I/F/S run recorded in the help-coverage README establishes
  immediate integer, float and vertical-slider creation. Ultra now creates
  these controls at the pointer; S uses a 20 by 140 rectangle. Creation and its
  dimensions form one undo step. B/M/T retain the existing entry workflow;
  this pass does not claim a measured Max transition for those keys.
- `screenshots/max-autocomplete.png` shows a compact object editor with a
  separate completion list. Ultra's text entry now follows the object's
  position and canvas zoom. Completion occupies a separate overlay with
  compact class-name rows. Argument guidance appears after the class name;
  supported options, keyboard completion and validation remain available.

## Interaction defects corrected

- Numeric controls compared a new value with saved parameters and could
  suppress returning a live observed value to its saved value. Comparing
  against the previously displayed value admits the intended event while
  suppressing repeated unchanged input. The regression covers number,
  flonum and slider through the native bridge fixture.
- Ctrl/Cmd M now closes Console while a filter has focus and returns keyboard
  focus to the canvas. Filter text remains intact.
- Ctrl/Cmd E locks and unlocks after operating focused number, flonum, slider
  or gain inputs. The final independent review identified this routing defect;
  its regression fails before the correction and passes afterward.
- Escape cancels inline entry after focus moves to the Inspector toolbar.
  Switching panels dismisses transient menus.
- Camera changes wait until resize gestures finish, preserving the pointer's
  relationship to the resize handle and its captured zoom scale.

## Verification

- 126 canvas JavaScript tests pass.
- 67 Chromium browser tests pass, including eight new interaction/geometry
  regressions. These use the production browser preview without simulated
  native execution.
- The real WebKitGTK raster test confirms the gain's flat bar spans the
  channel and moves from bottom through midpoint to top at 0, 64 and 127.
- The native release build and the private Tauri/CPAL desktop harness pass.
  The desktop run covers OS document actions, help windows, typed send/receive,
  two-window audio mixing, local Stop Patch, native print output and partial
  import of the installed slider help's basic patcher. Audio uses a private
  software PipeWire device at 48 kHz / 512 frames.
  Final records: `/tmp/ultra-max-fidelity-desktop-final/result.json` and
  `/tmp/ultra-max-fidelity-documents-verified/documents-result.json`. The
  document harness selects the visible, focused GTK location entry after
  Ctrl+L, avoiding the hidden new-folder field exposed by accessibility.
- Captures live in `.impeccable/review/max-fidelity-20261021/`. Their manifest
  identifies viewport sizes and browser-preview scope.

The independent finish review found one material keyboard-routing issue. Its
verdict pass scores that fix resolved, with disposition `ship` for the scored
fix and no observed regression. This is not a full Max conformance verdict.

The one Impeccable detector run reports 9 warnings (compact text/padding) and
57 advisories (existing neutral colors/type sizes and gain hatching). The
compact desktop typography, chrome and control hatching follow the pinned Max
direction; these generic flags do not establish a task failure. The pass does
not repair unrelated surface-brief metadata drift or claim full Max message,
DSP, file-format or visual equivalence.
