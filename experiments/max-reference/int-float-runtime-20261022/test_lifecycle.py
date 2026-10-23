"""Synthetic lifecycle proofs only; no installed patcher or helper bodies."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent
MODULE = ROOT / 'lifecycle.py'
if MODULE.exists():
    SPEC = importlib.util.spec_from_file_location('numeric_lifecycle', MODULE)
    lifecycle = importlib.util.module_from_spec(SPEC)
    SPEC.loader.exec_module(lifecycle)
else:
    lifecycle = None


def digest(data):
    return hashlib.sha256(data).hexdigest()


def windows(path):
    return 'Z:' + str(path)


def typed(value):
    return dict(status='returned', type='boolean' if type(value) is bool else 'number', value=value)


def edge(source, destination, inlet=0):
    return dict(source=dict(identity=source, port=0),
                destination=dict(identity=destination, port=inlet))


class Fixture:
    def __init__(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.work = Path(self.tmp.name)
        self.work.chmod(0o700)
        (self.work / 'observations').mkdir(mode=0o700)
        helper = b'// Original synthetic lifecycle helper fixture.\n'
        self.write_bytes(self.work / 'lifecycle-observer.js', helper)
        self.helper_sha = digest(helper)
        owners = []
        documents = []
        self.root_paths = []
        for inlet, (document, revision) in enumerate((('int', 1), ('int', 2), ('float', 1), ('float', 2))):
            owner_path = windows(self.work / f'{document}-r{revision}.maxhelp')
            root_path = self.work / 'observations' / f'lifecycle-root-{document}-r{revision}.json'
            self.root_paths.append(root_path)
            source_sha = ('a' if document == 'int' else 'b') * 64
            owners.append(dict(document=document, revision=revision, source_sha256=source_sha,
                               working_path=owner_path, channel='fixture_channel_' + str(inlet),
                               inlet=inlet, root_proof_path=windows(root_path)))
            documents.append(dict(document=document, revision=revision, source_sha256=source_sha,
                                  working_windows_path=owner_path, lifecycle_owner_inlet=inlet,
                                  helper_sha256={'fixture-source-helper.js': 'c' * 64},
                                  boxes=[dict(anchor='root/obj-4/obj-1'), dict(anchor='root/obj-4/obj-3')],
                                  full_inventory=[
                                      dict(anchor='root/obj-1', runtime_class='js', runtime_classes=['js'],
                                           rect=[0, 0, 100, 20], source_varname=None),
                                      dict(anchor='root/obj-4', runtime_class='patcher',
                                           runtime_classes=['patcher', 'p'], rect=[0, 30, 100, 20],
                                           source_varname='basic_tab')]))
        inventory = [dict(varname='__alive_numeric_controller', maxclass='js',
                          boxtext='js synthetic-controller.js', rect=[-1, -1, 100, 22]),
                     dict(varname='__alive_numeric_lifecycle_observer', maxclass='v8',
                          boxtext='v8 ' + windows(self.work / 'lifecycle-observer.js'),
                          rect=[-2, -2, 100, 22])]
        inventory += [dict(varname='__alive_numeric_lifecycle_receive_' + str(i), maxclass='receive',
                           boxtext='receive ' + owner['channel'], rect=[-10 - i, -10, 100, 22])
                      for i, owner in enumerate(owners)]
        self.config = dict(work=str(self.work), documents=documents,
                           package_sha256={'lifecycle-observer.js': self.helper_sha},
                           lifecycle=dict(version='freebang-v1', monitor_epoch='d' * 48,
                                          observer_path=windows(self.work / 'lifecycle-observer.js'),
                                          report_path=windows(self.work / 'lifecycle-report.json'),
                                          driver_inventory=inventory, owners=owners))
        owner = owners[2]
        self.command = dict(command_id=125, op='operation', step_id='close-float', action='close',
                            document='float', action_revision=1, source_sha256=owner['source_sha256'])
        harness = [dict(varname=name, maxclass=cls, rect=rect, boxtext=text, valid=1)
                   for name, cls, rect, text in (
                       ('__alive_numeric_reader', 'v8', [-3000, -3000, 160, 133], 'v8 fixture-reader.js'),
                       ('__alive_numeric_disposer', 'thispatcher', [-3100, -3000, 100, 22], 'thispatcher'),
                       ('__alive_numeric_freebang', 'freebang', [-3200, -3000, 100, 22], 'freebang'),
                       ('__alive_numeric_lifecycle_send', 'send', [-3400, -3000, 200, 64],
                        'send ' + owner['channel']))]
        root = dict(version='freebang-v1', request_id=125, step_id='close-float', document='float',
                    revision=1, source_sha256=owner['source_sha256'], working_path=owner['working_path'],
                    root_is_top_level=True,
                    originals=[dict(anchor='root/obj-1', varname='', maxclass='js', rect=[0, 0, 100, 20]),
                               dict(anchor='root/obj-4', varname='basic_tab', maxclass='patcher', rect=[0, 30, 100, 20])],
                    harness=harness,
                    input_routes=[edge('__alive_numeric_freebang', '__alive_numeric_lifecycle_send')],
                    output_routes=[edge('__alive_numeric_freebang', '__alive_numeric_lifecycle_send')])
        samples = []
        for attempt in range(31):
            value = 1 if attempt == 0 else 0
            samples.append(dict(phase='before-dispose' if attempt == 0 else 'poll', attempt=attempt,
                                root_valid=dict(status='returned', type='undefined'), reader_valid=typed(value),
                                disposer_valid=typed(value), retained_firstobject_valid=typed(value),
                                root_filepath=dict(status='returned', type='string', value=owner['working_path']),
                                objects=[dict(anchor=b['anchor'], valid=typed(value)) for b in documents[2]['boxes']],
                                harness_objects=[dict(anchor=name, valid=typed(value)) for name in
                                                 ('__alive_numeric_freebang', '__alive_numeric_lifecycle_send')],
                                firstobject=dict(status='returned', type='object'), firstobject_valid=typed(value),
                                wind=dict(status='returned', type='object'),
                                wind_visible=dict(status='returned', type='boolean', value=True),
                                wind_assocclass=dict(status='returned', type='string', value='jpatcher'),
                                wind_assoc=dict(status='returned', type='object'),
                                wind_assoc_filepath=dict(status='returned', type='string', value=owner['working_path'])))
        evidence = dict(version='freebang-v1', binding=dict(monitor_epoch='d' * 48, request_id=125,
                        step_id='close-float', action='close', document='float', revision=1,
                        source_sha256=owner['source_sha256'], working_path=owner['working_path'],
                        observer_helper_sha256=self.helper_sha), root_route_path=owner['root_proof_path'],
                        root_route_proof=root, driver_route_proof=self.driver(), observer_report=self.report())
        self.ack = dict(command_id=125, success=True, step_id='close-float',
                        closed_owner_absence_validated=True,
                        close_diagnostics=dict(request_id=125, step_id='close-float', action='close',
                        document='float', revision=1, source_sha256=owner['source_sha256'],
                        working_path=owner['working_path'], helper_sha256=documents[2]['helper_sha256'],
                        dispose=dict(attempted=True, result=dict(status='returned', type='function')),
                        samples=samples, lifecycle_evidence=evidence))
        self.persist()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.tmp.cleanup()

    def write_bytes(self, path, data):
        path.write_bytes(data)
        path.chmod(0o600)

    def write_json(self, path, value):
        self.write_bytes(path, (json.dumps(value, sort_keys=True) + '\n').encode())

    def seal(self):
        self.write_json(self.work / 'config.json', self.config)
        self.write_json(self.work / 'seal.json', dict(files={
            'config.json': digest((self.work / 'config.json').read_bytes()),
            'lifecycle-observer.js': self.helper_sha}))

    def persist(self):
        self.seal()
        evidence = self.ack['close_diagnostics'].get('lifecycle_evidence')
        if evidence is not None:
            self.write_json(self.root_paths[2], evidence['root_route_proof'])
        self.write_json(self.work / 'observations' / 'ack-request-125.json', self.ack)

    def evidence(self):
        return self.ack['close_diagnostics']['lifecycle_evidence']

    def finite_v8_inventory(self, document, definition, root):
        source = {
            'float': 'c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c',
            'int': 'bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61'}[document]
        helpers = {
            'helpstarter.js': 'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8',
            'helpname.js': '49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa',
            'helpdetails.js': '31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1',
            'helpargs.js': '04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'}
        definition.update(source_sha256=source, helper_sha256=helpers)
        self.config['helpers'] = [dict(name=name, sha256=sha) for name, sha in helpers.items()]
        root['source_sha256'] = source
        definition['full_inventory'] = definition['full_inventory'][:1]
        root['originals'] = root['originals'][:1]
        for anchor, saved, text_sha, name in (
            ('root/obj-2', [10, 85, 50, 20],
             '484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393', 'basic_tab'),
            ('root/obj-3', [205, 205, 50, 20],
             'bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a', '')):
            live = saved[:3] + [22]
            policy = dict(kind='source-bound-' + document + '-shell-height', document=document, source_sha256=source,
                          anchor=anchor, runtime_class='patcher', saved_rect=saved[:], live_rect=live,
                          source_text_sha256=text_sha, helper_sha256=dict(helpers),
                          saved_incoming_routes=0, saved_outgoing_routes=0)
            definition['full_inventory'].append(dict(anchor=anchor, maxclass='newobj', runtime_class='patcher',
                runtime_classes=['patcher', 'p'], rect=saved, source_varname=name,
                source_text_sha256=text_sha, saved_incoming_routes=0, saved_outgoing_routes=0,
                shell_height_policy=policy))
            root['originals'].append(dict(anchor=anchor, varname=name, maxclass='jpatcher', rect=live[:]))
        return source, helpers

    def float_v8_root(self):
        source, helpers = self.finite_v8_inventory('float', self.config['documents'][2],
                                                  self.evidence()['root_route_proof'])
        self.config['lifecycle']['owners'][2]['source_sha256'] = source
        self.command['source_sha256'] = source
        self.ack['close_diagnostics'].update(source_sha256=source, helper_sha256=helpers)
        self.evidence()['binding']['source_sha256'] = source
        self.persist()

    def int_v8_root(self):
        command, ack = self.second_close()
        diagnostics = ack['close_diagnostics']
        source, helpers = self.finite_v8_inventory('int', self.config['documents'][0],
                                                  diagnostics['lifecycle_evidence']['root_route_proof'])
        self.config['lifecycle']['owners'][0]['source_sha256'] = source
        command['source_sha256'] = source
        diagnostics.update(source_sha256=source, helper_sha256=helpers)
        diagnostics['lifecycle_evidence']['binding']['source_sha256'] = source
        self.seal()
        self.persist_close(ack)
        return command, ack

    def driver(self):
        boxes = [dict(row, valid=True) for row in self.config['lifecycle']['driver_inventory']]
        routes = [edge('__alive_numeric_lifecycle_receive_' + str(i), '__alive_numeric_lifecycle_observer', i + 1)
                  for i in range(4)]
        return dict(boxes=boxes, input_routes=routes, output_routes=copy.deepcopy(routes),
                    declared_inlets=5, declared_outlets=0)

    def report(self, barrier=False):
        transitions = []
        events = []
        states = [dict(inlet=i, state='monitoring', request_id=0, step_id='', witness_count=0) for i in range(4)]
        for inlet, request, step in ((2, 125, 'close-float'), (0, 141, 'close-int'))[:2 if barrier else 1]:
            start = len(transitions) + len(events)
            transitions += [dict(seq=start + offset, kind=kind, inlet=inlet, request_id=request, step_id=step)
                            for offset, kind in ((1, 'arm'), (2, 'dispatch-start'),
                                                 (4, 'dispatch-return'), (5, 'close-validated'))]
            events.append(dict(seq=start + 3, inlet=inlet, payload_kind='bang', request_id=request, step_id=step))
            states[inlet] = dict(inlet=inlet, state='closed', request_id=request, step_id=step, witness_count=1)
        if barrier:
            transitions.append(dict(seq=11, kind='barrier', inlet=-1, request_id=200, step_id='capture-complete'))
        return dict(monitor_epoch='d' * 48, seq=11 if barrier else 5, transitions=transitions,
                    events=events, states=states, failures=[], sealed=barrier)

    def second_close(self):
        owner = self.config['lifecycle']['owners'][0]
        command = dict(command_id=141, op='operation', step_id='close-int', action='close',
                       document='int', action_revision=1, source_sha256=owner['source_sha256'])
        ack = copy.deepcopy(self.ack)
        ack.update(command_id=141, step_id='close-int')
        diagnostics = ack['close_diagnostics']
        diagnostics.update(request_id=141, step_id='close-int', document='int',
                           source_sha256=owner['source_sha256'], working_path=owner['working_path'],
                           helper_sha256=self.config['documents'][0]['helper_sha256'])
        for sample in diagnostics['samples']:
            for field in ('root_filepath', 'wind_assoc_filepath'):
                sample[field]['value'] = owner['working_path']
        evidence = diagnostics['lifecycle_evidence']
        evidence['binding'].update(request_id=141, step_id='close-int', document='int',
                                   source_sha256=owner['source_sha256'], working_path=owner['working_path'])
        evidence['root_route_path'] = owner['root_proof_path']
        root = evidence['root_route_proof']
        root.update(request_id=141, step_id='close-int', document='int',
                    source_sha256=owner['source_sha256'], working_path=owner['working_path'])
        root['harness'][-1]['boxtext'] = 'send ' + owner['channel']
        report = evidence['observer_report']
        report['transitions'] += [dict(seq=seq, kind=kind, inlet=0, request_id=141, step_id='close-int')
                                  for seq, kind in ((6, 'arm'), (7, 'dispatch-start'),
                                                    (9, 'dispatch-return'), (10, 'close-validated'))]
        report['events'].append(dict(seq=8, inlet=0, payload_kind='bang', request_id=141, step_id='close-int'))
        report['states'][0].update(state='closed', request_id=141, step_id='close-int', witness_count=1)
        report['seq'] = 10
        self.persist_close(ack)
        return command, ack

    def persist_close(self, ack):
        diagnostics = ack['close_diagnostics']
        inlet = 2 if diagnostics['document'] == 'float' else 0
        self.write_json(self.root_paths[inlet], diagnostics['lifecycle_evidence']['root_route_proof'])
        self.write_json(self.work / 'observations' / f"ack-request-{ack['command_id']}.json", ack)

    def accept_close(self, command=None, ack=None):
        command = self.command if command is None else command
        ack = self.ack if ack is None else ack
        metadata = lifecycle.validate_close(self.work, self.config, command, ack)
        self.write_json(self.work / 'observations' / f"validated-close-{command['command_id']}.json", metadata)
        return metadata

    def barrier(self, prior_report=None):
        report = self.report(barrier=True)
        if prior_report is not None:
            report = copy.deepcopy(prior_report)
            report['transitions'].append(dict(seq=11, kind='barrier', inlet=-1, request_id=200,
                                              step_id='capture-complete'))
            report.update(seq=11, sealed=True)
        ack = dict(command_id=200, success=True, step_id='capture-complete', lifecycle_evidence=dict(
            version='freebang-v1', binding=dict(monitor_epoch='d' * 48, request_id=200,
            step_id='capture-complete', action='lifecycle-barrier', observer_helper_sha256=self.helper_sha),
            driver_route_proof=self.driver(), observer_report=report))
        self.write_json(self.work / 'observations' / 'ack-request-200.json', ack)
        return ack


class LifecycleTests(unittest.TestCase):
    def close(self, fixture):
        self.assertIsNotNone(lifecycle, 'independent lifecycle validator is not implemented')
        return lifecycle.validate_close(fixture.work, fixture.config, fixture.command, fixture.ack)

    def reject(self, mutate):
        with Fixture() as f:
            mutate(f)
            f.persist()
            with self.assertRaises(ValueError):
                self.close(f)

    def test_measured_owned_rectangles_accept_only_reader133_send64(self):
        with Fixture() as f:
            self.assertIs(self.close(f)['close_proof_validated'], True)
        for index, height in ((0, 22), (0, 134), (1, 50), (2, 50), (3, 22), (3, 65)):
            with self.subTest(index=index, height=height):
                self.reject(lambda f: f.evidence()['root_route_proof']['harness'][index]['rect'].__setitem__(3, height))

    def test_float_root_v8_disposition_retains_actual_jpatcher(self):
        with Fixture() as f:
            f.float_v8_root()
            raw = f.root_paths[2].read_bytes()
            metadata = self.close(f)
            self.assertEqual(Path(metadata['root_raw_path']).read_bytes(), raw)
            retained = json.loads(raw)
            self.assertEqual([b['maxclass'] for b in retained['originals'][1:]], ['jpatcher', 'jpatcher'])

    def test_float_root_v8_disposition_accepts_source_like_float_rectangles(self):
        for live_floats in (False, True):
            with self.subTest(live_floats=live_floats), Fixture() as f:
                f.float_v8_root()
                for original in f.config['documents'][2]['full_inventory'][1:]:
                    original['rect'] = [float(value) for value in original['rect']]
                if live_floats:
                    for actual in f.evidence()['root_route_proof']['originals'][1:]:
                        actual['rect'] = [float(value) for value in actual['rect']]
                f.persist()
                raw = f.root_paths[2].read_bytes()
                metadata = self.close(f)
                self.assertEqual(Path(metadata['root_raw_path']).read_bytes(), raw)

    def test_finite_v8_dispositions_refuse_invalid_rectangle_numbers(self):
        for document in ('float', 'int'):
            for index in (1, 2):
                for target in ('saved', 'live'):
                    for value in (False, True, float('nan'), float('inf'), float('-inf')):
                        with self.subTest(document=document, index=index, target=target, value=value), Fixture() as f:
                            f.float_v8_root()
                            _, ack = f.int_v8_root() if document == 'int' else (f.command, f.ack)
                            inlet = 0 if document == 'int' else 2
                            definition = f.config['documents'][inlet]
                            actual = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']['originals'][index]
                            original = definition['full_inventory'][index]
                            (original if target == 'saved' else actual)['rect'][0] = value
                            with self.assertRaises(ValueError):
                                lifecycle._finite_root_class(actual, f.config['lifecycle']['owners'][inlet],
                                                             definition, original)

    def test_float_root_v8_disposition_refuses_every_sealed_profile_mutation(self):
        mutations = [
            ('source-class', lambda b, p, r, d: b.update(maxclass='patcher')),
            ('canonical', lambda b, p, r, d: b.update(runtime_class='jpatcher')),
            ('aliases', lambda b, p, r, d: b.update(runtime_classes=['patcher', 'p', 'jpatcher'])),
            ('alias-order', lambda b, p, r, d: b.update(runtime_classes=['p', 'patcher'])),
            ('text', lambda b, p, r, d: b.update(source_text_sha256='e' * 64)),
            ('source-name', lambda b, p, r, d: b.update(source_varname='other')),
            ('saved', lambda b, p, r, d: b['rect'].__setitem__(3, 22)),
            ('live', lambda b, p, r, d: r['rect'].__setitem__(3, 23)),
            ('incoming', lambda b, p, r, d: b.update(saved_incoming_routes=1)),
            ('outgoing-bool', lambda b, p, r, d: b.update(saved_outgoing_routes=False)),
            ('helper', lambda b, p, r, d: d['helper_sha256'].update({'helpargs.js': 'f' * 64})),
            ('helper-missing', lambda b, p, r, d: d['helper_sha256'].pop('helpargs.js')),
            ('profile-missing', lambda b, p, r, d: b.pop('shell_height_policy')),
            ('profile-extra', lambda b, p, r, d: p.update(extra=True)),
            ('profile-kind', lambda b, p, r, d: p.update(kind='source-bound-int-shell-height')),
            ('profile-class', lambda b, p, r, d: p.update(runtime_class='jpatcher')),
            ('profile-anchor', lambda b, p, r, d: p.update(anchor='root/obj-4')),
            ('profile-document', lambda b, p, r, d: p.update(document='int')),
            ('profile-helper', lambda b, p, r, d: p['helper_sha256'].update({'helpargs.js': 'f' * 64})),
            ('profile-source', lambda b, p, r, d: p.update(source_sha256='e' * 64)),
            ('profile-text', lambda b, p, r, d: p.update(source_text_sha256='e' * 64)),
            ('profile-live', lambda b, p, r, d: p['live_rect'].__setitem__(3, 23)),
            ('profile-saved', lambda b, p, r, d: p['saved_rect'].__setitem__(3, 22)),
            ('profile-routes', lambda b, p, r, d: p.update(saved_incoming_routes=True)),
            ('actual-legacy', lambda b, p, r, d: r.update(maxclass='patcher')),
            ('actual-alias', lambda b, p, r, d: r.update(maxclass='p')),
        ]
        for index in (1, 2):
            for label, mutate in mutations:
                with self.subTest(anchor=index, mutation=label), Fixture() as f:
                    f.float_v8_root()
                    definition = f.config['documents'][2]
                    box = definition['full_inventory'][index]
                    mutate(box, box['shell_height_policy'], f.evidence()['root_route_proof']['originals'][index], definition)
                    f.ack['close_diagnostics']['helper_sha256'] = copy.deepcopy(definition['helper_sha256'])
                    f.persist()
                    with self.assertRaises(ValueError):
                        self.close(f)

    def test_float_v8_disposition_requires_fixed_config_helper_inventory(self):
        for mutation in ('missing', 'extra', 'duplicate', 'digest'):
            with self.subTest(mutation=mutation), Fixture() as f:
                f.float_v8_root()
                helpers = f.config['helpers']
                if mutation == 'missing':
                    helpers.pop()
                elif mutation == 'extra':
                    helpers.append(dict(name='extra.js', sha256='f' * 64))
                elif mutation == 'duplicate':
                    helpers[-1] = dict(helpers[0])
                else:
                    helpers[0]['sha256'] = 'f' * 64
                f.persist()
                with self.assertRaises(ValueError):
                    self.close(f)

    def test_jpatcher_refuses_outside_literal_document_revision_source_and_anchors(self):
        for change in ('document', 'revision', 'source', 'source-legacy', 'anchor'):
            with self.subTest(change=change), Fixture() as f:
                f.float_v8_root()
                owner = copy.deepcopy(f.config['lifecycle']['owners'][2])
                definition = copy.deepcopy(f.config['documents'][2])
                root = copy.deepcopy(f.evidence()['root_route_proof'])
                if change == 'document':
                    owner['document'] = definition['document'] = root['document'] = 'int'
                elif change == 'revision':
                    owner['revision'] = definition['revision'] = root['revision'] = 2
                elif change in ('source', 'source-legacy'):
                    owner['source_sha256'] = definition['source_sha256'] = root['source_sha256'] = 'e' * 64
                    if change == 'source-legacy':
                        for original, actual in zip(definition['full_inventory'][1:], root['originals'][1:]):
                            original['shell_height_policy']['source_sha256'] = 'e' * 64
                            actual['maxclass'] = 'patcher'
                else:
                    root['originals'][1]['anchor'] = definition['full_inventory'][1]['anchor'] = 'root/obj-4'
                with self.assertRaises(ValueError):
                    lifecycle._root(root, owner, definition, 125, 'close-float')

    def test_caller_class_aliases_cannot_admit_jpatcher_outside_float_profile(self):
        with Fixture() as f:
            definition = f.config['documents'][2]
            definition['full_inventory'][1]['runtime_classes'] = ['patcher', 'p', 'jpatcher']
            f.evidence()['root_route_proof']['originals'][1]['maxclass'] = 'jpatcher'
            f.persist()
            with self.assertRaises(ValueError):
                self.close(f)

    def test_finite_float_profile_survives_independent_history_and_barrier_replay(self):
        with Fixture() as f:
            f.float_v8_root()
            first = f.accept_close()
            raw = Path(first['root_raw_path']).read_bytes()
            command, ack = f.second_close()
            root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
            root['originals'] = [
                dict(anchor='root/obj-1', varname='', maxclass='js', rect=[0, 0, 100, 20]),
                dict(anchor='root/obj-4', varname='basic_tab', maxclass='patcher', rect=[0, 30, 100, 20])]
            f.persist_close(ack)
            f.accept_close(command, ack)
            barrier = f.barrier(ack['close_diagnostics']['lifecycle_evidence']['observer_report'])
            lifecycle.validate_barrier(f.work, f.config, barrier, {'int': 2, 'float': 2})
            self.assertEqual(Path(first['root_raw_path']).read_bytes(), raw)

    def test_finite_float_and_int_profiles_retain_raw_jpatcher_through_final_barrier(self):
        with Fixture() as f:
            f.float_v8_root()
            command, ack = f.int_v8_root()
            for definition in (f.config['documents'][0], f.config['documents'][2]):
                for original in definition['full_inventory'][1:]:
                    original['rect'] = [float(value) for value in original['rect']]
            f.seal()
            first = f.accept_close()
            first_raw = Path(first['root_raw_path']).read_bytes()
            second_raw = f.root_paths[0].read_bytes()
            second = f.accept_close(command, ack)
            barrier = f.barrier(ack['close_diagnostics']['lifecycle_evidence']['observer_report'])
            lifecycle.validate_barrier(f.work, f.config, barrier, {'int': 2, 'float': 2})
            self.assertEqual(Path(first['root_raw_path']).read_bytes(), first_raw)
            self.assertEqual(Path(second['root_raw_path']).read_bytes(), second_raw)
            for raw in (first_raw, second_raw):
                self.assertEqual([b['maxclass'] for b in json.loads(raw)['originals'][1:]],
                                 ['jpatcher', 'jpatcher'])

    def test_int_v8_disposition_refuses_every_sealed_profile_mutation(self):
        mutations = [
            ('source-class', lambda b, p, r, d: b.update(maxclass='patcher')),
            ('canonical', lambda b, p, r, d: b.update(runtime_class='jpatcher')),
            ('aliases', lambda b, p, r, d: b.update(runtime_classes=['patcher', 'p', 'jpatcher'])),
            ('alias-order', lambda b, p, r, d: b.update(runtime_classes=['p', 'patcher'])),
            ('text', lambda b, p, r, d: b.update(source_text_sha256='e' * 64)),
            ('source-name', lambda b, p, r, d: b.update(source_varname='other')),
            ('incoming', lambda b, p, r, d: b.update(saved_incoming_routes=1)),
            ('incoming-bool', lambda b, p, r, d: b.update(saved_incoming_routes=False)),
            ('incoming-float', lambda b, p, r, d: b.update(saved_incoming_routes=0.0)),
            ('outgoing', lambda b, p, r, d: b.update(saved_outgoing_routes=1)),
            ('outgoing-bool', lambda b, p, r, d: b.update(saved_outgoing_routes=False)),
            ('outgoing-float', lambda b, p, r, d: b.update(saved_outgoing_routes=0.0)),
            ('helper', lambda b, p, r, d: d['helper_sha256'].update({'helpargs.js': 'f' * 64})),
            ('helper-missing', lambda b, p, r, d: d['helper_sha256'].pop('helpargs.js')),
            ('profile-missing', lambda b, p, r, d: b.pop('shell_height_policy')),
            ('profile-extra', lambda b, p, r, d: p.update(extra=True)),
            ('profile-kind', lambda b, p, r, d: p.update(kind='source-bound-float-shell-height')),
            ('profile-class', lambda b, p, r, d: p.update(runtime_class='jpatcher')),
            ('profile-anchor', lambda b, p, r, d: p.update(anchor='root/obj-4')),
            ('profile-document', lambda b, p, r, d: p.update(document='float')),
            ('profile-helper', lambda b, p, r, d: p['helper_sha256'].update({'helpargs.js': 'f' * 64})),
            ('profile-source', lambda b, p, r, d: p.update(source_sha256='e' * 64)),
            ('profile-text', lambda b, p, r, d: p.update(source_text_sha256='e' * 64)),
            ('profile-live', lambda b, p, r, d: p['live_rect'].__setitem__(3, 23)),
            ('profile-saved', lambda b, p, r, d: p['saved_rect'].__setitem__(3, 22)),
            ('profile-routes', lambda b, p, r, d: p.update(saved_incoming_routes=True)),
            ('actual-legacy', lambda b, p, r, d: r.update(maxclass='patcher')),
            ('actual-alias', lambda b, p, r, d: r.update(maxclass='p')),
        ]
        for index in (1, 2):
            for label, mutate in mutations:
                with self.subTest(anchor=index, mutation=label), Fixture() as f:
                    f.float_v8_root()
                    _, ack = f.int_v8_root()
                    definition = f.config['documents'][0]
                    root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
                    box = definition['full_inventory'][index]
                    mutate(box, box['shell_height_policy'], root['originals'][index], definition)
                    with self.assertRaises(ValueError):
                        lifecycle._root(root, f.config['lifecycle']['owners'][0], definition, 141, 'close-int')

    def test_finite_profiles_refuse_each_saved_and_live_geometry_component(self):
        for document in ('float', 'int'):
            for index in (1, 2):
                for target in ('saved', 'live'):
                    for component in range(4):
                        with self.subTest(document=document, index=index, target=target, component=component), Fixture() as f:
                            f.float_v8_root()
                            _, ack = f.int_v8_root() if document == 'int' else (f.command, f.ack)
                            inlet = 0 if document == 'int' else 2
                            definition = f.config['documents'][inlet]
                            root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
                            box = definition['full_inventory'][index] if target == 'saved' else root['originals'][index]
                            box['rect'][component] += 0.25
                            with self.assertRaises(ValueError):
                                lifecycle._root(root, f.config['lifecycle']['owners'][inlet], definition,
                                                ack['command_id'], 'close-' + document)

    def test_int_v8_disposition_refuses_outside_literal_owner_and_aliases(self):
        for change in ('document', 'revision', 'source', 'source-legacy', 'anchor', 'caller-alias'):
            with self.subTest(change=change), Fixture() as f:
                f.float_v8_root()
                _, ack = f.int_v8_root()
                definition = f.config['documents'][0]
                owner = f.config['lifecycle']['owners'][0]
                root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
                if change == 'document':
                    owner['document'] = definition['document'] = root['document'] = 'other'
                elif change == 'revision':
                    owner['revision'] = definition['revision'] = root['revision'] = 2
                elif change in ('source', 'source-legacy'):
                    owner['source_sha256'] = definition['source_sha256'] = root['source_sha256'] = 'e' * 64
                    if change == 'source-legacy':
                        for original, actual in zip(definition['full_inventory'][1:], root['originals'][1:]):
                            original['shell_height_policy']['source_sha256'] = 'e' * 64
                            actual['maxclass'] = 'patcher'
                else:
                    root['originals'][1]['anchor'] = definition['full_inventory'][1]['anchor'] = 'root/obj-4'
                    if change == 'caller-alias':
                        definition['full_inventory'][1]['runtime_classes'].append('jpatcher')
                with self.assertRaises(ValueError):
                    lifecycle._root(root, owner, definition, 141, 'close-int')

    def test_int_v8_disposition_requires_fixed_config_helpers_without_float_profile(self):
        for mutation in ('missing', 'extra', 'duplicate', 'digest'):
            with self.subTest(mutation=mutation), Fixture() as f:
                f.int_v8_root()
                lifecycle._configuration(f.work, f.config)
                helpers = f.config['helpers']
                if mutation == 'missing':
                    helpers.pop()
                elif mutation == 'extra':
                    helpers.append(dict(name='extra.js', sha256='f' * 64))
                elif mutation == 'duplicate':
                    helpers[-1] = dict(helpers[0])
                else:
                    helpers[0]['sha256'] = 'f' * 64
                f.seal()
                with self.assertRaises(ValueError):
                    lifecycle._configuration(f.work, f.config)

    def accepted_later(self, fixture, barrier):
        fixture.accept_close()
        command, ack = fixture.second_close()
        if barrier:
            fixture.accept_close(command, ack)
            ack = fixture.barrier(ack['close_diagnostics']['lifecycle_evidence']['observer_report'])
            report = ack['lifecycle_evidence']['observer_report']
            validate = lambda: lifecycle.validate_barrier(fixture.work, fixture.config, ack, {'int': 2, 'float': 2})
        else:
            report = ack['close_diagnostics']['lifecycle_evidence']['observer_report']
            validate = lambda: lifecycle.validate_close(fixture.work, fixture.config, command, ack)
        return ack, report, validate

    def test_second_close_requires_independently_accepted_float_close(self):
        with Fixture() as f:
            command, ack = f.second_close()
            with self.assertRaises(ValueError):
                lifecycle.validate_close(f.work, f.config, command, ack)

    def test_first_close_refuses_an_invented_earlier_int_close(self):
        with Fixture() as f:
            report = f.evidence()['observer_report']
            for row in report['transitions'] + report['events']:
                row['seq'] += 5
            report['transitions'] = [dict(seq=seq, kind=kind, inlet=0, request_id=100, step_id='close-int')
                                     for seq, kind in ((1, 'arm'), (2, 'dispatch-start'),
                                                       (4, 'dispatch-return'), (5, 'close-validated'))] + report['transitions']
            report['events'].insert(0, dict(seq=3, inlet=0, payload_kind='bang', request_id=100, step_id='close-int'))
            report['states'][0].update(state='closed', request_id=100, step_id='close-int', witness_count=1)
            report['seq'] = 10
            f.persist()
            with self.assertRaises(ValueError):
                self.close(f)

    def test_later_snapshots_refuse_rewritten_reordered_or_removed_accepted_prefix(self):
        for barrier in (False, True):
            for mutation in ('request', 'ordering', 'removed'):
                with self.subTest(barrier=barrier, mutation=mutation), Fixture() as f:
                    ack, report, validate = self.accepted_later(f, barrier)
                    if mutation == 'request':
                        for row in report['transitions'] + report['events'] + report['states']:
                            if row['inlet'] == 2:
                                row['request_id'] = 124
                    elif mutation == 'ordering':
                        report['transitions'][2]['seq'] = 3
                        report['events'][0]['seq'] = 4
                    else:
                        for field in ('transitions', 'events'):
                            report[field] = [row for row in report[field] if row['inlet'] != 2]
                            for row in report[field]:
                                row['seq'] -= 5
                        report['states'][2].update(state='monitoring', request_id=0, step_id='', witness_count=0)
                        report['seq'] -= 5
                    f.write_json(f.work / 'observations' / f"ack-request-{ack['command_id']}.json", ack)
                    with self.assertRaises(ValueError):
                        validate()

    def test_later_snapshots_require_retained_prior_raw_and_validation_files(self):
        for barrier in (False, True):
            for filename in ('validated-close-125.json', 'ack-request-125.json',
                             'retained-lifecycle-root-float-r1.json'):
                for mutation in ('missing', 'bytes', 'mode', 'symlink', 'hardlink'):
                    with self.subTest(barrier=barrier, file=filename, mutation=mutation), Fixture() as f:
                        _, _, validate = self.accepted_later(f, barrier)
                        path = f.work / 'observations' / filename
                        if mutation == 'missing':
                            path.unlink()
                        elif mutation == 'bytes':
                            f.write_bytes(path, b'{}' if filename.startswith('validated-') else path.read_bytes() + b' ')
                        elif mutation == 'mode':
                            path.chmod(0o644)
                        else:
                            target = path.with_suffix('.original')
                            path.rename(target)
                            if mutation == 'symlink':
                                path.symlink_to(target)
                            else:
                                path.hardlink_to(target)
                        with self.assertRaises(ValueError):
                            validate()

    def test_prior_validation_metadata_has_strict_types_and_exact_raw_bindings(self):
        changes = (('close_proof_validated', False), ('close_proof_validated', 1),
                   ('root_raw_path', 'source-path'), ('root_sha256', 'e' * 64),
                   ('root_bytes', True), ('root_bytes', 1), ('ack_sha256', 'f' * 64),
                   ('ack_bytes', True), ('ack_bytes', 1), ('unexpected', True))
        for field, value in changes:
            with self.subTest(field=field, value=value), Fixture() as f:
                _, _, validate = self.accepted_later(f, False)
                path = f.work / 'observations' / 'validated-close-125.json'
                metadata = json.loads(path.read_bytes())
                metadata[field] = windows(f.root_paths[2]) if value == 'source-path' else value
                f.write_json(path, metadata)
                with self.assertRaises(ValueError):
                    validate()

    def test_prior_metadata_rejects_duplicate_keys_and_nonfinite_numbers(self):
        for extra in (b', "ack_bytes": 1}', b', "extra": NaN}'):
            with self.subTest(extra=extra), Fixture() as f:
                _, _, validate = self.accepted_later(f, False)
                path = f.work / 'observations' / 'validated-close-125.json'
                f.write_bytes(path, path.read_bytes().rstrip()[:-1] + extra)
                with self.assertRaises(ValueError):
                    validate()

    def test_historical_close_conjunction_is_revalidated_despite_matching_digests(self):
        for mutation in ('controller', 'samples', 'dispose', 'witness', 'epoch', 'root'):
            with self.subTest(mutation=mutation), Fixture() as f:
                _, _, validate = self.accepted_later(f, False)
                prior = copy.deepcopy(f.ack)
                diagnostics = prior['close_diagnostics']
                evidence = diagnostics['lifecycle_evidence']
                if mutation == 'controller':
                    prior['closed_owner_absence_validated'] = False
                elif mutation == 'samples':
                    diagnostics['samples'][-1]['reader_valid'] = typed(1)
                elif mutation == 'dispose':
                    diagnostics['dispose']['result'] = dict(status='threw', exception=dict(type='object'))
                elif mutation == 'witness':
                    evidence['observer_report']['events'].clear()
                elif mutation == 'epoch':
                    evidence['binding']['monitor_epoch'] = 'e' * 48
                else:
                    evidence['root_route_proof']['harness'][-1]['boxtext'] = 'send wrong_channel'
                f.persist_close(prior)
                root_path = f.work / 'observations' / 'retained-lifecycle-root-float-r1.json'
                f.write_bytes(root_path, f.root_paths[2].read_bytes())
                ack_raw = (f.work / 'observations' / 'ack-request-125.json').read_bytes()
                root_raw = root_path.read_bytes()
                f.write_json(f.work / 'observations' / 'validated-close-125.json', dict(
                    close_proof_validated=True, root_raw_path=str(root_path), root_sha256=digest(root_raw),
                    root_bytes=len(root_raw), ack_sha256=digest(ack_raw), ack_bytes=len(ack_raw)))
                with self.assertRaises(ValueError):
                    validate()

    def test_barrier_requires_both_independently_accepted_closes(self):
        for accepted in (0, 1):
            with self.subTest(accepted=accepted), Fixture() as f:
                if accepted:
                    f.accept_close()
                with self.assertRaises(ValueError):
                    lifecycle.validate_barrier(f.work, f.config, f.barrier(), {'int': 2, 'float': 2})

    def test_complete_synchronous_witness_accepts_undefined_root_validity(self):
        with Fixture() as f:
            got = self.close(f)
            self.assertIs(got['close_proof_validated'], True)
            retained = f.work / 'observations' / 'retained-lifecycle-root-float-r1.json'
            original = f.root_paths[2].read_bytes()
            self.assertEqual(retained.read_bytes(), original)
            self.assertEqual(got['root_raw_path'], str(retained))
            self.assertEqual(got['root_sha256'], digest(original))
            self.assertEqual(got['root_bytes'], len(original))
            self.assertEqual(retained.stat().st_mode & 0o777, 0o600)

    def test_delayed_convergence_and_async_witness_are_accepted(self):
        with Fixture() as f:
            for sample in f.ack['close_diagnostics']['samples'][1:5]:
                sample['reader_valid'] = typed(True)
            report = f.evidence()['observer_report']
            report['transitions'][2]['seq'] = 3
            report['events'][0]['seq'] = 4
            f.persist()
            self.assertIs(self.close(f)['close_proof_validated'], True)

    def test_current_firstobject_and_window_unavailability_are_diagnostics(self):
        with Fixture() as f:
            for sample in f.ack['close_diagnostics']['samples'][1:]:
                sample['firstobject'] = dict(status='returned', type='null')
                sample['firstobject_valid'] = None
                for field in ('wind', 'wind_visible', 'wind_assocclass', 'wind_assoc', 'wind_assoc_filepath'):
                    sample[field] = None if field != 'wind' else dict(status='returned', type='null')
            f.persist()
            self.assertIs(self.close(f)['close_proof_validated'], True)

    def test_true_boolean_alone_never_authorizes_close(self):
        self.reject(lambda f: f.ack['close_diagnostics'].pop('lifecycle_evidence'))

    def test_missing_witness_and_live_final_handle_refuse(self):
        self.reject(lambda f: f.evidence()['observer_report']['events'].clear())
        self.reject(lambda f: f.ack['close_diagnostics']['samples'][-1].update(reader_valid=typed(1)))

    def test_revival_after_joint_invalidity_refuses(self):
        self.reject(lambda f: f.ack['close_diagnostics']['samples'][8].update(disposer_valid=typed(1)))

    def test_required_read_types_cannot_be_coerced(self):
        for value in (None, dict(status='threw', exception=dict(type='object')),
                      dict(status='returned', type='undefined'), typed(2),
                      dict(status='returned', type='number', value=True),
                      dict(status='returned', type='boolean', value=1),
                      dict(status='returned', type='number', value=float('nan'))):
            with self.subTest(value=value):
                self.reject(lambda f, v=value: f.ack['close_diagnostics']['samples'][1].update(reader_valid=v))

    def test_retained_firstobject_and_all_originals_are_required(self):
        self.reject(lambda f: f.ack['close_diagnostics']['samples'][0].update(retained_firstobject_valid=typed(0)))
        self.reject(lambda f: f.ack['close_diagnostics']['samples'][4].pop('retained_firstobject_valid'))
        self.reject(lambda f: f.ack['close_diagnostics']['samples'][3]['objects'].pop())
        self.reject(lambda f: f.ack['close_diagnostics']['samples'][4]['harness_objects'].pop())

    def test_complete_ordered_samples_are_required(self):
        self.reject(lambda f: f.ack['close_diagnostics']['samples'].pop())
        self.reject(lambda f: f.ack['close_diagnostics']['samples'][9].update(attempt=True))
        self.reject(lambda f: f.ack['close_diagnostics']['samples'][0].update(phase='poll'))

    def test_sticky_failure_and_invalid_dispose_refuse(self):
        self.reject(lambda f: f.evidence()['observer_report']['failures'].append('fixture-refusal'))
        self.reject(lambda f: f.ack['close_diagnostics']['dispose'].update(attempted=False))
        self.reject(lambda f: f.ack['close_diagnostics']['dispose'].update(
            result=dict(status='threw', exception=dict(type='object'))))

    def test_early_duplicate_wrong_inlet_and_nonbang_events_refuse(self):
        self.reject(lambda f: f.evidence()['observer_report']['events'][0].update(seq=1))
        self.reject(lambda f: f.evidence()['observer_report']['events'].append(
            dict(seq=6, inlet=2, payload_kind='bang', request_id=125, step_id='close-float')))
        self.reject(lambda f: f.evidence()['observer_report']['events'][0].update(inlet=0))
        self.reject(lambda f: f.evidence()['observer_report']['events'][0].update(payload_kind='int'))
        self.reject(lambda f: f.evidence()['observer_report']['events'][0].update(request_id=124))

    def test_control_order_duplicate_dispatch_and_forged_state_refuse(self):
        self.reject(lambda f: f.evidence()['observer_report']['transitions'][1].update(kind='dispatch-return'))
        self.reject(lambda f: f.evidence()['observer_report']['transitions'].append(
            dict(seq=6, kind='dispatch-start', inlet=2, request_id=125, step_id='close-float')))
        self.reject(lambda f: f.evidence()['observer_report']['states'][2].update(witness_count=0))
        self.reject(lambda f: f.evidence()['observer_report'].update(seq=6))

    def test_root_and_driver_exact_text_topology_and_inventory_are_required(self):
        mutations = [
            lambda f: f.evidence()['root_route_proof']['harness'][-1].update(boxtext='send wrong_channel'),
            lambda f: f.evidence()['root_route_proof']['input_routes'].append(
                edge('__alive_numeric_freebang', '__alive_numeric_lifecycle_send')),
            lambda f: f.evidence()['root_route_proof']['output_routes'][0]['source'].update(identity='root/obj-1'),
            lambda f: f.evidence()['root_route_proof']['harness'][2].update(maxclass='button'),
            lambda f: f.evidence()['root_route_proof']['harness'].append(
                copy.deepcopy(f.evidence()['root_route_proof']['harness'][0])),
            lambda f: f.evidence()['driver_route_proof']['boxes'][2].update(boxtext='receive other_channel'),
            lambda f: f.evidence()['driver_route_proof']['input_routes'].append(
                edge('__alive_numeric_controller', '__alive_numeric_lifecycle_receive_2')),
            lambda f: f.evidence()['driver_route_proof']['output_routes'][0]['destination'].update(port=2),
            lambda f: f.evidence()['driver_route_proof']['boxes'][1].update(valid=False),
            lambda f: f.evidence()['driver_route_proof'].update(declared_inlets=True),
        ]
        for mutate in mutations:
            with self.subTest(mutation=mutations.index(mutate)):
                self.reject(mutate)

    def test_source_owner_helper_epoch_and_exact_int_binding_refuse_tampering(self):
        for field, value in (('request_id', True), ('request_id', 124), ('revision', True),
                             ('working_path', 'Z:/other.maxhelp'), ('source_sha256', 'e' * 64),
                             ('observer_helper_sha256', 'f' * 64), ('monitor_epoch', 'f' * 48)):
            with self.subTest(field=field, value=value):
                self.reject(lambda f, k=field, v=value: f.evidence()['binding'].update({k: v}))
        self.reject(lambda f: f.evidence()['root_route_proof'].update(request_id=124))
        self.reject(lambda f: f.command.update(command_id=True))

    def test_unknown_private_fields_refuse(self):
        for target in ('evidence', 'binding', 'root', 'driver', 'report', 'event', 'sample'):
            def mutate(f):
                choices = {'evidence': f.evidence(), 'binding': f.evidence()['binding'],
                           'root': f.evidence()['root_route_proof'], 'driver': f.evidence()['driver_route_proof'],
                           'report': f.evidence()['observer_report'], 'event': f.evidence()['observer_report']['events'][0],
                           'sample': f.ack['close_diagnostics']['samples'][0]}
                choices[target]['unexpected'] = True
            with self.subTest(target=target):
                self.reject(mutate)

    def test_raw_proof_ack_and_sealed_config_are_independently_bound(self):
        with Fixture() as f:
            f.root_paths[2].unlink()
            with self.assertRaises(ValueError):
                self.close(f)
        with Fixture() as f:
            f.write_json(f.root_paths[2], dict(f.evidence()['root_route_proof'], request_id=124))
            with self.assertRaises(ValueError):
                self.close(f)
        with Fixture() as f:
            f.ack['closed_owner_absence_validated'] = False
            with self.assertRaises(ValueError):
                self.close(f)
        with Fixture() as f:
            f.config['lifecycle']['monitor_epoch'] = 'e' * 48
            with self.assertRaises(ValueError):
                self.close(f)

    def test_raw_and_embedded_json_must_preserve_boolean_number_types(self):
        with Fixture() as f:
            changed = copy.deepcopy(f.evidence()['root_route_proof'])
            changed['root_is_top_level'] = 1
            f.write_json(f.root_paths[2], changed)
            with self.assertRaises(ValueError):
                self.close(f)

    def test_event_route_cannot_enter_the_dedicated_control_inlet(self):
        self.reject(lambda f: f.evidence()['driver_route_proof']['output_routes'][0]['destination'].update(port=0))

    def test_proof_path_escape_symlink_and_exclusive_retention_refuse(self):
        self.reject(lambda f: f.evidence().update(root_route_path='Z:/tmp/escaped-proof.json'))
        with Fixture() as f:
            original = f.root_paths[2]
            linked = original.with_suffix('.linked')
            original.rename(linked)
            original.symlink_to(linked)
            with self.assertRaises(ValueError):
                self.close(f)
        with Fixture() as f:
            self.close(f)
            with self.assertRaises(FileExistsError):
                self.close(f)

    def test_final_barrier_accepts_only_closed_revision_one_and_live_revision_two(self):
        for asynchronous in (False, True):
            with self.subTest(asynchronous=asynchronous), Fixture() as f:
                if asynchronous:
                    report = f.evidence()['observer_report']
                    report['transitions'][2]['seq'] = 3
                    report['events'][0]['seq'] = 4
                    f.persist()
                first = f.accept_close()
                first_raw = Path(first['root_raw_path']).read_bytes()
                command, ack = f.second_close()
                second = f.accept_close(command, ack)
                self.assertIs(second['close_proof_validated'], True)
                barrier = f.barrier(ack['close_diagnostics']['lifecycle_evidence']['observer_report'])
                self.assertIsNone(lifecycle.validate_barrier(f.work, f.config, barrier, {'int': 2, 'float': 2}))
                self.assertEqual(Path(first['root_raw_path']).read_bytes(), first_raw)
                self.assertEqual(first['ack_sha256'], digest((f.work / 'observations' / 'ack-request-125.json').read_bytes()))

    def test_barrier_rejects_stale_events_live_owner_events_and_unsealed_reports(self):
        for change in ('stale', 'live', 'unsealed', 'missing-close', 'wrong-live'):
            with self.subTest(change=change), Fixture() as f:
                ack, report, _ = self.accepted_later(f, True)
                expected = {'int': 2, 'float': 2}
                if change in ('stale', 'live'):
                    report['events'].append(dict(seq=12, inlet=2 if change == 'stale' else 1,
                                                 payload_kind='bang', request_id=125, step_id='close-float'))
                elif change == 'unsealed':
                    report['sealed'] = False
                elif change == 'missing-close':
                    report['states'][0].update(state='monitoring', witness_count=0, request_id=0, step_id='')
                else:
                    expected['int'] = True
                f.write_json(f.work / 'observations' / 'ack-request-200.json', ack)
                self.assertIsNotNone(lifecycle, 'independent lifecycle validator is not implemented')
                with self.assertRaises(ValueError):
                    lifecycle.validate_barrier(f.work, f.config, ack, expected)


if __name__ == '__main__':
    unittest.main()
