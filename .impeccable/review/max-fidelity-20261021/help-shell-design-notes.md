# Four-Root Help Shell Design Recommendation

Recommendation only; no implementation authorization is implied. This note
uses retained evidence and current source inspection. No new Max process was
started, and no product files were edited for this recommendation.

## Evidence Boundary

Authoritative retained records:

- `experiments/max-reference/hierarchy-reference-20261021/sources.json` and
  `README.md`: complete source identities, saved shapes, helper identities,
  counts, positions and arguments for append, prepend, int and float.
- `experiments/max-reference/tab-ui-runtime-20261022/README.md`: accepted
  original tab observations and excluded ambiguous captures.
- `experiments/max-reference/help-shell-ui-20261022/README.md`: actual installed
  append shell, initial Basic, question popover and Basic return screenshots.

The installed append `?` opens a Reference / Related Objects popover over
Basic. Basic stays selected and its canvas remains visible. Its empty saved
`q_tab` is not evidence for an empty visible question canvas. Basic's known
`helpdetails.js` draws the object name itself; the title does not require a
persistent root `helpname.js` overlay. Generic original tab evidence also shows
root canvas content disappearing when a child tab is shown.

The same saved four-helper shell exists in the other three roots. Their shell
behavior is inferred from that shared structure, not independently observed.
Nested `showontab:2`, equal-x tab ordering, active-tab persistence, reference
link destinations and keyboard behavior remain unqualified. None is a reason
to implement a general Max tab router in this phase. Full-help conformance is
still 0/2103; a shell adapter alone cannot change that count.

## Recommended Boundary

Implement an explicit `max-help-four-v1` adapter for these four source roots.
Retain the complete authoring tree and map four known helper identities to
authoring-only helper nodes. Add a small strict root metadata record that
identifies Basic and the question action. The adapter renders an original UI
implementation and reads reference content from the user's licensed local
installation. It never evaluates shipped JavaScript.

Alternatives considered:

| Approach | Consequence |
| --- | --- |
| Recommended: helper nodes plus root adapter metadata | Preserves helper IDs, geometry, source mapping and complete source accounting; lowering can explicitly omit their execution. |
| Put every helper in an opaque metadata array | Avoids node types, but creates a second identity/geometry system and makes helper selection, cable validation and capacity accounting less clear. |
| Generic js/jsui execution or generic Max tab metadata | Greatly expands the execution/security/compatibility surface and depends on unresolved behavior. |

The adapter must not silently drop helpers, replace the root with a flattened
Basic patch, or infer helper trust from a filename alone. A root missing Basic
or q_tab is unsupported; do not recreate helpstarter's scheduled construction
path. The four saved roots already have both scopes.

## Authoritative Saved Schema

Keep version 2 and `ultra-patcher-v2`. Extend only the root document with an
optional `helpShell` field. Nested scope records remain exactly `{nodes,edges}`.
Absence is valid; explicit null is invalid. A v1 document cannot carry it.

```json
{
  "version": 2,
  "profile": "ultra-patcher-v2",
  "helpShell": {
    "adapter": "max-help-four-v1",
    "object": "append",
    "basicNode": 2,
    "questionNode": 4
  },
  "nodes": [],
  "edges": []
}
```

The empty arrays illustrate the record fields, not an admissible adapter tree.
`object` is an enum of `append`, `prepend`, `int`, `float`. Both IDs are distinct
positive u32 values identifying direct child patcher nodes. Unknown fields,
unknown adapter versions, booleans used as numbers, fractional IDs and malformed
optional records reject. Do not add arbitrary `attributes`, `tabs`, script
paths, executable strings, reference HTML or reference prose to this record.

Represent known helper boxes using the existing node envelope:

```json
{
  "id": 7,
  "type": "help_helper",
  "x": 10,
  "y": 10,
  "params": {"role": "details"},
  "style": {"width": 620, "height": 115}
}
```

`role` is exactly `starter`, `name`, `details` or `arguments`; no other parameter
is allowed. The object/reference identity comes from the authoritative root
record, not a duplicated helper parameter. Existing finite position and style
validation applies; helper style accepts only the general visual attributes,
with imported width/height carrying the saved rectangle. No patcher member or
surface inlet/outlet exists on a helper. A cable mentioning a helper rejects
instead of being removed during lowering.

