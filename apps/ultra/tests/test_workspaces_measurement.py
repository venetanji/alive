"""Evidence parsing must fail closed; timings are never inferred from v3."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location(
    "measurement", Path(__file__).with_name("run_alive_workspaces_measurement.py"))
measurement = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(measurement)


class EvidenceTests(unittest.TestCase):
    def test_timing_has_no_trace_or_guards_and_test_admission_only(self):
        timing = measurement.measurement_flags(False)
        diagnostic = measurement.measurement_flags(True)
        self.assertIn("-DULTRA_ALIVE_SESSION_V4_PROVISIONAL", timing)
        self.assertNotIn("-DULTRA_ALIVE_SESSION_TEST_TRACE", timing)
        self.assertNotIn("-DWORKSPACES_GUARDS", timing)
        self.assertIn("-DULTRA_ALIVE_SESSION_TEST_TRACE", diagnostic)
        self.assertIn("-DWORKSPACES_GUARDS", diagnostic)

    def test_exact_quantiles_and_deadlines(self):
        result = measurement.distribution([1.0, 2.0, 3.0, 100.0], 1)
        self.assertEqual(result["p999_us"], 3.0)
        self.assertEqual(result["max_us"], 100.0)
        self.assertEqual(result["overruns"], 1)

    def test_empty_samples_refuse(self):
        with self.assertRaises(ValueError):
            measurement.distribution([], 64)

    def test_incomplete_resource_trace_refuses(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "work.csv"
            path.write_text("case,profile,frames,iteration,family,events,roots,scans,writes,guards\n")
            with self.assertRaises(ValueError):
                measurement.read_work(path)


if __name__ == "__main__":
    unittest.main()
