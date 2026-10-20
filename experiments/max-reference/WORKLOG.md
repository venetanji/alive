# Local Max Reference Work Log

## Material Passport
- Task: bounded reference experiments for Alive/Ultra, no runtime implementation.
- Starting ref: origin/research/runtime-foundations-probes
- Starting commit: 9f9c225dfd6774342df21112ccd025197ee725a9
- Work branch: research/max-reference-local-20261020
- Source checkout: left on its existing branch with its three untracked items.
- Scope: only experiments/max-reference/; do not touch PLAN.md or application files.

## Execution Plan
- [x] Fetch shared branch, record base, create independent worktree and branch.
- [x] Inspect installed versions and official local references; isolate a disposable Wine prefix/display.
- [x] Create focused message-order, inlet/type, routing, initialization, scheduler and scope fixtures with a sequence logger.
- [x] Execute using installed Max if legitimately accessible; retain raw and normalized traces with honest statuses.
- [x] Create single-property JSON inputs and document preservation-first import mapping; Max-saved snapshots remain deferred.
- [x] Capture 48 kHz deterministic offline DSP with an independent fresh-process repeat.
- [x] Finish bounded object inventory, manifest hashes and reproduction instructions; self-created container observations remain deferred.
- [x] Validate JSON/graphs/evidence classifications and prepare evidence-only handoff; commit/archive IDs are supplied separately.

## Constraints
No paid/cloud sessions, external messaging, license workarounds, proprietary implementation analysis, bundled assets, preference edits in the original prefix, merges or pushes into the shared PR branch. The user subsequently authorized pushing this separate reference branch.

## Results And Handoff
- Completed 20 original Max probe traces (00-19), including trigger depth-first
  ordering; 32 documented object classes, 11 authored property-change inputs.
- Completed two byte-identical 1,920-frame offline DSP captures in fresh Max
  processes. A diagnostic run with overlapping buffer names was discarded after
  finding interference; it is not an accepted reference capture.
- Fixed collector output truncation: explicitly truncate existing output files
  and write DSP one frame per line instead of exceeding File.writeline's size.
- User requested aa13d68 and the reference-manifest schema mid-investigation.
  Initial commit remains 9f9c225; integration base is aa13d68. Root/per-fixture
  manifests use the shared schema; the bundle index holds full artifact hashes.
- Max-saved property pairs and self-created AMXD remain untested. Standalone
  Max executes with saving disabled; copied Live opened a disposable empty set
  but its editor launch remained pending. No license workaround or trial used.
- List atom numeric types and original Console error channel remain unresolved.
  Exact scalar selector types, literal input syntax and output absence are
  preserved; no inference of list types or error-free handling is made.
- Original Live preferences still match the independent pre-Live copy; no Max
  standalone preference file appeared in the original profile.
- Capture activity stayed local; no new paid sessions, merges or PR changes.
  The user later authorized the separate reference-branch push.
- Read-only verification passed: 32 patch graphs, 20 complete Max traces, 32
  schema-valid manifests, 149 hashed artifacts, and two identical DSP captures.
  Python compilation and the staged Git whitespace check also passed. Raw
  Windows JSONL keeps CRLF bytes via a scoped .gitattributes rule.

## Reference Annotation Follow-up

- Read the draft PR update at 94a054f9bce912b0d38250ac5cf70e0983f7a39d.
  Both reported derived-provenance defects reproduce in the original normalizer.
- Replace operation_id with latest_input_id, null before the first stimulus.
  No causal attribution was measured; causal_input_id remains null and
  causality is not_measured. Delayed output is not attributed to the last input.
- Retain all direct logger source candidates instead of overwriting sources
  sharing an inlet. Only a single candidate populates source_object_outlet;
  ambiguous events, including 18-dsp driver_left, have no asserted unique source.
- Four real-data normalizer regressions fail before the correction and pass
  afterward. The read-only verifier now rejects stale or incomplete annotations
  across every captured event. Regeneration changes derived JSON and hashes;
  raw Max captures, fixture scores, patches and DSP recordings remain unchanged.
- No new Max/Live execution or original preference changes are needed for this
  correction. The updated corpus stays on the independent reference branch.
- Follow-up verification passes 32 patch graphs, 20 complete traces, 32
  schema-valid manifests and 150 indexed artifacts. Four annotation tests,
  Python compilation and Git whitespace checks pass. Temporary corrupted
  copies with guessed delay causality or a dropped shared-inlet candidate are
  rejected specifically by the new semantic checks, before hash validation.
