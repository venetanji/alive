"""Public close claims require independently accepted private evidence."""
import copy
import importlib.util
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
SPEC = importlib.util.spec_from_file_location('numeric_runtime_runner', ROOT / 'run-runtime.py')
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class PublicJournalTests(unittest.TestCase):
    def setUp(self):
        self.row = dict(seq=223, request_id=125, step_id='close-float', action='close',
                        action_document='float', action_revision=1, document='float', revision=1,
                        source_sha256='b' * 64, kind='step-complete', closed_owner_absence_validated=True)
        self.accepted = {125: dict(request_id=125, step_id='close-float', action='close',
                                  document='float', action_revision=1, source_sha256='b' * 64)}

    def test_controller_true_is_not_published_after_independent_refusal(self):
        with self.assertRaises(ValueError):
            runner.project_public_journal([self.row], {})

    def test_accepted_close_keeps_existing_public_shape(self):
        self.assertEqual(runner.project_public_journal([self.row], self.accepted),
                         [runner.n.public_receipt(self.row)])

    def test_accepted_request_cannot_authorize_another_owner_or_claim(self):
        for key, value in [('document', 'int'), ('action_document', 'int'), ('revision', 2),
                           ('action_revision', 2), ('source_sha256', 'a' * 64),
                           ('step_id', 'close-int'), ('kind', 'receipt'),
                           ('closed_owner_absence_validated', 1), ('request_id', 124)]:
            row = dict(self.row, **{key: value})
            with self.subTest(key=key), self.assertRaises(ValueError):
                runner.project_public_journal([row], self.accepted)

    def test_close_completion_without_a_positive_claim_refuses(self):
        row = copy.deepcopy(self.row)
        del row['closed_owner_absence_validated']
        with self.assertRaises(ValueError):
            runner.project_public_journal([row], self.accepted)

    def test_duplicate_positive_close_is_not_projected(self):
        with self.assertRaises(ValueError):
            runner.project_public_journal([self.row, dict(self.row, seq=224)], self.accepted)

    def test_failed_close_diagnostics_and_prior_events_remain_projectable(self):
        row = dict(self.row, kind='harness-error', error='private refusal')
        del row['closed_owner_absence_validated']
        self.assertEqual(runner.project_public_journal([row], {}), [runner.n.public_receipt(row)])


if __name__ == '__main__':
    unittest.main()
