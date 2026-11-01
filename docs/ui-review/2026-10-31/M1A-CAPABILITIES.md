# M1a capability map

Scope: source review at `b0f5d43bdee505d0c45b1b9e911bee227ade019b` and the Help-only change. This is a region-level map, not a command-by-command assessment of the 140 reference actions. Browser fixtures do not establish native audio behavior.

| Region | Current Alive ownership and limits | Evidence |
| --- | --- | --- |
| Help | Passive pointer/focus descriptions from explicit help, title, accessible names and region fallbacks. Visibility is local presentation state; no native command. | `alive-info.mjs`, `creative-info.mjs` |
| Browser and navigation | Search and catalog requests use the native browser catalog; device loads and drops validate availability. Session/Arrangement, browser and detail navigation are frontend presentation actions. | `alive-browser.mjs`, `alive-device-drop.mjs`, `alive-workspace.mjs`, `alive.mjs` |
| Clip / Device / Master | Existing Clip, Device and Master share one resizable detail area; Clip and Device are currently exclusive. Clip edits and device actions are native-backed with validation and accepted snapshots. Independent Clip/Device layout remains M1b. | `alive-workspace.mjs`, `alive.mjs`, `apps/alive/SESSION_CONTRACT.md` |
| Transport / mixer | Transport, launch, track gain/mute/solo and Master controls send native requests; state and receipts remain authoritative. | `alive.mjs`, `alive-master.mjs`, `apps/alive/SESSION_CONTRACT.md` |
| Reference-only / pending | Input routing, monitoring, arm and recording remain pending; installed Live candidates can be unavailable. The reference's returns, sends, multichannel and full menu inventory are not established as working by its screenshots. No new controls for these are introduced here. | `apps/alive/SESSION_CONTRACT.md`, `docs/ALIVE_UI_HANDOFF.md`, `IMPLEMENTATION-BRIEF.md` |

`Return` in the current UI means returning playback authority to Arrangement; it is not evidence of return tracks or send routing. The unresolved multichannel request remains a product question.
