# Native Live Library Implementation Plan

> For agentic workers: use the live-device-mapping skill and parallel agents on
> disjoint device/source scopes. The coordinator reviews and integrates each batch.

**Goal:** Import all installed DLL metadata and publish a few fully qualified
native Ultra instruments/effects that work and retain their original panels in Alive.

**Architecture:** Reuse the retained document-owned native bank and one profile
family. Keep discovery, qualification, saved-device generation and Alive publication
separate. Retain complete native source state through every ownership boundary.

**Tech stack:** Existing C++ native graph/PE adapter, Rust/Tauri host, vanilla
JavaScript shared panel renderer and Python standard-library import CLI.

**Spec:** `docs/superpowers/specs/2026-11-02-native-library.md`.

## Global Constraints

- Preserve both dirty research worktrees and the approved UI checkpoint.
- Installed proprietary assets and original reference evidence stay outside Git.
- One coordinator owns REA; workers use verified immutable packets only.
- No callback construction, arbitrary admission expansion or raised work limits.
- No playable export without every required qualification stage passing.
- No automatic CI, merges, releases, deployments, physical settings or recording.

## 1. Checkpoint, Audit And Evidence

- [x] Push UI checkpoint and verify remote SHA `ca161c488ee2dcb0c6ba1efa1c43c7b1e36da4af`.
- [x] Create active long-term goal and feature branch in the isolated worktree.
- [x] Audit native host and installation/import paths with independent agents.
- [x] Freeze 86 relevant authored source files and dirty tracked diff privately.
- [x] Acquire current resource identities and compare complete pack indices.
- [x] Create verified current-artifact packets for Analog/Electric; retain old revisions.
- [x] Run packet tests and a small offline worker forward/tamper test.

## 2. Repeatable Import CLI

Owned files: `apps/ultra/import-live-library.py`,
`apps/ultra/tests/test_import_live_library.py`,
`apps/ultra/LIVE_LIBRARY.md`. Coordinator owns the registry and generator helper.

- [x] Add failing synthetic PE/discovery tests for support DLLs, standalone exports,
      duplicate content, corrupted headers, scan bounds and symlink escapes.
- [x] Implement explicit-root read-only inventory without DLL construction.
- [x] Add failing registry/artifact qualification tests; implement bounded registry
      parsing and exact identities with independent stage failures.
- [x] Add failing publication tests for generator errors, changed inputs, no-op reruns,
      user-file preservation and concurrent writers; implement locked atomic publish.
- [x] Exercise the real installed inventory in dry-run mode, retain exact counts/errors.
- [x] Run the helper suite and document the command and accurate per-device outcomes.

## 3. Ordinary Ultra Host Port

Native-host worker owns CMake, `native/external_device`, selected backend/graph
hunks, Rust canvas/source-state modules and command registration. Coordinator
owns UI/profile registration and subsequent Alive integration; coordinate shared
files before changes. Use the private immutable source snapshot for the port.

- [x] Add a regression proving this checkout lacks the ordinary native-source host.
- [x] Port minimal native source ownership and strict Rust sidecars; omit the
      separate Analog audition application and unrelated old UI changes.
- [x] Port deterministic bank, backend and disabled-build tests with private builds.
- [x] Prove rollback, coherent state batches, revision rejection, two independent
      instances, driver fences, stop/rearm and no-adapter refusals.
- [x] Run real Analog/Electric lower-level checks separately from mocked bank tests.
- [x] Independently review host ownership and reject all qualified descriptor
      signature drift before restoring any candidate state; verify the failing
      regression, partial-write fault and stopped reconstruction.
- [x] Commit the reviewed host batch before broadening Alive admission.

## 4. Parallel Device Profiles And Original Panels

Device workers own separate `ui/live-profiles/<device>` modules/tests and matching
native profile facts. Central registries and shared renderer remain coordinator-owned.
Every assignment includes exact packet digest, contract, private paths and result stages.

- [ ] Qualify Electric descriptors, complete defaults, model/native/display conversions
      and original panel branches, retaining missing-evidence questions.
- [ ] Complete Analog's promised missing mappings/drawings and current-resource
      behavior; existing 126/175 mapped controls are a partial baseline.
- [ ] In parallel, inspect Corpus's real input contract with a packet and private harness
      before proposing effect admission; retain constructor failures for other effects.
- [ ] Test endpoint/sign/enum conversions, exact descriptors, audio causality,
      edited state roundtrip and independent instances for each device.
- [ ] Capture original reference panels and actual shared renderer; correct demonstrated
      geometry, artwork and control differences without copying accumulated mock CSS.
- [ ] Record construction/audio/editor/state/lifecycle/Alive status separately.

## 5. Alive Host And Library Integration

Coordinator owns session preparation/host/persistence/history/native admission,
presentation hosts, registry/generator and existing Browser integration.

- [x] Add and review an isolated musical-discontinuity runtime operation with a
      four-key held ledger, unchanged sixteen-record queue, continuous owner/time,
      fault quarantine and conservative generic teardown. Synthetic realtime,
      ASan/UBSan and adjacent default runtime tests pass; actual DSP/session
      callers and timing remain unqualified.
- [ ] Add failing full-sidecar retention and accepted-instance state tests.
- [x] Persist bounded complete per-instance source overrides, retain source-file
      fingerprints, refuse foreign/duplicate/invalid overrides, and verify two
      same-file instances through actual Save/reopen without editing that file.
      This does not expose state commands or admit native playback.
- [ ] Carry sources through preparation/install/rollback; authorize full-state panel
      reads/writes by generation, instance, source node and revision.
