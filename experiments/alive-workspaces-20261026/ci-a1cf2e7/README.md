# CI a1cf2e7: Hosted Editor Activation Failure

Exact head `a1cf2e71d93c138f7c710440f765900ff81f32eb`, run
[40374437793](https://github.com/venetanji/alive/actions/runs/40374437793).
UI/protocol/Chromium, native/Rust and offline renders pass. The actual desktop
journey fails at `check_alive_desktop.py:860` in the first `editor_edit()` call:
`check_documents_desktop.py:126` does not observe Pulse - Ultra Hosted Editor.
Later clip/resource/CPAL gates skip. This run passes both initial Replace
choosers and the earlier effect-editor/piano/history operation.

The expected instrument remains selected. Captures show inspector expansion
and about 88 pixels of board scrolling, but no receipt exists for the failing
Editor click. An input miss is a hypothesis; the evidence does not distinguish
input, handler, invocation or window creation failure. The later missing Audio
details artifact is a secondary diagnostic lookup under the absent editor scope.
See `diagnosis.md` for facts, source references and the narrow native probe.
No retry, larger timeout or weaker assertion is proposed as a substitute.

Raw desktop artifacts remain at `/tmp/alive-ci-a1cf2e7-desktop`; their complete
hash inventory is `raw-artifacts.json`. Selected original failure files and
exact run/job records are retained here. The earlier local native pass remains
separate evidence, and this remote failure is not relabeled as passing.

Packages run `40374437738` succeeds for Linux, Windows, Intel macOS and ARM
macOS on this same head. Tag publication is skipped; `packages.json` retains
the exact run and job records. Package success does not qualify the failed
desktop journey.
