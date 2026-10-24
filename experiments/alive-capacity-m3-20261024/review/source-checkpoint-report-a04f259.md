# Task 13b: measured eight-track admission

Status: source checkpoint ready for independent review; final same-source timing
qualification is IN PROGRESS. The actual standalone eight-track release journey
passes. This provisional report is not task acceptance. Parent owns PLAN/ledger,
retained experiments and independent review. Raw evidence root:
`/tmp/alive-task13b-evidence/`. No intermediate run is overwritten.

## Source and scope

Base: `e1f09e5be8398ac631aad84c31a82895e5f54caa`. The implementation adds work
policy 2 and explicitly advertises eight-track admission. Policy 1 remains
unchanged and is selected for sessions within two tracks/six devices. Strict v3
can use eight tracks/sixteen roots; valid legacy v2 retains two/six and the
existing fallback. ABI layouts, one renderer/frame clock/queue/Stop mailbox,
four slots/track, two effects/track, per-track note/lane/point bounds, 1024 stored
events, 32 events/frame, 64 events/1024 frames, 64 commands and 128 receipts remain.
Atomic multi-track actions stay disabled. No scene/schema/engine/MIDI work,
soak, cloud session, credentials, persistent settings or release publication.

Native profile admission is carried through Rust preparation, validation, host
configuration, projection, structural controls and UI capabilities. The host's
shared configuration uses the already existing wide v3 storage; v2 projects its
original six devices/two tracks. Track/root limits reject before opening picker
dependencies; the explicit seventeen-root case rejects before any dependency
access. Desktop Stop-state checks use v3 state for larger clip sessions. Stable
IDs, editor/DSP separation, history, scoped Stop and automation ownership remain.

The actual release workflow exposed a stale adjacent-library ordering defect.
Cargo prepends its output directory to the loader path, so `release.py` now uses
its existing atomic installer before Cargo tests for every tested host. The
loader previously found a stale target-triple library missing
`alive_session_base_v2`; its SHA and export check are retained. Existing mappings
are preserved by fresh-inode installation. The regression first failed on stale
bytes, then all 18 release-script tests passed. Parent explicitly accepted this
necessary release prerequisite in the Task 13b brief.

## Policy derivation and pre-admission decision

| Work | Clears | Scans | Parameter writes | Guard comparisons |
|---|---:|---:|---:|---:|
| Scheduled frame |48|3072|1568|0|
| Scheduled 1024-frame window |288|18432|9280|0|
| Optional frame/window |16|1024|512|9252|
| Emergency per callback |32|0|512|0|

The existing three-pulse frame/eighteen-pulse window derivation scales root and
parameter work: `3*16=48`, `18*16=288`, reset/chase `2*16*16=512` writes,
scheduled writes `3*512+32=1568` and `18*512+64=9280`. Global event/scan and
guard horizons do not grow. Fixed control remains 64 commands/direct writes;
conservative first-frame preview is `8*11+32+8=128` reads. Publication remains
16,592 bytes. The accepted portable mask and stopped-winner reducer are shared.

Internal copied sources measured the proposed policy before shipping admission.
Saved subtractive/utility/stereo-lowpass graphs cover 2/6, 4/8 and 8/16, uneven
two-effect chains, four slots, every admitted voice, maximum graph/parameter
extensions, 1024 events, short loops, aligned switches, seek/reset/chase, full
command bursts, refusals and emergency cleanup. The synthetic combined case
adds 336 clears, 10304 parameter writes, 19456 scalar scans and 64 dispatches to
a real eight-track callback, deliberately overcounting actual work.

Host: AMD Ryzen 9 5900HS, Linux 7.2.8-10-omarchy, glibc 2.44, GCC 16.2.1,
native C++17 `-O2`, 48 kHz. Internal release matrix has 1200 raw samples/case:

| Frames | Eight-track combined p99.9 ns | Maximum ns | Buffer ns |
|---:|---:|---:|---:|
|64|3677869|4019445|1333333|
|128|3888958|4277493|2666667|
|256|4830077|4955904|5333333|
|512|7282491|10150420|10666667|
|1024|10827339|11079986|21333333|

