#!/usr/bin/env python3
"""Exercise provenance annotations against recorded Max data in a temporary copy."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


class AnnotationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="alive-max-annotations-")
        cls.addClassCleanup(cls.temp.cleanup)
        root = Path(cls.temp.name)
        for directory in ("scripts", "results", "fixtures", "expected"):
            (root / directory).mkdir()
        shutil.copy2(ROOT / "scripts/normalize.py", root / "scripts/normalize.py")
        for stem in ("01-trigger", "13-initialization", "14-scheduler", "18-dsp"):
            for directory, suffix in (("results", ".jsonl"), ("fixtures", ".score.json"),
                                      ("fixtures", ".maxpat")):
                shutil.copy2(ROOT / directory / (stem + suffix), root / directory / (stem + suffix))
        subprocess.run([sys.executable, str(root / "scripts/normalize.py")],
                       check=True, capture_output=True, text=True)
        cls.expected = root / "expected"

    def annotations(self, stem):
        data = json.loads((self.expected / (stem + ".json")).read_text())
        return {row["seq"]: row for row in data["event_annotations"]}

    def test_delayed_output_keeps_latest_input_separate_from_unmeasured_causality(self):
        annotation = self.annotations("14-scheduler")[16]
        self.assertNotIn("operation_id", annotation)
        self.assertEqual(annotation.get("latest_input_id"), "event_8")
        self.assertIn("causal_input_id", annotation)
        self.assertIsNone(annotation["causal_input_id"])
        self.assertEqual(annotation.get("causality"), "not_measured")

    def test_shared_logger_inlet_retains_both_sources_without_selecting_one(self):
        data = json.loads((self.expected / "18-dsp.json").read_text())
        annotations = self.annotations("18-dsp")
        driver_rows = [row for row in data["events"] if row["label"] == "driver_left"]
        self.assertTrue(driver_rows)
        for row in driver_rows:
            with self.subTest(seq=row["seq"]):
                annotation = annotations[row["seq"]]
                self.assertEqual(annotation.get("source_object_outlet_candidates"),
                                 [["obj-2", 0], ["obj-46", 0]])
                self.assertIsNone(annotation["source_object_outlet"])
                self.assertEqual(annotation.get("source_resolution"), "ambiguous")

    def test_unique_trigger_outlet_remains_identifiable(self):
        annotation = self.annotations("01-trigger")[2]
        self.assertEqual(annotation["source_object_outlet"], ["obj-2", 2])
        self.assertEqual(annotation.get("source_object_outlet_candidates"), [["obj-2", 2]])
        self.assertEqual(annotation.get("source_resolution"), "unique_patchline")

    def test_initialization_has_no_latest_input(self):
        annotation = self.annotations("13-initialization")[1]
        self.assertIn("latest_input_id", annotation)
        self.assertIsNone(annotation["latest_input_id"])


if __name__ == "__main__":
    unittest.main()
