# Preserve Actionable File Errors

Source `447023039a93944410b60d94d286a453a177f288`, based on `0d9ccd6`.
Independent spec and quality review approves; existing validation warnings are disclosed. This repairs two confirmed view-layer behaviors:
a final snapshot rejection could replace a file-operation error, and a later
poll failure could overwrite the useful error message. Both are reproduced
against the original mounted module with controlled native invocation results.
The previous real native failure does not reveal which interleaving occurred.

The existing status paragraph now keeps the operation result and refresh health
separately. Recovery clears only the refresh warning. Accepted state still
reconciles normally; rejected file actions preserve selection and unfinished
fields. No file retry, relaxed assertion or native snapshot fabrication is added.

Final checks pass: 62 mounted-view tests, 508 complete UI tests, 18 browser tests,
native build and the unchanged full native journey once in 193.112 seconds.
The original changed-source assertion, retained parameter/history checks and
final close/cancel/Quit checks pass. See `status-error-preservation-report.md`
and the raw command records for precise scope and known build/harness warnings.
This is a Session integration pass, not an Arrangement or endurance claim.

The rebuilt Alive binary is `ae23ba409de663921cce42ed01d66f27fd60fb007fffe126a77736067fa5d894`;
the matching native library is `1c579c6d63befb624166174c15a3235fa6fb71acab2e01f03aae124d7801b931`.
Actual process executable/maps attribution is retained. The existing launcher
uses this coherent replacement; previous binaries remain in the raw evidence's
`usable-launcher/` backup. Shipping v4 remains disabled.

Parent verification checks all 238 artifacts, 233 committed-source pins and
four local binary pins. Full software capture contains 4,231,168 finite stereo
frames / 88.149333 seconds at 48 kHz, peak 0.353354, equal channels. Recorder
and app cleanup complete. This is private software PipeWire/CPAL at 512 frames;
capture duration is not proven continuous playing time, stereo separation,
physical audio, latency, or hardware-underrun evidence.

Raw binaries, source baseline, browser screenshots and complete native evidence
remain under `/tmp/alive-workspaces-status-preservation`, identified by
`frozen-manifest.json`. The previous failing journey is preserved separately in
`../chooser-diagnostics/fix1/`. Final pushed-head CI remains required.
