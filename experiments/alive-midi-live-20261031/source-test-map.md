# Implementation and Test Map

| Boundary | Files / Evidence |
| --- | --- |
| Optional fixed MIDI ABI | native/alive-midi-edit-v1.h; session/native_midi.rs |
| Immutable source banks and active proof/events | native/alive_session_midi.hpp; alive_session_clips.hpp; alive_session_workspaces.hpp |
| Real audio, stopped gating, stop/reset | native/alive_session.hpp; native/backend.cpp |
| Pending transaction and musical history | session/desktop/midi.rs; session/desktop.rs; session/history.rs |
| Gesture producer and exact-token release | ui/alive-midi-preview.mjs; alive-midi-preview.test.mjs |
| Piano control/keyboard/add/drag lifecycle | ui/alive.mjs; alive-piano-view.mjs; alive-piano.css |
| Native ownership/accounting/red-green | tests/alive_session_midi_edit_test.cpp; native-*.log |
| Full standard source/live fields/provenance | desktop/midi.rs actual-native test; rust-session.log |
| Existing admission/launch | tests/alive_session_launch_test.cpp; alive_session_v4_shipping_test.cpp |
| UI and responsive/maximized layout | ui/alive-dom.test.mjs; tests/ci/alive-chain.spec.mjs; node-feature.log; browser.log |
| Real desktop and PCM | tests/check_alive_midi_desktop.py; desktop-report.json; tmp desktop-verified/preview.f32 |

All code paths are relative to apps/ultra. Parent concurrently owns shared panel
files/tests. Native backend uses an unchanged read-only core archive from original
checkout. Rust target, objects, executables, library and recordings are private.
