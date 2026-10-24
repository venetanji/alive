# Atomic Prepared Scenes: Task 14

Source `2b1eab1068662b15846b39eef7cb1c91e754a57e`, based on
`7b76c7e72d228ce7bc9a4ef8475013e09c85df54`. This qualifies the scene
increment, not the final musical example, 30-minute run or final CI/packages.
The task requirements, binding design and implementation report are retained
under `contracts/`; the independent review is `contracts/task-14-review.md`.

Scenes submit one prepared row in one native queue entry with one target frame.
Empty slots stop their tracks. Individual overrides replace only their own
members; authoritative per-track masks distinguish applied, superseded,
canceled, refused and unavailable outcomes. Selection, drafts, saved defaults,
editors and device ownership remain separate. Both measured profiles enable
scenes without changing ABI, schema, 16 roots, 1024 events, 32 events/frame,
64 events/1024 frames, 64 queued commands or 128 receipt cells.

## Replay

From the repository root:

```sh
python3 experiments/alive-scenes-m3-20261024/verify.py
# Also check original temporary PCM and binaries while still available:
python3 experiments/alive-scenes-m3-20261024/verify.py \
  --live-root /tmp/alive-task14-evidence
```

`retained-2b1eab1.json` pins 691 original files (14,896,913 bytes), including
failures. Compiled artifacts and raw PCM are excluded from git. The optional
live check streams the PCM, checks exact binary hashes and confirms recorder
process cleanup. `parent-verification.json` records the parent's passing replay.
The first draft of that verifier incorrectly required the release-only timing
run to contain guarded concurrency output, then incorrectly bounded all
reconstruction reads by track count. The corrected checks follow the actual
guard configuration and reconstruction-scan budget; original data is unchanged.
Absolute artifact paths in the timing manifests are optional live checks;
58 relative source/fixture files per matrix remain independently replayable.

## Headless And Timing

`red-1`, `rust-red-*`, `rust-mapper-red`, `ui-red-1` retain initial failures.
The corresponding green/focused outputs, full Rust/native/contracts logs and
full-gate receipts retain the implementation's actual commands/results.
Rust reports 211 passed / 4 explicit ignores; Alive DOM reports 49 passed.
The native matrix covers scene/individual sample equivalence under partitions
1/31/64/256/1024, atomic ingress/refusal, stopped winners, supersession, seek,
Stop/end/fault and receipt reuse. Guarded concurrency records 1,696,675 scene
receipt observations and 49,785 MIXED observations, retaining the same-callback
publication witness. The review identifies one nonblocking missing solo-enabled
scene/sample comparison; Task 15 carries that coverage item.

`proposed-release-1` holds 56 distributions / 67,200 raw timing samples
(1200/case). `proposed-verify-1` holds the separate guarded 56 / 224 sample
matrix and bounded preview/reconstruction counters. The verifier checks every
printed quantile using the probe's actual indexing conventions. Independently
computed nearest-rank p99.9/max for combined 8-track / 16-device policy work:

| Buffer Frames | p99.9 ms | Max ms |
| --- | ---: | ---: |
| 256 | 5.697854 | 5.912639 |
| 512 | 8.804767 | 9.065259 |
| 1024 | 15.514588 | 16.742724 |

The combined scalar-scan/policy-work surrogate is not a proved execution-time
upper bound. The 256-frame large case exceeds its buffer period; larger combined
cases miss the advisory 50% p99.9 target. Small-session guidance remains at
least 256 observed frames; larger sessions at least 512, preferably 1024 near
bounds. Admission does not guarantee physical deadlines. The C++ probe uses
`-O2`; the actual app native library uses CMake `-O3 -DNDEBUG`. The timing core
archive differs from the rebuilt app core archive. Their source and build flags
are retained; timings are not relabeled as actual app callback measurements.
All 28 measured native C/C++ source files match the enabled production bytes;
other retained compiled-source inputs also match the committed source. The
policy prose changed after measurement; the generated saved-graph fixture is a
probe input, not a repository file.

