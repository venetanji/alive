# Q1 Integrated Source Review

Review the complete first-checkpoint source diff from planning baseline
`1ebf2161e0fa2a62484566fac65c7e940567f357` to frozen root
`210b37e9ca6900c13bfb6c45f7ee8a050914311a` in this checkout.

Read the Phase 2 design and primary plan Tasks 1-9; the current handoff and
Master contract amendments govern later accepted decisions. Existing per-task
reviews passed; this review targets interactions across the integrated packet.
No implementation, history, source, docs or evidence-bundle edits are allowed.
Write only `q1-whole-source-review.md` in this SDD directory. No subagents.

All native/GUI/audio/build/browser/recorder/sampler/Wine resources are exclusively
leased to a running endurance worker. Use source/Git/static inspection only;
do not run tests or launch any application. Root's accepted application build
is f69125c; subsequent changes are harness and Windows-only linkage/fixtures.
Do not infer new runtime passes from earlier evidence.

Check saved/live/history/generation ownership, raw strict v5 decoders and
failure rollback, Master command/ramp/observation and callback constraints,
UI input and async intent, editor retirement versus DSP lifetime, and harness
integration preserving original regressions. Trace concrete user triggers and
file/line paths; prioritize actionable bugs and incomplete acceptance gates.
Distinguish demonstrable source defects, test/evidence limits and explicitly
deferred later-task features. Do not request additional slots/audio/recording
or general Max/Live compatibility from this checkpoint.

Final-head CI/packages, Windows runtime and 1800 proven seconds are pending
and already known gates, not source findings. The pilot margin waiver permits
exactly one bounded unchanged-source attempt; it waives no hard bounds.
