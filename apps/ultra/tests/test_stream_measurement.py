import json
import os
from pathlib import Path
import subprocess
import signal
import sys
import tempfile
import time
import unittest

from stream_measurement import parse_stat, CpuTracker, PlayingIntervals, Recorder, JsonLines, EpochCollector, ProcessGroups


def stat(pid=42, start=100, ticks=50, comm='worker (complex) name'):
    fields = ['S', '1'] + ['0'] * 17
    fields[11], fields[12], fields[19 - 1] = str(ticks), '5', str(start)
    # starttime is field22, hence index19 following comm (field2).
    fields.append(str(start))
    return f'{pid} ({comm}) ' + ' '.join(fields)


class MeasurementTests(unittest.TestCase):
    def test_complex_comm_non100hz_pid_reuse_and_exit_are_not_zero_cpu(self):
        item = parse_stat(stat())
        self.assertEqual((item['pid'], item['comm'], item['starttime'], item['ticks']), (42, 'worker (complex) name', 100, 55))
        tracker = CpuTracker(250)
        first = tracker.update([item], 1)
        self.assertIsNone(first['cpu_percent'])
        second = tracker.update([parse_stat(stat(ticks=100))], 2)
        self.assertEqual(second['cpu_percent'], 20)
        reused = tracker.update([parse_stat(stat(start=200, ticks=1))], 3)
        self.assertIsNone(reused['cpu_percent'])
        self.assertTrue(reused['coverage_gap'])
        self.assertEqual(len(reused['missing']), 1)
        self.assertIsNone(tracker.update([], 4)['cpu_percent'])

    def test_only_observed_running_intervals_without_control_boundaries_count(self):
        p = PlayingIntervals()
        p.observe(1, False, 0, 0)
        p.observe(2, False, 48000, 0)
        self.assertEqual(p.seconds, 0)
        p.observe(3, True, 96000, 1)
        p.observe(4, True, 144000, 1)
        self.assertEqual(p.seconds, 1)
        p.observe(5, True, 192000, 2)
        p.observe(8, True, 336000, 2)
        self.assertEqual(p.seconds, 1)
        p.observe(9, False, 384000, 2)
        self.assertEqual(p.seconds, 1)

    def test_recorder_bounds_are_independent_of_a_stalled_sampler_and_cleanup(self):
        with tempfile.TemporaryDirectory() as d:
            recorder = Recorder(Path(d)/'audio.f32', [sys.executable, '-c', 'import os,time\nwhile True: os.write(1,b"0"*4096); os.write(2,b"e"*4096)'], max_audio=32768, max_stderr=8192, max_wall=2, reserve=0)
            time.sleep(.6)  # No sampler or supervisor polling in the parent.
            result = recorder.finish()
            self.assertFalse(result['complete'])
            self.assertLessEqual((Path(d)/'audio.f32').stat().st_size, 32768)
            self.assertLessEqual((Path(d)/'audio.stderr').stat().st_size, 8192)
            self.assertIsNotNone(recorder.process.poll())
            self.assertFalse(Path(f"/proc/{result['recorder_pid']}").exists())
            timer = Recorder(Path(d)/'timed.f32', [sys.executable, '-c', 'import time;time.sleep(20)'], max_wall=.2, reserve=0)
            time.sleep(.5)
            self.assertEqual(timer.finish()['reason'], 'wall_limit')

    def test_metadata_and_epoch_coverage_are_bounded(self):
        with tempfile.TemporaryDirectory() as d:
            writer = JsonLines(Path(d)/'samples.jsonl', 32)
            writer.write({'value': 1})
            with self.assertRaises(RuntimeError): writer.write({'value': 'x'*40})
        c = EpochCollector()
        with self.assertRaises(RuntimeError): c.accept({'coverage_gap': True})

    def test_collected_evicted_prefix_is_not_a_missing_epoch(self):
        with tempfile.TemporaryDirectory() as d:
            writer = JsonLines(Path(d)/'epochs.jsonl')
            collector = EpochCollector(writer)
            for last in range(1, 71):
                first = max(1, last-63)
                collector.accept({'run_id': 'test', 'coverage_gap': first > 1,
                                  'oldest_retained_epoch': str(first), 'complete': True, 'active': None,
                                  'completed': [{'epoch_id': str(i), 'final': True} for i in range(first, last+1)]})
            finals = [json.loads(line) for line in writer.path.read_text().splitlines() if 'epoch_id' in json.loads(line)]
            self.assertEqual([int(row['epoch_id']) for row in finals], list(range(1, 71)))
            lost = EpochCollector()
            with self.assertRaisesRegex(RuntimeError, 'epoch_coverage_gap'):
                lost.accept({'run_id': 'test', 'coverage_gap': True, 'oldest_retained_epoch': '2',
                             'complete': True, 'active': None, 'completed': [{'epoch_id': '2', 'final': True}]})

    def test_epoch_quality_and_attempt_limits_remain_fatal(self):
        base = {'run_id': 'test', 'coverage_gap': False, 'oldest_retained_epoch': '1', 'complete': True, 'active': None}
        with self.subTest('provisional final'):
            with self.assertRaisesRegex(RuntimeError, 'epoch_not_final'):
                EpochCollector().accept({**base, 'completed': [{'epoch_id': '1', 'final': False}]})
        with self.subTest('counter overflow'):
            with self.assertRaisesRegex(RuntimeError, 'epoch_counter_overflow'):
                EpochCollector().accept({**base, 'completed': [{'epoch_id': '1', 'final': True, 'metrics': {'counter_overflow': '1'}}]})
        collector = EpochCollector()
        collector.accept({**base, 'completed': [{'epoch_id': str(i), 'final': True} for i in range(1, 257)]})
        with self.assertRaisesRegex(RuntimeError, 'epoch_limit'):
            collector.accept({**base, 'completed': [{'epoch_id': '257', 'final': True}]})
        with self.assertRaisesRegex(RuntimeError, 'epoch_run_changed'):
            collector.accept({**base, 'run_id': 'other', 'completed': []})

    def test_recorder_reaps_stubborn_helper_after_leader_exits(self):
        self.check_recorder_helper(False)

    def test_stalled_supervisor_cleanup_kills_owned_helper_before_returning(self):
        self.check_recorder_helper(True)

    def check_recorder_helper(self, stalled):
        with tempfile.TemporaryDirectory() as d:
            pidfile = Path(d)/'helper.pid'
            code = ('import os,signal,time,pathlib\n'
                    'if os.fork()==0:\n'
                    ' signal.signal(signal.SIGTERM,signal.SIG_IGN)\n'
                    f' pathlib.Path({str(pidfile)!r}).write_text(str(os.getpid()))\n'
                    ' while True: time.sleep(.05)\n'
                    'else:\n'
                    ' while True: time.sleep(.05)\n')
            recorder = Recorder(Path(d)/'helper.f32', [sys.executable, '-c', code], max_wall=10, reserve=0)
            helper = None
            try:
                deadline = time.monotonic()+3
                while not pidfile.exists() and time.monotonic()<deadline: time.sleep(.02)
                self.assertTrue(pidfile.exists())
                helper = int(pidfile.read_text())
                if stalled:
                    os.kill(recorder.process.pid, signal.SIGSTOP)
                    with self.assertRaisesRegex(RuntimeError, 'recorder_supervisor_stalled'): recorder.finish()
                else:
                    result = recorder.finish()
                    self.assertTrue(result['complete'], result)
                state = Path(f'/proc/{helper}/stat')
                try: alive = parse_stat(state.read_text())['state'] != 'Z'
                except (FileNotFoundError, ProcessLookupError): alive = False
                self.assertFalse(alive, 'owned helper survived finish')
            finally:
                if helper:
                    try: os.kill(helper, signal.SIGKILL)
                    except ProcessLookupError: pass
                if recorder.finished is None: recorder.finish()

    def test_group_union_limits_preserve_separate_cpu_reports(self):
        class Group:
            def __init__(self, begin, count): self.begin, self.count = begin, count
            def sample(self):
                return {'processes': [{'pid': i, 'starttime': 1} for i in range(self.begin, self.begin+self.count)], 'cpu_percent': 12}
        app, observer, server = Group(1, 40), Group(41, 20), Group(61, 5)
        groups = ProcessGroups(app=app, observer=observer, server=server)
        with self.subTest('simultaneous union'):
            with self.assertRaisesRegex(RuntimeError, 'simultaneous_process_limit'): groups.sample()
        app.count, observer.count, server.count = 30, 20, 10
        groups = ProcessGroups(app=app, observer=observer, server=server)
        for generation in range(4):
            app.begin, observer.begin, server.begin = 100*generation+1, 100*generation+31, 100*generation+51
            result = groups.sample()
            self.assertEqual(result['app']['cpu_percent'], 12)
        app.begin, observer.begin, server.begin = 401, 431, 451
        with self.subTest('lifetime union'):
            with self.assertRaisesRegex(RuntimeError, 'process_identity_limit'): groups.sample()


if __name__ == '__main__': unittest.main()

class ResourceFixtureTests(unittest.TestCase):
    def test_missing_pss_is_unavailable_and_reparented_worker_stays_tracked(self):
        from stream_measurement import ProcessSampler
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            for pid in (42, 43):
                path = root/str(pid); path.mkdir(); (path/'fd').mkdir()
                text = stat(pid=pid)
                if pid == 43: text = text.replace(' S 1 ', ' S 42 ')
                (path/'stat').write_text(text)
                (path/'status').write_text('VmRSS:\t100 kB\nThreads:\t2\n')
            sampler = ProcessSampler(42, root)
            first = sampler.sample()
            self.assertIsNone(first['pss_kib'])
            self.assertEqual(first['rss_kib'], 200)
            self.assertIn('pss_kib', first['processes'][0]['unavailable_fields'])
            (root/'43'/'stat').write_text(stat(pid=43))
            self.assertEqual(sampler.sample()['pids'], [42, 43])
            (root/'43'/'stat').write_text(stat(pid=43, start=200))
            self.assertEqual(sampler.sample()['pids'], [42])
