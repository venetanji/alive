# Finite Multi-Track MIDI Preparation

Source `0606542c505f5ba615f43404b639f6c5f63e6e37`, base `e5b905f`.
The native test backend now consumes the independently reviewed complete MIDI
envelopes, prepares multiple sources/placements/tracks, and retains immutable
source/slot mappings plus candidate authority metadata. Shipping v4 capabilities
remain zero; the existing Session app and launcher are unchanged. Independent
spec and quality review approved with no findings; `review.md` records its
checks and the remaining gates.

Real saved Ultra instrument, utility and stateful-filter graphs establish:

- Two active Arrangement tracks produce matching PCM and dispatch frames under
  fixed 1/31/63/64/127/1024 and mixed host-buffer partitions, with shared absolute
  Start/Stop/resume boundaries.
- Offsets, adjacent same-source occurrences and gaps on one track preserve the
  other track's exact PCM, phase and epoch. Automation reconstruction, note
  entry ordering and one clear per changed occurrence are checked.
- Sparse eight-track admission uses eight independent instrument roots and one
  sounding Arrangement lane. It does not establish eight active musical lanes.
  Denser shape-valid cases remain explicitly refused by complete resource bounds.
- Actual dispatches, reconstruction reads, root clears and pre-reserved lookup
  probes fit their charges; recorded ledger costs fit all admitted widths
  through 1024 and fixed optional limits. Parameter-write charges are conservative
  ledger values, not independently counted DSP instructions.
- Invalid replacement configurations preserve the playing v3/v4 state; Stop
  and configuration removal leave every real chain silent across later fragments.

Final focused suites pass in 30.204187 seconds. The unchanged complete envelope
oracle passes 106,661,824 bounded assertions. One complete native CI run passes
in 157.490736 seconds, including old-version timing, receipts, capacity, guards
and original 42 + 42 Stop-stress cycles. A separate current-source compile without
the provisional test definition confirms shipping refusal. No Rust/browser/app
build or deadline qualification is claimed.

Commands from the repository root:

```sh
bash apps/ultra/tests/ci/check-native.sh
```

`focused.sh`, `red-green-commands.json` and named command metadata preserve exact
focused compile/run invocations. Initial two-track RED and an isolated lookup
reservation mutation RED are retained. The latter fails before an unreserved
fifth probe; the accepted eight-placement/64-Start test performs eight probes
and one horizon pass. An intermediate snapshot test failure counted deliberate
rejection-counter changes; its correction excludes only that diagnostic field.

`pins.json` binds tested sources, binaries and authored graph fixtures.
`parent-verification.json` independently checks 73 raw artifact hashes, 23
source/binary/fixture pins and five committed blobs. The curated manifest covers
the raw records, implementer report and parent checks. Generated executables,
mutation source copies and full frozen source remain in
`/tmp/alive-workspaces-task2c-midi-preparation/`; they are hashed rather than
duplicated into the repository. Earlier exploratory refusal logs were overwritten
by later runs and are not presented as retained raw evidence.

Launch, track Stop, Return, Seek, source/song loops and audio remain refused by
this finite runtime slice. Actual native app Arrangement, deadline admission,
save/Quit/reopen, imported WAV and final endurance are still future gates.
