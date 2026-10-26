# Hosted editor activation observations

Initial diagnostic source: `6d8880319f60840d7ae3c005f5d803b347be052d`,
based on `8e17719`. This records the initial probe and diagnostic implementation;
independent review and any correction are attributed separately. The initial
review finds an important diagnostic-isolation gap: receipt-file writes can
abort the original focus continuation or mask its exception. Fix round 1 at `6d8c95a`
corrects it and passes scoped re-review; see `fix1/`. The initial full-journey
pass does not cover that write failure.

CI `40374437793` on `a1cf2e7` failed to observe the first Pulse editor window.
Its original cause remains unknown. The minimal collapsed-inspector probe and
one original playing suffix both open the editor with one original activation.
Focus scrolls the target before its original geometry query; the resulting
point hits the owned Alive window. The suffix's temporary DOM sidecar observes
pointer/click events, but its attempted invoke wrapper captures no receipts.
Do not infer a command-boundary trace or a repair of the earlier CI failure.
The initial minimal driver's later Quit failure is retained: it omitted the
fixture migration's Discard prompt. This is separate from editor activation.

The permanent change adds three bounded first-activation receipts using the
original input observer: chosen geometry/native owner, post-flush geometry,
and native window result. No retry, changed timeout or product change is made.
Original assertion/function preservation and unchanged binary hashes are
recorded in `preservation.json` and `source-freeze.json`.

The initial diagnostic implementation passes focused native RED/GREEN,
observer-error isolation, original missing-title assertion propagation and one
full original journey in 193.180813505 seconds. It preserves saved parameter,
effect, automation, mixer, source recovery, pending-history and Quit checks.
These results qualify that initial source, not a later correction. Observation
overhead and existing accessibility warnings remain in the original logs.

`implementation-report.md` and `hash-inventory.json` describe the complete raw
set at `/tmp/alive-workspaces-editor-ci-probe`. Parent verification matches
153 raw artifacts and five committed source pins. The 4229632 captured stereo
frames are finite with peak 0.3533542454; capture duration is 88.117333 seconds,
not proven playing time or endurance. Final reported stream errors and rejected
commands are zero. Recorder completion and process cleanup are separately
retained; the recorder's raw return code 1 is not rewritten as zero.

The product remains the coherent `4470230` release: Alive SHA
`ae23ba409de663921cce42ed01d66f27fd60fb007fffe126a77736067fa5d894`,
native library `1c579c6d63befb624166174c15a3235fa6fb71acab2e01f03aae124d7801b931`.
Linux / AMD Ryzen 9 5900HS, private Xvfb, software PipeWire/CPAL at 48 kHz,
requested/observed 512-frame stereo buffers. No physical-output claim.
