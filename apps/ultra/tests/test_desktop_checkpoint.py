"""GI-free acceptance tests for the sustained desktop lifecycle seam."""
import importlib
import importlib.util
import unittest


class DesktopCheckpointTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.find_spec('desktop_checkpoint')
        self.assertIsNotNone(spec, 'desktop checkpoint lifecycle seam is missing')
        self.checkpoint = importlib.import_module('desktop_checkpoint')

    def test_retirement_precedes_terminal_quit_and_success(self):
        events = []
        state = self.checkpoint.DesktopCheckpoint()
        state.retire(lambda: events.append('retired'))
        self.assertFalse(state.complete)
        state.quit(lambda: events.append('quit and exit verified'))
        self.assertEqual(events, ['retired', 'quit and exit verified'])
        self.assertTrue(state.complete)

    def test_failed_retirement_or_quit_never_produces_success(self):
        def fail():
            raise RuntimeError('failure')
        state = self.checkpoint.DesktopCheckpoint()
        with self.assertRaisesRegex(RuntimeError, 'failure'):
            state.retire(fail)
        with self.assertRaises(RuntimeError):
            state.quit(lambda: self.fail('quit must not run before retirement'))
        self.assertFalse(state.complete)
        state.retire(lambda: None)
        with self.assertRaisesRegex(RuntimeError, 'failure'):
            state.quit(fail)
        self.assertFalse(state.complete)

    def test_pilot_projects_fixed_overhead_and_all_limits(self):
        projected = self.checkpoint.project_pilot(
            playing_seconds=60, capture_wall_seconds=100, audio_bytes=38400000,
            metadata_bytes=60000, epoch_attempts=4, fixed_wall_seconds=20,
            fixed_audio_bytes=7680000, fixed_metadata_bytes=10000,
            fixed_epoch_attempts=1, target_seconds=1800)
        self.assertEqual(projected['wall_seconds'], 2420)
        self.assertEqual(projected['audio_bytes'], 929280000)
        self.assertEqual(projected['metadata_bytes'], 1510000)
        self.assertEqual(projected['epoch_attempts'], 91)
        self.assertTrue(projected['within_limits'])
        self.assertIn('headroom_fraction', projected)
        self.assertIn('headroom', projected)
        self.assertAlmostEqual(projected['headroom_fraction']['wall_seconds'], 280 / 2700)
        self.assertEqual(projected['headroom']['audio_bytes'], (1 << 30) - 929280000)
        exceeded = self.checkpoint.project_pilot(
            playing_seconds=60, capture_wall_seconds=110, audio_bytes=44000000,
            metadata_bytes=60000, epoch_attempts=10, fixed_wall_seconds=20,
            fixed_audio_bytes=7680000, fixed_metadata_bytes=10000,
            fixed_epoch_attempts=1, target_seconds=1800)
        self.assertFalse(exceeded['within_limits'])
        self.assertIn('wall_seconds', exceeded['exceeded_limits'])
        self.assertIn('audio_bytes', exceeded['exceeded_limits'])
        self.assertIn('epoch_attempts', exceeded['exceeded_limits'])

    def test_pilot_rejects_zero_or_invalid_playing_time(self):
        for playing in (0, -1, float('nan'), float('inf')):
            with self.subTest(playing=playing), self.assertRaises(ValueError):
                self.checkpoint.project_pilot(
                    playing_seconds=playing, capture_wall_seconds=100, audio_bytes=100,
                    metadata_bytes=100, epoch_attempts=2, fixed_wall_seconds=1,
                    fixed_audio_bytes=1, fixed_metadata_bytes=1,
                    fixed_epoch_attempts=1, target_seconds=1800)

    def test_projection_uses_cycle_playing_and_collector_lifetime(self):
        import inspect
        params = inspect.signature(self.checkpoint.project_pilot).parameters
        self.assertIn('cycle_playing_seconds', params)
        self.assertIn('collector_wall_seconds', params)
        result = self.checkpoint.project_pilot(
            playing_seconds=60, cycle_playing_seconds=50, collector_wall_seconds=130,
            capture_wall_seconds=100, audio_bytes=1000, metadata_bytes=100,
            epoch_attempts=4, fixed_wall_seconds=20, fixed_collector_wall_seconds=50,
            fixed_audio_bytes=200, fixed_metadata_bytes=20, fixed_epoch_attempts=1,
            target_seconds=160, variability=0, minimum_headroom_fraction=0)
        # Ten setup-playing seconds and fixed resources occur only once.
        self.assertEqual(result['wall_seconds'], 260)
        self.assertEqual(result['collector_wall_seconds'], 290)
        self.assertEqual(result['audio_bytes'], 2600)
        self.assertEqual(result['epoch_attempts'], 10)
        limited = self.checkpoint.project_pilot(
            playing_seconds=60, cycle_playing_seconds=50, collector_wall_seconds=700,
            capture_wall_seconds=100, audio_bytes=1000, metadata_bytes=100,
            epoch_attempts=4, fixed_wall_seconds=20, fixed_collector_wall_seconds=620,
            fixed_audio_bytes=200, fixed_metadata_bytes=20, fixed_epoch_attempts=1,
            target_seconds=1360, variability=0, minimum_headroom_fraction=0)
        self.assertLess(limited['wall_seconds'], 2700)
        self.assertGreater(limited['collector_wall_seconds'], 2700)
        self.assertIn('collector_wall_seconds', limited['exceeded_limits'])

    def test_projection_applies_variability_and_required_headroom(self):
        result = self.checkpoint.project_pilot(
            playing_seconds=100, cycle_playing_seconds=100, capture_wall_seconds=100,
            collector_wall_seconds=100, audio_bytes=100, metadata_bytes=100,
            epoch_attempts=1, fixed_wall_seconds=0, fixed_collector_wall_seconds=0,
            fixed_audio_bytes=0, fixed_metadata_bytes=0, fixed_epoch_attempts=0,
            target_seconds=2300, variability=.1, minimum_headroom_fraction=.1)
        self.assertAlmostEqual(result['wall_seconds'], 2530)
        self.assertNotIn('wall_seconds', result['exceeded_limits'])
        self.assertIn('wall_seconds', result['below_required_headroom'])
        self.assertFalse(result['within_limits'])

    def test_playing_dwell_is_bounded_by_remaining_target(self):
        self.assertTrue(hasattr(self.checkpoint, 'playing_dwell'), 'playing dwell policy is missing')
        self.assertEqual(self.checkpoint.playing_dwell(1800, 0), 180)
        self.assertEqual(self.checkpoint.playing_dwell(1800, 1780), 20)
        self.assertEqual(self.checkpoint.playing_dwell(1800, 1801), 0)

    def test_playing_audit_records_actual_frame_and_time_credit(self):
        self.assertTrue(hasattr(self.checkpoint, 'AuditedPlayingIntervals'), 'playing audit is missing')
        class Log:
            def __init__(self): self.rows = []
            def write(self, row): self.rows.append(row)
        log = Log()
        playing = self.checkpoint.AuditedPlayingIntervals(log)
        playing.observe(0, True, 0, 1)
        playing.observe(1, True, 48000, 1)
        playing.observe(4, True, 192000, 1)
        self.assertEqual([row['credited_seconds'] for row in log.rows], [0, 1, 0])
        self.assertEqual(log.rows[1]['previous_frame'], 0)
        self.assertEqual(log.rows[1]['frame'], 48000)
        self.assertEqual(log.rows[1]['elapsed_seconds'], 1)
        self.assertEqual(log.rows[2]['elapsed_seconds'], 3)

    def test_epoch_qualification_distinguishes_errors_from_budget_exceedances(self):
        self.assertTrue(hasattr(self.checkpoint, 'qualify_epochs'), 'epoch qualification is missing')
        metrics = {'native_render_failures': '0', 'invalid_callback_shape': '0',
                   'cpal_error_total': '0', 'cpal_xrun_reports': '0',
                   'cpal_non_xrun_reports': '0', 'over_buffer_budget_count': '2'}
        result = self.checkpoint.qualify_epochs([{'epoch_id': '1', 'metrics': metrics}])
        self.assertTrue(result['qualified'])
        self.assertEqual(result['totals']['over_buffer_budget_count'], 2)
        metrics = {**metrics, 'native_render_failures': '1'}
        result = self.checkpoint.qualify_epochs([{'epoch_id': '1', 'metrics': metrics}])
        self.assertFalse(result['qualified'])
        self.assertEqual(result['epochs'][0]['native_render_failures'], 1)
        with self.assertRaises(ValueError):
            self.checkpoint.qualify_epochs([{'epoch_id': '1', 'metrics': {**metrics, 'cpal_error_total': 'bad'}}])


