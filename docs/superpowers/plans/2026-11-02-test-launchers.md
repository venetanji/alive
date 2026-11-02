# Test Launchers Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task in the current session.

**Goal:** Alive and Ultra desktop launchers always select the matching local build pair being tested.

**Architecture:** Extend the existing user installer to copy both executables, their shared native library and configured resources into a versioned snapshot. Both desktop entries use one atomically replaced `alive/current-test` symlink; the existing standalone `run.sh` behavior remains available. A successful full local build selects its result automatically.

**Tech Stack:** Python standard library, Bash, freedesktop desktop entries, existing Tauri resource layout.

**Spec:** User instruction: "launcher should always point to the build we're testing ... this goes for ultra as well"; existing launcher documentation in `apps/alive/README.md` and `apps/ultra/ui/README.md`.

## Global Constraints

- Preserve unrelated work, old builds, desktop-entry backups and Ultra file associations.
- Do not change UI, engine, system packages, physical devices or audio settings.
- Do not install launchers from CI or native-only builds.
- Preserve binary identity: copy without stripping and record SHA-256 hashes. Checkout context is not proof of artifact provenance.
- Full builds are selectable builds, not acceptance passes. Existing windows must retain their original binaries and library.

### Task 1: Paired Installer And Regressions

**Files:** `apps/ultra/install-launcher.py`, `apps/ultra/tests/check_patch_file_launch.py`.

**Interface:** `python3 apps/ultra/install-launcher.py [--build-dir DIR] [--built-from COMMIT]` selects both apps; default directory is `apps/ultra/src-tauri/target/release`.

- [x] Add failing regressions for both desktop targets, literal file arguments, preserved MIME types, copied resources, switching complete pairs, and incomplete-build rejection retaining the old selection.
- [x] Run `python3 apps/ultra/tests/check_patch_file_launch.py` and confirm the new requirements fail.
- [x] Implement validation before selection, versioned copies, artifact manifest, desktop backups and atomic shared symlink replacement. Use `Exec=/usr/bin/env -u LD_LIBRARY_PATH ".../current-test/bin/<app>"` with `%f` for Alive and `%F` for Ultra.
- [x] Repeat the launcher regression command and run `python3 apps/ultra/tests/check_isolated_launcher.py`.

### Task 2: Build Workflow And Installation

**Files:** `apps/ultra/build.sh`, `apps/ultra/tests/check_build_install.py`, both app READMEs.

**Interface:** Full local builds invoke the paired installer after both Cargo builds and atomic native-library installation; `CI` builds skip it.

- [x] Extend the inert build regression to observe installer invocation, skipped CI/native-only builds and failed-build retention; run it red.
- [x] Add the build hook and document how to select an explicit test build and inspect its manifest.
- [x] Run both launcher checks, build-install regression and relevant helper discovery; validate actual desktop files with `desktop-file-validate`.
- [x] Install the already tested matching debug pair from `/home/venetanji/.cache/alive-pr12-native-20261102/target/debug`, recording `c8f4cb3091b9754fa5c94e8a40718e72954aab14` as the supplied build provenance.
- [x] Launch both actual desktop entries on private display/audio services; verify process executable and loaded-library hashes, healthy windows and screenshots. Stop only those probe processes.
- [x] Record results and commit the bounded launcher change. Carry forward the existing native desktop acceptance failure and skipped downstream gates accurately.
