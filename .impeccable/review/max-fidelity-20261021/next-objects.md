# Next Max Objects And Whole-Help Batches

Read-only assessment, 2026-10-22. No Max process, new reference execution,
installed-source mutation, or implementation was performed for this report.

The frozen denominator remains **2,103 help files**: 973 core and 1,130 package
files, plus 42 supporting patches. Whole-help qualification remains **0/2,103**.
Native embedded views now address ownership and view lifecycle; they do not
implement load initialization, external abstractions, or the help scripts.

## Recommended Batches

| Order | Concrete batch | Confirmed blocker and intended unlock | Dependencies and evidence still needed |
| --- | --- | --- | --- |
| 1 | **Small whole-help candidates and reusable help UI:** explicit adapters for `helpstarter.js`, `helpname.js`, `helpdetails.js`, `helpargs.js`; saved `showontab`/scripting-name metadata; message-box cold replacement/editing; Max number-box integer/Tab behavior; `print @popup 1` behavior. | Complete `append`, `prepend`, `int`, and `float` roots were inspected. All contain the same four-box shell and two embedded tabs; totals are 19, 18, 25, and 27 boxes respectively. Their remaining dependencies include helper UI, message displays, and saved attributes. Existing native target objects, plain-name send/receive, print, and hierarchy cover substantial parts of their examples. | Preserve complete roots and every reported dependency. The helper scripts were inspected, not executed. Their reference-dictionary and theme behavior needs a bounded adapter contract and an end-to-end comparison. `helpstarter.js`'s creation fallback is unnecessary for these four saved shapes because both named tabs already exist; this does not justify a generic script no-op. These are candidates, not four promised passes. |
| 2 | **Creation and startup:** `loadbang`, `loadmess`, explicit local `thispatcher loadbang`, then the observed `pcontrol open/close` subset. | Frozen hierarchy execution observes grandchild-before-parent startup and no reinitialization on child open/close. A separate initialization capture records parameter restoration before child and root loadbang. Startup is still an explicit import/runtime gap. | Define creation, connection, restoration, and startup phases independently of view boot, CAS reapply, and DSP start. Reuse the finite captures for their actual cases; sibling ordering and arbitrary dynamic creation are not established. Native view identity is now available as a foundation. |
| 3 | **External abstraction instances and names:** bounded `.maxpat` resolution, `#0`/`#1` argument substitution and inherited embedded contexts; subsequently `patcherargs` and a deliberately limited `bpatcher` loader. | Existing observed probes distinguish literal tokens in top-level/embedded patches from unique abstraction `#0`, positional arguments, missing argument zero, and inherited contexts. Plain-name global buses do not provide scoped instance names. The inventory contains `bpatcher` in 592 help files. | Add explicit dependency resolution, separate abstraction instance identity, recursion/depth limits, qualified runtime IDs, and initialization from batch 2. Prefix substitution was observed, while suffix forms remained literal. `bpatcher`, abstraction DSP, arbitrary search paths, and general attribute substitution were not executed by those probes; do not extrapolate them. |
| 4 | **Missing synchronous control routes and help inputs:** `change`, `gate`, `switch`, `split`, `clip`; then explicit-range linear `scale`; supporting `umenu`, `radiogroup`, `dial`, and `incdec`. | The source-backed next-control map pins ports, methods and basic-tab anchors. None of these six target names appears in the current native registry. Frozen help occurrence counts include gate 94, scale 71, switch 56, and change 54 files. Menus and other UI inputs are omissions in their actual help graphs. | Reuse the typed synchronous executor, but capture numeric conversion, cold-input behavior, route selection and outlet order before claiming parity. The retained next-control map explicitly has no runtime oracle for seven of its ten targets. `scale` defaults, curved/legacy modes, and reversed/zero spans remain unverified. Message substitution such as `size $1` is a separate required contract, not plain literal parsing. |
| 5 | **Timers and compatible state machines:** millisecond `delay`/typed `pipe`, Max-compatible `metro` and `counter`, followed by `deferlow`/`qmetro` priority behavior and transport-dependent forms. | Current Ultra metro has a 150 ms default, 20..2000 ms range and one-shot bang; its counter is a two-inlet/one-outlet modulo object. Those are confirmed incompatible contracts, not missing aliases. Existing scheduler captures only show one metro run, delay cancellation, and pipe clearing. | Version or migrate existing saved metro/counter behavior. Define bounded queues, equal-deadline ordering, graph-removal cancellation and execution with DSP off. Overlapping delay triggers, pipe flush/order and multi-field typing, counter carries/resets, and transport timing require additional oracles. One installed pipe example has 12 slots/13 inlets, beyond the current eight-atom/field profile. |

## Cross-Cutting Gates

- Execution remains 32 nodes and 64 cables, including boundary relays, despite
  the larger v2 authoring limits of 512 nodes, 1,024 cables, 16 levels and 1 MiB.
  Whole `pipe`, `counter`, and `scale` help roots contain 121/100/74 total boxes;
  pipe has 84 total patchlines. These totals flag capacity work, but total boxes
  are not executable-node counts. Measure the complete lowered graph after
  adapters resolve each dependency before choosing a new execution profile.
  More native windows cannot solve a single owner's execution limit. The current
  eight-atom message profile and finite scalar range of +/-100,000 also exclude
  larger pipe examples and Max counter's documented default maximum 2,147,483,647.
- The best early complete-help candidates are the small four roots in batch 1;
  adding dozens of target objects while omitting their helper boxes cannot
  advance whole-help qualification. Test complete original-file intake, all
  tabs/dependencies, ordered messages and visible behavior separately from
  original Ultra examples and partially imported fragments.
- These five batches do not cover the full corpus. It includes 563 RNBO package
  files and 203 core Jitter help files, among other separate runtime families.
  Buffer/sample playback, general scripting, Jitter, MC/polyphony, RNBO and
  managed/package dependencies require later explicitly scoped tracks.

## Evidence And Interpretation

Counts were recomputed in memory from the frozen `help-files.jsonl`, selecting
only `kind=help` and the `box` namespace. They measure literal occurrence, not
semantic coverage or predicted passes. Declared helper dependencies occur in
948 files for `helpstarter.js`, 955 for `helpname.js`, 1,123 for
`helpdetails.js`, and 466 for `helpargs.js`; overlaps are intentional.

Sources:

- `experiments/max-reference/help-coverage-20261021/{summary.json,help-files.jsonl}`:
  frozen corpus denominators, namespaces, dependencies and graph sizes.
- `experiments/max-reference/hierarchy-reference-20261021/{README.md,sources.json,summary.json}`:
  four complete-root inspections, helper identities, initialization/scoping
  observations and explicit untested boundaries.
- `experiments/max-reference/object-batch-next-20261021/{README.md,object-map.json}`:
  documented control contracts, saved help ports, migration hazards and pending
  runtime cases. Its old registry snapshot is historical, not a current census.
- `experiments/max-reference/help-next-20261021/README.md` and
  `help-import-20261021/README.md`: fragment-level evidence and omitted UI/message
  behavior. Their old print/receive/hierarchy gaps are partly superseded.
- Current `apps/ultra/PATCH_PROTOCOL.md`, `apps/ultra/ui/canvas-max-import.mjs`, and the
  hierarchy/native-view specifications: present runtime profiles and refusals.

This ordering is an engineering recommendation based on repeated dependencies
and retained evidence. It is not a measured estimate of files unlocked per batch.
