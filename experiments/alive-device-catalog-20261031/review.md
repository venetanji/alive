# Catalog Delivery Review

Final code/evidence range: `d7f4694..41b4dcc`. Tested immutable production source: `a8b5f67`. Both final findings are addressed; source/artifact identity and actual native acceptance passed. The full hosting goal remains active.

The complete delivery review identified the two issues below; its scoped re-review records their resolution. Earlier task reviews approved native providers and browser integration. The native containment issue found during installed acceptance was corrected before this final review.

## Complete Delivery Review

# Whole Catalog Delivery Review

Reviewed range: `d7f469408b4f1708cd953ba98c5cbd18dc336e57` to
`7d2259ee4985ded2d1fab04733889becf0f7457d`.
Installed acceptance source: `dd423bd0fa418656304427cb7c89646813cfd065`.
All source line references below belong to the reviewed range, not concurrent
saved-presentation changes.

### Strengths

- The metadata boundary is explicit. `browser.rs:149` separates the completed
  index lock from serialized rebuild ownership; `desktop.rs:461` performs
  discovery in a blocking worker without acquiring session/audio ownership.
  Failed rebuilds retain the predecessor and its cursors. Behavioral tests cover
  an actual blocked rebuild while another reader retrieves the old index.
- `browser/providers.rs:56` reuses canvas preparation and manifest validation
  without graph installation. The current native-source exclusions match saved
  device preparation. File/read/visit/depth/descriptor bounds are explicit,
  canonical aliases are deduplicated, and installed DLL/Max artifacts never
  receive a saved-device path or ready qualification.
- `alive-browser.mjs:49` checks page response ownership after every await and
  in failure handling. Refresh retains old rows until replacement completion,
  including a selected ID arriving on a later page; disposal invalidates pending
  requests. Tests exercise stale successes, failures, continuation failures and
  retry, rather than just checking request shapes.
- The same admission predicate protects browser activation, drag initiation,
  drop-time validation and the queued loader. Captured generation, edit revision,
  track identity, stopped graph editing and selection-token checks remain in the
  real loading path. The native audio-effect action remains `add`, while browser
  classes consistently use `audioEffect`.
- The unfiltered-list correction is now supported by stronger evidence:
  `alive-browser.css:12` supplies the missing grid-item minimum; the 96-row,
  two-page regression checks scrolling and footer hit stacks at both sizes.
  Native acceptance records real Home/End and wheel inputs, footer ownership,
  exact settled footer pixel equality, and top/scrolled captures. Inspected
  fresh compact/normal captures clip rows above the footer.
- Delivery claims remain bounded. The packet identifies the frozen shipping
  runtime and immutable installed source, reports software PCM and zero native
  errors/rejections, and leaves all 22 installed candidates unavailable. Saved
  presentation and later native-hosting documents remain future requirements.

### Issues

#### Critical (Must Fix)

- None found.

#### Important (Should Fix)

1. **A non-UTF-8 saved filename poisons its entire catalog page.**

   File: `apps/ultra/src-tauri/src/session/browser/providers.rs:291`;
   serialized field: `apps/ultra/src-tauri/src/session/browser.rs:59`.

   On Unix, a filename such as byte sequence `device-\xff.ultra` has an ASCII
   extension and can contain a valid saved Ultra document. Discovery accepts it,
   canonicalizes it, hashes its raw path bytes for identity, and stores the
   canonical `PathBuf` in the descriptor. `read_saved` can then mark it ready.
   The same problem occurs when a containing directory has non-UTF-8 bytes, and
   also affects invalid saved documents because their non-null path is retained.

   `Entry.path` is serialized through Serde's `PathBuf` implementation. The
   pinned Serde 1.0.228 implementation calls `Path::to_str()` and returns
   `path contains invalid UTF-8 characters` on failure. Consequently the entire
   `alive_browser_catalog` response fails serialization; unrelated valid entries
   on that page disappear behind a library error, and Refresh repeats the error.
   This violates partial-failure isolation. Such paths cannot load successfully
   anyway: existing `desktop.rs:540` requires a UTF-8 device path.

   Fix at the descriptor boundary: represent unsupported path encodings as an
   unavailable entry with `path:null` and an explicit reason, or omit them with
   a notice while retaining unrelated entries. Apply the policy consistently to
   bundled and user saved paths. Do not use lossy text as an executable path.

   Required regression: create an actual Unix non-UTF-8 filename containing a
   valid device beside a normal valid device, discover and serialize the complete
   `Page` with `serde_json::to_value`, and assert serialization succeeds, the
   normal neighbor remains ready, and the unsupported path cannot activate.
   Include a non-UTF-8 ancestor/root or bundled resolved path so the check is not
   limited to one provider's filename construction.

