# Bounded Desktop Journey Timing

Initial implementation: `08156eae520945302b14697e23b11b0815aac387`.
The desktop journey's original 76 assertions, run body, capture assertions and
limits are preserved by the retained AST comparison. Direct execution adds
flushed UTC/monotonic checkpoints, separate capture and final-diagnostics
phases, named pending accessibility queries, inclusive query accounting and
bounded periodic main-thread stacks. Importing the journey does not activate
the probe. Normal and exceptional cleanup joins its observer.

The ten GI-free helper tests cover recursive lazy traversal, yield suspension,
early close, send/throw/return, exception identity, pending controls and bounded
retention/output/lifetime. Their raw RED/GREEN logs and exact verification
commands are retained. Query totals overlap; do not sum them or call them CPU
time. The workflow's five-to-eight-minute allowance is provisional diagnosis,
not a proved timeout repair or permanent deadline decision.

The actual unchanged native desktop journey exits 0 on the pinned Session
release without rebuilding: journey 185.551739 seconds, wrapper 194.927714,
capture finalization 1.362364 and final diagnostics 7.153391. Nine 20-second
snapshots and final Quit/report/observer shutdown survive; final active spans
are empty. `native-command.json` retains exact commands, exits and unchanged
binary/harness hashes. `native-summary.json`, `native.log` and `native/` retain
the observations and original final report. Parent checks source provenance
and independently streams 4245504 finite stereo frames / 88.448 capture
seconds, SHA256
`255fd426f4b6044f71296441b7d389cd0ee55bbe5ed3e46b0e647d7da0690338`.
Raw audio stays in `/tmp/alive-workspaces-ci-timing/native/`.

This is Linux, AMD Ryzen 9 5900HS, private Xvfb/software PipeWire/CPAL,
48 kHz stereo, requested/observed 512 frames. Inherited private-bus/GTK/portal
warnings are retained. The recorder's original requested-stop behavior returns
1 with complete cleanup metadata; the overall unchanged journey exits 0.
This is not physical audio, continuously playing time or endurance. No CI
runner stack or controlled baseline proves prior timeout causes or probe
overhead.

Independent review finds that ordinary stdout exhaustion can hide final-phase
entry/exit although artifact records survive. Fix `cb079f2` gives each of the
six finite final-phase boundaries a separate one-use reserve. The amended
existing test first fails against the original helper with all six rows
missing, then all ten tests pass. Repeated captures cannot consume the later
diagnostics allowance; ordinary, periodic and terminal caps remain bounded.
`fix1/` retains separate raw evidence and scoped review. The original full
native run predates this stdout-only fix; it is not relabeled as a new run.

See `requirements.md`, `implementation-report.md`, `independent-review.md` and
`fix1/` for the contract, findings and final scoped verdict. The manifest
covers curated files and committed source hashes; large audio/binaries remain
outside git. Production v4, Arrangement/audio support and final qualification
are unrelated future gates.
