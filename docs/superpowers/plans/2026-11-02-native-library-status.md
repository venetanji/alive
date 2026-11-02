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

## Next Gates

1. Finish reviewed profile facts and original editor geometry, keeping unresolved
   controls unavailable. Retain captures at 800x600, 1280x800 and 1440x900.
2. Preserve the reviewed tagged manifests and closed companion ABI while defining
   the remaining measured native/mixed admission and first-policy restrictions.
   No native Host configuration path is enabled by the companion foundation.
3. Account for native releases in every scheduled/optional/emergency work ledger;
   qualify Start/Stop/seek/loop/clip transitions against actual native owners.
4. Add stopped instance-authorized native state commands/history, connect the
   original panel through acknowledged transactions, and finish original state
   and editor qualification for the first profiles.
5. Rebuild matching Alive/Ultra/native artifacts and atomically refresh both local
   launchers after each verified checkpoint; report exact selected provenance.
6. Complete software-native acceptance, including previously skipped clip,
   saved-clip, resource and CPAL loopback gates. Only all-passed profiles may be
   exported and published to the existing library.
7. Propose a separate physical hardware checklist before consequential settings
   changes or recording. Browser/cloud/software probes do not qualify hardware.
