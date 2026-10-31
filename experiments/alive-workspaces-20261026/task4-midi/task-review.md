# Task 4 MIDI Arrangement Review

## Spec Compliance

- Substantively compliant; one minor default-value deviation is listed as M1. No missing core journey, unauthorized runtime expansion, or blocking misunderstanding found in `e38c87b66dae72ce19b8869b0f24ec9c277ae29e..91cb9d10a6ef0401b05154d58520310b7d7ff2c5`.
- `apps/ultra/ui/alive.mjs:281` exposes explicit source creation and placement as separate workspace operations; unplaced sources remain in the selector. `apps/ultra/ui/alive.mjs:217` resolves placement siblings at queue execution and checks original track/placement/source identities. Existing queued slot resolution remains present at `apps/ultra/ui/alive.mjs:206`.
- `apps/ultra/ui/alive-timeline.mjs:4` implements same-track movement, fixed-end trim and resize; `apps/ultra/ui/alive-timeline.mjs:9` refuses overlap and invalid suffixes; `apps/ultra/ui/alive-timeline.mjs:17` derives bounded, viewport-clipped marks from actual source notes. No waveform/audio-source implementation or runtime/capacity changes appear in this task.
- `apps/ultra/ui/alive-workspace.mjs:29` keeps navigation local and cancels timeline previews through the owner callback. `apps/ultra/ui/alive-timeline.mjs:122` submits only after pointer release and rechecks captured scope at queue execution. `apps/ultra/ui/alive.mjs:200` guards late-result selection with the captured selection token.
- `apps/alive/examples/midi-arrangement.alive:1` ships the admitted two-track v4 example with relative device paths; `apps/alive/src-tauri/tauri.conf.json:20` includes its resource mapping. The original New/v3 example is outside the changed file set.
- Cannot verify from this diff alone: native scheduler correctness, profile timing limits, one-clock/driver retirement guarantees and full Ultra lifetime behavior span previously reviewed unchanged components. This task reuses their existing interfaces; their prior qualification remains necessary.
- Cannot independently establish physical audio, endurance, exact callback-boundary timing, or installed-launcher coherence from the diff or screenshots. Retained native evidence supports the bounded software-capture journey; parent owns final documentation and launcher integration. Broad native full3 is correctly attributed to the pre-gain source; final gain has separate affected UI/browser/native evidence.

## Strengths

- `apps/ultra/ui/alive.mjs:217` extends the prior queued-slot fix consistently: only changed placement fields are captured, while unchanged fields are read immediately before authentication. `apps/ultra/ui/alive-dom.test.mjs:834` covers delayed sibling edits in both orders and subsequent deletion/independence refusal.
- `apps/ultra/ui/alive-timeline.mjs:85` preserves a prepared outline when pending placement geometry differs. `apps/ultra/ui/alive-timeline.mjs:102` paints authority, silence/gaps and pending Return from runtime observations without predicting success.
- `apps/ultra/ui/alive-timeline.mjs:47` routes direct Arrangement gain through the existing mixer. `apps/ultra/ui/alive-dom.test.mjs:871` holds that request while selecting another track and checks the originating track is still changed.
- `apps/ultra/tests/ci/alive-chain.spec.mjs:306` tests actual browser pointer geometry, cancellation, local zoom/scroll and occurrence history at both target sizes; the following field-preservation tests check retained input identity and zero mutations during navigation/polling.
- `apps/ultra/tests/check_alive_arrangement.py:181` retains and checks an actual admission refusal before explicit user-authorized trims, rather than changing capacities. Its later restart comparison checks complete saved-document equality and replays the authored occurrence.

## Issues

### Critical

None found in the pinned task range.

### Important

None found in the pinned task range.

### Minor

- M1 - `apps/ultra/ui/alive-timeline.mjs:53`: the duplicate destination always initializes to `p.start + p.duration`, even when another full occurrence cannot fit before song end (or occupies that destination). Selecting an occurrence ending at the song boundary therefore presents a guaranteed-invalid default. The integration map explicitly permits the adjacent default only when it fits. Backend refusal preserves music, so this is nonblocking; leave the destination unset or clearly require a destination when the adjacent candidate fails `placementError`, and disable Duplicate until a valid numeric destination is provided.
- M2 - `/tmp/alive-workspaces-task4-midi/31-native-full.log:15` and `/tmp/alive-workspaces-task4-midi/43-native-gain-final.log:26`: successful native evidence includes AT-SPI/atk-bridge warnings and repeated portal failures to connect to a Wayland compositor. These are private Xvfb desktop harness noise, not an observed audio/product failure, but the output is not pristine. Configure the private session's portal/accessibility services consistently or explicitly classify these known runner diagnostics in the evidence notes.

## Checks Performed

- Read the task brief, integration map, implementation report and prerequisite Task 2D review/fix verdicts. Read the supplied review package, recovering clipped sections in bounded output; no changed source file was reread, no git diff was regenerated, and no unrelated codebase crawl was performed.
- Read retained results: `38-final-ui.log` reports 101 passed / 0 failed; `29-browser-final.log` reports 32 passed; `35-gain-browser.log` reports 14 affected checks passed; `25-rust-all.log` reports 252 passed / 0 failed / four existing ignores; `17-native-suite.log` retains the native and Stop-stress PASS results.
- Read retained `31-native-full.log` and `43-native-gain-final.log`: both report their corresponding native journey PASS. Read `32-native-session-regression.log` final diagnostics: stream errors, rejected commands and active voices are zero. Read `40-source-pin-check.log` and `41-build-pin-check.log`: listed pin checks pass.
- No suites or focused reproductions were run: code inspection raised no blocking doubt requiring a new execution. No source/index/HEAD changes were made; only this coordination review was written.

## Assessment

Task quality: Approved, with nonblocking M1/M2 follow-ups.

The implementation keeps editing, prepared playback and observed authority separate, adds meaningful queued-identity and browser-focus regressions, and retains real native journey evidence with appropriate attribution limits. The minor invalid duplicate default and private-desktop diagnostic noise do not undermine accepted editing or playback behavior.