2. **A failed instrument activation can retain an automatically created track.**

   File: `apps/ultra/ui/alive.mjs:445`.
   Native boundaries: `apps/ultra/src-tauri/src/session/desktop.rs:623` and
   `apps/ultra/src-tauri/src/session/desktop.rs:676`.

   When the selected track is audio or already has an instrument, browser
   activation first awaits `publicationCommand('alive_workspace_track', addMidi)`.
   That command publishes the new empty track, and `publicationCommand` adopts
   its snapshot. Only afterward does `alive_device` read/prepare the saved file.
   If a user-library file is deleted, becomes invalid, or changes to an
   unsupported graph after indexing, the cached descriptor still passes the
   new metadata guard but native loading rejects it. There is no encompassing
   transaction or rollback, so the accepted score retains an extra empty MIDI
   track and changed edit/history state even though the requested load failed.

   This sequence is also present in base `d7f4694`; it is a pre-existing
   integration gap, not an introduced code regression. It nevertheless violates
   this delivery's explicit failed-load state-retention contract and is directly
   reachable through the newly indexed mutable user library. The existing
   rendered refusal case at `alive-chain.spec.mjs:205` deliberately clears the
   selected instrument first, so it only tests loading into an existing empty
   MIDI track and misses the auto-track branch.

   A focused evaluation of the exact fixed-range `loadBrowserEntry` function,
   with successful acknowledged track publication followed by missing-file
   refusal, produced calls `[alive_workspace_track, alive_device]`, retained
   both `track-existing` and `track-created`, and advanced edit revision from
   0 to 1. Native source inspection confirms the first command is an independent
   publication and the second command can fail during `capture_device` before
   installing its candidate. This was a focused function probe, not a native
   journey or broad suite rerun.

   Fix by preparing/admitting the complete new-track-plus-instrument candidate
   before publishing either change, ideally as one native transaction retaining
   captured generation/revision/track authorization. A separate preflight alone
   leaves a race before the later file read; a generic Undo can undo unrelated
   accepted work. On failure preserve the accepted score, selected track/card,
   edit revision and history; on success preserve the current newer-selection
   protection and stopped-transport/capacity constraints.

   Required regression: index a ready user instrument, remove or invalidate its
   file before activation, and activate it while an audio or occupied MIDI track
   is selected. Assert the refusal leaves track IDs/count, accepted score,
   revision/history and selection unchanged. Cover a native preparation failure
   as well as missing-file failure and retain a successful auto-track load case.

#### Minor (Nice to Have)

- No new Minor findings. Previously accepted compiler, DRI3 and test-harness
  warning noise remains baseline debt, as recorded in the task reviews and
  ledger. This review does not reopen it.

### Recommendations

- Resolve the two Important findings with focused serialization and transactional
  load regressions before controller launcher/PR integration. Keep concurrent
  saved-presentation schema work outside that correction and its review range.
- Because the corrections change production behavior, install and manifest a
  fresh immutable build for the affected acceptance. Retain the existing
  `dd423bd` packet as evidence for that exact source rather than relabeling it.
- Continue preserving the catalog/native-hosting distinction in publication.
  This review grants no additional profile admission, native capacity, physical
  audio result or realtime qualification.

