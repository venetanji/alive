# Installed Append Help Shell Observation

This finite visual observation opens the actual locally installed
`help/max/append.maxhelp` in Max9.1.5 under Wine11.13. It uses a fresh reflink
clone of the earlier disposable list prefix and a private Xvfb display. No
installed help JSON, helper script, reference XML body, image asset or binary
is distributed here. Retained screenshots show the requested installed UI;
all executable observation code in this directory is original.

The source help SHA256 is
`d4a3fe4d87f7fd7b30c747cc18cc09f7ba6dd703adadc279733df38503962729`,
matching the earlier static inventory in
`../hierarchy-reference-20261021/sources.json`. `environment.json` also records
the executable, helper and reference-document identities. The cloned source
hashes matched the original installation after the observation.

## Observed Behavior

1. `results/initial.png`: append opens with `basic` selected. The tab strip
   contains `basic` and `?`; no root tab appears. Basic shows the large object
   name, digest/description, argument callout and example canvas.
2. `results/question.png`: a real pointer click on `?` opens a popover headed
   by the object name, with Reference and Related Objects entries. Basic
   remains visibly selected and the same title, details and examples remain
   behind the popover. No empty patcher canvas becomes visible.
3. `results/basic-return.png`: clicking Basic dismisses the popover and
   restores the unobscured initial Basic canvas.

`results/events.json` records the exact pointer coordinates and capture times.
The pointer targets were selected after viewing the initial screenshot. No
reference link, related-object link, update notification, example object,
source Save or object edit was activated.

The key correction is that the installed help shell's `?` affordance is a
reference/related-object action, even though its saved `q_tab` patcher is
empty. Treating it as an ordinary empty canvas tab is not compatible with
this observed append shell.

Basic's shipped `helpdetails.js` statically draws the object-name argument as
well as its reference details (name references at local script lines10,28,57,66;
the name is passed to its text-drawing call). Thus the large Basic title does
not require an inferred persistent overlay of the root `helpname.js` object.
The runtime screenshots establish the resulting composition; they do not
isolate individual helper draw calls.

## Scope And Limits

This observes append only. The same saved helper/tab shell is statically
present in prepend, int and float, but their actual UI behavior was not
executed here. Generalization to those roots is an inference.

Because `?` opens a popover over Basic, this does not prove how a hypothetical
different help content tab would handle the title. It establishes the actual
two-item append shell, and provides no basis for a persistent global masthead
across arbitrary child tabs.

Opening one installed help root and inspecting this shell does not score its
complete message/UI behavior. Full-help conformance remains0/2103. Nested
`showontab:2`, active-tab persistence, runtime value retention, source reveal,
keyboard behavior and reference-link destinations were not tested here.

The main help window overlays another Max window within the same owned
private session; no unrelated desktop content was captured. Existing Max
update notification chrome remains visible, but was not activated.

## Provenance And Cleanup

REA process capture is retained as `rea-process-evidence.json`:
`ev_5a6fcbd15082a7d3aff93ca7f40f7fa3ab612cbc0598ca8d397d5cbe2027cc77`.
The runner exits0 after the three requested captures. After ordinary Quit was
requested, the Max process returned-9; this does not certify graceful shutdown.
An exact-prefix scan found no remaining processes, and the task-created prefix
was removed. Session IDs, source hashes and the runtime-log hash are retained
in `environment.json`; private profile state is not included.

Original preferences, installation files, existing evidence and product code
were not modified. No authentication, trial change, license edit, hardware
audio activation or broad process-name kill occurred.

`manifest.json` freezes source and result hashes. Verify the retained files
without launching Max with:

```sh
python3 experiments/max-reference/help-shell-ui-20261022/verify.py
```

For a new observation, select a new evidence directory, disposable prefix and
cache directory. The runner refuses an active prefix or existing screenshots;
do not rerun into this frozen results directory.
