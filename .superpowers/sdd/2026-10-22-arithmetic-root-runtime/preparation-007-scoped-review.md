# Preparation007 Independent Scoped Review

Date: 2026-10-23 (Asia/Hong_Kong).

Changes are required before accepting this frozen implementation for preparation.
Two concrete specification and validation gaps reproduce independently. Neither
bypasses immutable006 byte pins or the strict plus V8 class refusal. The
single-use result architecture and the separate controller/V8 admission boundary
have no additional in-scope finding from this review.

## Findings

### P2: The independent006 loader never validates the lifecycle owner map

Reference: `experiments/max-reference/arithmetic-roots-runtime-20261022/arithmetic.py:638`.
The loader checks the selected definition's revision, owner inlet and paths at
lines 641 onward, but never reads `config.lifecycle.owners[2]` anywhere in
`load_plus_controller_cohort_measurements`. It therefore does not independently
establish that the controller's configured revision-1 plus owner has strict
inlet 2, document, revision, source and working-path agreement.

The accepted design explicitly requires independently binding the revision-1
owner/path in the private loader. This is a missing semantic obligation behind
correct immutable byte pins. It does not mean that the retained actual006
configuration or its pinned hash is wrong.

Independent reproduction used the existing `capture006_fixture` in a temporary
synthetic home. The baseline fixture has no lifecycle map and the loader still
returns three members. For each additional control, the probe adds a correct
owner-map row and independently changes its inlet to a string, revision to 2,
source to a foreign digest, or working path to a foreign synthetic path. Only
the synthetic configuration hash, its seal entry and the synthetic seal hash
are rebound so the semantic checks execute beyond the hash guard. Every one
of these cases still returns three members. The valid-map control also returns
three members. The parent independently reproduced the omission with separate
fixtures, including a boolean inlet.

Required correction: require the owner map and exact revision-1 plus owner row,
validate strict JSON types and all source/path/inlet/revision/document
conjunctions against the selected definition before accepting the cohort.
Give the valid synthetic fixture a valid owner map and add negative controls
for missing maps/rows and each malformed identity field, rebinding only
synthetic hashes so those controls exercise the semantic guard.

### P2: The V8 root diagnostic pins omit the authored source class

Reference: `experiments/max-reference/arithmetic-roots-runtime-20261022/v8-readback.js:324`.
The new root diagnostic table and predicate pin runtime descriptors, source
box/text hashes and saved geometry, but never independently check
`expected.maxclass`. The value is then copied into `root_rows[].source_class`
at line 336. Existing measured geometry policies incidentally check the
authored class on three roots; the unchanged `root/obj-4` has no such policy
and is exposed by this omission.

Independent reproduction creates `plus007V8Fixture`, changes only the
`root/obj-4` descriptor's `maxclass` to a synthetic forged class and calls the
real `collectRepresentationDiagnostics`. It returns complete root/Basic
coverage with counts 8/35, performs six target calls and emits the forged
`source_class`. The unchanged valid control reports the expected source class
with the same coverage and calls. Both retain `strict_mismatch=true` from the
actual numeric classes, so this does not create V8 class admission. The parent
also independently reproduced this control.

The accepted design requires all four root source-box/text/geometry/class
descriptors to be independently pinned before source-bound probes. Reporting
a caller-supplied source class as bound provenance while still performing the
positive probes violates that requirement even though later readback refuses.

Required correction: add the exact authored class to each separate plus root
diagnostic pin and require it before positive numeric calls or source-class
labels. Test valid source classes and a changed authored class on every root,
particularly `root/obj-4`, with zero target calls on rejection. Preserve raw
actual candidate classes and the existing strict V8 refusal.

## Reviewed Guarantees

The review covers the accepted design, ownership briefs, policy contract,
frozen five-file diff, both implementation reports and the relevant production
and synthetic test paths. The specification contract is not referenced by the
three production files as a runtime dependency.

The controller's distinct plus metadata reader does not enter the truthy times
representation-policy resolver path. Full hierarchy diagnostics and the three
original mismatches remain separate from the cohort's satisfied disposition.
The issuer owns the exact issued reference and payload in a local closure;
its trusted bind authenticates that reference before inspecting supplied
properties, disables authority before host rereads, rechecks ownership and
descriptor snapshots and consumes before attachment. Poll `finally` expires
authority. Bind reuses captured Basic and member handles without additional
resolution or capability calls. The previous terminal-failure latch remains
present.

V8 recognizes the new policy as controller metadata. It still admits no plus
V8 policy or witness. Complete diagnostics can retain actual `number` and
`jpatcher` facts while strict readback refuses them. The plus branch checks
exact 8/35 count and identity coverage; incomplete inventories suppress target
probes and leave positive fields unknown. The authored-class finding above
limits its claimed independent source binding.

