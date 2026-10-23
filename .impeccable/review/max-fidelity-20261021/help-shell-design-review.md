# Four-Root Help Shell Design Review

Review of `help-shell-design-notes.md` against the current importer, hierarchy
validators/lowerers, shared controller and native document routing. This is a
recommendation artifact, not an implementation or qualification claim. No
product files, builds, Max sessions or UI polish were used for this review.
The installed four roots were analyzed read-only with the existing importer;
no licensed source bodies are reproduced here.

The proposed authoring-only helper nodes and separate bound/hosted paths fit
the current architecture. Address these six integration findings in the spec.

## 1. Verify Source And Helpers Before Import

The design requires exact root SHA256 and matching local helper resources
before automatic recognition, but its proposed `help_reference` provider
requires an already admitted helpShell document. Current
`canvas-max-import.mjs` analysis/import entry points are synchronous JavaScript
and accept strings or parsed objects. Neither provides the missing pre-import
helper verification.

Recommended minimal interface:

```text
help_shell_probe({source:String})
  -> bounded recognized identity or explicit unavailable/unrecognized result
```

Run this native, read-only operation for an ordinary caller window before
import. Enforce the existing 8 MiB source limit in native code. Compute SHA256
over the exact UTF-8 bytes of the submitted source before JSON parsing, BOM
removal, whitespace normalization or reserialization. Match one of the four
retained root digests, then verify the four fixed helper files under the
configured/discovered resources directory using their recorded hashes and
canonical path containment. Never resolve script paths from supplied JSON.
The bounded result should identify the adapter, root object and source digest;
it should contain no helper bodies, arbitrary paths or reference prose.

Keep the exact source string used for the probe as the immutable input to
analysis and import. Native `read_patch` currently preserves source text in
`Loaded.source`; retain that behavior. For browser file input, preserve raw
bytes with a bounded read and strict UTF-8 decoding if byte-identical file
recognition is required: `File.text()`/default decoding can discard a BOM or
replace invalid bytes. Pasted text is recognized only if its submitted UTF-8
bytes match. Parsed-object callers cannot establish the retained file-byte
identity by hashing `JSON.stringify`; keep them on ordinary analysis unless
the orchestration also retains the matching original source.

Make dialog inspection asynchronous. Capture an immutable source and request
epoch; discard a probe response if the epoch/source changed. Editing the input,
resetting, opening another source or closing the dialog invalidates the prior
identity. The final import must use the same source and finite identity, then
check the expected full shape and helper arguments independently. Do not
accept identity claims from extra Max JSON fields or filenames.

Provenance is evidence for this automatic adapter selection, not a security
permission: the bounded Ultra helpShell schema is safe to author directly and
never executes scripts. Browser preview can open synthetic/saved Ultra shells
with unavailable reference prose. Without the native provider, it must not
automatically recognize installed Max helper scripts as verified.

## 2. Validate The Complete Shell After Assembly

`canvas-max-import.mjs:152` currently validates every converted box inside a
temporary one-node document. The proposed rule that helpers are valid only
inside a complete helpShell makes that temporary document invalid, so simply
adding a helper conversion branch would still omit every helper.

Separate local envelope/style/role validation from cross-record validation.
Assemble the root, all scopes, helpers, source mappings and helpShell record;
validate their relationship once; then lower. Descendant selections must not
inherit root adapter metadata or retain orphan helpers.

Preserve the optional record in the JS validator's returned root:
`canvas-hierarchy.mjs:72` currently reconstructs only version/profile/nodes/edges.
Allowing an input field without returning it would silently discard it before
save or native admission. Mirror the optional-present-versus-null rule in the
Rust root schema, keep nested scopes strict, reject helper cables before
lowering, and explicitly omit helpers from both executable lowerers and native
capacity counts. Use the proposed shared original schema corpus for JS/Rust
parity. Do not expose helper roles through the generic object-authoring palette
merely to obtain a node specification.

## 3. Prefer The Recognized Root In The Import Dialog

