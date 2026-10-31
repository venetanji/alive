"""Driving-thread coordination for bounded sustained measurement.

The caller owns UI access, resource sampling, recorder supervision and cleanup.
"""
from contextlib import contextmanager
import math
import threading


class ProcessDisappeared(RuntimeError):
    """The driving thread has confirmed that the observed process exited."""


class SustainedMeasurement:
    def __init__(self, epochs, playing, gap_log, action_log, clock):
        self.epochs, self.playing = epochs, playing
        self.gap_log, self.action_log, self.clock = gap_log, action_log, clock
        self.action_ordinal, self._depth = 0, 0
        self._thread = threading.get_ident()
        self._health = lambda: None
        self._disappearance = None

    def _check(self):
        if threading.get_ident() != self._thread:
            raise RuntimeError('measurement_wrong_thread')
        if self._disappearance is not None:
            raise self._disappearance
        self._health()

    def _gap(self, reason):
        self.playing.last = None
        self.gap_log.write({'kind': 'observation_gap', 'monotonic': self.clock(), 'reason': reason})

    def observe(self, read):
        self._check()
        try:
            record, running, frames = read()
        except ProcessDisappeared as error:
            self._disappearance = error
            self._gap('process_disappeared')
            raise
        except Exception:
            self._gap('observation_failed')
            return None
        valid = (isinstance(record, dict) and 'error' not in record and
                 isinstance(record.get('run_id'), str) and bool(record['run_id']) and
                 isinstance(record.get('coverage_gap'), bool) and
                 isinstance(record.get('completed'), list) and
                 isinstance(record.get('complete'), bool) and 'active' in record and
                 (record['active'] is None or isinstance(record['active'], dict)))
        if not valid:
            self._gap('diagnostics_unavailable_or_invalid')
            return None
        if (running not in ('true', 'false') or not isinstance(frames, str) or
            not frames.isascii() or not frames.isdecimal() or len(frames) > 20):
            self._gap('transport_unavailable_or_invalid')
            return None
        try:
            frame = int(frames)
        except ValueError:
            self._gap('transport_unavailable_or_invalid')
            return None
        if frame > (1 << 64) - 1:
            self._gap('transport_unavailable_or_invalid')
            return None
        try:
            self.epochs.accept(record)
        except Exception:
            self._gap('diagnostics_rejected')
            raise
        if self._depth:
            self.playing.last = None
        else:
            self.playing.observe(self.clock(), running == 'true', frame, self.action_ordinal)
        return record

    @contextmanager
    def action(self, name):
        self._check()
        outer = self._depth == 0
        if outer:
            self.action_ordinal += 1
            self._gap('action_boundary')
            self.action_log.write({'monotonic': self.clock(), 'action': self.action_ordinal, 'control': name})
        self._depth += 1
        try:
            yield
        finally:
            self._depth -= 1
            self.playing.last = None

    def finalize(self, read, timeout, sleep, interval=1):
        self._check()
        if not math.isfinite(timeout) or timeout <= 0 or not math.isfinite(interval) or interval <= 0:
            raise ValueError('finite positive retirement timeout and interval required')
        deadline = self.clock() + timeout
        while self.clock() < deadline:
            record = self.observe(read)
            if record is not None and self.clock() <= deadline:
                last = record.get('last_completed_epoch')
                if (record['complete'] is True and record['active'] is None and
                    record.get('retiring_epoch_id', False) is None and
                    record.get('native_quiescent') is True and
                    isinstance(last, str) and last.isascii() and last.isdecimal() and
                    self.epochs.cursor > 0 and int(last) == self.epochs.cursor):
                    return record
            remaining = deadline - self.clock()
            if remaining > 0: sleep(min(interval, remaining))
        raise TimeoutError('retirement deadline exceeded')

    @contextmanager
    def owned(self, cleanup, health):
        if threading.get_ident() != self._thread:
            raise RuntimeError('measurement_wrong_thread')
        old = self._health
        failures = []
        try:
            self._check()
            self._health = health
            yield
            self._check()
        except BaseException as error:
            failures.append(error)
        finally:
            try:
                cleanup()
            except BaseException as error:
                failures.append(error)
            try:
                health()
            except BaseException as error:
                failures.append(error)
            finally:
                self._health = old
        if len(failures) == 1:
            raise failures[0]
        if failures:
            raise BaseExceptionGroup('measurement and cleanup failures', failures)
