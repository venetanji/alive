# Alive UI implementation brief — 31 October 2026

## Authority, deliverables, and limits

This document consolidates the user's iterative layout decisions through the latest instructions: the track-width `[` handle **only appears on hover**, narrow tracks reflow, and the new PR starts from clean updated main after the local session finishes pushing. The user requested small, systematic Terra-6.1 Codex work cycles, a new PR, preservation of the mockup and design work, parent review at milestones, and notification when ready to pull. It is not authority to merge, release, deploy, or expand audio/DSP work.

**The design drives the implementation, not vice versa.** Reorganize UI as needed while preserving existing real native behavior. Do not copy the prototype's architecture or layer its accumulated CSS overrides into production. No audio/DSP engine implementation belongs to these cycles.

Commit the original HTML study, extracted action inventory, and derived requirements/plan. Keep proprietary Live screenshots as **private visual inputs**, not published repository assets. Do not copy proprietary app assets/fonts/code. `references/` is a private input directory, not a directory to add wholesale. Use an explicit file allowlist when staging.

### Source of truth and verification status

- `Alive-layout-01.html`: current local original interactive study, latest local study (v17 checkpoint includes hover-only resize-handle correction; narrow-track reflow below supplements the artifact and is not fully implemented there). Filename is not a version number. Use local bytes supplied for M0, not an older downloaded revision.
- `Live-reference-actions.json`: 140 screenshot-derived actions, shortcuts, contextual state and source links. All Alive implementation statuses are initially `not_assessed`. It is an inventory, not proof that those commands exist in Alive.
- This brief: latest agreed decisions and precedence. If the prototype disagrees, report the discrepancy and follow the latest explicit user decision, not an older visual artifact.
- `REVIEW.txt`: historical first-review note, not the final specification; its mutually exclusive detail wording is superseded below. Preserve history but label it historical in any repository packaging.
- Baseline repository guidance: `docs/ALIVE_UI_HANDOFF.md`, `apps/alive/SESSION_CONTRACT.md`, and relevant current AGENTS instructions. Reconcile against fresh source before making exact implementation plans.

**No browser-render, interaction, native runtime, or audio validation of this mockup occurred here.** Limited source/syntax/ID checks are not visual or behavioral proof. Local serving/browser attempts hit environment boundaries; no sandbox bypass is authorized. Workers must render and test in their actual supported environment and report unavailable checks honestly.

## Branch integration and initial checkpoint

