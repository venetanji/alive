# Original Max Tab UI Observations

This is original authored probe code, original patch content, screenshots, and
raw observations from installed Max 9.1.5 under Wine 11.13. No installed help
file, reference text body, helper script, image asset, or binary is copied here.
No complete installed help file was executed. Full-help conformance remains
0/2103. Product code and existing frozen evidence were not edited.

## Accepted Observations

| Question | Retained evidence | Observation |
| --- | --- | --- |
| Initial tab with root hidden | `results/root-hidden-initial.png` | Alpha is active; tabs are Alpha, Zeta. Root header is absent. |
| Position vs name/array/y order | `results/position-swapped-initial.png` compared with root-hidden | Zeta at x20 precedes Alpha at x450 and is initially active, although Alpha sorts earlier by name and sits higher on the canvas. Both files save Zeta before Alpha. Root-hidden reverses their x coordinates and starts with Alpha. This supports increasing x for these distinct-x cases. |
| Root tab enabled | `results/isolated-root-shown-initial.png` | The first and initially active tab is `isolated-root-shown (root)`, followed by Alpha, Zeta. The original ROOT HEADER comment appears on this root canvas. |
| Root vs child composition | `results/isolated-root-shown-zeta-set77.png` | Zeta content replaces the root canvas; ROOT HEADER is absent. A generic tab does not automatically overlay root canvas objects on child content. |
| Runtime root inclusion | `results/position-swapped-refresh-tabs.png` | Sending `showrootpatcherontab 1` to root thispatcher adds the filename root tab. |
| Value retention | `results/root-hidden-complete.json` and `results/isolated-root-shown-complete.json` | A number set to77 retains77 through Alpha/Zeta switching; the retained screenshot shows77 after returning. |
| Immediate-parent tab | `results/isolated-local-open-zeta.png` and `results/isolated-local-zeta-local.png` | Opening Zeta using pcontrol produces a child window displaying Local, with its original LOCAL TAB content. Local has saved/read-back `showontab:1`. A thispatcher `setactivetab Local` command keeps that content visible. |
| Nested top-level value | `results/isolated-nesting-complete.json`, `results/isolated-local-complete.json` | The nested Promoted scope reads back2 in the first fixture. In isolated-local, a runtime message changes it from0 to2. A top-level tab named Promoted is not observed in these captures. |

The first two ordering observations decouple x from array order, alphabetical
order and y position. They do not establish equal-x tie-breaking, recursive
ordering, or a general startup restoration contract.

## Important Limits

The original first runners opened several sources sequentially on one private
display. Later screenshots can show an earlier foreground window. In
particular, later nested-parent-hidden screenshots show the position-swapped
root filename. Preserve these raw captures, but exclude `root-shown`,
`order-reversed`, and `nested-parent-hidden` from visual differential claims.
The accepted root-hidden and position-swapped observations are each the first
source in their fresh session. The isolated fixtures each use a fresh prefix,
a fresh X server, and one source; every row records its patcher filepath.

Nested tab/root behavior is only partially established. The saved ancestor
Zeta has `showontab:0` in isolated-nesting/isolated-local, but its runtime
getter reports1; its saved `showrootpatcherontab` is1. The latter setting,
descendant tabs, and host creation may interact. The local child window shows
Local but no separate Zeta root tab. Do not claim the isolated change from
Promoted0 to2 caused ancestor promotion: Zeta already read back1 before the
change. Do not implement generic nested2 routing solely from these images.
The installed documentation's parent/top-level distinction remains a
documented fact; the detailed nested UI routing remains unresolved here.

The generic original root comment is absent from child-tab content. This
does not establish the composition of Max's special installed helpname jsui,
which was not executed. A persistent Ultra help masthead remains an explicit
product choice, not a captured Max helper behavior.

No gestures, keyboard shortcuts, selection/camera restoration, duplicate
labels, empty-tab startup, saved active-tab restoration, or equal-x ordering
were scored by this probe. The screenshots include Max's existing update
notification; no update or external link was activated.

## Provenance And Cleanup

Four retained REA process captures are:

- `rea-process-evidence.json`: `ev_edba58628c5f9d6d0a94877644583bb5d7c26d108943cded7b06a78415a333eb`
- `rea-followup-evidence.json`: `ev_1191af2531e052ee325090f16657674c3d9897222c797f5a309c178ce840655f`
- `rea-isolated-evidence.json`: `ev_63d8b37d9c769beebdd28da04ee6a017f5b2bebace4a44b52a1a24e9f98e18b8`
- `rea-local-evidence.json`: `ev_37c91982da3a07563482aa53e67a0e2c7bc4413caebac4abdcd2294bf0332731`

Every process runner exits0 after collecting its finite stages. Max process
exit codes after ordinary Quit requests include0 and-9, so the captures do
not certify graceful application shutdown in every run. Prefix scans after
capture are retained separately in `environment.json`. No broad process-name
kill, original-prefix launch, authentication, trial change, license edit,
hardware audio activation, or source Save was used.

`environment.json` retains executable hashes and private session/log metadata.
`manifest.json` retains hashes of the authored sources and raw artifacts.
Screenshot checks confirm format/dimensions and hash integrity; visual claims
come from manual review, not OCR-based automated pass labels.

For a new run, regenerate fixtures in a new evidence directory, select fresh
prefix/cache names, and preserve old results. `run-isolated.py` refuses existing
prefixes and clones the earlier disposable list prefix with reflinks; each
`run-one.py` invocation refuses an active prefix and existing result output.
Do not rerun into this frozen results directory.
