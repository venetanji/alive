# Analog Original UI Resource Followup

The original Analog layout has been found and decoded. This supersedes the
earlier investigation's opaque-pack boundary. The working integration is an
original reusable reader/adapter/renderer in Ultra's UI directory, exercised in
the existing Analog test window. It is not yet a registered `live.device~` object
or a functional/saved Analog editor in Alive.

## Observed Installed Artifacts

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| GUI.alp | 18944474 | 5ec872d673fd5f4f5f05787e4245c56e172ff2663c2d4493e94d598b883114e6 |
| Graphics.alp | 3477777 | a0b8aa480aa3d21f093b416ea59b3f200d2e2466936f95d886a554bffe875cb7 |
| Analog Contents.xml payload | 76887 | 948337e4d893bff645421cf657916518a3e79c303a102476f0896b8adb5e3636 |

`Contents.xml` is at `Devices/UltraAnalog/Contents.xml`, decoded pack offset
`0xf61ab8`. Its root is a `LoadableView`; it embeds the two oscillator/filter/amp
lanes, noise, LFO, global and selected-detail views. The folder contains 18 XML
documents and 112 language files. Seventeen documents are reachable from
Contents; RightTitleControls is a separate host-integration document.

Across the 18 source documents there are 534 PropertiesNodes, 36 nonempty class
names, 170 ConnectionProperties and 121 distinct connection expressions. Expanded
for this preview, repeated resources produce 719 view instances and 175 controls.
Neither of those counts equals the DSP's 203 parameter descriptors.

## Format Evidence

The pack-specific byte transform uses a 32-byte key indexed by the absolute
file offset: `(i ^ (i >> 8) ^ (i >> 16) ^ (i >> 24) ^ 3) & 31`. Bytes equal to
zero or the selected key byte remain unchanged; all others XOR with the key.
The keys recovered independently from known directory prefixes agree in every
slot across thousands of records. A naive unconditional XOR is incorrect.

Decoded packs start with `pl-a` and a little-endian u64 metadata offset. The
metadata preamble precedes a named root and recursive PackageItem records.
Each record supplies its UTF-16 name, child count, flags, payload offset/length,
and two observed-zero extension fields. Root metadata starts at `0x11cf833` for
GUI and `0x320be8` for Graphics; the metadata pointers themselves are earlier.
The preamble/footer meanings and Live's native key-generation implementation
remain unresolved. The reader gates production import on exact source hashes.

Independent offline validation covers all 2,696 GUI and 2,022 Graphics entries.
All 2,529 GUI payloads decode as UTF-8; all 394 XML files parse. All 1,946 PNGs
pass complete chunk CRC checks; the remaining Graphics payloads are eight TIFFs
with valid signatures and one UTF-8 text file. Payload coverage is contiguous
and nonoverlapping on both packs. The original JS reader's paths/offsets/lengths
agree with the independent private Python index for all 4,718 entries.

## What This Enables

The resource reader can supply the original layout to one generic Ultra object
or host; per-device editor binaries and hand-authored copies of every layout are
unnecessary. The prototype loads the user's resources at runtime and maps
recognized classes to the single shared Live-style component family. No original
XML/artwork/language files or copied application implementations are committed.

The current preview handles recursive resources, fixed/box/grid geometry,
localized labels, ordinary controls, card/finger navigation and local PNGs.
It explicitly diagnoses unimplemented custom displays and generated button
managers. Native import was observed loading automatically through the test
window's raw IPC resource command without manual file selection or audio startup.

The layout's bindings are symbolic: `SignalChain1`, `OscillatorLevel`, nested
`Envelope[0].AttackTime`, and `doc`. It does not supply DLL slot indices, parameter
ranges/defaults, enum entries, conversion code, or implementations of its custom
envelope and LFO displays. Static executable strings support compiled model and
view classes, but the main executable could not be decompiled in this pass:
Hopper repeatedly timed out during bridge readiness, and the target was closed.
No successful main-executable REA pseudocode evidence is claimed.

This resource-import checkpoint left synthesis controls disabled. The subsequent
[live-control followup](live-controls.md) now connects admitted mappings to DSP.
Whole-device state/presets, the registered canvas object, and Alive hosting are
still outside this preview. See `apps/ultra/ui/live-device-resources.md` for the
reusable API and exact current limitations.

Private probes, decoded source resources, independent indices, review
reproductions and screenshots are retained under
`~/.cache/alive-ultra-evidence/analog-ui-20261031/`. These are local research
artifacts, separate from the earlier frozen native-device checkpoints.

## Verification

The followup finishes with 611 passing Node tests and 14 focused browser tests,
including the optional installed-pack import and the existing keyboard checks.
The experimental native release builds successfully with the eight existing
warnings. A private native window automatically loaded the original panel,
mapped the intended experimental library and mapped no Wine libraries. Audio
was not started for this UI observation; earlier DSP/audio evidence remains
separate. No installed Ultra executable was replaced.

Independent review identified grid-placement, ancestor-expression, generated-tab
diagnostic, and property-amplification issues. The reader/renderer now has
regressions for these cases, immutable shared property metadata and aggregate
budgets. Oversized embedded content scrolls within its declared bounds. The
remaining pixel differences and compiled model/display behavior are explicit
preview limits, not passing fidelity claims.
