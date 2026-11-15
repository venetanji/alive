# Development Checkpoint - 2026-11-15

Requested review, commit and GitHub checkpoint on
`research/runtime-foundations-probes`. Application implementation starts from
`1f3439d87af9c6c54c37b0ef2471cabc21619e13` (October 23). This checkpoint
preserves research and development state; it adds no application behavior,
device support, reference execution or compatibility qualification.

## Reviewed Work

- Preserve the existing document lifecycle, bounded control/audio execution,
  Max-inspired editor, trackpad pinch and blank object-entry implementation.
- Add the October 31 Electric native-device feasibility report and five retained
  case results. These describe an experimental private loader and temporary
  Ultra graph snapshot, not the normal desktop build. No DLL, recovered device
  implementation or private loader is distributed by this checkpoint.
- Add original authored Max probes, source-identity metadata, recorded runtime
  traces, screenshots of original probes and historical verification logs.
  Preference snapshots contain file-path/hash pairs, not preference bodies.
  Reviewed REA records contain no captured ambient credential environment.
- Retain six pre-existing list-runtime captures. Their 2,048 rows differ from
  the prior Git versions only in `wall_ms`. Regenerate normalized source hashes
  and the native replay report, then refresh the integrity manifest. Expected
  message semantics are unchanged. No Max process is launched.
- Publish the reviewed body-free hierarchy bundle. Refresh its manifest for
  the existing verifier/test changes and updated README without modifying raw
  captures. Preserve the distinction between authenticated recorded evidence
  and a new target execution.

## Local-Only Material

`2026-11-15-artifact-inventory.json` records every initially uncommitted artifact
with its size, SHA256, checkpoint disposition and exclusion reason. It also
records the historical hashes before derived metadata refreshes. The original
October 23 inventory remains immutable historical evidence, rather than an
assertion that all its files still have local-only status.

The root `.gitignore` keeps these exact existing artifacts local:

- Historical `ultra-local` / `ultra-chord-lab` directories and three root-level
  archives: distribution license/source contents have not been qualified. Some
  older archives lack a project license or the complete dependency notices.
- Seven compiled arithmetic test executables: rebuildable outputs, with their
  historical logs and hashes retained.
- Three help-shell screenshots: they contain installed reference help text and
  example canvases, rather than solely original authored probe content.

Local-only artifact contents are not deleted or rewritten for this checkpoint.
Licensed source-bearing evidence already under
`/home/venetanji/.cache/alive-ultra-evidence/` stays private and unchanged.
Ignored dependency/build caches are not source-control inputs; the pinned setup
and build scripts remain the reproduction path.

## Historical Failure Records

The following files are retained byte-for-byte as failed/incomplete evidence;
they are not valid JSON and must not be counted as successful captures:

- `experiments/max-reference/float-cable-runtime-20261022/attempt-1-incomplete/results/receipts.json`
  is a truncated JSON capture.
- `experiments/max-reference/help-roots-runtime-20261022/results/xvfb-rea-startup-diagnostic.json`
  contains terminal diagnostic text, despite its historical filename.

Historical red logs, failed attempts and incomplete results remain historical.
Their inclusion does not turn them into current passing verification.

## Current Resume Boundary

The arithmetic full-root comparison remains FAILED/incomplete at capture011:
52 of 78 operations, 336 numeric states, 94 outputs and four independent closes
were accepted. Request101 (`install-minus-r1`) did not complete in the runner.
Retained first/last refusals report front/root identity mismatch; the underlying
cause remains unknown. Full-help qualification remains **0 / 2,103**.

Proposed diagnostic revision012 is still design-only and NEEDS REVISION:

1. Capture the original comparison operands and immutable refusal context before
   diagnostic getters can reenter and alter collector state.
2. Represent unattempted and pending reads truthfully in immutable exports.

Read the October 23 resume note, the arithmetic-root implementation plan, and
`.superpowers/sdd/2026-10-22-arithmetic-root-runtime/preparation-012-design-review.md`.
Amend and independently review the design before implementation; then require
source review, a fresh sealed preparation and owned-process checks before any
new Max capture. Historical001-011 archives and private captures stay immutable.
No timeout extension, identity relaxation or partial qualification is admitted.

The October 23 checkpoint's controller hash still matches. Its test-helper hash
predates the portable-contract changes in `00a632e`; establish current bindings
before resumed implementation rather than treating that historical hash as the
current source. This checkpoint records both current hashes in its inventory.

The separate Electric track next needs a matched Live/native parameter-state
and MIDI-sequence comparison, including PCM, note-off/release, block sizes,
randomness and state restoration, before adding a supported device-host boundary.
The larger product milestones remain physical MIDI ingress/timing qualification,
then the first Alive MIDI-clip, automation and save/reopen workflow.

## Verification

All commands in `apps/ultra/tests/ci/check-contracts.sh` completed successfully
across two segments. The initial run passed its preceding tests but stopped at
line 18 because system Python lacks `jsonschema`. The unchanged remainder,
starting at that exact command through the final test, ran under
`uv run --no-project --with jsonschema` and exited zero. No failing assertion was
skipped or disabled. A single-command reproduction with that dependency is:

```sh
uv run --no-project --with jsonschema -- bash apps/ultra/tests/ci/check-contracts.sh
```

Current results:

- UI/component aggregate: 393 passed, zero failed or skipped. The separate
  help-root import and arithmetic-admission groups passed four and three tests.
- Arithmetic preparation: 90 Python tests ran, with 89 passed and one explicit
  skip; the controller/helper cases through011 passed. Other portable Python suites and
  the hierarchy verifier's negative controls passed.
- Base reference integrity: 63 original patch graphs, 20 complete retained Max
  traces, 32 schema-valid manifests, 150 indexed artifact hashes and 1,920 DSP
  frames verified. This authenticates historical captures, not fresh Max runs.
- List replay: 714 matched, zero mismatches, two explicit feedback exclusions.
  All 716 normalized cases remain identical to the pre-checkpoint Git version.
- Signal replay: 197 cases and 114,560 values passed. Arithmetic replay: 287
  comparisons passed, four explicit local refusals and nine cases outside
  qualified creation; zero comparison failures. The runner updates the recorded
  temporary arithmetic test-binary path, so its single manifest hash is resealed.
  Arithmetic integrity/current-source verification also passed: 300 inputs,
  218 typed receipts, 24 artifacts and zero stale native sources. Original Max
  captures and comparison results are unchanged.
- Native sequencer, graph, object, list, signal, hierarchy, independent-document,
  numeric, arithmetic, message and print contracts passed, as did build/install
  atomicity and launcher checks. These compiled temporary test programs, not a
  new Rust/Tauri release build.
- Hierarchy bundle: `RETAINED_CAPTURE_VERIFIED`, `oracle_executed: false`.
  Comment capture verification passed two runs /124 snapshots; tab capture
  verification passed 116 files /74 screenshots. These are retained original
  probe observations, not new target invocations.
- All 1,247 inventory file identities and disposition rules matched. The 644
  committed input blobs match disk, and all 603 local-only files remain intact
  and unstaged. Staged structured documents parse except the two explicit
  historical malformed records listed above.
- Independent staged review found no remaining publication or integrity blocker.
  Source, documentation and regenerated metadata whitespace checks pass. Raw
  captures retain their original CRLF, trailing whitespace and failure records;
  the unrestricted whitespace check reports those archival formatting details.

These checks do not reexecute licensed targets, qualify physical audio/MIDI
latency, or change the failed arithmetic full-root capture's status.
