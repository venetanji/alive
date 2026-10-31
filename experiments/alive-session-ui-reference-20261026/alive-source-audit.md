# Alive Session UI audit, 2026-10-26

Read-only scoped design assessment for a closer Ableton Live Session presentation. No source, index, build artifacts, tests or Wine processes were changed or run. Reviewed PRODUCT.md, the Alive Session surface brief, the approved workspace spec, current HTML/CSS/JS/model, relevant DOM/browser/native-driving tests, and retained actual application screenshots. This is a focused implementation audit, not the full Impeccable critique command or runtime acceptance.

## Recommendation

Improve the four real clip rows, compact control icons and mixer presentation first. The main visual gap is the use of ordinary rounded form buttons inside each clip cell. Preserve existing actions and identity semantics. More than four real slots per track requires a model/native/persistence change; blank decorative rows would misrepresent the current instrument host.

## Visual evidence

- Current Alive: `experiments/alive-workspaces-20261026/task1-fix1/native-final/native-session-1440x900.png`. It shows 174px track columns, four 44px rows, right-aligned 49px text launch buttons, separate empty-name buttons, 26px runtime text and a mixer with a small numeric gain field plus horizontal meters. Only about 100px of the piano roll is visible inside the default detail area because clip controls and two explanatory/header rows consume its upper portion.
- Actual Live playing MIDI clips: `experiments/alive-workflow-reference-20261024/35-a-running.png`. A narrow left launch segment and tinted clip body read as one cell; clip selection and launch remain separate hit areas. Header/clip colors are surfaces, not merely colored text. Empty cells are quiet grid cells. A dedicated stop/status row separates slots and vertical mixer. Right-side scenes align to the same rows. The visible launch state uses a triangle and border/background changes.
- Actual Live empty grid and device detail: `experiments/alive-live-reference-20261024/21-detail-restored-end.png`. Six visible empty rows are genuine Live cells; do not infer Alive capacity from them. The browser is a compact searchable library with original application icons and detail occupies roughly the bottom third. Track meters/faders have useful vertical height. Its sends, pan, record-arm, return tracks and main strip are outside Alive's current supported controls.

These frames establish visual organization and observed controls only. They do not establish audio performance or exact scheduling behavior. Parent is obtaining fresh Live evidence independently.

## Concrete gaps and actionable scope

1. **Clip launch and body (highest impact).** `apps/ultra/ui/alive.mjs:157` creates a Select button followed by a text Launch button. `apps/ultra/ui/alive.css:22` gives launch 49px on the right; `apps/ultra/ui/alive.css:34` leaves only 24px of control height in the 44px row. Put an original play triangle in a compact left segment, with the selectable clip name occupying the rest of the row. Remove the two rounded-button outlines in favor of a shared flat cell edge and a fine divider. Keep two actual button elements and their existing handlers/labels so selecting never launches. A 22-26px launch region still permits a wider clip name and stronger cell silhouette. Keep a readable status line or other explicit state text.

2. **Empty slots.** Current empty cells say `Empty 3`/`Empty 4` in the track color next to a visibly disabled Launch button (`apps/ultra/ui/alive.mjs:159`). Render the selectable body as a neutral empty grid cell; use title/accessible description for the slot number and create guidance. Preserve its enabled Select button and existing Create clip flow (`apps/ultra/ui/alive.mjs:183`). Keep its launch control disabled or visually absent. Do not add a record circle or empty-cell Stop action: neither behavior is implemented there. Existing explicit per-track Stop and scene empty-member Stop semantics are sufficient.

3. **Colors and runtime states.** Track color currently appears as a 2px top border and label text (`apps/ultra/ui/alive.css:21`, `apps/ultra/ui/alive.mjs:207`). Use restrained colored header bands and occupied clip fills with contrasting text. Keep empty cells neutral. Derive CSS classes/data attributes for empty, prepared, active/cued, playing and pending from existing values at `apps/ultra/ui/alive.mjs:174`; currently only selected has a class and all other states become tiny text at line 177. Selection outline, playback triangle and pending indicator must remain distinguishable without color. The active clip can be a prepared identity deleted in the draft, so preserve the full runtime output and its deleted-in-draft text.

4. **Compact original icons.** Existing original SVGs cover only Start/Stop (`apps/ultra/ui/alive.html:6`). Add original SVG/CSS marks for browser collapse, Session columns, unavailable Arrangement lanes, Clip/Devices detail, detail collapse, per-track Stop and scenes. Use actual button labels as accessible names and titles. M/S letters already work as compact semantic controls; do not replace them with unexplained imagery. Preserve icon consistency (roughly 14-16px, thin strokes, square edges), focus outline, disabled state and pressed state. File actions can stay text because they are already secondary chrome. Avoid copying Live assets or displaying unsupported record, sends, pan, capture, metronome or routing controls.

5. **Mixer.** `apps/ultra/ui/alive.css:34` packs functional controls into two short rows and leaves a large empty region below them because each track stretches to workspace height. Reuse the available space for the existing gain/meter relationship: a vertical visual stereo meter is straightforward CSS if the JS meter publication still writes width; changing to height requires updating that publication consistently. A true gain range/fader would add interaction and needs to synchronize exactly with the existing linear 0..2 numeric control and native mutation, so it is a second step. First-pass safe scope is better grouping, compact toggles, clearer linear gain label/value and a taller meter backed by real native peaks. Preserve gain's current spinbutton role and label if keeping the existing navigation tests intact. Do not add sends/pan/record-arm as visual filler.

