# Task 10 bundled-reference preflight: proposal only

Read-only preparation at checkout `0f1deae`, accepted app source identified by
controller as `64fcacd`. No contract is frozen and no implementation, build,
runtime or acceptance is authorized before Q1. This report does not reopen
completed Tasks 1-8. Root decides after Q1; local endurance retains runtime
exclusivity. Paths below are relative to repository root.

## Existing contracts and actual release staging

- There is no device `FileReference` type: `DeviceInstance` in
  `apps/ultra/src-tauri/src/session/mod.rs:49` has strict fields `instanceId`,
  `sourceSha256`, `bypassed`, `path`, manifest `id`, `version`, `parameters`.
  V3 and v4 embed that same type (`clips.rs:24`, `workspaces.rs:68`). V4's
  separate `FileReference`-like audio `file` at `workspaces.rs:96` is out of
  scope. Unknown fields reject; `workspaces.rs:449` validates device path text.
- `persistence::read` canonicalizes and bounds the session, decodes, then calls
  `prepare` (`persistence.rs:6`). `decode` rejects duplicate keys, accepts v5
  strict envelope with v2/v3/v4 score, or legacy score (`:92`); v1 migration
  reads each source relative to the session (`:117`). `serialize_saved` emits
  legacy score or v5 envelope (`:53`). No legacy URI interpretation exists.
- `prepare::check_sources` groups by canonical resolved filesystem path and
  compares canonical patch fingerprints, including shared-file replacement
  recovery (`prepare.rs:114`). `prepare_device` joins path to session origin,
  reads patch, checks SHA-256 before applying stored bases, checks manifest
  version/ID, validates parameters and compiles graph (`:235`). V4 invokes the
  same two helpers (`prepare_workspaces.rs:22`). Fingerprint is sorted-key
  canonical JSON of the original patch (`prepare.rs:290`), not raw file bytes
  and not the post-base prepared patch. PreparedDevice keeps resolved path,
  patch, graph, manifest and instance ID (`prepare.rs:10`).
- `persistence::save_document` re-prepares, guards against overwriting any
  resolved device, and rebases *every* `path` against the save location before
  atomic write (`persistence.rs:18`). `save_to_path` validates first, then
  adopts exact saved score and origin (`desktop.rs:527`). An AppImage mount
  disappears/changes after process exit: rebasing a bundle's resolved path
  persists an ephemeral mount and cannot ensure restart or relocation.
- `capture_device` reads an actual path, creates independent instance ID and
  records original source fingerprint (`desktop.rs:623`). `alive_device`
  checks generation/draft, stopped state and capacity, takes a picker or path,
  changes candidate, checks sources, prepares and installs (`desktop.rs:755`).
  Preserve that owner/admission path and the picker; UI must not supply an
  arbitrary path under the guise of a catalog key.
- Editor is generation/instance bound (`desktop.rs:236`, `:454`); snapshot
  exposes the prepared patch (`:265`). `Host::base` admits native update then
  changes saved instance bases and in-memory prepared patch/graph (`host.rs:235`).
  Hosted UI uses `alive_base` and explains structural editing of the source
  followed by Replace (`alive-editor.mjs:15`, `:19`; `alive-editor.html:7`).
  It does not structurally save the bundle. Enabled automation retains effective
  ownership. A bundled read-only source must be labeled as such; offer explicit
  export/copy to a user-chosen writable `.ultra` then edit and Replace, only if
  separately designed. Never write into installation or silently copy DSP.
- `desktop::example_path` tries resource directory, Linux companion, then
  checkout (`desktop.rs:550`); `example` reads v1 template and `new_session`
  resets Master to unity/v5 (`:558`). Template references Subtractive through
  a relative filesystem path (`apps/alive/examples/two-instruments.alive:12`).
  The default New template therefore also needs explicit logical bundle
  references before saving, or it can retain the same temporary-mount bug.
- Base `apps/alive/src-tauri/tauri.conf.json:18` lists all three examples but
  sets bundle inactive. Release is not simply that config: `bundle_config`
  generates an active bundle containing the template and Subtractive only
  (`apps/ultra/scripts/release.py:72`), resolves source locations for Alive
  (`:89`), and passes generated config to build (`:356`). Utility and Stereo
  Lowpass require explicit future release staging and verification. Package
  checks probe the template outside repository/resource CWD (`:150`); Linux
  verifies DEB and extracted AppImage (`:209`, `:238`), macOS app (`:251`),
  Windows NSIS payload (`:263`). Those checks do not prove catalog save/restart
  portability or all proposed resources. Existing generated config is an
  artifact, not a source-of-truth or current runtime proof.

## Narrow options and recommendation

1. **External user-selected file copy.** Use existing path/hash unchanged;
   user explicitly exports a source to durable storage and picks it. No schema
   change, but catalog load cannot transparently survive install relocation
   without asking for and managing copies. Unsuitable as the sole real browser.
2. **Path marker inside existing v2-v5 `path`.** Minimal fields, but changes
   meaning of existing strict sessions and can collide with legitimate filenames
   or Windows drive/colon semantics; old binaries misinterpret it. Reject.
3. **Recommended: new v6 envelope with explicit bundle bindings.** Retain an
   unchanged strict v2/v3/v4 score and Master, plus a strict map keyed by device
   instance ID to `{bundleId, revision}`. For a bound instance, its score path
   is a fixed reserved placeholder only within v6; it is not a filesystem path.
   The map must contain each bound ID exactly once, name an existing device,
   use only the exact placeholder, and reject dangling, duplicate, ambiguous or
   unknown entries. For unbound devices the existing path semantics remain.
   V6 is emitted only once a bundled binding is introduced; v1-v5 parsing and
   ordinary v1-v5 writing remain unchanged. Older applications reject the new
   format cleanly. This is a new wire version and resolver plumbing, not a
   native ABI, Ultra manifest, DSP, or v3/v4 score schema change. Confirm exact
   migration and UX as part of the frozen contract.

