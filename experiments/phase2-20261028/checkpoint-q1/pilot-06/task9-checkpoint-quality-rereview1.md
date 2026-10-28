# Task 9 checkpoint quality re-review, round 1

Candidate `d5078669b923f481fc6b84ce3ab34819109199f6`; scoped comparison `289c7789e2a13378780906f32d6335691179ec81..d5078669b923f481fc6b84ce3ab34819109199f6`, including intermediate `3f555cc`. Source-only review of the requested corrections and new breakage. No tests, builds, runtime, GUI, audio, cloud actions, or subagents were used.

## Findings

No new blocking finding in the scoped changes. The five prior findings are addressed at source level:

1. **Matched projection denominator — addressed.** `apps/ultra/tests/check_alive_desktop.py:1183` and `:1224` snapshot proven playing at cycle boundaries; `:1347` passes their delta. `apps/ultra/tests/desktop_checkpoint.py:92` credits fixed playing once and scales the remaining target against the matching cycle denominator. A focused case covers setup playback.
2. **Collector lifetime — addressed.** `apps/ultra/tests/check_alive_desktop.py:1348` and `:1352` include the collector lifetime and fixed setup/tail separately from capture wall; `apps/ultra/tests/desktop_checkpoint.py:94` evaluates both against their limits. The projected variable component includes 10% allowance and all bounds require 5% headroom. These are explicit planning margins, not statistical guarantees.
3. **Independent resource sampling — addressed with evidence qualification.** `apps/ultra/tests/desktop_sustained.py:107` samples outside UI action and metadata locks, records actual sampling start/end, duration and cadence delay, and uses short locked JSON writes. The new fixture covers a blocked UI action. The resource row's `action` and `playing_seconds_proven` at `:117` are unsynchronized, best-effort snapshots: they may not describe a coherent instant or causal event for the sampled process data. The curated report/manifest wrapper must explicitly state that limitation and avoid exact or causal label claims; the separate driving-thread playing audit remains the credit authority. Subject to that qualification, no source change or pilot rerun is needed for these labels alone.
4. **Missing CI coverage — addressed.** `.github/workflows/ultra-ci.yml:53` adds all three requested GI-free suites to the diagnostics job without removing existing suites.
5. **Per-epoch error qualification — addressed.** `apps/ultra/tests/check_alive_desktop.py:1302` evaluates collected completed epochs after retirement; `apps/ultra/tests/desktop_checkpoint.py:10` validates typed counters, fails nonzero render/shape/CPAL errors, reports processing-budget exceedances separately and leaves physical underruns unavailable.

## Limits and remaining gates

The approved dwell changes from 90 to 180 seconds while preserving the original actions and assertions per cycle and the 1800-proven-second target. This lowers action density again; report actual measured density and retain the earlier 8-second and 90-second pilot results. Neither a 10% allowance nor 5% required headroom bounds future pauses or variability.

The new >=500-proven-second, >=3-cycle pilot is reported running against frozen `d507866` and pinned artifacts; this review does not infer its result. Its raw frame/time/ordinal credit and invalid gaps, independent resource coverage, typed epoch qualification, recorder limits and completion, stream retirement, terminal Quit, corrected projection and headroom require independent evidence review before any full run. No 1800-second, physical-audio, Windows, or final-head CI/package pass is claimed.
