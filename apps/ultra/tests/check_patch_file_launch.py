#!/usr/bin/env python3
"""Exercise file paths through the real launcher and user desktop installer."""
import json
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import unittest
import xml.etree.ElementTree as ET

SOURCE = Path(__file__).resolve().parents[1]


class PatchFileLaunch(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='ultra-file-launch-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.app = self.root / 'checkout with spaces/apps/ultra'
        self.app.mkdir(parents=True)
        for filename in ('run.sh', 'install-launcher.py'):
            shutil.copy2(SOURCE / filename, self.app / filename)
        binary = self.app / 'src-tauri/target/release/ultra'
        binary.parent.mkdir(parents=True)
        binary.write_text('#!/usr/bin/env python3\nimport json,os,sys\nopen(os.environ["ULTRA_ARGUMENT_LOG"],"w").write(json.dumps(sys.argv[1:]))\n')
        binary.chmod(0o755)
        self.build = binary.parent
        shutil.copy2(binary, self.build / 'alive')
        (self.build / 'libultra_native.so').write_bytes(b'native library one')
        for name, product in (('alive', 'Alive'), ('ultra', 'Ultra Research')):
            tauri = self.app.parent / name / 'src-tauri'
            tauri.mkdir(parents=True, exist_ok=True)
            (tauri / 'tauri.conf.json').write_text(json.dumps({
                'productName': product,
                'bundle': {'resources': {'../examples/example': 'alive-session/example'}},
            }))
            example = tauri.parent / 'examples/example'
            example.parent.mkdir(exist_ok=True)
            example.write_text(name + ' resource')
        icon = self.app / 'src-tauri/icons/icon.png'
        icon.parent.mkdir()
        icon.write_bytes(b'test icon')
        tools = self.root / 'tools'
        tools.mkdir()
        for name in ('ldd', 'update-desktop-database', 'update-mime-database'):
            tool = tools / name
            tool.write_text('#!/bin/sh\nexit 0\n')
            tool.chmod(0o755)
        self.log = self.root / 'arguments.json'
        self.data = self.root / 'data with spaces $ ` % "'
        self.env = {**os.environ, 'PATH': str(tools) + ':' + os.environ['PATH'], 'XDG_DATA_HOME': str(self.data), 'ULTRA_ARGUMENT_LOG': str(self.log)}

    def install(self, *arguments, check=True):
        return subprocess.run(['python3', str(self.app / 'install-launcher.py'), *map(str, arguments)],
                              env=self.env, check=check, capture_output=True, text=True)

    def selection(self):
        return (self.data / 'alive/current-test').resolve(strict=True)

    def test_relative_paths_with_spaces_and_shell_characters_reach_native_app(self):
        filename = 'notes $(touch do-not-create) `echo ignored`.ultra'
        patch = self.root / filename
        patch.write_text('{}')
        subprocess.run(['bash', str(self.app / 'run.sh'), filename], cwd=self.root, env=self.env, check=True, capture_output=True)
        self.assertEqual(json.loads(self.log.read_text()), [str(patch)])
        self.assertFalse((self.root / 'do-not-create').exists())

    def test_installer_advertises_file_opening_and_original_extensions(self):
        self.install()
        applications = self.data / 'applications'
        desktop = (applications / 'org.alive.ultra.research.desktop').read_text()
        self.assertIn('%F', next(line for line in desktop.splitlines() if line.startswith('Exec=')))
        mime_types = next(line for line in desktop.splitlines() if line.startswith('MimeType=')).split('=', 1)[1].split(';')
        self.assertIn('application/x-ultra-patch', mime_types)
        package = self.data / 'mime/packages/org.alive.ultra.research.xml'
        tree = ET.parse(package)
        extensions = {element.attrib['pattern'] for element in tree.iter() if element.tag.endswith('glob')}
        self.assertTrue({'*.ultra', '*.maxpat', '*.maxhelp'}.issubset(extensions))
        self.install()
        self.assertEqual(len(list(applications.glob('*.desktop'))), 2)

    def test_pair_is_self_contained_and_records_exact_artifacts(self):
        debug = self.build.with_name('debug')
        shutil.copytree(self.build, debug)
        self.install('--build-dir', debug)
        snapshot = self.selection()
        manifest = json.loads((snapshot / 'source-build-manifest.json').read_text())
        self.assertEqual(manifest['build_directory'], str(debug))
        for name in ('alive', 'ultra', 'libultra_native.so'):
            original = (debug / name).read_bytes()
            self.assertEqual((snapshot / 'bin' / name).read_bytes(), original)
            self.assertEqual(manifest['artifacts'][f'bin/{name}']['sha256'], hashlib.sha256(original).hexdigest())
        for name, product in (('alive', 'Alive'), ('ultra', 'Ultra Research')):
            self.assertEqual((snapshot / 'lib' / product / 'alive-session/example').read_text(), name + ' resource')
        shutil.rmtree(debug)
        self.assertTrue(os.access(snapshot / 'bin/alive', os.X_OK))
        self.assertTrue(os.access(snapshot / 'bin/ultra', os.X_OK))

    def test_switches_complete_pair_and_rejects_incomplete_build(self):
        applications = self.data / 'applications'
        applications.mkdir(parents=True)
        old_desktop = applications / 'org.alive.session.test.desktop'
        old_desktop.write_text('previous launcher\n')
        self.install()
        first = self.selection()
        self.assertEqual(next(applications.glob('org.alive.session.test.desktop.bak.*')).read_text(), 'previous launcher\n')
        original = (first / 'bin/alive').read_bytes()
        for name in ('alive', 'ultra'):
            with (self.build / name).open('a') as file:
                file.write('# next build\n')
        self.install()
        second = self.selection()
        self.assertNotEqual(first, second)
        self.assertEqual((first / 'bin/alive').read_bytes(), original)
        self.assertEqual((second / 'bin/ultra').read_bytes(), (self.build / 'ultra').read_bytes())
        desktops = {path: path.read_bytes() for path in applications.glob('*.desktop')}
        for missing in (self.build / 'libultra_native.so', self.app / 'examples/example'):
            contents = missing.read_bytes()
            missing.unlink()
            result = self.install(check=False)
            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertEqual(self.selection(), second)
            self.assertEqual({path: path.read_bytes() for path in desktops}, desktops)
            missing.write_bytes(contents)

    def test_failed_desktop_refresh_preserves_previous_launchers(self):
        applications = self.data / 'applications'
        applications.mkdir(parents=True)
        desktop = applications / 'org.alive.session.test.desktop'
        desktop.write_text('previous launcher\n')
        updater = self.root / 'tools/update-desktop-database'
        updater.write_text('#!/bin/sh\nexit 42\n')
        result = self.install(check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(desktop.read_text(), 'previous launcher\n')
        self.assertFalse((applications / 'org.alive.ultra.research.desktop').exists())
        self.assertFalse((self.data / 'alive/current-test').exists())

    @unittest.skipUnless(shutil.which('gio'), 'gio is needed to exercise actual desktop Exec parsing')
    def test_both_desktop_entries_launch_selected_copy_with_literal_file_argument(self):
        self.install()
        shutil.rmtree(self.build)
        patch = self.root / 'notes $(touch do-not-create) `echo ignored` %f "quoted".ultra'
        patch.write_text('{}')
        for desktop in ('org.alive.session.test.desktop', 'org.alive.ultra.research.desktop'):
            with self.subTest(desktop=desktop):
                self.log.unlink(missing_ok=True)
                files = [str(patch)]
                if desktop == 'org.alive.ultra.research.desktop':
                    second = self.root / 'second patch.maxpat'
                    second.write_text('{}')
                    files.append(str(second))
                subprocess.run(['gio', 'launch', str(self.data / 'applications' / desktop), *files],
                               cwd=self.root, env=self.env, check=True, capture_output=True)
                deadline = time.monotonic() + 5
                while not self.log.exists() and time.monotonic() < deadline:
                    time.sleep(0.02)
                self.assertEqual(json.loads(self.log.read_text()), files)
                self.assertFalse((self.root / 'do-not-create').exists())


if __name__ == '__main__':
    unittest.main(verbosity=2)
