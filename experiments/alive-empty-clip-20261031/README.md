# Empty MIDI editor and native-device browser handoff

Product source and installed build: `cf7ac2b` on `feat/phase2-ui-fidelity`.
PR #6 is published through `feat/alive-session-host`. The follow-up commit adds
this evidence, the roadmap link and a native-test viewport correction only.

## Behavior

Empty MIDI slots and newly inserted MIDI tracks keep the clip area blank. The
piano keyboard, viewport/marker tools, velocity controls, note inspector and
automation inspector appear only for an actual source. A real MIDI clip with no
notes still has its editor. Switching to a source or creating a clip restores
the editor; Undo of creation returns to the blank area during playback. Empty
audio keeps its audio-import surface. Devices remain independent of clips.

The [hosting/browser plan](../native-devices-20261031/alive-device-hosting.md)
updates the native session's proposal for the existing browser search, stable
drop targets, horizontal device cards, draft preservation, track types, clip
editing and detail resizing. It defines descriptor discovery/qualification,
shared per-card presentation and instance ownership, and removes old-format
compatibility work. The installed native-device catalog, saved presentation,
MIDI effects and composite rack hosting are future implementation scopes.

That plan is mirrored byte-for-byte at the user-requested native-worktree path:
`/home/venetanji/.codex/worktrees/2a0f/alive/experiments/native-devices-20261031/alive-device-hosting.md`.
No runtime/code changes from that worktree are included in this build.

## Verification

- Red: both new rendered regressions fail on the visible piano roll before the
  fix, at 800x600 and 1280x800. Green: all 108 affected Chromium chain/region
  cases pass with the browser sandbox enabled.
- All 145 Alive Node tests pass. The view regression also checks resizing and
  wheel input with no source, followed by an actual empty MIDI clip.
- Separate Alive and Ultra development builds succeed against the frozen native
  library, with the four existing compiler warnings. No native DSP changes.
- Actual installed Tauri/WebKit + AT-SPI/XTest journey exits 0. It checks the
  initial empty editor, browser instrument load, horizontal effect insertion,
  clip creation/editor restoration, note creation, save and nonzero software
  PCM. Stream errors and rejected commands are both zero. Executable and mapped
  native library are verified under the installed build directory.
- The initial native run passed the empty editor and restored piano checks, then
  stopped at an additional velocity-lane SHOWING assertion. That lane was below
  the visible viewport at the default detail height. The final helper removes
  that viewport-specific assertion; Node/Chromium retain the velocity restoration
  check. The failed native run is retained at
  `/tmp/alive-empty-clip-native-20261031` and its log alongside this packet.
- Rendered empty-editor captures at both browser sizes and the native desktop
  are retained here. The launcher desktop entry validates and selects
  `~/.local/share/alive/builds/cf7ac2b/bin/alive`; existing user windows remain open.

Reproduce browser checks from `apps/ultra/tests/ci`:

```sh
ALIVE_TEST_PORT=4286 ./node_modules/.bin/playwright test \
  --config playwright.config.mjs alive-chain.spec.mjs alive-clip-regions.spec.mjs
```

Reproduce the installed native journey from the repository root:

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 \
ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/builds/cf7ac2b/bin/alive \
ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_device_drop.py \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-empty-clip-native-repro
```

Full final native artifacts: `/tmp/alive-empty-clip-native-final-20261031`.
The retained PCM report describes private software audio, not physical output.
Cloud CI remains manual and was not dispatched.
