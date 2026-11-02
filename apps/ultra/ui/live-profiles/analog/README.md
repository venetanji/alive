# Analog Profile Boundary

These authored adapters pin the unchanged Analog DLL and the current installed
GUI/Graphics identities. They do not register a playable profile or establish
complete factory initialization. Installed XML, presets and binary evidence stay
outside the repository.

`state.mjs` accepts only a complete, explicit six-field source state containing
all 203 native values. It validates the entire descriptor catalog and applies
bounded batches transactionally. Unrepresented native slots survive updates.
There is deliberately no default-state constructor: descriptor auxiliary floats
and range minima have no established factory-default meaning.

`model.mjs` retains 124 historical logical mappings and the existing native encoder.
Model decoding keeps the three reversed F1/F2 balances, octave/semitone offsets
and two magnitude/sign pitch-envelope pairs separate from physical display and
text parsing. `planAnalogPreset` reports mapped keys, preserved unknown model
values and untouched native slots. Its `complete` flag concerns that preset's
coverage, not the completeness of a separately supplied source state.
`applyAnalogPreset` requires explicit complete state and preserves untouched
slots; it never replaces missing values with a fallback.

Two historical associations are quarantined: `SignalChain1.LFOSyncToggle` and
`SignalChain2.LFOSyncToggle` no longer write native slots 81 and 164. The current
host explicitly reads `LFOGateReset` for those slots. The shared historical
encoder/facts still retain the contradicted associations; the owned adapter
filters them before calling that encoder.

`native-vector.mjs` inventories all 203 positions in the current host's explicit
property vector, including its 31 compound placeholders. `parameter-mapping.mjs`
admits a current static bridge: 172 atomic groups use 175 explicit model fields
to write all 203 native slots. This includes all ten FilterType choices, 28 signed
modulation pairs, polyphony's count/enable pair, three reversed balances, six
octave/semitone quantizers, 27 timeable booleans, four ordinary envelope booleans,
the separate hidden pitch-bend source, and three gated selections.
Polyphony Manual value 3 produces native index 0 value 2 and index 7 value 1.
The research baseline's index 0 value 4 is not original-default evidence.

Gated selections require both model fields in a plan. Their scalar encoder takes
the secondary toggle as its third argument. Native zero proves that a gate is
off but cannot recover its dormant selection: decoding returns `ambiguous: true`
and `value: null` unless the saved dormant value is supplied as a third argument.
The current planner validates the entire descriptor catalog, keeps compound
writes together, and applies them transactionally to an explicit complete state.
Its inverse rejects native filter type 5 because no ten-choice model value
represents that additional descriptor value.

`decodeAnalogCurrentState` reads all 175 current model fields from explicit
native state. It returns the three gated selections as null with named ambiguity
when their native gates are off, unless the caller supplies saved dormant
selections. It rejects native groups outside the model's representable domain.

Five source values remain absent from saved presets: envelope `ToggleDummy` at
87, 99, 170 and 182, plus `DummyPerNotePitchBendRange` at 194. They do not occur in the installed
172-field Manual preset. `On` and `PerNotePitchBendRange` occur in the preset but
are not the vector's dummy fields; neither is silently substituted. Complete
initialization stays false, and all five supplied native values survive plans
unless their distinct model fields are explicitly supplied. The ordinary Bool
source publishes its current byte as float 0/1; the hidden pitch-bend source
passes finite values 0..48 unchanged. Exact setup establishes four envelope
values as true, but construction observations and pitch-bend host derivation
remain separate from complete post-preset initialization. No defaults are added.

`editor.mjs` distinguishes editor navigation, unqualified routing commands and
retained model mappings. Its static coverage audit traverses expanded layouts,
counting control instances independently from drawings. It does not qualify
runtime editor behavior or make unknown controls writable.

The separate `auditAnalogCurrentEditor` reports 170 current static mappings and
five unresolved control instances: four Quick Routing commands and the ordinary
saved `PerNotePitchBendRange` field. It uses the current field inventory and
keeps every runtime input unqualified. The full-state decoder and this audit are
available to a future binding layer; they do not connect the shared renderer.

Evidence: Analog r1, manifest SHA-256
`3c70168eba0e0338dcf4c1b7d0bdfa90a99f5c3d8293cc0980a7ef7dd8e5e49b`.
Relevant payload IDs are `descriptors`, `authored-analog-bindings`,
`authored-analog-parameter-facts`, `historical-findings`,
`historical-conversions`, `resource-comparison` and the `xml-*` resources.
The host binary changed since the retained model/display evidence. These
mappings remain marked `historical-mapping` until current-host evidence
re-establishes the bridge and physical conversion contracts.

The fresh installed layout has 17 reachable resources, 719 nodes and 175 control
instances: 124 retained mappings and 51 unresolved controls in the owned audit.
The separate shared historical renderer still reports 126/49, reflecting its
unquarantined facts. The installed default has 172 Manual fields: the retained
adapter maps 124 fields into 126 writes, leaving 77 slots uncovered; the new
static bridge maps 170 saved fields into 198 writes, leaving five hidden values
to be supplied explicitly. Its full explicit field inventory covers 175 fields
and all 203 slots. These field, control-instance and native-slot counts describe
different boundaries. Two `AASLfoDisplay` and two `LedView`
instances have no qualified drawing. Four ADSR and two pitch-envelope drawings
use authored approximations whose exact Live time/loop geometry is unqualified.
`Contents.xml` and `GlobalDetail.xml` changed; `Global.xml` did not. The English
EnvelopeDetail and GlobalDetail language entries also changed.

Current static authority is Analog r2, manifest SHA-256
`f5ec6579cfbaf6203bfb1b9ac7e5e16be79055b356a109911d003a216b45730a`,
and host SHA-256
`5f0afddc288b352e92672de2df9175eaf81c9898fb5bd5faef6a09f155c45d26`.
Read-only PE/Capstone tracing establishes field offsets, exact vector order,
source converters, indexer operations and the native write callback. It does
not execute the host, call REA, or establish native readback, sound, automation
timing, smoothing, physical display/parsing or editor binding qualification.

The original first-page panel crop is 1164 by 308 physical pixels. It shows two
oscillator/filter/amplifier rows, a left Noise section, two right LFO rows,
the far-right Volume/Vibrato/Unison/Glide strip and the selected Global detail.
That detail contains Quick Routing, Vibrato, Keyboard, Unison and Glide groups.
The upper oscillator/filter/amplifier row, lower row and selected detail region
have distinct geometry. Exact CSS dimensions cannot be inferred because zoom
and DPI were not measured. Only the initial Global page was captured; other
detail-page geometry and dynamic control behavior remain unqualified.

Run the boundary tests with:

```sh
node --test apps/ultra/ui/live-profiles/analog/*.test.mjs
```

The separate `apps/ultra/tests/ci/analog-profile.spec.mjs` uses Chromium's real
DOMParser. Its optional local-resource test requires `ALIVE_ANALOG_PACKET` to
point to the private r1 `packet.json`; it checks the manifest digest and each XML
payload before exercising the shared layout reader and renderer. The shared CI
configuration is owned by the coordinator and does not select this test yet.

The ordinary `live.device~` object/presentation host is not yet ported to this
profile. The retained historical mappings are not connected to the user/native
UI and the importer registry is empty. The shared research fallback remains
outside this profile's original/default qualification. Passing this static
planner does not resolve those retained integration contradictions.

Current-host runtime mappings, complete initialization and panel fidelity,
native edited save/reopen, multiple-instance lifecycle/timing and actual Alive
admission remain coordinator qualification work. Passing these validators or
rendering the XML does not establish those stages.
