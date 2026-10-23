# Capture009 Missing ACK Investigation

## Findings

1. **Confirmed command-response timeout; internal minus progress is unknown.**
   The retained command is101, operation/install-minus-r1. The current ACK is
   successful ACK100 for close-plus-r2, and no retained ACK101 exists. The exact
   private failure is TimeoutError, `Finite private command did not complete`.
   The current runner waits10seconds for an ACK with the requested command_id
   before retaining its bytes. This is a missing response, unlike008's explicit
   false ACK101. It supplies no minus terminal arrays, collector envelope,
   eligibility result, method-attempt count or invocation outcome.
2. **A new repeated-work cost is demonstrated in source and original synthetic
   execution, but is not established as the Max timeout cause.** A stable,
   fully eligible synthetic70-poll install performs91 complete configuration
   canonicalizations,91 each of definition/command/owner snapshots,89 complete
   collector host samples and1,823 geometry hashes. All six capability calls
   occur once and the request still refuses. The actual009 config canonical
   size is283,547 ASCII characters; the conditional91-copy path would emit
   25,802,777 configuration characters. Actual Max copies/polls/attempts remain
   unobserved. These are repeated canonical serialization/string comparisons;
   the full configuration's binding SHA is computed once on collection.
3. **Recommend a narrow exact-comparison optimization under the existing
   contract and bounds.** Capture canonical plain snapshots and required
   digests once, then compare complete current plain data exactly. After the
   first fully source-pinned host sample, compare every ordered host binding
   directly with its retained wrapper/data snapshot rather than hashing and
   remapping the same rectangle on each guard. Preserve every existing host
   read, its order, root filepath last, and final complete plain input checks.
   This is a next-design recommendation, not an implementation or admission.

## Observed Evidence And Timeline

Paths for source are relative to
`experiments/max-reference/arithmetic-roots-runtime-20261022/`. Private work is
`~/.cache/alive-ultra-evidence/arithmetic-max-runtime-009`. REA evidence is
`ev_2b367897874548f570647fd98f6b3ed116589181969d2dcc9f9b342f1a27540f`.
The parent reports one invocation, exit1, untruncated, with complete direct
public-file hash verification. That complete-response proof is parent owned;
this investigation checks retained local bytes and the supplied projection.

| Artifact | SHA256 |
| --- | --- |
| Public capture-evidence.json | c2ddfe3b4b357a0cb522256f67f7c50ea1b399ea63e1c4063c0f44300887bbeb |
| Public session.json | f21f2d44c6086ea19055943deb9547e22e24c25037d5ce1345e91e1719a5fe90 |
| Private command101,234bytes | 7aef00f82dc331f6c37aeca85d20f1e3297bf57ff09f76a666ccec3e690976c8 |
| Current ACK100,104552bytes | 351cefe5e93eb4fe5c8be21904d3307020f3532877cb840fc109ad854b1bb4fc |
| Private failure,74bytes | b37e2b334c7544519df1c251fc8654aed113bb2571e7e461f5fa66063deb992c |
| Private journal,63828bytes | aed213cf2d596932c902af05c4cdbb79876c42373acc807a421299e6358d7c54 |
| Raw runtime log,616bytes | 355ee941b397714d34b1904e2953bd3e49ab25160d7b42bb6c23aeae5a4ae741 |
| Current and consumed controller.js | 0447c587e09f9eb26ea2bf798d22c32714386baa747d1e73f92f385d5b8ce571 |
| Frozen test_helpers.cjs | 12d1532a645cb975013e3556488c7613080cdf8f62011bd9f4760c32b5f37f4d |

Filesystem mtimes in UTC:

| Retained boundary | Time |
| --- | --- |
| Last journal write, row190, close-plus-r2 | 2026-10-22 22:58:50.512671371 |
| Current successful ACK100 | 2026-10-22 22:58:50.517671412 |
| Exact command101 written | 2026-10-22 22:58:50.658761187 |
| Private TimeoutError written | 2026-10-22 22:59:00.697797782 |
| Final runtime-log mtime | 2026-10-22 22:59:00.940758318 |

ACK100 precedes command101 by0.141089775seconds. Failure-file mtime follows
command101 by10.039036595seconds. These are retained filesystem timestamps,
not Max callback timestamps or a measured internal controller duration.

`run-runtime.py:175` records/sends the command, writes command.json and calls
wait_json with timeout10 at line181. ACK retention follows that wait at line183;
there is therefore no invented ACK receipt for a command that timed out. The
current shared safety implementation at
`../help-roots-runtime-20261022/run-runtime.py:241` uses a monotonic deadline,
polls the JSON every0.05seconds and raises the exact retained message on expiry.
The private failure file is written by the runner's exception handler at
`run-runtime.py:303`. This was the command wait, not the overall150second cap.

