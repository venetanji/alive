#!/usr/bin/env python3
"""Portable tests use original temporary data, never installed Max sources."""
import json
from pathlib import Path
import tempfile
import unittest
import verify


class OptionalOracleTests(unittest.TestCase):
    def test_absent_oracle_is_explicitly_unavailable_and_strict_default_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.assertEqual(verify.validate(root, True)['status'], 'UNAVAILABLE')
            self.assertFalse(verify.validate(root, True)['oracle_executed'])
            with self.assertRaises(AssertionError):
                verify.validate(root)

    def test_partial_oracle_is_never_skipped(self):
        for name in ['sources.json', 'summary.json', 'results', 'fixtures/boundary.score.json']:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('original portable incomplete evidence')
                with self.assertRaisesRegex(AssertionError, 'incomplete'):
                    verify.validate(root, True)

    def test_dangling_oracle_symlinks_never_count_as_absent(self):
        for name in ['bundle.json', 'sources.json', 'summary.json', 'results']:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                (root / name).symlink_to(root / 'missing')
                with self.assertRaises(AssertionError):
                    verify.validate(root, True)

    def test_present_bundle_preserves_exact_identity_checks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = root / 'original.txt'
            payload.write_text('original portable identity fixture')
            (root / 'bundle.json').write_text(json.dumps(verify.manifest(root), indent=2) + '\n')
            self.assertEqual(verify.validate(root, True)['status'], 'IDENTITY_VERIFIED')
            payload.write_text('changed bytes')
            with self.assertRaisesRegex(AssertionError, 'bytes differ'):
                verify.validate(root, True)
            payload.write_text('original portable identity fixture')
            (root / 'unexpected.txt').write_text('unlisted file')
            with self.assertRaisesRegex(AssertionError, 'bytes differ'):
                verify.validate(root, True)


if __name__ == '__main__':
    unittest.main()
