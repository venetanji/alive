#!/usr/bin/env python3
"""Finite arithmetic verification over unchanged production-prepared bundles.

Raw source-dependent values are accepted and persisted only in private evidence.
The result projection contains hashes, counts and finite assertion outcomes.
"""
import argparse
import copy
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import stat
import subprocess

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
_spec = importlib.util.spec_from_file_location(
    'arithmetic_native_replay', HERE.parent / 'help-roots-native-20261022/replay.py')
replay = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(replay)

SCORE_SHA256 = '95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb'
SOURCES = {
    'times': '1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b',
    'plus': 'd1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895',
    'minus': '7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0',
}
ROLE_ANCHORS = dict(I='obj-26', ih='obj-17', ic='obj-16', button='obj-22',
                    id='obj-25', F='obj-10', fh='obj-1', alt='obj-7',
                    fc='obj-24', fd='obj-23')
NUMERIC_ROLES = ('ih', 'ic', 'id', 'fh', 'alt', 'fc', 'fd')
LINKS = (('ih', 'I', 0), ('ic', 'I', 1), ('button', 'I', 0), ('I', 'id', 0),
         ('fh', 'F', 0), ('alt', 'F', 0), ('fc', 'F', 1), ('F', 'fd', 0))
# This is the original action table, not an alternative executable graph.
ACTIONS = (
    ('button', 'bang', None), ('F', 'bang', None), ('ic', 'int', -3),
    ('ih', 'int', 7), ('button', 'bang', None), ('ic', 'float', 0.25),
    ('button', 'bang', None), ('ic', 'int', 7), ('ih', 'float', -3.75),
    ('id', 'int', -3), ('button', 'bang', None), ('fc', 'float', 0.25),
    ('fh', 'float', 7), ('F', 'bang', None), ('alt', 'int', -3),
    ('fc', 'float', -3), ('F', 'bang', None), ('fh', 'float', 0.25),
    ('fd', 'float', 7), ('F', 'bang', None), ('button', 'bang', None),
    ('F', 'bang', None),
)
EXPECTED_COUNTS = dict(operations=78, events=66, installs=6, closes=6,
    live_checkpoints=72, empty_checkpoints=6, numeric_states=504, outputs=141,
    cable_deliveries=90, direct_inputs=66, receipts=297, executable_nodes_per_owner=10,
    numeric_ui_per_live_checkpoint=7, numeric_outlet1_outputs=0)


def require(condition, gate):
    if not condition:
        raise ValueError(gate + ' gate failed')


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False)


def object_digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def finite(value):
    return type(value) in (int, float) and math.isfinite(value)


def message(tag='bang', value=None):
    return dict(selector=tag, atoms=[] if tag == 'bang' else [dict(tag=tag, value=value)])


def full_message(typed):
    return dict(typed, raw_selector='')


def scope(document):
    return 'root/obj-4' if document == 'times' else 'root/obj-2'


def expected_score():
    result = []
    for document, source in SOURCES.items():
        common = dict(document=document, source_sha256=source)
        for revision, indices in ((1, range(20)), (2, range(20, 22))):
            result.append(dict(common, step_id=f'install-{document}-r{revision}', action='install', revision=revision))
            for index in indices:
                role, tag, value = ACTIONS[index]
                result.append(dict(common, step_id=f'{document}-A{index+1:02}', action='event',
                    anchor=scope(document)+'/'+ROLE_ANCHORS[role], inlet=0, message=message(tag, value)))
            result.append(dict(common, step_id=f'close-{document}-r{revision}', action='close'))
    return result


