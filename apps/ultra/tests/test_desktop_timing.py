"""GI-free tests for the journey's transparent diagnostic observer."""
import io
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest

from desktop_timing import TimingProbe


class TimingTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.output = Path(self.directory.name)
        self.stream = io.StringIO()
        self.now = 0.

    def probe(self, **kwargs):
        return TimingProbe(self.output, stream=self.stream, **kwargs)

    def read(self):
        return json.loads((self.output / 'journey-timing.json').read_text())

    def test_wrapped_values_and_exception_identity_and_inclusive_nested_cost(self):
        probe = self.probe(clock=lambda: self.now)
        result, error = object(), ValueError('original')

        def inner(name):
            self.now += 2
            if name == 'missing':
                raise error
            return result

        query = probe.wrap('scoped_find', inner)

        def outer(name):
            self.now += 1
            return query(name)

        wait = probe.wrap('wait_for', outer)
        self.assertIs(wait('control'), result)
        with self.assertRaises(ValueError) as caught:
            wait('missing')
        self.assertIs(caught.exception, error)
        probe.close()
        summary = self.read()['queries']
        self.assertEqual(summary['wait_for']['count'], 2)
        self.assertEqual(summary['wait_for']['inclusive_elapsed_seconds'], 6)
        self.assertEqual(summary['wait_for']['max_seconds'], 3)
        self.assertEqual(summary['scoped_find']['inclusive_elapsed_seconds'], 4)
        self.assertEqual(summary['scoped_find']['errors'], 1)
        self.assertEqual(self.read()['active'], [])

    def test_recursive_lazy_walk_counts_roots_and_only_time_running_generator(self):
        probe = self.probe(clock=lambda: self.now)
        visited = []

        def raw(node):
            visited.append(node[0])
            self.now += 1
            yield node[0]
            for child in node[1:]:
                yield from walk(child)

        walk = probe.wrap_walk(raw)
        iterator = walk(('root', ('child', ('leaf',))))
        self.assertEqual(visited, [])  # Creation must remain lazy.
        self.assertEqual(next(iterator), 'root')
        self.now += 100  # Caller work while suspended is not traversal cost.
        self.assertEqual(list(iterator), ['child', 'leaf'])
        probe.close()
        summary = self.read()['queries']['walk']
        self.assertEqual(summary['count'], 1)
        self.assertEqual(summary['inclusive_elapsed_seconds'], 3)
        self.assertEqual(summary['max_seconds'], 3)

    def test_walk_early_close_runs_recursive_cleanup_without_leaking_active_spans(self):
        probe = self.probe(clock=lambda: self.now)
        closed = []

        def raw(depth):
            try:
                self.now += 1
                yield depth
                if depth:
                    yield from walk(depth - 1)
            finally:
                closed.append(depth)
                self.now += 1

        walk = probe.wrap_walk(raw)
        iterator = walk(2)
        self.assertEqual(next(iterator), 2)
        self.assertEqual(next(iterator), 1)
        iterator.close()
        probe.close()
        self.assertEqual(closed, [1, 2])
        self.assertEqual(self.read()['active'], [])
        self.assertEqual(self.read()['queries']['walk']['count'], 1)
        self.assertEqual(self.read()['queries']['walk']['inclusive_elapsed_seconds'], 4)

    def test_walk_preserves_send_throw_return_and_exception_identity(self):
        probe = self.probe()
        error = RuntimeError('original')

        def raw():
            received = yield 'first'
            try:
                yield received
            except LookupError:
                yield 'caught'
            raise error

        iterator = probe.wrap_walk(raw)()
        self.assertEqual(next(iterator), 'first')
        self.assertEqual(iterator.send('sent'), 'sent')
        self.assertEqual(iterator.throw(LookupError()), 'caught')
        with self.assertRaises(RuntimeError) as caught:
            next(iterator)
        self.assertIs(caught.exception, error)
        probe.close()
        self.assertEqual(self.read()['queries']['walk']['errors'], 1)
        self.assertEqual(self.read()['active'], [])

        def returning():
            yield 'item'
            return 17

        iterator = probe.wrap_walk(returning)()
        self.assertEqual(next(iterator), 'item')
        with self.assertRaises(StopIteration) as returned:
            next(iterator)
        self.assertEqual(returned.exception.value, 17)

    def test_observer_reports_active_control_and_stack_before_call_returns(self):
        probe = self.probe(interval=.02)
        observed = threading.Event()
        snapshots = []

        class ObservingStream(io.StringIO):
            def write(stream, value):
                result = super().write(value)
                if '"event": "periodic"' in value:
                    snapshots.append(json.loads(value))
                    observed.set()
                return result

        probe.stream = ObservingStream()

        def blocked(control):
            self.assertTrue(observed.wait(2), 'No diagnostic while call pending')
            return control

        with probe:
            self.assertEqual(probe.wrap('wait_for', blocked)('Pending control'), 'Pending control')
        self.assertEqual(snapshots[0]['active'][0]['control'], 'Pending control')
        self.assertEqual(snapshots[0]['active'][0]['kind'], 'wait_for')
        self.assertIn('blocked', snapshots[0]['stack'])
        self.assertFalse(probe.observer.is_alive())
        count = len(snapshots)
        time.sleep(.05)
        self.assertEqual(len(snapshots), count)

    def test_failure_and_exit_cleanup_never_claim_journey_success(self):
        probe = self.probe(interval=.01)
        error = KeyboardInterrupt('original')
        with self.assertRaises(KeyboardInterrupt) as caught:
            with probe:
                with probe.phase('capture-finalize'):
                    raise error
        self.assertIs(caught.exception, error)
        probe.close()  # atexit-style fallback is idempotent.
        self.assertFalse(probe.observer.is_alive())
        events = self.read()['events']
        self.assertIn('failure', [row['event'] for row in events])
        self.assertNotIn('journey-complete', [row['event'] for row in events])
        self.assertEqual(self.read()['active'], [])

    def test_retention_output_and_observer_lifetime_are_bounded(self):
        probe = self.probe(interval=.001, retention=4, max_snapshots=3)
        with probe:
            for _ in range(200):
                probe.checkpoint('operation', 'x' * 10000)
            probe.observer.join(2)
            self.assertFalse(probe.observer.is_alive())
        artifact = self.read()
        self.assertLessEqual(len(artifact['events']), 4)
        self.assertLess((self.output / 'journey-timing.json').stat().st_size, 100000)
        self.assertLess(len(self.stream.getvalue()), 10000)
        self.assertEqual(artifact['snapshots_emitted'], 3)
        self.assertGreater(artifact['events_dropped'], 0)

    def test_retained_snapshots_keep_the_query_totals_at_observation_time(self):
        probe = self.probe()
        query = probe.wrap('wait_for', lambda name: name)
        query('first')
        # Take a periodic snapshot immediately using a real short-lived observer.
        probe.interval = .001
        probe.max_snapshots = 1
        with probe:
            probe.observer.join(2)
            query('second')
        artifact = self.read()
        snapshot = next(row for row in artifact['events'] if row['event'] == 'periodic')
        self.assertEqual(snapshot['queries']['wait_for']['count'], 1)
        self.assertEqual(artifact['queries']['wait_for']['count'], 2)

    def test_terminal_failure_and_quit_still_flush_after_progress_output_budget(self):
        probe = self.probe(retention=1)
        for _ in range(5):
            probe.checkpoint('operation')
        probe.checkpoint('failure', 'ValueError')
        probe.checkpoint('final-quit-entry')
        probe.close()
        events = [json.loads(line)['event'] for line in self.stream.getvalue().splitlines()]
        self.assertIn('failure', events)
        self.assertIn('final-quit-entry', events)
        self.assertIn('observer-stop', events)
        stream = io.StringIO()
        failures_only = TimingProbe(self.output, stream=stream, retention=1)
        for _ in range(100):
            failures_only.checkpoint('failure', 'repeated')
        self.assertLessEqual(len(stream.getvalue().splitlines()), 16)

    def test_identical_nested_calls_keep_span_identity_and_bound_active_retention(self):
        probe = self.probe(clock=lambda: self.now)
        depth = 0

        def nested(name):
            nonlocal depth
            depth += 1
            if depth < 40:
                query(name)
            else:
                probe.checkpoint('deep-call')
            depth -= 1
            self.now += 1
            return name

        query = probe.wrap('wait_for', nested)
        self.assertEqual(query('same'), 'same')
        during = self.read()
        self.assertLessEqual(len(during['active']), 32)
        self.assertEqual(during['active_omitted'], 8)
        probe.close()
        self.assertEqual(self.read()['active'], [])
        self.assertEqual(self.read()['queries']['wait_for']['count'], 40)
        self.assertEqual(self.read()['queries']['wait_for']['max_seconds'], 40)


if __name__ == '__main__':
    unittest.main()