6. **Browser and detail proportions.** Browser is a 180px explanatory pane (`apps/ultra/ui/alive.css:16`, `apps/ultra/ui/alive.html:13`), with only real Add instrument/Add effect file-picker actions. Give those two actions small original instrument/effect icons and concise copy. A searchable library would require an actual device index, so do not draw a nonfunctional search box or Live category tree. Default detail is 220px in CSS and workspace controller (`apps/ultra/ui/alive.css:33`, `apps/ultra/ui/alive-workspace.mjs:4`). Compress redundant margins/header explanation and put the piano roll higher; keep notes/automation inspectors secondary. The 220px initial resize value is asserted in DOM tests; changing it is possible but should be intentional and update those tests. Keep resize cancel, max clamp and footer/workspace reachability.

## Slot bounds: UI, model and native

| Layer | Current bound and evidence |
| --- | --- |
| UI rendering | Exactly four cells and four scenes, hardcoded `slot < 4`: `apps/ultra/ui/alive.mjs:121`, `apps/ultra/ui/alive.mjs:158`. |
| JS model | Stores native document/draft without independent slot validation: `apps/ultra/ui/alive-model.mjs:20`. It does not create extra backing slots. |
| Rust serialized model | Four nullable entries in `ClipBank` and `WireTrack`: `apps/ultra/src-tauri/src/session/clips.rs:11`, `apps/ultra/src-tauri/src/session/clips.rs:24`. Create/duplicate reject slot indices >=4: `apps/ultra/src-tauri/src/session/clips.rs:143`. |
| Desktop capabilities | `slotsPerTrack` is 4 for clips profile, 1 for legacy: `apps/ultra/src-tauri/src/session/desktop.rs:168`. |
| Native ABI/runtime | `ALIVE_SESSION_V3_SLOTS=4`, up to 32 clips: `apps/ultra/src-tauri/native/alive_session.h:129`. Each native track holds `slots[4]` at line 178; launch rejects slot>=4 at `apps/ultra/src-tauri/native/alive_session_clips.hpp:732`. |
| Profiles | Legacy admission is 2 tracks / 6 devices / 8 clips; admitted profile is 8 tracks / 16 devices / 32 clips: `apps/ultra/src-tauri/native/alive_session_clip_policy.hpp:26`. Four slots do not mean four clips have to be occupied. |

Visible V4 workspace scaffolding also uses four slots (`apps/ultra/src-tauri/src/session/workspaces.rs:55`, `apps/ultra/src-tauri/src/session/native_v4.rs:80`). Increasing visible slot rows honestly would therefore require coordinated versioned schema/ABI/runtime/action/scene/capacity/persistence work and native admission tests, not a CSS repeat count.

## Stable labels, selectors and semantics

- Keep IDs for transport/workspace/browser/detail/schedule controls, including `start`, `stop`, `view-session`, `view-arrangement`, `toggle-browser`, `detail-clip`, `detail-devices`, `toggle-detail`, `detail-resizer`, `tracks`, `scene-controls`.
- Keep `.track`, `.clip-slot`, `.track-mixer`, `.scene-row`, `.note-table>summary`, `.automation-section>summary` and `data-track-id`/`data-slot` hooks. Shape changes can introduce extra inner elements/classes.
- Keep accessible names `Select {track} track`, `Select {track} slot {1..4}`, `Launch {track} {clip}`, `Stop {track} track`, `Launch scene {1..4}`, `Prepared scene {n}`, `Scene {n} request`, `{track} clip runtime`, `{track} gain`, `{track} mute`, `{track} solo`, `{track} stereo peak`, `{track} peak`.
- Keep existing aria-pressed states; do not make a slot body click launch. Draft-only slots remain unlaunchable; prepared launch retains captured preparation revision. Scene launch preserves selection/focus and uses the prepared row; empty scene members stop only their tracks.
- Keep full `requestText`/`sceneText` receipt outputs. Tiny compact visual states must not erase queued/rejected/superseded/canceled messages, member outcomes, native refusal reasons or retry guidance.
- Use DOM APIs supported by the simple fake Element implementation in `apps/ultra/ui/alive-dom.test.mjs:192`; inserting SVG via existing `svgElement`/append is safer than a new innerHTML dependency.

## Appropriate verification for implementation

No tests were needed or run for this read-only audit. For changes, run the existing Alive DOM tests and focused browser suite, then capture actual native Session at 1440x900 and 1280x800 once per agreed bounded pass.

- DOM regressions: `apps/ultra/ui/alive-dom.test.mjs:71` checks 8 columns / 4 slots / mixer / 4 scenes. `apps/ultra/ui/alive-dom.test.mjs:84` checks scene launch purity. `apps/ultra/ui/alive-dom.test.mjs:124` checks empty selection, no mutation, draft-only behavior and launch identity. Line 133 checks actionable refusal text. Existing resize test starts from 220px and expects ArrowUp=>240px.
- Browser geometry: `apps/ultra/tests/ci/alive-chain.spec.mjs:111` checks matching scene/slot row positions and heights, internal horizontal scrolling to track 8, minimum workspace height and footer fit at both requested dimensions. Line 98 also covers 900x660 without whole-app overflow. Lines 124-188 cover uncommitted field values, native Tab navigation and reachable detail resizing.
- Native drivers depend on stable accessibility labels, not current visible Launch/Stop text: `apps/ultra/tests/check_alive_clips.py:57`, `apps/ultra/tests/check_alive_scenes.py:71`, and `apps/ultra/tests/check_alive_desktop.py:62`. Preserve those names when replacing visible words with icons.
- Add only meaningful presentation assertions if implementing new state classes: real occupied/empty counts; selected body emits no launch; launch glyph emits one existing native action; playing/pending classes follow native identities rather than draft name/order; disabled state survives icon replacement. Runtime tests need expanding only if capacity/semantics actually change.