def bound_roles(document, bundle):
    metadata, native = bundle
    require(metadata.get('sourceSha256') == SOURCES[document], 'production source binding')
    stats = metadata['stats']
    require(stats['omittedBoxes'] == 0 and stats['omittedEdges'] == 0
            and stats['sourceBoxes'] == stats['importedBoxes'] == len(metadata['scopedNodeMap'])
            and stats['sourceEdges'] == stats['importedEdges'] == 8,
            'complete source inventory without omissions')
    require(native.get('schema') == 'ultra-production-native-descriptors-v1', 'production descriptor schema')
    nodes = native['nodes']
    require(len(nodes) == 10 and len(native['edges']) == 8, 'complete executable inventory')
    require(all(type(n['id']) is int and type(n['kind']) is int for n in nodes), 'descriptor identity type')
    by_id = {n['id']: n for n in nodes}
    require(len(by_id) == 10, 'unique executable identity')
    anchors = metadata['scopedNodeMap']
    require(len(set(anchors.values())) == len(anchors), 'unique source map')
    require(all(scope(document)+'/'+anchor in anchors for anchor in ROLE_ANCHORS.values()), 'complete role anchors')
    identities = {role: anchors[scope(document)+'/'+anchor] for role, anchor in ROLE_ANCHORS.items()}
    require(set(identities.values()) == set(by_id), 'source-mapped executable inventory')
    roles = {role: by_id[identity] for role, identity in identities.items()}
    arithmetic_kind = dict(times=5, plus=4, minus=54)[document]
    for role, node in roles.items():
        wanted_kind = arithmetic_kind if role in ('I', 'F') else 0 if role == 'button' else 17 if role in ('fh', 'fc', 'fd') else 52
        require(node['kind'] == wanted_kind, 'prepared role kind')
        params = node['parameters']
        require(len(params) == 6 and all(finite(p) for p in params), 'finite production parameters')
        require(node['device'] == 0 and node['count'] == 0 and node['text_hex'] == '', 'prepared role attributes')
        if role in ('I', 'F'):
            require(params[1] == (1 if role == 'I' else 2) and params[2:] == [0]*4,
                    'fixed arithmetic result mode')
            require(role != 'I' or math.trunc(params[0]) == params[0], 'integer creation operand')
        elif role in NUMERIC_ROLES:
            require(params[1:3] == [-100000, 100000] and params[4:] == [0, 0], 'saved numeric bounds')
            require(params[3] == (6 if role in ('fh', 'fc', 'fd') else 0), 'saved numeric format')
            require(params[1] <= params[0] <= params[2], 'saved numeric range')
            require(role in ('fh', 'fc', 'fd') or math.trunc(params[0]) == params[0], 'saved integer UI')
        else:
            require(params == [0]*6, 'button parameters')
    observed = [(e['from'], e['outlet'], e['to'], e['inlet']) for e in native['edges']]
    wanted = [(identities[a], 0, identities[b], inlet) for a, b, inlet in LINKS]
    require(len(set(observed)) == 8 and set(observed) == set(wanted), 'complete saved cable roles')
    return roles


def validate_score(score, bundles):
    require(list(bundles) == list(SOURCES), 'finite source order')
    require(canonical(score) == canonical(expected_score()), 'complete 78-operation action table')
    for document, bundle in bundles.items():
        bound_roles(document, bundle)


def arithmetic(document, left, right):
    if document == 'times':
        return left * right
    if document == 'plus':
        return left + right
    return left - right


def expectations(bundles, score):
    """Private independent semantic expectations; never publish this return value."""
    validate_score(score, bundles)
    expected, state = [], None
    for step in score:
        document = step['document']
        roles = bound_roles(document, bundles[document])
        if step['action'] == 'install':
            state = dict(ui={r: roles[r]['parameters'][0] for r in NUMERIC_ROLES},
                         stores={'I': [0, roles['I']['parameters'][0]],
                                 'F': [0, roles['F']['parameters'][0]]})
        item = dict(step_id=step['step_id'], action=step['action'], trace=[],
                    ui={}, semantic_stores={})
        if step['action'] == 'event':
            index = int(step['step_id'].rsplit('A', 1)[1])-1
            role, tag, value = ACTIONS[index]

            def receipt(target, phase, port, typed):
                item['trace'].append(dict(node=roles[target]['id'], phase=phase, port=port,
                                          message=full_message(typed)))

            receipt(role, 'input', 0, step['message'])
            if role in NUMERIC_ROLES:
                output_tag = 'float' if role in ('fh', 'fc', 'fd') else 'int'
                value = value if output_tag == 'float' else math.trunc(value)
                state['ui'][role] = value
                typed = message(output_tag, value)
                receipt(role, 'output', 0, typed)
            elif role == 'button':
                typed = message()
                receipt(role, 'output', 0, typed)
            else:
                typed = step['message']
            operator = 'I' if role in ('ih', 'ic', 'button') else 'F' if role in ('fh', 'fc', 'alt', 'F') else None
            if operator:
                cold = role in ('ic', 'fc')
                if role != operator:
                    receipt(operator, 'input', int(cold), typed)
                if cold:
                    state['stores'][operator][1] = value
                else:
                    if role not in ('button', 'F'):
                        state['stores'][operator][0] = value
                    result = arithmetic(document, *state['stores'][operator])
                    result_tag = 'int' if operator == 'I' else 'float'
                    result_message = message(result_tag, result)
                    display = 'id' if operator == 'I' else 'fd'
                    receipt(operator, 'output', 0, result_message)
                    receipt(display, 'input', 0, result_message)
                    receipt(display, 'output', 0, result_message)
                    state['ui'][display] = result
        if step['action'] != 'close':
            item['ui'] = {roles[r]['id']: value for r, value in state['ui'].items()}
            item['semantic_stores'] = copy.deepcopy(state['stores'])
        expected.append(item)
    return expected


