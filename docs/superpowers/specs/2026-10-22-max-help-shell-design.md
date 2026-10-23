# Four-Root Max Help Shell

The user requested Max-like help windows and continued fidelity work with full
permission and agents. This spec makes the next bounded portion concrete:
retain and host the complete saved append/prepend/int/float shells without
executing Max JavaScript. It incorporates the design and six review corrections
in `.impeccable/review/max-fidelity-20261021/help-shell-design-{notes,review}.md`.
It does not certify any complete help root. Qualification stays 0/2,103 until
every retained example and relevant action passes a separate complete-root run.

## Evidence And Product Behavior

Use the already-retained hierarchy/tab/help-shell source facts and captures.
The observed append shell initially hosts Basic. Its `?` action opens a
Reference/Related Objects popover while Basic stays visible and selected. The
details helper owns the title drawn inside Basic. The root name helper must
not become a persistent overlay. The other three roots share this saved shell;
their shell behavior is inferred, not separately runtime-qualified.

Keep the compact editor typography, colors and controls. Implement original
rendering at saved helper rectangles; do not introduce a new visual world.
The shell shows a Basic tab and an adjacent `?` menu button. Reference actions
open an in-app read-only reference pane over the same hosted canvas. That
destination is explicit Ultra behavior: Max link activation was not observed.
Use plain text from the licensed local installation; never embed proprietary
XML, script bodies or reference prose in distributed files or saved patches.

## Strict Saved Schema

Only a v2 root may optionally contain `helpShell`:

```text
{adapter:"max-help-four-v1",object:"append"|"prepend"|"int"|"float",
 basicNode:positive-u32,questionNode:positive-u32}
```

Absence is valid; explicit null, extra fields and wrong types reject. Nested
scopes remain exactly `{nodes,edges}`. Retain this metadata through validation,
Save, history, CAS and broadcasts. No source digest, script path, selected tab,
reference prose, window identity or qualification flag belongs in saved state.

Add authoring-only `help_helper` envelopes with exactly `params:{role}` where
role is `starter|name|details|arguments`. Normal ID/position/style validation
applies. Helpers accept general appearance fields only, have no ports and may
not contain a patcher. They are omitted explicitly by JS/Rust executable
lowerers, like comments. They count toward 512 authoring nodes and 1MiB, never
toward 32 executable nodes. They receive no native kind and are excluded from
the generic palette, completion vocabulary and original help-entry counts.

Validate complete-tree relationships after assembling all scopes:

1. Root contains exactly four nodes and no cables: one starter, one name,
   Basic patcher and question patcher.
2. Distinct metadata IDs identify direct patchers named `basic` and `?`.
3. Basic contains exactly one details and one arguments helper, plus ordinary
   supported content. Question is empty. No helpers appear elsewhere.
4. All normal hierarchy bounds, unique IDs and cable rules still apply.
   Cables mentioning helpers reject before lowering.

The safe schema may be authored directly; it does not establish Max provenance.
Edits to Basic examples remain ordinary edits. Removing required shell members
rejects precisely and retains the previous document. Detachment is future work.
One original synthetic JSON case corpus is consumed by JS and Rust for strict
parity, including nulls, extra fields, helper cables, wrong roles/scopes/IDs,
duplicate roles, question content and forged nested metadata.

## Native Local Provider

Create focused off-audio `help_reference.rs`. Add direct pinned dependencies
`sha2=0.10.9` and `quick-xml=0.38.4`, already present transitively in the lockfile.
Resolve a resources root from `ULTRA_MAX_RESOURCES`, then the existing local
Ableton Wine installation under the current user's home. An explicit configured
root takes precedence and never silently falls back. Canonicalize fixed paths
and require containment beneath the canonical resources root. Frontend supplies
no file path. Never run a Max/Wine process or edit the original installation.

Two read-only commands:

```text
help_shell_probe({source:String})
 -> {status:"recognized",adapter,object,sourceSha256}
  | {status:"unrecognized"}
  | {status:"unavailable",reason}

help_reference({name:String})
 -> {status:"available",object,sourceSha256,digest,description,
     arguments:[{name,type,optional,description}],
     methods:[{name,description}],inlets:[{name,description}],
     outlets:[{name,description}],related:[{name,available}]}
  | {status:"unavailable",reason}
```

Probe works before import for an ordinary caller window. Enforce 8MiB before
hashing exact submitted UTF-8 bytes, before parsing/BOM removal/normalization.
Match only four root digests and four fixed helper digests from
`experiments/max-reference/hierarchy-reference-20261021/sources.json`.
Verify helper files without evaluating them. Probe returns only bounded identity
facts, never resource paths or bodies. Unknown source returns unrecognized;
known source with missing/changed helpers returns explicit unavailable.

