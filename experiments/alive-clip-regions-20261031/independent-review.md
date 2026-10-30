# Independent Integration Reviews

Date: 2026-10-31. Base: `8dd4588`. Reviews operated read-only in the isolated
phase2-ui worktree. The integration controller owns build and desktop evidence.

## Native Review

Reviewer: `region_native_review`. Confirmed and resolved:

- A queued Preview retained an old numeric track index after insertion. The
  original regression reproduced SIGSEGV. Queued Preview is now remapped and
  instrument/track access is validated.
- Removing an active Session slot could retain its shared source with no valid
  slot boundary. Removal now produces explicit Session silence and releases notes.
- Structural publications unnecessarily required fine-launch and Preview proofs.
  Normal playback, fine launch and Preview now have independent admission flags.
- Unconditional horizon reservation rejected an empty clip immediately after
  Start. Admission now considers actual active-source/phase work, affected root
  writes and conservative constant-time bounds, retaining the guarded fallback.
- Commands arriving after the callback snapshots its queue could miss track
  remapping. Serial fences now protect track-index-changing Preview/mixer ingress
  and all structural transport/launch ingress through coherent retirement.

The final fence preserves Preview/mixer during identity-map clip edits and track
appends. The reviewer independently verified the final native hash, reran
`publication-test --late-preview` and the full publication suite, and reported no
remaining findings. The final native hash is in `artifact-sha256.txt`.

## Model, PCM And Host Review

Reviewer: `region_model_host_review`. One confirmed relative-path mismatch in
audio import was fixed by canonicalizing the selected WAV before inspection.
Scoped re-review closed the finding.

Reviewer: `regions_integrated_review`. No additional confirmed Rust lifetime or
commit defect. Current and candidate PCM owners survive through matching
preparation/serial and terminal retirement. Metadata edits retain native PCM
owners after Save As. History and publication use stable identities; current
live device, mixer and Master values merge at commit.

## UI Review

Reviewer: `regions_integrated_review`. Confirmed and resolved:

- A delayed insertion shifted the user's newer selected track by array index.
  Same-generation snapshots now preserve selection by track ID.
- Queued track insertion/audio import could cross Open with reused IDs.
  Both capture generation/preparation before entering the command queue.
- Browser loading into an empty MIDI track selected the last track afterward.
  Post-load selection now uses the actual load target.
- A queued browser load resolved the later selected track instead of its origin.
  It now resolves the captured track ID and preserves newer selection intent.
- Logical track capacity incorrectly blocked loading an existing rootless MIDI
  track. Track capacity applies only when loading needs a new track; device
  capacity still applies to every load.

The controller witnessed three queue/selection regressions fail before fixes;
the UI worker witnessed the last two regressions fail before fixes. The fourth
rootless-load test records the independent review reproduction and passes with
the corrected target selection. Final scoped review reports no remaining
findings and independently passes all 188 UI tests.

Native review covers the final compiled fence. Model/UI review does not claim
to execute the controller's desktop capture. Runtime output descriptions added
after scoped UI review are exercised by the real desktop harness.


## Final Arrangement Proof Re-review

The real desktop journey exposed prefix/cycle transition overcount in
`song_points`. The native reviewer independently checked the separation guard,
including its exact width threshold, empty components and extreme frame values;
no undercount trigger was found. Independent rebuilt scalar oracle passes
110,195,654 assertions. Updated `publication-test --arrangement-gap` and the full
publication suite pass, and final production SHA69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90
was independently verified. No remaining finding.
