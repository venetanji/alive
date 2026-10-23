"""Original six-owner proofs, automatic notifications and retained-history fixtures."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent


def load():
    path = ROOT / 'lifecycle.py'
    if not path.exists(): raise AssertionError('Arithmetic six-owner lifecycle implementation is missing')
    spec = importlib.util.spec_from_file_location('synthetic_arithmetic_lifecycle', path)
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result)
    if hasattr(result, '_plus_source_projection'):
        pristine_preflight = result._plus_source_projection

        def synthetic_minimal_preflight(owner, definition):
            # Original generic retention tests predate the complete plus source gate.
            # Substitute only that gate for their exact minimal source identity.
            if (definition.get('basic_anchor') == 'root/synthetic' and
                    definition.get('basic_varname') == 'basic_tab' and
                    [b.get('anchor') for b in definition.get('boxes', [])] == [
                        'root/synthetic/synthetic-value', 'root/synthetic/synthetic-button',
                        'root/synthetic/synthetic-operator'] and
                    not any(any(key.endswith('_policy') for key in b)
                        for view in ('boxes', 'full_inventory') for b in definition.get(view, []))):
                return None
            return pristine_preflight(owner, definition)

        result._plus_source_projection = synthetic_minimal_preflight
        result._real_plus_source_projection = pristine_preflight
    return result


def sha(payload): return hashlib.sha256(payload).hexdigest()
def windows(path): return 'Z:' + str(path)
def valid(value): return dict(status='returned', type='boolean', value=value)
def edge(source, destination, inlet=0):
    return dict(source=dict(identity=source, port=0), destination=dict(identity=destination, port=inlet))


V8_EVIDENCE = dict(
    raw_sha256='b3c8518d4d2930f2d18c3066e9ace27038f7893d4ae3644a6d002d99b56a71d6',
    ack_sha256='ae28ae272f4fe7743c121f5f8aacdc28026e29256bf9b4cdef31c0fa10ad08be',
    config_sha256='a406709cab7224f3d297baa14de204565407e4572eadd6c7c0c3d6166ef46fe5',
    seal_sha256='3ab64f6487e0a5f182acd9623728df66664e355472216fdad98545d9753cf5fa',
    manifest_sha256='357e4296de98f953faae2a17bded5a4df66fe5438ee3b4a23ea5ada00f41260c',
    rea_evidence_id='ev_de849ca377d9aa0cada5598c4443c3f57f501c23b073fa1430f610873112f8cd',
    audit_sha256='0102fdaea0e0ee5bcd2e77217b25aef4c467b53124d27bca3426759f5c9fe1b1')


def original_name(box):
    return '__alive_help_' + box['id'].replace('-', '_')


def complete_basic_definition(definition):
    definition.setdefault('basic_anchor', 'root/synthetic')
    definition['basic_varname'] = 'basic_tab'
    for box in definition['boxes']:
        box.setdefault('id', box['anchor'].rsplit('/', 1)[1])
        box.setdefault('maxclass', 'number'); box.setdefault('runtime_class', 'number')
        box.setdefault('runtime_classes', [box['runtime_class']]); box.setdefault('rect', [10, 20, 30, 15])
        box.setdefault('inlets', 1); box.setdefault('outlets', 1)
        box.setdefault('authored_text', ''); box.setdefault('authored_empty', not bool(box['authored_text']))
        box.setdefault('source_text_sha256', sha(box['authored_text'].encode()))
        box.setdefault('source_box_sha256', sha(('original synthetic ' + box['id']).encode()))
    definition['full_inventory'] = [box for box in definition['full_inventory']
        if not box['anchor'].startswith(definition['basic_anchor'] + '/')] + copy.deepcopy(definition['boxes'])
    definition['observer_leaves'] = [dict(varname='__alive_help_leaf_' + box['id'].replace('-', '_') + '_' + str(port),
        anchor=box['anchor'], port=port) for box in definition['boxes'] for port in range(box['outlets'])]
    if 'saved_edges' not in definition:
        boxes = definition['boxes']
        definition['saved_edges'] = ([dict(source=[boxes[0]['id'], 0], destination=[boxes[1]['id'], 0])] * 2
            if len(boxes) > 1 else [])
        if len(boxes) > 4:
            definition['saved_edges'].append(dict(source=[boxes[3]['id'], 0], destination=[boxes[4]['id'], 0]))


class Evidence:
    def __init__(self, lifecycle, work):
        self.l = lifecycle; self.work = work; work.chmod(0o700)
        (work / 'observations').mkdir(mode=0o700)
        helper = b'// Original synthetic lifecycle observer.\n'
        self.write(work / 'lifecycle-observer.js', helper); self.helper_sha = sha(helper)
        owners, definitions = [], []
        for name in ('times', 'plus', 'minus'):
            for revision in (1, 2):
                inlet = len(owners); working = windows(work / f'{name}-r{revision}.maxhelp')
                owners.append(dict(document=name, revision=revision, source_sha256=lifecycle.ROOT_SOURCES[name],
                    working_path=working, channel='synthetic_channel_' + str(inlet), inlet=inlet,
                    root_proof_path=windows(work / 'observations' / f'lifecycle-root-{name}-r{revision}.json')))
                definitions.append(dict(document=name, revision=revision, source_sha256=lifecycle.ROOT_SOURCES[name],
                    working_windows_path=working, lifecycle_owner_inlet=inlet, helper_sha256=dict(lifecycle.ROOT_HELPERS),
                    basic_anchor='root/synthetic', boxes=[dict(anchor='root/synthetic/' + name) for name in
                        ('synthetic-value', 'synthetic-button', 'synthetic-operator')],
                    full_inventory=[dict(anchor='root/synthetic', maxclass='newobj', runtime_class='patcher',
                        runtime_classes=['patcher', 'p'], rect=[80, 40, 60, 20], source_varname='basic_tab')]))
                complete_basic_definition(definitions[-1])
        inventory = [dict(varname='__alive_arithmetic_controller', maxclass='js', boxtext='js synthetic.js', rect=[0, 0, 80, 20]),
            dict(varname=lifecycle.OBSERVER, maxclass='v8', boxtext='v8 synthetic.js', rect=[0, 30, 80, 20])]
        inventory += [dict(varname='__alive_arithmetic_lifecycle_receive_' + str(o['inlet']), maxclass='receive',
            boxtext='receive ' + o['channel'], rect=[0, 60 + 30 * o['inlet'], 80, 20]) for o in owners]
        self.config = dict(work=str(work), documents=definitions,
            helpers=[dict(name=name, sha256=value) for name, value in lifecycle.ROOT_HELPERS.items()],
            package_sha256={'lifecycle-observer.js': self.helper_sha},
            lifecycle=dict(version='arithmetic-freebang-v1', monitor_epoch='e' * 48,
                observer_path=windows(work / 'lifecycle-observer.js'), report_path=windows(work / 'lifecycle-report.json'),
                driver_inventory=inventory, owners=owners))
        self.json(work / 'config.json', self.config)
        self.json(work / 'seal.json', dict(files={'config.json': sha((work / 'config.json').read_bytes()),
            'lifecycle-observer.js': self.helper_sha}))

    def write(self, path, payload): path.write_bytes(payload); path.chmod(0o600)
    def json(self, path, value): self.write(path, (json.dumps(value, sort_keys=True) + '\n').encode())
    def owner(self, index): return self.config['lifecycle']['owners'][index]
    def step(self, index):
        owner = self.owner(index); return f"close-{owner['document']}-r{owner['revision']}"

    def basic(self, index, request, step):
        owner, definition = self.owner(index), self.config['documents'][index]
        originals = {box['id']: box for box in definition['boxes']}
        boxes = [dict(varname=original_name(box), maxclass='number' if 'v8_numeric_representation_policy' in box
            else box['runtime_class'], rect=copy.deepcopy(box['rect'])) for box in originals.values()]
        boxes.extend(dict(varname=leaf['varname'], maxclass='js', rect=[-100, -100, 40, 20])
            for leaf in definition['observer_leaves'])
        routes = [dict(source=dict(varname=original_name(originals[e['source'][0]]), port=e['source'][1]),
            destination=dict(varname=original_name(originals[e['destination'][0]]), port=e['destination'][1]))
            for e in definition['saved_edges']]
        for leaf in definition['observer_leaves']:
            box = next(b for b in originals.values() if b['anchor'] == leaf['anchor'])
            routes.append(dict(source=dict(varname=original_name(box), port=leaf['port']),
                destination=dict(varname=leaf['varname'], port=0)))
        return dict(version='arithmetic-basic-retention-v1', request_id=request, operation_request_id=request,
            step_id=step, action='close', document=owner['document'], revision=owner['revision'],
            source_sha256=owner['source_sha256'], working_path=owner['working_path'],
            basic_varname=definition['basic_varname'], boxes=boxes, input_routes=routes, output_routes=copy.deepcopy(routes))

    def report(self, count, barrier=False):
        transitions, events, states = [], [], []
        for inlet in range(6):
            state = dict(inlet=inlet, state='monitoring', request_id=0, step_id='', witness_count=0)
            if inlet < count:
                step = self.step(inlet); request = 100 + inlet; start = inlet * 5
                transitions.extend(dict(seq=start + offset, inlet=inlet, kind=kind, request_id=request, step_id=step)
                    for offset, kind in ((1, 'arm'), (2, 'dispatch-start'), (4, 'dispatch-return'), (5, 'close-validated')))
                events.append(dict(seq=start + 3, inlet=inlet, payload_kind='bang', request_id=request, step_id=step))
                state.update(state='closed', request_id=request, step_id=step, witness_count=1)
            states.append(state)
        if barrier: transitions.append(dict(seq=count * 5 + 1, inlet=-1, kind='barrier', request_id=900, step_id='capture-complete'))
        return dict(monitor_epoch='e' * 48, seq=count * 5 + int(barrier), transitions=transitions, events=events,
            states=states, failures=[], sealed=barrier)

    def driver(self):
        routes = [edge('__alive_arithmetic_lifecycle_receive_' + str(i), self.l.OBSERVER, i + 1) for i in range(6)]
        return dict(boxes=[dict(b, valid=True) for b in self.config['lifecycle']['driver_inventory']],
            input_routes=routes, output_routes=copy.deepcopy(routes), declared_inlets=7, declared_outlets=0)

    def close(self, index):
        owner = self.owner(index); request = 100 + index; step = self.step(index)
        command = dict(command_id=request, op='operation', step_id=step, action='close', document=owner['document'],
            action_revision=owner['revision'], source_sha256=owner['source_sha256'])
        harness = [dict(varname=name, maxclass=cls, rect=rect, valid=True,
            boxtext='freebang' if name == self.l.FREEBANG else 'send ' + owner['channel'] if name == self.l.SEND else 'synthetic harness')
            for name, (cls, rect) in self.l.HARNESS.items()]
        routes = [edge(self.l.FREEBANG, self.l.SEND)]
        root = dict(version='arithmetic-freebang-v1', request_id=request, step_id=step, document=owner['document'],
            revision=owner['revision'], source_sha256=owner['source_sha256'], working_path=owner['working_path'],
            root_is_top_level=True, originals=[dict(anchor='root/synthetic', varname='basic_tab', maxclass='patcher', rect=[80, 40, 60, 20])],
            harness=harness, input_routes=routes, output_routes=copy.deepcopy(routes), basic_retention=self.basic(index, request, step))
        samples = [dict(phase='before-dispose' if attempt == 0 else 'poll', attempt=attempt,
            root_valid=dict(status='returned', type='undefined'), reader_valid=valid(attempt == 0),
            disposer_valid=valid(attempt == 0), retained_firstobject_valid=valid(attempt == 0),
            root_filepath=dict(status='returned', type='string', value=owner['working_path']),
            objects=[dict(anchor=b['anchor'], valid=valid(attempt == 0)) for b in self.config['documents'][index]['boxes']],
            harness_objects=[dict(anchor=name, valid=valid(attempt == 0)) for name in (self.l.FREEBANG, self.l.SEND)],
            firstobject=dict(status='returned', type='object'), firstobject_valid=valid(attempt == 0),
            wind=dict(status='returned', type='undefined'), wind_visible=None, wind_assocclass=None,
            wind_assoc=None, wind_assoc_filepath=None) for attempt in range(31)]
        evidence = dict(version='arithmetic-freebang-v1', binding=dict(monitor_epoch='e' * 48, request_id=request,
            step_id=step, action='close', document=owner['document'], revision=owner['revision'], source_sha256=owner['source_sha256'],
            working_path=owner['working_path'], observer_helper_sha256=self.helper_sha),
            root_route_path=owner['root_proof_path'], root_route_proof=root, driver_route_proof=self.driver(),
            observer_report=self.report(index + 1))
        ack = dict(command_id=request, step_id=step, success=True, closed_owner_absence_validated=True,
            close_diagnostics=dict(request_id=request, step_id=step, action='close', document=owner['document'], revision=owner['revision'],
                source_sha256=owner['source_sha256'], working_path=owner['working_path'], helper_sha256=dict(self.l.ROOT_HELPERS),
                samples=samples, dispose=dict(attempted=True, result=dict(status='returned', type='undefined')), lifecycle_evidence=evidence))
        self.persist_close(index, ack)
        return command, ack

    def persist_close(self, index, ack):
        self.json(Path(self.owner(index)['root_proof_path'][2:]), ack['close_diagnostics']['lifecycle_evidence']['root_route_proof'])
        self.json(self.work / 'observations' / f'ack-request-{100 + index}.json', ack)

    def accept(self, index):
        command, ack = self.close(index)
        metadata = self.l.validate_close(self.work, self.config, command, ack)
        self.json(self.work / 'observations' / f'validated-close-{100 + index}.json', metadata)
        return command, ack

    def forge_root(self, index, change):
        owner = self.owner(index)
        ack_path = self.work / 'observations' / f'ack-request-{100 + index}.json'
        ack = json.loads(ack_path.read_bytes()); root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
        change(root); self.persist_close(index, ack)
        retained = self.work / 'observations' / f"retained-lifecycle-root-{owner['document']}-r{owner['revision']}.json"
        self.json(retained, root)
        metadata_path = self.work / 'observations' / f'validated-close-{100 + index}.json'
        metadata = json.loads(metadata_path.read_bytes())
        metadata.update(root_sha256=sha(retained.read_bytes()), root_bytes=retained.stat().st_size,
            ack_sha256=sha(ack_path.read_bytes()), ack_bytes=ack_path.stat().st_size)
        self.json(metadata_path, metadata)

    def barrier(self):
        evidence = dict(command_id=900, success=True, step_id='capture-complete',
            lifecycle_evidence=dict(version='arithmetic-freebang-v1', binding=dict(monitor_epoch='e' * 48,
                request_id=900, step_id='capture-complete', action='lifecycle-barrier', observer_helper_sha256=self.helper_sha),
                driver_route_proof=self.driver(), observer_report=self.report(6, barrier=True)))
        self.json(self.work / 'observations/ack-request-900.json', evidence)
        return evidence


class V8Evidence(Evidence):
    """Original source-shaped fixtures; none of the measured private vectors are used."""
    def __init__(self, lifecycle, work):
        super().__init__(lifecycle, work)
        self.numeric_pins, self.root_pins = {}, {}
        for definition in self.config['documents'][:2]:
            boxes = []
            for index, anchor in enumerate(('root/obj-4/obj-1', 'root/obj-4/obj-24', 'root/obj-4/obj-23')):
                rect = [10 + 30 * index, 50, 25, 15]
                pin = dict(source_box_sha256=str(index + 1) * 64, source_text_sha256=sha(b''),
                    saved_rect_sha256=sha(lifecycle._canonical(rect)),
                    initial_numeric_sha256=sha(lifecycle._canonical([13, 0, 0, 0])))
                self.numeric_pins[anchor] = pin
                policy = dict(kind='times-v8-numeric-representation-v1', engine='v8', document='times',
                    source_sha256=lifecycle.ROOT_SOURCES['times'], anchor=anchor, source_class='flonum',
                    runtime_class='number', **pin, helper_sha256=dict(lifecycle.ROOT_HELPERS), evidence=dict(V8_EVIDENCE),
                    format_method='getattr', format_attribute='format', format_representation='scalar-number', format_value=6,
                    getter_method='getvalueof', getter_representation='scalar-number', finite_required=True,
                    initial_equality_action='install')
                boxes.append(dict(anchor=anchor, maxclass='flonum', runtime_class='flonum', runtime_classes=['flonum'],
                    rect=rect, initial_numeric=13, source_box_sha256=pin['source_box_sha256'],
                    source_text_sha256=pin['source_text_sha256'], v8_numeric_representation_policy=policy))
            boxes.extend(dict(anchor='root/obj-4/synthetic-' + str(index), maxclass='number', runtime_class='number',
                runtime_classes=['number'], rect=[20 * index, 80, 15, 15]) for index in range(4))
            roots = []
            for index, anchor in enumerate(('root/obj-4', 'root/obj-1')):
                saved, live = [80 * index, 40, 60, 20], [80 * index, 40, 60, 22]
                pin = dict(source_box_sha256=str(index + 4) * 64, source_text_sha256=str(index + 6) * 64,
                    saved_rect_sha256=sha(lifecycle._canonical(saved)), live_rect_sha256=sha(lifecycle._canonical(live)))
                self.root_pins[anchor] = pin
                name = 'basic_tab' if index == 0 else 'q_tab'
                policy = dict(kind='times-v8-root-representation-v1', engine='v8', document='times',
                    source_sha256=lifecycle.ROOT_SOURCES['times'], anchor=anchor, source_class='newobj',
                    source_runtime_class='patcher', runtime_class='jpatcher', **pin, saved_rect=saved, live_rect=live,
                    source_varname=name, helper_sha256=dict(lifecycle.ROOT_HELPERS), evidence=dict(V8_EVIDENCE),
                    saved_incoming_routes=0, saved_outgoing_routes=0)
                roots.append(dict(anchor=anchor, maxclass='newobj', runtime_class='patcher', runtime_classes=['patcher', 'p'],
                    rect=saved, source_varname=name, source_box_sha256=pin['source_box_sha256'],
                    source_text_sha256=pin['source_text_sha256'], saved_incoming_routes=0, saved_outgoing_routes=0,
                    v8_root_representation_policy=policy))
            roots.extend(dict(anchor='root/synthetic-' + str(index), maxclass='newobj', runtime_class='js',
                runtime_classes=['js'], rect=[index * 40, 100, 30, 20], source_varname='') for index in range(2))
            definition.update(boxes=boxes, basic_anchor='root/obj-4', full_inventory=roots + copy.deepcopy(boxes))
            definition.pop('saved_edges')
            complete_basic_definition(definition)
        self.json(work / 'config.json', self.config)
        self.json(work / 'seal.json', dict(files={'config.json': sha((work / 'config.json').read_bytes()),
            'lifecycle-observer.js': self.helper_sha}))

    def gates(self):
        return patch.multiple(self.l, NUMERIC_REPRESENTATION_PINS=self.numeric_pins,
            V8_ROOT_REPRESENTATION_PINS=self.root_pins, create=True)

    def close(self, index):
        command, ack = super().close(index)
        if index >= 2:
            return command, ack
        owner, definition = self.owner(index), self.config['documents'][index]
        root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
        roots = [b for b in definition['full_inventory'] if b['anchor'].count('/') == 1]
        root['originals'] = [dict(anchor=b['anchor'], varname=b['source_varname'],
            maxclass='jpatcher' if 'v8_root_representation_policy' in b else b['runtime_class'],
            rect=copy.deepcopy(b['v8_root_representation_policy']['live_rect'] if 'v8_root_representation_policy' in b else b['rect']))
            for b in roots]
        numeric_rows = [dict(anchor=b['anchor'], source_box_sha256=b['source_box_sha256'], source_text_sha256=b['source_text_sha256'],
            source_class='flonum', actual_runtime_class='number', live_rect=copy.deepcopy(b['rect']), candidate_count=1,
            candidate_count_complete=True, geometry_matches=True, receipt_tag_observed=False,
            format_observation=dict(method='getattr', attribute='format', status='returned', representation='scalar-number', value=6),
            value_observation=dict(method='getvalueof', status='returned', representation='scalar-number', value=-5.25 + index))
            for b in definition['boxes'][:3]]
        root_rows = [dict(anchor=b['anchor'], source_box_sha256=b['source_box_sha256'], source_text_sha256=b['source_text_sha256'],
            source_class='newobj', actual_runtime_class='jpatcher', varname=b['source_varname'],
            live_rect=copy.deepcopy(b['v8_root_representation_policy']['live_rect']), candidate_count=1, candidate_count_complete=True)
            for b in roots[:2]]
        coverage = lambda count: dict(complete=True, status='complete', observed_count=count, complete_count=count, limit=count)
        root['v8_representation_witnesses'] = dict(version='times-v8-representation-witnesses-v1', engine='v8',
            request_id=command['command_id'], operation_request_id=command['command_id'], step_id=command['step_id'],
            action='close', action_document='times', action_revision=owner['revision'], document='times', revision=owner['revision'],
            source_sha256=owner['source_sha256'], helper_sha256=dict(self.l.ROOT_HELPERS), working_path=owner['working_path'],
            root_is_top_level=True, receipt_tag_observed=False, evidence=dict(V8_EVIDENCE),
            inventory_coverage=dict(root=coverage(8), numeric=coverage(len(definition['boxes']) + len(definition['observer_leaves']))),
            numeric=numeric_rows, roots=root_rows)
        for sample in ack['close_diagnostics']['samples']:
            sample['objects'] = [dict(anchor=b['anchor'], valid=valid(sample['attempt'] == 0)) for b in definition['boxes']]
        self.persist_close(index, ack)
        return command, ack

    def forge_retained(self, index, change):
        self.forge_root(index, lambda root: change(root['v8_representation_witnesses']))


class PlusV8Evidence(Evidence):
    """Entirely original synthetic state; only public evidence hash vocabulary is reused."""
    def __init__(self, lifecycle, work):
        super().__init__(lifecycle, work)
        self.numeric_pins, self.root_pins, self.geometry_pins = {}, {}, {}
        self.format_value = 17
        self.format_sha = sha(lifecycle._canonical([self.format_value, 0, 0, 0]))
        self.evidence = copy.deepcopy(getattr(lifecycle, 'PLUS_V8_EVIDENCE', {}))
        self.controller_evidence = copy.deepcopy(getattr(lifecycle, 'PLUS_CONTROLLER_EVIDENCE', {}))
        for definition in self.config['documents'][2:4]:
            boxes = []
            identities = ['obj-1', 'obj-24', 'obj-23'] + ['synthetic-' + str(i) for i in range(12)] + ['obj-4']
            for i, identity in enumerate(identities):
                anchor = 'root/obj-2/' + identity
                numeric = i < 3
                rect = [31 * i, 130, 26, 18]
                text = '' if numeric else 'synthetic body ' + str(i)
                box = dict(id=identity, anchor=anchor, maxclass='flonum' if numeric else 'jsui' if i == 15 else 'number',
                    runtime_class='flonum' if numeric else 'jsui' if i == 15 else 'number', rect=rect,
                    inlets=1, outlets=2 if i < 3 else 1, authored_text=text, authored_empty=not bool(text),
                    initial_numeric=29 if numeric else None, role='synthetic-' + str(i),
                    source_text_sha256=sha(text.encode()), source_box_sha256=sha(('synthetic box ' + str(i)).encode()))
                box['runtime_classes'] = [box['runtime_class']]
                if numeric:
                    pin = dict(source_box_sha256=box['source_box_sha256'], source_text_sha256=box['source_text_sha256'],
                        saved_rect_sha256=sha(lifecycle._canonical(rect)), initial_numeric_sha256=sha(lifecycle._canonical([29, 0, 0, 0])))
                    self.numeric_pins[anchor] = pin
                    policy = dict(kind='plus-v8-numeric-representation-v1', engine='v8', document='plus',
                        source_sha256=lifecycle.PLUS_SOURCE, anchor=anchor, source_class='flonum', runtime_class='number',
                        **pin, helper_sha256=dict(lifecycle.ROOT_HELPERS), evidence=copy.deepcopy(self.evidence),
                        format_method='getattr', format_attribute='format', format_representation='scalar-number',
                        format_value_sha256=self.format_sha, getter_method='getvalueof', getter_representation='scalar-number',
                        finite_required=True, initial_equality_action='install')
                    box['v8_numeric_representation_policy'] = policy
                    box['plus_controller_numeric_cohort_policy'] = dict(kind='plus-controller-numeric-cohort-v1',
                        engine='js-controller', document='plus', source_sha256=lifecycle.PLUS_SOURCE, anchor=anchor,
                        source_class='flonum', runtime_class='number', cohort_anchors=list(self.numeric_pins),
                        cohort_binding_sha256=getattr(lifecycle, 'PLUS_CONTROLLER_BINDING', 'a' * 64), **pin,
                        helper_sha256=dict(lifecycle.ROOT_HELPERS), evidence=copy.deepcopy(self.controller_evidence),
                        format_method='getattr', format_attribute='format', format_representation='scalar-number',
                        format_value_sha256=self.format_sha, getter_method='getvalueof', getter_representation='singleton-number-array',
                        finite_required=True, source_initial_equality=True, fresh_complete_cohort_required=True)
                boxes.append(box)
            for box in boxes[:3]:
                box['plus_controller_numeric_cohort_policy']['cohort_anchors'] = list(self.numeric_pins)
            roots = []
            for i in range(4):
                anchor = 'root/obj-' + str(i + 1)
                text = 'synthetic root ' + str(i)
                roots.append(dict(anchor=anchor, maxclass='jsui' if i == 3 else 'newobj',
                    runtime_class='patcher' if i in (1, 2) else 'jsui' if i == 3 else 'js',
                    runtime_classes=['patcher', 'p'] if i in (1, 2) else ['jsui'] if i == 3 else ['js'],
                    rect=[81 * i, 31, 61, 21], child=i in (1, 2),
                    source_varname='basic_tab' if i == 1 else 'q_tab' if i == 2 else None,
                    inlets=1, outlets=1, authored_text=text, authored_empty=False,
                    source_text_sha256=sha(text.encode()), source_box_sha256=sha(('synthetic root box ' + str(i)).encode()),
                    saved_incoming_routes=0, saved_outgoing_routes=0))
            full = copy.deepcopy(roots)
            for box in boxes:
                entry = {k:copy.deepcopy(v) for k, v in box.items() if k not in ('id', 'role', 'initial_numeric')}
                entry.update(child=False, source_varname=None, saved_incoming_routes=0, saved_outgoing_routes=0)
                if box in boxes[:3]: entry['initial_numeric'] = box['initial_numeric']
                full.append(entry)
            for entry in full:
                if entry['anchor'] not in ('root/obj-1', 'root/obj-2', 'root/obj-3', 'root/obj-2/obj-4'): continue
                saved = entry['rect']; live = copy.deepcopy(saved)
                dimension = 2 if entry['runtime_class'] == 'jsui' else 3
                live[dimension] += 2
                pin = dict(source_box_sha256=entry['source_box_sha256'], source_text_sha256=entry['source_text_sha256'],
                    saved_rect_sha256=sha(lifecycle._canonical(saved)), live_rect_sha256=sha(lifecycle._canonical(live)),
                    runtime_class=entry['runtime_class'], changed_dimension=dimension)
                self.geometry_pins[entry['anchor']] = pin
                policy = dict(kind='plus-observed-geometry-v1', document='plus', source_sha256=lifecycle.PLUS_SOURCE,
                    anchor=entry['anchor'], **pin, saved_rect=copy.deepcopy(saved), live_rect=live,
                    helper_sha256=dict(lifecycle.ROOT_HELPERS), evidence=copy.deepcopy(lifecycle.PLUS_EVIDENCE),
                    saved_incoming_routes=0, saved_outgoing_routes=0)
                entry['observed_geometry_policy'] = policy
                if entry['anchor'].startswith('root/obj-2/'):
                    box = next(b for b in boxes if b['anchor'] == entry['anchor'])
                    box.update(observed_geometry_policy=copy.deepcopy(policy), saved_incoming_routes=0, saved_outgoing_routes=0)
                if entry['anchor'] in ('root/obj-2', 'root/obj-3'):
                    root_pin = {k:v for k,v in pin.items() if k not in ('runtime_class', 'changed_dimension')}
                    self.root_pins[entry['anchor']] = root_pin
                    entry['v8_root_representation_policy'] = dict(kind='plus-v8-root-representation-v1', engine='v8',
                        document='plus', source_sha256=lifecycle.PLUS_SOURCE, anchor=entry['anchor'], source_class='newobj',
                        runtime_class='jpatcher', **root_pin, helper_sha256=dict(lifecycle.ROOT_HELPERS), evidence=copy.deepcopy(self.evidence),
                        source_runtime_class='patcher', saved_rect=copy.deepcopy(saved), live_rect=copy.deepcopy(live),
                        source_varname=entry['source_varname'], saved_incoming_routes=0, saved_outgoing_routes=0)
            leaves = [dict(varname='__alive_help_leaf_' + b['id'].replace('-', '_') + '_' + str(port), anchor=b['anchor'], port=port)
                for b in boxes for port in range(b['outlets'])]
            edges = [dict(index=i, source=[boxes[i]['id'], 0], destination=[boxes[i+1]['id'], 0]) for i in range(8)]
            definition.update(basic_anchor='root/obj-2', basic_varname='basic_tab', boxes=boxes, full_inventory=full,
                observer_leaves=leaves, saved_edges=edges)
        definition = self.config['documents'][2]
        box_keys = set(definition['boxes'][3])
        full_keys = set(definition['full_inventory'][-2])
        projection = dict(document='plus', source_sha256=lifecycle.PLUS_SOURCE, helper_sha256=dict(lifecycle.ROOT_HELPERS),
            basic_anchor='root/obj-2', basic_varname='basic_tab', boxes=[{k:b[k] for k in box_keys} for b in definition['boxes']],
            full_inventory=[{k:b[k] for k in full_keys} for b in definition['full_inventory']],
            saved_edges=definition['saved_edges'], observer_leaves=definition['observer_leaves'])
        self.projection_sha = sha(lifecycle._canonical(projection))
        self.reseal()

    def reseal(self):
        self.json(self.work / 'config.json', self.config)
        self.json(self.work / 'seal.json', dict(files={'config.json':sha((self.work / 'config.json').read_bytes()),
            'lifecycle-observer.js':self.helper_sha}))

    def gates(self):
        return patch.multiple(self.l, PLUS_V8_NUMERIC_PINS=self.numeric_pins, PLUS_V8_ROOT_PINS=self.root_pins,
            PLUS_GEOMETRY_PINS=self.geometry_pins, PLUS_V8_PROJECTION_SHA256=self.projection_sha,
            PLUS_V8_FORMAT_SHA256=self.format_sha, create=True)

    def close(self, index):
        command, ack = super().close(index)
        if index not in (2, 3): return command, ack
        owner, definition = self.owner(index), self.config['documents'][index]
        root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
        roots = [b for b in definition['full_inventory'] if b['anchor'].count('/') == 1]
        root['originals'] = [dict(anchor=b['anchor'], varname=b['source_varname'] or '',
            maxclass='jpatcher' if b['anchor'] in self.root_pins else b['runtime_class'],
            rect=copy.deepcopy(b['v8_root_representation_policy']['live_rect'] if b['anchor'] in self.root_pins else b['rect'])) for b in roots]
        numeric_rows = [dict(anchor=b['anchor'], source_box_sha256=b['source_box_sha256'], source_text_sha256=b['source_text_sha256'],
            source_class='flonum', actual_runtime_class='number', live_rect=copy.deepcopy(b['rect']), candidate_count=1,
            candidate_count_complete=True, geometry_matches=True, receipt_tag_observed=False,
            format_observation=dict(method='getattr', attribute='format', status='returned', representation='scalar-number', value=self.format_value),
            value_observation=dict(method='getvalueof', status='returned', representation='scalar-number', value=71.25 + index)) for b in definition['boxes'][:3]]
        root_rows = [dict(anchor=b['anchor'], source_box_sha256=b['source_box_sha256'], source_text_sha256=b['source_text_sha256'],
            source_class='newobj', actual_runtime_class='jpatcher', varname=b['source_varname'],
            live_rect=copy.deepcopy(b['v8_root_representation_policy']['live_rect']), candidate_count=1, candidate_count_complete=True)
            for b in roots if b['anchor'] in self.root_pins]
        coverage = lambda n:dict(complete=True, status='complete', observed_count=n, complete_count=n, limit=n)
        root['v8_representation_witnesses'] = dict(version='plus-v8-representation-witnesses-v1', engine='v8',
            request_id=command['command_id'], operation_request_id=command['command_id'], step_id=command['step_id'], action='close',
            action_document='plus', action_revision=owner['revision'], document='plus', revision=owner['revision'],
            source_sha256=owner['source_sha256'], helper_sha256=dict(self.l.ROOT_HELPERS), working_path=owner['working_path'],
            root_is_top_level=True, receipt_tag_observed=False, evidence=copy.deepcopy(self.evidence),
            inventory_coverage=dict(root=coverage(8), numeric=coverage(35)), numeric=numeric_rows, roots=root_rows)
        self.persist_close(index, ack)
        return command, ack


class LifecycleTests(unittest.TestCase):
    def test_plus_v8_close_accepts_both_owners_evolved_values_and_all_six_histories(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = PlusV8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                for index in range(6):
                    try:
                        _, ack = fixture.accept(index)
                    except ValueError as error:
                        self.fail('Fresh six-owner plus close conjunction refused: ' + str(error))
                    if index in (2, 3):
                        root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
                        witness = root['v8_representation_witnesses']
                        self.assertEqual((len(witness['numeric']), len(witness['roots'])), (3, 2))
                        self.assertEqual(witness['request_id'], 100 + index)
                        self.assertNotEqual(witness['numeric'][0]['value_observation']['value'], 29)
                self.assertIsNone(lifecycle.validate_barrier(fixture.work, fixture.config, fixture.barrier(), {}))

    def test_plus_v8_close_rejects_nested_identity_types_before_normalization(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = PlusV8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                command, ack = fixture.close(2)
                root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
                baseline = copy.deepcopy(fixture.config['documents'][2])
                for target in ('leaf', 'edge-index', 'source-port', 'destination-port', 'box-inlets', 'full-routes'):
                    for value in (0.0, False, '0', None):
                        with self.subTest(target=target, value_type=type(value).__name__):
                            d = copy.deepcopy(baseline)
                            if target == 'leaf': d['observer_leaves'][0]['port'] = value
                            elif target == 'edge-index': d['saved_edges'][0]['index'] = value
                            elif target == 'source-port': d['saved_edges'][0]['source'][1] = value
                            elif target == 'destination-port': d['saved_edges'][0]['destination'][1] = value
                            elif target == 'box-inlets': d['boxes'][0]['inlets'] = value
                            else: d['full_inventory'][0]['saved_incoming_routes'] = value
                            with self.assertRaises(ValueError): lifecycle._root(root, fixture.owner(2), d, 102, command['step_id'])

    def test_plus_v8_old_metadata_refuses_without_synthetic_preflight_substitution(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = Evidence(lifecycle, Path(temporary))
            with self.assertRaises(ValueError):
                lifecycle._real_plus_source_projection(fixture.owner(2), fixture.config['documents'][2])

    def test_plus_v8_all_policy_fields_and_pristine_views_are_independently_bound(self):
        lifecycle = load()
        def corrupt(value):
            if type(value) is bool: return not value
            if type(value) in (int, float): return value + 1
            if type(value) is str: return value + '-corrupt'
            if type(value) is list: return value + ['extra']
            if type(value) is dict: return dict(value, extra=True)
            return 'corrupt'
        with tempfile.TemporaryDirectory() as temporary:
            fixture = PlusV8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                for owner_index in (2, 3):
                    command, ack = fixture.close(owner_index)
                    root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
                    baseline = fixture.config['documents'][owner_index]
                    lifecycle._root(root, fixture.owner(owner_index), baseline, 100 + owner_index, command['step_id'])
                    for view in ('boxes', 'full_inventory'):
                        for index, box in enumerate(baseline[view]):
                            for policy_name in ('v8_numeric_representation_policy', 'v8_root_representation_policy',
                                    'plus_controller_numeric_cohort_policy', 'observed_geometry_policy'):
                                if policy_name not in box: continue
                                policy = box[policy_name]
                                for field in list(policy) + ['missing-policy', 'extra-policy-field']:
                                    with self.subTest(owner=owner_index, view=view, anchor=box['anchor'], policy=policy_name, field=field):
                                        d = copy.deepcopy(baseline); changed = d[view][index]
                                        if field == 'missing-policy': del changed[policy_name]
                                        elif field == 'extra-policy-field': changed[policy_name]['extra'] = True
                                        else: changed[policy_name][field] = corrupt(changed[policy_name][field])
                                        with self.assertRaises(ValueError): lifecycle._root(root, fixture.owner(owner_index), d, 100 + owner_index, command['step_id'])
                    mutations = ('consistent-authored-text', 'consistent-box-hash', 'consistent-ports', 'role', 'leaf-extra',
                        'edge-extra', 'edge-duplicate', 'source-endpoint-extra', 'source-bounds', 'destination-bounds',
                        'leaf-bounds', 'leaf-duplicate', 'box-extra', 'full-extra', 'missing-original', 'missing-root',
                        'transfer-numeric', 'transfer-root', 'numeric-on-leaf', 'root-on-box', 'duplicate-original', 'default-copy')
                    for mutation in mutations:
                        with self.subTest(owner=owner_index, mutation=mutation):
                            d = copy.deepcopy(baseline); b = d['boxes'][3]; full = next(x for x in d['full_inventory'] if x['anchor'] == b['anchor'])
                            if mutation == 'consistent-authored-text':
                                for x in (b, full): x.update(authored_text='other synthetic text', source_text_sha256=sha(b'other synthetic text'))
                            elif mutation == 'consistent-box-hash':
                                for x in (b, full): x['source_box_sha256'] = 'f' * 64
                            elif mutation == 'consistent-ports':
                                for x in (b, full): x['inlets'] += 1
                            elif mutation == 'role': b['role'] = 'other-role'
                            elif mutation == 'leaf-extra': d['observer_leaves'][0]['extra'] = 1
                            elif mutation == 'edge-extra': d['saved_edges'][0]['extra'] = 1
                            elif mutation == 'edge-duplicate': d['saved_edges'][1] = copy.deepcopy(d['saved_edges'][0])
                            elif mutation == 'source-endpoint-extra': d['saved_edges'][0]['source'].append(0)
                            elif mutation == 'source-bounds': d['saved_edges'][0]['source'][1] = 2
                            elif mutation == 'destination-bounds': d['saved_edges'][0]['destination'][1] = 1
                            elif mutation == 'leaf-bounds': d['observer_leaves'][0]['port'] = 2
                            elif mutation == 'leaf-duplicate': d['observer_leaves'][1] = copy.deepcopy(d['observer_leaves'][0])
                            elif mutation == 'box-extra': b['extra'] = 1
                            elif mutation == 'full-extra': full['extra'] = 1
                            elif mutation == 'missing-original': d['boxes'].pop()
                            elif mutation == 'missing-root': d['full_inventory'].pop(0)
                            elif mutation == 'transfer-numeric': b['v8_numeric_representation_policy'] = copy.deepcopy(d['boxes'][0]['v8_numeric_representation_policy'])
                            elif mutation == 'transfer-root': full['v8_root_representation_policy'] = copy.deepcopy(d['full_inventory'][1]['v8_root_representation_policy'])
                            elif mutation == 'numeric-on-leaf': d['observer_leaves'][0]['v8_numeric_representation_policy'] = copy.deepcopy(d['boxes'][0]['v8_numeric_representation_policy'])
                            elif mutation == 'root-on-box': b['v8_root_representation_policy'] = copy.deepcopy(d['full_inventory'][1]['v8_root_representation_policy'])
                            elif mutation == 'duplicate-original': d['boxes'][-1] = copy.deepcopy(d['boxes'][0])
                            elif mutation == 'default-copy': next(x for x in d['full_inventory'] if x['anchor'] == d['boxes'][0]['anchor'])['initial_numeric'] += 1
                            with self.assertRaises(ValueError): lifecycle._root(root, fixture.owner(owner_index), d, 100 + owner_index, command['step_id'])

    def test_plus_v8_witness_exact_schema_bindings_and_capability_shapes(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = PlusV8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                for owner_index in (2, 3):
                    command, ack = fixture.close(owner_index)
                    baseline = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
                    owner, definition = fixture.owner(owner_index), fixture.config['documents'][owner_index]
                    def check(root): lifecycle._root(root, owner, definition, 100 + owner_index, command['step_id'])
                    witness = baseline['v8_representation_witnesses']
                    for field in list(witness) + ['extra', 'missing-witness']:
                        with self.subTest(owner=owner_index, witness_field=field):
                            root = copy.deepcopy(baseline); w = root['v8_representation_witnesses']
                            if field == 'missing-witness': del root['v8_representation_witnesses']
                            elif field == 'extra': w['op'] = 'operation'
                            else: del w[field]
                            with self.assertRaises(ValueError): check(root)
                    for field, value in (('request_id', 52), ('operation_request_id', 51), ('action', 'install'),
                            ('step_id', 'install-plus-r1'), ('action', 'event'), ('step_id', 'plus-A01'),
                            ('revision', 3 - owner['revision']), ('action_revision', True), ('request_id', float(100 + owner_index)),
                            ('working_path', fixture.owner(5 - owner_index)['working_path']), ('root_is_top_level', 1)):
                        with self.subTest(owner=owner_index, field=field, value_type=type(value).__name__):
                            root = copy.deepcopy(baseline); root['v8_representation_witnesses'][field] = value
                            with self.assertRaises(ValueError): check(root)
                    for kind in ('numeric', 'roots'):
                        for row_index, row in enumerate(witness[kind]):
                            for field in list(row) + ['extra', 'duplicate-row']:
                                with self.subTest(owner=owner_index, kind=kind, row=row_index, field=field):
                                    root = copy.deepcopy(baseline); rows = root['v8_representation_witnesses'][kind]
                                    if field == 'extra': rows[row_index]['extra'] = True
                                    elif field == 'duplicate-row': rows[1 - row_index if kind == 'roots' else (row_index + 1) % 3] = copy.deepcopy(rows[row_index])
                                    else: del rows[row_index][field]
                                    with self.assertRaises(ValueError): check(root)
                    for kind in ('root', 'numeric'):
                        for field in ('complete', 'status', 'observed_count', 'complete_count', 'limit', 'extra'):
                            root = copy.deepcopy(baseline); coverage = root['v8_representation_witnesses']['inventory_coverage'][kind]
                            coverage[field] = False if field == 'complete' else 'incomplete' if field == 'status' else 8.0 if kind == 'root' else 35.0
                            with self.subTest(owner=owner_index, coverage=kind, field=field), self.assertRaises(ValueError): check(root)
                    for method in ('format_observation', 'value_observation'):
                        for value in ([17], [17, 18], '17', True, None, float('nan'), float('inf'), float('-inf')):
                            root = copy.deepcopy(baseline); root['v8_representation_witnesses']['numeric'][0][method]['value'] = value
                            with self.subTest(owner=owner_index, method=method, value_type=type(value).__name__), self.assertRaises(ValueError): check(root)
                        for field, value in (('status', 'threw'), ('representation', 'singleton-array'), ('method', 'other'), ('extra', True)):
                            root = copy.deepcopy(baseline); root['v8_representation_witnesses']['numeric'][0][method][field] = value
                            with self.subTest(owner=owner_index, method=method, field=field), self.assertRaises(ValueError): check(root)
                    for kind in ('numeric', 'roots'):
                        for field, value in (('candidate_count', 1.0), ('candidate_count', True), ('candidate_count_complete', 1),
                                ('actual_runtime_class', 'flonum' if kind == 'numeric' else 'patcher')):
                            root = copy.deepcopy(baseline); root['v8_representation_witnesses'][kind][0][field] = value
                            with self.subTest(owner=owner_index, kind=kind, field=field), self.assertRaises(ValueError): check(root)

    def test_plus_v8_fresh_close_command_and_cross_owner_witness_conjunction(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = PlusV8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                fixture.accept(0); fixture.accept(1)
                command, ack = fixture.close(2)
                for field, value in (('op', 'readback'), ('action', 'install'), ('action_revision', 2),
                        ('step_id', 'install-plus-r1'), ('document', 'times'), ('command_id', 52)):
                    changed = dict(command); changed[field] = value
                    with self.subTest(field=field), self.assertRaises(ValueError): lifecycle.validate_close(fixture.work, fixture.config, changed, ack)
                fixture.accept(2)
                command, ack = fixture.close(3)
                previous = json.loads((fixture.work / 'observations/ack-request-102.json').read_bytes())
                ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']['v8_representation_witnesses'] = copy.deepcopy(
                    previous['close_diagnostics']['lifecycle_evidence']['root_route_proof']['v8_representation_witnesses'])
                fixture.persist_close(3, ack)
                with self.assertRaises(ValueError): lifecycle.validate_close(fixture.work, fixture.config, command, ack)

    def test_plus_v8_all_five_retained_witness_rows_are_revalidated_after_digest_rebinding(self):
        lifecycle = load()
        for owner_index in (2, 3):
            for kind, count in (('numeric', 3), ('roots', 2)):
                for row_index in range(count):
                    with self.subTest(owner=owner_index, kind=kind, row=row_index), tempfile.TemporaryDirectory() as temporary:
                        fixture = PlusV8Evidence(lifecycle, Path(temporary))
                        with fixture.gates():
                            for index in range(6): fixture.accept(index)
                            def change(root): root['v8_representation_witnesses'][kind][row_index]['actual_runtime_class'] = 'toggle'
                            fixture.forge_root(owner_index, change)
                            with self.assertRaises(ValueError): lifecycle.validate_barrier(fixture.work, fixture.config, fixture.barrier(), {})

    def test_plus_v8_next_close_revalidates_prior_fresh_witness_after_digest_rebinding(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = PlusV8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                for index in range(3): fixture.accept(index)
                fixture.forge_root(2, lambda root: root['v8_representation_witnesses'].update(operation_request_id=51))
                command, ack = fixture.close(3)
                with self.assertRaises(ValueError): lifecycle.validate_close(fixture.work, fixture.config, command, ack)

    def test_plus_v8_full_retention_coexists_with_five_policy_exception(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = PlusV8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                for owner_index in (2, 3):
                    command, ack = fixture.close(owner_index)
                    baseline = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
                    for mutation in ('ungated-class', 'ungated-geometry', 'missing-original', 'duplicate-original', 'missing-leaf',
                            'leaf-class', 'missing-route', 'extra-route', 'route-port', 'route-port-type', 'route-identity',
                            'missing-root', 'duplicate-root', 'root-class', 'root-name', 'root-geometry', 'harness-class',
                            'harness-duplicate', 'harness-geometry', 'root-route', 'top-level'):
                        with self.subTest(owner=owner_index, mutation=mutation):
                            root = copy.deepcopy(baseline); basic = root['basic_retention']
                            if mutation == 'ungated-class': basic['boxes'][3]['maxclass'] = 'toggle'
                            elif mutation == 'ungated-geometry': basic['boxes'][3]['rect'][0] += 1
                            elif mutation == 'missing-original': basic['boxes'].pop(3)
                            elif mutation == 'duplicate-original': basic['boxes'][3] = copy.deepcopy(basic['boxes'][0])
                            elif mutation == 'missing-leaf': basic['boxes'].pop()
                            elif mutation == 'leaf-class': basic['boxes'][-1]['maxclass'] = 'number'
                            elif mutation == 'missing-route': basic['input_routes'].pop()
                            elif mutation == 'extra-route': basic['output_routes'].append(copy.deepcopy(basic['output_routes'][0]))
                            elif mutation == 'route-port': basic['input_routes'][0]['destination']['port'] = 1
                            elif mutation == 'route-port-type': basic['input_routes'][0]['destination']['port'] = 0.0
                            elif mutation == 'route-identity': basic['output_routes'][0]['destination']['varname'] = 'unknown'
                            elif mutation == 'missing-root': root['originals'].pop()
                            elif mutation == 'duplicate-root': root['originals'][1] = copy.deepcopy(root['originals'][0])
                            elif mutation == 'root-class': root['originals'][0]['maxclass'] = 'jpatcher'
                            elif mutation == 'root-name': root['originals'][0]['varname'] = 'unknown'
                            elif mutation == 'root-geometry': root['originals'][0]['rect'][0] += 1
                            elif mutation == 'harness-class': root['harness'][0]['maxclass'] = 'js'
                            elif mutation == 'harness-duplicate': root['harness'][1] = copy.deepcopy(root['harness'][0])
                            elif mutation == 'harness-geometry': root['harness'][0]['rect'][0] += 1
                            elif mutation == 'root-route': root['output_routes'].clear()
                            elif mutation == 'top-level': root['root_is_top_level'] = False
                            with self.assertRaises(ValueError): lifecycle._root(root, fixture.owner(owner_index), fixture.config['documents'][owner_index], 100 + owner_index, command['step_id'])

    def test_plus_v8_geometry_and_scalar_numeric_equivalence_preserve_strict_identities(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = PlusV8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                for owner_index in (2, 3):
                    command, ack = fixture.close(owner_index)
                    root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
                    definition = copy.deepcopy(fixture.config['documents'][owner_index])
                    for view in ('boxes', 'full_inventory'):
                        for box in definition[view]:
                            box['rect'] = [float(v) for v in box['rect']]
                            if type(box.get('initial_numeric')) is int: box['initial_numeric'] = float(box['initial_numeric'])
                            for key in ('observed_geometry_policy', 'v8_root_representation_policy'):
                                if key in box:
                                    for field in ('saved_rect', 'live_rect'): box[key][field] = [float(v) for v in box[key][field]]
                    for row in root['v8_representation_witnesses']['numeric'] + root['v8_representation_witnesses']['roots']:
                        row['live_rect'] = [float(v) for v in row['live_rect']]
                    for row in root['v8_representation_witnesses']['numeric']: row['format_observation']['value'] = float(fixture.format_value)
                    lifecycle._root(root, fixture.owner(owner_index), definition, 100 + owner_index, command['step_id'])
                    root['v8_representation_witnesses']['numeric'][0]['live_rect'][0] += 1e-12
                    with self.assertRaises(ValueError): lifecycle._root(root, fixture.owner(owner_index), definition, 100 + owner_index, command['step_id'])

    def test_basic_retention_accepts_all_six_owners_with_duplicate_cables(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = V8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                for index in range(6):
                    try:
                        _, ack = fixture.accept(index)
                    except ValueError as error:
                        self.fail('Complete Basic retention was refused: ' + str(error))
                    basic = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']['basic_retention']
                    self.assertEqual(basic['input_routes'][:2], [basic['input_routes'][0]] * 2)
                    self.assertEqual(basic['document'], fixture.owner(index)['document'])
                lifecycle.validate_barrier(fixture.work, fixture.config, fixture.barrier(), {})

    def test_basic_retention_is_mandatory_for_every_owner(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = V8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                for index in range(6):
                    command, ack = fixture.close(index)
                    root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']; del root['basic_retention']
                    with self.subTest(owner=index), self.assertRaises(ValueError):
                        lifecycle._root(root, fixture.owner(index), fixture.config['documents'][index], 100 + index, command['step_id'])

    def test_basic_retention_refuses_inventory_geometry_envelope_and_endpoint_corruption(self):
        lifecycle = load()
        mutations = ('nongated-class', 'gated-class', 'duplicate-original', 'missing-original', 'extra-original',
            'duplicate-leaf', 'missing-leaf', 'extra-leaf', 'leaf-class', 'geometry', 'geometry-bool', 'geometry-infinity',
            'request', 'operation', 'revision', 'document', 'source', 'step', 'action', 'path', 'basic-name', 'extra-field',
            'request-bool', 'revision-bool', 'input-duplicate', 'input-missing', 'output-duplicate', 'output-missing',
            'source-name', 'destination-name', 'source-port', 'destination-port', 'port-bool', 'port-float', 'port-negative')
        with tempfile.TemporaryDirectory() as temporary:
            fixture = V8Evidence(lifecycle, Path(temporary)); command, ack = fixture.close(0)
            root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
            with fixture.gates():
                for mutation in mutations:
                    changed = copy.deepcopy(root); basic = changed['basic_retention']; boxes = basic['boxes']
                    if mutation == 'nongated-class': boxes[3]['maxclass'] = 'toggle'
                    elif mutation == 'gated-class': boxes[0]['maxclass'] = 'flonum'
                    elif mutation == 'duplicate-original': boxes[4]['varname'] = boxes[3]['varname']
                    elif mutation == 'missing-original': boxes.pop(3)
                    elif mutation == 'extra-original': boxes.append(dict(varname='unexpected-original', maxclass='number', rect=[0, 0, 10, 10]))
                    elif mutation == 'duplicate-leaf': boxes[-1]['varname'] = boxes[-2]['varname']
                    elif mutation == 'missing-leaf': boxes.pop()
                    elif mutation == 'extra-leaf': boxes.append(dict(varname='unexpected-leaf', maxclass='js', rect=[0, 0, 10, 10]))
                    elif mutation == 'leaf-class': boxes[-1]['maxclass'] = 'toggle'
                    elif mutation == 'geometry': boxes[3]['rect'][0] += 1e-12
                    elif mutation == 'geometry-bool': boxes[3]['rect'][0] = False
                    elif mutation == 'geometry-infinity': boxes[3]['rect'][0] = float('inf')
                    elif mutation == 'request': basic['request_id'] += 1
                    elif mutation == 'operation': basic['operation_request_id'] += 1
                    elif mutation == 'revision': basic['revision'] = 2
                    elif mutation == 'document': basic['document'] = 'plus'
                    elif mutation == 'source': basic['source_sha256'] = 'f' * 64
                    elif mutation == 'step': basic['step_id'] = 'close-times-r2'
                    elif mutation == 'action': basic['action'] = 'install'
                    elif mutation == 'path': basic['working_path'] += '.other'
                    elif mutation == 'basic-name': basic['basic_varname'] = 'other_tab'
                    elif mutation == 'extra-field': basic['diagnostic_only'] = True
                    elif mutation == 'request-bool': basic['request_id'] = True
                    elif mutation == 'revision-bool': basic['revision'] = True
                    elif mutation == 'input-duplicate': basic['input_routes'].append(copy.deepcopy(basic['input_routes'][0]))
                    elif mutation == 'input-missing': basic['input_routes'].pop(0)
                    elif mutation == 'output-duplicate': basic['output_routes'].append(copy.deepcopy(basic['output_routes'][0]))
                    elif mutation == 'output-missing': basic['output_routes'].pop(0)
                    elif mutation == 'source-name': basic['input_routes'][0]['source']['varname'] = 'unknown'
                    elif mutation == 'destination-name': basic['output_routes'][0]['destination']['varname'] = 'unknown'
                    elif mutation == 'source-port': basic['input_routes'][0]['source']['port'] = 1
                    elif mutation == 'destination-port': basic['output_routes'][0]['destination']['port'] = 1
                    elif mutation == 'port-bool': basic['input_routes'][0]['source']['port'] = False
                    elif mutation == 'port-float': basic['output_routes'][0]['destination']['port'] = 0.0
                    elif mutation == 'port-negative': basic['input_routes'][0]['source']['port'] = -1
                    with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                        lifecycle._root(changed, fixture.owner(0), fixture.config['documents'][0], 100, command['step_id'])

    def test_basic_retention_refuses_corrupt_sealed_source_descriptors(self):
        lifecycle = load()
        mutations = ('source-port-bound', 'destination-port-bound', 'source-port-bool', 'inlets-bool', 'outlets-bool',
            'text', 'empty', 'message', 'full-inventory', 'full-class', 'full-port', 'observer-definition',
            'observer-port-bool', 'duplicate-source', 'source-name-collision', 'container-name', 'container-anchor')
        with tempfile.TemporaryDirectory() as temporary:
            fixture = Evidence(lifecycle, Path(temporary)); command, ack = fixture.close(0)
            root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
            for mutation in mutations:
                definition = copy.deepcopy(fixture.config['documents'][0]); box = definition['boxes'][0]
                full = next(b for b in definition['full_inventory'] if b['anchor'] == box['anchor'])
                if mutation == 'source-port-bound': definition['saved_edges'][0]['source'][1] = box['outlets']
                elif mutation == 'destination-port-bound': definition['saved_edges'][0]['destination'][1] = 1
                elif mutation == 'source-port-bool': definition['saved_edges'][0]['source'][1] = False
                elif mutation == 'inlets-bool': box['inlets'] = full['inlets'] = True
                elif mutation == 'outlets-bool': box['outlets'] = full['outlets'] = True
                elif mutation == 'text': box['authored_text'] = full['authored_text'] = 'changed synthetic text'
                elif mutation == 'empty': box['authored_empty'] = full['authored_empty'] = False
                elif mutation == 'message': box['maxclass'] = full['maxclass'] = 'message'
                elif mutation == 'full-inventory': definition['full_inventory'].remove(full)
                elif mutation == 'full-class': full['runtime_class'] = 'toggle'
                elif mutation == 'full-port': full['outlets'] += 1
                elif mutation == 'observer-definition': definition['observer_leaves'].pop()
                elif mutation == 'observer-port-bool': definition['observer_leaves'][0]['port'] = False
                elif mutation == 'duplicate-source': definition['boxes'].append(copy.deepcopy(box))
                elif mutation == 'source-name-collision': definition['boxes'][1]['id'] = box['id'].replace('-', '_')
                elif mutation == 'container-name': definition['basic_varname'] = 'other_tab'
                elif mutation == 'container-anchor': definition['basic_anchor'] = 'root/missing'
                with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                    lifecycle._root(root, fixture.owner(0), definition, 100, command['step_id'])

    def test_basic_retention_accepts_finite_equal_geometry_spelling(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = Evidence(lifecycle, Path(temporary)); command, ack = fixture.close(0)
            root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
            for box in root['basic_retention']['boxes']:
                box['rect'] = [float(value) for value in box['rect']]
            try:
                lifecycle._root(root, fixture.owner(0), fixture.config['documents'][0], 100, command['step_id'])
            except ValueError as error:
                self.fail('Equivalent Basic geometry spelling was refused: ' + str(error))

    def test_basic_retention_accepts_only_source_bound_measured_geometry(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = Evidence(lifecycle, Path(temporary)); definition = fixture.config['documents'][0]
            saved, live = [7, 11, 33, 19], [7, 11, 35, 19]
            anchor = 'root/synthetic/synthetic-measured'
            pin = dict(runtime_class='jsui', changed_dimension=2, source_box_sha256='a' * 64,
                source_text_sha256=sha(b''), saved_rect_sha256=sha(lifecycle._canonical(saved)),
                live_rect_sha256=sha(lifecycle._canonical(live)))
            policy = dict(kind='times-observed-geometry-v1', document='times', source_sha256=lifecycle.GEOMETRY_SOURCE,
                anchor=anchor, runtime_class='jsui', changed_dimension=2, source_box_sha256=pin['source_box_sha256'],
                source_text_sha256=pin['source_text_sha256'], saved_rect=saved, live_rect=live,
                saved_rect_sha256=pin['saved_rect_sha256'], live_rect_sha256=pin['live_rect_sha256'],
                helper_sha256=dict(lifecycle.ROOT_HELPERS), evidence=dict(lifecycle.GEOMETRY_EVIDENCE),
                saved_incoming_routes=0, saved_outgoing_routes=0)
            definition['boxes'].append(dict(id='synthetic-measured', anchor=anchor, maxclass='jsui', runtime_class='jsui',
                runtime_classes=['jsui'], rect=saved, outlets=0, source_box_sha256=pin['source_box_sha256'],
                source_text_sha256=pin['source_text_sha256'], saved_incoming_routes=0, saved_outgoing_routes=0,
                observed_geometry_policy=policy))
            complete_basic_definition(definition)
            command, ack = fixture.close(0); root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
            measured = next(box for box in root['basic_retention']['boxes'] if box['varname'] == '__alive_help_synthetic_measured')
            measured['rect'] = [float(value) for value in live]
            with patch.object(lifecycle, 'TIMES_GEOMETRY_PINS', {anchor: pin}):
                lifecycle._root(root, fixture.owner(0), definition, 100, command['step_id'])
                measured['rect'][0] += 1e-12
                with self.assertRaises(ValueError):
                    lifecycle._root(root, fixture.owner(0), definition, 100, command['step_id'])

    def test_plus_geometry_has_independent_exact_source_and_evidence_gate(self):
        lifecycle = load()
        self.assertTrue(hasattr(lifecycle, 'PLUS_GEOMETRY_PINS'), 'Independent plus geometry gate missing')
        for index, (anchor, original_pin) in enumerate(lifecycle.PLUS_GEOMETRY_PINS.items()):
            saved = [80 * index, 8, 40, 20]; live = saved[:]; live[original_pin['changed_dimension']] += 2
            pin = dict(original_pin, saved_rect_sha256=sha(lifecycle._canonical(saved)), live_rect_sha256=sha(lifecycle._canonical(live)))
            original = dict(anchor=anchor, maxclass='jsui' if pin['runtime_class'] == 'jsui' else 'newobj',
                runtime_class=pin['runtime_class'], rect=saved, source_box_sha256=pin['source_box_sha256'],
                source_text_sha256=pin['source_text_sha256'], saved_incoming_routes=0, saved_outgoing_routes=0)
            policy = dict(kind='plus-observed-geometry-v1', document='plus', source_sha256=lifecycle.PLUS_SOURCE,
                anchor=anchor, **pin, saved_rect=saved, live_rect=live, helper_sha256=dict(lifecycle.ROOT_HELPERS),
                evidence=dict(lifecycle.PLUS_EVIDENCE), saved_incoming_routes=0, saved_outgoing_routes=0)
            original['observed_geometry_policy'] = policy
            owner = dict(document='plus', source_sha256=lifecycle.PLUS_SOURCE)
            definition = dict(owner, helper_sha256=dict(lifecycle.ROOT_HELPERS))
            with patch.object(lifecycle, 'PLUS_GEOMETRY_PINS', {anchor: pin}):
                self.assertEqual(lifecycle._observed_geometry(owner, definition, original), policy)
                for mutation in ('times', 'minus', 'source', 'helper', 'box', 'text', 'live', 'axis', 'route', 'class', 'source-class', 'evidence'):
                    o, d, b = copy.deepcopy(owner), copy.deepcopy(definition), copy.deepcopy(original)
                    if mutation in ('times', 'minus'): o['document'] = d['document'] = mutation
                    if mutation == 'source': o['source_sha256'] = 'f' * 64
                    if mutation == 'helper': d['helper_sha256']['helpargs.js'] = 'f' * 64
                    if mutation == 'box': b['source_box_sha256'] = 'f' * 64
                    if mutation == 'text': b['source_text_sha256'] = 'f' * 64
                    if mutation == 'live': b['observed_geometry_policy']['live_rect'][pin['changed_dimension']] += .001
                    if mutation == 'axis': b['observed_geometry_policy']['live_rect'][0] += 1
                    if mutation == 'route': b['saved_outgoing_routes'] = 1
                    if mutation == 'class': b['runtime_class'] = 'number'
                    if mutation == 'source-class': b['maxclass'] = 'number'
                    if mutation == 'evidence': b['observed_geometry_policy']['evidence']['audit_sha256'] = 'f' * 64
                    with self.subTest(anchor=anchor, mutation=mutation), self.assertRaises(ValueError):
                        lifecycle._observed_geometry(o, d, b)

    def test_basic_retention_revalidates_all_six_forged_histories_after_digest_rebinding(self):
        lifecycle = load()
        for index in range(6):
            with self.subTest(owner=index), tempfile.TemporaryDirectory() as temporary:
                fixture = V8Evidence(lifecycle, Path(temporary))
                with fixture.gates():
                    for current in range(6): fixture.accept(current)
                    barrier = fixture.barrier()
                    lifecycle.validate_barrier(fixture.work, fixture.config, barrier, {})
                    fixture.forge_root(index, lambda root: root['basic_retention']['boxes'][-1].update(maxclass='toggle'))
                    with self.assertRaises(ValueError): lifecycle.validate_barrier(fixture.work, fixture.config, barrier, {})

    def test_basic_retention_revalidates_prior_graph_at_the_next_close(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = V8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                fixture.accept(0); command, ack = fixture.close(1)
                fixture.forge_root(0, lambda root: root['basic_retention']['output_routes'].pop(0))
                with self.assertRaises(ValueError): lifecycle.validate_close(fixture.work, fixture.config, command, ack)

    def test_v8_close_accepts_actual_classes_and_evolved_values_for_both_times_owners(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = V8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                for index in range(2):
                    try:
                        _, ack = fixture.accept(index)
                    except ValueError as error:
                        self.fail('Exact fresh V8 close witnesses were refused: ' + str(error))
                    root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
                    self.assertEqual([b['maxclass'] for b in root['originals'][:2]], ['jpatcher', 'jpatcher'])
                    self.assertEqual(root['v8_representation_witnesses']['operation_request_id'], 100 + index)

    def test_v8_close_refuses_corrupt_live_witnesses_and_root_originals(self):
        lifecycle = load()
        mutations = ('missing', 'missing-numeric', 'duplicate-numeric', 'missing-root', 'duplicate-root', 'request',
            'operation', 'owner', 'step', 'action', 'path', 'source', 'helper', 'evidence', 'root-inventory',
            'numeric-inventory', 'inventory-count', 'number-class', 'format-shape', 'format-value', 'getter-shape',
            'getter-bool', 'getter-infinity', 'getter-nan', 'geometry', 'geometry-match', 'candidate-count',
            'candidate-complete', 'receipt-tag', 'root-class', 'root-name', 'root-geometry', 'original-class',
            'original-geometry', 'strict-class')
        with tempfile.TemporaryDirectory() as temporary:
            fixture = V8Evidence(lifecycle, Path(temporary)); command, ack = fixture.close(0)
            root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
            with fixture.gates():
                for mutation in mutations:
                    changed = copy.deepcopy(root); witness = changed['v8_representation_witnesses']
                    numeric, gated_root = witness['numeric'][0], witness['roots'][0]
                    if mutation == 'missing': del changed['v8_representation_witnesses']
                    elif mutation == 'missing-numeric': witness['numeric'].pop()
                    elif mutation == 'duplicate-numeric': witness['numeric'][1] = copy.deepcopy(numeric)
                    elif mutation == 'missing-root': witness['roots'].pop()
                    elif mutation == 'duplicate-root': witness['roots'][1] = copy.deepcopy(gated_root)
                    elif mutation == 'request': witness['request_id'] += 1
                    elif mutation == 'operation': witness['operation_request_id'] += 1
                    elif mutation == 'owner': witness['revision'] = witness['action_revision'] = 2
                    elif mutation == 'step': witness['step_id'] = 'close-times-r2'
                    elif mutation == 'action': witness['action'] = 'install'
                    elif mutation == 'path': witness['working_path'] += '.other'
                    elif mutation == 'source': witness['source_sha256'] = 'f' * 64
                    elif mutation == 'helper': witness['helper_sha256']['helpstarter.js'] = 'f' * 64
                    elif mutation == 'evidence': witness['evidence']['audit_sha256'] = 'f' * 64
                    elif mutation == 'root-inventory': witness['inventory_coverage']['root']['status'] = 'incomplete'
                    elif mutation == 'numeric-inventory': witness['inventory_coverage']['numeric']['complete'] = False
                    elif mutation == 'inventory-count': witness['inventory_coverage']['numeric']['complete_count'] -= 1
                    elif mutation == 'number-class': numeric['actual_runtime_class'] = 'flonum'
                    elif mutation == 'format-shape': numeric['format_observation'].update(representation='singleton-array', value=[6])
                    elif mutation == 'format-value': numeric['format_observation']['value'] = 5
                    elif mutation == 'getter-shape': numeric['value_observation'].update(representation='singleton-array', value=[-5.25])
                    elif mutation == 'getter-bool': numeric['value_observation']['value'] = True
                    elif mutation == 'getter-infinity': numeric['value_observation']['value'] = float('inf')
                    elif mutation == 'getter-nan': numeric['value_observation']['value'] = float('nan')
                    elif mutation == 'geometry': numeric['live_rect'][0] += 0.001
                    elif mutation == 'geometry-match': numeric['geometry_matches'] = False
                    elif mutation == 'candidate-count': numeric['candidate_count'] = 2
                    elif mutation == 'candidate-complete': numeric['candidate_count_complete'] = False
                    elif mutation == 'receipt-tag': numeric['receipt_tag_observed'] = True
                    elif mutation == 'root-class': gated_root['actual_runtime_class'] = 'patcher'
                    elif mutation == 'root-name': gated_root['varname'] = 'other_tab'
                    elif mutation == 'root-geometry': gated_root['live_rect'][3] += 0.001
                    elif mutation == 'original-class': changed['originals'][0]['maxclass'] = 'patcher'
                    elif mutation == 'original-geometry': changed['originals'][0]['rect'][3] -= 2
                    elif mutation == 'strict-class': changed['originals'][2]['maxclass'] = 'jpatcher'
                    with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                        lifecycle._root(changed, fixture.owner(0), fixture.config['documents'][0], 100, command['step_id'])

    def test_v8_close_refuses_changed_policy_and_source_descriptors(self):
        lifecycle = load()
        mutations = ('missing-policy', 'duplicate-policy', 'kind', 'evidence', 'policy-helper', 'box', 'text',
            'rect', 'initial', 'source-class', 'source-runtime-class', 'source-runtime-classes', 'definition-helper',
            'root-policy', 'root-saved', 'root-live', 'root-name', 'root-routes', 'transfer')
        with tempfile.TemporaryDirectory() as temporary:
            fixture = V8Evidence(lifecycle, Path(temporary)); command, ack = fixture.close(0)
            root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
            with fixture.gates():
                for mutation in mutations:
                    definition = copy.deepcopy(fixture.config['documents'][0]); box = definition['boxes'][0]
                    policy = box['v8_numeric_representation_policy']; gated_root = definition['full_inventory'][0]
                    if mutation == 'missing-policy': del box['v8_numeric_representation_policy']
                    elif mutation == 'duplicate-policy': definition['boxes'].append(copy.deepcopy(box))
                    elif mutation == 'kind': policy['kind'] = 'generic-v8-numeric'
                    elif mutation == 'evidence': policy['evidence']['raw_sha256'] = 'f' * 64
                    elif mutation == 'policy-helper': policy['helper_sha256']['helpname.js'] = 'f' * 64
                    elif mutation == 'box': box['source_box_sha256'] = 'f' * 64
                    elif mutation == 'text': box['source_text_sha256'] = 'f' * 64
                    elif mutation == 'rect': box['rect'][0] += 0.001
                    elif mutation == 'initial': box['initial_numeric'] += 1
                    elif mutation == 'source-class': box['maxclass'] = 'number'
                    elif mutation == 'source-runtime-class': box['runtime_class'] = 'number'
                    elif mutation == 'source-runtime-classes': box['runtime_classes'] = ['flonum', 'number']
                    elif mutation == 'definition-helper': definition['helper_sha256']['helpargs.js'] = 'f' * 64
                    elif mutation == 'root-policy': gated_root['v8_root_representation_policy']['runtime_class'] = 'patcher'
                    elif mutation == 'root-saved': gated_root['rect'][3] += 0.001
                    elif mutation == 'root-live': gated_root['v8_root_representation_policy']['live_rect'][3] += 0.001
                    elif mutation == 'root-name': gated_root['source_varname'] = 'other_tab'
                    elif mutation == 'root-routes': gated_root['saved_incoming_routes'] = 1
                    elif mutation == 'transfer': definition['document'] = 'plus'
                    with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                        lifecycle._root(root, fixture.owner(0), definition, 100, command['step_id'])

    def test_v8_geometry_accepts_equal_float_spelling_without_allowing_drift(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = V8Evidence(lifecycle, Path(temporary)); command, ack = fixture.close(0)
            root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
            definition = fixture.config['documents'][0]
            for box in definition['boxes']:
                box['rect'] = [float(value) for value in box['rect']]
            for box in definition['full_inventory'][:2]:
                box['rect'] = [float(value) for value in box['rect']]
                box['v8_root_representation_policy']['live_rect'] = [
                    float(value) for value in box['v8_root_representation_policy']['live_rect']]
            with fixture.gates():
                try:
                    lifecycle._root(root, fixture.owner(0), definition, 100, command['step_id'])
                except ValueError as error:
                    self.fail('Equal finite geometry spelling was refused: ' + str(error))
                root['v8_representation_witnesses']['numeric'][0]['live_rect'][0] += 1e-12
                with self.assertRaises(ValueError):
                    lifecycle._root(root, fixture.owner(0), definition, 100, command['step_id'])

    def test_v8_identity_and_count_fields_require_exact_integer_types(self):
        lifecycle = load()
        mutations = ('proof-request', 'request', 'operation', 'revision', 'action-revision', 'definition-owner',
            'definition-revision', 'root-count', 'numeric-count', 'numeric-limit', 'candidate-count', 'root-candidate-count')
        with tempfile.TemporaryDirectory() as temporary:
            fixture = V8Evidence(lifecycle, Path(temporary)); command, ack = fixture.close(0)
            root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
            root['request_id'] = 1
            root['v8_representation_witnesses'].update(request_id=1, operation_request_id=1)
            with fixture.gates():
                for mutation in mutations:
                    changed = copy.deepcopy(root); definition = copy.deepcopy(fixture.config['documents'][0])
                    witness = changed['v8_representation_witnesses']
                    if mutation == 'proof-request': changed['request_id'] = True
                    elif mutation == 'request': witness['request_id'] = True
                    elif mutation == 'operation': witness['operation_request_id'] = True
                    elif mutation == 'revision': witness['revision'] = True
                    elif mutation == 'action-revision': witness['action_revision'] = True
                    elif mutation == 'definition-owner': definition['lifecycle_owner_inlet'] = False
                    elif mutation == 'definition-revision': definition['revision'] = True
                    elif mutation == 'root-count': witness['inventory_coverage']['root']['observed_count'] = 8.0
                    elif mutation == 'numeric-count': witness['inventory_coverage']['numeric']['complete_count'] = float(
                        len(definition['boxes']) + len(definition['observer_leaves']))
                    elif mutation == 'numeric-limit': witness['inventory_coverage']['numeric']['limit'] = float(
                        len(definition['boxes']) + len(definition['observer_leaves']))
                    elif mutation == 'candidate-count': witness['numeric'][0]['candidate_count'] = True
                    elif mutation == 'root-candidate-count': witness['roots'][0]['candidate_count'] = 1.0
                    with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                        lifecycle._root(changed, fixture.owner(0), definition, 1, command['step_id'])

    def test_v8_second_close_rejects_witnesses_reused_from_the_first_owner(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = V8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                _, previous = fixture.accept(0); command, ack = fixture.close(1)
                ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']['v8_representation_witnesses'] = copy.deepcopy(
                    previous['close_diagnostics']['lifecycle_evidence']['root_route_proof']['v8_representation_witnesses'])
                fixture.persist_close(1, ack)
                with self.assertRaises(ValueError): lifecycle.validate_close(fixture.work, fixture.config, command, ack)

    def test_v8_barrier_revalidates_each_forged_retained_witness_after_digest_rebinding(self):
        lifecycle = load()
        for owner_index in range(2):
            for kind, count in (('numeric', 3), ('roots', 2)):
                for row_index in range(count):
                    with self.subTest(owner=owner_index, kind=kind, row=row_index), tempfile.TemporaryDirectory() as temporary:
                        fixture = V8Evidence(lifecycle, Path(temporary))
                        with fixture.gates():
                            for index in range(6): fixture.accept(index)
                            barrier = fixture.barrier()
                            lifecycle.validate_barrier(fixture.work, fixture.config, barrier, {})
                            fixture.forge_retained(owner_index,
                                lambda w: w[kind][row_index].update(candidate_count_complete=False))
                            with self.assertRaises(ValueError): lifecycle.validate_barrier(fixture.work, fixture.config, barrier, {})

    def test_v8_close_revalidates_forged_prior_witness_after_digest_rebinding(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = V8Evidence(lifecycle, Path(temporary))
            with fixture.gates():
                fixture.accept(0); command, ack = fixture.close(1)
                fixture.forge_retained(0, lambda w: w['numeric'][0]['format_observation'].update(value=5))
                with self.assertRaises(ValueError): lifecycle.validate_close(fixture.work, fixture.config, command, ack)

    def test_observed_times_root_geometry_is_hash_bound_without_class_alias(self):
        lifecycle = load()
        self.assertTrue(hasattr(lifecycle, 'TIMES_GEOMETRY_PINS'), 'Independent measured lifecycle geometry gate missing')
        with tempfile.TemporaryDirectory() as temporary:
            fixture = Evidence(lifecycle, Path(temporary)); command, ack = fixture.close(0)
            owner = fixture.owner(0); definition = fixture.config['documents'][0]
            root = ack['close_diagnostics']['lifecycle_evidence']['root_route_proof']
            saved, live = [4, 8, 40, 20], [4, 8, 40, 22]
            pin = dict(runtime_class='js', changed_dimension=3, source_box_sha256='a' * 64,
                source_text_sha256='b' * 64, saved_rect_sha256=sha(lifecycle._canonical(saved)),
                live_rect_sha256=sha(lifecycle._canonical(live)))
            policy = dict(kind='times-observed-geometry-v1', document='times', source_sha256=lifecycle.GEOMETRY_SOURCE,
                anchor='root/obj-3', runtime_class='js', changed_dimension=3, source_box_sha256='a' * 64,
                source_text_sha256='b' * 64, saved_rect=saved, live_rect=live,
                saved_rect_sha256=pin['saved_rect_sha256'], live_rect_sha256=pin['live_rect_sha256'],
                helper_sha256=dict(lifecycle.ROOT_HELPERS), evidence=dict(lifecycle.GEOMETRY_EVIDENCE),
                saved_incoming_routes=0, saved_outgoing_routes=0)
            definition['full_inventory'].insert(0, dict(anchor='root/obj-3', maxclass='newobj', runtime_class='js',
                runtime_classes=['js'], rect=saved, source_varname=None, source_box_sha256='a' * 64,
                source_text_sha256='b' * 64, saved_incoming_routes=0, saved_outgoing_routes=0,
                observed_geometry_policy=policy))
            root['originals'].insert(0, dict(anchor='root/obj-3', varname='', maxclass='js', rect=live))
            with patch.object(lifecycle, 'TIMES_GEOMETRY_PINS', {'root/obj-3': pin}):
                lifecycle._root(root, owner, definition, 100, command['step_id'])
                equivalent = copy.deepcopy(definition)
                equivalent['full_inventory'][0]['rect'] = [float(value) for value in saved]
                try:
                    lifecycle._root(root, owner, equivalent, 100, command['step_id'])
                except ValueError as error:
                    self.fail('Equal observed geometry spelling was refused: ' + str(error))
                for mutation in ('alias', 'axis', 'evidence', 'box'):
                    changed = copy.deepcopy(root); altered = copy.deepcopy(definition)
                    if mutation == 'alias': changed['originals'][0]['maxclass'] = 'jpatcher'
                    if mutation == 'axis': changed['originals'][0]['rect'][2] += 1
                    if mutation == 'evidence': altered['full_inventory'][0]['observed_geometry_policy']['evidence']['ack_sha256'] = 'f' * 64
                    if mutation == 'box': altered['full_inventory'][0]['source_box_sha256'] = 'f' * 64
                    with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                        lifecycle._root(changed, owner, altered, 100, command['step_id'])

    def test_every_revision_closes_and_empty_final_barrier_replays_all_retained_evidence(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = Evidence(lifecycle, Path(temporary))
            for index in range(6): fixture.accept(index)
            barrier = fixture.barrier(); lifecycle.validate_barrier(fixture.work, fixture.config, barrier, {})
            with self.assertRaises(ValueError): lifecycle.validate_barrier(fixture.work, fixture.config, barrier, {'minus': 2})
            previous = fixture.work / 'observations/ack-request-100.json'
            payload = json.loads(previous.read_bytes()); payload['closed_owner_absence_validated'] = False
            fixture.json(previous, payload)
            with self.assertRaises(ValueError): lifecycle.validate_barrier(fixture.work, fixture.config, barrier, {})

    def test_second_revision_and_retained_history_reject_each_independent_close_failure(self):
        lifecycle = load()
        for mutation in ('ack', 'witness', 'duplicate', 'wrong-owner', 'route', 'revival', 'topology', 'class', 'geometry', 'history'):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as temporary:
                fixture = Evidence(lifecycle, Path(temporary)); fixture.accept(0); command, ack = fixture.close(1)
                evidence = ack['close_diagnostics']['lifecycle_evidence']
                if mutation == 'ack': ack['success'] = False
                if mutation == 'witness': evidence['observer_report']['events'][-1]['payload_kind'] = 'int'
                if mutation == 'duplicate': evidence['observer_report']['events'].append(copy.deepcopy(evidence['observer_report']['events'][-1]))
                if mutation == 'wrong-owner': command['action_revision'] = 1
                if mutation == 'route': evidence['driver_route_proof']['output_routes'].pop()
                if mutation == 'revival': ack['close_diagnostics']['samples'][-1]['reader_valid'] = valid(True)
                if mutation == 'topology': evidence['root_route_proof']['input_routes'].append(copy.deepcopy(evidence['root_route_proof']['input_routes'][0]))
                if mutation == 'class': evidence['root_route_proof']['originals'][0]['maxclass'] = 'jpatcher'
                if mutation == 'geometry': evidence['root_route_proof']['originals'][0]['rect'][3] = 22
                if mutation == 'history': (fixture.work / 'observations/validated-close-100.json').unlink()
                fixture.persist_close(1, ack)
                with self.assertRaises(ValueError): lifecycle.validate_close(fixture.work, fixture.config, command, ack)

    def test_configuration_refuses_extra_owner_and_duplicate_source_revision(self):
        lifecycle = load()
        with tempfile.TemporaryDirectory() as temporary:
            fixture = Evidence(lifecycle, Path(temporary)); command, ack = fixture.close(0)
            fixture.config['documents'][-1] = copy.deepcopy(fixture.config['documents'][0])
            fixture.json(fixture.work / 'config.json', fixture.config)
            fixture.json(fixture.work / 'seal.json', dict(files={'config.json': sha((fixture.work / 'config.json').read_bytes()),
                'lifecycle-observer.js': fixture.helper_sha}))
            with self.assertRaises(ValueError): lifecycle.validate_close(fixture.work, fixture.config, command, ack)


if __name__ == '__main__': unittest.main()
