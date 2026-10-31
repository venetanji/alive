# Native Clip Observation Correction

Harness source `6ab77758959d47891ad45dc458f4c9cbe16ff282`, based on
`ee83d30`. Native product binaries remain pinned to `4b9a88b`; no application
or scheduling change is part of this correction. Independent review approves
after failure-screenshot isolation fix `a634f4d`. Its focused two-case regression
passes; the twelve native checks remain attributed to `6ab7775`.

Two controlled local failures explain the corrected test boundaries:

- A launch has 1481 frames (30.85 ms) pending at click return, but the original
  accessibility traversal takes 71.58 ms and first observes the applied state.
  Capture setup now precedes Start; a bounded early-bar prerequisite leaves
  time for the unchanged pending and applied assertions.
- A native tooltip covers the runtime disclosure. The original unchecked click
  leaves it closed. Existing owned-window readiness now precedes one activation.
  Only its receipt recording is guarded; actual input failures still propagate.

The original remote CI failure at `ad706ca` lacks insertion/first-sample timing,
so its cause remains unproved. These local reproductions do not establish that
remote cause. Failed probe setup and failed late-phase preconditions remain in
the logs and implementation report; they are not counted as successful REDs.

## Verification

All twelve final invocations pass: four new disclosure modes, seven existing
input/chooser/editor checks, and the original complete clip/observability
journey. The new modes cover normal input, receipt write failure, blocked
readiness plus receipt failure, and a direct input exception. They verify exact
error preservation, zero clicks when blocked, and release after a press error.
The four modes are wired into CI with artifacts. All prior CI steps/timeouts
and all 32 original clip assertions remain unchanged.

The original final journey takes 125.462 seconds through the wrapper; its
observability interval is 117.337 seconds. Pending/applied, history, saved
defaults, hosted editor lifetime, scoped Stop, dependency refusal/recovery,
save/reopen and Quit pass. Final counters report zero stream errors, rejected
commands and active voices. Cleanup checks 87 sampled PID/start identities;
none remain, and application/recorder/supervisor processes are absent.

Parent verification matches ten committed harness digests and five binary/
fixture digests. It independently streams 563712 finite stereo capture frames
(11.744 seconds), peak 0.22259445, matching the retained SHA-256. The original
sampler reports 6.737 proven playing seconds; neither that aggregate nor capture
duration satisfies the separate final 1800-second replayable endurance gate.

Linux native WebKit/private Xvfb and software PipeWire/CPAL, 48 kHz and delivered
512-frame buffers. Physical audio and physical underruns are unobserved. The
earlier pre-isolation passing run remains separate and is not final-source
qualification.

## Reproduction And Attribution

`implementation-report.md` describes the diagnosis, exact source boundaries,
commands and limitations. `final-verification-results.json` records wrapper
commands, mode flags, exits and elapsed times. Run from the repository root with
`ULTRA_TEST_ALIVE=1`, `ULTRA_TEST_ALIVE_BINARY` selecting the pinned coherent
Alive/Ultra/library directory, and `ULTRA_TEST_SCRIPT` selecting the named test.
The workflow contains the routine four-mode invocation. No audio/environment
settings changes are needed.

`integrated-harness-pins.json`, `qualified-build-pins.json`, `source-freeze.json`
and `final-source-continuity.json` preserve attribution; `retained-hashes.json`
inventories these copied raw artifacts. Raw PCM and additional probe artifacts
remain under `/tmp/alive-workspaces-clip-ci-fix/`, with capture hashes retained
here. Raw bytes and original warnings are preserved.