def same_message(wanted, actual):
    if (not isinstance(actual, dict) or set(actual) != {'selector', 'raw_selector', 'atoms'}
            or actual['raw_selector'] != '' or actual['selector'] != wanted['selector']
            or not isinstance(actual['atoms'], list) or len(actual['atoms']) != len(wanted['atoms'])):
        return False
    for a, b in zip(wanted['atoms'], actual['atoms']):
        if (not isinstance(b, dict) or set(b) != {'tag', 'value'} or b['tag'] != a['tag']
                or not finite(b['value']) or b['value'] != a['value']
                or (a['tag'] == 'int' and math.trunc(b['value']) != b['value'])):
            return False
    return True


def verify_results(rows, bundles, score, contexts):
    validate_score(score, bundles)
    replay.validate_lifecycle_results(rows, contexts, score)
    expected = expectations(bundles, score)
    checkpoints, totals = [], dict(outputs=0, cable_deliveries=0, receipts=0, numeric_states=0,
                                  direct_inputs=0, live_checkpoints=0, empty_checkpoints=0)
    observed_outputs = {document: set() for document in SOURCES}
    initial_ui, initial_results = {}, {}
    for row, step, wanted in zip(rows, score, expected):
        document = step['document']
        require(row['console'] == [], 'silent console')
        require(len(row['snapshots']) == (0 if step['action'] == 'close' else 1), 'exactly one live owner')
        trace = row['trace']
        require(len(trace) == len(wanted['trace']), 'complete typed receipt coverage')
        for actual, receipt in zip(trace, wanted['trace']):
            require(all(actual[key] == receipt[key] for key in ('node', 'phase', 'port'))
                    and same_message(receipt['message'], actual['message']), 'exact typed receipt')
            if actual['phase'] == 'output':
                observed_outputs[document].add(actual['node'])
        outputs = sum(r['phase'] == 'output' for r in trace)
        inputs = len(trace)-outputs
        direct = int(step['action'] == 'event')
        totals['outputs'] += outputs
        totals['cable_deliveries'] += inputs-direct
        totals['direct_inputs'] += direct
        totals['receipts'] += len(trace)
        if row['snapshots']:
            totals['live_checkpoints'] += 1
            snapshot = row['snapshots'][0]
            require(snapshot['console_dropped'] == 0 and snapshot['text_edit_serial'] == 0,
                    'pristine runtime bookkeeping')
            node_map = {n['id']: n for n in snapshot['nodes']}
            for identity, value in wanted['ui'].items():
                require(finite(node_map[identity]['value']) and node_map[identity]['value'] == value,
                        'all seven numeric UI states')
            totals['numeric_states'] += len(wanted['ui'])
            if step['action'] == 'install':
                require(all(n['pulses'] == 0 and same_message(full_message(message()), n['last_message'])
                            for n in node_map.values()), 'pristine executable reset')
                if step['revision'] == 1:
                    initial_ui[document] = wanted['ui']
                else:
                    require(wanted['ui'] == initial_ui[document], 'all seven pristine UI resets')
            if step['action'] == 'event' and step['step_id'].endswith(('A01', 'A02', 'A21', 'A22')):
                branch = 'I' if step['step_id'].endswith(('A01', 'A21')) else 'F'
                identity = bound_roles(document, bundles[document])[branch]['id']
                result = next(r['message'] for r in trace if r['node'] == identity and r['phase'] == 'output')
                key = document, branch
                if step['step_id'].endswith(('A01', 'A02')):
                    initial_results[key] = result
                else:
                    require(same_message(initial_results[key], result), 'both pristine arithmetic store resets')
        else:
            totals['empty_checkpoints'] += 1
        checkpoints.append(dict(step_id=step['step_id'], action=step['action'], document=document,
            checkpoint_pass=True, row_sha256=object_digest(row),
            numeric_states_sha256=object_digest(wanted['ui']), numeric_state_count=len(wanted['ui']),
            output_count=outputs, cable_delivery_count=inputs-direct, receipt_count=len(trace)))
    for document, bundle in bundles.items():
        require(observed_outputs[document] == {n['id'] for n in bundle[1]['nodes']},
                'all ten original executable outlets observed')
    counts = dict(EXPECTED_COUNTS)
    require(all(counts[key] == value for key, value in totals.items()), 'finite aggregate accounting')
    return dict(counts=counts, gates=dict(complete_action_table=True, exact_lifecycle=True,
        one_live_owner=True, exact_typed_receipts=True, complete_saved_cable_deliveries=True,
        seven_numeric_states=True, all_original_outlets_observed=True, numeric_outlet1_silent=True,
        cold_and_display_only_silence=True, pristine_ui_and_store_reset=True,
        console_silent=True, prepared_templates_unchanged=True), checkpoints=checkpoints)


