# Browser Device Dragging

Production change: `35f4cc1`. Worktree:
`/home/venetanji/.codex/worktrees/phase2-ui/alive`.

The bundled catalog loads when the browser mounts, including in a project
with no clips or instruments. Browser instrument/effect rows support native
HTML dragging onto Session tracks, Arrangement tracks and the Devices chain.
Instruments load into empty MIDI tracks or replace an existing instrument;
audio tracks accept effects. Effect drops use the existing native
`beforeInstanceId` operation to insert above/below a device or append at the
trailing drop area. No native DSP admission limit changed.

The destination track is captured independently of selection. Drag cancellation,
foreign drops and changed session/revision identities cannot load a device.
Queued loads preserve a newer user selection. Successful loads open Devices
and select the new instance when the selection still belongs to that request.
Playback, pending publication, incompatible track kinds and capacity refusals
have visible explanations.

The manually constructed Tauri window disables its native file-drop handler
to permit frontend HTML dragging. Both dragenter and dragover are accepted:
the actual WebKit test initially failed when the pointer reached an existing
device's button with dragover alone. The resulting native gesture succeeds
after accepting dragenter as well. Drops still require stopped transport and
the active profile still limits each track to two effects.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Alive JavaScript model/DOM | 144 passed | `logs/node.log` |
| Chromium workspace/chain/region suite | 89 passed | `logs/browser-suite.log` |
| Final targeted device-drag tests, including 800x600 | 7 passed | `logs/browser-focused.log` |
| Separate Alive and Ultra native builds | Passed | `logs/alive-build.log`, `logs/ultra-build.log` |
| Release packaging tests | 20 passed | `logs/release.log` |
| Final installed native drag, save and software audio | Passed, exit 0 | `reports/device-drop-verification.json` |

The 89-case browser run preceded the final native dragenter correction and the
additional minimum-window test. The seven final focused cases exercise the
resulting production interaction, including button targets. Node checks were
rerun against the final production source. The initial fresh-catalog and
device-drag regressions failed before the implementation was added.

The native journey uses the actual Tauri/WebKit application, AT-SPI for target
geometry and XTest pointer down/move/up gestures on an isolated Xvfb/application
bus. It starts from an empty MIDI track, drags Subtractive onto its header,
drops Utility onto the chain tail, then drops Lowpass above Utility's button.
It creates a MIDI clip/note, saves the current format, starts transport,
launches the clip and records the private CPAL/PipeWire output. Saved effects
are ordered Lowpass then Utility. The final capture contains 185344 stereo
frames, peak 0.0968469, with zero stream errors and rejected commands. This
qualifies software output, not physical audio or sustained endurance.

The saved dependencies, executable and mapped native library all resolve
inside `/home/venetanji/.local/share/alive/builds/35f4cc1`. The source manifest
records 240 source hashes plus both binary hashes and the frozen native
library hash. The Omarchy `Alive (Test)` desktop entry was updated atomically,
validated, and the desktop database refreshed. Previously open user windows
were preserved. The concurrent native Ableton DLL checkout was not edited or
bundled. No cloud CI build was dispatched.

## Reproduce

```sh
node --test apps/ultra/ui/alive*.test.mjs
python3 -m unittest discover -s apps/ultra/scripts -p test_release.py
cd apps/ultra/tests/ci
ALIVE_TEST_PORT=4293 ./node_modules/.bin/playwright test \
  --config playwright.config.mjs alive-chain.spec.mjs alive-clip-regions.spec.mjs
```

From the repository root, with a standalone Alive build and its adjacent
native library and Ultra executable:

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 \
  ULTRA_TEST_ALIVE_BINARY=/path/to/build/bin/alive \
  ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/empty-workspaces.alive" \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_device_drop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-device-verification
```
