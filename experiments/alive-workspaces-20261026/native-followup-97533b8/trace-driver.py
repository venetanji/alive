import sys, runpy, faulthandler, time
sys.path.insert(0, "/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/tests")
faulthandler.dump_traceback_later(45, repeat=True)
def trace(frame, event, arg):
    if frame.f_code.co_filename.endswith("check_alive_desktop.py") and frame.f_code.co_name == "run":
        if event == "line":
            print("TRACE", time.monotonic(), frame.f_lineno, flush=True)
        return trace
    return None
sys.settrace(trace)
runpy.run_path("/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/tests/check_alive_desktop.py", run_name="__main__")
