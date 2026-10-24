# Task 13b: Measured Eight-Track Admission

Read this first: these are your requirements, together with the full Task 13
text in `task-13-brief.md` and the capacity/overhead sections of
`task-13-observability-design.md`. Begin only after Task 12 and Task 13a have
passed their independent reviews and actual release workflows. Preserve those
accepted implementations. Parent supplies their exact commits/reports at
dispatch; do not work from the designs' obsolete v2 source anchors.

## Scope And Constraints

Measure the accepted 2-track/6-device profile, internal 4-track/8-device and
8-track/16-device fixtures with actual saved Faust graphs, then enable the
existing eight-track v3 profile only if supported by retained measurement and
the actual release app. Keep the one renderer, frame clock, queue, emergency
Stop mailbox, native root pool and v3 struct layouts. A larger policy identifier
may be additive if required; never change an already qualified policy silently.
No scene feature, session schema expansion, arrangement, physical MIDI, engine
migration, new reference research or endurance run. Task 15 owns the full soak.

Keep sixteen roots, four slots per track, up to two effects per track, the
existing per-track note/lane/point bounds and 1024 global compiled events. Eight
instruments plus nine effects must reject before accessing their dependencies.
Preserve the 32/frame and 64/1024-frame event ceilings, including cyclic seams
and splices. The explicit eight-triad/two-automation-point case totals 40 and
must reject. Do not retime supplied events, weaken admission or raise event/
root/queue limits to make a fixture pass.

## Native Policy And Measurements

Derive the larger work ceilings from the actual root/parameter/scan/reset/chase
and repeated-control bounds. Retain distinct scheduled, optional, fixed-control,
publication and emergency costs. Measure refused controls as well as accepted
ones. Reconcile the accepted portable mask helper and stopped-winner reducer.
Larger storage and a successful limits query do not enable a profile: features
must explicitly advertise ADMITTED. Atomic multi-track actions stay disabled.

Use the design's fixture matrix and same-source telemetry enabled/disabled
comparison, preserving clock/publication-tail overhead accounting from Task 13a.
Include uneven two-effect chains, every admitted voice, parameter extensions,
event density, short loops, aligned switches, seek/reset/chase, 64-command
bursts, full receipt/state publication and emergency cleanup. Retain complete
raw distributions/counters and exact fixture/source/build hashes. No overwritten
intermediate logs; earlier failures remain evidence alongside later results.
Allocation/free/lock guards are separate diagnostic facts from release timing.

Report practical requested and observed desktop buffers at 48 kHz on the named
hardware/backend. The proposed 50% p99.9 headroom is advisory. Do not invent a
new user gate or universal deadline guarantee, or infer physical underruns
from callback budget exceedances/software capture. Preserve saved settings and
make any practical buffer limitation visible in guidance; do not silently
configure a different output/buffer.

## Desktop And Regression Gates

Carry admitted limits into Rust validation/preparation, runtime projection,
add/remove/selection and clip controls. Existing two-track examples/New remain
usable, strict v3 stays strict and valid legacy fallback retains its behavior.
Keep stable IDs, pending history, native receipts, editor/DSP separation,
automation ownership and file/Quit/scoped Stop guards. Do not fork the host for
the larger profile or hardcode a new synth/effect. Update source contracts and
help text to describe the actual admitted capacity and practical evidence.

Prove deterministic supported partitions, all local transport/note termination,
device isolation, queue/receipt saturation and mixer/persistence at the larger
profile. Close the recorded concurrent v3 publication/receipt gap with a bounded
real callback/control/read regression using the one serialized producer and
correct root lifetimes; do not substitute sequential polling. Preserve the
original v1/v2 tests and exact event timings.

Build the actual standalone release Alive and adjacent library and exercise
eight independent tracks, clips/quantized switches, an uneven saved effect
chain, automation/base/mute/solo, editor Close/reopen, Save/Open and playback.
Retain typed per-epoch metrics, CPU/PSS/worker samples, software audio and
screenshots. A browser fixture or native offline renderer alone is insufficient.
Run affected and required full gates once; avoid unrelated repeated suites.

If measurement reveals a concrete blocker, leave the larger profile disabled,
retain a small reproducible failing workload and report the working accepted
slice plus the narrow technical decision/next step. Do not disguise a capacity
failure as success or add unrelated optimization/features.

Parent owns PLAN/ledger/PR/retained experiments; you own this source/test/docs
slice and its commits. Do not spawn subagents, modify release branches,
merge/tag/publish, change persistent settings/credentials or create cloud
sessions. Report to `task-13b-report.md` with status, exact commits/builds,
commands and raw output locations, measurements, actual native evidence,
warnings, limitations and self-review. Return only status, commits, one-line
verification and concerns. Parent performs independent review after checkpoint.
