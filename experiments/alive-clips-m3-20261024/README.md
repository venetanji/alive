# Alive Clip Bank And Desktop Integration

Task 11 source: `db96180772e59099cc96e0bab189ba2dc8825522`, with reviewed fix
`1bc37b91a9a269ddc9b5450d7a8dc803dda141fd`.
Independent review and the focused correction/re-review are complete. This
checkpoint adds the native v3 clip bank and quantized individual actions.
The subsequent Task 12 desktop integration at `ecfed29`, corrected at `93879f5`
and rebuilt/qualified at `813ba76`, adds strict session-v3 persistence, four-slot
controls, focused clip history, playable legacy fallback and shared-source
recovery. [Task 12 evidence](task12-native/README.md) retains the actual release
journeys, source/build association, screenshots, red/green logs and both reviews.
Eight-track admission, atomic scenes, the complete native workflow and the new
1800-playing-second soak remain later acceptance gates. Earlier native-only
results below keep their original source attribution.

The admitted native profile has two tracks, six devices and four slots per
track. It uses the saved subtractive instrument, Stereo Utility and Stereo
Lowpass graphs through the shared native evaluator. Device/editor ownership,
the sixteen-root pool and 1024 stored / 32-per-frame / 64-per-1024-frame event
bounds remain explicit. The wider ABI storage does not enable a larger profile.

`task11-native/manifest.json` records source/build hashes and retained log hashes.
The logs include failing regressions and their corrected runs, the complete
native gate, isolated contract verification and release Rust results. The
ordinary contract invocation stopped at its missing `jsonschema` prerequisite;
the isolated `uv` invocation supplies it and passes. Shared Rust has 179 passes
and two existing ignores; the separate Alive context test passes. Existing
`reserve_native` and tool/runtime warnings remain visible in the raw output.

Native evidence covers legacy v1/v2 behavior, exact frames and partitioning,
cyclic/splice-envelope enumeration, quantized switching/stopping, receipts,
Stop races and capacity, automation ownership, isolation and callback
allocation/free/mutex guards. A maximum-range seek now performs exactly its
charged 1024 reconstruction reads. Refused controls perform no new chase scan;
candidate preview reads have a separate measured bound. Saved-device tests
compare the unaffected track's samples exactly across local launch/stop,
including a warm bypassed effect.

`task11-review/` retains the independently reproduced stopped-cue receipt
failure. `task11-fix1/` retains both regressions' expected failures and passing
corrections, full guarded v3 runtime, legacy v1/v2 compatibility and atomic
native-build results with source/build hashes. A bounded eight-index reducer
table now supersedes earlier same-callback stopped cues; START/SEEK/refusal
tests preserve cues actually used by the surviving candidate and older pending
actions. Nonloop cleanup forwards the actual failed resource. Independent
scoped re-review confirms both findings addressed with no new breakage.
The timing matrix below remains the original measured-source evidence; these
small control/diagnostic corrections do not claim a fresh timing distribution.
Concurrent v3 publication/receipt stress remains a final headless verification
gate alongside the later desktop/capacity/scene/soak work.

The final traced timing matrix has 1200 observations per case on an AMD Ryzen 9
5900HS, Linux 7.2.8-10-omarchy, GCC 16.2.1, 48 kHz, C++17 `-O2`, with test-only
work tracing and callback guards. The conservative combined stress includes
full registered reset/write/scan/emergency allowances plus actual rendering,
control, admission and publication. At 256 frames it observes p99.9 1.830 ms
and maximum 1.833 ms; at 1024 frames, p99.9 4.419 ms and maximum 4.432 ms.
The full distributions and workload counters are retained in
`task11-native/measure-final-policy-traced.log`.

An earlier run observed a 3.017 ms maximum at 64 frames, exceeding its 1.333 ms
buffer period. Its complete intermediate log was overwritten by the final run;
the controller's directly inspected row is retained in
`task11-native/earlier-64-frame-observation.txt`, with that evidence limitation.
The exact intermediate source snapshot is unavailable. The final run does not
erase the observation. Practical timing
evidence is restricted to buffers of 256 frames or more on this machine. These
guarded offline distributions establish neither physical audio deadlines nor
backend underrun counts, UI continuity, larger capacity or endurance. The
native AOT Faust path remains alongside Clockwork; the original latency tests
retain zero native alignment and the excluded legacy Voice path's 64-frame
delay.

After building the native library, reproduce the acceptance tests from the
repository root:

```sh
bash apps/ultra/build.sh --native-only
bash apps/ultra/tests/ci/check-native.sh
uv run --no-project --with jsonschema bash apps/ultra/tests/ci/check-contracts.sh
```

The complete timing compiler/link commands, measured graph-family restrictions,
work ceilings and derivation are in
`apps/ultra/src-tauri/native/alive_session_v3_policy.md`. The Task 11 report in
`.superpowers/sdd/PLAN/task-11-report.md` records the exact release Rust commands,
red/green cases and remaining limits. Later native/interface and CI results must
name their own source revisions rather than inherit this checkpoint's results.