The inspected main baseline was `df8329e4eefadce254377b74c236cb98d5a98cfa` (merged PR #6). Do not assume saved environment refs are current.

Other UI work now exists:

- [PR #7](https://github.com/venetanji/alive/pull/7): draft, branch `design/alive-ui-structure-20261031`, inspected head prefix `1bca10ce`, based on the above main. Older File/Add disclosures and permanent Info/footer placement are not the final layout contract.
- [PR #8](https://github.com/venetanji/alive/pull/8): branch `design/ultra-ui-structure-20261031`, inspected head `79797247e38d61d57c393051d46b1e1008d84b13`, stacked on PR #7. Shared `creative-shell.css` / `creative-info.mjs` may matter. Author-reported checks are not this parent's independent runtime verification.

**Verified integrated baseline:** `32e73d9ae41aadda80037d747d515b85e4349e35` on main, checked 31 October 2026 at 15:56 UTC. PRs #7/#8 and #9 (via #11) are merged. GitHub ancestry check confirms PR #9 head is contained in main. The new PR starts from this clean main, not an old stacked branch.

The parent commits this original design packet and small-cycle plan first. Terra-6.1 starts from that exact published commit. Each cycle implements one bounded slice, runs relevant regression and visual checks, commits, pushes, reports evidence, and stops for parent milestone review. No merge or release. Raw reference screenshots remain private.

## Agreed layout and interaction contract

### 1. Global shell and transport

- Spatial hierarchy: global controls top; Browser left; Session/Arrangement central; contextual Clip/Device detail below; contextual Help/Info bottom-left.
- Include an application menu bar: File, Edit, Create, Playback, View, Navigate, Options, Help. Wine hiding the menu is a user hypothesis, not an established diagnosis.
- Compact toolbar/button height. Reproduce the reference groups and density, not oversized web buttons. Use original icons; phase-nudge icons are straight vertical lines with different spacing, not arrows.
- Reference toolbar groups left to right: Browser/config; Link/options, Tap, tempo, phase nudge down/up, time signature, metronome/options, launch quantization; Scale Mode/root/scale; Follow/song position; Play/Stop/Arrangement Record; MIDI Arrangement Overdub, Automation Arm, Re-enable Automation, Capture MIDI, Session Record; Punch-In/Loop/Punch-Out; Draw, Computer MIDI Keyboard, Key Map, MIDI Map, sample rate, CPU/status/MIDI indicators; Session/Arrangement switches.
- Audit every proposed control against real command/state support. Preserve working controls; clearly disable/document unavailable ones rather than simulate production functionality.
- Alive and Ultra should share visual language/settings philosophy where already appropriate, while retaining distinct hierarchy (Live-like Alive, Max-like Ultra). Inspect shared consumers; this is **not a full Ultra redesign**.

### 2. Browser

- Search, categories, expandable devices with **presets nested inside devices**, filter sections above content, tags and audio-preview area below.
- Hide/reopen and resize; support the intended full-height configuration. Restore useful previous sizes.
- Do not replace Help with arbitrary create/action buttons. Reference categories do not prove all corresponding providers or preview engines exist.

### 3. Lower detail panels and Help

- Clip and Device toggles live in the **footer**, independently toggleable rather than exclusive top tabs. Clip toggle includes a miniature clip overview preview.
- When both open: **Clip spans the full row above**; bottom row contains **Help on the left and Devices on the right**. Help must not span both rows.
- Support clip-only, device-only, both, and hidden detail states; resize, maximize, collapse and restore prior useful sizes. Help can be hidden independently.
- `?` toggles Help outside editable fields; a visible question-mark control may also remain.
- Clip options respond to **panel geometry**: short detail panel uses horizontal option selectors/groups even at compact scale; tall/narrow inspector uses a vertical accordion. Inspector divider is adjustable. Do not implement a width-only breakpoint that loses the short-panel horizontal mode.
- Some devices can expand a device-specific editor **above the normal rack**. This is a capability-driven extra region, not merely a taller rack. Wavetable envelopes/LFOs are a visual example, not a request to implement Wavetable synthesis.

### 4. Track geometry, routing and scrolling

- Compact track strips and clip controls; eliminate label-driven accidental widening.
- Regular tracks scroll **horizontally**. Returns remain docked on the right beside Master; all must remain reachable.
- Only clip slots and Master scene rows scroll **vertically**, in synchronization. Headers, routing, sends and mixers remain pinned/aligned. Do not vertically scroll the entire strip.
- Narrow tracks must **reflow**, not merely clip, uniformly shrink, or overlap. Latest reference `image(20261031-152851).png` shows approximately 68 px audio strips: shortened labels (A. Fr., Mon., A. To), compact routing dropdowns, a Monitor Off dropdown replacing In/Auto/Off buttons, compact pan/center readout, right-side fader without the full numeric scale, left-side activator/solo/arm, and truncated track names. Validate minimum, intermediate and wide per-track widths; capability and accessibility remain intact. Current mockup does not fully implement this latest refinement.
- Per-track draggable width separator has a bracket `[` icon between tracks; **the icon appears only on hover**, not permanently. Preserve usable hit targets and keyboard accessibility without introducing a permanent visual bracket. Prototype default 108 px and 72–280 px range are study values, to validate against real content rather than freeze as a backend contract.
- Fader arrangement: slim pointer beside meter; separate pan/activator/solo/arm controls. No bright native orange range thumb or overlapping widgets. Distinguish mono and stereo meter lanes.
- MIDI track without an instrument uses round MIDI event-activity dots and MIDI routing, not audio pan/fader/sends. Instrument-loaded MIDI track outputs audio. Do not show a piano editor for an empty track with no clip; a real zero-note MIDI clip still has an editor.
- Routing hierarchy includes MIDI/Audio From, channel, Monitor In/Auto/Off, MIDI/Audio To and applicable secondary routing. Show only supported native routes as functional.
- Lower track controls include track delay/Keep Latency, A/B crossfader assignment and performance bars where supported.
- Bottom-right mixer configuration menu opens upward: In/Out, Sends, Volume, Track Options, Crossfader, Performance Impact, Return Tracks. Sections are individually hideable.

### 5. Sends — latest correction wins

Use `image(20261031-152208).png` as definitive geometry:

- **A knob upper-left; “Sends” label upper-right on that same first row; B knob below-right.**
- Additional knobs continue staggered (C left, D right, E left), without widening the column.
- The label is not a full-width row above all knobs; sends are not a single vertical list.
- Historical prototype coordinates (A left 13/top 4, label left 45/top 5, B left 43/top 25; two-send block 60 high) document intent only. Validate rendered geometry with actual production typography and minimum-width strips.

### 6. Recording affordance

On **empty slots in armed tracks**, stop squares become record circles; clicking the circle is intended to start clip recording. The mockup only simulates a red “Recording…” state and clears it on Stop: it captures no MIDI/audio. Wire real behavior only if the current backend supports it correctly, including acknowledged state and errors. Otherwise show an honest unsupported/planned state and report the gap. Do not add a recording engine or claim fake UI state is recording.

### 7. Scrollbars and input

The user explicitly retracted “no scrollbars ever.” Current requirement: **slim scrollbars, visible while scrolling only, then fade/hide**. Prototype 4 px / 850 ms values are illustrative. Keep wheel, trackpad, keyboard and pointer accessibility. Avoid page-level unintended overflow.

### 8. Menus, command inventory and keybindings

- Map inventory commands to actual Alive actions before enabling them. Preserve separators, shortcuts and contextual check/disabled semantics; a disabled reference item is only disabled in that captured context.
- Expanded View menu was not captured; its mockup entries are provisional. Edit capture is incomplete. Do not infer hidden submenu contents.
- Distinguish focus from visibility: Navigate Alt+3/Alt+4 focus Clip/Device; Ctrl+Alt+3/Ctrl+Alt+4 show/hide are separate actions to validate against current command routing and platform constraints.
- Distinguish Ctrl+Tab (Envelopes) / Ctrl+Shift+Tab (Expression) from Tab / Shift+Tab workspace/detail switching. `?` is the user's explicit Help requirement, not a transcription from the Help menu.
- Do not intercept normal text entry or carelessly override browser/OS shortcuts. Respect editable targets, platform modifiers and focus ownership. Prefer one command registry driving menu, Help documentation and keyboard handling, without forcing unrelated architecture changes.

## Superseded or unresolved decisions

| Earlier interpretation | Current decision |
| --- | --- |
| No scrollbars ever | Thin, transient scrollbars visible while scrolling |
| Exclusive Clip/Device top tabs | Independent footer toggles; clip preview in footer |
| Help fills both detail rows / permanently occupies footer | Help only bottom-left alongside Devices, below full-width Clip, independently hideable |
| Whole track strip scrolls vertically | Clip slots/scenes only; pinned mixer/routing/headers |
| Tracks clipped with no side-scroll | Regular track bank scrolls horizontally; returns/master docked |
| Sends single column or label full-width above dials | A upper-left + label upper-right same row, B below-right; more sends stagger |
| Always-visible resize bracket | Bracket only appears on hover |
| Mock recording is implemented recording | Prototype simulation only; native capability must be verified |
| Short/narrow clip inspector always vertical | Short mode horizontal, tall/narrow mode vertical |
| Mockup architecture/CSS overrides as production template | Design reference only; map cleanly into actual architecture |

“Multitracks out of the box” followed discussion of MIDI versus mono/stereo. Whether this means multichannel tracks (surround/ambisonics/etc.) remains **unanswered**. Do not invent channel counts, route formats, metering semantics or engine requirements. A compact expandable multi-channel proposal was not an accepted implementation spec. Report as an open product decision without blocking unrelated UI work.

## Functional status matrix (must be updated from evidence)

| Area | Reference/prototype status | Production acceptance / evidence required |
| --- | --- | --- |
| Shell/panel resize/toggle geometry | Source-level mock interactions, not runtime verified here | Rendered combinations + resize/restore tests; no musical state mutation |
| Track scroll/docks/sends/bracket | Latest source study and user visual direction | Narrow/wide viewport screenshots; independent horizontal/vertical scroll + alignment assertions |
| Browser nested devices/presets/search | Illustrative data | Existing catalog/search/drop/provider integration preserved; no fake enabled results |
| MIDI dots/audio meters/routing | Illustrative distinct track types | Native capability/state-driven presentation; route acknowledgements unchanged |
| Empty armed clip recording | Fake recording UI only | Existing native recording verified, or explicit unsupported state |
| Clip/editor/preview | Illustrative editor | Real selected clip/source, audio waveform vs MIDI editor and zero-note/no-clip distinction |
| Expanded device area | Visual study | Existing supported device capability only; shared surface consumers regressions tested |
| Transport/automation/scale/mixer options | Mix of illustrative controls and existing app capabilities | Per-command supported/planned/disabled classification and genuine state wiring |
| Menus/140 inventory actions | Session 5 assessment: 20 supported equivalents, five unavailable, 115 proposed/unverified | See Live-reference-actions.json for evidence and scope caveats; no claim all are implemented |
| Native audio/DSP | Not exercised; out of scope | Preserve existing contract; do not infer audio proof from screenshots/UI tests |
| Multichannel tracks | Unresolved user intent | Clarification/explicit later scope before engine work |

## Production invariants and likely source mapping

Re-read current source: filenames below describe the inspected baseline, not a guaranteed future API.

- `apps/ultra/ui/alive.html`, `alive.mjs`: shell, IPC queue, native polling, accepted snapshots.
- `alive-shell.mjs/.css`, `alive-workspace.mjs`: transport, Session/Arrangement/detail structure, sizing, unfinished input.
- `alive-model.mjs`, `alive-workspace-edits.mjs`: document/runtime distinction and musical edits.
- `alive-browser.mjs/.css`, `alive-device-drop.mjs`: catalog/search/category/drop behavior.
- `alive-timeline.mjs`: Arrangement selection, placements, loop and playhead.
- `alive-clip-view.mjs`, `alive-piano.mjs/.css`, `alive-midi-preview.mjs`: clip/waveform/piano/gesture/audition.
- `canvas-presentation*.mjs/.css`, `live-controls.mjs/.css`, `components/`: shared Alive/Ultra device surfaces/controls; inspect all consumers before edits.
- `alive-master.mjs`, `audio-settings.mjs`; PR #8 shared creative shell/Info modules.
- `apps/alive/src-tauri`, `apps/ultra/src-tauri/src/session`: native integration is not redesign material for this UI scope.

Preserve selection/navigation/search/resizing as non-musical actions; never launch clips incidentally. Preserve unfinished edits through focus/navigation, without incidental blur commits. Keep clip contents, source bounds/loop, placements and song loop distinct. Preserve per-instance parameter identity and gesture ownership; no stale gesture may retarget a different device. Preserve revision checks, queued publication/acknowledgement, rollback, Undo/Redo and PCM ownership/lifetimes. UI affordances must not bypass validation or optimistically claim rejected native state. Known backend gaps (including returns) must be recorded, not hidden behind mock controls.

## Small-cycle execution and review gates

One bounded implementation slice at a time; avoid parallel overlapping UI edits. Each cycle records exact files, intended behavior, non-goals, tests, before/after screenshots and remaining gaps. Parent reviews each milestone against this brief before authorizing the next slice. Split any milestone below further if it cannot be safely reviewed as a small diff. Keep PR draft until the final review; no merge.

| Gate | Scope | Required exit evidence |
| --- | --- | --- |
| **M0 — artifacts and plan only** | Inspect fresh main, PR #7/#8 and other open UI work; after the local push checkpoint, create an isolated branch from clean updated main (not stacked on PR #7/#8); commit original mockup, action registry, this brief and source-mapped plan; new draft PR | Actual base/head/dependencies; allowlisted artifact diff without private screenshots; syntax/reference checks; production capability/gap inventory; proposed first tiny slice. **Stop for parent.** |
| M1 — shell/panels | Compact menu/transport shell; independent panel/footer layout and Help; split shell and panel state if needed | Panel-combination viewport matrix; restore/maximize/resize/Help typing checks; no musical behavior changes |
| M2 — track geometry | Compact strips, sends, pinned sections, clip-only vertical scroll, horizontal bank/docks, hover bracket | Minimum, intermediate and wide strip screenshots with responsive reflow; scrolling sync/alignment; hover/pointer/keyboard resize checks; track-type distinction; unsupported returns/recording honestly classified |
| M3 — Browser | Nested device/preset hierarchy, search/filter/tag/preview layout | Existing catalog/search/drop tests; supported preview only; hide/resize/focus behavior |
| M4 — Clip/Device | Adaptive clip inspector, footer overview, supported expanded-device region | Short/horizontal vs tall/vertical screenshots; both rows/open states; audio/MIDI/no-clip/zero-note cases; shared Ultra regression checks |
| M5 — menus/keys | Incremental registry mapping and supported action wiring; Help documentation | Supported/planned/disabled matrix; context state and shortcut tests; editable-field/OS conflicts checked; no invented View/hidden submenu reference claims |
| M6 — integration QA | Full current branch review and regression fixes only | Relevant unit/browser checks, supported native smoke, rendered comparison, capability gap list, final PR summary and parent approval; user notified ready to pull, not merged |

Suggested baseline commands to confirm against actual repository configuration:

```sh
node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs
# From apps/ultra/tests/ci, with the expected frontend fixture server available:
ALIVE_TEST_PORT=4197 npx playwright test alive-chain.spec.mjs alive-clip-regions.spec.mjs canvas-instrument.spec.mjs --reporter=list --output=/tmp/alive-ui-review
```

Use current fixture/openSession helpers and matching example documents. A static fixture is not native audio proof. Run Chromium with its sandbox enabled; if the environment prevents browser execution, report that exact limitation and do not mark visual acceptance complete. Add targeted tests per slice rather than relying solely on old suites. Native smoke commands/build prerequisites must come from current repository instructions; do not mutate frozen libraries or claim an old build validates new UI.

Final review includes at least: Browser open/closed; Clip only, Device only, both, neither; Help shown/hidden; short and tall detail; expanded supported device; narrow/wide window; many tracks with returns/master; one and several sends; minimum/resized track widths; armed/unarmed empty slots; MIDI-only/instrument/audio tracks; menus and keyboard with focused text inputs; transient scrollbar appearance. Verify that every visible action has an honest functional status.

## Private screenshot index

All names below are relative to the private `references/` folder. Use for human visual review; **do not publish these source captures with the PR**. Inventory source paths may remain documentary references even when private files are excluded.

| Filename | Intended use |
| --- | --- |
| `image(7).png` | Full global toolbar grouping/density |
| `image(8).png` | Full Live Arrangement/Browser/device spatial organization |
| `image(9).png` | Browser categories, filters, nested Analog presets, tags and preview |
| `image(10).png` | Short Clip panel: horizontal option groups |
| `image(20261031-141813).png` | Tall/narrow Clip inspector: vertical accordion |
| `image(20261031-142011).png` | Wavetable expanded envelopes/LFO region above rack; geometry only |
| `image(20261031-142215).png` | Track routing, monitoring, sends and faders |
| `image(20261031-142602).png` | Bottom-right upward-opening mixer configuration menu |
| `image(20261031-142603).png` | All mixer sections open |
| `image(20261031-143128).png` | **Anti-reference:** earlier bad mockup orange faders/overlapping controls |
| `image(20261031-143353).png` | Phase-nudge straight-line icon closeup |
| `image(20261031-144059).png` | MIDI event dots versus audio strip controls |
| `image(20261031-145438).png` | Many returns, send staggering and strip hierarchy |
| `image(20261031-145439).png` | Full-width Clip above Help + Devices, footer toggles and clip overview |
| `image(20261031-150503).png` | File menu inventory |
| `image(20261031-150504).png` | Create menu inventory |
| `image(20261031-150505).png` | Edit menu inventory, incomplete scrolling crop |
| `image(20261031-150507).png` | Help menu inventory |
| `image(20261031-150508).png` | Options menu inventory |
| `image(20261031-150509).png` | Navigate menu/focus shortcuts |
| `image(20261031-150510).png` | Playback menu inventory |
| `image(20261031-150511).png` | Menu-bar/Help crop; **not an expanded View menu** |
| `image(20261031-152851).png` | Latest narrow-track responsive reflow: abbreviated routing, monitor dropdown, compact pan/fader/control geometry |
| `image(20261031-152208).png` | **Definitive latest sends geometry:** A left/label right on first row, B below-right |