`canvas-max-dialog.mjs:28` prefers any importable patcher named `basic` ahead of
a complete root. Even successful root recognition would therefore default to
the old Basic-only import and bypass the shell.

Prefer the complete root for a recognized adapter. Keep descendant selection
an explicit ordinary-subpatch action with its own diagnostics, without
transferring the root's recognition or qualification. Analysis and final import
must use the same source/probe identity, and source maps must include retained
helper IDs as well as executable IDs.

## 4. Initialize Hosting On Shell Transitions

The notes specify initial Basic hosting on first adoption. The actual Max-open
flow in `canvas-documents.mjs:28` adopts an empty owner first and only then opens
the import dialog. The shell arrives on a later commit, so first-adoption-only
initialization would leave the owner displaying its root.

Reconcile hosting when the canonical shell identity changes, including when
it first appears after import. Use owner/bound-path identity plus the adapter,
object, Basic ID and question ID. Initialize Basic when a shell appears; clear
reference/menu state if that identity changes or disappears; preserve local
state across ordinary Save, CAS and runtime publications. Restore the resolved
visible path after rebuild, recovery and load. Keep native child-window binding
authoritative and separate from the root host's local Basic override.

## 5. Carry Console Revision Through Asynchronous Routing

`canvas-console-view.mjs:26` checks the record revision and passes only its node
ID to the selection callback. `canvas.mjs:61` then awaits `flush()` before
finding/routing the source. The original revision is no longer available for
the required second check; a pending graph replacement can reuse the ID.

Pass `{node, revision}` through the resolver and recheck both after flushing.
Resolve against the complete canonical tree. Select an already visible source
locally, host Basic for a root-host source, or open an ordinary native child as
specified in the notes. For the native-child case, carry the expected revision
into command admission as well: `document_open_patcher` currently accepts
`node` and optional `reveal` without a revision. This prevents a replacement
between the frontend check and native routing from selecting a reused ID.

## 6. Define Source-Specific Diagnostic Disposition

`canvas-max-import.mjs:342` marks a report complete only when every diagnostic
is informational. Recognizing four helpers alone leaves warnings for expected
helper/comment port shapes, shell/dependency metadata, visual fields and actual
execution differences. The current reports therefore cannot become complete
merely by retaining all boxes.

Add a source-specific attribute disposition table to the spec: implemented,
verified inert for this exact source/value, or still unsupported. Treat only
the exact qualified values as covered; preserve real unsupported diagnostics
and generic-source behavior. Do not suppress all warnings because a root SHA
matches. Distinguish these outcomes explicitly:

- Source retention: every original box/cable has a retained representation and
  source anchor, with correct authoring/executable accounting.
- Adapter availability: the local shell and licensed reference provider can
  render the supported experience, with explicit unavailable states.
- Behavior qualification: the complete retained examples and relevant actions
  have been exercised against the specified source and result.

Successful import or complete source retention is not whole-help behavior
qualification and must not advance the complete-help conformance count alone.

## Current Four-Root Accounting

Read-only analysis with the current importer returned:

| Root | Source Boxes | Source Cables | Omitted Boxes | Omitted Cables |
| --- | ---: | ---: | --- | ---: |
| append | 19 | 9 | 4 helpers | 0 |
| prepend | 18 | 9 | 4 helpers and 2 popup prints | 2 |
| int | 25 | 10 | 4 helpers | 0 |
| float | 27 | 12 | 4 helpers | 0 |

All four current reports have `complete:false`. In addition to helper/shell
diagnostics, float retains four `format` warnings and two arithmetic-semantic
warnings. Those need explicit disposition before a complete-help claim.
Prepend's two popup-print omissions remain the already identified independent
dependency. The design note's expected final authoring/native counts remain
plausible; no native-capacity increase is indicated by these sources.

## Review Outcome

Proceed to a spec after incorporating the verification orchestration,
whole-tree validation, recognized-root selection, shell-transition hosting,
revision-bearing reveal routing and diagnostic disposition decisions above.
No production implementation or additional runtime qualification was performed
in this review.
