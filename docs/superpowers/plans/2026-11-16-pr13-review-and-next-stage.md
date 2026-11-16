# PR #13 Acceptance And Native Library Next-Stage Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this
> plan task by task. Keep one integration owner. This document plans work;
> it does not record the unchecked steps as completed.

**Goal:** Accept the browser navigation correction with complete regression
coverage, then qualify one usable Analog workflow through ordinary Ultra and
Alive without losing edits or weakening native admission.

**Architecture:** Reuse the PR's existing focused-draft preflight and the current
ordinary presentation hosts, native transaction queues and qualification
registry. Establish the PR acceptance boundary first; investigate native
settlement and lifecycle with the retained local evidence before proposing
further implementation changes.

**Tech Stack:** JavaScript, Node tests, Playwright 1.56.1, Tauri/Rust, C++ native
adapters and the existing desktop/software-audio harnesses.

**Spec:** `docs/superpowers/specs/2026-11-02-native-library.md` at PR head
`6abf13b56ae5b68b5f0d81eb9e49e55cdc0a6497`.

## Global Constraints

From the existing spec:

- "Do not add a separate application, audition keyboard or wiring to Alive's rack."
- "A native write acknowledgement is not internal DSP readback."
- "Prepare/destroy foreign instances off the audio callback."
- "Keep existing track, graph, device, event and resource bounds."
- "No limit increases to make a fixture pass."
- "Manual CI only."
- Required publication stages: construction, initialization, audio, mapping,
  editor, state, instances, lifecycle, timing and alive; all must pass.

Keep proprietary resources and captures private. Preserve raw slot 194 `12.1`,
complete commanded state, source identity and existing generation/revision
rejection. A software run cannot qualify physical hardware. Preserve Ultra's
Max hierarchy and Alive's existing shell. The empty qualification registry and
Electric's unavailable state remain correct until their gates pass.

## Review And Current Evidence

Reviewed on 2026-11-16:

- PR: https://github.com/venetanji/alive/pull/13, open draft, mergeable.
- Base: `e3742282d6a53b0d4b228a7408650db32c104da0`, branch
  `feat/alive-native-library-20261102`.
- Head: `6abf13b56ae5b68b5f0d81eb9e49e55cdc0a6497`, branch
  `review/astra-checkpoint-20261115`.
- One executable statement was added to `canvas.mjs:108`; two DOM regression
  cases were added at `canvas-dom.test.mjs:1166`. The other changes are evidence
  and handoff documents. No blocking defect was found in this bounded change.
- GitHub reports no formal reviews, inline comments, PR checks or runs on the
  review branch. This agrees with the workflow's manual-only trigger.
- Fresh full Node run: 925 tests, **904 passed, 21 skipped, zero failures**.
  Local Node is `v26.13.1`; hosted CI pins `22.20.0`. This local configuration
  differs from the PR author's 891/34 configuration and does not replace the
  pending run on the pinned CI toolchain.
- Fresh separate DOM run: **98 passed, zero failures**.
- Fresh sandboxed Chromium run of hierarchy, documents, source-preflight and
  resource-identity suites: **16 passed, seven private-resource skips**.
- Both new regression cases fail with the baseline `canvas.mjs`: valid draft
  remains 10 instead of 42; invalid draft moves into path `[2]` instead of `[]`.
  Only the disposable review export was changed for this negative control.
- All seven bundled evidence checksums and the PR diff whitespace check pass.
- No fresh full native build, Rust suite, original-device execution, physical
  audio test or endurance run was performed for this planning review.

Fresh test logs are under `/tmp/alive-pr13-*-20261116.log`; the complete reviewed
source export is `/tmp/alive-pr13-review-20261116`. Initial partial-export test
attempts failed because fixtures were missing; only the `node-complete` and
`dom-complete` logs represent complete-tree runs.

### Gaps To Close

1. The new invalid-draft test covers entering a child, but not refusing to leave
   a child through Root. Add that directional regression and actual browser
   coverage; the small DOM adapter cannot establish focus behavior.
2. No hosted run validates the PR head. Historical green run `41661508873`
   belongs to `a277d22667c01fab8135ade49734b74910c632d7`.
3. The PR's native roadmap has valid priorities but is not evidence that its
   asynchronous settlement, timing, cleanup or profile gates have passed.
   Keep those follow-on gates independent of acceptance of this browser fix.

## Source And Reuse Map

The current working directory is the separate research branch at `bc1c00f`.
This plan is saved there for review, but execution targets the PR branch.
Do not implement against the older research checkout or replace its files with
the native integration tree.

