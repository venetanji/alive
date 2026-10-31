# Arrangement Blank-Lane Geometry

Original CI `40728696609` at `49d68bb9fa7e7d1d07ddd26950a22f62a3ba89c6`
fails the blank-lane geometry read before any pointer input. Native and
UI/reference jobs pass. All four packages in `40728696620` pass, with
publication skipped. Terminal receipts and original failed-case trace,
screenshot, context and job log are retained here.

Reviewed test-only candidate `f03516116de0d0823851d9e789f5078e1cecb3f4`
reads the current first lane and its nonzero rectangle in one browser
evaluation. The original real drag coordinates, six-step pointer movement,
source/placement, stale-gesture, brace and history assertions remain intact.
Fresh independent `gpt-6.1-terra` spec and quality reviews find no blocking
issues. Root applies the complete one-file diff byte-identically and passes
syntax/whitespace checks; full integrated browser and final-head CI are pending.

The retained control passes; a real zoom redraw induced between handle
resolution and its geometry read detaches the old lane and reproduces the
original null-box error. Mutating only the new helper to the old path makes
the permanent regression fail; restoring the exact candidate makes it and the
original scenario pass. The green candidate observes a real redraw before its
atomic read. This proves sensitivity to the induced mechanism, not the exact
trigger of the cloud failure. Later layout movement and other geometry reads
remain outside this correction.

Worker tests used two short, serialized windows explicitly released by the
native worker. No root browser, native, GUI, audio or performance workload ran
during the ongoing native measurement lease. Browser evidence does not qualify
Master DSP, a new launcher, endurance or physical audio.

`manifest.json` pins the complete diff, source and retained artifact hashes.
Original logs use deterministic gzip to preserve their exact formatting;
`gzip -dc <file.log.gz>` restores the original bytes. Original-content and
archive hashes are both recorded. These are original Alive captures and
fixtures; no licensed Live/Max content is included.
