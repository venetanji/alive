# Preparation005 Independent Review

## Findings

### P1: Plus getters run without complete root and lifecycle-inlet identity checks

Reference: `experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js:168`.

`plusNumericPreflightBinding` validates the definition's inlet and indexes the
owner array, but never validates that owner's `inlet` field or the actual
root's parent state. A nested root, unavailable/throwing parent property, or
missing/wrong/boolean owner inlet still reaches all six format/value calls.
These cases must suppress every plus capability call under the accepted strict
owner contract. This is a getter-eligibility defect even though installation
continues to refuse and no numeric admission is produced.

Original synthetic probes independently changed each of those six identity
conditions after establishing explicit top-level/null-parent and inlet2
baseline metadata. Every invalid case ran six capability calls and retained
three numeric observations. A serialized nested-root failure and a serialized
owner-inlet99 failure likewise retained three numeric observations and four
geometry dispositions. Expected capability count is zero.

Required correction: make the plus-only gate require a known top-level root
and an exact integer `owner.inlet == definition.lifecycle_owner_inlet` for the
revision's expected index. Missing, throwing or non-null parent state must
suppress the diagnostic calls. This does not establish availability of a new
live capability: unavailable topology remains unknown and fails closed. Add
direct and serialized regressions; preserve existing times behavior.

### P2: Tolerant saved-geometry matching admits unpinned plus geometry before getters

Reference: `experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js:289`.
Related eligibility check: `controller.js:355` in the same directory.

Plus geometry resolution reuses `sameRect`, which accepts deviations up to
0.01 from the saved vector. Policy validation pins the metadata vectors, but
the final plus eligibility block does not establish that the actual candidate
matches either exact permitted vector. It can therefore run the new diagnostic
getters with a geometry-policy object at an unmeasured third vector.

For each of the four plus geometry anchors independently, an original fixture
placed the actual object at saved X + 0.005 with the remaining saved coordinates
unchanged. This is neither exact saved geometry nor the pinned live geometry.
Every case still made six capability calls, retained three numeric
observations, and recorded only three geometry dispositions. The serialized
root-helper case reproduced the same result. Expected capability count is zero.

Required correction: require exact saved/live matching for plus policy
consumption before diagnostic eligibility. Keep the correction plus-specific;
the finding does not request changing the existing times tolerance. Add
regressions at all four anchors and in the serialized failure path.

## Verdict

Specification: changes required for P1 and P2. Quality: changes required for the
same eligibility gaps and missing regressions. No other concrete finding was
identified in the frozen scope.

The four plus geometry policies are separately source/helper/evidence/box/text/
vector/axis/zero-route bound across arithmetic, controller, V8 and independent
lifecycle consumers. The immutable004 loader and original source metadata
checks pass. Numeric source classes remain `flonum`; actual controller classes
remain `number`; plus installation still refuses. No plus numeric policy,
semantic float basis, V8 representation, setter, input message or numeric
admission was introduced. Basic retention, both endpoint multisets and retained
history validation remain in the reviewed paths. Times policy counts remain
4/3/3/2; plus is 4/0/0/0; minus remains 0/0/0/0.

## Reproduction

Run this read-only command from `/home/venetanji/Work/alive`. It extracts only
the original synthetic fixture and in-memory file helper, loads the frozen
controller, and prints counts/outcomes. It does not launch Max, read licensed
bodies, or create files. The three representative cases reproduce both findings
directly and through the serialized failure path.

