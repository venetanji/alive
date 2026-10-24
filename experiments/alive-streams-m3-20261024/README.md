# Alive Stream Observability Checkpoint

Task 13a adds retained stream epochs, witnessed callback retirement and bounded
measurement to the accepted two-track/six-device/eight-clip host. It is locally
accepted through `3024057`: the four original Important findings are addressed
after two scoped reviews, and final native workflows/build identities/controls
are independently verified. Earlier checkpoints below retain their original
identities and failed/incomplete evidence. Pushed-head CI/packages still follow.
This checkpoint does not enable eight tracks or scenes and does
not meet the final 1800-playing-second acceptance gate.

Verify retained evidence and its historical committed source:

```sh
python3 experiments/alive-streams-m3-20261024/verify.py
```

## Native Workflow

Command, from the repository root:

```sh
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_observability.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task13a-evidence/native-accepted
```

`native-accepted/` retains the actual standalone release-app clip and shared
source recovery journey plus three short Stop/Apply/configure/editor cycles.
The unchanged clip assertions cover quantized launch receipts, local Stop with
the sibling continuing, saved defaults, editor lifetime, Save As/reopen and
failed/successful shared-source replacement. All five journey flags pass.

The parent independently checked six contiguous finalized stream epochs,
exact lifetime counter/histogram merges, 3808 callbacks and 1949696 output
frames. Each epoch observed a 512-frame callback at 48 kHz stereo float32.
Typed CPAL Xrun/non-Xrun reports, native render/shape failures and processing
budget exceedances are all zero in this short run. Maximum measured fill time
is 1991248 ns. Timing excludes the final clock read and publication tail and
does not measure scheduling lateness or hardware presentation.

The run proves 8.010979 seconds of playing intervals and separately excludes
46.919749 seconds; its total harness wall time is 105.968304 seconds. Stopped
frame advance is not counted as playing. Epoch records use 3856 fixed numeric
bytes each, the active numeric machinery 11616 bytes and the 64-record numeric
ring 246784 bytes. Wire JSON is a separate bounded representation.

The parent streamed all five available PCM captures for finiteness, frame count,
peak and SHA-256. The final capture is 319488 finite stereo frames / 6.656 s,
peak 0.2225944548845291, SHA-256
`906ba53eb495bc8ec567ecf9a41b863735cae81e9dfbda8f4dbcca7689e12d17`.
Raw PCM remains in the temporary evidence directory and is not committed.
`parent-native-verification.json` records independent checks and every retained
non-PCM file hash. The capture supervisor's recorder exit 1 follows requested
termination and is retained with its bounded-cleanup metadata.

## Resource Scope

The 73 retained resource samples report app PSS 512011 -> 500488 KiB,
maximum 614332 KiB, and observed app CPU maximum 113.600% (100% is one core).
They see 3..10 app-tree processes, 2..3 WebKit workers, 14 identity-coverage
gaps and an initially unavailable CPU delta. These observations do not prove
leak freedom or complete CPU accounting for transient/exited workers.
The separate sampler/accessibility/capture process tree reaches 33.623%
observed CPU and the private audio server 2.016%. This is measured workload
overhead; it is not subtracted from app callback percentiles.

The hardware is AMD Ryzen 9 5900HS with the actual Linux release app under
private Xvfb and software PipeWire, requested/observed 512 frames at 48 kHz.
No physical audio/MIDI path or physical underrun measurement is qualified.
Zero backend reports and software capture do not establish zero hardware
underruns. Pinned CPAL may create/free an owned error message outside the
strict app-owned data-fill and typed-error-action guard; the complete backend
error path is not claimed allocation/free/lock safe.

## Retained Attempts

- `native-clips/`: first attempt fails because the expanded footer obscures the
  editor button; screenshot/observation and runner log retained. The executable
  hash was not captured before rebuild. Embedded source ID, native identity and
  build logs must not be presented as a missing executable hash.
- `native-clips-compact/`: accepted clip journey passes; the additional stopped
  editor helper incorrectly requires Automation where the device reports Base.
- `native-clips-final/`: concurrent accessibility enumeration races a destroyed
  window. The harness changes to one UI thread; no app input assertion changes.
- `native-clips-single-ui/`: accepted clip journey passes; a hidden diagnostics
  readout returns an empty string during close/configure. The collector now
  records unavailable observations and resets the playing anchor.
