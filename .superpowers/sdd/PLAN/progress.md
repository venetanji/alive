# SDD ledger - plan: PLAN.md

Foundation: bf4301e570068241fc33b442dd50018aacb60945; clean isolated worktree.
Spec: apps/alive/SESSION_CONTRACT.md and the full user goal.
Baseline native build and check-native.sh passed, including scoped Stop stress.

| Tasks | Interface / consistency check | Result |
| --- | --- | --- |
| 1 / 2 | Native fixed POD API consumed by Rust FFI | Freeze header before Rust integration |
| 2 / 3 | Rust model and commands consumed by Alive view | UI after headless gate |
| 3 / 4 | Native journey and reproducible harness | Final binary and final-commit CI required |
| 1 | Timing/isolation/guards match callback constraints | Native kernels remain outside guest |
| 2 | Stored state and dependency validation | Reference saved device, do not embed patch |
| 3 | Editor ownership and structural change gate | Live parameter only; stopped preparation |
| 4 | Evidence and final audit | No inherited standalone evidence as session proof |

Ruling: Proceed under the user's detailed authorization without another design
approval cycle; implementation is reversible and must reach the requested PR.
Ruling: Combined integration on a fetched branch is the concrete foundation;
main has not yet absorbed it. Preserve that dependency and recheck before testing.
Ruling: Optional Live reference study runs independently; it does not expand the
first host into a clone of Analog/Sampler/effects or delay headless execution.

Task 1: in progress.
Task 1: fix round 1/5 in progress (live binding structural validation; Stop epoch/head ordering).
Task 1: minor (deferred): JACK latency callback unconditionally reports +64 even for zero-delay hosted profile.
Task 1: minor (deferred): native session cap512 seconds must be explicit in contract.
Task 2: fix round 1/5 (2 addressed, awaiting scoped review; loop/seek proof and contextual native dependency errors).
Task 2: complete (commits b2458ca..d8fa119, scoped re-review clean).
Task 2: fresh binary CLI proof passes,412452 frames/comparison; wrap2/second-cycle audio/seek generation present.
Task 4: add a short actual saved-device boundary fixture at0,1,31,63,64,127 to complement native timing-kernel measurements.
Task 1: complete (original098d02c, scoped re-review clean; rebased42172fe).
Task 4: saved-device boundary fixture complete19b44c4,10Rust tests pass1.70s; latest reviewed native library10pass1.68s.
Foundation reconciled: feature branch only rebased onto3103348; release/main refs untouched. Main8217458, PR4 still open, PR5 mergedbf4301e.
Rebase map: c88f702->afada62,8bf7231->f4b0182,b2458ca->e31caba,4072eb9->f28172a,d8fa119->7e30d8e,c51dc46->19b44c4,098d02c->42172fe. Review packages retain original IDs/content.
Task 3: in progress (alive_interface; brief task-3-brief.md, base42172fe). Parent owns desktop walkthrough/endurance/harness and CI/evidence.

Task 3: complete (3a84a3f,130b2b1,7b5e76c); actual native New/load-two/edit/automate/play/editor/save/reopen/missing-device/removal/Quit journey passes.
Task 4: native/Rust/UI/browser/contracts/notice gates passed; saved-device exact boundary proof retained.
Task 4: first endurance exposed a real Wry Linux IPC view/manager reference cycle. Isolated8-reopen RED/GREEN and scoped review produced e841f6f teardown fix and real native CI regression. No dependency upgrade or system setting changes.
Task 4: macOS CI duplicate Info.plist fixed by one shared generated context; Atspi iteration made portable. Windows and macOS ARM package jobs on e841f6f pass.
Task 4: final native runtime e841f6f completes602.551 playing seconds/47cycles,840.576s finite loopback,64zero-error observations. PSS+50564KiB;FD202->164; after first sample3processes throughout. Exact receipt/resource summary/screenshots retained in experiments/alive-session-20261024.
Task 4: fresh portable quick native journey passes25.461s capture and Quit Cancel/Discard; harness now reuses existing WirePlumber0.4 policy selection and old/new pw-cat raw-stdout compatibility. Final pushed-commit CI and PR receipts are the remaining delivery check.
