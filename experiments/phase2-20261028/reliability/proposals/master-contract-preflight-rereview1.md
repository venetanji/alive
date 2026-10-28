# Master contract preparation re-review 1

Scope: only the five findings in `master-contract-preflight-review.md` and defects introduced by their revisions. This is preparation, not a freeze or authorization for consumers; P2.0 remains pending. No builds, GUI, or production changes were made.

## Verdicts on prior findings

1. **Serial exhaustion: addressed in principle, with two follow-up clarifications below.** `master-contract-draft.md:77` reserves candidate and rollback serials before retirement, burns unused serials, prevents interleaving and refuses if fewer than two remain. Witness 3 covers the boundary and post-reset failure.
2. **Quiescent commands: addressed.** `master-contract-draft.md:79` defines FIFO draining, direct set/reset, unchanged frame and BUSY during retirement, with a specific stopped-path witness at `:118`.
3. **Retry discriminator: addressed.** `master-contract-draft.md:102` defines failure-shaped structured codes and retry policy, and `:121` calls for bridge-level evidence.
4. **Coherent rejection count: addressed.** `master-contract-draft.md:89` specifies sampling inside the publication and forbids the independent override in combined getters; `:119` requires a concurrent witness.
5. **Unavailable install: addressed.** `master-contract-draft.md:75` branches unity installation without optional calls, specifies serial/observation, and preserves unity v5; `:118` asks for actual old/partial library installation and snapshot witnesses.

## Remaining fix-induced gaps

- **Retirement failure needs a separate pre-replacement branch.** `master-contract-draft.md:77` says to reapply the previous configuration if *any* step fails after retirement, but `Driver::stop` initiates retirement and can return pending while a callback still owns native resources (`apps/ultra/src-tauri/src/audio.rs:328`, `:348`); the existing install returns before `Host::install` in that case (`apps/ultra/src-tauri/src/session/desktop.rs:222`). Native rollback/reset is unsafe or refused until quiescence. Specify that a pending/failed stop before native replacement burns reserved serials, returns the existing retirement-pending result, and does not attempt reset/rollback; reap normally and retry only when quiescent. Add a witness that holds the retiring callback and verifies no native replacement or rollback occurs.
- **Rollback must update the serial exposed for the retained owner.** The rollback install publishes the reserved rollback serial (`master-contract-draft.md:77`), but only a successful command advances accepted serial (`:81`) and the failure retains the previous owner. Without an explicit rollback update, the retained project's `acceptedSerial` may remain older than its new `appliedSerial`, making the advertised owner/observation acknowledgment relation ambiguous. Specify that successful rollback records its rollback install serial as the retained generation's accepted serial, while saved gain, wire, dirty and history remain intact; assert it in the failure witness. A failed rollback must not claim that serial as accepted.

The listed witnesses are requirements for future implementation, not evidence of passing behavior. Platform resolver and performance gates remain as stated in the draft; they were outside this scoped re-review.
