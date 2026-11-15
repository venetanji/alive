import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


SPEC = importlib.util.spec_from_file_location(
    "packet", Path(__file__).with_name("verify_packet.py")
)


class PacketTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.dll = self.root / "installed.dll"
        self.dll.write_bytes(b"synthetic DLL identity fixture")
        self.evidence = self.root / "descriptors.json"
        self.evidence.write_text('{"count": 2}\n')
        identity = lambda path: {
            "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        }
        self.data = {
            "schema": "live-device-evidence-v1",
            "device": "Fixture",
            "revision": 1,
            "acquisition": {"owner": "coordinator", "rea_status": "not-needed"},
            "artifacts": [
                {"id": "dsp", "kind": "dsp-dll", "path": str(self.dll), **identity(self.dll)}
            ],
            "files": [
                {
                    "id": "descriptors", "path": "descriptors.json",
                    "authority": "native-runtime", "artifact_ids": ["dsp"],
                    **identity(self.evidence),
                }
            ],
            "findings": [
                {
                    "id": "descriptor-count", "status": "observed",
                    "claim": "Fixture probe reported two descriptors.",
                    "file_ids": ["descriptors"], "limitations": ["Synthetic fixture only."],
                }
            ],
            "unknowns": ["All real device behavior."],
        }
        self.manifest = self.root / "packet.json"

    def verify(self):
        self.manifest.write_text(json.dumps(self.data))
        module = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(module)
        return module.verify_packet(self.manifest)

    def test_checks_retained_payload_and_installed_artifact(self):
        result = self.verify()
        self.assertEqual(result["device"], "Fixture")
        self.assertEqual(result["file_count"], 1)
        self.assertEqual(result["artifact_count"], 1)

    def test_payload_change_invalidates_packet(self):
        self.evidence.write_text('{"count": 3}\n')
        with self.assertRaisesRegex(ValueError, "identity mismatch"):
            self.verify()

    def test_source_change_invalidates_packet(self):
        self.dll.write_bytes(b"a different source")
        with self.assertRaisesRegex(ValueError, "identity mismatch"):
            self.verify()

    def test_payload_cannot_escape_packet_directory(self):
        self.data["files"][0]["path"] = "../elsewhere.json"
        with self.assertRaisesRegex(ValueError, "relative path"):
            self.verify()

    def test_payload_symlink_cannot_escape_packet_directory(self):
        with tempfile.TemporaryDirectory() as other:
            source = Path(other) / "other.json"
            source.write_bytes(self.evidence.read_bytes())
            self.evidence.unlink()
            self.evidence.symlink_to(source)
            with self.assertRaisesRegex(ValueError, "escapes packet"):
                self.verify()

    def test_duplicate_identifiers_are_rejected(self):
        self.data["files"].append(dict(self.data["files"][0]))
        with self.assertRaisesRegex(ValueError, "duplicate"):
            self.verify()

    def test_findings_must_reference_retained_files(self):
        self.data["findings"][0]["file_ids"] = ["missing"]
        with self.assertRaisesRegex(ValueError, "unknown file"):
            self.verify()

    def test_static_evidence_does_not_prove_runtime_observation(self):
        self.data["files"][0]["authority"] = "unsupported"
        with self.assertRaisesRegex(ValueError, "authority"):
            self.verify()

    def test_acquisition_must_be_released_before_dispatch(self):
        self.data["acquisition"]["rea_status"] = "open"
        with self.assertRaisesRegex(ValueError, "rea_status"):
            self.verify()

    def test_json_duplicate_keys_are_rejected(self):
        self.manifest.write_text('{"schema":"live-device-evidence-v1","schema":"other"}')
        module = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(module)
        with self.assertRaisesRegex(ValueError, "duplicate JSON"):
            module.verify_packet(self.manifest)


if __name__ == "__main__":
    unittest.main()
