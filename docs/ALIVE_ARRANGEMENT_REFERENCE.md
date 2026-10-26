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

The follow-up below resolves several interaction gaps. Still unobserved:
running Return inside a gap, exact queued return timing, process-restart
restoration, device state in this project and missing-media recovery.
Native Alive timing and termination tests remain necessary regardless of
reference UI observations.

## Follow-Up Interaction Study

LOCAL-ARR-R2, same executable and Wine version, fresh disposable copy of the
authored study. New captures and saved project snapshots remain private.

| Action | Observed result | Alive implication |
| --- | --- | --- |
| Trim left edge from bar 6 to 8 | End stays at 10, source loop stays four bars, notes unchanged. Saved source start offset becomes eight beats; detail Start becomes 3.1.1. | Left trim changes placement start/duration and source offset together. |
| Undo trim; extend left edge from bar 6 to 4 | End stays at 10; saved source offset is eight beats in the unchanged four-bar loop. | Earlier looping extension wraps the offset; this modulo interpretation is derived from saved state. |
| Hold a move preview at bars 10..14; Escape, then release | Original occurrence remains at 6..10. | Canceled gestures must leave placement and history state coherent. The probe does not establish canceled-history entry behavior. |
| Hold a right resize preview through bar 14; Escape, then release | Four-bar occurrence, notes and offset restore. | Preview must not commit until the gesture completes. |
| Tab while renaming track 1 | Track 2 name becomes editable; Arrangement stays visible. | An active editor handles focus navigation before the global view shortcut. |
| Delete occurrence, Ctrl+Z, Windows Ctrl+Y, Ctrl+Z | Occurrence disappears/restores at the same bounds; the Session clip and other track remain unchanged. | Occurrence history must preserve source notes and independent Session placement. |
| Move occurrence from track 1 to track 2 at bars 10..14 | Track 1 Session clip remains; track 2 has two occurrences with original note/offset data. | This is reference behavior; it does not expand the initial Alive cross-track editing scope. |
| Move second occurrence left to overlap at bars 8..12 | Earlier occurrence is cropped from 6..10 to 6..8. Undo restores the previous state. | Alive deliberately rejects overlaps initially; overwrite/crop semantics are outside its accepted slice. |
| Launch Session at stationary position 13.1.1, then per-track/global Return | Arrangement override clears while position remains beyond the occurrences ending at bar 10. Saved placement inventory stays unchanged. | UI authority transition only: no running-playback, gap-silence or exact-frame claim. |

The last probe used No Audio after inherited PipeASIO stalled. Play was green
but position did not advance; those frames are excluded from playback evidence.
The first fast move/resize/cross-track attempts and unsettled undo capture did
not establish their intended result; later pointer-held and settled captures
do. Tests cover these MIDI clips and partial edge overlap, not every input,
complete containment, multiple overlapping targets or audio clips.

Private evidence: `~/.cache/alive-arrangement-gaps-20261026-230156/`.
REA lifecycle ID:
`ev_fc17621d9d940cf4965c5f4f281fddbf77c90632e0abbff5ad912b4853be1f2b`.
The timed-out client was followed through the same retained completed process
record. Action logs, inspected pixels and saved gzip/XML project inventories
support the findings; REA alone does not semantically trace the UI. All 85
manifest artifacts and cleanup were independently hash-checked. The manifest
SHA-256 is `96e335553d381fdd957daa25dbc796610848eec27b2209a5ad67778262dc4084`.
The owned prefix/processes/display were removed, and original/source preference
digests match their pre-launch values. Live reported downloading an update;
the disposable copy was never restarted and no install/update action was taken.

Official Live 12 Arrangement section 6.7 corroborates move/edge-resize;
Keyboard Shortcuts sections 42.5/42.26.1 document Windows redo and rename Tab.
The Use Tab to Move Focus preference affects Live's wider shortcut behavior;
the observation here is specifically a track-name editor. These references
guide Alive interaction choices without supplying application assets or code.
