"""Independent, private freebang-v1 evidence validation using only the stdlib."""
from collections import Counter
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat


VERSION = 'freebang-v1'
OBSERVER = '__alive_numeric_lifecycle_observer'
FREEBANG = '__alive_numeric_freebang'
SEND = '__alive_numeric_lifecycle_send'
# This finite score closes float-r1 before int-r1; owner inlets are sealed as 2 and 0.
CLOSE_ORDER = (2, 0)
HARNESS = {
    '__alive_numeric_reader': ('v8', [-3000, -3000, 160, 133]),
    '__alive_numeric_disposer': ('thispatcher', [-3100, -3000, 100, 22]),
    FREEBANG: ('freebang', [-3200, -3000, 100, 22]),
    SEND: ('send', [-3400, -3000, 200, 64]),
}
ROOT_SOURCES = {
    'float': 'c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c',
    'int': 'bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61'}
ROOT_HELPERS = {
    'helpstarter.js': 'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8',
    'helpname.js': '49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa',
    'helpdetails.js': '31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1',
    'helpargs.js': '04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'}
ROOT_CLASSES = {
    'root/obj-2': ([10, 85, 50, 20], '484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393'),
    'root/obj-3': ([205, 205, 50, 20], 'bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a')}


def _require(condition, label):
    if not condition:
        raise ValueError('Invalid lifecycle ' + label)


def _keys(value, required, optional=()):
    _require(type(value) is dict, 'object')
    _require(set(required) <= value.keys() <= set(required) | set(optional), 'fields')


def _int(value, minimum=0, maximum=None):
    _require(type(value) is int and value >= minimum and (maximum is None or value <= maximum), 'integer')
    return value


def _text(value, empty=False):
    _require(type(value) is str and (empty or bool(value)), 'text')
    return value


def _list(value):
    _require(type(value) is list, 'list')
    return value


def _canonical(value):
    try:
        return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('utf-8')
    except (ValueError, TypeError):
        raise ValueError('Invalid lifecycle JSON value') from None


def _same(left, right):
    return _canonical(left) == _canonical(right)


def _digest(data):
    return hashlib.sha256(data).hexdigest()


def _sha(value):
    _require(type(value) is str and re.fullmatch('[0-9a-f]{64}', value), 'digest')
    return value


def _json(data):
    def pairs(items):
        result = {}
        for key, value in items:
            _require(key not in result, 'duplicate JSON field')
            result[key] = value
        return result

    def constant(_):
        raise ValueError('Invalid lifecycle JSON constant')

    try:
        return json.loads(data, object_pairs_hook=pairs, parse_constant=constant)
    except (UnicodeError, json.JSONDecodeError):
        raise ValueError('Invalid lifecycle raw JSON') from None


def _directory(path):
    try:
        info = path.lstat()
    except OSError:
        raise ValueError('Invalid lifecycle private directory') from None
    _require(stat.S_ISDIR(info.st_mode) and stat.S_IMODE(info.st_mode) == 0o700, 'private directory')


def _work(value):
    path = Path(value).absolute()
    _require(path.resolve() == path, 'work symlink')
    _directory(path)
    return path


def _path(work, value):
    if isinstance(value, Path):
        path = value
    else:
        value = _text(value)
        path = Path(value[2:] if value.startswith('Z:/') else value)
    _require(path.is_absolute() and '..' not in path.parts, 'absolute private path')
    try:
        relative = path.relative_to(work)
    except ValueError:
        raise ValueError('Invalid lifecycle private path scope') from None
    _require(relative.parts and path.resolve() == path, 'private path symlink')
    parent = work
    _directory(parent)
    for component in relative.parts[:-1]:
        parent = parent / component
        _directory(parent)
    return path


def _read(work, value):
    path = _path(work, value)
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
        with os.fdopen(fd, 'rb') as handle:
            before = os.fstat(handle.fileno())
            _require(stat.S_ISREG(before.st_mode) and stat.S_IMODE(before.st_mode) == 0o600
                     and before.st_nlink == 1, 'private file')
            data = handle.read()
            after = os.fstat(handle.fileno())
        current = path.lstat()
    except OSError:
        raise ValueError('Invalid lifecycle private file read') from None
    identity = lambda info: (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)
    _require(identity(before) == identity(after) == identity(current) and len(data) == after.st_size,
             'stable private file')
    return data


