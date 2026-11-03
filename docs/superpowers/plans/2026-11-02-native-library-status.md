# Native Library Qualification Status

This is the current stage ledger for the autonomous native-library work. The
implementation plan contains earlier checkpoints as historical evidence. No
profile has passed all ten publication stages; the importer registry is empty.

## Checkpoints

- Approved UI: `ca161c488ee2dcb0c6ba1efa1c43c7b1e36da4af`, pushed on
  `audit/pr12-native-20261102`.
- Native source persistence: `98c11f7c0158d8ad524feec968a809a0458035df`.
- C++ retained-owner transaction: `448a800`.
- Refuse unprepared native state in musical publications: `01b0564`.
- Rust session installation through retained-owner transactions: `00fa6b9`.
- Original Electric widgets and embedded detail visibility: `34d5118`.
- Explicit tagged note-input metadata, with native admission closed: `d27843e`.
- Bounded verified raster decoder/owner: `35c771b`; manual browser selection:
  `a527c22`. Production schematic integration remains a separate slice.
- Accessible Audio disclosure name and expanded state: `88ff3b4`, `2c8043c`.
- Independently reviewed closed C/Rust note companion ABI: `abb28aa`.
- Pinned Clip source header above inspector scrolling: `8034699`.
- Verified original Electric schematic artwork: `92f5b1a`; manual browser
  registration: `f66d0da`.
- Independently reviewed scheduled release event accounting: `fb583bb`.

Native work uses `feat/alive-native-library-20261102` in the isolated checkout
`/tmp/alive-pr12-native-20261102`. The original PR branch and both dirty research
worktrees are preserved. No merge or automatic CI has been requested.

## Device Stages

| Stage | Analog | Electric | Corpus |
| --- | --- | --- | --- |
| Construction | Passed in controlled exact-DLL probes and ordinary Ultra host | Passed in controlled exact-DLL probes | Passed in controlled exact-DLL probes |
| Complete original initialization | Partial: installed preset lacks five hidden vector fields | Partial: installed preset lacks separate dummy pitch-bend field | Unrun; original saved default model retained, native initialization unqualified |
| Audio | Controlled note output; original state/host policy remains partial | 17 controlled musical cases pass under explicit fresh-instance policy | Real input causality established; wet/default behavior unqualified |
| Model/native mapping | Current static bridge covers 203 slots through 172 groups/175 explicit fields | Current static bridge covers all 33 slots | Unrun |
| Original editor | Partial; historical shared bindings remain separate from current static bridge | Partial; 33 static displays resolve, zero inputs enabled | Unrun |
| Saved native state | Ordinary Ultra commanded-state/history/destroy/reopen passes; Alive per-instance persistence passes | Controlled edited destroy/reconstruct matches one symmetric PCM case; ordinary host integration unrun | Unrun |
| Multiple instances | Ordinary Ultra and retained-owner tests pass; Alive native admission closed | Controlled independent instances pass; ordinary host integration unrun | Unrun |
| Musical lifecycle | Synthetic bounded release and owner/time continuity pass; session callers unqualified | Controlled notes/release/retrigger pass; session callers unqualified | Unrun |
| Timing/admission | Unqualified | Private actual-bank observations complete; eight instances/four keys miss deadlines; full Alive path unqualified | Unrun |
| Alive library/loading | Unrun; unavailable | Unrun; unavailable | Unrun; unavailable |

Mapping completeness does not establish original defaults, editor fidelity,
native readback, musical lifecycle, timing or Alive hosting. Five explicit
Analog hidden values and Electric's separate dummy field are not substituted
from descriptor minima, auxiliary values or unrelated saved fields.

Corpus requires an effect input contract. Its native stereo buffers carry
input and output in place; the final activity integer is an input and output.
Aliasing left/right produces a different result (exactly four times the
disjoint-buffer witness). Separate persistent per-instance buffers/context and
qualified initialization are prerequisites. The output-only instrument adapter
and shared loader admission remain unchanged.

## Software Evidence

Private evidence root:
`/home/venetanji/.cache/alive-ultra-evidence/native-library-20261102`.
Installed binaries, presets, XML/artwork, disassembly, captures and raw probe
output stay there. Only authored interoperability facts/adapters/tests enter Git.

- Full JavaScript/component/profile run: 781 passed, zero failed/skipped
  (`check-contracts-continuation-r3.log`), with exact installed resource/raster fixtures.
  All 35 importer tests also pass at their prior checkpoint.
- Configured browser run before raster registration: 402 passed, one skipped
  (`frontend-browser-full-r4.log`). The private border comparison lacked its XML
  fixture variable; it was not passed in this run. The earlier r3 run passed all
  402 configured tests. Separately, the integrated raster/resource checks pass
  13 Node and eight Chromium tests with exact private fixtures. These separate
  executions are not one full configured browser run after registration.
- Subsequent complete configured Chromium run after raster/schematic registration:
  420 passed, zero failed/skipped (`frontend-browser-full-r6.log`), with all
  private resource fixture variables supplied. The full contract script also
  passes with the pinned schema dependencies (`check-contracts-continuation-r3.log`).
- Audio disclosure regression fails before the expanded-state fix, then passes
  both focused Chromium checks and 109 adjacent Node checks. The native smoke
  reads four consecutive diagnostics without closing the disclosure.
- Native-enabled adjacent Rust session suite: 132 passed
  (`host-batch-native-on-session-r2.log`).
- Integrated companion native-enabled Rust suite: 318 passed, five ignored,
  one excluded (`integrated-companion-full-rust.log`). The excluded CPAL instrumentation failure
  `audio::instrumentation::cpal_owned_error_destruction_is_separate_from_the_typed_action`
  was independently reproduced on the untouched UI checkpoint. It remains open.
- Fresh complete optimized Rust suite with the pinned Rust 1.85.1 toolchain:
  319 passed, five ignored, zero failed/filtered (`continuation-release-rust-full-r2.log`).
  The earlier excluded instrumentation case passes in this configuration; this
  does not explain or erase its earlier development-build failure. Alive's
  separate executable/context test also passes (`continuation-alive-release-rust.log`).
- Explicit ordinary Ultra native source/history test: one passed
  (`host-batch-ordinary-native-history.log`), requiring the opt-in adapter and
  exact installed Analog DLL. This does not qualify original initialization.
- Retained-owner C++ tests cover native-on/off ordinary documents, real Analog
  banks, no-adapter refusal, stale revisions, borrowed-memory lifetime and late
  binding failure. Independent ASan/UBSan probes pass; linked core archives in
  those probes are uninstrumented.

The host regressions first failed because preparation was not staged before
reset and rollback revisions were not reserved. A second regression caught
overflow at the final revision. Green coverage also restores a root omitted by
the failed candidate and directly checks that fatal rollback leaves driver I/O
retired and the native session unconfigured/stopped.

The released shared renderer adds the original six composite dials, R/W radio
structure and preserved row-title containers. Resource padding no longer clips
valid 17/33/36-unit insets. A subsequent independent visual review found that
embedded Size330x80 still clipped 98-unit detail content; a failing regression
now covers content visibility and explicit fixed constraints. The corrected
embedded minimum height exposes every lower-row input. Module navigation now
announces the visible Hammer/Fork/Damper-Pickup/Global headings. Ten focused
geometry/widget tests pass; all native parameter inputs remain disabled.

