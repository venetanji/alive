# Alive Editor Lifecycle Review

Verdict: no outstanding blocking finding in the reviewed Linux editor teardown
workaround. The native eight-reopening result supports the proposed fix for
the observed per-editor resource retention. This is a scoped review, not a
claim that post-fix long-duration endurance or other platforms were tested.

## Finding And Diagnosis

The original real-native endurance run exposed material resource growth despite
continued playback: process-tree PSS increased from 583405 to 1693900 KiB and
file descriptors from 328 to 1046. A separate repeated-editor probe isolated
the growth without schedule Apply: eight reopenings left nine WebKit web
processes, compared with one initially.

Pinned dependency source contains a concrete ownership cycle:

- `wry-0.53.5/src/webkitgtk/mod.rs:628` obtains the webview's
  `UserContentManager` in `attach_ipc_handler`.
- The manager's `script-message-received` closure at line 635 strongly captures
  the supplied webview, using it to obtain the request URI at line 642.
- This yields `WebView -> UserContentManager -> IPC closure -> WebView`.
  GTK widget destruction does not by itself remove that manager closure.

The dependency paths above are relative to
`experiments/clockwork-faust/.deps/cargo/registry/src/index.crates.io-1949cf8c6b5b557f/`.
`apps/ultra/src-tauri/Cargo.lock` pins Wry 0.53.5, Tauri runtime Wry 2.8.1,
and Tao 0.34.8. The installed WebKitGTK version is 2.54.1.

Changing Tauri `close()` to `destroy()` would not address this cycle. In
`tauri-runtime-wry-2.8.1/src/lib.rs:4187`, Close follows the close-request path;
an unprevented request and Destroy both reach `on_window_close` at line 4251.
The native destroyed event removes the wrapper at line 4129. Wry's
`InnerWebView::drop` at `wry-0.53.5/src/webkitgtk/mod.rs:96` already explicitly
destroys its GTK webview.

Ordinary WebKit process caching was considered, but does not fully explain the
original endurance evidence. WebKit tag `webkitgtk-2.54.1`,
`Source/WebKit/UIProcess/WebProcessCache.cpp:51`, sets non-Cocoa process-cache
lifetime to five minutes. Its capacity is zero unless the cache model is
PrimaryWebBrowser (line 324), otherwise bounded to at most 32 processes
(lines 337-351). In the endurance JSON, PID 364667 survives at least 784 seconds,
and other editor processes survive at least 837 seconds. The application-level
fix also eliminates growth without changing the shared cache policy.

## Independent GTK Experiment

Used inline Python ctypes against installed GTK 3, GObject, and WebKitGTK 4.1,
under a private `xvfb-run -a` display. No repository or user settings were
modified. An ephemeral WebKit context avoids persistent browser data.

The experiment emulated Wry's manager signal closure with a native strong
webview reference and a closure destruction callback. Native reference counts
before widget destruction were view 2, manager 1. After
`gtk_widget_destroy(view)` plus dropping the external owner, counts remained
view 1, manager 1, and the closure destruction callback had not run.

Disconnecting `script-message-received` by signal ID destroyed the closure and
released its retained webview reference. A second experiment performed the
same disconnection from inside the GTK `destroy` callback, temporarily holding
the manager reference as the Rust property access does. Output was:

```text
['IPC strong view released', 'destroy hook removed 1 handler']
```

Both focused disconnection experiments exited successfully. An initial test
using GObject weak-notify alone was inconclusive because weak notifications
can run during disposal; the native refcount and closure-destruction evidence
above is the basis for this diagnosis.

## Workaround Safety Review

Reviewed `apps/ultra/src-tauri/src/session/desktop.rs:171` and its installation
in `alive_editor` at line 164.

- The hook is Linux-only and installed only on optional Alive editor windows.
- Installation uses Tauri `with_webview`; GTK callbacks run through the native
  webview/main-loop path.
- The `destroy` callback captures no strong reference to the webview.
- The manager property is held as a strong `glib::Object` throughout handler
  disconnection, protecting it while closure destruction releases references.
- `SignalId::lookup` obtains the signal for the actual manager type.
  `G_SIGNAL_MATCH_ID` targets `script-message-received` handlers on this
  editor's own manager; the GTK destroy handler is a different signal/object.
- Disconnection occurs only during UI destruction. Existing native Host/Driver
  ownership and generation checks remain intact. Already-dispatched backend
  operations retain their normal authorization path.

The unsafe FFI operation matches the installed GObject API and the independently
tested signal operation. It is a dependency-specific workaround; an eventual
upstream weak-reference fix in Wry could remove the need for it.

## Native Before/After Evidence

Read and compared the actual probe artifacts provided by the implementation
owner. The reviewer did not rerun these complete Tauri probes.

| Metric | Original probe | Fixed probe |
| --- | --- | --- |
| Editor reopenings | 8 | 8 |
| WebKit web processes, initial/final | 1 / 9 | 1 / 1 |
| File descriptors, initial/final | 145 / 642 | 145 / 151 |
| Process-tree PSS KiB, initial/final | 431114 / 1005887 | 434920 / 473579 |
| Observation span | 52.02 seconds | 77.38 seconds |

Original artifact:
`/tmp/alive-editor-resource-red/resource-probe.json`.
Fixed artifact:
`/tmp/alive-editor-resource-fixed/editor-resources.json`.
The fixed artifact contains ten samples: before editors, eight closed-editor
samples, and after idle. Every fixed sample reports one WebKit web process and
the same three process IDs. Both probes include a final idle observation.
The implementation owner reports original probe failure and fixed probe exit 0.

Reviewed the committed candidate helper
`apps/ultra/tests/check_alive_editor_resources.py`: it uses the actual private
desktop harness, starts transport, performs eight editor edits/close/reopen
cycles, observes resources after each close, waits 25 seconds, and asserts
bounded descriptors, worker count, and PSS. The artifact's modest fixed PSS/FD
increase is consistent with bounded initialization/allocator variation; this
short test does not establish a zero-growth guarantee over arbitrary duration.

The single-context macro change for macOS duplicate `_EMBED_INFO_PLIST` and
portable Atspi iteration are parent-owned and outside this review. No
production files were edited by this reviewer.
