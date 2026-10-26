# Task 2D Desktop Integration Report

Status: complete Task 2D MIDI desktop slice; committed and frozen.
Commit: `4b9a88b721bba9728bb6b505e14cc4a14f7c8117`. Index verified empty.
Base: `ad706cae443df77781b27842097c590b547febd3`.
Evidence root: `/tmp/alive-workspaces-task2d-desktop`.
Parent native evidence: `/tmp/alive-workspaces-task2d-native`.

## Implemented slice

- Active strict v4 persistence, checked document metadata and actual device-chain
  adapters; no Document Deref, fake instrument, v4-to-v3 downgrade or audio
  admission. Existing v1/v2/v3 musical semantics remain explicit.
- Deterministic source compilation once per source, real source/slot/placement
  maps, endpoint duration `F(start + duration) - F(start)`, manifest checks even
  for disabled lanes, real dependency fingerprints/roles, whole native candidate
  validation before replacement and shared owner rollback.
- Shipping profile 1 is eligible with full MIDI authority/Arrangement features.
  Profile 2 remains unavailable. Native work policy, limits, scheduling,
  quantization, callback partitioning and clock are unchanged. The >=256-frame
  device recommendation is not a callback-size minimum and changes no settings.
- Focused authenticated workspace edits/actions/conversion, server-owned MIDI
  track identities, operation-primary returned IDs, retained musical history,
  real-chain controls/editor lifetime, explicit null runtime observations and
  bounded preparation-bound request receipts.
- Current Session/detail/mixer readers use v4 sources and actual device roles.
  Duplicate slots share a source; Make Independent creates distinct music.
  Play starts shared audio first and uses captured original identities. Queued
  mixer work captures track/generation; queued source gestures capture source
  identity and refuse an occurrence rewired by an earlier command.
- v3/v4 requests use one Runtime serial counter, matching the native ingress
  floor retained across preparation/mode changes. This corrects an observed
  v3-play -> conversion -> v4-Start refusal and covers the reverse transition.

## Deliberate boundaries

Audio sources remain refused before dependency reads. Timeline creation/editing,
waveforms, Arrangement interaction and the complete MIDI Task 4 journey remain
open. The Session view accurately reports real Arrangement playback and Return;
it does not claim a functional timeline editor.

The unchanged two-instrument template is valid old music but its complete v4
candidate refuses at observed 40 versus event limit 32. No automatic trimming,
limit change or profile-2 exception was introduced. A separate explicitly
authored progression admits two instrument tracks plus a Utility effect: split
triads, four chords at beats 0/2/4/6, and cutoff (1800/3200), integer level
(70/90), and Utility gain (.7/.9) automation at beats 0/4. Fixtures are
`fixtures/admitted-chord-progression-{v3,v4}.alive` under the evidence root.

## Verification recorded so far

- `56-rust-all.log`: 252 passed, 0 failed, 4 existing ignores. Tests cover active
  strict persistence/nested duplicates, shared-source parity, exact endpoints,
  disabled binding validation, missing/changed/incompatible dependencies,
  complete native admission/refusal while retaining old playing music,
  conversion/Apply controller rollback/history, real roles, authentication,
  primary IDs, null observations, receipts, and v3 -> v4 -> v3 serial continuity.
- `39-ui-green.log`: all 79 model/DOM/piano tests pass, retaining old fixtures.
  Real v4 DTO tests cover chain readers, source-addressed edits, draft-only
  launch refusal, source rewire race, Play sequencing/failure, empty audio
  chain/effect-first optional-instrument safety.
- `36-browser-all.log`: all 20 Alive Chromium tests pass; `43-browser-final.log`
  repeats the two v4 focus/navigation checks after source identity correction.
  Unfinished gain/note inputs survive polling/navigation; deliberate focus
  change commits once; Tab navigation preserves authority and pending music.
- `50-shipping-green.log`: measured shipping profile1 admission, profile2 refusal,
  v3 retention on refusal, malformed headers/canaries and shared ingress serial.
- `53-native-suite.log`: full original native + provisional MIDI/authority,
  envelope/oracle and callback-guard suite PASS, exit 0. Includes eight-track
  legacy capacity/concurrent publication and original queued-edit Stop stress.
- `57-native-v3-coherent.log`: untouched original native v3 journey PASS, exit 0,
  including separate apps, real instrument/effect editors, automation, piano
  history, file/dependency error recovery and original Cancel/Quit semantics.
  Original script/assertions/timeouts unchanged. Capture 4,221,952 stereo frames
  (87.9573 seconds), peak .353354; no endurance claim. Requested and observed
  512 frames at48kHz; final reported stream errors0/rejected0.

