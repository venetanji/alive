# Integration desktop follow-up

This adds results from `/workspace/alive`, branch `integration/ultra-rc1-review`, in the supplied execution environment. Original PR5 logs and conclusions are unchanged.

The canvas harness now checks the semantics of physical `+ 7` creation: exactly one `add` node, RHS 7, integer numeric mode 1. `canvas-arithmetic.mjs` explicitly gives newly created arithmetic objects mode 1; omitted mode instead represents the legacy mode. The old exact dictionary expectation rejected the valid explicit integer default. It has not been converted into a native desktop pass.

Python compilation of the three affected desktop harnesses and shell syntax validation passed. The assertion change is a low-impact harness correction; no source-mirroring test was retained, and no native descriptor acceptance pass is claimed.

## Normal desktop attempts and portability fixes

Ran the published setup and existing runner, without installing dependencies or changing sandbox settings:

```sh
source /workspace/alive-setup/activate.sh
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/ultra-rc1-desktop-followup
```

Exit status 1. All prerequisite commands were found after activation. The startup probe exited before opening the UI: `check_document_startup.py` overwrote `LD_LIBRARY_PATH` with only the binary directory, dropping the activated sysroot, and the dynamic loader could not find `libwebkit2gtk-4.1.so.0`. The runner also attempted the absent `/usr/lib/at-spi2-registryd`. See the preserved new `startup-app.log` and `registry.log`.

Corrected the two Python launch sites (`check_document_startup.py` and `check_documents_desktop.py`) to prepend the binary directory to the inherited library search path, asserting that the adjacent `libultra_native.so` exists. Corrected the shell harness to locate an existing accessibility registry via PATH or conventional system/sysroot locations. The existing system daemon is `/usr/libexec/at-spi2-registryd`; no new daemon or environment configuration was installed.

Reran the same runner with output directory `/tmp/ultra-rc1-desktop-followup-portable`. The registry started successfully, and the dynamic loader reached WebKit. Exit status remained 1 before UI initialization: WebKit could not spawn `/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/WebKitNetworkProcess` (No such file or directory). See `portable-startup-app.log` and `portable-registry.log`. No helper-location override, sandbox workaround, or further desktop retry was attempted. No desktop scenario passed in these attempts.

## Nested-patcher timeout remains unresolved

Original `logs/documents-desktop.log` passes through the MSP scenario, then times out opening patcher 3 (`control boundary`) via physical double-click. Its helper focuses the root, reads accessibility screen coordinates, sends two XTest press/release pairs 70 ms apart, and waits for a distinct child window. It records accessibility visibility and the focused X window; those do not prove which DOM element received the gesture or whether `document_open_patcher` was invoked. The native navigation JSON/screenshot named by the failure helper are not present in the committed evidence tree.

Source routes the node article's `dblclick` event through `edit` to `navigatePatcher`, which flushes and calls `document_open_patcher`; patchers are not excluded by the control/lock gate. Existing `native patcher headers request a child window while retaining the parent view` DOM regression passes, but dispatches a synthetic article event and does not establish physical WebKit gesture delivery. Separate PR5 `frontend/native-cache-gain.md` proves physical header selection plus Enter opens a child; that evidence does not prove double-click works.

A useful next desktop run must retain the failed double-click assertion and capture the delivered DOM pointer/click/dblclick target and native open-command outcome. Compare the supported Enter path only as a separate diagnostic after recording failure, without allowing it to satisfy the double-click scenario. No production handler cause is established here, and downstream hierarchy lifecycle checks remain unverified.
