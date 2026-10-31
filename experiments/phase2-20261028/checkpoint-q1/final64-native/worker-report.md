# final64 native checks

Source `64fcacd2c454393e89526043fa57c6b2c8ec942f`; root build receipt `experiments/phase2-20261028/checkpoint-q1/final64-build/receipt.json`. Independently rehashed Alive `741cc7ede7f76257f9caec8a8052d42aaa2a484e7a60ea662ce26e5a8851d1a1`, Ultra `e793a74b6c2db82198f70de7c8a1c85fd72d5620969d2b5d42525739b48f2097`, and module `9fd076115b2a914fa2d156dab37b0a1d99676d40634e23f78ba2c50c110062c4`. All runs below use private Xvfb and software PipeWire, not physical audio.

Commands from root, `D=$PWD/.superpowers/sdd/2026-10-28-phase2-live-max` and `B=$PWD/apps/ultra/src-tauri/target/release/alive`:

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCREEN_SIZE=1600x1000 ULTRA_TEST_ALIVE_BINARY="$B" ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/midi-arrangement.alive" ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_master.py" bash apps/ultra/tests/check_canvas_desktop.sh "$D/final64-master" > "$D/final64-master.log" 2>&1
ULTRA_TEST_ALIVE=1 ALIVE_ENDURANCE_SECONDS=0 ULTRA_TEST_ALIVE_BINARY="$B" ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" bash apps/ultra/tests/check_canvas_desktop.sh "$D/final64-desktop" > "$D/final64-desktop.log" 2>&1
ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCREEN_SIZE=1600x1000 ULTRA_TEST_ALIVE_BINARY="$B" ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/midi-arrangement.alive" PYTHONPATH="$PWD/apps/ultra/tests" ULTRA_TEST_SCRIPT="$D/final64-mixer/diagnostic.py" bash apps/ultra/tests/check_canvas_desktop.sh "$D/final64-mixer" > "$D/final64-mixer.log" 2>&1
```

All three exited 0. Master report records Session and Arrangement at 1440x900 and 1280x800, full v5 save/reopen equality, empty Undo/Redo after restart, actual Quit, and nonzero loopback peaks 0.14162 before and 0.08348 after restart. Initial and restarted executable device 53/inode 8395135/SHA `741cc7...` and actual mapped adjacent module inode 8395136/SHA `9fd076...` match, as captured in `final64-master/master-report.json`. Recorder supervision reports requested stop complete. The desktop report `final64-desktop/native-session-report.json` and log preserve original zero-endurance journey including dirty/pending Quit cancellation and terminal discard Quit; this is not sustained qualification.

The standalone diagnostic opened one Pulse inspector and closed it at each size. `final64-mixer/geometry.json` records the pinned process identity and collapsed/expanded/recovered accessible geometry; three faders share top and bottom exactly in all states (y=316, height=199 at 1440; y=316, height=99 at 1280), and both tracks' mute/solo y and heights match and remain unchanged. Screenshots for each state are retained. Visual inspection confirms the open action overlay covers part of its own Pulse mixer while Harmony and Master remain visible; closing restores Pulse controls. The test checks geometry and screenshots, not pointer hit testing of covered controls. It concludes with actual Quit.

Wrapper sessions exited; process search for these drivers, private runtime, recorder, Xvfb and final64 Alive found no matching process. Runtime lease released. No pilot or endurance was run; pre-correction endurance does not qualify final64. Physical playback and physical underruns remain unmeasured. No production source, binary or harness modified.
