# Native device experiments and shared controls

User direction: Analog first, then Electric, Collision, Tension, Corpus, Amp,
and Cabinet. Ultra and Alive share one set of Live-style UI controls. These
are Ultra's default controls, without a second Max-compatible control family.

## Architecture

Saved Ultra devices remain the unit hosted by Alive. Controls are authored
JavaScript/CSS/SVG components shared by both views; native instances and audio
remain owned by the host. Read the licensed local installation for reference,
but ship neither its binaries nor its source, fonts, presets, or UI artwork.

The first native implementation is explicitly experimental and uses the
installed x86-64 DLL instructions through an original PE/import/ABI adapter.
It is not a source decompilation. It is Linux x86-64 only, pinned to individually
verified DLL hashes. Ordinary engine builds and Alive admission continue to
reject the experimental nodes.

Research node kinds 68 (instrument) and 69 (parameter proxy) are enabled only
with ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL. The runtime borrows callbacks bound to
instances prepared off the audio thread. It never maps a DLL, constructs or
destroys an instance in an audio callback. One-frame processing is tested before
it is used; no pre-rendered buffer silently delays notes or automation.

## Shared controls

One module supplies dials, sliders, editable numbers, toggles, menus, buttons,
and compact panels. Cyan arcs and value accents, orange active switches,
charcoal surfaces, thin separators, and explicit focus states follow the retained
Live reference. Preserve native input identity, labels, drafts, Undo grouping,
host acceptance, and base-versus-effective-value behavior. Use the same
components in Ultra Perform and Alive's selected-device view.

Analog's authored panel uses the same components. Device schema paths, DLL
parameter indices, and display units are separate metadata. Labels are attached
to a DSP index only after its mapping is verified. Demonstration state must not
be presented as an admitted/persistent native device.

## State and admission

Full Analog source state has 203 descriptor slots in the observed build; this
does not prove that all slots are safe live controls. A future manifest extension must
identify adapter version, installed resource hash, full source state, and
bounded live bindings. Resource-affecting settings need stopped preparation.
The current six-slot node ABI and sixteen host bindings cannot represent the
whole device without an explicit sidecar/state extension.

Initial runtime research uses parameter proxies for existing scalar control
paths. Full source state and each proxy value must agree. Alive may persist
only edits its session contract represents. It must not show working unbound
edits that disappear on Save. Production integration requires an explicit new
measured graph family, preserving the current scheduling and ownership rules.

## Verification

- Shared controls: pointer, keyboard, fine adjustment, explicit-default reset,
  invalid numeric drafts, disabled state, Undo grouping, desktop/narrow renders.
- Native adapter: exact resource identity, malformed-image rejection,
  constructors/destructors, note/no-note audio, finite output, parameter bounds,
  unsupported-import errors, and no Wine mappings.
- Graph bridge: default-build rejection, cross-node validation, scheduled notes
  and parameter writes before samples, independent borrowed instances, failure
  behavior, and explicitly qualified clear/reset callbacks.
- Before ordinary Alive admission: complete state reconstruction, note-off,
  sustain, reset allocation/locking/state behavior, sample partition comparison,
  independent instances, timing/capacity measurements and saved-session recall.

## Current evidence

The isolated base is 4dfc7be75923d90fd2cdee9a3474a7258d912d68.
The retained reference is
experiments/alive-live-reference-20261024/05-analog-device.png.
Analog's observed SHA-256 is
4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133.
It constructs and renders finite nonzero PCM in one-frame and 256-frame calls
with an authored test state; the same one-frame case without a note is silent.
These checks do not establish factory-preset or sound fidelity.
