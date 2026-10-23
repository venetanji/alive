#!/usr/bin/env python3
"""Finite Int/Float lifecycle, typed endpoint, UI state and output-order comparison."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path


PREFIX = 'root/obj-2/'
METHOD = 'v8-numeric-getvalueof'
DOCUMENTS = {'int', 'float'}
UI = {'obj-16', 'obj-17', 'obj-18', 'obj-20', 'obj-21', 'obj-33'}
MAIN_STEPS = {f'E{n:02}' for n in (8,9,10,11,13,14,16,17,18,19,20,21,22,24,25,27,28,30,32,43,47)}
HELPERS = {
    'helpstarter.js':'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8',
    'helpname.js':'49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa',
    'helpdetails.js':'31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1',
    'helpargs.js':'04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'}
COUNTS = {'int': (25,14,10), 'float': (27,16,12)}
BASIC_COUNTS = {'int': (21,20), 'float': (23,22)}
REQUEST_FIELDS = ('request_id', 'operation_request_id', 'step_id', 'action', 'action_document',
                  'action_revision', 'document', 'revision', 'source_sha256', 'working_path')
CAPABILITIES = ('initial_message_prototypes_validated', 'initial_numeric_readback_validated',
                'numeric_readback_validated', 'numeric_getters_silent_validated',
                'runtime_endpoint_readback_validated', 'typed_float_dispatch_validated')


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def integer(value, minimum=0):
    return type(value) is int and value >= minimum


def finite(value):
    try:
        return type(value) in (int, float) and math.isfinite(value)
    except OverflowError:
        return False


def digest(value):
    return isinstance(value, str) and len(value) == 64 and all(c in '0123456789abcdef' for c in value)


def symbol(value):
    return isinstance(value, str) and value.startswith('symbol-sha256:') and digest(value[14:])


def same(left, right):
    if isinstance(left, dict) and isinstance(right, dict):
        return set(left) == set(right) and all(same(value, right[key]) for key, value in left.items())
    if isinstance(left, list) and isinstance(right, list):
        return len(left) == len(right) and all(same(a, b) for a, b in zip(left, right))
    if finite(left) and finite(right) and left == right == 0:
        return math.copysign(1, left) == math.copysign(1, right)
    return left == right


def validate_message(message, stimulus=False):
    require(isinstance(message, dict) and set(message) == {'selector', 'atoms'}, 'Malformed public message')
    selector, atoms = message['selector'], message['atoms']
    require(isinstance(selector, str) and isinstance(atoms, list), 'Malformed public message')
    require(selector in {'bang','int','float','list','symbol','set'} or symbol(selector), 'Unredacted message selector')
    if stimulus:
        require(selector in {'bang','int','float'}, 'Finite stimulus must be a typed scalar')
    for atom in atoms:
        require(isinstance(atom, dict) and set(atom) == {'tag', 'value'}, 'Malformed message atom')
        tag, value = atom['tag'], atom['value']
        require((tag == 'symbol' and symbol(value)) or
                (tag in {'int','float','unknown-number'} and finite(value) and (tag != 'int' or type(value) is int)),
                'Malformed or unredacted message symbol/number')
    if selector == 'bang':
        require(not atoms, 'Bang message has atoms')
    if selector in {'int', 'float'}:
        require(len(atoms) == 1 and atoms[0]['tag'] == selector, 'Scalar message tag differs from selector')


def compare_message(reference, native):
    if reference['selector'] != native['selector'] or len(reference['atoms']) != len(native['atoms']):
        return False, 0
    unknown = 0
    for left, right in zip(reference['atoms'], native['atoms']):
        if not same(left['value'], right['value']):
            return False, unknown
        if left['tag'] == 'unknown-number':
            if right['tag'] not in {'int', 'float'}:
                return False, unknown
            unknown += 1
        elif left['tag'] != right['tag']:
            return False, unknown
    return True, unknown


def unique_rows(rows, key, expected, reason):
    require(isinstance(rows, list) and all(isinstance(row, dict) for row in rows), reason)
    values = [row.get(key) for row in rows]
    require(all(isinstance(value, str) for value in values) and Counter(values) == Counter(list(expected)), reason)
    return {row[key]: row for row in rows}


def model_timeline(score):
    require(isinstance(score, list) and len(score) == 54, 'Score must contain exactly 54 operations')
    expected = ['install-int', 'E01', 'install-float'] + [f'E{n:02}' for n in range(2, 41)]
    expected += ['close-float','E41','reinstall-float','E42','E43','E44','close-int','E45','reinstall-int','E46','E47','E48']
    require(all(isinstance(row, dict) for row in score) and [row.get('step_id') for row in score] == expected,
            'Finite score operation coverage/order differs')
    live, revisions, sources, timeline = {}, {}, {}, []
    for step in score:
        document, action = step.get('document'), step.get('action')
        require(document in DOCUMENTS and digest(step.get('source_sha256')), 'Score source/document identity is invalid')
        sources.setdefault(document, step['source_sha256'])
        require(sources[document] == step['source_sha256'], 'Score source identity changed')
        fields = {'step_id','action','document','source_sha256'}
        expected_action = 'install' if step['step_id'].startswith(('install-','reinstall-')) else 'close' if step['step_id'].startswith('close-') else 'event'
        require(action == expected_action and (action == 'event' or step['step_id'].endswith('-'+document)),
                'Finite operation action/document differs from declared step')
        if action == 'install':
            fields.add('revision')
            require(document not in live and integer(step.get('revision'), 1) and
                    step['revision'] == revisions.get(document, 0) + 1, 'Install revision/liveness differs')
            live[document] = revisions[document] = step['revision']
        elif action == 'close':
            require(document in live, 'Close owner is absent')
            del live[document]
        elif action == 'event':
            fields |= {'anchor','inlet','message'}
            require(document in live and type(step.get('inlet')) is int and step['inlet'] == 0 and
                    isinstance(step.get('anchor'), str) and step['anchor'].startswith(PREFIX), 'Event owner/anchor/inlet differs')
            validate_message(step.get('message'), stimulus=True)
        else:
            raise ValueError('Unsupported score action')
        require(set(step) == fields, 'Unexpected score operation fields')
        timeline.append(dict(step, action_revision=revisions[document], live_owners=dict(live)))
    require(set(sources) == DOCUMENTS and Counter(row['action'] for row in score) == {'install':4,'event':48,'close':2} and
            sum(len(row['live_owners']) for row in timeline) == 102 and
            Counter(d for row in timeline for d in row['live_owners']) == {'int':52,'float':50},
            'Finite lifecycle owner coverage differs')
    return timeline


def nodes_by_anchor(snapshot):
    nodes = snapshot.get('nodes')
    require(isinstance(nodes, list) and all(isinstance(node, dict) and isinstance(node.get('anchor'), str) for node in nodes),
            'Native node inventory is malformed')
    require(len({node['anchor'] for node in nodes}) == len(nodes), 'Duplicate native node anchor')
    return {node['anchor']: node for node in nodes}


def validate_native(score, native, timeline):
    sources = {step['document']: step['source_sha256'] for step in score}
    require(native.get('schema_version') == 1 and native.get('source_identities') == sources and
            native.get('action_count') == 54 and native.get('result_count') == 54 and
            native.get('all_runtime_gates_pass') is True and native.get('authoring_retained') is True and
            native.get('complete_installed_help_qualification_passes_added') == 0, 'Native admission/source/count gate failed')
    require(digest(native.get('binary_sha256')), 'Native binary identity is invalid')
    bundle_hashes = native.get('bundle_file_sha256')
    require(isinstance(bundle_hashes, dict) and set(bundle_hashes) == DOCUMENTS and
            all(isinstance(files, dict) and set(files) == {'authoring.json','flat.json','import.json','native.json'} and
                all(digest(value) for value in files.values()) for files in bundle_hashes.values()), 'Native bundle retention identities differ')
    rows = native.get('rows')
    require(isinstance(rows, list) and len(rows) == 54, 'Native operation coverage differs')
    initial, previous = {}, {}
    for row, model in zip(rows, timeline):
        require(isinstance(row, dict) and all(row.get(k) == model[k] for k in ('step_id','action','document')) and
                row.get('accepted') is True and row.get('failed') is False and row.get('templates_unchanged') is True and
                row.get('trace_overflow') is False and row.get('console') == [], 'Native operation/runtime gate differs')
        snapshots = unique_rows(row.get('snapshots'), 'document', model['live_owners'], 'Native live-owner snapshot coverage differs')
        for document, snapshot in snapshots.items():
            require(set(snapshot) == {'document','revision','text_edit_serial','console_dropped','nodes'} and
                    type(snapshot.get('revision')) is int and snapshot['revision'] == model['live_owners'][document] and
                    type(snapshot.get('text_edit_serial')) is int and snapshot['text_edit_serial'] == 0 and
                    type(snapshot.get('console_dropped')) is int and snapshot['console_dropped'] == 0,
                    'Native snapshot revision/edit/drop gate differs')
            nodes = nodes_by_anchor(snapshot)
            require(len(nodes) == COUNTS[document][1] and {PREFIX+s for s in UI} <= set(nodes) and
                    PREFIX+'obj-29' in nodes and PREFIX+'obj-9' in nodes, 'Native node anchor coverage differs')
            require(all(finite(node.get('value')) and integer(node.get('pulses')) for node in nodes.values()),
                    'Native retained state is malformed')
            for anchor, node in nodes.items():
                fields = {'anchor','kind','value','pulses','last_message'}
                if anchor == PREFIX+'obj-29':
                    fields.add('message_box')
                require(set(node) == fields and integer(node.get('kind')), 'Native node state shape/kind is malformed')
                validate_message(node['last_message'])
                short = anchor[len(PREFIX):]
                if short in UI:
                    expected_kind = 18 if short in {'obj-18','obj-20'} else (17 if document == 'float' else 52)
                    require(node['kind'] == expected_kind, 'Native numeric UI class/kind differs')
                if anchor == PREFIX+'obj-29':
                    box = node['message_box']
                    require(isinstance(box, dict) and set(box) == {'empty','generation','prototype','arguments','placeholders'} and
                            box.get('empty') is False and integer(box.get('generation')) and isinstance(box.get('placeholders'), list),
                            'Native Message state shape differs')
                    validate_message(box['prototype']);validate_message(box['arguments'])
            if document not in initial:
                initial[document] = snapshot
            baseline = nodes_by_anchor(initial[document])
            require(set(nodes) == set(baseline) and same(nodes[PREFIX+'obj-9'], baseline[PREFIX+'obj-9']) and
                    same(nodes[PREFIX+'obj-29'].get('message_box'), baseline[PREFIX+'obj-29'].get('message_box')) and
                    isinstance(nodes[PREFIX+'obj-29'].get('message_box'), dict), 'Native alias/Message retention differs')
            if model['action'] in {'install','close'} and document in previous and document != model['document']:
                require(same(snapshot, previous[document]), 'Native lifecycle changed the surviving owner')
            if model['action'] == 'install' and document == model['document']:
                expected = dict(initial[document], revision=snapshot['revision'])
                require(same(snapshot, expected), 'Native reinstall did not reset source initial state')
        trace = row.get('trace')
        require(isinstance(trace, list) and all(isinstance(t, dict) for t in trace) and
                [t.get('ordinal') for t in trace] == list(range(len(trace))) and
                all(type(t.get('ordinal')) is int for t in trace), 'Native trace ordinal coverage differs')
        for receipt in trace:
            document = receipt.get('document')
            require(document in snapshots and receipt.get('anchor') in nodes_by_anchor(snapshots[document]) and
                    receipt.get('phase') in {'input','output'} and integer(receipt.get('port')), 'Native trace endpoint/liveness differs')
            validate_message(receipt.get('message'))
        if model['action'] == 'event':
            inputs = [t for t in trace if t['phase'] == 'input']
            require(inputs and all(inputs[0][k] == model[k] for k in ('document','anchor')) and
                    inputs[0]['port'] == model['inlet'] and same(inputs[0]['message'], model['message']), 'Native actual stimulus differs')
        else:
            require(not trace, 'Native lifecycle invented control emissions')
        previous = snapshots


def validate_cleanup(cleanup):
    require(all(cleanup.get(k) is True for k in ('preferences_unchanged','prefix_removed','xvfb_exited')) and
            all(cleanup.get(k) == [] for k in ('owned_capture_after','prefix_processes_after','marker_processes_after')) and
            cleanup.get('display_only_attribution') is False and cleanup.get('ordinary_quit_requested') is False,
            'Reference ownership/preference cleanup gate failed')
    sources = cleanup.get('source_preservation')
    require(isinstance(sources, list) and all(isinstance(row, dict) for row in sources) and
            Counter((row.get('document'), row.get('revision')) for row in sources) ==
            Counter((document, revision) for document in DOCUMENTS for revision in (1,2)) and
            all(type(row.get('revision')) is int and all(row.get(k) is True for k in
                ('installed_unchanged','pristine_unchanged','working_unchanged')) for row in sources),
            'Reference source/revision working cleanup gate failed')
    helpers = unique_rows(cleanup.get('helper_preservation'), 'name', HELPERS, 'Reference helper cleanup coverage differs')
    require(all(row.get('installed_unchanged') is True and row.get('private_unchanged') is True and
                row.get('sha256') == HELPERS[name] for name,row in helpers.items()),
            'Reference helper identity/preservation cleanup gate failed')


def validate_reference(score, native, session, receipts, checkpoints, cleanup, timeline):
    require(session.get('schema_version') == 1 and session.get('status') == 'COMPLETE' and session.get('complete') is True and
            session.get('readback_method') == METHOD, 'Reference session/readback method gate failed')
    require(all(session.get(key) is True for key in CAPABILITIES), 'Reference numeric capability gate failed')
    require(type(session.get('synchronous_destination_outputs_validated')) is bool and
            session.get('saved_order_observed') is False, 'Reference destination/saved order capability is invalid')
    validate_cleanup(cleanup)
    sources = native['source_identities']
    metadata = unique_rows(session.get('source_metadata'), 'document', DOCUMENTS, 'Reference source metadata coverage differs')
    prototypes = unique_rows(session.get('message_prototypes'), 'document', DOCUMENTS, 'Reference Message prototype coverage differs')
    for document in DOCUMENTS:
        source, prototype = metadata[document], prototypes[document]
        require(source.get('source_sha256') == sources[document] and integer(source.get('bytes'), 1) and
                (source.get('full_box_count'), source.get('executable_count'), source.get('basic_cable_count')) == COUNTS[document] and
                all(type(source.get(k)) is int for k in ('full_box_count','executable_count','basic_cable_count')),
                'Reference source inventory/count identity differs')
        anchors = source.get('anchors')
        require(isinstance(anchors, list) and all(isinstance(a, dict) and isinstance(a.get('anchor'), str) and
                integer(a.get('outlets')) for a in anchors) and len({a['anchor'] for a in anchors}) == len(anchors) and
                type(source.get('basic_box_count')) is int and source['basic_box_count'] == len(anchors) == BASIC_COUNTS[document][0] and
                type(source.get('observer_leaf_cables')) is int and
                source['observer_leaf_cables'] == sum(a['outlets'] for a in anchors) == BASIC_COUNTS[document][1],
                'Reference source anchor/observer inventory differs')
        baseline = next(s for row in native['rows'] for s in row['snapshots'] if s['document'] == document)
        executable = {a['anchor'] for a in anchors if a.get('maxclass') not in {'comment','jsui'}}
        require(executable == set(nodes_by_anchor(baseline)), 'Reference/native executable anchor coverage differs')
        for anchor in (PREFIX+s for s in UI):
            cls = 'slider' if anchor.rsplit('/',1)[1] in {'obj-18','obj-20'} else ('flonum' if document == 'float' else 'number')
            require(next(a for a in anchors if a['anchor'] == anchor).get('maxclass') == cls,
                    'Reference source numeric UI class binding differs')
        require(prototype.get('source_sha256') == sources[document] and prototype.get('anchor') == PREFIX+'obj-29' and
                digest(prototype.get('text_sha256')) and integer(prototype.get('text_characters'), 1),
                'Reference pristine Message prototype binding differs')
    require(isinstance(receipts, list) and all(isinstance(row, dict) for row in receipts) and
            all(integer(row.get('seq'), 1) for row in receipts) and
            [row['seq'] for row in receipts] == list(range(1,len(receipts)+1)), 'Reference receipt sequence is invalid')
    require(isinstance(checkpoints, list) and len(checkpoints) == 102 and all(isinstance(row, dict) for row in checkpoints),
            'Reference checkpoint coverage differs')
    ledger = session.get('operation_ledger')
    require(isinstance(ledger, list) and len(ledger) == 54 and all(isinstance(row, dict) for row in ledger),
            'Reference operation ledger coverage differs')
    requests = session.get('readback_requests')
    require(isinstance(requests, list) and len(requests) == 102 and all(isinstance(row, dict) for row in requests),
            'Reference readback request coverage differs')
    require(all(integer(row.get('request_id'), 1) for row in checkpoints) and
            len({row['request_id'] for row in checkpoints}) == 102, 'Reference duplicate/invalid checkpoint request')
    checkpoint_by_id = {row['request_id']: row for row in checkpoints}
    commands, expected_requests, paths = [], [], {}
    for operation, model in zip(ledger, timeline):
        require(set(operation) == {'request_id','step_id','action','document','source_sha256','action_revision',
                'live_owners','checkpoint_request_ids','working_paths'} and
                all(operation.get(k) == model[k] for k in ('step_id','action','document','source_sha256','action_revision','live_owners')) and
                type(operation.get('action_revision')) is int and
                all(type(v) is int for v in operation['live_owners'].values()) and integer(operation.get('request_id'), 1),
                'Reference operation request/source/revision/liveness binding differs')
        opid = operation['request_id'];commands.append(opid)
        observed = [row for row in receipts if row.get('request_id') == opid]
        require(observed and all(row.get('step_id') == model['step_id'] and row.get('action') == model['action'] and
                row.get('action_document') == model['document'] and type(row.get('action_revision')) is int and
                row['action_revision'] == model['action_revision'] for row in observed), 'Reference receipt action binding differs')
        completed = [row for row in observed if row.get('kind') == 'step-complete']
        stimuli = [row for row in observed if row.get('kind') == 'stimulus']
        require(len(completed) == 1 and completed[0]['seq'] == observed[-1]['seq'], 'Reference operation completion coverage differs')
        complete = completed[0]
        require(complete.get('document') == model['document'] and complete.get('revision') == model['action_revision'] and
                type(complete.get('revision')) is int and complete.get('source_sha256') == sources[model['document']],
                'Reference completion owner/source/revision binding differs')
        if model['action'] == 'event':
            require(len(stimuli) == 1 and observed[0] is stimuli[0], 'Reference actual stimulus coverage/bracket differs')
            stimulus = stimuli[0]
            validate_message(stimulus.get('message'), stimulus=True)
            require(all(stimulus.get(k) == model[k] for k in ('document','anchor')) and same(stimulus['message'],model['message']) and
                    type(stimulus.get('port')) is int and stimulus['port'] == model['inlet'], 'Reference actual stimulus differs')
        else:
            require(not stimuli and len(observed) == 1, 'Reference lifecycle invented control emissions')
            if model['action'] == 'close':
                require(complete.get('closed_owner_absence_validated') is True, 'Reference close absence capability failed')
        for row in observed:
            require(type(row.get('request_id')) is int and row.get('kind') in {'stimulus','receipt','step-complete'},
                    'Reference harness error/unknown receipt kind')
            if row['kind'] == 'step-complete':
                continue
            document = row.get('document')
            require(document in model['live_owners'] and type(row.get('revision')) is int and
                    row['revision'] == model['live_owners'][document] and row.get('source_sha256') == sources[document],
                    'Reference receipt closed/stale owner/source binding differs')
            anchor_rows = {a['anchor']: a for a in metadata[document]['anchors']}
            require(row.get('anchor') in anchor_rows and integer(row.get('port')) and
                    row['port'] < anchor_rows[row['anchor']]['outlets'], 'Reference receipt endpoint binding differs')
            validate_message(row.get('message'), stimulus=row['kind'] == 'stimulus')
            if row['kind'] == 'receipt':
                require(type(row.get('synchronous_dispatch_active')) is bool, 'Reference dispatch bracket observation is unavailable')
        working = operation.get('working_paths')
        require(isinstance(working, dict) and set(working) == set(model['live_owners']) and
                all(isinstance(p, str) and p for p in working.values()), 'Reference working owner/path coverage differs')
        ids = operation.get('checkpoint_request_ids')
        require(isinstance(ids, list) and len(ids) == len(model['live_owners']) and all(integer(r, 1) for r in ids),
                'Reference operation checkpoint request coverage differs')
        commands.extend(ids)
        require(all(request_id in checkpoint_by_id for request_id in ids), 'Reference requested checkpoint is missing')
        owned = unique_rows([checkpoint_by_id[r] for r in ids], 'document', model['live_owners'], 'Reference all-live checkpoint coverage differs')
        for request_id in ids:
            checkpoint = checkpoint_by_id[request_id];document = checkpoint['document'];revision = model['live_owners'][document]
            key = (document, revision);path = working[document]
            require(key not in paths or paths[key] == path, 'Reference revision working path changed')
            paths[key] = path
            expected = dict(request_id=request_id, operation_request_id=opid, step_id=model['step_id'], action=model['action'],
                action_document=model['document'], action_revision=model['action_revision'], document=document,
                revision=revision, source_sha256=sources[document], working_path=path)
            require(set(checkpoint) == set(REQUEST_FIELDS) | {'raw_sha256','raw_bytes','readback_method','numeric_states','message_states','retention'} and
                    all(checkpoint.get(k) == v for k, v in expected.items()) and
                    all(type(checkpoint.get(k)) is int for k in ('request_id','operation_request_id','revision','action_revision')) and
                    checkpoint.get('readback_method') == METHOD and digest(checkpoint.get('raw_sha256')) and
                    integer(checkpoint.get('raw_bytes'), 1), 'Reference checkpoint request/source/revision/method/digest binding differs')
            expected_requests.append(dict(expected, seq_before=complete['seq'], seq_after=complete['seq'],
                raw_sha256=checkpoint['raw_sha256'], raw_bytes=checkpoint['raw_bytes']))
            source = metadata[document];retention = checkpoint.get('retention')
            require(isinstance(retention, dict) and set(retention) == {'method','original_basic_boxes_retained','original_basic_cables_retained',
                'observer_leaf_cables_retained','unexpected_basic_cables','input_endpoint_multiset_verified','output_endpoint_multiset_verified',
                'saved_order_observed'} and retention.get('method') == 'runtime-object-and-endpoint-inventory' and
                retention.get('saved_order_observed') is False and all(retention.get(k) is True for k in
                ('input_endpoint_multiset_verified','output_endpoint_multiset_verified')), 'Reference runtime endpoint/order retention gate differs')
            counts = {'original_basic_boxes_retained':source['basic_box_count'],'original_basic_cables_retained':source['basic_cable_count'],
                      'observer_leaf_cables_retained':source['observer_leaf_cables'],'unexpected_basic_cables':0}
            require(all(type(retention.get(k)) is int and retention[k] == v for k,v in counts.items()), 'Reference runtime retention counts differ')
            states = unique_rows(checkpoint.get('numeric_states'), 'anchor', {PREFIX+s for s in UI}, 'Reference six-UI numeric state coverage differs')
            for anchor, state in states.items():
                short = anchor[len(PREFIX):]
                cls = 'slider' if short in {'obj-18','obj-20'} else ('flonum' if document == 'float' else 'number')
                tag = 'float' if cls == 'flonum' else 'int'
                basis = {'number':'number-class','flonum':'flonum-class','slider':'source-integer-slider-mode'}[cls]
                require(set(state) == {'anchor','class_name','value','getter_method','getter_representation','semantic_tag','semantic_tag_basis',
                    'receipt_tag_observed'} and state.get('class_name') == cls and state.get('getter_method') == 'getvalueof' and
                    state.get('getter_representation') in {'scalar-number','singleton-number-array'} and finite(state.get('value')) and
                    (tag != 'int' or state['value'] == math.trunc(state['value'])) and state.get('semantic_tag') == tag and
                    state.get('semantic_tag_basis') == basis and state.get('receipt_tag_observed') is False,
                    'Reference numeric getter representation/class/value is unavailable or malformed')
            messages = unique_rows(checkpoint.get('message_states'), 'anchor', [PREFIX+'obj-29'], 'Reference Message state coverage differs')
            message = messages[PREFIX+'obj-29'];prototype = prototypes[document]
            require(set(message) == {'anchor','text_sha256','text_characters','prototype_unchanged'} and
                    message.get('text_sha256') == prototype['text_sha256'] and
                    type(message.get('text_characters')) is int and message['text_characters'] == prototype['text_characters'] and
                    message.get('prototype_unchanged') is True, 'Reference Message prototype changed or is unavailable')
    require(commands == sorted(set(commands)) and len(commands) == 156 and len(set(paths.values())) == 4 and
            set(paths) == {(d,r) for d in DOCUMENTS for r in (1,2)}, 'Reference command/revision path uniqueness differs')
    require([row['request_id'] for row in checkpoints] == [row['request_id'] for row in expected_requests] and
            same(requests, expected_requests) and all(all(type(row.get(k)) is int for k in
                ('request_id','operation_request_id','revision','action_revision','seq_before','seq_after')) for row in requests),
            'Reference readback request/silent getter ledger differs')
    operation_ids = {row['request_id'] for row in ledger}
    require(all(row.get('request_id') in operation_ids for row in receipts), 'Reference receipt has unknown operation request')
    require([row['request_id'] for row in receipts] == sorted(row['request_id'] for row in receipts), 'Reference receipt operation order differs')
    witnesses = session.get('destination_order_witnesses')
    require(isinstance(witnesses, list), 'Reference destination order witnesses are unavailable')
    required = MAIN_STEPS if session['synchronous_destination_outputs_validated'] else {row.get('step_id') for row in witnesses}
    witness_map = unique_rows(witnesses, 'step_id', required, 'Reference destination witness coverage differs')
    require(set(witness_map) <= MAIN_STEPS, 'Reference witness refers to a non-main event')
    for label, witness in witness_map.items():
        operation = next(row for row in ledger if row['step_id'] == label)
        outputs = [r for r in receipts if r.get('step_id') == label and r.get('kind') == 'receipt' and r.get('document') == operation['document']]
        numeric = [r for r in outputs if r['anchor'] == PREFIX+'obj-21' and r['port'] == 0]
        button = [r for r in outputs if r['anchor'] == PREFIX+'obj-24' and r['port'] == 0]
        require(len(numeric) == len(button) == 1 and witness.get('document') == operation['document'] and
                type(witness.get('revision')) is int and witness['revision'] == operation['action_revision'] and
                type(witness.get('request_id')) is int and witness['request_id'] == operation['request_id'] and
                type(witness.get('numeric_seq')) is int and witness['numeric_seq'] == numeric[0]['seq'] and
                type(witness.get('button_seq')) is int and witness['button_seq'] == button[0]['seq'] and
                witness.get('synchronous') is True and numeric[0]['synchronous_dispatch_active'] is True and
                button[0]['synchronous_dispatch_active'] is True, 'Reference destination synchronous witness differs from actual outputs')


def compare_endpoint_streams(reference_receipts, native_trace):
    left, right = defaultdict(list), defaultdict(list)
    for row in reference_receipts:
        if row['kind'] == 'receipt':
            left[(row['document'],row['anchor'],row['port'])].append(row['message'])
    for row in native_trace:
        if row['phase'] == 'output':
            right[(row['document'],row['anchor'],row['port'])].append(row['message'])
    endpoints = []
    for key in sorted(set(left) | set(right)):
        pairs = [compare_message(a,b) for a,b in zip(left[key],right[key])]
        endpoints.append(dict(document=key[0],anchor=key[1],port=key[2],reference_count=len(left[key]),native_count=len(right[key]),
            match=len(left[key]) == len(right[key]) and all(p[0] for p in pairs), unknown_numeric_tags=sum(p[1] for p in pairs)))
    return dict(match=all(row['match'] for row in endpoints),endpoints=endpoints,
                unknown_numeric_tags=sum(row['unknown_numeric_tags'] for row in endpoints))


def compare_numeric_states(reference_checkpoints, native_rows):
    rows = {row['step_id']:row for row in native_rows};result=[]
    for checkpoint in reference_checkpoints:
        snapshot = next(s for s in rows[checkpoint['step_id']]['snapshots'] if s['document'] == checkpoint['document'])
        nodes = nodes_by_anchor(snapshot)
        for state in checkpoint['numeric_states']:
            result.append(dict(step_id=checkpoint['step_id'],document=checkpoint['document'],revision=checkpoint['revision'],
                anchor=state['anchor'],match=same(state['value'],nodes[state['anchor']]['value']),
                semantic_tag=state['semantic_tag'],receipt_tag_observed=False))
    return result


def destination_pair(rows, document, phase, ordinal):
    selected = [row for row in rows if row.get('document') == document and row.get('port') == 0 and row.get('phase', row.get('kind')) == phase]
    numeric = [row for row in selected if row['anchor'] == PREFIX+'obj-21']
    button = [row for row in selected if row['anchor'] == PREFIX+'obj-24']
    # The button receives the numeric message before converting it to an outlet bang.
    valid = (len(numeric) == len(button) == 1 and numeric[0]['message']['selector'] == document and
             len(numeric[0]['message']['atoms']) == 1 and numeric[0]['message']['atoms'][0]['tag'] == document and
             (same(numeric[0]['message'], button[0]['message']) if phase == 'input' else
              button[0]['message'] == {'selector':'bang','atoms':[]}))
    return valid and numeric[0][ordinal] < button[0][ordinal]


def compare_destination_outputs(reference_receipts, native_rows, timeline, capability):
    result=[];native = {row['step_id']:row for row in native_rows}
    for operation in timeline:
        label=operation['step_id']
        if label not in MAIN_STEPS:
            continue
        document=operation['document'];observed=[row for row in reference_receipts if row['step_id'] == label]
        trace=native[label]['trace'];native_output=destination_pair(trace,document,'output','ordinal')
        reference_output=destination_pair(observed,document,'receipt','seq') if capability else None
        result.append(dict(step_id=label,document=document,revision=operation['action_revision'],
            native_output_order=native_output,reference_output_order=reference_output,
            native_only_input_order=destination_pair(trace,document,'input','ordinal'),
            match=(native_output and reference_output) if capability else None))
    return result


def compare(score, native, session, receipts, checkpoints, cleanup):
    timeline=model_timeline(score)
    validate_native(score,native,timeline)
    validate_reference(score,native,session,receipts,checkpoints,cleanup,timeline)
    steps=[]
    for row in native['rows']:
        observed=[r for r in receipts if r['step_id'] == row['step_id']]
        steps.append(dict(step_id=row['step_id'],action=row['action'],document=row['document'],
                          **compare_endpoint_streams(observed,row['trace'])))
    states=compare_numeric_states(checkpoints,native['rows'])
    order=compare_destination_outputs(receipts,native['rows'],timeline,session['synchronous_destination_outputs_validated'])
    return dict(schema_version=1,status='FINITE_NUMERIC_COMPARISON',readback_method=METHOD,source_identities=native['source_identities'],
        operation_count=54,checkpoint_count=len(checkpoints),numeric_state_count=len(states),message_prototype_count=len(checkpoints),
        steps=steps,numeric_states=states,destination_outputs=order,
        all_endpoint_values_match=all(row['match'] for row in steps),all_numeric_states_match=all(row['match'] for row in states),
        all_message_prototypes_unchanged=True,
        all_destination_outputs_ordered=all(row['match'] for row in order) if session['synchronous_destination_outputs_validated'] else None,
        native_only_destination_inputs_ordered=all(row['native_only_input_order'] for row in order),
        unknown_numeric_tag_comparisons=sum(row['unknown_numeric_tags'] for row in steps),
        runtime_retention=dict(method='runtime-object-and-endpoint-inventory',checkpoint_count=102,
            input_endpoint_multisets_verified=True,output_endpoint_multisets_verified=True,all_revision_working_files_unchanged=True),
        saved_order_observed=False,all_serialized_message_states_match=None,
        complete_installed_help_qualification_passes_added=0,
        limitations=['Numeric getter semantic tags come from classes; receipt tags are measured separately.',
            'Unknown numeric list tags remain unknown even when endpoint values match.',
            'Direct destination output order applies only to the 21 scored immediate-control pairs.',
            'Native destination input order is native-only; no portable interdocument named-receiver order is claimed.',
            'Runtime endpoint inventory does not expose saved cable order; saved_order_observed=false.',
            'Message prototype hashes establish content retention, not serialized state or rendering.',
            'Saved authoring, physical entry/drag/Tab, shared views, fonts/layout, metadata and whole-help qualification remain unresolved.'])


def load_json(path):
    return json.loads(Path(path).read_text())


def main():
    parser=argparse.ArgumentParser()
    for name in ('native','reference','score','output'):
        parser.add_argument('--'+name,type=Path,required=True)
    args=parser.parse_args();score_bytes=args.score.read_bytes();native_bytes=args.native.read_bytes()
    score=json.loads(score_bytes);native=json.loads(native_bytes);session=load_json(args.reference/'session.json')
    binding=session.get('score_binding',{});score_hash=hashlib.sha256(score_bytes).hexdigest()
    require(native.get('score_sha256') == score_hash and binding.get('sha256') == score_hash and
            type(binding.get('bytes')) is int and binding['bytes'] == len(score_bytes) and
            type(binding.get('operations')) is int and binding['operations'] == 54 and
            isinstance(binding.get('path'),str) and binding['path'], 'Score artifact identity/size binding differs')
    receipts=[json.loads(line) for line in (args.reference/'receipts.jsonl').read_text().splitlines()]
    result=compare(score,native,session,receipts,load_json(args.reference/'display-states.json'),load_json(args.reference/'cleanup.json'))
    result['input_bindings']=dict(score_sha256=score_hash,native_sha256=hashlib.sha256(native_bytes).hexdigest(),
        reference_files={name:hashlib.sha256((args.reference/name).read_bytes()).hexdigest() for name in
                         ('session.json','receipts.jsonl','display-states.json','cleanup.json')})
    result['all_comparison_gates_pass']=(result['all_endpoint_values_match'] and result['all_numeric_states_match'] and
        result['all_message_prototypes_unchanged'] and result['all_destination_outputs_ordered'] is True and
        result['native_only_destination_inputs_ordered'])
    with args.output.open('x') as stream:
        json.dump(result,stream,indent=2,ensure_ascii=True,allow_nan=False);stream.write('\n')
    print(json.dumps({k:v for k,v in result.items() if k not in
        {'steps','numeric_states','destination_outputs','source_identities','limitations','input_bindings'}}))
    if not result['all_comparison_gates_pass']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
