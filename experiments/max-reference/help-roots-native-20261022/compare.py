#!/usr/bin/env python3
"""Compare public endpoint receipts, retaining unknown Max list number tags."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path


READBACK_STATUSES = {'private-serialization': 'observed-private-serialization',
                     'v8-boxtext': 'observed-private-v8-boxtext'}


def same_value(left, right):
    if left != right:
        return False
    if isinstance(left, (int, float)) and isinstance(right, (int, float)) and left == 0:
        return math.copysign(1, left) == math.copysign(1, right)
    return True


def compare_message(reference, native):
    unknown = 0
    if reference['selector'] != native['selector'] or len(reference['atoms']) != len(native['atoms']):
        return dict(match=False, unknown_numeric_tags=0)
    for expected, actual in zip(reference['atoms'], native['atoms']):
        if not same_value(expected['value'], actual['value']):
            return dict(match=False, unknown_numeric_tags=unknown)
        if expected['tag'] == 'unknown-number':
            if actual['tag'] not in ('int', 'float'):
                return dict(match=False, unknown_numeric_tags=unknown)
            unknown += 1
        elif expected['tag'] != actual['tag']:
            return dict(match=False, unknown_numeric_tags=unknown)
    return dict(match=True, unknown_numeric_tags=unknown)


def compare_outputs(reference, native):
    expected, actual = defaultdict(list), defaultdict(list)
    for row in reference:
        if row['kind'] == 'receipt':
            expected[(row['document'], row['anchor'], row['port'])].append(row['message'])
    for row in native:
        if row['phase'] == 'output':
            actual[(row['document'], row['anchor'], row['port'])].append(row['message'])
    endpoints = []
    for key in sorted(set(expected) | set(actual)):
        comparisons = [compare_message(left, right) for left, right in zip(expected[key], actual[key])]
        endpoints.append(dict(document=key[0], anchor=key[1], port=key[2],
            reference_count=len(expected[key]), native_count=len(actual[key]),
            match=len(expected[key]) == len(actual[key]) and all(item['match'] for item in comparisons),
            unknown_numeric_tags=sum(item['unknown_numeric_tags'] for item in comparisons)))
    return dict(match=all(item['match'] for item in endpoints), endpoints=endpoints,
                unknown_numeric_tags=sum(item['unknown_numeric_tags'] for item in endpoints))


def compare_state(reference, native, readback_method='private-serialization'):
    if (readback_method not in READBACK_STATUSES or
            reference['status'] != READBACK_STATUSES[readback_method] or reference['live_content'] is None):
        return dict(match=False, reason='reference state unavailable', unknown_numeric_tags=0)
    expected, actual = reference['live_content'], native['message_box']
    if expected['empty'] != actual['empty']:
        return dict(match=False, reason='empty state differs', unknown_numeric_tags=0)
    if expected['empty']:
        return dict(match=True, unknown_numeric_tags=0)
    return compare_message(expected['message'], actual['prototype'])


def load_json(path):
    return json.loads(Path(path).read_text())


def is_digest(value):
    return isinstance(value, str) and len(value) == 64 and all(c in '0123456789abcdef' for c in value)


def validate_message_content(content):
    if (not isinstance(content, dict) or set(content) != {'empty', 'message'} or
            type(content['empty']) is not bool):
        raise ValueError('Message readback content is malformed')
    if content['empty']:
        if content['message'] is not None:
            raise ValueError('Empty Message readback has unexpected content')
        return
    message = content['message']
    if (not isinstance(message, dict) or set(message) != {'selector', 'atoms'} or
            not isinstance(message['selector'], str) or not message['selector'] or
            not isinstance(message['atoms'], list)):
        raise ValueError('Message readback content is malformed')
    for atom in message['atoms']:
        if not isinstance(atom, dict) or set(atom) != {'tag', 'value'}:
            raise ValueError('Message readback atom is malformed')
        tag, value = atom['tag'], atom['value']
        if tag == 'symbol':
            valid = isinstance(value, str)
        elif tag in ('int', 'float', 'unknown-number'):
            valid = type(value) in (int, float) and math.isfinite(value) and (tag != 'int' or type(value) is int)
        else:
            valid = False
        if not valid:
            raise ValueError('Message readback atom is malformed')


def validate_readback(session, checkpoints, source_identities, receipts):
    method = session.get('readback_method', 'private-serialization')
    if method not in READBACK_STATUSES:
        raise ValueError('Unknown Message readback method')
    if (session.get('status') != 'COMPLETE' or session.get('complete') is not True or
            session.get('cold_message_readback_validated') is not True):
        raise ValueError('Original Max runtime/readback gate did not complete')
    documents = session.get('documents', [])
    if (not source_identities or not isinstance(documents, list) or
            Counter(row.get('document') for row in documents) != Counter(list(source_identities)) or
            any(row.get('source_sha256') != source_identities[row['document']] for row in documents)):
        raise ValueError('Reference and native source identity coverage differs')
    if not isinstance(checkpoints, list) or not checkpoints:
        raise ValueError('Required Message checkpoint coverage is empty')
    if method == 'v8-boxtext':
        if any(session.get(key) is not True for key in
               ('initial_message_readback_validated', 'runtime_endpoint_readback_validated')):
            raise ValueError('Original V8 Message/runtime endpoint capability gate did not complete')
        if session.get('saved_order_observed') is not False:
            raise ValueError('V8 readback cannot establish saved cable order')
        capabilities = session.get('capabilities', [])
        if (not isinstance(capabilities, list) or
                Counter(row.get('document') for row in capabilities) != Counter(list(source_identities))):
            raise ValueError('V8 runtime capability document coverage differs')
        capability_by_document = {row['document']: row for row in capabilities}
        for capability in capabilities:
            if any(type(capability.get(key)) is not int or capability[key] < 0 for key in
                   ('resolved_basic_boxes', 'source_basic_cables', 'observer_leaf_cables')):
                raise ValueError('V8 runtime capability inventory count is invalid')
    requests = []
    for checkpoint in checkpoints:
        if not isinstance(checkpoint, dict):
            raise ValueError('Message checkpoint metadata is malformed')
        if checkpoint.get('readback_method', method) != method:
            raise ValueError('Mixed Message checkpoint readback methods')
        states = checkpoint.get('states')
        if not isinstance(states, list) or not states:
            raise ValueError('Required Message checkpoint state coverage is empty')
        for state in states:
            if (not isinstance(state, dict) or state.get('status') != READBACK_STATUSES[method] or
                    state.get('live_content') is None):
                raise ValueError('Message readback status/content is unavailable or mislabeled')
            validate_message_content(state['live_content'])
            if method == 'v8-boxtext':
                if (set(state) != {'document', 'anchor', 'authored_empty', 'status', 'live_content',
                                   'text_sha256', 'text_characters', 'rendering'} or
                        state['document'] != checkpoint.get('document') or
                        not isinstance(state['anchor'], str) or not state['anchor'] or
                        type(state['authored_empty']) is not bool or not is_digest(state['text_sha256']) or
                        type(state['text_characters']) is not int or state['text_characters'] < 0 or
                        not isinstance(state['rendering'], str)):
                    raise ValueError('V8 Message readback metadata is malformed')
                if 'serializ' in state['rendering'].lower():
                    raise ValueError('V8 Message readback cannot claim serialized content')
        if method != 'v8-boxtext':
            continue
        if set(checkpoint) != {'step_id', 'document', 'source_sha256', 'request_id', 'readback_method',
                               'observation_sha256', 'observation_bytes', 'states', 'retention'}:
            raise ValueError('V8 checkpoint metadata is missing or claims serialized retention')
        document = checkpoint['document']
        if (document not in source_identities or not is_digest(checkpoint['source_sha256']) or
                checkpoint['source_sha256'] != source_identities[document]):
            raise ValueError('V8 checkpoint source identity differs')
        if (type(checkpoint['request_id']) is not int or checkpoint['request_id'] <= 0 or
                not isinstance(checkpoint['step_id'], str) or not checkpoint['step_id']):
            raise ValueError('V8 checkpoint request identity is invalid')
        if (not is_digest(checkpoint['observation_sha256']) or
                type(checkpoint['observation_bytes']) is not int or checkpoint['observation_bytes'] <= 0):
            raise ValueError('V8 checkpoint observation identity is invalid')
        retention = checkpoint['retention']
        if (not isinstance(retention, dict) or set(retention) != {'method', 'original_basic_boxes_retained',
                'original_basic_cables_retained', 'observer_leaf_cables_retained', 'unexpected_basic_cables',
                'saved_order_observed'} or retention['method'] != 'runtime-object-and-endpoint-inventory'):
            raise ValueError('V8 runtime retention method/claims are invalid')
        capability = capability_by_document[document]
        counts = {'original_basic_boxes_retained': capability['resolved_basic_boxes'],
                  'original_basic_cables_retained': capability['source_basic_cables'],
                  'observer_leaf_cables_retained': capability['observer_leaf_cables'], 'unexpected_basic_cables': 0}
        if any(type(retention[key]) is not int or retention[key] != value for key, value in counts.items()):
            raise ValueError('V8 runtime retention inventory counts differ')
        if retention['saved_order_observed'] is not False:
            raise ValueError('V8 runtime retention cannot establish saved cable order')
        requests.append({key: checkpoint[key] for key in ('request_id', 'step_id', 'document', 'source_sha256')})
    if method == 'v8-boxtext':
        request_ids = [row['request_id'] for row in requests]
        declared_requests = session.get('readback_requests')
        fields = ('request_id', 'step_id', 'document', 'source_sha256')
        if (not isinstance(declared_requests, list) or any(not isinstance(row, dict) or
                set(row) != set(fields) or type(row['request_id']) is not int for row in declared_requests) or
                request_ids != sorted(set(request_ids)) or declared_requests != requests):
            raise ValueError('V8 readback request coverage/order differs')
        observed = [row for row in receipts if row.get('kind') == 'readback-request']
        if (any(type(row.get('request_id')) is not int for row in observed) or
                Counter(tuple(row.get(key) for key in fields) for row in observed) !=
                Counter(tuple(row[key] for key in fields) for row in requests)):
            raise ValueError('V8 readback request receipt coverage differs')
    return method


def validate_coverage(score, native, receipts, snapshots):
    labels = [step['step_id'] for step in score]
    documents = list(native['source_identities'])
    expected_native = [f'install-{name}' for name in documents] + labels
    if len(set(labels)) != len(labels) or [row['step_id'] for row in native['rows']] != expected_native or native['action_count'] != len(score):
        raise ValueError('Native score operation coverage differs')
    expected_snapshots = [('initial', name) for name in documents] + [(step['step_id'], step['document']) for step in score]
    if Counter((row['step_id'], row['document']) for row in snapshots) != Counter(expected_snapshots):
        raise ValueError('Required Message checkpoint coverage differs')
    rows = {row['step_id']: row for row in native['rows']}
    for checkpoint in snapshots:
        document = checkpoint['document']
        initial = next(state for state in rows['install-' + document]['snapshots'] if state['document'] == document)
        required = [node['anchor'] for node in initial['nodes'] if 'message_box' in node]
        if Counter(state['anchor'] for state in checkpoint['states']) != Counter(required):
            raise ValueError('Message anchor coverage differs')
    for step in score:
        if step['source_sha256'] != native['source_identities'][step['document']]:
            raise ValueError('Score source identity differs')
        observed = [row for row in receipts if row.get('step_id') == step['step_id']]
        stimuli = [row for row in observed if row['kind'] == 'stimulus']
        if len(stimuli) != 1 or sum(row['kind'] == 'step-complete' for row in observed) != 1:
            raise ValueError('Original action coverage differs')
        stimulus = stimuli[0]
        if step['inlet'] != 0 or any(stimulus[key] != step[key] for key in ('document', 'anchor', 'interaction', 'message')):
            raise ValueError('Original stimulus differs from the finite declared score')
        inputs = [row for row in rows[step['step_id']]['trace'] if row['phase'] == 'input']
        if not inputs or any(inputs[0][key] != step[key] for key in ('document', 'anchor', 'message')) or inputs[0]['port'] != step['inlet']:
            raise ValueError('Native stimulus differs from the declared score')


def validate_cleanup(cleanup, documents, readback_method='private-serialization'):
    if (not cleanup['preferences_unchanged'] or cleanup['owned_capture_after'] or
            cleanup['prefix_processes_after'] or cleanup['marker_processes_after'] or
            cleanup['display_only_attribution'] is not False or not cleanup['prefix_removed'] or not cleanup['xvfb_exited']):
        raise ValueError('Original capture ownership/cleanup gate failed')
    sources = cleanup['source_preservation']
    helpers = cleanup['helper_preservation']
    if (Counter(row['document'] for row in sources) != Counter(list(documents)) or
            not all(row['installed_unchanged'] and row['pristine_unchanged'] for row in sources) or
            len(helpers) != 4 or len({row['name'] for row in helpers}) != 4 or
            not all(row['installed_unchanged'] for row in helpers)):
        raise ValueError('Original source/helper cleanup gate failed')
    if readback_method == 'v8-boxtext' and any(row.get('working_unchanged') is not True for row in sources):
        raise ValueError('V8 working source preservation cleanup gate failed')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--native', type=Path, required=True)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--score', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    native, score = load_json(args.native), load_json(args.score)
    if hashlib.sha256(args.score.read_bytes()).hexdigest() != native['score_sha256']:
        raise ValueError('Native score file identity differs')
    session, cleanup = load_json(args.reference / 'session.json'), load_json(args.reference / 'cleanup.json')
    validate_cleanup(cleanup, native['source_identities'], session.get('readback_method', 'private-serialization'))
    if not native['all_runtime_gates_pass'] or not native['authoring_retained']:
        raise ValueError('Native runtime/admission gate failed')
    sources = {document['document']: document['source_sha256'] for document in session['documents']}
    if sources != native['source_identities']:
        raise ValueError('Reference and native source identities differ')
    receipts = [json.loads(line) for line in (args.reference / 'receipts.jsonl').read_text().splitlines()]
    if any(row['kind'] == 'harness-error' for row in receipts):
        raise ValueError('Original observer reported a harness failure')
    checkpoints = load_json(args.reference / 'display-states.json')
    readback_method = validate_readback(session, checkpoints, native['source_identities'], receipts)
    validate_coverage(score, native, receipts, checkpoints)
    native_rows = {row['step_id']: row for row in native['rows']}
    steps = []
    for step in score:
        label = step['step_id']
        observed = [row for row in receipts if row.get('step_id') == label]
        if sum(row['kind'] == 'stimulus' for row in observed) != 1 or sum(row['kind'] == 'step-complete' for row in observed) != 1:
            raise ValueError('Original action coverage gate failed')
        steps.append(dict(step_id=label, row=step['row'], interaction=step['interaction'],
                          **compare_outputs(observed, native_rows[label]['trace'])))
    states = []
    for snapshot in checkpoints:
        label, document = snapshot['step_id'], snapshot['document']
        row = native_rows['install-' + document if label == 'initial' else label]
        candidates = next(item for item in row['snapshots'] if item['document'] == document)['nodes']
        for expected in snapshot['states']:
            matches = [node for node in candidates if node['anchor'] == expected['anchor'] and 'message_box' in node]
            if len(matches) != 1:
                raise ValueError('Native Message source anchor unavailable')
            states.append(dict(step_id=label, document=document, anchor=expected['anchor'],
                               **compare_state(expected, matches[0], readback_method)))
    result = dict(schema_version=1, status='FINITE_ENDPOINT_COMPARISON', source_identities=sources,
        step_count=len(steps), steps=steps, message_state_count=len(states), message_states=states,
        all_endpoint_values_match=all(row['match'] for row in steps),
        readback_method=readback_method, all_message_states_match=all(row['match'] for row in states),
        all_serialized_message_states_match=all(row['match'] for row in states) if readback_method == 'private-serialization' else None,
        unknown_numeric_tag_comparisons=sum(row['unknown_numeric_tags'] for row in steps + states),
        limitations=['Max numeric atom tags inside lists remain unknown; matching values do not prove those tags.',
                     'Leaf callback order does not establish original destination delivery order.',
                     'Print input/Console formatting and physical entry/drag/Tab are not scored.',
                     'Serialized Message content does not establish pixels, fonts or layout.',
                     'Window/view lifecycle and metadata gates remain open.'],
        complete_installed_help_qualification_passes_added=0)
    if readback_method == 'v8-boxtext':
        result.update(saved_order_observed=False, runtime_retention=dict(
            method='runtime-object-and-endpoint-inventory', checkpoint_count=len(checkpoints),
            all_original_basic_boxes_retained=True, all_original_basic_cables_retained=True,
            all_observer_leaf_cables_retained=True, unexpected_basic_cables=0, saved_order_observed=False))
        result['limitations'][3] = 'Direct V8 Message boxtext content does not establish pixels, fonts or layout.'
        result['limitations'].append('Read-only runtime endpoints do not expose saved cable order; saved_order_observed=false. '
                                    'This comparison does not establish saved authoring/order/view/gesture gates.')
    with args.output.open('x') as file:
        json.dump(result, file, indent=2, ensure_ascii=True, allow_nan=False)
        file.write('\n')
    print(json.dumps({key: value for key, value in result.items() if key not in ('steps', 'message_states', 'source_identities', 'limitations')}))
    if not result['all_endpoint_values_match'] or not result['all_message_states_match']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
