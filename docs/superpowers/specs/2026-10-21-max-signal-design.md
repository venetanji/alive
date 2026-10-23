# Max Signal Graph Foundation

The user goal remains every Max object and every installed help file working.
This phase adds a general signal graph and twelve connected MSP primitives.
It does not count admitted names, partial imports or original examples as
whole-help conformance. Current complete-help qualification is 0/2103.

## Execution

Append kinds 38..49 without changing the POD ABI or existing IDs. Prepare a
fixed topological signal order and inlet connection metadata off the callback.
Signal cables sum at each inlet. Mixed inlets also accept ordinary messages;
the measured Max topology rules determine when a stored scalar participates.
Control and signal cycles are checked separately. A path through snapshot's
sampled signal-to-message boundary is not a zero-delay signal cycle.

The backend processes controls, renders one frame from the existing native
voice engine, then evaluates the signal graph. Existing Clockwork/Faust voice
buses retain their 64-frame pipeline; new MSP sources produce the current
signal frame. Snapshot bang reads the selected offset in the last completed
64-frame vector, retained while DSP is off. Periodic observations round to a
vector boundary; exact Max scheduler cadence remains unqualified. All documents
finish their signal sample before sampled control notifications are delivered,
so named messages affect the next sample independently of document slot order.
The recorded Max restart policy resets Cycle phase and retains Phasor phase.

Gain attenuation moves into the signal evaluator so fan-out and separate gain
branches work independently. Voice banks render at full internal level. Legacy
Join and stereo-bundle Dac retain their saved internal types. A separate
signal_dac kind owns the actual Max dac~ spelling and mono channel inlets.
The legacy sink is authored as stereo.dac~ to avoid conflating port contracts.

There is one audio engine across documents. Local Stop silences only that
document's signal graph; accepted user control/parameter events and incoming
named messages or a global DSP restart can resume it. Controls running while
audio is off never advance DSP. No allocation,
locks, object creation or unbounded traversal is permitted on the callback.

## Object Contract

| ID | Document Key | Authoring Name | Configuration |
|---:|---|---|---|
|38|sig|sig~|args="0", one to eight numeric outlet values|
|39|signal_add|+~|rhs=0|
|40|signal_subtract|-~|rhs=0|
|41|signal_multiply|*~|rhs=0|
|42|signal_divide|/~|rhs=0|
|43|cycle|cycle~|frequency=0, phase=0|
|44|phasor|phasor~|frequency=0, phase=0|
|45|noise|noise~|no saved parameters|
|46|signal_clip|clip~|minimum=0, maximum=0|
|47|line_signal|line~|value=0, time=0|
|48|snapshot|snapshot~|interval=0, offset=0|
|49|signal_dac|dac~|channels="1 2", one to eight physical channel indices|

Noise retains Max's single physical control inlet. Its methods, including seed,
are explicitly refused until their behavior is qualified.

The table is the shared integration schema; observed defaults and methods are
reconciled against the original finite captures before the release gate.
The arithmetic capture establishes one shared scalar, initially zero even for
`/~`, updated from either inlet. With no signal connections the operation is
`op(0, scalar)`; with a left-only signal it is `op(left, scalar)`; with a
right-only signal it is `op(scalar, right)`; with both connected it uses the two
signal sums. Division by zero emits zero. XML defaults are not the oracle when
the original runtime disagrees.
Creation parsing must follow actual Max syntax, which need not expose every
saved inspector parameter as a positional argument. Noise seed identity and
signal/vector phase accuracy are explicit evidence questions.

The current host has two physical output channels. Other dac~ channel indices
must produce a visible unsupported-configuration error. The retained graph and
message capacities remain explicit limits of this phase, not Max limits.
Unsupported attributes, waveform buffers, signal cycles, transport units and
ezdac~ controls are not silently reinterpreted. Unknown behavior stays visible
in import diagnostics.

## Verification

Capture original arithmetic graphs with no, left, right, both and summed signal
connections plus scalar changes to either inlet. Capture constants, phases,
division by zero, clipping, ramp endpoints and snapshot observations. Retain raw
samples and exact environment/source identities. Reuse the existing 18-dsp
recording where its scope matches; it does not prove unmeasured behavior.

Require native sample-level tests, callback-partition invariance and sanitizer
checks, Rust/UI agreement on ports and defaults, all existing suites, original
runnable help, a rebuilt release and private desktop CPAL operation. Measure
the per-sample bridge cost rather than claiming hardware deadlines. Record
remaining gaps separately from demonstrated finite comparisons.
