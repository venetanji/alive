# Four-Root Help Shell Fidelity

Ultra now retains and hosts the finite append/prepend/int/float help shells,
with original helper rendering and bounded reference text from the local Max
installation. Source retention and adapter availability are established
separately from behavior qualification. Complete installed-help qualification
remains 0/2,103. The compact Max-inspired Impeccable visual world is preserved.

## Observed Shell And Product Behavior

The retained observation in
`experiments/max-reference/help-shell-ui-20261022/` establishes that append
opens with Basic selected, and that clicking `?` opens a Reference/Related
Objects popover over the same visible Basic canvas. Clicking Basic dismisses
the popover. The empty saved question patcher is not an empty content tab.
Basic's details helper owns its title; the root name helper does not become a
persistent overlay. Prepend, int and float share the saved shell structure,
but applying this behavior to them is an inference from append.

Ultra renders the helpers at their saved rectangles, keeps Basic visible under
the question menu and reads reference text into an in-app pane. That reference
destination and the Basic context action `Open Basic in New Window` are
explicit Ultra additions: neither action was observed in the Max shell run.
No new Max/Wine launch or modification of the installed sources was needed.

Each real window retains its native `boundPath`. A root shell separately hosts
Basic; a native Basic child remains bound to its child scope. Shell identity
includes owner, native path, adapter, object and both child IDs. Appearance or
identity changes reconcile local hosting and clear obsolete overlays. CAS,
Save, broadcasts, recovery and history preserve the appropriate visible scope.
Question/reference/Basic navigation issues no graph-install, stop or event
commands. Numeric, Message and Print observations remain intact, and overlays
belong to each window rather than saved state.

## Schema And Local Provider

The optional v2 root `helpShell` metadata and four `help_helper` roles have
strict cross-tree validation shared by JS and Rust. The original 49-case corpus
covers malformed metadata, role placement, IDs, scope contents, helper cables
and explicit nulls. Helpers count toward authoring bounds, have no ports and
are explicitly omitted from native lowering. Save, child CAS, publications,
undo/redo and file round-trips preserve metadata without storing reference
prose or provenance claims. Directly authored valid shells are permitted.

The read-only pre-import probe hashes exact submitted UTF-8 bytes and verifies
four fixed help identities plus four local helper identities without executing
scripts. Source size is bounded to 8 MiB. Unknown sources, modified helpers and
lookalikes do not gain recognition. Async inspection retains the exact source
and invalidates responses when source or dialog state changes.

Reference access requires an admitted valid shell owned by the caller. It uses
a finite 13-object catalog and fixed contained paths beneath the canonical
resources root. An explicit `ULTRA_MAX_RESOURCES` setting takes precedence and
does not silently fall back. XML is bounded to 512 KiB, depth32, 16 KiB fields,
64-entry lists and a 256 KiB serialized response. DOCTYPE, unknown entities,
invalid controls, duplicate recognized fields and excess data reject. Extracted
Unicode text uses safe text rendering; unavailable resources remain readable
and keyboard reachable. No proprietary script or reference bodies are bundled
or added to saved patches.

## Source Retention

Read-only accounting of the actual local help files produced:

| Source | Authoring Nodes | Native Nodes | Cables | Helpers | Source Maps | Diagnostics |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| append | 19 | 12 | 9 | 4 | 19 | 135 |
| prepend | 18 | 11 | 9 | 4 | 18 | 124 |
| int | 25 | 14 | 10 | 4 | 25 | 143 |
| float | 27 | 16 | 12 | 4 | 27 | 152 |

All source boxes and cables are retained; omitted boxes and edges are zero for
each source. Source mappings cover every retained box. The accounting is in
`/tmp/ultra-help-source-retention.json`. Native identity verification was tested
independently; the JS accounting injects the verified digest/provider boundary
to exercise exact-source conversion without claiming an integrated native
desktop import result. Diagnostics remain visible, including unresolved float
format and arithmetic-semantic limitations. Retaining a source is not a claim
that every example or action behaves like Max.

Helpers consume no native slots or generic vocabulary entries. Counts remain
54 native kinds, 56 generic authored objects and 113 original library entries.
The 32-node native capacity and all other execution bounds are unchanged.

## Review And Regression Fixes

