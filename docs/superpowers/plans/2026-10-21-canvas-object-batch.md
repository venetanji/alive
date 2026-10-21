# Canvas Object Batch Implementation Plan

**Goal:** Make the ten mapped objects available, editable, and executable in the native canvas, including `line`.

**Architecture:** Extend the existing bounded native graph rather than introduce a browser scheduler. Keep old graph kinds and document shape compatible, add bounded typed messages and configuration text, and run the native control clock while DSP is off. This implements a documented subset of Max behavior; whole Max help files still require an importer and support objects.

**Constraints:** Preserve all current local UI/navigation changes. No commits, pushes, proprietary asset copies, or original Max preference changes. At most 32 nodes, 64 edges, 8 atoms per message/configuration, 31 ASCII bytes per symbol, 127 bytes of configuration text, finite numeric values within -100000..100000.

## Shared Contract

Append kinds 15..24: int, float, flonum, slider, pack, unpack, select, route, trigger, line. Append `double p3,p4,p5; char text[128]` to the existing C node descriptor. Preserve old aggregate initializers. The new typed message C ABI has count, eight numeric values, eight atom tags (0 int, 1 float, 2 symbol), eight 32-byte symbols, and a 32-byte selector. Existing numeric event ABI remains available.

Parameters map in order to p0..p5:

| Object | Numeric Parameters | Text |
| --- | --- | --- |
| int / float | value=0 | none |
| flonum | value=0, minimum=-100000, maximum=100000, numdecimalplaces=6 | none |
| slider | value=0, size=128, min=0, mult=1, floatoutput=0 | none |
| pack / unpack | none | args="0 0" |
| select / route | none | args="0" |
| trigger | none | args="i i" |
| line | value=0, time=0, grain=20, floatoutput=2 | none |
| message | old numeric literal fields retained for old callers | literal message |

Pack has N inlets and one outlet; unpack/trigger have one inlet and N outlets; select has two inlets for one selector, otherwise one, and N+1 outlets; route has N+1 inlets/outlets (selector stores on additional inlets). Flonum has one inlet and numeric + Tab bang outlets; slider one inlet/outlet; line three inlets and value + completion bang outlets. Node-aware port functions must be used throughout validation, drawing, and event admission. Line positional authoring uses value/grain; time and output mode are named options. Slider UI sends raw0..size-1; min/mult affect the outlet only.

Message values accept old null/numeric arrays plus literal strings. Text supports numeric atoms, symbols, explicit list/symbol and named selectors such as set/stop/pause/resume; reject unsupported substitution, comma and semicolon syntax. Creation args preserve integer/float/symbol identity. Native traversal must emit outlets synchronously right-to-left for trigger and unpack, preserving existing edge fanout order.

## Tasks

- [x] Add native descriptor/message types and runtime behavior, with finite native tests for state, coercion, cold inlets, outlet order, routing and line timing/interruption.
- [x] Add Rust validation, C layout, typed IPC conversion, dynamic port validation and focused tests.
- [x] Add editor registry, aliases, autocomplete, dynamic port rendering and flonum/slider operation, with editor/browser tests.
- [x] Add DSP-off native clock ownership and stopped event execution, retaining callback ownership while audio runs; verify start/stop/reset transitions.
- [x] Add original runnable examples, update compatibility/protocol docs, and clearly distinguish object tests from installed help-file import.
- [x] Run JS/browser/native/Rust/contract checks, review integration, rebuild release, and report the executable to reopen.

## Final Verification

- Release build completed; the installed native library matches the built library.
- JavaScript: 117 passing; Chromium: 18 passing; WebKitGTK slider regression: 1 passing.
- Rust/native bridge: 36 passing, with the private audio test run separately and passing.
- Native object, existing canvas, sequencer, stopped-clock C ABI, sanitizer and contract checks pass.
- Private CPAL loopback passes with finite, non-silent stereo PCM and successful audio restart.
- Installed help intake admits all ten canonical types; complete `.maxhelp` files still require an importer.
- Independent integration review completed; no remaining actionable findings.
