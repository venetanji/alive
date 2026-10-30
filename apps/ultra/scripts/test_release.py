import importlib.util
import io
import json
import mmap
import os
import shutil
import subprocess
import tarfile
from pathlib import Path
import tempfile
import tomllib
import unittest
from unittest import mock

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

    def test_bundled_alive_example_resolves_its_external_device(self):
        for target in release.TARGETS:
            with self.subTest(target=target), tempfile.TemporaryDirectory() as d:
                package = Path(d).resolve()
                resources = release.bundle_config(target)['bundle']['resources']
                for source, destination in resources.items():
                    if destination.startswith('alive-session/'):
                        dest = package / destination
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(release.APP / 'src-tauri' / source, dest)
                session_path = package / 'alive-session/alive/examples/two-instruments.alive'
                session = json.loads(session_path.read_text())
                self.assertEqual(len(session['tracks']), 2)
                for track in session['tracks']:
                    device_path = (session_path.parent / track['device']['path']).resolve(strict=True)
                    self.assertTrue(device_path.is_relative_to(package))
                    device = json.loads(device_path.read_text())['device']
                    self.assertEqual((device['id'], device['version']),
                                     (track['device']['id'], track['device']['version']))

    def test_default_workspace_is_bundled_for_both_products_on_every_target(self):
        for target in release.TARGETS:
            for product in ('alive', 'ultra'):
                with self.subTest(target=target, product=product), tempfile.TemporaryDirectory() as d:
                    package = Path(d).resolve()
                    resources = release.bundle_config(target, product=product)['bundle']['resources']
                    for source, destination in resources.items():
                        if destination.startswith('alive-session/'):
                            dest = package / destination
                            dest.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(release.APP / 'src-tauri' / source, dest)
                    path = package / 'alive-session/alive/examples/empty-workspaces.alive'
                    self.assertTrue(path.is_file(), 'The default project must work outside the source checkout')
                    project = json.loads(path.read_text())
                    self.assertEqual(project['format'], 'alive-session-v4')
                    self.assertEqual(project['sources'], [])
                    self.assertEqual(project['placements'], [])
                    instrument = project['tracks'][0]['chain']['instrument']
                    device_path = (path.parent / instrument['path']).resolve(strict=True)
                    self.assertTrue(device_path.is_relative_to(package))
                    self.assertEqual(json.loads(device_path.read_text())['device']['id'], instrument['id'])

    def test_alive_package_reuses_source_devices_and_notices(self):
        for target in release.TARGETS:
            with self.subTest(target=target), tempfile.TemporaryDirectory() as d:
                package = Path(d).resolve()
                resources = release.bundle_config(target, product='alive')['bundle']['resources']
                for source, destination in resources.items():
                    source = release.ROOT/'apps/alive/src-tauri'/source
                    if destination.startswith(('alive-session/', 'licenses/')):
                        dest = package/destination
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(source, dest)
                release.verify_notice_resources(package)
                session_path = package/'alive-session/alive/examples/two-instruments.alive'
                session = json.loads(session_path.read_text())
                for track in session['tracks']:
                    device_path = (session_path.parent/track['device']['path']).resolve(strict=True)
                    self.assertTrue(device_path.is_relative_to(package))
                    self.assertEqual(device_path.read_bytes(),
                                     (release.APP/'examples/subtractive.ultra').read_bytes())

    def test_shared_notice_inventory_covers_alive_dependencies(self):
        def external_packages(product):
            lock = tomllib.loads((release.ROOT/'apps'/product/'src-tauri/Cargo.lock').read_text())
            return [p for p in lock['package'] if p['name'] not in ('ultra', 'alive')]
        self.assertEqual(external_packages('alive'), external_packages('ultra'))

    def test_separate_artifacts_keep_both_apps_when_collected_together(self):
        with tempfile.TemporaryDirectory() as d:
            package = Path(d)/'bundle'
            (package/'deb').mkdir(parents=True)
            (package/'appimage').mkdir()
            (package/'deb/app.deb').write_bytes(b'deb')
            (package/'appimage/app.AppImage').write_bytes(b'appimage')
            output = Path(d)/'out'
            release.collect_artifacts(package, output, 'x86_64-unknown-linux-gnu', '0.1.0')
            release.collect_artifacts(package, output, 'x86_64-unknown-linux-gnu', '0.1.0', product='alive')
            self.assertEqual({p.name for p in output.iterdir()}, {
                'Ultra-0.1.0-x86_64-unknown-linux-gnu.deb',
                'Ultra-0.1.0-x86_64-unknown-linux-gnu.AppImage',
                'Alive-0.1.0-x86_64-unknown-linux-gnu.deb',
                'Alive-0.1.0-x86_64-unknown-linux-gnu.AppImage',
                'SHA256SUMS-ultra-x86_64-unknown-linux-gnu.txt',
                'SHA256SUMS-alive-x86_64-unknown-linux-gnu.txt',
            })

    def test_release_stages_current_libraries_before_cargo_tests(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            app = root/'apps/ultra'
            built = app/'build/libultra_native.so'
            built.parent.mkdir(parents=True)
            built.write_bytes(b'current native ABI')
            installed = [root/'apps'/product/'src-tauri/target/x86_64-unknown-linux-gnu/release/libultra_native.so'
                         for product in ('ultra', 'alive')]
            for path in installed:
                path.parent.mkdir(parents=True)
                path.write_bytes(b'stale native ABI')
            cargo_tests = []
            def run(*args, **kwargs):
                if args[:2] == ('cargo', 'test'):
                    for path in installed:
                        self.assertEqual(path.read_bytes(), built.read_bytes())
                    cargo_tests.append(args)
            with mock.patch.multiple(release, ROOT=root, APP=app, run=run,
                                     version=mock.Mock(return_value='0.1.0'),
                                     prepare_dependencies=mock.Mock(), validate_notices=mock.Mock(),
                                     verify_packages=mock.Mock(),
                                     bundle_config=mock.Mock(return_value={'bundle': {'resources': {}}})), \
                 mock.patch('sys.argv', ['release.py', 'build', '--target', 'x86_64-unknown-linux-gnu', '--product', 'alive']), \
                 mock.patch.object(release.platform, 'system', return_value='Linux'), \
                 mock.patch.object(release.platform, 'machine', return_value='x86_64'):
                release.main()
            self.assertEqual(len(cargo_tests), 2)

    @unittest.skipUnless(os.name == 'posix', 'Unix allows replacement of a mapped shared library')
    def test_native_replacement_preserves_a_running_apps_mapping(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            source, installed = root/'new.so', root/'installed.so'
            source.write_bytes(b'new native library')
            installed.write_bytes(b'old native library')
            with installed.open('rb') as active, mmap.mmap(active.fileno(), 0, access=mmap.ACCESS_READ) as mapping:
                release.install_native_library(source, installed)
                self.assertEqual(mapping[:], b'old native library')
            self.assertEqual(installed.read_bytes(), b'new native library')

    def test_deb_extracts_real_payload_without_installing_it(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            data = io.BytesIO()
            contents = b'packaged app\r\n\x00\x1a\xff\n'
            with tarfile.open(fileobj=data, mode='w:gz') as payload:
                entry = tarfile.TarInfo('usr/bin/alive')
                entry.size = len(contents)
                payload.addfile(entry, io.BytesIO(contents))
            package = root/'alive.deb'
            # DEB uses SysV ar, independently of the build machine's ar dialect.
            with package.open('wb') as archive:
                archive.write(b'!<arch>\n')
                for name, body in [('debian-binary', b'2.0\n'), ('control.tar.gz', b''), ('data.tar.gz', data.getvalue())]:
                    header = f'{name + "/":<16}{0:<12}{0:<6}{0:<6}{"100644":<8}{len(body):<10}`\n'
                    archive.write(header.encode('ascii'))
                    archive.write(body)
                    if len(body) % 2:
                        archive.write(b'\n')
            with mock.patch.dict(os.environ, {'PATH': ''}):
                release.extract_deb(package, root/'staged')
            self.assertEqual((root/'staged/usr/bin/alive').read_bytes(), contents)

    def test_deb_rejects_malformed_and_duplicate_data_before_extraction(self):
        member = f'{"data.tar.gz/":<16}{0:<12}{0:<6}{0:<6}{"100644":<8}{2:<10}`\n'.encode() + b'xx'
        self.assertEqual(len(member), 62)
        cases = [b'not an archive', b'!<arch>\nshort header', b'!<arch>\n' + member[:-1],
                 b'!<arch>\n' + member + member, b'!<arch>\n']
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            for index, contents in enumerate(cases):
                with self.subTest(case=index):
                    package = root/'invalid.deb'
                    package.write_bytes(contents)
                    destination = root/'unmodified'
                    with self.assertRaises(ValueError):
                        release.extract_deb(package, destination)
                    self.assertFalse(destination.exists())

    def test_linux_loader_accepts_package_resources_and_appimage_relocation(self):
        with tempfile.TemporaryDirectory() as d:
            package = Path(d).resolve()
            for relative in ['usr/lib/Alive/libultra_native.so', 'usr/lib/libultra_native.so']:
                native = package/relative
                native.parent.mkdir(parents=True, exist_ok=True)
                native.write_bytes(b'native library')
                loaded = f'libultra_native.so => {native} (0x000000001000)\n'
                self.assertEqual(release.linux_native_path(loaded, package, 'alive', 'libultra_native.so'), native)
            for loaded in ['libultra_native.so => /usr/lib/libultra_native.so (0x000000001000)\n',
                           'libultra_native.so => not found\n']:
                with self.assertRaisesRegex(ValueError, 'own native library'):
                    release.linux_native_path(loaded, package, 'alive', 'libultra_native.so')

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
            self.assertTrue((p/'out'/'SHA256SUMS-ultra-x86_64-unknown-linux-gnu.txt').exists())

if __name__ == '__main__': unittest.main()
