# Native MIDI Arrangement Slice

Source range: `9bf3180..d7f8490`, including ABI commit `db4a934`.
This is a provisional native-only subset; the shipping app remains v3 and
both native builds report zero v4 feature bits. Read `requirements.md` and
`implementation-report.md` for exact commands, compile definitions and limits.

Recorded final checks pass: full native CI, real normal-library refusal,
provisional guarded saved-device rendering, C/Rust layouts and 79 Rust session
tests. Exact PCM agrees across the mixed partition sequence and fixed buffers
1, 31, 32, 63, 64, 127, 128, 256, 512 and 1024. The fixture uses the actual
saved subtractive instrument and a real two-effect chain. Source offsets,
held-note/automation chase, finite placement gaps/cutoffs and original legacy
regressions are included. This is neither production admission nor a new
callback-deadline, desktop, PCM-track or endurance qualification.

Independent review requires two repairs despite the recorded passing tests:
an early failed START reservation can commit a natural-end rewind, and the
combined pitch sort can put an ordinary note-on before a chased note-on.
`independent-review.md` records both findings and the uncovered cases. Fix
`db39ab0` supplies separate RED/GREEN counterexamples and repairs, approved by
the original reviewer's scoped re-review. Its evidence is retained in
`../task2b-fix1/`; this original failing source is not relabeled as approved.

Parent verification matches twelve source hashes to actual files and the
committed blobs, seven actual binaries, four fixtures and one supplemental
trace harness. The source/binary/fixture manifests identify their original
paths; binaries remain outside Git. `work-trace.patch` reconstructs the small
evidence-only trace addition against the committed native test, avoiding a
second full source copy. It asserts all seven dispatches, including synthetic
chase, spend the event ledger; raw work totals remain in `work-trace.log`.

Red failures, the original deliberate failing broad run, final green logs and
the existing `audio.rs:420` warning are retained with their actual outcomes.
The release launcher assets were not rebuilt or replaced by this native task.
