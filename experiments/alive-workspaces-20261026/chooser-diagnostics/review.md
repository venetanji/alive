# Chooser Diagnostic Slice Review

Reviewed base `a0c34e3006dc920632ec95609ff6e280a70769dd` through scoped test commit `0bbad1814dcd8eb58b39be42517aed1466e8a8f2`, using the supplied complete diff and the brief, diagnosis, report, frozen manifest and focused raw evidence. Controller ruling accepted: this slice adds diagnostics and repairs the stale helper name; it does not fix a reproduced 65eb486 chooser defect.

Spec verdict: the narrowed scope, original workflow preservation and local verification are satisfied, except that observational native-query errors are not reliably nonfatal. Quality verdict: CHANGES_REQUESTED for the P2 finding below. No production/native behavior repair is justified by the retained CI evidence.

## Finding

1. **P2 - A disappearing native window can make observation terminate the test.** `apps/ultra/tests/check_alive_desktop.py:198` calls raw `XFetchName` (and subsequently `XGetWindowAttributes` and window-property queries) for IDs retained from an earlier hit-path or root-tree snapshot. A transient tooltip, chooser or other native window can disappear between those operations. Xlib's default protocol-error handler terminates the process on `BadWindow`; it does not raise a Python exception, so the guards at line 223 and line 379 do not contain this failure. This newly inserted pre-input observation can therefore stop Replace before its original motion/press/release. The added root-window observation at line 376 can similarly prevent the unchanged missing-chooser assertion at line 383 from being raised. Use a scoped native error trap or equivalent best-effort query isolation for the new observational queries, retain a vanished-window/error receipt, and verify that input continues and the original chooser assertion remains authoritative when a snapshot ID disappears. Preserve the existing input order and poll bounds.

The finding was verified with one narrow actual-Xlib check under `xvfb-run -a`, without launching or modifying Alive. The check AST-extracted the actual `WindowAttributes`, `native_window_record` and `observe_replace_input` implementations, created and destroyed a real X window, synchronized its destruction, returned that stale ID as the hit-path snapshot, then invoked the actual `before` observer inside a Python `try/except Exception`. The child exited 1 with `X Error of failed request: BadWindow (invalid Window parameter)`, major opcode 20 (`X_GetProperty`); neither the observer nor outer Python exception handler returned. This is a deterministic diagnostic-error check, not a reproduction or explanation of the original CI failure.

The correction must retain the original snapshot/native-owner evidence requirements and every existing helper ownership assertion. A vanished observation may be recorded as such; it must not be converted into a fabricated ownership receipt.

## Exact Narrow Reproduction

Working directory: `/home/venetanji/.codex/worktrees/edd5/alive`. Source and captured output are retained in this review file; execution used stdin and did not create a separate reproduction script or log. The source under test is `apps/ultra/tests/check_alive_desktop.py` at the pinned reviewed bytes. Exact command:

```bash
python - <<'PY'
import subprocess
script = r'''
import ast, ctypes as C, ctypes.util, os, pathlib, time
from types import SimpleNamespace
x=C.CDLL(ctypes.util.find_library('X11'))
x.XOpenDisplay.argtypes=[C.c_char_p];x.XOpenDisplay.restype=C.c_void_p
d=x.XOpenDisplay(os.environ['DISPLAY'].encode())
x.XDefaultRootWindow.argtypes=[C.c_void_p];x.XDefaultRootWindow.restype=C.c_ulong
x.XCreateSimpleWindow.argtypes=[C.c_void_p,C.c_ulong,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_uint,C.c_ulong,C.c_ulong];x.XCreateSimpleWindow.restype=C.c_ulong
x.XDestroyWindow.argtypes=[C.c_void_p,C.c_ulong];x.XSync.argtypes=[C.c_void_p,C.c_int]
x.XFetchName.argtypes=[C.c_void_p,C.c_ulong,C.POINTER(C.c_char_p)];x.XFree.argtypes=[C.c_void_p]
w=x.XCreateSimpleWindow(d,x.XDefaultRootWindow(d),0,0,10,10,0,0,0)
x.XDestroyWindow(d,w);x.XSync(d,0)
source=ast.parse(pathlib.Path('apps/ultra/tests/check_alive_desktop.py').read_text())
subset=ast.Module(body=[n for n in source.body if getattr(n,'name','') in ('WindowAttributes','native_window_record','observe_replace_input')],type_ignores=[])
ui=SimpleNamespace(x=x,display=d)
windows=SimpleNamespace(scope='Alive');native_inputs=[]
window_property=lambda *args: []
native_hit_path=lambda *args: [w]
exec(compile(subset,'review-extracted-functions','exec'))
print('CALL actual extracted observer with window destroyed after hit-path receipt',flush=True)
try:
 observe_replace_input('before','Replace Pulse device',SimpleNamespace(x=0,y=0,width=10,height=10))
 print('OBSERVER RETURNED',native_inputs,flush=True)
except Exception as error:
 print('PYTHON CAUGHT',repr(error),flush=True)
'''
r=subprocess.run(['xvfb-run','-a','python','-c',script],capture_output=True,text=True)
print('exit',r.returncode);print(r.stdout);print(r.stderr)
PY
```