| Area | Reuse | Planned delta |
| --- | --- | --- |
| Browser navigation | `apps/ultra/ui/canvas.mjs`, `canvas-focused-drafts.mjs` | Retain the existing preflight; change only if a new test demonstrates a defect |
| Regression tests | `apps/ultra/ui/canvas-dom.test.mjs`, `apps/ultra/tests/ci/canvas-hierarchy.spec.mjs` | Invalid child exit and real browser focus/save coverage |
| Ordinary native settlement | `canvas-device-panel.mjs`, `canvas-presentation-view.mjs`, `canvas-presentation-hosts.mjs`, `canvas-shared.mjs` | Reproduce delayed two-edit ownership using current hosts |
| Native lifecycle | `apps/ultra/src-tauri/native/backend.cpp`, `external_device/live_device.cpp`, `apps/ultra/src-tauri/src/session/prepare.rs` | Correct reproduced causes only after diagnosis |
| Profile/editor | `apps/ultra/ui/live-profiles/analog/`, `live-device-view.*`, `canvas-presentation-view.*` | Complete one bounded Analog workflow and reachable controls |
| Publication | `apps/ultra/live-device-qualifications.json`, `import-live-library.py` | Admit only independently completed stage evidence |

Paths abbreviated in the table's middle rows are under `apps/ultra/ui` or the
native directory named in that row. Preserve the stronger current paired-pack
resource reader. Do not port the experiment's optional-Graphics reader or
`live-device-object.mjs` into integration.

The older experiment is `e556347d9d164045c7a69e90fb752481b1f0d0ec` in worktree
`/home/venetanji/.codex/worktrees/2a0f/alive`. Treat it as selective evidence,
not a branch to merge wholesale.

Unlike the PR review environment, this machine has the private reports under
`/home/venetanji/.cache/alive-ultra-evidence/native-library-20261102/workers/`:

- `current-source-ci-resume-terra-r3/report.md`: inspected; confirms historical
  software checks and explicitly unresolved callback overruns.
- `final-a277-noise-terra-r1-run/actual-1280-r1/report.md`: inspected; records the
  narrow 203-value Noise lifecycle audit and panel clipping. Its driver remains
  incomplete pending separate acceptance, as recorded in that report.
- `resume-20261103-r1/a277-noise-cached-applied-audit.json`: existing audit to
  reconcile with its source artifacts before native execution.

Reading these reports is not reexecuting or independently rehashing all private
artifacts. Use the top **Current Checkpoint** in the status ledger; its older
shutdown section has already-superseded precision and build tasks.

## Task 1: Complete Browser Navigation Regression Coverage

**Files:**
- Modify: `apps/ultra/ui/canvas-dom.test.mjs`.
- Modify: `apps/ultra/tests/ci/canvas-hierarchy.spec.mjs`.
- Modify only on reproduced failure: `apps/ultra/ui/canvas.mjs`.

**Interfaces:** Reuse `mount(false)`, `makeNode`, `controller.getState()`, the
existing Root button, `captureFocusedDraft()` and `drafts.commitWhere()`.
Produce regressions proving that a draft belongs to its original patcher until
it is accepted or explicitly cancelled.

- [x] Recheck remote base/head and worktree status; create an isolated execution
  checkout from the reviewed head using the git-worktrees skill. Do not reuse
  an active native build directory. Read `apps/AGENTS.md` there.
- [x] Add this focused case beside the two existing navigation cases:

```javascript
test('invalid child draft blocks Root and can be corrected before leaving',async()=>{
  const p=await mount(false);
  p.controller.load({version:2,profile:'ultra-patcher-v2',presentation:null,
    nodes:[makeNode('number',1,0,0,{value:10}),{
      ...makeNode('patcher',2),patcher:{presentation:null,
        nodes:[makeNode('number',3,0,0,{value:20})],edges:[]}}],edges:[]});
  await p.all('objects').find(e=>e.dataset.node==='2').fire('dblclick');
  await settle();
  const child=p.all('objects').find(e=>e.dataset.parameter==='value');
  child.value='';await child.fire('input');
  await p.ids.get('patcher-path').children.find(e=>e.textContent==='Root').fire('click');
  assert.deepEqual(p.controller.getState().path,[2]);
  assert.equal(p.all('objects').find(e=>e.dataset.parameter==='value'),child);
  assert.equal(child.value,'');
  assert.equal(p.controller.getState().document.nodes[0].params.value,10);
  assert.equal(p.controller.getState().document.nodes[1].patcher.nodes[0].params.value,20);
  child.value='73';await child.fire('input');
  await p.ids.get('patcher-path').children.find(e=>e.textContent==='Root').fire('click');
  assert.deepEqual(p.controller.getState().path,[]);
  assert.equal(p.controller.getState().document.nodes[1].patcher.nodes[0].params.value,73);
  await p.dispose();
});
```

