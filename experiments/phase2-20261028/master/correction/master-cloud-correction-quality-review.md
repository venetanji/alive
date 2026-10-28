# Master cloud correction quality review

## Spec compliance

**Compliant within the scoped source packet.** The correction implements the amended independent rejection observation without changing callback-owned tuple coherence or the bounded BUSY path (`apps/ultra/src-tauri/native/alive_session.hpp:417`). The original Arrangement assertions are unchanged. The preservation re-review's test additions compare observable legacy and combined score state across both refusals, excluding only the independently sampled counter (`apps/ultra/tests/alive_session_v2_test.cpp:75`, `apps/ultra/tests/alive_session_v3_test.cpp:294`, `apps/ultra/tests/alive_session_v4_test.cpp:95`). Hidden prepared storage is not fully observable through these interfaces.

The independent counter semantics are justified: off-callback validation can increment it without a publication, so sampling after tuple acceptance makes the count current at that load while preserving coherence of the other fields. The counter can legitimately be ahead of the tuple. The modified concurrency witnesses retain correlated gain/serial/frame checks, bound that counter and check its exact final total (`apps/ultra/tests/alive_session_master_test.cpp:151`, `apps/ultra/tests/alive_session_v3_test.cpp:343`, `apps/ultra/tests/alive_session_v4_test.cpp:143`).

## Strengths

- The real V2/V3/V4 witnesses check the old getter and combined getter after each of two refusals, including a publication between them, and compare Master observations. Retained red logs show the original combined-counter assertion failing in each version; focused preservation logs and the deliberate V2 mutation red support the expanded witness.
- The diagnostic calls the actual production cached capability in a fresh process and reports both anchor paths; the source retains the production exact-anchor, same-image and limits checks (`apps/ultra/src-tauri/src/session/native_master.rs:94`, `apps/ultra/src-tauri/src/session/native_master.rs:126`). The test-only module handles are released and limits are called only after the same owner checks.
- Retained Rust output reports 122 passing session tests and the local Arrangement log reports its native journey passing. These are retained evidence, not reruns in this review.

## Issues

**Critical:** None found.

**Important:** None found in the scoped source review.

**Minor:** `.superpowers/sdd/2026-10-28-phase2-live-max/master-cloud-correction-evidence/master-correction-rust.log:2` records three existing Rust test warnings (unused import, variant and method). They obscure otherwise clean output; the updated worker report explicitly tracks them, and cleanup can remain outside this lease.

## Assessment

**Task quality: Approved for the scoped correction and diagnostic source review.** No source defect found in the reviewed change. This is not a Windows fix or final qualification: Windows-only diagnostic compilation and runner output, the actual Windows failure cause and evidence-supported correction, negative-library fixtures, full Windows suite and final-head CI/packages remain pending. The local Arrangement result does not establish the missing original cloud numeric values.

The supplied diff and frozen candidate were reviewed without running tests, builds or runtime workloads. Focused surrounding-source checks addressed two concrete risks: bounded publication and V2 projection of the independently loaded count (`apps/ultra/src-tauri/native/alive_session.hpp:406`), and diagnostic parity with the Windows production resolver (`apps/ultra/src-tauri/src/session/native_master.rs:87`). The observable state structure definitions were checked for the comparison's representation risk; cross-compiler behavior remains untested.
