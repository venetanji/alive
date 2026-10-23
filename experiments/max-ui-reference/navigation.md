# Canvas navigation comparison, 2026-10-21

Compared the integrated Ultra PR at `62de480` with the installed Max 9.1.5
key-command map and official user guide. This is a shortcut/documentation
comparison; it does not establish full navigation equivalence.

| Action | Max evidence | Ultra behavior |
| --- | --- | --- |
| Zoom in around the cursor | Installed `resources/init/max-keycommands.txt`: Z invokes `patcher zoomkey 1`, described as zooming around the cursor | Z now uses the last physical pointer position as the zoom anchor |
| Zoom out around the cursor | Same map: Shift Z invokes `patcher zoomkey -1`, also described as zooming around the cursor | Shift Z zooms out at the pointer |
| Menu zoom shortcuts | Official Patcher Window guide: Ctrl/Cmd = and Ctrl/Cmd - | Existing shortcuts retained |
| Precise zoom | Official Patching guide: zoom control and two-finger pinch | Existing zoom selector and Ctrl-wheel/pinch wheel events retained |
| Scroll the patcher | Official Patching guide describes scrollbars and bounded patching margins | Existing browser scroll surface accepts wheel, Shift-wheel and two-axis trackpad scrolling |
| Hand-drag / reset | Not established by the consulted documentation or this runtime attempt | Existing Space/middle drag and Ctrl/Cmd 0 remain Ultra conveniences |

Sources consulted:

- Installed Max 9.1.5 `resources/init/max-keycommands.txt` (read only).
- Installed `resources/docs/userguide/content/patching.json` and
  `patcher_window.json` (read only).
- <https://docs.cycling74.com/userguide/patching/#zooming>
- <https://docs.cycling74.com/userguide/patching/#patching-margin>
- <https://docs.cycling74.com/userguide/patcher_window/#top-toolbar>

The native comparison attempt used our own two-object patch, a disposable Wine
prefix and private Xvfb `:97`. Max remained at "Max is Starting Up" with a blank
display, including with software rendering. No pan/zoom input was measured in
Max; the original prefix, projects and preferences were not intentionally
changed. REA process capture `ev_6eed1f72fd137b5e76434bfe760bcd26246158de5da6b8d1257c1d0b54c9d23a`
records the blank screenshot capture only, not a successful gesture test.

Ultra's rendered Chromium tests exercise cursor anchoring in edit/locked mode,
keyboard zoom after the camera has already changed, preservation of inline
typing and undo/redo, wheel/Shift-wheel/two-axis scrolling, and unchanged
exported graph state. The DOM test also verifies that camera changes issue no
native graph or audio commands. These tests do not measure Max's exact zoom
step/sensitivity, physical trackpad gestures or native WebKit behavior.

Validation for this change:

- 101 JavaScript tests passed, including the native-IPC exclusion assertion.
- 13 rendered Chromium tests passed, including three navigation regressions.
- The complete `apps/ultra/tests/ci/check-contracts.sh` passed with the pinned
  Python requirements supplied through `uv run --no-project --with-requirements`.
- Independent code review reported no findings.
- The native release build passed after restoring the missing ignored build
  cache behind existing links to a deleted temporary directory. Dependency
  archives were checked against the repository's pinned SHA-256 values; this
  local rebuild used the installed Rust 1.99.0 toolchain. The executable is
  `apps/ultra/src-tauri/target/release/ultra`.
