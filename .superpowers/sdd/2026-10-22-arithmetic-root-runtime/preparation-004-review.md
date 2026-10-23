# Preparation004 Independent Review

Disposition: changes required before preparing or launching revision004. Two
concrete findings violate the review brief. No implementation code was changed,
no real preparation or application was launched, and no native score was rerun.

## Findings

### P1: Pre-close proves the Basic inventory count without validating its retained contents

Primary reference:
`experiments/max-reference/arithmetic-roots-runtime-20261022/v8-readback.js:426`.
Supporting references: `v8-readback.js:285`, `v8-readback.js:301`,
`v8-readback.js:338`, `v8-readback.js:479`, and `lifecycle.py:449` in the same
stage directory.

The pre-close path collects a complete bounded Basic enumeration, but checks
identity, actual class and geometry only for the three gated numeric objects.
The remaining close-proof validation covers root originals, root harness and
the root lifecycle edge. It never checks the other Basic originals, leaf
identities/classes, or Basic input/output endpoint multisets. The retained proof
has only a Basic count claim plus the three gated rows, so the independent
lifecycle validator cannot reconstruct or reject changed nongated contents.

With the original complete 8-root/35-Basic synthetic fixture, each of these
individual mutations still returned a successful pre-close proof with exactly
three numeric and two root witnesses:

| Original synthetic mutation | Expected | Actual |
| --- | --- | --- |
| Change `liveNumeric[3].maxclass` to `toggle` | Refuse pre-close | Accepted; an ordinary readback refuses `strict-v8-original-class-refused` |
| Give `liveNumeric[3]` the varname of `liveNumeric[4]` | Refuse pre-close | Accepted; an ordinary readback refuses `box-identity-not-unique` |
| Change nongated Basic geometry | Refuse pre-close | Accepted |
| Change an existing Basic patchcord destination inlet from 0 to 1 | Refuse pre-close | Accepted |

The endpoint mutation uses the already-observed Max patchcord API,
`liveNumeric[3].patchcords.outputs[0].dstinlet`. It does not assume or invoke an
unobserved `numinlets`, `numoutlets`, or other live port getter. Geometry and
endpoint changes also produce raw readbacks, whose existing Python retention
validator is responsible for rejecting them; the pre-close path has no
corresponding retained payload or check.

The brief requires every pre-close proof to freshly validate complete
inventories, unique geometry/name bindings and actual classes, while preserving
duplicate-sensitive original/leaf/input/output validation. A mutation after
the last readback can therefore escape the currently successful close proof.

Required correction: collect fresh Basic retention evidence on pre-close and
validate the full original/leaf inventory and both endpoint multisets. Retain
that evidence in the private close-proof schema so independent stdlib
`lifecycle.py` can validate it on the current close and every history replay.
The existing readback shape (`boxes`, `input_routes`, `output_routes`) provides
the necessary observed APIs; a dedicated nested close-proof field can carry
the same factual payload without changing public function signatures. Keep
actual raw classes, unchanged source descriptors, source-owned port bounds,
and the exact 3+2 representation witnesses. Source text/empty constraints stay
source-bound; this finding does not authorize a new live getter capability.

### P2: Later pre-close refusals discard all seven representation diagnostic rows

Primary reference:
`experiments/max-reference/arithmetic-roots-runtime-20261022/v8-readback.js:431`.
Supporting references: `v8-readback.js:445`, `v8-readback.js:478`, and
`v8-readback.js:547` in the same stage directory.

The catch attaching `v8_representation_diagnostics` covers only strict
representation refusal and witness assembly. Root identity/harness/endpoint
validation runs afterward. Any later error escapes without the already
collected diagnostic, and `lifecycleproof` serializes the diagnostic field as
null.

Original synthetic probes first passed all fresh representation checks, then
individually changed the reader harness class or the root lifecycle cord's
destination inlet. Both direct calls refused with the expected root error but
had no attached representation diagnostic. The public in-memory
`lifecycleproof` wrapper confirmed the serialized result:

| Trigger | Expected | Actual |
| --- | --- | --- |
| Reader harness actual class mismatch | Refused proof retaining 3 numeric + 4 root diagnostic rows | Refused at `harness`; `v8_representation_diagnostics` is null |
| Root lifecycle destination-inlet mismatch | Refused proof retaining 3 numeric + 4 root diagnostic rows | Refused at `routes`; `v8_representation_diagnostics` is null |

This violates the seven-row failure contract and contradicts the implementer
report's statement that all seven rows remain in pre-close failures. Keep the
fresh representation diagnostic attached across all subsequent close-proof
validation, as the full `collectReadback` body already does. Regression coverage
must reach refusals after successful witness assembly, including the serialized
wrapper result.

