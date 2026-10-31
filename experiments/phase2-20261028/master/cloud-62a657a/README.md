# Saved-owner checkpoint cloud qualification

Qualified pushed commit: `62a657a55e8f007408fa42abce18f60b3bf8cecb`;
application source: `6f407a488478800b358228c53a73349c8cf72a0d`.

- Full [CI 40721716899](https://github.com/venetanji/alive/actions/runs/40721716899)
  succeeds on all three jobs, including the original Alive/editor, Arrangement,
  clip observation, stream measurement, editor-resource and software CPAL gates.
- [Packages 40721716535](https://github.com/venetanji/alive/actions/runs/40721716535)
  succeed on Linux, Windows, Apple Silicon and Intel macOS. Publication is skipped.
- Raw terminal job/step receipts and the artifact index are retained here.
  `qualification.json` pins source trees and every selected artifact to its
  original download/member hash. Full ZIPs remain in the canonical ignored
  workspace; selected original reports and Alive screenshots are curated here.

The headless two-device report passes isolation, automation ownership,
mute/solo, note termination, loop/seek and save/reopen checks. Offsets are
`0,1,31,63,64,127`; tested partitions are `1,31,63,64,127,1024,17,509`, with
identical samples. The Arrangement report retains actual Save/Quit/restart,
matching executable/native-library identities, round-trip and replay receipts.
The desktop report retains terminal Quit and pending-history assertions.

These native journeys use private Xvfb and software PipeWire/CPAL, at 48 kHz
and a requested 512-frame buffer. Exact observed settings and virtual hardware
remain in their original reports. The desktop endurance parameter is zero;
the short clip-observability report proves 7.223900574 playing seconds and six
completed stream epochs. Neither is the required 1800-playing-second gate.
Physical audio and physical underruns remain unqualified. The CPAL recorder's
documented SIGINT exit status 1 remains in its original report.

Root independently checked terminal statuses, exact source identity, downloaded
ZIP/member hashes and selected report fields. PCM correctness here is reported
by the passing CI tests; root did not rerender or revalidate PCM in this receipt.
These results qualify the accepted saved-owner checkpoint. They do not qualify
the moving Task 7 native Master implementation, a new Master UI or a refreshed
local launcher. Preserve the subsequent native/UI and final pushed-head gates.
