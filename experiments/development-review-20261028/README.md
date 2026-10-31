# Development Review Evidence

Source/build: `1ebf2161e0fa2a62484566fac65c7e940567f357`. Incoming upstream
commit changes documentation only; reviewed app source is the same as `ea8e401`.
Findings and cloud/local handoff: `docs/DEVELOPMENT_REVIEW_20261028.md`.

These portable exploratory reproducers use production modules and existing DOM
fixtures with narrowly delayed/mocked IPC. They intentionally demonstrate the
current defects. They are review evidence, not passing product regression gates.

```sh
node experiments/development-review-20261028/repro-ui-queues.mjs
node experiments/development-review-20261028/ultra-focused-save-repro.mjs
node experiments/development-review-20261028/ultra-repackage-repro.mjs
```

All three run successfully from this checkout. The first exposes five scenarios:
wrong shared-source length, stale loop-brace style, wrong shared-source rename,
wrong shared-source note creation and a base edit crossing Open. The second
shows pending numeric text omitted by Save/close preflight. The third shows
instrument preset loss during repackaging. Outputs are retained alongside each
script. No native disk/write/audio claim follows from these focused probes.

`local-build.log` records successful `bash apps/alive/build.sh` for both separate
executables and native library; `build-pins.json` records hashes and sizes.
Seven Rust dead-code warnings per app build remain in the log. No product source
or test harness was changed by this review.

`ci-1ebf216.json` records current remote CI failure after native/Rust/offline
success. The full failure log and downloaded artifact are retained locally at
`/tmp/alive-ci-1ebf216-failed.log` and `/tmp/alive-ci-1ebf216-desktop/`. The
hosted-editor closure assertion fails; cause remains unresolved. Four-platform
packages pass in run `40421472639`.

Fresh actual-native local test: FAIL, exit 1, at the same Apply/editor closure
assertion. Selected raw log/diagnostics/screenshot are in `native-desktop/`;
the full local directory is `/tmp/alive-review-20261028/native-desktop-final/`.
Failure state is stopped, errors/rejections/voices zero. No input receipt proves
Apply delivery; product lifetime versus driver visibility/completion remains
unresolved. `parent-pcm-verification.json` independently verifies 4085248 finite
stereo frames, SHA-256 and peak from raw local PCM. Software PipeWire/CPAL,
48 kHz/512 frames; no physical or endurance claim. Recorder's SIGINT status 1
and empty stderr remain recorded. An earlier attempt was interrupted and is
not counted as a completed test. Private Live/Max artifacts and earlier REA
evidence remain outside the repository. No fresh Live/Max run is claimed.