## Specification And Quality Assessment

The exact times-only numeric/root policy separation, immutable003 pinning,
unchanged source runtime-class descriptors, retained actual classes, finite
scalar/format6 gating, install-only default equality, and exact 3+2 witness
multiplicity are present. The independent lifecycle implementation validates
all five representation witnesses and re-enters that validation during close
history replay. No transfer to plus/minus or scalar receipt-tag claim was
found. The finite score and denominator remain unchanged.

Specification compliance fails on P1 and P2. Task quality also needs the
corresponding adversarial regressions: current tests demonstrate fresh gated
probes and representation-failure diagnostics but do not exercise nongated
Basic mutation at pre-close or diagnostic retention after later root errors.
The implementation reports' GREEN outcomes do not cover these reproduced
paths. No additional independent lifecycle-policy defect was found within the
reviewed scope; its current proof schema lacks the Basic evidence needed to
address P1.

## Reproduction

Run from `/home/venetanji/Work/alive`. This command reads the original synthetic
fixture in `test_helpers.cjs`, stops before its legacy diagnostic restoration,
and appends focused review probes in the same lexical context. It uses only
in-memory Max APIs, does not read licensed bodies, and prints only outcomes,
errors and witness/diagnostic counts. The prefix has already exercised the
fixture's successful repeated readbacks and both close revisions.

```sh
node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const stage = path.resolve('experiments/max-reference/arithmetic-roots-runtime-20261022');
const file = path.join(stage, 'test_helpers.cjs');
const source = fs.readFileSync(file, 'utf8');
const prefix = source.split("// Restore the legacy diagnostic fixture's source-class pins.")[0];
const memoryFileSource = source.slice(source.indexOf('function memoryFile(memory)'),
  source.indexOf('const diagnosticMemory'));
const probes = String.raw`
function probe(label, mutate, restore) {
  mutate();
  let proof, closeError, readbackError;
  try {proof = reader.collectLifecycleProof(liveRoot, liveDefinition, closeRequest, liveConfig);} catch (e) {closeError = e;}
  try {reader.collectReadback(liveRoot, liveDefinition, eventRequest, liveConfig);} catch (e) {readbackError = e;}
  restore();
  console.log(JSON.stringify({label, closeAccepted: !!proof, readbackAccepted: !readbackError,
    closeError: closeError ? closeError.message : null,
    readbackError: readbackError ? readbackError.message : null,
    closeNumericWitnesses: proof ? proof.v8_representation_witnesses.numeric.length : null,
    closeRootWitnesses: proof ? proof.v8_representation_witnesses.roots.length : null,
    diagnosticNumericRows: closeError && closeError.v8_representation_diagnostics ? closeError.v8_representation_diagnostics.numeric_rows.length : null,
    diagnosticRootRows: closeError && closeError.v8_representation_diagnostics ? closeError.v8_representation_diagnostics.root_rows.length : null}));
}
const savedClass = liveNumeric[3].maxclass;
probe('nongated-basic-class', () => liveNumeric[3].maxclass = 'toggle', () => liveNumeric[3].maxclass = savedClass);
const savedName = liveNumeric[3].varname;
probe('nongated-basic-duplicate-name', () => liveNumeric[3].varname = liveNumeric[4].varname, () => liveNumeric[3].varname = savedName);
const savedRect = liveNumeric[3].getboxattr;
probe('nongated-basic-geometry', () => liveNumeric[3].getboxattr = () => savedRect().map((v, i) => i === 0 ? v + 1 : v), () => liveNumeric[3].getboxattr = savedRect);
const savedPort = liveNumeric[3].patchcords.outputs[0].dstinlet;
probe('basic-input-port', () => liveNumeric[3].patchcords.outputs[0].dstinlet = 1, () => liveNumeric[3].patchcords.outputs[0].dstinlet = savedPort);
const savedHarnessClass = liveRoots[4].maxclass;
probe('root-harness-class-diagnostics', () => liveRoots[4].maxclass = 'toggle', () => liveRoots[4].maxclass = savedHarnessClass);
const savedClosePort = closeCord.dstinlet;
probe('root-route-diagnostics', () => closeCord.dstinlet = 1, () => closeCord.dstinlet = savedClosePort);
const memory = new Map(), proofPath = 'Z:/synthetic/review-close-proof.json';
liveConfig.lifecycle.owners[0].root_proof_path = proofPath;
memory.set('Z:/synthetic/config.json', JSON.stringify({...liveConfig, command_path: 'Z:/synthetic/command.json'}));
memory.set('Z:/synthetic/command.json', JSON.stringify(closeRequest));
reader.File = memoryFile(memory); reader.documentName = 'times'; reader.revision = 1;
function outputFailure(label) {
  reader.lifecycleproof.call({patcher: liveRoot}, 4, 'close-times-r1');
  const failure = JSON.parse(memory.get(proofPath));
  console.log(JSON.stringify({label, refused: failure.success === false,
    diagnosticsIsNull: failure.v8_representation_diagnostics === null,
    stage: failure.failure_diagnostics.stage}));
}
liveRoots[4].maxclass = 'toggle'; outputFailure('public-wrapper-harness-refusal');
liveRoots[4].maxclass = savedHarnessClass;
closeCord.dstinlet = 1; outputFailure('public-wrapper-route-refusal');
closeCord.dstinlet = savedClosePort;
`;
vm.runInNewContext(prefix + memoryFileSource + probes, {require, __dirname: stage, console}, {filename: file});
NODE
```

