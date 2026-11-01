import unittest

from desktop_snapshot_retry import retry_snapshot


class SnapshotRetryTest(unittest.TestCase):
    def test_retries_transient_replacement_without_returning_partial_data(self):
        class Transient(Exception): pass
        calls = []
        def read():
            calls.append(None)
            if len(calls) == 1: raise Transient('stale node')
            return {'one', 'two'}
        self.assertEqual(retry_snapshot(read, Transient, sleep=lambda _: None), {'one', 'two'})
        self.assertEqual(len(calls), 2)

    def test_persistent_failure_is_not_reported_as_an_empty_snapshot(self):
        class Transient(Exception): pass
        ticks = iter([0, 0, 4])
        def read(): raise Transient('unavailable')
        with self.assertRaises(Transient):
            retry_snapshot(read, Transient, clock=lambda: next(ticks), sleep=lambda _: None)


if __name__ == '__main__':
    unittest.main()
