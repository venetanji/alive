# MIDI Source Suffix Loops And Arrangement Seek

Source `a0c34e3006dc920632ec95609ff6e280a70769dd`, base `65eb486`.
Independent spec and quality review approve with no findings. This is provisional native support, not an
available Arrangement app feature. Shipping capabilities remain zero.

Sources repeat the suffix `[offset, source end)` without expanded event lists.
Occurrence cutoff and distinct adjacent placements reset the full affected
chain once. Arrangement-only Seek preserves independent Session phase, cues
and exact instrument/effect PCM. Queued seeks resolve the final candidate once.

The carried regression establishes a committed pending scene, then refuses a
Seek under retained event pressure. Pending identity and receipts survive,
guard 9252 / placement 2058 work remains charged, and rendered PCM equals the
continuation control. A later accepted Seek cancels pending members only after
the spent history expires. These are real-device offline tests.

Coverage includes offset-held notes and automation order, finite cutoffs,
375-frame/120 BPM and 188-frame/240 BPM minimum loops, different simultaneous
source periods, gaps, same-source placements, stopped/ended cues, Stop/removal
silence and unchanged pending-slot publication across source seams. Identical
absolute gestures produce exact PCM/dispatch under 1/31/63/64/127/1024 and mixed
host buffers. All work ceilings and the complete envelope oracle are unchanged.

Final focused suites pass in 49.377 seconds; the full native suite passes in
175.986 seconds, including 106661824 oracle assertions and 42 + 42 original
Stop stress cycles. Current-source nonprovisional shipping refusal passes.
Exact-base REDs establish the prior suffix/Seek refusal and the carried pending
Seek case. A separate development RED catches redundant final-candidate lookup.

```sh
bash apps/ultra/tests/ci/check-native.sh
```

Commands, output, source pins, dispatch/work/receipt traces and the full report
are retained here. Parent verification matches 151 raw artifact hashes, 22
source/fixture/library pins and five committed blobs. It independently verifies
6000 suffix frames, 10240 seek-gesture frames and identical 4099-frame refused
Seek/control renders, all finite stereo float32. No app, deadline, physical
audio or endurance claim follows from those renders.

Raw binaries, configurations, PCM and frozen source copies stay under
`/tmp/alive-workspaces-task2c-suffix-seek`; their focused inventory is retained.
Partial song loops/coincident boundaries, measurements, desktop admission and
the actual MIDI timeline journey remain next; WAV follows that journey.