Cross-record validation in both languages is mandatory:

1. The adapter root has exactly four direct boxes and no root cables: one
   starter helper, one name helper, Basic and question patchers.
2. `basicNode` identifies the patcher named `basic`; `questionNode` identifies
   the patcher named `?`. Their identities, not translated display labels,
   select the hosted scope and question action.
3. Basic contains exactly one details helper and one arguments helper. Its
   other content uses the existing supported node/edge schema. The question
   scope is empty. No helper exists elsewhere or outside a helpShell document.
4. All IDs remain globally unique and all normal hierarchy validation still
   applies. The adapter is valid only as a complete record/tree combination.

The semantic shell is fixed: hide the owner root, initially host Basic, show
Basic and a `?` action, and draw no root name overlay on Basic. There is no
persisted selected tab, popover state, camera or native window identity.
Keeping those fixed values out of saved metadata avoids pretending to support
generic `showrootpatcherontab` or `showontab:2` behavior.

Use one original JSON case corpus shared by JS and Rust: valid examples plus
unknown fields, wrong types, nulls, duplicate roles, wrong scopes, changed
question content, missing IDs, helper cables and forged nested metadata.
Rust is the authority for admission and Save; JS mirrors that exact contract
for immediate feedback. Suggested typed Rust records use `deny_unknown_fields`
on each struct, enums with explicit serialized spellings, and a present-value
deserializer like the existing patcher member. JS uses exact field allowlists,
own-property tests and the same integer/enum bounds. Never validate only the
current visible scope.

Users may edit the Basic examples within the supported schema. This finite
adapter does not expose generic helper/script authoring. Removing required
shell structure is rejected with a precise diagnostic. A future explicit
detach-to-ordinary-patch workflow can remove adapter metadata and its helper
nodes together; silently leaving an invalid shell is not part of this phase.

## Import Recognition And Provenance

Gate automatic adapter selection on the four complete source SHA256 identities
in `sources.json`, the expected root/basic/question structure, saved scripting
names `basic_tab` / `q_tab`, helper arguments equal to the root object, and the
known helper resources. Exact helper hashes are already recorded:

| Resource | Role |
| --- | --- |
| `helpstarter.js` | `starter` at the root |
| `helpname.js` | `name` at the root |
| `helpdetails.js` | `details` in Basic |
| `helpargs.js` | `arguments` in Basic |

Do not admit a modified script, arbitrary `jsui`, filename lookalike, nonempty
q_tab, helper patchline, missing shell member or different helper arguments
through this allowlist. Preserve ordinary import diagnostics for the unknown
source rather than granting the known adapter by object name. Source attributes
with execution meaning remain diagnostics even when the enclosing root matches.

Derive adapter metadata during import; do not accept it from extra fields in a
Max JSON input. A hand-authored or saved Ultra document can use the bounded
adapter schema safely, but the schema is not a certificate that its examples
are still identical to Max. Origin hashes belong to import/evidence records;
qualification attaches to the captured source and tested result, not a mutable
boolean in saved JSON. Source IDs/anchors must cover helper nodes as well as
executable nodes so the complete source inventory remains explainable.

## Capacity And Lowering

Count helper nodes toward the existing 512 authoring-node / 1 MiB limits. Count
their full saved style and metadata bytes. Retain their globally unique IDs.
Like comments, helpers do not consume native executable slots and have no
native kind number. Validate them before lowering and omit them explicitly in
both JS and Rust lowerers; never rely on a permissive unknown-type fallback.
Root helpShell metadata also disappears from the native plan.

For the retained saved trees, expected accounting is:

| Root | Authoring boxes | Helpers | Containers | Comments | Executable nodes | Cables |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| append | 19 | 4 | 2 | 1 | 12 | 9 |
| prepend | 18 | 4 | 2 | 1 | 11 | 9 |
| int | 25 | 4 | 2 | 5 | 14 | 10 |
| float | 27 | 4 | 2 | 5 | 16 | 12 |

