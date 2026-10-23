# Preparation006 Failure Latch Fix

Fix the parent-reproduced scheduling failure in the frozen006 implementation.
The accepted trace-only brief remains in force. Own only controller.js and
test_helpers.cjs; no preparation, launch, commits or further delegation.

## Reproduced Failure

The initial install schedules its Task before writing the poll-scheduled trace
marker. A marker sink failure sends a negative ACK and deactivates tracing,
but the already scheduled callback remains runnable. A synthetic fixture with
sinkFailure rejecting the first append after openfile-return has zero calls
and a sink refusal after start(); draining its existing queue then produces
70 polls/420 capability calls and overwrites the instrumentation refusal with
an ordinary class refusal. The existing valid flonum bind fixture instead
overwrites that negative ACK with success after ten polls. The recurring
schedule-before-marker site has the same exposure. This violates fail-closed
instrumentation and durable failure semantics.

Initial006 is preserved at private arithmetic-package-006-review-base with
sixteen files plus binding.json. Binding SHA-256:
`535b41f2e055757a78b301c04e086267f743df84bfd2fdaa39884153c0a46839`.
Package SHA-256:
`4e64a9ad5af3f27a43e231eeadde0feebce842dc09c1de47f74c97527aa4a2c0`.
The initial implementation report, review diff/map and independent review
remain historical. Do not overwrite them.

## Required Correction

Add a per-install terminal failure latch so a callback already scheduled when
instrumentation fails cannot perform later host reads, validation/probes,
messages, binding/helper installation, journal writes or ACK publication.
Bind the latch to the original install rather than a mutable future global
trace identity. A stale callback must remain inert even if another install
starts or the global trace pointer changes. Preserve the original refusal ACK
bytes and its available diagnostics/results. Do not introduce new host probes,
retry/capacity/timeout changes, or require a new Task capability to establish
the latch. Healthy times/minus and healthy traced scheduling remain unchanged.

Add RED/GREEN regressions for initial and recurring scheduled-marker failures,
both strict-refusal and otherwise successful bind fixtures. Explicitly run
already queued callbacks after refusal; prove zero additional target/property/
capability/helper activity, no reschedule, unchanged journal and byte-identical
ACK. Include a stale-callback case after trace/global identity changes. Keep
all previous trace, bounds, capability, settling and P1/P2 tests.

Run the complete Node helper suite and syntax checks, then freeze only these
two files and write a separate preparation-006-fix1-report.md. Report RED/GREEN,
the two-file and package hashes and unchanged fourteen-file/score scope.
Parent owns independent scoped re-review, combined verification and any fresh
preparation/capture. This fix grants no class admission or runtime parity.
