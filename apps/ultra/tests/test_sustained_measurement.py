import json
import tempfile
import unittest
from pathlib import Path

from stream_measurement import EpochCollector, JsonLines, PlayingIntervals
from sustained_measurement import SustainedMeasurement


def diagnostics(**changes):
    return {**{'run_id': 'run', 'coverage_gap': False, 'oldest_retained_epoch': '1',
               'completed': [{'epoch_id': '1', 'final': True}], 'last_completed_epoch': '1',
               'complete': True, 'active': None, 'retiring_epoch_id': None,
               'native_quiescent': True}, **changes}


class Clock:
    def __init__(self): self.now = 0
    def __call__(self): return self.now
    def sleep(self, seconds): self.now += seconds


class SustainedTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.clock = Clock()
        self.log = JsonLines(Path(self.tmp.name) / 'epochs.jsonl')
        self.actions = JsonLines(Path(self.tmp.name) / 'actions.jsonl')
        self.epochs = EpochCollector(self.log)
        self.playing = PlayingIntervals()
        self.measure = SustainedMeasurement(self.epochs, self.playing, self.log, self.actions, self.clock)

    def observe(self, frame, record=None):
        return self.measure.observe(lambda: (diagnostics() if record is None else record, 'true', str(frame)))

    def test_diagnostics_gap_breaks_continuity_even_when_frames_advance(self):
        self.observe(0)
        self.clock.sleep(1)
        self.measure.observe(lambda: (None, 'true', '48000'))
        self.clock.sleep(1)
        self.observe(96000)
        self.assertEqual(self.playing.seconds, 0)
        self.clock.sleep(1)
        self.observe(144000)
        self.assertEqual(self.playing.seconds, 1)
        rows = [json.loads(line) for line in self.log.path.read_text().splitlines()]
        self.assertTrue(any(row.get('kind') == 'observation_gap' for row in rows))

    def test_nested_numeric_seek_and_apply_boundaries_never_accrue_action_time(self):
        self.observe(0)
        for name in ('numeric', 'seek', 'Apply'):
            self.clock.sleep(.5)
            with self.measure.action(name):
                with self.measure.action('nested'):
                    self.clock.sleep(.5)
                    self.observe(int(self.clock.now * 48000))
            self.clock.sleep(.5)
            self.observe(int(self.clock.now * 48000))
        self.assertEqual(self.playing.seconds, 0)
        self.clock.sleep(1)
        self.observe(int(self.clock.now * 48000))
        self.assertEqual(self.playing.seconds, 1)
        self.assertEqual(self.measure.action_ordinal, 3)

    def test_finalization_requires_complete_inactive_observation_before_deadline(self):
        active = diagnostics(complete=False, active={'epoch_id': '2'}, retiring_epoch_id='2', native_quiescent=False)
        with self.assertRaisesRegex(TimeoutError, 'retirement'):
            self.measure.finalize(lambda: (active, 'false', '0'), 2, self.clock.sleep, 1)
        records = iter([active, diagnostics()])
        result = self.measure.finalize(lambda: (next(records), 'false', '0'), 2, self.clock.sleep, 1)
        self.assertTrue(result['complete'])
        self.assertEqual(self.epochs.cursor, 1)

    def test_failed_health_poll_propagates_and_cleanup_runs(self):
        cleaned = []
        def fail(): raise RuntimeError('audio_limit')
        with self.assertRaises(BaseExceptionGroup) as failure:
            with self.measure.owned(cleanup=lambda: cleaned.append(True), health=fail):
                self.observe(0)
        self.assertEqual(cleaned, [True])
        self.assertEqual([str(e) for e in failure.exception.exceptions], ['audio_limit', 'audio_limit'])

    def test_missing_last_epoch_cannot_finalize(self):
        record = diagnostics(completed=[], oldest_retained_epoch=None)
        del record['last_completed_epoch']
        with self.assertRaisesRegex(TimeoutError, 'retirement'):
            self.measure.finalize(lambda: (record, 'false', '0'), 1, self.clock.sleep, 1)

    def test_cleanup_health_detects_recorder_limit(self):
        state = {'reason': None}
        def cleanup(): state['reason'] = 'metadata_limit'
        def health():
            if state['reason']: raise RuntimeError(state['reason'])
        with self.assertRaisesRegex(RuntimeError, 'metadata_limit'):
            with self.measure.owned(cleanup, health):
                self.observe(0)

    def test_invalid_transport_and_callback_failure_break_continuity(self):
        self.observe(0)
        self.clock.sleep(1)
        self.measure.observe(lambda: (diagnostics(), None, '48000'))
        self.clock.sleep(1)
        self.observe(96000)
        self.clock.sleep(1)
        def failed(): raise OSError('process vanished')
        self.measure.observe(failed)
        self.clock.sleep(1)
        self.observe(192000)
        self.assertEqual(self.playing.seconds, 0)

    def test_collector_rejections_remain_fatal_and_break_continuity(self):
        self.observe(0)
        for record, reason in [
            (diagnostics(run_id='other'), 'epoch_run_changed'),
            (diagnostics(completed=[{'epoch_id': '2', 'final': False}]), 'epoch_not_final'),
            (diagnostics(completed=[{'epoch_id': '2', 'final': True, 'metrics': {'counter_overflow': '1'}}]), 'epoch_counter_overflow'),
            (diagnostics(coverage_gap=True, oldest_retained_epoch='3', completed=[]), 'epoch_coverage_gap'),
            (diagnostics(active={'epoch_id': '257'}), 'epoch_limit'),
        ]:
            with self.subTest(reason=reason), self.assertRaisesRegex(RuntimeError, reason):
                self.observe(48000, record)
            self.assertIsNone(self.playing.last)

    def test_metadata_limit_propagates_with_cleanup(self):
        self.log.limit = 1
        cleaned = []
        with self.assertRaisesRegex(RuntimeError, 'metadata_limit'):
            with self.measure.owned(lambda: cleaned.append(True), lambda: None):
                self.observe(0)
        self.assertEqual(cleaned, [True])

    def test_empty_or_disappeared_process_cannot_finalize(self):
        empty = diagnostics(completed=[], oldest_retained_epoch=None, last_completed_epoch=None)
        with self.assertRaisesRegex(TimeoutError, 'retirement'):
            self.measure.finalize(lambda: (empty, 'false', '0'), 1, self.clock.sleep, 1)
        with self.assertRaisesRegex(TimeoutError, 'retirement'):
            self.measure.finalize(lambda: (None, None, None), 1, self.clock.sleep, 1)

    def test_disappearance_is_fatal_even_if_later_observation_looks_valid(self):
        from sustained_measurement import ProcessDisappeared
        def gone(): raise ProcessDisappeared('process exited')
        with self.assertRaisesRegex(ProcessDisappeared, 'process exited'):
            self.measure.observe(gone)
        with self.assertRaisesRegex(ProcessDisappeared, 'process exited'):
            self.measure.finalize(lambda: (diagnostics(), 'false', '0'), 1, self.clock.sleep)

    def test_transient_gap_can_recover_and_finalize(self):
        self.measure.observe(lambda: (None, None, None))
        result = self.measure.finalize(lambda: (diagnostics(), 'false', '0'), 1, self.clock.sleep)
        self.assertTrue(result['complete'])

    def test_body_cleanup_and_post_cleanup_health_errors_are_all_visible(self):
        cleaned = []
        def cleanup():
            cleaned.append(True)
            raise RuntimeError('cleanup failed')
        def health():
            if cleaned: raise RuntimeError('recorder limit')
        with self.assertRaises(BaseExceptionGroup) as failure:
            with self.measure.owned(cleanup, health):
                raise ValueError('body failed')
        self.assertEqual(cleaned, [True])
        self.assertEqual([str(e) for e in failure.exception.exceptions],
                         ['body failed', 'cleanup failed', 'recorder limit'])

    def test_body_failure_and_post_cleanup_health_are_both_visible(self):
        cleaned = []
        def health():
            if cleaned: raise RuntimeError('sampler limit')
        with self.assertRaises(BaseExceptionGroup) as failure:
            with self.measure.owned(lambda: cleaned.append(True), health):
                raise ValueError('body failed')
        self.assertEqual([str(e) for e in failure.exception.exceptions], ['body failed', 'sampler limit'])

    def test_latched_disappearance_on_entry_still_cleans_up(self):
        from sustained_measurement import ProcessDisappeared
        def gone(): raise ProcessDisappeared('process exited')
        with self.assertRaises(ProcessDisappeared): self.measure.observe(gone)
        events = []
        def cleanup():
            events.append('cleanup')
            raise RuntimeError('cleanup failed')
        def health():
            events.append('health')
            raise RuntimeError('recorder limit')
        with self.assertRaises(BaseExceptionGroup) as failure:
            with self.measure.owned(cleanup, health):
                self.fail('body must not run')
        self.assertEqual(events, ['cleanup', 'health'])
        self.assertEqual([str(e) for e in failure.exception.exceptions],
                         ['process exited', 'cleanup failed', 'recorder limit'])

    def test_outer_health_failure_on_nested_entry_still_cleans_up(self):
        events = []
        def outer_health(): raise RuntimeError('outer limit')
        with self.assertRaises(BaseExceptionGroup) as failure:
            with self.measure.owned(lambda: events.append('outer cleanup'), outer_health):
                with self.measure.owned(lambda: events.append('inner cleanup'), lambda: events.append('inner health')):
                    self.fail('body must not run')
        self.assertEqual(events, ['inner cleanup', 'inner health', 'outer cleanup'])
        self.assertEqual(str(failure.exception.exceptions[0]), 'outer limit')

    def test_oversized_frame_breaks_continuity_before_valid_read(self):
        self.observe(0)
        self.clock.sleep(1)
        self.measure.observe(lambda: (diagnostics(), 'true', '9' * 5000))
        self.clock.sleep(1)
        self.observe(96000)
        self.assertEqual(self.playing.seconds, 0)
        self.assertTrue(any(json.loads(line).get('reason') == 'transport_unavailable_or_invalid'
                            for line in self.log.path.read_text().splitlines()))

    def test_frame_native_u64_range_is_enforced(self):
        self.measure.observe(lambda: (diagnostics(), 'true', str((1 << 64) - 1)))
        self.assertIsNotNone(self.playing.last)
        self.measure.observe(lambda: (diagnostics(), 'true', str(1 << 64)))
        self.assertIsNone(self.playing.last)