## Failures retained and interpretation

- `01-active-decode-red.log`, `03-prepare-red.log`, `08-ui-red.log`,
  `12-native-admission-red.log` record initial missing-slice failures.
- `04` source event parity initially compared per-source storage order with old
  globally sorted storage; parity now compares globally sorted copied event
  signatures without changing compilation or musical expectations.
- `06-host-compile-tests.log` was a loader failure: Cargo prepended the stale
  adjacent debug native library lacking the new ABI symbol. Tests were built
  with `--no-run`, then executed directly with the isolated native library;
  the old debug/installed libraries were not overwritten to hide the mismatch.
- `15-native-session-tests.log` retained the original template's correct native
  40/32 refusal. Separate authored fixtures were explicitly accepted by parent.
- `22-cutoff-level-admission.log` refused fractional level values, correctly
  enforcing the real integer manifest. The authored lane uses integer 70/90.
- `30-browser-v4.log` used an incorrect test expectation that deliberately
  focusing away from a numeric input would not commit. The corrected test
  separately establishes navigation preservation, one deliberate native input
  commit, and no further mutation from Tab workspace navigation.
- `33-source-identity-red.log` demonstrated queued automation following a slot
  after Make Independent. `39` is GREEN after captured source-ID validation.
- `28`/`34` native suite logs reached old staging assertions that all shipping
  v4 candidates are disabled. Only those eligibility assertions were changed
  to profile1 true/profile2 false; all work/oracle/refusal assertions remain.
- `42-native-suite.log` exposed serial reuse in a new shipping transition test.
  `48-shared-serial-red.log` independently reproduces the real Rust/native
  v3-play -> v4-Start failure. One owner serial fixes it; native monotonic
  ingress behavior is unchanged. `50`/`51`/`56` are GREEN.
- `44-native-v3-original.log` stopped at the original separate-app assertion
  because the isolated directory lacked Ultra. The coherent companion was
  built; original assertions/driver remain unchanged in rerun `57`.
- `47-editor-resources.log` is an invocation error from running a native-private
  test without its private wrapper; no resource-qualification claim is made.

Parent provisional run2 passed actual conversion, note undo/redo, automation
Apply, Arrangement -> Session -> Return -> scoped Stop -> Return, hosted editor
base/Automation distinction, save/Quit/process restart/reopen exact document
roundtrip and playback. Run1's raw pointer second Return did not submit; parent
retained it and reran with the established owned-window bounded pointer helper.
No product fix or proven product cause is claimed for that input observation.
Run2 recorded 18.048 seconds finite stereo capture, not endurance. Requested and
observed period was 512 at 48 kHz, no CPAL-reported errors/xruns, but one observed
callback exceeded its buffer budget. Concurrent heavy tests existed; causal
attribution is unproven. Do not infer physical underruns or zero-overrun timing.
Final parent run3-final passed with the refreshed build and actual prior v3
play/Stop before explicit conversion. It completed the full v4 Session/editor/
save/Quit/restart/exact-document/playback journey. Independently verified
747,008 finite stereo frames (15.562666667 capture seconds), peak .165784.
Final errors0/rejected0/voices0. Pre-Quit diagnostics observed four epochs at
requested/delivered512 frames,48kHz stereo, CPAL errors/xruns0 and overbudget0.
Maximum observed callback1,555,540ns (completed legacy epoch); active v4
maximum1,418,462ns over1690 samples. These are bounded software-loopback
observations, not endurance, physical-audio or universal-deadline qualification.
Prior run2 over-budget observation remains retained. Evidence:
`/tmp/alive-workspaces-task2d-native/run3-final` and sibling `run3-final.log`.

## Build attribution and launcher preservation

`qualified-build-pins.json` records the coherent candidate:

- Alive `d64e91d5a4716f913e27f4e6cc29dbb01594aac1ae63ff72c72ca650cea8badc`
- Ultra `077c8e2ca1b3f9ac338b46f567e753c4bb9526f98e00715f191ba05408bfa732`
- Native `389fbf4c2d4e25246bff32e2ca9cc6ff03fe5cdef334d9080c82bf109f9006d2`

