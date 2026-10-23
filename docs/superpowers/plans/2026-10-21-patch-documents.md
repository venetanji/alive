# Patch Documents Implementation Plan

> **For agentic workers:** Execute the independent tasks in parallel, then integrate and review the combined application. Use failing behavioral tests before production changes.

**Goal:** Open patch files through the OS, browse help in the app, and run independent patch windows with shared audio and named messages.

**Architecture:** A native document registry maps Tauri windows to independent bounded native graph slots. One shared audio engine renders isolated instrument banks, and a bounded named-message dispatcher connects runtimes. A checked original help manifest serves native windows and browser UI.

**Tech Stack:** Tauri 2.8.5, Rust, C++17/20 and Clockwork/Faust, ES modules, Chromium and WebKit desktop tests.

**Spec:** `docs/superpowers/specs/2026-10-21-patch-documents-design.md`

## Global Constraints

- Preserve the established compact Max-inspired interface and existing dirty work.
- Limit to 16 open documents, 32 nodes and 64 edges per graph.
- No callback allocation, locks, I/O or unbounded named-message dispatch.
- Browser preview does not claim native execution or audio.
- Read installed Max reference/help evidence without redistributing its assets.

## Tasks

- [x] Research installed Max document/help/send/receive contracts; record evidence and limitations.
- [x] Add send/receive model, catalog, import and Rust preparation with behavioral tests.
- [x] Add native graph slots, isolated instrument banks and bounded global named dispatch; test state and voice isolation, feedback and close.
- [x] Add native document registry, file picker/save, single-instance file delivery, menus and window lifecycle; test safe persistence and identity.
- [x] Build the in-app library and document controls; test keyboard, examples/help new-window flow, preview file input and focus behavior.
- [x] Integrate commands and checked help data; run model, native, Rust and browser suites.
- [x] Build and exercise real desktop multiwindow/file/help behavior and shared audio in the private test session.
- [x] Review the combined diff, resolve findings, document final behavior and report verification limits.

## Verification

- Portable contract gate: 184 JavaScript tests, Python/reference checks and standalone C++ graph/workspace tests pass.
- Browser suite: 59 tests pass, including keyboard document actions and the 16-window library at 640x480.
- Rust release suite: 51 pass, one hardware/device-dependent test ignored. Native FFI tests serialize access to the process-wide runtime.
- Native document tests and instrumented core envelope tests pass, including mixing all 16 documents and 256 events across 32 banks without callback allocation or locks.
- Actual Tauri/WebKit desktop document pass: native menus, file forwarding/deduplication, Open picker, Save and close prompts, separate help windows, typed cross-window messages and shared CPAL capture pass. At 48 kHz/512 software frames, both channels peak at 0.0062000123; stopping the left document leaves left exactly zero and right unchanged.
- Launcher/MIME descriptions installed for the current user; GIO recognizes both Ultra and Max patch types and offers Ultra.
- Source-bound Max research maps regenerate identically. These are static reference/help inspections, not new Max runtime parity measurements.
- UI confirmation review and native document lifecycle review report no remaining material findings. Audio verification uses private software PipeWire, not hardware latency measurements.
- Final combined desktop regression passes both the existing canvas/print/audio checks and the new document workflow. Evidence: `/tmp/ultra-documents-desktop-final/result.json` and `/tmp/ultra-documents-desktop-final/documents-result.json`.