def private_directory(path):
    path = Path(path).resolve()
    require(path != REPO and REPO not in path.parents, 'private output outside worktree')
    path.mkdir(mode=0o700, parents=True, exist_ok=False)
    require(stat.S_IMODE(path.stat().st_mode) == 0o700, 'private directory permissions')
    return path


def private_write(path, data):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        output.write(data)


def bundle_hashes(root):
    result = {}
    for document in SOURCES:
        directory = (root / document).resolve()
        require(directory != REPO and REPO not in directory.parents, 'private source bundle location')
        result[document] = {name: digest(directory/name)
            for name in ('authoring.json', 'flat.json', 'import.json', 'native.json')}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('bundle-root', 'score', 'binary', 'private-output', 'public-output'):
        parser.add_argument('--'+name, type=Path, required=True)
    args = parser.parse_args()
    require(digest(args.score) == SCORE_SHA256, 'frozen score digest')
    before = bundle_hashes(args.bundle_root)
    bundles = {name: (json.loads((args.bundle_root/name/'import.json').read_text()),
                      json.loads((args.bundle_root/name/'native.json').read_text())) for name in SOURCES}
    score = json.loads(args.score.read_text())
    validate_score(score, bundles)
    wire, contexts = replay.build_transport(bundles, score, explicit_lifecycle=True)
    output = private_directory(args.private_output)
    private_write(output/'transport.txt', wire)
    private_write(output/'expectations.json', canonical(expectations(bundles, score))+'\n')
    run = subprocess.run([str(args.binary.resolve())], input=wire, capture_output=True, text=True, timeout=30)
    private_write(output/'native.jsonl', run.stdout)
    private_write(output/'stderr.txt', run.stderr)
    require(run.returncode == 0 and not run.stderr, 'native execution and sanitizer')
    rows = [json.loads(line) for line in run.stdout.splitlines()]
    result = verify_results(rows, bundles, score, contexts)
    after = bundle_hashes(args.bundle_root)
    require(before == after, 'all bundle bytes retained')
    binding = dict(source_identities=SOURCES, score_sha256=digest(args.score),
        binary_sha256=digest(args.binary), scorer_sha256=digest(__file__),
        transport_module_sha256=digest(replay.__file__),
        bundle_before_sha256=before, bundle_after_sha256=after,
        private_file_sha256={name: digest(output/name)
            for name in ('transport.txt', 'native.jsonl', 'stderr.txt', 'expectations.json')})
    private_write(output/'binding.json', canonical(binding)+'\n')
    evidence = dict(schema='arithmetic-native-finite-result-v1', status='NATIVE_SCORED_NOT_MAX_COMPARED',
        **binding, **result, binding_sha256=digest(output/'binding.json'), authoring_retained=True,
        saved_order_observed=False, complete_installed_help_qualification_passes_added=0)
    with args.public_output.open('x') as target:
        json.dump(evidence, target, indent=2, ensure_ascii=True, allow_nan=False)
        target.write('\n')
    print(canonical(dict(status=evidence['status'], counts=result['counts'],
                         all_finite_gates_pass=all(result['gates'].values()), qualification_passes_added=0)))


if __name__ == '__main__':
    main()
