# Task 6 Node packet independent spec review

Verdict: changes requested for the leased Node/DTO packet. This is not an acceptance of Task 6; Rust/native integration remains a separate gate.

## Finding

- P2 — `apps/ultra/ui/alive-model.mjs:15` and `apps/ultra/ui/alive-model.mjs:26`: a response without `snapshotSequence` bypasses the ordering comparison, and a response without `master` is accepted as a legacy mock even after a sequenced Master snapshot has been accepted. With equal generation and draft revision, such a response replaces the authoritative snapshot and removes its Master. A direct model probe accepted sequence `20` with gain `0.5`, then accepted an unsequenced, Master-less response and returned `undefined` for Master. The same omission can bypass `preparationRevision` ordering. The brief requires old/late data not to overwrite newer state while explicitly supporting older mock input; mixed legacy/current input is not covered by the new ordering tests. Preserve legacy-only compatibility while preventing a response lacking established ordering/DTO fields from replacing authoritative state, and add a regression for the transition. This edge depends on mixed-format responses; the frozen native Task 6 producer is expected to supply Master and sequence, so it is not evidence that conforming native responses exhibit this failure.

## Evidence and limits

- Reviewed the complete four-file diff from `e6c5dd79cea2c4b5a704fe81fd69f5ea7519838d` to `ff14dda24f1e50e57bfc835df826bd69ccc4d8f4` against the brief, report, and frozen Master DTO/seam. The diff SHA-256 matches the report: `89a9e865ecb999ef5ea304a670dee775715394b305d1fbb47e8ed23e1418d0d6`.
- Independently ran the focused model and Master tests: 13/13 passed. The report's 577/577 full Node/component run and pre-implementation red/green history were not independently repeated or reconstructed.
- Present DTO validation precedes model mutation and retains nullable observations, distinct decimal-string identities, and the score-only document. Tests demonstrate draft preservation with newer Master snapshots and rejection of explicitly older generation, revision, and sequence values.
- This review does not establish native producer/schema compatibility, audio coherence, Task 7/8 behavior, GUI, builds, or CI. Those remain separate integration and acceptance gates.

## Round 1 scoped re-review

Verdict: the P2 finding is resolved in `de30ca8c3f80a4be2ca346839c27a5f4a7974450`; no new findings in the scoped follow-up. This verdict covers the Node packet only and is not Task 6 acceptance.

The shared freshness gate now rejects omission of each established field before either acceptance path mutates state. Legacy-only snapshots remain accepted and a newer complete response can follow the rejection. Six regressions exercise both `accept` and `applied` for all three fields. The independently rerun focused suite passes 19/19, and the cumulative diff hash matches the revised report (`1340034d47a97f8ebca893bbe2d5a39845dcf4d105b17bfa3f696066796262b7`). The worker's red evidence and full 583/583 run were not independently reconstructed or repeated. Native integration and the other limits above remain separate gates.
