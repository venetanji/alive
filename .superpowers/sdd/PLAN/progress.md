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
Task 4: remote9b43211 headless/Rust/UI/browser gates pass; desktop exposes absent default-node metadata in WirePlumber0.4 policy-only fixture. Reproduced default route0frames/StreamInvalidated versus pinned143872frames; typed default sink metadata makes both143872frames/error-free. Full native journey with isolated Ubuntu0.4.17 policy then passes25.163s capture and Quit Cancel/Discard. Application/DSP code remains unchanged; final CI reruns after this test-server correction.

Expanded spec: /home/venetanji/.codex/attachments/b3b823b7-f117-4aa1-a4da-36fc87ffdfaf/pasted-text-1.txt
Foundation reconfirmed 2026-10-24: main8217458, release3103348. Existing linked worktree retained; no release branch mutation.
M1: complete locally (commit2e13410; independently reviewed, all local gates and native/package journey passed). Pushed to feature branch and PR6 rewritten. New-head CI remains pending.

| Expanded tasks | Interface / consistency check | Result |
| --- | --- | --- |
| M1 / M2 | App shared library/resource lookup consumes device runtime | Keep both separate binaries; add objects once in shared implementation |
| 6 / 7 | Versioned manifest, external input/filter nodes consumed by chain preparation | Freeze Task6 descriptor before native/Rust chain integration |
| M2 / M3 | Chain instance IDs and automation consumed by per-track clips | Stable IDs independent of chain index; expand tracks only after launch measurement |
| M2 / M4 | Device metadata/editor auth consumes instance identity | Editor ownership must move from track-only identity |
| M3 / M4 | Selected clip/track/device consumed by panels | Keep selection distinct from launch |
| M1 / M5 | Packages/app context consumed by native acceptance/CI | Test actual Alive package, not Ultra fallback |
| M2 / M5 | New chains consume bounded native roots | Preserve16-root capacity until measured |
| M3 / M5 | Eight-track scheduler consumed by soak/example | Admit event density and measure reset/callback costs first |
| M4 / M5 | Optional editor consumes native lifetime | Native destruction assertions retained |
| M1 | Independent application vs existing target path | Separate package/app IDs; sharing target directory is intentional |
| 6 | New effect manifest/nodes vs v1 instruments | Strict v1 compatibility; current session rejects effects until Task7 |
| 7 | Ordered roots vs backend parallel master sum | Hosted path evaluates chain once, sums endpoint; ordinary Ultra unchanged |
| M3 | Multiple clips/quantized launch vs current global discontinuity | Introduce per-track cursors and termination before eight-track expansion |
| M4 | Live parameter edit vs structural replacement | Bound edits live; stopped prepare for structure |
| M5 | Prior600second soak vs new1800second requirement | Prior evidence remains historical; new30minute run required |