def _retain(work, path, data):
    path = _path(work, path)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'wb') as handle:
        os.fchmod(handle.fileno(), 0o600)
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
    _require(_read(work, path) == data, 'retained bytes')
    return path


def _rect(value):
    _require(type(value) is list and len(value) == 4 and
             all(type(v) in (int, float) and math.isfinite(v) for v in value), 'rectangle')


def _positive(value):
    _require(type(value) is bool or type(value) in (int, float) and math.isfinite(value)
             and value in (0, 1), 'primitive validity')
    _require(value is True or type(value) in (int, float) and value == 1, 'live route handle')


def _configuration(work, config):
    _require(type(config) is dict and config.get('work') == str(work), 'work binding')
    raw = _read(work, work / 'config.json')
    _require(_same(_json(raw), config), 'sealed config equality')
    seal = _json(_read(work, work / 'seal.json'))
    _require(type(seal) is dict and type(seal.get('files')) is dict and
             seal['files'].get('config.json') == _digest(raw), 'sealed config digest')
    lifecycle = config.get('lifecycle')
    _keys(lifecycle, ('version', 'monitor_epoch', 'observer_path', 'report_path', 'driver_inventory', 'owners'))
    _require(lifecycle['version'] == VERSION and type(lifecycle['monitor_epoch']) is str and
             re.fullmatch('[0-9a-f]{48}', lifecycle['monitor_epoch']), 'version or epoch')
    helper_path = _path(work, lifecycle['observer_path'])
    _require(helper_path == work / 'lifecycle-observer.js' and
             _path(work, lifecycle['report_path']) == work / 'lifecycle-report.json', 'observer paths')
    helper_sha = _digest(_read(work, helper_path))
    _require(type(config.get('package_sha256')) is dict and
             config['package_sha256'].get('lifecycle-observer.js') == helper_sha ==
             seal['files'].get('lifecycle-observer.js'), 'observer helper digest')
    owners = _list(lifecycle['owners'])
    _require(len(owners) == 4, 'owner count')
    documents = _list(config.get('documents'))
    definitions = {}
    for definition in documents:
        _require(type(definition) is dict, 'definition')
        key = (definition.get('document'), _int(definition.get('revision'), 1, 2))
        _require(key not in definitions, 'duplicate definition')
        definitions[key] = definition
    _require(set(definitions) == {('int', 1), ('int', 2), ('float', 1), ('float', 2)}, 'definitions')
    if any(definitions[document, 1].get('source_sha256') == source for document, source in ROOT_SOURCES.items()):
        helpers = _list(config.get('helpers'))
        _require(len(helpers) == 4 and all(type(h) is dict for h in helpers) and
                 _same({h.get('name'): h.get('sha256') for h in helpers}, ROOT_HELPERS),
                 'fixed root helpers')
    channels = set()
    for inlet, (owner, identity) in enumerate(zip(owners, (('int', 1), ('int', 2), ('float', 1), ('float', 2)))):
        _keys(owner, ('document', 'revision', 'source_sha256', 'working_path', 'channel', 'inlet', 'root_proof_path'))
        _require((owner['document'], _int(owner['revision'], 1, 2)) == identity and
                 _int(owner['inlet'], 0, 3) == inlet, 'owner map')
        definition = definitions[identity]
        _require(_int(definition.get('lifecycle_owner_inlet'), 0, 3) == inlet and
                 owner['source_sha256'] == _sha(definition.get('source_sha256')) and
                 owner['working_path'] == definition.get('working_windows_path'), 'owner definition binding')
        _path(work, owner['working_path'])
        _require(_path(work, owner['root_proof_path']) == work / 'observations' /
                 f'lifecycle-root-{identity[0]}-r{identity[1]}.json', 'root proof path')
        channel = owner['channel']
        _require(type(channel) is str and re.fullmatch('[A-Za-z_][A-Za-z0-9_]*', channel)
                 and channel not in channels, 'unique channel')
        channels.add(channel)
    inventory = _list(lifecycle['driver_inventory'])
    expected_classes = {'__alive_numeric_controller': 'js', OBSERVER: 'v8'}
    expected_classes.update({'__alive_numeric_lifecycle_receive_' + str(i): 'receive' for i in range(4)})
    _require(len(inventory) == 6, 'driver construction count')
    seen = set()
    for box in inventory:
        _keys(box, ('varname', 'maxclass', 'boxtext', 'rect'))
        name = _text(box['varname'])
        _require(name not in seen and expected_classes.get(name) == box['maxclass'], 'driver construction identity')
        seen.add(name)
        _text(box['boxtext'])
        _rect(box['rect'])
        if box['maxclass'] == 'receive':
            inlet = int(name.rsplit('_', 1)[1])
            _require(box['boxtext'] == 'receive ' + owners[inlet]['channel'], 'receiver construction channel')
    _require(seen == set(expected_classes), 'driver construction inventory')
    return lifecycle, definitions, helper_sha


