# Complete MIDI Envelope Preparation

Source `c8f6522780b1b8c79b8c9056a94073d839518f90`, base `5abd9eb`.
This slice adds an off-callback C++ preparation seam and independent scalar
oracle. The current finite runtime, configure/request gates, shipping feature
bits, work ceilings, ABI and working Session app are unchanged. Broader playback
must consume this proof in subsequent native slices before desktop admission.

The six curves bound events, root clears, event reads, parameter writes, guard
comparisons and placement work for widths 1..1024. Source/offset uses stay local;
the builder does not expand all repetitions. It handles finite/cyclic suffixes,
arbitrary entry, placement boundaries, partial song loops and independent track
authority/phases. Every track's K is checked before any segment DP: six is
accepted, seven/eight refuse before DP, including a dense later track.

The retained final oracle reports:

```text
PASS: sources=8576 boundaries=7620 splices=144 authority=217600 native=12792 accepted=13 refused=1 assertions=106661824
```

These are bounded, factored domains, not an unbounded Cartesian proof. Native
fixtures include 188/375-frame suffixes, offsets, nondividing partial loops,
three/eight-track sums and full-chain automation writes. Thirteen sparse
variants accept; dense event and maximum-use placement refusals retain the
original limits. Prefix/loop maxima and transition allowances deliberately
overestimate some costs. `preparation-notes.md` explains that narrowing.

Commands from the repository root:

```sh
c++ -std=c++17 -O2 -Wall -Wextra -Werror \
  apps/ultra/tests/alive_session_workspace_envelope_test.cpp \
  -o /tmp/alive-workspace-envelopes
/tmp/alive-workspace-envelopes
bash apps/ultra/tests/ci/check-native.sh
```

`red-green-commands.json` and raw logs retain the initial missing-capability
failure, the sparse-eight-track conservative refusal and corrections.
The final oracle compile/run and one complete native CI run pass; CI elapsed
144.071532 seconds. Existing v1/v2/v3/v4, layout, guard, capacity, shipping
refusal and original queued-edit Stop tests remain in that run. No app rebuild
or unrelated Rust/browser suites were repeated.

`pins.json` records five committed source blobs, compiler, oracle binary,
generated saved-graph fixture and reused native-library/core hashes.
`parent-verification.json` independently verifies 23 raw artifacts, nine pins
and all five committed blobs. `manifest.json` hashes the curated raw records
and implementer report. Large/generated executable fixtures remain under
`/tmp/alive-workspaces-task2c-prep/`, at the paths recorded in the pins.

This proves preparation arithmetic within the tested domains, not native
callback timing, production v4 admission, new GUI behavior, imported audio or
endurance. Independent spec and quality review approved this slice with no
findings; `review.md` records its checks and the remaining runtime gates.