These retain their proposal source hashes in `internal-release-matrix-1`; they
are not relabeled as final shipping timings. Release trace counters are disabled
and therefore unavailable, not evidence of zero work. The separate
`internal-matrix-guard-1` records diagnostic counters and allocation/free/lock
guards. Larger-profile guidance is observed buffers >=512, preferring 1024 near
the bounds; policy 1 keeps >=256. The 50% p99.9 target is advisory. Settings are
never changed automatically and no universal deadline/physical-xrun claim follows.

The original 188-frame populated four/eight-track fixtures reject unchanged:
eight stored events have a conservative 96-event splice envelope, limit 64.
`internal-verify-2` and `internal-verify-3` preserve those failures; the latter
records the typed reason. No authored event is retimed. Eight simultaneous triads
plus two automation events per track explicitly reject observed 40, limit 32.

## Verification to checkpoint

| Check | Result | Evidence below raw root |
|---|---|---|
| Initial native capacity regression | Expected disabled-profile failure | `preflight/red.log` |
| Isolated native verification | PASS | `internal-verify-4/` |
| Diagnostic matrix | PASS, guards/counters separate from release timing | `internal-matrix-guard-1/` |
| Proposed-policy release matrix | PASS, complete raw samples | `internal-release-matrix-1/` |
| Exact shipping native bounded verification | PASS | `final-native-verify-1/` |
| Rust larger-host regression | Red, then green after current adjacent library | `rust-capacity-red.log`, `rust-capacity-green-1.log`, `rust-capacity-green-2.log` |
| UI advertised-capacity regression | Red, then all 46 DOM tests pass | `ui-capacity-red.log`, `ui-capacity-green.log` |
| Native shared-library build | PASS | `native-build-1.log` |
| Full Rust library gate | 206 pass, zero fail, four explicit ignored | `full-rust-1.log` |
| Full native gate | PASS including original v1/v2 tests | `full-native-2.log` |
| Full contracts | Earlier portion PASS; missing jsonschema stopped final portion | `full-contracts-1.log` |
| Remaining contracts under isolated uv jsonschema | PASS, no repeated preceding gates | `contracts-resume.sh`, `contracts-resume-1.log` |
| Release staging regression | Expected red, then 18 pass | `release-order-red.log`, `release-order-green.log` |
| Actual release Rust/app build | Ultra and Alive tests/build PASS; local AppImage tool limitation | `actual-release-2.log` |
| Standalone native eight-track journey | PASS with complete final retirement | `native-eight-3/`, `native-eight-3-runner.log` |

The initial full native gate stopped at an obsolete assertion that profile 2 had
no features (`full-native-1.log`). Only that expectation now asserts exact
ADMITTED plus policy 2; all original v1/v2 tests and event timings are retained.
Full native final concurrent regression used real callback/control/read threads,
one serialized producer and live roots: 2048 callbacks, 1387 accepted and 2709
queue/receipt refusals, 61159 coherent/receipt snapshots, 38 overlapping callbacks.
All tracks terminate after full-queue emergency Stop. The earlier exact-source
guard run records its own counts, not these later counts.

`rust-capacity-green-1.log` failed because Cargo's adjacent non-target library
was stale despite LD_LIBRARY_PATH; `native-atomic-install-1.json` records fresh
inode replacement. `release-stale-library-1.json` records the separate stale
target-triple library and missing export; `actual-release-1.log` retains exit 127.
An early copied-source compile lacked `core/` (`internal-verify-1`), also retained.

## Actual standalone release and desktop evidence

Actual binary:
`apps/alive/src-tauri/target/x86_64-unknown-linux-gnu/release/alive`, SHA-256
`1d4e09709133fa0b6821cff8cfd07fd89075a8bd3780f592098baf674acb4f28`.
Adjacent library SHA-256:
`d486110aa5e53c4f5f0c6c471a4a0de57296bd394790d2f459e6de941439bb47`.
Standalone DEB SHA-256:
`f1d558e4a289e86176e6569941982f99ec692d264652b4037622aadbb08c9bb9`.
`release-build-manifest.json` records paths, fixture/driver hashes and platform.
The production sources were still uncommitted at build time; checkpoint source
association is by exact hashes, not an invented historical build commit.

