# Native Live Region / Publication Evidence

Worktree: `/home/venetanji/.codex/worktrees/phase2-ui/alive`.
Starting HEAD: `8dd4588960300651ed10c19e66bddb539f0f5167`.
Native source edits are uncommitted and frozen for parent integration.

## Frozen shared library

`/tmp/alive-live-publish-native-20261031/libultra_native.so`

SHA-256:

`69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`

Built from this worktree's `apps/ultra/src-tauri/native/backend.cpp` using
`c++ -std=c++17 -O2 -fPIC -pthread`, linked with the existing read-only
`/home/venetanji/Work/alive/apps/ultra/build/core/libultra_core_bundle.a`,
`-shared -pthread -ldl -lrt`. No shared native symlink was changed.

`backend.o` contains the same final source with
`-std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE`.
Test binaries link it and the core bundle with
`-Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock`.
Generated saved graph fixture: `saved_graphs.hpp` in this directory, generated
by `python3 apps/ultra/tests/alive_session_v3_fixtures.py <path>`.

## Reproduce final checks

`bash /tmp/alive-live-publish-native-20261031/verify-frozen.sh`

The script checks the library digest, runs the exact existing verification
binaries, and saves stdout/stderr in this directory. It does not rebuild or
replace the library or modify repository source.

| Check | Binary | Log |
| --- | --- | --- |
| Live publication, audio, loops and numeric-command race | `publication-test` | `publication.final.log` |
| Existing MIDI edit/Preview and dense ordinary-only publication | `midi-test` | `midi.final.log` |
| Production profile admission and refusal | `shipping-test` | `shipping.final.log` |
| Current C ABI layout, including appended bank revision | `layout` | `layout.final.log` |
| Scalar envelope oracle, independent clip/loop regions | `envelope-test` | `envelope.final.log` |
| Existing V1, V2, V3 behavior | `v1-test`, `v2-test`, `v3-test` | `v1.final.log`, `v2.final.log`, `v3.final.log` |
| Existing launch quantization | `launch-test` | `launch.final.log` |
| Whitespace validation | `git diff --check` | `diff-check.final.log` |

`publication-test --late-preview` independently exercises refused Preview/mixer/Seek
ingress during front insertion after the callback snapshots its command head.
`publication-test --identity-live-values` confirms Preview/mixer stay accepted
during identity-map clip creation and appended tracks; Seek remains fenced. `--queued-preview`
exercises a Preview consumed in the same batch as track insertion. `--slot-delete`
exercises deletion of an active Session slot whose source remains in Arrangement.
Each case is also part of the full default publication test.

The scalar oracle covers 110,195,654 assertions. Eight rootless audio tracks use
16 PCM sample reads/frame; measured maximum callback times are recorded in the
publication log against a 5333.3 us deadline for 256 output frames. Existing
event ceilings remain 32/frame and 64/1024 frames.

## Broader current-format suites

The full V4 Arrangement, finite MIDI and authority suites are rebuilt from the
final source including the numeric-ingress refinement and Arrangement gap guard.
Their captured logs are `v4.final.log`, `v4-midi.final.log`,
`v4-authority.final.log`; binaries are `v4-test`, `v4-midi-test`,
`v4-authority-test`. Those use `backend-provisional.o` with the explicit test-only
`ULTRA_ALIVE_SESSION_V4_PROVISIONAL` definition. Production shared-library tests
retain the profile-2 admission refusal. Earlier `v4.log`, `v4-midi.log` and
`v4-authority.log` are historical pre-fence runs and are superseded.

## Important regression observations

- Eight empty mixed MIDI/audio tracks were rejected before the new native input
  model; the new configure/render test now passes.
- Rootless audio initially had valid cursors but zero output because the backend
  rendered sessions only when Canvas roots existed; exact stereo PCM now passes.
- Queued Preview plus track insertion reproduced SIGSEGV before remapping and
  defensive instrument validation; the dedicated regression now passes.
- Preview/mixer/Seek enqueued after a callback command-head snapshot were
  accepted before the publication ingress fence; the boundary-hook assertion
  failed before that fix and now passes.
- Source/slot reordering preserves accepted launch serial/frame and maps targets
  to the new bank. Deleting the active Session slot produces Session silence and
  releases held notes while retaining shared source content.
- Independent reviewer `/root/region_native_review` re-read final publication
  ordering, the identity-map fence refinement and the exact Arrangement gap guard.
  They independently ran the final full publication suite, focused Arrangement
  regression and a private rebuild of the scalar oracle, all passing. They verified
  the final production library hash with no remaining findings.

## Fine-launch diagnostic reproduction

`probe-capability.cpp` and `probe-capability` reproduce the Quantized MIDI
source proof before and after only Pulse slot 0 changes to start 0, end 8,
loop start 2, loop end 6 beats. Ordinary playback passes both times. Fine
launch passes before that region edit and conservatively refuses afterward
with event-window resource 1: 84 events against the retained 64/1024 cap.
The prefix/cycle maxima and arbitrary-launch composition cause this refusal;
no audio source is required to reproduce it. This probe bypasses runtime
configuration and serves only as an envelope diagnostic.

## Arrangement loop in a gap

The final `song_points` proof uses the maximum of prefix/cycle envelopes when
the window cannot contain both groups. It retains their checked sum for crossing
windows. The threshold is the exact difference between the last prefix point and
the first absolute cycle point; a half-open width equal to that difference cannot
include both endpoints. No event/work limits or source-profile bounds changed.

`publication-test --arrangement-gap` uses the original Quantized MIDI source's
22 note/automation events and both saved subtractive/utility graphs, an active
Session audio clip, and a rootless MIDI track with two empty clips. It checks
live Arrangement loop 9..13 beats, a new four-beat MIDI source/placement in that
range, loop Undo to 0..8 and Redo to 9..13, retained transport/audio override,
and actual wrapping into the newly created clip. It is part of the full suite.

Both added regression executables failed before the source fix:
`envelope-test-arrangement-red` on the separated-window bound assertion;
`publication-test-arrangement-red --arrangement-gap` on schedule publication.
`probe-arrangement.cpp` / `probe-arrangement` reproduce the before/after proof
inputs. With the final guard, moving Arrangement loop 0..8 to 9..13 retains
the original base event-window bound of 56 rather than falsely increasing it
to 70 against the retained limit of 64.
