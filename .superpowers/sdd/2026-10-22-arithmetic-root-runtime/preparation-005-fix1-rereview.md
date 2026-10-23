# Preparation005 Fix1 Scoped Re-review

Verdict: **ready**. Spec readiness: **ready**. Quality readiness: **ready**.
No remaining P1/P2 findings were reproduced.

This review compares fix1 with the sixteen-file initial005 review archive at
`/home/venetanji/.cache/alive-ultra-evidence/arithmetic-package-005-review-base`,
not historical004. Exactly `controller.js` and `test_helpers.cjs` differ;
the other fourteen files and the score remain unchanged. Review activity wrote
only this report and used in-memory synthetic probes. No preparation, runtime,
application, display or native launch was performed.

## Finding Disposition

- **P1 addressed**, `controller.js:178` and `controller.js:180`.
  Plus preflight now requires the actual root parent to be exactly null and the
  owner's inlet to strictly equal the definition inlet. Existing strict
  revision and definition-inlet checks constrain that value to the expected
  integer index. Unknown, throwing and non-null parent states and invalid inlet
  types suppress all diagnostic capabilities. Direct and serialized refusals
  retain the actual diagnostics without fabricated observations.
- **P2 addressed**, `controller.js:289`.
  The plus policy branch uses exact saved geometry and exact pinned live
  geometry. The existing times saved-geometry tolerance branch remains intact.
  Independently perturbing either permitted branch at each of the four plus
  policy anchors suppresses all diagnostic capabilities.

The production delta contains only three replacement blocks: the owner check,
the root-parent check and the plus-specific saved-geometry branch. Structural
assertions verified the strict revision/inlet relationship and both exact plus
geometry branches. No additional in-scope quality issue was found.

## Fresh Verification

Commands ran from `experiments/max-reference/arithmetic-roots-runtime-20261022`:

- `node test_helpers.cjs`: exit 0. The complete helper suite passes, including
  the existing times tolerance control and both-revision fix1 regressions:
  12 identity cases, 8 geometry cases, zero invalid cases with capability calls,
  zero direct cases with observations and zero serialized cases with observations.
- `node --check controller.js`: exit 0.
- `node --check test_helpers.cjs`: exit 0.
- Re-executed the original review's safe reproduction block, unchanged:
  exit 0; nested root, wrong owner inlet and near-saved geometry each produce
  zero calls, zero observations and zero numeric admissions. Their retained
  geometry-disposition counts are respectively 4, 4 and 3.
- Independent in-memory matrix across both plus revisions: 32 invalid identity
  cases and 16 invalid geometry cases all refuse installation, make zero calls,
  retain zero direct/serialized preflight observations and admit no numeric mode
  or controller representation. Identity refusals retain 3 anchor diagnostics
  and 4 geometry dispositions; geometry refusals retain 4 anchor diagnostics
  and 3 geometry dispositions. Serialized anchor diagnostics equal the directly
  collected diagnostics.
- Twelve positive geometry controls retain diagnostic eligibility while still
  refusing installation: each individually exact saved anchor (8 controls),
  the exact live baseline (2 controls), and all four anchors saved (2 controls).
  Each makes 6 calls and retains 3 direct/serialized observations. The respective
  geometry-disposition counts are 3, 4 and 0. All admission counts remain zero.

The independent identity matrix includes missing, undefined, throwing, nested
and falsy non-null parents; and missing, boolean, string, wrong, fractional,
NaN, null, boxed and throwing owner inlets. Geometry probes perturb the saved
and live alternatives separately at every policy anchor. No licensed operands,
vectors, full configurations or raw runtime diagnostics are included here.

Original reproduction command SHA256:
`77f1b66d88e15e29084e34e8f58c072172dc153d23530be0020f34ce355d17a4`.
Independent in-memory probe SHA256:
`e7d87360fdba21c0b7e77f947e389f78bf6dc9ed408fcb345c4fd9c627e24e94`.

## Frozen Bindings

All sixteen archived base files, sixteen current files, ten package files,
the score, review diff and worker report were verified against the frozen map.
The archive binding is the hash of its existing `binding.json` bytes; the
package and two-file map digests use canonical compact sorted JSON.

| Binding | SHA256 |
| --- | --- |
| Initial005 review report | `be83226b6d43422a27529680184576a36855a49976d151f66d24135969ab2e70` |
| Initial005 base archive binding | `96dfa78227a89b087c261634e64c712c2f3f2384bb45870da7bf51b21dc6dcc3` |
| Fix1 controller.js | `febc0bede6c58a4b11667a580e5d845089accd9237ab3c5f52caa632a884726c` |
| Fix1 test_helpers.cjs | `9c661e919efa511aa88640f78475e50b38738b76aa1d37dd7c90b4656d6bdf9e` |
| Fix1 two-file canonical map | `1c75dc8bb0c03b0d37d028dc2ee41313ba63ebb33a3726c8cd71991e06335c58` |
| Fix1 ten-file package | `0e81702204d177c3d13590dd617edb64eb0c0344405692219b252d8123e4ecfe` |
| Fix1 review diff | `74ac7dc18c4a2ec4c3964b8526187dd088de6aafb5620d10f61741d9a1c77f79` |
| Fix1 review JSON | `73cb137679e2528afa1ab2d8f82df1a5f68ffe0ec0eb18e40747042ae787e8e1` |
| Fix1 worker report | `cc57471ca98b0850411a9e21f3e56be8d1ca03d97dacf74e4b6b816ca0935417` |
| Unchanged score | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |

Readiness is limited to the two accepted fixes and their regression boundary.
The synthetic checks establish fail-closed behavior; they do not establish
availability of `parentpatcher` or numeric capabilities in a real runtime.
Plus numeric/class refusal and the existing preparation/runtime gates remain
in force. The parent owns combined verification, fresh preparation and any
subsequent runtime execution.
