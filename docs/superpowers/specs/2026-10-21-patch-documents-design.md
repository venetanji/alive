# Patch Documents, Help Windows And Shared Runtime

The editor will open patches through the operating system and provide an in-app
browser of original, runnable help patches and examples. Every document has its
own window, undo history, graph revision, observations and console records. All
documents use one process, one audio device configuration and one audio callback.

## Document Lifecycle

- New creates an empty patch window. Open uses a native file picker. Opening a
  file from the desktop, command line or by dropping it creates a window, or
  focuses an already open copy of the same canonical path.
- Ultra JSON files load directly after validation. Max patch/help files use the
  existing compatibility report and explicit partial-import acceptance.
- Save writes the current Ultra document to its path; Save As uses a native
  picker. Imported Max files and bundled help/examples first save as a new Ultra
  document. Writes use an adjacent temporary file and atomic replacement.
- Dirty documents prompt on close. Cancel keeps the window. Save closes only
  after a successful write; Discard closes only that document.
- A bounded application document registry owns window identity and paths. Native
  IPC commands derive document identity from the calling window, never a supplied
  frontend document ID.

## Help And Examples

A searchable in-app library groups object help and runnable examples. Object
help is reachable from the object context menu and keyboard. Opening an entry
creates or focuses a separate patch window. A checked JSON manifest of original
Ultra patches is shared by the frontend and native application. No installed Max
help assets are redistributed, and unsupported imported objects remain explicit.

## Audio And Named Messages

The application admits up to 16 open patch documents, each retaining the existing
32-node/64-edge graph limits. One engine prepares two independent instrument
banks per document and mixes each document's routed output into the same stereo
device callback. Edits, focus changes and closing one window retain other
documents' states and timers. Audio Start/Stop and Panic are application-wide;
patch Stop is local to its window.

`send`/`s` and `receive`/`r` forward bounded typed messages through a process-wide
plain-symbol namespace, including with audio off. Their saved port shapes and
retargeting behavior follow the installed reference evidence. The callback uses
fixed storage and a shared bounded dispatch budget, including for named feedback
cycles. Receiver ordering is not an authoring guarantee. Signal send/receive,
arbitrary Max scope expansion and arbitrary DSP graph execution remain outside
this implementation.

## Error Handling And Verification

File/dialog errors stay in the current window and never destroy its patch. A
failed import or graph preparation retains the prior admitted graph. Closing
removes that document's message receivers, timers and voices. Tests cover path
deduplication, safe saves, dirty lifecycle, library manifest consistency,
multi-document admission/isolation, typed named dispatch, cycle bounds, mixed
audio, and actual desktop opening/help workflows. Existing model, browser,
native and Rust suites remain regression gates.

The user's existing full-permission instruction authorizes implementation and
routine reversible integration. The existing dirty worktree is intentionally
preserved; unrelated patch files and distributions are not modified.