def _ack(work, ack):
    _require(type(ack) is dict and ack.get('success') is True, 'ACK success')
    request = _int(ack.get('command_id'), 1)
    raw = _read(work, work / 'observations' / f'ack-request-{request}.json')
    _require(_same(_json(raw), ack), 'retained ACK equality')
    return request, raw


def _routes(proof, expected):
    expected_counts = Counter(_canonical(row) for row in expected)
    for key in ('input_routes', 'output_routes'):
        routes = _list(proof[key])
        for route in routes:
            _keys(route, ('source', 'destination'))
            for endpoint in route.values():
                _keys(endpoint, ('identity', 'port'))
                _text(endpoint['identity'])
                _int(endpoint['port'])
        _require(Counter(_canonical(row) for row in routes) == expected_counts, 'route multiset')


def _edge(source, destination, inlet=0):
    return dict(source=dict(identity=source, port=0), destination=dict(identity=destination, port=inlet))


def _driver(proof, lifecycle):
    _keys(proof, ('boxes', 'input_routes', 'output_routes', 'declared_inlets', 'declared_outlets'))
    _require(_int(proof['declared_inlets']) == 5 and _int(proof['declared_outlets']) == 0, 'observer declarations')
    expected = {box['varname']: box for box in lifecycle['driver_inventory']}
    boxes = _list(proof['boxes'])
    _require(len(boxes) == len(expected), 'driver object count')
    seen = set()
    for box in boxes:
        _keys(box, ('varname', 'maxclass', 'boxtext', 'rect', 'valid'))
        name = _text(box['varname'])
        _require(name in expected and name not in seen, 'driver object identity')
        seen.add(name)
        _rect(box['rect'])
        _require(box['rect'] == expected[name]['rect'] and box['maxclass'] == expected[name]['maxclass']
                 and box['boxtext'] == expected[name]['boxtext'], 'driver construction readback')
        _positive(box['valid'])
    _routes(proof, [_edge('__alive_numeric_lifecycle_receive_' + str(i), OBSERVER, i + 1) for i in range(4)])


def _finite_root_class(box, owner, definition, original):
    anchor = original['anchor']
    document = owner['document']
    _require(document in ROOT_SOURCES and _int(owner['revision'], 1, 2) == 1 and
             owner['source_sha256'] == definition.get('source_sha256') == ROOT_SOURCES[document] and
             definition.get('document') == document and _int(definition.get('revision'), 1, 2) == 1 and
             anchor in ROOT_CLASSES, 'finite V8 root owner')
    saved, text_sha = ROOT_CLASSES[anchor]
    live = saved[:3] + [22]
    _rect(original.get('rect'))
    _rect(box['rect'])
    _require(box['maxclass'] == 'jpatcher' and original.get('maxclass') == 'newobj' and
             original.get('runtime_class') == 'patcher' and
             _same(original.get('runtime_classes'), ['patcher', 'p']) and
             original['rect'] == saved and box['rect'] == live and
             original.get('source_text_sha256') == text_sha and
             _same(definition.get('helper_sha256'), ROOT_HELPERS), 'finite V8 root source')
    for key in ('saved_incoming_routes', 'saved_outgoing_routes'):
        _require(_int(original.get(key), 0, 0) == 0, 'finite V8 root saved routes')
    expected = dict(kind='source-bound-' + document + '-shell-height', document=document,
                    source_sha256=ROOT_SOURCES[document],
                    anchor=anchor, runtime_class='patcher', saved_rect=saved, live_rect=live,
                    source_text_sha256=text_sha, helper_sha256=ROOT_HELPERS,
                    saved_incoming_routes=0, saved_outgoing_routes=0)
    _require(_same(original.get('shell_height_policy'), expected), 'finite V8 root shell profile')
    return 'patcher'


