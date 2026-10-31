# Collector fixtures quality review

Verdict: changes required. This is a source review of the GI-free support packet, not Task9 or native/endurance qualification.

## Findings

1. **Cleanup is skipped when entering ownership fails.** `apps/ultra/tests/sustained_measurement.py:100` calls `_check()` before the `try`/`finally` that invokes `cleanup`. For example, a confirmed disappearance already latched by an earlier observation, or a failing outer health callback when entering a nested `owned` scope, raises at this point. If the caller has already acquired the resource passed to this scope, its cleanup is never called. This contradicts the cleanup-on-all-exits purpose of the ownership wrapper. Put the entry check under the cleanup guard and retain entry, cleanup, and post-cleanup health failures together; add a deterministic entry-failure fixture.

2. **An oversized decimal transport value escapes without breaking continuity.** `apps/ultra/tests/sustained_measurement.py:53` accepts any length ASCII decimal frame string, but `int(frames)` at line 64 can raise `ValueError` under Python's integer string conversion limit. That exception happens outside the collector rejection handler and without `_gap`, leaving `playing.last` intact. If the caller handles the bad read and continues, a later valid observation can accrue across it. Treat failed frame conversion as an invalid transport gap, with a regression fixture that resumes with advancing frames.

## Evidence and boundaries

Reviewed the full frozen diff from `c71b60805e0e877915fb2b9efaf83b479252d5e3` to `8a801100499d05aba7cf0446e640ea5294d741a4`; its SHA-256 is `a4bd04f0ed3e67220e48b6ced9bca80917e055a734f3a5f805db726d64c93620`. The only changed files are the new helper and its test file. Read the existing collector, playing interval and JSON-lines interfaces for compatibility. The remaining failure aggregation, nested action invalidation, retirement checks, and explicit liveness latch have focused fixture coverage; these two paths do not. No tests or runtime workloads were run in this review; the worker report records its test results.

Actual process-liveness identification, bounded sampler/recorder ownership, desktop callbacks, terminal reporting and Quit remain future driver responsibilities. Their absence is not a defect in this scoped fixture packet, and this review does not establish runtime behavior.
