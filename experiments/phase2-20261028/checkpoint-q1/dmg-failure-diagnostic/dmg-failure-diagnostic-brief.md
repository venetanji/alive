# Q1 DMG Failure Diagnostic Packet

Root worktree `/home/venetanji/.codex/worktrees/edd5/alive`, HEAD `e8c0d53`.
This is a bounded Task 9 delivery diagnostic under the approved Phase 2 plan,
not a claimed fix for unknown DMG contention. Read the exact design evidence:
`experiments/phase2-20261028/master/cloud-0f1deae/attempt-2-terminal/dmg-diagnostic-packet.md`.

Ruling: implement failure-only diagnostics before the next package run --
attempt 2 failed three busy ejects and neither receipts nor the pinned bundler
identify the holder -- cost if wrong: one small reviewable CI diagnostic and
possibly inconclusive output, with original failure preserved. This routine
implementation is within the existing authorized Task 9 diagnostics/CI scope.
No speculative unmount retry, forced eject, dependency upgrade or package omission.

## Exclusive Files

- `.github/workflows/ultra-desktop.yml`
- new `apps/ultra/scripts/diagnose_dmg.py`
- new `apps/ultra/scripts/test_diagnose_dmg.py`
- scratch/report/evidence under this SDD directory, prefix `dmg-failure-diagnostic`.

Root owns all other files and git index/commits. Work in the root shared
worktree with these disjoint file leases; no ref/index/commit changes. No
subagents, cloud changes, push, dependencies, builds, browser/native/GUI/audio
or reference runs. Another worker owns a timing pilot; only small GI-free
diagnostic tests are allowed, with no real macOS commands on this host.

## Behavior

Give the existing unsigned/ad-hoc build step an ID. Immediately after it,
collect only when that specific step failed on macOS and the event is not
`push`. Add a distinct failure-only diagnostic upload, pinned to the existing
upload action, with short retention. Preserve original build failure and all
package formats/targets, signed-release behavior and tag publication exactly.
No success-path diagnostic processes; no new workflow dispatch/profile.

Helper identifies mounted disk images by bounded `hdiutil info -plist`.
Accept only image paths strictly inside this checkout's two known target
release bundle directories, for the fixed supplied Apple target. Do not print
unrelated mounts, raw global plist, process environment, full process argv or
file contents. For only matched mount points record image/mount identity and
bounded `lsof` process IDs, command names, descriptors and matching open paths.
No detaching, killing holders, force-unmount or repair. Tool children themselves
may be stopped to enforce bounds. Emit useful statuses for no remaining mount,
permission error, invalid plist, tool missing, timeout or truncated output;
these are inconclusive, never proof that there was no holder.

Use one total helper budget of at most 25 seconds, each command at most 5
seconds, no more than three matched mount probes, at most 1 MiB collected
tool bytes and at most 256 KiB final report. Bound command work/output and
owned-child cleanup; avoid blocking on inherited pipes. Restrict path matching
by path components, including spaces and symlink escapes, not string prefix.
The helper's failure cannot erase the preexisting CI build failure. Avoid a
generic diagnostic framework; use standard Python and a focused helper.

## Verification And Report

Use meaningful failing tests before implementation and retain red/green logs.
Cover scoped/plist selection, spaces, sibling-prefix/unrelated paths, malformed
or missing mounts, permission/tool errors, timeout/output cap, scoped lsof
filtering, total/probe bounds, and workflow failure gating. Mock platform
commands; genuine owned test children are allowed only for a minimal pipe/
timeout bound check if required, without native/audio/runtime workloads.
Existing release/notices tests must remain intact. Do not claim real macOS
behavior or root cause from Linux fixtures. Run only appropriate short tests.

Report `dmg-failure-diagnostic-report.md`: exact files/hashes/diff, tests and
exits, self-review, limits and commands for reviewer. No cloud retry is
authorized by this packet; root decides after independent spec/quality review.
Return concise status/report path and explicitly release the file lease.
