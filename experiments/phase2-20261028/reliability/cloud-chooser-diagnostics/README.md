# Native chooser diagnostic checkpoint

Reviewed candidate `490ec16e0698e02480db020e18fbfe3f17bd7cb6`, based on
`c6df81f2d4fd6164930bca6847faf783b1949624`. Independent specification and quality
reviews accept the final scoped changes. This is diagnostic evidence preparation,
not an established correction for the historical cloud chooser failure or G0
acceptance. The original CI artifact is retained separately in `../cloud-c6df81f`.

The original failing rectangle can be reproduced by scrolling the real native
control out of view. Locally, focus immediately moves it into view and the real
chooser opens; no stale post-focus reproduction was obtained. New observations
record pre-focus, post-focus, post-flush and settled geometry, plus bounded
ancestor and pre-input planned-coordinate hit discovery. They preserve the
original one-click input, picker timeout and all original assertions. Individual
external AT-SPI calls can block beyond the work budget; pointer hover or layout
changes after sampling can change the eventual receiver.

The complete instrumented native journey passed on predecessor `4c1f19b`.
Final candidate native checks cover chooser diagnostics and editor diagnostics;
the latter has an actual red/green regression for swallowed argument errors.
These have separate attribution in the candidate report. Four new independent
helper tests pass and are added to the existing explicit CI helper list. Root's
post-integration helper run passes all 23 tests across seven modules. No app/DSP
source or compiled binary changed in this packet.

The report contains exact commands and local executable/library hashes. These
identify the copied current root binaries, not unavailable historical CI
binaries. Observations use private Xvfb/software PipeWire, not physical audio
or a new endurance pass. Raw PCM remains local and is hash-pinned in its capture
receipt. Original reports/logs and selected metadata are pinned by `manifest.json`.
