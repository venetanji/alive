# Master cloud correction specification review

## Spec Compliance

- Issues found: the new freshness witnesses do not establish the requested full state/preparation preservation across refusal (Important below). The source correction and explicit contract amendment are otherwise sound on the reviewed scope; source approval remains conditional on that witness gap, and is not Windows qualification.
- The amendment at `docs/contracts/alive-master-v1.md:89` is justified on its merits: an independently incremented rejection counter cannot both be current without a callback and remain tied to an older callback publication. Sampling it once after accepting the coherent score/Master tuple preserves bounded tuple reads and avoids a competing publisher. Its stated non-correlation and exact increments are essential constraints, not a relaxation of tuple coherence.
- `apps/ultra/src-tauri/native/alive_session.hpp:428` adds exactly that independent load after acceptance; the supplied diff leaves the tuple sequence, four-attempt BUSY path, callback and ABI untouched. The concurrent witnesses preserve gain/serial/frame correlations and bound the counter while checking exact final totals (`apps/ultra/tests/alive_session_master_test.cpp:151`, `apps/ultra/tests/alive_session_v3_test.cpp:336`, `apps/ultra/tests/alive_session_v4_test.cpp:136`).
- The prior Windows P2 is addressed in source: null and module-lookup failure branches each print the actual direct resolver result, and null is distinguished from last OS error (`apps/ultra/src-tauri/src/session/native_master.rs:157`). Both declarations and the cached production capability are exercised in a child process (`apps/ultra/src-tauri/src/session/native_master.rs:125`); production resolver checks are unchanged by the diff. Windows-only compilation and actual runner output remain unobserved. The diagnostic is not a Windows fix or final head qualification.
- The immutable diff has no changes to the original Arrangement assertions. The retained Arrangement log reports the native journey PASS and its report records refusal 21/18, generation 3, software PipeWire and the mapped corrected library identity. This is local evidence, not proof of the original cloud failure's unrecorded values.

## Strengths

- V2/V3/V4 witnesses check exact baseline+1 on legacy and combined readers without render or republish, then a subsequent publication and exact baseline+2 (`apps/ultra/tests/alive_session_v2_test.cpp:75`, `apps/ultra/tests/alive_session_v3_test.cpp:294`, `apps/ultra/tests/alive_session_v4_test.cpp:95`). Master data are compared across each refusal.
- Retained red logs show each version failing at the intended first combined exact+1 assertion; retained green native log contains V2/V3/V4 and 42-cycle Stop passes; Rust log records 122 passed. These are reported results, not reruns by this review.

## Issues

### Important

- **Plan-mandated preservation witness incomplete** — `apps/ultra/tests/alive_session_v2_test.cpp:85`, `apps/ultra/tests/alive_session_v3_test.cpp:304`, `apps/ultra/tests/alive_session_v4_test.cpp:105`. The snapshots compare only generation and absolute frame, plus preparation revision in V3/V4, while the legacy getter is checked only for the counter. A refusal could mutate other score or prepared state without these checks detecting it. The brief explicitly requires old state and preparation preservation, and the amendment's witness 4 requires preservation during refusal. Compare the meaningful observable score and preparation fields before and after each refusal, excluding only the independently changing rejection count, on the relevant legacy and combined paths; avoid relying solely on a revision as proof of contents.

### Minor

- Retained `master-correction-rust.log:2` contains three compiler warnings (unused import, unused variant, unused method); the requested review method treats warning noise as a finding. The report acknowledges existing warnings for the host build but does not call out the Rust test warnings. Resolve or explicitly track them without expanding this source lease.

## Assessment

**Source specification verdict:** Needs fixes for the mandated preservation witness. No production defect is established by that test gap. The prior Windows diagnostic finding is addressed at source level only.

**Qualification remaining:** Execute the recorded staged Windows build and fresh-process diagnostic with the sentinel unset, retain both streams, establish the actual failing check, and then review and test an evidence-supported correction with positive and old/partial-library negative fixtures. Full Windows suite, staged checks, integrated checks and final-head CI/packages remain separate gates. No tests, builds, runtime processes or source mutations were performed in this review.
