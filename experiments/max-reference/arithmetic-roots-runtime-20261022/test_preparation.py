"""Portable original fixtures plus explicitly optional private capture007 tests."""
from collections import Counter
import copy
import hashlib
import importlib.util
import json
import io
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from contextlib import ExitStack, contextmanager, redirect_stderr, redirect_stdout
from functools import wraps

ROOT = Path(__file__).resolve().parent


def module(name):
    path = ROOT / (name + '.py')
    if not path.is_file():
        raise AssertionError('Finite arithmetic ' + name + ' implementation is missing')
    spec = importlib.util.spec_from_file_location('arithmetic_test_' + name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def synthetic_checkpoint(n):
    boxes = []
    classes = ['number'] * 4 + ['flonum'] * 3 + ['button', 'newobj', 'newobj']
    for index, cls in enumerate(classes):
        boxes.append(dict(id='synthetic-' + str(index), anchor='root/synthetic/' + str(index),
            maxclass=cls, runtime_class='*' if cls == 'newobj' else cls,
            runtime_classes=['*'] if cls == 'newobj' else [cls],
            rect=[index * 60, 80, 40, 20], outlets=2 if cls in n.NUMERIC else 1,
            authored_text='', authored_empty=True, initial_numeric=13 if cls in n.NUMERIC else None))
    document = dict(document='times', source_sha256=n.IDENTITIES['times'], revision=1,
        working_windows_path='Z:/private/synthetic.maxhelp', boxes=boxes, saved_edges=[])
    document['observer_leaves'] = n.observer_definitions(document)
    raw_boxes = [dict(varname=n.original_varname(b), maxclass=b['runtime_class'], rect=b['rect'][:]) for b in boxes]
    raw_boxes += [dict(varname=leaf['varname'], maxclass='js', rect=[-100, -100, 40, 20])
        for leaf in document['observer_leaves']]
    routes = []
    for leaf in document['observer_leaves']:
        source = next(b for b in boxes if b['anchor'] == leaf['anchor'])
        routes.append(dict(source=dict(varname=n.original_varname(source), port=leaf['port']),
            destination=dict(varname=leaf['varname'], port=0)))
    numeric = [dict(anchor=b['anchor'], class_name=b['maxclass'], value=13,
        semantic_tag='float' if b['maxclass'] == 'flonum' else 'int',
        semantic_tag_basis='flonum-class' if b['maxclass'] == 'flonum' else 'number-class',
        getter_method='getvalueof', getter_representation='scalar-number') for b in boxes if b['maxclass'] in n.NUMERIC]
    raw = dict(success=True, readback_method='v8-numeric-getvalueof', request_id=7, step_id='synthetic',
        document='times', source_sha256=n.IDENTITIES['times'], revision=1, action='event',
        working_root_path=document['working_windows_path'], root_is_top_level=True, saved_order_observed=False,
        boxes=raw_boxes, messages=[], numeric=numeric, input_routes=copy.deepcopy(routes), output_routes=routes)
    return document, raw


def synthetic_source(n, document='times'):
    def box(identity, cls, index, **extra):
        return dict(id=identity, maxclass=cls, patching_rect=[index * 80, 40, 60, 20],
            numinlets=1, numoutlets=2 if cls in n.NUMERIC else 0, **extra)
    basic = []
    for index, (role, (identity, cls)) in enumerate(n.ROLES.items()):
        extra = {}
        if cls == 'newobj': extra['text'] = n.CLASSES[document] + (' 91827' if role == 'integer_operator' else ' 91827.25')
        if cls == 'flonum': extra['format'] = 6
        b = box(identity, cls, index, **extra)
        if cls in {'newobj', 'button'}: b['numoutlets'] = 1
        basic.append(dict(box=b))
    for index in range(4): basic.append(dict(box=box('synthetic-comment-' + str(index), 'comment', 10 + index)))
    for index, (identity, filename) in enumerate(((n.HELPER_ANCHORS[document][2].rsplit('/', 1)[1], 'helpdetails.js'),
            (n.HELPER_ANCHORS[document][3].rsplit('/', 1)[1], 'helpargs.js'))):
        b = box(identity, 'jsui', 14 + index, filename=filename, jsarguments=['synthetic'], border=0, ignoreclick=1, parameter_enable=0)
        b.update(numoutlets=1, outlettype=['']); basic.append(dict(box=b))
    lines = [dict(patchline=dict(source=[basic[index]['box']['id'], 0],
        destination=[basic[index + 1]['box']['id'], 0])) for index in range(8)]
    starter = box(n.HELPER_ANCHORS[document][0].rsplit('/', 1)[1], 'newobj', 1, text='js helpstarter.js synthetic',
        saved_object_attributes=dict(filename='helpstarter.js', parameter_enable=0))
    starter.update(numoutlets=1, outlettype=[''])
    name = box(n.HELPER_ANCHORS[document][1].rsplit('/', 1)[1], 'jsui', 2, filename='helpname.js', jsarguments=['synthetic'], border=0, ignoreclick=1, parameter_enable=0)
    name.update(numoutlets=1, outlettype=[''])
    root = dict(boxes=[dict(box=box(n.QUESTION[document].rsplit('/', 1)[1], 'newobj', 3, text='p synthetic_question', varname='q_tab', patcher=dict(boxes=[], lines=[]))),
        dict(box=box(n.BASIC[document].rsplit('/', 1)[1], 'newobj', 4, text='p synthetic_basic', varname='basic_tab', patcher=dict(boxes=basic, lines=lines))),
        dict(box=starter), dict(box=name)], lines=[])
    return root


def v8_fixture(n):
    document, raw = synthetic_checkpoint(n)
    document.update(helper_sha256=dict(n.HELPERS), lifecycle_owner_inlet=0)
    for b in document['boxes']: b['inlets'] = 1
    raw.update(step_id='times-A01', operation_request_id=6, action_document='times', action_revision=1)
    numeric_pins, root_pins = {}, {}
    for index, anchor in enumerate(('root/obj-4/obj-1', 'root/obj-4/obj-24', 'root/obj-4/obj-23')):
        box = document['boxes'][index + 4]; previous = box['anchor']; box['anchor'] = anchor
        box.update(source_box_sha256=str(index + 1) * 64, source_text_sha256=hashlib.sha256(b'').hexdigest())
        pin = dict(source_box_sha256=box['source_box_sha256'], source_text_sha256=box['source_text_sha256'],
            saved_rect_sha256=n.geometry_vector_digest(box['rect']),
            initial_numeric_sha256=n.geometry_vector_digest([13, 0, 0, 0]))
        numeric_pins[anchor] = pin
        box['v8_numeric_representation_policy'] = dict(kind='times-v8-numeric-representation-v1', engine='v8',
            document='times', source_sha256=n.GEOMETRY_SOURCE, anchor=anchor, source_class='flonum', runtime_class='number',
            **pin, helper_sha256=dict(n.HELPERS), evidence=dict(n.V8_REPRESENTATION_EVIDENCE),
            format_method='getattr', format_attribute='format', format_representation='scalar-number', format_value=6,
            getter_method='getvalueof', getter_representation='scalar-number', finite_required=True,
            initial_equality_action='install')
        value = next(v for v in raw['numeric'] if v['anchor'] == previous)
        value.update(anchor=anchor, class_name='number', source_class='flonum',
            semantic_tag_basis='source-flonum-and-live-v8-format6')
        raw['boxes'][index + 4]['maxclass'] = 'number'
    # Observer identities depend on anchors; rebuild the complete leaf/routes fixture.
    document['observer_leaves'] = n.observer_definitions(document)
    raw['boxes'] = raw['boxes'][:10] + [dict(varname=leaf['varname'], maxclass='js', rect=[-100, -100, 40, 20])
        for leaf in document['observer_leaves']]
    raw['input_routes'] = [dict(source=dict(varname=n.original_varname(next(b for b in document['boxes'] if b['anchor'] == leaf['anchor'])), port=leaf['port']),
        destination=dict(varname=leaf['varname'], port=0)) for leaf in document['observer_leaves']]
    raw['output_routes'] = copy.deepcopy(raw['input_routes'])
    roots = []
    for index, anchor in enumerate(('root/obj-4', 'root/obj-1')):
        saved, live = [80 * index, 40, 60, 20], [80 * index, 40, 60, 22]
        pin = dict(source_box_sha256=str(index + 4) * 64, source_text_sha256=str(index + 6) * 64,
            saved_rect_sha256=n.geometry_vector_digest(saved), live_rect_sha256=n.geometry_vector_digest(live))
        root_pins[anchor] = pin
        box = dict(anchor=anchor, maxclass='newobj', runtime_class='patcher', runtime_classes=['patcher', 'p'],
            source_varname='basic_tab' if index == 0 else 'q_tab', rect=saved,
            source_box_sha256=pin['source_box_sha256'], source_text_sha256=pin['source_text_sha256'],
            saved_incoming_routes=0, saved_outgoing_routes=0)
        box['v8_root_representation_policy'] = dict(kind='times-v8-root-representation-v1', engine='v8', document='times',
            source_sha256=n.GEOMETRY_SOURCE, anchor=anchor, source_class='newobj', source_runtime_class='patcher',
            runtime_class='jpatcher', **pin, saved_rect=saved, live_rect=live, source_varname=box['source_varname'],
            helper_sha256=dict(n.HELPERS), evidence=dict(n.V8_REPRESENTATION_EVIDENCE),
            saved_incoming_routes=0, saved_outgoing_routes=0)
        roots.append(box)
    document['full_inventory'] = roots + copy.deepcopy(document['boxes'])
    coverage = lambda count: dict(complete=True, status='complete', observed_count=count, complete_count=count, limit=count)
    numeric = [dict(anchor=b['anchor'], source_box_sha256=b['source_box_sha256'], source_text_sha256=b['source_text_sha256'],
        source_class='flonum', actual_runtime_class='number', live_rect=b['rect'], candidate_count=1,
        candidate_count_complete=True, geometry_matches=True, receipt_tag_observed=False,
        format_observation=dict(method='getattr', attribute='format', status='returned', representation='scalar-number', value=6),
        value_observation=dict(method='getvalueof', status='returned', representation='scalar-number', value=13))
        for b in document['boxes'] if 'v8_numeric_representation_policy' in b]
    root_rows = [dict(anchor=b['anchor'], source_box_sha256=b['source_box_sha256'], source_text_sha256=b['source_text_sha256'],
        source_class='newobj', actual_runtime_class='jpatcher', varname=b['source_varname'],
        live_rect=b['v8_root_representation_policy']['live_rect'], candidate_count=1, candidate_count_complete=True) for b in roots]
    raw['v8_representation_witnesses'] = dict(version='times-v8-representation-witnesses-v1', engine='v8',
        request_id=7, operation_request_id=6, step_id='times-A01', action='event', action_document='times', action_revision=1,
        document='times', revision=1, source_sha256=n.GEOMETRY_SOURCE, helper_sha256=dict(n.HELPERS),
        working_path=document['working_windows_path'], root_is_top_level=True, receipt_tag_observed=False,
        evidence=dict(n.V8_REPRESENTATION_EVIDENCE),
        inventory_coverage=dict(root=coverage(8), numeric=coverage(len(document['boxes']) + len(document['observer_leaves']))),
        numeric=numeric, roots=root_rows)
    return document, raw, numeric_pins, root_pins


@contextmanager
def capture006_fixture(n):
    """Complete synthetic evidence; mutation tests rebind hashes to reach parser guards."""
    with tempfile.TemporaryDirectory() as temporary, ExitStack() as patches:
        base = Path(temporary); work = base / '.cache/alive-ultra-evidence/arithmetic-max-runtime-006'
        history = base / '.cache/alive-ultra-evidence/arithmetic-package-006-historical'
        package = base / 'package'; repo = base / 'repo'
        for path in (work, history, package, repo): path.mkdir(parents=True, mode=0o700)
        root = synthetic_source(n, 'plus')
        def float_rectangles(patcher):
            for item in patcher['boxes']:
                box=item['box']; box['patching_rect']=[float(value) for value in box['patching_rect']]
                if 'patcher' in box: float_rectangles(box['patcher'])
        float_rectangles(root); source = n.canonical(dict(patcher=root))
        source_sha = hashlib.sha256(source).hexdigest(); helper_payload = b'Synthetic helper.'
        helper_sha = hashlib.sha256(helper_payload).hexdigest(); helpers = {name: helper_sha for name in n.HELPERS}
        for name, value in [('ROOT', package), ('REPO', repo), ('PLUS_SOURCE', source_sha), ('HELPERS', helpers)]:
            patches.enter_context(patch.object(n, name, value))
        patches.enter_context(patch.object(Path, 'home', return_value=base))
        argument = hashlib.sha256(b'synthetic').hexdigest()
        patches.enter_context(patch.dict(n.HELPER_ARGUMENT_HASHES, plus=(argument, argument)))
        patches.enter_context(patch.dict(n.STARTER_HASHES, plus=hashlib.sha256(b'js helpstarter.js synthetic').hexdigest()))
        patches.enter_context(patch.dict(n.OPERATOR_HASHES, plus=[hashlib.sha256(s.encode()).hexdigest() for s in ('+ 91827', '+ 91827.25')]))
        helper_rows = [dict(name=name, sha256=sha, bytes=len(helper_payload), path='help/resources/' + name) for name, sha in helpers.items()]
        boxes, inventory, edges = n.source_inventory('plus', root, helper_rows)
        numeric = {}; geometry = {}; geo_policies = {}
        for entry in inventory:
            anchor = entry['anchor']
            if anchor in n.PLUS_NUMERIC_PINS:
                numeric[anchor] = dict(source_box_sha256=entry['source_box_sha256'], source_text_sha256=entry['source_text_sha256'],
                    saved_rect_sha256=n.geometry_vector_digest(entry['rect']), initial_numeric_sha256=n.geometry_vector_digest([0, 0, 0, 0]))
            if anchor in n.PLUS_GEOMETRY_PINS:
                live = entry['rect'][:]; old = n.PLUS_GEOMETRY_PINS[anchor]; live[old['changed_dimension']] += 2
                geometry[anchor] = dict(old, source_box_sha256=entry['source_box_sha256'], source_text_sha256=entry['source_text_sha256'],
                    saved_rect_sha256=n.geometry_vector_digest(entry['rect']), live_rect_sha256=n.geometry_vector_digest(live))
                geo_policies[anchor] = dict(kind='plus-observed-geometry-v1', document='plus', source_sha256=source_sha,
                    anchor=anchor, **geometry[anchor], saved_rect=entry['rect'], live_rect=live, helper_sha256=helpers,
                    evidence=dict(n.PLUS_EVIDENCE), saved_incoming_routes=0, saved_outgoing_routes=0)
        geometry = {anchor:geometry[anchor] for anchor in n.PLUS_GEOMETRY_PINS}
        for name, value in [('PLUS_NUMERIC_PINS', {a: {k:v for k,v in p.items() if k != 'initial_numeric_sha256'} for a,p in numeric.items()}),
                ('PLUS_CONTROLLER_COHORT_PINS', numeric), ('PLUS_GEOMETRY_PINS', geometry),
                ('PLUS_CONTROLLER_COHORT_FORMAT_SHA256', n.geometry_vector_digest([6, 0, 0, 0]))]:
            patches.enter_context(patch.object(n, name, value))
        cohort_binding = hashlib.sha256(n.canonical([dict(anchor=a, source_box_sha256=p['source_box_sha256'],
            source_text_sha256=p['source_text_sha256']) for a,p in numeric.items()])).hexdigest()
        patches.enter_context(patch.object(n, 'PLUS_CONTROLLER_COHORT_BINDING', cohort_binding))
        for entry in boxes + inventory:
            if entry['anchor'] in geo_policies:
                entry.update(observed_geometry_policy=copy.deepcopy(geo_policies[entry['anchor']]), saved_incoming_routes=0, saved_outgoing_routes=0)
        definition = dict(document='plus', revision=1, source_sha256=source_sha, helper_sha256=helpers,
            pristine_path=str(work / 'pristine/plus-r1.maxhelp'), working_path=str(work / 'working/plus-r1.maxhelp'),
            working_windows_path=n.windows_path(work / 'working/plus-r1.maxhelp'), boxes=boxes, full_inventory=inventory,
            saved_edges=edges, lifecycle_owner_inlet=2)
        package_names = tuple(n.PACKAGE_FILES) + ('compare.py', 'native_score.py', 'run-runtime.py', 'test_comparison.py', 'test_native_score.py', 'test_runner.py')
        history_files = {}
        for name in package_names:
            n.retain_raw(history / name, ('Synthetic ' + name).encode()); history_files[name] = n.digest(history / name)
        package_files = {name: history_files[name] for name in n.PACKAGE_FILES}
        binding = dict(package_files=package_files, package_sha256=hashlib.sha256(n.canonical(package_files)).hexdigest())
        historical = dict(schema_version=1, role='final006-historical-not-yet-executed', files=history_files,
            package_sha256=binding['package_sha256'], score_sha256=n.SCORE_SHA256,
            fix1_report_sha256='a' * 64, fix1_review_map_sha256='b' * 64)
        n.write_json(history / 'binding.json', historical)
        epoch='c'*48; owners=[]
        for document in ('times','plus','minus'):
            for revision in (1,2):
                inlet=len(owners); owners.append(dict(document=document, revision=revision, inlet=inlet,
                    source_sha256=source_sha if document=='plus' else n.IDENTITIES[document],
                    working_path=n.windows_path(work/'working'/f'{document}-r{revision}.maxhelp'),
                    channel='__alive_arithmetic_lifecycle_'+epoch+'_'+str(inlet),
                    root_proof_path=n.windows_path(work/'observations'/f'lifecycle-root-{document}-r{revision}.json')))
        driver_inventory=[dict(varname='__alive_arithmetic_controller', maxclass='js', boxtext='js controller.js synthetic', rect=[20,20,350,50]),
            dict(varname='__alive_arithmetic_lifecycle_observer', maxclass='v8', boxtext='v8 lifecycle-observer.js synthetic', rect=[-2000,-2000,300,50])]
        driver_inventory.extend(dict(varname='__alive_arithmetic_lifecycle_receive_'+str(o['inlet']), maxclass='receive',
            boxtext='receive '+o['channel'], rect=[-2000,-2100-30*o['inlet'],300,50]) for o in owners)
        lifecycle=dict(version='arithmetic-freebang-v1', monitor_epoch=epoch, owners=owners, driver_inventory=driver_inventory,
            observer_path=n.windows_path(work/'lifecycle-observer.js'), report_path=n.windows_path(work/'lifecycle-report.json'))
        config = dict(work=str(work), documents=[definition], helpers=helper_rows, package_sha256=package_files, lifecycle=lifecycle)
        sealed_names = ['config.json', 'controller.js', 'driver.maxpat', 'lifecycle-observer.js', 'observer.js', 'v8-readback.js']
        sealed_names += ['helpers/' + name for name in helpers]
        sealed_names += [area + '/' + doc + '-r' + str(rev) + '.maxhelp' for area in ('pristine', 'working') for doc in ('times', 'plus', 'minus') for rev in (1, 2)]
        for name in sealed_names:
            path = work / name; path.parent.mkdir(mode=0o700, exist_ok=True)
            payload = n.canonical(config) if name == 'config.json' else helper_payload if name.startswith('helpers/') else source if name.endswith('.maxhelp') else (history / name).read_bytes() if name in package_files else b'Synthetic driver.'
            n.retain_raw(path, payload)
        seal = dict(files={name:n.digest(work / name) for name in sealed_names}, package_binding=binding)
        n.write_json(work / 'seal.json', seal)
        command = dict(command_id=51, op='operation', action='install', action_revision=1, document='plus', revision=1,
            source_sha256=source_sha, step_id='install-plus-r1'); n.write_json(work / 'command.json', command)
        patches.enter_context(patch.object(n, 'PLUS_CONTROLLER_COHORT_COMMAND_SHA256', n.digest(work / 'command.json')))
        manifest = package / 'preparation-manifest-arithmetic006.json'; manifest.write_bytes(n.canonical(dict(package_binding=binding)))
        report_dir = repo / '.superpowers/sdd/2026-10-22-arithmetic-root-runtime'; report_dir.mkdir(parents=True)
        for name in ('capture-006-audit.md', 'capture-006-trace-investigation.md'): (report_dir / name).write_bytes(('Synthetic ' + name).encode())
        verification = package / 'verification-capture006.json'; verification.write_bytes(b'{"synthetic":true}')
        evidence = dict(n.PLUS_CONTROLLER_COHORT_EVIDENCE)
        evidence.update(config_sha256=n.digest(work / 'config.json'), seal_sha256=n.digest(work / 'seal.json'),
            manifest_sha256=n.digest(manifest), controller_sha256=n.digest(work / 'controller.js'), package_sha256=binding['package_sha256'],
            historical_binding_sha256=n.digest(history / 'binding.json'), audit_sha256=n.digest(report_dir / 'capture-006-audit.md'),
            investigation_sha256=n.digest(report_dir / 'capture-006-trace-investigation.md'), verification_sha256=n.digest(verification))
        patches.enter_context(patch.object(n, 'PLUS_CONTROLLER_COHORT_EVIDENCE', evidence))
        patches.enter_context(patch.object(n, 'PLUS_CONTROLLER_COHORT_HISTORY_MAP_SHA256', hashlib.sha256(n.canonical(history_files)).hexdigest()))
        observations = [dict(document='plus', revision=1, source_sha256=source_sha, anchor=a, policy=geo_policies[a]) for a in list(geometry)[:3]]
        for anchor in numeric:
            box = next(b for b in boxes if b['anchor'] == anchor)
            observations.append(dict(expected_anchor=anchor, expected_maxclass='flonum', expected_runtime_class='flonum', expected_rect=box['rect'],
                candidates=[dict(maxclass='number' if b['maxclass']=='flonum' else b['runtime_class'],
                    rect=b.get('observed_geometry_policy',{}).get('live_rect',b['rect'])) for b in boxes]))
        anchor = list(geometry)[3]; observations.append(dict(document='plus', revision=1, source_sha256=source_sha, anchor=anchor, policy=geo_policies[anchor]))
        rows = []
        def row(phase, attempt, **extra):
            rows.append(dict(seq=len(rows)+1, request_id=51, step_id='install-plus-r1', action='install', document='plus', revision=1,
                source_sha256=source_sha, owner_inlet=2, attempt=attempt, phase=phase, clock='wall-ms', at_ms=100000+len(rows), elapsed_ms=len(rows), **extra))
        row('command-consumed', 0, working_path=definition['working_windows_path'])
        for phase in ('openfile-enter', 'openfile-return', 'poll-scheduled'): row(phase, 0)
        for attempt in range(1, 62):
            row('poll-enter', attempt); row('root-decision', attempt, root_present=True, path_match=True); row('validate-enter', attempt)
            if attempt == 1:
                for identity, observation in enumerate(observations, 1):
                    kind = 'geometry' if 'policy' in observation else 'anchor'; parts = 4 if kind=='geometry' else 2
                    observation=copy.deepcopy(observation)
                    if kind=='geometry': observation['policy']['saved_rect']=[int(v) for v in observation['policy']['saved_rect']]
                    data = n.canonical(observation).decode(); width = (len(data)+parts-1)//parts
                    for part in range(parts): row('observation-chunk', attempt, observation_kind=kind, observation_id=identity, part=part, parts=parts, data=data[part*width:(part+1)*width])
            row('plus-eligibility', attempt, ready=True, candidates=3, diagnostics=3)
            for anchor in numeric:
                for method in ('getattr', 'getvalueof'):
                    for phase in ('capability-enter', 'capability-call-return'): row(phase, attempt, anchor=anchor, method=method)
                    observation = dict(method=method, status='returned', representation='scalar-number' if method=='getattr' else 'singleton-number-array', value=6 if method=='getattr' else 0)
                    if method=='getattr': observation['attribute']='format'
                    row('capability-exit', attempt, anchor=anchor, method=method, observation=observation)
            row('validate-refused', attempt, diagnostics=3, geometry_dispositions=4); row('poll-scheduled', attempt)
        normal = [r['observation'] for r in rows if r['phase']=='capability-exit']
        patches.enter_context(patch.object(n, 'PLUS_CONTROLLER_COHORT_OBSERVATION_SHA256', {method:hashlib.sha256(n.canonical(next(o for o in normal if o['method']==method))).hexdigest() for method in ('getattr','getvalueof')}))
        def write_trace(changed):
            path=work / 'install-plus-r1-trace.jsonl'; path.write_bytes(b''.join(n.canonical(r)+b'\n' for r in changed)); path.chmod(0o600)
            evidence['trace_sha256']=n.digest(path)
        write_trace(rows)
        yield dict(work=work, history=history, package=package, definition=definition, evidence=evidence,
            config=config, seal=seal, command=command, rows=rows, write_trace=write_trace, numeric=numeric)


@contextmanager
def capture007_fixture(n):
    """Read-only historical bytes; rebound in-memory mutations reach semantic guards."""
    work = Path.home() / '.cache/alive-ultra-evidence/arithmetic-max-runtime-007'
    history = work.parent / 'arithmetic-package-007-historical'
    original = n.read_private
    payloads = {}
    for owner in (work, history):
        for path in owner.rglob('*'):
            if path.is_file(): payloads[str(path)] = original(owner, path)
    evidence = dict(n.PLUS_V8_EVIDENCE)
    public = {key:n._read_plus_v8_public(key) for key in ('manifest','audit','investigation')}
    def rebind(name, value, historical=False):
        owner = history if historical else work
        payloads[str(owner / name)] = n.canonical(value) if type(value) is not bytes else value
        if historical:
            binding = n.parse_json(payloads[str(history / 'binding.json')])
            if name != 'binding.json':
                binding['files'][name] = hashlib.sha256(payloads[str(history / name)]).hexdigest()
                payloads[str(history / 'binding.json')] = n.canonical(binding)
            evidence['historical_binding_sha256'] = hashlib.sha256(payloads[str(history / 'binding.json')]).hexdigest()
            evidence['historical_files_sha256'] = hashlib.sha256(n.canonical(binding['files'])).hexdigest()
        else:
            seal = n.parse_json(payloads[str(work / 'seal.json')])
            if name in seal['files']:
                seal['files'][name] = hashlib.sha256(payloads[str(work / name)]).hexdigest()
                payloads[str(work / 'seal.json')] = n.canonical(seal)
            for key, file in (('raw', 'observations/request-52-plus-r1.json'), ('install_ack', 'observations/ack-request-51.json'),
                    ('readback_ack', 'observations/ack-request-52.json'), ('command', 'command.json'), ('config', 'config.json'),
                    ('seal', 'seal.json'), ('trace', 'install-plus-r1-trace.jsonl')):
                evidence[key + '_sha256'] = hashlib.sha256(payloads[str(work / file)]).hexdigest()
            manifest=n.parse_json(public['manifest'])
            manifest.update(private_config_sha256=evidence['config_sha256'],private_seal_sha256=evidence['seal_sha256'])
            public['manifest']=n.canonical(manifest);evidence['manifest_sha256']=hashlib.sha256(public['manifest']).hexdigest()
    with patch.object(n, 'read_private', side_effect=lambda owner, path: payloads[str(Path(path))]), patch.object(n, 'PLUS_V8_EVIDENCE', evidence),patch.object(n,'_read_plus_v8_public',side_effect=lambda key:public[key]):
        yield dict(work=work, history=history, payloads=payloads, evidence=evidence, rebind=rebind,
            config=n.parse_json(payloads[str(work / 'config.json')]),
            raw=n.parse_json(payloads[str(work / 'observations/request-52-plus-r1.json')]))


def plus008_fixture(n, revision=1, action='event'):
    """Build serialized positive data independently of the policy/witness factories."""
    work = Path.home() / '.cache/alive-ultra-evidence/arithmetic-max-runtime-007'
    config = n.parse_json(n.read_private(work, work / 'config.json'))
    document = copy.deepcopy(config['documents'][revision + 1])
    diagnostic = n.parse_json(n.read_private(work, work / 'observations/request-52-plus-r1.json'))['v8_representation_diagnostics']
    roots = {r['anchor']:r for r in diagnostic['root_rows']}
    numeric = {r['anchor']:r for r in diagnostic['numeric_rows']}
    for view in ('boxes', 'full_inventory'):
        for b in document[view]:
            if b['anchor'] in numeric:
                b['v8_numeric_representation_policy'] = dict(kind='plus-v8-numeric-representation-v1', engine='v8', document='plus',
                    source_sha256=n.PLUS_SOURCE, anchor=b['anchor'], source_class='flonum', runtime_class='number',
                    source_box_sha256=b['source_box_sha256'], source_text_sha256=b['source_text_sha256'],
                    saved_rect_sha256=n.geometry_vector_digest(b['rect']), initial_numeric_sha256=n.geometry_vector_digest([b['initial_numeric'],0,0,0]),
                    helper_sha256=dict(n.HELPERS), evidence=dict(n.PLUS_V8_EVIDENCE), format_method='getattr', format_attribute='format',
                    format_representation='scalar-number', format_value_sha256='dcdadd560ab2234a2bf2d2b5ed44e5d7640e88eefe6bdbc98aa84aaf31649983',
                    getter_method='getvalueof', getter_representation='scalar-number', finite_required=True, initial_equality_action='install')
            if view == 'full_inventory' and b['anchor'] in ('root/obj-2','root/obj-3'):
                b['v8_root_representation_policy'] = dict(kind='plus-v8-root-representation-v1', engine='v8', document='plus',
                    source_sha256=n.PLUS_SOURCE, anchor=b['anchor'], source_class='newobj', runtime_class='jpatcher',
                    source_box_sha256=b['source_box_sha256'], source_text_sha256=b['source_text_sha256'],
                    saved_rect_sha256=n.geometry_vector_digest(b['rect']), live_rect_sha256=n.geometry_vector_digest(roots[b['anchor']]['live_rect']),
                    helper_sha256=dict(n.HELPERS), evidence=dict(n.PLUS_V8_EVIDENCE), source_runtime_class='patcher',
                    saved_rect=b['rect'][:], live_rect=roots[b['anchor']]['live_rect'][:], source_varname=b['source_varname'],
                    saved_incoming_routes=0, saved_outgoing_routes=0)
    step = ('plus-A01' if revision == 1 else 'plus-A21') if action == 'event' else action + '-plus-r' + str(revision)
    request = 801 + revision; operation = request if action == 'close' else request - 1
    rows=[]
    for b in document['boxes']:
        if b['anchor'] not in numeric: continue
        r={k:copy.deepcopy(v) for k,v in numeric[b['anchor']].items() if k not in ('expected_runtime_classes','observed_candidate_count','probe_disposition')}
        if action != 'install': r['value_observation']['value'] += 13
        rows.append(r)
    root_rows=[dict(anchor=b['anchor'],source_box_sha256=b['source_box_sha256'],source_text_sha256=b['source_text_sha256'],
        source_class='newobj',actual_runtime_class='jpatcher',varname=b['source_varname'],live_rect=roots[b['anchor']]['live_rect'][:],
        candidate_count=1,candidate_count_complete=True) for b in document['full_inventory'] if 'v8_root_representation_policy' in b]
    coverage=lambda count:dict(complete=True,status='complete',observed_count=count,complete_count=count,limit=count)
    witness=dict(version='plus-v8-representation-witnesses-v1',engine='v8',request_id=request,operation_request_id=operation,
        step_id=step,action=action,action_document='plus',action_revision=revision,document='plus',revision=revision,
        source_sha256=n.PLUS_SOURCE,helper_sha256=dict(n.HELPERS),working_path=document['working_windows_path'],root_is_top_level=True,
        receipt_tag_observed=False,evidence=dict(n.PLUS_V8_EVIDENCE),inventory_coverage=dict(root=coverage(8),numeric=coverage(35)),numeric=rows,roots=root_rows)
    raw=dict(success=True,request_id=request,operation_request_id=operation,step_id=step,action=action,action_document='plus',action_revision=revision,
        document='plus',revision=revision,source_sha256=n.PLUS_SOURCE,
        working_root_path=document['working_windows_path'],root_is_top_level=True,saved_order_observed=False,messages=[],
        numeric_modes=[],readback_method='v8-numeric-getvalueof',v8_representation_witnesses=witness)
    raw['boxes']=[dict(varname=n.original_varname(b),maxclass='number' if b['anchor'] in numeric else b['runtime_class'],
        rect=b.get('observed_geometry_policy',{}).get('live_rect',b['rect'])) for b in document['boxes']]
    raw['boxes'] += [dict(varname=l['varname'],maxclass='js',rect=[-100,-100,40,20]) for l in document['observer_leaves']]
    by_id={b['id']:b for b in document['boxes']}; routes=[]
    for e in document['saved_edges']:
        routes.append(dict(source=dict(varname=n.original_varname(by_id[e['source'][0]]),port=e['source'][1]),
            destination=dict(varname=n.original_varname(by_id[e['destination'][0]]),port=e['destination'][1])))
    for l in document['observer_leaves']:
        b=next(b for b in document['boxes'] if b['anchor']==l['anchor'])
        routes.append(dict(source=dict(varname=n.original_varname(b),port=l['port']),destination=dict(varname=l['varname'],port=0)))
    raw['input_routes']=copy.deepcopy(routes);raw['output_routes']=routes;raw['numeric']=[]
    for b in document['boxes']:
        if b['maxclass'] not in n.NUMERIC:continue
        gated=b['anchor'] in numeric;v=next((r['value_observation']['value'] for r in rows if r['anchor']==b['anchor']),b['initial_numeric'])
        raw['numeric'].append(dict(anchor=b['anchor'],class_name='number' if gated else b['maxclass'],value=v,
            source_class=b['maxclass'],getter_method='getvalueof',getter_representation='scalar-number',semantic_tag='float' if gated else 'int',
            semantic_tag_basis='source-flonum-and-live-v8-format6' if gated else 'number-class'))
    return document,raw


def extraction_memory_only(test):
    """Guard these private-derived fixtures before any disk allocation or write."""
    @wraps(test)
    def guarded(*args, **kwargs):
        original_open,original_io_open,original_os_open=open,io.open,os.open
        def read_only_open(original, file, mode='r', *positional, **named):
            if any(flag in mode for flag in ('w','a','x','+')):raise AssertionError('Extraction fixture filesystem write refused')
            return original(file,mode,*positional,**named)
        def read_only_os_open(path, flags, *positional, **named):
            if flags & (os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND):raise AssertionError('Extraction fixture filesystem write refused')
            return original_os_open(path,flags,*positional,**named)
        with ExitStack() as guards:
            guards.enter_context(patch('builtins.open',side_effect=lambda *a,**k:read_only_open(original_open,*a,**k)))
            guards.enter_context(patch.object(io,'open',side_effect=lambda *a,**k:read_only_open(original_io_open,*a,**k)))
            guards.enter_context(patch.object(os,'open',side_effect=read_only_os_open))
            guards.enter_context(patch.object(tempfile,'TemporaryDirectory',side_effect=AssertionError('Extraction fixtures must remain in memory')))
            for name in ('mkdir','makedirs','chmod','rename','replace','unlink','remove','rmdir'):
                guards.enter_context(patch.object(os,name,side_effect=AssertionError('Extraction fixture filesystem mutation refused')))
            return test(*args,**kwargs)
    return guarded


@contextmanager
def extraction_memory_storage(n, payload):
    """Keep storage virtual while executing the production retained-byte hash."""
    work=Path('/__alive_memory_extraction__');path=work/'raw.json';retained=work/'retained-raw.json'
    files={path:payload};writes=[];reads=[];descriptor=-101
    def check_owner(owner):
        if owner!=work:raise AssertionError('Unexpected extraction storage owner')
    def source_path(owner,value):
        check_owner(owner)
        if Path(value)!=path:raise AssertionError('Unexpected extraction input path')
        return path
    def read(owner,value):
        source_path(owner,value);reads.append(path);return files[path]
    class RetainedBuffer(io.BytesIO):
        def fileno(self):return descriptor
        def close(self):
            if not self.closed:
                files[retained]=self.getvalue();writes.append((retained,files[retained]))
            super().close()
    def open_retained(value,flags,mode=0o777):
        if Path(value)!=retained or flags!=(os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW) or mode!=0o600:
            raise AssertionError('Unexpected extraction retained-write boundary')
        if retained in files:raise FileExistsError('Retained fixture already exists')
        return descriptor
    def fdopen(value,mode):
        if value!=descriptor or mode!='wb':raise AssertionError('Unexpected extraction descriptor')
        return RetainedBuffer()
    def fchmod(value,mode):
        if value!=descriptor or mode!=0o600:raise AssertionError('Unexpected extraction file mode')
    def fsync(value):
        if value!=descriptor:raise AssertionError('Unexpected extraction flush descriptor')
    with ExitStack()as storage:
        storage.enter_context(patch.object(n,'verify_private',side_effect=check_owner))
        storage.enter_context(patch.object(n,'private_path',side_effect=source_path))
        storage.enter_context(patch.object(n,'read_private',side_effect=read))
        storage.enter_context(patch.object(n.os,'open',side_effect=open_retained))
        storage.enter_context(patch.object(n.os,'fdopen',side_effect=fdopen))
        storage.enter_context(patch.object(n.os,'fchmod',side_effect=fchmod))
        storage.enter_context(patch.object(n.os,'fsync',side_effect=fsync))
        yield dict(work=work,path=path,retained=retained,files=files,writes=writes,reads=reads)


class LocalOracleAvailabilityTests(unittest.TestCase):
    def test_only_wholly_absent_local007_evidence_is_unavailable(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            self.assertFalse(local007_oracle_present(base))
            parent = base / '.cache/alive-ultra-evidence'
            parent.mkdir(parents=True)
            for name in ('arithmetic-max-runtime-007', 'arithmetic-package-007-historical'):
                marker = parent / name
                marker.mkdir()
                self.assertTrue(local007_oracle_present(base))
                marker.rmdir()
            marker.symlink_to(parent / 'missing-target')
            self.assertTrue(local007_oracle_present(base))


def local007_oracle_present(base=None):
    """Only wholly absent licensed evidence may be unavailable; partial stays strict."""
    parent = (Path.home() if base is None else Path(base)) / '.cache/alive-ultra-evidence'
    return any((parent / name).exists() or (parent / name).is_symlink() for name in
               ('arithmetic-max-runtime-007', 'arithmetic-package-007-historical'))


@unittest.skipUnless(local007_oracle_present(),
    'UNAVAILABLE: optional licensed local capture007 oracle; no Max comparison performed')
class Preparation008Tests(unittest.TestCase):
    def test_plus_v8_independent007_loader(self):
        n=module('arithmetic')
        self.assertTrue(hasattr(n,'load_plus_v8_representation_measurements'),'Independent007 loader missing')
        result=n.load_plus_v8_representation_measurements()
        self.assertEqual(set(result),{'numeric','roots'})
        self.assertEqual(set(result['numeric']),set(n.PLUS_NUMERIC_PINS));self.assertEqual(set(result['roots']),{'root/obj-2','root/obj-3'})
        with patch.object(n,'package_binding',side_effect=AssertionError('Current package forbidden')),patch.object(n,'verify_private',side_effect=AssertionError('Current verification forbidden')),patch.object(n,'source_metadata',side_effect=AssertionError('Recursive metadata forbidden')):
            self.assertEqual(n.load_plus_v8_representation_measurements(),result)

    def test_plus_v8_007_rebound_semantics(self):
        n=module('arithmetic');self.assertTrue(hasattr(n,'load_plus_v8_representation_measurements'),'Independent007 loader missing')
        mutations=['raw-success','raw-mode','strict','coverage','root-candidate','root-class','numeric-shape','numeric-default','numeric-count',
            'raw-retained','command-id','command-op','ack51','ack52','archive-schema','archive-file','sealed-file','trace','source-view','source-default']
        mutations += ['owner-'+str(i) for i in range(6)] + ['source-path','driver-map','driver-bytes','helper-type','schema-type','source-metadata']
        for mutation in mutations:
            with self.subTest(mutation=mutation),capture007_fixture(n) as f:
                work=f['work'];rebind=f['rebind'];raw=f['raw'];config=f['config'];d=raw['v8_representation_diagnostics']
                if mutation.startswith('owner-'):config['lifecycle']['owners'][int(mutation[-1])]['revision']=True
                if mutation=='source-view':config['documents'][2]['full_inventory'][0]['authored_empty']=True
                if mutation=='source-default':config['documents'][2]['boxes'][0]['initial_numeric']=False
                if mutation=='source-path':config['documents'][2]['source_path']='Z:/wrong.maxhelp'
                if mutation=='driver-map':config['lifecycle']['driver_inventory'][0]['maxclass']='v8'
                if mutation=='helper-type':config['helpers'][0]['bytes']=True
                if mutation=='schema-type':config['schema_version']=True
                if mutation=='source-metadata':config['source_metadata'][0]['numeric_anchor_count']=True
                if mutation.startswith('owner-') or mutation.startswith('source-'):rebind('config.json',config)
                if mutation in ('driver-map','helper-type','schema-type'):rebind('config.json',config)
                if mutation=='raw-success':raw['success']=True
                if mutation=='raw-mode':raw['numeric_mode_observation']={}
                if mutation=='strict':d['strict_mismatch']=False
                if mutation=='coverage':d['inventory_coverage']['numeric']['limit']=True
                if mutation=='root-candidate':d['root_rows'][0]['candidates'].append(copy.deepcopy(d['root_rows'][0]['candidates'][0]))
                if mutation=='root-class':d['root_rows'][0]['candidates'][0]['runtime_class']='unknown'
                if mutation=='numeric-shape':d['numeric_rows'][0]['value_observation']['representation']='singleton-number-array'
                if mutation=='numeric-default':d['numeric_rows'][0]['value_observation']['value']+=1
                if mutation=='numeric-count':d['numeric_rows'][0]['candidate_count']=True
                if mutation in ('raw-success','raw-mode','strict','coverage','root-candidate','root-class','numeric-shape','numeric-default','numeric-count'):
                    rebind('observations/request-52-plus-r1.json',raw);rebind('observations/retained-request-52-plus-r1.json',raw)
                    # Byte size is rebound too so semantic mutations cannot stop at the envelope length pin.
                    size=len(f['payloads'][str(work/'observations/request-52-plus-r1.json')])
                else:size=5350
                if mutation=='raw-retained':rebind('observations/retained-request-52-plus-r1.json',b'{}')
                if mutation in ('command-id','command-op'):
                    c=n.parse_json(f['payloads'][str(work/'command.json')]);c['command_id' if mutation=='command-id' else 'op']=True;rebind('command.json',c)
                if mutation in ('ack51','ack52'):
                    name='observations/ack-request-'+('51' if mutation=='ack51' else '52')+'.json';a=n.parse_json(f['payloads'][str(work/name)]);a['success']=False;rebind(name,a)
                if mutation=='archive-schema':
                    b=n.parse_json(f['payloads'][str(f['history']/'binding.json')]);b['schema_version']=True;rebind('binding.json',b,True)
                if mutation=='archive-file':f['payloads'][str(f['history']/'compare.py')]=b'changed historical bytes'
                if mutation=='sealed-file':rebind('working/minus-r2.maxhelp',b'{}')
                if mutation=='driver-bytes':rebind('driver.maxpat',b'{}')
                if mutation=='trace':
                    rows=f['payloads'][str(work/'install-plus-r1-trace.jsonl')].splitlines();r=n.parse_json(rows[-1]);r['attempt']=True;rows[-1]=n.canonical(r);rebind('install-plus-r1-trace.jsonl',b'\n'.join(rows)+b'\n')
                with patch.object(n,'PLUS_V8_RAW_BYTES',size),self.assertRaises(ValueError):n.load_plus_v8_representation_measurements()

    def test_plus_v8_projection_policies_and_whole_corruption(self):
        n=module('arithmetic');self.assertTrue(hasattr(n,'validate_plus_v8_metadata'),'Complete plus V8 metadata validation missing')
        document,_=plus008_fixture(n)
        self.assertTrue(n.validate_plus_v8_metadata(document))
        for view in ('boxes','full_inventory'):
            for index,b in enumerate(document[view]):
                for field in ('maxclass','source_box_sha256','authored_text','outlets','rect','id','child','source_varname','saved_incoming_routes'):
                    if field not in b:continue
                    d=copy.deepcopy(document);target=d[view][index];v=target[field]
                    target[field]=(v+'changed' if type(v)is str else not v if type(v)is bool else v+1 if type(v)is int else [0,0,1,1])
                    with self.subTest(view=view,index=index,field=field),self.assertRaises(ValueError):n.validate_plus_v8_metadata(d)
        for view in ('boxes','full_inventory'):
            for index,b in enumerate(document[view]):
                for field in ('v8_numeric_representation_policy','v8_root_representation_policy'):
                    if field not in b:continue
                    for key in b[field]:
                        for operation in ('missing','changed'):
                            d=copy.deepcopy(document);p=d[view][index][field];v=p[key]
                            if operation=='missing':p.pop(key)
                            else:p[key]=not v if type(v)is bool else v+1 if type(v)is int else [] if type(v)is list else {} if type(v)is dict else 'changed'
                            with self.subTest(view=view,index=index,policy=field,key=key,operation=operation),self.assertRaises(ValueError):n.validate_plus_v8_metadata(d)
        for mutation in ('consistent','partial','duplicate','extra-policy','leaf-policy','missing-controller','missing-geometry','transferred','extra-key','copy-initial','bool-revision'):
            d=copy.deepcopy(document);b=next(b for b in d['boxes'] if 'v8_numeric_representation_policy'in b)
            if mutation=='consistent':
                for view in ('boxes','full_inventory'):next(x for x in d[view] if x['anchor']==b['anchor'])['authored_text']='changed'
            if mutation=='partial':b.pop('v8_numeric_representation_policy')
            if mutation=='duplicate':d['boxes'].append(copy.deepcopy(b))
            if mutation=='extra-policy':d['full_inventory'][0]['v8_numeric_representation_policy']=copy.deepcopy(b['v8_numeric_representation_policy'])
            if mutation=='leaf-policy':d['observer_leaves'][0]['v8_numeric_representation_policy']=copy.deepcopy(b['v8_numeric_representation_policy'])
            if mutation=='missing-controller':
                for view in ('boxes','full_inventory'):
                    for x in d[view]:x.pop('plus_controller_numeric_cohort_policy',None)
            if mutation=='missing-geometry':d['full_inventory'][0].pop('observed_geometry_policy')
            if mutation=='transferred':d['document']='times'
            if mutation=='extra-key':d['boxes'][0]['unexpected']=True
            if mutation=='copy-initial':next(x for x in d['full_inventory'] if x['anchor']==b['anchor'])['initial_numeric']=1
            if mutation=='bool-revision':d['revision']=True
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):n.validate_plus_v8_metadata(d)

    def test_plus_v8_fresh_witness_checkpoint_and_close_boundaries(self):
        n=module('arithmetic');self.assertTrue(hasattr(n,'PLUS_V8_EVIDENCE'),'Plus V8 provenance missing')
        for revision in (1,2):
            for action in ('install','event','close'):
                d,raw=plus008_fixture(n,revision,action);rid=raw['request_id'];step=raw['step_id']
                rows=n.validate_v8_representation_witnesses(d,raw,rid,step,action);self.assertEqual(len(rows),5)
                if action!='close':self.assertEqual(len(n.validate_checkpoint(d,raw,rid,step,action)['numeric_states']),7)
                for mutation in ('request','operation','action','revision','owner','path','close-id','history','extra','root-count','coverage','value','format',
                        'numeric-count','source','helper','receipt','numeric-state','route','nongated-class'):
                    dd=copy.deepcopy(d);r=copy.deepcopy(raw);w=r['v8_representation_witnesses']
                    if mutation=='request':w['request_id']=rid-1
                    if mutation=='operation':w['operation_request_id']=True
                    if mutation=='action':r['action_document']='times'
                    if mutation=='revision':r['revision']=True
                    if mutation=='owner':dd['lifecycle_owner_inlet']=True
                    if mutation=='path':w['working_path']='Z:/unbound.maxhelp'
                    if mutation=='close-id':r['operation_request_id']=rid+1;w['operation_request_id']=rid+1
                    if mutation=='history':w['request_id']=52;w['operation_request_id']=51
                    if mutation=='extra':w['strict_mismatch']=False
                    if mutation=='root-count':w['roots'][0]['candidate_count']=True
                    if mutation=='coverage':w['inventory_coverage']['numeric']['limit']=True
                    if mutation=='value':w['numeric'][0]['value_observation']['value']=False
                    if mutation=='format':w['numeric'][0]['format_observation']['value']+=1
                    if mutation=='numeric-count':w['numeric'].append(copy.deepcopy(w['numeric'][0]))
                    if mutation=='source':w['source_sha256']='f'*64
                    if mutation=='helper':w['helper_sha256']['helpargs.js']='f'*64
                    if mutation=='receipt':w['numeric'][0]['receipt_tag_observed']=True
                    if mutation=='numeric-state':r['numeric'][0]['value']+=1
                    if mutation=='route':r['output_routes'].append(copy.deepcopy(r['output_routes'][0]))
                    if mutation=='nongated-class':r['boxes'][-20]['maxclass']='unknown'
                    if mutation=='close-id' and action!='close':continue
                    if action=='close' and mutation in ('numeric-state','route','nongated-class'):continue
                    with self.subTest(revision=revision,action=action,mutation=mutation),self.assertRaises(ValueError):
                        if action=='close':n.validate_v8_representation_witnesses(dd,r,rid,step,action)
                        else:n.validate_checkpoint(dd,r,rid,step,action)
                for method in ('format_observation','value_observation'):
                    for value in ([1],[1,2],'1',True,None,float('nan'),float('inf')):
                        r=copy.deepcopy(raw);r['v8_representation_witnesses']['numeric'][0][method]['value']=value
                        with self.subTest(method=method,shape=type(value).__name__),self.assertRaises(ValueError):n.validate_v8_representation_witnesses(d,r,rid,step,action)
                    for shape in ('missing','unavailable','throws','undefined','singleton-number-array','multiple-number-array','other'):
                        r=copy.deepcopy(raw);observation=r['v8_representation_witnesses']['numeric'][0][method]
                        if shape=='missing':observation.pop('value')
                        elif shape in ('unavailable','throws'):observation['status']=shape
                        else:observation['representation']=shape
                        with self.subTest(method=method,shape=shape),self.assertRaises(ValueError):n.validate_v8_representation_witnesses(d,r,rid,step,action)

    def test_plus_v8_strict_metadata_counts_and_receipt_claim(self):
        n=module('arithmetic');document,raw=plus008_fixture(n)
        for field in ('saved_incoming_routes','saved_outgoing_routes'):
            d=copy.deepcopy(document);b=next(b for b in d['boxes']if 'observed_geometry_policy'in b);b[field]=False
            with self.subTest(field=field),self.assertRaises(ValueError):n.validate_plus_v8_metadata(d)
        r=copy.deepcopy(raw);next(v for v in r['numeric']if v['source_class']=='flonum')['receipt_tag_observed']=True
        with self.assertRaises(ValueError):n.validate_checkpoint(document,r,r['request_id'],r['step_id'],'event')

    @extraction_memory_only
    def test_plus_v8_trusted_record_is_checked_before_update(self):
        n=module('arithmetic');self.assertTrue(hasattr(n,'PLUS_V8_EVIDENCE'),'Plus V8 provenance missing')
        d,raw=plus008_fixture(n);trusted={k:copy.deepcopy(raw[k]) for k in ('request_id','operation_request_id','step_id','action','action_document','action_revision','document','revision','source_sha256')}
        trusted['working_path']=d['working_windows_path'];trusted['seq_before']=0
        payload=n.canonical(raw)+b'\n'
        with extraction_memory_storage(n,payload)as store:
            work=store['work'];path=store['path']
            for key in trusted:
                if key=='seq_before':continue
                record=copy.deepcopy(trusted);record[key]=True;before=copy.deepcopy(record)
                with self.subTest(key=key),self.assertRaises(ValueError):n.extract_checkpoint(work,d,path,raw['request_id'],raw['step_id'],'event',record)
                self.assertEqual(record,before);self.assertEqual(store['writes'],[]);self.assertNotIn(store['retained'],store['files'])
            with self.assertRaises(ValueError):n.extract_checkpoint(work,d,path,raw['request_id'],raw['step_id'],'event')
            self.assertEqual(store['writes'],[]);self.assertNotIn(store['retained'],store['files'])
            before=copy.deepcopy(trusted)
            result=n.extract_checkpoint(work,d,path,raw['request_id'],raw['step_id'],'event',trusted)
            expected=dict(raw_sha256=hashlib.sha256(payload).hexdigest(),raw_bytes=len(payload))
            self.assertEqual({k:result[k]for k in expected},expected)
            self.assertEqual(trusted,dict(before,**expected))
            self.assertEqual(store['writes'],[(store['retained'],payload)])
            self.assertEqual(store['files'],{path:payload,store['retained']:payload})
            self.assertEqual(set(store['reads']),{path})

    @extraction_memory_only
    def test_plus_v8_valid_refusals_keep_exact_retained_bytes_and_session_binding(self):
        n=module('arithmetic');document,success=plus008_fixture(n,action='install')
        success.update(request_id=52,operation_request_id=51)
        success['v8_representation_witnesses'].update(request_id=52,operation_request_id=51)
        trusted={k:copy.deepcopy(success[k])for k in ('request_id','operation_request_id','step_id','action','action_document',
            'action_revision','document','revision','source_sha256')}
        trusted.update(working_path=document['working_windows_path'],seq_before=0)
        owner=Path.home()/'.cache/alive-ultra-evidence/arithmetic-max-runtime-007'
        failed=n.read_private(owner,owner/'observations/request-52-plus-r1.json')
        invalid=copy.deepcopy(success);invalid['numeric'][0]['getter_method']='unavailable'
        mismatched=copy.deepcopy(success);mismatched['operation_request_id']+=1
        mismatched['v8_representation_witnesses']['operation_request_id']+=1
        payloads=(('failed-envelope',failed),('invalid-success',n.canonical(invalid)),('mismatched-success-operation',n.canonical(mismatched)))
        for case,payload in payloads:
            with self.subTest(case=case),extraction_memory_storage(n,payload)as store:
                work=store['work'];path=store['path']
                record=copy.deepcopy(trusted)
                with self.assertRaises(ValueError):n.extract_checkpoint(work,document,path,52,success['step_id'],'install',record)
                self.assertEqual(store['writes'],[(store['retained'],payload)])
                self.assertEqual(store['files'][store['retained']],payload)
                self.assertEqual(record,dict(trusted,raw_sha256=hashlib.sha256(payload).hexdigest(),raw_bytes=len(payload)))
                self.assertEqual(store['files'],{path:payload,store['retained']:payload});self.assertEqual(store['reads'],[path])
        for payload in (failed,n.canonical(success)):
            for key in trusted:
                if key=='seq_before':continue
                for mutation in ('missing','changed'):
                    with self.subTest(context=key,mutation=mutation,failed=payload==failed),extraction_memory_storage(n,payload)as store:
                        work=store['work'];path=store['path']
                        record=copy.deepcopy(trusted)
                        if mutation=='missing':record.pop(key)
                        else:record[key]=True
                        original=copy.deepcopy(record)
                        with self.assertRaises(ValueError):n.extract_checkpoint(work,document,path,52,success['step_id'],'install',record)
                        self.assertEqual(record,original);self.assertEqual(store['writes'],[])
                        self.assertEqual(store['files'],{path:payload});self.assertEqual(store['reads'],[path])
            with extraction_memory_storage(n,payload)as store:
                work=store['work'];path=store['path']
                with self.assertRaises(ValueError):n.extract_checkpoint(work,document,path,52,success['step_id'],'install')
                self.assertEqual(store['writes'],[]);self.assertEqual(store['files'],{path:payload});self.assertEqual(store['reads'],[path])
        self.assertEqual(n.read_private(owner,owner/'observations/request-52-plus-r1.json'),failed)

    def test_plus_v8_nested_source_identities_refuse_before_normalization(self):
        n=module('arithmetic');document,raw=plus008_fixture(n)
        equivalent=copy.deepcopy(document)
        for view in ('boxes','full_inventory'):
            for box in equivalent[view]:
                box['rect']=[int(v) if v==int(v) else v for v in box['rect']]
                if n.finite(box.get('initial_numeric')):box['initial_numeric']=float(box['initial_numeric'])
                for field in ('observed_geometry_policy','v8_root_representation_policy'):
                    if field not in box:continue
                    for key in ('saved_rect','live_rect'):
                        box[field][key]=[int(v) if v==int(v) else v for v in box[field][key]]
        self.assertTrue(n.validate_plus_v8_metadata(equivalent))
        self.assertEqual(len(n.validate_checkpoint(equivalent,raw,raw['request_id'],raw['step_id'],'event')['numeric_states']),7)
        cases=[]
        def changed(label,mutate):
            value=copy.deepcopy(document);mutate(value);cases.append((label,value))
        for field in ('leaf-port','edge-index','source-port','destination-port'):
            original=(document['observer_leaves'][0]['port'] if field=='leaf-port' else document['saved_edges'][0]['index'] if field=='edge-index' else document['saved_edges'][0][field.removesuffix('-port')][1])
            for label,value in (('float',float(original)),('boolean',False),('string',str(original)),('null',None),('negative',-1),('upper-bound',10000)):
                def mutate(d,field=field,value=value):
                    if field=='leaf-port':d['observer_leaves'][0]['port']=value
                    elif field=='edge-index':d['saved_edges'][0]['index']=value
                    else:d['saved_edges'][0][field.removesuffix('-port')][1]=value
                changed(field+'-'+label,mutate)
        for collection,keys in (('observer_leaves',('anchor','port','varname')),('saved_edges',('index','source','destination'))):
            for key in keys:changed(collection+'-missing-'+key,lambda d,key=key,collection=collection:d[collection][0].pop(key))
            changed(collection+'-extra',lambda d,collection=collection:d[collection][0].update(unexpected=True))
            for shape in (None,[],True):changed(collection+'-row-'+type(shape).__name__,lambda d,collection=collection,shape=shape:d[collection].__setitem__(0,shape))
            for shape in (None,{},()):changed(collection+'-array-'+type(shape).__name__,lambda d,collection=collection,shape=shape:d.__setitem__(collection,shape))
        for side in ('source','destination'):
            endpoint=document['saved_edges'][0][side]
            for label,value in (('short',endpoint[:1]),('long',endpoint+[0]),('mapping',{}),('tuple',tuple(endpoint)),('null',None),
                    ('boolean-id',[False,endpoint[1]]),('unknown-id',['unknown',endpoint[1]])):
                changed(side+'-endpoint-'+label,lambda d,side=side,value=value:d['saved_edges'][0].__setitem__(side,value))
        for field in ('anchor','varname'):
            for value in (False,None,''):
                changed('leaf-'+field+'-'+type(value).__name__,lambda d,field=field,value=value:d['observer_leaves'][0].__setitem__(field,value))
        for label,value in cases:
            for consumer in ('metadata','checkpoint'):
                with self.subTest(case=label,consumer=consumer),patch.object(n,'_source_canonical',side_effect=AssertionError('Nested source identities reached normalization')):
                    with self.assertRaises(ValueError):
                        if consumer=='metadata':n.validate_plus_v8_metadata(value)
                        else:n.validate_checkpoint(value,raw,raw['request_id'],raw['step_id'],'event')


class PreparationTests(unittest.TestCase):
    def test_capture006_cohort_loader_bindings(self):
        n = module('arithmetic')
        self.assertTrue(hasattr(n, 'load_plus_controller_cohort_measurements'), 'Immutable006 cohort loader missing')
        with capture006_fixture(n) as f:
            expected = {anchor:0 for anchor in f['numeric']}
            self.assertEqual(n.load_plus_controller_cohort_measurements(), expected)
            for mutation in ('source', 'owner', 'revision', 'helpers', 'inventory', 'working-path', 'package'):
                changed = copy.deepcopy(f['config']); definition=changed['documents'][0]
                if mutation=='source': definition['source_sha256']='f'*64
                if mutation=='owner': definition['lifecycle_owner_inlet']=True
                if mutation=='revision': definition['revision']=2
                if mutation=='helpers': changed['helpers'][0]['sha256']='f'*64
                if mutation=='inventory': definition['full_inventory'][0]['source_box_sha256']='f'*64
                if mutation=='working-path': definition['working_windows_path']='Z:/unbound.maxhelp'
                if mutation=='package': changed['package_sha256']={}
                path=f['work']/'config.json'; path.write_bytes(n.canonical(changed)); f['evidence']['config_sha256']=n.digest(path)
                f['seal']['files']['config.json']=n.digest(path)
                (f['work']/'seal.json').write_bytes(n.canonical(f['seal'])); f['evidence']['seal_sha256']=n.digest(f['work']/'seal.json')
                with self.subTest(mutation=mutation), self.assertRaises(ValueError): n.load_plus_controller_cohort_measurements()
            path=f['work']/'config.json'; path.write_bytes(n.canonical(f['config'])); f['evidence']['config_sha256']=n.digest(path)
            f['seal']['files']['config.json']=n.digest(path); (f['work']/'seal.json').write_bytes(n.canonical(f['seal'])); f['evidence']['seal_sha256']=n.digest(f['work']/'seal.json')
            for name in ('controller.js', 'helpers/helpargs.js', 'pristine/plus-r1.maxhelp'):
                path=f['work']/name; original=path.read_bytes(); path.write_bytes(b'Corrupt synthetic sealed bytes.')
                with self.subTest(sealed=name), self.assertRaises(ValueError): n.load_plus_controller_cohort_measurements()
                path.write_bytes(original)
            historical=f['history']/'test_runner.py'; historical.write_bytes(b'Corrupt historical file.')
            with self.assertRaises(ValueError): n.load_plus_controller_cohort_measurements()

    def test_capture006_cohort_loader_binds_lifecycle_owner_map(self):
        n=module('arithmetic')
        with capture006_fixture(n) as f:
            self.assertEqual(len(n.load_plus_controller_cohort_measurements()),3)
            for mutation in ('missing-map','null-map','map-type','missing-owners','owners-type','missing-row','row-type','duplicate-row',
                    'missing-inlet','inlet-string','inlet-bool','inlet-float','inlet-mismatch','revision-string','revision-bool',
                    'revision-float','revision-mismatch','document-type','document-mismatch','source-type','source-mismatch','path-type','path-mismatch'):
                config=copy.deepcopy(f['config']); lifecycle=config['lifecycle']; owners=lifecycle['owners']; owner=owners[2]
                if mutation=='missing-map': config.pop('lifecycle')
                if mutation=='null-map': config['lifecycle']=None
                if mutation=='map-type': config['lifecycle']=[]
                if mutation=='missing-owners': lifecycle.pop('owners')
                if mutation=='owners-type': lifecycle['owners']={}
                if mutation=='missing-row': owners.pop(2)
                if mutation=='row-type': owners[2]=[]
                if mutation=='duplicate-row': owners[3]=copy.deepcopy(owner)
                if mutation=='missing-inlet': owner.pop('inlet')
                if mutation=='inlet-string': owner['inlet']='2'
                if mutation=='inlet-bool': owner['inlet']=True
                if mutation=='inlet-float': owner['inlet']=2.0
                if mutation=='inlet-mismatch': owner['inlet']=3
                if mutation=='revision-string': owner['revision']='1'
                if mutation=='revision-bool': owner['revision']=True
                if mutation=='revision-float': owner['revision']=1.0
                if mutation=='revision-mismatch': owner['revision']=2
                if mutation=='document-type': owner['document']=None
                if mutation=='document-mismatch': owner['document']='minus'
                if mutation=='source-type': owner['source_sha256']=None
                if mutation=='source-mismatch': owner['source_sha256']='f'*64
                if mutation=='path-type': owner['working_path']=None
                if mutation=='path-mismatch': owner['working_path']='Z:/synthetic/unowned.maxhelp'
                path=f['work']/'config.json'; path.write_bytes(n.canonical(config)); f['evidence']['config_sha256']=n.digest(path)
                seal=copy.deepcopy(f['seal']); seal['files']['config.json']=n.digest(path)
                path=f['work']/'seal.json'; path.write_bytes(n.canonical(seal)); f['evidence']['seal_sha256']=n.digest(path)
                with self.subTest(mutation=mutation),self.assertRaises(ValueError): n.load_plus_controller_cohort_measurements()

    def test_capture006_cohort_trace_prefix(self):
        n=module('arithmetic')
        self.assertTrue(hasattr(n, 'load_plus_controller_cohort_measurements'), 'Immutable006 trace parser missing')
        with capture006_fixture(n) as f:
            self.assertEqual(len(f['rows']),1490)
            self.assertEqual(len(n.load_plus_controller_cohort_measurements()),3)
            for mutation in ('missing', 'duplicate', 'reorder', 'row-type', 'seq-type', 'attempt-type', 'identity', 'clock', 'time', 'root', 'eligibility',
                    'bracket', 'anchor', 'format-shape', 'getter-shape', 'format-value', 'getter-value', 'getter-type',
                    'chunk-part', 'chunk-data', 'chunk-geometry', 'chunk-diagnostic', 'chunk-provenance', 'terminal', 'ack'):
                rows=copy.deepcopy(f['rows'])
                exit_index=next(i for i,r in enumerate(rows) if r['phase']=='capability-exit')
                chunk_index=next(i for i,r in enumerate(rows) if r['phase']=='observation-chunk')
                if mutation=='missing': rows.pop()
                if mutation=='duplicate': rows[-1]=copy.deepcopy(rows[-2])
                if mutation=='reorder': rows[exit_index-1],rows[exit_index-2]=rows[exit_index-2],rows[exit_index-1]
                if mutation=='row-type': rows[exit_index]=[]
                if mutation=='seq-type': rows[exit_index]['seq']=float(rows[exit_index]['seq'])
                if mutation=='attempt-type': rows[exit_index]['attempt']=True
                if mutation=='identity': rows[exit_index]['revision']=2
                if mutation=='clock': rows[exit_index]['clock']='monotonic'
                if mutation=='time': rows[exit_index]['elapsed_ms']+=1
                if mutation=='root': next(r for r in rows if r['phase']=='root-decision')['root_present']=1
                if mutation=='eligibility': next(r for r in rows if r['phase']=='plus-eligibility')['candidates']=2
                if mutation=='bracket': rows[exit_index-1]['phase']='capability-enter'
                if mutation=='anchor': rows[exit_index]['anchor']='root/transferred'
                if mutation=='format-shape': rows[exit_index]['observation']['representation']='singleton-number-array'
                if mutation=='getter-shape': rows[exit_index+3]['observation']['value']=[0]
                if mutation=='format-value': rows[exit_index]['observation']['value']=7
                if mutation=='getter-value': rows[exit_index+3]['observation']['value']=1
                if mutation=='getter-type': rows[exit_index+3]['observation']['value']=False
                if mutation=='chunk-part': rows[chunk_index]['part']=True
                if mutation=='chunk-data': rows[chunk_index]['data']='{corrupt'
                if mutation in ('chunk-geometry','chunk-diagnostic','chunk-provenance'):
                    identity=4 if mutation=='chunk-diagnostic' else 1
                    chunks=[r for r in rows if r['phase']=='observation-chunk' and r['observation_id']==identity]
                    observation=n.parse_json(''.join(r['data'] for r in chunks))
                    if mutation=='chunk-geometry': observation['policy']['saved_rect'][0]+=.001
                    if mutation=='chunk-diagnostic': observation['candidates'].pop()
                    if mutation=='chunk-provenance': observation['revision']=True
                    data=n.canonical(observation).decode(); width=(len(data)+len(chunks)-1)//len(chunks)
                    for part,chunk in enumerate(chunks): chunk['data']=data[part*width:(part+1)*width]
                if mutation=='terminal': rows[-1]['phase']='bind-enter'
                if mutation=='ack': rows[-1]['ack_id']=51
                f['write_trace'](rows)
                with self.subTest(mutation=mutation), ExitStack() as guards:
                    if mutation in ('format-value','getter-value'):
                        observation=rows[exit_index if mutation=='format-value' else exit_index+3]['observation']
                        guards.enter_context(patch.dict(n.PLUS_CONTROLLER_COHORT_OBSERVATION_SHA256,
                            {observation['method']:hashlib.sha256(n.canonical(observation)).hexdigest()}))
                    with self.assertRaises(ValueError): n.load_plus_controller_cohort_measurements()
            f['write_trace'](f['rows']); path=f['work']/'install-plus-r1-trace.jsonl'; payload=path.read_bytes()
            path.write_bytes(payload[:-1]); f['evidence']['trace_sha256']=n.digest(path)
            with self.assertRaises(ValueError): n.load_plus_controller_cohort_measurements()

    def test_plus_cohort_policy_binding(self):
        n=module('arithmetic')
        self.assertTrue(hasattr(n,'validate_plus_controller_cohort_policy'),'Distinct plus cohort policy missing')
        with capture006_fixture(n) as f:
            document=copy.deepcopy(f['definition'])
            for box in document['boxes']:
                if box['anchor'] not in f['numeric']: continue
                policy=n.plus_controller_cohort_policy(box)
                box['plus_controller_numeric_cohort_policy']=policy
                entry=next(b for b in document['full_inventory'] if b['anchor']==box['anchor'])
                entry.update(initial_numeric=box['initial_numeric'],plus_controller_numeric_cohort_policy=copy.deepcopy(policy))
            for revision in (1,2):
                document['revision']=revision
                self.assertEqual(n.validate_plus_controller_cohort_metadata(document), True)
                for mutation in ('document','source','helper','revision','class','classes','initial','geometry','box','text','policy-type','bool','evidence','extra',
                        'missing','duplicate','copy','inventory-default','transferred'):
                    changed=copy.deepcopy(document); box=next(b for b in changed['boxes'] if b['anchor'] in f['numeric']); p=box['plus_controller_numeric_cohort_policy']
                    if mutation=='document': changed['document']='times'
                    if mutation=='source': changed['source_sha256']='f'*64
                    if mutation=='helper': changed['helper_sha256']['helpargs.js']='f'*64
                    if mutation=='revision': changed['revision']=True
                    if mutation=='class': box['runtime_class']='number'
                    if mutation=='classes': box['runtime_classes']=['flonum','number']
                    if mutation=='initial': box['initial_numeric']=False
                    if mutation=='geometry': box['rect'][0]+=.001
                    if mutation=='box': box['source_box_sha256']='f'*64
                    if mutation=='text': box['source_text_sha256']='f'*64
                    if mutation=='policy-type': box['plus_controller_numeric_cohort_policy']=None
                    if mutation=='bool': p['finite_required']=1
                    if mutation=='evidence': p['evidence']['observed_revision']=True
                    if mutation=='extra': p['ack_sha256']='f'*64
                    if mutation=='missing': box.pop('plus_controller_numeric_cohort_policy')
                    if mutation=='duplicate': changed['boxes'].append(copy.deepcopy(box))
                    if mutation=='copy': next(b for b in changed['full_inventory'] if b['anchor']==box['anchor'])['plus_controller_numeric_cohort_policy']['engine']='v8'
                    if mutation=='inventory-default': next(b for b in changed['full_inventory'] if b['anchor']==box['anchor']).pop('initial_numeric')
                    if mutation=='transferred': next(b for b in changed['boxes'] if b['anchor'] not in f['numeric'])['plus_controller_numeric_cohort_policy']=copy.deepcopy(p)
                    with self.subTest(revision=revision,mutation=mutation),self.assertRaises(ValueError): n.validate_plus_controller_cohort_metadata(changed)
            checkpoint,raw=synthetic_checkpoint(n); checkpoint.update(document='plus',source_sha256=n.PLUS_SOURCE,helper_sha256=dict(n.HELPERS))
            raw.update(document='plus',source_sha256=n.PLUS_SOURCE)
            for index,anchor in enumerate(f['numeric'],4):
                target=checkpoint['boxes'][index]; previous=target['anchor']; replacement=copy.deepcopy(next(b for b in document['boxes'] if b['anchor']==anchor))
                target.update(replacement,id='synthetic-'+str(index));raw['boxes'][index].update(varname=n.original_varname(target),rect=target['rect'])
                next(v for v in raw['numeric'] if v['anchor']==previous)['anchor']=anchor
            checkpoint['full_inventory']=copy.deepcopy(checkpoint['boxes']);checkpoint['observer_leaves']=n.observer_definitions(checkpoint)
            self.assertEqual(len(n.validate_checkpoint(checkpoint,raw,7,'synthetic','event')['numeric_states']),7)
            raw['boxes'][4]['maxclass']='number'
            with self.assertRaisesRegex(ValueError,'Exact arithmetic runtime class changed'): n.validate_checkpoint(checkpoint,raw,7,'synthetic','event')

    def test_plus_cohort_source_metadata_keeps_both_complete_descriptor_views(self):
        n=module('arithmetic')
        self.assertTrue(hasattr(n,'load_plus_controller_cohort_measurements'),'Plus cohort metadata producer missing')
        with capture006_fixture(n) as f, ExitStack() as patches:
            resources=f['package']/'resources'; (resources/'help/max').mkdir(parents=True); (resources/'help/resources').mkdir()
            source=(f['work']/'pristine/plus-r1.maxhelp').read_bytes(); (resources/'help/max/plus.maxhelp').write_bytes(source)
            for name in n.HELPERS: (resources/'help/resources'/name).write_bytes((f['work']/'helpers'/name).read_bytes())
            patches.enter_context(patch.object(n,'IDENTITIES',{'plus':n.PLUS_SOURCE}))
            patches.enter_context(patch.object(n,'SOURCE_BYTES',{'plus':len(source)}))
            measured={b['anchor']:b['observed_geometry_policy']['live_rect'] for b in f['definition']['full_inventory'] if 'observed_geometry_policy' in b}
            patches.enter_context(patch.object(n,'load_plus_measurements',return_value=measured))
            observed_v8=dict(numeric={a:0 for a in f['numeric']},roots={a:measured[a] for a in ('root/obj-2','root/obj-3')})
            patches.enter_context(patch.object(n,'load_plus_v8_representation_measurements',return_value=observed_v8))
            patches.enter_context(patch.object(n,'PLUS_V8_NUMERIC_PINS',f['numeric']))
            patches.enter_context(patch.object(n,'PLUS_V8_ROOT_PINS',{a:{k:v for k,v in n.PLUS_GEOMETRY_PINS[a].items() if k in ('source_box_sha256','source_text_sha256','saved_rect_sha256','live_rect_sha256')}for a in ('root/obj-2','root/obj-3')}))
            boxes,inventory,edges=n.source_inventory('plus',n.parse_json(source)['patcher'],n.parse_json((f['work']/'config.json').read_bytes())['helpers'])
            pristine=dict(document='plus',source_sha256=n.PLUS_SOURCE,helper_sha256=n.HELPERS,basic_anchor='root/obj-2',basic_varname='basic_tab',boxes=boxes,full_inventory=inventory,saved_edges=edges)
            pristine['observer_leaves']=n.observer_definitions(pristine)
            patches.enter_context(patch.object(n,'PLUS_V8_PROJECTION_SHA256',hashlib.sha256(n._source_canonical(pristine)).hexdigest()))
            docs,public,helpers=n.source_metadata(resources); document=docs[0]
            self.assertTrue(n.validate_plus_controller_cohort_metadata(document))
            for view in ('boxes','full_inventory'):
                cohort=[b for b in document[view] if 'plus_controller_numeric_cohort_policy' in b]
                self.assertEqual([b['anchor'] for b in cohort],list(f['numeric']))
                self.assertTrue(all(b['maxclass']=='flonum' and b['runtime_class']=='flonum' and b['runtime_classes']==['flonum'] and type(b['initial_numeric']) is int for b in cohort))
                self.assertTrue(all('controller_numeric_representation_policy' not in b and 'v8_numeric_representation_policy' in b for b in cohort))
            self.assertNotIn('initial_numeric',json.dumps(public))

    def test_plus_geometry_is_separately_bound_without_numeric_admission(self):
        n = module('arithmetic')
        self.assertTrue(hasattr(n, 'PLUS_GEOMETRY_PINS'), 'Capture004 plus geometry gate missing')
        for index, (anchor, original_pin) in enumerate(n.PLUS_GEOMETRY_PINS.items()):
            saved = [80 * index, 8, 40, 20]; live = saved[:]; live[original_pin['changed_dimension']] += 2
            pin = dict(original_pin, saved_rect_sha256=n.geometry_vector_digest(saved), live_rect_sha256=n.geometry_vector_digest(live))
            box = dict(anchor=anchor, maxclass='jsui' if pin['runtime_class'] == 'jsui' else 'newobj',
                runtime_class=pin['runtime_class'], rect=saved, source_box_sha256=pin['source_box_sha256'],
                source_text_sha256=pin['source_text_sha256'], saved_incoming_routes=0, saved_outgoing_routes=0)
            definition = dict(document='plus', source_sha256=n.PLUS_SOURCE, helper_sha256=dict(n.HELPERS))
            policy = dict(kind='plus-observed-geometry-v1', document='plus', source_sha256=n.PLUS_SOURCE,
                anchor=anchor, **pin, saved_rect=saved, live_rect=live, helper_sha256=dict(n.HELPERS),
                evidence=dict(n.PLUS_EVIDENCE), saved_incoming_routes=0, saved_outgoing_routes=0)
            with patch.object(n, 'PLUS_GEOMETRY_PINS', {anchor: pin}):
                self.assertEqual(n.validate_geometry_policy(definition, box, policy), policy)
                for mutation in ('times', 'minus', 'source', 'helper', 'anchor', 'box', 'text', 'saved', 'live', 'axis', 'route', 'evidence', 'class', 'source-class'):
                    d, b, p = copy.deepcopy(definition), copy.deepcopy(box), copy.deepcopy(policy)
                    if mutation in ('times', 'minus'): d['document'] = mutation
                    if mutation == 'source': d['source_sha256'] = 'f' * 64
                    if mutation == 'helper': d['helper_sha256']['helpargs.js'] = 'f' * 64
                    if mutation == 'anchor': b['anchor'] = 'root/unobserved'
                    if mutation == 'box': b['source_box_sha256'] = 'f' * 64
                    if mutation == 'text': b['source_text_sha256'] = 'f' * 64
                    if mutation == 'saved': b['rect'][0] += .001
                    if mutation == 'live': p['live_rect'][pin['changed_dimension']] += .001
                    if mutation == 'axis': p['live_rect'][0] += 1
                    if mutation == 'route': b['saved_incoming_routes'] = 1
                    if mutation == 'evidence': p['evidence']['ack_sha256'] = 'f' * 64
                    if mutation == 'class': b['runtime_class'] = 'number'
                    if mutation == 'source-class': b['maxclass'] = 'number'
                    with self.subTest(anchor=anchor, mutation=mutation), self.assertRaises(ValueError):
                        n.validate_geometry_policy(d, b, p)
                self.assertNotIn('controller_numeric_representation_policy', box)

    def test_capture004_loader_checks_immutable_bindings_and_exact_seven_rows(self):
        n = module('arithmetic')
        self.assertTrue(hasattr(n, 'load_plus_measurements'), 'Immutable capture004 plus loader missing')
        with tempfile.TemporaryDirectory() as temporary, ExitStack() as patches:
            base = Path(temporary); work = base / '.cache/alive-ultra-evidence/arithmetic-max-runtime-004'
            work.mkdir(parents=True, mode=0o700); (work / 'observations').mkdir(mode=0o700)
            package = base / 'package'; package.mkdir(); repo = base / 'repo'
            audit = repo / '.superpowers/sdd/2026-10-22-arithmetic-root-runtime/capture-004-audit.md'
            audit.parent.mkdir(parents=True); audit.write_bytes(b'Synthetic immutable audit.')
            source = b'{"patcher":{}}'; source_sha = hashlib.sha256(source).hexdigest()
            n.retain_raw(work / 'source.maxhelp', source)
            geometry, numeric, inventory, diagnostics, measured = {}, {}, [], [], {}
            for index, (anchor, old) in enumerate({**n.PLUS_GEOMETRY_PINS, **n.PLUS_NUMERIC_PINS}.items()):
                saved = [index * 80, 8, 40, 20]; live = saved[:]
                geo = anchor in n.PLUS_GEOMETRY_PINS
                if geo: live[old['changed_dimension']] += 2
                pin = dict(old, saved_rect_sha256=n.geometry_vector_digest(saved))
                if geo: pin['live_rect_sha256'] = n.geometry_vector_digest(live)
                (geometry if geo else numeric)[anchor] = pin
                runtime = pin['runtime_class'] if geo else 'flonum'
                inventory.append(dict(anchor=anchor, maxclass='flonum' if not geo else 'jsui' if runtime == 'jsui' else 'newobj',
                    runtime_class=runtime, rect=[float(value) for value in saved], source_box_sha256=pin['source_box_sha256'],
                    source_text_sha256=pin['source_text_sha256'], saved_incoming_routes=0, saved_outgoing_routes=0))
                diagnostics.append(dict(expected_anchor=anchor, expected_maxclass=inventory[-1]['maxclass'],
                    expected_runtime_class=runtime, expected_rect=saved, candidates=[dict(maxclass=runtime if geo else 'number', rect=live)]))
                if geo: measured[anchor] = live
            boxes = copy.deepcopy(inventory); edges = []
            definition = dict(document='plus', revision=1, source_sha256=source_sha, helper_sha256=dict(n.HELPERS),
                pristine_path=str(work / 'source.maxhelp'), boxes=boxes, full_inventory=inventory, saved_edges=edges,
                lifecycle_owner_inlet=2, working_windows_path='Z:/synthetic/plus-r1.maxhelp')
            binding = dict(package_files={'synthetic.js': 'a' * 64}, package_sha256='b' * 64)
            config = dict(work=str(work), documents=[definition], package_sha256=binding['package_files'],
                helpers=[dict(name=name, sha256=sha) for name, sha in n.HELPERS.items()])
            command = dict(command_id=51, op='operation', action='install', action_revision=1,
                document='plus', revision=1, source_sha256=source_sha, step_id='install-plus-r1')
            ack = dict(command_id=51, success=False, anchor_diagnostics=diagnostics, geometry_dispositions=[],
                numeric_mode_observations=[], controller_representation_observations=[])
            for name, data in [('config.json', config), ('command.json', command), ('seal.json', dict(files={'source.maxhelp': source_sha}, package_binding=binding)),
                    ('observations/ack-request-51.json', ack)]: n.write_json(work / name, data)
            manifest = package / 'preparation-manifest-arithmetic004.json'; manifest.write_bytes(n.canonical(dict(package_binding=binding)))
            evidence = {key + '_sha256': n.digest(work / name) for key, name in [('ack', 'observations/ack-request-51.json'),
                ('config', 'config.json'), ('command', 'command.json'), ('seal', 'seal.json')]}
            evidence.update(manifest_sha256=n.digest(manifest), audit_sha256=n.digest(audit), package_sha256=binding['package_sha256'], rea_evidence_id='synthetic')
            for name, value in [('ROOT', package), ('REPO', repo), ('PLUS_SOURCE', source_sha), ('PLUS_GEOMETRY_PINS', geometry),
                    ('PLUS_NUMERIC_PINS', numeric), ('PLUS_EVIDENCE', evidence)]: patches.enter_context(patch.object(n, name, value))
            patches.enter_context(patch.object(Path, 'home', return_value=base))
            patches.enter_context(patch.object(n, 'source_inventory', return_value=(boxes, inventory, edges)))
            try: actual = n.load_plus_measurements()
            except ValueError as error: self.fail('Equivalent source/ACK rectangle spelling refused: ' + str(error))
            self.assertEqual(actual, measured)
            for mutation in ('missing', 'duplicate', 'class', 'geometry', 'unexpected-observation', 'identity'):
                changed = copy.deepcopy(ack)
                if mutation == 'missing': changed['anchor_diagnostics'].pop()
                if mutation == 'duplicate': changed['anchor_diagnostics'][-1] = copy.deepcopy(changed['anchor_diagnostics'][0])
                if mutation == 'class': changed['anchor_diagnostics'][0]['candidates'][0]['maxclass'] = 'number'
                if mutation == 'geometry': changed['anchor_diagnostics'][-1]['candidates'][0]['rect'][0] += .001
                if mutation == 'unexpected-observation': changed['numeric_mode_observations'] = [{}]
                if mutation == 'identity': changed['command_id'] = 52
                (work / 'observations/ack-request-51.json').write_bytes(n.canonical(changed))
                evidence['ack_sha256'] = n.digest(work / 'observations/ack-request-51.json')
                with self.subTest(mutation=mutation), self.assertRaises(ValueError): n.load_plus_measurements()
            (work / 'observations/ack-request-51.json').write_bytes(n.canonical(ack)); evidence['ack_sha256'] = n.digest(work / 'observations/ack-request-51.json')
            for mutation in ('source', 'revision', 'owner', 'inventory', 'helpers', 'package'):
                changed = copy.deepcopy(config)
                if mutation == 'source': changed['documents'][0]['source_sha256'] = 'f' * 64
                if mutation == 'revision': changed['documents'][0]['revision'] = 2
                if mutation == 'owner': changed['documents'][0]['lifecycle_owner_inlet'] = 3
                if mutation == 'inventory': changed['documents'][0]['full_inventory'][0]['source_text_sha256'] = 'f' * 64
                if mutation == 'helpers': changed['helpers'][0]['sha256'] = 'f' * 64
                if mutation == 'package': changed['package_sha256'] = {}
                (work / 'config.json').write_bytes(n.canonical(changed)); evidence['config_sha256'] = n.digest(work / 'config.json')
                with self.subTest(mutation=mutation), self.assertRaises(ValueError): n.load_plus_measurements()
            (work / 'config.json').write_bytes(n.canonical(config)); evidence['config_sha256'] = n.digest(work / 'config.json')
            (work / 'source.maxhelp').write_bytes(b'Changed sealed source.')
            with self.assertRaises(ValueError): n.load_plus_measurements()
            (work / 'source.maxhelp').write_bytes(source)
            manifest_payload = manifest.read_bytes(); manifest.unlink(); manifest.symlink_to(audit)
            with self.assertRaises(ValueError): n.load_plus_measurements()
            manifest.unlink(); manifest.write_bytes(manifest_payload)
            (work / 'source.maxhelp').unlink(); (work / 'source.maxhelp').symlink_to(audit)
            with self.assertRaises(ValueError): n.load_plus_measurements()

    def test_metadata_attaches_distinct_v8_policies_and_retains_source_descriptors(self):
        n = module('arithmetic'); definition, raw, numeric_pins, root_pins = v8_fixture(n)
        boxes, inventory = definition['boxes'], definition['full_inventory']
        measured = dict(numeric={b['anchor']: b['initial_numeric'] for b in boxes if b['maxclass'] == 'flonum'},
            roots={b['anchor']: b['v8_root_representation_policy']['live_rect'] for b in inventory if b['anchor'] in root_pins})
        for b in boxes + inventory:
            b.pop('v8_numeric_representation_policy', None); b.pop('v8_root_representation_policy', None)
        for b in boxes: b['role'] = None
        with tempfile.TemporaryDirectory() as temporary, ExitStack() as patches:
            resources = Path(temporary); (resources / 'help/max').mkdir(parents=True); (resources / 'help/resources').mkdir()
            source = b'{"patcher":{}}'; source_sha = hashlib.sha256(source).hexdigest()
            (resources / 'help/max/times.maxhelp').write_bytes(source)
            helper = b'Original synthetic helper.'; helper_sha = hashlib.sha256(helper).hexdigest()
            for name in n.HELPERS: (resources / 'help/resources' / name).write_bytes(helper)
            for name, value in (('IDENTITIES', {'times': source_sha}), ('SOURCE_BYTES', {'times': len(source)}),
                    ('GEOMETRY_SOURCE', source_sha), ('HELPERS', {name: helper_sha for name in n.HELPERS}),
                    ('NUMERIC_REPRESENTATION_PINS', numeric_pins), ('V8_ROOT_REPRESENTATION_PINS', root_pins), ('TIMES_GEOMETRY_PINS', {})):
                patches.enter_context(patch.object(n, name, value))
            patches.enter_context(patch.object(n, 'source_inventory', return_value=(boxes, inventory, [])))
            patches.enter_context(patch.object(n, 'load_geometry_measurements', return_value={}))
            patches.enter_context(patch.object(n, 'load_numeric_representation_measurements', return_value=measured['numeric']))
            patches.enter_context(patch.object(n, 'load_v8_representation_measurements', return_value=measured))
            docs, _, _ = n.source_metadata(resources); doc = docs[0]
            self.assertEqual(sum('v8_numeric_representation_policy' in b for b in doc['boxes']), 3)
            self.assertEqual(sum('v8_root_representation_policy' in b for b in doc['full_inventory']), 2)
            self.assertTrue(all(b['runtime_class'] == 'flonum' and b['runtime_classes'] == ['flonum']
                for b in doc['boxes'] if b['maxclass'] == 'flonum'))
            self.assertTrue(all(b['runtime_class'] == 'patcher' and b['runtime_classes'] == ['patcher', 'p']
                for b in doc['full_inventory'] if b['anchor'] in root_pins))

    def test_capture003_loader_verifies_seal_and_exact_live_rows(self):
        n = module('arithmetic')
        self.assertTrue(hasattr(n, 'load_v8_representation_measurements'), 'Immutable capture003 loader missing')
        with tempfile.TemporaryDirectory() as temporary, ExitStack() as patches:
            base = Path(temporary); package = base / 'package'; package.mkdir()
            work = base / '.cache/alive-ultra-evidence/arithmetic-max-runtime-003'
            (work / 'observations').mkdir(parents=True); work.chmod(0o700); (work / 'observations').chmod(0o700)
            document, raw, numeric_pins, root_pins = v8_fixture(n)
            document['observer_leaves'] = [{} for _ in range(35 - len(document['boxes']))]
            root_boxes = document['full_inventory'][:2]
            for index, (anchor, cls) in enumerate((('root/obj-3', 'js'), ('root/obj-6', 'jsui'))):
                root_boxes.append(dict(anchor=anchor, maxclass='newobj' if cls == 'js' else 'jsui', runtime_class=cls,
                    runtime_classes=[cls], rect=[index * 80, 100, 60, 20], source_box_sha256=str(index + 7) * 64,
                    source_text_sha256=hashlib.sha256(b'').hexdigest(), source_varname=None))
            document['full_inventory'] = root_boxes + document['boxes']
            source = b'Original synthetic capture003 source.'; source_sha = hashlib.sha256(source).hexdigest()
            document.update(pristine_path=str(work / 'source.maxhelp'), source_sha256=source_sha)
            source_roots = {b['anchor']: dict(source_box_sha256=b['source_box_sha256'], source_text_sha256=b['source_text_sha256'],
                runtime_class=b['runtime_class'], runtime_classes=b['runtime_classes'], saved_rect_sha256=n.geometry_vector_digest(b['rect']))
                for b in root_boxes}
            n.retain_raw(work / 'source.maxhelp', source)
            diagnostics = dict(engine='v8', request_id=2, operation_request_id=1, step_id='install-times-r1', action='install',
                action_document='times', action_revision=1, document='times', revision=1, source_sha256=source_sha,
                helper_sha256=dict(n.HELPERS), receipt_tag_observed=False, inventory_complete=True,
                inventory_coverage={scope: dict(complete=True, status='complete', observed_count=count, complete_count=count, limit=count)
                    for scope, count in (('root', 8), ('numeric', 35))}, strict_mismatch=True,
                numeric_rows=copy.deepcopy(raw['v8_representation_witnesses']['numeric']), root_rows=[])
            for row in diagnostics['numeric_rows']:
                row.update(expected_runtime_classes=['flonum'], observed_candidate_count=1, probe_disposition='observed')
            for box in root_boxes:
                live = box.get('v8_root_representation_policy', {}).get('live_rect', box['rect'])
                actual = 'jpatcher' if box['runtime_class'] == 'patcher' else box['runtime_class']
                diagnostics['root_rows'].append(dict(anchor=box['anchor'], source_box_sha256=box['source_box_sha256'],
                    source_text_sha256=box['source_text_sha256'], source_class=box['maxclass'], expected_runtime_classes=box['runtime_classes'],
                    candidate_count=1, observed_candidate_count=1, candidate_count_complete=True,
                    candidates=[dict(runtime_class=actual, rect=live, geometry_matches=True)], actual_runtime_class=actual, live_rect=live))
            for box in document['boxes']: box['rect'] = [float(v) for v in box['rect']]
            config = dict(work=str(work), documents=[document], helpers=[dict(name=k, sha256=v) for k, v in n.HELPERS.items()])
            ack = dict(command_id=1, step_id='install-times-r1', success=True, working_path=document['working_windows_path'])
            failure = dict(success=False, request_id=2, error_code='numeric-readback-refused', numeric_mode_observation=None,
                v8_representation_diagnostics=diagnostics)
            for name, value in (('config.json', config), ('seal.json', dict(files={'source.maxhelp': source_sha})),
                    ('observations/ack-request-1.json', ack), ('observations/request-2-times-r1.json', failure)):
                n.write_json(work / name, value)
            manifest = package / 'preparation-manifest-arithmetic003.json'; manifest.write_bytes(b'Synthetic manifest.')
            stage = base / '.superpowers/sdd/2026-10-22-arithmetic-root-runtime'; stage.mkdir(parents=True)
            audit = stage / 'capture-003-audit.md'; audit.write_bytes(b'Synthetic audit.')
            evidence = dict(raw_sha256=n.digest(work / 'observations/request-2-times-r1.json'), ack_sha256=n.digest(work / 'observations/ack-request-1.json'),
                config_sha256=n.digest(work / 'config.json'), seal_sha256=n.digest(work / 'seal.json'), manifest_sha256=n.digest(manifest),
                rea_evidence_id='synthetic', audit_sha256=n.digest(audit))
            for name, value in (('ROOT', package), ('REPO', base), ('GEOMETRY_SOURCE', source_sha),
                    ('NUMERIC_REPRESENTATION_PINS', numeric_pins), ('V8_ROOT_REPRESENTATION_PINS', root_pins),
                    ('TIMES_GEOMETRY_PINS', {anchor: dict(pin, live_rect_sha256=pin['saved_rect_sha256']) for anchor, pin in source_roots.items()}),
                    ('V8_SOURCE_ROOT_PINS', source_roots), ('V8_REPRESENTATION_EVIDENCE', evidence)):
                patches.enter_context(patch.object(n, name, value))
            patches.enter_context(patch.object(Path, 'home', return_value=base))
            measured = n.load_v8_representation_measurements()
            self.assertEqual(set(measured['numeric']), set(numeric_pins))
            self.assertEqual(set(measured['roots']), set(root_pins))
            for mutation in ('duplicate', 'format', 'array', 'value', 'root-class', 'root-rect', 'coverage', 'request', 'source'):
                changed = copy.deepcopy(failure); d = changed['v8_representation_diagnostics']
                if mutation == 'duplicate': d['numeric_rows'][-1] = copy.deepcopy(d['numeric_rows'][0])
                if mutation == 'format': d['numeric_rows'][0]['format_observation']['value'] = 5
                if mutation == 'array': d['numeric_rows'][0]['value_observation']['representation'] = 'singleton-number-array'
                if mutation == 'value': d['numeric_rows'][0]['value_observation']['value'] += .25
                if mutation == 'root-class': d['root_rows'][0]['actual_runtime_class'] = 'patcher'
                if mutation == 'root-rect': d['root_rows'][0]['live_rect'][3] += 1
                if mutation == 'coverage': d['inventory_coverage']['numeric']['complete'] = False
                if mutation == 'request': d['operation_request_id'] = 9
                if mutation == 'source': d['source_sha256'] = 'f' * 64
                (work / 'observations/request-2-times-r1.json').write_bytes(n.canonical(changed))
                evidence['raw_sha256'] = n.digest(work / 'observations/request-2-times-r1.json')
                with self.subTest(mutation=mutation), self.assertRaises(ValueError): n.load_v8_representation_measurements()
            (work / 'source.maxhelp').write_bytes(b'changed')
            with self.assertRaises(ValueError): n.load_v8_representation_measurements()

    def test_v8_live_witnesses_admit_exact_source_representations_without_rewriting(self):
        n = module('arithmetic')
        self.assertTrue(hasattr(n, 'V8_REPRESENTATION_EVIDENCE'), 'Capture003 V8 gate missing')
        document, raw, numeric_pins, root_pins = v8_fixture(n)
        with patch.object(n, 'NUMERIC_REPRESENTATION_PINS', numeric_pins), patch.object(n, 'V8_ROOT_REPRESENTATION_PINS', root_pins):
            before = copy.deepcopy((document, raw))
            result = n.validate_checkpoint(document, raw, 7, 'times-A01', 'event')
            self.assertEqual(result['v8_representation_witnesses'], raw['v8_representation_witnesses'])
            self.assertEqual((document, raw), before)
            floats = [v for v in result['numeric_states'] if v['semantic_tag'] == 'float']
            self.assertEqual(len(floats), 3)
            self.assertTrue(all(v['class_name'] == 'number' and v['source_class'] == 'flonum' for v in floats))
            float_rects = copy.deepcopy(document)
            for box in float_rects['boxes']: box['rect'] = [float(v) for v in box['rect']]
            n.validate_checkpoint(float_rects, raw, 7, 'times-A01', 'event')
            second_document, second_raw = copy.deepcopy(document), copy.deepcopy(raw)
            second_document.update(revision=2, lifecycle_owner_inlet=1)
            second_raw.update(revision=2, action_revision=2, step_id='times-A21')
            second_raw['v8_representation_witnesses'].update(revision=2, action_revision=2, step_id='times-A21')
            n.validate_checkpoint(second_document, second_raw, 7, 'times-A21', 'event')
            for mutation in ('missing', 'owner', 'source', 'evidence', 'root-class', 'root-rect', 'numeric-format',
                    'numeric-array', 'numeric-null', 'numeric-duplicate', 'coverage', 'basis', 'raw-class', 'input-duplicate',
                    'output-duplicate', 'leaf-duplicate', 'missing-empty-control', 'boolean-owner', 'boolean-operation',
                    'boolean-request', 'boolean-inlet', 'boolean-revision', 'source-text', 'source-empty', 'source-inlets', 'source-outlets'):
                altered = copy.deepcopy(raw); definition = copy.deepcopy(document)
                witness = altered['v8_representation_witnesses']
                if mutation == 'missing': altered.pop('v8_representation_witnesses')
                if mutation == 'owner': witness['revision'] = 2
                if mutation == 'source': definition['source_sha256'] = 'f' * 64
                if mutation == 'evidence': witness['evidence']['raw_sha256'] = 'f' * 64
                if mutation == 'root-class': witness['roots'][0]['actual_runtime_class'] = 'patcher'
                if mutation == 'root-rect': witness['roots'][0]['live_rect'][3] += 1
                if mutation == 'numeric-format': witness['numeric'][0]['format_observation']['value'] = 5
                if mutation == 'numeric-array': witness['numeric'][0]['value_observation']['representation'] = 'singleton-number-array'
                if mutation == 'numeric-null': witness['numeric'][0]['value_observation']['value'] = None
                if mutation == 'numeric-duplicate': witness['numeric'][-1] = copy.deepcopy(witness['numeric'][0])
                if mutation == 'coverage': witness['inventory_coverage']['numeric']['complete'] = False
                if mutation == 'basis': altered['numeric'][4]['semantic_tag_basis'] = 'flonum-class'
                if mutation == 'raw-class': altered['boxes'][4]['maxclass'] = 'flonum'
                if mutation == 'input-duplicate': altered['input_routes'].append(copy.deepcopy(altered['input_routes'][0]))
                if mutation == 'output-duplicate': altered['output_routes'].append(copy.deepcopy(altered['output_routes'][0]))
                if mutation == 'leaf-duplicate': altered['boxes'].append(copy.deepcopy(altered['boxes'][-1]))
                if mutation == 'missing-empty-control': altered['boxes'].pop(7)
                if mutation == 'boolean-owner': altered['action_revision'] = True
                if mutation == 'boolean-operation': altered['operation_request_id'] = True
                if mutation == 'boolean-request': altered['request_id'] = True
                if mutation == 'boolean-inlet': definition['lifecycle_owner_inlet'] = False
                if mutation == 'boolean-revision': altered['revision'] = True
                if mutation == 'source-text': definition['boxes'][0].update(authored_text='changed', authored_empty=False)
                if mutation == 'source-empty': definition['boxes'][0]['authored_empty'] = False
                if mutation == 'source-inlets': definition['boxes'][0]['inlets'] = 0
                if mutation == 'source-outlets': definition['boxes'][0]['outlets'] = 1
                with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                    n.validate_checkpoint(definition, altered, 7, 'times-A01', 'event')
            evolved = copy.deepcopy(raw)
            evolved['numeric'][4]['value'] = 91827.25
            evolved['v8_representation_witnesses']['numeric'][0]['value_observation']['value'] = 91827.25
            n.validate_checkpoint(document, evolved, 7, 'times-A01', 'event')
            for item in (evolved,):
                item.update(action='install', step_id='install-times-r1')
                item['v8_representation_witnesses'].update(action='install', step_id='install-times-r1')
                with self.assertRaises(ValueError): n.validate_checkpoint(document, item, 7, 'install-times-r1', 'install')

    def test_capture002_loader_binds_exact_readonly_default_value_observations(self):
        n = module('arithmetic')
        self.assertTrue(hasattr(n, 'load_numeric_representation_measurements'))
        with tempfile.TemporaryDirectory() as temporary, ExitStack() as patches:
            base = Path(temporary); work = base / '.cache/alive-ultra-evidence/arithmetic-max-runtime-002'
            work.mkdir(parents=True, mode=0o700); (work / 'observations').mkdir(mode=0o700)
            package = base / 'package'; package.mkdir()
            source = b'Original synthetic source fixture without explicit UI value.\n'
            source_sha = hashlib.sha256(source).hexdigest(); n.retain_raw(work / 'source.maxhelp', source)
            initial = n.initial_numeric(dict(maxclass='flonum'))
            self.assertEqual(initial, 0, 'Omitted UI value uses the source-derived default without a message')
            pins, boxes, diagnostics = {}, [], []
            for index, anchor in enumerate(n.NUMERIC_REPRESENTATION_PINS):
                box = dict(anchor=anchor, maxclass='flonum', runtime_class='flonum', runtime_classes=['flonum'],
                    rect=[80 * index, 40, 60, 20], initial_numeric=initial, source_box_sha256='a' * 64,
                    source_text_sha256=hashlib.sha256(b'').hexdigest())
                boxes.append(box)
                pins[anchor] = {key: box[key] for key in ('source_box_sha256', 'source_text_sha256')}
                pins[anchor].update(saved_rect_sha256=hashlib.sha256(n.canonical(box['rect'])).hexdigest(),
                    initial_numeric_sha256=hashlib.sha256(n.canonical([initial, 0, 0, 0])).hexdigest())
                observation = dict(anchor=anchor, document='times', revision=1, source_sha256=source_sha,
                    source_box_sha256=box['source_box_sha256'], request_id=1, step_id='install-times-r1',
                    operation_action='install', source_class='flonum', runtime_class='number', receipt_tag_observed=False,
                    format_observation=dict(method='getattr', attribute='format', status='returned', representation='scalar-number', value=6),
                    value_observation=dict(method='getvalueof', status='returned', representation='singleton-number-array', value=initial))
                diagnostics.append(dict(expected_anchor=anchor, expected_rect=box['rect'],
                    candidates=[dict(maxclass='number', rect=box['rect'])], numeric_preflight_observation=observation))
            definition = dict(document='times', revision=1, source_sha256=source_sha, helper_sha256=dict(n.HELPERS),
                pristine_path=str(work / 'source.maxhelp'), boxes=boxes)
            config = dict(work=str(work), documents=[definition], helpers=[dict(name=name, sha256=sha) for name, sha in n.HELPERS.items()])
            ack = dict(command_id=1, success=False, anchor_diagnostics=diagnostics)
            n.write_json(work / 'config.json', config)
            n.write_json(work / 'seal.json', dict(files={'source.maxhelp': source_sha}))
            n.write_json(work / 'observations/ack-request-1.json', ack)
            manifest = package / 'preparation-manifest-arithmetic002.json'; manifest.write_bytes(b'Original synthetic manifest.\n')
            evidence = dict(ack_sha256=n.digest(work / 'observations/ack-request-1.json'),
                config_sha256=n.digest(work / 'config.json'), seal_sha256=n.digest(work / 'seal.json'),
                manifest_sha256=n.digest(manifest), rea_evidence_id='synthetic')
            for name, value in (('ROOT', package), ('GEOMETRY_SOURCE', source_sha), ('NUMERIC_REPRESENTATION_PINS', pins),
                    ('NUMERIC_REPRESENTATION_EVIDENCE', evidence)):
                patches.enter_context(patch.object(n, name, value))
            patches.enter_context(patch.object(Path, 'home', return_value=base))
            self.assertEqual(n.load_numeric_representation_measurements(), {anchor: 0 for anchor in pins})
            for mutation in ('missing', 'duplicate', 'format', 'getter', 'value', 'request', 'unknown'):
                changed = copy.deepcopy(ack)
                row = changed['anchor_diagnostics'][0]['numeric_preflight_observation']
                if mutation == 'missing': changed['anchor_diagnostics'].pop()
                if mutation == 'duplicate': changed['anchor_diagnostics'][1] = copy.deepcopy(changed['anchor_diagnostics'][0])
                if mutation == 'format': row['format_observation']['representation'] = 'singleton-number-array'
                if mutation == 'getter': row['value_observation']['representation'] = 'scalar-number'
                if mutation == 'value': row['value_observation']['value'] = .125
                if mutation == 'request': row['request_id'] = 2
                if mutation == 'unknown': row['value_observation']['value'] = None
                (work / 'observations/ack-request-1.json').write_bytes(n.canonical(changed) + b'\n')
                evidence['ack_sha256'] = n.digest(work / 'observations/ack-request-1.json')
                with self.subTest(mutation=mutation), self.assertRaises(ValueError): n.load_numeric_representation_measurements()
            (work / 'observations/ack-request-1.json').write_bytes(n.canonical(ack) + b'\n')
            evidence['ack_sha256'] = n.digest(work / 'observations/ack-request-1.json')
            (work / 'source.maxhelp').write_bytes(b'changed sealed bytes')
            with self.assertRaises(ValueError): n.load_numeric_representation_measurements()

    def test_controller_policy_preserves_strict_v8_classes_and_exact_private_bindings(self):
        n = module('arithmetic')
        self.assertTrue(hasattr(n, 'validate_controller_representation_policy'), 'Controller-only representation gate missing')
        anchor = 'root/obj-4/obj-1'; saved = [8, 12, 60, 20]; initial = 91827.25
        pin = dict(source_box_sha256='a' * 64, source_text_sha256=hashlib.sha256(b'').hexdigest(),
            saved_rect_sha256=hashlib.sha256(n.canonical(saved)).hexdigest(),
            initial_numeric_sha256=hashlib.sha256(n.canonical([initial, 0, 0, 0])).hexdigest())
        box = dict(anchor=anchor, maxclass='flonum', runtime_class='flonum', runtime_classes=['flonum'],
            rect=saved, initial_numeric=initial, source_box_sha256=pin['source_box_sha256'],
            source_text_sha256=pin['source_text_sha256'])
        definition = dict(document='times', source_sha256=n.GEOMETRY_SOURCE, helper_sha256=dict(n.HELPERS))
        policy = dict(kind='times-controller-numeric-representation-v1', engine='js-controller', document='times',
            source_sha256=n.GEOMETRY_SOURCE, anchor=anchor, source_class='flonum', runtime_class='number',
            **pin, helper_sha256=dict(n.HELPERS), evidence=dict(n.NUMERIC_REPRESENTATION_EVIDENCE),
            format_method='getattr', format_attribute='format', format_representation='scalar-number',
            format_value=6, getter_method='getvalueof', getter_representation='singleton-number-array',
            finite_required=True, source_initial_equality=True)
        with patch.object(n, 'NUMERIC_REPRESENTATION_PINS', {anchor: pin}):
            self.assertEqual(n.validate_controller_representation_policy(definition, box, policy), policy)
            for mutation in ('source', 'helper', 'anchor', 'box', 'text', 'rect', 'initial', 'evidence', 'class', 'revision'):
                changed = copy.deepcopy(policy); b = copy.deepcopy(box); d = copy.deepcopy(definition)
                if mutation == 'source': d['source_sha256'] = 'f' * 64
                if mutation == 'helper': d['helper_sha256']['helpargs.js'] = 'f' * 64
                if mutation == 'anchor': changed['anchor'] = 'root/obj-2/obj-1'
                if mutation == 'box': b['source_box_sha256'] = 'f' * 64
                if mutation == 'text': b['source_text_sha256'] = 'f' * 64
                if mutation == 'rect': b['rect'][2] += 1
                if mutation == 'initial': b['initial_numeric'] += .125
                if mutation == 'evidence': changed['evidence']['ack_sha256'] = 'f' * 64
                if mutation == 'class': b['runtime_classes'] = ['flonum', 'number']
                if mutation == 'revision': d['revision'] = 1.5
                with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                    n.validate_controller_representation_policy(d, b, changed)
            document, raw = synthetic_checkpoint(n)
            target = document['boxes'][4]; old_anchor = target['anchor']
            target.update(copy.deepcopy(box), id='synthetic-4', controller_numeric_representation_policy=policy)
            for row in raw['numeric']:
                if row['anchor'] == old_anchor: row['anchor'] = anchor
            raw['boxes'][4].update(rect=saved)
            raw['boxes'][4]['varname'] = n.original_varname(target)
            document['helper_sha256'] = dict(n.HELPERS)
            document['observer_leaves'] = n.observer_definitions(document)
            self.assertEqual(len(n.validate_checkpoint(document, raw, 7, 'synthetic', 'event')['numeric_states']), 7)
            raw['boxes'][4]['maxclass'] = 'number'
            with self.assertRaisesRegex(ValueError, 'Exact arithmetic runtime class changed'):
                n.validate_checkpoint(document, raw, 7, 'synthetic', 'event')

    def test_measured_geometry_is_exact_source_helper_anchor_and_vector_bound(self):
        n = module('arithmetic')
        self.assertTrue(hasattr(n, 'validate_geometry_policy'), 'Measured arithmetic geometry gate missing')
        saved, live = [4, 8, 40, 20], [4, 8, 41.25, 20]
        anchor = 'root/obj-4/obj-5'; source_box = 'a' * 64; text_sha = hashlib.sha256(b'').hexdigest()
        pin = dict(runtime_class='jsui', changed_dimension=2, source_box_sha256=source_box,
            source_text_sha256=text_sha, saved_rect_sha256=hashlib.sha256(n.canonical(saved)).hexdigest(),
            live_rect_sha256=hashlib.sha256(n.canonical(live)).hexdigest())
        expected = dict(anchor=anchor, maxclass='jsui', runtime_class='jsui', rect=saved,
            source_box_sha256=source_box, source_text_sha256=text_sha, saved_incoming_routes=0, saved_outgoing_routes=0)
        definition = dict(document='times', source_sha256=n.GEOMETRY_SOURCE, helper_sha256=dict(n.HELPERS))
        policy = dict(kind='times-observed-geometry-v1', document='times', source_sha256=n.GEOMETRY_SOURCE,
            anchor=anchor, runtime_class='jsui', changed_dimension=2, source_box_sha256=source_box,
            source_text_sha256=text_sha, saved_rect=saved, live_rect=live,
            saved_rect_sha256=pin['saved_rect_sha256'], live_rect_sha256=pin['live_rect_sha256'],
            helper_sha256=dict(n.HELPERS), evidence=dict(n.GEOMETRY_EVIDENCE),
            saved_incoming_routes=0, saved_outgoing_routes=0)
        with patch.object(n, 'TIMES_GEOMETRY_PINS', {anchor: pin}):
            self.assertEqual(n.validate_geometry_policy(definition, expected, policy), policy)
            float_box = dict(expected, rect=[float(value) for value in saved])
            float_policy = dict(policy, saved_rect=float_box['rect'])
            self.assertEqual(n.validate_geometry_policy(definition, float_box, float_policy), float_policy)
            for mutation in ('document', 'source', 'helper', 'anchor', 'box', 'live', 'axis', 'evidence', 'route'):
                changed = copy.deepcopy(policy); document = copy.deepcopy(definition)
                if mutation == 'document': document['document'] = 'plus'
                if mutation == 'source': document['source_sha256'] = 'f' * 64
                if mutation == 'helper': changed['helper_sha256']['helpargs.js'] = 'f' * 64
                if mutation == 'anchor': changed['anchor'] = 'root/obj-2/obj-4'
                if mutation == 'box': changed['source_box_sha256'] = 'f' * 64
                if mutation == 'live': changed['live_rect'][2] += .125
                if mutation == 'axis': changed['live_rect'][3] += 1
                if mutation == 'evidence': changed['evidence']['ack_sha256'] = 'f' * 64
                if mutation == 'route': changed['saved_outgoing_routes'] = 1
                with self.subTest(mutation=mutation), self.assertRaises(ValueError): n.validate_geometry_policy(document, expected, changed)

    def test_dry_run_cli_has_no_execute_path_and_binds_the_same_score(self):
        cli = module('prepare-runtime')
        output = io.StringIO()
        with redirect_stdout(output): self.assertEqual(cli.main([]), 0)
        result = json.loads(output.getvalue())
        self.assertEqual(result['status'], 'NOT_EXECUTED')
        self.assertIs(result['runtime_started'], False)
        self.assertEqual(result['score_binding']['sha256'], '95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb')
        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()), self.assertRaises(SystemExit): cli.main(['--execute'])

    def test_immutable_manifest_names_are_finite_contained_json_names(self):
        n = module('arithmetic')
        self.assertEqual(n.preparation_manifest_path('preparation-manifest-retry002.json'), ROOT / 'preparation-manifest-retry002.json')
        for name in ('../preparation-manifest.json', '/tmp/preparation-manifest.json', 'seal.json', 'preparation-manifest-.json'):
            with self.subTest(name=name), self.assertRaises(ValueError): n.preparation_manifest_path(name)

    def test_private_preparation_seals_all_synthetic_revisions_and_keeps_retry_manifests_immutable(self):
        n = module('arithmetic')
        with tempfile.TemporaryDirectory() as temporary, ExitStack() as patches:
            base = Path(temporary); home = base / 'home'; package = base / 'package'; resources = base / 'resources'
            package.mkdir(); (resources / 'help/max').mkdir(parents=True); (resources / 'help/resources').mkdir()
            for name in n.PACKAGE_FILES: (package / name).write_bytes(b'// Original synthetic package bytes.\n')
            helper_payload = b'// Original synthetic installed helper.\n'; helper_sha = hashlib.sha256(helper_payload).hexdigest()
            for name in n.HELPERS: (resources / 'help/resources' / name).write_bytes(helper_payload)
            identities, sizes, operands = {}, {}, {}
            for document in n.IDENTITIES:
                payload = json.dumps(dict(patcher=synthetic_source(n, document))).encode()
                (resources / 'help/max' / (document + '.maxhelp')).write_bytes(payload)
                identities[document] = hashlib.sha256(payload).hexdigest(); sizes[document] = len(payload)
                operands[document] = tuple(hashlib.sha256((n.CLASSES[document] + value).encode()).hexdigest()
                    for value in (' 91827', ' 91827.25'))
            argument = hashlib.sha256(b'synthetic').hexdigest(); starter = hashlib.sha256(b'js helpstarter.js synthetic').hexdigest()
            for target, name, value in ((n, 'ROOT', package), (n, 'IDENTITIES', identities), (n, 'SOURCE_BYTES', sizes),
                    (n, 'HELPERS', {name: helper_sha for name in n.HELPERS}),
                    (n, 'HELPER_ARGUMENT_HASHES', {doc: (argument, argument) for doc in identities}),
                    (n, 'STARTER_HASHES', {doc: starter for doc in identities}), (n, 'OPERATOR_HASHES', operands),
                    (n.common, 'RESOURCES', resources)):
                patches.enter_context(patch.object(target, name, value))
            patches.enter_context(patch.object(Path, 'home', return_value=home))
            patches.enter_context(patch.object(n, 'score_binding', return_value={'sha256': 'f' * 64, 'operations': 78}))
            patches.enter_context(patch.object(n, 'load_score', side_effect=n.expected_score))
            work = home / '.cache/alive-ultra-evidence/synthetic-001'
            config = n.prepare_private(work, resources)
            self.assertEqual(len(config['documents']), 6)
            self.assertEqual(len(config['lifecycle']['owners']), 6)
            self.assertEqual(n.verify_private(work), config)
            self.assertTrue(all(path.stat().st_mode & 0o777 == (0o700 if path.is_dir() else 0o600) for path in [work, *work.rglob('*')]))
            manifest = package / 'preparation-manifest.json'; original = manifest.read_bytes()
            for name in ('synthetic-001', 'synthetic-002'):
                with self.assertRaises(ValueError): n.prepare_private(work.parent / name, resources)
            retry = work.parent / 'synthetic-002'
            n.prepare_private(retry, resources, 'preparation-manifest-retry002.json')
            self.assertEqual(manifest.read_bytes(), original)
            n.verify_private(work); n.verify_private(retry)
            changed = Path(config['documents'][0]['pristine_path']); changed.write_bytes(b'changed')
            with self.assertRaises(ValueError): n.verify_private(work)

    def test_synthetic_source_metadata_pins_helper_sizes_and_full_original_inventory(self):
        n = module('arithmetic'); root = synthetic_source(n)
        argument_sha = hashlib.sha256(b'synthetic').hexdigest()
        operators = [hashlib.sha256(value.encode()).hexdigest() for value in ('* 91827', '* 91827.25')]
        helper_bytes = b'// Synthetic installed helper fixture.\n'
        helper_sha = hashlib.sha256(helper_bytes).hexdigest()
        with tempfile.TemporaryDirectory() as temporary:
            resources = Path(temporary)
            (resources / 'help/max').mkdir(parents=True); (resources / 'help/resources').mkdir()
            payload = json.dumps(dict(patcher=root)).encode()
            (resources / 'help/max/times.maxhelp').write_bytes(payload)
            for filename in n.HELPERS: (resources / 'help/resources' / filename).write_bytes(helper_bytes)
            with patch.object(n, 'IDENTITIES', {'times': hashlib.sha256(payload).hexdigest()}), \
                 patch.object(n, 'SOURCE_BYTES', {'times': len(payload)}), \
                 patch.object(n, 'HELPERS', {filename: helper_sha for filename in n.HELPERS}), \
                 patch.dict(n.HELPER_ARGUMENT_HASHES, times=(argument_sha, argument_sha)), \
                 patch.dict(n.STARTER_HASHES, times=hashlib.sha256(b'js helpstarter.js synthetic').hexdigest()), \
                 patch.dict(n.OPERATOR_HASHES, times=operators):
                docs, public, helpers = n.source_metadata(resources)
                self.assertEqual(len(docs[0]['full_inventory']), 20)
                self.assertTrue(all(type(b.get('inlets')) is int and type(b.get('outlets')) is int for b in docs[0]['full_inventory']))
                self.assertEqual(len(docs[0]['saved_edges']), 8)
                self.assertEqual(len([b for b in docs[0]['boxes'] if b['role']]), 10)
                self.assertTrue(all(helper['bytes'] == len(helper_bytes) for helper in helpers))
                self.assertNotIn('91827', json.dumps(public))
                for mutation in ('helper-route', 'script', 'role', 'argument', 'root-route', 'child-name'):
                    altered = copy.deepcopy(root)
                    if mutation == 'helper-route': altered['boxes'][1]['box']['patcher']['lines'][0]['patchline']['source'][0] = 'obj-2'
                    if mutation == 'script': altered['boxes'][1]['box']['patcher']['boxes'][10]['box'].update(maxclass='jsui')
                    if mutation == 'role': altered['boxes'][1]['box']['patcher']['boxes'][0]['box']['maxclass'] = 'number'
                    if mutation == 'argument': altered['boxes'][3]['box']['jsarguments'] = ['changed']
                    if mutation == 'root-route': altered['lines'] = [dict(patchline=dict(source=['obj-3', 0], destination=['obj-6', 0]))]
                    if mutation == 'child-name': altered['boxes'][1]['box']['varname'] = 'changed'
                    with self.subTest(mutation=mutation), self.assertRaises(ValueError): n.source_inventory('times', altered, helpers)

    def test_exact_score_matrix_and_immutable_identity(self):
        n = module('arithmetic')
        score = n.load_score()
        rows = n.timeline(score)
        self.assertEqual(n.digest(ROOT / 'score.json'), '95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb')
        self.assertEqual(Counter(r['action'] for r in rows), dict(event=66, install=6, close=6))
        self.assertEqual(sum(len(r['live_owners']) for r in rows), 72)
        self.assertEqual(rows[-1]['live_owners'], {})
        self.assertEqual(rows[1]['anchor'], 'root/obj-4/obj-22')
        self.assertEqual(rows[27]['anchor'], 'root/obj-2/obj-22')
        for mutate in ('missing', 'duplicate', 'tag', 'anchor', 'reorder'):
            altered = copy.deepcopy(score)
            if mutate == 'missing': altered.pop()
            if mutate == 'duplicate': altered[4] = copy.deepcopy(altered[3])
            if mutate == 'tag': altered[6]['message']['atoms'][0]['tag'] = 'int'
            if mutate == 'anchor': altered[1]['anchor'] = 'root/obj-2/obj-22'
            if mutate == 'reorder': altered[0], altered[26] = altered[26], altered[0]
            with self.subTest(mutate=mutate), self.assertRaises(ValueError): n.timeline(altered)

    def test_seven_getters_keep_class_basis_distinct_from_outlet_evidence(self):
        n = module('arithmetic'); document, raw = synthetic_checkpoint(n)
        result = n.validate_checkpoint(document, raw, 7, 'synthetic', 'event')
        self.assertEqual(len(result['numeric_states']), 7)
        self.assertTrue(all(row['receipt_tag_observed'] is False for row in result['numeric_states']))
        self.assertFalse(result['retention']['saved_order_observed'])
        for mutation in ('duplicate', 'null', 'nonfinite', 'fractional-int', 'class', 'forward', 'mode', 'message', 'geometry'):
            altered = copy.deepcopy(raw); definition = copy.deepcopy(document)
            if mutation == 'duplicate': altered['numeric'][-1] = copy.deepcopy(altered['numeric'][0])
            if mutation == 'null': altered['numeric'][0]['value'] = None
            if mutation == 'nonfinite': altered['numeric'][0]['value'] = float('inf')
            if mutation == 'fractional-int': altered['numeric'][0]['value'] = 0.25
            if mutation == 'class': altered['boxes'][4]['maxclass'] = 'number'
            if mutation == 'forward': altered['output_routes'].append(copy.deepcopy(altered['output_routes'][0]))
            if mutation == 'mode': definition['boxes'][4]['numeric_mode_policy'] = {'kind': 'inherited'}
            if mutation == 'message': altered['messages'] = [dict(anchor='fabricated', text='synthetic')]
            if mutation == 'geometry': altered['boxes'][0]['rect'][3] += 1
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                n.validate_checkpoint(definition, altered, 7, 'synthetic', 'event')

    def test_empty_close_checkpoint_is_explicit_and_revision_exact(self):
        n = module('arithmetic')
        n.validate_live_checkpoints(dict(live_owners={}, action='close', step_id='close'), [])
        with self.assertRaises(ValueError):
            n.validate_live_checkpoints(dict(live_owners={}, action='close', step_id='close'), [dict(document='times')])
        operation = dict(live_owners={'times': 2}, action='event', step_id='synthetic')
        row = dict(document='times', revision=2, action='event', step_id='synthetic')
        n.validate_live_checkpoints(operation, [row])
        for rows in ([], [row, row], [dict(row, revision=1)]):
            with self.assertRaises(ValueError): n.validate_live_checkpoints(operation, rows)

    def test_public_receipts_hash_source_owned_numeric_payloads(self):
        n = module('arithmetic')
        private = dict(kind='receipt', document='times', anchor='root/synthetic/0', port=0,
            message=dict(selector='float', atoms=[dict(tag='float', value=91827.25)]))
        public = n.public_receipt(private)
        self.assertNotIn('91827', json.dumps(public))
        self.assertNotIn('value', json.dumps(public))
        self.assertIn('message_sha256', public)

    def test_private_retention_is_exclusive_and_permission_checked(self):
        n = module('arithmetic')
        with tempfile.TemporaryDirectory() as temporary:
            work = Path(temporary); work.chmod(0o700)
            path = work / 'raw.json'; n.retain_raw(path, b'{"synthetic":true}\n')
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            with self.assertRaises(FileExistsError): n.retain_raw(path, b'changed')
            alias = work / 'alias'; alias.symlink_to(path)
            with self.assertRaises(ValueError): n.read_private(work, alias)
            path.chmod(0o644)
            with self.assertRaises(ValueError): n.read_private(work, path)


if __name__ == '__main__': unittest.main()
