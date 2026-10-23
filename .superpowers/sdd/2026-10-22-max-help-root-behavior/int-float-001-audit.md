# Numeric Capture001 Retained-Artifact Audit

Read-only audit of `experiments/max-reference/int-float-runtime-20261022/results/int-float-001` and its historical preparation. No runtime, scorer, preparation, current private verifier, screenshots, clipboard actions, or process signals were invoked for this audit.

## Findings

No retained-artifact integrity or preservation discrepancy was found. Capture001 is **failed and nonqualifying**: one attempted `install-int` command, zero completed operations, zero runtime checkpoints, zero numeric readbacks, and zero qualification passes added. Its single public receipt is a `harness-error`, not a numeric output. All seven capability booleans remain false; `display-states.json` is empty. Preparation verification's expected checkpoint counts do not establish runtime observations.

The retained ACK reports 70 identical diagnostics for the first strict refusal, `root/obj-1`, with zero full matches. Its candidate list also supports three uniquely associated int root shell deltas:

| Source Anchor | Saved Rectangle | ACK Candidate Rectangle | Runtime Class | Saved Child Role | Saved Incident Routes |
| --- | --- | --- | --- | --- | --- |
| `root/obj-1` | `[92,94,110,20]` | `[92,94,110,22]` | `js` | none | 0 |
| `root/obj-2` | `[10,85,50,20]` | `[10,85,50,22]` | `patcher` | score Basic child, 21 boxes | 0 |
| `root/obj-3` | `[205,205,50,20]` | `[205,205,50,22]` | `patcher` | other child, 0 boxes | 0 |

Each association is unique by runtime class and exact saved x/y/width; each observed-minus-saved delta is `[0,0,0,2]`. All three source maxclasses are `newobj`. Root `jsui` geometry matches exactly. The saved root has four boxes and zero cables; each root box has zero incoming and outgoing routes. Only `root/obj-1` was formally refused: the other two rows are derived candidate associations from that same ACK, not additional completed anchor checks. Float root geometry and all Basic/getter/lifecycle/order capabilities remain unobserved. This evidence does not justify a general tolerance.

The bounded public handoff is `shell-geometry-diagnosis.json`, explicitly labeled derived audit metadata and not REA runtime output. It contains source/ACK/config/seal/session digest bindings, classes, child roles, route counts, three measured deltas, and helper hashes. It contains no authored text, source bodies, or helper bodies. Existing `anchor-diagnosis.json` remains unchanged.

## Bindings And Preservation

- REA evidence `ev_08a48aad8591ed6b7e5f326dc09808a9c6c0d8da1b9698cb6433cc0251c24a6d` records one launch, exit code 1, and settlement after 112 ms. Its four untruncated after-snapshot hashes and sizes exactly match retained `receipts.jsonl`, `session.json`, `cleanup.json`, and `display-states.json`.
- Historical prepare, verify, and session preparation bindings agree. The recorded 11-file package ledger recomputes to `90708a93cd7dc5a355dde65e98ed627d80085dc8ea6679723c45493e05fdd91e`. The public preparation manifest, private config, and private seal match their captured hashes; all 17 seal entries still hash correctly. The retained private controller, observer, and readback helper match captured package hashes. Both ownership utility files also match the historical config's safety hashes.
- The private retained ACK and final ACK are byte-identical, 23,269 bytes, SHA-256 `60690a6c0b84dcb254dbf739a52d0a918081c814cc742dae47fc8b7be9d499b8`, matching request 1 and public diagnosis. Private journal and runtime-log hashes match the session. The public error digest matches the private journal error without exposing its contents.
- The session failure digest matches the runner's controller-refusal error; the different REA terminal digest matches its outer failed-capture wrapper error. These represent separate error layers, not an inconsistent binding. The retained runner still matches its historical package hash.
- Both source revisions, across installed/pristine/working paths, hash to pinned int `bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61` and float `c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c`. Source-prefix copies match too. All four installed/private/source-prefix helpers match pinned hashes. Original and source-prefix Max executables match the session's executable hash.
- Before/after preference manifests are byte-identical, SHA-256 `5444dc994f5d2dcd50cc9fedd6ed2984e34308f750888b4760e2345f79ee33cd`, covering 33 original-prefix and 1,081 source-prefix entries. These are capture-time preservation snapshots, not a new full preference scan.

## Cleanup And Evidence Limits

Launch diagnostics bind Xvfb PID 333406/start 1064798 and Wine-launcher PID 333407/start 1064803 to capture marker, prefix, display, and PID start. Pinned ownership utilities recheck these fields after opening a pidfd before signaling. Cleanup records empty owned/prefix/marker scans, private prefix removal, Xvfb exit, no ordinary quit, and no display-only attribution. The disposable prefix is currently absent. REA samples both launched processes, with empty commands in their last samples, reports its owned process group verified, and records temporary-root removal.

This supports the intended exact-owned cleanup policy and successful cleanup of identified processes; it is not a complete signal or process census. The runner records 315 unreadable process environments per scan. REA separately records eight unverified PIDs left untouched. Process trees are sampled, filesystem observations are snapshots rather than syscall traces, executable sampling is not atomic OS image binding, inherited host environment is unrecorded, and network activity is unobserved.

Historical `numeric.py` and `test_numeric.py` originals were recovered from the worker's before-edit baseline `/tmp/alive-int-float-shell-fix-baseline-28q1ta8s` and independently matched capture001's recorded package hashes. Verified copies are retained under private directory `/home/venetanji/.cache/alive-ultra-evidence/int-float-package-001-historical` (mode 0700): `numeric.py` (21,881 bytes, mode 0600, SHA-256 `9f7ed6fa7acb7c4f6965b124bf9898aa99a8f544d76d560470ce0e33b75229f7`) and `test_numeric.py` (12,822 bytes, mode 0600, SHA-256 `96643c6df84f757c5073a92362138c43261e16ce7f3803bf819c2784ad362612`). This closes the historical-byte retention gap. The current public controller/numeric/test files have changed since prep001; the original controller remains available in the sealed private preparation. Historical prep001 was not modified, and no current verifier was used to reinterpret it. This retention follow-up writes only the two recovered originals and updates this paragraph.

Frozen numeric comparator/test hashes and the original anchor diagnosis still match their prior recorded digests. This audit changes only this report and the derived shell diagnosis; it adds no score or runtime claim.

## Principal Artifact Digests

| Artifact | SHA-256 |
| --- | --- |
| `rea-int-float-001.json` | `f8d191e2b7b16adb50e0d821c11d0069d9e0cbc88baf11e3a083d262469c15f8` |
| `session.json` | `314f3f9cd328639f442f7d906d87af72426f531916be66c0470ae0c2336e82b5` |
| `cleanup.json` | `79ca0f4635cfb33aad31f010d41d07b8a9f3bf52a4a1f60686fc671847823098` |
| Historical private config | `6ffa9d3482e43825c8fd9a5906e7d135aaacd19bd19e0859d47df2a3a9405514` |
| Historical private seal | `418a13939f6297fdca988024f7c999a686a37ae677a27fcffd0a786b22d5ed48` |
| `shell-geometry-diagnosis.json` | `0b7c6474d90fc2f53e2d9ab20cb4de638df9578283886c25b0dacf01dcb0111b` |
