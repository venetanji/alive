# Max Message UI Compatibility

This is the second independent dependency of the complete append, prepend,
int and float help batch. Complete installed-help qualification remains
0/2,103. The user authorized autonomous implementation and requested agents.

## Evidence And Direction

Use the original direct-injection oracle in
`experiments/max-reference/message-ui-runtime-20261022/`. Its README corrects
the earlier feeder-substitution ambiguity. Preserve the completed compact
Max-inspired Impeccable styling and the existing inline object editor.

Alternatives considered: changing native Message=1 would silently change saved
patch ports and empty/bang semantics; reinstalling the whole graph on text
edits would reset unrelated runtime state. Instead append MessageBox=53,
saved type `message_box`, and add atomic text replacement and typed published
display snapshots. Existing structs and old Message=1 remain unchanged.

## Authored State And Supported Syntax

Saved `message` keeps its literal-only, one-inlet contract. Its explicit
authoring name becomes `message.legacy`. `message`, alias `msg`, and shortcut M
create `message_box`, with two control inlets and one control outlet. The
default text is empty. `message_box` text accepts the existing finite literal
profile, empty text, and standalone `$1`/`$2` payload atoms under a fixed selector or numeric
first atom. A placeholder in head position or under `symbol` is refused as
unqualified. Other dollar syntax,
comma/semicolon commands, quotes, escaping, patcher-instance expansion, more
than eight payload atoms, symbols over 31 bytes, text over 127 ASCII bytes,
and numbers outside +/-100000 are refused explicitly.

Typed runtime replacements retain the eight-atom/31-byte-symbol limits; their
derived display can reach 287 ASCII bytes. The 127-byte bound applies to
authored text and the text-edit API. The runtime performs no text formatting.

Saved canonical text, the runtime display template, and the two remembered
substitution arguments are distinct. Runtime cold/set updates do not dirty
the document, overwrite canonical text, or enter authoring history. Authoring
text edits and undo/redo update the saved text and the one live box atomically.
An explicit edit restoring text equal to the saved text must still replace a
different runtime template. Structural graph replacement retains the existing
runtime reset semantics.

## Runtime Behavior

Nonempty templates output on hot input. Bang recalls the current template
with remembered substitution values; non-bang input updates up to two
arguments before output. Missing arguments retain their previous values,
initially integer zero. A symbol input supplies its symbol as argument one;
an anything selector supplies its selector followed by its atoms; list drops
its list selector. Numeric and symbol atom types remain typed through output.
Hot substitution does not replace the displayed literal `$1`/`$2` template.

The cold inlet silently replaces the template. Examples from the oracle are
`new $1 $2`, numeric-leading list `5 pear 2.25`, scalar float 6.25, `symbol kiwi`
and bang. A nonempty cold replacement preserves existing substitution
arguments. Hot `set` replaces from its remaining atoms silently; bare `set`
clears the display. An empty template suppresses hot output and does not
remember incoming substitution arguments. Do not claim a target-side
zero-atom list method: the oracle injector delivered no row for that stimulus.
Overflow or unsupported replacement content leaves the prior state intact.
Bare set clearing and authored replacement reset substitution arguments to
zero as an explicit local policy; Max parity for those transitions is not
qualified. Hot append/prepend/setargs, cold set and zero-atom cold list are
refused as unqualified methods in this phase.

## Native Publication And Admission

No callback allocation, control-thread mutable runtime reads, or new fields in
existing ABI structs. Preserve 32 executable nodes, 64 cables, eight atoms,
16 owners and all existing signal/audio ownership limits.

Add a bounded text action compiled on the control thread and admitted as one
queue entry. `ultra_canvas_message_text_document(document, revision, node,
edit_serial, text, byte_len)` validates live type/revision, bounded syntax,
capacity and monotonically increasing serial. Rejection changes neither the
admitted plan nor canonical authoring state. Callback application changes only
the target box. Queue ordering with numeric edits, messages and Tab remains
FIFO. Wrong type, stale revision, closed owner and full queue reject cleanly.

Publish typed template state using atomic words and a publication generation;
never use a seqlock around concurrently read non-atomic payload. A separate
new POD snapshot carries graph revision, applied text-edit serial and per-node
content generation, empty flag, typed prototype and placeholder references.
The read is non-consuming across views. Contention returns unavailable, so
views retain their prior cache. Rust derives bounded display text off callback.

`canvas_status` adds `message_boxes`, either null or
`{revision,text_edit_serial,nodes:[{id,generation,empty,text,prototype,placeholders}]}`.
The existing numeric observations and console remain intact. New native PODs
do not change existing ABI layouts. Graph installation clears the old rows
and starts its text serial at zero.

## Rust And Controller Interfaces

Standalone `canvas_message_text({revision,node,text})` returns `{serial}` after
successful native admission. Shared `document_commit` accepts optional
`messageText:{node,text}`, a hint validated against the complete canonical
plan. The shared owner descriptor includes `messageTextSerial`, initially 0,
increased only for admitted atomic MessageBox text edits/history. Infer a
single MessageBox-only text delta for ordinary configure/history, and honor
the explicit hint even when canonical text is unchanged. Multiple text deltas
or other execution deltas use the existing full graph path.

Both controllers send text actions before subsequent events using their
existing serialized queues and lifecycle barriers. Pending optimistic text
edits hide that node's stale runtime display. After admission, accept display
rows only when graph revision matches and applied serial is at least the
expected serial. Null/contended snapshots retain cache. Revision changes clear
it. Runtime display polling never mutates authored parameters. Child views use
the owner's serial and non-consuming snapshot.

The standalone controller uses admission-first text editing/history and an
event FIFO. Until admission completes, it rejects other authoring operations
with a retry notice, preserving saved text/history on rejection. Its text
actions can still interleave with triggers. Stop cancels unsubmitted text
actions, settles submitted actions, and retains successfully admitted saved
text for the current graph. Shared native authoring retains its existing CAS
queue and optimistic view model without this temporary authoring restriction.

## Import And UI

Max message boxes map to `message_box`, including empty displays and supported
standalone placeholders. Preserve both inlet cable indices and explicit
unsupported-syntax diagnostics. Remove the obsolete literal-only semantic-gap
warning for this supported profile. Import still refuses unresolved `#0`
names. When examining template literals for destination admission, substitute
zero only for classification of the known placeholder slots; do not execute
the graph in JavaScript or infer arbitrary method compatibility.

Reuse the current message face, selection, lock behavior, inline object-text
editor, Inspector and appearance fields. The face displays runtime template
text when available, including a genuinely empty display. Editing uses saved
canonical text and commits silently. Keep HTML text insertion safe. No new
visual world or repeated Impeccable polish loop is needed.

## Verification

Meaningful native tests replay the finite empty/cold/set/substitution oracle
and assert typed output and unchanged literal template display. Backend tests
cover FIFO editing, stale/type/close/saturation rejection, off/on callback
paths, non-consuming snapshots and unrelated runtime preservation. Rust tests
cover strict schema, bounds, serial publication, shared CAS, history and
same-text restore. JS tests cover legacy preservation, parser/refusals, import
cables, display caching and editing/history order. Browser tests exercise M,
empty and two-inlet appearance, editing and safe live display; native desktop
checks prove real cold/set display and ordered text editing with shared views.
Run required contracts/build and independent read-only review, and record the
finite outcome and remaining whole-help dependencies.
