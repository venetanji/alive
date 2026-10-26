# MIDI v4 measurement prerequisite

Source commit: `8e177199c0f7d09b6a9380b67a37709b9ab4b31c`, based on `a1cf2e7`.
Independent spec/quality review approves with one nonblocking runner completeness
finding recorded in `review.md`. This adds a measurement harness and policy;
shipping v4 remains disabled and Arrangement is not yet an application feature.

The complete native regression suite, focused v4 tests, current-source shipping
refusal and separate callback guards pass. `implementation-report.md` records
commands, workload scope, fixed limits, failures and provenance. The final raw
run remains at `/tmp/alive-workspaces-task2d-measurement/final`.

The practical candidate is profile 1 at buffers of at least 256 frames, pending
desktop integration. Its combined synthetic variants have zero
observed overruns at 256/512/1024. Profile 2 remains unadmitted: its heavy combined
case exceeds the 1024-frame deadline in 3 of 1200 samples, and its two variants
exceed the 512-frame deadline in 240 of 2400. Process success means the benchmark
completed, not that these deadline checks passed. The stress adds a second DSP
bank and uses explicit scalar surrogates for some bounded work; it is not an
admitted authored project or a mathematical worst-case bound.

`summary.json` includes all 287 distributions. The compressed CSV files retain
all 344400 timing samples, 5740 guard samples and 23520 guard work rows;
`parent-verification.json` pins their uncompressed bytes. The parent verified
all 733 original manifest entries and independently recomputed every quantile
and overrun count from the timing CSV. Four scoped source pins match committed
blobs. Original fixtures/binaries and their hashes remain in the raw directory;
they are not duplicated into this evidence subset.

This is software processing on AMD Ryzen 9 5900HS, Linux 7.2.8-10-omarchy,
48 kHz, logical buffers 1/31/64/128/256/512/1024, without audio I/O or changed
settings. There is no physical-output, driver-underrun, sustained-playback or
universal callback-deadline claim. Existing v3 eight-track support is unchanged.