The private loader binds all twenty-two sealed inputs, consumed historical
files/package map and fixed provenance artifacts. Its trace parser validates
the retained ordered incomplete prefix and does not synthesize an ACK51,
successful installation or revision-2 live witness. The owner-map finding
above limits its claimed independent ownership validation.

## Verification

Fresh reviewer commands completed successfully:

```sh
node test_helpers.cjs
python3 -B -m unittest test_preparation.PreparationTests.test_capture006_cohort_loader_bindings test_preparation.PreparationTests.test_capture006_cohort_trace_prefix test_preparation.PreparationTests.test_plus_cohort_policy_binding test_preparation.PreparationTests.test_plus_cohort_source_metadata_keeps_both_complete_descriptor_views
```

The complete Node suite passes all nine007 groups. Its retained controls
report twelve P1/P2 identity cases, eight geometry cases, zero invalid target
calls, and ten inert queued-failure cases. The four targeted Python tests pass.
These existing tests do not include the two independently reproduced negative
controls above. The original probes ran in memory or in automatically removed
temporary synthetic fixtures; they changed no reviewed file or real evidence.

Parent-attested fresh verification additionally passes all three syntax checks
and the complete seventy-test Python discovery run: sixty-nine pass and one
existing optional native-binary test skips. This review did not rerun the
native binary, full comparator or full006 capture audit.

## Frozen Bindings And Preservation

All sixteen final file hashes and sixteen historical006 base hashes match the
frozen review map. Reconstructing the complete unified diff directly from
those base and final bytes exactly reproduces the frozen diff. Exactly the
authorized five files differ; the other eleven files and complete score are
unchanged.

| Binding | SHA256 |
| --- | --- |
| Accepted design | `641fec636da5405d5bc24bc0ec27ed28d5fb4991aa360c08fd4b382202e27d8b` |
| Original implementation brief | `21e1cd2606a00dd75493a60b1c333c8788acb598664cf112dffd372871ea6642` |
| Python ownership brief | `f4c8a3d72fda5cdcc66fa63a47c21bf29ad7d032c5cf19511245d81300fa8e6b` |
| Specification-only contract | `b21497577dddd01a3051063eec16ffea3da4a5d6b030ffbf374907a75332c73a` |
| Frozen five-file diff | `9e53010cd33679ec7eade1a14b696a0a883792bc538c3d3a2b4a98c92c273692` |
| Frozen review-map artifact | `9e79c3adef8d7cb31dc2322bde3d7d9df47d318499ee75078374a41b54e8747e` |
| Current sixteen-file canonical map | `eb299dc8346498e2f323e538f6b55503cc2aad8bf141f0435a7c768c7e60d374` |
| Current ten-file package | `67b8c8fb6a2f81dae30a2a410f8e56bdf3697257f7018e9382812ed19e399f3f` |
| Historical006 binding | `bce1edf4484c73bf95a5c1c1648ff7e7f8f3ce479fe96c92be6639fa6e466df6` |
| Python implementation report | `ec13260c79dcccda94e63e6ba191b1853d44cd5a3de65907bc9064a0f2d15ff0` |
| JS/combined implementation report | `240ffeb60e7797fa59372f5edf5656a05a3b3018c6ea8710a6801ae129e8386c` |
| Complete score | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |

Reviewer pre/post inventories compare relative names, lstat modes, file sizes,
mtime nanoseconds, inode identities, link targets and regular-file hashes.
All twenty-three pre-existing arithmetic private directories remain exactly
unchanged, including historical archives. The native-score directory retains
exactly `binding.json`, `expectations.json`, `native.jsonl`, `stderr.txt` and
`transport.txt`; its metadata-enriched inventory digest, including the root
directory entry, remains
`fd6740dd1ae700e96dc22b8c9880a76c981110db987f51ea9323253a35468f89`.
The parent's announced new `arithmetic-package-007-review-base` archive is the
only additional private directory observed. It is a parent-owned preservation
action and was not written by this reviewer.

This new report is the reviewer's only persistent write. No implementation,
private/history, lifecycle, observer, runner/comparator, native or application
file changed. No preparation, target/display/Wine/Max launch, native rerun,
delegation or commit occurred.

## Limits And Disposition

Fix both bounded findings and freeze a new diff/map/package for a focused
independent re-review before preparation007. Preserve this initial review and
its rejected implementation bindings. Passing synthetic tests do not prove
live plus installation, a V8 representation permission, complete capture,
parity, silence or saved order. Fresh concrete preparation review and any
parent-only capture remain pending. The full 78 operations, 504 states, 141
original emissions and six independent closes remain required. Qualification
remains `0/2103`, with zero increment.
