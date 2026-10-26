# Native MIDI Arrangement Fix Round 1

Source range: `d7f8490..db39ab0`. Only the shared native scheduler header and
its guarded v4 test change. The initial implementation and failing independent
review remain in `../task2b/`.

The two independent regressions reproduce RED failures (exit 134) against the
original backend and pass GREEN after the fix. Rejected START preserves the
natural-end candidate and earlier mixer edits even when initial lookup credits
are exhausted. Dispatch retains termination/automation precedence and puts
chased notes before ordinary notes regardless of pitch.

Full guarded v4 rendering, shipping refusal and full native CI pass after the
fix. Native CI includes original v1/v2/v3, capacity/concurrent-publication,
allocation/free/lock guards and the original 42-cycle Stop/baseline comparison
(43008 identical samples). Rust and UI suites were not repeated because this
fix changes neither Rust/ABI nor UI. The original reviewer approves both
findings with no new breakage and zero open blocking findings.

Parent checks final source hashes against files and committed blobs, original
RED source against its commit, seven binaries, four fixtures, report hash and
the exact diff. No suites are repeated for this provenance check. Reports,
requirements, commands, raw logs, manifests and the fix diff are retained here;
executables and redundant complete source copies remain outside Git.

No production capability is enabled. The shipping app, active Document and
launcher remain v3. This is not desktop, PCM-track, callback-deadline,
multitrack/loop or endurance qualification. The provisional activation still
requires reconciliation before final v4 app admission.
