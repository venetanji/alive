"""Offline guard: every pinned third-party package must have a notice entry."""
import json
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

    def test_release_validation_rejects_stale_inventory(self):
        with patch.object(notices.subprocess, 'check_output', return_value='{}'), patch.object(notices, 'inventory', return_value={'packages': []}):
            with self.assertRaisesRegex(ValueError, 'stale'):
                notices.validate()

if __name__ == '__main__':
    unittest.main()
