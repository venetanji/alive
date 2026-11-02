# Lower Panel Restore And Device Navigation

Application/test source: `8bcddd4b0bc73d753c80d12096140e58a47bf482`.
Baseline: `6ba3938796c6a02c26807603e08a4f44cc0c62ee`, branch
`audit/pr12-native-20261102` in `/tmp/alive-pr12-native-20261102`.
Original PR 12 audited head: `11da097c27627a92629632ab62304d799e50099c`.

This follows the owner's drag-to-reopen, Device title/height, power/deletion and
footer preview corrections. It supersedes the previous report's independent
Help retention when the last musical panel closes. No engine, DSP, native host,
document schema, routing or recording implementation changes are included.

## Behavior

- Closing the last Clip/Device panel or dragging downward hides all lower
  content, including Help. The upper workspace fills the released height.
- A 5 px divider remains above the footer. Dragging upward restores the last
  nonempty Clip/Device combination; ArrowUp, Enter, Space and double-click also
  restore it. Explicit Help can still open alone.
- Escape or lost pointer capture restores the prior layout and unfinished
  values. Divider Escape takes priority even when restoration focuses a Device
  input. The actual editor nodes and source/slot/placement identities survive.
- The redundant track-chain heading is hidden. Device action icons share the
  title strip. Devices and their adjacent Help stay at a fixed 224 px height;
  a standard 169 px editor body fits without scaling or vertical scrolling.
  Saved presentations retain their own authored size. Clip alone resizes and
  maximizes; the gaps above Clip and Devices remain 5 px.
- Device power is a circle at the left of the title. Colour and pressed state
  mean active and follow the native bypass acknowledgement. Refusal retains
  the accepted state. Effect power reuses `alive_bypass`.
- Device/track removal icons are gone. Delete/Backspace on a focused Device
  title or Session/Arrangement track title captures that exact identity and
  reuses `alive_device` or `alive_workspace_track`. Native acknowledgement
  precedes accepted UI removal. Instrument removal returns the track to MIDI
  only. Keep-at-least-one-track, stopped transport, pending publication, stale
  origin and unfinished-draft guards apply. Editable fields, menus, modals,
  modifiers and repeated keys retain their existing owners. Clip/source/time
  deletion remains a separate scope.
- The Device-chain scrollbar is hidden. The footer contains inert miniatures
  of the mounted device surfaces and a draggable viewport outline. Pointer,
  Home/End, Left/Right and horizontal/Shift-wheel input scroll the actual rack.
  The preview carries no duplicate IDs, real device selectors or handlers.
  Resizing updates its viewport. Navigation preserves drafts and emits no
  musical command; it is unrelated to Browser audio preview.

## Capability Boundaries

[CAPABILITIES.json](CAPABILITIES.json) contains 170 unique families. Existing
panel/collapse entries are updated; three families document device navigation,
focused deletion and device activation, with owners, prerequisites, unavailable
states, errors and tests.

Instrument power remains disabled: `session/host.rs` permits bypass only for
audio effects. Full Analog `livePanel` loading remains unavailable in Alive's
presentation projection. The 169 px geometry check uses an admitted saved
presentation fixture of that height; it does not qualify Analog loading.
Those contracts need separate review before an engine/provider expansion.

## Verification

Machine-readable results, commands, exact build hashes and unrun gates are in
[verification.json](evidence/lower-reopen/verification.json). The exact
[seven-file source inventory](evidence/lower-reopen/changed-source-files.txt)
and [report/evidence inventory](evidence/lower-reopen/changed-report-files.txt)
separate the application commit from subsequent documentation.

- Final Chromium suite: 381 passed, zero failed/skipped, retries disabled and
  sandbox enabled. Node: 673 passed, zero failed/skipped.
- Focused controls/panel/Help group: 23 passed. Preview identity/refused-load
  group: 9 passed. The new Device title/height and missing deletion/navigator
  tests failed before their implementations.
- The first full browser attempt completed with 377 passed and four failures.
  One expected the former Help description; three exposed miniature titles
  retaining real `.chain-select` selectors. Help now asserts the deletion
  instruction, and preview titles have their own class. The second full suite
  passes all 381 cases. The failed attempt remains evidence, not a pass.
- Mechanical design scan: 13 palette advisories, no primary findings. Existing
  reference chrome is retained. Browser and native screenshots receive visual
  inspection at 800x600, 1280x800 and 1440x900.
- Python helper discovery and Rust unit tests are unrun for this UI batch.
  Both native applications compile; their four existing Ultra library warnings
  remain. The previous helper pass is historical and is not a current result.

The final native probe passed for both actual desktop entries, at all three
sizes and after repeated shrink/restore, with exit code zero. It confirmed
drag-to-reopen and last-panel Help closure, exact Device/Help/separator geometry,
overview Home/End scrolling, preserved drafts, native Save, effect bypass and
restore, removal of the exact second Utility instance with Delete, and Harmony
track removal with Backspace while retaining Pulse. Its brief native playback
observed changing loop position and Session silence after track Stop; completed
play count remains unavailable. The full
[native result](evidence/lower-reopen/native-shell-results.json) records these
checks without claiming the separate acceptance journeys passed.

