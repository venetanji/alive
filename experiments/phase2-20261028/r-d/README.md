# Reviewed Native Harness Increment

Candidate `72e79ae57b14abd781f8bb2b1d437fefcc9f4f69`, based on `70c356d`,
integrated without logic changes as `65dbf5a`. Independent specification
re-review resolves all four initial findings; independent quality review has
no actionable findings. Reports are in `reviews/`. Integration verification
passes 16 desktop helper tests, one navigation test, shell syntax and diff
whitespace checks. This increment is not overall P2.0 or final-head acceptance.

## Demonstrated Failure And Correction

The deliberate occlusion run exits 1 at the retained original assertion,
`Apply must close the old editor generation`. Its input receipt identifies
Audio details at the click point and no new Apply IPC. Closing that disclosure
before clicking Apply corrects the harness input. The successful receipt traces
Apply begin, installed generation 12 -> 13, the old editor's close request and
destruction, then the surviving Alive window. The full original Alive journey
and full Arrangement journey both exit 0 on the candidate. No editor-lifetime
assertion is removed or relaxed.

Arrangement records matching executable and mapped native-library content,
device and inode identities before and after restart. The helper tests use
their own temporary executable fixtures, and exercise a hung recorder without
replacing the original journey error or skipping later cleanup.

The original candidate built Alive binary SHA-256 is
`78dafaac34677ab9bd4f01cf1ab4920c7e861189830d063337834282330dfb15`;
the adjacent native library SHA-256 is
`5ac56cce5977a12f8efa477bfe9b705b8b478f5b8c765bbf858ea1719b92acde`.
The retained reports and logs contain the sampled runtime/settings and identity
receipts. This is private software PipeWire/CPAL, not physical audio. Finite
capture and journey durations do not qualify final playing-time endurance.

## Commands

Run from the checkout root with a matching built binary and native library:

```sh
python3 -m unittest discover -s apps/ultra/tests -p 'test_desktop*.py' -v
python3 -m unittest discover -s apps/ultra/tests -p test_alive_workspace_navigation.py -v
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_ALIVE_BINARY="$PWD/apps/ultra/src-tauri/target/release/alive" \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-phase2-original
ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCREEN_SIZE=1600x1000 \
  ULTRA_TEST_ALIVE_BINARY="$PWD/apps/ultra/src-tauri/target/release/alive" \
  ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/midi-arrangement.alive" \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_arrangement.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-phase2-arrangement
```

Do not run native journeys concurrently: the GUI/audio resource lease is serial.
Set `ULTRA_TEST_APPLY_OCCLUDED=1` only to reproduce the retained negative case;
it intentionally fails the original assertion. CI now runs Arrangement with
independent diagnostics even after an earlier journey failure, while retaining
the overall failure status. Pushed-commit CI is still required.

## Remaining Gates

The candidate's separate full Ultra journey fails the optional local installed
`slider.maxhelp` fixture assertion. Root's converter probe attributes the old
16-node expectation and fixed control IDs to five comments now retained by the
importer: actual converted graph is 21 nodes, including 16 executable nodes,
and ten edges. No full Ultra pass is inferred. The old failure and private
fixture identity remain in the worker report; licensed help contents and its
derived output are excluded from this evidence directory.

Task 3 focused draft and Linux Quit qualification, metadata preservation,
combined-source native reruns, Master, final pushed-commit CI/packages and
physical/endurance acceptance remain separate gates. `candidate-evidence.json`
hashes each retained original Alive/Arrangement artifact and review.
