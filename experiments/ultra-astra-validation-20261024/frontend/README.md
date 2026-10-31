# Frontend Validation Evidence

Validation-only bundle for frontend sources at `6d524cb474e54e6cea21897295921ed9cee5bb72`. Native evidence uses release build `de663840346a12d0fe5b49eb669af1cc1788f25f`, whose frontend sources are unchanged; that follow-up changes packaging only. No production fixes are included.

## Reproduce the Strict Probes

After placing this directory at `experiments/ultra-astra-validation-20261024/frontend`, run from the repository root with Node:

```sh
node --test experiments/ultra-astra-validation-20261024/frontend/probes.test.mjs
```

To run the bundle from another directory while targeting a checkout:

```sh
ALIVE_VALIDATION_REPO_ROOT=/absolute/path/to/alive node --test /path/to/bundle/frontend/probes.test.mjs
```

The reviewed sources produce **4 passes, 2 failures, exit status 1**. These are strict regression assertions, intentionally left failing to expose the unresolved numeric-draft and drag-error bugs. They are not a passing CI suite. Do not invert the assertions to make the validation green. `probe-results.txt` records a fresh run against de663840, with machine-specific paths normalized.

Existing focused and adjacent suites are independent checks:

```sh
node --test apps/ultra/ui/canvas-shared.test.mjs apps/ultra/ui/canvas-dom.test.mjs
node --test apps/ultra/ui/canvas-model.test.mjs apps/ultra/ui/canvas-documents.test.mjs apps/ultra/ui/canvas-numeric-ui.test.mjs apps/ultra/ui/canvas-message-ui.test.mjs apps/ultra/ui/canvas-cable-path.test.mjs apps/ultra/ui/canvas-cable-geometry.test.mjs
```

Recorded results: 84/84 focused and 68/68 adjacent tests pass. Replaying the 84 focused tests against parent `bfe42ff060931eb23384093d9c133ab873f02546` sources produces precisely the three intended regression failures: event before later deletion, pending history authoring refusal, and stopped poll cable reuse. Copied parent sources and full logs are intentionally excluded from this bundle.

## Evidence Classes

- `probes.test.mjs`: real page/controller modules, small DOM adapter, synthetic nativeService and delayed IPC. Tests cover rejection recovery, atomic authoring barriers, event order with Stop/Panic invalidation, and cache reuse across document/hierarchy changes. This does not establish real layout, sound, or native saved state. Harness pieces are adapted from the repository's own canvas DOM/shared tests; no app implementation or fixtures are copied here.
- `native-history-2/`: actual release Rust/Tauri/WebKit, sandbox enabled, physical XTest input, intentionally delayed history IPC via test-only WebKit instrumentation. Audio off. Canonical descriptor and visible input snapshots establish numeric loss and misleading clean state; native error snapshots establish the unhandled drag exception.
- `native-cache-gain-2/`: actual native keyboard port wiring, Gain edits, Stop, native Save to a disposable scratch file, and focused-header Enter opening a real child. No artificial commit backlog was used.
- `cache-invalidation-snapshots.json`: compact native evidence for passing movement/zoom/resize checks from run1. That run later stopped because its port drag did not complete a cable; keyboard wiring succeeded in run2.
- PNGs are selected original native screenshots. JSON is selected original result/snapshot data with only machine-specific document paths replaced by `<original-starter-fixture>` or `<scratch-document>`. Counters, canonical patches, errors, input values, and dirty/history flags are preserved.

Native manual reproduction steps and precise limits are in `native-history.md` and `native-cache-gain.md`. Native launcher, preload binary, copied sources, raw metrics logs, proprietary inputs, and local-session driver dependencies are omitted. The evidence supports frontend findings, not hardware latency, audible behavior, cross-document sounding isolation, or complete release approval.
