#!/usr/bin/env python3
"""Exercise file paths through the real launcher and user desktop installer."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
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
        tools = self.root / 'tools'
        tools.mkdir()
        for name in ('ldd', 'update-desktop-database', 'update-mime-database'):
            tool = tools / name
            tool.write_text('#!/bin/sh\nexit 0\n')
            tool.chmod(0o755)
        self.log = self.root / 'arguments.json'
        self.env = {**os.environ, 'PATH': str(tools) + ':' + os.environ['PATH'], 'XDG_DATA_HOME': str(self.root / 'data'), 'ULTRA_ARGUMENT_LOG': str(self.log)}

    def test_relative_paths_with_spaces_and_shell_characters_reach_native_app(self):
        filename = 'notes $(touch do-not-create) `echo ignored`.ultra'
        patch = self.root / filename
        patch.write_text('{}')
        subprocess.run(['bash', str(self.app / 'run.sh'), filename], cwd=self.root, env=self.env, check=True, capture_output=True)
        self.assertEqual(json.loads(self.log.read_text()), [str(patch)])
        self.assertFalse((self.root / 'do-not-create').exists())

    def test_installer_advertises_file_opening_and_original_extensions(self):
        subprocess.run(['python3', str(self.app / 'install-launcher.py')], env=self.env, check=True, capture_output=True)
        applications = self.root / 'data/applications'
        desktop = (applications / 'org.alive.ultra.research.desktop').read_text()
        self.assertIn('%F', next(line for line in desktop.splitlines() if line.startswith('Exec=')))
        mime_types = next(line for line in desktop.splitlines() if line.startswith('MimeType=')).split('=', 1)[1].split(';')
        self.assertIn('application/x-ultra-patch', mime_types)
        package = self.root / 'data/mime/packages/org.alive.ultra.research.xml'
        tree = ET.parse(package)
        extensions = {element.attrib['pattern'] for element in tree.iter() if element.tag.endswith('glob')}
        self.assertTrue({'*.ultra', '*.maxpat', '*.maxhelp'}.issubset(extensions))
        subprocess.run(['python3', str(self.app / 'install-launcher.py')], env=self.env, check=True, capture_output=True)
        self.assertEqual(len(list(applications.glob('*.desktop'))), 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)
