# Receipt output isolation correction

Source `6d8c95a937a72c54db199f59fe556c0161ff662b`, based on `6d88803`.
Scoped independent re-review approves spec and quality; the original Important
finding is addressed with no new blocking issue. The initial review found that a
receipt write could abort the original action or replace its focus exception.

Three actual native RED cases reproduce queued-write failure, result-write
failure after successful focus, and result-write failure during an original
missing-window exception. All three GREEN cases pass after both complete
observation/output boundaries are guarded. The identical original focus
exception object survives. Setup and fallback-collector failure checks pass;
unavailable in-memory evidence is bounded and invents no native ownership.

The unchanged full native journey passes once in 193.828069653 seconds on the
final source. All 76 original assertions, original input and timeout remain.
There are three first-activation receipts, zero final reported stream errors
and rejected commands, and verified final Quit/recorder/process cleanup.
The original CI activation cause remains unknown; this corrects the added
diagnostics, not a demonstrated application editor fault.

Parent verification matches all 194 raw artifacts and five committed source
pins. The software stereo capture is finite: 4253696 frames, peak 0.3533542454,
88.618667 capture seconds. It is not endurance, proven playing time or physical
audio. The original 153-artifact investigation remains byte-identical.

Raw evidence: `/tmp/alive-workspaces-editor-ci-probe/fix-1`.
`implementation-report.md` records exact commands, failure paths and limits;
`hash-inventory.json` pins the complete raw set. Product/binary and backend
attribution remain those of the initial investigation: coherent 4470230 release,
private Xvfb and software PipeWire/CPAL, 48 kHz stereo, 512-frame requested and
observed buffers. No product build or audio/backend setting changed.
