#!/usr/bin/env python3
"""Replay production-prepared private graphs; persist only redacted evidence."""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
_spec = importlib.util.spec_from_file_location('help_runtime_normalization', ROOT.parent / 'help-roots-runtime-20261022/help_runtime.py')
_normalization = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_normalization)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def new_private_directory(path):
    path = Path(path).resolve()
    if path == REPO or REPO in path.parents:
        raise ValueError('Private replay output must be outside the source worktree')
    path.mkdir(mode=0o700, parents=True, exist_ok=False)
    return path


def number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError('Finite numeric transport field required')
    return str(value)


def integer(value):
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError('Integer transport field required')
    return str(value)


def safe_id(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9_-]+', value):
        raise ValueError('Invalid operation identity')
    return value


def encode_message(message):
    selector = message['selector']
    encoded = '-' if selector in ('bang', 'int', 'float') else selector.encode().hex()
    atoms = message['atoms']
    fields = [encoded, str(len(atoms))]
    for atom in atoms:
        tag, value = atom['tag'], atom['value']
        if tag == 'symbol':
            if '\0' in value:
                raise ValueError('NUL symbol refused')
            fields.extend(['2', '0', value.encode().hex() or '-'])
        elif tag in ('int', 'float'):
            fields.extend(['0' if tag == 'int' else '1', integer(value) if tag == 'int' else number(value), '-'])
        else:
            raise ValueError('Unknown input atom type')
    return fields


def build_transport(bundles, steps, *, explicit_lifecycle=False):
    if not 1 <= len(bundles) <= 16:
        raise ValueError('Invalid template count')
    wire = ['help-root-native-v1 ' + str(len(bundles))]
    contexts, documents, operations = {}, {}, []
    for slot, (document, (metadata, native)) in enumerate(bundles.items()):
        safe_id(document)
        if native['schema'] != 'ultra-production-native-descriptors-v1':
            raise ValueError('Production descriptor schema required')
        anchors = {value: key for key, value in metadata['scopedNodeMap'].items()}
        if len(anchors) != len(metadata['scopedNodeMap']):
            raise ValueError('Duplicate native anchor binding')
        documents[document] = slot
        contexts[slot] = dict(document=document, anchors=anchors)
        if explicit_lifecycle:
            contexts[slot]['nodes'] = {node['id']: node['kind'] for node in native['nodes']}
            if len(contexts[slot]['nodes']) != len(native['nodes']):
                raise ValueError('Duplicate prepared node identity')
        wire.append(f'graph {slot} {len(native["nodes"])} {len(native["edges"])}')
        for node in native['nodes']:
            if node['id'] not in anchors:
                raise ValueError('Prepared node lacks an actual source anchor')
            if len(node['parameters']) != 6:
                raise ValueError('All production native parameters are required')
            text = node['text_hex']
            if not re.fullmatch(r'(?:[0-9a-fA-F]{2})*', text):
                raise ValueError('Invalid prepared text encoding')
            fields = [integer(node[key]) for key in ('id', 'kind', 'device', 'count')]
            wire.append(' '.join(fields + [number(p) for p in node['parameters']] + [text or '-']))
        for edge in native['edges']:
            wire.append(' '.join(integer(edge[key]) for key in ('from', 'outlet', 'to', 'inlet')))
        if not explicit_lifecycle:
            operations.append(f'install-{document} install {slot} {slot} 1')
    labels = {op.split()[0] for op in operations}
    live, revisions = set(), {}
    for step in steps:
        if explicit_lifecycle:
            validate_lifecycle_step(step)
        label = safe_id(step['step_id'])
        if label in labels:
            raise ValueError('Duplicate operation identity')
        labels.add(label)
        document = step['document']
        if document not in bundles:
            raise ValueError('Unknown score document')
        metadata, native = bundles[document]
        if step['source_sha256'] != metadata['sourceSha256']:
            raise ValueError('Score source identity mismatch')
        action, slot = step['action'], documents[document]
        if explicit_lifecycle:
            if action == 'install':
                revision = step['revision']
                if revision <= revisions.get(slot, 0):
                    raise ValueError('Installation revision must increase')
                revisions[slot] = revision
                live.add(slot)
                operations.append(f'{label} install {slot} {slot} {revision}')
                continue
            if slot not in live:
                raise ValueError('Lifecycle action requires a live owner')
            if action == 'close':
                live.remove(slot)
                operations.append(f'{label} close {slot}')
                continue
        elif action != 'event':
            raise ValueError('This finite score accepts only explicit event actions')
        anchor = step['anchor']
        node = metadata['scopedNodeMap'].get(anchor)
        if node not in {n['id'] for n in native['nodes']}:
            raise ValueError('Score anchor is not an executable prepared node')
        if action == 'tab':
            operations.append(f'{label} tab {slot} {node}')
            continue
        operations.append(' '.join([label, 'event', str(documents[document]), integer(node),
                                    integer(step['inlet'])] + encode_message(step['message'])))
    wire.extend([str(len(operations)), *operations])
    return '\n'.join(wire) + '\n', contexts


