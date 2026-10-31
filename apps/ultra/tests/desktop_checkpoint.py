"""Terminal lifecycle and bounded pilot projection for the desktop journey."""
import math
from stream_measurement import MAX_AUDIO, MAX_METADATA, MAX_WALL, PlayingIntervals


def playing_dwell(required, played):
    return min(180, max(0, required - played))


def qualify_epochs(epochs):
    fields = ('native_render_failures', 'invalid_callback_shape', 'cpal_error_total',
              'cpal_xrun_reports', 'cpal_non_xrun_reports', 'over_buffer_budget_count')
    if not epochs:
        raise ValueError('no completed epochs')
    totals = dict.fromkeys(fields, 0)
    results = []
    for epoch in epochs:
        counts = {}
        for name in fields:
            value = epoch['metrics'].get(name)
            if not isinstance(value, str) or not value.isascii() or not value.isdecimal() or len(value) > 20 or int(value) > (1 << 64) - 1:
                raise ValueError(f'invalid epoch counter {name}')
            counts[name] = int(value)
            totals[name] += counts[name]
        if counts['cpal_error_total'] != counts['cpal_xrun_reports'] + counts['cpal_non_xrun_reports']:
            raise ValueError('inconsistent typed CPAL counters')
        results.append({'epoch_id': epoch['epoch_id'], **counts})
    return {'qualified': not any(totals[name] for name in fields[:-1]),
            'epochs': results, 'totals': totals,
            'physical_underruns': None, 'budget_scope': 'processing budget exceedances, not underruns'}


class AuditedPlayingIntervals(PlayingIntervals):
    def __init__(self, writer):
        super().__init__()
        self.writer = writer

    def observe(self, now, running, frames, action, rate=48000):
        previous, before = self.last, self.seconds
        result = super().observe(now, running, frames, action, rate)
        self.writer.write({'monotonic': now, 'running': running, 'frame': frames,
                           'action': action, 'rate': rate,
                           'previous_monotonic': previous[0] if previous else None,
                           'previous_running': previous[1] if previous else None,
                           'previous_frame': previous[2] if previous else None,
                           'previous_action': previous[3] if previous else None,
                           'elapsed_seconds': now - previous[0] if previous else None,
                           'credited_seconds': self.seconds - before})
        return result


class DesktopCheckpoint:
    def __init__(self):
        self.retired = False
        self.complete = False

    def retire(self, operation):
        if self.retired or self.complete:
            raise RuntimeError('retirement already completed')
        result = operation()
        self.retired = True
        return result

    def quit(self, operation):
        if not self.retired or self.complete:
            raise RuntimeError('retirement required before terminal quit')
        result = operation()
        self.complete = True
        return result


def project_pilot(*, playing_seconds, capture_wall_seconds, audio_bytes,
                  metadata_bytes, epoch_attempts, fixed_wall_seconds,
                  fixed_audio_bytes, fixed_metadata_bytes, fixed_epoch_attempts,
                  target_seconds, cycle_playing_seconds=None, collector_wall_seconds=None,
                  fixed_collector_wall_seconds=None, variability=0, minimum_headroom_fraction=0):
    if cycle_playing_seconds is None: cycle_playing_seconds = playing_seconds
    if collector_wall_seconds is None: collector_wall_seconds = capture_wall_seconds
    if fixed_collector_wall_seconds is None: fixed_collector_wall_seconds = fixed_wall_seconds
    values = (playing_seconds, capture_wall_seconds, audio_bytes, metadata_bytes,
              epoch_attempts, fixed_wall_seconds, fixed_audio_bytes,
              fixed_metadata_bytes, fixed_epoch_attempts, target_seconds, cycle_playing_seconds,
              collector_wall_seconds, fixed_collector_wall_seconds, variability, minimum_headroom_fraction)
    if (any(not math.isfinite(v) or v < 0 for v in values) or not playing_seconds or
            not target_seconds or not cycle_playing_seconds or cycle_playing_seconds > playing_seconds or
            minimum_headroom_fraction >= 1):
        raise ValueError('pilot quantities must be finite and nonnegative with positive playing and target')
    totals = (capture_wall_seconds, collector_wall_seconds, audio_bytes, metadata_bytes, epoch_attempts)
    fixed = (fixed_wall_seconds, fixed_collector_wall_seconds, fixed_audio_bytes, fixed_metadata_bytes, fixed_epoch_attempts)
    if any(f > t for f, t in zip(fixed, totals)):
        raise ValueError('fixed overhead exceeds pilot total')
    fixed_playing = playing_seconds - cycle_playing_seconds
    scale = max(0, target_seconds - fixed_playing) / cycle_playing_seconds
    names = ('wall_seconds', 'collector_wall_seconds', 'audio_bytes', 'metadata_bytes', 'epoch_attempts')
    result = {name: f + (total - f) * scale * (1 + variability) for name, total, f in zip(names, totals, fixed)}
    for name in ('audio_bytes', 'metadata_bytes', 'epoch_attempts'):
        result[name] = math.ceil(result[name])
    limits = dict(zip(names, (MAX_WALL, MAX_WALL, MAX_AUDIO, MAX_METADATA, 256)))
    result['limits'] = limits
    result['headroom'] = {name: limits[name] - result[name] for name in names}
    result['headroom_fraction'] = {name: result['headroom'][name] / limits[name] for name in names}
    result['exceeded_limits'] = [name for name in names if result[name] > limits[name]]
    result['below_required_headroom'] = [name for name in names if result['headroom_fraction'][name] < minimum_headroom_fraction]
    result['within_limits'] = not result['exceeded_limits'] and not result['below_required_headroom']
    result['fixed_playing_seconds'] = fixed_playing
    result['cycle_playing_seconds'] = cycle_playing_seconds
    result['variability_fraction'] = variability
    result['minimum_headroom_fraction'] = minimum_headroom_fraction
    return result


class DrivingObserver:
    """Observe on the calling thread, bracketing controls and long waits."""
    def __init__(self, measure, read, clock, sleep):
        self.measure, self.read, self.clock, self.raw_sleep = measure, read, clock, sleep
        self.reading = False
        self.action_depth = 0
        self.last_observation = None

    def observe(self):
        if self.reading:
            return None
        self.reading = True
        try:
            return self.measure.observe(self.read)
        finally:
            self.last_observation = self.clock()
            self.reading = False

    def action(self, name, operation):
        outer = self.action_depth == 0
        if outer:
            self.observe()
        failures, result = [], None
        self.action_depth += 1
        try:
            with self.measure.action(name):
                result = operation()
        except BaseException as error:
            failures.append(error)
        finally:
            self.action_depth -= 1
        if outer:
            try:
                self.observe()
            except BaseException as error:
                failures.append(error)
        if len(failures) == 1:
            raise failures[0]
        if failures:
            raise BaseExceptionGroup('action and observation failures', failures)
        return result

    def sleep(self, seconds):
        deadline = self.clock() + seconds
        while True:
            remaining = deadline - self.clock()
            if remaining <= 0:
                break
            self.raw_sleep(min(1, remaining))
            self.observe()
