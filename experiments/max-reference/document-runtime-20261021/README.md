# Documents, Help, Audio, And Named Messages

This is a static inspection of the installed licensed Max reference XML,
user-guide metadata, and saved help-patcher topology. It does not claim a Max
runtime trace or complete help-file compatibility. `evidence.json` retains
resource SHA-256 identities, resolving XML selectors, guide headings, and saved
box identities/port counts. No proprietary reference bodies, complete help
patches, helper scripts, or artwork are redistributed. Compiled MDX content in
guide JSON is read as data and never executed.

Regenerate with `python3 inspect-runtime.py`; verify the exact current installed
resources with `python3 inspect-runtime.py --check`. Both commands are read-only
with respect to the Max installation and launch no application.

## Document And Help Behavior

The object guide's `help-files-and-reference` section describes per-object help
opened from an object's context menu or the documented modified click. The
documentation-window guide distinguishes the reference browser from object
help, which demonstrates behavior in a working patcher. This supports an Ultra
object-help action that opens an actual example document in its own window,
while keeping reference prose and editable examples as separate concepts.

`pcontrol` documents `load <filename>` opening a patcher found on Max's search
path, with optional replacement arguments; `open` and `close` control connected
patcher/subpatcher windows. `thispatcher` targets its containing window:
`front` opens/brings it forward, `title` changes its title, and `write` uses a
standard file dialog for an unsaved patch or writes an existing patch back to
its current file. These are evidence for independent document/window identity
and ordinary OS file workflows, not a specification for reproducing Max's
search path, scripting language, or argument substitution in Ultra.

The lifecycle guide describes phased creation, cable connection, initialization,
load messages, window activity, and DSP setup. Within a phase, subpatchers precede
parents; closing also has explicit teardown stages. Ultra's bounded importer
does not execute Max startup messages or reproduce these phases. Opening a
document should prepare only that document's admitted graph, without replacing
another window's graph or starting its timers automatically.

## Audio Scope

The installed `dac~` reference explicitly documents `int`, `start`, and `stop`
as controlling processing in all loaded patches. Its separate `startwindow`
method enables the local patch/subpatches and disables the other patches.
Thus one application's audio device and independent document execution state
are distinct concerns. Ultra uses the requested shared native audio runtime;
closing a document stops/frees its own timers, voices, graph, and bus bindings.
Explicit global Start/Stop/Panic actions retain application-wide scope. The
document-close cleanup must never call the global `audio_stop` command.

## Send And Receive Contract

| Object | Creation Name | Saved Ports | Behavior |
| --- | --- | --- | --- |
| `send` / `s` | Required symbol | 1 inlet, 0 outlets | Forward complete typed input to matching receivers in any loaded patch. |
| `receive` / `r` | Optional symbol, supplied | 0 inlets, 1 outlet | Emit messages from matching sends. |
| `receive` / `r` | Omitted | 1 inlet, 1 outlet | `set <symbol>` binds the runtime destination before bus data can arrive. |

The required/optional name facts come from each XML `objarg` row; port shapes
are also present in the saved help files. In `send.maxhelp`, named `s` and
`send` instances occur at `obj-2/obj-33` and `obj-2/obj-25`. In
`receive.maxhelp`, the unnamed receiver occurs at `obj-2/obj-20`; named `r`
and `receive` instances occur at `obj-2/obj-29` and `obj-2/obj-26`.

Both references describe delivery between patcher windows and other loaded
patches. Both explicitly say that reception order across multiple receivers is
nondeterministic. An implementation may choose stable internal iteration, but
must not advertise that order as Max parity. A direct downstream control chain
must finish before the next output in the native dispatcher, subject to the
workspace-wide budget that bounds wireless feedback and document cycles.

`send` lists the general `anything` method and no special `set` method.
`receive` has a `set` method for its unnamed creation's inlet. Accordingly,
`set next` sent through a bus is ordinary payload: delivery emits directly
through the receiver's outlet and must not reinterpret it as retargeting.
Runtime retargeting leaves saved creation text and the associated port shape
unchanged. Closing/replacing a document removes its old runtime bindings.

Ultra kinds 26/27 encode the creation name in the existing bounded text field;
all numeric descriptor fields remain zero. Names are one ASCII token of at
most 31 bytes, with only Receive allowing empty text. This is an Ultra bound,
not Max's documented symbol-size limit. Bang, integer/float identity, symbols,
lists, and arbitrary selectors retain the existing bounded typed-message ABI.
The palette supplies a practical Send name `channel`; textual `send`/`s`
creation and Max import require an explicit name. Bare `receive`/`r` is unbound.

## Deferred Scope

The abstraction guide's `unique-identifiers` section documents leading `#0`
expansion per patcher instance; occurrences inside a word do not expand.
The send/receive name arguments document leading `---` expansion for a Max for
Live device. The current importer refuses these unexpanded creation names and
message tokens beginning with `#0`
instead of silently placing private Max destinations in a global namespace.
Abstraction/subpatcher instancing, search-path loading, Max for Live device
namespaces, Show Others navigation, and full Max help-patcher execution remain
separate work. Plain names intentionally share Ultra's loaded-document runtime.
