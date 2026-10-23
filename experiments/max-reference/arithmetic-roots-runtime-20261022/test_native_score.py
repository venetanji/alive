#!/usr/bin/env python3
"""Original finite arithmetic fixtures; never opens installed help or Max."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
SPEC = importlib.util.spec_from_file_location('arithmetic_native_score', HERE / 'native_score.py')
SUBJECT = None
if SPEC and SPEC.loader and Path(SPEC.origin).exists():
    SUBJECT = importlib.util.module_from_spec(SPEC)
    SPEC.loader.exec_module(SUBJECT)


class NativeScoreContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix='arithmetic-score-original-')
        cls.addClassCleanup(cls.temporary.cleanup)
        cls.binary = Path(cls.temporary.name) / 'runner'
        supplied = os.environ.get('ARITHMETIC_NATIVE_TEST_BINARY')
        if supplied:
            cls.binary = Path(supplied)
        else:
            subprocess.run(['c++', '-std=c++17', '-O1', '-Wall', '-Wextra', '-Werror', '-pthread',
                            '-fsanitize=undefined', '-fno-sanitize-recover=all',
                            str(REPO / 'apps/ultra/tests/help_root_runtime_test.cpp'),
                            '-o', str(cls.binary)], check=True, capture_output=True, text=True)

    def api(self):
        self.assertIsNotNone(SUBJECT, 'finite arithmetic scorer must exist')
        return SUBJECT

    def fixture(self):
        score = json.loads((HERE / 'score.json').read_text())
        bundles = {}
        for document, kind in [('times', 5), ('plus', 4), ('minus', 54)]:
            scope = 'root/obj-4' if document == 'times' else 'root/obj-2'
            roles = [('obj-26', kind, [11, 1, 0, 0, 0, 0]),
                     ('obj-17', 52, [19, -100000, 100000, 0, 0, 0]),
                     ('obj-16', 52, [23, -100000, 100000, 0, 0, 0]),
                     ('obj-22', 0, [0]*6),
                     ('obj-25', 52, [29, -100000, 100000, 0, 0, 0]),
                     ('obj-10', kind, [1.5, 2, 0, 0, 0, 0]),
                     ('obj-1', 17, [31.25, -100000, 100000, 6, 0, 0]),
                     ('obj-7', 52, [37, -100000, 100000, 0, 0, 0]),
                     ('obj-24', 17, [41.5, -100000, 100000, 6, 0, 0]),
                     ('obj-23', 17, [43.75, -100000, 100000, 6, 0, 0])]
            identities = {anchor: 101 + 3*index for index, (anchor, _, _) in enumerate(roles)}
            nodes = [dict(id=identities[anchor], kind=node_kind, device=0, count=0,
                          parameters=params, text_hex='') for anchor, node_kind, params in roles]
            links = [('obj-17', 'obj-26', 0), ('obj-16', 'obj-26', 1),
                     ('obj-22', 'obj-26', 0), ('obj-26', 'obj-25', 0),
                     ('obj-1', 'obj-10', 0), ('obj-7', 'obj-10', 0),
                     ('obj-24', 'obj-10', 1), ('obj-10', 'obj-23', 0)]
            edges = [dict(**{'from': identities[a]}, outlet=0, to=identities[b], inlet=inlet)
                     for a, b, inlet in links]
            meta = dict(sourceSha256=next(s['source_sha256'] for s in score if s['document'] == document),
                        complete=True, stats=dict(sourceBoxes=10, importedBoxes=10,
                            sourceEdges=8, importedEdges=8, omittedBoxes=0, omittedEdges=0),
                        scopedNodeMap={scope+'/'+a: n for a, n in identities.items()})
            bundles[document] = (meta, dict(schema='ultra-production-native-descriptors-v1', nodes=nodes, edges=edges))
        return score, bundles

    def execute(self):
        api = self.api()
        score, bundles = self.fixture()
        api.validate_score(score, bundles)
        wire, contexts = api.replay.build_transport(bundles, score, explicit_lifecycle=True)
        run = subprocess.run([str(self.binary)], input=wire, capture_output=True, text=True, timeout=30)
        self.assertEqual(run.returncode, 0, 'original native fixture must execute')
        self.assertEqual(run.stderr, '')
        rows = [json.loads(line) for line in run.stdout.splitlines()]
        return score, bundles, contexts, rows

    def test_complete_original_trace_has_all_values_types_and_finite_counts(self):
        score, bundles, contexts, rows = self.execute()
        result = self.api().verify_results(rows, bundles, score, contexts)
        self.assertEqual(result['counts'], dict(operations=78, events=66, installs=6, closes=6,
            live_checkpoints=72, empty_checkpoints=6, numeric_states=504, outputs=141,
            cable_deliveries=90, direct_inputs=66, receipts=297, executable_nodes_per_owner=10,
            numeric_ui_per_live_checkpoint=7, numeric_outlet1_outputs=0))
        self.assertTrue(all(result['gates'].values()))
        self.assertEqual(len(result['checkpoints']), 78)
        self.assertNotIn('value', json.dumps(result))
        self.assertNotIn('31.25', json.dumps(result))
        # These literals independently pin pristine stores and separation from saved UI.
        for label, selector, value in [('times-A01', 'int', 0), ('plus-A01', 'int', 11),
                                       ('minus-A01', 'int', -11), ('times-A02', 'float', 0),
                                       ('plus-A02', 'float', 1.5), ('minus-A02', 'float', -1.5)]:
            row = next(r for r in rows if r['step_id'] == label)
            operator_output = next(r for r in row['trace'] if r['phase'] == 'output' and r['node'] == (101 if label.endswith('01') else 116))
            self.assertEqual(operator_output['message']['selector'], selector)
            self.assertEqual(operator_output['message']['atoms'], [dict(tag=selector, value=value)])

    def test_refuses_missing_duplicate_reordered_or_changed_score_operations(self):
        api = self.api()
        score, bundles = self.fixture()
        variants = [score[:-1], score+[copy.deepcopy(score[-1])], [score[1], score[0], *score[2:]]]
        for index, fields in [(0, {'revision': 2}), (1, {'inlet': 1}),
                              (13, {'message': {'selector': 'int', 'atoms': [{'tag': 'int', 'value': 7}]}}),
                              (26, {'document': 'times'}), (2, {'source_sha256': '0'*64})]:
            changed = copy.deepcopy(score)
            changed[index].update(fields)
            variants.append(changed)
        for changed in variants:
            with self.subTest(case=len(changed), first=changed[0]['step_id']):
                with self.assertRaises(ValueError):
                    api.validate_score(changed, bundles)

    def test_refuses_missing_duplicate_or_unexpected_checkpoints_and_live_owners(self):
        score, bundles, contexts, rows = self.execute()
        variants = [rows[:-1], rows+[copy.deepcopy(rows[-1])], [rows[1], rows[0], *rows[2:]]]
        for index, field, value in [(0, 'snapshots', []), (22, 'snapshots', [copy.deepcopy(rows[0]['snapshots'][0])]),
                                    (1, 'accepted', False), (1, 'templates_unchanged', False)]:
            changed = copy.deepcopy(rows); changed[index][field] = value; variants.append(changed)
        changed = copy.deepcopy(rows); changed[0]['snapshots'].append(copy.deepcopy(changed[0]['snapshots'][0])); variants.append(changed)
        for changed in variants:
            with self.assertRaises(ValueError):
                self.api().verify_results(changed, bundles, score, contexts)

    def test_refuses_count_preserving_wrong_types_values_anchors_ports_and_cable_inputs(self):
        score, bundles, contexts, rows = self.execute()
        variants = []
        # Count-preserving corruptions must fail, including float whole/zero outputs.
        for label, receipt, field, value in [('times-A04', 1, 'message', {'selector': 'int', 'atoms': [{'tag': 'int', 'value': 8}]}),
                ('times-A04', 3, 'node', 116), ('times-A04', 4, 'port', 1),
                ('times-A17', 1, 'message', {'selector': 'int', 'atoms': [{'tag': 'int', 'value': 9}]}),
                ('minus-A17', 1, 'message', {'selector': 'int', 'atoms': [{'tag': 'int', 'value': 0}]}),
                ('plus-A03', 2, 'message', {'selector': 'float', 'atoms': [{'tag': 'float', 'value': -3}]})]:
            changed = copy.deepcopy(rows)
            next(r for r in changed if r['step_id'] == label)['trace'][receipt][field] = value
            variants.append(changed)
        changed = copy.deepcopy(rows)
        next(r for r in changed if r['step_id'] == 'times-A04')['trace'][1]['message']['atoms'][0]['value'] = True
        variants.append(changed)
        for changed in variants:
            with self.assertRaises(ValueError):
                self.api().verify_results(changed, bundles, score, contexts)

    def test_refuses_unsilenced_cold_display_only_and_numeric_outlet1(self):
        score, bundles, contexts, rows = self.execute()
        for label in ['times-A03', 'times-A06', 'times-A08', 'times-A12', 'times-A16', 'times-A10', 'times-A19']:
            changed = copy.deepcopy(rows)
            row = next(r for r in changed if r['step_id'] == label)
            extra = copy.deepcopy(row['trace'][-1]); extra.update(ordinal=len(row['trace']), phase='output', node=101)
            row['trace'].append(extra)
            with self.subTest(label=label), self.assertRaises(ValueError):
                self.api().verify_results(changed, bundles, score, contexts)
        changed = copy.deepcopy(rows)
        next(r for r in changed if r['step_id'] == 'times-A04')['trace'][1]['port'] = 1
        with self.assertRaises(ValueError):
            self.api().verify_results(changed, bundles, score, contexts)

    def test_refuses_any_of_seven_ui_values_or_both_store_resets(self):
        score, bundles, contexts, rows = self.execute()
        numeric_ids = [104, 107, 113, 119, 122, 125, 128]
        for label in ['install-times-r1', 'times-A15', 'times-A18', 'install-times-r2']:
            for identity in numeric_ids:
                changed = copy.deepcopy(rows)
                row = next(r for r in changed if r['step_id'] == label)
                node = next(n for n in row['snapshots'][0]['nodes'] if n['id'] == identity)
                node['value'] += 0.5
                with self.subTest(label=label, identity=identity), self.assertRaises(ValueError):
                    self.api().verify_results(changed, bundles, score, contexts)
        for label in ['times-A21', 'times-A22']:
            changed = copy.deepcopy(rows)
            row = next(r for r in changed if r['step_id'] == label)
            next(r for r in row['trace'] if r['phase'] == 'output' and r['node'] in (101, 116))['message']['atoms'][0]['value'] = 999
            with self.assertRaises(ValueError):
                self.api().verify_results(changed, bundles, score, contexts)

    def test_refuses_graph_changes_unbound_anchors_and_saved_ui_as_initial_store(self):
        score, bundles = self.fixture()
        for mutate in ['edge', 'anchor', 'mode', 'duplicate']:
            changed = copy.deepcopy(bundles)
            meta, native = changed['times']
            if mutate == 'edge': native['edges'][0]['inlet'] = 1
            elif mutate == 'anchor': del meta['scopedNodeMap']['root/obj-4/obj-26']
            elif mutate == 'mode': native['nodes'][0]['parameters'][1] = 0
            else: native['nodes'][1]['id'] = native['nodes'][0]['id']
            with self.subTest(mutate=mutate), self.assertRaises(ValueError):
                self.api().validate_score(score, changed)

    def test_private_output_is_exclusive_external_and_mode_restricted(self):
        api = self.api()
        with tempfile.TemporaryDirectory(prefix='arithmetic-private-test-') as parent:
            destination = Path(parent) / 'fresh'
            directory = api.private_directory(destination)
            self.assertEqual(stat.S_IMODE(directory.stat().st_mode), 0o700)
            api.private_write(directory / 'secret.json', '{"fixture":true}\n')
            self.assertEqual(stat.S_IMODE((directory/'secret.json').stat().st_mode), 0o600)
            with self.assertRaises(FileExistsError): api.private_write(directory/'secret.json', 'overwrite')
            with self.assertRaises(FileExistsError): api.private_directory(destination)
        with self.assertRaises(ValueError): api.private_directory(HERE / 'forbidden-private')

    def test_preserves_warning_bearing_complete_false_but_refuses_omissions(self):
        api = self.api()
        score, bundles = self.fixture()
        for metadata, _ in bundles.values():
            metadata['complete'] = False
        try:
            api.validate_score(score, bundles)
        except ValueError:
            self.fail('preserved importer diagnostics must not reject complete executable coverage')
        for field in ('omittedBoxes', 'omittedEdges'):
            changed = copy.deepcopy(bundles)
            changed['times'][0]['stats'][field] = 1
            with self.assertRaises(ValueError):
                api.validate_score(score, changed)


@unittest.skipUnless(os.environ.get('ARITHMETIC_NATIVE_PRIVATE_ROOT'),
                     'actual private evidence requires an explicit external path')
class ActualCaptureRefusals(unittest.TestCase):
    def test_complete_actual_capture_refuses_each_declared_corruption(self):
        self.assertIsNotNone(SUBJECT)
        api = SUBJECT
        private = Path(os.environ['ARITHMETIC_NATIVE_PRIVATE_ROOT']).resolve()
        bundle_root = Path(os.environ['ARITHMETIC_NATIVE_BUNDLE_ROOT']).resolve()
        self.assertNotIn(REPO, private.parents)
        self.assertNotIn(REPO, bundle_root.parents)
        binding = json.loads((private/'binding.json').read_text())
        for filename, expected in binding['private_file_sha256'].items():
            self.assertEqual(api.digest(private/filename), expected)
        score = json.loads((HERE/'score.json').read_text())
        bundles = {name: (json.loads((bundle_root/name/'import.json').read_text()),
                          json.loads((bundle_root/name/'native.json').read_text())) for name in api.SOURCES}
        self.assertEqual(api.digest(HERE/'score.json'), api.SCORE_SHA256)
        self.assertEqual(api.digest(HERE/'native_score.py'), binding['scorer_sha256'])
        self.assertEqual(api.bundle_hashes(bundle_root), binding['bundle_before_sha256'])
        self.assertEqual(binding['bundle_before_sha256'], binding['bundle_after_sha256'])
        wire, contexts = api.replay.build_transport(bundles, score, explicit_lifecycle=True)
        self.assertEqual(wire, (private/'transport.txt').read_text())
        rows = [json.loads(line) for line in (private/'native.jsonl').read_text().splitlines()]
        api.verify_results(rows, bundles, score, contexts)
        counts = {}

        def refuse(category, changed):
            with self.assertRaises(ValueError, msg=category):
                api.verify_results(changed, bundles, score, contexts)
            counts[category] = counts.get(category, 0)+1

        for index, row in enumerate(rows):
            refuse('missing_operation', rows[:index]+rows[index+1:])
            refuse('duplicate_operation', rows[:index]+[copy.deepcopy(row)]+rows[index:])
            if row['snapshots']:
                numeric = {n['id'] for n in bundles[score[index]['document']][1]['nodes'] if n['kind'] in (17, 52)}
                for node_index, node in enumerate(row['snapshots'][0]['nodes']):
                    if node['id'] in numeric:
                        changed = copy.deepcopy(rows)
                        changed[index]['snapshots'][0]['nodes'][node_index]['value'] += 1
                        refuse('numeric_state_count_preserving', changed)
                changed = copy.deepcopy(rows)
                changed[index]['snapshots'].append(copy.deepcopy(row['snapshots'][0]))
                refuse('duplicate_live_owner', changed)
            else:
                changed = copy.deepcopy(rows)
                changed[index]['snapshots'] = [copy.deepcopy(rows[index-1]['snapshots'][0])]
                refuse('nonempty_close_checkpoint', changed)
            for receipt_index, receipt in enumerate(row['trace']):
                if receipt['phase'] == 'output':
                    changed = copy.deepcopy(rows)
                    target = changed[index]['trace'][receipt_index]['message']
                    if target['atoms']:
                        target['atoms'][0]['value'] += 1
                    else:
                        target.update(selector='int', atoms=[dict(tag='int', value=1)])
                    refuse('output_count_preserving', changed)
                    if receipt['message']['atoms']:
                        changed = copy.deepcopy(rows)
                        target = changed[index]['trace'][receipt_index]['message']
                        tag = 'int' if target['selector'] == 'float' else 'float'
                        target['selector'] = target['atoms'][0]['tag'] = tag
                        refuse('scalar_tag_count_preserving', changed)
                elif receipt_index:
                    changed = copy.deepcopy(rows)
                    changed[index]['trace'][receipt_index]['port'] = 1-receipt['port']
                    refuse('cable_delivery_count_preserving', changed)
            if row['step_id'].endswith(('A21', 'A22')):
                changed = copy.deepcopy(rows)
                receipt = next(r for r in changed[index]['trace'] if r['phase'] == 'output' and r['message']['atoms'])
                receipt['message']['atoms'][0]['tag'] = 'symbol'
                refuse('pristine_store_recall', changed)
            if row['step_id'].endswith(('A03', 'A06', 'A08', 'A12', 'A16', 'A10', 'A19')):
                changed = copy.deepcopy(rows)
                receipt = copy.deepcopy(changed[index]['trace'][-1])
                receipt.update(ordinal=len(changed[index]['trace']), phase='output')
                changed[index]['trace'].append(receipt)
                refuse('cold_or_display_only_silence', changed)
        for left, right in ((0, 1), (21, 22), (25, 26), (51, 52), (76, 77)):
            changed = copy.deepcopy(rows)
            changed[left], changed[right] = changed[right], changed[left]
            refuse('operation_order', changed)
        changed = copy.deepcopy(rows)
        changed[4]['trace'][1]['port'] = 1
        refuse('numeric_outlet1', changed)
        self.assertEqual(counts['numeric_state_count_preserving'], 504)
        self.assertEqual(counts['output_count_preserving'], 141)
        self.assertEqual(counts['cable_delivery_count_preserving'], 90)
        self.assertEqual(counts['pristine_store_recall'], 6)
        self.assertEqual(stat.S_IMODE(private.stat().st_mode), 0o700)
        self.assertTrue(all(stat.S_IMODE(path.stat().st_mode) == 0o600 for path in private.iterdir()))
        self.assertEqual(api.bundle_hashes(bundle_root), binding['bundle_before_sha256'])
        output = os.environ.get('ARITHMETIC_NATIVE_REFUSAL_RESULT')
        if output:
            summary = dict(schema='arithmetic-native-refusal-result-v1',
                status='ALL_DECLARED_CORRUPTIONS_REFUSED', cases=counts, total_cases=sum(counts.values()),
                score_sha256=api.digest(HERE/'score.json'), scorer_sha256=api.digest(HERE/'native_score.py'),
                tests_sha256=api.digest(__file__), native_result_sha256=api.digest(HERE/'native-result.json'),
                private_evidence_permissions_pass=True, bundle_retention_pass=True, qualification_passes_added=0)
            with Path(output).open('x') as destination:
                json.dump(summary, destination, indent=2)
                destination.write('\n')


if __name__ == '__main__':
    unittest.main(verbosity=2)