```sh
node <<'NODE'
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const stage=path.resolve('experiments/max-reference/arithmetic-roots-runtime-20261022');
const source=fs.readFileSync(path.join(stage,'test_helpers.cjs'),'utf8');
const start=source.indexOf('function plusPreflightFixture(');
const end=source.indexOf('for (const revision of [1, 2]) {',start);
const memory=source.slice(source.indexOf('function memoryFile(memory)'),source.indexOf('const diagnosticMemory'));
const utils=String.raw`
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function helper(name,extra={}) {const context=vm.createContext({jsarguments:['js','Z:/synthetic/config.json'],...extra});vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),context);return context;}
const plain=value=>JSON.parse(JSON.stringify(value));
const hash=value=>require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
`;
const probes=String.raw`
for(const label of ['nested-root','wrong-owner-inlet','near-saved-root']) {
 const f=plusPreflightFixture();f.root.parentpatcher=null;
 f.context.config.lifecycle.owners[2].inlet=2;
 if(label==='nested-root')f.root.parentpatcher={};
 if(label==='wrong-owner-inlet')f.context.config.lifecycle.owners[2].inlet=99;
 if(label==='near-saved-root') {
  f.scopes.root[0].live=[...f.definition.full_inventory[0].rect];
  f.scopes.root[0].live[0]+=.005;
 }
 let failure;try{f.context.validateTree(f.root,f.definition);}catch(error){failure=error;}
 const memory=new Map([['Z:/synthetic/journal.jsonl','']]);
 f.context.File=memoryFile(memory);f.context.shared.seq=0;
 f.context.config.ack_path='Z:/synthetic/review-ack.json';
 f.context.config.journal_path='Z:/synthetic/journal.jsonl';
 f.context.fail({command_id:51},failure);
 const ack=JSON.parse(memory.get('Z:/synthetic/review-ack.json'));
 console.log(JSON.stringify({label,installRefused:ack.success===false,
  expectedProbeCalls:0,actualProbeCalls:f.calls.length,
  numericObservations:ack.anchor_diagnostics.filter(r=>r.numeric_preflight_observation).length,
  geometryDispositions:ack.geometry_dispositions.length,
  numericAdmissions:ack.numeric_mode_observations.length+ack.controller_representation_observations.length}));
}
`;
vm.runInNewContext(utils+source.slice(start,end)+memory+probes,{require,__dirname:stage,console});
NODE
```

The reviewer also ran a valid explicit-topology/inlet baseline, all six identity
variants, all four near-saved geometry variants, and unavailable/throwing Basic
traversal and throwing root-path probes. The last three suppress every plus
probe as expected. The parent separately reproduced the three representative
direct and serialized failures before this report was written.

## Verification And Binding

- Reviewer: `python3 -B -m unittest test_preparation test_lifecycle` passes all
  38 focused tests; `node test_helpers.cjs` passes.
- Parent: full stage reports 66 tests, 65 passing and one intentional opt-in
  skip; fresh Node suite passes. These results do not cover P1/P2.
- Read-only `load_plus_measurements()` and `source_metadata()` pass. All prior
  source fields, classes, rectangles, text, ports and edges match sealed004;
  only the intended plus geometry policy/support fields are added. Hashes of
  all 137 retained work004 files are identical before/after these calls.
- All sixteen current/archive hashes match the explicit review map: exactly
  seven files changed, nine unchanged. Native, runner, comparator and their
  tests are unchanged. The finite score remains unchanged.

| Frozen Input | SHA256 |
| --- | --- |
| Current ten-file package | 40b9a8956d54a5afb0e18f619e015efa4f9f23c1f576ed189f3d83cae4c97c9b |
| Explicit review map | ad65195d652f0052ee694632b7d8862420d357fad61602a2304ee9af2aaaac7b |
| Explicit review diff | 46b2dbda82ee5d432ff86659cb456421984b234b8c3c2e090ad55da53c30db10 |
| Accepted design | 49f86c152210d1871155b4608c33cf6dd600551ee92ceb729f7453779693a9f0 |
| Implementation report | 38efa2082a2e51f9f28025f180ed112c2bd6a275324c904ac6186bb8d156b988 |
| Capture004 audit | 925a70d2cda0811794b03eb8f59ff76127ccfed10c0c843b36f368550ba88c53 |
| Historical004 archive binding | 885c85e7c7c56793afb539e94af0bc88bd559c4b78599f8cbcdfa2145148fa2d |
| Frozen score | 95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb |

The explicit map binds every per-file reviewed hash, including the controller
`70fb8f4324d221e9777c50980fee81ed59ab92c450eb4c7802cb449c4dd63030`.

## Limits

This report is the only new artifact. No code/evidence change, preparation,
target launch, native execution, commit or delegation occurred. No005 runtime
behavior, plus getter availability or silence, V8 class, completed comparison,
saved-order claim, arithmetic parity or qualification increment is established.
Capture004 remains FAILED with its audited 26 completed times operations; the
complete 78-operation denominator remains mandatory. Licensed source values,
private vectors/configurations/graphs and raw diagnostic bodies were not
printed or copied into this report.