The public session has101 command requests and100 retained successful ACKs.
Its final ledger operation is close-plus-r2/request100 with an empty live-owner
map. The journal contains190 contiguous rows, ends at close-plus-r2, and has
only receipt, stimulus and step-complete kinds: no harness-error. There is no
request101 completion/error row or separately retained ACK101. The parent-
accepted prefix is52 times/plus operations,48 live checkpoints,336 states,
94 original outputs and4 independent closes. Integrity, native prefix and
proof accounting are assigned to the separate capture audit.

The runtime log contains10 lines and no TypeError, ReferenceError, RangeError,
SyntaxError, minus, controller.js, line or stack marker. This is not proof that
the Max console received no error or that the JS engine kept making progress.
The earlier parent614 figure came from universal-newline text reading and
re-encoding: two CRLF pairs become LF. Raw file bytes are616 and their hash is
listed above. This accounting difference is not an observed private mutation.

For context only, preserved008 command/ACK mtimes place its explicit refused
ACK101 at8.577222048seconds after command101, and its failure file at
8.714949609seconds. That is a useful earlier response boundary under the same
runner wait, not a controlled timing experiment proving009's cause.

## Source Critical Path

`controller.js:431` reconstructs canonical command, definition, entire config
and owner strings on every inputs() call. sameInputs() calls inputs() again;
the original snapshot strings are then compared. Initial snapshot work occurs
inside createMinusDiagnosticCollector before max.message(openfile) at
`controller.js:1085`. No minus progress artifact identifies whether009 passed
that point.

On the first fully eligible validation pass, observe() checks inputs, validates
the source/schema/projection, and takes a complete host sample. Every method
slot then has three guards: before lookup, after lookup/before invocation,
and after the retained/classified outcome. Each guard takes another complete
sample, ending with root filepath and a full input comparison. The existing
poll finally block performs a later check after each nonterminal poll. The
terminal fail() performs its terminal guard before export.

Every complete sample copies20 runtime rectangles, hashes each copied vector,
filters source descriptors to rematch the objects, and compares complete
ordered rows/handles against retained data. That path runs again on subsequent
polls after attempted=true even though no capability can be retried. If source
checks pass but a host identity is unsupported before lookup, attempted remains
false and the full source/schema/projection checks can also repeat per poll.

Strict refusal normally remains inside the original poll loop until attempt70;
the alternate settling bound is80. Scheduling remains100ms, with no interval or
limit changed by009. Seventy nominal100ms delays account for7seconds before
callback execution, scheduling overhead, file opening/settling and final error/
ACK I/O. This arithmetic does not measure actual scheduling or available CPU
time in009. Source code alone cannot distinguish delayed command dispatch,
initial snapshot work, window opening, host eligibility refusal, a started or
completed batch, later polls, JS failure or another host stall.

The normal minus envelope is exported only in terminal fail(), not when its
six-slot collection completes. Consequently, missing ACK/envelope cannot be
interpreted as zero attempts, never-eligible, unavailable methods, a completed
batch or any specific partial prefix. The present evidence has no such result.

## Focused Synthetic Measurements

One inline Node process loaded only the original in-repository synthetic
fixture's function definitions and the current controller. It did not execute
the test suite, historical code, actual Max methods or private source graphs.
All source strings, rectangles, defaults and method values in these fixtures
are the original synthetic ones. Extra synthetic definitions were independent
copies renamed original-synthetic-extra-N; padding was an ASCII x string.
No private-derived fixture or measurement file was written.

The synthetic Task queue executes callbacks immediately: scheduled100ms delays
were not slept. Each run asserts a false ACK, zero roots/revisions, zero geometry
dispositions, and either six once-only synthetic calls with an envelope or zero
calls without one for the explicit ineligible control. There were13 focused
install executions: one count-instrumented and three uninstrumented runs for
each of three data shapes, plus one count-instrumented identity-refusal case.
This is not a further full-suite run.

Count wrappers existed only in memory. Uninstrumented timings were measured
separately with Node v22.23.3 and performance.now(); they include synthetic
installation/refusal work but no configured Task delays or actual host costs.

| Original synthetic configuration | Canonical ASCII chars | Median total work,3 runs | Median first poll | Median later-poll median |
| --- | --- | --- | --- | --- |
| One definition | 21218 | 305.469ms | 86.229ms | 3.071ms |
| Six definitions | 122083 | 810.812ms | 205.752ms | 8.420ms |
| Six definitions plus ASCII padding | 300000 | 958.766ms | 246.666ms | 9.518ms |

All three shapes took70 synthetic polls, six ordered calls and a strict false
ACK. Their exact count-instrumented stable paths agree:

