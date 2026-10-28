# Phase 2 Reference Findings, 2026-10-28

This is a derived behavior/design record. Original-application screenshots and
the complete REA bundle remain private. Product source is inspected normally;
Alive and Ultra are not reverse-engineering targets.

## Question And Target

Question: how does Live organize its complete output channel in Session and
Arrangement, and what output-fader interaction should inform Alive's missing
Master channel?

- Observed application: Ableton Live 12 Suite 12.4.6,
  build `2026-09-10 0de5c8fa9a`.
- PE bytes: `148198344`.
- SHA-256: `fdc11a99a6a02c715115ed028becc29c1a2e3b67604ca99e22a81bbfd9d96c6e`.
- Runtime: installed Wine 11.13, disposable reflink of the already identified
  source prefix, private Xvfb `1600x1000x24`, software rendering.
- Private evidence root:
  `/home/venetanji/.cache/alive-phase2-master-reference-20261028/`.
- REA lifecycle evidence:
  `ev_2106e2384a17c657609020fbd7b7cc001f63e6566ce9561b78992bd5b5605851`.

REA captured the owned Python/Wine lifecycle and cleanup. Scoped XTest actions
and separate root screenshots establish the visual observations below. The REA
selected-executable hash is Python's hash, not a Live process-image identity;
the separately recorded PE identity and observed splash supplement it. There
are four retained REA residual unknowns; filesystem/process sampling is not a
complete trace or sandbox. No native binary-analysis session was opened.

## Action / Result Ledger

| ID | Action and settled result | Evidence / confidence |
| --- | --- | --- |
| P2-L1 | Declined recovery in the disposable copy; Live reached its template Set. Full-height Session shows fixed-width track columns, A/B returns and a far-right Main column. Scene triangles/numbers occupy Main's upper rows; its lower area contains output meter/fader and other Live controls. | `04-set.png`, clearer settled `09-session-clear.png`; observed visual structure, not a track/scene maximum |
| P2-L2 | A delayed crash-report pane appeared after initial readiness and changed workspace width. Closed its pane without submitting anything. | `06-main-fader.png`, `07-arrangement.png`, action log; earlier attempted coordinates are not fader proof |
| P2-L3 | Switched to Arrangement, then closed the pane. Track headers/mixers are on the right of the timeline. Return rows and Main appear below the musical tracks; Main displays output channel and volume fields. | `08-arrangement-clear.png`; observed composition, no automation/audio claim |
| P2-L4 | Returned to Session and dragged the visible Main fader. Its handle moved to the bottom and the status read `Track Volume: -inf dB`. | `09-session-clear.png` -> `10-main-drag.png`, scoped drag receipt; observed parameter UI result, no amplitude measurement |
| P2-L5 | Double-clicked Main's meter/fader region. The handle returned to unity position and status read `Track Volume: 0.0 dB`. Context help also described drag adjustment and double-click reset. | `11-main-reset.png`, scoped double-click receipt; observed UI reset, no DSP claim |

The initial attempted select/drag sequence overlapped a newly appearing sidebar.
It is retained as a failed/unreliable attempt and is excluded from the fader
behavior conclusion. Only the later visible control and settled result support
P2-L4/P2-L5. The relative drag distance is not a measured gain law.

## Derived Alive Decisions

These are original product choices based on the observations, not copied Live
implementation, assets, or claims of identical DSP:

1. Add one fixed-right **Master** region in Session. Align real scene actions
   above its real output mixer. Leave unsupported sends, cue, pan and routing
   absent. Keep ordinary tracks compact when unused space remains.
2. Add a bottom Master lane in Arrangement and move track controls to the right
   as part of the Live-composition milestone. Preserve the existing scheduling,
   authority, source/placement and history contracts.
3. Implement native output gain and post-gain meters before treating the strip
   as complete. Provide a unity reset, dB presentation, explicit silence and
   keyboard/numeric alternatives; define smoothing/timing independently.
4. Treat a late panel, tooltip or window resize as invalidating saved input
   coordinates. Native acceptance must verify control visibility/target and
   receipt rather than infer input from a screenshot alone.

## Preservation And Limits

The owned harness exited 0 after a scoped SIGTERM request. Its cleanup receipt
confirms the original 40-file preference inventory and source-copy 1081-file
inventory have unchanged digests, no owned Wine-prefix processes remain, Xvfb
exited and the disposable prefix was removed. The private manifest hashes 17
retained files; the exported REA bundle retains eight records, including prior
imported reference evidence, and four unknowns.

Live displayed its existing recovery/crash-report state and an automatic update
notice in the disposable copy. No report was submitted and no original prefix,
system settings or authentication was changed. This pass did not test Live
Quit/restart/save, maxima, audio, cue, sends, clipping, parameter smoothing,
latency, physical output or internals. The reference app was terminated by the
owned harness after observation, not qualified through an application Quit.

Max's existing dated reference evidence is reused; **no fresh Max runtime pass**
occurred here. Before implementing newly unobserved Max clipboard, cable,
Inspector or presentation interactions, capture the corresponding bounded cohort.

## Current Product Comparison

Three GPT-6.1 Sol exploration agents reviewed independent areas: Alive workflow
and layout, Ultra authoring and rendering, and native/CI/cloud delivery. The
requested Terra 6.1 model is not exposed in this session; that substitution was
disclosed before dispatch. Their source basis is `1ebf216`.

Alive: inspected retained final MIDI Arrangement/Session native captures plus
the current review failure. Source confirms no Master gain/model. Two permanent
rows of source/placement fields and the stretched fixed-viewBox piano are
workflow gaps; empty space beside fixed-width tracks is not itself a defect.

Ultra: a fresh narrow current-binary Xvfb capture showed edit, eight-object
selection/Inspector, lock, console and entry states at `1280x840`. The Inspector
shows the first object's fields while reporting eight selected; there is no
common/mixed batch editor. Compact 24px objects and charcoal/amber treatment
already provide a useful baseline. These captures establish no Save/audio/Max
equivalence pass. Private originals and manifest:
`/tmp/alive-phase2-20261028/ultra-native/`.

Detailed exploration scratch reports remain at
`/tmp/alive-phase2-20261028/{alive,ultra,delivery}-exploration.md`.
Their conclusions and exact source seams are incorporated in the Phase 2 spec
and plan; those committed documents do not depend on these temporary files.
