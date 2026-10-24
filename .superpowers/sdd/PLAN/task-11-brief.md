### Task 11: Native Clip Bank And Quantized Actions

Append one fixed v3 C ABI with storage for eight tracks, sixteen devices and
32 clips (four slots per track), initially admitting only two tracks/six
devices. Preserve v1/v2 layouts, semantics and tests through common helpers;
old state getters reject without writing if a larger state is unrepresentable.
Keep 1024 stored events, 32/frame, 64/1024 frames, sixteen roots, two effects per
track and the 64-command snapshot. Structural array size is not admitted audio
capacity. No new DSP engine or per-clip device instance.

Use native per-track cursors and one-bar quantization, separate from UI
selection. Switch/stop clears only its track; coalesce same-frame seam/launch/
seek transitions, chase ownership once, and dispatch incoming phase-zero events
once. Launch never compiles, replaces graphs or invalidates editors. Explicit
request serials/preparation revision and queued/applied/rejected/superseded
outcomes distinguish queue admission from execution. Stop retains its reserved
capacity and epoch guarantees.

Prospective native admission covers every selectable clip combination and
outgoing/incoming splice, including global seams, partial bars and short empty
loops. Bound reset/chase/parameter/control work separately from stored events.
Repeated seeks/restarts cannot bypass absolute-frame rolling dispatch/work
guards; reject optional overload while reserving unconditional termination.
Use the reconciliation's cyclic/segment envelope and independently test it
against small brute-force cases. Select/document work ceilings using actual
Faust-kernel measurements at the initial profile, not guessed deadlines.
Prove exact samples across arbitrary 1..1024 partitions, all transitions/races,
ownership, queue saturation, callback guards and original v1/v2 regressions.
Keep the desktop's existing v2 example usable until Task 12 integrates v3.

