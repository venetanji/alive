"""Finite capture gates and public projections never publish private values."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent


class CaptureContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = ROOT / 'run-runtime.py'
        if not path.is_file():
            raise AssertionError('Arithmetic capture runner is not implemented')
        spec = importlib.util.spec_from_file_location('arithmetic_capture_runner', path)
        cls.runner = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.runner)

    def close(self):
        row = dict(seq=31, request_id=25, step_id='close-times-r1', action='close',
                   action_document='times', action_revision=1, document='times',
                   revision=1, source_sha256='a' * 64, kind='step-complete',
                   closed_owner_absence_validated=True)
        accepted = {25: dict(request_id=25, step_id=row['step_id'], action='close',
                             document='times', action_revision=1, source_sha256='a' * 64)}
        return row, accepted

    def test_close_claim_requires_independent_acceptance(self):
        row, _ = self.close()
        with self.assertRaises(ValueError):
            self.runner.project_public_journal([row], {})

    def test_close_claim_is_exact_and_single_use(self):
        row, accepted = self.close()
        public = self.runner.project_public_journal([row], accepted)
        self.assertIs(public[0]['closed_owner_absence_validated'], True)
        for key, value in [('document', 'plus'), ('action_document', 'minus'),
                           ('revision', 2), ('action_revision', 2),
                           ('request_id', True), ('source_sha256', 'b' * 64),
                           ('closed_owner_absence_validated', 1)]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.runner.project_public_journal([dict(row, **{key: value})], accepted)
        with self.assertRaises(ValueError):
            self.runner.project_public_journal([row, dict(row, seq=32)], accepted)

    def test_raw_messages_never_reach_public_journal(self):
        row = dict(seq=3, request_id=2, step_id='times-A02', action='event',
                   action_document='times', action_revision=1, document='times',
                   revision=1, source_sha256='a' * 64, kind='receipt',
                   anchor='root/obj-4/obj-10', port=0,
                   message=dict(selector='float', atoms=[dict(tag='float', value=91234.125)]))
        public = self.runner.project_public_journal([row], {})
        self.assertNotIn('91234', json.dumps(public))
        self.assertNotIn('value', json.dumps(public))
        self.assertEqual(len(public[0]['message']['sha256']), 64)

    def test_public_checkpoint_keeps_counts_and_binding_only(self):
        private = dict(document='times', revision=1, request_id=2, step_id='install-times-r1',
                       source_sha256='a' * 64, numeric_states=[
                           dict(anchor='root/obj-4/obj-17', value=91234.125, semantic_tag='float')],
                       raw_sha256='b' * 64, arbitrary_private='secret')
        public = self.runner.public_checkpoint(private)
        self.assertEqual(public['numeric_state_count'], 1)
        self.assertNotIn('91234', json.dumps(public))
        self.assertNotIn('secret', json.dumps(public))
        self.assertNotIn('numeric_states', public)
        self.assertEqual(len(public['checkpoint_sha256']), 64)

    def coverage(self):
        score = json.loads((ROOT / 'score.json').read_text())
        snapshots = []
        ledger = []
        revision = {}
        request = 0
        for step in score:
            request += 1
            doc = step['document']
            if step['action'] == 'install':
                revision[doc] = step['revision']
            operation = dict(step, action_revision=revision[doc], request_id=request,
                             checkpoint_request_ids=[])
            if step['action'] != 'close':
                request += 1
                operation['checkpoint_request_ids'] = [request]
                snapshots.append(dict(document=doc, revision=revision[doc],
                                      source_sha256=step['source_sha256'],
                                      step_id=step['step_id'], action=step['action'],
                                      request_id=request, operation_request_id=operation['request_id'],
                                      action_document=doc, action_revision=revision[doc],
                                      numeric_states=[dict(anchor=str(i)) for i in range(7)]))
            ledger.append(operation)
        return score, ledger, snapshots

    def test_full_denominator_includes_six_explicit_empty_checkpoints(self):
        score, ledger, snapshots = self.coverage()
        result = self.runner.validate_coverage(score, ledger, snapshots)
        self.assertEqual(result, dict(operations=78, events=66, installs=6, closes=6,
                                     checkpoints=78, live_checkpoints=72,
                                     empty_checkpoints=6, numeric_states=504))

    def test_coverage_refuses_missing_or_duplicate_operation(self):
        score, ledger, snapshots = self.coverage()
        for changed in [ledger[:-1], ledger + [ledger[-1]]]:
            with self.subTest(length=len(changed)), self.assertRaises(ValueError):
                self.runner.validate_coverage(score, changed, snapshots)

    def test_coverage_refuses_missing_state_and_reused_readback(self):
        score, ledger, snapshots = self.coverage()
        changed = copy.deepcopy(snapshots)
        changed[17]['numeric_states'].pop()
        with self.assertRaises(ValueError):
            self.runner.validate_coverage(score, ledger, changed)
        changed = copy.deepcopy(snapshots)
        changed[-1]['request_id'] = changed[0]['request_id']
        with self.assertRaises(ValueError):
            self.runner.validate_coverage(score, ledger, changed)

    def test_coverage_refuses_readback_after_close(self):
        score, ledger, snapshots = self.coverage()
        close = next(op for op in ledger if op['action'] == 'close')
        extra = dict(snapshots[0], step_id=close['step_id'],
                     operation_request_id=close['request_id'])
        with self.assertRaises(ValueError):
            self.runner.validate_coverage(score, ledger, snapshots + [extra])

    def test_coverage_refuses_misbound_owner_or_checkpoint(self):
        score, ledger, snapshots = self.coverage()
        for key, value in [('revision', 2), ('source_sha256', 'f' * 64),
                           ('operation_request_id', 999), ('action_document', 'minus'),
                           ('step_id', 'unscored')]:
            changed = copy.deepcopy(snapshots)
            changed[0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.runner.validate_coverage(score, ledger, changed)


if __name__ == '__main__':
    unittest.main()
