# Collector fixtures quality re-review 2

Verdict: pass for the two scoped quality fixes. No new finding in the reviewed delta.

On the driving thread, `owned` now guards its entry liveness and outer-health check with cleanup and post-cleanup health, preserving all failures in the existing aggregation. The added fixtures cover both a latched disappearance with cleanup and health failures, and a nested entry with failing outer health. Wrong-thread entry intentionally rejects before callbacks, preserving the driving-thread contract; ownership must be established on that thread.

Frame parsing now rejects oversized or out-of-range decimal values and conversion failures as explicit transport gaps before accepting diagnostics or updating playing intervals. The new fixtures cover a 5000-digit value followed by an advancing observation and the native unsigned 64-bit boundary. The original two findings are addressed.

The full frozen diff from `c71b60805e0e877915fb2b9efaf83b479252d5e3` to `07f1d9dacd70ac8a2ebcef10380e70ca035aa8b1` has SHA-256 `d44444ac376d8e4ecaf1e86f8ad44d0aadd9a9cadc2e183279cb323ec9fe9af7`. This was a scoped source re-review; no tests or runtime workloads were run. The worker report records 18 fixture tests and four selected existing GI-free tests passing. Driver integration, real resource cleanup and Task9 qualification remain outside this verdict.
