# Sampler consolidation candidate

Candidate based on eb4f704e7e775333f949ce6c846cfc9bfb9e6b9c; uncommitted in the shared worktree. Three leased files only; no helper file. Root edits other files concurrently. No application binaries or native sources were edited. The pre-existing untracked cloud artifact was left untouched; remote CI and packages do not test this candidate.

## Exact candidate

SHA-256 of `git diff -- apps/ultra/tests/desktop_sustained.py apps/ultra/tests/check_alive_desktop.py apps/ultra/tests/test_desktop_sustained_integration.py`: `823901d643d5c37d211c34dce5c9fb2a0de2ec62a77853d4b97bb01b7aad105e`.

- `apps/ultra/tests/desktop_sustained.py`: `dbfaa176743caf850d568fec3e8f3350639fbbf51d569b21f49216ee3058b167`; +59/-4.
- `apps/ultra/tests/check_alive_desktop.py`: `59d8ceb8d0062b97b7e50f933eb60961400608b5f89ebd0b3db8c8d01d722f83`; +6/-0.
- `apps/ultra/tests/test_desktop_sustained_integration.py`: `b7eccb1b380a55bfc1918cf0306d9c6334b8c6bff0024d22a47a37628301db36`; +594/-0.

The worker owns the sole sustained collector, writes its timed row, then publishes a private deep copy under a condition; the consumer waits against the original request time and receives another copy. The GI-free adapter seam writes flattened legacy rows with provenance under the metadata lock. The independent non-sustained path is unchanged. Errors are latched, stop wakes waiters, and stop/join propagates errors discovered after prior health checks. No locks are held across collection or join. One source ID may represent multiple legacy requests. Cadence and limits remain unchanged, while the independent observation history intentionally disappears.

## Verification and coverage

Commands run from `apps/ultra/tests`:

- Red: `python -m unittest test_desktop_sustained_integration.DesktopSustainedIntegrationTests.test_periodic_sample_is_published_with_original_fields_and_copied` exit 1, missing publication attribute. Green after implementation: same command exit 0.
- Red: `python -m unittest test_desktop_sustained_integration.DesktopSustainedIntegrationTests.test_legacy_rows_share_source_and_preserve_payload_and_request_age` exit 1, missing seam import. Green after implementation: same command exit 0.
- `python -m unittest test_desktop_checkpoint test_desktop_sustained_integration test_sustained_measurement test_stream_measurement.MeasurementTests.test_complex_comm_non100hz_pid_reuse_and_exit_are_not_zero_cpu test_stream_measurement.MeasurementTests.test_metadata_and_epoch_coverage_are_bounded test_stream_measurement.MeasurementTests.test_group_union_limits_preserve_separate_cpu_reports test_stream_measurement.ResourceFixtureTests`: exit 0, 66 tests, 1.400 seconds. Fixture process files are temporary directories, never actual /proc.
- `git diff --check -- apps/ultra/tests/desktop_sustained.py apps/ultra/tests/check_alive_desktop.py apps/ultra/tests/test_desktop_sustained_integration.py`: exit 0.

Original suites cover process and identity union caps, PID reuse, unavailable coverage, checkpoint lifecycle, qualified epochs and forecast. Earlier candidate tests cover immutable publications, exact 2-second freshness, stale just over 2 seconds and a future publication with signed age, request deadline and wall deadline, stop/error checks, missed cadence and catch-up, writing before publishing, join timeout and restored hooks. They also exercise sampler progress while a fake UI action blocks.

New tests after the first report use actual Condition waits and notifications for stop, collection error and write error; a blocked fake collection demonstrates no initial publication and a deterministic request deadline with no legacy row. A separate no-initial-publication check covers the wall boundary and no row. Real `ProcessSampler` and `ProcessGroups` use a temporary synthetic process tree across periodic publications: two actual legacy rows exhibit a truthful CPU delta, then an identity cap error prevents a third publication. Real `JsonLines` aggregate limit and an actual filesystem write failure both reject legacy rows; the sustained JSONL aggregate limit latches the actual failure without publication. Tests compile and execute the actual `process_sample` AST without GI: four sustained calls write four matching return rows without creating an independent sampler; the fallback creates synchronous groups and retains the expected flat schema. A source-structure check finds the four legacy calls in their loop positions and a lifecycle source check verifies retirement, qualification, stop and terminal Quit order. Actual checkpoint and adapter methods exercise retirement, stop and Quit; a fake join latches a late sampler error after health and proves cleanup propagates it.

The earlier added cases validate existing implementation behavior and were not separately demonstrated red; the two initial red/green cycles above motivated the initial implementation.

## Independent-review fix round

Both independent reviews found first-request timing excluded lazy writer initialization. Red: `python -m unittest test_desktop_sustained_integration.DesktopSustainedIntegrationTests.test_first_request_includes_lazy_writer_initialization_in_age_and_deadline` exited 1, asserting 13.0 instead of the actual entry time 10.0. Green: the same command exited 0 after capturing time in `process_sample()` before constructing the writer and passing it through the helper to the consumer. The test additionally verifies negative age, a writer initialization that exhausts the original five-second deadline, and one that crosses the global wall limit; failed calls add no rows. Direct seam callers retain the default timestamp behavior.

The added end-to-end stale case starts a real fake periodic worker and observes one first source; a request 2.001 seconds after that start blocks, then an event releases the second scheduled collection. It compares all flattened app fields and both full auxiliary dictionaries to the actual sustained JSONL row, source ID, original outer start/completion, request time and negative age; repeated requests share the source ID. It verifies two collector calls only, three successful legacy rows, and no extra row after stop. An event-controlled in-flight sample crossing MAX_WALL fails the actual legacy seam with no row. These additional behavioral tests exercise already-correct code, so no separate red is claimed for them.

## Scope correction and limits

The earlier command `python -m unittest test_stream_measurement test_desktop_checkpoint test_desktop_sustained_integration test_sustained_measurement` passed 59 tests but unintentionally included existing recorder-helper tests that launch subprocesses and inspect their `/proc` entries. That exceeded the deterministic-only restriction. Those tests were not repeated; the final run selects only the allowed stream fixtures and cap tests. No live pilot, build, native operation, GUI, audio, cloud operation, or application artifact check was performed.

Source structure checks establish call sites and relative lifecycle order; they are not a full native journey or verified native Quit. The full native retirement/Quit gate remains separate. No fresh measurement, causal claim about the 41 processing-budget observations, physical underrun claim, admission, or transfer of any prior waiver or remote CI result follows from this candidate.
