# Reuse Faust HOA DSP, do not reimplement it

This is a **standalone offline research probe**, not an Ultra feature or native
audio-bus implementation. It compiles the repository's existing pinned
Faust 2.88.0/`hoa.lib` into C++ and runs real sample buffers through it.
The probe uses the existing pinned compiler/library installation without network
access or JIT. It adds no runtime dependency to the Ultra app.

## Decision

Reuse `hoa.lib` for the DSP it already supplies. Its circular 2D path includes
encoding, multi-source encoding, rotation, optimization, regular/irregular
loudspeaker decoding, stereo decoding, and spatial effects. Its 3D section
provides a spherical encoder, a moving-source encoder, and optimization.

**Do not equate that with a complete 3D output pipeline.** The pinned library
does not define `decoder3D` or a general 3D sound-field rotator. `rEncoder3D`
moves the direction of a source while encoding it; it is not arbitrary-field
yaw/pitch/roll rotation. Its `decoderStereo` is a circular 2D loudspeaker-based
stereo approximation, not a 3D/binaural HRTF decoder.

Official sources, read 2026-10-20:

- [Faust HOA documentation](https://faustlibraries.grame.fr/libs/hoa/)
- [Official HOA source](https://github.com/grame-cncm/faustlibraries/blob/master/hoa.lib)
- [IEM's ACN/SN3D compatibility description](https://plugins.iem.at/docs/compatibility/)

The website describes current upstream. **The equations and measured behavior
below refer to the pinned local source**, not an assumption that upstream is
unchanged. Local evidence: `../faust-reference/.deps/faust-2.88.0/libraries/hoa.lib`,
especially lines 99–100, 244–247, 732–742, 1130–1188, and 1260–1362.

## Exact formats and limits

### Circular 2D

For signal `x`, azimuth `a` in radians, and compile-time nonnegative integer
order `N`, `ho.encoder(N,x,a)` returns **2N+1** coefficients:

```text
index 0       = x
index 2n - 1  = x sin(n a)    n = 1..N
index 2n      = x cos(n a)    n = 1..N
harmonic m    = 0, -1, +1, -2, +2, ... -N, +N
```

This is a unit-amplitude real circular/Fourier basis: omni gain 1 and no
extra scaling of sine/cosine pairs. For an encoded unit source, each pair has
sum of squares 1 and the complete field has sum of squares N+1. It is **not
a full 3D ACN/SN3D or ACN/N3D bus**, even when a channel count coincides.

For the regular `P`-speaker ring, the actual decoder is:

```text
b_j = 2 pi j/P
speaker[j] = H0/P + (2/P) sum[n=1..N](
    H[2n-1] sin(n b_j) + H[2n] cos(n b_j))
```

The documentation requires `P >= 2N+1` and prefers `P = 2N+2`.
`ho.rotate(N,r)` advances the encoded azimuth to `a+r`.

### Full spherical 3D

`ho.encoder3D(N,x,a,e)` returns **(N+1)^2** coefficients. Indexing is exactly:

```text
l = floor(sqrt(index))
m = index - l(l+1)
index = l(l+1) + m     [ACN]
```

The magnitude normalization is SN3D:

```text
k(l,m) = sqrt((2-delta(m,0)) (l-|m|)! / (l+|m|)!)
```

However, **directional convention needs an adapter**. Compared with conventional
right-handed `+X front, +Y left, +Z up`, azimuth positive toward +Y, and elevation
positive toward +Z, the pinned library produces:

```text
raw[index] = (-1)^l x Y_SN3D(l,m,a,e)
raw first-order coefficients = x [1, -cos(e)sin(a), -sin(e), -cos(e)cos(a)]
```

Thus a source at azimuth 0/elevation 0 starts **[1,0,0,-1]**, not
[1,0,0,+1]. It is the antipodal direction, **not a different magnitude
normalization or channel permutation**. The source uses a Condon-Shortley
phase in its associated Legendre recurrence and evaluates it at
`cos(e+pi/2) = -sin(e)`; together these give the degree parity above.
The source's azimuth adjustment also preserves that interpretation beyond
the usual elevation range.

`hoa3d_ambix.dsp` reuses the encoder and merely multiplies odd-degree bands by
-1. This small, tested adapter then emits conventional ACN/SN3D, through N=7.
Do not apply it blindly after upgrading Faust: rerun this probe first.
To convert conventional SN3D to N3D, **multiply actual samples** in degree `l`
by `sqrt(2l+1)`; a metadata rename is not a conversion. An N3D adapter is not
implemented in this probe.

### Channel cap versus library support

Both encoders are parameterized by a compile-time order. These definitions do
not impose a fixed order/channel maximum; compilation cost, numerical accuracy,
optimizer arithmetic, and host resources still impose practical limits.
This probe does **not** claim arbitrary-order numerical robustness.

With Ultra's current **64-channel control-contract cap**:

- Circular 2D: `2N+1 <= 64`, so `N <= floor((64-1)/2) = 31`, using 63 channels.
- Full 3D: `(N+1)^2 <= 64`, so `N <= floor(sqrt(64))-1 = 7`, using 64 channels.

The real encoders are compiled and run at those two orders. This is evidence
for those tested orders, not a claim that 31/7 are Faust's own maxima.

## Required host/layout work, deliberately not done here

`apps/ultra/ui/audio-bus.mjs` currently accepts only full 3D ACN with explicit
SN3D/N3D metadata, plus the separately validated circular 2D layout added with
this probe. `circularBus(N)` returns a channel count of `2*N+1` and:

```js
{kind: "ambisonic", dimensions: "2D", order: N,
 ordering: "W-SIN-COS", normalization: "UNIT"}
```

The contract accepts orders 0–31 and uses the circular equations above. It
rejects 2D/3D mismatches even when channel counts coincide. This is metadata,
not an integrated spatial processor. Do not silently zero-pad, truncate,
relabel, or route a circular field into a full 3D field.

For 3D, reuse the existing format only **after** the coordinate adapter. A
raw-faust convention would require its own explicit coordinate metadata instead.

Native `Engine::render_bus(AudioBusView,...)` currently requires exactly two
non-null output channels; the legacy C stereo API remains available. None of
these tests make it multichannel. The remaining application work is bus storage,
bounded channel processing, validated format-aware graph connections, and an
explicit output decoder/device mapping. Keep speaker feeds, coefficients, and
stereo outputs distinct.

## Reproduce

From the repository root, with the existing reference dependencies present:

```sh
python3 experiments/faust-hoa/generate.py
bash experiments/faust-hoa/test.sh
bash experiments/faust-hoa/test.sh --sanitize
```

`generate.py` uses the pinned `libfaust.so` C API and verifies all dependencies
listed in `dependencies.sha256`. `test.sh` first recompiles to temporary files
and checks that the five checked-in generated headers match exactly, then builds
and runs the C++ harness. No Faust shared library is linked into the resulting
probe. Address/undefined-behavior sanitizers are optional; leak detection is
disabled by default for this sandbox, as in the existing reference experiment.

The source DSPs use named signal arguments intentionally. Passing an unbound
`_` directly into a recursive Faust function can expand its required input
arity rather than sharing one signal.

### Recorded results

2026-10-20, Linux x86-64, existing Faust 2.88.0, g++ 14.2.0/C++17:

```text
PASS pinned Faust 2.88.0: 5 generated C++ files verified
PASS 2D N=31 channels=63 [1,sin(a),cos(a),...,sin(31a),cos(31a)]
PASS 3D N=7 channels=64 ACN; raw +X first four=[1,0,0,-1]
PASS 3D SN3D magnitudes, antipodal parity (-1)^degree, extended elevations
PASS odd-degree sign adapter gives conventional ACN/SN3D, N=7, 64 channels
PASS 2D N=3 encode, rotate, in-phase, 8-speaker matrix, stereo finite/silence
PASS 3D N=3 basic, maxRe, in-phase coefficients
PASS 64-channel host cap implies 2D order<=31 (63 channels), 3D order<=7
PASS checks=117368 max_abs_error=3.041359938e-06 tolerance=2e-5
```

Both the optimized build and the ASan/UBSan build passed with those results.
The existing `faust-reference` test and all 14 current `audio-bus.test.mjs`
tests also passed. This is focused probe verification, not an assertion that
the entire Ultra application or physical multichannel playback was tested.

Tests use 521 frames with varying positive/negative/zero input, varying azimuth,
normal and extended elevation, poles, independent spherical-harmonic equations,
per-degree energy identities, and bit-exact single-sample/regular/irregular
partitions. The stereo decoder is tested for compilation, finite output,
silence, and partition invariance, **not** perceptual quality or a complete
stereo-transfer oracle. Moving-source encoders, irregular decoders, and spatial
effects are source-inventoried but not exercised by this small probe.

The convention-adapter assertion was run first with the raw encoder and failed
as expected (`actual=-1`, `expected=+1` for +X), then passed after adding the
odd-degree sign correction.

### Dependency identity

`hoa.lib` declares version 1.5.0 in this distribution. The complete lock file
contains the compiler, release archives, all 56 `.lib` source files, and the
three directly included architecture headers. Key SHA-256 values:

```text
Faust source release archive:
e4e175cf236924b5b7d4784cbb8c50cc01e211159e169655dd9e6d8f92b871d9
Official libfaust release archive:
7f7784567d8770dfbc1351f53b32dfb4d4c5baef0ba5f39fd925d5407ab63ff2
libfaust.so:
22b06ef2884d69e4a5660b98a635f411d1a94acdcec112b56902ad096b6b14b9
hoa.lib:
b443a4aeed331235c584fd706f286cb5dbde4c831a38a77ddc39b4e6c60ecadf
```

The existing source archive's library license is LGPL with an exception
permitting generated compiled code to use a chosen license. This probe does
not change licensing or redistribute the dependency archives.