- [x] Verify this case fails against the baseline implementation in isolation
  and passes against the PR. Retain the existing valid-child Save assertion.
- [x] Extend the real browser hierarchy fixture with a child number box. Use
  the existing JSON import and downloaded-save helpers. Exercise valid root
  edit -> enter -> valid child edit -> Root -> Save, then invalid child input ->
  Root refusal -> correction -> successful Root. Assert the invalid input stays
  visible and focused, and downloaded JSON contains the two accepted values.
  Use ordinary `fill`, `dblclick`, `click` and keyboard events; preserve sandboxing.
- [x] Run the commands in the verification section. Review native hierarchy
  regressions to ensure independently bound windows retain their parent scope.
  Commit this test slice separately from any broader native changes.

**Acceptance:** Both navigation directions preserve edits and invalid input;
the saved full tree contains the accepted values; native window ownership is
unchanged. A failing new case is a reason for a bounded fix, not a new queue.

## Task 2: Validate The Final PR Commit

**Files:** Update PR evidence/checkpoint documents as needed. Reuse
`.github/workflows/ultra-ci.yml`; no workflow redesign is required.

- [ ] Record the final test/source SHA and dependency versions. Archive fresh
  logs with checksums; retain explicit private-resource skips.
- [ ] Run the manual Ultra CI workflow against the final review branch:

```sh
gh workflow run ultra-ci.yml --repo venetanji/alive --ref review/astra-checkpoint-20261115 -f alive_endurance=off
gh run list --repo venetanji/alive --branch review/astra-checkpoint-20261115 --limit 5 --json databaseId,headSha,status,conclusion
```

- [ ] Match the run's `headSha` to the intended final commit; inspect all three
  jobs and required downstream artifacts. A green upload step with missing
  evidence does not satisfy a skipped gate.
- [ ] Finish review of the small browser correction. The PR can be accepted
  independently of the native roadmap if these checks pass. Merge into its
  existing integration base only when requested; do not retarget PR #12.

**Acceptance:** The final PR has attributable current checks and bounded claims.
The broader qualification registry remains unchanged.

## Task 3: Reproduce Ordinary Native Settlement Before Further Controls

**Files:** Existing tests in `canvas-dom.test.mjs`,
`canvas-presentation-view.test.mjs`, `canvas-presentation-hosts.test.mjs`,
`apps/ultra/tests/ci/canvas-source-preflight.spec.mjs` and
`live-source-gesture.spec.mjs`. Scope any demonstrated correction to the
ordinary host files in the reuse map.

**Interfaces:** Consume the existing `freezeEdits`, `captureDrafts`,
`captureScope`, `settleDrafts`, `assertScope`, `settleParameterGestures` and close
barriers. Produce explicit accepted/rejected/cancelled outcomes tied to the
original owner and revision.

- [ ] Reconcile local packet identities and current source/build selection with
  the top status entry. Validate only the packet files needed for this slice.
- [ ] Extend the existing delayed-admission fixtures: edit A, hold its native
  acknowledgement, edit B, then switch source, navigate, Save or Close. Cover
  rejection of A and B independently, source deletion, replacement and close
  cancellation. Do not assume the experimental second-binding problem exists
  in ordinary hosts; first establish a failing ordinary-host case.
- [ ] Assert exact original owner/source/revision for every submitted write;
  no write reaches the replacement source; refused edits remain recoverable;
  stale close tokens cannot acknowledge a newer request.
- [ ] If an ordinary-host failure reproduces, write its failing regression and
  correct only its existing scope/settlement boundary. If all cases pass,
  retain coverage and leave production code alone.
- [ ] Run focused host/DOM/browser suites, then the full Node suite. Follow
  with a matching-pair native Save/Quit/reopen probe using the retained helper,
  complete 203-value comparison and both instance identities.

**Acceptance:** Two edits cannot be lost or redirected by host replacement.
Synthetic IPC checks and actual native observations are reported separately.

## Follow-On Gates: Separate Implementation Slices

These gates are ordered dependencies, not invented fixes for unresolved causes.
Write each bounded implementation slice after its reproduction identifies the
necessary changes. The existing November 15 plan remains the broad roadmap.

