#!/usr/bin/env python3
"""Original comparison cases: distinguish missing, wrong, and unknown typing."""
import importlib.util
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class ComparisonContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = Path(__file__).with_name('compare.py')
        spec = importlib.util.spec_from_file_location('help_compare', path)
        cls.compare = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.compare)

    def test_unknown_list_number_does_not_become_measured_scalar_identity(self):
        reference = dict(selector='list', atoms=[dict(tag='unknown-number', value=7)])
        native = dict(selector='list', atoms=[dict(tag='int', value=7)])
        self.assertEqual(self.compare.compare_message(reference, native), dict(match=True, unknown_numeric_tags=1))
        self.assertFalse(self.compare.compare_message(reference, dict(selector='int', atoms=native['atoms']))['match'])
        known = dict(selector='float', atoms=[dict(tag='float', value=7)])
        self.assertFalse(self.compare.compare_message(known, dict(selector='float', atoms=native['atoms']))['match'])

    def test_per_anchor_comparison_rejects_missing_and_additional_outputs(self):
        message = dict(selector='bang', atoms=[])
        native = [dict(document='original', anchor='root/a', phase='output', port=0, message=message),
                  dict(document='original', anchor='root/b', phase='input', port=1, message=message)]
        reference = [dict(document='original', anchor='root/a', kind='receipt', port=0, message=message)]
        self.assertTrue(self.compare.compare_outputs(reference, native)['match'])
        self.assertFalse(self.compare.compare_outputs([], native)['match'])
        self.assertFalse(self.compare.compare_outputs(reference * 2, native)['match'])

    def test_empty_message_state_ignores_internal_placeholder_prototype(self):
        reference = dict(anchor='root/a', live_content=dict(empty=True, message=None), status='observed-private-serialization')
        native = dict(anchor='root/a', message_box=dict(empty=True, prototype=dict(selector='bang', atoms=[])))
        self.assertTrue(self.compare.compare_state(reference, native)['match'])
        self.assertFalse(self.compare.compare_state({**reference, 'status': 'unavailable'}, native)['match'])
        self.assertFalse(self.compare.compare_state(reference, {**native, 'message_box': {**native['message_box'], 'empty': False}})['match'])

    def evidence_fixture(self):
        message = dict(selector='bang', atoms=[])
        step = dict(step_id='click', document='original', anchor='root/a', inlet=0,
                    interaction='saved-control-bang', message=message, source_sha256='identity')
        node = dict(anchor='root/b', message_box=dict(empty=True))
        state = dict(document='original', nodes=[node])
        native = dict(action_count=1, source_identities=dict(original='identity'), rows=[
            dict(step_id='install-original', snapshots=[state]),
            dict(step_id='click', snapshots=[state], trace=[dict(phase='input', document='original',
                 anchor='root/a', port=0, message=message)])])
        receipts = [dict(kind='stimulus', **{k: step[k] for k in ('step_id', 'document', 'anchor', 'interaction', 'message')}),
                    dict(kind='step-complete', step_id='click')]
        snapshots = [dict(step_id=label, document='original', states=[dict(anchor='root/b')])
                     for label in ('initial', 'click')]
        return [step], native, receipts, snapshots

    def test_empty_or_duplicate_checkpoint_sets_cannot_pass(self):
        score, native, receipts, snapshots = self.evidence_fixture()
        self.compare.validate_coverage(score, native, receipts, snapshots)
        for invalid in ([], snapshots[:1], snapshots + snapshots[:1],
                        [{**snapshots[0], 'states': []}, snapshots[1]]):
            with self.assertRaisesRegex(ValueError, 'coverage'):
                self.compare.validate_coverage(score, native, receipts, invalid)

    def test_recorded_stimulus_and_native_input_must_match_declared_score(self):
        score, native, receipts, snapshots = self.evidence_fixture()
        changed = {**receipts[0], 'anchor': 'root/different'}
        with self.assertRaisesRegex(ValueError, 'stimulus'):
            self.compare.validate_coverage(score, native, [changed, receipts[1]], snapshots)
        native['rows'][1]['trace'][0]['message'] = dict(selector='int', atoms=[dict(tag='int', value=7)])
        with self.assertRaisesRegex(ValueError, 'stimulus'):
            self.compare.validate_coverage(score, native, receipts, snapshots)

    def cleanup_fixture(self):
        return dict(preferences_unchanged=True, owned_capture_after=[], prefix_processes_after=[],
                       marker_processes_after=[], display_only_attribution=False, prefix_removed=True,
                       xvfb_exited=True, source_preservation=[dict(document='original', installed_unchanged=True, pristine_unchanged=True)],
                       helper_preservation=[dict(name=str(i), sha256='original', installed_unchanged=True) for i in range(4)])

    def test_capture_requires_marker_cleanup_and_protected_helpers(self):
        cleanup = self.cleanup_fixture()
        self.compare.validate_cleanup(cleanup, ['original'])
        self.compare.validate_cleanup(cleanup, dict(original='identity'))
        for documents in (dict(different='identity'), dict(original='identity', extra='identity')):
            with self.assertRaisesRegex(ValueError, 'cleanup'):
                self.compare.validate_cleanup(cleanup, documents)
        for invalid in ({**cleanup, 'marker_processes_after': [dict(pid=7)]},
                        {**cleanup, 'display_only_attribution': True},
                        {**cleanup, 'helper_preservation': []},
                        {**cleanup, 'source_preservation': []}):
            with self.assertRaisesRegex(ValueError, 'cleanup'):
                self.compare.validate_cleanup(invalid, ['original'])

    def readback_fixture(self, method='v8-boxtext'):
        score, native, receipts, checkpoints = self.evidence_fixture()
        identity = 'a' * 64
        score[0].update(source_sha256=identity, row='synthetic')
        native.update(source_identities=dict(original=identity), all_runtime_gates_pass=True,
                      authoring_retained=True)
        output = dict(selector='float', atoms=[dict(tag='float', value=7.0)])
        native['rows'][1]['trace'].append(dict(phase='output', document='original', anchor='root/a', port=0, message=output))
        native['rows'][1]['snapshots'] = copy.deepcopy(native['rows'][1]['snapshots'])
        native['rows'][1]['snapshots'][0]['nodes'][0]['message_box'] = dict(empty=False, prototype=output)
        receipts.append(dict(kind='receipt', step_id='click', document='original', anchor='root/a', port=0, message=output))
        session = dict(status='COMPLETE', complete=True, cold_message_readback_validated=True,
                       readback_method=method, documents=[dict(document='original', source_sha256=identity)])
        for checkpoint in checkpoints:
            checkpoint['states'] = [dict(document='original', anchor='root/b', authored_empty=True,
                status='observed-private-v8-boxtext' if method == 'v8-boxtext' else 'observed-private-serialization',
                live_content=dict(empty=True, message=None),
                text_sha256=hashlib.sha256(b'').hexdigest(), text_characters=0,
                rendering='not observed; ' + method + ' Message content only')]
        checkpoints[1]['states'][0].update(live_content=dict(empty=False, message=output),
            text_sha256=hashlib.sha256(b'7.').hexdigest(), text_characters=2)
        if method == 'v8-boxtext':
            session.update(initial_message_readback_validated=True, runtime_endpoint_readback_validated=True,
                saved_order_observed=False, capabilities=[dict(document='original', resolved_basic_boxes=2,
                source_basic_cables=1, observer_leaf_cables=2)], readback_requests=[])
            for request_id, checkpoint in zip((1, 3), checkpoints):
                request = dict(request_id=request_id, step_id=checkpoint['step_id'],
                    document='original', source_sha256=identity)
                session['readback_requests'].append(request)
                receipts.append(dict(kind='readback-request', **request))
                checkpoint.update(request_id=request_id, source_sha256=identity,
                    readback_method=method, observation_sha256='b' * 64, observation_bytes=64,
                    retention=dict(method='runtime-object-and-endpoint-inventory',
                        original_basic_boxes_retained=2, original_basic_cables_retained=1,
                        observer_leaf_cables_retained=2, unexpected_basic_cables=0,
                        saved_order_observed=False))
        return session, checkpoints, native['source_identities'], receipts, score, native

    def validate_fixture(self, fixture):
        return self.compare.validate_readback(*fixture[:4])

    def test_readback_methods_are_explicit_and_legacy_remains_strict(self):
        v8 = self.readback_fixture()
        self.assertEqual(self.validate_fixture(v8), 'v8-boxtext')
        reference = v8[1][0]['states'][0]
        native = v8[5]['rows'][0]['snapshots'][0]['nodes'][0]
        self.assertFalse(self.compare.compare_state(reference, native)['match'])
        self.assertTrue(self.compare.compare_state(reference, native, 'v8-boxtext')['match'])
        legacy = self.readback_fixture('private-serialization')
        legacy[0].pop('readback_method')
        self.assertEqual(self.validate_fixture(legacy), 'private-serialization')
        legacy[0]['readback_method'] = 'private-serialization'
        self.assertEqual(self.validate_fixture(legacy), 'private-serialization')
        legacy[1][0]['readback_method'] = 'v8-boxtext'
        with self.assertRaisesRegex(ValueError, 'method'):
            self.validate_fixture(legacy)
        legacy[0]['readback_method'] = 'unknown'
        with self.assertRaisesRegex(ValueError, 'method'):
            self.validate_fixture(legacy)

    def test_v8_requires_measured_boolean_capability_gates(self):
        for gate in ('complete', 'initial_message_readback_validated', 'cold_message_readback_validated',
                     'runtime_endpoint_readback_validated'):
            for value in (None, False, 1, 'true'):
                with self.subTest(gate=gate, value=value):
                    fixture = self.readback_fixture()
                    fixture[0][gate] = value
                    with self.assertRaisesRegex(ValueError, 'gate'):
                        self.validate_fixture(fixture)
        for value in (None, True, 0, 'false'):
            fixture = self.readback_fixture()
            fixture[0]['saved_order_observed'] = value
            with self.assertRaisesRegex(ValueError, 'order'):
                self.validate_fixture(fixture)

    def test_v8_refuses_missing_mixed_mislabeled_or_malformed_states(self):
        changes = [lambda row: row.update(states=[]),
                   lambda row: row.update(readback_method='private-serialization'),
                   lambda row: row['states'][0].update(status='observed-private-serialization'),
                   lambda row: row['states'][0].update(live_content=None),
                   lambda row: row['states'][0].update(live_content=dict(empty='true', message=None)),
                   lambda row: row['states'][0].update(live_content=dict(empty=False, message=None)),
                   lambda row: row['states'][0].update(live_content=dict(empty=False,
                       message=dict(selector='float', atoms=[dict(tag='float', value=float('nan'))]))),
                   lambda row: row['states'][0].update(document='another'),
                   lambda row: row['states'][0].update(text_sha256=None),
                   lambda row: row['states'][0].update(text_characters=True),
                   lambda row: row['states'][0].update(rendering='serialized Message content')]
        for change in changes:
            fixture = self.readback_fixture()
            change(fixture[1][0])
            with self.subTest(change=changes.index(change)):
                with self.assertRaisesRegex(ValueError, 'Message|method|serialized'):
                    self.validate_fixture(fixture)

    def test_v8_binds_exact_request_source_and_checkpoint_metadata(self):
        changes = [lambda f: f[1][0].update(source_sha256='c' * 64),
                   lambda f: f[1][0].update(observation_sha256='invalid'),
                   lambda f: f[1][0].update(observation_bytes=0),
                   lambda f: f[1][0].update(observation_bytes=True),
                   lambda f: f[1][0].update(request_id=True),
                   lambda f: f[1][1].update(request_id=1),
                   lambda f: f[0]['readback_requests'].pop(),
                   lambda f: f[0]['readback_requests'].append(copy.deepcopy(f[0]['readback_requests'][0])),
                   lambda f: f[0]['readback_requests'][0].update(document='another'),
                   lambda f: f[0]['readback_requests'][0].update(request_id=True),
                   lambda f: f[0]['readback_requests'][0].update(unexpected=True),
                   lambda f: f[1].__setitem__(0, None),
                   lambda f: f[3].pop(),
                   lambda f: f[3].append(copy.deepcopy(f[3][-1])),
                   lambda f: f[3][-1].update(source_sha256='c' * 64),
                   lambda f: f[1][0].update(snapshot_sha256='b' * 64)]
        for change in changes:
            fixture = self.readback_fixture()
            change(fixture)
            with self.subTest(change=changes.index(change)):
                with self.assertRaisesRegex(ValueError, 'checkpoint|request|source|serialized'):
                    self.validate_fixture(fixture)

    def test_v8_request_ids_are_unique_and_increasing_across_documents(self):
        fixture = self.readback_fixture()
        session, checkpoints, sources, receipts = fixture[:4]
        sources['another'] = 'c' * 64
        session['documents'].append(dict(document='another', source_sha256=sources['another']))
        session['capabilities'].append(dict(session['capabilities'][0], document='another'))
        checkpoint = copy.deepcopy(checkpoints[0])
        checkpoint.update(document='another', source_sha256=sources['another'], request_id=2)
        checkpoint['states'][0]['document'] = 'another'
        checkpoints.insert(1, checkpoint)
        request = {key: checkpoint[key] for key in ('request_id', 'step_id', 'document', 'source_sha256')}
        session['readback_requests'].insert(1, request)
        receipts.append(dict(kind='readback-request', **request))
        self.assertEqual(self.validate_fixture(fixture), 'v8-boxtext')
        for request_id in (1, 4):
            checkpoint['request_id'] = request_id
            request['request_id'] = request_id
            receipts[-1]['request_id'] = request_id
            with self.assertRaisesRegex(ValueError, 'request'):
                self.validate_fixture(fixture)

    def test_v8_requires_exact_inventory_counts_and_refuses_order_claims(self):
        changes = [lambda f: f[0].update(capabilities=[]),
                   lambda f: f[0]['capabilities'].append(copy.deepcopy(f[0]['capabilities'][0])),
                   lambda f: f[0]['capabilities'][0].update(source_basic_cables=True),
                   lambda f: f[1][0]['retention'].update(original_basic_boxes_retained=1),
                   lambda f: f[1][0]['retention'].update(original_basic_cables_retained=0),
                   lambda f: f[1][0]['retention'].update(observer_leaf_cables_retained=1),
                   lambda f: f[1][0]['retention'].update(unexpected_basic_cables=1),
                   lambda f: f[1][0]['retention'].update(unexpected_basic_cables=False),
                   lambda f: f[1][0]['retention'].update(saved_order_observed=True),
                   lambda f: f[1][0]['retention'].update(method='private-serialization'),
                   lambda f: f[1][0]['retention'].update(saved_order_retained=True)]
        for change in changes:
            fixture = self.readback_fixture()
            change(fixture)
            with self.subTest(change=changes.index(change)):
                with self.assertRaisesRegex(ValueError, 'capability|retention|order'):
                    self.validate_fixture(fixture)

    def run_cli_fixture(self, fixture, cleanup=None):
        session, checkpoints, _, receipts, score, native = fixture
        if cleanup is None:
            cleanup = self.cleanup_fixture()
            if session.get('readback_method') == 'v8-boxtext':
                cleanup['source_preservation'][0]['working_unchanged'] = True
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            score_path = root / 'score.json'
            score_path.write_text(json.dumps(score))
            native['score_sha256'] = hashlib.sha256(score_path.read_bytes()).hexdigest()
            for name, value in (('native.json', native), ('session.json', session),
                                ('cleanup.json', cleanup), ('display-states.json', checkpoints)):
                (root / name).write_text(json.dumps(value))
            (root / 'receipts.jsonl').write_text(''.join(json.dumps(row) + '\n' for row in receipts))
            output = root / 'result.json'
            result = subprocess.run([sys.executable, str(Path(__file__).with_name('compare.py')),
                '--native', str(root / 'native.json'), '--reference', str(root),
                '--score', str(score_path), '--output', str(output)], text=True, capture_output=True)
            return result, json.loads(output.read_text()) if output.exists() else None

    def test_valid_v8_cli_compares_finite_states_without_serialization_claims(self):
        result, value = self.run_cli_fixture(self.readback_fixture())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(value['readback_method'], 'v8-boxtext')
        self.assertTrue(value['all_endpoint_values_match'])
        self.assertTrue(value['all_message_states_match'])
        self.assertIsNone(value['all_serialized_message_states_match'])
        self.assertFalse(value['saved_order_observed'])
        self.assertEqual(value['runtime_retention']['method'], 'runtime-object-and-endpoint-inventory')
        self.assertEqual(value['complete_installed_help_qualification_passes_added'], 0)
        self.assertTrue(any('saved cable order' in text for text in value['limitations']))

    def test_legacy_cli_keeps_serialization_comparison_and_cleanup_document_coverage(self):
        fixture = self.readback_fixture('private-serialization')
        fixture[0].pop('readback_method')
        result, value = self.run_cli_fixture(fixture)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(value['readback_method'], 'private-serialization')
        self.assertTrue(value['all_message_states_match'])
        self.assertTrue(value['all_serialized_message_states_match'])
        self.assertNotIn('runtime_retention', value)
        fixture[0]['documents'].append(copy.deepcopy(fixture[0]['documents'][0]))
        result, value = self.run_cli_fixture(fixture)
        self.assertNotEqual(result.returncode, 0)
        self.assertIsNone(value)
        self.assertIn('source identity coverage', result.stderr)

    def test_v8_cleanup_requires_measured_unchanged_working_sources(self):
        cleanup = self.cleanup_fixture()
        cleanup['source_preservation'][0]['working_unchanged'] = True
        self.compare.validate_cleanup(cleanup, dict(original='identity'), 'v8-boxtext')
        for value in (None, False, 1, 'true', 'missing'):
            invalid = copy.deepcopy(cleanup)
            row = invalid['source_preservation'][0]
            if value == 'missing':
                row.pop('working_unchanged')
            else:
                row['working_unchanged'] = value
            with self.subTest(value=value):
                with self.assertRaisesRegex(ValueError, 'working'):
                    self.compare.validate_cleanup(invalid, dict(original='identity'), 'v8-boxtext')
                result, output = self.run_cli_fixture(self.readback_fixture(), invalid)
                self.assertNotEqual(result.returncode, 0)
                self.assertIsNone(output)
                self.assertIn('working', result.stderr)

    def test_legacy_cleanup_allows_serialization_to_modify_working_copy(self):
        for value in (False, 'missing'):
            cleanup = self.cleanup_fixture()
            if value != 'missing':
                cleanup['source_preservation'][0]['working_unchanged'] = value
            self.compare.validate_cleanup(cleanup, dict(original='identity'))
            result, output = self.run_cli_fixture(self.readback_fixture('private-serialization'), cleanup)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(output['all_serialized_message_states_match'])

    def test_v8_cli_refuses_invalid_anchor_coverage_and_reports_actual_state_mismatch(self):
        fixture = self.readback_fixture()
        fixture[1][0]['states'][0]['anchor'] = 'root/another'
        result, value = self.run_cli_fixture(fixture)
        self.assertNotEqual(result.returncode, 0)
        self.assertIsNone(value)
        self.assertIn('Message anchor coverage', result.stderr)
        fixture = self.readback_fixture()
        fixture[1][1]['states'][0]['live_content'] = dict(empty=False,
            message=dict(selector='float', atoms=[dict(tag='float', value=1.5)]))
        result, value = self.run_cli_fixture(fixture)
        self.assertEqual(result.returncode, 1)
        self.assertFalse(value['all_message_states_match'])
        self.assertIsNone(value['all_serialized_message_states_match'])


if __name__ == '__main__':
    unittest.main()
