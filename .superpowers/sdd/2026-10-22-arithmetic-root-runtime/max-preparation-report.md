# Finite Arithmetic Max Preparation

Status: frozen implementation for independent review, 2026-10-22. This worker
ran no Max, Wine, browser, display, capture or application launch. The parent
will create a fresh private preparation after review. There is no real
preparation manifest/config/seal from this worker; the preparation tests used
original synthetic source and helper fixtures in temporary private directories.

## Scope And Bindings

All implementation files are under
`experiments/max-reference/arithmetic-roots-runtime-20261022/`. The frozen
score remains unchanged:

- SHA-256: `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb`.
- 78 operations: 66 events, six installs, six closes.
- 72 live checkpoints, six explicitly empty close checkpoints, 504 numeric
  states, 141 expected original outlet emissions, empty final live-owner set.
- `times`, `plus`, `minus` order, two independent pristine revisions each.
- Times Basic scope is `root/obj-4`; plus/minus Basic is `root/obj-2`.

The worker owns only the ten files in the hash table. It did not edit the
score, native scorer/tests, product/CI files, earlier captures or historical
preparations. The parent owns the new runner and comparator integration.

## Interface

`arithmetic.py` exposes the compatible functions `load_score`, `timeline`,
`score_binding`, `source_metadata`, `prepare_private`, `verify_private`,
`preparation_binding`, `extract_checkpoint`, `validate_checkpoint`,
`validate_live_checkpoints`, `validate_numeric_progress`, `public_operation`,
`public_receipt` and `public_checkpoint`. `PREVIOUS` points to the audited
`help-roots-runtime-20261022` directory and `common` imports its generic
`help_runtime.py` module.

`prepare_private(work, resources=common.RESOURCES,
manifest_name='preparation-manifest.json')` requires a new directory under
`~/.cache/alive-ultra-evidence` outside the repository. It creates exclusive
0600 files beneath 0700 directories. It refuses existing work or manifests.
Each retry can use a fresh finite name such as
`preparation-manifest-arithmetic001.json`; existing manifests remain immutable.
The sealed private config records `preparation_manifest` for later verification.

The private config contains `documents` (all six revision definitions),
`helpers`, `source_metadata`, `package_sha256`, `dependency_sha256`,
`score_binding`, `work`, `global_name`, `journal_path`, `observer_path`,
`readback_helper_path`, `command_path`, `ack_path`, `ready_path` and `lifecycle`.
The lifecycle version is `arithmetic-freebang-v1`. Owner inlets 0 through 5
are times r1/r2, plus r1/r2, minus r1/r2. The driver has seven observer
inlets, zero observer outlets and exactly six private lifecycle receivers.

`lifecycle.validate_close(work, config, command, ack)` and
`lifecycle.validate_barrier(work, config, evidence, expected_live)` retain the
numeric package signatures. All six owners must close in order; the barrier
requires `expected_live == {}` and revalidates every retained earlier close
ACK/proof and immutable observer history prefix.

`extract_checkpoint` returns private `numeric_states` (including actual values),
identity, retention and raw hash/byte metadata. The seven getters accept only
finite scalar numbers or singleton numeric arrays. Class-based getter semantic
tags explicitly carry `receipt_tag_observed=false`; actual outlet tags come
only from observer callbacks. Full checkpoints and journals must remain private.
`public_checkpoint` removes values and retains identities, anchor inventory,
counts, retention outcomes and raw hashes. `public_receipt` publishes only
identity, selector, atom count/tags and a full-message hash. It never publishes
numeric payload values.

`write_json` and `retain_raw` are exclusive evidence writers. The parent runner
owns any atomic replacement writer needed for mutable commands or sessions.
`verify_private` strictly hashes and stably reads sealed immutable files;
unsealed runtime files receive exact private type/mode/link checks without
reading a concurrently growing log. Checkpoint and lifecycle extraction still
perform strict stable private reads of their completed evidence files.

`prepare-runtime.py` has default dry-run, `--prepare --work PATH
--manifest-name NAME`, and `--verify --work PATH` modes. It provides no execute
mode. A prepare/verify also validates independent lifecycle construction.

## Source Protection And Deliberate Refusals

The bounded installed metadata check passed for three exact source digests,
four pinned helper file digests, 60 complete-tree boxes, 24 saved cables and
21 original numeric anchors across the sources. Complete graphs, creation
operands, helper arguments, authored prose and geometry remain in private
definitions, never in public metadata or terminal output.