Directory: `/tmp/alive-workspaces-task2d-desktop/app-qualified`.
`qualified-source-pins.json` hashes all modified and added source/test files.
Alive build52 and Ultra build55 include the same final production code; later
changes before source freeze add tests only. Builds use the isolated native
library and a separate reflinked target under `~/.cache/alive-task2d-target`.
The installed launcher binary/library were not replaced. The parent-preserved
usable launcher remains available at its original paths and backup.

## Handoff pending

Final parent v4 journey, self-review, full native suite and original v3 actual
app journey are complete. Scoped commit and empty-index freeze complete. Parent owns documentation,
reference/evidence and independent review. No push or release action performed.

## Reproduction commands

All commands ran from the worktree root unless noted. Full commands/output and
build pins are retained under the evidence root. The isolated native-suite
script differs from the repository script only in explicit ROOT/NATIVE_BUILD.

```sh
env ULTRA_NATIVE_LIB_DIR=/tmp/alive-workspaces-task2d-desktop/native cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib --no-run
env LD_LIBRARY_PATH=/tmp/alive-workspaces-task2d-desktop/native apps/ultra/src-tauri/target/debug/deps/ultra_desktop-6951be0eecdd253e --test-threads=1
node --test apps/ultra/ui/alive-model.test.mjs apps/ultra/ui/alive-dom.test.mjs apps/ultra/ui/alive-piano.test.mjs
bash /tmp/alive-workspaces-task2d-desktop/check-native-isolated.sh
env ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_BINARY=/tmp/alive-workspaces-task2d-desktop/app-qualified/alive ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-workspaces-task2d-desktop/native-v3-coherent
```

Browser command (cwd `apps/ultra/tests/ci`):
`./node_modules/.bin/playwright test alive-chain.spec.mjs --reporter=list`.
All listed final checks exit0. Native actual app scope is private Xvfb/software
PipeWire. Physical audio and long-running endurance are not qualified here.
Installed binary/library hashes were rechecked after qualification and match
the original parent-preserved launcher exactly.

## Task 2D Fix Round 1: I1 Queued Slot Fields

Base `4b9a88b721bba9728bb6b505e14cc4a14f7c8117`; review finding I1 confirmed.
A delayed rename followed by an offset edit sent the old name with the new
revision; the reverse order restored the old offset. Both caused accepted
sibling-field changes to be lost.

`workspaceSlotEdit` now captures the changed field and stable track/slot/source
IDs. After the existing workspace scope check, the queued resolver finds the
current slot and fills unchanged name/offset/loop fields from the latest
accepted document. Missing slots and changed source references refuse the edit.
The existing selection-token protection and current authenticated revision
attachment remain in the shared workspace edit queue. Rename captures its
source ID from its rendered control, matching the offset control.

Only `apps/ultra/ui/alive.mjs` and `apps/ultra/ui/alive-dom.test.mjs` change.
Tests use exact full-slot replacement semantics and defer the first native
reply. Both rename->offset and offset->rename must submit revisions0/1 and
retain both accepted values. Four additional cases verify queued name/offset
refusal after an earlier Make Independent or Delete. Existing source gesture,
selection, legacy mode and navigation regressions remain enabled.

Evidence: `/tmp/alive-workspaces-task2d-desktop/fix1`.

- `01-slot-orders-red.log`: both new delayed-order tests fail for the reported
  stale sibling values; exit1 before production changes.
- `02-slot-orders-green.log`: both delayed orders pass; exit0.
- `03-ui-suite.log`: all85 model/DOM/piano tests pass; exit0.
- `04-browser-focus.log`: both focused real Chromium v4 navigation/focus tests
  pass; exit0. Numeric event/listener behavior is unchanged.

Commands:

```sh
node --test --test-name-pattern='v4 queued slot' apps/ultra/ui/alive-dom.test.mjs
node --test apps/ultra/ui/alive-model.test.mjs apps/ultra/ui/alive-dom.test.mjs apps/ultra/ui/alive-piano.test.mjs
# cwd apps/ultra/tests/ci
./node_modules/.bin/playwright test alive-chain.spec.mjs --grep 'v4 navigation' --reporter=list
```

Scoped self-review and `git diff --check` pass. Per the fix brief, no unchanged
Rust/native suites, long desktop journeys or release builds were repeated.
Prior broad native evidence stays attributed to4b9a88b; this fix has focused UI
and browser verification. Task4's later integrated build supplies the next
broad native qualification. No push, subagents or unrelated changes.

Fix1 commit: `ee83d30d9d6aa725f14a76e97d684b533e5b7baa`. Index verified empty; both scoped source
pins unchanged after commit. Frozen for independent re-review.
