import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('release', Path(__file__).with_name('release.py'))
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)

class ReleaseTests(unittest.TestCase):
    def test_version_guard(self):
        for v in ('0.1.0', '1.2.3-rc.1'):
            self.assertEqual(release.validate_version(v, v, 'v' + v), v)
        for tag in ('v0.2.0', '0.1.0', 'v0.1.0/other', 'v0.1.0;echo bad'):
            with self.assertRaises(ValueError):
                release.validate_version('0.1.0', '0.1.0', tag)
        with self.assertRaises(ValueError):
            release.validate_version('0.1.0', '0.2.0', None)
    def test_platforms(self):
        self.assertEqual(set(release.TARGETS), {'x86_64-unknown-linux-gnu', 'x86_64-pc-windows-msvc', 'aarch64-apple-darwin', 'x86_64-apple-darwin'})
    def test_bundle_paths(self):
        linux = release.bundle_config('x86_64-unknown-linux-gnu')
        self.assertTrue(linux['bundle']['active'])
        self.assertEqual(linux['bundle']['resources']['../build/libultra_native.so'], 'libultra_native.so')
        mac = release.bundle_config('aarch64-apple-darwin')
        self.assertIn('../build/libultra_native.dylib', mac['bundle']['macOS']['frameworks'])
        win = release.bundle_config('x86_64-pc-windows-msvc', ['msvcp140.dll'])
        self.assertEqual(win['bundle']['resources']['../build/msvcp140.dll'], 'msvcp140.dll')
        with self.assertRaises(ValueError):
            release.bundle_config('x86_64-pc-windows-msvc', ['../escape.dll'])
        self.assertEqual(win['bundle']['resources']['../build/ultra_native.dll'], 'ultra_native.dll')
    def test_faust_notice_bundled_on_every_target(self):
        for target in release.TARGETS:
            with self.subTest(target=target):
                resources = release.bundle_config(target)['bundle']['resources']
                self.assertEqual(resources.get('../core/VOICE.txt'), 'licenses/Faust-VOICE.txt')

    def test_packaged_faust_notice_must_match_source_bytes(self):
        with tempfile.TemporaryDirectory() as d:
            package = Path(d)
            for name in ('THIRD-PARTY.txt', 'THIRD-PARTY-CRATES.json'):
                (package/name).write_bytes((release.APP/name).read_bytes())
            with self.assertRaisesRegex(ValueError, 'Faust-VOICE.txt'):
                release.verify_notice_resources(package)
            voice = package/'Faust-VOICE.txt'
            voice.write_bytes((release.APP/'core/VOICE.txt').read_bytes())
            release.verify_notice_resources(package)
            voice.write_bytes(voice.read_bytes() + b'altered')
            with self.assertRaisesRegex(ValueError, 'Faust-VOICE.txt'):
                release.verify_notice_resources(package)
            voice.rename(package/'VOICE.txt')
            with self.assertRaisesRegex(ValueError, 'Faust-VOICE.txt'):
                release.verify_notice_resources(package)

    def test_loader_matches_product_directory(self):
        root = Path(__file__).resolve().parents[1]
        name = json.loads((root/'src-tauri/tauri.conf.json').read_text())['productName']
        self.assertIn('$ORIGIN/../lib/' + name, (root/'src-tauri/build.rs').read_text())
    def test_release_does_not_grant_pr_writes(self):
        root = Path(__file__).resolve().parents[3]
        workflow = (root/'.github/workflows/ultra-desktop.yml').read_text()
        self.assertNotIn('pull_request_target', workflow)
        self.assertNotIn('release: published', workflow)
        self.assertIn('needs: packages', workflow)
        self.assertIn('persist-credentials: false', workflow)
        self.assertEqual(workflow.count('contents: write'), 1)
        self.assertIn("if: github.event_name == 'push' && runner.os == 'macOS'", workflow)
    def test_packaged_notices_must_match_sources(self):
        with tempfile.TemporaryDirectory() as d:
            package = Path(d)
            with self.assertRaises(ValueError):
                release.verify_notice_resources(package)
            for name in ('THIRD-PARTY.txt', 'THIRD-PARTY-CRATES.json'):
                (package/name).write_bytes((release.APP/name).read_bytes())
            (package/'Faust-VOICE.txt').write_bytes((release.APP/'core/VOICE.txt').read_bytes())
            release.verify_notice_resources(package)
            (package/'THIRD-PARTY-CRATES.json').write_text('{}')
            with self.assertRaises(ValueError):
                release.verify_notice_resources(package)

    def test_artifact_validation(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            with self.assertRaises(ValueError):
                release.collect_artifacts(p, p/'out', 'x86_64-unknown-linux-gnu', '0.1.0')
            (p/'deb').mkdir(); (p/'appimage').mkdir()
            (p/'deb'/'a.deb').write_bytes(b'deb')
            (p/'appimage'/'a.AppImage').write_bytes(b'appimage')
            output = release.collect_artifacts(p, p/'out', 'x86_64-unknown-linux-gnu', '0.1.0')
            self.assertEqual(len(output), 2)
            self.assertTrue(all('x86_64-unknown-linux-gnu' in x.name for x in output))
            self.assertTrue((p/'out'/'SHA256SUMS-x86_64-unknown-linux-gnu.txt').exists())

if __name__ == '__main__': unittest.main()
