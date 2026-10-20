# Max patcher UI reference

This bounded UI study accompanies Ultra's Max-inspired editor redesign. It is
evidence about the installed interface, not certification of Max compatibility.
Starting integration commit: `d7e1c59005b4d8a5178854ce28f29bb1e3207956`.
Work branch: `design/max-patcher-ui-20261020`.

## Environment and preservation

Max 9.1.5, x64 Windows, bundled with Live 12 Suite 12.4.6, ran through the
installed patched Wine 11.13 on Omarchy/Linux 7.2.8-9-omarchy x86_64. UI input and
capture used a private 1440 x 1000 Xvfb display, with a disposable copy of the
existing Wine prefix. Copied profile-folder links were replaced by empty private
folders. Original projects, global preferences and the shared PR branch were
not changed. The system Wine 11.20 executable was not used.

`ui-study.maxpat` is our own JSON-authored patch, opened in the actual Max UI.
Standalone saving was disabled by its authorization state; this study did not
bypass it. A copied factory default Live set successfully loaded a Max MIDI
Effect and opened **Edit in Max**. A new patch containing `metro 150` could be
created in that Max for Live session. No bundled template or device is included.

The user then supplied `Untitled1.maxpat` and `savedpatch.maxpat`. The two saved
files are byte-identical and have Max 9.1.5 app metadata. Their original bytes
are retained under `snapshots/`; their save host is user-reported, not established
by the JSON. They provide a real saved-format baseline, not a before/after pair.

DSP was not started for this UI study. Sample rate, vector sizes, Overdrive and
Scheduler in Audio Interrupt were not queried in this run and are explicitly
unknown in its manifest. The earlier `../max-reference/` bundle has separate
message/DSP evidence with its own settings; do not inherit those settings here.

## Observed interface

| Question | Observed in Max | Ultra implementation |
| --- | --- | --- |
| Resting patch | Charcoal canvas; compact dark objects; amber class names and light arguments | Compact boxes and original controls; optional panels |
| Edit mode | Ctrl E unlocks; dot grid appears | Ctrl E switches between editing and performing |
| Create an object | N at pointer opens inline text entry | N, B, M, T and I shortcuts; name plus positional arguments |
| Autocomplete | Typing `met` suggested `meter~` before `metro`; Down + Enter selected `metro` | Only the supported 15 kinds; deterministic prefix ranking, Tab/Enter completion |
| Unknown class | Unknown text remained visibly unresolved | Error remains in entry; existing patch is unchanged |
| Port help | Hovering `+` left inlet describes setting the operand and triggering calculation | Per-port hover/focus help, hot/cold behavior and types |
| Inlet context menu | Message inlet showed Attributes and accepted Messages | Original supported-message descriptions under **Accepts** |
| Outlet context menu | No analogous emitted-message menu appeared in this particular attempt | **Emits** menu is an Ultra addition; shows output type and cable count |
| Signal cords | Yellow segmented signal cords; gray message cords | Gray control, segmented yellow mono, teal explicit stereo bundle |
| Number controls | Separate integer and float UI boxes | One bounded numeric box; Max integer/flonum semantics are deferred |

Small crops in `screenshots/` show our own patch and the relevant interface.
No Max icons, fonts, executable resources, help patches or assets are used by
Ultra. The screenshot autocomplete was clipped at the private display's right
edge; it establishes the first choices, not the entire suggestion list.

## Reproduce

1. Use legitimately available Max/Live in a disposable prefix or session. Keep
   the original projects and preferences untouched. Use the installed Wine build
   deliberately and a private Xvfb display; never redirect input to the desktop.
2. Open a copy of `ui-study.maxpat`. Keep DSP off. Capture the locked controls.
3. Press Ctrl E, position the pointer on blank canvas, press N and type `met`.
   Select metro with Down/Enter. Try an unknown class in a separate new box.
4. Hover the arithmetic inlet; right-click the message inlet, then an outlet.
   Record the exact results rather than assuming menus are symmetrical.
5. For Max for Live, use a disposable default set, add a Max device, and choose
   its explicit **Edit in Max** context-menu action. Create/save only your own
   patches. Preserve originals when collecting snapshots.
6. Validate manifest and file hashes with `python3 verify.py` from this folder.
   This checks recorded evidence only; it does not run Max.

`operations.json` records the actual bounded questions and outcomes.
`format-observations.json` describes the supplied snapshots and a proposed
lossless import boundary. No `.maxpat` importer is implemented by this UI work.
`rea-metadata.json` records REA's read-only PE resource inventory identity and
limits. REA's native UI observer is macOS-specific; Wine UI evidence came from
Xvfb/XTest captures, not that observer. No proprietary code was decompiled and
no resource payload was extracted.

## Known gaps

Ultra still executes `ultra-canvas-v1`: 15 kinds, 32 nodes, 64 edges, two prepared
voice banks. It rejects arbitrary Max classes, including `cycle~`, `int` and
`flonum`; its `midiin`, `makenote`, `voice~`, `gain~`, `join~` and `dac~` have
documented Ultra-specific semantics. Max UI resemblance does not extend that
contract. Symbol/list algebra, arbitrary DSP, Max scheduler modes, abstractions,
presentation editing, parameter automation and native Max file import are
deferred. The UI reports native aggregate observations, not an ordered message
history or an oscilloscope. Small browser preview is an editing check only.

## Official documentation

The installed official object/patching user guide and reference pages were
consulted alongside observation:

- [Objects](https://docs.cycling74.com/userguide/objects/)
- [Patching](https://docs.cycling74.com/userguide/patching/)
- [Patching mechanics](https://docs.cycling74.com/userguide/patching_mechanics/)
- [Message](https://docs.cycling74.com/reference/message/)
- [Number](https://docs.cycling74.com/reference/number/)
- [Metro](https://docs.cycling74.com/reference/metro/)
- [Max for Live device editing](https://docs.cycling74.com/userguide/m4l_editing/)

Documentation describes supported products; observations here describe this
specific Wine run. Neither establishes untested cross-platform equivalence.
