# Final64 Native Checkpoint

Application source is `64fcacd2c454393e89526043fa57c6b2c8ec942f`. The coherent
build receipt and launcher identity are in the sibling `final64-build/` directory.
The native Master journey, original desktop journey with endurance 0 and separate
mixer geometry diagnostic each exit 0. Exact commands, limits and source identity
are in `worker-report.md`; root independently checks retained identities, complete
saved v5 equality, PCM hashes and mixer geometry in `root-audit.json`.

`manifest.json` pins all 89 original entries. Logs are losslessly gzip-compressed;
decoded hashes refer to their original bytes. PCM files remain local, with original
paths and hashes recorded as `local_only`. The copied saved files preserve their
original test paths and are evidence, not portable example sessions. Run the
documented staging/harness commands to reproduce; the playable repository example
is `apps/alive/examples/midi-arrangement.alive`.

The four Master captures cover Session and Arrangement at 1440x900 and 1280x800.
The separate mixer captures show one expanded inspector and recovered controls.
Accessible geometry is identical before/open/closed; pointer hits on covered
controls and sequential keyboard navigation are not established by that diagnostic.

This is native Tauri/WebKit on private Xvfb and software PipeWire at 48 kHz with
requested 512-frame buffers. It is not physical audio or final-source endurance
qualification. The completed earlier endurance run belongs to f691/d507 only.
