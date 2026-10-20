# Ultra canvas verification

`review.md` records the inline Impeccable finish review. It is not an independent
review. `validation.json` records executed checks and remaining limits;
`artifact-provenance.json` binds captures to their sources and hashes.

The screenshots are evidence of our own Ultra UI. Browser captures cover desktop,
the reported 941 x 510 viewport, small preview, entry and help. `native-canvas.png`
comes from the actual rebuilt Tauri app on private Xvfb, after audio was stopped.
There are no runtime raster assets in the new editor.

`native-result.json`, `native-roundtrip.ultra.json` and `native-audio.f32` come
from the actual native test. The audio is 48000 frames of interleaved little-endian
float32 stereo at 48000 Hz, captured through a private software-only PipeWire
JACK graph. The authored patch uses gain 4. The test clicks bang object 13 during
capture, checks nonzero left output, silent right output and a zero release tail.
UI input is asynchronous; its onset is an observation, not a deterministic event
score, sample-alignment contract, Max recording or latency measurement.

Reproduce after `bash apps/ultra/build.sh` from the repository root:

```bash
bash apps/ultra/tests/check_canvas_desktop.sh --software-audio /tmp/ultra-canvas-results
```

This starts and cleans up a private software graph without hardware discovery,
ALSA or a session manager. The desktop, clipboard and audio graph remain separate.
Omit `--software-audio` to test an existing JACK server; that mode can connect
physical outputs. The current shared server was observed switching from 48000 to
44100 Hz when physical outputs connected. Ultra correctly stops under its
existing 48 kHz requirement. Physical playback, MIDI hardware and callback
deadlines remain unqualified. No global audio preferences were changed.

The actual Max observations, official documentation and original-byte user
snapshots are separately scoped in `experiments/max-ui-reference/`. Its manifest
uses the shared reference-manifest schema. No `.maxpat` importer or broader Max
object support is implemented by this UI change.