def validate_lifecycle_step(step):
    common = {'step_id', 'action', 'document', 'source_sha256'}
    fields = {'install': {'revision'}, 'event': {'anchor', 'inlet', 'message'},
              'tab': {'anchor'}, 'close': set()}
    if not isinstance(step, dict) or step.get('action') not in fields:
        raise ValueError('Unknown lifecycle action')
    required = common | fields[step['action']]
    if not required <= step.keys() or step.keys() - required - {'row', 'ordinal', 'interaction'}:
        raise ValueError('Invalid lifecycle action fields')
    safe_id(step['step_id'])
    safe_id(step['document'])
    if len(step['step_id']) > 127:
        raise ValueError('Operation identity exceeds native bound')
    if step['action'] == 'install':
        revision = step['revision']
        integer(revision)
        if not 1 <= revision <= 2**64 - 1:
            raise ValueError('Positive uint64 installation revision required')
    if step['action'] in ('event', 'tab') and not isinstance(step['anchor'], str):
        raise ValueError('Executable anchor required')
    if step['action'] == 'event':
        integer(step['inlet'])
        if not 0 <= step['inlet'] <= 2**32 - 1:
            raise ValueError('Unsigned native inlet required')
        message = step['message']
        if (not isinstance(message, dict) or not isinstance(message.get('selector'), str)
                or not message['selector'] or not isinstance(message.get('atoms'), list)
                or any(not isinstance(atom, dict) or not {'tag', 'value'} <= atom.keys()
                       for atom in message['atoms'])):
            raise ValueError('Typed lifecycle message required')
        selector, atoms = message['selector'], message['atoms']
        if ((selector == 'bang' and atoms) or (selector in ('int', 'float')
                and (len(atoms) != 1 or atoms[0]['tag'] != selector))):
            raise ValueError('Scalar lifecycle selector/atom shape mismatch')


def same_typed_message(expected, actual):
    if actual.get('selector') != expected['selector'] or len(actual.get('atoms', [])) != len(expected['atoms']):
        return False
    for wanted, observed in zip(expected['atoms'], actual['atoms']):
        if observed.get('tag') != wanted['tag'] or observed.get('value') != wanted['value']:
            return False
        if wanted['tag'] in ('int', 'float'):
            value = observed['value']
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                return False
            if wanted['tag'] == 'float' and value == 0 and math.copysign(1, value) != math.copysign(1, wanted['value']):
                return False
    return True


