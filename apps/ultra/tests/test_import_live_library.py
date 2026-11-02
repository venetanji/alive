"""Synthetic artifacts only; these tests never load a PE image or installed DSP."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest


SOURCE = Path(__file__).resolve().parents[1] / "import-live-library.py"
EXPORTS = ["CalcA", "CreateInstanceU", "DestroyInstanceU", "GetPlugInfoU",
           "ResetA", "SetParameterA", "SetSampleRateU"]
STAGES = ["construction", "initialization", "audio", "mapping", "editor",
          "state", "instances", "lifecycle", "timing", "alive"]


def pe_image(exports=EXPORTS, machine=0x8664):
    data = bytearray(0xA00)
    data[:2] = b"MZ"
    struct.pack_into("<I", data, 0x3C, 0x80)
    data[0x80:0x84] = b"PE\0\0"
    struct.pack_into("<HHIIIHH", data, 0x84, machine, 1, 0, 0, 0, 240, 0x2002)
    struct.pack_into("<H", data, 0x98, 0x20B)
    struct.pack_into("<I", data, 0x98 + 60, 0x200)
    struct.pack_into("<I", data, 0x98 + 108, 16)
    struct.pack_into("<II", data, 0x98 + 112, 0x1000, 0x400)
    section = 0x98 + 240
    data[section:section + 8] = b".rdata\0\0"
    struct.pack_into("<IIII", data, section + 8, 0x800, 0x1000, 0x800, 0x200)
    struct.pack_into("<IIIIII", data, 0x200 + 16, 1, len(exports), len(exports),
                     0x1040, 0x1080, 0x10C0)
    cursor = 0x300
    for i, name in enumerate(exports):
        struct.pack_into("<I", data, 0x240 + i * 4, 0x1600 + i * 8)
        struct.pack_into("<I", data, 0x280 + i * 4, cursor - 0x200 + 0x1000)
        struct.pack_into("<H", data, 0x2C0 + i * 2, i)
        encoded = name.encode("ascii") + b"\0"
        data[cursor:cursor + len(encoded)] = encoded
        cursor += len(encoded)
    return bytes(data)


def document(kind="instrument"):
    return {"version": 1, "profile": "ultra-canvas-v1", "nodes": [{"id": 1}],
            "edges": [], "presentation": {"version": 1, "items": []},
            "device": {"version": 2, "kind": kind, "id": "org.alive.fixture"}}


class ImportLiveLibraryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ultra-import-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.installation = self.base / "Live"
        self.installation.mkdir()
        self.library = self.base / "library"
        self.cli = self.base / "cli" / "import-live-library.py"
        self.cli.parent.mkdir()
        self.registry = self.cli.parent / "live-device-qualifications.json"
        self.write_registry([])

    def artifact(self, path="Resources/Devices/Pc/Electric_64.dll", data=None):
        target = self.installation / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(pe_image() if data is None else data)
        return target

    def profile(self, target=None, **updates):
        target = target or self.artifact()
        value = {"id": "live12-electric-v1", "device": "Electric",
                 "class": "instrument", "artifacts": [{
                     "path": target.relative_to(self.installation).as_posix(),
                     "bytes": target.stat().st_size,
                     "sha256": hashlib.sha256(target.read_bytes()).hexdigest()}],
                 "stages": {key: "passed" for key in STAGES},
                 "evidence": ["private qualification fixture; no runtime claim"],
                 "generator": "export-live-device.mjs"}
        value.update(updates)
        return value

    def write_registry(self, profiles):
        self.registry.write_text(json.dumps({
            "schema": "ultra-live-device-qualifications-v1", "profiles": profiles}))

    def helper(self, body=None):
        code = body or ("import fs from 'node:fs';\n"
                        "const request=JSON.parse(fs.readFileSync(0,'utf8'));\n"
                        "fs.appendFileSync(new URL('./calls',import.meta.url),'1');\n"
                        "fs.writeFileSync(new URL('./request.json',import.meta.url),JSON.stringify(request));\n"
                        f"process.stdout.write({json.dumps(json.dumps(document()))});\n")
        (self.cli.parent / "export-live-device.mjs").write_text(code)

    def run_cli(self, *args, expected=0, dry_run=True):
        self.assertTrue(SOURCE.is_file(), "bounded Live library importer is not implemented")
        shutil.copyfile(SOURCE, self.cli)
        command = [sys.executable, "-B", str(self.cli), str(self.installation),
                   "--library", str(self.library), "--registry", str(self.registry)]
        if dry_run:
            command.append("--dry-run")
        result = subprocess.run(command + list(args), text=True, capture_output=True,
                                timeout=15)
        self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        return json.loads(result.stdout)

    def test_empty_registry_inventories_support_standalone_and_max_without_writing(self):
        self.artifact()
        self.artifact("Program/support.dll", pe_image(["SupportCall"]))
        self.artifact("Resources/Max/abl.device.utility~.mxe64", pe_image(["ext_main"]))
        report = self.run_cli()
        self.assertTrue(report["scan"]["complete"])
        self.assertEqual(len(report["binaries"]), 3)
        roles = {item["path"]: item["classification"] for item in report["binaries"]}
        self.assertEqual(roles["Program/support.dll"], "support-dll")
        self.assertEqual(roles["Resources/Devices/Pc/Electric_64.dll"], "standalone-device")
        self.assertEqual(roles["Resources/Max/abl.device.utility~.mxe64"], "max-device")
        self.assertEqual(report["profiles"], [])
        self.assertFalse(self.library.exists())

    def test_pe_discovery_ignores_suffix_and_keeps_duplicate_paths(self):
        binary = self.artifact("first.dll")
        self.artifact("embedded.payload", binary.read_bytes())
        self.artifact("other.mxe64", binary.read_bytes())
        report = self.run_cli()
        self.assertEqual(len(report["binaries"]), 3)
        self.assertEqual(report["duplicate_content"][0]["paths"],
                         ["embedded.payload", "first.dll", "other.mxe64"])
        self.assertEqual(report["binaries"][0]["sha256"],
                         hashlib.sha256(pe_image()).hexdigest())

    def test_corrupt_pe_is_recorded_without_becoming_a_device(self):
        self.artifact("bad.dll", b"MZ" + b"\0" * 70)
        report = self.run_cli()
        self.assertTrue(report["scan"]["complete"])
        self.assertEqual(report["binaries"][0]["classification"], "malformed-pe")
        self.assertTrue(report["binaries"][0]["reason"])

    def test_invalid_export_rva_is_bounded(self):
        bad = bytearray(pe_image())
        struct.pack_into("<I", bad, 0x200 + 32, 0x7FFFFFF0)
        self.artifact("bad.dll", bytes(bad))
        report = self.run_cli()
        self.assertEqual(report["binaries"][0]["classification"], "malformed-pe")

    def test_max_dsp_blocks_are_not_complete_devices(self):
        self.artifact("abl.dsp.osc~.mxe64", pe_image(["ext_main"]))
        report = self.run_cli()
        self.assertEqual(report["binaries"][0]["classification"], "max-dsp-block")

    def test_non_pe_dll_is_unknown_and_keeps_its_identity(self):
        self.artifact("foreign.dll", b"\x7fELF" + b"fixture")
        report = self.run_cli()
        self.assertEqual(report["binaries"][0]["classification"], "unsupported-format")
        self.assertEqual(report["binaries"][0]["format"], "ELF")

    def test_file_symlink_escape_is_rejected_without_reading_target(self):
        outside = self.base / "outside.dll"
        outside.write_bytes(pe_image())
        (self.installation / "escape.dll").symlink_to(outside)
        report = self.run_cli(expected=1)
        self.assertFalse(report["scan"]["complete"])
        self.assertEqual(report["binaries"], [])
        self.assertIn("symlink", json.dumps(report["scan"]["errors"]))

    def test_directory_symlinks_are_not_traversed(self):
        outside = self.base / "outside"
        outside.mkdir()
        (outside / "device.dll").write_bytes(pe_image())
        (self.installation / "escape").symlink_to(outside, target_is_directory=True)
        report = self.run_cli(expected=1)
        self.assertEqual(report["binaries"], [])

    def test_entry_budget_marks_scan_incomplete_and_prevents_generation(self):
        self.write_registry([self.profile()])
        self.helper()
        report = self.run_cli("--max-entries", "1", expected=1, dry_run=False)
        self.assertFalse(report["scan"]["complete"])
        self.assertFalse((self.cli.parent / "calls").exists())
        self.assertFalse(self.library.exists())

    def test_entry_budget_includes_siblings_after_recursive_walks(self):
        self.artifact("a/first.dll")
        self.artifact("b/second.dll")
        report = self.run_cli("--max-entries", "2", expected=1)
        self.assertLessEqual(report["scan"]["entries_visited"], 2)

    def test_depth_budget_does_not_silently_omit_nested_dlls(self):
        self.artifact("a/b/device.dll")
        report = self.run_cli("--max-depth", "1", expected=1)
        self.assertFalse(report["scan"]["complete"])

    def test_individual_and_total_read_budgets_are_enforced(self):
        self.artifact("large.dll")
        for option, count in [("--max-file-bytes", "64"), ("--max-total-bytes", "64")]:
            with self.subTest(option=option):
                report = self.run_cli(option, count, expected=1)
                self.assertFalse(report["scan"]["complete"])
                self.assertLessEqual(report["scan"]["bytes_read"], 64 if "total" in option else 4096)

    def test_qualification_checks_each_stage_without_calling_generator(self):
        profile = self.profile()
        profile["stages"]["mapping"] = "partial"
        profile["stages"]["alive"] = "failed"
        self.write_registry([profile])
        self.helper()
        report = self.run_cli(dry_run=False)
        self.assertEqual(report["profiles"][0]["status"], "unqualified")
        self.assertIn("mapping", json.dumps(report["profiles"][0]["reasons"]))
        self.assertIn("alive", json.dumps(report["profiles"][0]["reasons"]))
        self.assertFalse((self.cli.parent / "calls").exists())

    def test_changed_artifact_blocks_an_all_passed_declaration(self):
        profile = self.profile()
        self.write_registry([profile])
        self.artifact(data=pe_image() + b"changed")
        report = self.run_cli(expected=1, dry_run=False)
        self.assertEqual(report["profiles"][0]["status"], "artifact-mismatch")
        self.assertFalse(self.library.exists())

    def test_registry_duplicate_keys_and_nonfinite_values_are_rejected(self):
        for raw in ['{"schema":"ultra-live-device-qualifications-v1","profiles":[],"profiles":[]}',
                    '{"schema":"ultra-live-device-qualifications-v1","profiles":NaN}']:
            self.registry.write_text(raw)
            report = self.run_cli(expected=2)
            self.assertIn("error", report)

    def test_numeric_overflow_in_generator_json_never_publishes(self):
        self.write_registry([self.profile()])
        raw = json.dumps(document()).replace('"id": 1', '"id": 1e999')
        self.helper(f"process.stdout.write({json.dumps(raw)});")
        report = self.run_cli(expected=1, dry_run=False)
        self.assertEqual(report["publication"][0]["status"], "failed")
        self.assertEqual(list(self.library.glob("*.ultra")), [])

    def test_canonicalized_output_must_fit_the_saved_device_byte_limit(self):
        self.write_registry([self.profile()])
        self.helper(f"const value={json.dumps(document())};"
                    "value.nodes[0].label='\u00e9'.repeat(400000);"
                    "process.stdout.write(JSON.stringify(value));")
        report = self.run_cli(expected=1, dry_run=False)
        self.assertEqual(report["publication"][0]["status"], "failed")
        self.assertEqual(list(self.library.glob("*.ultra")), [])

    def test_helper_error_preserves_an_older_published_revision(self):
        profile = self.profile()
        self.write_registry([profile])
        self.helper()
        self.run_cli(dry_run=False)
        prior = next(self.library.glob("*.ultra"))
        before = prior.read_bytes()
        profile["evidence"] = ["new coordinator revision"]
        self.write_registry([profile])
        self.helper("process.exit(3);")
        self.run_cli(expected=1, dry_run=False)
        self.assertEqual(prior.read_bytes(), before)
        self.assertEqual(len(list(self.library.glob("*.ultra"))), 1)

    def test_stderr_output_budget_prevents_unbounded_generator_logs(self):
        self.write_registry([self.profile()])
        self.helper("process.stderr.write('x'.repeat(128*1024));")
        report = self.run_cli(expected=1, dry_run=False)
        self.assertIn("stderr byte limit", report["publication"][0]["reason"])

    def test_registry_rejects_unsafe_paths_ids_commands_and_missing_evidence(self):
        original = self.profile()
        mutations = [lambda p: p.update(id="../escape"),
                     lambda p: p["artifacts"][0].update(path="../outside.dll"),
                     lambda p: p["artifacts"][0].update(path="."),
                     lambda p: p.update(generator="sh -c 'touch unsafe'"),
                     lambda p: p.update(evidence=[]),
                     lambda p: p["stages"].pop("timing"),
                     lambda p: p.update(command=["touch", "unsafe"])]
        for mutate in mutations:
            with self.subTest(mutation=mutate):
                profile = json.loads(json.dumps(original))
                mutate(profile)
                self.write_registry([profile])
                report = self.run_cli(expected=2)
                self.assertIn("error", report)

    def test_nonregular_registry_is_rejected_without_waiting_for_a_writer(self):
        self.registry.unlink()
        os.mkfifo(self.registry)
        self.run_cli(expected=2)

    def test_artifact_symlink_is_not_accepted_even_when_target_hash_matches(self):
        target = self.artifact()
        profile = self.profile(target)
        retained = self.base / "retained.dll"
        target.rename(retained)
        target.symlink_to(retained)
        self.write_registry([profile])
        report = self.run_cli(expected=1)
        self.assertNotEqual(report["profiles"][0]["status"], "eligible")

    def test_dry_run_does_not_require_or_run_a_generator(self):
        self.write_registry([self.profile()])
        report = self.run_cli()
        self.assertEqual(report["profiles"][0]["status"], "eligible")
        self.assertFalse(self.library.exists())

    def test_publication_uses_fixed_protocol_and_immutable_noop_rerun(self):
        self.write_registry([self.profile()])
        self.helper()
        report = self.run_cli(dry_run=False)
        self.assertEqual(report["publication"][0]["status"], "published")
        files = list(self.library.glob("*.ultra"))
        self.assertEqual(len(files), 1)
        before = files[0].stat().st_mtime_ns
        self.assertEqual(json.loads(files[0].read_text()), document())
        request = json.loads((self.cli.parent / "request.json").read_text())
        self.assertEqual(request, {"device": "Electric", "profile": "live12-electric-v1",
                                  "installation": str(self.installation),
                                  "resources": str(self.installation / "Resources")})
        again = self.run_cli(dry_run=False)
        self.assertEqual(again["publication"][0]["status"], "unchanged")
        self.assertEqual(files[0].stat().st_mtime_ns, before)
        self.assertEqual((self.cli.parent / "calls").read_text(), "1")

    def test_user_authored_and_edited_generated_files_are_preserved(self):
        self.write_registry([self.profile()])
        self.helper()
        self.library.mkdir()
        authored = self.library / "Electric.ultra"
        authored.write_text("user authored")
        self.run_cli(dry_run=False)
        generated = next(p for p in self.library.glob("*.ultra") if p != authored)
        generated.write_text("user edit")
        self.run_cli(expected=1, dry_run=False)
        self.assertEqual(authored.read_text(), "user authored")
        self.assertEqual(generated.read_text(), "user edit")
        self.assertEqual(len(list(self.library.glob("*.ultra"))), 2)

    def test_new_qualification_revision_keeps_prior_published_source(self):
        profile = self.profile()
        self.write_registry([profile])
        self.helper()
        self.run_cli(dry_run=False)
        first = next(self.library.glob("*.ultra"))
        profile["evidence"] = ["new coordinator qualification record"]
        self.write_registry([profile])
        self.run_cli(dry_run=False)
        self.assertTrue(first.exists())
        self.assertEqual(len(list(self.library.glob("*.ultra"))), 2)

    def test_failed_invalid_or_oversized_generator_output_never_publishes(self):
        self.write_registry([self.profile()])
        for body in ["process.exit(7);", "process.stdout.write('{}');",
                     "process.stdout.write('x'.repeat(3*1024*1024));",
                     "process.stdout.write('{\"version\":1,\"version\":1}');"]:
            with self.subTest(body=body):
                self.helper(body)
                report = self.run_cli(expected=1, dry_run=False)
                self.assertEqual(report["publication"][0]["status"], "failed")
                self.assertEqual(list(self.library.glob("*.ultra")), [])

    def test_artifacts_changed_during_generation_prevent_publication(self):
        self.write_registry([self.profile()])
        self.helper("import fs from 'node:fs';"
                    "const request=JSON.parse(fs.readFileSync(0,'utf8'));"
                    "fs.appendFileSync(request.installation+'/Resources/Devices/Pc/Electric_64.dll','x');"
                    f"process.stdout.write({json.dumps(json.dumps(document()))});")
        report = self.run_cli(expected=1, dry_run=False)
        self.assertEqual(report["publication"][0]["status"], "failed")
        self.assertEqual(list(self.library.glob("*.ultra")), [])

    def test_destination_swapped_for_symlink_during_generation_is_not_written(self):
        self.write_registry([self.profile()])
        outside = self.base / "outside"
        outside.mkdir()
        self.helper("import fs from 'node:fs';"
                    "fs.renameSync(new URL('../library',import.meta.url),new URL('../moved',import.meta.url));"
                    "fs.symlinkSync(new URL('../outside',import.meta.url).pathname,new URL('../library',import.meta.url));"
                    f"process.stdout.write({json.dumps(json.dumps(document()))});")
        self.run_cli(expected=1, dry_run=False)
        self.assertEqual(list(outside.iterdir()), [])

    def test_generator_timeout_terminates_without_publication(self):
        self.write_registry([self.profile()])
        self.helper("setInterval(()=>{},1000);")
        report = self.run_cli("--generator-timeout", "0.1", expected=1, dry_run=False)
        self.assertIn("timed out", report["publication"][0]["reason"])
        self.assertEqual(list(self.library.glob("*.ultra")), [])

    def test_existing_destination_lock_rejects_a_concurrent_writer(self):
        self.write_registry([self.profile()])
        self.helper()
        self.library.mkdir()
        with (self.library / ".live-library.lock").open("w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            report = self.run_cli(expected=1, dry_run=False)
        self.assertTrue(report["publication"])
        self.assertEqual(list(self.library.glob("*.ultra")), [])
        self.assertFalse((self.cli.parent / "calls").exists())

    def test_output_symlink_and_installation_destinations_are_rejected(self):
        self.write_registry([self.profile()])
        self.helper()
        outside = self.base / "outside"
        outside.mkdir()
        self.library.symlink_to(outside, target_is_directory=True)
        self.run_cli(expected=1, dry_run=False)
        self.assertEqual(list(outside.iterdir()), [])
        self.library.unlink()
        self.library = self.installation / "library"
        self.run_cli(expected=1, dry_run=False)
        self.assertFalse(self.library.exists())

    def test_inventory_report_cannot_be_written_over_an_installation_file(self):
        target = self.artifact()
        before = target.read_bytes()
        self.run_cli("--report", str(target), expected=2)
        self.assertEqual(target.read_bytes(), before)

    def test_report_is_separate_atomic_json_without_a_playable_extension(self):
        self.artifact()
        destination = self.base / "reports" / "inventory.json"
        report = self.run_cli("--report", str(destination))
        self.assertEqual(json.loads(destination.read_text()), report)
        self.assertFalse(self.library.exists())

    def test_rejected_playable_report_path_is_never_overwritten(self):
        destination = self.base / "authored.ultra"
        destination.write_text("user source")
        self.run_cli("--report", str(destination), expected=2)
        self.assertEqual(destination.read_text(), "user source")


if __name__ == "__main__":
    unittest.main()