class DrivingObserverTests(unittest.TestCase):
    def test_action_boundaries_observe_before_and_after_without_counting_action_time(self):
        import desktop_checkpoint
        self.assertTrue(hasattr(desktop_checkpoint, 'DrivingObserver'), 'driving observer seam is missing')
        DrivingObserver = desktop_checkpoint.DrivingObserver
        from sustained_measurement import SustainedMeasurement
        from stream_measurement import EpochCollector, PlayingIntervals
        from test_sustained_measurement import Clock, diagnostics
        class Log:
            def write(self, value): pass
        clock = Clock()
        playing = PlayingIntervals()
        measure = SustainedMeasurement(EpochCollector(), playing, Log(), Log(), clock)
        read = lambda: (diagnostics(), 'true', str(int(clock.now * 48000)))
        observer = DrivingObserver(measure, read, clock, clock.sleep)
        observer.observe()
        clock.sleep(1)
        observer.action('numeric', lambda: clock.sleep(1))
        clock.sleep(1)
        observer.observe()
        self.assertEqual(playing.seconds, 2)
        self.assertEqual(measure.action_ordinal, 1)

    def test_wait_observes_at_most_one_second_apart(self):
        import desktop_checkpoint
        self.assertTrue(hasattr(desktop_checkpoint, 'DrivingObserver'), 'driving observer seam is missing')
        DrivingObserver = desktop_checkpoint.DrivingObserver
        from sustained_measurement import SustainedMeasurement
        from stream_measurement import EpochCollector, PlayingIntervals
        from test_sustained_measurement import Clock, diagnostics
        class Log:
            def write(self, value): pass
        clock = Clock()
        playing = PlayingIntervals()
        measure = SustainedMeasurement(EpochCollector(), playing, Log(), Log(), clock)
        observer = DrivingObserver(measure, lambda: (diagnostics(), 'true', str(int(clock.now * 48000))), clock, clock.sleep)
        observer.observe()
        observer.sleep(3.2)
        self.assertAlmostEqual(playing.seconds, 3.2)

    def test_nested_action_has_one_outer_observation_boundary(self):
        from desktop_checkpoint import DrivingObserver
        from sustained_measurement import SustainedMeasurement
        from stream_measurement import EpochCollector, PlayingIntervals
        from test_sustained_measurement import Clock, diagnostics
        class Log:
            def write(self, value): pass
        clock = Clock()
        reads = []
        measure = SustainedMeasurement(EpochCollector(), PlayingIntervals(), Log(), Log(), clock)
        def read():
            reads.append(clock.now)
            return diagnostics(), 'true', str(int(clock.now * 48000))
        observer = DrivingObserver(measure, read, clock, clock.sleep)
        observer.action('numeric', lambda: observer.action('keyboard', lambda: clock.sleep(.1)))
        self.assertEqual(len(reads), 2)
        self.assertEqual(measure.action_ordinal, 1)

    def test_action_failure_and_post_observation_failure_are_both_preserved(self):
        from desktop_checkpoint import DrivingObserver
        from sustained_measurement import SustainedMeasurement
        from stream_measurement import EpochCollector, PlayingIntervals
        from test_sustained_measurement import Clock, diagnostics
        class Log:
            def write(self, value): pass
        clock = Clock()
        measure = SustainedMeasurement(EpochCollector(), PlayingIntervals(), Log(), Log(), clock)
        calls = []
        def read():
            calls.append(True)
            if len(calls) == 2:
                raise __import__('sustained_measurement').ProcessDisappeared('exited')
            return diagnostics(), 'true', '0'
        observer = DrivingObserver(measure, read, clock, clock.sleep)
        def fail(): raise ValueError('control failed')
        with self.assertRaises(BaseExceptionGroup) as caught:
            observer.action('seek', fail)
        self.assertEqual([str(error) for error in caught.exception.exceptions], ['control failed', 'exited'])


if __name__ == '__main__':
    unittest.main()
