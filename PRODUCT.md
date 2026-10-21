# Alive / Ultra

<!-- impeccable:product-schema 1 -->

## Platform

web

Ultra's editor uses local HTML/CSS/JavaScript inside the existing Rust/Tauri Linux
desktop app. The browser preview edits documents; the native app executes control
messages and audio.

## Users

Musicians and patch authors building small instruments and control patches.
The current user knows Max/MSP and explicitly wants its editing workflow and
compact visual language as the blueprint.

## Product Purpose

Author, understand, connect, save, reopen, and play a bounded patch without having
to configure every object through permanent side panels.

## Capabilities and Constraints

- The existing `ultra-canvas-v1` profile supports 25 object kinds, 32 nodes and
  64 edges. Control, mono audio and stereo bundles have distinct port types.
- Native control objects and ramps operate with audio off. Typed messages and
  variadic object ports are bounded; complete Max help import is not supported.
- The native Clockwork/Faust engine supports two prepared voice banks at 48 kHz.
  UI editing must retain the existing Rust/native validation and safety rules.
- Supported object names and arguments must be explicit. Unsupported objects
  must be rejected visibly. Familiar appearance does not imply Max compatibility.
- Linux desktop is the shipped target. A smaller browser preview remains useful
  for document editing and UI verification, without synthesizing sound.
- Preserve user projects, original Wine preferences, local work and the draft PR.
  Study installed Max/Live in disposable copies on a private display.

## Brand Commitments

The product is Ultra. The user confirmed a close Max visual and workflow match
on 2026-10-20. Build original controls and help content; do not redistribute Max
code, fonts, proprietary help patches, icons, or application assets.

## Evidence on Hand

`PLAN.md` records the first canvas, its runtime boundaries, and the assigned local
UI investigation. `experiments/max-reference/` records prior local Max semantics.
New UI observations belong in `experiments/max-ui-reference/` with execution and
coverage limits kept explicit.

## Product Principles

- Put the authored patch first.
- Make object creation and editing direct and keyboard accessible.
- Explain accepted inlet messages separately from emitted outlet values.
- Keep observed Max behavior separate from Ultra's implemented semantics.
