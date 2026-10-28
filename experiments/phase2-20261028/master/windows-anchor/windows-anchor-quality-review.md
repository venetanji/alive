# Windows Master anchor quality review

Reviewed candidate `3212065c4b47c068c69e60e8f7a098966f65be4f` against parent `58057f980afd3365e106433c7102cfc19450c130`, the supplied two-file review diff, producer report, and retained Windows runner report and log. This is a source review, not Windows runtime approval.

## Findings

No source-blocking findings in the candidate diff. The change associates only the existing required `alive_session_state_v2` anchor declaration with `ultra_native` on Windows. It does not add required Master imports, alter optional symbol lookup, add a fallback, or weaken exact anchor/export equality, same-module ownership, limits validation, or module reference lifetime. The attribute is absent on non-Windows targets; splitting the foreign block does not otherwise change those declarations. Existing compatibility limitations are not new findings from this patch.

The second fresh-child assertion compares availability on consecutive cached calls; it does not itself establish that the first value is correct, that the same capability object is returned, or that any negative fixture was exercised. The existing independent `actual == expected` assertion remains necessary and is retained. No misleading positive assertion is introduced.

## Evidence and limits

The retained base Windows run observed an initially empty cache whose initializer received an executable-owned address; the anchor export was missing there and the cached result was false. Later helper and direct addresses belonged to the DLL, matched its anchor export, and resolved all six same-owner Master symbols with compatible limits. This makes the link-attribute change a focused hypothesis for the observed initializer location, not proof of the candidate's behavior. Test-only instrumentation can change code generation or timing; the trace does not establish instruction bytes or the uninstrumented mechanism.

The candidate has not been compiled or run on Windows. The unchanged Windows rejection paths for absent or partial exports, forwarded/other-owner exports, and incompatible limits have not gained direct fixture execution here. The producer's separate bounded fixture packet is a proposal, not evidence; its resolver-only probe would not prove cached production-path negatives. Before treating the candidate as a Windows fix, run the real staged DLL fresh-child positive against this exact commit, confirm the initializer anchor, equality, owner and limits checks and both cached results, then run appropriate Windows negative fixtures and the full release/package checks. Preserve the distinction between resolver-only and actual cached-path coverage.

No tests, builds, native processes, cloud operations, or source mutations were performed for this review.
