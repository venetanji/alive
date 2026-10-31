# Task 8 implementation and evidence

Candidate `5b10db9788d636ec2624fdc933293a1b9c8292e3` is frozen in `/home/venetanji/.codex/worktrees/bb01/alive`, on accepted base `c71b60805e0e877915fb2b9efaf83b479252d5e3`. Commits are `1934f36`, `f06dea4`, and `5b10db9`; the cumulative binary diff SHA-256 is `1c4496982c76467eb69687301ee8c43c4346be60af7cc6b00d98af4ca185e3b8`. The tracked worktree is clean; its original untracked evidence remains. This is a review candidate, not independent acceptance or integration. No native, ABI, capacity, device, build workflow, dependency, licensed asset or system-setting source was modified.

## Implementation

The Session Master and Arrangement output lane share one bounded producer and native `master` DTO. It retains validator exports, serial comparison, failure-shaped code handling, one in-flight operation, one replaceable pending gain, one reset, one retry timer and generation cancellation. The views expose linear gain, dB, pointer/keyboard/numeric editing, unity, overload reset, separate native interval peaks and saved/admitted/pending/applied/unavailable/stale states. Master is a local output selection; it is not a fabricated track. Navigation keeps musical selection, text and device nodes; both originally failing Arrangement relocation and repeated-selection parking were corrected without removing assertions.

Session uses 28px headers, four 24px slots/scenes, 128px default adjustable columns, a 220px adjustable browser and a sticky 128px Master. Arrangement controls are at right, output controls in the right end of a bottom lane, and the original source/placement fields in selected detail with labels and beat units. Unfocused track-gain display rounds to three decimals for readability; exact value remains in the title and focused input/native value is not rounded. Original SVG controls and flat fader rails remain. No pan, sends, audio clips, effects or automation were added.

Changed files and final SHA-256:

```text
e4a87c30c71a35016a7828d72d053248c056e0c0f2fc967728f4c6f21d4c3eb1  .impeccable/surfaces/alive-session.md
d143d5071b60839b668a33fe63428dbcbf98c0118fe4220bdfba1d47515ee7ab  DESIGN.md
979ae6c1dcf5c488bf2c443c171755ee90f3b2b9079559f56aaa4505c99caa1f  apps/ultra/tests/ci/alive-chain.spec.mjs
5e862d96395d922fefedde740b642dcfcda5fadbb793d07b823e987606d0d827  apps/ultra/ui/alive-dom.test.mjs
e9da23e78c2eb4981d5d2d3c11b3c81762e9459b3b0bb23480eda7d47d7ce16b  apps/ultra/ui/alive-master-producer.test.mjs
76f3b1779af74c78701e5b5fb3822e989e1fc81f3f4ce12df6f5232dab128745  apps/ultra/ui/alive-master.mjs
29037754f5ec0407490bfd279316417ef3b3e364af6795ea0142a8a5d921bb6e  apps/ultra/ui/alive-timeline.mjs
5d4b0e05e3455d43cbc322cd22bef9105f2d2ebb52322942eccf3d353e832107  apps/ultra/ui/alive-workspace.mjs
9cc544c41d6cc285af764015643c2836a0186fda8d1aec579d4cf608778a3f11  apps/ultra/ui/alive.css
9eca2dd4102c2eeb90109b45bc19970ddc74cfed2938d1550a6b25a572d94dab  apps/ultra/ui/alive.html
d70a3c5866cd1bef5c8496a763b637f36c9ebc8b7b24fa21925a25c2e0a3d8b3  apps/ultra/ui/alive.mjs
```

## Red/green and final checks

Evidence is retained under `task8-evidence/` beside this report, including scripts, logs, original screenshots, failure contexts and final browser screenshots. The earliest producer run failed at missing export (an import error, not behavioral red). Subsequent real assertion reds cover malformed/zero serial, unavailable generation, permanent refusal retaining gain, absent rendered Master, premature Arrangement commits, parked selection/caret, generation cancellation, meter/mark overlap and long numeric gain. Corresponding green logs include `serial-green.log`, `arr-source-green.log`, `generation-green.log`, `arr-overlap-green.log` and `gain-green.log`. The initial full browser run reported eight early Arrangement edits after relocation; its retained contexts are in `arrangement-relocation-failures/`; the full later run retains the original assertions. No original assertion was removed. The old fixed track width expectation changes from 146 to the approved 128 pixels.

