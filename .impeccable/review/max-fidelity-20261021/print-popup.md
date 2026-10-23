# Print Popup Fidelity

Print now has the transient value-bubble dependency of the four retained
append/prepend/int/float help candidates. Complete installed-help qualification
remains 0/2,103. The compact Max-inspired Impeccable visual world is preserved.

## Behavior And Evidence

The original Max oracle in
`experiments/max-reference/print-popup-runtime-20261022/` establishes default-off
popup output, independent simultaneous bubbles, ordinary `popup 0` data,
attribute-transition clearing and no console auto-open. The bundle retains 62
verified artifacts, 35 stages and 23 DSP-off samples. No new Max run was needed
for implementation. Proprietary help/script/reference bodies are not bundled.

Native Print remains kind25. Its existing severity uses p0; p1 is strict
popup0/1, default0. Both saved/imported attributes and live Inspector changes
use the same bounds. The original help example enables two popup Prints and
uses the compatible Message box; the library still has 113 original entries.
No native kind or generic authored-object count changes: 54 and 56 respectively.

The new additive non-consuming typed snapshot API publishes each Print's last
receipt, generation and frame independently of console draining. Coherent atomic
publication advances snapshot time even without new output. The callback adds
no formatting, wall-clock calls, allocation or locks. Rust validates and formats
the typed receipt off callback; all old console functions/layouts remain intact.

Both controllers merge snapshots into view-only state. Each observed receipt
gets at most 2000ms, reduced by native frame age. Repeated generations cannot
extend or resurrect a deadline. Missing snapshots preserve cache while local
monotonic time expires it. Actual popup attribute changes clear native receipts;
reenabling alone does not replay prior text. Console filters, Clear and pane
visibility do not control bubbles.

The safe-text renderer uses an accessible status with a stable object label
and a described-by value span, matching this WebKit's supported accessibility
path. The original CSS bubble has a dark body, small gray dot and pointer. It
opens right and flips left at the workspace edge. Locked Print double-click
continues to open the console.

## Review Fixes

Independent review confirmed a P2 standalone lifecycle defect: Stop/audio
transitions cleared the observed deadline, allowing a lagging native frame to
revive an expired generation. The reproduction expired deadline2100 at time2200
and revived it with deadline4200. Lifecycle resets now retain Print deadlines;
structural/new-revision resets clear them. The regression covers Stop, Start
Audio, Stop Audio and Panic. The reviewer reports no remaining finding across
native publication, Rust validation, both caches, safe rendering and console
independence.

The integration also fixes an existing console-source race. The record revision
now survives queued-edit flushing and native routing. Registry admission checks
revision and source membership before creating/mutating views. Descriptors and
events pair source IDs with captured revisions, strip stale pending reveals,
refresh an older target descriptor, and wait for initial view adoption. Four JS
regressions and three additional native registry cases cover stale reuse,
descriptor/event timing and startup delivery. Independent review reports no
remaining source-reveal finding.

## Verification

- Full JS: 294 passed, `/tmp/ultra-print-js-final.log`.
- Popup/cache/DOM including lifecycle: 50 passed,
  `/tmp/ultra-print-lifecycle-js.log`.
- Native header and linked threaded tests pass:
  `/tmp/ultra-print-native-header.log`,
  `/tmp/ultra-print-native-linked.log`. Two concurrent readers observe 1,000
  rendered updates; full console-ring output still publishes popup receipts.
  The idle-clock case explicitly invokes the existing DSP-off tick driver.
- Graph, numeric and Message native regressions pass:
  `/tmp/ultra-print-native-regressions.log`.
- Required contracts: exit0, `/tmp/ultra-print-contracts.log`.
- Real browser: 75 passed, `/tmp/ultra-print-browser-full.log`, including
  authoring/Inspector round-trip, safe independent bubbles, edge flipping,
  frozen-clock monotonic expiry and locked double-click. The live browser
  renderer case declares its synthetic IPC bridge; native execution is covered
  separately by the desktop wrapper.
- Release build: exit0, `/tmp/ultra-print-build.log`.
- Release Rust: 100 passed, 0 failed, 1 existing ignored test,
  `/tmp/ultra-print-rust-release-final.log`. An earlier release failure used a
  stale generated native library in `target/release/deps`; refreshing that copy
  to the verified native build restored the passing suite. The refresh audit is
  `/tmp/ultra-print-release-deps-refresh.json`.
- Confirmation release build: exit0, `/tmp/ultra-print-build-confirm.log`.
- Fresh full private native desktop wrapper: exit0,
  `/tmp/ultra-print-popup-desktop-confirm/`. `startup-result.json`, `result.json`
  and `documents-result.json` each report passed. This covers actual
  Tauri/WebKit windows, Rust/native execution and software-only CPAL PipeWire at
  48 kHz / 512 frames. Print cases establish default-off logging, independent
  typed bubbles, blank-click preservation, DSP-off expiry, attribute clearing
  without resurrection, ordinary `popup 0` data, closed-console preservation
  and locked double-click opening. The Print run retained native revision13.
- `cleanup-result.json` records wrapper exit0 and zero remaining marked
  processes in each of the six private Print desktop runs.

The first combined capture exposed a sibling node obscuring a bubble and an
intrinsic flex-width issue wrapping the short `bang` label. One CSS correction
batch fixes stacking and minimum sizing. After the confirmation release build,
root inspected exactly one confirmation capture,
`/tmp/ultra-print-popup-desktop-confirm/native-print-popup.png`: both bubbles
appear above neighboring nodes and `bang` stays on one line. Print visual
polish is complete for this bounded acceptance pass.

An earlier `final-3` desktop documents attempt reported signal7. Its cause
remains unconfirmed; it is not recorded as a fixed product defect. The final
full wrapper passes physical document opening with diagnostic-only harness
changes, and its document and cleanup results are retained separately.

## Finite Limits

The 2000ms lifetime is explicit local policy within the observed Max interval
1.799..2.650s. Exact Max timing and placement heuristics remain unqualified.
Native time uses the existing 48kHz clock and capped idle scheduler. A complete
polling stall does not reconstruct exact wall age for a newly opened view.
The deadline of a receipt already seen by a view never increases.

The oracle confirms closed-console reopening on locked double-click; fronting
an already-open native Max console was not established in the WM-less display.
Ultra's existing console pane remains its product behavior. No generic console
precision, symbol-quoting or error-routing compatibility is inferred here.

The four complete roots additionally require the separately tracked finite
helper/reference adapter, saved help-shell metadata and hosted Basic/question
behavior, followed by complete-root execution qualification. Print acceptance,
source retention or successful import alone does not qualify whole-help
execution.