- `controls-probe/`: added controls pass alone on the retained saved clip/chain
  fixture, with five retired epochs and 4.245 proven playing seconds.
- `native-accepted/`: combined clip journey and short controls pass.

Failing and intermediate observations remain raw evidence, separate from the
passing final attempt. The parent viewed the final saved/recovered screenshots
and independently verifies all retained bytes before acceptance. Source tests,
final build provenance, overhead distributions and review reports will be
retained when their qualification finishes.

## Frozen Source And Review

`checkpoint-68846ce/` retains the original review, binding requirements,
red/green units, native/contracts checks, storage/wire bounds, release flags,
same-source enabled/disabled distributions and build provenance. The parent
independently verifies 25 current/committed source/dependency hashes and nine
app/library/harness artifacts at that checkpoint. Alive is SHA-256
`293208e065f39cee382354184d60b9d064a41b1c34a197bd6acc60110fc26eb7`;
the final rebuilt Ultra is
`924d21eb5c3c58c6cea923bb009db136f78266b6322cc932fd9d241235c53bd6`.
The adjacent/build native libraries both hash
`36ca6d5dabb59949d04d600d57a5c529e79e17d144e7af35335ee4e91a43718c`.

Separate CPAL software capture passes, independently streamed as 150528 finite
stereo frames, SHA-256
`0771834d7280c033a2bd71ca2028b6a48edae8b6a8b58175e3db0924c7ba8d54`.
Raw PCM is temporary; the original stop/recorder status remains retained.

The native saved-fixture timing controls use three repetitions at each 256/512
frames, 5000 samples after 64 warmup callbacks, same source/fixture/library and
separate telemetry-enabled/disabled Rust release builds. Full distributions
and maxima are retained; disabled medians are slightly higher in this unpinned
run. No speedup, exact tiny overhead or percentile subtraction is claimed.
The first overlapping run failed because its test reused a monotonic request
serial; its raw log remains separate from the corrected sequential runs.

Independent review requires corrections for Ultra replacement/root-close
retirement refusal, contiguous collection beyond 64 epochs, recorder helper
cleanup and run-wide process/identity budgets. The original native workflow
above remains evidence for its exact source. It does not establish these
missing guarantees. A separate initial UI-overhead comparison is incomplete;
its blind disclosure toggles also leave comparative polling labels unverified.
Those labels must not be used as qualified overhead evidence. A bounded
corrected control comparison and scoped re-review are pending.

## First Correction Checkpoint

`fix-1/` retains the red/green tests, build/source manifests, actual Ultra
document workflow and actual Alive clip/observability workflow at `ccba93b`.
The parent independently verifies the source and retained bytes, six contiguous
final epochs, exact lifetime/histogram sums, 3826 callbacks and 1958912 frames.
The observed buffer is 512 frames at 48 kHz, with zero typed CPAL/render/shape
errors or processing-budget exceedances. The run proves 7.986888 playing seconds
and excludes 48.202768 seconds within 106.360617 wall seconds.

Its software capture contains 318464 finite stereo frames, peak
0.2225944548845291, SHA-256
`545d8b3f777988acd1a28fe78ddc8dfb4fe3c3c6445f84ab44276b5e67d9da2f`.
Sixteen captures across this workflow, the Ultra regressions and prior controls
were streamed independently; receipts are retained, raw PCM stays temporary.
The unchanged Ultra document assertions pass, including history, file/Close
choices, child/help lifetime and scoped Stop.

The 74 resource samples have 73 available app PSS values: 513996 -> 501254 KiB,
maximum 613485 KiB. Observed app CPU reaches 133.564% of one core; 15 identity
coverage gaps and 2..3 WebKit workers remain explicit. These short observations
do not establish absence of growth or complete process-tree CPU accounting.

`fix-1/disclosure-probe/expanded.png` shows the long summary tooltip covering
the pointer target. Keyboard activation verifies the disclosure state. This is
a retained interface finding for the final audit, not a claimed mouse fix.
Earlier incomplete controls and failed probes remain unchanged under `fix-1/`.
The passing `ccba93b` journeys do not close the remaining production-route issue
or qualify later corrected binaries by implication.

## Corrected Acceptance

