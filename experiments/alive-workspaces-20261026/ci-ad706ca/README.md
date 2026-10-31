# Checkpoint ad706ca CI

Run [40384189184](https://github.com/venetanji/alive/actions/runs/40384189184)
tests `ad706cae443df77781b27842097c590b547febd3`. UI/protocol, Chromium,
native/Rust, offline renders and the complete actual desktop/editor journey
pass. The subsequent clip/observability journey fails at
`check_alive_clips.py:108`: it waits for transient `pending launch`, but observes
`Playing Clip 1 copy / request 4 applied for Clip 1 copy`. Later editor-resource
and CPAL qualification gates skip. This run is not an overall CI pass.

Packages run `40384188941` passes Windows, Linux, Intel macOS and Apple Silicon
on the same head. Tag publication is skipped; retained results are in
`packages.json`. Package success does not replace the failed native CI gate.

The action log places Start and Launch about 1.412 seconds apart at tempo 112
(about 2.143 seconds per four-beat bar). Capture setup and accessibility/input
work occur before observing the receipt. Missing the transient window is a
hypothesis; the artifact lacks the first sample's time/frame and cannot prove
the original cause. It does show the requested copy playing/applied.

`run.json` and `failed.log` are the retained GitHub results. The screenshot,
clip observations, action log, capture supervision and app log come from the
downloaded `alive-clips-40384189184-1` artifact. `retained-hashes.json` covers
these retained inputs; `manifest.json` also inventories the full local download
and separate local observation probe, whose uncurated artifacts remain local.
Raw log bytes are preserved, including any original formatting/whitespace.

One subsequent local timing-only probe on the preserved coherent `4470230`
product observes pending then applied, so it does not reproduce this remote
failure. It later fails expanding the runtime disclosure after Open. No full
local clip pass or causal product repair is inferred from that probe. Diagnosis
and any correction must preserve the existing pending/applied, scoped Stop,
history, editor, save/reopen and Quit assertions.
