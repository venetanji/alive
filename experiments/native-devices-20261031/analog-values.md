# Analog Values And Display

The native test host now displays physical values and loads supported values from
the user's installed Analog default preset. It no longer initializes every
parameter at its midpoint. The default preset remains in the installed Core
Library; neither its content nor the original host implementation is bundled.

## Conversion Evidence

The pinned host's AUltraAnalogRealValue converter, unit dispatch and chooser
constructors provide the display facts. Exact evidence is retained privately at
`~/.cache/alive-ultra-evidence/analog-values-20261031/`, including PE identity,
RTTI/vtable linkage, bounded instruction analysis, numerical table bytes and
constructor strings. Host decompilation did not finish; these findings do not
claim successful source recovery or runtime observations of the original host.

`analog-parameter-display.mjs` records interoperability facts: 15 deduplicated
128-point tables, observed parameter associations, units and enum ordering.
Interpolation uses x*128 below .5 and 64+(x-.5)*126 above it; a simple exponential
fit would produce different values. The inverse follows those same segments.
Oscillator detune uses the observed signed-square curve. The adapter also handles
mute, infinite sustain, stereo C/L/R pan and F1/F2 routing.

Independent installed-default checks produce master0.0dB, oscillator0.0dB,
amplifier-18dB, cutoff22.0kHz, attack5ms, filter release250ms and amp release500ms.
Physical parsing accepts explicit units while the binding, DSP and envelope graph
continue to use admitted model/raw values. Unknown conversions are not invented.
FilterType and LFOSync remain excluded until their paired native mappings are
qualified. The graphs remain normalized diagrams rather than exact physical plots.

## Initialization And Layout

The DLL constructor alone rendered no held-note audio in the controlled probe.
Native startup therefore uses an authored neutral, note-gated fallback. The host
then reads the installed gzip Analog.adv, validates bounded XML and encodes126
supported properties into128 fully checked native descriptors. A complete batch
is published before the keyboard is enabled. Unmapped wrapper/MPE/modulation
settings stay at neutral fallback values; this is not full preset fidelity.

Small dials keep readouts beside their arcs in the source36px footprint. Numeric
fields use the full grid track. Complementary visibility variants share one
stable slot, so Global's right-hand settings fit the490x83 inspector. Explicit
source background/foreground roles map to the shared dark/cyan control tokens.

Verification covers exact physical samples and inverse conversions, typed units,
integer steps, invalid drafts, bounds, enum order, installed-resource navigation,
preset publication before notes and rollback after startup transport failures.
Native tests independently cover batching, concurrency and release to silence.
Private captures and test logs accompany the retained evidence.

## F1/F2 Routing

The host model uses1 for F1, while the DLL's shared balance mixer uses0 for its
first output. Noise and both oscillator balance bindings therefore encode and
decode1-x. This conversion belongs in the shared binding specification, so
preset import, interactive edits, acknowledgments and polling use the same rule.
The display adapter continues to format the original Live model value.

All three captured mixer instances have the same process function at0x180037b90.
REA evidence ev_0735528e34fed5f432ac248eeec1df6a5d02b2dca675ebdc7d0dbb6770d21b30
retains its endpoint branches: balance1 zeros the first output and sends level
to the second; balance0 does the reverse. A native preset probe reproduced the
incorrect routing's decay toward silence after idle. Correcting only these three
balance conversions yields a stable held-note peak around0.031 after10seconds of
idle, with exact settled note-off silence and no renderer fault.

Unit regressions first fail for both native readback and preset publication,
then pass with the shared conversion. Original preset bytes and the private
native probe remain outside the repository.
