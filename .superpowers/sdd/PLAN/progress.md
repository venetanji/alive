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
Task 8: in progress (chain_persistence, baseline 4209eef; brief task-8-brief.md and integration-notes). Parent owns PLAN/ledger/PR; implementer owns desktop persistence/ownership and focused compatibility view, without chain UI or track expansion.
Reviewed native checkpoint 4209eef pushed; PR6 records native completion and desktop integration still pending. All3CI jobs at f89ccb9 now pass, including actual Alive/editor workflow. Linux both-app packages pass there; remaining platform jobs still running when checked. New checkpoint needs its own CI/package qualification.
CI follow-up: f89ccb9 Linux packages pass; newer push cancelled the other three platforms before completion. No success inferred. At4209eef UI/reference and Chromium pass; native still running at check. PR updated with cancellation scope.
M3 architecture reconciliation complete (clip_architecture_reconcile, read-only): task-10-reconciliation.md. Parent read full report. PLAN now defines Tasks10..15 with piano roll/history, native clips, saved/UI clips, measured8tracks, scenes and final acceptance. No M3 code/admission changes made.
Ruling: Use one new fixed-capacity v3 clip ABI (8tracks/16devices/32clips), initially admitting only2/6; enable8/16 after actual-kernel measurement. Separate v4 solely for larger arrays adds redundant compatibility work. Cost if wrong is fixed storage/cache overhead, measured before admission; frozen v1/v2 remain unchanged.
Ruling: Run the new30-minute soak after stable scenes/example in final acceptance, rather than twice during capacity and final handoff. Capacity expansion still requires actual-kernel/headless/native measurements first. Cost if wrong is discovering endurance-only eight-track defects later, before final acceptance rather than before scene implementation.
Ruling: Preserve existing instrument Remove as whole-track removal because every admitted track requires its instrument. It removes that track's complete chain/lanes; effect removal/replacement remains instance-scoped and reorder removes none. Task9 labels this Remove track explicitly. Cost if wrong is removing more within the explicitly removed track than a device-only interpretation; other tracks must remain intact and a focused regression proves that.
Native checkpoint4209eef now passes all3CI jobs, including nativev2 guards and existing desktop/editor/CPAL journey. Exact source/results retained in experiments/alive-chains-m2-20261024/ci-native-4209eef.json. This does not qualify uncommittedTask8 persistence/UI; both-app macARM packages also pass, other platforms still running.
Task11 proposed native interface design complete (clip_architecture_reconcile, read-only), task-11-interface-design.md. Parent read full report: exact v3 records, bounded receipts, shared evaluator/admission, cyclic/splice/work envelope and repeated-control guard. Eleven C++17 declaration size assertions pass on this host. Not implemented/admitted; reconcile against completed M2/Task10 and measurement gates before dispatch.
Task8 parent desktop checks pass on unchanged fresh release build: full existing native journey captures25.0667s finite software audio, zero reported errors/rejections, editor/save/reopen/failedOpen/Quit guards pass. Eight editor cycles keep1WebKit worker/3PIDs, descriptors154->153, PSS450273->486094KiB from first close to final idle. Receipts/screenshots retained in experiments/alive-chains-m2-20261024/task8-compatibility; no endurance/physical/underrun claim.
Task8 implemented edd7165; scoped review chain_persistence_review pending, range4209eef..edd7165 in task-8-review.diff. Report task-8-report.md includes actual/staged saved-chain proofs and all gates:171Rust/2existingignored,1Alivecontext,449primaryNode,fullnative/pinnedcontracts, unchanged desktop journey and8editorcycles. Both deferredTask7 coverage items are implemented and tested; final approval waits for review.
Task8 review chain_persistence_review: spec compliant, quality approved, noCritical/Important findings. Cross-task callback/v1-equivalence checks resolved by reviewedTask7+unchangedv1/fullnative guards; actualWry destruction resolved by parent nativeClose/reopen/8cycle tests and own-app context gate. No further broad rerun needed.
Task8: minor (deferred): existing reserve_native dead-code warning; focused partial-install failure injection should prove rollback retains accepted bases/bypass and rejects earlier handles. Prospective rejection continuity is already covered. Final whole-branch review must triage both.
Task8: complete (commits4209eef..edd7165, scoped review clean). Both deferredTask7 coverage items addressed. Next Task9 minimal selected-chain UI and real effect-editor/save/reopen journey; M2 remains incomplete until then.
CI follow-up: all four separate Alive/Ultra package targets now pass at4209eef; publishing skipped. Receipt packages-4209eef.json retained beside CI receipt. Fresh fetch leaves release foundation3103348 and feature remote4209eef unchanged. Later local integration still needs its own pushed-commit qualification.
Task9: in progress (chain_interface, baseline95be9ca; task-9-brief.md + integration-notes). Sole implementation agent owns selected-chain controls/tests/public product docs; parent owns ledger/PLAN/PR/evidence. Read-only clip_architecture_reconcile refines Task10 integration against completed Task8, without source edits.
Ruling: Task10 clears focused history at a successful explicit Apply/Discard even when a later enclosing file/Quit action cancels/fails. These are independently accepted user operations in the existing flow; avoid outer transactional rollback. Direct edit/Apply failure and prospective Open validation failure preserve history. Cost if wrong is retaining an explicitly accepted draft boundary after a canceled outer action, matching existing behavior.

