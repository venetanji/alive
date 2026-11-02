# Electric Profile Qualification

This module directory contains authored interoperability facts for the locally
qualified Electric DLL and current GUI/Graphics resource identities. It is not
registered as a playable profile. There is no guessed native default state.

`facts.mjs` provides all 33 native signatures. Descriptor auxiliary floats are
deliberately omitted: the retained catalog does not identify them as defaults
or internal native-state readback. `state.mjs` validates complete commanded
state and applies bounded updates transactionally. Validation establishes
representability, not correct initialization or audible meaning.

`default-model.mjs` parses direct `LoungeLizard` Manual fields from an already
decoded, bounded preset XML string. It returns model values, missing known
fields and preserved unknown fields. It does not apply them to DSP. Gzip
decoding, artifact verification and transactional host initialization belong
to the shared host/import boundary.

`bindings.mjs` identifies editor-owned navigation separately from model
properties and supplies the shared editor interface with no admitted DSP
bindings. Unqualified controls resolve to null and remain disabled. The shared
renderer owns FingerView/CardView navigation; these values are never added to
the six-field persisted native source state.

`parameter-mapping.mjs` admits all 33 statically qualified raw conversions. The saved
`PickupModel` integer 0 or 1 maps unchanged to native index 23, signature
`(module=616, property=11, kind=3, min=0, max=1)`. Current host registration,
property-vector construction, enum integer-to-float output and the native
`SetParameterA` bridge establish the path. All 29 normalized real vector fields
map 0..1 values unchanged to their exact native indices. Their property setup uses the
default 0..1 linear raw-value converter; the AAS display formatter is separate.
The float source and native index/value forwarding retain those normalized
values. Polyphony maps integer enum indices 0..30 unchanged to slot 0;
displayed voice counts 2..32 are separate. KeyboardTranspose maps integer
values 0..24 unchanged to slot 30 through the exact legacy quantizing converter
and its matching endpoint ranges. The separate DummyPerNotePitchBendRange
maps integer values 0..48 unchanged to slot 32 through the unit-step converter.
Encode/decode reject other values and indices. These pure conversions
do not enable editor transport or provide
complete native initialization, native readback or runtime audio qualification.

`initialization.mjs` validates all required native source fields and returns an
immutable complete 33-slot plan only when every value is explicit. The installed
preset supplies 32 of these fields; it does not contain
DummyPerNotePitchBendRange. The planner reports that exact missing slot and
returns no partial batch. The current host constructor explicitly initializes
the dummy field to 48 while the separate saved PerNotePitchBendRange is 0;
the planner never substitutes either value. Host/MPE initialization behavior
must be qualified before selecting the constructor value for runtime use.

With an explicit parsed model-value Map, `bindings.mjs` provides immutable
read-only snapshots for disabled controls. `parameter-display.mjs` supplies
33 statically qualified physical displays and inverse parsers, including the
exact current Volume and FineTune float32 curves, native precision/suffixes,
transpose offset, polyphony choices 2..32 and the constructor-proven R/W order.
The 34-field catalog explicitly excludes host-owned `On`. Valid snapshots are
`verified:true` with authority `current-host-static`; every snapshot remains
`enabled:false` and supplies no writer or DSP transport. Invalid values remain
unverified and display `--`. `display-curves.mjs` contains numerical conversion
facts, not copied UI resources. Decimal precision and suffixes are traced;
C runtime half-tie rounding has not been compared at runtime.

Evidence revision: `live-device-evidence-v1`, Electric r5, manifest SHA-256
`69ceb28c1c5c9515dbed0cb964b203076b64e2e656ae5fc087f2a88a5429d8de`.
Relevant payloads: `native-descriptors`, `default-model`, `ui-model`, the six
`ui-xml-*` resources, `current-resource-comparison`, current host constructor
and vtables. Additional private read-only PE/Capstone observations pin host
SHA-256 `5f0afddc288b352e92672de2df9175eaf81c9898fb5bd5faef6a09f155c45d26`.
Installed source payloads and private qualification captures stay outside the
repository.

Electric r6 additionally supplies an original installed Live Hammer-page panel
capture, manifest SHA-256
`741d6ae704fb925c3354d0d43c071beac753c84794b3591f78ccfadf525052c1`.
The capture supports visual comparison only. Separate current-host static
evidence qualifies the mappings, selector labels and physical curves.

Controlled private ordinary-note probes with an explicit complete 33-slot
candidate additionally exercised descriptors, initialization, notes/releases,
active Volume updates, two instances and one edited save/reconstruct run.
The candidate keeps `runtimeEligible:false`; these observations do not select
a generic missing-field policy or establish deterministic reconstruction.
The installed default still produces no initialization plan without an explicit
DummyPerNotePitchBendRange value.

Required before registration: qualified model/native bridge and every slot's
initialization policy, runtime comparison of physical parsing/rounding,
complete panel support, transport and actual Alive timing/admission. Current
resource captures resolve all 33 controls with zero enabled inputs, but native
ClickMapView/LoadableAnimationView artwork, detailed geometry and clipping
remain incomplete. Static display qualification does not establish knob-angle
curves or original-panel visual fidelity. None of the remaining gates follows
from passing the state validator or private note audio alone.

Run boundary tests with:

```
node --test apps/ultra/ui/live-profiles/electric/*.test.mjs
```

The browser parser tests are in `apps/ultra/tests/ci/electric-profile.spec.mjs`.
They use authored inline XML and the real Chromium DOMParser. The coordinator
owns adding this specification to shared CI configuration when appropriate.
