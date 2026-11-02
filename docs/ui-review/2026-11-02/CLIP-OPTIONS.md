# Adaptive Clip Options And Lower-Area Collapse

The later [lower-panel restore and Device navigation report](LOWER-REOPEN.md)
supersedes this batch's Help retention on last-panel closure and its 190 px
Device height. It adds the retained divider for upward restore, a 224 px Device
row, focused deletion, effect power and footer Device navigation. The evidence
below records the earlier build.

Baseline: `b872e55e409d80f5d1cfd019e6a5205220506cf0` in
`/tmp/alive-pr12-native-20261102`, branch `audit/pr12-native-20261102`.
Application/helper source: `c06d96e0f6e2b6851e060e3cf3cc4efafd5134f1`.

This bounded correction follows the owner's November 2 Clip screenshots and
later request to remove the entire selected-clip title band and drag the lower
area closed. The approved HTML remains the visual reference. No native engine,
DSP, host, document schema, routing or recording implementation changes.

## Behavior

- Short Clip options have a Clip title, five original icon toggles and open
  groups in columns. Group summaries do not form an extra row. Clip and Pitch &
  Time start open; Launch, Transform and Generate start closed.
- Tall, narrow options use named Clip / Launch / Pitch & Time / Transform /
  Generate accordions. Automatic follows the reference's below-300-pixel editor
  height and at-least-350-pixel explicitly widened inspector rules. Existing
  explicit Horizontal / Vertical choices remain available.
- Reflow retains the same fields, source/occurrence scope and draft ownership.
  Closing options parks unfinished edits; reopening restores them. Property
  resize cancellation restores the prior width intent, including Automatic.
- The full-width selected-clip title band is removed. The left options title and
  right piano header begin at the Clip top. Source / Clip remains an accessible
  icon in the options title; source, slot, placement and empty-destination
  validation stay with their existing actions.
- Source / Clip opens below its title inside the Clip area. It remains scrollable
  and leaves the upper Master and piano-header Add note targets accessible. The
  popup uses the ordinary chrome text colour rather than inheriting title ink.
- The piano header has Search / Fold / Scale / Highlight Scale, Notes /
  Envelopes / MPE and the fixed grid presentation. Notes and Envelopes reuse the
  existing automation inspector; they do not claim a new full envelope editor.
  MIDI Preview retains its admission and handler. Time/pitch/waveform zoom and
  Fit retain their handlers in Piano navigation. Compact toolbars scroll when
  space is insufficient; musical navigation remains separate from option views.
- Dragging the lower divider below minimum hides the whole lower area, including
  Help, and gives the upper workspace the released height. Clip-only, Devices-only
  and both-open states work. Devices remains fixed at 190 px; Clip retains its
  224 px minimum and retained ordinary size. Escape/lost capture restores the prior
  layout; dragging back reverses an uncommitted collapse.
- ArrowDown at minimum also closes the lower area. Footer controls reopen it;
  Help can reopen alone. Ordinary Clip/Device toggles still preserve independent
  Help visibility. A Master selection round trip retains the collapsed state.

## Capability Boundaries

[CAPABILITIES.json](CAPABILITIES.json) adds six families for option navigation,
existing header navigation, note search/Fold, scales/MIDI processing, MPE and lower
collapse. Each names its owner, prerequisites, unavailable reason, error handling
and tests. Reference presence does not enable missing behavior.

Search and Fold remain frontend work. Scale/Highlight Scale and MIDI Pitch & Time,
Transform and Generate actions remain disabled until selection, validation,
metadata/persistence, deterministic edits and Undo semantics are defined. MPE
needs a native expression contract. Disabled controls explain their state in
contextual Help; there are no simulated edits or success messages. The editing
grid remains fixed at 1/16. Existing source-beat marker fields and audio Re-Pitch
remain functional; this batch does not introduce Live bar/beat field formatting,
Groove, per-clip signatures or scale metadata.

The native acceptance navigation helper now opens the visible Launch option
owner before reading/changing Clip quantization. Its new regression failed first
in both compact and accordion modes. Full modified audio journeys remain a
separate gate.

## Verification

Final counts and matching launcher artifacts are recorded in
[verification.json](evidence/clip-options/verification.json). The exact nine-file
application/helper/test inventory is
[changed-source-files.txt](evidence/clip-options/changed-source-files.txt).
The [report and capture inventory](evidence/clip-options/changed-report-files.txt)
lists the documentation, probe, logs, manifests and screenshots in this batch.

Completed evidence:

- Node: 673 passed, zero failed/skipped.
- Python helper discovery: 146 passed, zero failed/skipped.
- Adjacent access/edit/layout group: 13 passed; earlier focused option/draft group:
  12 passed. Final full Chromium: 359 passed, zero failed/skipped; sandbox enabled,
  retries disabled.
- Regressions failed before implementation for compact options/header, lower
  collapse, keyboard/Help, Master round trip, exact restored height and Launch
  helper ownership.
- The first full browser attempt was interrupted after 77 passes, 9 failures and
  2 interrupted tests. Failures exposed old always-visible zoom/Fit and hidden
  Device-divider assumptions. Tests now operate the actual disclosure/handle;
  their native-target, score-content, range and edit assertions remain intact.
- The second full attempt was interrupted after 311 passes, 4 failures and one
  interrupted test; 43 tests did not run. Besides stale title/divider/navigation
  assertions, it exposed a real empty-slot regression: moving Source / Clip
  into a fully hidden properties panel also hid Create/Assign access. The title
  and its Source action now remain available while empty option groups hide.
  The final six-test empty-source/navigation group passed. Neither interrupted
  full attempt is a pass.
