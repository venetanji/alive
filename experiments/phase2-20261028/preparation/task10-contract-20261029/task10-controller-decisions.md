# Task 10 controller preparation

Prepared at `0f1deae` while Q1 remains open. These are proposed routine
implementation decisions within the approved Phase 2 plan, not a frozen
contract, file lease, source change or activation of Task 10. Reconcile the
accepted Q1 head and record the actual freeze in the single progress ledger
before dispatch. The child-contract and resource reports remain evidence for
these choices; neither report is an implementation result.

## Scope And Decisions

1. Preserve the existing stopped structural install policy for catalog device
   loads. Pending musical edits must be applied or discarded first. Device load
   has the existing immediate structural semantics and does not claim musical
   Undo; successful replacement retires stale editor generations. Browser
   assign, create, rename, duplicate, delete and independence are musical edits
   and each uses one owner transaction/history entry. Cost if wrong: users may
   expect device Undo, which needs a separately reviewed prepared-device history
   contract; visible stopped/pending guidance must make this distinction clear.
2. Prefer a durable content-addressed store of the three verified original
   bundled `.ultra` files, using existing device paths and canonical source
   fingerprints. Native graph evaluation continues to load these saved devices;
   Alive gains no copied DSP implementation or hardcoded graph. The store avoids
   persisting temporary AppImage mount paths without a v6 schema/resolver
   expansion. This is per-user device storage, not project Collect And Save.
   Cost if wrong: moving/deleting that storage or moving a project to another
   account breaks references and requires restoring matching source files.
   General portable projects remain Task 13.
3. In focused catalog results, Return invokes the same explicit Load action as
   the visible button or double click. A single click or arrow navigation only
   selects. In a focused occupied cell, Return invokes the existing explicit
   prepared launch; empty-cell Return does nothing. Rename/menu editors consume
   Return themselves, with no bubbling launch. Escape cancels rename/menu or
   returns grid focus to its track heading. This is a product decision: occupied
   Enter launch was not observed in the bounded Live study. Cost if wrong:
   keyboard expectations need a focused UI change, with no scheduling change.
4. Duplicate chooses the first empty lower cell on the same track, without
   wrapping or overwriting. With no such cell, refuse visibly and leave music,
   history and selection intact. This deliberately differs from observed Live
   Ctrl+D replacement of an occupied next row. Cost if wrong: a different
   destination rule needs a UI change; preserved original music is recoverable.

## Narrow Owner Seam

Proposed names become binding only at the post-Q1 freeze:

- `alive_catalog`: bounded owner metadata for `bundled:subtractive`,
  `bundled:utility`, `bundled:stereo-lowpass`, with display name and declared kind.
  Catalog fingerprints, installed paths and manifest validation remain owner
  authority. The browser never supplies a trusted path, hash or kind.
- `alive_catalog_load`: captured `generation`, `draftRevision`, `catalogId` and
  a typed target. `replaceInstrument` identifies `trackId` and `instanceId`;
  `addEffect` identifies `trackId` and an explicit optional `beforeInstanceId`.
  Instrument results replace that track's instrument; effect results add at
  the captured position. Existing file-picker controls remain available.
  No selected-track substitution at queue execution and no implicit new track.
- `sourceCreateMidiAndAssign`: one v4 workspace edit with `trackId`, empty
  `slot`, `name`, `lengthBeats`. Creates a source and slot with fresh owner IDs,
  matching initial names, beat offset zero and looping enabled, then validates
  the complete candidate and records once. Both IDs appear in `Affected`.
  Undo/Redo removes/restores both; failure retains neither. V3 retains its
  existing single clip-create edit.
- Existing typed v3/v4 operations supply rename, duplicate, delete, assign and
  independence. V4 duplicate shares source; independence clones source/notes;
  deleting a slot retains source; source deletion rejects any remaining slot or
  Arrangement reference. Selection and successful late receipts use the
  existing selection token to avoid focus theft.