def _root(proof, owner, definition, request, step):
    _keys(proof, ('version', 'request_id', 'step_id', 'document', 'revision', 'source_sha256',
                  'working_path', 'root_is_top_level', 'originals', 'harness', 'input_routes', 'output_routes'))
    _require(proof['version'] == VERSION and _int(proof['request_id'], 1) == request and
             proof['step_id'] == step and proof['document'] == owner['document'] and
             _int(proof['revision'], 1, 2) == owner['revision'] and proof['source_sha256'] == owner['source_sha256']
             and proof['working_path'] == owner['working_path'] and proof['root_is_top_level'] is True, 'root binding')
    expected = {box['anchor']: box for box in definition['full_inventory'] if box['anchor'].count('/') == 1}
    originals = _list(proof['originals'])
    _require(expected and len(originals) == len(expected), 'root original count')
    seen = set()
    for box in originals:
        _keys(box, ('anchor', 'varname', 'maxclass', 'rect'))
        anchor = _text(box['anchor'])
        _require(anchor in expected and anchor not in seen, 'root original identity')
        seen.add(anchor)
        definition_box = expected[anchor]
        classes = definition_box.get('runtime_classes', [definition_box['runtime_class']])
        finite = (owner['document'] in ROOT_SOURCES and owner['revision'] == 1 and
                  anchor in ROOT_CLASSES)
        source_class = (_finite_root_class(box, owner, definition, definition_box)
                        if finite or box['maxclass'] == 'jpatcher' else box['maxclass'])
        _require(source_class in classes and box['varname'] == (definition_box.get('source_varname') or ''),
                 'root original class or name')
        _rect(box['rect'])
        if box['rect'] != definition_box['rect']:
            policy = definition_box.get('shell_height_policy')
            _require(type(policy) is dict and policy.get('document') == owner['document'] and
                     policy.get('source_sha256') == owner['source_sha256'] and policy.get('anchor') == anchor and
                     policy.get('runtime_class') == source_class and policy.get('saved_rect') == definition_box['rect']
                     and policy.get('live_rect') == box['rect'] and
                     policy.get('helper_sha256') == definition['helper_sha256'], 'sealed root geometry policy')
    harness = _list(proof['harness'])
    _require(len(harness) == 4, 'root harness count')
    seen = set()
    for box in harness:
        _keys(box, ('varname', 'maxclass', 'rect', 'boxtext', 'valid'))
        name = _text(box['varname'])
        _require(name in HARNESS and name not in seen, 'root harness identity')
        seen.add(name)
        _rect(box['rect'])
        _require((box['maxclass'], box['rect']) == HARNESS[name], 'root harness class or geometry')
        _text(box['boxtext'])
        _positive(box['valid'])
        if name in (FREEBANG, SEND):
            _require(box['boxtext'] == ('freebang' if name == FREEBANG else 'send ' + owner['channel']),
                     'owner channel text')
    _routes(proof, [_edge(FREEBANG, SEND)])


