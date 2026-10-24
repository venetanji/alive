# Task 13 Linux Callback Retirement Preflight

Read-only source inspection, 2026-10-24, against the pinned CPAL 0.18.2 registry
sources. No driver, dependency, configuration or source implementation changed;
no stream/failure was executed. This supplements the observability design and
does not establish runtime quiescence or cross-platform behavior.

## Normal Successful Stream

`src/host/pipewire/stream.rs:114` sends Stop and joins the worker when dropped
from a different thread. The audio driver drops from its serialized control
owner, not from a callback (`audio.rs:203`). In
`src/host/pipewire/device.rs:627`, Stop disconnects and quits the worker loop;
after `mainloop.run()` returns at line 661, the listener and monitors are
dropped before the worker closure ends. UserData owns any RT promoter;
`rt_promote.rs:89` shuts down and joins its helper. Static ownership therefore
supports collecting successful-stream final metrics after control-thread drop.
ALSA `src/host/alsa/mod.rs:1389` similarly signals termination and joins.

## Failed-Open Caveat To Resolve

`src/host/pipewire/device.rs:674` receives initialization with a timeout. On an
error, lines 682-684 drop the latch and return Err without joining the local
JoinHandle. The worker may still be connecting/unwinding; callbacks and their
captured Arcs need not have been destroyed when build returns Err. The latch
prevents ordinary processing before ready, but this alone does not establish
that all error-callback activity is complete. This is a source-derived risk,
not a reproduced late callback or an observed error loss.

Task 13 must not label failed-open epoch totals final solely because build
returned Err. A bounded callback-lifetime witness owned by each supplied data
and error closure could let control mark the attempt retiring and finalize only
after both closures are destroyed. Any chosen solution must retain bounded
storage/admission and disclose unresolved retirement; no callback waits, silent
counter reset, broad dependency repair or persistent environment change.
Successful stream finalization and a failed open's eventual finalization need
distinct focused coverage. Cross-platform drop behavior remains unverified here.

## Source Identities

Registry root:
`experiments/clockwork-faust/.deps/cargo/registry/src/index.crates.io-1949cf8c6b5b557f/cpal-0.18.2/`

The controller retains SHA-256 identities in the adjacent lifecycle-source-sha256
file before handing off implementation. Paths and line references describe this
exact local pinned dependency, not an arbitrary installed CPAL version.
