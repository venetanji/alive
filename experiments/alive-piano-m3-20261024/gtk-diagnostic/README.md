# Retained GTK chooser warning diagnosis

The historical Task 10 walkthroughs contain `gtk_widget_event` assertions. A
bounded private-display reproduction on 2026-10-24 traces the first assertion
to a synthetic slash key release while the native chooser's newly created
`GtkFileChooserEntry` is unrealized. This is evidence about this input sequence,
not a claim that all GTK warnings are environmental or harmless.

The existing release executable/library were copied to
`/tmp/alive-gtk-diagnostic-20261024` without rebuilding. Their SHA-256 identities
are in `receipt.json`; the executable matches the final Task 10 qualification.
The existing private Xvfb/PipeWire harness launched this copy under GDB with
process-local `G_DEBUG=fatal-criticals`. No user settings or services changed.

`event/app.log` retains the fatal assertion and main-thread stack through
`gtk_window_propagate_key_event` and the Tauri event loop. A breakpoint at
`gtk_widget_event` retained its last arguments. GDB then reports event type 9
(`GDK_KEY_RELEASE`), keyval 47 (`slash`), widget type `GtkFileChooserEntry` and
`gtk_widget_get_realized` returning zero. The test's first Add effect chooser
therefore cannot finish; the diagnostic harness exits 1 as expected.

The comparison changes only the synthetic slash input: flush the key press,
wait 200 ms, then send its release. Under the same fatal-critical setting,
both Add effect choosers load the saved Utility and Lowpass, Quit completes,
the inferior exits normally and the harness exits 0. The GDB command file still
attempts to print its cached event pointer after normal process exit, which
produces a debugger memory-access error in `paced/app.log`. That post-exit
diagnostic error is distinct from the application's normal exit. All other
portal/DRI warnings remain retained in the raw logs.

Reproduction shape, from the repository root (temporary launcher and scripts
are retained here as evidence of the commands used):

```sh
env ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_ALIVE_BINARY=/tmp/alive-gtk-diagnostic-20261024/launch-event \
  ULTRA_TEST_SCRIPT=/tmp/alive-gtk-diagnostic-20261024/probe.py \
  bash apps/ultra/tests/check_canvas_desktop.sh \
  /tmp/alive-gtk-diagnostic-20261024/event
# Comparison: substitute probe-paced.py and the paced output directory.
```

No application source was changed by this investigation. The next native
workflow harness update should split this location-entry key gesture and wait
for the entry to become usable before release, then qualify its actual journey.
This small comparison does not qualify the final clip-bank UI, physical input,
audio deadlines or the required 30-minute playback soak.
