# Finite MIDI Authority Actions

Source `92d84d1f53dc1d8ad4f7b345f16f862e911d3ec7`, base `8a6192f`.
The provisional native backend now supports stopped/quantized Launch, scoped
track Stop, Return and atomic multi-track actions through the existing native
owner. Shipping features remain zero. This does not enable Arrangement in the
app. Independent review requested changes: crossing an Arrangement boundary
clears the published pending Launch slot while the internal request remains
queued. A scoped fix and playing-boundary regression are required before the
next runtime slice; the initial results retained here do not cover that defect.
The separately retained fix at `74d92d4` is now independently approved; see
`../task2c-authority-actions-fix1/` for the RED/GREEN and scoped review.

Real saved Ultra instrument, utility and stateful-filter graphs establish:

- Launch at frame 48000, held-note Return at 96000 and scoped Stop at 144000
  use native application-time state. Due actions replace old occurrence endpoint
  events; the other track's PCM, phase and epoch continue unchanged.
- First-sample preview and dispatch use the same bounded transition scratch.
  Chased notes, due automation and ordinary notes are admitted before any event
  or applied receipt is published, with one full-chain clear per changed track.
- Stopped actions cue silently. One-shot completion retains Session-owned
  silence across global Stop/resume; natural-end restart recalls the cue, while
  explicit track Stop clears it. Global slots and sources remain distinct.
- Pending member replacement, atomic scenes/global Return, full queues, receipt
  collisions, saturation and Stop races pass. The initial snapshot test runs
  stopped and does not establish playing pending-slot coherence. A test-only
  retained ledger accepts 32 combined events and atomically refuses 33; this is
  fault-pressure evidence, not an admitted authored 33-event score.
- PCM/dispatch agree across 1/31/63/64/127/1024 and mixed partitions. Sparse
  eight-track evidence has one sounding Session lane; denser configurations
  retain the explicit 66/64 placement refusal. No bound or curve was weakened.

Final focused suites pass in 45.019842 seconds. The unchanged complete oracle
passes 106,661,824 assertions. One complete native suite passes in 170.643355
seconds, preserving old-version behavior, capacity/guard proofs and original
42 + 42 Stop-stress cycles. A direct current-source non-provisional build proves
shipping refusal. There is no app rebuild, deadline or endurance claim here.

```sh
bash apps/ultra/tests/ci/check-native.sh
```

`focused.sh` and command JSON files retain exact invocations. Initial stopped
Launch RED retains its source/backend/executable. A second isolated mutation
omits synthetic chase from first-sample preview and fails the required atomic
refusal assertion. Intermediate test/compiler failures are retained and
explained in the implementation report.

Only obsolete valid v4 action-refusal expectations were replaced with behavior
checks, under the recorded controller ruling. Seek, loop, audio, shipping and
all unrelated old-version assertions remain. A pending v4 request surviving a
failed optional Seek is explicitly carried into the next slice: that combination
is unreachable while Seek is refused, so no playing-action semantics were added
merely to manufacture the test.

`pins.json` binds sources, real graphs, binaries and raw traces.
`parent-verification.json` independently checks 795 raw hashes, 29 pins and six
committed blobs. It also verifies 145001 finite stereo float32 frames and their
range/nonzero count; this is offline render data, not recorded app playback.
Dispatch, receipt and nonzero work traces are retained here with column metadata.
Full PCM, 27 accepted binary configurations, the dense refused configuration,
initial RED and mutation source/binaries remain under
`/tmp/alive-workspaces-task2c-authority-actions/` and are hashed. The mutation
copy includes unused test dependencies; their hashes are inventory, not a claim
that browser suites ran. Large/generated artifacts are not duplicated here.

Source suffix loops, authority-aware Seek, partial song loops, measured MIDI
admission, Rust/desktop integration, WAV and the native user journey remain open.
