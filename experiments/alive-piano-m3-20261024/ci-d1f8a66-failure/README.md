# Pushed-checkpoint native CI failure

Run `40062078651` tests pushed commit
`d1f8a6659730abe54b9037434a55c3ce92ce34a8`. Both UI jobs pass. The native job
passes its native build, Rust tests and instrument/session probes, then fails
the actual Alive desktop walkthrough. Later resource and CPAL steps are skipped.
`run.json` retains exact job/step results; `failed-step.log` is the raw failed log.

The failure is `prepare_chain` waiting for `Select Pulse Stereo Lowpass effect 2`
after clicking Utility's Later and then Earlier controls. The retained screen
and accessibility dump show Lowpass effect 1 / Utility effect 2, with Utility's
Earlier control focused and `Chain prepared. Start transport when ready.` status.
Those observations do not establish whether the application or test input lost
the second click. A separate frozen-binary diagnostic reproduces this first
click loss without any file chooser; its investigation is still active.

Local passing Task 10 evidence remains separate from this failed CI job. No
rerun, changed wait duration or earlier passing checkpoint qualifies this run.
The native app's GTK chooser assertions are also retained; their independent
bounded key-release diagnosis is in `../gtk-diagnostic/`.
