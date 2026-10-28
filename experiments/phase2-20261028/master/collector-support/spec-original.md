# Collector fixtures spec review

Verdict: changes required. This review covers only the frozen support-fixture packet, not Task9 or endurance acceptance.

## Findings

1. **Process disappearance can be followed by successful finalization.** In `apps/ultra/tests/sustained_measurement.py:31` and `apps/ultra/tests/sustained_measurement.py:77`, a failed or unavailable read is recorded as a gap and polling continues. If a subsequent read supplies a complete, inactive, contiguous record, `finalize` returns it. The interface has no distinct process-liveness signal or latched disappearance state, so it cannot enforce the brief's requirement that process disappearance cannot become success. The disappearance test only supplies missing observations until timeout; it does not cover disappearance followed by a seemingly valid record. Add an explicit way to distinguish and retain fatal process disappearance, with a regression test.

2. **Cleanup can hide a background failure.** In `apps/ultra/tests/sustained_measurement.py:96`, post-cleanup health is skipped whenever the body has already raised, and a cleanup exception replaces the body exception. A sampler or recorder limit discovered during cleanup can therefore be lost, contrary to the requirement that background failure propagate while cleanup runs. The tests cover a successful cleanup after a health failure and a health failure after a successful body, but not a concurrent body/cleanup failure or a failing cleanup. Preserve and expose the relevant failures while still running cleanup, and cover those combinations.

## Evidence and scope

The candidate diff SHA-256 is `6ca8740e3bffe2a35b63ee0e164fd23473d7d0afb173feb748ca428d17457174`; the diff from base `c71b60805e0e877915fb2b9efaf83b479252d5e3` to candidate `147376c7c0be877c46ce3db3220c441ff73d0f3f` has the same hash and adds only the two leased fixture files. The implementation composes the existing `EpochCollector`, `PlayingIntervals`, and `JsonLines`, leaves existing bound definitions untouched, and uses driving-thread polling without creating a sampler. The fixtures exercise conservative gaps and action boundaries, collector rejection, retirement deadlines, and several cleanup/limit paths; the two omissions above prevent full acceptance. The supplied observation shapes are compatible with the focused existing collector and observability reads, but actual runtime data and driver integration were not validated. No tests or runtime workloads were run in this review; worker test results are reported separately.
