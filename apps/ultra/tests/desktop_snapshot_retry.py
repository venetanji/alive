"""Retry an entire transient accessibility snapshot, never a partial one."""
import time


class SnapshotIncomplete(RuntimeError):
    """The accessibility tree changed while a snapshot was being read."""


def retry_snapshot(read, transient_error, *, seconds=3, clock=time.monotonic, sleep=time.sleep):
    deadline = clock() + seconds
    while True:
        try:
            return read()
        except transient_error:
            if clock() >= deadline:
                raise
            sleep(.05)
