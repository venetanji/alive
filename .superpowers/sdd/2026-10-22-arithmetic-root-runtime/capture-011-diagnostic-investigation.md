# Capture011 Read-Only Diagnostic Investigation

Capture011 remains FAILED. Its final private ACK101 establishes a refusal at the
collector's front-root reference comparison, while the runner's accepted prefix
ends at ACK100. The retained first and last failures prove strict JavaScript
reference inequality; they do not establish a different native document, a focus
change, unstable Max wrappers, or a demonstrated implementation defect. No
equality or focus fix is justified by this evidence.

## Evidence Binding And Acceptance

The investigation used the actual011 prepared command/configuration, final
private ACK, journal, runtime log, frozen controller/runner source, initial
verification, and preparation011 source/concrete reviews. Private artifacts were
inspected in memory. No licensed graph, operand, default, mode, geometry, helper
body, observed working path, or private program value is reproduced here.

| Evidence | Bytes | SHA256 |
| --- | ---: | --- |
| Final private ACK101 | 5696 | `87c03688cee90985af8bb4d99bd3d51db773d04f33ddc5ca3080b1f7759f2b9b` |
| Actual command101 | 234 | `7aef00f82dc331f6c37aeca85d20f1e3297bf57ff09f76a666ccec3e690976c8` |
| Runner failure | 74 | `b37e2b334c7544519df1c251fc8654aed113bb2571e7e461f5fa66063deb992c` |
| Private journal | 64025 | `eab68d43aee372e4f39504d9d9d6ee81171f7dc6bf54c491e54cbfa05836fa94` |
| Runtime log | 616 | `66680f5913a07f7a6610bf294355df00cb9186149212e1bc5be9dc40010a52dc` |
| Prepared configuration | 285388 | `212cc77409af95cc153a7e003ffac551aec3b9bee561349767cb4f794085a0c7` |

Additional bindings:

- Frozen/consumed controller:
  `d1f2a675a6a28fc146baa5d9661d6eb96537972784829452fa0d0c6ffcb4edaa`.
- Frozen helper tests:
  `ddabd1f17a0c464e5b6c56d87edbca3735d9f5043476f6b73e843f1048754779`.
- Canonical current sixteen-file map:
  `f49624494c8a540b6e470e88766a48546303f99c142d025ce0fc3ca37b0a9248`.
- Preparation seal:
  `30a1782c791cd8800abb38169476adc66626fecfc9f8e3307a7a52e68f3c46b5`.
- Archive binding:
  `51ace7139d7b4559fe84c9c930b6d2f3b0b573e50289b87a9100a90f84c7ebb5`.
- Public capture-evidence/session hashes, respectively:
  `242cfde1858d30610ad00c60b5726cfa64880756ea80e7b215e5a17948d3f310` /
  `7117e17749dbd3fb0ccfacaa4d8427671088b47bc08394169291dd039d2f58e3`.
- `experiments/max-reference/arithmetic-roots-runtime-20261022/verification-capture011-initial.json`:
  `efc05b571c708f31c3d7b1a95e6186583b211cdc1a21b27a0c5df2a471d8e68e`.
- Parent preservation record:
  `79a976cf3266ddfeecce5ab8c41d686cf9d11738ba37d5a28cc7e460f63eb809`.

The parent retains the complete original REA response for
`ev_38ca271f8a1a4a438579f17600edbc49d1d4e5b1ccdcd97d9509105fb7ce80eb`
and reports exit1/signal0/reason exited, untruncated, with all six original public
hashes verified before projection. This diagnosis does not replace that response
or the separate integrity audit.

The final private ACK binds request101, install-minus-r1, minus revision1 and its
source/owner to the actual prepared request. Its working-path identity matches
the owned configuration without exporting that value. It explicitly reports
failure. `observations/ack-request-101.json` does not exist; ACK100 is retained.
The runner's command101 record has no retention metadata.

`run-runtime.py:181` waits up to ten seconds for the matching ACK ID. Only after
that wait returns does it retain the raw ACK and inspect success. The recorded
runner failure is `TimeoutError: Finite private command did not complete`; it is
distinct from the controller's explicit private refusal. ACK101 is forensic
evidence, not a runner-accepted response or an accepted minus installation.

## What The New Progress Proves

The actual `minus-collector-progress-v1` record reports:

- Initial snapshot available; source validation attempted once and successful.
- Seventy observe entries and seventy host-sample attempts.
- First failure at poll1 and last failure at poll70, both at eligibility /
  front-root / front-root-mismatch, with `minus-root-ownership`.
- No capability envelope created and no collection entered; collection is null.
- Numeric capability lookup attempts, invocation attempts, retained outcomes,
  and completed pairs are all zero.
- Export phase is terminal-export; last sample phase is front-root.

These counts localize actual011 more narrowly than an absent capability envelope
alone could. They do not retain intermediate failure reasons, so the first/last
observations must not be generalized to every intermediate poll. They also do
not establish counts for009 or010. The zero counters concern the diagnostic
capability collection; the legacy hierarchy traversal performed host reads
before the collector was reached.

The private journal has191 contiguous rows:52 step-complete,44 stimulus,
94 receipt, and one harness-error. The final row binds request101 and records
`Error: minus-diagnostic-install-refused`. The fixed terminal refusal at
`controller.js:1073` follows the collector observe call independently of whether
the optional capability envelope exists. The collector's first/last failure
record supplies the narrower front-root location.

## Exact Acquisition And Failure Boundary

The frozen source shows this sequence within an install poll:

