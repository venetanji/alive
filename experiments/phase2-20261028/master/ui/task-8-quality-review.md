# Task 8 independent quality review

## Spec compliance

No actionable source defect found in the reviewed requirements for candidate `5b10db9788d636ec2624fdc933293a1b9c8292e3`, based on the cumulative `task-8-f06dea4-review.diff` and the narrow `task-8-gain-readability-review.diff`. This is a source and cited-evidence verdict, not final task acceptance.

The shared producer orders one in-flight operation, a replaceable gain and one reset by ordinal, retries only structured FULL/BUSY failures, and cancels old-generation work (`apps/ultra/ui/alive-master.mjs:17`). Both views use that producer and render saved, pending, admitted and observed values separately (`apps/ultra/ui/alive.mjs:190`, `apps/ultra/ui/alive.mjs:220`). Workspace navigation parks inputs and retains the prior detail selection (`apps/ultra/ui/alive-workspace.mjs:5`, `apps/ultra/ui/alive-workspace.mjs:60`). The gain-readability delta rounds only the unfocused presentation, leaves focused or parked inputs alone, and exposes the exact value in the tooltip (`apps/ultra/ui/alive.mjs:559`, `apps/ultra/ui/alive-timeline.mjs:58`). The browser tests exercise pointer-derived readability, queue pressure, local selection, geometry and real pointer movement (`apps/ultra/tests/ci/alive-chain.spec.mjs:374`, `apps/ultra/tests/ci/alive-chain.spec.mjs:480`).

## Issues

Critical: none found.

Important: none found in source review.

Minor: none found.

## Evidence and cross-task requirements

- Final exact-head build, complete browser and native WebKit repeats, original captures/actions/geometry, binary and source identities, and resource release remain required. The replacement report explicitly says these are pending; earlier results and the seven focused Chromium overlap checks do not prove the final candidate. `/tmp/alive-task8-evidence/arr-overlap-red2.log` records the text overlap and `arr-overlap-green.log` records seven passing affected checks; `gain-red.log` and `gain-green.log` record the readability failure and four focused passes. These are useful interim evidence, not exact-head native proof.
- `/tmp/alive-task8-evidence/node-provisional.log` reports 130 passes and `browser-provisional.log` reports 49 passes for the earlier candidate. The final report must tie complete required validation and the four slots/scenes, both sizes and admitted profiles, relocated actions, input and preservation witnesses to the final candidate.
- Cross-task physical deadline/admission and endurance, portability, and full save/Quit/restart proof remain open under the frozen contract and Task 9. Screenshots and UI receipts do not establish PCM or persistence.

## Assessment

Task quality: source review approved, conditional on the outstanding evidence gates. No tests, builds, application runtimes or source edits were run in this review; no broader unchanged-source inspection was needed. Final task acceptance is withheld pending the exact-head evidence above.
