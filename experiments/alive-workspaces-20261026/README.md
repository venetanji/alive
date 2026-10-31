# Alive workspace checkpoint evidence

This is the first Session/shared-shell increment of the Arrangement/Session
direction. It is not acceptance of Arrangement playback, audio-file tracks or
the final integrated project. The separate Alive executable remains playable;
the Arrangement view explicitly reports that its runtime is unavailable.

Initial source: `238c427708a0de9790a4c8e5d95aa06045b1cac5`, based on `c511f14`.
`task1/` retains its red/green logs, browser/native screenshots, reports,
fixtures, exact source/build/harness manifests and independent parent checks.
An independent review found a remaining detail-panel blur defect. The focused
fix and re-review are recorded separately rather than relabeling this source
as fully qualified.

Focused correction source: `97533b805c9831766a244163076e16a297f32c5d`.
`task1-fix1/` retains its separate red/green browser checks, actual native
WebKit pending-field checks, build/source manifests and all failed harness
attempts. The original evidence keeps its initial-source identity.

## What the initial source proves

- Session uses real track columns/four slots, right-side scenes, per-column
  mixers, a collapsible browser and resizable Clip/Devices detail. Existing
  native commands, instance ownership and stable selection IDs remain in use.
- All 500 UI tests and 11 Alive browser checks pass. Retained failures expose
  the original view-button blur, hidden gain mutation, resize bound and clipped
  header defects; subsequent focused checks prove their corrections.
- The actual separate release app loads eight independent instruments, applies
  Scene 2 with eight observed member outcomes, switches views repeatedly while
  playing, preserves an unfinished Session gain, opens/closes a hosted editor,
  advances the native clock and completes Save/Quit. The focused run reports
  zero stream errors and native rejections.
- The original native journey retains its history, chain/reorder, automation,
  editor, source-rejection, file and Quit assertions. Its successful run was
  immediately before a CSS-only header correction; its distinct build identity
  is in `task1/provenance-original-final.json`. The focused native run and
  corrected-header screenshots use the final `238c427` assets.
- Parent verification matches eleven committed source/harness files to the
  final manifest and separately streams both raw PCM captures. Final focused
  capture: 147456 finite stereo frames / 3.072 seconds, peak 0.137721464.
  Original journey: 4113920 frames / 85.706667 seconds, peak 0.327905029.
  Capture duration is not a claim of continuously playing transport time.

## Commands and provenance

The detail-navigation correction at `97533b8` passes 500 UI and 13 Alive
Chromium checks plus the separate release build. Its actual native run keeps
unfinished cutoff/note strings through three repeated inner-tab/outer-collapse
combinations and polling without creating dirty state or history. Deliberate
Tab then commits: Save confirms cutoff 1717 only on the original track, and one
note Undo restores pitch 48 with no extra history step. Exact one-call IPC
counts and original track/clip/note identity are checked in Chromium; native
checks independently observe the real dirty/history/persistence outcomes.
Playback, eight applied Scene 2 members, hosted editor close, advancing native
clock, Save and Quit pass with zero reported stream errors/rejections.

Parent checks match all 148 manifest entries and 116 committed source/harness
blobs at `97533b8`. Independent streaming of final PCM confirms 150528 finite
stereo frames / 3.136 seconds, peak 0.137721464, SHA-256
`1fdad1800b58d6c825d195d0a84428c80ae32359f7a2acb4238475b4dbab1d24`.
The native library is byte-identical to the initial source; embedded frontend
assets and both release executables have their new hashes in fix provenance.
This short capture is not endurance or proven-playing-time evidence.
The isolated red-run `base-ui` copy is byte-identical to all 110 frontend files
at `238c427`, independently checked in `base-ui-verification.json`. Reconstruct
it from that Git commit instead of duplicating unrelated frontend source in
this evidence directory; the original copy remains in temporary storage.

All failed fix attempts are retained. The initial native harness invoked Save
mid-probe, whose explicit file refresh rebuilds controls; later attempts could
not read the generic Modified span through AT-SPI. The final harness checks
the same native state in WebKit's document title and retains the original
clean-before/dirty-after assertions. These are harness corrections, with no
additional source change or lowered navigation requirement. The independent
fix re-review approves both spec compliance and quality with I1 addressed and
no new breakage; its report is retained in `task1-fix1/`. The review did not
repeat suites. Its unchanged explicit-Save observation goes to the final audit.
Source and curated-document whitespace checks pass. Unmodified raw failure
logs and the retained patch contain original trailing whitespace, so a full
evidence-inclusive `git diff --check` reports those bytes; they are preserved
for hash fidelity.

