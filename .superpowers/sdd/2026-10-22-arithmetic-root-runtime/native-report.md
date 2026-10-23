# Finite Arithmetic Native Score

Outcome: `NATIVE_SCORED_NOT_MAX_COMPARED`. The frozen 78-operation score passes
against the three unchanged production-prepared bundles through a freshly
compiled UBSan native runner. All 12 source-bundle file hashes match before
and after scoring. No Max process was launched. Installed-help qualification
passes added: 0. `saved_order_observed` remains false.

## Frozen Artifacts

All stage paths are relative to
`experiments/max-reference/arithmetic-roots-runtime-20261022/`.

| Artifact | SHA-256 |
| --- | --- |
| `score.json` (unchanged) | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |
| `native_score.py` | `611e09c0e20f86a6764fe9c89a3a0b6b7946cd333331374e98ca0e86bf52e31c` |
| `test_native_score.py` | `d52e47bafb2e97ca7aa90208a71cbb38fda64490e52c176b9e5aad11a8914d7e` |
| `native-result.json` | `ce1976dfaecf4494ff876395a3c5df4add4f393f28235343cfc434120200a836` |
| `native-refusals.json` | `49b4904521ca6db43cb486321b5fe7a85a8770a03202d217957c3a5be2eab430` |
| Native binary `/tmp/arithmetic-native-build-EWvWr6/runner` | `31b5647c5c70c9f2da7a55b033f90dfe5aae8b13abcde5c7ae39a4ad9a124945` |
| `apps/ultra/tests/help_root_runtime_test.cpp` (unchanged) | `a1b4b31c2221bb6d1d67de002fa78ce274c0a047a42a58e404bd16b8e949d5fc` |
| `experiments/max-reference/help-roots-native-20261022/replay.py` (unchanged) | `b24b678f946322c8b0c5e965bffd02a69f3cbea13df8dbdff469776b63448fb9` |

The public native result has schema `arithmetic-native-finite-result-v1` and
contains finite gate outcomes, counts and hashes only. Its 78 checkpoint
entries bind the complete raw row and seven numeric states by hashes. All
source-dependent initial state and receipts remain private. The result pins
the source identities, scorer, binary, existing replay module, private files,
and every authoring/flat/import/native file before and after execution.

## Exact Verification Commands

Working directory: `/home/venetanji/Work/alive`.

Fresh build and self-test; `mktemp` produced the binary directory pinned above:

```sh
build_dir=$(mktemp -d /tmp/arithmetic-native-build-XXXXXX)
c++ -std=c++17 -O1 -g -Wall -Wextra -Werror -pthread -fsanitize=undefined -fno-sanitize-recover=all apps/ultra/tests/help_root_runtime_test.cpp -o "$build_dir/runner"
"$build_dir/runner" --self-test
```

The build exits 0 and the native trace self-test passes. The original TDD
suite was written before `native_score.py` and initially failed for the
missing scorer. Its final nine original tests pass:

```sh
PYTHONDONTWRITEBYTECODE=1 ARITHMETIC_NATIVE_TEST_BINARY=/tmp/arithmetic-native-build-EWvWr6/runner python3 experiments/max-reference/arithmetic-roots-runtime-20261022/test_native_score.py NativeScoreContracts
```

The complete actual score exits 0 with every finite gate passing:

```sh
python3 experiments/max-reference/arithmetic-roots-runtime-20261022/native_score.py --bundle-root /home/venetanji/.cache/alive-ultra-evidence/arithmetic-help-admission-001 --score experiments/max-reference/arithmetic-roots-runtime-20261022/score.json --binary /tmp/arithmetic-native-build-EWvWr6/runner --private-output /home/venetanji/.cache/alive-ultra-evidence/arithmetic-native-score-001 --public-output experiments/max-reference/arithmetic-roots-runtime-20261022/native-result.json
```

Actual-capture refusal verification exits 0. This command produced the final
refusal metadata; the generated `native-refusals-final.json` was subsequently
renamed to `native-refusals.json`:

