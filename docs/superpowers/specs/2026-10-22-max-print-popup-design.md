# Max Print Popup Compatibility

The user authorized autonomous Max fidelity work and requested agents. This
bounded addition supplies the popup-print dependency of the four whole-help
candidates. It does not qualify a complete installed help root.

## Evidence And Scope

Use `experiments/max-reference/print-popup-runtime-20261022/README.md` and its
original captures. Popup1 prints a transient, object-adjacent value bubble and
also logs normally. It does not open the console. Two objects show independent
bubbles; pointer movement and blank clicks do not dismiss them. Disabling the
attribute clears the bubble, and reenabling does not restore the previous
value. Incoming `popup 0` is ordinary printed data, not an attribute setter.
Existing locked Print double-click already opens Ultra's console pane.

Use a 2000 ms UI lifetime as an explicit local policy within the observed
1.799..2.650 second interval. Exact Max timing, placement heuristics and native
global-console fronting remain unqualified. Retain the established compact
Impeccable canvas and console. Bubbles use original CSS matching the observed
dark body, thin black outline, small gray dot and pointer toward the object.

## Saved And Native Parameters

Extend existing saved `print` parameters with `popup`, default integer0,
accepted values0/1. Preserve `label` and `level` and all existing ports/kinds.
Expose `@popup` in object authoring and a named Inspector choice. Accept Max
creation text `print @popup 1` and explicit saved popup values under the same
strict validation. Ordinary `popup` selectors remain printed messages.

Native Print remains kind25. p0 remains severity0..3; free p1 stores popup0/1.
Inspector/live parameter edits use the existing atomic parameter path. An
actual attribute change clears prior popup receipt state. Enabling alone
cannot resurrect it. Graph replacement resets the state as usual.

Keep all old ABI structs and console functions unchanged. No V2 console event
API is needed: bubbles are non-consuming per-node state, separate from the
consuming console stream. Preserve32 nodes,64 cables,eight atoms and16 owners.

## Publication And IPC

Add a new bounded typed POD snapshot API:

```text
ultra_canvas_print_popups_document(document, snapshot*) -> available0/1
PrintPopupSnapshot { revision:u64, frame:u64, node_count:u32, reserved:u32,
                     nodes:PrintPopupObservation[32] }
PrintPopupObservation { id:u32, enabled:u32, has_value:u32, reserved:u32,
                       generation:u64, frame:u64, message:UltraCanvasMessage }
```

Only Print nodes have rows. Native receipt state holds the last enabled
print message, frame and generation. Disabled messages still reach console
but cannot create a bubble. Attribute transitions clear has_value. Atomically
publish words with a generation check, like MessageBox snapshots. There must
be no unsynchronized runtime reads, callback allocation, formatting, wall-clock
calls or changes to the existing execution budget. Reads are non-consuming
across root and child views. Contention returns unavailable.

Rust adds nullable `print_popups` to canvas status:

```text
{revision,frame,nodes:[{id,enabled,has_value,generation,frame,text}]}
```

Validate all flags/counts/typed payloads and format text off callback, sharing
the existing typed message formatter. Disabled/empty receipts produce no
display. The native frame clock remains48 kHz; audio-off status advances the
existing idle clock. Do not change scheduler elapsed-time clamping to implement
a visual notification.

## UI State And Rendering

Add a focused `canvas-print-ui.mjs` with snapshot validation and a pure merge
helper. Both controllers expose `printPopups` separately from saved params,
observations and console rows. Accept only matching runtime revision and valid
Print IDs; preserve cache on unavailable reads and clear on revision change.

For a newly seen receipt generation, derive its remaining lifetime from the
snapshot's frame age, then cap a local monotonic deadline at2000 ms. Repeated
polls of that generation must never extend the deadline or resurrect an expired
receipt. Native disable/clear hides immediately. Frontend monotonic time makes
expiry continue while the native/audio clock is paused. Newly opened views can
display a still-recent snapshot using its native frame age. An extended stall
of all polling while the capped idle clock is inactive is not qualified as an
exact wall-age reconstruction; it must not extend a deadline already observed
by an existing view.

Render a safe-text, noninteractive bubble adjacent to each visible Print box.
Expose it to accessibility without changing object labels, selection or saved
dimensions. Place to the right by default, flipping left at the viewport edge;
this finite placement policy is not Max's unestablished placement heuristic.
Use current100 ms polling for expiry rather than a new global animation loop.
Do not open or focus the console for a popup receipt. Console filters, Clear,
or closing the pane do not alter the independent per-object display state.

## Verification

Native tests establish default-off, enabled typed output, ordinary popup0 data,
disable/reenable clearing, two independent states, graph reset, old console ABI
preservation and non-consuming concurrent snapshot reads. Rust tests cover
strict saved schema, p1 live updates, malformed snapshots and typed formatting.
JS tests cover parsing/import, cache revision/generation/age/deadline boundaries,
null reads and independent objects. Real browser checks cover Inspector editing,
safe rendered bubble, expiry and the unchanged hidden console. Native desktop
checks exercise actual Print receipt and DSP-off expiry and keep the source
reveal revision fix covered by the existing hidden-child navigation scenario.

Run required contracts, affected/full suites, release build and private desktop
checks after integration, then record evidence and limitations. Keep whole-help
qualification at0/2103 until complete roots and all relevant actions pass.
