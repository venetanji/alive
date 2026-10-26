# Cutoff CI Task Review

Spec compliance: PASS for task commit `cc7d5414cc987b5f8007391b1741bbc92c16ea2d` over `6beb2102da43a75f228cc63aaa545c0a58701f47`.

Task quality: APPROVED. No Critical or Important findings and no source-change findings. One Minor evidence-hygiene finding concerns pre-existing native harness output.

## Strengths And Spec Checks

- `apps/ultra/tests/alive_workspace_navigation.py:68` routes only exact device-selector names to the injected native click callback. `apps/ultra/tests/check_alive_desktop.py:206` reuses the existing reorder input implementation: stage pointer motion, recheck the accessible rectangle and native ownership, then send one press/release. The two-second ownership deadline, .01 polling, and release in `finally` remain; the original .15 selector post-click allowance remains at `apps/ultra/tests/check_alive_desktop.py:250`.
- `apps/ultra/tests/check_alive_desktop.py:802` adds a real covering-tooltip precondition immediately before the same original selector click. The exact `float(value('Cutoff base')) == 2000` assertion remains at `apps/ultra/tests/check_alive_desktop.py:804`, alongside instrument 1333, gain .55, Note 13, automation 1200, and existing save/reopen checks. The full two-file diff removes no journey assertion and changes no production source or capacity/time-limit constant.
- `apps/ultra/tests/check_alive_desktop.py:254` retains the prior reorder tooltip regression while generalizing its receipt/screenshot labels and recording the tooltip atom. The new precondition requires both an actual native tooltip type and absence of the Alive owner from the native hit path, rather than inferring occlusion from timing alone.

## Findings

- Minor: `/tmp/alive-cutoff-ci-fix-20261026/full-green.log:15`, `/tmp/alive-cutoff-ci-fix-20261026/full-green.log:20`, and `/tmp/alive-cutoff-ci-fix-20261026/full-green.log:26` contain AT-SPI/atk-bridge warnings and failed Wayland-compositor activation; lines 10/12/18 also contain failed systemd service activation. The GREEN output is therefore not pristine. Equivalent warnings occur in the retained pre-change baseline, so these are not regressions from this patch and do not block this task. The controller should retain/identify this harness noise explicitly; any cleanup should be a separate harness task rather than expanding this narrowly scoped fix.

## Evidence Checks

- All nine artifact hashes in `/tmp/alive-cutoff-ci-fix-20261026/frozen-manifest.json` match their raw files; its report hash matches `/tmp/alive-cutoff-ci-fix-report.md`. Its commit/baseline IDs match the supplied review package. Every current source/binary/harness hash listed in `final-source-binary-pins.json` matches the file on disk, and all common baseline/final UI and binary pins are equal. This verifies the recorded local pins; it does not independently establish how the earlier release binary was built.
- `/tmp/alive-cutoff-ci-fix-20261026/occlusion/pre-click-native-hit.json` records rect `[168,569,160,25]`, owner `4194307`, hit ancestry `[927,4197537]`, and tooltip atom/type `270`. `occlusion/dom-events-decoded.json` records focus/pointermove to the exact Lowpass selector, no button/click event, Subtractive still pressed, and Lowpass unpressed. These independently support native input occlusion rather than saved cutoff corruption.
- `regression-red.exit` is 1 and `regression-red.log:166` retains the exact 2000 assertion failure. `regression-green.exit` is 0. The two temporary focused drivers are identical except the renamed tooltip helper and receipt kind; both use the same saved session, original selector click, and exact 2000 assertion. The GREEN receipt changes tooltip ancestry `[927,4197468]` to owner ancestry `[927,4194307]` with unchanged rectangle and exactly one press/release.
- `full-baseline.exit` is 1; `full-baseline.log:75` preserves the earlier missed Harmony/Gain selector failure. `full-green.exit` is 0, and `full-green.log:66` records final Quit assertions passed. Its forced saved-session receipt changes `[927,4230688]` to `[927,4194307]` with unchanged rectangle and one press/release. Journey entry/completion timestamps in `full-green/journey-timing.json` differ by 199.087435265 seconds. The final native-session report records zero stream errors/rejected commands, running audio, equal prepared/saved effect instance IDs, all final quit/history flags true, and software audio capture of 95.34933333333333 seconds with peak .35335424542427063.
- Named concrete risk checked: adding a required `select_device` argument could break other navigation-adapter callers. A focused repository search for `alive_workspace_navigation`/`install_workspace_navigation` under `apps/ultra/tests` finds only the import and updated installer call at `apps/ultra/tests/check_alive_desktop.py:25` and `apps/ultra/tests/check_alive_desktop.py:27`; no omitted caller was found.
- The supplied full diff was read once. No changed file was reread as source, no additional diff was derived, and no test suite was repeated. Focused evidence/hash checks resolved the review questions without native reruns. Source, index, HEAD, and branch state were not changed by this review; this report is the only authored file.

## Cross-Task Limits

- Remote exact-head CI rerun, parent-owned coverage/docs/private reference work, physical audio, endurance qualification, and Arrangement behavior are outside this diff and are not verified here. The local report accurately marks physical audio false and endurance null.
- Native ownership/PID detection and the isolation harness are unchanged dependencies. This review confirms retention/use of their existing interfaces and the recorded actual-native receipts, not an independent audit of those components or the whole branch.

Assessment: the patch addresses the demonstrated tooltip input loss with the same native selector operation, preserves the original exact saved-cutoff assertion, and has matching actual-native RED/GREEN plus a complete original-journey GREEN. No task implementation fixes are requested.
