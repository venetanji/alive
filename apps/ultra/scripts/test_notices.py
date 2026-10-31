"""Offline guard: every pinned third-party package must have a notice entry."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path
import tomllib
import unittest
from unittest.mock import patch

import notices

APP = Path(__file__).resolve().parents[1]

class NoticesTests(unittest.TestCase):
    def test_inventory_covers_complete_lockfile(self):
        lock = tomllib.loads((APP/'src-tauri/Cargo.lock').read_text())
        expected = {(p['name'], p['version']) for p in lock['package'] if p['name'] != 'ultra'}
        inventory = json.loads((APP/'THIRD-PARTY-CRATES.json').read_text())
        actual = {(p['name'], p['version']) for p in inventory['packages']}
        self.assertEqual(expected, actual)
        self.assertEqual(len(actual), len(inventory['packages']), 'Duplicate notices')

    def test_inventory_preserves_lock_checksums_and_local_fork(self):
        lock = tomllib.loads((APP/'src-tauri/Cargo.lock').read_text())
        expected = {(p['name'], p['version']): p.get('checksum') for p in lock['package'] if p['name'] != 'ultra'}
        packages = json.loads((APP/'THIRD-PARTY-CRATES.json').read_text())['packages']
        for p in packages:
            self.assertEqual(p['checksum'], expected[p['name'], p['version']])
            self.assertTrue(p['license'] or p['license_file'])
        local = next(p for p in packages if p['name'] == 'tauri-plugin-single-instance')
        self.assertEqual(local['crate_source'], 'src-tauri/vendor/tauri-plugin-single-instance')
        self.assertIsNone(local['checksum'])

    def test_metadata_uses_utf8_under_windows_legacy_locale(self):
        # Exercise Popen's actual text decoding with a UTF-8 byte undefined in cp1252.
        payload = {'packages': [], 'upstream': '\u0141'}
        raw = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        real_check_output = subprocess.check_output

        def cargo_output(*args, **kwargs):
            return real_check_output([
                sys.executable, '-c',
                'import sys; sys.stdout.buffer.write(' + repr(raw) + ')'], **kwargs)

        with tempfile.TemporaryDirectory() as d:
            app = Path(d)
            output = app/'THIRD-PARTY-CRATES.json'
            output.write_text(json.dumps(payload), encoding='utf-8')
            with patch.object(subprocess, '_text_encoding', return_value='cp1252'), patch.object(notices.subprocess, 'check_output', side_effect=cargo_output), patch.object(notices, 'inventory', side_effect=lambda metadata, *args: metadata):
                self.assertEqual(notices.validate(app), payload)
                with patch.object(notices, 'APP', app), patch.object(notices, 'INVENTORY', output), patch.object(sys, 'argv', ['notices.py', '--write']):
                    notices.main()
                self.assertEqual(json.loads(output.read_text(encoding='utf-8')), payload)

    def test_release_validation_rejects_stale_inventory(self):
        with patch.object(notices.subprocess, 'check_output', return_value='{}'), patch.object(notices, 'inventory', return_value={'packages': []}):
            with self.assertRaisesRegex(ValueError, 'stale'):
                notices.validate()

if __name__ == '__main__':
    unittest.main()