| Work item | Count |
| --- | --- |
| Source eligibility/schema/projection check | 1 |
| Complete configuration canonicalizations | 91 |
| Definition, command and owner canonicalizations | 91 each |
| All top-level canonical calls, including projection/helper/diagnostics | 367 |
| Runtime rectangle hashes in complete collector samples | 1780 |
| Source rectangle validation/pin hashes | 43 |
| Geometry hashes total | 1823 |
| Dedicated ASCII hashes for projection/snapshots/diagnostics | 6 |
| Complete collector host samples | 89 |
| Runtime getboxattr rectangle reads, including unchanged legacy validation | 20820 |
| Root filepath reads, including70 poll path checks | 159 |

The unchanged legacy validation accounts for19040 rectangle reads; the89
complete collector samples add1780. Configuration snapshots alone emit
1,930,838 /11,109,553 /27,300,000 synthetic characters for the three shapes.
These are cumulative serialization output counts, not peak RAM measurements.

The deliberately ineligible six-definition control sets synthetic root parent
ownership wrong. It performs70 source checks,71 complete configuration and
each other identity canonicalization,3010 source geometry hashes and70 source
projection ASCII hashes, with zero calls and no envelope. Its instrumented
unslept work is802.744ms. It illustrates repeated work when no eligible batch
starts; it identifies no actual009 host property.

The actual009 config file is285388bytes, with283547 canonical ASCII characters
and six configured definitions. Its minus definition has19206 canonical ASCII
characters. These sizes were computed read-only in Python memory, without
printing or using private values as synthetic inputs. Under the synthetic
stable path's conditional91 copies, the config contributes25802777 characters
and the definition1747746. No observation establishes that009 executed that
path or number of copies. Synthetic padding also does not reproduce the actual
configuration's nested structure, Max JS engine, wrappers or machine load.

The measured size sensitivity and exact redundant operation counts justify a
bounded optimization candidate. Node's subsecond work is not evidence that Max
used the same time, exceeded10seconds, completed six calls, or would succeed
after optimization. No throughput multiplier or predicted Max duration is
claimed.

## Minimal Safe Next Design

Keep the change confined to the current collector and its covering synthetic
tests. It should preserve the accepted diagnostic envelope and all refusal,
source/schema/identity/currentness/lifetime contracts:

- Capture immutable owned plain snapshots and their exact existing canonical
  digests once. Later guards must still compare every relevant current key,
  type, value, array order/length and nested field, plus the same retained
  configuration/action/owner/definition references. No partial snapshot,
  whole-object reference-only shortcut or omitted definition is sufficient.
- Reuse a successful source/schema/projection validation only while those
  complete plain identities remain exactly equal. A changed helper, owner,
  dynamic path, source descriptor, edge, leaf or request must still refuse.
  Initial eligibility still requires the full exact source predicate and all
  seven differences; an unsuccessful host sample is not cached as eligibility.
- After the first fully pinned sample, compare the complete ordered host
  inventory, wrappers, ownership, names/classes/rectangles and child identities
  directly against its retained plain bindings. Retain every existing host
  property/method read and its finite order, including full hierarchy traversal
  and root filepath last. Perform complete plain input comparisons after that
  final read, with no later host read. This replaces repeated SHA/rematching
  work, not fresh observations or any guard.
- Preserve one guarded method lookup, captured trusted invocation, all result
  classifications, truthful partial prefixes/counts, first failure, monotonic
  stale context and export from owned plain data. Calls remain once-only and
  capped at six. Later diagnostics remain actual terminal-pass facts.
- Preserve unconditional minus refusal, zero binding/observers/dispositions,
  the current70/80 attempt limits,100ms scheduling and10second command wait.
  Introduce no timing/capacity expansion, policy, admission or diagnostic
  suppression. The next design and source review must demonstrate these
  equivalences before any parent-owned fresh preparation/capture.

This investigation implements none of that proposal. Actual host support and
whether reduced redundant work would yield a terminal ACK remain open.

## Preservation And Scope

All30 private arithmetic roots and1523 entries have exactly equal before/after
inventories. Inventories include relative names, type/mode, uid/gid, size,
mtime_ns, ctime_ns, inode, symlink targets and regular-file SHA256. Aggregate
inventory SHA256 is
`1340633d8ec73e334f73cb75e1c7f01f28a5850252b3c032bb6d56fecd21b129`.
The controller/test hashes remain frozen as listed. Only this report was written.

No source, private artifact, consumed009 work, archive, historical record,
preparation, runtime, native or display state was modified. No historical
executable, full suite, preparation, archive, Max/Wine/native/display/REA,
delegation or commit action occurred. Every Python evidence command used -B;
private data stayed in memory and no bytecode or persistent fixture was created.

Capture009 remains FAILED/incomplete at command101. Full obligations remain78
operations/66events/72live+6empty checkpoints/504states/141outputs/
6independentcloses/90nativecables/297typedreceipts, commands1-150 plus barrier151,
one owner, pristine resets, saved_order_observed=false and qualification0/2103.