The independent review ran the six direct probes and two public-wrapper probes
successfully. All ten reviewed code hashes were unchanged before and after the
probes. Full stage suites were not duplicated: the parent separately reported
55 Python tests (54 pass, one intentional opt-in skip), a passing Node helper
suite, and passing read-only source metadata/immutable003 verification. Those
are parent verification results, not additional reviewer executions.

## Frozen Bindings

The historical003 sixteen-file archive binding is
`2f6239892695457b3ce8a12cc79e3e26e15714ef7365ec61a2ac3af43640d099`.
The ten-file canonical sorted filename/hash map digest is
`3255c56c2a38762c4c55e8e8928c677396098fcdc45b2f5a14f1818feefedd70`.
`preparation-004-review.json` has SHA256
`28ff671f93f7d47627aea51b516999281b93f489ebe8e8d3f3bfa1df55f43d07`.
Every current code file matched that map during this review.

| Stage File | SHA256 |
| --- | --- |
| arithmetic.py | 68c0eae3f620b3e262e78f78e7f64fde3bf9f26f2ce1a5c993abc0a406526f4a |
| controller.js | d8d8730386d7b7dbd1228af9071394d4a50ce0864290d7741d0b9fe1f6452304 |
| observer.js | ca8c15e16ffe11acfa5e279d53da0aec8814baa78fac3ced6208b36757f41399 |
| v8-readback.js | 7a03da234c41d0b11e2004457d830b711a08e94c45457e2ed1fa479b62eda53a |
| lifecycle.py | 389d8b773f1fc0d4f3d8d4db1a323bc65a632796a1f9a4a0f37c3be6ec2a0f3b |
| lifecycle-observer.js | d582fcffe982b631ddd453238c6f0a1006e54f0f5968d21083e9f3d04b2ac847 |
| prepare-runtime.py | 74b069f7202ff462dbd92374de7cda5de88d4bfeba110795a765e162778039d4 |
| test_preparation.py | 34c525120fbc787a7c42e3441b6d6fdc86c6d04090cf976a485afb2f5ba849df |
| test_helpers.cjs | dd98611496679828b552df7960e1c04ab4cd8ced9c0fe8516b5eea961ce51a54 |
| test_lifecycle.py | ce81f4d54f909ea8754f0f0327d9444838dd941f0eab2dbdf2af0839000b8e42 |

| Review Input | SHA256 |
| --- | --- |
| preparation-004-review.diff | 545f0efbea0d3ba6cdf27ff68761e7d12d38d571a2e7f42cbdd58cc33bc3aaf7 |
| preparation-004-review-brief.md | db989a5ec81098765a8e79d8c31d1039d2df5bf36b7a70b79bd3e71a66cd03d5 |
| max-preparation-004-report.md | ce2778dd8b78e4b5d5538dd48ce1ea9c2dcc2d8bab79a3641c2ab833a8865fdc |
| preparation-004-lifecycle-report.md | a5871642995bd327286ee906e0e0937b9262af0f171034df2e2ea9e4004a10ab |
| capture-003-audit.md | 0102fdaea0e0ee5bcd2e77217b25aef4c467b53124d27bca3426759f5c9fe1b1 |

## Residual Limits

This is a frozen code/specification review with original synthetic Max API
probes. It does not establish real revision004 behavior, getter silence,
callback order, successful score operations or parity. Capture003 stays
FAILED, complete=false, with zero completed operations. No private licensed
operands, geometry vectors, complete graphs/configs, raw bodies or credential
state were printed or persisted in this report.