The reference command requires the caller to own an admitted validated shell.
Names are a strict finite allowlist: append, prepend, int, float, combine, join,
pack, pak, zl, message, route, pv, value. Resolve only
`docs/refpages/max-ref/<name>.maxref.xml`. Related entries outside this catalog
are unavailable; execution support is not inferred from reference availability.
Read at most512KiB; XML depth<=32, each field<=16KiB, lists<=64 entries and
serialized response<=256KiB. Reject excess instead of silently truncating.
Reject DOCTYPE/external entities and disallowed control characters; resolve
only standard/numeric XML escapes. Extract Unicode text in document order with
paragraph breaks and normalized line endings. Render with textContent only.
Return not-configured, not-found, identity-mismatch or invalid-reference as
appropriate. Use original synthetic XML fixtures; local integration may read
licensed files without copying their text into repo evidence or terminal logs.

## Import Orchestration

Make dialog inspection asynchronous. Capture immutable source text and an epoch,
perform native probe, then analyze/import that exact text with the finite
identity. Editing/resetting/closing/reopening invalidates outstanding responses.
Disable import while inspecting and expose progress/errors in existing status.
Browser preview has no native recognition provider and cannot automatically
adapt installed helpers. Parsed-object callers lack byte provenance and stay
on ordinary import. Extra Max JSON fields/filenames cannot supply identity.
Preserve raw local file bytes using bounded strict UTF-8 decoding if recognition
depends on exact bytes; retain a BOM rather than silently stripping it during
file reading. Native `Loaded.source` already preserves its source string.

For a recognized source, independently verify expected complete root/basic/
question/helper shape and matching helper arguments. Convert helpers locally
without attempting standalone one-node shell validation. Assemble full root,
metadata and source mappings, then validate once. Retain helper source IDs and
anchors. Recognized complete root takes precedence over the dialog's ordinary
Basic-fragment preference. Explicit descendant import stays ordinary and never
inherits root metadata or orphan helper nodes.

Do not suppress all warnings because a digest matches. Source-specific
diagnostic disposition must name exact implemented values, exact verified-inert
values and still-unsupported values. Preserve remaining float `format` and
arithmetic-semantic warnings until separately resolved. Report source retention,
adapter availability and behavior qualification distinctly. Whole-source
retention does not imply a compatible or qualified result.

Expected complete authoring/native/cable counts:
append19/12/9, prepend18/11/9, int25/14/10, float27/16/12. Each retains four
helpers, two containers and respectively1/1/5/5 comments. No capacity increase.

## Hosted View State

Keep native `boundPath=descriptor.viewPath` authoritative for each real window.
Add local optional `hostedPath`; effective path is hostedPath or boundPath.
Root shell hosts `[basicNode]`. A real Basic child stays bound to that scope.
Popover/reference/camera state is per window and absent from canonical patches.

Reconcile on shell identity transitions, including import into an already
adopted empty owner. Identity includes owner, bound path, adapter/object and both
child IDs. Appearance of a root shell initializes Basic; disappearance or
identity change clears local overlays. Ordinary Save/CAS/runtime publications
preserve hosting. Rebuild/recovery/load restore the effective visible path.

Navigation flushes pending authoring and finishes gestures, but emits no graph
install, stop, initialization, receiver registration or runtime event. `?` is a
menu button, never a selected content tab; Basic remains selected and visible.
Escape/outside click closes its popover and restores useful focus. Missing
provider states remain readable and keyboard reachable. Reference request
epochs prevent late results from attaching to another shell/window/object.

Console reveal resolves the full canonical tree after flushing and rechecking
the captured revision. Already-visible sources select locally. A root host's
Basic source closes the reference overlay and hosts/selects Basic locally.
Other ordinary child sources retain native window routing with expectedRevision.
The completed revision-bearing source-reveal fix remains intact.

## Acceptance And Review

Test strict cross-language schema; exact-source recognition and lookalike/BOM/
modified-helper refusal; all four source counts/maps; dialog response races;
shell import into an adopted owner; hosting through CAS/Save/history/recovery;
independent root/child views; unchanged native numeric/Message/receiver state
across Basic/question/reference navigation; hidden Basic source reveal and stale
rejection; parser size/entity/path/text controls; unavailable local references;
and export without licensed prose. Portable tests use original synthetic data.

Review provider bounds and imported shape independently before release build.
Run affected/full JS/Rust/contracts/browser then a fresh private native desktop
run. Inspect one combined final help-shell capture, fix concrete defects in one
batch and confirm at most once. Do not restart completed Message/Print polish.
