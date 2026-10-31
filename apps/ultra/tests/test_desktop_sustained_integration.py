"""GI-free tests of the actual desktop measurement adapter."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from desktop_sustained import DesktopSustained
from sustained_measurement import ProcessDisappeared
from test_sustained_measurement import diagnostics


class UI:
    pid = 123
    def __init__(self, output): self.output = output


class DesktopSustainedIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.driver = DesktopSustained(UI(Path(self.tmp.name)), None, None, None)

    def test_periodic_sample_is_published_with_original_fields_and_copied(self):
        class Sampler:
            def __init__(self, _pid): pass
        observation = {'app': {'monotonic': 12, 'nested': {'value': 1}},
                       'sampler_capture_overhead': {'sample_start': 11}, 'private_audio_server': None}
        class Groups:
            def __init__(self, **_kwargs): pass
            def sample(inner):
                self.driver.stop.set()
                return observation
        with patch('desktop_sustained.ProcessSampler', Sampler), patch('desktop_sustained.ProcessGroups', Groups):
            self.driver.sample()
        publication = self.driver.latest_publication
        self.assertEqual(publication['groups'], observation)
        self.assertEqual(publication['source_id'], 1)
        observation['app']['nested']['value'] = 9
        self.assertEqual(publication['groups']['app']['nested']['value'], 1)

    def test_legacy_rows_share_source_and_preserve_payload_and_request_age(self):
        from desktop_sustained import write_legacy_sample
        from stream_measurement import JsonLines
        import json
        groups = {'app': {'monotonic': 9, 'nested': {'x': 1}},
                  'sampler_capture_overhead': {'sample_start': 8}, 'private_audio_server': None}
        self.driver.latest_publication = {'source_id': 4, 'sampling_started': 10.,
                                          'sampling_completed': 10.5, 'groups': groups}
        writer = JsonLines(Path(self.tmp.name) / 'resource-samples.jsonl')
        with patch('desktop_sustained.time.monotonic', side_effect=[11., 11., 12., 12.]):
            self.driver.start = 0
            first = write_legacy_sample(self.driver, writer)
            second = write_legacy_sample(self.driver, writer)
        self.assertEqual(first['nested'], {'x': 1})
        self.assertEqual(first['sampler_capture_overhead'], groups['sampler_capture_overhead'])
        self.assertEqual(first['provenance']['age_at_request_seconds'], 1.)
        self.assertEqual(second['provenance']['age_at_request_seconds'], 2.)
        self.assertEqual(first['provenance']['source_id'], second['provenance']['source_id'])
        first['nested']['x'] = 99
        self.assertEqual(self.driver.latest_publication['groups']['app']['nested']['x'], 1)
        rows = [json.loads(line) for line in writer.path.read_text().splitlines()]
        self.assertEqual(rows[1], second)
        self.assertEqual(len(rows), 2)

    def test_stale_publication_waits_and_accepts_later_signed_age(self):
        self.driver.start = 0
        self.driver.latest_publication = {'source_id': 1, 'sampling_started': 7.999, 'groups': {}}
        later = {'source_id': 2, 'sampling_started': 10.5, 'sampling_completed': 11., 'groups': {'app': {}}}
        def wake(_seconds): self.driver.latest_publication = later
        with patch('desktop_sustained.time.monotonic', side_effect=[10., 10., 11.]), patch.object(self.driver.condition, 'wait', side_effect=wake) as wait:
            request, result = self.driver.process_publication()
        self.assertEqual(wait.call_count, 1)
        self.assertEqual(result, later)
        self.assertEqual(request - result['sampling_started'], -.5)

    def test_wait_timeout_wall_stop_and_error(self):
        self.driver.start = 0
        with patch('desktop_sustained.time.monotonic', side_effect=[10., 10., 15.]), patch.object(self.driver.condition, 'wait'):
            with self.assertRaisesRegex(RuntimeError, 'timeout'): self.driver.process_publication()
        with patch('desktop_sustained.time.monotonic', side_effect=[2699., 2699., 2700.]), patch.object(self.driver.condition, 'wait'):
            with self.assertRaisesRegex(RuntimeError, 'wall_limit'): self.driver.process_publication()
        self.driver.stop_sampling()
        with self.assertRaisesRegex(RuntimeError, 'stopped'): self.driver.process_publication()
        cause = ValueError('collection failed')
        self.driver.errors.append(cause)
        with self.assertRaisesRegex(RuntimeError, 'sampler failed') as caught: self.driver.process_publication()
        self.assertIs(caught.exception.__cause__, cause)

    def test_write_failure_never_publishes_and_cleanup_surfaces_cause(self):
        class Sampler:
            def __init__(self, _pid): pass
        class Groups:
            def __init__(self, **_kwargs): pass
            def sample(self): return {'app': {}, 'sampler_capture_overhead': {}, 'private_audio_server': None}
        failure = RuntimeError('metadata_limit')
        with patch('desktop_sustained.ProcessSampler', Sampler), patch('desktop_sustained.ProcessGroups', Groups), patch.object(self.driver.resource_log, 'write', side_effect=failure):
            self.driver.sample()
        self.assertIsNone(self.driver.latest_publication)
        with self.assertRaisesRegex(RuntimeError, 'sampler failed') as caught: self.driver.cleanup()
        self.assertIs(caught.exception.__cause__, failure)

    def test_legacy_write_failure_propagates(self):
        from desktop_sustained import write_legacy_sample
        from stream_measurement import JsonLines
        self.driver.latest_publication = {'source_id': 1, 'sampling_started': self.driver.start,
            'sampling_completed': self.driver.start, 'groups': {'app': {}, 'sampler_capture_overhead': {}, 'private_audio_server': None}}
        writer = JsonLines(Path(self.tmp.name) / 'resource-samples.jsonl')
        failure = RuntimeError('metadata_limit')
        with patch.object(writer, 'write', side_effect=failure):
            with self.assertRaisesRegex(RuntimeError, 'metadata_limit') as caught: write_legacy_sample(self.driver, writer)
        self.assertIs(caught.exception, failure)
        self.assertFalse(writer.path.exists())

    def test_periodic_schedule_catches_up_without_extra_samples(self):
        import json
        class Clock:
            now = 0.
            def monotonic(self): return self.now
            def sleep(self, seconds): self.now += seconds
        clock = Clock()
        class Stop:
            stopped = False
            def is_set(self): return self.stopped
            def set(self): self.stopped = True
            def wait(self, seconds):
                clock.now += seconds
                if len(calls) == 3: self.stopped = True
        calls = []
        class Sampler:
            def __init__(self, _pid): pass
        class Groups:
            def __init__(self, **_kwargs): pass
            def sample(self):
                calls.append(clock.now)
                clock.now += 1.6 if len(calls) == 1 else .1
                return {'app': {}, 'sampler_capture_overhead': {}, 'private_audio_server': None}
        with patch('desktop_sustained.time', clock), patch('desktop_sustained.ProcessSampler', Sampler), patch('desktop_sustained.ProcessGroups', Groups):
            driver = DesktopSustained(UI(Path(self.tmp.name)), None, None, None)
            driver.stop = Stop()
            driver.sample()
        rows = [json.loads(line) for line in driver.resource_log.path.read_text().splitlines()]
        self.assertEqual(calls, [0., 1.6, 2.])
        self.assertEqual([row['scheduled_monotonic'] for row in rows], [0., 1., 2.])
        self.assertEqual([row['source_id'] for row in rows], [1, 2, 3])
        self.assertEqual(rows[0]['missed_cadences'], 1)

    def test_stuck_join_is_reported_and_hooks_restored(self):
        class Thread:
            def join(self, timeout): self.timeout = timeout
            def is_alive(self): return True
        original = object()
        self.driver.originals['click'] = original
        self.driver.thread = Thread()
        with self.assertRaisesRegex(RuntimeError, 'did not stop'): self.driver.cleanup()
        self.assertIs(self.driver.ui.click, original)
        self.assertEqual(self.driver.thread.timeout, 5)

    def test_waiter_wakes_only_after_successful_write(self):
        import threading
        writing, release, consumed = threading.Event(), threading.Event(), threading.Event()
        class Sampler:
            def __init__(self, _pid): pass
        class Groups:
            def __init__(self, **_kwargs): pass
            def sample(inner):
                self.driver.stop.set()
                return {'app': {'monotonic': 123}, 'sampler_capture_overhead': {}, 'private_audio_server': None}
        original_write = self.driver.resource_log.write
        def write(row):
            writing.set()
            if not release.wait(2): raise RuntimeError('test write stalled')
            original_write(row)
        results = []
        def consume():
            results.append(self.driver.process_publication())
            consumed.set()
        with patch('desktop_sustained.ProcessSampler', Sampler), patch('desktop_sustained.ProcessGroups', Groups), patch.object(self.driver.resource_log, 'write', side_effect=write):
            worker = threading.Thread(target=self.driver.sample)
            reader = threading.Thread(target=consume)
            try:
                worker.start()
                self.assertTrue(writing.wait(2))
                reader.start()
                self.assertFalse(consumed.wait(.05))
                self.assertIsNone(self.driver.latest_publication)
                release.set()
                self.assertTrue(consumed.wait(2))
            finally:
                release.set()
                worker.join(2)
                reader.join(2)
        self.assertEqual(results[0][1]['groups']['app']['monotonic'], 123)
        self.assertTrue(self.driver.resource_log.path.exists())

    def test_actual_condition_wakes_on_stop_and_worker_failures(self):
        import threading
        for failure_kind in ('stop', 'collection', 'write'):
            with self.subTest(failure_kind=failure_kind), tempfile.TemporaryDirectory() as directory:
                driver = DesktopSustained(UI(Path(directory)), None, None, None)
                waiting, result = threading.Event(), []
                original_wait = driver.condition.wait
                def wait(timeout):
                    waiting.set()
                    return original_wait(timeout)
                def consume():
                    try: driver.process_publication()
                    except BaseException as error: result.append(error)
                class Sampler:
                    def __init__(self, _pid): pass
                cause = ValueError(failure_kind)
                class Groups:
                    def __init__(self, **_kwargs): pass
                    def sample(self):
                        if failure_kind == 'collection': raise cause
                        return {'app': {}, 'sampler_capture_overhead': {}, 'private_audio_server': None}
                with patch.object(driver.condition, 'wait', side_effect=wait), patch('desktop_sustained.ProcessSampler', Sampler), patch('desktop_sustained.ProcessGroups', Groups):
                    reader = threading.Thread(target=consume)
                    reader.start()
                    try:
                        self.assertTrue(waiting.wait(2))
                        if failure_kind == 'stop': driver.stop_sampling()
                        elif failure_kind == 'write':
                            with patch.object(driver.resource_log, 'write', side_effect=cause): driver.sample()
                        else: driver.sample()
                    finally:
                        reader.join(2)
                        if reader.is_alive(): driver.stop_sampling(); reader.join(2)
                    self.assertFalse(reader.is_alive())
                self.assertEqual(len(result), 1)
                if failure_kind == 'stop': self.assertRegex(str(result[0]), 'stopped')
                else:
                    self.assertIs(result[0].__cause__, cause)
                    with self.assertRaises(RuntimeError) as health: driver.health()
                    self.assertIs(health.exception.__cause__, cause)

    def test_inflight_sample_waits_and_times_out_without_legacy_row(self):
        import threading
        from desktop_sustained import write_legacy_sample
        from stream_measurement import JsonLines
        started, release, waiting = threading.Event(), threading.Event(), threading.Event()
        clock = [10.]
        self.driver.start = 0.
        class Sampler:
            def __init__(self, _pid): pass
        class Groups:
            def __init__(self, **_kwargs): pass
            def sample(inner):
                started.set()
                if not release.wait(2): raise RuntimeError('fixture stalled')
                self.driver.stop.set()
                return {'app': {}, 'sampler_capture_overhead': {}, 'private_audio_server': None}
        original_wait = self.driver.condition.wait
        def wait(timeout):
            waiting.set()
            return original_wait(timeout)
        writer = JsonLines(Path(self.tmp.name) / 'resource-samples.jsonl')
        result = []
        def consume():
            try: write_legacy_sample(self.driver, writer)
            except BaseException as error: result.append(error)
        with patch('desktop_sustained.time.monotonic', side_effect=lambda: clock[0]), patch('desktop_sustained.ProcessSampler', Sampler), patch('desktop_sustained.ProcessGroups', Groups), patch.object(self.driver.condition, 'wait', side_effect=wait):
            worker = threading.Thread(target=self.driver.sample)
            reader = threading.Thread(target=consume)
            try:
                worker.start()
                self.assertTrue(started.wait(2))
                reader.start()
                self.assertTrue(waiting.wait(2))
                with self.driver.condition:
                    clock[0] = 15.
                    self.driver.condition.notify_all()
                reader.join(2)
                self.assertFalse(reader.is_alive())
                self.assertRegex(str(result[0]), 'timeout')
                self.assertFalse(writer.path.exists())
            finally:
                release.set()
                worker.join(2)
                reader.join(2)

    def test_inflight_sample_crosses_wall_limit_without_legacy_row(self):
        import threading
        from desktop_sustained import write_legacy_sample
        from stream_measurement import JsonLines
        started, release, waiting = threading.Event(), threading.Event(), threading.Event()
        clock = [2699.]
        self.driver.start = 0.
        class Sampler:
            def __init__(self, _pid): pass
        class Groups:
            def __init__(self, **_kwargs): pass
            def sample(inner):
                started.set()
                if not release.wait(2): raise RuntimeError('fixture stalled')
                self.driver.stop.set()
                return {'app': {}, 'sampler_capture_overhead': {}, 'private_audio_server': None}
        original_wait = self.driver.condition.wait
        def wait(timeout):
            waiting.set()
            return original_wait(timeout)
        writer = JsonLines(Path(self.tmp.name) / 'resource-samples.jsonl')
        result = []
        def consume():
            try: write_legacy_sample(self.driver, writer)
            except BaseException as error: result.append(error)
        with patch('desktop_sustained.time.monotonic', side_effect=lambda: clock[0]), patch('desktop_sustained.ProcessSampler', Sampler), patch('desktop_sustained.ProcessGroups', Groups), patch.object(self.driver.condition, 'wait', side_effect=wait):
            worker = threading.Thread(target=self.driver.sample)
            reader = threading.Thread(target=consume)
            try:
                worker.start()
                self.assertTrue(started.wait(2))
                reader.start()
                self.assertTrue(waiting.wait(2))
                with self.driver.condition:
                    clock[0] = 2700.001
                    self.driver.condition.notify_all()
                reader.join(2)
                self.assertFalse(reader.is_alive())
                self.assertRegex(str(result[0]), 'wall_limit')
                self.assertFalse(writer.path.exists())
            finally:
                release.set()
                worker.join(2)
                reader.join(2)

    def test_aggregate_metadata_cap_rejects_real_legacy_writer(self):
        from desktop_sustained import write_legacy_sample
        from stream_measurement import JsonLines
        self.driver.latest_publication = {'source_id': 1, 'sampling_started': self.driver.start,
            'sampling_completed': self.driver.start, 'groups': {'app': {}, 'sampler_capture_overhead': {}, 'private_audio_server': None}}
        other = Path(self.tmp.name) / 'other.jsonl'
        other.write_text('x' * 200)
        writer = JsonLines(Path(self.tmp.name) / 'resource-samples.jsonl')
        with patch('stream_measurement.MAX_METADATA', 200):
            with self.assertRaisesRegex(RuntimeError, 'metadata_limit'): write_legacy_sample(self.driver, writer)
        self.assertFalse(writer.path.exists())
        self.assertEqual(other.stat().st_size, 200)

    def test_aggregate_metadata_cap_latches_actual_sustained_write_failure(self):
        class Sampler:
            def __init__(self, _pid): pass
        class Groups:
            def __init__(self, **_kwargs): pass
            def sample(self): return {'app': {}, 'sampler_capture_overhead': {}, 'private_audio_server': None}
        (Path(self.tmp.name) / 'other.jsonl').write_text('x' * 200)
        with patch('stream_measurement.MAX_METADATA', 200), patch('desktop_sustained.ProcessSampler', Sampler), patch('desktop_sustained.ProcessGroups', Groups):
            self.driver.sample()
        self.assertIsNone(self.driver.latest_publication)
        with self.assertRaisesRegex(RuntimeError, 'sampler failed') as caught: self.driver.health()
        self.assertRegex(str(caught.exception.__cause__), 'metadata_limit')
        self.assertFalse(self.driver.resource_log.path.exists())

    def test_real_legacy_writer_io_failure_propagates(self):
        from desktop_sustained import write_legacy_sample
        from stream_measurement import JsonLines
        self.driver.latest_publication = {'source_id': 1, 'sampling_started': self.driver.start,
            'sampling_completed': self.driver.start, 'groups': {'app': {}, 'sampler_capture_overhead': {}, 'private_audio_server': None}}
        path = Path(self.tmp.name) / 'blocked.jsonl'
        path.mkdir()
        with self.assertRaises(IsADirectoryError): write_legacy_sample(self.driver, JsonLines(path))
        self.assertEqual(list(path.iterdir()), [])

    def test_no_initial_publication_wall_deadline_writes_no_row(self):
        from desktop_sustained import write_legacy_sample
        from stream_measurement import JsonLines
        self.driver.start = 0
        writer = JsonLines(Path(self.tmp.name) / 'resource-samples.jsonl')
        with patch('desktop_sustained.time.monotonic', side_effect=[2699., 2699., 2700.]), patch.object(self.driver.condition, 'wait'):
            with self.assertRaisesRegex(RuntimeError, 'wall_limit'): write_legacy_sample(self.driver, writer)
        self.assertFalse(writer.path.exists())

    def test_cleanup_reports_worker_failure_latched_during_join(self):
        cause = ValueError('late worker failure')
        class Thread:
            def join(inner, timeout): self.driver.errors.append(cause)
            def is_alive(inner): return False
        self.driver.thread = Thread()
        self.driver.health()
        with self.assertRaisesRegex(RuntimeError, 'sampler failed') as caught: self.driver.cleanup()
        self.assertIs(caught.exception.__cause__, cause)

    def test_retirement_and_qualification_precede_stop_and_terminal_quit(self):
        import ast
        source = Path(__file__).with_name('check_alive_desktop.py').read_text()
        tree = ast.parse(source)
        def call_name(call):
            try: return ast.unparse(call.func)
            except AttributeError: return ''
        calls = [node for node in ast.walk(tree) if isinstance(node, ast.Call)]
        positions = {name: [node.lineno for node in calls if call_name(node) == name] for name in
                     ('sustained_driver.retired', 'qualify_epochs', 'sustained_driver.stop_sampling', 'sustained_driver.terminal.quit')}
        self.assertTrue(all(len(positions[name]) == 1 for name in positions))
        self.assertEqual([positions[name][0] for name in positions], sorted(positions[name][0] for name in positions))
        events = []
        self.driver.measure.finalize = lambda read, timeout, sleep: events.append(('finalize', timeout))
        self.driver.retired()
        self.driver.stop_sampling()
        self.driver.terminal.quit(lambda: events.append(('quit',)))
        self.assertEqual(events, [('finalize', 15), ('quit',)])
        self.assertTrue(self.driver.terminal.complete)

    def test_actual_sampler_history_deltas_and_identity_limit_across_publications(self):
        from desktop_sustained import write_legacy_sample
        from stream_measurement import CpuTracker, JsonLines, ProcessSampler
        from test_stream_measurement import stat
        root = Path(self.tmp.name) / 'fixture'
        root.mkdir()
        process = root / '42'
        process.mkdir()
        (process / 'fd').mkdir()
        (process / 'status').write_text('VmRSS: 100 kB\nThreads: 1\n')
        (process / 'stat').write_text(stat(pid=42, ticks=50))
        class Clock:
            now = 0.
            def monotonic(self): return self.now
            def sleep(self, seconds): self.now += seconds
        clock = Clock()
        rows = []
        class Stop:
            stopped = False
            def is_set(self): return self.stopped
            def set(self): self.stopped = True
            def wait(inner, seconds):
                rows.append(write_legacy_sample(driver, writer))
                clock.now += seconds
                if len(rows) == 1: (process / 'stat').write_text(stat(pid=42, ticks=150))
                else: (process / 'stat').write_text(stat(pid=42, start=200, ticks=1))
        def sampler(_pid):
            result = ProcessSampler(42, root)
            result.cpu = CpuTracker(100)
            return result
        with patch('desktop_sustained.time', clock), patch('stream_measurement.time', clock), patch('desktop_sustained.ProcessSampler', side_effect=sampler), patch('stream_measurement.MAX_IDENTITIES', 1):
            driver = DesktopSustained(UI(Path(self.tmp.name)), None, None, None)
            driver.stop = Stop()
            writer = JsonLines(Path(self.tmp.name) / 'resource-samples.jsonl')
            driver.sample()
        self.assertEqual(len(rows), 2)
        self.assertIsNone(rows[0]['cpu_percent'])
        self.assertEqual(rows[1]['cpu_percent'], 100.)
        self.assertEqual([row['provenance']['source_id'] for row in rows], [1, 2])
        self.assertIn('process_identity_limit', str(driver.errors[0]))
        self.assertEqual(driver.latest_publication['source_id'], 2)

    def test_actual_process_sample_entry_point_and_journey_call_structure(self):
        import ast
        import json
        import os
        import time
        from contextlib import nullcontext
        from stream_measurement import JsonLines
        source = Path(__file__).with_name('check_alive_desktop.py').read_text()
        tree = ast.parse(source)
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'process_sample')
        namespace = {'resource_sampler': None, 'resource_groups': None, 'resource_writer': None,
                     'ui': self.driver.ui, 'sustained_driver': self.driver, 'JsonLines': JsonLines,
                     'os': os, 'time': time, 'nullcontext': nullcontext}
        exec(compile(ast.Module(body=[function], type_ignores=[]), 'check_alive_desktop.py', 'exec'), namespace)
        self.driver.latest_publication = {'source_id': 3, 'sampling_started': self.driver.start,
            'sampling_completed': self.driver.start, 'groups': {'app': {'pid': 42, 'monotonic': 4},
                'sampler_capture_overhead': {'sample_start': 2}, 'private_audio_server': None}}
        shared_rows = [namespace['process_sample']() for _ in range(4)]
        shared = shared_rows[0]
        self.assertEqual(shared['pid'], 42)
        self.assertEqual(shared['provenance']['source_id'], 3)
        self.assertIsNone(namespace['resource_sampler'])
        class Sampler:
            def __init__(self, pid): self.pid = pid
        class Groups:
            def __init__(self, **groups): self.groups = groups
            def sample(self): return {'app': {'pid': self.groups['app'].pid, 'monotonic': 8},
                'sampler_capture_overhead': {'sample_start': 7}, 'private_audio_server': None}
        namespace.update(sustained_driver=None, resource_writer=None, ProcessSampler=Sampler, ProcessGroups=Groups)
        independent = namespace['process_sample']()
        self.assertEqual(independent, {'pid': 123, 'monotonic': 8,
            'sampler_capture_overhead': {'sample_start': 7}, 'private_audio_server': None})
        rows = [json.loads(line) for line in namespace['resource_writer'].path.read_text().splitlines()]
        self.assertEqual(rows, [*shared_rows, independent])
        parents = {child: parent for parent in ast.walk(tree) for child in ast.iter_child_nodes(parent)}
        calls = [node for node in ast.walk(tree) if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'process_sample']
        calls.sort(key=lambda node: node.lineno)
        self.assertEqual(len(calls), 4)
        ancestors = []
        for call in calls:
            chain, node = [], call
            while node in parents:
                node = parents[node]
                if isinstance(node, (ast.While, ast.If, ast.FunctionDef)): chain.append(type(node).__name__)
            ancestors.append(chain)
            self.assertIsInstance(parents[call], ast.Call)
            self.assertEqual(parents[call].func.attr, 'append')
        self.assertEqual([chain.count('While') for chain in ancestors], [0, 2, 1, 0])

    def test_first_request_includes_lazy_writer_initialization_in_age_and_deadline(self):
        import ast
        from stream_measurement import JsonLines
        source = Path(__file__).with_name('check_alive_desktop.py').read_text()
        tree = ast.parse(source)
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'process_sample')
        class Clock:
            now = 10.
            def monotonic(self): return self.now
        clock = Clock()
        self.driver.start = 0.
        self.driver.latest_publication = {'source_id': 1, 'sampling_started': 12.,
            'sampling_completed': 12.5, 'groups': {'app': {}, 'sampler_capture_overhead': {}, 'private_audio_server': None}}
        def writer(path):
            clock.now = 13.
            return JsonLines(path)
        namespace = {'resource_sampler': None, 'resource_groups': None, 'resource_writer': None,
                     'ui': self.driver.ui, 'sustained_driver': self.driver, 'JsonLines': writer, 'time': clock}
        exec(compile(ast.Module(body=[function], type_ignores=[]), 'check_alive_desktop.py', 'exec'), namespace)
        with patch('desktop_sustained.time.monotonic', side_effect=clock.monotonic):
            row = namespace['process_sample']()
        self.assertEqual(row['provenance']['request_monotonic'], 10.)
        self.assertEqual(row['provenance']['age_at_request_seconds'], -2.)
        namespace['resource_writer'] = None
        clock.now = 20.
        def slow_writer(path):
            clock.now = 26.
            return JsonLines(path)
        namespace['JsonLines'] = slow_writer
        with patch('desktop_sustained.time.monotonic', side_effect=clock.monotonic):
            with self.assertRaisesRegex(RuntimeError, 'timeout'): namespace['process_sample']()
        namespace['resource_writer'] = None
        clock.now = 2699.
        def wall_writer(path):
            clock.now = 2701.
            return JsonLines(path)
        namespace['JsonLines'] = wall_writer
        with patch('desktop_sustained.time.monotonic', side_effect=clock.monotonic):
            with self.assertRaisesRegex(RuntimeError, 'wall_limit'): namespace['process_sample']()
        self.assertEqual(len((Path(self.tmp.name) / 'resource-samples.jsonl').read_text().splitlines()), 1)

    def test_stale_request_waits_for_periodic_row_and_writes_equivalent_legacy_payload(self):
        import json
        import threading
        from desktop_sustained import write_legacy_sample
        from stream_measurement import JsonLines
        first_done, next_sample, waiting = threading.Event(), threading.Event(), threading.Event()
        class Clock:
            now = 10.
            def monotonic(self): return self.now
            def sleep(self, seconds): self.now += seconds
        clock = Clock()
        class Stop:
            stopped = False
            def is_set(self): return self.stopped
            def set(self): self.stopped = True
            def wait(self, _seconds):
                if len(calls) == 1:
                    first_done.set()
                    if not next_sample.wait(2): raise RuntimeError('fixture stalled')
                else: self.stopped = True
        calls = []
        class Sampler:
            def __init__(self, _pid): pass
        class Groups:
            def __init__(self, **_kwargs): pass
            def sample(self):
                calls.append(clock.now)
                number = len(calls)
                if number == 2: clock.now = 13.
                return {'app': {'monotonic': clock.now, 'sample_start': clock.now - .1, 'cpu_percent': number, 'nested': {'n': number}},
                        'sampler_capture_overhead': {'sample_end': clock.now, 'coverage_gap': False},
                        'private_audio_server': {'sample_duration': .2, 'pids': [7]}}
        with patch('desktop_sustained.time', clock), patch('desktop_sustained.ProcessSampler', Sampler), patch('desktop_sustained.ProcessGroups', Groups):
            driver = DesktopSustained(UI(Path(self.tmp.name)), None, None, None)
            driver.stop = Stop()
            writer = JsonLines(Path(self.tmp.name) / 'resource-samples.jsonl')
            original_wait = driver.condition.wait
            def wait(timeout):
                waiting.set()
                return original_wait(timeout)
            results = []
            def consume(): results.append(write_legacy_sample(driver, writer))
            with patch.object(driver.condition, 'wait', side_effect=wait):
                worker = threading.Thread(target=driver.sample)
                reader = threading.Thread(target=consume)
                try:
                    worker.start()
                    self.assertTrue(first_done.wait(2))
                    first = write_legacy_sample(driver, writer)
                    clock.now = 12.001
                    reader.start()
                    self.assertTrue(waiting.wait(2))
                    self.assertEqual(calls, [10.])
                    clock.now = 12.5
                    next_sample.set()
                    reader.join(2)
                    worker.join(2)
                    self.assertFalse(reader.is_alive())
                    self.assertFalse(worker.is_alive())
                    repeated = write_legacy_sample(driver, writer)
                    driver.stop_sampling()
                    with self.assertRaisesRegex(RuntimeError, 'stopped'): write_legacy_sample(driver, writer)
                finally:
                    next_sample.set()
                    worker.join(2)
                    if reader.ident is not None: reader.join(2)
        sustained = [json.loads(line) for line in driver.resource_log.path.read_text().splitlines()]
        legacy = [json.loads(line) for line in writer.path.read_text().splitlines()]
        self.assertEqual(len(calls), 2)
        self.assertEqual(legacy, [first, results[0], repeated])
        self.assertEqual(len(sustained), 2)
        row, source = results[0], sustained[1]
        self.assertEqual({key: value for key, value in row.items() if key not in
                          ('sampler_capture_overhead', 'private_audio_server', 'provenance')}, source['app'])
        self.assertEqual(row['sampler_capture_overhead'], source['sampler_capture_overhead'])
        self.assertEqual(row['private_audio_server'], source['private_audio_server'])
        self.assertEqual(row['provenance']['source_id'], source['source_id'])
        self.assertEqual(row['provenance']['sampling_started'], source['sampling_started'])
        self.assertEqual(row['provenance']['sampling_completed'], source['monotonic'])
        self.assertEqual(row['provenance']['request_monotonic'], 12.001)
        self.assertAlmostEqual(row['provenance']['age_at_request_seconds'], -.499)
        self.assertEqual(repeated['provenance']['source_id'], row['provenance']['source_id'])

    def test_real_adapter_feeds_diagnostics_and_transport_to_collector(self):
        import json
        values = {'Stream diagnostics': json.dumps(diagnostics()), 'Transport playing': 'true', 'Absolute frame': '48000'}
        self.driver.accessible = values.get
        with patch('pathlib.Path.read_text', return_value='123 (alive) S 1'):
            self.driver.observe()
        self.assertEqual(self.driver.epochs.cursor, 1)
        self.assertEqual(self.driver.playing.last[1], True)

    def test_confirmed_process_disappearance_is_latched(self):
        with patch('pathlib.Path.read_text', side_effect=FileNotFoundError):
            with self.assertRaises(ProcessDisappeared): self.driver.observe()
        with self.assertRaises(ProcessDisappeared): self.driver.observe()

    def test_accessible_reference_is_reused_and_replaced_after_stale_read(self):
        class Stale(Exception): pass
        class Node:
            def __init__(self, text): self.text = text
            def get_name(self): return 'Stream diagnostics'
            def get_interfaces(self): return ['Text']
        class Text:
            @staticmethod
            def get_text(node, _start, _end):
                if node.text is None: raise Stale()
                return node.text
        class Atspi: pass
        class GLib: pass
        Atspi.Text, GLib.Error = Text, Stale
        class Windows:
            def __init__(self): self.calls = 0
            def app_frames(self): self.calls += 1; return [object()]
        class FakeUI(UI):
            node = Node('first')
            def walk(self, _frame): return iter([self.node])
        ui, windows = FakeUI(Path(self.tmp.name)), Windows()
        driver = DesktopSustained(ui, windows, Atspi, GLib)
        self.assertEqual(driver.accessible('Stream diagnostics'), 'first')
        self.assertEqual(driver.accessible('Stream diagnostics'), 'first')
        self.assertEqual(windows.calls, 1)
        ui.node.text = None
        ui.node = Node('replacement')
        self.assertEqual(driver.accessible('Stream diagnostics'), 'replacement')
        self.assertEqual(windows.calls, 2)
        ui.node.text = ''
        ui.node = Node('fresh after empty')
        self.assertEqual(driver.accessible('Stream diagnostics'), 'fresh after empty')
        self.assertEqual(windows.calls, 3)

    def test_defunct_diagnostics_without_replacement_breaks_playing_continuity(self):
        import json
        class Stale(Exception): pass
        class Node:
            def __init__(self, name, text): self.name, self.text = name, text
            def get_name(self): return self.name
            def get_interfaces(self): return ['Text']
        class Text:
            @staticmethod
            def get_text(node, _start, _end):
                if node.text is None: raise Stale()
                return node.text
        class Atspi: pass
        class GLib: pass
        Atspi.Text, GLib.Error = Text, Stale
        class Windows:
            def app_frames(self): return [object()]
        class FakeUI(UI):
            def walk(self, _frame): return iter(self.nodes)
        ui = FakeUI(Path(self.tmp.name))
        diagnostic = Node('Stream diagnostics', json.dumps(diagnostics()))
        ui.nodes = [diagnostic, Node('Transport playing', 'true'), Node('Absolute frame', '0')]
        driver = DesktopSustained(ui, Windows(), Atspi, GLib)
        with patch('pathlib.Path.read_text', return_value='123 (alive) S 1'):
            driver.observe()
            self.assertIsNotNone(driver.playing.last)
            diagnostic.text = None
            ui.nodes.remove(diagnostic)
            driver.observe()
        self.assertIsNone(driver.playing.last)
        self.assertIsNone(driver.accessible('Stream diagnostics'))

    def test_defunct_handle_is_not_reused_even_if_it_returns_text(self):
        class State:
            def __init__(self, node): self.node = node
            def contains(self, _state): return self.node.defunct
        class Node:
            def __init__(self, text): self.text, self.defunct = text, False
            def get_name(self): return 'Absolute frame'
            def get_interfaces(self): return ['Text']
            def get_state_set(self): return State(self)
        class Text:
            @staticmethod
            def get_text(node, _start, _end): return node.text
        class Atspi:
            class StateType: DEFUNCT = 'defunct'
        class GLib: Error = RuntimeError
        Atspi.Text = Text
        class Windows:
            def app_frames(self): return [object()]
        class FakeUI(UI):
            def walk(self, _frame): return iter([self.node])
        ui = FakeUI(Path(self.tmp.name))
        ui.node = Node('100')
        driver = DesktopSustained(ui, Windows(), Atspi, GLib)
        self.assertEqual(driver.accessible('Absolute frame'), '100')
        ui.node.defunct = True
        ui.node = Node('200')
        self.assertEqual(driver.accessible('Absolute frame'), '200')


    def test_install_brackets_real_ui_action_and_cleanup_restores_hooks(self):
        events = []
        class FakeUI(UI):
            def click(self, name): events.append(('click', name))
            def text(self, name, value): events.append(('text', name, value))
            def keys(self, key): events.append(('keys', key))
        class FakeThread:
            def __init__(self, **kwargs): pass
            def start(self): events.append(('sampler_started',))
            def join(self, timeout): events.append(('sampler_joined',))
            def is_alive(self): return False
        import time
        original_sleep = time.sleep
        ui = FakeUI(Path(self.tmp.name))
        driver = DesktopSustained(ui, None, None, None)
        driver.observer.read = lambda: (diagnostics(), 'true', '0')
        original_click = ui.click
        with patch('desktop_sustained.threading.Thread', FakeThread):
            try:
                driver.install()
                ui.click('Seek transport')
                self.assertEqual(driver.measure.action_ordinal, 1)
                self.assertEqual(driver.epochs.cursor, 1)
                self.assertIn(('click', 'Seek transport'), events)
            finally:
                driver.cleanup()
        self.assertEqual(ui.click, original_click)
        self.assertIs(time.sleep, original_sleep)
        self.assertIn(('sampler_joined',), events)

    def test_short_sleeps_do_not_insert_reads_between_native_clicks(self):
        class Clock:
            now = 0.
            def monotonic(self): return self.now
            def sleep(self, seconds): self.now += seconds
        class FakeUI(UI):
            def click(self, _name): pass
            def text(self, _name, _value): pass
            def keys(self, _key): pass
        class FakeThread:
            def __init__(self, **_kwargs): pass
            def start(self): pass
            def join(self, timeout): pass
            def is_alive(self): return False
        clock, reads = Clock(), []
        with patch('desktop_sustained.time', clock), patch('desktop_sustained.threading.Thread', FakeThread):
            driver = DesktopSustained(FakeUI(Path(self.tmp.name)), None, None, None)
            def read():
                reads.append(clock.now)
                return diagnostics(), 'true', str(int(clock.now * 48000))
            driver.observer.read = read
            driver.observe()
            try:
                driver.install()
                clock.sleep(.07); clock.sleep(.07)
                self.assertEqual(len(reads), 1)
                clock.sleep(2.1)
                self.assertGreaterEqual(len(reads), 3)
            finally:
                driver.cleanup()

    def test_resource_sampling_continues_while_ui_action_waits(self):
        import threading
        blocking, sampled, release = threading.Event(), threading.Event(), threading.Event()
        class FakeUI(UI):
            def click(self, _name):
                blocking.set()
                if not release.wait(4): raise RuntimeError('fixture release timed out')
            def text(self, _name, _value): pass
            def keys(self, _key): pass
        class FakeSampler:
            def __init__(self, _pid): pass
        class FakeGroups:
            def __init__(self, **_groups): pass
            def sample(self):
                if blocking.is_set(): sampled.set()
                return {'app': None, 'sampler_capture_overhead': None, 'private_audio_server': None}
        driver = DesktopSustained(FakeUI(Path(self.tmp.name)), None, None, None)
        driver.observer.read = lambda: (diagnostics(), 'true', '0')
        result = []
        def unblock():
            blocking.wait(2)
            result.append(sampled.wait(2))
            release.set()
        helper = threading.Thread(target=unblock)
        with patch('desktop_sustained.ProcessSampler', FakeSampler), patch('desktop_sustained.ProcessGroups', FakeGroups):
            try:
                driver.install()
                helper.start()
                driver.ui.click('long UI action')
            finally:
                release.set()
                helper.join(timeout=5)
                driver.cleanup()
        self.assertEqual(result, [True], 'resource sampler was blocked by the UI action')
        import json
        rows = [json.loads(line) for line in driver.resource_log.path.read_text().splitlines()]
        self.assertTrue(rows)
        for row in rows:
            self.assertGreaterEqual(row['monotonic'], row['sampling_started'])
            self.assertAlmostEqual(row['sampling_duration'], row['monotonic'] - row['sampling_started'])
            self.assertAlmostEqual(row['sampling_delay'], max(0, row['sampling_started'] - row['scheduled_monotonic']))

    def test_exited_recorder_and_sampler_fail_health(self):
        class Process:
            def poll(self): return 1
        class Capture:
            process = Process()
        self.driver.capture = (Capture(), Path('capture'))
        with self.assertRaisesRegex(RuntimeError, 'recorder supervisor'):
            self.driver.health()
        self.driver.finishing_capture = True
        self.driver.health()
        self.driver.finishing_capture = False
        self.driver.capture = None
        self.driver.errors.append(ValueError('sampler'))
        with self.assertRaisesRegex(RuntimeError, 'resource sampler') as caught:
            self.driver.health()
        self.assertEqual(str(caught.exception.__cause__), 'sampler')
