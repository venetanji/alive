# Cloud Checkpoint At Shutdown

All receipts refer to source `0f1deaecc34e8a54bc9b1ec136876831ebb132e5`.
Default CI `40789537429` is terminal success in all three jobs. Package run
`40789537264` attempt 1 fails only during Intel Mac artifact upload, following
successful build/package/checksum collection; the other three targets pass and
publication is skipped. Windows launcher stages, all six direct resolver
fixtures and the separate 284-passed / 4-ignored Rust run pass in retained logs.

Exactly one failed-job rerun was submitted before pause. Attempt 2 remained
building in the single shutdown snapshot; its final result is unknown. No
local watcher or collector is running. Read current GitHub state after resume
and retain its terminal result before pushing a superseding checkpoint.

The attempt-1 manifest retains original names and hashes. Four raw `.log`/`.txt`
entries are published as lossless `.gz` files; `publication-manifest.json` maps
stored bytes to originals. Decompress to the original names to reproduce the
frozen packet. Original raw files remain in the ignored archive named in that
manifest. The Windows report ZIP and its decoded report hash are retained.
Large package binaries were not downloaded; service IDs/digests are metadata,
not independent local verification of their bytes. The detailed reports retain
the distinction between direct fixtures, cached tests and unmeasured interactive
Windows/physical audio behavior.
