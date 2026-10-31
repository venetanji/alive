# Task 2C finite multi-track MIDI preparation review

Spec compliance: APPROVED for this sub-slice at
`0606542c505f5ba615f43404b639f6c5f63e6e37`, against base
`e5b905fa378e5f8d8644a4fd6f9adb5c8437207a`.

Code quality: APPROVED. No Critical, Important, or Minor findings.

This approval covers native finite multi-track MIDI Arrangement preparation
and execution in the dedicated provisional backend. It does not approve the
remaining Task 2C actions/loops, production activation, or the desktop journey.

## Spec and quality assessment

- `apps/ultra/src-tauri/native/alive_session_workspaces.hpp:77` widens only the
  provisional runtime shape and reuses complete-MIDI field validation. The
  four-source/eight-placement per-track bounds, full unused-source and slot
  validation, MIDI gain range, ownership and aggregate event checks remain
  enforced. Song, placement and slot loops and audio remain refused by ordinary
  runtime validation. The complete off-callback proof seam still accepts its
  broader preparation domain without enabling those runtime operations.
- `apps/ultra/src-tauri/native/alive_session_workspaces.hpp:352` consumes both
  `Proof.prepared` and `Proof.placement` directly. The removed single-lane pulse
  builder is not retained as a second admission path. The approved complete
  builder and oracle are unchanged, and no original resource ceiling is raised.
- `apps/ultra/src-tauri/native/alive_session.hpp:31` adds bounded immutable
  source/slot maps and slot storage to the existing configuration. Configuration
  fills absent map entries with NONE and copies global slot descriptors only
  after validation and graph/envelope admission. `alive_session_workspaces.hpp:269`
  adds Arrangement authority, empty active/pending/remembered slot tokens and
  ended metadata to the existing candidate cursor. There is still one event
  pool, graph owner, queue, clock, renderer and publication owner.
- `apps/ultra/src-tauri/native/alive_session_workspaces.hpp:362` projects slot
  count and committed cursor metadata with NONE/NO_FRAME and zero phase for
  absent sources. Initial and observed authority remain Arrangement. Slot
  descriptors are not fed to the legacy clip/source index paths: unsupported
  track actions are refused before those paths can execute.
- `apps/ultra/src-tauri/native/alive_session_clips.hpp:965` reserves four lookup
  probes per configured track before resolution. A batch of START requests
  resolves only the first effective stopped-to-playing candidate; later STARTs
  do no additional searches. This is sufficient for the admitted START-only
  dialect. The one-lane reservation and failed-START behavior remain intact.
- `apps/ultra/tests/alive_session_v4_midi_test.cpp:199` verifies exact dispatch
  frames, occurrence/source identity and PCM across fixed 1/31/63/64/127/1024
  and mixed partitions, with identical absolute Stop/resume boundaries.
  `:641` also compares unaffected-lane PCM with the changed lane muted versus
  its placements removed, for no effect, utility, stateful filter and their
  chain. The compared unaffected audio is explicitly nonzero. `:513` checks
  adjacent same-source occurrences, O=1000 automation and note entry ordering,
  exactly one changed-track epoch increment and the other track's continuity.
- `apps/ultra/tests/alive_session_v4_midi_test.cpp:310` compares every rolling
  width through 1024 against complete prepared curves and unchanged limits.
  Dispatch counts, reconstruction reads, descriptor probes and epoch-derived
  root clears are independently checked against ledger reservations; preview
  reads remain bounded. `:383` proves eight pre-reserved probes and one horizon
  for 64 STARTs over two eight-placement tracks. Parameter-write measurements
  are ledger charges, as the implementation report correctly states.
- `apps/ultra/tests/alive_session_v4_midi_test.cpp:405` covers 29 malformed or
  unsupported configurations, future action refusals, four sources per track
  and a retained shape-valid placement-budget refusal. `:559` bypasses the C
  stopped-I/O guard and verifies native shape, graph and envelope rejection
  preserve playing v3/v4 publication except the rejection counter, followed by
  continued phase/epoch behavior. `:499` verifies configuration removal silences
  all instrument/effect output across later fragments. Original tests and
  expected values are unchanged; native CI only registers the additional suite.

## Concrete unchanged-code risk checks

- Checked `apps/ultra/src-tauri/native/alive_session_workspaces.hpp:50` and
  `:174` for array-map overflow or unused-source validation gaps. Profile
  counts, per-track source counts, event ownership/coverage, canonical ordering,
  parameter targets/masks and held-note bounds protect the new copies/maps.
- Checked `apps/ultra/src-tauri/native/alive_session_workspaces.hpp:492` and
  `:515` for publication before graph/envelope admission. Prospective plans and
  curves remain scratch until all checks succeed. Shipping configure still
  immediately refuses; `:447` keeps features zero and `:651` retains shipping
  request refusal. This review does not rely solely on the prebuilt-library
  shipping test.
