# Preparation004 Fix1: Reader Freeze

Both accepted review findings are corrected in the scoped reader implementation.
Only `v8-readback.js` and `test_helpers.cjs` change in this round. The initial004
reports and archived review base remain immutable. No preparation, application
launch, full moving suite, commit or score execution occurred.

## P1: Fresh Complete Basic Retention

Every preclose now builds, validates and retains the exact private
`arithmetic-basic-retention-v1` envelope specified by the fix brief. The payload
contains close request/operation/step, source owner/revision/path/Basic name,
actual Basic box rows, and separate observed input/output endpoint arrays.
Public function signatures and the five representation-witness schema are
unchanged. The independent lifecycle worker owns validation of this nested
payload on current closes and retained-history replay.

The collector refuses incomplete bounded enumeration, missing/duplicate/extra
originals or leaves, nongated class/geometry drift, invalid observer classes,
source descriptor/text/empty/port changes, invalid saved or observed endpoint
ports, and any difference in either duplicate-sensitive endpoint multiset.
Original geometry exceptions remain exact and source-bound; numeric gates
reuse their already-admitted fresh witnesses. Actual classes and source
descriptors are preserved.

Source text hashing uses sealed strings and UTF-8; it adds no live text or port
getter. Basic binding uses the unique root-enumerated saved varname plus the
outer root proof's existing source class/geometry checks. Endpoints bind by
captured name, sealed port bounds and exact multisets. No assumption that Max
returns the same JavaScript wrapper object from separate accessors is added.

## P2: Diagnostics Through Later Refusals

The representation-diagnostic catch now covers witness assembly, the new Basic
checks, and all later root original/harness/geometry/endpoint/route checks.
Once collected, all three numeric and four root rows remain attached to direct
errors and serialized `lifecycleproof` failures. The Basic stage is identified
in existing private failure diagnostics.

## RED/GREEN Evidence

- P1 RED: 20 Basic corruption cases still succeeded at preclose; missing
  original/leaf cases already refused on complete inventory counts.
- P1 GREEN: all 22 Basic corruption cases refuse, including nongated class,
  geometry, original/leaf identities, leaf class, input/output multiplicity,
  missing routes, original/observer inlets, boolean ports, unknown endpoints,
  source port bounds and source text/empty/port metadata.
- P2 RED: 25 later refusal cases dropped the collected seven-row diagnostic.
- P2 GREEN: 27 direct Basic/root refusal cases and 22 serialized wrapper cases
  retain all seven rows. Successful serialized proofs retain the exact nested
  Basic payload.
- Both times revisions retain fresh five-row witnesses and full Basic proof.
  Plus/minus revisions1/2 also retain and validate full Basic proofs, with
  nongated class and endpoint corruptions refused.
- Repeated times readback/preclose checks retain the existing three numeric
  getter/format probes. Poisoned nongated getters prove preclose adds no full
  seven-number sweep; plus/minus preclose acquires no numeric getters. Existing
  incomplete-inventory suppression and getter-no-input checks continue to pass.
- `node test_helpers.cjs`: PASS. `node --check` for both changed files: PASS.
  Both files remain ASCII. The frozen arithmetic implementation is unchanged.
- A read-only, in-memory fixture built from private current source metadata
  passes all six owner/revision combinations: each proof retains 35 Basic box
  rows and 27 input plus 27 output endpoints. Only identities/counts/outcomes
  were printed; this was not a real runtime execution or preparation.

No broader getter-silence, parity, callback-order or qualification claim is
added. Actual runtime behavior still requires the parent's reviewed preparation
and execution. Capture003's limited three-probe silence observation is unchanged.

## Frozen Two-File Binding

Canonical sorted filename-to-SHA256 map digest:
`546e13850d08fa4cb411f2d7ce55ab473f49b00eba31419d8df9f7d2651037e5`.

| File | SHA256 |
| --- | --- |
| v8-readback.js | 48dc878ef645df6491b2ba0d59d616c34464c0761991664d760ee3b1cd6fc4e3 |
| test_helpers.cjs | 31024fc10f49aaf8c100b1a777ceabd7bff8a0062a1fd54a1219e02b80f922ef |

Unchanged `arithmetic.py` SHA256:
`68c0eae3f620b3e262e78f78e7f64fde3bf9f26f2ce1a5c993abc0a406526f4a`.
Frozen score SHA256:
`95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb`.

No known unresolved issue remains within these two findings. Parent owns
combined binding, integrated checks and scoped re-review before preparation.