Independent visual and mechanical assessments retain source hashes, browser
observations and captures privately. The source detector reports zero findings,
which does not qualify generated DOM or original fidelity. Schematic artwork,
splash/card/header proportions and original knob drawing/angles remain open.
The new profile/importer/widget tests are explicitly selected by the existing
manual CI scripts. Workflow triggers remain manual-only.

Electric's private CPU-pinned bank/runtime matrix covers eight instance/key
cases and 5120 callback observations. Finite audio, commanded acknowledgements,
retrigger/release and fresh rearm checks pass. Eight instances/four keys exceed
nominal deadlines at 64/128/256/512 frames; the worst observed ratio is 183.32%
at 128 frames. This excludes the full Engine tick, driver and Alive queues and
does not establish a playback capacity or admit any native profile.

The independently reviewed tagged-input slice evolves the current development
manifest v2 directly: PolyNote and native-instrument identities are explicit,
and native input requires exactly one complete matching source sidecar. Alive
still refuses it before staging, reset or foreign construction. Independent
checks pass 103 Node, 82 Rust canvas, two extra sidecar/nesting checks and private
browser malformed/foreign cases. The five saved example reference hashes and
13 generated library input tags were verified exactly. Actual user projects
were not rewritten. The new subtractive canonical fingerprint is
`b801087baafd7b8989922974023c3db478dac1a7a172eabfb3853e5b95ddea97`.