The probe uses actual desktop entries on private Xvfb/DBus/software PipeWire,
checks executable and mapped-library hashes without `LD_LIBRARY_PATH`, exercises
all three sizes and repeats shrink/restore. It also targets the actual footer
slider, native power and focused removal controls, Save, loop observation and
track Stop. These short checks do not complete the full audio acceptance gate.

Two initial native probe attempts were refused while adding a fourth device
root: complete-work admission reported resource 2, observed 20, limit 18. Both
Utility+Lowpass and two Utility additions reached this refusal while Harmony
retained its instrument. The accepted chain stayed installed and the UI showed
the error. The final private fixture first removes Harmony's instrument through
the existing UI, retaining a MIDI-only Harmony track and its source. It then
adds two Utility instances to Pulse. This permits a wide rack inside the existing
bound and verifies removal of the second of two identically named devices.
No admission limit or musical acceptance expectation is changed. The refused
attempts and their accessible error snapshots are retained in this evidence.

The third attempt passed all viewport and playback observations, then stopped
at the deletion assertion because the probe left Audio Settings open. Its
failure capture shows the modal; focused Delete correctly retains modal
ownership. The probe now closes Audio Settings after stopping private audio
before checking structural shortcuts. The application modal guard is unchanged.
That failed attempt is retained as `native-attempt3.log`,
`native-attempt3-missing-control.json` and `native-attempt3-modal-open.png`.

## Matching Launchers

**Alive (Test)** and **Ultra (Latest Build)** select source `8bcddd4` through
`/home/venetanji/.local/share/alive/current-test`, snapshot
`/home/venetanji/.local/share/alive/builds/test-72a955d96240a31a0fd5`.
All 18 installed artifacts match their manifest hashes. Both desktop entries
validate. All 160 compiled UI file hashes match the source commit. Reopen an
existing window to use this selection; prior snapshots/windows remain intact.

| Artifact | SHA-256 |
| --- | --- |
| `bin/alive` | `5c85da258ac1cb3ed521e7987edafa31a587ac69d659a15efccece8b43c52f74` |
| `bin/ultra` | `32063fb35a4dd4040918b64c2f2d9a7dd005f9eade03c7dfa6a5844db16b28b2` |
| `bin/libultra_native.so` | `1652d52c581395a9919ea2dbe5a03c4d365c7f9a4da6d10cff233e590099eaa8` |

The build ran while browser checks completed. Every compiled UI file was
checked against its content hash and committed source before installation.
The installer receives the exact SHA programmatically from `git rev-parse`.

## Captures

| Viewport | Device Restore | Both Restored | Closed | Device Navigation | Ultra |
| --- | --- | --- | --- | --- | --- |
| 800x600 | [Device](evidence/lower-reopen/alive-device-reopened-800x600.png) | [Both](evidence/lower-reopen/alive-both-reopened-800x600.png) | [Closed](evidence/lower-reopen/alive-last-panel-closed-800x600.png) | [Overview](evidence/lower-reopen/alive-device-overview-800x600.png) | [Ultra](evidence/lower-reopen/ultra-launcher-800x600.png) |
| 1280x800 | [Device](evidence/lower-reopen/alive-device-reopened-1280x800.png) | [Both](evidence/lower-reopen/alive-both-reopened-1280x800.png) | [Closed](evidence/lower-reopen/alive-last-panel-closed-1280x800.png) | [Overview](evidence/lower-reopen/alive-device-overview-1280x800.png) | [Ultra](evidence/lower-reopen/ultra-launcher-1280x800.png) |
| 1440x900 | [Device](evidence/lower-reopen/alive-device-reopened-1440x900.png) | [Both](evidence/lower-reopen/alive-both-reopened-1440x900.png) | [Closed](evidence/lower-reopen/alive-last-panel-closed-1440x900.png) | [Overview](evidence/lower-reopen/alive-device-overview-1440x900.png) | [Ultra](evidence/lower-reopen/ultra-launcher-1440x900.png) |

## Acceptance Still Open

No new remote CI is dispatched. The last manual run remains
[41381006275](https://github.com/venetanji/alive/actions/runs/41381006275), at
`c8f4cb3091b9754fa5c94e8a40718e72954aab14`, overall failed: historical Arrangement
Return/save/restart and Master passed, while desktop Save As failed with an
unexpected hosted editor. Downstream clip observation, saved-clip measurements,
resource bounds and CPAL loopback were skipped there. Full current-build native
audio acceptance and loopback remain open; this UI probe does not close them.

Physical hardware, recording and user audio settings changes are unrun.
Completed loop play count remains unavailable; no renderer estimate is added.
Browser audio preview, instrument power, full Analog panel loading and the
other missing native/provider capabilities retain accurate unavailable states.
