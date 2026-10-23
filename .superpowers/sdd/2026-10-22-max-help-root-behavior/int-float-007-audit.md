# Capture007 Independent Startup Audit

Verdict: **FAILED at startup, nonqualifying; zero qualification passes added.**
No mismatch was found in the audited historical bindings, retained raw metadata,
preservation checks, or recorded cleanup. This capture establishes no numeric
comparison, freebang witness, independently validated close, or completed run.
The startup cause remains unresolved.

This read-only audit used the complete retained REA record, archived
preparation007 manifest, private preparation007, and historical package007.
Only this note and `results/int-float-007/startup-diagnosis.json` were written.
No current-package verifier, preparation, launch, screenshot, window enumeration,
clipboard action, graph analysis, or native comparator was run. Private graph,
configuration, helper, and runtime-log bodies are not reproduced in these
derived artifacts. Current package edits by the separate diagnostic task are
outside this historical audit.

## Failure Boundary

The public session records `status=FAILED`, `complete=false`, one runtime
invocation, zero completed operations, zero command requests, zero checkpoints,
zero public rows, and zero display states. All initial/numeric/dispatch/output
validation flags remain false. Screenshot and clipboard counts are zero.

Private `ready.json`, `ack.json`, and `private-journal.jsonl` each contain zero
bytes. The observations directory is empty; no command file, lifecycle observer
report, close proof, or final barrier is retained. Their absence supplies no
positive or negative conclusion about runtime freebang delivery: this attempt
never established initial driver readiness.

The session failure digest
`789c6bbf8394cc12430e61850cac52a4ca449e3e13f71ed48b4351c61d5c97db`
exactly matches the historical wait helper's timeout message, `Finite private
command did not complete`. Historical runner control flow first waits up to
30 seconds for initial driver readiness before sending score commands. The
empty ready file, zero requests, and digest jointly locate this failure at
that readiness wait.

The terminal failure digest
`0a9d3172b634e79cda409ea4d41750f952b04d11d57b44a3e508ec0984fbdde7`
matches the outer runner message, `Numeric capture failed; inspect hash-only
public session`. This is the expected outer failure after recording the
session; it does not contradict the timeout digest.

The retained runtime log is **551 bytes, nine lines**, with SHA-256
`2ef5aa5aec935da42c7652b4c276561479dd40468e150c644246b52a92e7f324`.
It contains XKEYBOARD/Xkb-related text and no selected JS/V8 error signature
under the audit's bounded search. This limited negative search cannot exclude
a JS/V8 startup error: the Max startup console was not captured, and the log
does not identify the cause of missing readiness.

## Sampled Launch Evidence

REA records a Wine launcher sample at **5,660 ms**, a Max-named sample for
the same launcher PID at **7,160 ms**, and a Max-named child at **12,920 ms**.
The launcher and Xvfb identities were independently verified by the runner's
capture-marker/prefix/display/PID-start checks. These samples establish launch
activity; they do not establish successful driver loading or JS/V8 execution.

REA samples the launcher PID and Xvfb again at **35,700 ms**, near the end of
the readiness wait, with empty command identity fields. That final sample
does not establish that the Max image remained running at the timeout, nor
does it distinguish a startup exception from another initialization failure.
No command lines or private arguments are included in the diagnosis.

REA `ev_d54bb2d47d54e88599849f63fee4427e2e212736e9ae4bce83687df9a1de6978`
records an ordinary process exit with code 1 and quiesced settlement after
96 ms. The capture itself did not reach its 180-second REA deadline. Both
copies of the inline/exported Evidence agree, and capture truncation is false.
All four directly observed after-files match their retained SHA-256, byte
size, mode, and regular-file metadata:

| After-File | Bytes | SHA-256 |
| --- | ---: | --- |
| receipts.jsonl | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| session.json | 19068 | `35a3a68cc2ae530487b122dc08037a3506449b849340d9c91126936426c97973` |
| cleanup.json | 2132 | `ef0ca712775ae19b8be5594d20e9fdbcc8576f7ec2d341050893e3e17d509a91` |
| display-states.json | 3 | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |

## Historical Integrity And Preservation

All **24 historical scripts** match the package-binding record, session
preparation binding, and private config package digests. Their independently
recomputed canonical aggregate is
`66e2e0daff2d21776c441f9c2bbe8ab6e21e65f1c821318d26f598891dacfa1f`.

Archived manifest, config, seal, work identity, source metadata, helper metadata,
and score bindings agree. The pinned score bytes/digest and all **18 sealed
files** match. Both shared audited safety files match their config digests.
Installed, pristine, and working source hashes match for all four revisions
(12 checks); installed/private shell helpers match all four pinned helper
hashes and sizes (eight checks). The four copied runtime helpers match the
historical script pins. Source Max executable bytes match the session digest.

The private tree contains five directories with mode `0700` and 24 regular
files with mode `0600`. No symlink or multiply linked private file is present.
Preference snapshots are byte-identical, and an independent current digest
scan matches all **33 original-prefix** and **1,081 source-prefix** preference
files recorded after capture.

Cleanup records empty readable owned/prefix/marker scans, exact ownership
signal scope, no display-only attribution, Xvfb exit, prefix removal, and no
ordinary quit request. The copied prefix is independently confirmed absent.
All source and helper preservation booleans are true and corroborated by the
independent hash checks above.

## Limits And Artifact Bindings

The runner records **318**, **316**, and **316** unreadable process
environments for owned, prefix, and marker scans. REA retains six unverified
process-ownership checks that were left untouched. Process trees are sampled;
filesystem observations are snapshots. Inherited environment and network
activity are unobserved. Executable digests are prelaunch samples with
unchanged path metadata, rather than atomic operating-system image bindings.
Private evidence is linked through session/config/seal/manifest hashes and this
audit; only the four public after-files have direct REA filesystem observations.

| Artifact | SHA-256 |
| --- | --- |
| Complete REA record | `be13e27bab1c407464ddbadc8c14db2f6fe2b71c994c0bb57c5236dd8d20b76f` |
| Archived preparation007 manifest | `09bba88c71f030617a554c858ee0c6ee7547330a74526e67fb7b83b71f9b7b00` |
| Private config | `ebcd0c1a9b460b50e9f82335361c4cb7af319511421df6719bdf5544d6dc2509` |
| Private seal | `7b0a3621aafc68c9bc238ba3c369a7d12bb9c4e01688b7333f4920f76b590894` |
| Preference snapshot, before and after | `5444dc994f5d2dcd50cc9fedd6ed2984e34308f750888b4760e2345f79ee33cd` |
| Derived startup diagnosis | `c50420203b7a1f7fd9045c46680dbc276cb10276ac40fa008f3f7bdcbcecce01` |

The derived diagnosis is audit metadata, not a new REA runtime observation.
Capture007 remains a failed startup attempt with zero qualification passes.