```sh
node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs
apps/ultra/tests/ci/node_modules/.bin/playwright test \
  --config apps/ultra/tests/ci/playwright.config.mjs alive-chain.spec.mjs
bash apps/alive/build.sh
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-workspace-native
bash apps/alive/run.sh
```

The retained focused script and private wrapper document the exact original
eight-track/capture command. Their paths and fixture device references point to
the original checkout; rebase those explicitly when reproducing elsewhere.
The private wrapper changes the Xvfb size to 1600x1000 so the actual app can be
captured at both 1440x900 and 1280x800. It does not change desktop settings.
Task reports give commands and distinguish original failures, intermediate
builds and final records. Do not use a pre-fix screenshot or manifest as proof
of a later source revision.

Actual native measurements use Linux on AMD Ryzen 9 5900HS, private Xvfb and
software PipeWire/CPAL, 48 kHz stereo, requested/observed 512-frame buffers.
This is software loopback, not physical audio/MIDI or a physical-underrun
measurement. Existing compiler and private-display warnings remain in raw logs.
The new 1800-playing-second endurance gate, resource qualification, full branch
review and final-head CI/package gates remain outstanding.

Raw `.f32` captures stay temporarily in `/tmp/alive-workspaces-task1`; Git
retains supervised recorder metadata, streamed finite/peak/frame/hash results
and scripts, not those PCM bytes. Browser traces contain only original Alive
test documents. No Ableton code, images, fonts or proprietary media ship here.

## Historical remote outcome

`task1/historical-ci-0e791ec/` retains the exact prior checkpoint outcomes.
CI `40089612067` passed UI/browser/build/Rust/offline render but failed opening
the hosted editor in the native desktop journey; later native gates were
skipped. Its screenshot shows obscured chain controls, a possible cause rather
than a proved flake or diagnosis. Packages `40089612068` passed all four
platform targets with publishing skipped. These outcomes do not qualify the
new workspace source.

`ci-f0fb9e5/` retains the pushed workspace checkpoint's actual desktop timeout
evidence. CI `40264211910` passes UI/browser, native/Rust and offline render, but
its five-minute native-desktop step expires after save/reopen and changed-source
recovery. The retained observations report zero stream errors/rejections; the
journey has no final success report and subsequent native gates are skipped.
The independently streamed capture has 9037312 finite stereo frames / 188.277333
capture seconds, peak 0.353354245, SHA-256
`93c5a4b466b741725fcd3faafc8dcdd849c54f590b6cc8a375edb587bc7ae947`.
Capture duration does not establish continuously playing time.

`ci-9bf3180/` retains the next checkpoint's repeated timeout. CI `40267085010`
passes UI/browser/native/Rust/offline checks, then exceeds the same five-minute
desktop deadline after save/reopen and dependency recovery. The recorder
finishes cleanup, but no final journey report exists and later native gates
are skipped. Retained observations show zero reported errors/rejections.
Independent streaming confirms 9246208 finite stereo frames / 192.629333
capture seconds, peak 0.353354245, SHA-256
`ab7231d13003b49e19c44228b8752b3933ebc88825ac3fa56cb5c1bfeb303782`.
The raw PCM remains in `/tmp/alive-ci-9bf3180-native`. This is software capture,
not endurance, a successful full journey or a proved timeout diagnosis.
The final package outcome passes Linux, Windows and ARM macOS. Intel macOS
builds/signs Alive.app, then DMG unmount repeatedly returns `hdiutil: Resource
busy`; bundling fails and publishing is skipped. Its final log excerpt is
retained without asserting a root cause or treating the run as qualified.

`native-followup-97533b8/` records a specific local reproduction of that full
original desktop journey. It exits zero and passes its original chain, piano,
automation, hosted-editor, source-failure, save/reopen, pending-history,
device-removal and application Quit assertions on the exact final `97533b8`
release assets. This closes the earlier local full-journey attribution gap;
the separate CI timeout remains unresolved. The diagnostic driver adds only
line timestamps and traceback sampling. Its traced run body takes 187.540
seconds; no production source or assertion is substituted. Provenance pins
Alive `bac50bb1`, Ultra `51788add` and native library `4c54e3e0` by full hashes.
The pure v4 model changes are not part of this previously built executable.

Parent streaming confirms 4175872 finite stereo frames / 86.997333 capture
seconds, peak 0.353354245, SHA-256
`d9c9ae9ed7da39799ccedbfdfa46fc042757c89dd94945f7b785606dc7c4f5a4`.
This private PipeWire run uses 48 kHz / 512 frames, observes zero reported audio
errors/rejections, and completes recorder cleanup. It is software loopback and
does not satisfy endurance, physical-audio or final pushed-commit CI gates.
Its raw PCM remains in `/tmp/alive-ci-f0fb9e5-local`; the downloaded CI raw PCM
remains in `/tmp/alive-ci-f0fb9e5-native`.

