# Final64 local endurance 01: interrupted by user pause

The user paused the goal during the active measurement. The driver received SIGINT and the wrapper exited 130 with `KeyboardInterrupt`. The last completed progress record is 1792.759948156938 target seconds over ten cycles. This is a partial interrupted attempt, not an endurance pass; no terminal report, final epoch audit, retirement or actual Quit is claimed. Raw partial evidence and PCM remain in `final64-local-endurance-01/` and the sibling log. No retry was started.

Command from root:

```sh
ULTRA_TEST_ALIVE=1 ALIVE_ENDURANCE_SECONDS=1800 ULTRA_TEST_ALIVE_BINARY="$PWD/apps/ultra/src-tauri/target/release/alive" ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" bash apps/ultra/tests/check_canvas_desktop.sh "$PWD/.superpowers/sdd/2026-10-28-phase2-live-max/final64-local-endurance-01" > "$PWD/.superpowers/sdd/2026-10-28-phase2-live-max/final64-local-endurance-01.log" 2>&1
```

HEAD at start `0f1deaecc34e8a54bc9b1ec136876831ebb132e5`, only docs/evidence changes since `4326b0b`; dirty PLAN.md and docs/PHASE2_HANDOFF.md and untracked cloud evidence were present. Final64 Alive, Ultra, module and driver/wrapper/example hashes and artifact inodes matched pilot/build receipts before start. Artifact hashes after interruption remain Alive `741cc7ede7f76257f9caec8a8052d42aaa2a484e7a60ea662ce26e5a8851d1a1`, Ultra `e793a74b6c2db82198f70de7c8a1c85fd72d5620969d2b5d42525739b48f2097`, module `9fd076115b2a914fa2d156dab37b0a1d99676d40634e23f78ba2c50c110062c4`. No rebuild or source/settings changes.

Recorder supervision completed requested stop, return code 1, 2010.001480597 seconds and 771764224 PCM bytes. Private software PipeWire at requested 48000 Hz/512 frames; physical output and physical underruns unmeasured. The pilot forecast remains `within_limits=false`, collector headroom 3.480731% below 5%; root waived only this extra margin for this one attempt. No hard bounds were changed.

After wrapper exit, owned wrapper, driver, Alive, private Xvfb/PipeWire and recorder group 1116788 were absent in process search. User's unrelated PipeWire processes remain untouched. Native/GUI/private Xvfb/software PipeWire/AT-SPI/recorder/sampler and frozen artifact leases are explicitly released to root.