`native-eight-3` uses the exact standalone binary via ULTRA_TEST_ALIVE_BINARY,
private Xvfb/DBus/PipeWire and temporary settings. Eight independent tracks/
sixteen roots play three held voices each, switch to Clip 2 with applied native
receipts, retain a .65 effect base through editor Close/reopen, retain automated
cutoff ownership while base becomes 1777, exercise gain/mute/solo, and locally
Stop Pulse while all other seven tracks keep their voices. Save/Open preserves
the full document and bases; remove/add track, create clip, Add note, Apply and
playback pass. Final Stop audio witnesses all four epochs retired, native
quiescence and all voices zero. Screenshots: `capacity-playing.png` and
`capacity-final.png`; original script copy: `journey.py`.

Requested and observed PipeWire output are both 512 frames at 48 kHz. The
unsupported-128 attempt preserves the saved 512 configuration. Final lifetime
8511 callbacks, four completed epochs, coverage_gap=false, complete=true,
duration maximum 5616093 ns; zero typed CPAL errors/xrun reports/native failures,
zero invalid shape/clock anomalies/budget exceedances in this finite run. The
main epoch p99.9 histogram interval is (4277345,4466720] ns. These are processing
intervals and backend observations, not physical underrun proof. The complete
per-epoch histograms and metadata are in `capacity-final-epochs.json` and the
cursor-collected `capacity-epochs.jsonl`; resources/worker identities/PSS are in
`capacity-resources.jsonl`. Software capture is 43.626667 seconds, 2094080 frames,
peak .1314936131, finite, SHA-256
`28d90ca694c2472cbb2cbd5d114e5820e7039688d1920c6b82935a73d324cc92`.

Two harness failures precede the passing run. `native-eight-1/failed-value.png`
shows a mouse target under the sticky transport bar: Track 4 never received a
launch request, while the other tracks switched. Focus+Return qualifies the
keyboard journey; it does not claim a pointer repair. `native-eight-2` completed
Save/Open but tried to read hidden transport diagnostics; the harness now opens
the disclosure before reading. Each failed directory retains its exact journey
script. Parent carries the pointer issue into Task 15's single UI audit.

Local release packaging retains the known Arch AppImage tool limitation: cached
linuxdeploy strip cannot read .relr.dyn sections. `actual-release-2.log` contains
the failure after the standalone binary and DEB build. A bounded NO_STRIP probe
from the wrong working directory discovered Ultra and then failed the known GTK
plugin copy path; `actual-release-bundle-3.log` is not Alive qualification. No
source or persistent packaging workaround was added. Parent's final Ubuntu CI
owns AppImage qualification; prior e1f09e5 package results remain prior results.

## Commands and remaining qualification

Commands are from repository root. Rust/build environment adds
`experiments/clockwork-faust/.deps/rust/bin` (and CMake 3.31.6 for release),
sets CARGO_HOME to `.deps/cargo`, ULTRA_NATIVE_LIB_DIR and LD_LIBRARY_PATH to
`apps/ultra/build`. No shell setting is made persistent.

- `bash apps/ultra/tests/ci/check-native.sh`
- `bash apps/ultra/tests/ci/check-contracts.sh`, then
  `uv run --no-project --with jsonschema bash /tmp/alive-task13b-evidence/contracts-resume.sh`
- `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked --lib -- --nocapture`
- `python3 -m unittest discover -s apps/ultra/scripts -p test_release.py`
- `python3 apps/ultra/scripts/release.py build --target x86_64-unknown-linux-gnu --product alive`
- `ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_BINARY=<actual binary above>
  ULTRA_TEST_ALIVE_SESSION=/tmp/alive-task13b-evidence/eight.alive
  ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_capacity.py
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task13b-evidence/native-eight-3`

Pending: same-source telemetry-enabled/disabled raw distributions at 2/6,4/8,
8/16; same-source clock/publication-tail distributions; final shipping native
release matrix; same-binary UI/sampler/diagnostic/capture controls; final source
hash association and report. Diagnostic raw files use exclusive create and retain
64 warmups separately from the reported 1200-sample native distributions.
Existing Task 13a boundaries remain: the final clock/publication tail is excluded
from the in-callback duration and measured separately; CPAL owned Error
construction/destruction can allocate/free and is excluded from the borrowed
typed-action guard. No physical audio, deadline guarantee or endurance claim.
