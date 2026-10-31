# Exact-checkpoint native CI failure

Original artifact from CI run
https://github.com/venetanji/alive/actions/runs/40695723200, attempt 1,
commit `c6df81f2d4fd6164930bca6847faf783b1949624`, artifact
`alive-desktop-40695723200-1` (ID `12819639786`). The manifest pins the selected
downloaded bytes; these are failure evidence, not regenerated local observations.

The native Alive journey reaches `check_alive_desktop.py:1175`, after its
playback/editor/save/reopen steps, and fails because replacing the Harmony
device does not produce a viewable `Load Ultra Device` chooser. Existing
same-title native windows are unmapped. Input observations and the later failure
screenshot are retained separately; their timestamps do not by themselves
establish which control received the click or why no chooser appeared.

The UI/reference and Chromium jobs pass. The native job fails and later gated
steps are skipped. This run does not qualify P2.0 or later Master work. See the
current handoff and subsequent diagnosis for the fix and its separate evidence.

These are original Alive screenshots and software PipeWire/CPAL observations,
not licensed Live/Max captures, physical audio, or an endurance pass. The full
download and raw PCM remain in the local canonical plan workspace. Included
capture metadata hashes the local PCM without committing that recording.
