# Alive Piano Roll And Pending History

Task 10 checkpoint: `3a25df8e4525184c96bc04250f53c35f6714ba1b`.
This records the implemented single-clip editing slice; clip banks, quantized
launching, eight-track admission and the final 30-minute soak remain separate
Milestone 3/5 gates. Independent review is recorded in the plan ledger.
The initial scoped review and round-one re-review approve the fixed ownership
scope; no Critical or Important findings remain for Task 10.

The actual separate Alive release app adds a note by double-click, moves it
with keyboard edits, performs undo/redo while an independent effect editor
remains usable, rejects Apply during playback, then stops, applies, reopens the
editor and plays again. Save/reopen retains the exact edited note. Save As
retains redo; Open and accepted Apply/Discard clear focused history. Prospective
Open failure and failed Apply preserve accepted drafts/history. Existing chain,
automation ownership, editor Close, audio settings and file/Quit guards pass.

`task10-native/native-session-report.json` and `operations.json` retain the
actual walkthrough observations. The capture has 2,786,304 stereo float frames
(58.048 seconds), finite nonzero samples, peak `0.35335424542427063`, and SHA-256
`16b23898f1fe1450b0be70941401387f81d9f0a0b1c47065c071acf185f4bf8a`.
Its 22,290,432-byte raw file remains at
`/tmp/alive-task10-scope-native/native-walkthrough.f32`; it is not checked into
Git. Deliberate stop/preparation intervals are silent. Both channels match in
this musical fixture, so this capture is not channel-separation evidence.

Environment: Ryzen 9 5900HS, x86_64 Linux, private Xvfb and software PipeWire
`default_output`, 48 kHz stereo, requested/observed 512-frame buffer. Final
observation reports zero stream errors, no failed stream and zero rejected
native commands. These counters are observations of their stream epochs, not
physical audio, independent xrun counts or the final endurance measurement.

`task10-native-8bab95a/editor-resources.json` records eight real editor close/reopen
cycles plus 25 seconds idle. The same three PIDs and one WebKit process remain;
descriptors settle from 154 to 153. First-close to final-idle PSS rises from
454,071 to 491,764 KiB (+37,693 KiB). This bounded run does not establish leak
freedom. The longer workflow soak remains required.

The initial Task 10 run and resource receipt remain in `task10-native-8bab95a`.
Independent review then reproduced a queued Add note targeting the survivor
after track removal. The fix rejects old-scope intents, resolves stable track
IDs and preserves same-scope predecessor revisions. Nine behavioral failures
preceded the fix; 482 Node and four Chromium tests pass afterward. The final
native journey in `task10-native` qualifies the fixed renderer. The earlier
resource gate was not repeated for this renderer-only correction.
`task10-native/qualification.json` records committed source and rebuilt binary
hash association; it does not claim byte-for-byte reproducible builds.

Retained screenshots show the piano roll, chain playback and effect editor.
The controller inspected the new piano capture without another layout/polish
iteration. Detailed test commands, red/green investigations, earlier unsuccessful
attempts and existing warnings are in
`../../.superpowers/sdd/PLAN/task-10-report.md`.

Reproduce the actual release-app checks from the repository root:

```sh
bash apps/alive/build.sh
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-piano-journey
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_editor_resources.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-piano-editors
```

Run the GUI harnesses sequentially. They own their private display/audio runtime
and do not change desktop services or settings.
