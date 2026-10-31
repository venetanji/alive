# Native Master evidence

The reviewed candidate is `72af9f0031b298d723bd73df3ec84efacd05a600`, based on
`6f407a488478800b358228c53a73349c8cf72a0d`. `task-7-report.md` describes the implementation,
commands, source equivalence, loader identities and measurement limits.
Independent source and evidence assessments are under `reviews/`.

Root integrates the additional reviewed test-only resolver correction
`81220d33348b2baa0890b0d74f1e517aa5474722` as
`c71b60805e0e877915fb2b9efaf83b479252d5e3`, verifying all 25 files against
candidate bytes. `root-final/` records a passing pinned Rust 1.85.1 native suite
(186.425s), 286 Rust tests with four ignored, one Alive test and a focused
loader trace proving the newly built module. These are integrated local host
checks, not a refreshed app launcher or final-head cloud qualification.

`manifest.json` pins original and stored SHA-256 hashes. Logs, CSV and TSV files
are stored as deterministic gzip; the decompressed bytes match the originals.
The original v4 manifest also identifies local binary, PCM and copied-source
archives that are not published here. It is not a claim that those omitted
archives are present in this directory. The raw originals remain in the
controller's canonical task workspace.

The software measurements use Linux, a Ryzen 9 5900HS, 48 kHz and the explicitly
reported offline partitions. The original eight-track v3 dense-control run has
four consecutive overruns at 1024 frames (maximum 24.016 ms against 21.333 ms).
The paired baseline/candidate repeats did not reproduce them and do not
establish their cause. Shipping v4 profile 1 has zero observed overruns in
108,000 practical-buffer samples; provisional profile 2 remains refused.
Small offline partition results do not qualify equivalent hardware periods.

These are Linux functional, allocation/locking/work and elapsed-time witnesses.
They do not establish physical underrun counts, universal deadlines, foreign
runtime compatibility, final integrated-head CI, UI behavior or endurance.
The independent root integration exposed a resolver test-loader failure:
the standalone executable borrowed Rust std symbols from the full native
library before substitution of the old fixture. `root-original/` retains the
failure; `resolver-fix/` retains the minimal-anchor linkage correction, ELF
regression, all four module cases and independent reviews. Root's final checks
now pass and Task 8 is activated. No original assertion or failed measurement
is discarded.