Captured output (outer capture command exit 0; actual Xvfb observer child exit 1):

```text
exit 1
CALL actual extracted observer with window destroyed after hit-path receipt

X Error of failed request:  BadWindow (invalid Window parameter)
  Major opcode of failed request:  20 (X_GetProperty)
  Resource id in failed request:  0x200001
  Serial number of failed request:  10
  Current serial number in output stream:  10
```

## Evidence Checked

- All 224 entries in `/tmp/alive-workspaces-chooser-ci-fix/frozen-manifest.json` match the actual evidence bytes. Its report hash matches `chooser-ci-fix-report.md`. Every final source/UI/binary hash in `final-source-binary-pins.json` matches the actual named file.
- Independently reconstructed the base test text in memory from the supplied diff, validating every hunk against current pinned bytes. All original Alive functions, including `run()` and `choose_file()`, have identical ASTs except `focus_chooser()`. Removing only its appended failure-observation statements yields its identical original AST. Removing the optional observer argument and its two branches yields the identical original generic `click()` AST. Original actions, assertions, saved values, native motion/press/release order, focus/rectangle ordering and sleeps remain intact.
- Replace alone receives the added observer via the exact full-match control-name route. It follows the original click path, with no retries, synthesized DOM activation or substitution of the selector's native-owner helper. Native hit traversal retains the existing 32-iteration bound; property reads request at most 16 entries; final root records cap at 128. Added synchronous native round trips occur before input. The full run records approximately 0.633 ms and 0.476 ms for its first two pre-input observations. The report correctly discloses that observation may affect a race and that receipt-write time is excluded. Raw full-journey evidence contains a third later Harmony replacement, for six observer rows total; the report's four-row wording describes only the first pair.
- `baseline.exit`, `trace.exit` and `trace-minimal.exit` are 0 with their expected success lines. Native trace geometry/input batches and decoded DOM receipts agree with successful focus-induced scrolling, delivery to Replace and native chooser creation. `trace-forced.exit` is 1 at the missing genuine-tooltip precondition, consistent with the report's explicit refusal to treat it as causal RED.
- `helper-red.log` contains the precise stale `force_reorder_tooltip` AttributeError. The one-name repair uses the existing `force_covering_tooltip`. Serial `helper-final.exit` is 0; its raw report shows a genuine covering native tooltip, one accepted Earlier press/release, restored saved effects exactly equal to the original chain, moved effects in reverse order, two ready-before-release/released slash entries, and successful Quit.
- Diagnostic RED fails specifically for the absent Replace receipt. Diagnostic GREEN and final diagnostic exit 0. Final failure JSON retains the deliberately absent title, empty candidate list, viewable owned Alive root record, and bounded root-window metadata. The final diagnostic was the disclosed concurrent run and includes another Alive process's windows; the successful serial helper and full journey provide the uncontaminated final workflow checks.
- `full-original-run.json` records exit 0 and 193.556636244 seconds; the raw log reaches `journey-complete`. The saved `journey.alive` directly retains Pulse gain 0.55, instrument cutoff 1333 and effect cutoff 2000. Unchanged journey assertions retain automation 1200, identity/history/source-refusal/editor/Save/reopen/canceled-close/Quit obligations. Raw final reports agree on software PipeWire capture, requested recorder stop and successful Quit. The frozen cleanup/capture check reports all samples finite, zero unequal stereo frames, and neither owned recorder PID remaining. No stereo-separation, physical-audio or endurance claim is warranted or made.

No broad suites or native journey reruns were performed by this review. No source, test, index, HEAD, app, build, settings or unrelated native files were changed; this review file is the only authored artifact.

## Residual CI Limit

The exact 65eb486 failure still has no causal native-input/DOM/command/presentation receipt. Original local prefix and complete local journey success do not establish that the CI defect is fixed. After the observational error handling is corrected and narrowly verified, the final pushed commit still requires its own remote CI run and artifact review. Preserve the implementer's DONE_WITH_CONCERNS conclusion.
