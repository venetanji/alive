# Scoped native re-review: 1418872

## Findings and disposition

**Approve this scoped native refinement. No new functional defect or remaining load-bearing finding was identified. Both P2 findings from the initial review are addressed by retained source regressions.**

One nonblocking documentation improvement remains: `apps/ultra/src-tauri/native/alive_launch_v1_policy.md:20` and the v3 comment at `alive_session_clips.hpp:268` describe the initial reset allowance generically. The v3 justification should ideally state explicitly that bar zero guarantees the original K(w) is at least one, including tracks with no clips. V3 does not have V4's explicit `(K + 1) * transition` term. The code is sound as written; this is a request to preserve its less-obvious reasoning, not a missing runtime correction.

## Scope and proof review

Compared stable commit `1418872ac6205a37889b11728c6b3d36de986c42` with `2329e07`. The diff contains six files: two production headers, the native policy note, and three native test files. No Rust/UI or other integration code was reviewed.

The only production changes replace the additive `+2` with `+min(2u, w - 1)` in the v3 and v4 envelope builders. Both changes remain inside `if (quantized)` branches. The loop begins at width one, so the unsigned subtraction is defined. Old/default proof construction, the window boundary cap, all resource ceilings, callback reducers, ledger accounting, optional guard credit, activation history and request ABI remain unchanged.

The refined and previous additive allowances differ only at widths 1 and 2. At widths 3 through 1024 the original conservative proof is unchanged. The additional curve is monotonic, preserving the composition precondition.

For v4, composition retains the explicit initial transition charge. The width-1 curve covers one final state and one transition; at width 2, the added cut permits two positive-length segments and the transition factor covers at least two transitions. Source-profile ordinary events plus the transition vector cover held-note chase, root resets, scans, writes and placement work.

For v3, every valid configuration contains bar zero, so the original positive-width boundary envelope is at least one. At width 1, its reset charge covers one final track transition. At width 2, adding one makes the reset allowance at least two, while segment composition already reaches the maximum of two positive one-frame segments. This argument also covers silent/zero-clip tracks whose source profile is empty. V3 has no held-note reconstruction dispatch. The existing per-track reset bit and mutually exclusive due-action/source-wrap paths coalesce coincident transitions. No callback code affecting that property changed.

## Closure of prior findings

1. **History-aware activation and retention:** `apps/ultra/tests/alive_session_launch_test.cpp:233` now retains the independent v3 history probe. It distinguishes a history refusal from an occupied guard credit, checks that playback survives refusal, accepts after history clears, and verifies that a later old-v3 Seek still uses the augmented future after activation. Fresh execution passed all assertions.
2. **Independent two-transition envelope coverage:** `apps/ultra/tests/alive_session_workspace_envelope_test.cpp:705` retains the scalar two-action authority oracle, now using the refined allowance and composition limit eight. It checks every prefix from width one through eight across placement gaps, loop seams, offsets, initial authority/source phases and two distinct action frames per track. `apps/ultra/tests/alive_session_envelope_test.cpp:53` additionally covers v3-style event/reset accounting, including coincident action frames and source/song wraps. The native launch fixture now directly calls `build_validated(..., true)` for admitted fixtures at line 116, and compares default acceptance with augmented refusal in the dense fixture at line 176. These close the original missing durable-proof findings.

The existing native mixed-batch fixture remains a gate for replacement/scene receipts and actual dispatch. The v4 scalar's distinct-cut enumeration is complemented by v3 coincident-cut enumeration and the unchanged native coalescing implementation. V4 placement-history-specific activation, zero-clip builder fixtures, and a dedicated same-frame due-old/new-action trace would still broaden the matrix, but their absence does not constitute a newly discovered blocker for these two formula-only changes.

## Independent fresh verification

Exported the stable source to `/tmp/alive-launch-native-review-20261031/commit-1418872`. Rebuilt the shipping traced backend from that export; did not reuse the implementer's `.so`. Reused only the previously authorized core archive `/home/venetanji/Work/alive/apps/ultra/build/core/libultra_core_bundle.a`. All builds used C++17, `-O2 -Wall -Wextra -Werror`; the runtime fixture additionally used the allocation/free/mutex wrappers and `ULTRA_ALIVE_SESSION_TEST_TRACE`. No provisional admission definition, disabled assertions or relaxed admission checks were used.

Fresh results:

```text
envelope-1418872:
PASS: cyclic weighted/duplicate/empty envelopes and independently enumerated splices

workspace-envelope-1418872:
PASS: sources=8576 boundaries=7620 splices=144 authority=282112 native=12792 accepted=13 refused=1 assertions=109758400

launch-1418872:
old-only dense admission spacing=37
history fixture launch admitted=1
history activation status=4 error=12 playing=1 active=0 fault=0
settled activation status=3 error=0 active=0 fault=0
retained augmented future old Seek status=4 error=12 position=5202 fault=0
quantized request: fine target, rolling guard refusal, retained pending playback passed
```

Runnable verification artifacts are `/tmp/alive-launch-native-review-20261031/envelope-1418872`, `/tmp/alive-launch-native-review-20261031/workspace-envelope-1418872`, and `/tmp/alive-launch-native-review-20261031/launch-1418872`. The backend object is `backend-1418872.o` in the same directory. All source/build/report writes were confined to the review directory.

## Limits and final ruling

This approval is restricted to the native refinement and closure of the two earlier coverage findings. It does not approve the later Rust/UI integration or establish hardware timing qualification. The real midi-arrangement fixture's reported remaining 72-events/window refusal against the unchanged 64-event ceiling is acceptable; this review did not rerun that product fixture and does not claim it now admits. No further resource-cap or proof expansion is warranted by this review.

The narrowed width-1/2 accounting is justified, the original proof path is untouched, and the retained checks pass independently. Proceed to the separate stable-branch integration review.
