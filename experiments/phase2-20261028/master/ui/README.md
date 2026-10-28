# Master and Live workspace UI evidence

Frozen worker source: `5b10db9788d636ec2624fdc933293a1b9c8292e3`, on
`c71b60805e0e877915fb2b9efaf83b479252d5e3`. The cumulative patch hash and
individual source hashes are in `task-8-report.md`; `manifest.json` records
original/stored hashes for all retained worker evidence and review reports.
Root verified 11 source and seven final native screenshot hashes, inspected
native layouts/actions and integrated the packet byte-identically as
`36b0b392e7f4d826e4f714487ca02944c2bfcf4d`. All 130 affected root Node tests
pass; command, exit and log hashes are under `root-validation/`.

Final exact-candidate logs are `task8-evidence/node-5b.log` (130 passed),
`task8-evidence/browser-5b.log` (51 passed), and `build-5b.log`. Original native
captures and action/module-identity receipts are in `5b-v4/`, `5b-v3/`, and
`5b-playing/` beneath that evidence directory. Earlier captures/logs preserve
the relocation, meter-label and numeric-readability failures and their fixes;
they do not qualify the final candidate independently.

These are original Alive/Ultra captures, not proprietary Live/Max assets.
Native execution uses private Xvfb and software PipeWire. This packet proves
focused UI/layout and native command/observation behavior; it does not prove
PCM, physical audio, full Save/Quit/process-restart, endurance or final-head CI.
At UI-packet completion the launcher still used the earlier root build. The
subsequent coherent `f69125c` build is separately pinned under
`../../checkpoint-q1/root-build/`; its complete Task 9 qualification remains
independent of this focused UI evidence.
