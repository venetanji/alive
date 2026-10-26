# MIDI Arrangement Native Journey

Implementation: `91cb9d10a6ef0401b05154d58520310b7d7ff2c5`, based on
reviewed checkpoint `e38c87b`. Independent task review approves with two nonblocking follow-ups.
`implementation-report.md` retains commands, exits, failures and build attribution.

The real native journey creates notes and a source, places/moves/trims/resizes
it, duplicates and makes it independent, reuses a source in Session, exercises
delete/undo/redo and refusal rollback, then plays the exact authored IDs.
Session override, silent scoped Stop, Return into a gap, partial loop/seek,
global Return, live automation/mixer/editor lifetime, Save/Quit/process restart
and exact document roundtrip/authored replay pass in `native-full3/`.

That broad journey and the original v3 regression use the explicitly retained
pre-gain UI pins. Final direct Arrangement gain is separately qualified in
`native-gain-final3/`: live value 0.613, same Session value, unchanged authority
and a canonical saved document differing only in the intended gain.
`native-gain-captures/` contains final clean 1440x900 and 1280x800 screenshots.
Parent independently verifies all 18 committed source pins and three final
binary hashes. `launcher-refresh.json` records the verified coherent update of
the installed Alive (Test) launcher, with the previous binaries retained.

Final UI: 101 tests. Full browser: 32 checks, followed by 14 affected Arrangement
checks after gain addition. Rust: 252 pass, four existing ignores. Original
native suite and actual v3 Session regression pass. Test output and earlier
RED/failing attempts are retained without sanitizing warnings.

`native-full3/parent-pcm-verification.json` independently verifies main capture
2229760 finite stereo frames (46.453333 seconds) and reopened capture 189952
frames (3.957333 seconds). Raw PCM remains in the corresponding `/tmp/` evidence
directory. The 10.583-second interaction video records UI operations only.
Observed active epoch: software PipeWire/CPAL, 48 kHz, 512 frames, 4541 callbacks,
zero reported errors/Xruns/over-budget callbacks, maximum 1968767 ns. This is a
bounded pre-Quit observation, not physical output or endurance qualification.
The intentional admission refusal increments rejected commands once; after
restart final errors/rejected commands/voices are zero.

Retained failures distinguish product policy from harness errors:

- `native-full1`: partial loop correctly refuses 21 root clears against 18.
  Explicitly trimming the two original occurrences admits the walkthrough;
  the shipped example and capacity remain unchanged.
- `native-full2`: driver reads diagnostics before its asynchronous text update;
  bounded readiness fixes the driver.
- `native-gain-final`: driver reads a hidden Session control; corrected navigation
  checks the visible Arrangement value before switching views.
- `native-gain-final2`: literal absolute/relative device-path comparison fails;
  canonical existing-path comparison proves musical equality in final3.

`retained-hashes.json` inventories copied raw evidence. `first-interaction/`
retains the earlier accepted visual checkpoint. Genuine WAV playback, final
integrated endurance, whole-branch review and final-head CI remain open.

Independent review: no Critical/Important findings. M1: Duplicate can suggest
an invalid adjacent destination at the song boundary or over another placement;
explicit Copy to and backend refusal preserve music. Address alongside audio
timeline adaptation. M2: private Xvfb logs retain portal/AT-SPI warnings; no
corresponding failed app assertion was observed. They remain classified as
harness diagnostics, not a claim of pristine output.