def _value(value):
    _require(type(value) is dict and type(value.get('type')) is str, 'typed diagnostic value')
    kind = value['type']
    if kind in ('undefined', 'null', 'object', 'function'):
        _keys(value, ('type',))
    elif kind in ('boolean', 'string'):
        _keys(value, ('type', 'value'))
        _require(type(value['value']) is (bool if kind == 'boolean' else str), 'diagnostic primitive')
    elif kind == 'number':
        if 'representation' in value:
            _keys(value, ('type', 'representation'))
            _require(value['representation'] in ('nan', 'positive-infinity', 'negative-infinity'), 'number representation')
        else:
            _keys(value, ('type', 'value'))
            _require(type(value['value']) in (int, float) and math.isfinite(value['value']), 'diagnostic number')
    else:
        raise ValueError('Invalid lifecycle diagnostic type')


def _diagnostic(value, nullable=False):
    if value is None and nullable:
        return
    _require(type(value) is dict, 'typed diagnostic')
    if value.get('status') == 'returned':
        _value({key: item for key, item in value.items() if key != 'status'})
    else:
        _keys(value, ('status', 'exception'), ('name', 'message'))
        _require(value['status'] == 'threw', 'diagnostic status')
        _value(value['exception'])
        for key in ('name', 'message'):
            if key in value:
                _text(value[key], empty=True)


def _valid(value):
    _keys(value, ('status', 'type', 'value'))
    _require(value['status'] == 'returned', 'validity read status')
    if value['type'] == 'boolean':
        _require(type(value['value']) is bool, 'boolean validity')
    else:
        _require(value['type'] == 'number' and type(value['value']) in (int, float)
                 and math.isfinite(value['value']) and value['value'] in (0, 1), 'numeric validity')
    return bool(value['value'])


def _samples(diagnostics, definition):
    samples = _list(diagnostics['samples'])
    _require(len(samples) == 31, 'complete samples')
    anchors = {box['anchor'] for box in definition['boxes']}
    _require(anchors and len(anchors) == len(definition['boxes']), 'required original anchors')
    required = ('phase', 'attempt', 'root_valid', 'reader_valid', 'disposer_valid', 'root_filepath',
                'objects', 'firstobject', 'firstobject_valid', 'wind', 'wind_visible', 'wind_assocclass',
                'wind_assoc', 'wind_assoc_filepath', 'harness_objects', 'retained_firstobject_valid')
    joint_invalid = False
    for attempt, sample in enumerate(samples):
        _keys(sample, required)
        _require(_int(sample['attempt']) == attempt and sample['phase'] ==
                 ('before-dispose' if attempt == 0 else 'poll'), 'sample sequence')
        values = [_valid(sample[name]) for name in ('reader_valid', 'disposer_valid', 'retained_firstobject_valid')]
        for key, expected in (('objects', anchors), ('harness_objects', {FREEBANG, SEND})):
            rows = _list(sample[key])
            seen = set()
            _require(len(rows) == len(expected), 'sample handle count')
            for row in rows:
                _keys(row, ('anchor', 'valid'))
                _require(type(row['anchor']) is str and row['anchor'] in expected and row['anchor'] not in seen,
                         'sample handle identity')
                seen.add(row['anchor'])
                values.append(_valid(row['valid']))
        for field in ('root_valid', 'root_filepath', 'firstobject', 'wind'):
            _diagnostic(sample[field])
        for field in ('firstobject_valid', 'wind_visible', 'wind_assocclass', 'wind_assoc', 'wind_assoc_filepath'):
            _diagnostic(sample[field], nullable=True)
        if attempt == 0:
            _require(all(values), 'positive before-dispose handles')
        else:
            _require(not joint_invalid or not any(values), 'handle revival')
            joint_invalid = joint_invalid or not any(values)
    _require(joint_invalid and not any(values), 'bounded invalidity convergence')
    dispose = diagnostics['dispose']
    _keys(dispose, ('attempted', 'result'))
    _require(dispose['attempted'] is True, 'dispose attempt')
    _diagnostic(dispose['result'])
    _require(dispose['result']['status'] == 'returned', 'nonthrowing dispose')


