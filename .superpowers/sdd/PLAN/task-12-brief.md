### Task 12: Saved Clips And Individual Launch Interface

Integrate reviewed native v3 into Rust and strict `alive-session-v3` storage.
Deterministic v1->v2->v3 migration preserves beat values, source hashes, device
IDs, bases, automation and mixer. Four nullable slots/track contain stable clip
and note IDs; saved defaults start stopped on reopen. Selection, queued action
and running clip/phase remain distinct. If stricter admission rejects conversion,
preserve the runnable v2 document and explain the limit.

Create/duplicate/delete clips and edit loop length through focused history;
duplication creates score IDs while retaining the track's device instances.
Draft-only clips cannot launch. Aggregate per-track bounds span stored clips:
128 notes, sixteen lane records and 256 points; global compiled events stay
1024. Expose actionable density/work errors, including contributing tracks/
clips and conservative-envelope rejection. Preserve Apply/file/editor ownership
and failed-operation safety. Test round-trip, Save As, source/reference errors,
individual switching/stopping, independent score copies and editor continuity;
complete the actual release app journey before expanding track admission.

Resolve the confirmed shared-source guidance gap from
`.superpowers/sdd/PLAN/shared-source-recovery-analysis.md`: selected Replace
cannot install while another reference to the externally changed file retains
its old hash. Identify that condition without claiming Replace always recovers
it. Document the verified recovery: preserve the changed file at a new path,
restore the matching original at the shared path, then explicitly replace each
intended instance. Explain the original-backup requirement. Keep normal hashes
strict and selected Replace isolated; do not silently refingerprint siblings.
Cover the error and recovery with focused regressions.
