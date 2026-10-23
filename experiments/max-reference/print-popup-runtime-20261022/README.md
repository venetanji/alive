# Original Max print popup observation

The original `print @popup 1` displays a transient value bubble attached to the
print box. It does not automatically open or front the Max Console in this
bounded run. Ordinary console rows are still emitted. This corrects the earlier
unverified assumption that popup meant opening the console.

## Evidence and scope

- REA successful capture: `ev_e9fd3346c216c892ea204f47825a4a88e4b949dbe2095c8e975e8f341365c22a`.
- Failed first harness capture: `ev_bb0e7bce60737797d636b337699da0dc6adec3701b15288496851dfe30b21232`.
- Original fixtures and observer are retained here; no shipped helper script or
  reference prose is copied. Source identities are in `source-identities.json`.
- Private Xvfb, Wine 11.13, a fresh disposable clone of the existing reference
  prefix, original Max executable. No original prefix was launched or edited.
- Locked patch with `print QUIET @popup 0`, `print POP @popup 1`, and `print`.
- The successful run captured 35 stages. All 23 `dspstate~` observations are 0.
- `results/events.json` records ordered observer actions and X focus; the raw
  named-window list includes hidden windows and must not be treated as visibility.
  Screenshots establish visible state.
- `results/print-popup.jsonl` records original inputs and attribute getters.

## Observed behavior

| Probe | Observation | Screenshot |
| --- | --- | --- |
| Initial getters | QUIET popup0, POP popup1, unlabeled popup0; level0 for all | `initial.png` |
| QUIET int17, default int29 | No bubble and console stays hidden | `quiet-message.png`, `default-message.png` |
| POP int31 | Bubble `31`; console stays hidden | `popup-message.png` |
| POP incoming selector `popup 0` | Bubble contains `popup 0`; getter stays1; console receives ordinary row | `popup-selector-zero.png`, `console-forced-focus.png` |
| Subsequent POP int41 | Bubble `41`; confirms the selector did not disable popup | `popup-disabled-message.png` (stage name describes the hypothesis, not its outcome) |
| POP bang | Bubble `bang` | `popup-bang.png` |
| `Maxobj.setattr('popup',0)` | Getter becomes0; previous bubble is absent; int47 prints without bubble | `popup-setattr-zero.png`, `popup-after-setattr-zero.png` |
| Reenable via setattr1 | No previous bubble is replayed; later list shows `53 alpha` | `popup-reenabled.png`, `popup-new-value.png` |
| Two enabled objects | QUIET71 and POP73 bubbles visible simultaneously | `two-recent-values.png` |
| Pointer movement | POP73 remains visible after motion to blank canvas, no click | `recent-pointer-move.png` |
| Blank click | POP79 remains visible after blank-canvas click | `recent-blank-click.png` |
| No further interaction | POP61 visible initially, absent after additional2s wait and a getter-only snapshot | `two-active-popups.png`, `popups-after-two-seconds.png` |
| Disable a recent bubble | POP67 visible, then absent after setattr0, before the observed ordinary timeout bound | `popup-before-disabled.png`, `popup-immediately-disabled.png` |
| Console content | All printed data are present; default label is `print`; setters produce no extra print row | `console-forced-focus.png`, `quiet-doubleclick-focused.png` |
| Locked physical double-click after console closed | Console visibly reopens | `quiet-doubleclick-focused.png` |

The initial double-click at PointerRoot focus did not visibly front the existing
hidden console. Explicit XRaiseWindow/XSetInputFocus then exposed it for reading.
After Ctrl-W closed that console, a physical double-click in the focused locked
patch did visibly reopen it. A later double-click of popup0 with the existing
console behind the patch did not visibly front it in this WM-less environment.
Therefore this run establishes reopening, but does not establish general native
window fronting/focus behavior. The stage name `popup0-doubleclick-fronts-existing`
is the attempted condition, not a positive result.

## Appearance and lifetime

`results/popup-message-crop.png` and `results/two-recent-values-crop.png` retain
the unscaled relevant pixels. At the observed approximately1.6x desktop scale,
the integer bubble body is about80x48px, dark fill, thin black outline, rounded
corners, light gray dot, and white value text. A triangular pointer aims at the
middle of the print box's vertical edge. POP's bubble sits to its left; QUIET's
bubble sits to its right. This proves attachment to the box, not specifically to
its inlet. The side-selection algorithm and boundary placement were not probed.
Longer values expand horizontally; labels are omitted from bubble content.

The two-value crop starts at screen(270,510), size840x100. QUIET's fixture rect is
[50,180,240,24], screen x295..679; POP's is [300,180,240,24], screen x695..1079.
Both have screen y547..582. Request28 sends71 to QUIET: its bubble is to the
right, body x701..780, pointer facing left toward QUIET. Request29 sends73 to
POP: its bubble is to the left, body x594..674, pointer facing right toward POP.
The bubbles overlap the neighboring box's area; their printed values are not
reversed. Coordinates are visual pixel estimates, not original layout metadata.

Receipt times are original JS `wall_ms`; screenshot file mtimes approximate
capture completion, not exact first-pixel exposure. QUIET71 is visible at1.799s
after receipt and absent at2.650s. POP73 remains after pointer movement at1.650s;
POP79 remains after a blank click at1.771s. POP61 is visible at0.802s and absent
at3.828s with no intervening pointer input. A lifetime near2s is a reasonable
implementation inference, but the exact expiration constant is not established.
The disappearing QUIET71 while POP73 remains supports independent per-object
expiry. New data replace the same object's displayed value. Disabling POP67
removes it by1.692s after receipt, earlier than the surviving1.799s sample.

## Limitations and cleanup

Attempt1 failed before stimuli because the harness passed the special X focus
ID PointerRoot1 to XFetchName. Its files and evidence are preserved under
`attempt-1/`. Attempt2 guards special focus IDs and uses a smaller fixture.

`adstatus switch` emits menu setup messages into the original harness at load;
the harness does not implement those selectors, so four startup JS errors appear
in the console. They predate the numbered print stimuli and are not print-object
results. DSP-off confirmation comes from the separate `dspstate~` observations.

Shutdown requested Ctrl-Q. The Wine launcher returned -9; the observer returned0.
Do not describe this as a confirmed normal Max exit. REA verified its owned group
cleanup, while listing five inaccessible unrelated/unverified process samples.
The explicit readable-environment exact-prefix scan found no remaining matching
processes for either disposable prefix, and the private Xvfb PID was gone.
`cleanup.json` retains this evidence. Only these two owned disposable clones were
removed after the scan; the source clone and original prefix are retained.

No popup product code was changed by this probe. The narrow implementation
direction is a transient per-node value presentation, separate from console
visibility. A nonconsuming snapshot with generation/time can support independent
views without replaying stale bubbles. Keep selector `popup 0` as printable data;
change the popup setting through the attribute/parameter path. Expiry must work
with DSP off, so a paused audio-frame counter alone is insufficient.
