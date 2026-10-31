# Reviewed Host Checkpoint CI

Exact pushed commit `e38c87b66dae72ce19b8869b0f24ec9c277ae29e`.
[CI 40398432588](https://github.com/venetanji/alive/actions/runs/40398432588)
passes all three jobs: UI/protocol/reference, Chromium, and Linux native/Rust/
CPAL. The native job passes the original desktop/editor journey, all new clip
observation fault modes, original clip/stream journey, editor resource checks
and software CPAL loopback. No original assertions or timeouts were weakened.

[Packages 40398432637](https://github.com/venetanji/alive/actions/runs/40398432637)
pass all four platforms: Linux, Windows, Intel macOS and Apple Silicon.
Tag publication is skipped. This evidence qualifies the reviewed host/harness
checkpoint, not the subsequent timeline changes or final mixed-project gate.

The retained clip report records six completed epochs, no sampling errors,
zero final stream errors/rejected commands/active voices, and all original
history/editor/default/recovery flags true. Its sampler reports 7.058189 playing
seconds. Parent independently verifies 985088 finite stereo capture frames
(20.522667 seconds) and the report's SHA-256. The separate CPAL capture has
147968 finite stereo frames. Neither capture duration nor the aggregate playing
counter proves the final replayable 1800-second requirement.

These are GitHub-hosted Linux/private software PipeWire tests, not physical
audio measurements. The clip run reports 48 kHz and 512-frame buffers. CPAL's
SIGINT capture status 1 is retained with the existing documented version-bound
shutdown allowance, empty stderr and valid PCM; it is not silently rewritten
to zero. Resource observations retain their missing/transient-process limits.

`run.json` pins job/step outcomes; `artifact-inventory.json` identifies the
downloaded artifacts. `passed.log.gz` losslessly retains the original CI log,
with its uncompressed digest in `parent-verification.json`. Selected raw report,
action, epoch, input and resource records are under `artifacts/`; original PCM
remains under `/tmp/alive-ci-e38c87b-artifacts/` with independently verified
digests retained here. `retained-hashes.json` inventories copied evidence.
