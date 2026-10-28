# Collector fixtures spec re-review 1

Verdict: pass for the two scoped spec fixes. No new finding in the reviewed changes.

Confirmed `ProcessDisappeared` is logged and latched before propagation, and subsequent observation and finalization checks reject even valid-looking data. Ordinary inaccessible observations remain recoverable gaps. The future driver must identify confirmed process exit and raise the typed signal; this packet does not establish that integration.

`owned` now runs cleanup and post-cleanup health after body failures, and retains simultaneous body, cleanup, and health exceptions in a `BaseExceptionGroup`; a single failure remains directly visible. The added fixtures cover disappearance followed by a valid record, transient recovery, and combined failure cases. Python 3.12 supports the exception-group behavior. The helper still relies on the caller to perform and bound actual sampler/recorder cleanup and health checks.

The full candidate diff from `c71b60805e0e877915fb2b9efaf83b479252d5e3` to `8a801100499d05aba7cf0446e640ea5294d741a4` matches the frozen SHA-256 `a4bd04f0ed3e67220e48b6ced9bca80917e055a734f3a5f805db726d64c93620`; the round-one review diff matches the corresponding `git diff -U30`. This was a read-only scoped re-review: no tests or runtime workloads were run. The worker report records its own test evidence. This verdict does not claim Task9, endurance, native, or driver acceptance.