def _report(report, lifecycle, request, step, inlet=None, barrier=False):
    _keys(report, ('monitor_epoch', 'seq', 'transitions', 'events', 'states', 'failures', 'sealed'))
    _require(report['monitor_epoch'] == lifecycle['monitor_epoch'] and type(report['sealed']) is bool
             and report['sealed'] is barrier, 'report epoch or sealing')
    _require(_list(report['failures']) == [], 'sticky observer failure')
    transitions = _list(report['transitions'])
    events = _list(report['events'])
    combined = []
    for rows, event in ((transitions, False), (events, True)):
        previous = 0
        for row in rows:
            _keys(row, ('seq', 'inlet', 'request_id', 'step_id', 'payload_kind' if event else 'kind'))
            sequence = _int(row['seq'], 1)
            _require(sequence > previous, 'ordered report collection')
            previous = sequence
            _int(row['request_id'], 1)
            _text(row['step_id'])
            combined.append((sequence, event, row))
    combined.sort(key=lambda item: item[0])
    _require(combined and [item[0] for item in combined] == list(range(1, len(combined) + 1))
             and _int(report['seq']) == len(combined), 'contiguous observer sequence')
    states = [dict(inlet=i, state='monitoring', request_id=0, step_id='', witness_count=0) for i in range(4)]
    active = None
    returned = set()
    used_requests = set()
    latest_request = 0
    for sequence, event, row in combined:
        channel = _int(row['inlet'], -1, 3)
        kind = row['payload_kind'] if event else row['kind']
        if not event and kind == 'barrier':
            _require(barrier and sequence == len(combined) and channel == -1 and active is None and
                     row['request_id'] == request and row['request_id'] > latest_request and
                     row['step_id'] == 'capture-complete', 'final barrier transition')
            continue
        _require(channel >= 0 and lifecycle['owners'][channel]['revision'] == 1, 'scored owner inlet')
        state = states[channel]
        if not event and kind == 'arm':
            _require(active is None and state['state'] == 'monitoring' and
                     row['request_id'] not in used_requests and row['request_id'] > latest_request and
                     row['step_id'] == 'close-' + lifecycle['owners'][channel]['document'], 'fresh arm')
            state.update(state='armed', request_id=row['request_id'], step_id=row['step_id'])
            active = channel
            used_requests.add(row['request_id'])
            latest_request = row['request_id']
            continue
        _require(active == channel and row['request_id'] == state['request_id'] and
                 row['step_id'] == state['step_id'], 'active request binding')
        if event:
            _require(kind == 'bang' and state['state'] == 'dispatching' and state['witness_count'] == 0,
                     'single eligible automatic witness')
            state.update(state='witnessed', witness_count=1)
        elif kind == 'dispatch-start':
            _require(state['state'] == 'armed', 'single disposal dispatch')
            state['state'] = 'dispatching'
        elif kind == 'dispatch-return':
            _require(state['state'] in ('dispatching', 'witnessed') and channel not in returned,
                     'single disposal return')
            returned.add(channel)
        elif kind == 'close-validated':
            _require(state['state'] == 'witnessed' and state['witness_count'] == 1 and channel in returned,
                     'validated close witness')
            state['state'] = 'closed'
            active = None
        else:
            raise ValueError('Invalid lifecycle control transition')
    observed_states = _list(report['states'])
    _require(len(observed_states) == 4, 'observer state count')
    for index, state in enumerate(observed_states):
        _keys(state, ('inlet', 'state', 'request_id', 'step_id', 'witness_count'))
        _require(_int(state['inlet'], 0, 3) == index, 'ordered owner states')
        _int(state['request_id'])
        _int(state['witness_count'], 0, 1)
        _text(state['step_id'], empty=True)
    _require(_same(observed_states, states) and active is None, 'derived observer states')
    last = combined[-1]
    if barrier:
        _require(not last[1] and last[2]['kind'] == 'barrier' and
                 all(state['state'] == ('closed' if i in (0, 2) else 'monitoring') and
                     state['witness_count'] == (1 if i in (0, 2) else 0) for i, state in enumerate(states)),
                 'final owner lifetime set')
    else:
        _require(not last[1] and last[2]['kind'] == 'close-validated' and last[2]['inlet'] == inlet and
                 last[2]['request_id'] == request and last[2]['step_id'] == step, 'final close boundary')