- The third full attempt completed with 358 passes and one failure. Its Source
  popup intercepted the Master heading because it used a fixed top-right
  position. The popup now anchors below the Clip title; the six-test group for
  Master draft/caret, Source rename, Add note, empty slots and header access passed.
- The mechanical design detector reports 38 palette advisories and two warnings
  for the pre-existing explicit Arial declaration in the piano SVG text rule.
  The retained reference chrome palette is intentional. No unrelated design-token
  migration is included. Mechanical findings do not substitute for visual checks.

Native verification completed with exit code zero. Both actual desktop entries
launch the selected executable and mapped native library, with matching hashes
and no `LD_LIBRARY_PATH` override. Alive panel/toggle/restore checks pass at all
three sizes, followed by repeated shrink/restore. The probe also passes compact
and tall Launch access, title-band removal, full lower collapse/cancel/reopen,
Source-popup/Master pointer ownership, mixer draft preservation, Display keyboard
focus, Browser collapse/restore, existing Notes/Envelopes/navigation access and
File Save acknowledgement plus staged-file modification. Ultra passes startup
file delivery and native resizing through its actual desktop entry.

Private software audio reached Running at requested 512 frames. Four native
observations changed the 8-beat loop disc; track Stop produced Session silence
and cleared the disc. The retained launch grid was 1 Bar. This is a short native
observation check, not full current-build audio/loopback qualification. Results
and raw-artifact locations are in the verification record. No new remote CI was
dispatched; Rust unit tests and the open audio/hardware gates were unrun here.

## Matching Launchers

Both **Alive (Test)** and **Ultra (Latest Build)** select
`/home/venetanji/.local/share/alive/builds/test-06d2a008d01d266000dd` through
`/home/venetanji/.local/share/alive/current-test`. Both debug binaries compiled
sequentially with system Cargo/Rust 1.99.1, locked dependencies, two jobs and the
shared target directory. Their four existing Ultra library warnings remain.
All 159 tracked UI file hashes match the compiled content and the recorded
source commit. Desktop entries validate and every selected artifact hash matches.
Existing windows retain their prior build; reopen to use this selection.

The installer's compilation-commit argument initially contained a transcription
error. It was corrected in this newly generated snapshot's manifest before
native verification. The manifest records the original field and correction;
artifact files and hashes were unchanged. The corrected compilation commit is
`c06d96e0f6e2b6851e060e3cf3cc4efafd5134f1`.

| Artifact | SHA-256 |
| --- | --- |
| `bin/alive` | `7c5f36f391f6f6f94fd570d6e63de1b3e2cc94d8df2308d8ab61e70c036d9f5e` |
| `bin/ultra` | `28ded4172ade24d1022f8d846ed24005eb828189d01019f8dc560f6862f1c93e` |
| `bin/libultra_native.so` | `1652d52c581395a9919ea2dbe5a03c4d365c7f9a4da6d10cff233e590099eaa8` |

[Build manifest](evidence/clip-options/source-build-manifest.json) and
[compiled UI hashes](evidence/clip-options/compiled-ui-hashes.json) retain the
provenance. Later documentation/evidence commits do not change these binaries.

## Captures

Native captures use the actual selected desktop entries. Compact options retain
both-open Clip/Devices with equal 5 px separators; expanded options use the
ordinary 210 px property width. The Chromium tall stress captures deliberately
reduce that width to 140 px while checking field identity and unfinished values.
The private staged profile has no user-library directory, so Browser accurately
reports that temporary path as unavailable alongside the bundled catalog. The
user's ordinary profile and physical audio settings are untouched.

| Viewport | Compact | Expanded | Lower Area Closed | Ultra |
| --- | --- | --- | --- | --- |
| 800x600 | [Clip tabs](evidence/clip-options/alive-stacked-800x600.png) | [Accordions](evidence/clip-options/alive-both-800x600.png) | [Session](evidence/clip-options/alive-lower-collapsed-800x600.png) | [Patcher](evidence/clip-options/ultra-launcher-800x600.png) |
| 1280x800 | [Clip tabs](evidence/clip-options/alive-stacked-1280x800.png) | [Accordions](evidence/clip-options/alive-both-1280x800.png) | [Session](evidence/clip-options/alive-lower-collapsed-1280x800.png) | [Patcher](evidence/clip-options/ultra-launcher-1280x800.png) |
| 1440x900 | [Clip tabs](evidence/clip-options/alive-stacked-1440x900.png) | [Accordions](evidence/clip-options/alive-both-1440x900.png) | [Session](evidence/clip-options/alive-lower-collapsed-1440x900.png) | [Patcher](evidence/clip-options/ultra-launcher-1440x900.png) |

## Acceptance Still Open

No new remote CI has been dispatched. The last manual run remains
[41381006275](https://github.com/venetanji/alive/actions/runs/41381006275), at
`c8f4cb3091b9754fa5c94e8a40718e72954aab14`, overall failed: historical Arrangement
Return/save/restart and Master passed, while desktop Save As failed with an
unexpected hosted editor. Downstream clip observation, saved-clip measurements,
resource bounds and CPAL loopback were skipped there.

Current full audio acceptance, software loopback and physical hardware remain
open. The local panel probe uses private Xvfb/DBus and software PipeWire only;
its native playback observation is not hardware or audio-output qualification.
Completed loop play count still needs the separate native contract documented
in [CLIP-DIVIDER-LOOP.md](CLIP-DIVIDER-LOOP.md). No physical settings, recording,
merge, release, deployment or automatic CI changes are authorized by this batch.
