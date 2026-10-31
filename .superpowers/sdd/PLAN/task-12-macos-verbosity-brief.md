# Intel DMG Diagnostic Visibility

Read the final CLI-only addendum of `task-12-macos-diagnosis.md`. The failed
exact-fdcdd1b Intel package job establishes failure inside bundle_dmg.sh, but
the pinned bundler hides child stdout/stderr at normal verbosity. Its cause
is unknown. There is no justified functional package/toolchain change yet.

In a separate diagnostic-only commit, insert `'-v'` immediately before `'build'`
in `apps/ultra/scripts/release.py`'s existing Tauri build invocation. Pinned
CLI 2.8.4 parser/source/help checks establish this selects Debug logging for
the command and child stdout/stderr. Keep release build flags, bundle targets,
signing behavior, generated config, packaging verification and publishing gates
unchanged. No environment field/setting changes or blind CI rerun.

Run the existing `apps/ultra/scripts/test_release.py` suite and syntax validation;
no new test merely asserting the literal argument, full app rebuild, or local
macOS success claim is needed for a verbosity-only change. Report this separate
commit and command/output path in the Task12 report. Parent independently
reviews it before the next authorized feature push. The next actual Intel CI
job is diagnostic/qualification evidence; retain its result and any newly
visible original command failure before proposing a functional fix.
