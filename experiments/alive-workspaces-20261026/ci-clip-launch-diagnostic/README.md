# One Observed Original Clip Journey

The original clip/navigation correction remains at `729dc9a`. This diagnostic
changes no app/test source or binaries and executes one original journey with
bounded read-only snapshots before/after its original stopped Launch gesture
and on failure. It does not establish the cause of the earlier failed Launch.

The original one pointer press/release succeeds: Pulse changes from
`Cued Clip 1 copy` to `Cued Clip 1 / request 2 applied for Clip 1`; the selected
slot remains unchanged. Original clip/editor/shared-source recovery checks
continue and their report/capture are retained. Snapshot queries add 0.641532
seconds before the gesture and 0.717711 seconds afterward. Those sequential
reads are not atomic and their time can affect behavior. A successful observed
gesture is not a fix, retry policy or explanation of the prior failure.

The overall run exits 1 at `check_alive_observability.py:153`, during the first
final qualification cycle: Save Alive audio settings is absent. Actual AT-SPI
state and the original failure screenshot show expanded diagnostics covering
the footer settings opener; its expanded state is false and the panel is
absent. The original qualification toggle opens diagnostics after the helper
collapsed it for the editor action. The helper omits the settings opener from
its overlay-clearing classification. A narrow follow-up will reuse existing
visible navigation before the original click, preserving all late assertions.
No raw DOM hit-test or raw native clip receipt is claimed by these snapshots.

Parent inspects the temporary driver, confirms all 407 committed app/test
blobs against the 409-entry before/after source/native manifests, checks all
raw evidence hashes, and independently streams 432640 finite stereo frames /
9.013333 capture seconds, SHA256
`55427c5947f9844f17d7ad66dddadb4f29baf50ab2538fba33d2368aa984beab`.
The recording remains outside git. Complete recorder cleanup reports its
original requested-stop child return code 1; overall native command exit is 1
at the later assertion. Partial resource/epoch logs do not qualify stability.

`diagnostic-report.md`, `command.json`, the original log, snapshots, input
events and hashes retain exact provenance. No original actions/assertions,
sleeps, bounds, settings files, source or index are changed in this phase.
Tests use private Xvfb/software PipeWire/CPAL on Linux/AMD Ryzen 9 5900HS,
48 kHz stereo, requested/observed 512 frames. There is no physical audio,
full final observability report/Quit, endurance or production-v4 qualification.

Raw evidence is `/tmp/alive-workspaces-clip-launch-diagnostic`.
`evidence-sha256.json` covers that original directory; this curated directory's
manifest covers only its included files. Earlier failures and this diagnostic
retain separate identities. The next original uninstrumented journey must
still pass its complete gates.