def validate_lifecycle_results(rows, contexts, steps):
    """Check declared operation coverage and each post-operation owner checkpoint."""
    documents = {context['document']: slot for slot, context in contexts.items()}
    if len(rows) != len(steps):
        raise ValueError('Native operation coverage/order gate failed')
    live = {}
    for row, step in zip(rows, steps):
        slot = documents[step['document']]
        if (row.get('step_id'), row.get('action'), row.get('document')) != (
                step['step_id'], step['action'], slot) or type(row.get('document')) is not int:
            raise ValueError('Native operation coverage/order gate failed')
        if (row.get('accepted') is not True or row.get('failed') is not False
                or row.get('templates_unchanged') is not True or row.get('trace_overflow') is not False):
            raise ValueError('Native execution gate failed: ' + step['step_id'])
        if step['action'] == 'install':
            live[slot] = step['revision']
        elif step['action'] == 'close':
            del live[slot]
        snapshots = row['snapshots']
        slots = [snapshot['document'] for snapshot in snapshots]
        if (any(type(value) is not int for value in slots) or len(slots) != len(set(slots))
                or set(slots) != set(live)):
            raise ValueError('Native live-owner snapshot gate failed')
        for snapshot in snapshots:
            owner = snapshot['document']
            if type(snapshot['revision']) is not int or snapshot['revision'] != live[owner]:
                raise ValueError('Native snapshot revision gate failed')
            nodes = snapshot['nodes']
            identities = [node['id'] for node in nodes]
            if (any(type(value) is not int for value in identities)
                    or len(identities) != len(set(identities))
                    or {node['id']: node['kind'] for node in nodes} != contexts[owner]['nodes']
                    or any(type(node['kind']) is not int for node in nodes)):
                raise ValueError('Native snapshot node coverage gate failed')
        for ordinal, receipt in enumerate(row['trace']):
            owner = receipt['document']
            if (type(owner) is not int or owner not in live
                    or type(receipt['node']) is not int or receipt['node'] not in contexts[owner]['nodes']
                    or type(receipt['ordinal']) is not int or receipt['ordinal'] != ordinal
                    or receipt['phase'] not in ('input', 'output')
                    or type(receipt['port']) is not int or receipt['port'] < 0):
                raise ValueError('Native trace identity/order gate failed')
        if step['action'] in ('event', 'tab'):
            first = row['trace'][0] if row['trace'] else None
            anchor_nodes = {anchor: node for node, anchor in contexts[slot]['anchors'].items()}
            if step['action'] == 'event':
                phase, port, message = 'input', step['inlet'], step['message']
            else:
                phase, port, message = 'output', 1, dict(selector='bang', atoms=[])
            if (first is None or (first['document'], first['node'], first['phase'], first['port']) != (
                    slot, anchor_nodes[step['anchor']], phase, port)
                    or not same_typed_message(message, first['message'])):
                raise ValueError('Native declared action receipt gate failed')
        for record in row['console']:
            owner = record['document']
            if (type(owner) is not int or owner not in live
                    or type(record['node']) is not int or record['node'] not in contexts[owner]['nodes']):
                raise ValueError('Native console identity gate failed')


