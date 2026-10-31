# Native MIDI Song Loops

Implementation `5981cfeeefc52f6dcb0e1ee536c0bd3ff9ec9e4b`, based on
`0bbad1814dcd8eb58b39be42517aed1466e8a8f2`. Independent spec and quality review approves; see `independent-review.md`.
This is a provisional native runtime slice; shipping v4 remains disabled and
the current app does not yet provide Arrangement editing.

Partial song braces, exact reachable launch targets, coincident transitions,
loop-aware Seek and Stop/resume at the song end pass the focused v4 corpus,
unchanged 106,661,824-assertion envelope oracle and complete native CI.
The current-source shipping-refusal build passes separately.
See `implementation-report.md` and final command JSON/log pairs for scope,
commands, exits, earlier failing tests and exact evolved assertion.

The parent independently verifies all 274 raw artifact hashes, 33 source/library
pins and four committed source blobs. The two Session comparison pairs contain
10,401 and 20,480 finite stereo frames and are byte-identical. These are
deterministic offline renders at 48 kHz, not hardware, endurance or deadline
measurements. `parent-verification.json` records the independent checks.

Profile 1's two-track/six-root song fixture refuses root work 30 > 18.
Profile 2's eight-track/sixteen-root fixture refuses 52 > 48. Sparse admitted
fixtures and a six-root profile-2 fixture pass; they do not qualify arbitrary
full-capacity projects. Complete profile measurement and desktop integration
remain the next gates. No capacity or proof was weakened.

Raw fixtures, binaries, PCM and source copies remain at
`/tmp/alive-workspaces-task2c-song-loops`; `artifact-inventory.json` identifies
them. This directory retains reports, command records, work/dispatch/receipt
traces and pins without duplicating binaries or raw PCM.
