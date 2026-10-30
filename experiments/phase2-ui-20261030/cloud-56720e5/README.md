# Exact-Head Cloud Results: 56720e5

These terminal results belong to
`56720e5e109c41dff76d2372a819c04de1c5b62b`, before the approved UI pass.
They were collected before publishing the superseding source. Both run receipts
confirm that exact head. No workflow retry, package download or publication was
performed during collection.

- CI `40916601585`: UI/protocol/reference and Chromium jobs pass. The Linux
  native/Rust/CPAL job fails in `check_alive_master.py:84`, through
  `check_alive_desktop.py:696`: hosted Cutoff ownership was `Base: 1333 Hz`
  when the assertion expected Automation. This run is not a CI pass and does
  not demonstrate that the earlier Arrangement input failure is the remaining
  failure. Later gated work was skipped.
- Packages `40916601575`: Linux, Windows, Intel Mac and Apple Silicon jobs
  pass. Tag publication is skipped. Successful packages are not native workflow,
  physical audio, endurance or signing qualification.

`manifest.json` records 11 retained payloads: two run/job summaries, two artifact
metadata receipts and seven complete job logs compressed losslessly with gzip.
Stored byte counts and SHA-256 values, plus decoded log counts/hashes, were
recomputed and verified. Artifact names/sizes/digests are retained as metadata;
artifact ZIP payloads were not downloaded. There is no job log for the skipped
publication job.

Run links:

- https://github.com/venetanji/alive/actions/runs/40916601585
- https://github.com/venetanji/alive/actions/runs/40916601575