These totals come from the retained source inventory and ordinary lowering;
they do not assert that every execution attribute is already supported. No
increase to 32 native nodes, 64 cables, eight atoms or 16 owners is needed.
Metadata/helper geometry edits lower to the same executable plan and preserve
the native revision/state. Hiding Basic never removes its receivers or timers.

## Window Binding Versus Hosted Scope

The current controller assigns `document.path = descriptor.viewPath` in
`acceptDescriptor`, rebuild/recovery and load paths. That is correct for a
native child window, but it would reset a locally selected help canvas on
every owner publication. Introduce explicit view state rather than weakening
the authority of `descriptor.viewPath`:

```text
boundPath       = descriptor.viewPath        // native window identity
hostedPath      = local optional absolute path
visiblePath     = hostedPath ?? boundPath
helpPopoverOpen = local boolean
referencePage   = local provider result/navigation state
```

For an adapter root window, `boundPath=[]` and `hostedPath=[basicNode]` on first
adoption. The Basic child window, if explicitly opened, remains bound to
`[basicNode]`; its identity is not changed by a root tab action. Each window
owns independent popover, reference and camera state.

Every document rebuild must restore `visiblePath` after validating it against
the incoming canonical tree. Owner labels or bound paths changing invalidate
hosted state; ordinary authoring, save and runtime descriptor revisions do not.
If a structural replacement removes the shell/path, close the popover, discard
the local override and return to the authoritative bound path. Do not let a
normal native child window escape its binding through arbitrary local enter.

Provide separate controller operations such as `hostHelpBasic()` and
`toggleHelpReferenceMenu()`; keep `document_open_patcher` for real child-window
creation/focus. Basic is the only hosted canvas in this adapter. `?` toggles a
popover and does not change visiblePath, selection of Basic, graph revision,
history, dirty state or runtime registration. Treat it as a menu button next
to the tab, not an `aria-selected` content tab.

Finish active interactions and flush already-pending authoring before changing
the hosted scope, using the existing close/admission barriers. The navigation
itself sends no native graph/event/stop/initialization command. Preserve camera
and selection per visible path as an explicit local product behavior; Max
persistence of those fields is unqualified. Generic child double-click and
the path bar retain their native-window contract unless the action explicitly
selects the adapter's Basic host.

Render the details helper at its saved Basic rectangle with its own object
name, digest and description. Render the arguments helper at its own saved
rectangle. The root name helper belongs only to the root authoring canvas and
must not be painted as a global masthead over Basic. The starter helper has
no rendered/script-execution effect for this already-constructed saved shape.
Use the established editor typography/theme; no new general visual design
system or extra root overlay is required.

## Local Licensed Reference Provider

Read local reference XML in Rust, off audio and outside canonical patch state.
Read-only metadata inspection during this recommendation confirms all four use
`c74object` with `name`, `digest`, `description`, `objarglist`, `methodlist`,
`inletlist`, `outletlist` and `seealsolist`. The known arguments are one entry
per root. No reference prose or helper code is copied into this note.

Use a configured/discovered Max resources directory on this machine. Validate
the fixed relative reference location and canonical path containment; accept
no arbitrary frontend file path. Runtime helper identity checks read/hash the
four known files without evaluating them. Missing installation, changed
identity or missing XML produce explicit availability/compatibility state;
they do not produce invented licensed text or a complete-help success label.

Proposed IPC: `help_reference({name})`. The calling window must own a validated
helpShell document. `name` is a strict enum for the four roots plus their
direct known related objects: `combine`, `join`, `pack`, `pak`, `zl`, `message`,
`route`, `pv`, `value` (13 names total). Resolve only the corresponding
`docs/refpages/max-ref/<name>.maxref.xml`. This small read-only reference browser
does not confer execution/import support on related objects. References beyond
that finite catalog appear unavailable; do not recursively crawl files/links.

An initial bounded response contract:

```text
{ status:"available", object, sourceSha256,
  digest:Text, description:Text,
  arguments:[{name,type,optional,description:Text}],
  methods:[{name,description:Text}],
  inlets:[{name,description:Text}], outlets:[{name,description:Text}],
  related:[{name,available:boolean}] }
or { status:"unavailable", reason:"not-configured"|"not-found"|"identity-mismatch"|"invalid-reference" }
```

