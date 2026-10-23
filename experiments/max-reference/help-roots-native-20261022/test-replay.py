#!/usr/bin/env python3
"""Original bridge fixtures; never read licensed resources."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent


class ReplayContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('help_replay', ROOT / 'replay.py')
        cls.replay = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.replay)
        cls.runner_directory = tempfile.TemporaryDirectory(prefix='ultra-replay-test-')
        cls.addClassCleanup(cls.runner_directory.cleanup)
        cls.binary = Path(cls.runner_directory.name) / 'runner'

    def lifecycle_fixture(self):
        def node(identity, kind, parameters=None, text=''):
            return dict(id=identity, kind=kind, device=0, count=0,
                        parameters=parameters or [0]*6, text_hex=text.encode().hex())

        bundles = {
            'a': (dict(sourceSha256='original-a-hash', scopedNodeMap={
                'root/store': 4, 'root/number': 9, 'root/comment': 99}),
                dict(schema='ultra-production-native-descriptors-v1', nodes=[
                    node(4, 16, [1.25, 0, 0, 0, 0, 0]),
                    node(9, 52, [11, -100, 100, 0, 0, 0]),
                ], edges=[])),
            'b': (dict(sourceSha256='original-b-hash', scopedNodeMap={
                'root/receive': 2, 'root/number': 8, 'root/display': 12}),
                dict(schema='ultra-production-native-descriptors-v1', nodes=[
                    node(2, 27, text='original-fixture-bus'),
                    node(8, 52, [5, -100, 100, 0, 0, 0]),
                    node(12, 53),
                ], edges=[dict(**{'from': 2}, outlet=0, to=8, inlet=0),
                          dict(**{'from': 8}, outlet=0, to=12, inlet=1)])),
        }

        def step(label, action, document='a', **fields):
            return dict(step_id=label, action=action, document=document,
                        source_sha256=f'original-{document}-hash', **fields)

        def send(label):
            return step(label, 'event', anchor='root/store', inlet=0,
                        message=dict(selector='send', atoms=[
                            dict(tag='symbol', value='original-fixture-bus')]))

        steps = [step('open-a', 'install', revision=1),
                 step('prime-a', 'event', anchor='root/store', inlet=1,
                      message=dict(selector='float', atoms=[dict(tag='float', value=8.75)])),
                 send('send-absent'), step('open-b', 'install', 'b', revision=1),
                 send('send-live'), step('tab-a', 'tab', anchor='root/number'),
                 step('close-b', 'close', 'b'), send('send-closed'),
                 step('reopen-b', 'install', 'b', revision=2), send('send-reopened'),
                 step('close-a', 'close'), step('close-b-again', 'close', 'b')]
        return bundles, steps

    def lifecycle_run(self):
        bundles, steps = self.lifecycle_fixture()
        wire, contexts = self.replay.build_transport(bundles, steps, explicit_lifecycle=True)
        return bundles, steps, wire, contexts, self.native_rows(wire)

    def native_rows(self, wire):
        if not self.binary.exists():
            subprocess.run(['c++', '-std=c++17', '-O1', '-Wall', '-Wextra', '-Werror', '-pthread',
                            str(self.replay.REPO / 'apps/ultra/tests/help_root_runtime_test.cpp'),
                            '-o', str(self.binary)], check=True, capture_output=True, text=True)
        run = subprocess.run([str(self.binary)], input=wire, capture_output=True, text=True, timeout=20)
        self.assertEqual(run.returncode, 0, run.stderr)
        return [json.loads(line) for line in run.stdout.splitlines()]

    def fixture(self):
        return dict(schema='ultra-production-native-descriptors-v1', nodes=[
            dict(id=4, kind=30, device=0, count=0, parameters=[0]*6, text_hex='tail'.encode().hex()),
            dict(id=9, kind=53, device=0, count=0, parameters=[0]*6, text_hex=''),
        ], edges=[dict(**{'from': 4}, outlet=0, to=9, inlet=1)])

    def test_maps_actual_anchors_and_retains_edge_order_without_rebuilding_graph(self):
        meta = dict(sourceSha256='original-hash', scopedNodeMap={'root/a': 4, 'root/b': 9})
        steps = [dict(step_id='click', action='event', document='original',
                      source_sha256='original-hash', anchor='root/a', inlet=0,
                      message=dict(selector='bang', atoms=[]))]
        wire, contexts = self.replay.build_transport({'original': (meta, self.fixture())}, steps)
        self.assertIn('4 30 0 0 0 0 0 0 0 0 7461696c\n', wire)
        self.assertIn('4 0 9 1\n', wire)
        self.assertIn('click event 0 4 0 - 0\n', wire)
        self.assertEqual(wire, 'help-root-native-v1 1\ngraph 0 2 1\n'
                         '4 30 0 0 0 0 0 0 0 0 7461696c\n'
                         '9 53 0 0 0 0 0 0 0 0 -\n4 0 9 1\n2\n'
                         'install-original install 0 0 1\nclick event 0 4 0 - 0\n')
        self.assertEqual(contexts[0]['anchors'][9], 'root/b')
        bad = [{**steps[0], 'source_sha256': 'different'}]
        with self.assertRaisesRegex(ValueError, 'identity'):
            self.replay.build_transport({'original': (meta, self.fixture())}, bad)
        with self.assertRaisesRegex(ValueError, 'anchor'):
            self.replay.build_transport({'original': (meta, self.fixture())}, [{**steps[0], 'anchor': 'missing'}])

    def test_public_receipts_redact_payloads_and_refuse_invalid_run(self):
        message = dict(selector='private-selector', raw_selector='private-selector',
                       atoms=[dict(tag='symbol', value='private-payload'), dict(tag='int', value=7)])
        row = dict(step_id='click', action='event', document=0, accepted=True, failed=False,
                   templates_unchanged=True, trace_overflow=False, console=[],
                   trace=[dict(ordinal=0, document=0, node=4, phase='output', port=0, message=message)],
                   snapshots=[dict(document=0, revision=1, text_edit_serial=0, console_dropped=0,
                                   nodes=[dict(id=4, kind=30, value=0, pulses=1, last_message=message)])])
        contexts = {0: dict(document='original', anchors={4: 'root/a'})}
        public = self.replay.public_results([row], contexts)
        serialized = json.dumps(public)
        self.assertNotIn('private-payload', serialized)
        self.assertNotIn('private-selector', serialized)
        self.assertIn('symbol-sha256:', serialized)
        self.assertEqual(public[0]['trace'][0]['anchor'], 'root/a')
        for field, value in [('accepted', False), ('failed', True), ('trace_overflow', True), ('templates_unchanged', False)]:
            with self.assertRaisesRegex(ValueError, 'gate'):
                self.replay.public_results([{**row, field: value}], contexts)
        bad_snapshot = {**row['snapshots'][0], 'console_dropped': 1}
        with self.assertRaisesRegex(ValueError, 'gate'):
            self.replay.public_results([{**row, 'snapshots': [bad_snapshot]}], contexts)

    def test_private_destination_refuses_worktree_and_existing_paths(self):
        with self.assertRaisesRegex(ValueError, 'outside'):
            self.replay.new_private_directory(ROOT / 'forbidden-replay')
        with tempfile.TemporaryDirectory() as work:
            with self.assertRaises(FileExistsError):
                self.replay.new_private_directory(work)

    def test_explicit_symbol_selector_is_preserved_as_a_named_message(self):
        fields = self.replay.encode_message(dict(selector='symbol', atoms=[dict(tag='symbol', value='original')]))
        self.assertEqual(fields, ['symbol'.encode().hex(), '1', '2', '0', 'original'.encode().hex()])

    def test_lifecycle_delays_receiver_install_and_resets_only_reopened_owner(self):
        _, steps, wire, contexts, rows = self.lifecycle_run()
        operations = wire.splitlines()[-12:]
        self.assertEqual([line.split()[:3] for line in operations], [
            ['open-a', 'install', '0'], ['prime-a', 'event', '0'],
            ['send-absent', 'event', '0'], ['open-b', 'install', '1'],
            ['send-live', 'event', '0'], ['tab-a', 'tab', '0'],
            ['close-b', 'close', '1'], ['send-closed', 'event', '0'],
            ['reopen-b', 'install', '1'], ['send-reopened', 'event', '0'],
            ['close-a', 'close', '0'], ['close-b-again', 'close', '1']])
        self.assertEqual(operations[8], 'reopen-b install 1 1 2')
        self.replay.validate_lifecycle_results(rows, contexts, steps)
        public = self.replay.public_results(rows, contexts)
        self.assertEqual([row['step_id'] for row in public], [step['step_id'] for step in steps])
        self.assertEqual([[s['document'] for s in row['snapshots']] for row in rows],
                         [[0], [0], [0], [0, 1], [0, 1], [0, 1],
                          [0], [0], [0, 1], [0, 1], [1], []])
        for index in (2, 7):
            self.assertEqual({receipt['document'] for receipt in rows[index]['trace']}, {0})
        for index in (4, 9):
            receiver = [r for r in rows[index]['trace'] if r['document'] == 1 and r['node'] == 2]
            self.assertEqual(len(receiver), 1, 'one registration per live owner')
            self.assertEqual(receiver[0]['message']['atoms'], [dict(tag='float', value=8.75)])
            display = rows[index]['snapshots'][1]['nodes'][2]['message_box']
            self.assertFalse(display['empty'])
            self.assertEqual(display['prototype']['atoms'], [dict(tag='int', value=8)])
        tab = rows[5]
        self.assertEqual([(r['document'], r['node'], r['phase'], r['port']) for r in tab['trace']],
                         [(0, 9, 'output', 1)])
        self.assertEqual(tab['trace'][0]['message']['selector'], 'bang')
        reopened_a, reopened_b = rows[8]['snapshots']
        self.assertEqual([n['value'] for n in reopened_a['nodes']], [8.75, 11])
        self.assertEqual(reopened_b['revision'], 2)
        self.assertEqual(reopened_b['nodes'][1]['value'], 5)
        self.assertTrue(reopened_b['nodes'][2]['message_box']['empty'])
        serialized = json.dumps(public)
        self.assertNotIn('original-fixture-bus', serialized)
        self.assertIn('symbol-sha256:', serialized)

    def test_lifecycle_refuses_invalid_identity_action_anchor_revision_and_owner_state(self):
        bundles, steps = self.lifecycle_fixture()
        cases = []
        for index in (0, 1, 5, 6):
            changed = copy.deepcopy(steps)
            changed[index]['source_sha256'] = 'wrong-source'
            cases.append(('source identity', changed))
        for index in (1, 5):
            for anchor in ('missing', 'root/comment'):
                changed = copy.deepcopy(steps)
                changed[index]['anchor'] = anchor
                cases.append(('executable anchor', changed))
        for index, revisions in [(0, (0, -1, True, 1.5, '2', 2**64)),
                                 (8, (0, -1, True, 1.5, '2', 1, 2**64))]:
            for revision in revisions:
                changed = copy.deepcopy(steps)
                changed[index]['revision'] = revision
                cases.append(('revision', changed))
        for index, fields in [(0, dict(step_id='bad id')), (1, dict(step_id='open-a')),
                              (1, dict(action='param')), (1, dict(document='missing'))]:
            changed = copy.deepcopy(steps)
            changed[index].update(fields)
            cases.append(('identity/action/document', changed))
        cases.extend([('event before install', steps[1:]),
                      ('tab before install', [steps[5], *steps]),
                      ('close before install', [steps[6], *steps]),
                      ('event after close', [steps[0], steps[10], steps[1]]),
                      ('tab after close', [steps[0], steps[10], steps[5]]),
                      ('repeated close', [steps[0], steps[10], {**steps[10], 'step_id': 'again'}])])
        for reason, score in cases:
            with self.subTest(reason=reason):
                with self.assertRaises(ValueError):
                    self.replay.build_transport(bundles, score, explicit_lifecycle=True)

    def test_lifecycle_refuses_fields_that_could_hide_a_different_action(self):
        bundles, steps = self.lifecycle_fixture()
        for index, fields in [(0, dict(anchor='root/store')), (0, dict(message={})),
                              (0, dict(inlet=0)), (1, dict(revision=2)),
                              (5, dict(inlet=0)), (5, dict(message={})),
                              (6, dict(anchor='root/receive')), (6, dict(revision=2))]:
            changed = copy.deepcopy(steps)
            changed[index].update(fields)
            with self.subTest(index=index, fields=fields):
                with self.assertRaises(ValueError):
                    self.replay.build_transport(bundles, changed, explicit_lifecycle=True)
        with self.assertRaises(ValueError):
            self.replay.build_transport(bundles, steps)
        for field in ('anchor', 'inlet', 'message', 'revision'):
            changed = copy.deepcopy(steps)
            del changed[1 if field != 'revision' else 0][field]
            with self.subTest(missing=field):
                with self.assertRaises(ValueError):
                    self.replay.build_transport(bundles, changed, explicit_lifecycle=True)
        changed = copy.deepcopy(steps)
        changed[0]['template'] = 'b'
        with self.assertRaises(ValueError):
            self.replay.build_transport(bundles, changed, explicit_lifecycle=True)
        self.replay.build_transport(bundles, [{**steps[0], 'ordinal': 0, 'row': 'original',
                                             'interaction': 'owner-install'}], explicit_lifecycle=True)
        self.replay.build_transport(bundles, [steps[0], {**steps[0], 'step_id': 'replace-a', 'revision': 2}],
                                    explicit_lifecycle=True)

    def test_lifecycle_scalar_declarations_cannot_execute_as_a_different_message_kind(self):
        bundles, steps = self.lifecycle_fixture()
        for selector, atoms in [
                ('bang', [dict(tag='int', value=7)]),
                ('int', [dict(tag='float', value=2.5)]),
                ('float', [dict(tag='int', value=2)]),
                ('int', []), ('float', []),
                ('int', [dict(tag='int', value=1), dict(tag='int', value=2)])]:
            changed = copy.deepcopy(steps)
            changed[1]['message'] = dict(selector=selector, atoms=atoms)
            with self.subTest(selector=selector, atoms=atoms):
                with self.assertRaises(ValueError):
                    self.replay.build_transport(bundles, changed, explicit_lifecycle=True)

    def test_lifecycle_preserves_named_symbol_and_explicit_list_input_semantics(self):
        metadata = dict(sourceSha256='original-hash', scopedNodeMap={'root/a': 4, 'root/b': 9})
        steps = [dict(step_id='open', action='install', document='original',
                      source_sha256='original-hash', revision=1)]
        for selector, atoms in [('symbol', [dict(tag='symbol', value='original-symbol')]),
                                ('list', [dict(tag='int', value=7)])]:
            steps.append(dict(step_id=selector, action='event', document='original',
                              source_sha256='original-hash', anchor='root/a', inlet=0,
                              message=dict(selector=selector, atoms=atoms)))
        native = self.fixture()
        native['edges'] = []
        wire, contexts = self.replay.build_transport({'original': (metadata, native)},
                                                     steps, explicit_lifecycle=True)
        rows = self.native_rows(wire)
        self.replay.validate_lifecycle_results(rows, contexts, steps)
        self.assertEqual([row['trace'][0]['message']['selector'] for row in rows[1:]], ['symbol', 'list'])
        self.assertEqual(rows[1]['trace'][0]['message']['atoms'], [dict(tag='symbol', value='original-symbol')])
        self.assertEqual(rows[2]['trace'][0]['message']['atoms'], [dict(tag='int', value=7)])

    def test_lifecycle_binds_each_event_to_the_actual_first_native_input(self):
        _, steps, _, contexts, rows = self.lifecycle_run()
        cases = []
        for fields in [dict(document=1, node=2), dict(node=9), dict(port=1), dict(phase='output'),
                       dict(message=dict(selector='set', atoms=[dict(tag='symbol', value='original-fixture-bus')])),
                       dict(message=dict(selector='send', atoms=[dict(tag='symbol', value='wrong-bus')]))]:
            changed = copy.deepcopy(rows)
            changed[4]['trace'][0].update(fields)
            cases.append(('wrong first input', changed))
        for index in (2, 4):
            changed = copy.deepcopy(rows)
            changed[index]['trace'].pop(0)
            for ordinal, receipt in enumerate(changed[index]['trace']):
                receipt['ordinal'] = ordinal
            cases.append(('missing source input', changed))
        changed = copy.deepcopy(rows)
        wrong_input = {**copy.deepcopy(changed[4]['trace'][0]), 'node': 9}
        changed[4]['trace'].insert(0, wrong_input)
        for ordinal, receipt in enumerate(changed[4]['trace']):
            receipt['ordinal'] = ordinal
        cases.append(('extra wrong first input', changed))
        changed = copy.deepcopy(rows)
        changed[4]['trace'][0], changed[4]['trace'][1] = changed[4]['trace'][1], changed[4]['trace'][0]
        for ordinal, receipt in enumerate(changed[4]['trace']):
            receipt['ordinal'] = ordinal
        cases.append(('reordered source input', changed))
        for reason, result in cases:
            with self.subTest(reason=reason):
                with self.assertRaises(ValueError):
                    self.replay.validate_lifecycle_results(result, contexts, steps)
        changed = copy.deepcopy(rows)
        changed[4]['trace'][0]['message']['raw_selector'] = 'diagnostic-only'
        self.replay.validate_lifecycle_results(changed, contexts, steps)

    def test_lifecycle_input_binding_preserves_float_zero_sign(self):
        bundles, steps = self.lifecycle_fixture()
        steps[1]['message']['atoms'][0]['value'] = -0.0
        wire, contexts = self.replay.build_transport(bundles, steps, explicit_lifecycle=True)
        rows = self.native_rows(wire)
        self.replay.validate_lifecycle_results(rows, contexts, steps)
        rows[1]['trace'][0]['message']['atoms'][0]['value'] = 0.0
        with self.assertRaises(ValueError):
            self.replay.validate_lifecycle_results(rows, contexts, steps)

    def test_lifecycle_tab_requires_the_declared_control_outlet_one_bang(self):
        _, steps, _, contexts, rows = self.lifecycle_run()
        for fields in [dict(node=4), dict(port=0), dict(phase='input'),
                       dict(message=dict(selector='int', atoms=[dict(tag='int', value=11)]))]:
            changed = copy.deepcopy(rows)
            changed[5]['trace'][0].update(fields)
            with self.subTest(fields=fields):
                with self.assertRaises(ValueError):
                    self.replay.validate_lifecycle_results(changed, contexts, steps)
        changed = copy.deepcopy(rows)
        changed[5]['trace'] = []
        with self.assertRaises(ValueError):
            self.replay.validate_lifecycle_results(changed, contexts, steps)

    def test_lifecycle_contextual_message_replacement_uses_native_target_admission(self):
        metadata = dict(sourceSha256='original-hash', scopedNodeMap={'root/a': 4, 'root/b': 9})
        common = dict(document='original', source_sha256='original-hash')
        steps = [dict(common, step_id='open', action='install', revision=1),
                 dict(common, step_id='cold-template', action='event', anchor='root/b', inlet=1,
                      message=dict(selector='fresh', atoms=[dict(tag='symbol', value='$1')])),
                 dict(common, step_id='hot-template', action='event', anchor='root/b', inlet=0,
                      message=dict(selector='set', atoms=[dict(tag='symbol', value='again'),
                                                          dict(tag='symbol', value='$1')]))]
        bundles = {'original': (metadata, self.fixture())}
        wire, contexts = self.replay.build_transport(bundles, steps, explicit_lifecycle=True)
        rows = self.native_rows(wire)
        self.replay.validate_lifecycle_results(rows, contexts, steps)
        self.assertEqual(rows[1]['snapshots'][0]['nodes'][1]['message_box']['placeholders'], [1])
        wrong = [steps[0], {**steps[1], 'anchor': 'root/a', 'inlet': 0}]
        wire, contexts = self.replay.build_transport(bundles, wrong, explicit_lifecycle=True)
        rows = self.native_rows(wire)
        self.assertFalse(rows[1]['accepted'])
        with self.assertRaises(ValueError):
            self.replay.validate_lifecycle_results(rows, contexts, wrong)

    def test_lifecycle_refuses_incomplete_or_misattributed_results_and_snapshots(self):
        _, steps, _, contexts, rows = self.lifecycle_run()
        cases = [('missing row', rows[:-1]), ('duplicate row', [*rows, rows[-1]]),
                 ('reordered row', [rows[1], rows[0], *rows[2:]])]
        for field, value in [('action', 'close'), ('document', 1), ('document', False), ('step_id', 'other'),
                             ('accepted', 'true'), ('failed', 0), ('templates_unchanged', 1),
                             ('trace_overflow', 0)]:
            changed = copy.deepcopy(rows)
            changed[0][field] = value
            cases.append((field, changed))
        for label, index, mutate in [
                ('missing live snapshot', 4, lambda r: r['snapshots'].pop()),
                ('duplicate live snapshot', 4, lambda r: r['snapshots'].append(copy.deepcopy(r['snapshots'][0]))),
                ('closed owner remains', 6, lambda r: r['snapshots'].append(copy.deepcopy(rows[4]['snapshots'][1]))),
                ('wrong reopen revision', 8, lambda r: r['snapshots'][1].update(revision=1)),
                ('missing native node', 8, lambda r: r['snapshots'][1]['nodes'].pop()),
                ('duplicate native node', 8, lambda r: r['snapshots'][1]['nodes'].append(copy.deepcopy(r['snapshots'][1]['nodes'][0]))),
                ('wrong native kind', 8, lambda r: r['snapshots'][1]['nodes'][0].update(kind=0)),
                ('closed receiver trace', 7, lambda r: r['trace'].append(copy.deepcopy(rows[4]['trace'][-1]))),
                ('unknown console node', 4, lambda r: r['console'].append(dict(document=1, node=99))),
                ('closed owner console', 7, lambda r: r['console'].append(dict(document=1, node=8))),
                ('duplicate trace ordinal', 4, lambda r: r['trace'][1].update(ordinal=0)),
                ('unknown trace node', 4, lambda r: r['trace'][0].update(node=99))]:
            changed = copy.deepcopy(rows)
            mutate(changed[index])
            cases.append((label, changed))
        for reason, result in cases:
            with self.subTest(reason=reason):
                with self.assertRaises(ValueError):
                    self.replay.validate_lifecycle_results(result, contexts, steps)

    def test_explicit_lifecycle_cli_keeps_bundle_hashes_and_no_hidden_install_prefix(self):
        bundles, steps, _, _, _ = self.lifecycle_run()
        with tempfile.TemporaryDirectory(prefix='ultra-replay-cli-') as directory:
            work = Path(directory)
            for name, (metadata, native) in bundles.items():
                bundle = work / 'bundles' / name
                bundle.mkdir(parents=True)
                for filename, data in [('authoring.json', {'original': name}), ('flat.json', {}),
                                       ('import.json', metadata), ('native.json', native)]:
                    (bundle / filename).write_text(json.dumps(data))
            files = sorted((work / 'bundles').glob('*/*.json'))
            before = {str(path): self.replay.digest(path) for path in files}
            score = work / 'score.json'
            score.write_text(json.dumps(steps))
            run = subprocess.run([sys.executable, str(ROOT / 'replay.py'), '--explicit-lifecycle',
                                  '--bundle-root', str(work / 'bundles'), '--score', str(score),
                                  '--binary', str(self.binary), '--private-output', str(work / 'private'),
                                  '--public-output', str(work / 'public.json')],
                                 text=True, capture_output=True, timeout=20)
            self.assertEqual(run.returncode, 0, run.stderr)
            evidence = json.loads((work / 'public.json').read_text())
            self.assertEqual(evidence['status'], 'NATIVE_SCORED_NOT_MAX_COMPARED')
            self.assertEqual((evidence['action_count'], evidence['result_count']), (12, 12))
            self.assertEqual([row['step_id'] for row in evidence['rows']], [step['step_id'] for step in steps])
            self.assertEqual(set(evidence['bundle_file_sha256']), {'a', 'b'})
            self.assertEqual(before, {str(path): self.replay.digest(path) for path in files})
            self.assertNotIn('original-fixture-bus', (work / 'public.json').read_text())
            self.assertEqual(evidence['complete_installed_help_qualification_passes_added'], 0)


if __name__ == '__main__':
    unittest.main()
