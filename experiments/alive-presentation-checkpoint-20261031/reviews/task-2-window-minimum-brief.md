# Installed Ultra Compact Window Minimum

Installed acceptance of the reviewed source1b6cb68 found that Alive renders and
scrolls at800x600, but standalone Ultra's existing Tauri minimum900x620 prevents
the same native window-size check. Shared Ultra controls already have passing
800x600 Chromium evidence. The user requested fixes followed by installation
and push, retaining the earlier compact-window requirement.

Change ONLY apps/ultra/src-tauri/tauri.conf.json: native minWidth900 to800 and
minHeight620 to600. Preserve the default1280x840 window, all other configuration,
UI and source. Read current Tauri documentation through Context7 before the
platform setting change. Commit this separately; do not include the install
worker's untracked helper/evidence. The controller reviews this small source
commit before a new immutable archive/build/install.

No unit tests for reversible scalar configuration. The meaningful check is the
actual final installed Ultra window at800x600 and1280x800 with the same saved
surface and no whole-window/control overflow, plus required Alive acceptance on
the exact final binaries. Keep the strict800 assertion rather than bypassing
native size hints. Preserve1b6cb68's install/archive and failed attempt evidence.

The sole installation worker may implement this exact exception to its original
no-product-edit brief. No helpers or unrelated source changes. Record source
commit, documentation used and pre/post verification in task-2-install-report.md.
Tasks3/4/native hosting stay pending; no launcher/push until final acceptance.