`fix-2/final-qualification/` retains the complete final report, manifests,
review and non-PCM evidence for `3024057`. Earlier `fix-2/` receipts remain
immutable snapshots; final manifests include additional qualification scripts.
Alive is SHA-256
`6748f33372741244b417d0610a5105b926b893fbd7b742c8297b499dbc220ebd`,
Ultra `83217a1b207b9c2d29543d9f6bc0639349aeaf53ba6dc5d1ca1713a1ef36766e`.
Both adjacent/build native libraries remain `36ca6d5d...` as recorded in full
in the manifests. The parent verifies 21 committed source files and 21 final
binary/library/harness artifacts, including the actual release executables.

The final unchanged clip wrapper passes with six contiguous final epochs,
3787 callbacks / 1938944 frames, 8.178364 proven playing seconds and 47.839950
excluded observed seconds within 105.710847 wall seconds. All original clip,
editor, source-recovery, file/history and scoped-Stop assertions pass. All typed
CPAL/render/shape errors and processing-budget exceedances are zero. Capture:
317952 finite stereo frames / 6.624 s, peak 0.2225944548845291, SHA-256
`ed8767c361fcd83b201f4ce63abacab3e26197b6ef320811ded29f7656083e97`.
Raw PCM remains temporary. The parent checks exact counters/histograms, report
hashes, capture finiteness and completed recorder cleanup.

The affected real Ultra authoring workflow passes live numeric edit, unlocked
Undo/Redo, Save, stopped edit, restart with value retained and Close. Two failed
temporary probe fixtures remain retained. Focused Rust owner/lifecycle tests
pass 21 and existing Node routing tests 84; the previous full Rust pass remains
attributed to `ccba93b`. No production source changes follow the review freeze.

Eight explicit keyboard-disclosure-state control stages pass on the same final
Alive and saved two-track/four-device fixture: 63.230005 proven playing seconds,
two complete epochs / 8824 callbacks, zero reported errors/budget exceedances.
The parent recomputes every stage's observed CPU from raw PID/starttime ticks,
checks both streamed captures and confirms both recorder groups are gone.
Observed app endpoint CPU ranges 38.628..53.681% of one core across modes;
observer/capture ranges 1.113..9.770%. Full per-mode/repetition values and raw
samples remain in the final report. These noisy short runs support no causal
overhead estimate or subtraction from callback percentiles. The aggregate fill
p99.9 bucket is (1961172, 2048000] ns, maximum 2279092 ns over 8824 samples;
the final clock/publication tail is excluded.

The control run observes PSS 461980 -> 499640 KiB (+37660 KiB); the final clip
journey observes 527170 -> 497237 KiB, maximum 624672 KiB and 14 identity gaps.
Both growth and coverage limitations remain visible. The final profile is
still two tracks / six devices / eight clips, with 48 kHz stereo, requested and
observed 512 frames on the named software backend/hardware above. Capacity,
scenes, final 1800-playing-second acceptance, physical audio/underruns,
cross-platform runtime and leak freedom are not qualified by this checkpoint.

## Pushed Checkpoint CI

All three jobs in CI run `40078972894` pass on exact evidence checkpoint
`e1f09e5be8398ac631aad84c31a82895e5f54caa`. This includes the sampler units,
actual saved-clip/observability desktop journey, editor-resource regression and
CPAL software loopback. The full exact-head job receipt is retained in
`ci-e1f09e5.json`. Later capacity/scene changes require fresh qualification.
Both-app package run `40078972874` passes Linux, Windows/MSVC, Apple Silicon
and Intel macOS; publishing is skipped. `packages-e1f09e5.json` retains the
complete exact-head job receipt.

The Linux artifact `12554573512` is downloaded to `dist/alive/ci-e1f09e5/`.
`linux-download-e1f09e5.json` retains all four verified package hashes; the
Alive AppImage is `46db48f80db285e73051f70cac1c687e38928ca56e1fc22439f145f7b50d91a2`.
All four Alive/Ultra DEB/AppImage payloads pass extracted notices, own-library
linkage, native ABI and bundled-session offline rendering from outside the
repository with development library/display overrides removed. The qualification
receipt and full output are `linux-payload-e1f09e5.json` and
`linux-payload-qualified-e1f09e5.log`. An initial parent verifier import failure
before product execution is preserved in `linux-payload-e1f09e5.log`; correcting
the temporary probe's Python module path requires no source/settings change.
This is offline package qualification, not a graphical or physical-audio run.