def _verify_close(work, lifecycle, definitions, helper_sha, command, ack, retained_root=None):
    """Verify a close conjunction without creating or replacing retained evidence."""
    _keys(command, ('command_id', 'op', 'step_id', 'action', 'document', 'action_revision', 'source_sha256'))
    request = _int(command['command_id'], 1)
    revision = _int(command['action_revision'], 1, 2)
    _require(command['op'] == 'operation' and command['action'] == 'close' and revision == 1 and
             command['document'] in ('int', 'float') and command['step_id'] == 'close-' + command['document'],
             'close operation')
    definition = definitions[command['document'], revision]
    owner = lifecycle['owners'][definition['lifecycle_owner_inlet']]
    _require(command['source_sha256'] == owner['source_sha256'], 'command source')
    ack_request, ack_raw = _ack(work, ack)
    _require(ack_request == request and ack.get('step_id') == command['step_id'] and
             ack.get('closed_owner_absence_validated') is True, 'controller close conjunction')
    diagnostics = ack.get('close_diagnostics')
    _keys(diagnostics, ('request_id', 'step_id', 'action', 'document', 'revision', 'source_sha256',
                        'working_path', 'helper_sha256', 'samples', 'dispose', 'lifecycle_evidence'))
    _require(_int(diagnostics['request_id'], 1) == request and diagnostics['step_id'] == command['step_id'] and
             diagnostics['action'] == 'close' and diagnostics['document'] == owner['document'] and
             _int(diagnostics['revision'], 1, 2) == revision and diagnostics['source_sha256'] == owner['source_sha256']
             and diagnostics['working_path'] == owner['working_path'] and
             _same(diagnostics['helper_sha256'], definition['helper_sha256']), 'close diagnostic binding')
    evidence = diagnostics['lifecycle_evidence']
    _keys(evidence, ('version', 'binding', 'root_route_path', 'root_route_proof', 'driver_route_proof', 'observer_report'))
    binding = evidence['binding']
    _keys(binding, ('monitor_epoch', 'request_id', 'step_id', 'action', 'document', 'revision',
                    'source_sha256', 'working_path', 'observer_helper_sha256'))
    _int(binding['request_id'], 1)
    _int(binding['revision'], 1, 2)
    expected_binding = dict(monitor_epoch=lifecycle['monitor_epoch'], request_id=request,
                            step_id=command['step_id'], action='close', document=owner['document'], revision=revision,
                            source_sha256=owner['source_sha256'], working_path=owner['working_path'],
                            observer_helper_sha256=helper_sha)
    _require(evidence['version'] == VERSION and _same(binding, expected_binding) and
             evidence['root_route_path'] == owner['root_proof_path'], 'lifecycle close binding')
    root_raw = _read(work, evidence['root_route_path'])
    if retained_root is not None:
        _require(root_raw == retained_root, 'historical root bytes')
    _require(_same(_json(root_raw), evidence['root_route_proof']), 'embedded root proof equality')
    _root(evidence['root_route_proof'], owner, definition, request, command['step_id'])
    _driver(evidence['driver_route_proof'], lifecycle)
    _samples(diagnostics, definition)
    _report(evidence['observer_report'], lifecycle, request, command['step_id'], owner['inlet'])
    return owner, evidence['observer_report'], root_raw, ack_raw


def _retained_root_path(work, owner):
    return work / 'observations' / f"retained-lifecycle-root-{owner['document']}-r{owner['revision']}.json"


def _closed_owners(report, expected):
    _require(tuple(state['inlet'] for state in report['states'] if state['state'] == 'closed') ==
             tuple(sorted(expected)), 'expected accepted close set')


def _prefix(previous, current):
    for field in ('transitions', 'events'):
        _require(_same(previous[field], current[field][:len(previous[field])]), 'accepted observer prefix')
    for state in previous['states']:
        if state['state'] == 'closed':
            _require(_same(state, current['states'][state['inlet']]), 'accepted closed owner state')


