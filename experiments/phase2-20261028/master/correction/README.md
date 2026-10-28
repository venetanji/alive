# Master rejection observation correction

Reviewed candidate `7ff950f4ab7eba8b6a354084e948f1a801618e6a`, on `d025c91`,
is integrated byte-identically as `f69125cd289365424cd0661975291d8c12a96cac`.
The root contract explicitly amends the rejection counter's observation:
callback-owned score/Master fields share one coherent publication; the
independently updated rejection count is sampled once after that tuple. A
stopped session therefore sees an off-callback validation refusal without
needing another audio callback. No ABI, scheduling, DSP or admission change.

Worker original V2/V3/V4 tests fail at the intended combined baseline+1
assertion while the legacy getter succeeds. Corrected full native, 122 Rust
session tests and the unchanged native Arrangement journey pass. The expanded
preservation witnesses compare all returned legacy/combined score fields
except the counter across two refusals; a deliberate V2 device-revision
mutation fails and restored V2/V3/V4 pass. Hidden prepared storage is not fully
observable through these interfaces. Source spec, scoped preservation and
independent quality reviews have no blocking finding. Original warnings and
failures remain retained.

Root independently runs the full pinned native suite (187.411 seconds, exit 0),
286 Ultra Rust tests (four ignored), one Alive test and a loader trace proving
the corrected build module. Commands, compiler versions, terminal receipts and
library/test binary hashes are under `root/`. `integration.json` verifies all
seven resulting source blobs. Producer worktree diff prefixes are c/w and
canonical commit prefixes a/b; both hashes and byte equivalence are recorded.

The Windows change is test-only diagnostics. It exercises the real cached
production capability in a fresh process and records both anchors, module
paths, export addresses, failure stage and limits. Actual Windows compilation,
runner output, cause and an evidence-supported production correction remain
pending. Linux success does not qualify Windows. The local stale-counter
reproduction does not recover the original cloud assertion's unrecorded
numeric pair.

`manifest.json` pins retained reports, reviews, logs, original Alive screenshots
and omitted local PCM/video bytes. The native desktop journey uses private
Xvfb and software PipeWire, not physical audio. The coherent root application
build is separately pinned under `../../checkpoint-q1/root-build/`; full new
Master save/Quit/restart, endurance and final-head CI/packages remain Task 9.
