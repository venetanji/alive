# Expandable Detail Panel

Base: `9105b1022225717f0ff828d9774098f70860cf63`.

The old resize cap reserved most of Session's mixer even when the user wanted
to work in the lower editor. Manual resizing now leaves a 96px scrollable upper
workspace. Maximize uses the working area while retaining the transport,
schedule controls, browser and footer. Its button and a separator double-click
restore the previous height. Switching Session/Arrangement restores the upper
workspace. Clip, Devices and Master share the same presentation control.

The default layout still leaves the mixer visible. A requested manual height
survives temporary window shrinkage; Escape and pointer cancellation restore
the preceding size/mode. Existing editor nodes stay mounted, and unfinished
upper fields survive maximization without publishing a musical edit.

The maximized MIDI editor uses a narrow source-control sidebar and fills the
remaining area with the piano and velocity lane. Compact layouts scroll inside
the detail panel without losing the transport or footer.

## Verification

- 132 focused Node tests pass after the final production corrections.
- 15 focused Chromium cases pass across the final panel, piano, default mixer
  geometry and responsive checks. These include Clip/Devices/Master,
  1440x900, 1280x800 and 800x600 maximization, cancellation, pending-input
  preservation and no musical commands during presentation changes.
- The real Tauri/WebKit journey passes at those three sizes. Native geometry
  and restore measurements are in `native-report.json`; its private harness
  is `native_detail_smoke.py`. It uses the standard Quantized MIDI example.
- Independent review found a 7px clipping error when maximizing a collapsed
  panel and wrapped sidebar controls in compact Arrangement. Both original
  failures were reproduced, corrected and independently rechecked. See
  `review.md` and the retained browser regressions.
- Impeccable's static-page scan reports the same 13 findings at the base and
  final UI (existing dense typography, padding and font metadata). No detector
  claim of a clean entire interface is made. Final Chromium and real WebKit
  captures were visually inspected, including the compact Preview toolbar.

Run the focused unit suites with:

```sh
node --test apps/ultra/ui/alive-dom.test.mjs apps/ultra/ui/alive-workspace-edits.test.mjs apps/ultra/ui/alive-piano-view.test.mjs apps/ultra/ui/alive-piano.test.mjs apps/ultra/ui/alive-midi-preview.test.mjs
```

The desktop harness runs through `apps/ultra/tests/check_canvas_desktop.sh`
with `ULTRA_TEST_ALIVE=1`, `ULTRA_TEST_ALIVE_BINARY` pointing at an owned Alive
binary with adjacent Ultra and native library, `ULTRA_TEST_ALIVE_SESSION`
pointing at `apps/alive/examples/quantized-midi.alive`, `ULTRA_TEST_SCRIPT`
pointing at the retained harness, `PYTHONPATH=apps/ultra/tests`, and
`ULTRA_TEST_SCREEN_SIZE=1920x1080`. It creates a private X display, bus and
software PipeWire server. Existing user windows and projects are preserved.

Raw runs/captures are at `/tmp/alive-detail-*`. The panel-only desktop snapshot
uses the worker's 03:27 Alive/native build after the final panel corrections;
it does not independently qualify later host/native live-edit corrections.
Live MIDI feature evidence is retained separately.