Ruling: Task6 supports declared stereo effects only, retaining explicit bundle descriptors and existing mono primitive proofs. This bounds the first chain profile; accepting mono effect files later needs a tested adapter.
Ruling: Task6 keeps two tracks and existing16-root pool. Task7 initially uses at most6 roots; eight-track expansion waits for scheduler/capacity measurements. Cost if wrong is lower initial capacity, not unbounded callback work.
Task6: ready; baseline2e13410 (plan checkpoint follows), brief task-6-brief.md.
Task6: implementer effect_devices; actualbase548b1a1. Normalized manifest confirmed kind:DeviceKind,note_node:Option<u32>,input:Option<HostAudioInput{node,bundle}>,output:ChannelBundle.
M1 fix: Mac/Windows CI early DEB fixture failure traced to host ar dialect/binary stdout conversion. Portable SysV inspection + fixture passed21tests, actual both-DEB linkage/notices/render and scoped packaging review; push follows. No app/DSP/package bytes changed.
Ruling: Bypass is a bounded live command retaining warm state; add/remove/reorder remain stopped preparation. Reinstalling on bypass would invalidate the specified warm-resumption behavior. Cost if wrong is an audible unsmoothed bypass change; zero timing shift is tested.
M1 fix: committed/pushed848f53e; actual DEB output bytes unchanged. Platform CI40050492761/40050492765 now running the correction.
Task7 interface design complete (effect_contract_design, no implementation). Parent read full recommendation; C++ declarations/sizes independently compile on this host. PLAN now separates7native,8Rust/persistence and9interface to retain a usable app at each checkpoint. V2 shapes/adapters in task-7-interface-design.md are the native task interface; no8track expansion until measured.
Task 6: complete (cbe310a; independent scoped spec/quality review approved, no functional findings). 158Rust passes/two existing ignored,447Node,103Chromium,full native/contracts pass. Existing Node loader/color warnings recorded Minor and deferred.
Task 7: in progress (native_chain_runtime; brief task-7-brief.md, frozen design task-7-interface-design.md). Native only; parent owns plan/ledger/PR. Existing v1 app stays usable throughout.
Foundation refetch after Task6: main8217458,release3103348,remote feature848f53e; no change to dependency or protected branches. At848f53e UI/reference and Chromium CI pass; native and four package jobs pending.
M1 CI reconciliation: all3CI jobs at848f53e now pass, including actual desktop/editor/resource and CPAL. MacARM both-app package job passes; other3 still build. Task6 actual separate developer build and saved-session probe pass412452frames/comparison; build retains existing reserve_native warning. Native author notified builds are clear.
M1 CI/package gate complete at848f53e: all3CI and4platform both-app package jobs green; publishing skipped. ci-848f53e.json retains exact observed source/results. Downloaded Alive AppImage passes hashes/notices/ownlinkage/nativeABI/bundled offline render onArch; stageddist/alive/ci-848f53e. Scope remains M1 only. Native7 gate also passes unchangedv1,newv2,callbackguards,42-cycleStop; contract gate/review pending.
M3 read-only design complete: clip_workflow_design, task-10-workflow-design.md. Parent read full proposal. Reconcile with completed M2 before implementation; every selectable clip combination/splice, per-track reset costs and repeated-discontinuity density need explicit gates. No M3 code/capacity changes made.
Ruling: Nativev2 admits extra audio.in~ readers as Task6's manifest validator does. All effect readers see the same declared per-instance stereo bundle; instrument readers receive silence. No extra physical inputs/buses are inferred. Native7 author removes the unplanned stricter exclusion and adds a focused regression; cost is allowing redundant authored readers, not new routing.
Task7 implemented edd7678; review native_chain_review pending. Review baselinef89ccb9 excludes parent-only docs, covers all native changes. Report task-7-report.md and reviewpackage task-7-review.diff. Final native/contracts gates green; oldv1unchanged, newv2callbackguard/partitions/order/bypass/ownership/termination/overload/Stop pass. Final fixturemean1052.424us/1024dense and32.308us/seek+frame, no deadline/eighttrackclaim. Parent restored only the known test-regenerated arithmetic receipt toHEAD.
Reviewed Task6+M1 evidence checkpointf89ccb9 pushed, PR6 updated with exact artifact/remaining milestones. New UI/reference and Chromium CI pass onf89ccb9; native and packages in progress. These results do not qualify unpushed native7.
Task 7: fix round1/5 in progress. Scoped review found no rendering defect but Important duplicated v1/v2 graph-validator policy, violating shared-helper requirement. Resume native_chain_runtime to consolidate with private legacy policy and focused old/new session suites.
Task 7: minor (deferred toTask8): add nativev1 size/offset assertions alongside Rust cross-ABI layout tests; add actual saved-chain wet-to-dry callback-boundary audio assertion. Initialdry/liveunbypass is already covered. Final review must triage these.
Task 7: fix round 1/5 (1 addressed, 0 open; commits edd7678..920bdc6). native_chain_fix_review confirmed shared private validator, legacy ordering/error preservation and no new Critical/Important regressions. Fresh focused v1/v2 build-and-run commands and outputs are retained in task-7-report.md.
Task 7: complete (commits f89ccb9..920bdc6, scoped review clean). Deferred coverage items assigned to Task 8; no Rust/persistence/UI chain claim yet.
