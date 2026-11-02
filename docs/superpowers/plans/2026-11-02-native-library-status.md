# Native Library Qualification Status

This is the current stage ledger for the autonomous native-library work. The
implementation plan contains earlier checkpoints as historical evidence. No
profile has passed all ten publication stages; the importer registry is empty.

## Checkpoints

- Approved UI: `ca161c488ee2dcb0c6ba1efa1c43c7b1e36da4af`, pushed on
  `audit/pr12-native-20261102`.
- Native source persistence: `98c11f7c0158d8ad524feec968a809a0458035df`.
- C++ retained-owner transaction: `448a800`.
- Refuse unprepared native state in musical publications: `01b0564`.
- Rust session installation through retained-owner transactions: `00fa6b9`.

Native work uses `feat/alive-native-library-20261102` in the isolated checkout
`/tmp/alive-pr12-native-20261102`. The original PR branch and both dirty research
worktrees are preserved. No merge or automatic CI has been requested.

## Device Stages

| Stage | Analog | Electric | Corpus |
| --- | --- | --- | --- |
| Construction | Passed in controlled exact-DLL probes and ordinary Ultra host | Passed in controlled exact-DLL probes | Passed in controlled exact-DLL probes |
| Complete original initialization | Partial: installed preset lacks five hidden vector fields | Partial: installed preset lacks separate dummy pitch-bend field | Unrun; no installed default found |
| Audio | Controlled note output; original state/host policy remains partial | 17 controlled musical cases pass under explicit fresh-instance policy | Real input causality established; wet/default behavior unqualified |
| Model/native mapping | Current static bridge covers 203 slots through 172 groups/175 explicit fields | Current static bridge covers all 33 slots | Unrun |
| Original editor | Partial; historical shared bindings remain separate from current static bridge | Partial; 33 static displays resolve, zero inputs enabled | Unrun |
| Saved native state | Ordinary Ultra commanded-state/history/destroy/reopen passes; Alive per-instance persistence passes | Controlled edited destroy/reconstruct matches one symmetric PCM case; ordinary host integration unrun | Unrun |
| Multiple instances | Ordinary Ultra and retained-owner tests pass; Alive native admission closed | Controlled independent instances pass; ordinary host integration unrun | Unrun |
| Musical lifecycle | Synthetic bounded release and owner/time continuity pass; session callers unqualified | Controlled notes/release/retrigger pass; session callers unqualified | Unrun |
| Timing/admission | Unqualified | Private actual-bank measurement in progress; no Alive admission | Unrun |
| Alive library/loading | Unrun; unavailable | Unrun; unavailable | Unrun; unavailable |

Mapping completeness does not establish original defaults, editor fidelity,
native readback, musical lifecycle, timing or Alive hosting. Five explicit
Analog hidden values and Electric's separate dummy field are not substituted
from descriptor minima, auxiliary values or unrelated saved fields.

Corpus requires an effect input contract. Its native stereo buffers carry
input and output in place; the final activity integer is an input and output.
Aliasing left/right produces a different result (exactly four times the
disjoint-buffer witness). Separate persistent per-instance buffers/context and
qualified initialization are prerequisites. The output-only instrument adapter
and shared loader admission remain unchanged.

## Software Evidence

Private evidence root:
`/home/venetanji/.cache/alive-ultra-evidence/native-library-20261102`.
Installed binaries, presets, XML/artwork, disassembly, captures and raw probe
output stay there. Only authored interoperability facts/adapters/tests enter Git.

- Full JavaScript run: 750 passed, zero failed/skipped (`frontend-full-r6.log`).
- Full configured browser suite: 381 passed (`frontend-browser-full-r2.log`).
  Separate profile/resource/widget tests exercise optional installed fixtures;
  they are not implicitly included in the configured suite's count.
- Native-enabled adjacent Rust session suite: 132 passed
  (`host-batch-native-on-session-r2.log`).
- Broader native-enabled Rust suite: 313 passed, five ignored, one excluded
  (`host-batch-full-rust.log`). The excluded CPAL instrumentation failure
  `audio::instrumentation::cpal_owned_error_destruction_is_separate_from_the_typed_action`
  was independently reproduced on the untouched UI checkpoint. It remains open.
- Explicit ordinary Ultra native source/history test: one passed
  (`host-batch-ordinary-native-history.log`), requiring the opt-in adapter and
  exact installed Analog DLL. This does not qualify original initialization.
- Retained-owner C++ tests cover native-on/off ordinary documents, real Analog
  banks, no-adapter refusal, stale revisions, borrowed-memory lifetime and late
  binding failure. Independent ASan/UBSan probes pass; linked core archives in
  those probes are uninstrumented.

The host regressions first failed because preparation was not staged before
reset and rollback revisions were not reserved. A second regression caught
overflow at the final revision. Green coverage also restores a root omitted by
the failed candidate and directly checks that fatal rollback leaves driver I/O
retired and the native session unconfigured/stopped.

## Next Gates

1. Finish reviewed profile facts and original editor geometry, keeping unresolved
   controls unavailable. Retain captures at 800x600, 1280x800 and 1440x900.
2. Add an explicit native note capability through saved manifests and a versioned
   companion ABI. Preserve existing manifest/ABI sizes and closed measured
   admission while validating identities and first-policy restrictions.
3. Account for native releases in every scheduled/optional/emergency work ledger;
   qualify Start/Stop/seek/loop/clip transitions against actual native owners.
4. Add stopped instance-authorized native state commands/history, connect the
   original panel through acknowledged transactions, and finish original state
   and editor qualification for the first profiles.
5. Build matching Alive/Ultra/native artifacts and atomically select both local
   launchers at a verified checkpoint. Current native work is not selected yet.
6. Complete software-native acceptance, including previously skipped clip,
   saved-clip, resource and CPAL loopback gates. Only all-passed profiles may be
   exported and published to the existing library.
7. Propose a separate physical hardware checklist before consequential settings
   changes or recording. Browser/cloud/software probes do not qualify hardware.