def public_results(rows, contexts):
    result = []
    for row in rows:
        if not row['accepted'] or row['failed'] or row['trace_overflow'] or not row['templates_unchanged']:
            raise ValueError('Native execution gate failed: ' + safe_id(row['step_id']))
        public = {key: row[key] for key in ('step_id', 'action', 'accepted', 'failed', 'templates_unchanged', 'trace_overflow')}
        public['document'] = contexts[row['document']]['document']
        public['trace'] = []
        for receipt in row['trace']:
            context = contexts[receipt['document']]
            public['trace'].append(dict(ordinal=receipt['ordinal'], document=context['document'],
                anchor=context['anchors'][receipt['node']], phase=receipt['phase'], port=receipt['port'],
                message=_normalization.public_message(receipt['message'])))
        public['snapshots'] = []
        for snapshot in row['snapshots']:
            if snapshot['console_dropped']:
                raise ValueError('Native console drop gate failed')
            context = contexts[snapshot['document']]
            state = dict(document=context['document'], revision=snapshot['revision'],
                         text_edit_serial=snapshot['text_edit_serial'], console_dropped=0, nodes=[])
            for node in snapshot['nodes']:
                item = dict(anchor=context['anchors'][node['id']], kind=node['kind'], value=node['value'],
                            pulses=node['pulses'], last_message=_normalization.public_message(node['last_message']))
                if 'message_box' in node:
                    box = node['message_box']
                    item['message_box'] = dict(empty=box['empty'], generation=box['generation'],
                        prototype=_normalization.public_message(box['prototype']),
                        arguments=_normalization.public_message(box['arguments']), placeholders=box['placeholders'])
                state['nodes'].append(item)
            public['snapshots'].append(state)
        public['console'] = [dict(record_sha256=hashlib.sha256(json.dumps(record, sort_keys=True).encode()).hexdigest())
                             for record in row['console']]
        result.append(public)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--bundle-root', type=Path, required=True)
    parser.add_argument('--score', type=Path, required=True)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--private-output', type=Path, required=True)
    parser.add_argument('--public-output', type=Path, required=True)
    parser.add_argument('--explicit-lifecycle', action='store_true',
                        help='Require declared install/event/tab/close actions; synthesize no installs')
    args = parser.parse_args()
    score = json.loads(args.score.read_text())
    names = list(dict.fromkeys(step['document'] for step in score))
    bundles, before = {}, {}
    for name in names:
        directory = (args.bundle_root / safe_id(name)).resolve()
        if directory == REPO or REPO in directory.parents:
            raise ValueError('Private source bundle must remain outside the source worktree')
        for filename in ('authoring.json', 'flat.json', 'import.json', 'native.json'):
            before[str(directory / filename)] = digest(directory / filename)
        bundles[name] = (json.loads((directory / 'import.json').read_text()), json.loads((directory / 'native.json').read_text()))
    wire, contexts = build_transport(bundles, score, explicit_lifecycle=args.explicit_lifecycle)
    output = new_private_directory(args.private_output)
    (output / 'transport.txt').write_text(wire)
    run = subprocess.run([str(args.binary.resolve())], input=wire, capture_output=True, text=True, timeout=30)
    (output / 'native.jsonl').write_text(run.stdout)
    (output / 'stderr.txt').write_text(run.stderr)
    if run.returncode:
        raise ValueError('Native runner failed; raw output retained only in private directory')
    rows = [json.loads(line) for line in run.stdout.splitlines()]
    if args.explicit_lifecycle:
        validate_lifecycle_results(rows, contexts, score)
    elif [row['step_id'] for row in rows] != [f'install-{name}' for name in names] + [step['step_id'] for step in score]:
        raise ValueError('Native operation coverage/order gate failed')
    public = public_results(rows, contexts)
    if any(digest(path) != value for path, value in before.items()):
        raise ValueError('Imported authoring/descriptor retention gate failed')
    evidence = dict(schema_version=1, status='NATIVE_SCORED_NOT_MAX_COMPARED',
        source_identities={name: meta['sourceSha256'] for name, (meta, _) in bundles.items()},
        binary_sha256=digest(args.binary), score_sha256=digest(args.score),
        bundle_file_sha256={name: {Path(path).name: value for path, value in before.items()
            if Path(path).parent.name == name} for name in names},
        action_count=len(score), result_count=len(rows), authoring_retained=True,
        all_runtime_gates_pass=True, rows=public,
        complete_installed_help_qualification_passes_added=0)
    with args.public_output.open('x') as file:
        json.dump(evidence, file, indent=2, ensure_ascii=True, allow_nan=False)
        file.write('\n')
    print(json.dumps(dict(status=evidence['status'], actions=len(score), receipts=sum(len(row['trace']) for row in rows),
                          authoring_retained=True, qualification_passes_added=0)))


if __name__ == '__main__':
    main()