1. `install()` creates the request-local collector before opening the requested
   root. The poll runs through a scheduled Task.
2. `controller.js:1248` captures `p=max.frontpatcher`. The next statement reads
   `p.filepath` and compares it with the configured working path using samePath.
   Only a successful path match enters tree validation.
3. The poll passes this captured reference into the validation pass and
   validateTree. The existing hierarchy traversal runs before
   `controller.js:1072` calls `minusCollector.observe(patcher,...)`.
4. After owned-input and source checks, `controller.js:695` assigns
   `root=patcher`; it therefore receives the poll's original captured reference.
5. `controller.js:512` rereads `max.frontpatcher`, compares it with `root` using
   strict reference inequality, and records/refuses front-root-mismatch when
   unequal. Root-parent and later sample reads are then skipped.

Thus the retained failures compare a path-matched poll root with a freshly read
front reference after hierarchy traversal. They do not compare two observations
of the native document ID. There is no explicit scheduled Task boundary between
those two reads in this source path, but the evidence does not establish host
reentrancy behavior, exact focus history, or the native identity represented by
either reference. No failure-only front filepath or parent witness was captured.

The runtime log has ten lines and no TypeError, ReferenceError, RangeError,
SyntaxError, minus/controller.js/frontpatcher, or stack marker. Its generic
error/warning/X-connection tokens do not localize a script, API, window identity,
or cause. This limited process log is not proof of a complete Max console record.

Filesystem timestamps place the final ACK about9.992 seconds after command101
and about10 milliseconds before the runner failure file. The failure file is
about10.002 seconds after the command. These are filesystem observations, not the
runner's monotonic deadline, controller/API durations, or proof of a polling
race. In particular, the evidence does not show that ACK101 was written after
the runner deadline.

## Public Identity API Check

The following public Max8 references were fetched read-only:

| Reference | Bytes | SHA256 |
| --- | ---: | --- |
| https://docs.cycling74.com/legacy/max8/vignettes/jspatcherobject | 78837 | `a081a68e31c3d034ba510cae59680eed065a3a11d842d8e570037e18391f2c74` |
| https://docs.cycling74.com/legacy/max8/vignettes/jsmaxobj | 63714 | `9730af353e3311b06947f3446f4439e4ba7fefb91a40ae0085cd5b1ee73cb9f7` |

Patcher documents filepath, the containing box for a subpatcher, parentpatcher
with a nil result for a top-level patcher, and a JavaScript representation of the
associated window. getnamed is a local-name lookup; getlogical is predicate
iteration over objects. Maxobj.valid reports whether the represented Max object
is valid. Neither inspected reference specifies a stable native object ID or
native equality operation suitable for resolving this mismatch. The references
also do not guarantee stable JavaScript wrapper identity across these reads.
No guessed method alias, window identity, or validity check should substitute
for that missing guarantee.

## Narrow Recommendation

Preserve the original comparison and unconditional refusal. Existing reads
cannot resolve the native identity question. No runtime-policy change follows
from this diagnosis.

For a separately accepted diagnostic design, reuse the original fresh front
operand exactly once and observe only a bounded first eligibility mismatch.
One additional read of that operand's filepath, reduced in memory to a primitive
status and a samePath comparison with the owned expected path, is the smallest
useful new witness. A different-path result identifies a path ownership mismatch
at that observation. A same-path result remains unresolved: duplicate documents
can share a path, and path equality is not native identity.

The parent's proposed preparation012 design adds at most six once-only reads:
root/front paths, root/front parents, one repeated front reference, and that
repeated reference's path. The additional parent/reference observations can
describe top-level status and reference stability during the observation. They
still cannot prove wrapper instability or exclude a same-path document switch.
There is no documented smaller alternative that resolves that full distinction
using the two inspected APIs. This is a diagnostic assessment, not the separate
formal design review or approval of implementation/target use.

Any such observation needs the proposed fixed order/read bound, one-shot latch
spent before reads, owned request/source gate, explicit skipped/threw statuses,
no exception inspection, primitive-only independent exports, no retained host
handles or paths, and no capability admission. Diagnostic failures must preserve
the original front-root refusal. Repeated reference inequality is evidence about
references only. A future claim of native identity would need an independently
documented identity witness; it must not be inferred from paths, parents, names,
or guessed aliases. No timeout, scheduling, capacity, or qualification expansion
is recommended.

## Preservation And Verdict

The independent baseline inventory contained34 arithmetic private roots and2052
entries. The closing check reproduced the exact aggregate SHA256
`f28fc01ce5b986e59e06a07640165174ae955b23c2ab19c5d015a9337822a7a3`.
It includes each root and descendant's relative path, mode, UID/GID, size,
mtime/ctime/inode, symlink target where applicable, and file-content SHA256,
excluding atime. All sixteen current files and all sixteen uniquely matched
archive files agree with preparation011's frozen current_files map. The prior
captures, historical archives and native exact-five evidence remain preserved.

Only this report was written by this investigation. No source change, private
write/copy, preparation, archive, launch, native/historical execution, full suite,
commit, or delegation occurred.

The accepted runtime prefix remains52 operations,44 stimuli,48 live readbacks,
336 states,94 outputs and four independent closes. All six whole flags remain
false; saved order is unobserved. Full obligations remain78 operations /66 events
/72 live plus6 empty checkpoints /504 states /141 outputs /six closes /90 native
deliveries /297 typed receipts /commands1-150 plus151 barrier. Qualification
remains0/2103 with no increment. Capture011 provides a bounded diagnostic
localization and no accepted minus installation or broader runtime qualification.