Independent provider/schema/import/controller/UI review is complete, with all
reported findings resolved in focused regressions. Corrections cover exact
CRLF source retention despite textarea normalization, file reads tied to the
dialog epoch, and reference requests waiting for native shell admission.
Console reveal keeps already-visible Basic sources local in both hosted roots
and native children, with revision checks preserved across pending edits.
Async menu updates retain useful focus. Helpers support ordinary dragging and
clear stale width overrides. Controller regressions include shell import into
an adopted owner, rejected-import recovery, identity changes and the special
Message-text history admission path. These changes do not introduce runtime
commands during local navigation.

Integration checks also reproduced and corrected two keyboard interactions:
Message headers must retain their Enter-to-edit bubbling behavior, while the
question button consumes its own Up/Down arrows so selected objects do not
move. A compact-window hit test reproduced the Inspector covering Reference;
the workspace stacking context now keeps Reference above the Inspector and the
question menu above both. These are functional corrections before visual review.

## Verification

- Full JS: 325 passed, `/tmp/ultra-help-js-final.log`.
- Required contracts: exit0, `/tmp/ultra-help-contracts.log`.
- Full real-browser suite: 78 passed, `/tmp/ultra-help-browser-full-final.log`.
  Browser help tests use an explicit synthetic IPC bridge; native ownership,
  identity and XML parsing are independently covered by Rust tests.
  After the final question-arrow fix, all four affected Message/help/compact
  browser cases passed, `/tmp/ultra-help-browser-final.log`.
- Full debug Rust: 108 passed, 0 failed, 2 ignored,
  `/tmp/ultra-help-rust-full.log`.
- Explicit local provider integration: 4 help identities, 4 helper identities
  and 13 bounded references passed, `/tmp/ultra-help-local-provider.log`.
  The check emits identity/status facts only, without licensed prose.
- Release Rust: 108 passed, 0 failed, 2 intentionally ignored,
  `/tmp/ultra-help-rust-release-final.log`.
- Final release build: exit0, `/tmp/ultra-help-build-final.log`.
- Private native help-only run: exit0,
  `/tmp/ultra-help-shell-desktop-confirm-2/help-shell-result.json`. Actual local
  references, independent child overlays, local console reveal, runtime r1,
  numeric77, Message display `fresh`, saved template `17` and exact canonical
  Save/export passed. Cleanup records zero marked processes across three runs.
- Full private native desktop wrapper: exit0,
  `/tmp/ultra-help-shell-desktop-full-final.log`. Startup, canvas and documents
  result JSON all passed under `/tmp/ultra-help-shell-desktop-full-final/`.
  This includes Message/Print, hierarchy, shared audio, ownership, local file
  actions and the new help scenario. Its cleanup scan records zero marked
  processes across all ten task runs.

Root inspected the combined help capture, then one framing confirmation.
Controls, helper rendering and the reference/console composition preserve the
compact editor world. Source reveal had scrolled the title partly above the
visible workspace; capturing the full desktop also included underlying windows.
These were scene-framing issues, not product defects. The original synthetic
Print/number examples moved to y375; the existing Reset canvas view action and
a front-window crop produced the confirmation, without product edits/rebuilds.

The confirmation at
`/tmp/ultra-help-shell-desktop-framing-confirm/native-help-shell.png` shows the
complete helper title, Basic controls, live values, local reference pane and
Console within the front1120x780 window. Root's single confirmation inspection
found no further issue. The focused native confirmation passed all help checks;
its cleanup scan records zero marked processes across all eleven task runs.
The bounded visual pass is complete; no further captures or polishing are planned.

An earlier full native run exposed the corrected Message header Enter guard.
The first help-only run exposed a sparse synthetic-fixture mismatch: JS export
adds default Print level0 and number value0 while a clean native Save retains
the admitted sparse JSON. Making those two fixture defaults explicit resolved
the comparison; no product Save defect or reference-prose persistence occurred.

## Remaining Qualification Limits

This is a finite four-root adapter, not a general Max JavaScript runtime,
generic tab system or unrestricted reference browser. Browser preview cannot
automatically recognize installed sources without the native provider.
Reference availability does not establish object execution support. The
retained Max observation did not exercise reference destinations, keyboard
behavior or every example. No complete root has passed a separate full
behavior qualification; whole-help remains 0/2,103.

The next bounded fidelity recommendation is recorded in
`.impeccable/review/max-fidelity-20261021/comment-next-wave.md`: multiline/bubble
comments and finite label styling precede cable midpoints and float format/type
qualification. No remaining warning is suppressed by this phase.
