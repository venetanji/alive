# Focused saved-cable verification

Fresh command output retained on 2026-10-22. These checks use the existing
workspace and native library; they do not build native code or start a desktop
application.

## JavaScript

`focused-js.log` records this command with exit code 0 and 121 passing tests:

```sh
node --test apps/ultra/ui/canvas-cable-geometry.test.mjs \
  apps/ultra/ui/canvas-cable-path.test.mjs \
  apps/ultra/ui/canvas-model.test.mjs \
  apps/ultra/ui/canvas-hierarchy.test.mjs \
  apps/ultra/ui/canvas-max-import.test.mjs \
  apps/ultra/ui/canvas-shared.test.mjs
```

## Rust

`focused-rust.log` records this command with exit code 0 and two passing tests:

```sh
PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" \
CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo" \
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" \
LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --locked cable_midpoints
```

## Controlled regression check

`strict-delta-regression-red.log` records the existing five geometry tests
against an in-memory copy of the current helper. Only the tolerant endpoint
delta comparison was replaced by the former strict equality:

```js
if(dx!==movedTo.x-to.x||dy!==movedTo.y-to.y)return points;
```

The test import was redirected to a base64 data URL containing that helper
copy, then executed through `node --input-type=module`. Three tests passed;
the fractional group-movement and boundary-roundoff tests failed as expected.
The runner returned 1. No repository source was changed by this check. The
current helper's green result is in `focused-js.log`.

## Rounded contour follow-up

After the initial batched image review, one combined renderer correction fitted
rounded bends and endpoint-aligned joins to the observed Max contour. Saved
data stays exact. General Max routing and saved-motion equivalence remain
unqualified. No more than one visual confirmation was used.

Fresh results after that correction:

- `rounded-path-red.log`: 5 expected failures, 2 passes against the old renderer.
- `rounded-path-green.log`: 7 passes.
- `rounded-geometry-green.log`: 12 passes.
- `rounded-browser.log`: 11 compatibility browser cases pass.
- `rounded-contracts.log`: required gate exits 0.
- `rounded-release-build.log`: locked release build exits 0.
- `rounded-native.log`: native route movement/history/save pass; fresh recall
  yields 77 at unchanged runtime revision 1.
- `rounded-native-cleanup.json`: zero remaining exact-output-marker processes.

Final native images/results live outside the source tree at
`/home/venetanji/.cache/alive-ultra-evidence/cables-20261022-rounded/`.
The owner inspected both images once, completing the single confirmation batch.
The initial durable `cables-20261022-final` run also exited 0 and had zero
remaining exact-output-marker processes when checked before the follow-up.

The complete UI/evidence disposition is
`.impeccable/review/max-fidelity-20261021/cable-ui.md`.