Source inspection checks exact root/Basic/question scopes, saved child names,
20-box/8-cable/10-executable inventory per root, all ten role anchors, the two
creation-text hashes, four source-bound helper anchors and private argument
hashes, helper shape/disconnection and rejection of any extra script.
All saved cable records and their sequence are retained privately. The generic
duplicate-sensitive original/leaf object inventory and input/output endpoint
multiset validator is reused with no geometry relaxation.

The new controller, getter and lifecycle validators accept no inherited
numeric-mode, shell-height, annotation-width, annotation-geometry or V8
`jpatcher` conversion exception. Actual arithmetic differences require new,
independent source/helper-bound observation before admission. Therefore a
strict initial Max capture may refuse such a difference and retain private
diagnostics; synthetic tests establish no runtime capability. No Message
prototype, cold-Message capability or destination-order witness is added.
`saved_order_observed` remains false.

Private JSON transport uses bounded 4096-character progress-checked chunks,
including the observer config reader and V8 readback writer, avoiding the Max
line-size limit for larger private configurations and snapshots. Original
observer leaves have one inlet, zero outlets and capture typed callbacks
without forwarding to any original node.

## Verification

The initial preparation and lifecycle tests failed because the finite
implementations were absent. The added large-JSON test then failed on the Max
line-limit path before chunked transport was implemented. Final focused checks:

- `python -B -m unittest discover -s experiments/max-reference/arithmetic-roots-runtime-20261022 -p test_preparation.py`: 9 passed.
- `python -B -m unittest discover -s experiments/max-reference/arithmetic-roots-runtime-20261022 -p test_lifecycle.py`: 3 passed.
- `node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs`: passed.
- Python AST parsing and `node --check` for all four helper scripts: passed.
- Default `prepare-runtime.py`: `NOT_EXECUTED`, runtime invocations zero,
  exact frozen score and expected finite counts.
- Combined parent integration discovery at that point: 36 tests passed with
  one explicit opt-in test skipped. This does not substitute for focused checks.

Synthetic rejection coverage includes altered score identity/order/anchor/tag,
missing/duplicate states, null/nonfinite/ambiguous getters, fractional integer
state, wrong runtime class, changed geometry, observer forwarding routes,
unsupported Message/mode policies, helper identity/shape/connection changes,
private symlinks/modes, changed sealed pristine bytes and exclusive retry
manifests. Lifecycle fixtures cover all six closes, retained history, both
revisions, final empty barrier, duplicate/wrong/stale notifications, changed
driver/root topology, revived handles and class/geometry exception refusal.

## Frozen Hashes

Package digest (canonical map of the ten files):
`195557752516b9f20d0935341e7d898f1fba09e9bc1a35d701970dc6d6d216c5`.

| File | SHA-256 |
| --- | --- |
| arithmetic.py | `a8d03a21ad472ce7471c04c513a3e302a47b2f880ff833e3e6b10368281e42ec` |
| controller.js | `701b42fb1e338ab280d7e7c1ac83a0bfd657d9b7c1c973e54ed37bd228a06be1` |
| observer.js | `ca8c15e16ffe11acfa5e279d53da0aec8814baa78fac3ced6208b36757f41399` |
| v8-readback.js | `e3c9f3573c1661bdb65fdb1f0bc9235a88f3d911e74c3f22622a1c904ee4c02b` |
| lifecycle.py | `66cc628d5243a934f9f4c49bb8dbed659f40daef069531b822d780e74eb02ada` |
| lifecycle-observer.js | `d582fcffe982b631ddd453238c6f0a1006e54f0f5968d21083e9f3d04b2ac847` |
| prepare-runtime.py | `74b069f7202ff462dbd92374de7cda5de88d4bfeba110795a765e162778039d4` |
| test_preparation.py | `9e0ba59a614cd7818694f2aada72ed9dc6889ff320ebe4164f10a8b7dffad6be` |
| test_helpers.cjs | `d28a5d80b38502c1d620b806bf70bf3573ef6f85717257528671caa7f4f30966` |
| test_lifecycle.py | `d0cd82d646ff63a6069e55705b1fb139de62b9d40b8e1d3361b3595f44175154` |

Imported dependency pins:

| Existing File | SHA-256 |
| --- | --- |
| help-roots-runtime-20261022/help_runtime.py | `91ed9c6ba4cdb5a52c4f84c1f8177283e58ece8a936023a1ab9b8ce61912c144` |
| help-roots-runtime-20261022/run-runtime.py | `c515cdfda7fc658329d696dffc1336611bda0e78abd83466fe9b842bc99e3c51` |

The parent runner/native scorer/comparator are outside this preparation package
map and require their own execution/session binding. No runtime success,
arithmetic parity, saved-order evidence or installed-help qualification is
claimed by this report.