`Text` is plain Unicode text extracted in document order, preserving paragraph
breaks. Normalize line endings, reject disallowed controls, and render through
textContent. Keep object names/types separate from prose. If richer inline
formatting becomes necessary, use a small structured span enum rather than raw
XML/HTML. Do not execute links/scripts, resolve external entities or copy
example images. XML input is at most 512 KiB, parser depth at most 32, each
text field at most 16 KiB, each list at most 64 entries, and the complete
response at most 256 KiB. Reject unsupported excess with an explicit response;
never silently truncate a reference while claiming completeness. A process
memory cache keyed by canonical source identity/hash is enough; no disk cache
or telemetry of licensed prose is needed.

Basic details and argument helpers request their root object's record. `?`
shows an object-name heading, Reference action and Related Objects list while
Basic remains visible. Reference/related actions may open an original in-app
reference panel over the same hosted canvas. That destination is an explicit
Ultra behavior: the retained Max run observed the menu, not link activation.
Do not describe it as a verified reproduction of Max reference navigation.

Save/export carries helper roles and object names only, never provider prose,
XML bytes, script bytes or installation paths. Check in original synthetic
XML test fixtures, parser tests and source hash/selector facts. Licensed-local
integration tests can read the actual installation without bundling its text.
Browser preview without a native/local provider displays an honest unavailable
state. A future browser file provider is separate scope.

## Console Source Reveal

Keep the existing record revision and global-node-ID checks. Resolve a source
against the full canonical tree, never only the visible Basic scope. Flush
pending authoring before routing a source action, then recheck the current
revision and node membership.

If the source belongs to the adapter's Basic scope and the current window is
its root host, close the reference popover/panel, host Basic locally and select
the actual source node. Do not open a redundant native Basic window. If the
source already belongs to this window's visible/bound scope, select locally.
For another ordinary child scope, retain `document_open_patcher({node,reveal})`
and native ownership validation. The target child's reveal instruction must
remain bound to that child's path. Stale or removed source records remain
disabled and cannot select a replacement node with a reused ID/revision.

This requires a small resolver shared by normal navigation and console reveal:
return `select-local`, `host-basic` or `open-native-child`, with paths validated
before any action. Do not redefine `descriptor.viewPath` to make one console
link work. Helper/source-inspection links can use the import source map, but
helpers cannot produce native console rows because they have no runtime slot.

## Implementation Seams And Acceptance Checks

Suggested ownership when a root spec/plan authorizes implementation:

- Shared original schema cases and adapter rules: new focused
  `canvas-help-shell` JS/Rust modules, called by both hierarchy validators.
- Tree preservation/lowering: `canvas-hierarchy.mjs`, `canvas_hierarchy.rs`,
  `canvas-model.mjs`, and the narrow Max import recognizer.
- View-local hosting: `canvas-shared.mjs`, `canvas.mjs`, document-view handling
  and console source resolution. Native Registry view bindings remain intact.
- Reference provider: focused Rust XML/identity module and original fixture
  tests; a small renderer consumes its bounded DTO, with no native audio edits.

Required acceptance checks include strict schema parity; four exact source
shape recognition and lookalike refusals; complete source-map/helper retention;
the accounting table; rejection of helper cables; Basic surviving descriptor
broadcasts, Save and CAS history; two native views maintaining independent
popover/host state; question action retaining Basic and native numeric/message
state; no graph install, stop, initialization or receiver churn on navigation;
console reveal from a hidden/overlaid Basic; stale-source rejection; XML entity,
size, path and markup controls; missing-provider behavior; and Save/export with
no reference prose. Use original synthetic documents for portable CI.

A later complete-root run must separately exercise every retained original
example, helper composition and relevant actions. Numeric/message dependencies
are now implemented, but `print @popup 1`, exact helper rendering and any
remaining source-attribute gaps still need explicit treatment. Do not broaden
this adapter to nested tab routing, arbitrary scripts, other help roots or a
new whole-help conformance count from this design recommendation.