def _history(work, lifecycle, definitions, helper_sha, report, earlier):
    previous = None
    for position, inlet in enumerate(earlier):
        owner = lifecycle['owners'][inlet]
        retained_path = _retained_root_path(work, owner)
        root_raw = _read(work, retained_path)
        root = _json(root_raw)
        _require(type(root) is dict, 'historical root object')
        request = _int(root.get('request_id'), 1)
        metadata = _json(_read(work, work / 'observations' / f'validated-close-{request}.json'))
        _keys(metadata, ('close_proof_validated', 'root_raw_path', 'root_sha256', 'root_bytes',
                         'ack_sha256', 'ack_bytes'))
        _require(metadata['close_proof_validated'] is True and
                 _text(metadata['root_raw_path']) == str(retained_path) and
                 _path(work, metadata['root_raw_path']) == retained_path and
                 _sha(metadata['root_sha256']) == _digest(root_raw) and
                 _int(metadata['root_bytes'], 1) == len(root_raw), 'historical root metadata')
        ack_raw = _read(work, work / 'observations' / f'ack-request-{request}.json')
        _require(_sha(metadata['ack_sha256']) == _digest(ack_raw) and
                 _int(metadata['ack_bytes'], 1) == len(ack_raw), 'historical ACK metadata')
        ack = _json(ack_raw)
        command = dict(command_id=request, op='operation', step_id='close-' + owner['document'],
                       action='close', document=owner['document'], action_revision=owner['revision'],
                       source_sha256=owner['source_sha256'])
        verified_owner, historical, _, verified_ack_raw = _verify_close(
            work, lifecycle, definitions, helper_sha, command, ack, retained_root=root_raw)
        _require(_same(verified_owner, owner) and verified_ack_raw == ack_raw, 'historical owner ACK binding')
        _closed_owners(historical, earlier[:position + 1])
        if previous is not None:
            _prefix(previous, historical)
        previous = historical
    if previous is not None:
        _prefix(previous, report)


def validate_close(work, config, command, ack):
    """Validate one retained close ACK; exclusively retain its exact root proof."""
    work = _work(work)
    lifecycle, definitions, helper_sha = _configuration(work, config)
    owner, report, root_raw, ack_raw = _verify_close(work, lifecycle, definitions, helper_sha, command, ack)
    position = CLOSE_ORDER.index(owner['inlet'])
    _closed_owners(report, CLOSE_ORDER[:position + 1])
    _history(work, lifecycle, definitions, helper_sha, report, CLOSE_ORDER[:position])
    retained = _retain(work, _retained_root_path(work, owner), root_raw)
    return dict(close_proof_validated=True, root_raw_path=str(retained), root_sha256=_digest(root_raw),
                root_bytes=len(root_raw), ack_sha256=_digest(ack_raw), ack_bytes=len(ack_raw))


def validate_barrier(work, config, evidence, expected_live):
    """Validate the final private ACK while closed revision channels are monitored."""
    work = _work(work)
    lifecycle, definitions, helper_sha = _configuration(work, config)
    _require(type(expected_live) is dict and set(expected_live) == {'int', 'float'} and
             all(type(value) is int and value == 2 for value in expected_live.values()), 'expected live owners')
    _keys(evidence, ('command_id', 'success', 'step_id', 'lifecycle_evidence'))
    request, _ = _ack(work, evidence)
    _require(evidence['step_id'] == 'capture-complete', 'barrier step')
    proof = evidence['lifecycle_evidence']
    _keys(proof, ('version', 'binding', 'driver_route_proof', 'observer_report'))
    binding = proof['binding']
    _keys(binding, ('monitor_epoch', 'request_id', 'step_id', 'action', 'observer_helper_sha256'))
    _int(binding['request_id'], 1)
    _require(proof['version'] == VERSION and _same(binding, dict(monitor_epoch=lifecycle['monitor_epoch'],
             request_id=request, step_id='capture-complete', action='lifecycle-barrier',
             observer_helper_sha256=helper_sha)), 'barrier binding')
    _driver(proof['driver_route_proof'], lifecycle)
    _report(proof['observer_report'], lifecycle, request, 'capture-complete', barrier=True)
    _history(work, lifecycle, definitions, helper_sha, proof['observer_report'], CLOSE_ORDER)
