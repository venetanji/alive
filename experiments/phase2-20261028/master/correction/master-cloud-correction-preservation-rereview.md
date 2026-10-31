# Master correction preservation re-review

**Verdict: ADDRESSED.** The prior Important preservation witness finding is resolved by the immutable delta `0f27b8d66e0eaed85534e3cdd219cc122b6d39d1..7ff950f4ab7eba8b6a354084e948f1a801618e6a`. No new Critical or Important finding was identified within that delta.

In each V2/V3/V4 test, both legacy and combined score snapshots are compared across both refusals, clearing only the independently sampled rejection field; exact +1/+2 counts and the Master comparisons remain (`apps/ultra/tests/alive_session_v2_test.cpp:75`, `apps/ultra/tests/alive_session_v3_test.cpp:294`, `apps/ultra/tests/alive_session_v4_test.cpp:95`). This checks observable score and preparation fields, not hidden prepared storage, for which the reviewed API supplies no complete introspection.

The retained mutation-red log shows the V2 comparator detecting the reported device-revision mutation, and the three restored focused logs report PASS. The updated report records the mutation, restoration, commands, executable hashes and the preexisting Rust warnings. These logs substantiate the stated focused evidence; no test or runtime was executed in this review. Comparing structure bytes also includes padding, so portability of the test on other compilers remains a minor consideration, not a finding that blocks this scoped correction.

The previous review's conclusions about the production correction and contract amendment remain applicable. The Windows-only diagnostic has not been compiled or observed on the actual runner; its cause, any correction, Windows suite and final-head qualification remain pending. Source acceptance here is not Windows or final qualification.
