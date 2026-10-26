# Task 1 Fix Round 1 Report

## Result And Freeze

I1 is fixed in source commit `97533b805c9831766a244163076e16a297f32c5d`
(`Preserve unfinished detail fields during workspace navigation`), based on
`238c427708a0de9790a4c8e5d95aa06045b1cac5`. Source and index ownership were
returned to the parent after this targeted three-file commit. No later source
changes were made. Parent supplies the scoped re-review.

Changed files:
- `apps/ultra/ui/alive-workspace.mjs`: park the currently shown detail subtree
  before a different tab hides it or the outer Detail collapses; restore only
  the selected inner subtree when the outer Detail is expanded. Reuse the
  existing suppression, deferred intentional commit and focus safeguards.
- `apps/ultra/ui/alive.mjs`: device number/range polling respects preserved
  fields, as Session gain polling already does.
- `apps/ultra/tests/ci/alive-chain.spec.mjs`: two real-browser regressions for
  pending device base and note pitch, retaining every previous assertion.

No native source, runtime contracts, layout/style, persistent settings,
selection/history behavior, or parent-owned documentation was changed.

## Red Before Green

All new raw evidence is under `/tmp/alive-workspaces-task1-fix1`.
The previous `/tmp/alive-workspaces-task1` evidence remains unchanged.

1. Added both browser regressions before changing production code. Against
   base source they failed with the expected unexpected mutations:
   `alive_base(instanceId=instrument-0,key=cutoff,value=1717)` and
   `alive_edit(label=Edit note,pitch=73)`. See `browser-red.log` and
   `browser-red/`. These are assertion failures, not startup/selector errors.
2. Applied the focused controller/polling fix. The first green attempt stopped
   because the role locator excluded hidden fields, after its zero-mutation
   assertion had passed. Changed only that locator to `includeHidden:true`.
   Retained `browser-green.log` and `browser-green/`; the corrected regressions
   pass in `browser-green2.log` (2/2).
3. Confirmed the exact final regression tests also fail against an isolated
   copy of base frontend source, without changing the working tree. See
   `base-ui/`, `red.config.mjs`, `browser-red-final2.log` (2 expected failures).
   The preceding `browser-red-final.log` records an unsuccessful temporary
   config bootstrap with no tests found; its corrected config pins testDir.

Each regression waits for at least three actual `alive_current` polls after
every navigation step, checks the exact typed string and zero non-poll IPC,
repeats three combinations of inner-tab switching and outer collapse/reopen,
and verifies an inner field is not focused while its other tab is shown.
After a normal focused Tab, exactly one original-scope mutation must occur,
with no additional mutation through later polls. The note assertion verifies
the original track/clip/note IDs, all note values and the untouched other track.

## Completed Verification

- Full affected UI suite: `node --test apps/ultra/ui/*.test.mjs
  apps/ultra/ui/components/*.test.mjs`; **500/500 pass**, `full-ui.log`.
- Full Alive browser suite: sandboxed Chromium with the existing Playwright
  config, `alive-chain.spec.mjs`; **13/13 pass**, `browser-full.log` and
  `browser-full/`. No sandbox bypass was used.
- Release build: `bash apps/alive/build.sh`; **exit 0**, `build.log`.
- Actual Tauri/WebKit native focused run: **exit 0**,
  `native-final.log` and `native-final/native-report.json`.
- `git diff --check`: passed before the targeted commit.

The native final run uses a copied private desktop wrapper, private XDG,
Xvfb/DBus/PipeWire, the rebuilt release binaries, and the retained eight-track
fixture. Pointer navigation uses XTest without first grabbing button focus.
For both fields it verifies three hide/show/collapse/tab rounds, polling-time
value preservation, clean native dirty/draft state and no undo history. Native
dirty/draft state is read from WebKit's document title (`* `), the same state
render uses for Modified. Deliberate Tab must then mark that state dirty.
The parameter is subsequently saved as cutoff1717 only on the original first
track; every other track stays equal to baseline. The note commit enables undo,
one undo restores original pitch48 and disables further undo, and Discard/Save
restores the baseline document. Exact IPC counts are verified in Chromium;
the native run independently checks actual native state/history outcomes.

