"""Driving-thread epoch observation and owned sampling for the desktop journey."""
import json
import os
from pathlib import Path
import threading
import time

from desktop_checkpoint import AuditedPlayingIntervals, DesktopCheckpoint, DrivingObserver
from stream_measurement import EpochCollector, JsonLines, MAX_WALL, ProcessGroups, ProcessSampler
from sustained_measurement import ProcessDisappeared, SustainedMeasurement


class LockedJsonLines:
    def __init__(self, path, lock):
        self.writer, self.lock = JsonLines(path), lock
        self.path = self.writer.path

    def write(self, value):
        with self.lock:
            self.writer.write(value)

    def manifest(self):
        with self.lock:
            return self.writer.manifest()


class DesktopSustained:
    def __init__(self, ui, windows, atspi, glib):
        self.ui, self.windows, self.atspi, self.glib = ui, windows, atspi, glib
        self.lock = threading.RLock()
        self.stop = threading.Event()
        self.errors = []
        self.start = time.monotonic()
        self.raw_sleep = time.sleep
        self.epoch_log = LockedJsonLines(ui.output / 'sustained-epochs.jsonl', self.lock)
        self.gap_log = LockedJsonLines(ui.output / 'sustained-gaps.jsonl', self.lock)
        self.action_log = LockedJsonLines(ui.output / 'sustained-actions.jsonl', self.lock)
        self.resource_log = LockedJsonLines(ui.output / 'sustained-resources.jsonl', self.lock)
        self.playing_log = LockedJsonLines(ui.output / 'sustained-playing.jsonl', self.lock)
        self.epochs = EpochCollector(self.epoch_log)
        self.playing = AuditedPlayingIntervals(self.playing_log)
        self.measure = SustainedMeasurement(self.epochs, self.playing, self.gap_log, self.action_log, time.monotonic)
        self.observer = DrivingObserver(self.measure, self.read, time.monotonic, self.raw_sleep)
        self.terminal = DesktopCheckpoint()
        self.thread = None
        self.originals = {}
        self.capture = None
        self.finishing_capture = False
        self.last = None
        self.references = {}

    def accessible(self, name):
        item = self.references.get(name)
        if item is not None:
            try:
                if (hasattr(self.atspi, 'StateType') and
                        item.get_state_set().contains(self.atspi.StateType.DEFUNCT)):
                    self.references.pop(name, None)
                else:
                    text = self.atspi.Text.get_text(item, 0, -1)
                    if text:
                        return text
                    self.references.pop(name, None)
            except self.glib.Error:
                self.references.pop(name, None)
        for frame in self.windows.app_frames():
            try:
                for item in self.ui.walk(frame):
                    if item.get_name() == name and 'Text' in item.get_interfaces():
                        if (hasattr(self.atspi, 'StateType') and
                                item.get_state_set().contains(self.atspi.StateType.DEFUNCT)):
                            continue
                        text = self.atspi.Text.get_text(item, 0, -1)
                        if text:
                            self.references[name] = item
                            return text
            except self.glib.Error:
                continue
        return None

    def read(self):
        try:
            stat = Path(f'/proc/{self.ui.pid}/stat').read_text()
            if stat.split(') ', 1)[1].split()[0] == 'Z':
                raise ProcessDisappeared('Alive exited before retirement')
        except FileNotFoundError as error:
            raise ProcessDisappeared('Alive disappeared before retirement') from error
        diagnostics = self.accessible('Stream diagnostics')
        record = json.loads(diagnostics) if diagnostics else None
        if isinstance(record, dict):
            self.last = record
        running, frames = self.accessible('Transport playing'), self.accessible('Absolute frame')
        if running not in ('true', 'false') or not frames or not frames.isascii() or not frames.isdecimal():
            self.gap_log.write({'kind': 'transport_read_shape', 'monotonic': time.monotonic(),
                                'running_valid': running in ('true', 'false'),
                                'frame_valid': bool(frames and frames.isascii() and frames.isdecimal())})
        return record, running, frames

    def observe(self):
        return self.observer.observe()

    def sample(self):
        try:
            groups = ProcessGroups(app=ProcessSampler(self.ui.pid), sampler_capture_overhead=ProcessSampler(os.getpid()),
                private_audio_server=ProcessSampler(int(os.environ['ULTRA_TEST_AUDIO_PID'])) if os.environ.get('ULTRA_TEST_AUDIO_PID') else None)
            deadline = time.monotonic()
            while not self.stop.is_set():
                started = time.monotonic()
                if started - self.start > MAX_WALL:
                    raise RuntimeError('wall_limit')
                observation = groups.sample()
                now = time.monotonic()
                if now - self.start > MAX_WALL:
                    raise RuntimeError('wall_limit')
                self.resource_log.write({'monotonic': now, 'sampling_started': started,
                    'scheduled_monotonic': deadline, 'sampling_delay': max(0, started - deadline),
                    'sampling_duration': now - started, 'action': self.measure.action_ordinal,
                    'playing_seconds_proven': self.playing.seconds,
                    'missed_cadences': max(0, int(now - deadline)), **observation})
                deadline += 1
                self.stop.wait(max(0, deadline - time.monotonic()))
        except BaseException as error:
            self.errors.append(error)
            self.stop.set()

    def health(self):
        if self.errors:
            raise RuntimeError('resource sampler failed') from self.errors[0]
        if self.capture is not None and not self.finishing_capture and self.capture[0].process.poll() is not None:
            raise RuntimeError('recorder supervisor exited before capture finalization')

    def install(self):
        self.thread = threading.Thread(target=self.sample, name='sustained-proc-sampler', daemon=True)
        self.thread.start()
        for name in ('click', 'text', 'keys'):
            original = getattr(self.ui, name)
            self.originals[name] = original
            def wrapped(*args, _original=original, _name=name, **kwargs):
                if self.observer.reading:
                    return _original(*args, **kwargs)
                label = f'{_name}: {args[0] if args else ""}'
                return self.observer.action(label, lambda: _original(*args, **kwargs))
            setattr(self.ui, name, wrapped)
        def observed_sleep(seconds):
            if self.observer.reading:
                return self.raw_sleep(seconds)
            if seconds <= 0:
                return self.raw_sleep(seconds)
            deadline = time.monotonic() + seconds
            while time.monotonic() < deadline:
                now = time.monotonic()
                last = self.observer.last_observation
                until_due = max(0, 1 - (now - last)) if last is not None else 0
                if until_due == 0:
                    self.observe()
                else:
                    self.raw_sleep(min(until_due, deadline - now))
        time.sleep = observed_sleep

    def cleanup(self):
        time.sleep = self.raw_sleep
        for name, original in self.originals.items():
            setattr(self.ui, name, original)
        failures = []
        try:
            self.stop_sampling()
        except BaseException as error:
            failures.append(error)
        if self.capture is not None:
            try:
                result = self.capture[0].finish()
                if not result.get('complete'): raise RuntimeError(f'recorder incomplete: {result}')
                self.capture = None
            except BaseException as error:
                failures.append(error)
        if len(failures) == 1: raise failures[0]
        if failures: raise BaseExceptionGroup('sustained cleanup failures', failures)

    def stop_sampling(self):
        self.stop.set()
        if self.thread is not None:
            self.thread.join(timeout=5)
            if self.thread.is_alive(): raise RuntimeError('resource sampler did not stop')

    def retired(self):
        return self.terminal.retire(lambda: self.measure.finalize(self.read, 15, self.raw_sleep))

    def growth(self, audio_path):
        with self.lock:
            metadata = sum(path.stat().st_size for path in self.ui.output.iterdir()
                           if path.is_file() and path.suffix in ('.json', '.jsonl', '.log'))
            active = self.last.get('active') if self.last else None
            attempts = max(self.epochs.cursor, int(active['epoch_id']) if active else 0)
            return {'monotonic': time.monotonic(), 'audio_bytes': audio_path.stat().st_size,
                    'metadata_bytes': metadata, 'epoch_attempts': attempts,
                    'playing_seconds': self.playing.seconds}

    def manifest(self):
        return {'complete': self.terminal.complete, 'playing_seconds_proven': self.playing.seconds,
                'excluded_seconds': self.playing.excluded, 'completed_epochs': self.epochs.cursor,
                'last_diagnostics': self.last, 'wall_seconds': time.monotonic() - self.start,
                'epochs': self.epoch_log.manifest(), 'gaps': self.gap_log.manifest(),
                'actions': self.action_log.manifest(), 'resources': self.resource_log.manifest(),
                'playing': self.playing_log.manifest(),
                'physical_audio': False, 'physical_underruns': None,
                'cpu_coverage': 'observed identities; transient workers and exited final deltas unavailable'}