```sh
PYTHONDONTWRITEBYTECODE=1 ARITHMETIC_NATIVE_PRIVATE_ROOT=/home/venetanji/.cache/alive-ultra-evidence/arithmetic-native-score-001 ARITHMETIC_NATIVE_BUNDLE_ROOT=/home/venetanji/.cache/alive-ultra-evidence/arithmetic-help-admission-001 ARITHMETIC_NATIVE_REFUSAL_RESULT=experiments/max-reference/arithmetic-roots-runtime-20261022/native-refusals-final.json python3 experiments/max-reference/arithmetic-roots-runtime-20261022/test_native_score.py ActualCaptureRefusals
```

The result and private directories are exclusive outputs. A repeat scorer
execution requires fresh output paths. Refusal verification can be repeated
without the optional `ARITHMETIC_NATIVE_REFUSAL_RESULT` variable to avoid
creating another public metadata file.

## Verified Accounting

| Item | Count |
| --- | ---: |
| Operations / post-operation checkpoints | 78 |
| Typed direct events | 66 |
| Installs / real native closes | 6 / 6 |
| Live / explicitly empty checkpoints | 72 / 6 |
| Numeric UI states | 504 |
| Original executable nodes observed per owner | 10 |
| Numeric UI reads per live checkpoint | 7 |
| Original outlet emissions | 141 |
| Saved-cable deliveries | 90 |
| Complete input/output trace receipts | 297 |
| Numeric outlet 1 emissions | 0 |

Each receipt is checked against the independently modeled typed action table,
including the declared input, control/button output, saved-cable input,
operator output and display input/output. This also checks cold and
display-only silence. Every live checkpoint checks all seven numeric values,
including unchanged controls. Every install checks pristine executable
bookkeeping, and revision 2 resets all seven UI states and both stores through
independent bang recomputation. Native snapshots do not expose retained
operand pairs directly; the private semantic pairs are supported by typed
receipts and later recomputation.

The actual-capture test refuses 1,128 deliberate corruptions:

| Corruption | Refusals |
| --- | ---: |
| Every individual numeric state changed without changing counts | 504 |
| Every original output changed without changing counts | 141 |
| Every scalar output tag changed without changing counts | 126 |
| Every saved-cable input port changed without changing counts | 90 |
| Each operation missing / duplicated | 78 / 78 |
| Duplicate live-owner checkpoint | 72 |
| Cold/display-only unexpected output | 21 |
| Nonempty close checkpoint | 6 |
| Both pristine store recalls, all three owners | 6 |
| Operation order changed | 5 |
| Numeric outlet 1 output | 1 |

The original suite also checks wrong source bindings, anchors, arithmetic
modes, cable roles and operation shapes; all seven UI reset values; and
exclusive external private paths and permissions. Importer diagnostics remain
intact: `complete=false` is accepted separately from zero omissions and full
source-map coverage.

## Private Binding

Private evidence directory:
`/home/venetanji/.cache/alive-ultra-evidence/arithmetic-native-score-001`.
The directory is 0700; all five exclusive files are 0600. Full source-owned
initial values and receipts, graph transport, raw snapshots and independently
derived expectations are retained there only.

| Private File | SHA-256 |
| --- | --- |
| `transport.txt` | `ff987eb438851c23c6db5f0879777bb0f0a1c1f96cd80a2af6970eb63c8c5840` |
| `native.jsonl` | `58527bab96eae34b69076cd40349e92e21a5257d46bdec9f00fc4bc54c85f6b0` |
| `expectations.json` | `dd8e5016df28672a8d64957073e97fa4890fbd8479c5c4e179a08db1f9e04365` |
| `stderr.txt` (empty) | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `binding.json` | `fa204d268f28711dfa06afca0b0b9556ec43c12574b041d5ccb4f911afb62e7d` |

The existing `build_transport` and `validate_lifecycle_results` APIs are reused.
The existing `public_results` projection is not called because it exposes
numeric values. The new APIs `validate_score(score, bundles)` and
`verify_results(rows, bundles, score, contexts)` provide finite validation;
`expectations(bundles, score)` returns private data only.

Independent frozen-source review reports no blocker, confirms all 12 bundle
pins against admission, and confirms source/result/private bindings. That
review performed static inspection and hash validation; the test executions
reported here were performed by this implementation task.

No Max comparison, saved-order observation, signed-zero capability, physical
gesture behavior, ordinary Help/F1 behavior, visual/geometry fidelity, shared
views, metadata fidelity or installed-help qualification is established by
this native score.