The existing focused gain/playback/editor/scene/Quit walkthrough remains in
the final harness with its original assertions. Final native evidence records
Scene2 applied across eight tracks, Pulse playing Clip2, the Harmony hosted
editor opened, advancing audio at 48kHz/512 frames, zero rejected commands,
zero stream errors, Audio failed=false, and successful Save/Quit. Software PCM
is 3.136 seconds, peak0.1377214640, SHA256
`1fdad1800b58d6c825d195d0a84428c80ae32359f7a2acb4238475b4dbab1d24`.
The original broad journey was not repeated, as requested.

## Retained Native Harness Failures

Every failed native attempt remains retained; none is passing evidence:

- `native.log`, `native/`: first harness tried Save while the field was
  hidden to inspect native persistence. Existing `file()` explicitly clears
  track/music/parameter keys and rebuilds controls after Save, so this changed
  the editor lifecycle and lost the pending display value. Replaced this
  non-navigation probe with observing native dirty/draft state throughout
  navigation, retaining persistence checks after intentional commit.
- `native2.log`, `native2/`: exact lookup of the plain Modified span falsely
  reported clean after the intentional parameter commit; capture shows Modified
  and effective base1717. No source change resulted.
- `native3.log`, `native3/`: searching Text interfaces for Modified still
  missed the span. Same intentional-commit assertion stopped the harness.
- `native4.log`, `native4/`: retained `modified-accessibility.json` proves
  WebKit omits that generic span from this tree while exposing the changed
  document-web name `* 8 Independent Tracks - Alive`. Final harness observes
  that title and preserves both clean-before and dirty-after assertions.

These adjustments change how the native state is observed, not the required
no-mutation or later intentional-commit outcome. Final harness and all raw
logs/captures are pinned separately in provenance.

## Provenance

`/tmp/alive-workspaces-task1-fix1/provenance.json` pins source assets, UI tests,
browser tests/config, build scripts, release binaries/library, imported desktop
harnesses, private wrapper/fixture, final native harness/report/PCM/captures,
the exact commit patch, and the relevant successful and failed logs.
Its SHA256 is
`233963f65ec51d1dc2062d8e1d96fefca6bdfbff94148f320acbc7832f5b19c6`.

Key SHA256 values:

| Artifact | SHA256 |
| --- | --- |
| alive-workspace.mjs | `1da002edbf18400d07fc06b06023e919d471ae747a4e4f37869e8a1e5e644b70` |
| alive.mjs | `6650ccf21a599bcd7c3dcae391fe31c19cfb3e44612565f142982aca79afd6a7` |
| alive-chain.spec.mjs | `d7d44ec0bc89f3ffec3a705c0ae8594448a0d80d7143f4590b16b69b4e15fd3c` |
| release/alive | `bac50bb1af01c2d15d985d0cf345f21a1efcd6a0be450f0b77870df4356c3260` |
| release/ultra | `51788adda242c24e22838737cd6525e0fa0af09223e817d7846449795107add3` |
| release/libultra_native.so | `4c54e3e0a2e7bf2007a56620d1006658e97b86d5f8828e08f13e9ffd3a1e9e70` |
| native-check.py | `5a2b9077451349b220271495cfde1c24dced6785ef9070d1787854b752fe45e7` |
| private-desktop.sh | `0dfb4526f198e54e38ba210b3c1611ae50a7336ae3bf6f028ce6a4b0b1c560c0` |
| native-final/native-report.json | `9fafcc977961211a3d9d52ffe156cc4631eec669e15f946f15c96683fd49cdb9` |

The native library hash is unchanged from Task1. Private-display portal,
accessibility and Mesa/DRI3 warnings are retained baseline environment output;
the release build also retains existing compiler warnings. This qualifies
private software audio and the requested focused native behavior, without a
claim about physical audio latency, Arrangement playback, or broad new product
acceptance. Remaining gate: parent's scoped independent re-review of I1.