## Runtime next step

`task2a/` retains the pure v4 model source provenance, requirements, reports,
independent review/fix re-review and exact red/green/mutation logs. Source
`b34615c` adds strict MIDI/audio descriptors, timing/ownership/identity bounds,
transactional focused edits and deterministic candidate conversion. The first
review found native-v3 admission leaking into conversion. Fix `59c6076` shares
the existing pure mapping and strict v3 decoder while keeping old app admission
wrappers intact. Ten isolated child scenarios explicitly verify unavailable
or smaller v3 capabilities before proving prospective conversion succeeds.
Final results are 24 focused and 77 session tests passed; scoped re-review
approves spec compliance and quality. The existing `audio.rs:420` runtime-symbol
warning remains disclosed and unchanged.

Pure candidates cannot certify graph-family eligibility or manifest parameter
binding/ranges from saved bases, which may omit valid defaults. Those checks
remain mandatory before native installation. Stored event counting uses
compiled endpoints, excluding a note-off at source end; enabled points spend
the event pool and disabled data still spends saved aggregate bounds.
SlotAssign requires an empty cell and mints its identity; occupied assignment
rejects with the existing ID and delete/assign guidance. SlotUpdate retains
identity. These rulings are tested; their cost is possible later admission
refusal and an explicit extra operation for replacing an occupied slot.

No v4 type is added to active Document, no native ABI/capability or desktop
command changes, and no new GUI binary is produced for this pure slice. The
working app still opens/saves v1/v2/v3 under its existing policies. The model
is not evidence of Arrangement, imported audio or integrated acceptance.

`docs/superpowers/specs/2026-10-26-alive-workspaces-runtime-contract.md` is the
proposed v4 model/ABI and staged implementation target, not implemented runtime
evidence. It keeps the current native owner/clock/device interface, introduces
real source/placement ownership and an instrument-free audio path, and requires
fresh admission/retirement/timing proof before enabling capabilities. See the
current plan for the remaining MIDI, PCM, timeline and integrated native tasks.

## Native MIDI Arrangement Slice

`task2b/` retains the additive v4 C/Rust ABI and genuine one-track MIDI
Arrangement source at `db4a934` / `d7f8490`, the original requirements, raw
checks and independent review. One saved source plays through one to eight
finite placements using the existing native clock, queue, receipts, evaluator
and bounded work. Exact PCM matches mixed partitions and fixed widths 1, 31,
32, 63, 64, 127, 128, 256, 512 and 1024, including a real saved two-effect chain.
The initial source passes 79 Rust session checks and the full native suite,
but review found two cases those tests missed; the original review is retained.

`task2b-fix1/` separately retains repair `db39ab0`. Independent counterexamples
fail against `d7f8490` with exit 134 for rejected START changing a natural-end
position and ordinary note-on sorting before a chased note-on. Both pass after
the fix. All twenty rejected START requests preserve the candidate and prior
mixer edits; the correct 64,60 note order is observed at frames 512 and 1536.
The complete guarded v4 suite, normal-library shipping refusal and full native
CI pass, including original v3/capacity/concurrent-publication checks and the
43008-sample Stop comparison. Scoped re-review approves compliance and quality
with zero open blocking findings. Parent verifies the two final committed
source blobs, original RED source, seven binaries, four fixtures, report hash
and exact fix diff without repeating suites.

Both builds still report zero v4 feature bits. Only the dedicated provisional
native test admits this subset. The app and launcher retain v3; multi-track
authority, seek/loops, desktop integration, PCM and measured admission remain
open. These results do not qualify the later workspace acceptance gates.

## Launcher Checkpoint

`launcher-checkpoint/` records a fresh check of the installed **Alive (Test)**
desktop entry, separate executable/library hashes, exact command exits and
saved-session probe report. The launcher uses `apps/alive/run.sh` and the last
completed release build; it never builds on launch. That executable remains
the reviewed `97533b8` Session UI with Arrangement explicitly unavailable.
The offline probe passes real two-device dependencies, automation at offsets
0, 1, 31, 63, 64 and 127, arbitrary partitions, isolation, mute/solo, loop,
seek, Stop, save/reopen and device removal. It creates no editor windows and
does not provide fresh GUI, physical-audio or endurance evidence. Raw WAVs stay
in `/tmp/alive-launcher-checkpoint-20261026/`.