Manual CI run [41470547645](https://github.com/venetanji/alive/actions/runs/41470547645)
at `07ae615` passes UI/protocol/reference and Chromium jobs, but fails native
adapter compilation: the retained-owner helper used C++20 `std::popcount` in
the strict C++17 test path and triggered misleading-indentation warnings.
Rust, desktop and downstream loopback gates therefore remain unrun in that run;
the later Arrangement/Master steps also fail because the desktop binaries were
not built. This is not Arrangement or Master runtime evidence.

The subsequent manual CI run
[41487101812](https://github.com/venetanji/alive/actions/runs/41487101812) at
`60ba107` passes UI/reference, Chromium, native adapter and Rust/build steps.
Desktop, Arrangement and Master fail finding the Audio details accessible
target. This run predates both accessible-disclosure fixes. Downstream clip,
resource and loopback gates are skipped, not passed.

The compile regression reproduces locally under C++17 with strict warnings.
The helper now uses C++17 population counting and separates conditional writes
from unconditional returns/deletion. Its transaction test also rejects excessive
and out-of-range ownership masks, and is selected by the manual native script.
The complete native CI script passes locally against the current Release native
build (`native-ci-local-cxx17-r3.log`), including retained-owner transactions,
callback allocation/lock guards, workspace admission/publication, capacity and
queued-edit Stop regressions. The old private build directory was found stale;
the local test-build symlink now selects the new private native build. Prior
artifacts and launcher snapshots remain intact.

After companion integration, the complete manual native script passes again
(`integrated-companion-native-ci.log`), including the new actual-library exports,
strict C++17 metadata/refusal and synthetic installed-binding checks. Full Rust
results are recorded above; the known baseline exclusion remains explicit.

An earlier launcher checkpoint selected paired `2c8043c7896b25e8d0f5dd37af8b23e241f6f7f4`
dev desktop binaries with Release native DSP, snapshot
`test-805a384ad7595aef5435`. All 18 snapshot hashes and both launcher targets
verify. Collection provenance is read directly from Git; the unchanged native
sources last changed at `60ba107`. Software-only Alive session and Ultra
instrument probes pass. Actual Tauri/WebKit native smoke checks pass at 800x600,
1280x800 and 1440x900, including consecutive accessible diagnostic reads and
repeated Clip/Device toggles, with inspected captures in
`paired-native-smoke-2c8043c/`. This does not qualify native instrument playback,
physical hardware, or full desktop acceptance. Existing windows retain their
original builds.

Both launchers now select paired `fb583bb5d8addeb9c5dc57c7441d8663711a5fdb`
development desktop binaries with matching Release native DSP, snapshot
`test-0c062a858e20c4bdbf25`. All 18 artifact hashes and both launcher targets
verify (`paired-build-fb583bb/selection-verification.json`). The desktop pair
uses system Rust 1.99.1; the separate release Rust tests above use the pinned
1.85.1 toolchain. Actual native Clip-header checks pass at 800x600, 1280x800
and 1440x900, including inspector scrolling and owned source open/close targets;
all three captures were inspected (`paired-native-smoke-fb583bb/`). Existing
windows and earlier snapshots remain intact. Native instrument admission stays
closed in this build.

An attempted concurrent full/Arrangement/Master local run is invalid acceptance
evidence: the installed xvfb-run -a can race display allocation, and Arrangement's
owned-input guard observed another test window covering its target. All three
attempts failed; no UI or playback conclusion is drawn from them. Native journeys
are now serialized. The original Return/gap question and all downstream gates
remain open until a clean run produces their actual evidence.

A clean serialized Arrangement retry at `2c8043c` fails earlier at the Source /
Clip disclosure. The owned X11 window is correct, but the accessible center hit
stops at Clip properties: its vertical scrollbar overlaps the header edit icon.
The guard sends zero presses. This is a UI reachability blocker, not new Return
or engine evidence; the proposed correction pins the header above the existing
scrolling option groups. Native verification of that correction remains open.

The closed companion retains the existing ABI and adds strict prospective source
and installed bank/binding identity proofs. Pure refusals preserve global score
and diagnostics, including reset-retained preparation freshness. Independent
OFF/ON adversarial, reordered two-root built-in, synthetic binding and ASan/UBSan
checks pass; retained core archives were not instrumented. Native feature masks
and max_native_roots remain zero. Mixed native candidates still return
FEATURE_DISABLED after common bounded checks; this is not measured native
playback qualification. Host wiring, release accounting and state transactions
remain separate prerequisites. C++17 companion regressions are selected by the
existing manual native script, with no automatic workflow changes.

The first release-accounting slice now charges the final automatic/optional
clear union once in the scheduled event ledger, then adds actual due/chased
records. Stopped and final-None candidates retain release cost. All nine focused
test groups and 39 independent ASan/UBSan cases pass; the independent envelope
oracle retains 110,195,654 assertions, and archived zero-release traces and
optional ledgers compare byte-for-byte. Its focused regression is selected by
the existing manual native script, whose complete fresh run passes
(`integrated-release-native-ci-r2.log`). Production release bounds remain zero.
This slice does not qualify future/rolling release envelopes, emergency queue
or event reservations, native lifecycle routing, or native admission. Those
remain separate reviewed dependencies; a passing arithmetic test cannot enable
an instrument.

## Acceptance Continuation

The continuation starts at `744d6f60d700679b2375dce1ec9be324067f7c98` with
reviewed test-harness changes. Application code remains the paired `fb583bb`
launcher snapshot described above. Fresh selection verification rehashes all
18 artifacts and checks both desktop entries
(`continuation-selection-verification.json`). No application or engine change
is part of this acceptance batch.

The complete serialized Arrangement journey passes through save/restart
(`paired-arrangement-fb583bb/`). Its correlated Return record retains request
serial 7, preparation revision 1 and bar quantization; pending absolute/song
frames are 1615360/129941. The target song frame is 205714, at the start of gap
`[205714, 244286)`. The applied observation is at absolute/song frames
1693184/207765, inside that gap, with Arrangement authority and null active
source, placement and slot. The sibling Session source remains active and the
rejection count is zero. This current evidence satisfies the original musical
expectation without an Arrangement engine change; it does not retrospectively
establish the cause of every earlier failed run.

The dedicated native-input journey passes
(`paired-native-input-final-fb583bb/`). It retains the original two-track
resource refusal (observed 20, limit 18), complete saved-state equality across
that refusal, and exact rejection counts 0 -> 1 -> 1. Its explicit bounded
one-track phase adds both effects through real choosers, proves exact instance
reordering/restoration, blocks a foreign covering window with zero button
events, then succeeds with one owned press/release after removing the cover.

The full desktop retry passes Note editing, music/history/mixer/editor checks,
save/reopen and failed-input isolation, then fails on its obsolete Remove-device
button lookup (`paired-desktop-final-fb583bb/`). Native evidence separately
proved that an expanded Automation inspector covered the Note control; the
reviewed navigation correction closes Automation before opening Note through
owned disclosures. The subsequent deletion correction uses the approved
Delete-key route with stopped-transport, current accessible focus and native
window ownership checks, expected acknowledgement and exact target absence.
The complete rerun passes (`paired-desktop-keyboard-final-fb583bb/`), including
both exact accessible selection paths, native input focus matching owner
4194307, one Delete press/release per target, and all subsequent close/cancel/
quit assertions. The original failed attempt remains retained as failed evidence.

Independent spec/quality reviews report no findings for the aggregate harness
batch and its admission, Note-navigation and keyboard-deletion increments
(`workers/acceptance-current/`). The complete Python helper run passes
195 tests before the keyboard-deletion increment
(`continuation-python-helpers-final.log`), then all 199 tests after it
(`continuation-python-helpers-keyboard-delete.log`). The full desktop rerun
passes with zero rejected commands and zero reported stream errors.

Manual CI run
[41505550977](https://github.com/venetanji/alive/actions/runs/41505550977) at
`2804cab8337d97c0863b7cc1a78ca55ad5e374ef` finishes with failure. UI/protocol/
reference, 407 cloud Chromium tests, native adapter/build/headless checks,
319 Rust tests (five ignored), the full desktop/hosted-editor journey and Master
save/quit/restart pass. Chromium also skips 13 private-resource tests in cloud;
the local 420-test run supplies their original-resource fixtures and skips none.

The original Return-into-gap expectation also passes in this cloud run. Serial 7,
preparation revision 1 targets absolute frame 2405373 / song frame 205714, the
start of gap `[205714,244286)`. The applied observation at absolute2407936 /
song 208277 is inside that gap, with Arrangement authority and null active
source/slot/placement; the sibling Session source remains active and rejected
commands remain zero. The complete correlated record is
`workers/ci-41505550977/arrangement-return-gap-correlated.json`.

Arrangement later fails at the global Return button's native-input admission,
before any press or release. Its current rectangle is `[534,33,26,23]` and the
native path reaches owned window 4194307, but walking the accessible ancestor
raises `Error` at node 2. The existing receipt omits the failed operation and
exception text, so its underlying cause remains unresolved. No global Return
command was emitted. This is not evidence of an incorrect native musical route.
Clip observation, saved-clip/epoch measurements, editor-resource bounds and the
dedicated CPAL loopback gate are skipped after that failure, not passed. CI
endurance was explicitly off; successful always-run artifact uploads do not
change these test outcomes. Logs, 104 retained file hashes and independent review
are under `workers/ci-41505550977/`.

The diagnostic-only follow-up now retains the failed ancestor operation,
exception type and a message bounded to 512 characters. Unprintable exceptions
retain the original unavailable result through a formatting fallback. Fresh
checkout regressions fail before the correction and all 204 Python helper tests
pass afterward (`ancestor-diagnostic-checkout-{red,helpers-green}.log`).
Independent review reports no findings
(`workers/arrangement-ancestor-independent-review-r2/report.md`). Input guards,
retries and press/release admission are unchanged; this records future failure
evidence and does not fix or requalify the original cloud error.

Master save/quit/restart and all four clip-observation modes pass
(`paired-master-final-fb583bb/`, `paired-clip-{normal,write-error,blocked,input-error}-final-fb583bb/`).
These independent journeys use an immutable private harness snapshot, with
per-file hashes, while the deletion helper is reviewed. Saved-clip/stream
measurements also pass: six completed epochs, 6.063 seconds of conservatively
proven playback, three automation/base/restoration cycles and zero sampling
errors (`paired-observability-final-fb583bb/`). The eight-cycle editor-resource
check passes (`paired-editor-resources-final-fb583bb/`): after the first closed
editor and final idle, descriptors remain 127, WebKit web processes remain one,
and PSS grows from 511322 to 524871 KiB, within the unchanged test bounds.

Private CPAL loopback passes with 151552 finite stereo frames at 48 kHz,
including stop/start and settings reload (`continuation-cpal-loopback/`).
The capture's exit 1 is the supported PipeWire SIGINT shutdown; stderr is empty
and the PCM/Rust probe passes. All audio evidence is software-only; physical
hardware remains unqualified.

The full 1800-playing-second endurance attempt fails at the unchanged
2700-second collector wall limit (`paired-endurance-1800-2804cab-r2/`). The
wrapper exits 1 after 2710.240 seconds and verifies every Python test source is
unchanged from the recorded 2804cab test revision. The paired application remains
the immutable fb583bb snapshot. Its last cycle checkpoint credits 1746.858
seconds; the complete playing log credits 1777.527 endurance seconds, still
22.473 seconds short. Final retirement, epoch qualification and remaining
journey assertions were not reached. Recorder cleanup completed with empty
stderr and 884281344 bytes of software PCM; cleanup does not pass the journey.
One callback took 30.552494 ms against its 10.666667 ms buffer budget, while
reported CPAL errors/xruns and native render failures remained zero. The initial
walkthrough consumes about 397 seconds of the same collector clock, and 13
endurance diagnostic log calls consume about 142 seconds. Slow reads can also
exclude playback intervals from conservative credit; the overlapping timing
categories are not summed or treated as engine stalls. This failed gate must
remain separate from the successful shorter journeys and physical hardware.

The proposed physical-device procedure remains in
`docs/ui-review/2026-11-02/HARDWARE-CHECKLIST.md`, unexecuted. It requires an
agreed baseline, safe output level and restoration procedure before consequential
device/settings changes. Native instruments, routing and recording remain
unavailable; the software passes do not qualify those features.

The next proposed engine dependency is a pure release-aware envelope proof,
followed by optional rolling-horizon accounting, under synthetic nonzero release
inputs. Production callers must remain on zero release bounds and native
admission must remain closed. The private read-only design review is
`workers/release-accounting-slice2/design-review.md`. Emergency reservations,
policy propagation, real native lifecycle, initialization, editor transactions
and measured admission remain separate dependencies; no slice-2 production
change is included in this checkpoint.

The current Electric visual reconciliation confirms that earlier embedded
clipping, repeated module labels and schematic placeholders are fixed. The next
bounded visual correction concerns schematic placement across the existing
four pages at one recorded original-host scale. The coordinator captured all
four pages after Stop
in a separate reference session, preserving the user's saved tune. Electric r7
pins those captures and read-only display/theme observations with manifest
`feeee9c218f92c0d980847398e18db703e8e663fad24e019bb67b3a6955850a8`.
Live shows 102% zoom and HiDPI On; the host log reports scale 1.6041667.
Compositor scale 1.6 and configured Wine LogPixels 154 are separate evidence.
The initial Fork capture showed playback for an unknown reason and is excluded;
the acquisition must not be described as continuously stopped. Parameter,
audio and physical settings were not edited. Measurements support centering both
90x90 artwork layers at aggregate cell-relative `(8,4)` in the 106x98 cell.
This is an inference at one display configuration; it does not establish the
transparent StackView's internal allocation, selected raster family, native
resampling or other scales. The implementation is restricted to the exact
Electric subtree and preserves generic StackView behavior. Dial angles,
automatic DPI selection, click-map interaction and native admission remain
separate. The frozen measurement report is
`workers/electric-placement-r7/report.md` (SHA-256
`74ab45c6530ce6b3ea77b651a9a8f8f5d86a0fe2ecac5586ecf1176a738f7e43`);
independent scope review accepts the proposal with no blocking findings
(`workers/electric-placement-r7-review/report.md`).

The bounded placement correction now has retained RED/GREEN regressions and
independent implementation/visual reviews with no blocking findings. All 798
Node tests pass with the private resource fixtures; the seven focused Chromium
schematic tests pass, including all four pages and captures at 800x600, 1280x800
and 1440x900. The subsequent full browser run passes 419 tests and skips the
private Analog packet check because its environment variable was omitted
(`electric-placement-full-browser-r1.log`). That exact skipped check passes
separately with its verified packet (`electric-placement-analog-packet-r1.log`);
these executions are not one all-passed full run. All 16 page/size captures were
inspected independently, including the additional 390x844 case. At 390 pixels,
the existing panel viewport crops horizontally; Global scrolls left and clips
three CSS pixels of the cell boundary while the artwork remains complete.
Desktop artwork and lower detail rows are complete. Full-panel typography,
dials, borders/theme, extra width, click-map interaction and native DPI/sampling
remain unqualified. The frozen visual report is
`workers/electric-placement-visual-review-r1/report.md` (SHA-256
`72408f52d35d3ace3cdd7d6a592d0c3cbf5755d14b573874b8262a6f5c5eb82b`).

Corpus r2 now retains a separate original-host default-state witness. In the
existing disposable reference session, the coordinator inserted an empty audio
track, loaded the original Corpus device through Browser search, captured its
stopped panel and saved the set under the private evidence directory. The user's
saved tune remains on disk. The clean saved set contains exactly one Corpus
model with 39 direct Manual fields, plus the earlier Electric reference. The
19,018-byte original `.als` SHA-256 is
`a15592d5e081127a0bc8298188614e36e64b8e10302f5c2e6f28e3459087eab4`.
Packet r2 SHA-256
`c4c25dc51376d41e8e1216e08269cd7289fa17a73cad8a5510285bd39cd8befe`
verifies four installed artifacts, 34 retained files and four findings.
These saved model values do not establish raw native slot encodings, hidden
initialization, wet-audio behavior or Alive support. No playback, recording,
musical parameter or audio/physical setting change was requested during this
acquisition. Failed capture/input attempts and the separate GTK portal Save
target are retained in its journal rather than counted as successful evidence.

The fully configured local Chromium rerun passes all 420 tests with zero skips
(`electric-placement-full-browser-r2.log`). The selected paired 7259223 build
also passes actual Tauri/WebKit layout smoke at 800x600, 1280x800 and 1440x900,
including repeated independent Clip/Device toggles and visible target bounds
(`paired-native-smoke-7259223-r2/checkpoint-native-smoke.json`). Both desktop
launchers select immutable snapshot `test-adb7ac8e2dd2eb25bd95`; all 18 artifact
hashes and both launcher targets were verified. This is software UI evidence,
not native-device admission or physical hardware qualification.

The failed endurance audit additionally derives a stricter 1775.460-second
post-baseline lower bound, excluding the interval crossing baseline assignment.
Both that bound and the helper's 1777.527-second total fail the unchanged
1800-second requirement. The frozen audit is
`workers/endurance-2804cab-review/final-report.md`, SHA-256
`8a549a1be65c07511515a2147a301cb9913fdd6fbe76bcbc1e40cbc2fc9db92c`.

Corpus's bounded static follow-up establishes 38 emitted host source records,
45 local model registrations and 37 regular native descriptors (indices0..36).
All 38 emitted fields have saved Manual values; saved On is not emitted. The
extra host ordinal37 is MidiMode, not a regular descriptor37. Its outer setter
store falls outside the descriptor catalog and the generic fallback rejects it.
No descriptor or runtime probe is invented for that ordinal. The final
indexer-to-native-export edge and numeric module IDs remain unqualified. This
is ordinary PE/Capstone static analysis, with no target execution or admission.
The report is `workers/corpus-vector-static-r2/report.md`, SHA-256
`da8caf8cd8d8a19e89d824e629b335f9015c8a2f3f8354e0d17bf912020c5612`.

Release-aware envelope checkpoint A now accepts only a private synthetic
per-track input0..4, zero beyond configured tracks. It composes separate
clear-occupancy curves, includes finite exit and local prefix/loop seams, and
caps overlapping causes at one clear per track/frame. The same input reaches
regular/launch/base/Preview proofs. Every production caller still supplies zero;
there is no policy source, ABI, native lifecycle, resource-limit or admission
change. RED regressions precede the implementation. The independent scalar
oracle passes 57,671,680 assertions; baseline and all-zero serialized envelope
and MIDI proofs compare byte-for-byte, and eight adjacent native suite outputs
match after normalizing timing/concurrent-reader counts. An independent UBSan
oracle passes 1,746 geometries / 9,871,232 checks with no actionable review
findings (`workers/release-proof-a-independent-review/report.md`). The manual
native CI script now invokes all four release-envelope modes and the standalone
base/launch/Preview test. Checkpoint B's rolling optional horizon, emergency
reservations, policy propagation, actual releases and measured admission remain
unfinished. No profile qualifies for library publication.

The diagnostic batching follow-up reduces repeated accessibility traversal while
retaining the same 14 fields and conversion rules. Each read strictly enumerates
the owned showing Alive frame and a complete unique control set afresh. Unknown
PID, null child, unreadable sibling, duplicate/missing frame or control and
transient errors fall back to all incumbent per-control reads. Independent
review caught a permissive sibling-enumeration case in r1; RED regressions and
the strict r2 correction close it without changing the shared frame finder.
All 215 Python helper tests pass; independent r2 review finds no further issue
(`workers/endurance-diagnostics-batch-review-r1/report-r2.md`). Actual selected
native-build smoke accepts all three fresh scans
(`diagnostics-native-smoke-r2/diagnostics-native-smoke.json`). This changes no
musical input, input guard, clock origin, duration, resource limit or acceptance
assertion; the full endurance rerun is still required.

Checkpoint A is committed as `ebf4297`; the strict diagnostic batching is
`099418fafc604a50d0e367f68d2fd3f75eca1647`, both pushed. A fresh paired build
from 099418f preserves its tracked build inputs and selects immutable snapshot
`test-d20978452380364c1edb` in both launchers. All 18 snapshot artifact hashes
and both targets verify (`paired-build-099418f/selection-verification.json`).
The native library SHA-256 is
`98c637566d67c9849395c6213c808592d3ee4c91d75b360aef38397bb01e1c3c`.
The entire manual native script passes against that build
(`release-proof-a-full-native-r2.log`), including the newly registered proof
modes. Its first setup attempt lacked the private diagnostic executable; that
failure remains in r1, followed by building the missing target and the full
successful r2. Root's standalone oracle rerun also passes the legacy
110,195,654 assertions and the new 57,671,680 release assertions.

Actual selected-build layout smoke again passes all three desktop sizes and
repeated Clip/Device toggles (`paired-native-smoke-099418f-r1/`); the coordinator
inspected every restored capture. The 1800-second endurance rerun now uses this
snapshot and the unmodified 099418f Python/shell sources, with their complete
hash manifest and unchanged 2700-second collector wall limit. It remains
running at this checkpoint; no pass is claimed. Diagnostic batching's 11
regressions are also registered in the existing manually invoked CI helper
step; automatic workflow triggers remain disabled.

Electric's bounded static getter follow-up resolves `ATimeableFloatCurrentValue`
slot61 through its own converted current cache. It does not read the separate
manual object. This corrects the earlier private reconciliation table's claim
that the predicate directly tests stored manual value; saved real zero alone
does not prove the current predicate false. The separate common binding
connects the real property to `MpePitchBendRangeAutomation` and a receiving
`InMpePitchBendRange` port. Its dynamic receiver/processor remains unresolved;
there is no demonstrated dummy derivation or initial slot32 publication. The
new reports are `workers/electric-range-leaf-r1/report.md` (SHA-256
`6b3b7cfe40de39e79bbad06eb955e6eb7d633b0c459a54a275d86a0ee3293556`)
and `workers/electric-policy-binding-r1/report.md` (SHA-256
`62ccde151ca67bc840512db5ba0b1fa9028bf761f38d032c34c0723bbdd89874`).
They are ordinary bounded PE/Capstone observations, not REA or runtime values.
Original initialization, native admission and all ten-stage publication gates
remain unchanged.

## 3 November Continuation

Manual CI [41517331264](https://github.com/venetanji/alive/actions/runs/41517331264)
passes at exact head `d838c7f2d7f598ae909a2a56332ab1003cf1b106`. Native desktop
and hosted editor, the full Arrangement journey, Master save/Quit/restart, all
four clip-observation modes, six saved-clip stream epochs, eight-cycle editor
resource bounds and private CPAL software loopback all execute and pass.
Node reports 783 passed/15 private-fixture skips, Chromium 407 passed/13
private-fixture skips, Rust 319 passed/five ignored, Alive's executable test
one passed, and the explicitly registered diagnostic helpers 149 passed.
The Plus008 checker passes, but its licensed oracle and 11 oracle items remain
unavailable. Endurance is off in this run. None of those exclusions or physical
hardware receives pass credit.

The correlated Return request has serial 7/preparation 1 and bar quantization.
Its absolute target is 1586685, corresponding to song frame 205714, the start of
gap `[205714,244286)`. Application is observed three frames after the target,
inside the gap, with Arrangement authority and null active source/placement/
slot; the sibling Session source is preserved. This satisfies the current
expectation without an Arrangement engine change. The historical short-gap
failure's cause and the separate earlier accessible-ancestor failure remain
unresolved. Independent review identifies no findings within the exercised
gates; report SHA-256 is
`f9359bddc1084695d42f8a976003c3c76064b13d82c901e92457a26dec927379`
under `workers/ci-41517331264-independent-review/`.

Manual CI [41521761339](https://github.com/venetanji/alive/actions/runs/41521761339)
passes at `563671f0dadbf3cf222d8c1ad3aa82170ea9ad13`. The same software-native
gates all execute and pass, including downstream observations, measurements,
editor resource bounds and CPAL. Counts remain Node 783 passed/15 skipped,
Chromium 407 passed/13 skipped, Rust 319 passed/five ignored and Alive executable
one passed. Desktop helpers now report 160 passed across 17 modules, including
diagnostic batching. Return serial 7 targets absolute 1583613/song 205714;
the applied observation is 3075 frames after target at song 208789, inside
`[205714,244286)`, with Arrangement authority and null active identities.
Six epochs prove 8.35346790499985 playing seconds with no errors or budget
overruns; maximum callback duration is 9375710 ns. Independent software PCM
parsing confirms 151040 finite stereo frames and empty capture stderr.
Endurance is explicitly off. The independent report has no findings within
these gates, SHA-256
`3f9bd96b8519681903f8c1e759ceeb7b93508d29db8da24077e0959ddb3e6716`
at `workers/ci-41521761339-independent-review/report.md`; the coordinator
rehashes all 23 selected inputs and five review outputs.

Local endurance `paired-endurance-1800-099418f-r1/` passes on the selected
099418f build: wrapper exit 0 after 2669.371189594269 seconds, with all recorded
Python/shell test sources unchanged. It conservatively credits
1804.3711025703742 playing seconds across 11 edit/transport cycles. Final
Quit/discard, dirty-guard cancellation, save-picker cancellation, stream
retirement and all five epoch qualifications execute and pass. Epoch totals
are zero for native render failures, invalid callback shapes, CPAL errors/xrun
reports and processing-budget exceedances. Software capture contains
104342528 stereo frames, 2173.8026666666665 seconds and peak
0.08945509791374207, with 834740224 audio bytes and empty stderr. Recorder
status 1 is the retained supported SIGINT shutdown, not an asserted zero exit.
The collector's complete final record credits 1806.7221852313742 playing seconds
including later post-capture actions; these are not substituted for the
endurance segment's conservative duration. Physical underruns remain unmeasured.
The maximum observed callback duration is 6076026 ns against the 10666667 ns
buffer budget; all 223333 entered callbacks have timing samples.
The collector excludes 38.798605221076286 uncertain seconds. Its gap log retains
643 transport-read-shape records and 979 observation-gap records; no claim of
continuous readable UI observation follows from complete native epoch retention.
The credited duration excludes uncertain intervals. Coordinator validation
rehashes the PCM, all five declared streams and all 18 selected artifacts:
`paired-endurance-1800-099418f-r1/coordinator-validation.json`, SHA-256
`40083e9ce7ef34bc2293a78cd0644dbf225eae6aec0b28d9fa29bfd5030dbac5`.

The actual run stays within the unchanged 2700-second collector, 1 GiB audio
and 64 MiB metadata bounds. Final metadata is 49960742 bytes. The separately
reported conservative pilot projection still fails collector headroom:
with 10% variability it projects 2871.035582012744 collector seconds, above 2700
and below the required 5% spare margin. That projection is not a passed planning
gate; actual completion does not promise repeatable margin or heavier native
workload capacity. Earlier failed endurance attempts remain failed evidence.
The quiet window is released only after wrapper completion; B and C1 may now
use at most two sequential compiler streams in total. No original application
or physical settings were changed for this software test.

Checkpoint B is accepted from the isolated synthetic rolling-horizon worktree
`/tmp/alive-release-horizon-b-20261103`. Its public stopped-Seek regression
demonstrates an accepted retained 61 plus pending release 4 before the correction.
The event bound retains the incumbent envelope and also covers
pending first debit plus a j-1 tail at positive-width cuts. All production
release inputs remain zero. Four final baseline runs fail at the intended
semantic assertions; all seven GREEN modes pass 19952 public reducer proposals.
The 55803520-byte R0 snapshots compare byte-for-byte, SHA-256
`bcff4893c8a53bdf3383db7563a3254a5edb9bb71f5acfb63ae3b42f94061405`.
All eight adjacent built-in/release-accounting suites pass on baseline and
changed source; only explicitly retained timing/concurrent-reader values need
normalization. Independent review repeats fresh RED/GREEN/R0 and an additional
UBSan scalar oracle: 15360 proposals, 9248 accepted/6112 refused and 332799744
literal window comparisons. It reports no findings, SHA-256
`e458b66d57c4d9cb81570e5de3ce82ce1904b49f69f1f400d6688479d7b268d8`
at `workers/release-horizon-b-independent-review/report.md`.
The coordinator applies the exact frozen two-file patch, registers all seven
modes in the existing manual native runner and independently compiles/runs them
successfully (`release-proof-b-root-integrated-r1/`). Earlier provisional-macro
and generated-header setup failures remain preserved. No source policy,
callback loop, ABI, event/work limit, guard or native admission changes.

C1 is a separate, pure synthetic reservation model, with no production callers.
The selected policy leaves four physical queue slots whenever keys are held,
keeps the emergency token inside the shared 32/frame and 64/window event budgets,
and distinguishes reserved, queued and delivered release work. Full-batch
precharge must cover peak prefix obligation; a fresh held generation must
reacquire its token. Faulted/disarmed retirement means quarantine and later
fenced reconstruction, not guaranteed Off delivery or ResetA silence. The
worker implements a 215-line helper and 15 focused groups in the isolated
`/tmp/alive-release-reservation-c1-20261103` tree. Explicit missing-feature RED
precedes implementation; final strict GCC and ASan/UBSan pass all 15 groups,
and all 11 deliberate new-helper mutants are detected after strengthening two
test boundary gaps. The unchanged raw-bank lifecycle passes strict Clang;
its GCC custom-new/delete warning failure remains retained without suppression.
Separate metadata checks preserve closed admission. Independent review remains
separate from runtime admission. Its independent scalar checks cover 60000
literal plans, 40880 interrupted-prefix terminal conversions and 12000 dated
history horizons. One documentation/test finding is corrected in immutable r2:
`horizon()` checks the first frame and rolling windows; tail frame and
interruptible-prefix admission, including the outstanding reserve, require
independent certification. Differences of cumulative bounds do not establish
that certificate. A literal H1/R4 plus cumulative29 from cut100 demonstrates
the horizon/producer distinction. Header arithmetic is unchanged; strict and
ASan/UBSan now pass all 16 groups. Independent r2 review has no new findings,
SHA-256 `238ea195f418244032553ec39607ddb008648f182d68ddb96464d21302f2c9c1`
at `workers/release-reservation-c1-independent-review/r2/report.md`.
The coordinator accepts and applies the exact r2 two-file patch, registers it
in the existing manual native runner and independently compiles/runs all
16 groups (`release-reservation-c1-root-integrated-r2/`). No production include
or caller is added. Validation/sweep work is model-only and is not already
paid for by the runtime callback work bound. Full runtime queue synchronization,
trusted producer admission, release delivery and lifecycle/timing remain gates.
This does not establish runtime release routing, timing or native admission.

Corpus's two later static reports close conditional ordinal forwarding to
SetParameterA and the ordinal 34 Decay current converter. Selector 6 uses
MultiplyOffset coefficients `fma(-1,input,+1)`, not a demonstrated host range
of -1..1. The host's MidiMode ordinal 37 remains outside the DLL's 37 regular
descriptors 0..36 and must not become a fabricated descriptor. Decay constructs
a current 0..1/default 0 with an identity linear converter; the separate saved
Manual 0 still does not prove initial native 1 or effective player publication.
Retained manifests are
`d3149140d1774f79ee5511728adf8e0219f1588596082296fcba636fa62f6a3b`
(`workers/corpus-export-edge-r1/`) and
`27835648f699193bf44742b7751c9f7686fb32fccf310e17051167fee0da9406`
(`workers/corpus-decay-conversion-r1/`). No device stage is promoted.

The read-only editor audit at 563671f recommends the existing ordinary Analog
host as the first integration target. Complete native source edits already use
document-owned admission/history and retained-instance state publication, but
both real presentation hosts currently refuse panel acquisition/grouped writes.
Current profile adapters also lack the panel's snapshot/binding interface;
scalar gestures cannot accept a native source object, and asynchronously mounted
panel inputs are not yet enrolled in save/close draft flushing. Same-runtime
source edits need exact expected-source comparison independent of mount lifetime.
The bounded next editor batch is a commit-only source-state command through the
existing document owner, with production inputs remaining disabled. It needs
no C++ engine expansion. Read-only acquisition, draft settlement and qualified
control activation follow separately. Audit report SHA-256:
`1badee4912160824d474b77e3f4c9f9e2ae973cd25480719a926ca300b5acaf3`
at `workers/native-editor-next-batch-r1/report.md`. No implementation or fresh
editor qualification is claimed by this audit.

Ruling: the audit's proposed stopped-driver restriction for ordinary Ultra U1
is not adopted. The auditor confirms this was a conservative proposal, not an
existing contract. `admit_owned` already publishes complete state-only changes
without replacing instances or stopping callbacks; structural construction and
destruction separately require the driver fence. U1 must preserve complete-state
validation, source/CAS conflict checks, owner/history barriers, fault handling and
requested-versus-applied acknowledgement on that existing path. Commit-only
means local previews do not publish, not that ordinary state commits require
audio off. Alive's stopped structural-edit guards and closed native admission
remain unchanged. If this ruling proves insufficient, narrow input activation
and repair the demonstrated ownership/fault case before widening the contract.

The immutable correction note is
`workers/electric-receiver-init-r1/U1-correction.md`, SHA-256
`50142ec7bdbcf86a1df23d09494cb28d70e962b3dcd31ac1f76408756d36c8f7`.
The associated receiver report rejects two unrelated model/file-drop constructor
leads. A subsequent exact function-pointer query over the host's `.rdata`
establishes two primary vtable owners for the common binding method:
`AGenericThirdPartyMpeInstrumentUnit` and `AThirdPartyMpeInstrumentUnit`, both
slot 22/+0xb0. This does not identify Electric's concrete runtime owner or
construct its +0x138 child/+0x80 receiver. Report SHA-256:
`c5951bc841aae658b2f3746bf130f6057afd8191fc715bfc6d07a14aec1b3ab6`
at `workers/electric-owner-vtable-r1/report.md`. No initialization, native-write
or publication gate is promoted by static owner identity.
The subsequent exact-vtable constructor trace reaches an explicit +0x138 zero
store in `ADeviceUnit`, and resolves the generic factory's +0x108 target as a
no-op. No positive child/receiver construction appears in the retained bodies;
unqualified metadata callbacks mean this is not proof of final zero or absence
of side effects. Later graph attachment and dummy publication remain unresolved.
Retained report `workers/electric-unit-construction-r1/report.md`, SHA-256
`8f94f89197bc92c715f38bfeaf800ff729ad578de1d681b50c79d1ad1b885294`.

The complete local manual native runner passes at exact commit
`8be296d95ecc4e0f4ea5173e33dbdc863ee87499` in 263.28 seconds
(`release-bc1-full-native-r1-result.json`). The matching paired build is selected
by both launchers as `test-0e5d15ba5130f2d905dd`; the coordinator freshly verifies
all 18 artifact hashes. Actual Tauri/WebKit layout smoke passes at 800x600,
1280x800 and 1440x900, including repeated independent Clip/Device toggles and
visible target bounds. All six initial/restored screenshots from
`paired-native-smoke-8be296d-r2/` are visually inspected. The first smoke's
1440x900 capture exceeded its default 1280x840 private display; its successful
geometry assertions and clipped capture remain retained in r1. R2 uses a
1600x1000 private display and captures the complete application. Verification is
retained in `checkpoint-8be296d-coordinator-validation.json`. This is software
evidence, not native-profile publication or physical hardware qualification.
Manual CI run 41530372161 is still pending at this checkpoint.

The reviewed U1 design reuses the existing shared queue, `document_commit`,
native state-only admission and owning history. Its only backend extension is
an optional owner/runtime precondition on the existing commit: authoring CAS
alone cannot detect force-reapply at unchanged authoring revision. Exact source
comparison remains necessary on every frontend retry. Raw untouched native
numbers must also survive subsequent unrelated generic edits. U1 returns native
status `unobserved` and keeps panel inputs disabled. The implementation is
isolated from the tested checkout until independent review. Concrete design:
`workers/analog-source-command-design-r1/report.md`, SHA-256
`54521a0d4acd4cd4130b797c376f70c806869d1ea0bb97900d95e4cdeba4558f`.

The C2 design now targets actual prepared reducer traces rather than another
disconnected synthetic plan. Existing ordered event and shared-debit hooks need
one additional, separately opted-in clear-intent observation; its inline null
default keeps existing trace tests link-compatible. A pure adapter would derive
the reservation plan from that complete trace and independently check frame and
operation-prefix admission. This is a proposed test-only bridge to the actual
producer, not a production caller or admission certificate. The actual bank
still permits all 16 queued records without reserved release space and clears
its queued count before validating render success; neither behavior proves Off
delivery. Runtime queue synchronization, continuous release routing and measured
work remain separate. The read-only design is
`workers/release-c2-design-r1/report.md`, SHA-256
`15a9caa77ff7beb7dcf49703693e17fdb959be10c441088475b03be1c7050c15`.

The next panel integration is separated into U2a read-only acquisition and U2b
draft/grouped-commit settlement. U2a reuses U1's raw canonical source, loads exact
installed resources, joins real native requested/applied observations, and
rechecks node/runtime/full-source identity across asynchronous work. Current
mapping groups decode independently so one nonrepresentable group does not
erase the whole panel. Its physical display allowlist starts empty: the older
display bindings are not current-host qualification. U2b must preserve rejected
drafts and enroll asynchronously mounted controls in save/close settlement
before any input activation. No backend API extension is proposed for U2a.
The read-only design is `workers/analog-panel-u2-design-r1/report.md`, SHA-256
`8fa62a84671ffc05bdd44a5f9fda2b4ce0e6df9c3db349e4aa1d19fca093a97e`.

U1 is implemented and independently reviewed in commits `54fde6a` and
`da893705f2efc51aa08ec7d9a7bda9c3acee1022`. The five-file batch adds exact-source
read/queued commit methods, the optional existing-command owner/runtime guard,
and covering controller/Registry regressions. Untouched raw values survive
later generic edits; ambiguous writes reconcile once without replay or rollback;
conflicting queued edits are isolated while independent later edits survive.
Native status remains `unobserved`; panel inputs and native admission remain
disabled. No DSP API, history owner, engine limit or driver policy is added.

Task U1: fix round 1/5 (one malformed-acceptance finding addressed, zero open).
The first review demonstrates that a fabricated changed-source acceptance at
unchanged authoring/publication revisions can taint canonical state and then
be replayed by an unrelated layout edit. Retained REDs precede the fix. Changed
acceptances now require exactly the invocation base plus one authoring revision
and a safe advanced descriptor publication before adoption. A valid older reply
overtaken by a newer source/runtime broadcast retains the newer canonical state.
Independent re-review passes 66 focused, five original adversarial and three
additional broadcast-ordering cases, with no new findings. Report:
`workers/source-u1-independent-review/r2/report.md`, SHA-256
`45dd15d457e7853005f7c5b5b10f41157cdaf4daef4f933c02458a5f43f473d5`.
Task U1: complete (commits `8be296d`..`da89370`, review clean).

The integrated configured Node run passes all 826 tests with zero skips
(`source-u1-configured-node-r2/`). Pinned Rust 1.85.1 release verification passes
all 324 nonignored tests with five ignored and zero filtered; the final
JavaScript-only fix leaves its Rust sources unchanged
(`source-u1-release-rust-r1/`). The separate opt-in actual Analog test passes
commanded-state, owning history, save, destruction and reopen
(`source-u1-ordinary-native-state-r1/`); it does not qualify original defaults,
musical lifecycle or Alive playback. The full development-build Rust run
reproduces the previously retained allocator instrumentation failure:
323 passed, one failed, five ignored (`source-u1-full-rust-r1/`). The release
pass does not explain or erase that failure; no case is excluded or weakened.
The full configured Chromium run and final paired rebuild/desktop smoke are
still pending at this source checkpoint. Their subsequent private result
manifests must be consulted before claiming acceptance or build selection.

## Exact 4420871 Acceptance And Read-Only Panel Followup

Manual CI [41537054387](https://github.com/venetanji/alive/actions/runs/41537054387)
completes successfully at exact head
`44208715b29ccdb192ca111790eb68b4e6977978`. All exercised functional gates
execute: native desktop/hosted editor, Arrangement, actual Master save/Quit/
restart, all four clip-observation modes, six finalized saved-clip epochs,
eight editor resource cycles and private software CPAL loopback. Main Node
reports 811 passed/15 skipped, Chromium 407 passed/13 skipped, release Rust
324 passed/five ignored and desktop helpers 160 passed across 17 modules.
The 28 U1 cases, five scoped Rust tests, seven synthetic horizon modes and
16 pure reservation groups all execute. Local configured runs additionally
pass all 826 Node and 420 Chromium cases with the private fixtures; exact-head
release Rust passes 324 with five ignored. The known development-build allocator
instrumentation failure remains separately open, not excluded or explained by
the release pass. Native software CPAL separately passes 151,040 finite stereo
frames locally; this CI capture independently contains 153,088 finite frames.

Timing qualification is still open. CI's saved epochs record seven callback
processing-budget exceedances across all 21,093 measured callbacks, distributed
`(0,6,0,1,0,0)`. Maximum measured fill duration is 14,369,621 ns against the
unchanged 512-frame/48-kHz budget of approximately 10,666,667 ns. Native render,
shape and CPAL error/xrun counters are zero. The existing measurement gate
checks finality, coverage and playback credit; it records timing without a
zero-exceedance assertion. Workflow success therefore does not establish
deadline compliance. No cause is attributed and no threshold is weakened. The
preceding run 41530372161 at 8be296d independently retained 16 exceedances;
neither run resolves the other. Endurance was off in both runs. The exact-head
independent audit is `workers/ci-41537054387-independent-review/report.md`,
SHA-256 `07f798d2495bf90d1a6407bc439264a9ce0e1f6116021000f82f8d3551411365`.

The correlated Arrangement Return packet has serial 7, preparation revision 1,
and bar1 quantization. Pending absolute/song frames are `2577920/141205`, target
`2642429/205714`, and applied observation `2643456/206741`. That observation is
1,027 frames after target, inside the compiled gap `[205714,244286)`, with
Arrangement authority and null active source/placement/slot. Its sibling keeps
Session authority and the expected source/slot. The current journey passes;
the historical short-gap failure's cause remains unresolved. This evidence
does not justify an Arrangement engine change.

The paired 4420871 build is selected in both launchers as immutable snapshot
`test-d7733933e18749b82d98`; all 18 artifact hashes and both desktop targets
verify. Actual Tauri/WebKit smoke passes at 800x600, 1280x800 and 1440x900 with
repeated independent Clip/Device toggles, and all six captures were inspected.
Private results: `paired-build-4420871/selection-verification.json`,
`paired-native-smoke-4420871-r1/` and
`checkpoint-4420871-coordinator-validation.json`. Existing windows keep their
previous immutable builds. This is a foundation checkpoint; Electric cannot
yet be loaded into Alive and native-profile publication remains zero.

U2a now implements only read-only ordinary Ultra Analog acquisition. Preparing
the controlled fixture exposed an existing frontend prerequisite: presentation
validation requires `REGISTRY.live_device.profiles`, which the registry lacked.
Ruling: add the minimum immutable Analog declaration and covering real
`CanvasDocument` regression as part of U2a; this declares the existing ordinary
profile and does not widen native construction or Alive admission. Synthetic
cancel testing also exposed an unchecked disabled-panel event path. Ruling:
guard panel edit dispatch before creating any draft/gesture, preserving all
enabled generic-panel cases. These small prerequisites extend the original
six-file allowlist; independent review and actual browser/native UI verification
remain required before integration.

U2a is now integrated in `9c42e50`, `aeeb59b` and `a8a16c9`. Twelve paths change:
the ordinary presentation host/device-panel wiring, current Analog adapter and
tests, the existing model/profile declaration and test, presentation dispatch
and test, shared numeric control and its new focused tests, and the existing
fixture-aware Chromium resource test. Inputs remain disabled, physical display/
position authority remains empty and Alive acquisition/grouped writes remain
unavailable. Exact raw source numbers are preserved; cached requested/applied
native observations are not internal DSP readback. No native/Rust engine,
history owner, driver policy, admission, dependency or resource limit changes.

Task U2a: fix round 2/5, zero open findings. Independent review accepts both
spec compliance and code quality. Reproduced corrections retain unknown
pending/applied state after source edits without a fresh observation, enforce
the 250-ms observation interval across disconnect/reacquire, and prevent
disabled synthetic numeric input from creating drafts while preserving an
existing legitimate draft across disable/re-enable. All controls and envelope
handles refuse synthetic musical events before any draft/gesture or write.
The durable real-Chromium regressions cover the actual installed packs/XML,
ordinary shared controller and real adapter with an explicitly simulated IPC
boundary; absence of private fixtures remains an explicit skip.

Worker verification passes 847 Node cases with 19 explicit real-XML skips
(Node has no XML DOM), all seven focused Chromium resource cases, and all
38 private browser cases. Those real browser cases exercise actual installed
resources, source/owner/runtime races, two sources/multiple mounts, malformed
observations, pending/wrap semantics, throttle/disposal, navigation retention
and disabled changed-value input without Escape cleanup. Full screenshots at
800x600, 1280x800 and 1440x900 were inspected. The independent reviewer reruns
91 portable cases with 19 XML skips, four adversarial adapter checks and three
reproduction/preservation probes. Review report:
`workers/analog-u2a-independent-review-r1/report.md`, SHA-256
`2f697e893bdf604eeea62c96b23481ce2ca154bb9a8e66cc28196092b181f4e8`.
Browser report: `workers/analog-u2a-browser-r1/report.md`, SHA-256
`fff5df4879f8f0f187bf78d7528830a3a8b37399828f0bba56731a4d2239a868`.

Coordinator full configured suites, the matched paired rebuild, actual native
WebKit acquisition and final launcher selection follow this source checkpoint;
consult their subsequent private result manifests before claiming completion.
Original initialization, missing/approximate drawings, current physical display
curves/knob angles, editable native controls, musical timing/lifecycle and Alive
hosting remain separate. No device qualification stage is promoted by U2a.

The coordinator's exact `a689cd7` configured frontend verification completed:
847 Node passes with 19 explicit real-XML skips, and 426 Chromium passes with
zero skips. The matching pair built successfully and both desktop launchers
selected immutable snapshot `test-d3a57d9626e100bcffb0`; all 18 artifact hashes
and both launcher targets verified. These results do not establish native
panel acceptance.

Actual Tauri/WebKit attempt `u2a-native-panel-r1` failed before acquisition:
`Cannot Open Patch: Presentation: unsupported installed source capability`.
The production presentation validator still supplied an empty profile map even
though ordinary Analog source parsing already existed. Ruling: connect source
facts only after the existing complete `live_device::Source::parse` succeeds,
using the existing bounded authored-node collector. This connects validation
for already admitted ordinary sources; it does not expand the engine, source
admission, Alive projection, or resource limits. Preserve the failed attempt.

The two-file fix is integrated as `c3fd99e` from reviewed worker `d177bd5`.
Five regressions reproduce the original refusal and cover both admitted
resource pairs, root/descendant/ancestor scope, invalid complete source state,
raw precision, excluded/unmounted malformed sources, duplicate/sibling
identity, existing hierarchy/panel/node limits and Alive included-panel
refusal. The initial broader run also exposed duplicate-error ordering; the
existing assertion is preserved and the diagnostic retains `unique`.
Final pinned Rust 1.85.1 release verification passes 329 tests, with zero
failures and five existing ignored cases. Generated-fixture focused tests
pass 5/5. No ignored case receives pass credit. The controlled private fixture
remains unchanged, including raw slot194 `12.1`.

Independent native-validation review accepts spec compliance and code quality,
with no unresolved findings. Report:
`workers/analog-u2a-native-validation-review-r1/report.md`, SHA-256
`4b345e67b3c722d87ba3dd3fa26d00968c2f03fe62a2f02b136ad69a4c74f133`.
Implementation report:
`workers/analog-u2a-native-validation-r1/report.md`, SHA-256
`f25a6dba66f935c8a5624184a0638916d2111cf5009a2492bc0cfd49620d6421`.
The integrated fix changes only Rust validation and its tests, so the verified
frontend source hashes remain unchanged. Actual post-fix native acquisition,
paired rebuild/selection and Alive three-size smoke are the next required
checks, not reported as passed here.

## Next Gates

1. Finish reviewed profile facts and original editor geometry, keeping unresolved
   controls unavailable. Retain captures at 800x600, 1280x800 and 1440x900.
2. Preserve the reviewed tagged manifests and closed companion ABI while defining
   the remaining measured native/mixed admission and first-policy restrictions.
   No native Host configuration path is enabled by the companion foundation.
3. Account for native releases in every scheduled/optional/emergency work ledger;
   qualify Start/Stop/seek/loop/clip transitions against actual native owners.
4. Add exact-source, owner/runtime-authorized native state commits through the
   existing queue/history, then connect the original panel through acknowledged
   transactions. Ordinary Ultra state-only publication retains its existing
   running-audio capability; graph replacement retains its driver fence. Finish
   original state and editor qualification for the first profiles.
5. Rebuild matching Alive/Ultra/native artifacts and atomically refresh both local
   launchers after each verified checkpoint; report exact selected provenance.
6. Complete software-native acceptance, including previously skipped clip,
   saved-clip, resource and CPAL loopback gates. Only all-passed profiles may be
   exported and published to the existing library.
7. Propose a separate physical hardware checklist before consequential settings
   changes or recording. Browser/cloud/software probes do not qualify hardware.