## Actual Native App

`native-scenes-2` is the final short workflow on Linux 7.2.8 Omarchy, Ryzen 9
5900HS, private Xvfb and software PipeWire 1.6.10: 48 kHz, stereo f32,
requested/observed 512 frames. `host-environment.json` retains host/tool/linkage
details. `release-build-manifest.json` and `native-atomic-install.json` associate
the actual apps with a freshly installed native-library inode:

| Artifact | SHA256 |
| --- | --- |
| Alive | a5e8f4504e4a80a173619a82a0015c2c66b52ca63a3852b62487380e9024ffed |
| Ultra | ea63dad5520173b85941520794ffd52a3c56f1ecdaf7484fd4dde6f501d3f205 |
| Native Library | 074f64ddc0b1668bfd2479099cb89ff8c90eb9354cfeb001bb94e095ab477324 |

The executed harness and observations prove eight-track common scenes, mixed
one-member supersession/seven applications, all-eight application, empty-row
Stop, scoped Stop leaving seven tracks, editor reopen/base ownership, history,
save/reopen defaults and stopped remove/add/create/Apply. Screenshots include
`scenes-initial.png`, `scenes-playing.png` and `scenes-final.png`.

All four epochs finalize with witnessed quiescence, no gaps or eviction:
334 + 6503 + 1536 + 1601 = 9974 callbacks / 5,106,688 frames. Lifetime totals and
histograms equal epoch sums. Maximum measured callback processing is 5.013437 ms.
Typed CPAL error/Xrun, native failure, shape/clock/overflow and software
over-budget counters are zero. The timing boundary excludes the final
clock/publication tail. These are software observations, not physical underrun
or scheduling-lateness measurements.

Finite final capture: 2,482,688 frames / 51.722667 seconds, peak 0.131493613,
SHA256 `ff88b82a146ad4b9f4180cf9be29fed2a2e0deb0fb092a4957afcb874e92b843`.
The bounded recorder stopped on request, returned 1 intentionally and emitted
zero stderr bytes. Raw PCM remains temporary. The first scene run is preserved;
its sampler stop/join ordering was corrected before the final run's manifest.

125 resource samples span about 124 seconds. App CPU p50/p95/max is
105.85/127.10/145.02% of one core. App PSS first/last/max is
486910/492992/615643 KiB (+6082 KiB); this short mixed workflow does not prove
steady-state growth. App/sampler/server identity-gap sample counts are 7/9/1,
each with one enumeration gap; the sampler has two unavailable transient fields.
The parent replays 1368 per-process CPU intervals from PID/start-time identities,
raw ticks and monotonic endpoints. Transient/reparented workers can be missed.

## Preserved Failures And Historical CI

The original clip pointer run and two diagnostics are preserved. Initial launch
failure has no proved cause. A later editor click is demonstrably occluded by
expanded Audio details. The authorized harness prerequisite explicitly manages
that disclosure and uses the existing bounded owned-hit-path dispatcher for the
initial launch: one press/release, no action retries, original postconditions.
The corrected pointer workflow passes, including shared-source recovery, and
its script matches committed `check_alive_clips.py` byte for byte. Its finite
11.029333-second capture is independently checked by the optional live replay.
This does not establish that user-facing pointer issues are fixed; the final
native interface audit still owns them.

Exact earlier `7b76c7e` CI run 40084999052 failed the existing immediate Undo
pitch assertion at `check_alive_desktop.py:492`. Browser and UI/contracts passed.
The failure artifacts/log plus two local diagnostic runs are retained. Both
local runs pass the original assertions on the preserved Task 13b release pair;
the remote failure cause remains unknown. No flake or product fix is claimed.

All four both-app package targets passed on that same earlier commit, run
40084999017, publishing skipped. `packages-7b76c7e.json` is historical metadata.
Those packages do not qualify the scene commit or final source. Final exact-head
CI, packages, Linux artifact qualification and the new 1800-playing-second run
remain mandatory.
