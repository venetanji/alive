# Combined prerelease integration validation

This follow-up preserves the original review and failing probes as historical evidence.
The integration includes PR2 de663840346a12d0fe5b49eb669af1cc1788f25f,
PR5 8da5fd2ed6114ae09b8c9be54a90d6f4c32fef63 and
PR4 ab8b0e250044ad2d2abe23490969337ee52d2e45. Version remains 0.1.0-rc.1.

## Corrections

- Native macOS Quit uses a custom menu and guarded delegate instance subclass;
  all owners approve before destruction. Cancellation restores every owner,
  pending saves block exit, and generation tokens reject stale callbacks.
- Numeric edits retain retryable drafts on history admission failure; drag
  completion reports rejected admission and restores canonical geometry.
- Strict native builds retain warnings as errors; internal document bounds are
  explicit. The original 42-cycle Stop regression is now a native CI gate.
- Instrument kernel notices are included and byte-verified in every installer.
- Desktop harness preserves native dependency paths and uses the current +7
  descriptor semantics. Original nested-patcher interaction evidence is unchanged.

## Local results on the combined working tree

- Public contracts passed, including all six original frontend probes unchanged.
- UI tests: 402 passed, 13 skipped, zero failures (415 total).
- Release Rust all-targets: 201 passed, two ignored, zero failures.
- Strict native document/audio/instrument suites and original Stop stress passed;
  other-document 43,008-sample output remains byte-identical.
- Clockwork app envelope: one passed. Packaging helper tests: 13 passed.
  Locked dependency inventory validates 568 entries.
- Real headless instrument host: 207,744 stereo frames, independent instances,
  presets and exact mute/disconnect/Stop silence passed. Generated Faust voice
  kernels reproduce byte-for-byte with pinned Faust 2.88.
- Independent source review found no further P1/P2 in transactional Quit.

## Limits and required remote gates

macOS delegate ABI regression is included in native cargo tests and awaits actual
Mac CI execution; interactive menu/Dock/Cmd-Q remains untested here. Desktop
execution stops before UI initialization because this published environment lacks
WebKitNetworkProcess at the compiled-in path; no helper/sandbox bypass was used.
The nested-patcher physical double-click timeout remains unresolved, not suppressed.
Local pw-cat 1.4.2 is outside the strict CPAL analyzer's supported versions; its
aggregate failure is not represented as a pass. No hardware latency is claimed.

Fresh combined-source CI must pass all four package targets and all three Ultra CI
jobs before merge/release. Old Intel package job 120534744185 in run39988671475
failed; its logs return 404 BlobNotFound, so the cause is unknown. Separate branch
CI is historical evidence only. Release lookup through gh API previously returned
Forbidden for /repos/venetanji/alive/releases/tags/v0.1.0-rc.1; absence of a tag
alone does not resolve that release-existence blocker. No release tag was created.

## Range endpoint follow-up

Combined Chromium CI exposed a real one-sample range-thumb lag: parameter
admission rendered synchronously while the input still held the preceding pointer
sample. A synchronous production-page regression reproduced canonical value100
with thumb position0.9375. Publishing the retryable draft before admission fixes
the render order without relaxing the browser endpoint assertion. Updated UI
suite:403 passed,13 skipped; original six frontend probes all passed. Final
combined CI is required again on the follow-up commit.

Parent independently confirmed authenticated GitHub connector release and matching
tag listings were empty at17:41UTC. The previous gh endpoint denial is not retried;
parent can refresh that check before publication.