- Checked `apps/ultra/src-tauri/native/alive_session_clips.hpp:684` for slot
  tokens reaching v3 bank/clip interpretation. V4 admits only START before the
  common action branches. Local-to-global launch mapping remains future work.
- Checked `apps/ultra/src-tauri/native/alive_session_clips.hpp:789`, `:835`,
  `:905` and `:1056` for candidate metadata leakage and incomplete admission.
  START resolves the candidate cursor, complete future/reset and placement
  curves feed retained-history admission, and cursor/track state commit together
  only on acceptance. No new action can introduce an unhandled first-sample
  authority or loop transition in this slice.
- Checked `apps/ultra/src-tauri/native/alive_session_clips.hpp:470`, `:511`,
  `:554`, `:1084` and `:1242` for cross-track resets, missed occurrence identity,
  unreserved reconstruction, Stop rearm or a second clock. Boundary work is
  reserved before descriptor access; the changed-track mask preserves distinct
  adjacent occurrences; scans are reserved before chase and the existing fixed
  combined event batch precedes dispatch. Termination uses current chains
  without placement lookup. The shared sample/advance path and ledger lifecycle
  remain unchanged.

## Evidence checked

- Read the task brief/report, binding source-informed design brief, accepted
  runtime contract sections 2/3/4/6/8, and prerequisite preparation report and
  independent approval. Read the supplied 1,242-line complete diff package in
  bounded consecutive chunks as the changed-source view. Unchanged-source reads
  were limited to the concrete risks recorded above. No git commands, broad
  source crawl, source/index/HEAD edits, or subagents were used.
- Independently recomputed all 73 hashes in
  `/tmp/alive-workspaces-task2c-midi-preparation/evidence-sha256.json` and all
  23 hashes in `pins.json`; every hash matched. This includes the current five
  changed files, retained final-source copies, complete builder/oracle, original
  v4 suite, real saved graph fixtures, native/core binaries, focused binaries,
  mutation source/binary and raw logs. The parent source-verification artifact
  separately records the committed-blob checks and source/base pins.
- Read exact RED/GREEN command metadata, the focused build script and raw RED
  logs. Initial behavior RED compiled and failed at broader two-track validation
  (exit 134). The retained lookup mutation restored constant four-probe credit
  and failed the pre-read reservation assertion (exit 134). The initial small
  RED source was not separately retained, which the report discloses; its
  executable/log remain, and the independent lookup mutation is reproducible
  from retained source.
- Final focused compile/runtime logs pass with callback allocation/free/lock
  guards and Werror, exit 0, 30.204 seconds. Two-track dispatches are
  0/512/2560/7550/8194; the sparse eight-track lane dispatches at
  512/2560/8194. The original natural-end/exhausted-lookup START regressions
  pass unchanged, including the fixed optional placement ceiling 2114.
- The unchanged complete oracle compiles/runs with exit 0 and reports
  `sources=8576 boundaries=7620 splices=144 authority=217600 native=12792
  accepted=13 refused=1 assertions=106661824`.
- Read the complete native CI log and command metadata: exit 0, 157.491 seconds.
  It includes the new suite, original v1/v2/v3 runtime/ABI/envelope/receipt/scene
  and capacity proofs, original v4 suite, complete oracle, shipping refusal,
  and 42 edit plus 42 baseline Stop-stress cycles over 43,008 float samples.
  The additional shipping test built directly against current `backend.cpp`
  without the provisional definition also compiles/runs with exit 0.
- Runtime work figures match the report. Two-track/six-root scheduled placement
  peaks are 4/34 for a frame and 4/40 for windows; eight-track/eight-root figures
  are 4/60 and 4/65. Every traced resource/window assertion passes. The retained
  eight-track/four-slots-per-track shape refuses at 66 placement steps against
  64/frame. No suite was repeated: no unanswered concrete doubt warranted a
  focused reproduction.

## Approval limits and next gates

- Eight-track evidence is intentionally sparse: eight real instrument roots,
  one sounding Arrangement lane and seven Arrangement-silent lanes. It is not
  evidence for eight simultaneous sounding placements or every shape within
  the storage maxima. Conservative refusals remain part of admission, and the
  report does not claim timing or full-capacity qualification.
- Stored global slot maps and remembered-cue fields are preparation for the
  next slice. Actual local-slot Launch, Track Stop, Return, one-shot completion,
  global-slot observations, atomic member receipts and final-sample coalescing
  still require behavior tests before ingress is widened. The present empty
  pending/Session state is correct for the admitted subset.
- Source/song loops, authority-aware Seek, simultaneous seam/action ordering,
  MIDI profile measurement, Rust/desktop integration, audio and production
  feature activation remain gated. The current app is not rebuilt or changed
  by this source slice. Parent-owned documentation edits outside the review
  package were not graded.