- `node --test apps/ultra/ui/alive-*.test.mjs`: 130 passed, zero failed (`node-5b.log`).
- `ULTRA_TEST_NO_CAPTURES=1 npx playwright test alive-chain.spec.mjs --reporter=list --output /tmp/alive-task8-browser-5b`: 51 passed, zero failed (`browser-5b.log`, captures in `browser-5b/`). Original Arrangement source/placement/Return, real pointer/history regression, Stop, pending, editor and focus assertions remain in the suite.
- `git diff --check`: clean. `bash apps/ultra/build.sh`: succeeded (`build-5b.log`, existing compiler warnings). Native binary SHA-256 `7073b40333762042a15b9469658d23acea23fb56acf7a96850af72c4d9407ebc`; adjacent loaded `libultra_native.so` SHA-256 `3b031af38becf353fec0fa67722079a369beff30f315541e1204d6990709049b`, matching build copy. `5b-v4/master-actions.json` and `5b-v3/master-actions.json` record the actual executable and mapped module path/inode/digest.
- Impeccable context and craft floor were used; the detector ran once (`impeccable-detect.json`), reporting existing compact-spacing/type and design-sidecar advisories. The newly introduced output text was raised to the brief's 11px label size after that report. The existing design sidecar remains stale and was not regenerated. The supplied approved brief substituted for an interview, as instructed.

## Original native/WebKit and Chromium proof

Using `ULTRA_TEST_ALIVE=1`, private `ULTRA_TEST_SCREEN_SIZE=1600x1000`, the existing `check_canvas_desktop.sh` private Xvfb/software-PipeWire wrapper, staged v4 MIDI Arrangement or the eight-track/sixteen-device v3 fixture generated by `alive_capacity_session.py`, and retained `native_master_final.py`, the exact binary passed the focused actions. The helper uses native AT-SPI/XTest, not injected IPC. It captures at 1440x900 and 1280x800 after moving the pointer to neutral chrome and waiting; earlier captures with tooltips remain under `native-v4`, `native-v3`, and `final-v4`.

- v4 and max-v3 Session: actual Pulse and Master pointer drags moved in both directions. At 1280 v4, both gain rails were y=316, height=99 and both meters y=314, height=75; at 1440 both rails were y=316, height=199 and both meters y=314, height=175. Max-v3 at 1280 had matching rail y=291, height=124 and meter y=289, height=100. The helper asserts matching native boxes at both sizes. At 1280 after native horizontal scroll, Track 8 was x=1047 width=104 and Master x=1153 width=127.
- Both profiles admitted and observed zero/-inf, unity and overload reset with audio off and a zero-length interval. In v4 Arrangement, a real pointer drag moved both directions and numeric 0.5 displayed saved and applied -6.0 dB. A separate exact-head playing run observed L 0.060 and R 0.060 in sequential UI reads, then 0.5 admitted/applied and Stop clicked (`5b-playing/playing-master.json`). Those separate reads are not a claim of a simultaneous pair or PCM proof.
- Chromium covers both sizes, v4 two-track and max-v3 fixtures; exact slots/scenes, header/browser/column widths, rail and meter baselines, scroll extremes, right-hand Arrangement positioning, no page overflow, Stop reachability, matching two-view input/peaks/latch, pending/reset refusal, numeric validation, double-click, keyboard, pointer, generation cancellation, stale/unavailable states, resize and parked caret/binding. It exercises original Arrangement gestures and history. Final native screenshot hashes:

```text
f6aed266250bcc531b2023adc0bd1cbdaecb093ef6d62e9729999f99c0e8793e  5b-v4/session-1280x800.png
0d714f0ab77c8fe3037017d849afb1ceabfe4ac83b7b3914666b9e1e3cc75707  5b-v4/session-1440x900.png
d8e22b50fe7d9bb8c2ec4788486cee8a88c222c853a15d1cf8252a5066584829  5b-v4/arrangement-1280x800.png
c151de8d4535c3ee1dbec056942ff555c23607e87172e25e4bf6ba3a745cee8b  5b-v4/arrangement-1440x900.png
0ad6a0095c8e09eb93e4ede824108fbc20c4437e47c328a788e55d43d2728027  5b-v3/session-1280x800.png
0ed358a578a3a39d6583b8bee8272fa18fdca27b5cf507bdc405a7517323cc49  5b-v3/session-1440x900.png
4b855132e557625c2cc0343339f8b39a2da76168a74e63148ba8f7f2f6932bef  5b-v3/session-1280-right.png
```

Native clips were not captured as PCM; screenshots and sequential displayed observations do not establish physical output, physical clipping, timing, persistence or endurance. This focused native run is not the full original save/Quit/restart journey; Task 9 owns that gate. Prior Task 7 four dense8track/1024 excursions and failed provisional v4profile2 probes remain evidence-qualified; paired repeats do not identify cause, and all-profile deadline/physical/endurance/foreign-runtime claims remain open. No push, merge, tag, release or deployment occurred.

All owned build/browser/GUI/software-audio runs have completed; the private wrappers cleaned up. A final process search found no owned Xvfb, private PipeWire, browser server, native Alive, or test driver. The exclusive runtime/source lease is released to root for independent review and serial integration.
