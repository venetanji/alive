### Spec Compliance

- Spec compliant for the reviewed browser implementation: `apps/ultra/ui/alive.css:80` removes the open action list from layout flow, and `apps/ultra/tests/ci/alive-chain.spec.mjs:123` covers both requested viewport sizes and fixture types, geometry, action hit targets, Stop, Master, and document overflow.
- Cannot verify native hosting, audio, or final build behavior from this browser-only packet; root should perform the planned native confirmation. The packet reports a red run and four passing green cases; these runs were not repeated for this review.

### Strengths

- The rendered test compares both edges of the first two tracks' faders and M/S controls before and after opening one inspector (`apps/ultra/tests/ci/alive-chain.spec.mjs:127`), directly exercising the regression.
- The action overlay is contained within the track in the inspected 1280x800 browser captures, preserving the neighboring controls and Master (`apps/ultra/ui/alive.css:80`).

### Issues

#### Minor

- `apps/ultra/tests/ci/alive-chain.spec.mjs:135`: The focus check uses programmatic focus on each action and does not exercise sequential keyboard navigation or closing the inspector and recovering the covered mixer controls. The browser captures show the overlay covering the first track's fader and M/S while open, so a keyboard-driven close-and-recovery check would better protect usability of this arrangement.

### Assessment

**Task quality: Approved.** The narrow CSS change and rendered geometry checks address the observed browser regression; native behavior remains a separate root-owned verification. Existing detector advisories and failure-artifact timeout noise are not attributed to this change.
