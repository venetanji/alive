"""Bounded, GI-free wall-time diagnostics for one native desktop journey.

Query totals are inclusive: wait_for may contain scoped_find and walk, so
totals overlap and must never be added together or interpreted as CPU time.
Walk cost includes only generator execution, excluding time suspended at yield.
"""
from collections import deque
from contextlib import contextmanager
from datetime import datetime, timezone
from functools import wraps
import json
from pathlib import Path
import sys
import threading
import time
import traceback


class TimingProbe:
    def __init__(self, output, *, stream=None, clock=time.monotonic,
                 interval=20, retention=128, max_snapshots=64):
        if not 0 < interval <= 30 or not 1 <= retention <= 256 or not 1 <= max_snapshots <= 128:
            raise ValueError('Timing bounds exceeded')
        self.path = Path(output) / 'journey-timing.json'
        self.stream = sys.stdout if stream is None else stream
        self.clock, self.interval = clock, interval
        self.max_snapshots = max_snapshots
        self.events = deque(maxlen=retention)
        self.queries = {}
        self.active = []
        self.active_count = 0
        self.lock = threading.RLock()
        self.local = threading.local()
        self.stop = threading.Event()
        self.observer = None
        self.owner = threading.get_ident()
        self.snapshots_emitted = self.events_dropped = self.checkpoints_emitted = 0
        self.terminal_emitted = 0
        self.closed = False

    def _row(self, event, control=''):
        return {'event': event, 'control': str(control)[:256],
                'utc': datetime.now(timezone.utc).isoformat(), 'monotonic': self.clock()}

    def _state(self):
        now = self.clock()
        return {'accounting': 'inclusive wall seconds; query totals overlap; walk excludes yield suspension',
                'events': list(self.events),
                'queries': {kind: stats.copy() for kind, stats in self.queries.items()},
                'active': [{'kind': span['kind'], 'control': span['control'],
                            'running_seconds': now - span['started']} for span in self.active[-32:]],
                'active_omitted': self.active_count - len(self.active),
                'snapshots_emitted': self.snapshots_emitted, 'events_dropped': self.events_dropped}

    def _record(self, row, *, periodic=False):
        # Only this helper's short bookkeeping/IO uses the lock; no native call does.
        with self.lock:
            if len(self.events) == self.events.maxlen:
                self.events_dropped += 1
            self.events.append(row)
            state = self._state()
            temporary = self.path.with_suffix('.tmp')
            temporary.write_text(json.dumps(state, indent=2))
            temporary.replace(self.path)
            terminal = row['event'] in ('failure', 'phase-failure', 'report-write',
                                       'final-quit-entry', 'final-quit-exit',
                                       'journey-complete', 'observer-stop')
            allowed = self.terminal_emitted < 16 if terminal else self.checkpoints_emitted < self.events.maxlen
            if periodic or allowed:
                print(json.dumps(row), file=self.stream, flush=True)
                if terminal:
                    self.terminal_emitted += 1
                elif not periodic:
                    self.checkpoints_emitted += 1

    def checkpoint(self, event, control=''):
        self._record(self._row(event, control))

    def _resume(self, span):
        with self.lock:
            span['started'] = self.clock()
            self.active_count += 1
            if len(self.active) < 32:
                self.active.append(span)

    def _pause(self, span):
        with self.lock:
            span['elapsed'] += self.clock() - span['started']
            self.active_count -= 1
            for index, active in enumerate(self.active):
                if active is span:
                    del self.active[index]
                    break

    def _span(self, kind, control):
        return {'kind': kind, 'control': str(control)[:256], 'elapsed': 0.}

    def _finish(self, span, error=False):
        with self.lock:
            stats = self.queries.setdefault(span['kind'], {
                'count': 0, 'inclusive_elapsed_seconds': 0., 'max_seconds': 0., 'errors': 0})
            stats['count'] += 1
            stats['inclusive_elapsed_seconds'] += span['elapsed']
            stats['max_seconds'] = max(stats['max_seconds'], span['elapsed'])
            stats['errors'] += int(error)

    def wrap(self, kind, function):
        if kind not in ('wait_for', 'scoped_find'):
            raise ValueError('Unknown query kind')

        @wraps(function)
        def measured(*args, **kwargs):
            span = self._span(kind, args[0] if args else kwargs.get('name', ''))
            self._resume(span)
            error = False
            try:
                return function(*args, **kwargs)
            except BaseException:
                error = True
                raise
            finally:
                self._pause(span)
                self._finish(span, error)
        return measured

    def wrap_walk(self, function):
        @wraps(function)
        def measured(*args, **kwargs):
            # The original recursive walk resolves its global name lazily. Keep
            # those nested generators inside the root traversal's inclusive span.
            iterator = function(*args, **kwargs)
            if getattr(self.local, 'walk_depth', 0):
                return (yield from iterator)
            return (yield from _WalkIterator(self, iterator))
        return measured

    @contextmanager
    def phase(self, name):
        self.checkpoint('phase-entry', name)
        span = self._span('phase', name)
        self._resume(span)
        try:
            yield
        except BaseException:
            self.checkpoint('phase-failure', name)
            raise
        else:
            self.checkpoint('phase-exit', name)
        finally:
            self._pause(span)

    def _observe(self):
        for _ in range(self.max_snapshots):
            if self.stop.wait(self.interval):
                return
            with self.lock:
                self.snapshots_emitted += 1
                row = self._row('periodic')
                row.update({key: value for key, value in self._state().items()
                            if key in ('active', 'active_omitted', 'queries')})
                frame = sys._current_frames().get(self.owner)
                row['stack'] = ''.join(traceback.format_stack(frame, limit=40))[-12000:] if frame else ''
                self._record(row, periodic=True)

    def __enter__(self):
        self.checkpoint('journey-entry')
        self.observer = threading.Thread(target=self._observe, name='desktop-timing', daemon=True)
        self.observer.start()
        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            if exc_type:
                self.checkpoint('failure', exc_type.__name__)
        finally:
            self.close()

    def close(self):
        self.stop.set()
        if self.observer is not None:
            self.observer.join()
        if not self.closed:
            self.closed = True
            # Return, failure and atexit all close observation; none proves that
            # the full journey (especially the final Quit assertion) completed.
            self.checkpoint('observer-stop')


class _WalkIterator:
    """Forward generator protocol while timing only active root execution."""
    def __init__(self, probe, iterator):
        self.probe, self.iterator = probe, iterator
        self.span = probe._span('walk', 'accessibility traversal')
        self.started = self.finished = False

    def __iter__(self):
        return self

    def _step(self, method, *args):
        if self.finished:
            return method(*args)
        self.started = True
        self.probe._resume(self.span)
        self.probe.local.walk_depth = getattr(self.probe.local, 'walk_depth', 0) + 1
        done = error = False
        try:
            return method(*args)
        except StopIteration:
            done = True
            raise
        except BaseException:
            done = error = True
            raise
        finally:
            self.probe.local.walk_depth -= 1
            self.probe._pause(self.span)
            if done:
                self.finished = True
                self.probe._finish(self.span, error)

    def __next__(self):
        return self._step(self.iterator.__next__)

    def send(self, value):
        return self._step(self.iterator.send, value)

    def throw(self, *args):
        return self._step(self.iterator.throw, *args)

    def close(self):
        try:
            if self.started and not self.finished:
                self._step(self.iterator.close)
            else:
                self.iterator.close()
        finally:
            if self.started and not self.finished:
                self.finished = True
                self.probe._finish(self.span)
