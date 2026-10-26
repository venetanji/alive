# Arrangement Interaction Reference

LOCAL-ARR-R1, 2026-10-26. These are derived action/result findings from the
identified Live 12.4.6 Suite executable under Wine 11.13. New captures, the
authored study project and raw logs remain private, outside the repository.
No proprietary assets are included here. This supplements the existing
workspace specification and workflow ledger, rather than defining a new plan.

| Action | Observed result | Alive implication |
| --- | --- | --- |
| Select a blank four-bar range; Ctrl+Shift+M | A MIDI occurrence appears at bars 2..6, selected with Clip detail open. Source bounds are bars 1..5 with looping enabled. | Placement timing and source timing need separate fields and identities. |
| Add one note; rename Part-A; drag the occurrence header four bars right | Occurrence becomes bars 6..10; source bounds and note stay unchanged. | Moving a placement must preserve its source notes and duration. |
| Drag its right edge from bar 10 to bar 14 | Eight-bar occurrence shows repeated note marks while source remains four bars. | Resize changes occurrence duration; loop repetitions derive from source and offset. |
| Ctrl+Z after the completed resize | Right edge returns to bar 10. | A committed gesture is one history operation. Earlier immediate undo/redo attempts did not establish a change and are retained as failed observations. |
| Copy occurrence, Tab, paste into Session; paste another occurrence on track 2 | One Session clip and two Arrangement occurrences coexist. | Views expose different placements on shared tracks. This experiment establishes clipboard copying, not shared-source identity semantics. |
| Loop bars 6..10, start, launch track 1 from Session, Tab back | Track 1 Arrangement dims; track 2 stays active; playhead advances and Return becomes available. | View navigation must not take playback authority. Show override per track. |
| Click track 1 Return | Its Arrangement becomes active again while playback continues in the loop; Return indication clears. | Return explicitly resolves the current song position. Exact application frame is not measured by screenshots. |
| Launch Session track 1 again, then scoped Stop, then Tab | Track 1 Arrangement remains dim while track 2 and global transport continue. | Scoped Stop retains Session authority; it is distinct from Return. |
| Click global Return | Both Arrangement lanes become active and the return indicator clears. | A global return acts on overridden tracks without restarting transport. |
| Stop, Save, create a new set, Open the saved study | Both four-bar Arrangement occurrences, note content, Session clip, loop brace and stopped song position restore. | Session slots and Arrangement placements must persist independently. |
| Enter a full path in the filename field, then correct it | Invalid filename dialog appears; current project remains intact; choosing a directory and simple filename saves successfully. | Failed file actions need actionable errors without losing current work. |
| Quit after reopening | Application window exits. | This is a Quit observation, not proof of reopening after process restart. |

The saved private project inventory confirms two MIDI tracks: track 1 has a
Session clip and Arrangement occurrence, track 2 has an Arrangement occurrence;
each contains one note. Arrangement bounds are beats 20..36 (bars 6..10).
The study contains no instruments or device parameter edits.

## Provenance And Limits

Private evidence root: `~/.cache/alive-arrangement-reference-20261026/`.
`actions.jsonl` records UTC input actions; `observations.json` links outcomes
to inspected frames; `manifest.json` hashes 44 artifacts including the saved
project, inventory, cleanup receipt and REA export. REA process-lifecycle ID:
`ev_713e5543709cac7b256b6a78e170db869bdbc9cde460061961a91e0c8a2faf59`.
The REA client timed out after 300 seconds, but the owned process continued;
its completed retained record was exported without repeating the launch.
REA reports sampled-process and terminal truncation limits. UI findings come
from the separate input log and inspected pixels, not semantic REA UI tracing.

The copied PipeASIO profile initially showed Play active with a stationary
position. Those frames are not playback evidence. Switching only the disposable
application copy to MME/DirectX allowed transport to advance. Its UI reported
44.1 kHz, input 8192/output 4096 samples and 186/92.9 ms input/output latency.
These are displayed settings, not measured latency. MIDI tracks had No Output;
there was no audio capture, DSP attribution or physical-audio observation.

The private Xvfb root was 1600x1000; the window retained a partly clipped title
area after a resize attempt. These frames establish workflow behavior, not
Alive's required 1440x900/1280x800 visual acceptance. Live reported a pending
12.4.7 update; no process restart or update was performed. The disposable prefix
and owned processes/display were removed. Original and source-copy preference
hashes were unchanged, as recorded by `cleanup.json`.

Still unobserved: left-edge offsets, Escape-canceled placement gestures,
cross-track/overlapping drag policy, input-focused Tab, placement delete/redo,
return inside a gap, exact queued return timing, process-restart restoration,
device state in this project and missing-media recovery. Gather these only
before implementing the corresponding interaction. Native Alive timing and
termination tests remain necessary regardless of reference UI observations.
