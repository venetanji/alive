# Max fidelity review and fixes

User request: review and fix with Impeccable, matching Max appearance and
behavior as closely as possible. Existing Max-inspired world retained.

## Resolved findings

1. Live numeric values could not return to the authored value because the
   control suppressed the hot event. Number, flonum and slider now compare
   against the displayed value and suppress only repeated unchanged input.
2. I/F/S did not create controls directly. They now create number, flonum and
   vertical slider at the pointer, with one undo step per creation.
3. Sliders and gain used browser-native round thumbs. Their original flat
   bars now span the short dimension, support inspector colors and preserve
   accessible keyboard inputs. Gain uses the observed hatched channel.
4. Locked UI faces retained port markings. The markings now hide while cord
   endpoint geometry stays intact.
5. Text editing used a wide combined panel. The editor now sits at the object
   with matching zoom; a separate compact completion/argument overlay remains
   within the viewport.
6. Console shortcut stopped working inside its filters. Ctrl/Cmd M now toggles
   there and restores canvas focus on close without clearing the filter.
7. Escape could not dismiss entry after Inspector took focus. It now cancels
   that edit. Panel changes dismiss transient menus.
8. Zoom changed during resize while the gesture retained its old scale.
   Camera changes now wait until the resize completes.
9. The independent finish reviewer found Ctrl/Cmd E was intercepted by
   focused numeric inputs. Its handler now precedes the input guard, and the
   new regression verifies all four numeric/range control types.

## Evidence

- 126 canvas JavaScript tests and 67 Chromium browser tests pass.
- WebKitGTK raster verification passes for a broad flat gain bar at minimum,
  midpoint and maximum. The release build succeeds.
- Private native desktop tests exercise Tauri/WebKit, actual CPAL software
  output, control gestures, print, document files, help, cross-window messages
  and shared audio. The final canvas/audio record is
  `/tmp/ultra-max-fidelity-desktop-final/result.json`; the final passing
  document-window record is
  `/tmp/ultra-max-fidelity-documents-verified/documents-result.json`.
  The document harness now waits for GTK's visible, focused location entry
  rather than selecting its hidden new-folder field before Ctrl+L settles.
- `captures.json` records the six real browser-preview captures, viewport
  sizes, source and image fingerprints, zero page errors, and successful
  unlock after operating each numeric control.
- `detector.json` archives the one mechanical scan: 9 warnings for compact
  text/padding and 57 advisories for existing colors/type sizes and gain
  hatching. These are assessed against the pinned compact Max direction;
  they are not a clean-detector claim.

## Independent verdict

Initial finish disposition: `fix`, for focused-control lock/unlock routing.
Final verdict: `ship` for that scored fix. The reviewer scores it resolved
and observes no regression in the valid recaptures. No further material fix
was requested. The verdict does not establish full Max compatibility.

## Run notes

Two independent initial reviewers assessed visual fidelity and interactions.
A fresh finish reviewer inspected the final sources, reference crops, six
captures and mechanical findings. The documenter reconciled DESIGN.md and
its sidecar with the built artifact. No live detector overlay was presented;
browser inspection used sandboxed Chromium and the production preview. The
temporary preview server and capture browsers were stopped. No production
rasters, proprietary Max assets or new dependencies were added.
