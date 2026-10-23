# Native Cable Cache and Gain Save

Actual sandbox-enabled release Rust/Tauri/WebKit, private Xvfb+twm, physical XTest input. Private software PipeWire is configured48kHz/512frames, but audio stays off. Instrumentation records path/rebuild counters and queries canonical descriptors; authoring, Stop, Save, and navigation use physical events. Only a disposable copy of the original starter is saved.

## Cache Invalidation Followed by Stable Polling

| Action | Path Writes During Action | SVG Rebuilds | Subsequent Stable Stopped Polls |
| --- | ---: | ---: | ---: |
| Move object15 by(35,20) | 544 | 17 | 14 |
| Zoom100% to120% | 32 | 1 | 14 |
| Resize X window to1100x760 | 32 | 1 | 13 |
| Focus ports and press Return, connecting15:0 to3:0 | 133 | 4 | 14 |

Each action increases path writes; subsequent intervals contain continuing stopped polls with zero additional path writes or cable SVG rebuilds. Movement also changes actual path geometry and canonical position from(180,50) to(215,70). Wiring increases the authoritative edge count16->17.

Manual reproduction: open a disposable starter copy, stop audio, move a connected node, zoom, resize the window, and focus source/destination ports with Return to add the cable. For each action, observe fresh geometry once the action completes, then unchanged cable counters across continuing status polls. These numbers establish invalidation/reuse, not minimal work during a continuous gesture or absence of all layout/DOM work.

Movement, zoom, and resize evidence comes from run1, which later stopped because a physical port-drag attempt produced feedback but no admitted connection. That attempt is not counted as successful wiring. Run2 uses supported focused-port Return and completes the remaining checks.

Evidence: `cache-invalidation-snapshots.json`; `native-cache-gain-2/result.json`, `native-cache-gain-2/snapshots.json`, `cache-after-wiring.png`.

## Latest Gain Values Survive Stop and Save

Lock the patch, focus Gain7, press Home followed by seven separate Right-arrow keys. Repeat for Gain12. Both admit ordered keyboard values0..7, after an initial face click admits64. Click Stop patch, then CtrlS to save only the disposable document. Saved JSON retains Gain7=7 and Gain12=7; native descriptor has dirty=false and no unsaved indicator.

Evidence: `gains-before-stop` and `gains-after-stop-save` canonical patches in `native-cache-gain-2/snapshots.json`, result gainLatest, and `gain-saved.png`. This uses normal IPC timing; it does not exercise an artificially delayed commit backlog, concurrent typing during Save, hardware output, or cross-document sounding isolation.

## Native Child

Physically create `p cachechild`, select its header, and press Enter. Native `document_open_patcher` is called once, opening an empty child. Its own stopped poll counter advances18->28 while cumulative paths32/rebuilds2 stay unchanged; current cable elements are zero. Startup preview can account for nonzero cumulative counters before authoritative empty-child adoption.

Parent and child use separate native windows/controllers. This confirms fresh child adoption and stopped reuse, not in-place document replacement or focus-driven invalidation of the preserved parent. Synthetic probes cover in-place document/hierarchy changes. Evidence: childStableMetrics in result.json and `native-child.png`.
