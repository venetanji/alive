# Quantized launch request v1

This additive capability leaves v3/v4 request layouts, reserved fields, bar-only
preparation and default requests unchanged. Quantization is a finite enum in
`alive-launch-v1.h`. Targets use beat-origin rounded points (at most 12 binary
search comparisons), plus the existing song/loop-entry seams. There is no
prepared fine-grid array and no accumulation of rounded periods.

## Admission and limitation

One accepted native control-consumption batch containing quantized requests is
allowed per rolling 1024-frame window. It uses the same optional guard credit
as Start/Seek. A batch may contain replacements and independent track requests;
a scene remains one atomic request. None uses this boundary too. A rejected
batch produces terminal work-limit receipts; the owner does not retry it or
move its target. Global Stop retains the independent reserved mailbox.

A separate prepared envelope adds two arbitrary transitions per track to the
existing bar/seam/placement boundary curve. The extra allowance is
`min(2, width - 1)`: the original first-sample reset/initial transition already
covers an arbitrary action there, and same-sample changes coalesce. Only
positive-length interior cuts need additional transitions.
For v3, the prepared bar-zero boundary guarantees `K(width) >= 1`, even for a
silent track, so the original reset allowance covers that first sample. For
v4, the existing `(K + 1) * transition` term supplies the initial allowance.
In a window no wider than 1024 frames, there can be at most one newly accepted
quantized batch, and at most one earlier pending quantized action per track.
Each track has only one pending action: replacement cannot increase that bound.
Old requests use their original bar/seam boundaries and can cancel/replace a
quantized action, but do not add another arbitrary boundary. Coincident changes
are still coalesced by the existing reducer. This bound covers different grids,
None, irregular loops and internal grid points without assuming a six-boundary
fine-grid schedule. The augmented composition admits at most the old six plus
two arbitrary boundaries; resource ceilings are unchanged.

On the first quantized batch, the optional horizon checks actual retained past
work against the augmented future curve. Acceptance activates that curve for
all future optional admissions until reinstall. Later batches must reserve the
same guard credit. Scheduled dispatch retains its exact frame/window ledgers
and fault guards. Default-only execution never activates the augmented curve.
A candidate whose augmented envelope exceeds existing ceilings remains valid
for its original ABI and reports `admitted=0` for the new capability.

## Evidence and scope

`alive_session_launch_target_test.cpp` independently enumerates beat points and
seams for all grids, equality, tempos 30/137/240 and irregular loops.
`alive_session_launch_test.cpp` uses saved instrument graphs, actual dispatch
traces/PCM, allocation/lock callback guards, 1/127-frame partitions, partial
loops, old/new v3 requests, disjoint tracks, same-batch replacement, scene Stop,
Return, seek cancellation, finite song end and work-limit refusal. A dense
fixture at 37-frame note spacing admits old playback while denying the additive
capability. Existing v3 runtime, v3/v4 layout and envelope suites remain gates.
These are deterministic software proofs, not hardware latency qualification.

The unchanged two-track `midi-arrangement.alive` example exceeds the additive
event/window proof (72 observed, 64 allowed), while its original bar launches
remain admitted. `quantized-midi.alive` is a separate sparse, admitted example.
The UI distinguishes workload refusal from a missing native library and retains
saved intent. Explicit changes to 1 Bar (or clip Global with Global=1 Bar)
remain available for recovery without erasing other overrides.