### Assessment

**Ready to integrate? With fixes.**

The bounded catalog, page ownership, unavailable-candidate admission and repaired
list containment are well supported by source and retained evidence. One newly
introduced page-serialization failure and one confirmed pre-existing rollback
gap in the now-expanded loading workflow prevent unconditional approval against
the stated delivery contract.

### Review Scope And Evidence

- Read the supplied fixed-range review package, catalog plan, hosting contract,
  ledger, Task 1-3 reports, original reviews and scoped re-reviews. Presentation
  spec/plan additions were assessed as planning, not delivered functionality.
- Named unchanged-boundary reads addressed whether canvas preparation constructs
  DSP, whether saved-device preparation and catalog qualification agree, and
  whether auto-track loading is transactional. Those production reads used
  `git show 7d2259e:path`; the baseline loader was compared at `d7f4694`.
- Read actual catalog/drop/verification reports and the new native helper's
  assertions. Visually inspected the compact scrolled list, normal top list and
  refreshed native device-chain capture. Their footer containment agrees with
  the measured 98px/298px list heights and retained scrolling observations.
- Independently compared all 308 source hashes against Git objects at the
  manifested `dd423bd` commit and all 17 evidence hashes against the packet:
  zero mismatches. The existing scoped reviewer already independently verified
  seven resources, three installed artifacts, before/after score equality and
  raw PCM; those expensive artifact/audio checks were not duplicated here.
- Retained verification includes 15 provider passes, 159 Node passes, 110
  rendered passes, and six focused rendered passes after the containment fix.
  These do not cover the two cases identified above. No production build,
  broad test suite or native journey was rerun. The sole new execution probe
  evaluated the fixed loader function to resolve the specific rollback doubt.
- Source, index, HEAD, branches, runtime libraries, launchers and user windows
  were not changed. This review report is the only written worktree artifact.


## Scoped Final Re-Review

### Finding Verdicts

- **Non-UTF-8 saved paths poison a whole catalog page** - ADDRESSED.
  `apps/ultra/src-tauri/src/session/browser/providers.rs:39` checks the resolved
  path at the shared saved-descriptor boundary before reading/qualifying it.
  Unsupported encodings retain stable identity, become `path:null`, and keep
  unavailable/unsupported status with a UTF-8 reason. Both bundled and user
  saved paths pass through this boundary; lossy display text cannot become a
  load path. `apps/ultra/src-tauri/src/session/browser/tests.rs:61` creates real
  non-UTF-8 filenames and ancestors, including a bundled symlink into the latter,
  serializes the complete page, verifies a normal ready neighbor and checks
  stable unavailable identities after refresh. The retained red log shows the
  exact previous Serde error; green passes.

- **Automatic instrument loading publishes a new MIDI track before file/native
  validation, leaving it behind on refusal** - ADDRESSED.
  `apps/ultra/src-tauri/src/session/desktop.rs:674` implements `loadNewTrack`
  under the existing serialized Control owner. Track insertion modifies only a
  local score candidate; authorization, stopped/pending guards and current
  capacity checks precede dependency access. File capture, source checks and
  complete preparation finish before one install accepts the track/instrument.
  Cancellation and validation failures leave the owner untouched. At
  `apps/ultra/src-tauri/src/session/desktop.rs:705`, the compound history entry
  is prepared locally; `desktop.rs:271` adopts that history only after successful
  installation. The browser at `apps/ultra/ui/alive.mjs:446` and picker at
  `apps/ultra/ui/alive.mjs:791` issue the single transaction instead of publishing
  a preliminary track, and preserve newer selection by stable track identity.

  `apps/ultra/src-tauri/src/session/desktop/device_transactions.rs:87` covers
  cached missing/invalid/unsupported files from Audio and occupied MIDI anchors,
  retaining score, generation, edit revision, dirty state, history targets,
  history cursor exposure and reserved identities. Additional native owner
  tests cover failure after native reset with rollback, success, one-step Undo,
  same-identity Redo, changed-source Redo refusal, Save As while undone,
  surviving live values, stale scope, cancellation and transport/pending guards.
  Structural history uses stopped full preparation/install and commits its
  cloned cursor only on success (`desktop.rs:207`). History identity reservation
  and device-path rebasing cover removed tracks (`history.rs:24`, `history.rs:49`).
  Node/rendered regressions verify the actual caller payload, failure state,
  compound history and newer selection. The extended real-input native helper
  at `apps/ultra/tests/check_alive_catalog_desktop.py:99` establishes the three
  cached-file refusals and compound Undo/Redo on the fresh installed build.

