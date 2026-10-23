# Native Embedded Patcher Views

The completed Max hierarchy and Impeccable work is the baseline. This phase
separates window views from root documents so an embedded `p` opens in its own
native window. The user's standing full-permission instruction authorizes this
continuation; preserve the current dirty checkout and do not commit or publish.

## Ownership

A root document owns the complete inline v2 tree, one bounded history, saved
baseline, authoring revision, and one existing native audio slot. A view binds
a native window label to that owner and an embedded patcher path. Child views
never allocate document slots or install a graph merely by opening. Opening an
already open child focuses it. Closing a child only detaches that view. Closing
the owner prompts once for its complete saved tree, closes its child views, and
disposes its runtime once. A removed patcher closes its obsolete child views.
OS close first requests a flush from every ready view of the owner (or only the
closing child). Native waits for matching per-request acknowledgements before
checking the canonical dirty state; queued frontend edits cannot bypass the
unsaved-change prompt. Repeated close requests share this handshake. Closed or
deleted child views retire their outstanding acknowledgements.
Participating editors pause new authoring until close or matching cancellation;
pending admission/history failure cancels the request. A child finishing boot
joins an active owner request, and new child creation waits until owner close
is resolved. Event registration precedes native view readiness.

The root and all children edit the same authoritative native snapshot. Native
compare-and-swap commits reject stale revisions without mutation. The frontend
may rebase disjoint changes; conflicting changes must show an explicit notice
and retain the authoritative document. Save from any view flushes that view's
pending changes and writes the whole owner snapshot. Edits during a save keep
the owner dirty relative to the actual saved snapshot. Undo/redo is owner-wide.

## IPC Contract

Existing document descriptors gain `shared: true`, `ownerLabel`, `viewPath`,
`authoringRevision`, `runtimeRevision`, `descriptorRevision`, `canUndo`, and
`canRedo`. `label` is the
calling view's window label; `id` remains the owner's audio slot. `patch` is
always the complete root. `title` remains the owner file title; `viewTitle`
describes the embedded view. Imported sources retain their compatibility flow.
The owner-wide descriptor revision orders runtime-only and saved metadata
publications; authoring revision remains the compare-and-swap base.

- `document_current` returns the calling view's current descriptor. It prepares
  the owner's graph only if not already installed, so repeated reads and child
  boot cannot reset execution.
- `document_commit({baseRevision, patch, force?, parameter?, history?})` returns
  `{accepted, document}`. `parameter` is optional
  `{node, key, value, hot}` for a single numeric live change. `history` defaults
  true; false supports an existing continuous-control history group. Native
  validation independently checks every patch and execution change. An authoring
  change with identical executable graph never installs a graph. A validated
  single numeric update uses the existing parameter command and optional hot
  inlet event. Other executable changes install atomically before publication.
- `document_history({direction, baseRevision})` returns the same commit result,
  with direction `undo` or `redo` and the same revision check.
- `document_open_patcher({node,reveal?})` resolves a globally unique container ID
  in the calling owner's tree and creates or focuses its child view. Zero
  selects the root; reveal optionally selects an object in the target scope.
- `document-changed` broadcasts fresh descriptors to each owner view after
  accepted edits, history, or saves. Receivers ignore older revisions.
- `document-flush-before-close` requests `{requestLabel, token}` from each ready
  view; after flushing it acknowledges with `document_close_flushed` using the
  same fields and an optional error. Native validates the calling view and
  consumes completion once. `document-close-cancelled` carries the same request
  identity to every member, releasing its authoring barrier on Cancel, Save
  choice or failure. A successful Save triggers a fresh close flush.

Legacy standalone browser/model tests retain the existing controller. Native
shared documents use a dedicated shared controller with the same editor API.
Its synchronous authoring actions update an optimistic local tree and serialize
CAS submissions. Graph events wait for pending authoring admission. Shared
controllers detach on pagehide without stopping their owner's graph.

## Observations And Console

Every view addresses its owner's graph through a native window binding. Status
includes that owner's nodes. Console records are drained into an owner cache
and returned after a per-view cursor, so one child cannot steal another view's
records. Caches remain bounded at 512 records. Clear Console is local to a view.
Console source navigation opens/focuses the source's owning child window and
reveals the node there without installing a graph.

## Limits And Verification

Keep the existing 16 root slots, 32 executable nodes, 64 executable cables,
512 authoring nodes, 1024 authoring cables, 16 hierarchy levels, and 1 MiB
compact v2 limit. Child views have a separate explicit bound of 64 per owner.
No C ABI array sizes change. No installed Max assets or preferences change.

Rust tests must cover binding, CAS, shared history, dirty/save races, runtime
admission failure and child detach. JS tests must cover shared boot without
reinstall, independent edits, concurrent CAS, events after admission, history,
and detach. Browser and real private desktop checks must verify separate
windows, preserved graph revision/live state, whole-tree child Save and owner
close behavior. Existing document and hierarchy regressions remain gates.

Whole installed-help conformance remains 0/2103; initialization, abstractions,
help helper adapters and larger executable plans remain necessary later work.