| Remaining tasks | Shared interface / internal consistency | Resolution |
| --- | --- | --- |
| 9 / 10 | Selected device/automation UI feeds piano-roll musical edits | Keep stable instance targets; history excludes live controls |
| 8 / 10 | Rust draft/install/file operations define history boundaries | Reuse musical identity gate and live merge; explicit accepted Apply/Discard clears independently |
| 10 / 12 | Focused history consumes single-clip then clip-bank score | Extend musical projection in12; retain revision/bounds/failure policy |
| 11 / 12 | Native frame clips/receipts consumed by Rust saved/UI clips | Freeze reviewed v3 ABI before Rust integration; preserve runnable v2 fallback |
| 11 / 13 | Fixed8/16/32 storage versus admitted2/6 workload | Measure full storage/publication now, enable larger profile only at13 |
| 11 / 14 | Track-action request consumed by atomic scene launch | Same ABI; multi-bit feature disabled until14; all-or-none execution |
| 12 / 14 | Selected versus running/queued slots in UI | Selection never launches; runtime state is not saved performance |
| 13 / 15 | Stream/callback/process observations consumed by final soak | Validate short metrics journey first; retain every stream epoch |
| 9 / 15 | Device/editor controls and native harness reused at acceptance | Preserve identity, actual destruction and file/Quit checks |
| 10 | Pointer gestures versus authoritative Rust history | One transaction; cancel preview only; stale generation/revision rejects |
| 11 | Cyclic/splice admission versus repeated controls | Native envelopes plus absolute-frame rolling guard and reserved Stop cleanup |
| 12 | Migration versus stricter new admission | Exact data preservation; rejected conversion leaves v2 usable |
| 13 | Requested eight tracks versus immutable16-root/event caps | Measure; refuse over-limit material with explanation, no timing shifts |
| 14 | Atomic scenes versus existing individual pending actions | Per-member supersession outcomes; one shared target frame |
| 15 | Historical artifacts/soak versus final source | New1800playing seconds and exact final-pushed-commit CI/packages |

Task10 integration design reconciled against completedTask8 in task-10-integration-notes.md; parent read full note. No new external decision needed. SaveAs invalidates stale full-document edits by revision while keeping musical-only history/redo; live mixer merges by track ID and bases/bypass by device instance ID. Task9 remains sole active implementation.
Task9 parent evidence inspection: completed native journey passes,38.144s finite software stereo/peak0.3533542454, zero reported errors/failures/rejections at48k/512. Stable IDs/reorder, independent effects/ownership, effect editorClose/reopen, Save/reopen/play, changed/missing source and Quit/draft guards pass. Parent inspected existing chain-playing/automation-draft/effect-editor screenshots without another capture/polish pass; receipts copied to experiments/alive-chains-m2-20261024/task9-native. Task9 source report/review still pending.
Task10 carry-forward: existing toolbar copy says musical edits require stopped transport even though edits may be drafted during playback. When adding history/piano-roll controls, clarify that Prepare/Apply requires stopped transport; preserve the tested prepared-versus-draft ownership copy.
Task9 implemented efbeeb8; independent scoped spec/quality review chain_interface_review pending, range95be9ca..efbeeb8 in task-9-review.diff. Actual native journey and sequential8-editor-cycle resource gate pass on unchanged release UI. 18focused/2browser/171Rust+1Alivecontext/fullpinnedcontracts454primaryNode pass. Parent retained receipts/screenshots; no new physical/endurance claim.
Task9 review chain_interface_review: spec compliant, quality approved, noCritical/Important findings. Parameter capture/metadata identity, stopped structural guards, draft/prepared ownership, complete actual app/editor/Save/Quit journey and public docs checked. Zero-param concern resolved by existing1..16manifest admission; live merge risk resolved by model helper. Existing reserve_native warning remains deferredMinor.
Task9 cross-task CannotVerify items resolved by reviewedTask7 native +Task8 fullnative/saved-chain/callback gates; own-app context/capabilities, staged4-source probe and previous CI package qualification; unchanged Ultra history/scopedStop suites; Task9 actualClose/destruction/8editorcycles and parent receipt/screenshot inspection. Exact new-head package qualification remains outstanding, not inferred from4209eef.
Task9: complete (commits95be9ca..efbeeb8, scoped review clean). M2/currentM4 panels complete locally; push coherent evidence checkpoint, then Task10. No piano-roll/clip-bank/eight-track/endurance acceptance claimed.
Final-review risk to exercise: multiple independent instances referring to one externally changed source file may complicate sequential Replace recovery under strict whole-session hash validation. Single changed-source rejection/continuity is tested; reproduce shared-source recovery before final handoff and make errors/recovery actionable. No code change or unverified defect claim here.