### New Breakage in the Fix Diff

- None found. The UTF-8 correction preserves discovery bounds and candidate
  gating. The transaction and history changes retain current native admission,
  stopped structural editing, source fingerprints and ordinary musical
  publication semantics. The selection clamp moves before editor projection to
  handle Undo removing the last selected track; the rendered success/Undo cases
  exercise that boundary.

### Covering Verification

- Reviewed the supplied `7d2259e..41b4dcc` commit list/stat/fix package and both
  `final-fix-report.md` and `final-installed-report.md`. Scope is the two prior
  findings and new breakage introduced by this correction. Fixed source is
  `a8b5f67f2e1cc3052dce76ff704b102ffbfac457`; `41b4dcc` contains the subsequent
  helper/evidence update. Paused presentation schema work is outside the range.
- Read retained red/green and final logs: UTF-8 regression fails with the
  reported serialization error before the guard and passes afterward; eight
  rendered automatic-activation cases fail before the fix and pass afterward.
  Final covering results are 122 Rust session tests, 162 Alive Node tests,
  120 rendered tests and five focused native transaction tests, all passing.
  No suite, build or desktop journey was rerun for this review.
- Independently compared all 309 manifested source SHA-256 values against both
  fixed Git objects and the retained archive build directory. All match.
  Independently checked seven installed resources, three installed artifacts,
  18 evidence files and ten retained authored session snapshots: zero hash
  mismatches. Installed and packet source-build manifests are byte-identical.
  Source comparison did not use the intentionally dirty presentation worktree.
- Independently compared retained session score contents: all three refusal
  snapshots equal the automatic-load baseline; Undo equals that baseline;
  loaded and redone scores are identical; final restoration equals the original
  fixture. This supports the real-native report without claiming the UI exposes
  internal revision/cursor state, which is covered by direct Rust tests.
- Checked the final helper changes preserve strict comparison and original
  drag/audio acceptance. Unique Save As names avoid overwrite confirmation;
  closing the transaction's expanded Audio details restores the chain target.
  The native packet records both helper-only failed attempts and the successful
  final run. The latter retains both-size full-list paint/hit/scroll assertions,
  all 22 candidate refusals, refresh, bundled insertion order and scheduled
  software audio. Its PCM report records 173568 stereo frames, peak
  0.09684687107801437, zero stream errors and zero rejected commands.
- Visually inspected fresh compact scrolled and normal top-list native captures;
  rows remain clipped above the selection/load/status footer. The source and
  evidence distinguish frozen shipping runtime qualification from unavailable
  installed native candidates and future presentation/hosting work.
- Source, index, HEAD, branches, paused presentation checkpoint, runtime
  libraries, installed binaries, launchers and user windows were not modified.
  This requested report is the sole written worktree artifact.

### Out-of-Scope Observations

- No new observations. Previously accepted compiler/display/harness warning
  noise remains baseline debt. Controller launcher and draft-PR publication
  remain pending; later saved-presentation/native-hosting deliveries remain
  active and gain no admission from this review.

### Verdict

**Spec compliance:** Compliant for both corrections and their installed
acceptance, with controller integration still pending.

**Task quality:** Approved.

**Fix round:** All findings addressed, no new Critical/Important breakage.

**Ready to integrate:** Yes, for the reviewed catalog delivery and the exact
manifested `a8b5f67` install.
