# Qualify One Device Profile

Read the exact current host/profile contract from the assignment. The source
examples below explain tested behavior; they do not override that contract or
authorize editing shared infrastructure.

The first agreed profile is `live12-analog-v1`. Its persisted source state is
`{version:1, profile, dllSha256, guiSha256, graphicsSha256, values:[...]}`, with all
203 native values; the device name `Analog` is separate. Paths are resolved from
the local installation and are not saved. Follow the current
`apps/ultra/ui/live-device-profile.mjs` contract as it is introduced by the host
work. A second device supplies its own qualified identities and complete native
state; it must not reuse Analog's count, profile ID or fixed descriptor layout
without evidence. The coordinator owns adding central profile registration.

## Use Existing Boundaries

- `apps/ultra/src-tauri/native/external_device/external_device.*` contains the
  retained PE DSP adapter. An installed DLL having seven familiar exports does
  not automatically qualify its object layout, constructor, imports or lifecycle.
- `apps/ultra/ui/live-resource-pack.mjs` reads the qualified local resource packs.
  `live-device-layout.mjs` expands XML into a view tree; `live-device-view.mjs`
  renders shared controls. UI resources live outside the DLLs in the tested build.
- `analog-bindings.mjs` shows descriptor validation, compound writes and stale
  generation/revision handling. `analog-parameter-display.mjs` shows physical
  conversions; its Analog tables and associations are not universal device data.
- `analog-default-loader.mjs` supplies bounded gzip decoding. The current Analog
  XML parser has device-specific root and scope rules. Do not broaden it silently
  or treat every `Manual` field as a DSP slot.

The installed model/UI names include Analog=`UltraAnalog`, Electric=`LoungeLizard`
and Tension=`StringStudio`. Collision, Corpus, Amp and Cabinet use their names.
Verify these against the assigned artifact revision before building a profile.

## Evidence To Mapping

For each candidate, record the full model path and native descriptor signature:
index, module, property, kind, min and max. Keep three functions conceptually
separate:

```text
native slot(s) <--- encode/decode ---> model property <--- format/parse ---> physical value
```

A profile may need one-to-many mappings, signed magnitude/flag pairs, reversed
ranges, offsets, wrapper-owned values, and commands affecting multiple properties.
Name similarity, a successful write, a moving dial or a midpoint value do not
establish the conversion.

Analog lessons with retained evidence:

- Noise and oscillator F1/F2 balances require `1-x` between model and native
  domains. The midpoint hid the mistake; an installed default eventually became
  silent because the active route fed a disabled chain.
- Signed oscillator pitch-envelope amounts require a magnitude and a sign slot.
  Separate non-atomic writes can transiently represent a different value.
- Some chooser labels and physical curves are defined by the Live host. DLL
  normalized ranges alone cannot provide Hz, ms, dB, enum ordering or inverse input.
- Cached commanded/applied values are not native state introspection. A UI
  acknowledgement proves transport handling, not audible causality.

Qualify endpoints and at least one interior value in both directions. For enums,
qualify every observed choice; for signed mappings, include negative, zero and
positive. Test inverse parsing independently of DSP encoding. Preserve exact
observed tables where a convenient curve fit changes values.

## Runtime Scope

Use the assignment's retained harness in an isolated subprocess and private build
directory. The current adapter only admits specific Analog/Electric hashes; a
worker must request central admission work for another device. Older Collision,
Tension and Corpus probes establish feasibility, not current support. Amp and
Cabinet constructor faults remain unresolved.

Establish neutral initialization, no-note/no-input behavior and finite output
before control causality checks. Test changes on an active audio path, repeated
notes and settled release. Include a long-idle note case when routing, voice
gating or decay could hide a fault. State residual noise and the release window.
Use appropriate input signals for effects; an instrument-only note test does not
qualify an effect's audio input path.

Measure initialization separately from rendering and editing: file/hash/image
mapping, construction, sample-rate setup, state restore, first render, state-only
publication/application and teardown. Include a structural graph edit while
audio runs. Adapter bookkeeping can dominate apparent DLL loading time; report
measured phases before attributing a delay to proprietary DSP or changing its
lifecycle. Build an instrumented copy privately, never over a mapped library.

Do not claim sample partition equivalence from different randomly initialized
instances. Do not claim hard silence from `ResetA` without output evidence. Do
not claim realtime safety from a finite short render. An in-process adapter error
guard does not contain arbitrary native faults or heap corruption.

## Editor, Defaults And State

Expand the actual assigned panel; enumerate controls in all reachable detail
views and conditional states. Keep counts of control instances, logical mappings,
native slots and source model fields separate. Show unresolved controls as disabled
and report missing custom drawings; a recognisable panel is not full coverage.

Use installed defaults as an independent consistency check for units and routing.
Publish validated source state transactionally before enabling notes. Failed
initialization must not leave a playable partial state or claim a loaded preset.
The host's full persisted native state and UI/model state must agree.

When state handling is in the assignment, save a non-default edit, destroy and
reopen, then compare both the editor and audible path. Verify two independent
instances with distinct edits. Expressive MIDI, tempo sync, automation timing,
transport and Alive admission require their own host behavior; profile facts alone
do not implement them.

## Acceptance

Return a tested subset with explicit unknowns when evidence is insufficient.
Core changes needed by several devices go to the coordinator with a narrow
proposal. Do not fork the renderer, add a per-device desktop app, copy installed
proprietary content into source, or enable unqualified controls to improve the
coverage number.
