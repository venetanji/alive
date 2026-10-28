# Alive / Ultra Development Review, 2026-10-28

Reviewed and built `1ebf2161e0fa2a62484566fac65c7e940567f357` on
`feat/alive-session-host`. Upstream fast-forwarded from `ea8e401`; the one
incoming commit changes documentation only. Release foundation remains
`31033483`. PR #6 remains open and draft. No application fixes are included in
this review checkpoint.

## Bugs To Fix First

### P1: queued source edits can affect the shared original after independence

`apps/ultra/ui/alive.mjs:202` authenticates queued workspace operations against
the latest revision without checking the originating occurrence/source pair.
Add note (`alive.mjs:554`), source length (`alive.mjs:298`) and source rename
(`alive-timeline.mjs:48`) capture the previous source ID.

Select an Arrangement placement, click Make placement independent, then Add
note before the first request finishes. The independent source keeps 12 notes;
the original source, still used by Session, gains note 13. The same ordering
changes the original length or name while leaving the selected independent
source unchanged. No error is shown. The backend accepts the still-valid old
source ID, so checking revision alone does not prevent this.

Preserve and check the originating occurrence/source relationship at execution,
as the existing note-update and placement-update routes do. Preserve valid
queued sibling edits. Reproducer: `repro-ui-queues.mjs` in the evidence directory.

### P2: device base edits can cross Open into the replacement project

`apps/ultra/ui/alive.mjs:442` captures instance/value, but its queued `command()`
reads generation at execution (`alive.mjs:20`). Start Open, then edit a still
visible Cutoff field before Open finishes. If the replacement project reuses
the instance ID, the edit from generation 1 is sent with generation 2 and
changes the replacement project. Reproduced cutoff 1717 with a normal success
notice. Capture the originating generation, following the existing mixer path
at `alive.mjs:386`. Reproducer: `repro-ui-queues.mjs`.

### P2: Ultra Save/close can omit focused numeric text

`apps/ultra/ui/canvas.mjs:631` and `canvas.mjs:632` flush the controller queue,
while numeric text remains local until change, Enter, Tab or blur
(`canvas-node.mjs:141`, `canvas-node.mjs:145`, `canvas-node.mjs:158`). Ctrl+S is
handled while that field is focused (`canvas.mjs:571`).

Type 42 over saved value 10 without committing, then press Ctrl+S. The mounted
production UI sends a save snapshot containing 10, displays 42 and reports no
owner dirtiness; there are zero commit requests. Its close-flush callback also
acknowledges completion with 10 still authoritative. Save/close preflight must
commit or explicitly resolve field drafts. Native disk-save/window-close
confirmation remains necessary. Reproducer: `ultra-focused-save-repro.mjs`.

### P2: repackaging silently discards instrument presets

Perform keeps Package instrument enabled for packaged instruments
(`apps/ultra/ui/canvas-device-panel.mjs:59`, `canvas-device-panel.mjs:99`).
`apps/ultra/ui/canvas-instrument.mjs:13` replaces the manifest, empties presets
at line 21 and adds one Init preset. Repackaging the supplied Subtractive as
Renamed synth changes `[Init, Soft, Pluck]` to `[Init]`; custom bindings/ranges
are also replaced. Undo is available, but a later Save persists the result.
Preserve compatible metadata or expose reset as an explicit action.
Reproducer: `ultra-repackage-repro.mjs`.

### P3: loop brace can display the old enabled state

`apps/ultra/ui/alive-timeline.mjs:69` omits `document.loopEnabled` from its render
key. The disabled class changes only inside the cached rebuild at line 74.
A loop-only change makes the document false while the brace stays visually
enabled. Include the enabled state or update that class outside the cache.
Reproducer: `repro-ui-queues.mjs`.

The previously reviewed invalid adjacent Duplicate suggestion remains at
`alive-timeline.mjs:53`. Backend refusal preserves music. Ultra Perform also
still says effect chains are pending (`canvas.html:120`), although Alive supports
them. These are smaller follow-ups.

## Working And Missing Workflows

Alive has real Session slots/scenes, MIDI Arrangement editing, source sharing,
independent Ultra instances, ordered effects, automation, transport authority,
mixer and save/reopen workflows. v3 supports up to eight instrument tracks;
admitted v4 profile 1 supports two tracks subject to complete work admission.
The MIDI example is `apps/alive/examples/midi-arrangement.alive`.

Imported WAV decoding/playback, real waveforms, the portable mixed-project
journey, physical MIDI ingress and final integrated endurance remain unfinished.
The planned WAV implementer failed to start with a service rate-limit error;
there are no partially delivered audio-source changes to recover.

