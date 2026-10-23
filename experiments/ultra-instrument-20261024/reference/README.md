# Narrow Max authoring reference

On 2026-10-24 Hong Kong time, the installed Max was exercised only to compare
the authoring workflow used by this Ultra instrument. The patch was our original
`experiments/max-ui-reference/ui-study.maxpat`; no factory help patch, device,
template, binary or extracted app asset is included in this evidence.

## Environment and scope

The executable SHA-256 is
`7a881318209a10d33c982db482297ab870327d5d2cb90aee6e4e01a13e279d8b`, matching
the retained Max 9.1.5 x64 Windows reference. This session did not open About.
The visible "Max 9.2.0 is available" banner is an update offer, not evidence of
an installed 9.2.0 version. Live 12.4.6 Suite is the enclosing installation per
the previous evidence; Live was not launched in this narrow run.

The installed patched Wine reports `wine-11.13`; the current kernel is
`7.2.8-10-omarchy`. An owned reflink clone of the existing disposable reference
prefix ran on an independently launched Xvfb display at 1440x1000x24, with
software llvmpipe requested through the process environment. The visible patch
zoom label was 100%; Wine/system DPI was not queried. All XTest actions targeted
that private display.
The original Wine prefix and the source clone were only read for preservation
hashes. No login, update, authorization change or settings change was attempted.

There were no DSP-start actions. Actual DSP state, sample rate, I/O and signal
vector sizes, Overdrive and Scheduler in Audio Interrupt were not independently
queried. No DSP, filter, envelope, MIDI, parameter automation or timing claim
follows from this UI run.

## Observations

1. Ctrl E changed the original patch to editing mode and exposed its dot grid.
2. N at the pointer opened an empty compact object-entry box. It did not create
   a prefilled number or require a permanent settings panel.
3. Typing `met` displayed completion choices headed by `meter~`, then `metro`,
   then `qmetro`. The proposed completion suffix was selected in the inline box.
   The popup extended beyond the private display's right edge; this establishes
   the first choices only, not the complete list or descriptions.
4. Down then Enter selected and committed a compact `metro` object at that
   location. This was an authoring action, not a timer/playback test.
5. The original `cycle~ 440` and `*~ 0.1` objects showed inlet notches along the
   top and outlet notches along the bottom. Their signal connection used a
   segmented yellow cord; the original control paths used gray cords.
6. Ctrl S after the edit showed no dialog and left the copied patch byte-for-byte
   unchanged. An Alt F attempt also showed no file menu in this Wine run. These
   are bounded negative observations. The earlier Max UI study reports disabled
   standalone saving due to authorization; the current authorization screen was
   not queried, and no save or authorization bypass is claimed.

The crops show the empty entry, the first completion text and the original signal
ports. They are observation screenshots only, not source assets for Ultra.
The full private-display captures remain temporary local evidence. The action
order is retained in `session.json`; `manifest.json` identifies versions, fixture
bytes, screenshot hashes and the preservation checks.

## Relation to Ultra

This confirms the small reference choices relevant to the journey: blank inline
N entry, separate completion assistance, and top/bottom ports. Ultra's explicit
supported-object catalog, device manifest, Perform panel, four-lane voice bundle,
presets and six new voice objects are Ultra design and implementation choices.
This session does not establish Max/Live instrument equivalence or compatibility.

## Evidence and cleanup

REA process Evidence
`ev_4c897cf79d0a149cdda72e4d861db0376b87ca15deb3623691c803c53d0ae1be`
records the wrapper's ordered lifecycle messages and before/after file snapshots.
The process exited with code 0. `rea-summary.json` retains its limits: process
sampling can miss short-lived descendants, inherited environment and network
activity were not captured, and unrelated processes with unreadable environment
files were left untouched. REA's native UI observer is macOS-specific; the visual
observations here came from XTest actions, Xvfb screenshots and direct inspection.

`cleanup.json` records the private display exiting, no remaining readable owned
prefix processes, and removal of the owned clone. Original/source preference,
log and registry content hashes match before and after; aggregate digests and
file counts are retained in `manifest.json`, without preference contents or
credentials. `run-max.py` is the original bounded driver and refuses to overwrite
its output directory; its request-file actions are listed in `session.json`.