Define a finite owner allowlist such as `(subtractive, 1)`, `(utility, 1)`,
`(stereo-lowpass, 1)`, each mapping to a fixed known resource location, expected
role and immutable revision. IDs are opaque logical keys, not names or paths;
revision is independent of Ultra manifest `version`. Source SHA-256 remains
per instance and is computed exactly as today from the original parsed patch.
Before admission, resolve the pair, parse the source, verify its canonical
fingerprint against the saved reference, manifest ID/version and expected role,
then apply per-instance bases and existing native validation. A catalog build
should additionally pin expected canonical fingerprints per revision: otherwise
an altered installed file could be captured as a new trusted catalog entry.
No replacement may silently refresh a fingerprint. Identical logical revisions
must retain matching canonical source across releases; ship old revisions when
supporting them. Missing ID/revision, missing/unreadable resource, mismatch,
invalid patch or unsupported role refuses with track, instance, ID/revision and
recovery guidance, with working session/playback retained. An upgrade never
silently maps revision 1 to revision 2; explicit stopped Replace selects the new
revision, performs current prospective validation, and creates fresh instance
identity/appropriate automation removal. If old revision is unavailable, give
an explicit repair route; do not claim a universally available matching backup.

Use typed internal `File(path)` versus `Bundle(id, revision)` lookup keyed by
instance; group shared-source checking by typed logical identity plus resolved
canonical path as appropriate, including aliases between file and bundle paths.
Do not let v6 override file identity or skip changed-shared-source safeguards.
Resolve once per prospective operation to the same immutable source bytes/patch
for check and preparation, so an intervening file change cannot swap the input;
the prepared patch after live bases is runtime/editor state, never the logical
source to fingerprint or persist. Keep the resolved physical path transient for
diagnostics and dependency overwrite checks; save bound references unchanged,
rebase only file references. Recheck sources on Open, Apply and Save, not only
catalog load. Preserve Save As atomicity and prevent saving over actual resolved
device files. Keep binding metadata across draft/history restoration, conversion,
device removal/replacement and save; validate consistency before any write.

The v1 template is special: read and validate it as today, then only in the
trusted New-template flow translate its known matching Subtractive references to
bundle bindings after checking exact resolved source, manifest and fingerprint.
Do not reinterpret arbitrary opened legacy sessions, even when a filename or
hash looks similar. Existing user file references keep their previous behavior.
New still resets Master as currently specified. Decide whether New immediately
uses v6 or promotes on first save, without losing the logical binding in memory.

Use a headless injectable resolver/context in Rust for `read`, `prepare`, source
checking, Save/Save As and tests, propagated through the owner and probe callers;
no ambient global state and no UI-controlled root. A desktop adapter supplies
the actual installed resource root; a separately explicit checkout mode supplies
the repository resource root for developer launch. Never fall back from a
missing installed revision to a checkout path in an installed application.
Keep root resolution injectable so tests prove relocation with two different
roots. This is an architectural boundary, not a recommendation for a specific
Tauri API; current code already calls `app.path().resource_dir()` for New.
Select and document the actual platform adapter using current Tauri docs before
implementation. Do not parse a string containing `:` as a URI: `C:\\...`, UNC,
and other valid filesystem paths remain plain legacy paths. Structured v6
bindings avoid drive-letter and scheme ambiguity.

## Future behavioral gates and leases

- Decode legacy v2-v5 fixtures byte-for-byte semantically unchanged, including
  Windows drive/UNC paths and strict unknown/duplicate fields; reject malformed
  v6 mappings and unknown versions without changing an open session. Verify v6
  preserves strict nested score, Master, IDs, bases, hashes and automation.
- Inject two unrelated resource roots containing identical revision files;
  load, save elsewhere, destroy first root, restart against second and reopen.
  Inspect saved data for no transient mount path. Repeat with normal file and
  mixed file/bundle references; Save As rebases only files and cannot overwrite
  any resolved source. Check trusted New-template conversion independently.
- Missing, corrupted, altered, wrong manifest/kind and unavailable old revision
  fail before install/save without modifying score, history, live bases, Master,
  prepared schedule or playback. Check stale siblings and aliased file/bundle
  identity, races during source resolution, and explicit replacement recovery.
- Two instances of one key keep distinct IDs and bases. Hosted editor displays
  prepared graph and changes only admitted live base; automation remains owner,
  close keeps playback, and read-only source is never structurally saved. On
  reopen canonical source fingerprint is unchanged and saved bases restore.
- Real later package proof must stage all declared catalog entries, run from
  installed resource locations, test AppImage mount across distinct processes,
  Save As/restart and relocation, plus checkout launch, picker fallback and
  platform-specific installed layouts. Existing package probe is insufficient.
  No runtime or package proof was performed in this preparation.

Future exclusive owner lease: `session/mod.rs`, `master.rs`, `persistence.rs`,
`prepare.rs`, `prepare_workspaces.rs`, `desktop.rs`, related document/history
and focused owner tests as explicitly enumerated; coordinate with Task 11/13.
UI/editor lease: `alive.mjs`, `alive-editor.html`, `alive-editor.mjs`, browser
module and focused tests, after DTO freeze. Release lease: `release.py`, named
packaging checks and resource staging configuration, coordinated with controller
and CI owner. Native/GUI/build resources require separate serial lease. Exact
scope and interface, compatibility policy and device-load undo remain root
decisions; no API or resource lease is granted by this report.