### Gate A: Native Timing And Retirement

- [ ] Reuse `tests/live_device_{bank,lifecycle,backend}_test.cpp`,
  `tests/stream_measurement.py`, `tests/sustained_measurement.py` and the retained
  Arrangement/native wrappers. Pin source, build mode, artifacts, sample rate
  and buffer before a short diagnostic.
- [ ] Reproduce the debug allocator failure, callback overruns and incomplete
  cleanup separately. Keep each raw exit code, final epoch and process identity;
  a journey PASS marker alone cannot pass its wrapper.
- [ ] Cover Stop/Start, seek, loop, clip transitions, failure rollback, note
  termination and independent instances. Require preparation/retirement off the
  callback and retain every over-budget sample. Do not enlarge budgets.
- [ ] Correct only demonstrated causes, rerun the same workload, then attempt
  the existing 1800 proven-playing-second endurance gate. Wall time and pilot
  duration cannot substitute for playing credit.

**Exit:** Measured lifecycle/timing acceptance on identified artifacts; all
unresolved failures remain explicit. A green functional CI run is insufficient.

### Gate B: Finish Analog And Its Existing Editor

- [ ] Reuse current Analog descriptors, defaults, grants and original evidence.
  Complete initialization before notes and verify endpoint/enum/compound-state
  behavior, same-source instance isolation and edited save/destroy/reopen.
- [ ] Fix the recorded horizontal panel and 800x600 sidebar clipping within
  the existing renderer. Verify reachable controls, focus, invalid drafts,
  hide/show and restored state at 800x600, 1280x800 and 1440x900.
- [ ] Run existing `analog-profile.spec.mjs` and geometry/host tests, followed
  by actual Tauri/WebKit inspection. Preserve unsupported controls explicitly.
- [ ] Require the ordinary Ultra edit -> acknowledgement -> Undo/Redo -> Save
  -> Quit -> reopen workflow with exact values before expanding control grants.

**Exit:** A usable, accurately scoped Analog editor and qualified state behavior.
Electric stays unavailable until its own initialization and lifecycle pass.

### Gate C: Alive End-To-End Admission

- [ ] Exercise an ordinary saved qualified device in Alive through MIDI clip
  playback, two independent instances, Stop/Start, seek/loop, Save, Quit and
  reopen. Verify native sidecars, complete state, rollback and note termination.
- [ ] Reconcile all ten stages with source/artifact/evidence identities before
  proposing any change to `live-device-qualifications.json`.
- [ ] Run `python3 apps/ultra/tests/test_import_live_library.py` and the existing
  exporter tests; verify immutable revisions, no-op rescans and preservation of
  user files. Test publication in an isolated destination before the live library.
- [ ] Build and verify a matching Alive/Ultra/native pair. If presenting it for
  manual testing, follow `apps/AGENTS.md` to select both launchers and verify
  their targets and hashes. Keep prior snapshots available.

**Exit:** The user can import, play, edit and reopen one qualified Analog device
through the existing Alive workflow. Physical listening/hardware qualification
remains a separate explicit result.

## Verification Commands For The First Slices

Run from the isolated execution checkout root:

```sh
node --test apps/ultra/ui/canvas-dom.test.mjs
node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs apps/ultra/ui/live-profiles/analog/*.test.mjs apps/ultra/ui/live-profiles/electric/*.test.mjs
git diff --check
```

Run from `apps/ultra/tests/ci`, with its locked dependencies installed:

```sh
npm ci
npm run test:browser -- canvas-hierarchy.spec.mjs canvas-documents.spec.mjs canvas-source-preflight.spec.mjs live-source-gesture.spec.mjs live-resource-identity.spec.mjs
```

The repository config selects sandboxed Chromium and does not define a named
`chromium` project. Use file filters directly. Playwright CLI filtering was
checked against current Context7 documentation. Configure existing private
fixtures only after checking their identities; absence remains a skip.

## Execution Order And Observable Milestones

1. Tasks 1-2: ready-to-accept browser navigation fix with current evidence.
2. Task 3: safe ordinary native edit ownership through Save/Close/navigation.
3. Gates A-B: measured lifecycle and one usable Analog editor. Editor geometry
   may progress independently, but cannot grant runtime qualification.
4. Gate C: the first complete Alive import/play/edit/save/reopen workflow.

Keep the PR acceptance change small. Do not hold its browser correction open
until every native instrument is qualified, and do not use its acceptance as
qualification of the separate native work.
