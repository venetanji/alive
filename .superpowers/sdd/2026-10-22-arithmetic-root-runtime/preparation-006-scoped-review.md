# Preparation006 Scoped Specification And Quality Review

Verdict: **changes-required**. Specification readiness: **changes-required**.
Quality readiness: **changes-required**. One P1 finding remains.

## Finding

**P1: Make an instrumentation refusal terminal for already queued install
callbacks.** `controller.js:635` and `controller.js:631` schedule the next
callback before the fallible `poll-scheduled` trace write. If that write fails,
`fail()` publishes a failed ACK and sets `installTrace.active=false` at
`controller.js:548`, but does not cancel or otherwise invalidate the queued
callback. The callback at `controller.js:600` has no terminal-state guard.
Its later trace events return immediately at `controller.js:40`, so polling,
validation, capability calls and binding can continue without tracing. A later
ACK replaces the original instrumentation refusal.

Independent in-memory reproductions against the frozen implementation:

| Case | First failed ACK | After draining the existing callback queue |
| --- | --- | --- |
| Sink fails on initial scheduling marker | `success=false`, sink refusal; 0 polls, 0 calls | 70 polls, 420 calls; replacement refusal ACK loses `install_trace_failure` |
| Sink fails on recurring scheduling marker | `success=false`, sink refusal; 1 poll, 6 calls | 70 polls, 420 calls; replacement refusal ACK loses `install_trace_failure` |
| Initial scheduling failure with the existing valid synthetic bind fixture | `success=false`, sink refusal | `success=true` at 10 polls; 4 helpers and 1 connection created; trace failure absent |
| Explicit record-bound refusal after initial scheduling | `success=false`, limit refusal; terminal limit marker at record 2048 | 70 polls, 420 calls; replacement refusal ACK loses `install_trace_failure`; sidecar remains at 2048 records |

These cases violate the accepted requirement that sink/bound failures stay
latched and fail installation. The successful bind is a synthetic control with
the already permitted source class; it is not new plus class or numeric
admission evidence. The bound reproduction also confirms that reserving the
terminal marker does not by itself stop the install transaction.

The fix needs a terminal install state respected by every pending callback and
the ACK publication path, with pending work cancelled or rendered inert.
Preserve the first instrumentation refusal and forbid subsequent validation,
binding and ACK replacement for that transaction. Add regressions that drain
the queue after initial and recurring scheduling failures and after a bound
refusal, including the existing valid bind fixture. The current sink/bound
tests at `test_helpers.cjs:1030` and `test_helpers.cjs:1043` do not assert these
terminal queue outcomes.

## Review Coverage And Verification

Review scope is frozen preparation006 against the consumed005 sixteen-file
archive `/home/venetanji/.cache/alive-ultra-evidence/arithmetic-package-005-historical`,
not the initial005 review-base. The accepted brief, worker report, complete
production diff and added tests were reviewed. No additional material finding
was established in the remaining scoped identity/path, observation durability,
capability exception, diagnostic preservation, trace bound or policy checks.

Fresh checks:

- `node test_helpers.cjs`: exit 0. Existing direct/serialized P1/P2 cases remain
  12 identity and 8 geometry cases with zero invalid calls or observations.
  The added healthy trace suite reports 1710 persistent-refusal rows and 1740
  rows on the actual 80-poll path, 644956 bytes, maximum 947 bytes per record,
  420 original capability calls and unchanged attempt/scheduling controls.
- `node --check controller.js`: exit 0.
- `node --check test_helpers.cjs`: exit 0.
- The independent scheduling/success reproduction asserts all three defective
  queue outcomes in the table. Probe SHA256:
  `5e0d7c352bd10abf2abf59841b372016491ab3317eede32641fc3e43f34ff6e8`.
- The independent record-limit reproduction asserts the fourth defective
  queue outcome and an explicit terminal marker within 2048 records. Probe
  SHA256: `f2ddecc39ac64f3743c731ae41917962778d5e5e1d70985343da46710e615b09`.

The independent probes append synthetic assertions to a VM evaluation of the
unchanged helper suite and use its memory-backed filesystem and task queue.
No production file or private evidence was changed. They print only counts,
booleans, status metadata and hashes.

## Frozen Bindings

All sixteen historical base files, sixteen frozen006 files and ten package
files were checked against the review map. Exactly the authorized two files
differ; the other fourteen files and the score are byte-identical. Final
verification binds006 to
`/home/venetanji/.cache/alive-ultra-evidence/arithmetic-package-006-review-base`,
because authorized fix1 work has begun in the runtime stage. "Current" in the
table means the frozen006 review-map bytes. Canonical map hashes use sorted
compact filename/SHA256 JSON; archive bindings hash existing `binding.json`
bytes. All fresh006 tests and independent probes preceded the follow-up edits.

| Binding | SHA256 |
| --- | --- |
| Accepted006 brief | `8a07cf723572aee815a9b549b94213f869bcd343dd667ca4e85844c612b93f42` |
| Worker006 report | `5e0a7e17b1b0322abdd6a0c14d251ee35914de149d389b469dcdf78aa05049eb` |
| Review006 JSON | `dd0b3fc4f44410f809655c653775fd445cf446147b6ed5fc9c26e6d6436d8e2c` |
| Review006 diff | `e6296e0fcde77e082e3cf59474a74e749d5143cdd60d986921c32b9dc0849c81` |
| Consumed005 historical archive binding | `b5edd0895a0fe6554d6967b3ad79f1fda8740ad33b1304cb84a87b703239ec31` |
| Frozen006 review archive binding | `535b41f2e055757a78b301c04e086267f743df84bfd2fdaa39884153c0a46839` |
| Current controller.js | `f86d3deb2bfaaacffa1be17e8d0d1e9f288b28ef0dd1a4a52d7909c7747228cf` |
| Current test_helpers.cjs | `0b52117223f5b6554db0e6c993f87d6209a2050e29ee98426cb859fd77aada84` |
| Current two-file map | `e0fa5c912d19c9499dc67732cdb5da5aace6e05aac6ae5443f395b5ce4b932f4` |
| Current ten-file package | `4e64a9ad5af3f27a43e231eeadde0feebce842dc09c1de47f74c97527aa4a2c0` |
| Unchanged score | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |

Only this report was written. No preparation, application/runtime/native
launch, commit or delegation occurred. The review establishes an offline
control-flow defect; it does not identify the capture005 timeout cause or
establish any005 capability result. Live target availability, trace overhead,
eligibility and capability behavior remain unmeasured. Qualification remains
0/2103, saved order remains unobserved, and the full 78 operations / 504 states /
141 emissions / six independent closes remain required.