Ultra has the bounded 68-kind runtime, graph editing, supported Max import,
help/reference handling and reusable saved instruments/effects. It does not
establish general Max/MSP compatibility: whole-help conformance remains
`0/2103` in `apps/ultra/PATCH_PROTOCOL.md:302`. Ordinary copy/paste/duplicate of
selected objects, general manifest authoring, effect packaging and preset
removal need work. Current instrument packaging targets one specific
allocator/ADSR/filter/gain recipe.

Physical CPAL MIDI/external clock, physical audio input, signal-rate named
routing, abstractions/bpatcher, patch-local expansion and Max initialization/
scripts remain explicitly unsupported. Live project interchange and general
Max execution are separate compatibility goals, beyond similar UI/workflows.

## Verification And Build

`bash apps/alive/build.sh` succeeds and produces both separate binaries plus
the adjacent native library. Linux x86_64, kernel 7.2.8, glibc 2.44. Build output
retains seven Rust dead-code warnings per app build. Exact hashes, sizes and
command are in `experiments/development-review-20261028/build-pins.json`.

```sh
bash apps/alive/run.sh apps/alive/examples/midi-arrangement.alive
bash apps/ultra/run.sh
```

The existing Alive (Test) launcher uses this release directory after rebuilding.
The desktop entry named Ultra (Latest Build) currently points to the separate
`/home/venetanji/Work/alive` checkout. Use the Ultra command above to test this
reviewed build; the existing desktop entry was not changed.
Normal launch uses the desktop display. Automated native tests use a private
Xvfb display, bus and software PipeWire graph.

Existing Alive UI tests pass 101/101 during review. The five focused Alive
reproductions and two Ultra reproductions also execute successfully, exposing
the bugs described here. These use actual production modules and focused mock
IPC/DOM fixtures; they do not establish native disk or audio behavior.

Current remote CI `40421472750` at `1ebf216` passes UI, Chromium, native tests,
Rust (252 pass, four existing ignores) and offline renders, then fails the
original actual desktop journey at `check_alive_desktop.py:754`: Apply must
close the old editor generation. The retained state says Transport stop
requested, with transport stopped. The cause remains unresolved; neither a
product lifetime fault nor a missed/unfinished Apply is proved. Later native
gates skip. Packages `40421472639` pass all four platforms. A fresh local run
of the unchanged original desktop journey reproduces this same closure assertion
with exit 1 on the freshly built binaries. Both failure screenshots show stopped
transport, Audio details expanded and the hosted editor still present. Apply
input delivery/visibility and completion need receipts before attributing this
to native editor lifetime. No test assertion was weakened.

The actual Arrangement journey is still absent from CI. Its checked-in driver
needs 1440x900, while `check_canvas_desktop.sh:67` creates 1280x840. Previous
success used a private larger wrapper. Check in and validate a supported
display-size option before wiring this journey into CI; preserve all existing
assertions. The failed local run has 4085248 finite stereo capture frames
(85.109333 seconds) with hashes retained in the evidence directory. This is
software PipeWire/CPAL at 48 kHz/512 frames; capture duration does not establish
endurance. Failure-state audio errors/rejections/active voices are zero, without
implying the full journey passed or physical output was measured.

## Cloud And Local Work

Use cloud workers for source implementation, reproducer regressions, parser/
model/history tests, Chromium UI tests, deterministic native/offline audio,
software-loopback GUI tests and platform packaging. Existing workflows already
run these in GitHub Actions. The first cloud work should fix the state-loss
bugs and make the Arrangement journey reproducible in CI before expanding WAV.

Keep Live/Max reference observation on the machine that has their installed
applications. Use REA for those shipped applications and ordinary coding tools
for Alive/Ultra. Reference runs can use a disposable Wine prefix/private Xvfb
display. Record action, settled result, target/version/hash and limitations;
translate those observations into original contract fixtures and tests for
cloud workers. Proprietary binaries, screenshots, projects and private media
stay local unless explicitly authorized for publication.

The previous private Live REA bundle was imported and validated (seven records,
four unresolved unknowns). `ev_713e5543709cac7b256b6a78e170db869bdbc9cde460061961a91e0c8a2faf59`
establishes the prior controlled Live/Wine process lifecycle. Separate private
XTest action logs and screenshots establish UI observations; REA does not
establish semantic UI actions in that record. Its output truncation/process
sampling limits remain. This review does not claim a fresh Live/Max run.

Recommended handoff cycle: a focused local Live/Max observation, a documented
behavior contract, a cloud implementation with regression evidence and build
artifacts, then local desktop/audio acceptance. Physical device latency,
underruns and subjective interaction need local testing. No cloud account,
runner, credential or environment configuration was changed for this review.