- [x] Add an independently reviewed off-thread native document batch API. Prepare
      at most six roots before replacement, retain old banks through exchange,
      and restore them with fresh revisions without foreign reconstruction.
      Rust session callers/configuration/Master rollback remain subsequent work.
- [ ] Add failing note/Stop/Start/seek/loop/clip-transition tests and resolve continuous
      native lifecycle before enabling the native note capability.
- [ ] Measure foreign-DSP render/state/discontinuity work and fit an explicit admitted
      policy within existing resource limits; reject excess work unchanged.
- [ ] Wire existing saved livePanel hosts to profile resources and transactional edits;
      keep drafts, compound writes, Undo and per-instance persistence coherent.
- [ ] Generate normal saved devices without audition keyboards; prove actual Alive
      library activation, native sound, editor closure and save/reopen/restart.
- [ ] Mark a qualification record passed only when every required stage has evidence,
      then exercise the importer into the shared user library without overwriting files.

## 6. Review And Tested Checkpoints

- [ ] Run adjacent, full Node/browser, relevant Rust/native/default-build suites.
- [ ] Inspect both apps at all three supported sizes, repeated toggles and resize.
- [ ] Rebuild in private paths; install and verify matching launcher pair/hash manifest.
- [ ] Run current software-native acceptance/loopback gates; retain failures/skips.
- [ ] Push reviewable checkpoints with exact commits and evidence-linked stage matrix.
- [ ] Propose hardware testing separately after software gates; do not change hardware.

This plan remains active while the owner is away. Update checkboxes and the device
stage ledger after each reviewed batch. Prefer completing the first profiles to
starting more partial instruments. A blocked stage does not grant permission to
invent mappings or present an unsupported device as playable.

## Checkpoint Evidence

UI checkpoint `ca161c4` is remote-verified on `audit/pr12-native-20261102`.
Importer: 35 end-to-end tests and 181 total Python helper tests pass. Actual
installed dry-run/non-dry empty-registry runs both complete: 53486 entries,
986 native artifact paths (91 literal DLL paths), zero errors, zero exports.
Registry stays empty until actual profile qualification. Private detailed logs
are under `~/.cache/alive-ultra-evidence/native-library-20261102/workers`.

Ordinary host port: 79 standalone Rust canvas tests, native bank/shim/graph/
no-adapter/ASan/UBSan, real Analog/Electric probes and real two-source canonical
state/history/save/reopen test pass. Desktop Rust suite: 304 pass, 1 pre-existing
CPAL instrumentation failure (reproduced on untouched ca161c4), 5 ignored.
Independent host review found one descriptor-identity gap, now fixed: all seven
signature mutations reject before writes and retain the installed bank. Root
independently reran bank, shim, real Analog backend, ASan/UBSan and default-build
refusal checks successfully. Driver-retirement failure cases and continuous
musical reset remain subsequent work. Current launchers still select the previously
verified UI source `8bcddd4`; native changes are not installed or presented as
accepted.

Fresh Analog r1 and Electric r4 packets verify current installed identities.
Analog has 126/175 mapped controls and 128/203 supported default writes; 75 native
slots currently depend on authored research fallback values and do not qualify
as original initialization. Electric has 33 exact descriptors and 34 parsed
model fields, with no qualified model-to-DSP mappings. Both remain unfinished.

Current-host Analog tracing additionally contradicts the retained LFO sync-toggle
association and research polyphony initialization. Retained mapping counts are
historical coverage, not current-host qualification. The ordinary native panel
has not been connected to these bindings and the publication registry remains
empty. Original initial Analog and Electric panels are now captured privately
from the installed Live application in a stopped root-created Untitled session;
Analog r2 and Electric r6 packets pin those references.

Ordinary frontend ownership and validation now have an independent review with
both identified missing-state/Inspector defects corrected. The latest top-level
Node run has 699 passes and one private-artifact test skipped; the strict combined
resource loader has a separate passing installed-pack browser regression after
its missing-module failure. It requires matching verified GUI/Graphics packs and
checks a supplied saved source identity before loading the panel. Current and
retained source identities are accepted only as exact pairs in JavaScript/Rust.
The standalone canvas Rust suite has 80 passes. These are state/resource checks,
not original initialization or playable profile qualification.

Preparation now retains complete native sidecars after scalar overrides; its
new regression and all 24 adjacent session tests pass with native admission
still closed. Persisted per-instance state and transactional native ownership
remain outstanding. Host/lifecycle checkpoint `d47e601` is remote-verified.

The per-instance persistence slice has an independent review with no findings;
two full-app regressions pass, including actual Save/reopen and unchanged shared
source data. All 126 adjacent session tests pass; the reviewer independently
ran 82 pure canvas/instance-state tests. The source/resource review found and
verified a corrected JavaScript/native node-ID bound mismatch (100000 maximum).
No native source edit command or playable profile has been enabled.

The native batch slice passes native-on/off built-in exchange tests, explicit
no-adapter refusal and real two-bank Analog command-cell retention. Adjacent
bank/descriptor-variant, lifecycle and ordinary Analog backend tests pass.
Independent actual-backend synthetic fault injection verifies that late binding
failure restores the exact old owners, borrowed inputs can die after preparation,
and exchange/restore make no foreign calls or destruction. The caller must hold
one serialized lock across the transaction; the ownership mask is a current-owner
assertion, not an independent generation registry. No Rust caller or native
playback admission is included. A fresh combined JavaScript run has 739 passes
without skips, including actual installed pack identity tests.