Owner admission must preserve Master and its serial/observations, current live
device bases, bypass, mixer, prepared schedule and history on refusal. Check
generation/revision, target identity, stopped/draft guards, kind and current
native capacity before install. No capacity or four-row change follows.

## Managed Source Rules To Freeze

Use Tauri's Rust `Manager::path().app_data_dir()` under the unchanged
`org.alive.session` identity; never use cache or resource directories as durable
storage. A focused owner module accepts injected resource/store roots for
headless tests. Installed resource lookup is distinct from explicit developer
lookup; a missing installed asset never silently falls back into a checkout.

Each catalog entry pins expected original canonical patch fingerprint, manifest
ID/version and kind, independent of labels. Resolve and read bounded original
bytes once; validate them before materializing a deterministic fingerprint-named
`.ultra` file under `devices/v1`. Store the verified original document, before
applying per-instance bases. Each catalog source is limited to 1 MiB; the three
current files are much smaller. No arbitrary resource indexing or directory
enumeration enters load or audio callback work.

Never replace an existing store entry. Check existing occupants for regular
file, canonical fingerprint and manifest match, rejecting symlinks or mismatched
content. Publish a new entry atomically without clobbering a competing writer;
revalidate a winner rather than overwrite it. Windows/Linux/macOS publication
and path behavior need explicit source review and platform tests. Retain an
unreferenced valid entry after later admission failure; perform no automatic
garbage collection because saved sessions may refer to old revisions.

Trusted New-template creation must also prospectively rebind only its known
matching Subtractive references to this durable store, preserving independent
instance IDs, bases and Master reset. Arbitrary opened v1-v5 documents and
picker-loaded paths retain their current semantics; no hash/name-based implicit
migration or repair. Save As continues normal path rebasing and dependency
overwrite protection. Missing/corrupt managed source errors explain the path,
expected identity and restoration requirement without claiming the app can
repair an unopened broken session. Managed sources are not a structural editing
destination; hosted live parameters and explicit external-source Replace remain
the supported editor workflow.

## UI And Verification Consequences

Keep the existing compact browser width and resizer, fixed Master, four slot
rows and shared bottom detail. Catalog and project-source sections use original
small device/source icons, clear selected rows, a search field and visible
Load/Assign target text. V3 has no project-source list; explain that state.
Search is trimmed, case-insensitive label substring with deterministic
category/name/ID ordering, bounded to 128 UTF-16 code units; at most three
catalog plus 32 schema-bounded source rows. No-results and errors stay visible.

Grid arrows move within existing bounds without wrapping or dispatching music.
Ctrl+R opens inline rename; Return commits once and Escape cancels. Context
actions expose the same named operations through pointer and keyboard. Follow
existing selection, draft/prepared and runtime cues. Do not imply preview,
external indexing, drag/drop, additional voices or sample devices.

Implementation packets after Q1: owner atomic slot edit and validated catalog
store/load; disjoint release resource/probe coverage; then browser/grid UI on
the frozen owner seam, followed by serial integration/native restart. Each
packet has focused meaningful red/green, independent spec and quality review,
exact candidate hashes and explicit source/runtime leases. Native acceptance
includes two independent instances, all three catalog entries, refused loads,
Save As/Quit/restart across a changed resource root with stable store, picker
fallback and maximum admitted v3/two-track v4 geometry. Full project portability
and physical audio remain separately attributed.

## Current Documentation Evidence

Context7 resolved `/tauri-apps/tauri-docs` and fetched the following Tauri 2
topics during preparation: app-data path is data directory plus application
identifier; resource-map keys are source paths and values are bundle targets;
configuration uses JSON Merge Patch, merging objects keywise and replacing
arrays. These establish API/config semantics, not actual package contents.

- https://v2.tauri.app/develop/resources/
- https://v2.tauri.app/develop/configuration-files/
- https://docs.rs/tauri/latest/tauri/path/struct.PathResolver.html

Inspect exact package payloads and effective resource maps before claiming
that the release generator includes or omits an entry. Preserve existing
licensing notices and probes. No tests or runtime workloads were run for this
preparation.
