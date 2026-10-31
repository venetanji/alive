# Task 2B Fix Round 1

Read this first. Source base `d7f8490a783762a7c864f07957e12fce045b4b5d`.
Address both Important findings in `task-2b-review.md` beside this file. This is
the original implementer's scoped repair; preserve Task2B boundaries, complete
ABI, shared owner, zero feature bits, dedicated-test-only provisional gate,
original regressions and exact callback work limits. No subagents, unrelated
warning repair, UI/Document/PCM work, release or setting changes.

Parent owns PLAN/docs/PR/evidence. You are sole production source/test/index
writer until explicit freeze. Read-only2C architectural planning may run.

## I1: Failed START lookup reservation commits rewind

At natural end, candidate position/phase are rewound before
reserve_optional_placement(4). Its failure marks WORK_LIMIT and sets
unscheduled=false, allowing the already modified candidate to be committed.
Make refusal fully transactional, preserving prior commands in the same
candidate reduction and existing failed-work charging semantics.

Retain a real focused RED/GREEN regression using the review's admitted short
375-frame source/song at120BPM. Initial START spends2054 placement credits.
After natural end, successive one-frame callbacks with STARTs exhaust the
remaining placement allowance before the1024-frame window expires. Assert
every rejected receipt leaves applied position, phase, occurrence/source,
authority and playing state unchanged, including the early reservation-failure
branch. Absolute frame/rejection observations may advance. Do not merely test
the later optional guard rejection already covered by existing tests.

## I2: Chased note-ons must precede ordinary note-ons

Synthetic append order is lost in the combined pitch comparator. Introduce
bounded explicit dispatch-origin/rank or an equivalent clear ordering:
termination, automation, chased note-ons, ordinary note-ons, each deterministic
in track/device/pitch order. Preserve v3's original behavior and charged
32-record bound, including sorting/admission before any dispatch.

Retain RED/GREEN exact event-order tests where a chased held pitch is higher
than a due ordinary pitch (for example64 chased,60 ordinary). Check offset
entry and adjacent same-source entry. Do not satisfy the test by relabeling
ordinary events or changing musical data to the old coincident ordering.

## Verification and handoff

Retain separate counterexample failures so one failed assertion does not hide
the other's RED proof. Run focused guarded v4 rendering/partitions, shipping
gate and original v3 regression (shared comparator/reducer changed). Run the
full native CI after the shared fix if needed to qualify the final source;
do not repeat unrelated Rust/UI suites when no changed contract justifies it.
Record exact command exits, source/fixture/binary hashes and changed-source
scope under `/tmp/alive-workspaces-task2b-fix1`.

Commit targeted changes, explicitly freeze source/index, and write
`.superpowers/sdd/alive-workspaces-20261026/task-2b-fix-1-report.md`. Link the
original findings, explain restored atomicity/order and list remaining gates.
Return status/commits/test result/report path. Original reviewer performs a
scoped re-review; do not dispatch your own reviewer.
