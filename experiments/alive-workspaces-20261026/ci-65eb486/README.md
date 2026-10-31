# CI 65eb486: First Replace Chooser Failure

Exact head `65eb48693262dcb20d5d1585b7a3ab6e392ae68c`, run
[40360213014](https://github.com/venetanji/alive/actions/runs/40360213014).
UI/Chromium, native/Rust and offline renders pass; the real desktop journey
fails at `check_alive_desktop.py:723` because the first Replace Pulse device
action does not produce a chooser observed as viewable by the existing poll.
Later clip/resource/CPAL gates skip. This is distinct from the fixed later
effect-cutoff assertion and the previous dependency-download timeouts.

The visible Replace control and normal fresh-template New state do not prove
input delivery. Retained evidence lacks native hit/DOM/command receipts and
failed chooser candidates. Root cause is unconfirmed here; a focused native
reproduction is required before changing input handling. The secondary missing
Audio details artifact comes from diagnostics still scoped to the absent chooser.
See diagnosis.md for the exact evidence and narrow next step.

Raw desktop artifacts remain under `/tmp/alive-ci-65eb486-desktop`; the inventory
retains hashes for all of them. Selected original failure evidence is copied
here. This failure record is retained separately from any subsequent fix.

Packages run 40360212684 finishes successfully on all four targets; tag
publication is skipped. See packages-final.json. This does not change the
desktop CI failure or qualify later local source.
