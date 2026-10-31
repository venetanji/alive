# Task 8 independent specification review

## Spec compliance

No actionable specification defect found in the source reviewed. This is a source and cited-evidence verdict for `c71b60805e0e877915fb2b9efaf83b479252d5e3..f06dea4f07fb3b240b944f46705891a0acdd22f8`, not final Task 8 acceptance. The final exact-head native and full browser evidence, independent quality review, and cross-task gates remain open below.

- `apps/ultra/ui/alive-master.mjs:17` implements one shared bounded producer: one in-flight request, replaceable pending gain and one pending reset; ordinals order reset ahead of a later gain, FULL/BUSY retry retains the operation and one timer, and generation epochs ignore old receipts. Refusal and ordinal exhaustion are explicit.
- `apps/ultra/ui/alive.mjs:40` shares that producer across both views and distinguishes pending intent, accepted receipt, saved target, stale/null observation, applied serial and stereo interval peaks. `apps/ultra/ui/alive.mjs:57` supplies pointer, keyboard, numeric, unity and overload reset controls; selection is separate workspace state (`apps/ultra/ui/alive-workspace.mjs:53`).
- `apps/ultra/ui/alive.css:59` and `apps/ultra/ui/alive.html:13` define compact geometry, the fixed-right Session Master and Arrangement lane. `apps/ultra/ui/alive-timeline.mjs:69` relocates the track controls while retaining the lane and loop coordinates. The browser tests in `apps/ultra/tests/ci/alive-chain.spec.mjs:373` exercise geometry, gain inputs, pending/reset ordering, selection and parked fields.
- Named unchanged interface risk checked: `apps/ultra/ui/alive-model.mjs:10` validates Master snapshots and rejects older snapshot sequences before publishing them, as required before the new view resolves applied state. Other unchanged and cross-task implementations were not broadly re-reviewed.

## Actionable issues

Critical: none found.

Important: none found.

Minor: none found.

## Evidence and controller requirements

- The replacement report explicitly says full exact-head native rebuild/repeats and full browser rerun are pending. `/tmp/alive-task8-evidence/node-provisional.log` reports 130 passing and `/tmp/alive-task8-evidence/browser-provisional.log` reports 49 passing for the provisional candidate, not the replacement head. `/tmp/alive-task8-evidence/arr-overlap-green.log` reports seven affected tests passing after the replacement fix. These do not establish the complete final-head result. Obtain the worker's final immutable report and verify command outputs, hashes, resource release and source identity.
- Verify original WebKit and Chromium proof at both sizes, two-track v4 and maximal v3, including scroll extremes, actual fader actions and native admission/application, stereo values and overload reset, and the corrected Arrangement labels. The reported interim native v4 result and Chromium geometry are not proof of the replacement native rendering; screenshots alone do not prove PCM or persistence.
- Verify the complete behavior-level red/green record against all mandated producer cases and retained Arrangement action/history/focus tests. The report explicitly describes the initial missing-export failure as an import error rather than behavior-level red, and later records only selected behavioral reds. Determine from the complete final evidence whether the mandated red coverage exists; absence of a cited record is an evidence gap, not proof that it never existed.
- Task 7's profile timing excursions, physical output and endurance remain qualified/open as stated in the brief. Task 9 owns persistence, Quit/restart, endurance and final-head CI/packages. This review neither reopens accepted native tasks nor claims those gates pass.
- Independent quality review remains required. No test, build, runtime, browser, GUI, audio or git operation was performed for this review.

## Assessment

Source specification review: no defects found, subject to the evidence requirements above. Final acceptance remains with the controller after the final native report and independent quality review.
