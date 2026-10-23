"""Independent, private arithmetic-freebang-v1 evidence validation using only the stdlib."""
from collections import Counter
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat


VERSION = 'arithmetic-freebang-v1'
OBSERVER = '__alive_arithmetic_lifecycle_observer'
FREEBANG = '__alive_arithmetic_freebang'
SEND = '__alive_arithmetic_lifecycle_send'
# The exact timeline closes all six revision-specific owner channels in order.
CLOSE_ORDER = tuple(range(6))
HARNESS = {
    '__alive_arithmetic_reader': ('v8', [-3000, -3000, 160, 133]),
    '__alive_arithmetic_disposer': ('thispatcher', [-3100, -3000, 100, 22]),
    FREEBANG: ('freebang', [-3200, -3000, 100, 22]),
    SEND: ('send', [-3400, -3000, 200, 64]),
}
ROOT_SOURCES = {'times': '1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b', 'plus': 'd1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895', 'minus': '7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0'}
ROOT_HELPERS = {
    'helpstarter.js': 'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8',
    'helpname.js': '49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa',
    'helpdetails.js': '31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1',
    'helpargs.js': '04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'}

# Capture001 times-only geometry identities; vectors stay private.
GEOMETRY_SOURCE = '1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b'
GEOMETRY_EVIDENCE = {'ack_sha256': '8a9b1405f0e5b6cc0706c57c54660777d73736eafb5281025fcd17f9f0addaeb', 'config_sha256': 'a6512b968a0637b93752b446ebfc5c4ab86f0cb6c006b22272ec52f9091c3cff', 'seal_sha256': '34634c43ab942f092fe2f2ccc66e4ea987ca9c5e78d7649cc7d026e728ab9070', 'manifest_sha256': '65ad2d5c90b185f4c89ca512274cf61682ab2ca9e939b79f52d8234e61c6c0b3', 'rea_evidence_id': 'ev_a9118e14891b1c344fa246dcb7663ea520d23df9c742ffc3dd450a6289a37098'}
TIMES_GEOMETRY_PINS = {'root/obj-3': {'runtime_class': 'js', 'changed_dimension': 3, 'source_box_sha256': 'c7355e6a1bd3aef210bfd59ead9d88a6faa6c3aaba8fb2eda9ccbaa5accf6ec9', 'source_text_sha256': '0ca81c69553c5299b7dc137769cb0887e0f1dc26c73bfe08c0e04891d8a99d02', 'saved_rect_sha256': '4814549a20cdea1cfbb09260659e96090b0f19f029fd07d1405c2a48d7288f69', 'live_rect_sha256': 'db4ae3c63db9fecef333bf4657bce3104026f6484bd5ab0edd0bc53c328ecd7e'}, 'root/obj-4': {'runtime_class': 'patcher', 'changed_dimension': 3, 'source_box_sha256': '339c2bd0981f0070983da5a867fef9356a4a992df87739ff60b05a946df309fc', 'source_text_sha256': '484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393', 'saved_rect_sha256': 'd354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb', 'live_rect_sha256': '6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3'}, 'root/obj-4/obj-5': {'runtime_class': 'jsui', 'changed_dimension': 2, 'source_box_sha256': 'eb55b6bacadd9290ad4ee92a7d298d2145bb0c4107afc28a60405c9d40bfa247', 'source_text_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'saved_rect_sha256': 'fc417b56433ec311af6d252074e5992d7ba6210f706e1ae5fd1f9982d385996c', 'live_rect_sha256': '9feebcd05aba863038f477eeded7fe885e0634d3e796d765969fdd55cecc478c'}, 'root/obj-1': {'runtime_class': 'patcher', 'changed_dimension': 3, 'source_box_sha256': 'ae8f1b27f351f9a4adb1997619d3b70f80666212c66402864934e5c5b753ab6e', 'source_text_sha256': 'bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a', 'saved_rect_sha256': 'd9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86', 'live_rect_sha256': '1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926'}}
# Capture004 plus-only identities; measured vectors remain private.
PLUS_SOURCE = 'd1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895'
PLUS_EVIDENCE = {'ack_sha256': 'ed2fe5493d43ee8d00ee06cb76bd39bf5ddbbe00723e9b8ed62730ab66394cd6', 'config_sha256': 'cc06829fbbd1e0e89888152e0f2d4407df5a4e9a3817d7aa7e3a1a40e5ac74fb', 'seal_sha256': 'c3f37c41129eead48fc0f97597731d2c9e3ae3596746ee8d9551ee89d0426e5c', 'command_sha256': '7a53e382e6d67241fef6ac8e313f76986896991c789971b5f7c2d1b3cdf93261', 'manifest_sha256': '9b00b30ab36278e5e387bdac9deeb42364fdfa2948cf902be0a015488a04cd11', 'package_sha256': '22d237c6efd59c8aa87acad901da09028999e369d62c89deb1cc3fe646da177a', 'rea_evidence_id': 'ev_ebf222bc4a6c33847e6667ce57f8dffcf8eb185e38e981a0efbfee44492f47a1', 'audit_sha256': '925a70d2cda0811794b03eb8f59ff76127ccfed10c0c843b36f368550ba88c53'}
PLUS_GEOMETRY_PINS = {'root/obj-1': {'source_box_sha256': 'c4af8c73939eab75ed8940ff6b03159859ca0a782cd411601e0ea594db29d8e2', 'source_text_sha256': 'e86f190fbc376badcc5d7b14a552d4e84fad436e0789bb2c7cc221fa38bf9390', 'saved_rect_sha256': '7c282ca427b38aa6bf81f9155d70ce5720fd0f12f6ab4ef4da21f6441c947cd6', 'runtime_class': 'js', 'changed_dimension': 3, 'live_rect_sha256': 'da868357a7d43088775aeb0784d73cae93002d63fcabbd3ceddd53521cd20e84'}, 'root/obj-2': {'source_box_sha256': 'bbc5fe757f0ef027839d4a09709a97b50451ae9a5fec7d7f38aa810d53ce9f92', 'source_text_sha256': '484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393', 'saved_rect_sha256': 'd354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb', 'runtime_class': 'patcher', 'changed_dimension': 3, 'live_rect_sha256': '6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3'}, 'root/obj-2/obj-4': {'source_box_sha256': 'd9b8da7ef51019bd5837726c704eda09de39cffe89f08bd61e32811cde5acd0f', 'source_text_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'saved_rect_sha256': 'a421ba89c6cd1917427e84dbab006bf66255f8cf04f84b0b83de8c6c6b4646d2', 'runtime_class': 'jsui', 'changed_dimension': 2, 'live_rect_sha256': 'ef478f664cd641a901af80ccc3be0b0f9a1388d863a267d636bdb72fd1a5908a'}, 'root/obj-3': {'source_box_sha256': '310417ef44ee7139be2082fc5bbc63c5a65dfa5d10ab54894b29fe164b84c100', 'source_text_sha256': 'bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a', 'saved_rect_sha256': 'd9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86', 'runtime_class': 'patcher', 'changed_dimension': 3, 'live_rect_sha256': '1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926'}}
V8_REPRESENTATION_EVIDENCE = dict(
    raw_sha256='b3c8518d4d2930f2d18c3066e9ace27038f7893d4ae3644a6d002d99b56a71d6',
    ack_sha256='ae28ae272f4fe7743c121f5f8aacdc28026e29256bf9b4cdef31c0fa10ad08be',
    config_sha256='a406709cab7224f3d297baa14de204565407e4572eadd6c7c0c3d6166ef46fe5',
    seal_sha256='3ab64f6487e0a5f182acd9623728df66664e355472216fdad98545d9753cf5fa',
    manifest_sha256='357e4296de98f953faae2a17bded5a4df66fe5438ee3b4a23ea5ada00f41260c',
    rea_evidence_id='ev_de849ca377d9aa0cada5598c4443c3f57f501c23b073fa1430f610873112f8cd',
    audit_sha256='0102fdaea0e0ee5bcd2e77217b25aef4c467b53124d27bca3426759f5c9fe1b1')
NUMERIC_REPRESENTATION_PINS = {
    'root/obj-4/obj-1': dict(source_box_sha256='3c1b5b23cac75bca82bf1aa6c7c161ca91e8e050d41c2fed4549959291d45360',
        source_text_sha256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        saved_rect_sha256='be69f9cbfae7d8916a7697c10b45556c60dab2bf806f472f39a1f743c6b71562',
        initial_numeric_sha256='1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121'),
    'root/obj-4/obj-24': dict(source_box_sha256='d46ddd6aff2b7184bce9a8b1218416dcb47db543026c78a533139b289cb73b42',
        source_text_sha256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        saved_rect_sha256='3ae5be738626430c7205dcb01a2fba671d0f93a83677c43e9ba362422cdd0754',
        initial_numeric_sha256='1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121'),
    'root/obj-4/obj-23': dict(source_box_sha256='f122ac20a6bf9ecec78a24a73a0cbd911d938b441439337f9298ae4dfbcc853c',
        source_text_sha256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        saved_rect_sha256='6172628b9bf9e972a77a1773539e5ffe75c0b592876ec787c48026a2e90b89f2',
        initial_numeric_sha256='1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121')}
V8_ROOT_REPRESENTATION_PINS = {anchor: {key: value for key, value in TIMES_GEOMETRY_PINS[anchor].items()
    if key in {'source_box_sha256', 'source_text_sha256', 'saved_rect_sha256', 'live_rect_sha256'}}
    for anchor in ('root/obj-4', 'root/obj-1')}


PLUS_V8_NUMERIC_PINS = {'root/obj-2/obj-1': {'source_box_sha256': 'c873e45cc1ebc4c71b93a736b509fc0f622d4764df74edb3a21f5bad4d999a78', 'source_text_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'saved_rect_sha256': '97bd3d008866faa2c6cdc5bf0de64333c64bd29bf79bae29b6ae070ec6823267'}, 'root/obj-2/obj-24': {'source_box_sha256': 'd84cf4a6a5daa8db1d4b2616b5c1f94385a15d274a80be64ca07ddcb728d8cb3', 'source_text_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'saved_rect_sha256': '14acfb0d484e461a00397ecfb34329cfe8167d5e47b6360edbd54f0fabbd91bc'}, 'root/obj-2/obj-23': {'source_box_sha256': '5b0e92ade41a0633d5d5dc178c9fd1ebc519f7014d331e4a924afff0dfe07982', 'source_text_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'saved_rect_sha256': '38b2cd4242257c9f9802ef997eccb7d32e451c1b05f37868136baa42fb89636c'}}
PLUS_V8_NUMERIC_PINS = {anchor: dict(pin, initial_numeric_sha256=
    '1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121') for anchor, pin in PLUS_V8_NUMERIC_PINS.items()}
PLUS_V8_ROOT_PINS = {anchor: {key: value for key, value in PLUS_GEOMETRY_PINS[anchor].items()
    if key in {'source_box_sha256', 'source_text_sha256', 'saved_rect_sha256', 'live_rect_sha256'}}
    for anchor in ('root/obj-2', 'root/obj-3')}
PLUS_V8_PROJECTION_SHA256 = 'ba8d3d1ec23265bd75f16641fa95668466888d4033811fda95bcdef757da600f'
PLUS_V8_FORMAT_SHA256 = 'dcdadd560ab2234a2bf2d2b5ed44e5d7640e88eefe6bdbc98aa84aaf31649983'
PLUS_CONTROLLER_BINDING = '31e249de8a69dd317ae9b50f93bca88e3da8392edda68dd7b66865e6a0c98a89'
PLUS_V8_EVIDENCE = dict(
    raw_sha256='87459a07efa7a7f8d0bdcaba10148f138369d080104324e520cc7fb1aaf1fd71',
    install_ack_sha256='ba39c2e9b59c9983d938cb8e500f05aef3b82af830558548e50ef97d31df1a82',
    readback_ack_sha256='1c4dcdb18ed66194264e9fbfe914664c636ab066375636647cb4d3038fb62f01',
    command_sha256='be98938644e0ee42eabb329709effcc5ce40d32c6007ee4e139f6856ce7eab28',
    config_sha256='eb44b4930d0bb2504f9739367dad7b144c12b1baada9ac8d37f8bde127ae550b',
    seal_sha256='cedafaa9aa57b066b7fa19b95580c08b884ef2267bec42c6143429bbd41a9641',
    manifest_sha256='73b623f8893e5758f8f74cbc4c41f599e291c12cb9d3a662c572d55fcc40bc7f',
    historical_binding_sha256='97a59c54d9185b47c417c876b12ac8b8ebc4734bb80ad7b439e6e5790aaf991b',
    historical_files_sha256='f01f727c2f17b10175de23da47a536e6a10f19d609bb7d0e92add241811fedac',
    package_sha256='121d5aa5e3056337306bbe2d7a2771221f53e7adb9750572d934d20ac8a8c978',
    controller_sha256='da4473ac8014f39fd255b830121508738c16980b6e303fb0a9b8c963ce0f13a8',
    reader_sha256='7d857163d254c82ecbc02b6cd3ff43be1fdf9f67ed09ddf6eb554a7d87c175fa',
    trace_sha256='bc0e23dc19b130b4bcfe09777a74e56a48f62a9d39860cae7fdc8d3e1a837185',
    audit_sha256='2e96fed0d6acd58fff7b033a17294c1ccc54e15a56590862a142fe723eac704e',
    investigation_sha256='dacc776b2429cab7f76f44a589a131cc3b89dd624afbc25c2c85b98116a62d12',
    rea_evidence_id='ev_c19e98841d00f4654a6c405a8d80067f1d966cf11a11106234b93a05a70c13a5',
    observation_role='failed-install-readback-diagnostics', observed_revision=1, observed_request_id=52,
    observed_operation_request_id=51, raw_success=False, raw_error_code='numeric-readback-refused', observed_strict_mismatch=True)
PLUS_CONTROLLER_EVIDENCE = dict(
    trace_sha256='2b3287e45de1123f8ac7582544aa13da5dbfba6650d2aa33e7a46b5f8be39a63',
    trace_role='incomplete-install-prefix', observed_revision=1,
    config_sha256='4a922bf0b1e2d2c5755eb339d0fa8e73a4139f74c5acc3b92352388e85a167ad',
    seal_sha256='3e5b31cdcb62618e08444d35c2ec20815cf07a21aad86de4d058ca6a94170935',
    manifest_sha256='c4fc2bf8badc5cfc98b85d2b1bc8dad9cd7df42f730665521080631ecefad898',
    controller_sha256='c0b0a45ef7a72a484fa976774f5a10e1ca9fcf6892603f723fb7df6c220a3d97',
    historical_binding_sha256='bce1edf4484c73bf95a5c1c1648ff7e7f8f3ce479fe96c92be6639fa6e466df6',
    package_sha256='b140eddbac9d134e162ff4cfdf2388be1285cf45b9127bd8bcc0d253ff0e99e5',
    audit_sha256='9ded6e777503d6181120dc92c3f4745ec4eb565e5a6f29e9bd52c38755870e8d',
    investigation_sha256='7b555ff81a58e426185fb9fca93b23216e18cf0205a8a923b3ca70c892e3e54b',
    verification_sha256='081856c4f782f6c1603d998e6637c2355c84585635c7a3deca980e1b1cce2bfc',
    rea_evidence_id='ev_a0ed6947bdad1fbe7e7ba19b62634a570fdff7803e7db65363b019dd0db409c8')

PLUS_BOX_FIELDS = frozenset(('id', 'anchor', 'maxclass', 'runtime_class', 'runtime_classes', 'rect', 'inlets', 'outlets',
    'authored_text', 'authored_empty', 'initial_numeric', 'role', 'source_box_sha256', 'source_text_sha256'))
PLUS_FULL_FIELDS = frozenset(('anchor', 'maxclass', 'runtime_class', 'runtime_classes', 'rect', 'child', 'source_varname',
    'inlets', 'outlets', 'authored_text', 'authored_empty', 'source_box_sha256', 'source_text_sha256',
    'saved_incoming_routes', 'saved_outgoing_routes'))


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
    _require(len(owners) == 6, 'owner count')
    documents = _list(config.get('documents'))
    definitions = {}
    for definition in documents:
        _require(type(definition) is dict, 'definition')
        key = (definition.get('document'), _int(definition.get('revision'), 1, 2))
        _require(key not in definitions, 'duplicate definition')
        definitions[key] = definition
    _require(set(definitions) == set((('times', 1), ('times', 2), ('plus', 1), ('plus', 2), ('minus', 1), ('minus', 2))), 'definitions')
    if any(definitions[document, 1].get('source_sha256') == source for document, source in ROOT_SOURCES.items()):
        helpers = _list(config.get('helpers'))
        _require(len(helpers) == 4 and all(type(h) is dict for h in helpers) and
                 _same({h.get('name'): h.get('sha256') for h in helpers}, ROOT_HELPERS),
                 'fixed root helpers')
    _require(all(definition.get('source_sha256') == ROOT_SOURCES[document]
                 for (document, revision), definition in definitions.items()), 'fixed arithmetic source identities')
    channels = set()
    for inlet, (owner, identity) in enumerate(zip(owners, (('times', 1), ('times', 2), ('plus', 1), ('plus', 2), ('minus', 1), ('minus', 2)))):
        _keys(owner, ('document', 'revision', 'source_sha256', 'working_path', 'channel', 'inlet', 'root_proof_path'))
        _require((owner['document'], _int(owner['revision'], 1, 2)) == identity and
                 _int(owner['inlet'], 0, 5) == inlet, 'owner map')
        definition = definitions[identity]
        _require(_int(definition.get('lifecycle_owner_inlet'), 0, 5) == inlet and
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
    expected_classes = {'__alive_arithmetic_controller': 'js', OBSERVER: 'v8'}
    expected_classes.update({'__alive_arithmetic_lifecycle_receive_' + str(i): 'receive' for i in range(6)})
    _require(len(inventory) == 8, 'driver construction count')
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
    _require(_int(proof['declared_inlets']) == 7 and _int(proof['declared_outlets']) == 0, 'observer declarations')
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
    _routes(proof, [_edge('__alive_arithmetic_lifecycle_receive_' + str(i), OBSERVER, i + 1) for i in range(6)])


def _geometry_vector_digest(value):
    _rect(value)
    return _digest(_canonical([int(v) if v == math.trunc(v) else v for v in value]))


def _same_geometry_fields(actual, expected, fields):
    # Coordinates compare numerically; identity and count fields retain exact JSON types.
    normalized = dict(actual)
    for field in fields:
        _rect(actual.get(field)); _rect(expected[field])
        if actual[field] != expected[field]:
            return False
        normalized[field] = expected[field]
    return _same(normalized, expected)


def _observed_geometry(owner, definition, original):
    policy = original.get('observed_geometry_policy')
    if policy is None: return None
    plus = definition['document'] == 'plus'
    name, source, pins, evidence = ('plus', PLUS_SOURCE, PLUS_GEOMETRY_PINS, PLUS_EVIDENCE) if plus else ('times', GEOMETRY_SOURCE, TIMES_GEOMETRY_PINS, GEOMETRY_EVIDENCE)
    pin = pins.get(original['anchor'])
    _require(pin is not None and owner['document'] == definition['document'] == name and
             owner['source_sha256'] == definition['source_sha256'] == source and
             _same(definition.get('helper_sha256'), ROOT_HELPERS) and type(policy) is dict,
             'observed geometry source or helper binding')
    expected = dict(kind=name + '-observed-geometry-v1', document=name, source_sha256=source,
        anchor=original['anchor'], runtime_class=pin['runtime_class'], changed_dimension=pin['changed_dimension'],
        source_box_sha256=pin['source_box_sha256'], source_text_sha256=pin['source_text_sha256'],
        saved_rect=original['rect'], live_rect=policy.get('live_rect'), saved_rect_sha256=pin['saved_rect_sha256'],
        live_rect_sha256=pin['live_rect_sha256'], helper_sha256=ROOT_HELPERS, evidence=evidence,
        saved_incoming_routes=0, saved_outgoing_routes=0)
    _rect(original['rect']); _rect(policy.get('live_rect'))
    _require(_same_geometry_fields(policy, expected, ('saved_rect', 'live_rect')) and original.get('runtime_class') == pin['runtime_class'] and
             (not plus or original.get('maxclass') == ('jsui' if pin['runtime_class'] == 'jsui' else 'newobj')) and
             original.get('source_box_sha256') == pin['source_box_sha256'] and
             original.get('source_text_sha256') == pin['source_text_sha256'] and
             original.get('saved_incoming_routes') == original.get('saved_outgoing_routes') == 0 and
             _geometry_vector_digest(original['rect']) == pin['saved_rect_sha256'] and
             _geometry_vector_digest(policy['live_rect']) == pin['live_rect_sha256'] and
             [index for index, pair in enumerate(zip(original['rect'], policy['live_rect'])) if pair[0] != pair[1]] == [pin['changed_dimension']],
             'exact observed geometry vector or source box binding')
    return policy


def _source_normalized(value):
    if type(value) is dict:
        return {key: _source_normalized(item) for key, item in value.items()}
    if type(value) is list:
        return [_source_normalized(item) for item in value]
    if type(value) is float:
        _require(math.isfinite(value), 'finite source projection')
        return int(value) if value == math.trunc(value) else value
    return value


def _plus_controller_policy(box):
    pin = PLUS_V8_NUMERIC_PINS[box['anchor']]
    expected = dict(kind='plus-controller-numeric-cohort-v1', engine='js-controller', document='plus',
        source_sha256=PLUS_SOURCE, anchor=box['anchor'], source_class='flonum', runtime_class='number',
        cohort_anchors=list(PLUS_V8_NUMERIC_PINS), cohort_binding_sha256=PLUS_CONTROLLER_BINDING,
        **pin, helper_sha256=ROOT_HELPERS, evidence=PLUS_CONTROLLER_EVIDENCE,
        format_method='getattr', format_attribute='format', format_representation='scalar-number',
        format_value_sha256=PLUS_V8_FORMAT_SHA256, getter_method='getvalueof', getter_representation='singleton-number-array',
        finite_required=True, source_initial_equality=True, fresh_complete_cohort_required=True)
    _require(_same(box.get('plus_controller_numeric_cohort_policy'), expected), 'exact plus controller cohort policy')


def _plus_source_projection(owner, definition):
    """Validate identities before numeric canonicalization can erase their JSON types."""
    _require(definition.get('document') == owner['document'] == 'plus' and
        definition.get('source_sha256') == owner['source_sha256'] == PLUS_SOURCE and
        _same(definition.get('helper_sha256'), ROOT_HELPERS) and
        definition.get('basic_anchor') == 'root/obj-2' and definition.get('basic_varname') == 'basic_tab',
        'plus pristine source binding')
    views = {}
    for view, fields in (('boxes', PLUS_BOX_FIELDS), ('full_inventory', PLUS_FULL_FIELDS)):
        entries = _list(definition.get(view)); projected = []
        _require(len(entries) == (16 if view == 'boxes' else 20), 'plus complete source view')
        anchors = set()
        for box in entries:
            _require(type(box) is dict, 'plus source descriptor')
            anchor = _text(box.get('anchor'))
            _require(anchor not in anchors, 'plus unique source descriptor'); anchors.add(anchor)
            allowed = set(fields)
            if anchor in PLUS_GEOMETRY_PINS:
                allowed.add('observed_geometry_policy')
                if view == 'boxes': allowed.update(('saved_incoming_routes', 'saved_outgoing_routes'))
                _require('observed_geometry_policy' in box, 'plus retained geometry policy')
                _observed_geometry(owner, definition, box)
            if anchor in PLUS_V8_NUMERIC_PINS:
                allowed.update(('plus_controller_numeric_cohort_policy', 'v8_numeric_representation_policy'))
                if view == 'full_inventory': allowed.add('initial_numeric')
                _plus_controller_policy(box)
                _v8_representation_policy(owner, definition, box, True)
            if view == 'full_inventory' and anchor in PLUS_V8_ROOT_PINS:
                allowed.add('v8_root_representation_policy')
                _v8_representation_policy(owner, definition, box, False)
            _keys(box, fields, allowed - fields)
            _int(box['inlets']); _int(box['outlets']); _rect(box['rect'])
            _require(type(box['authored_empty']) is bool, 'plus source empty type')
            for field in ('saved_incoming_routes', 'saved_outgoing_routes'):
                if field in box: _int(box[field])
            if view == 'boxes':
                _require(anchor == 'root/obj-2/' + _text(box['id']), 'plus source anchor id')
                initial = box['initial_numeric']
                _require(initial is None or type(initial) in (int, float) and math.isfinite(initial), 'plus source scalar')
            else:
                _require(type(box['child']) is bool, 'plus source child type')
            projected.append({field: box[field] for field in fields})
        views[view] = projected
    boxes = definition['boxes']
    by_id = {box['id']:box for box in boxes}; by_anchor = {box['anchor']:box for box in boxes}
    edges = _list(definition.get('saved_edges')); leaves = _list(definition.get('observer_leaves'))
    _require(len(edges) == 8 and len(leaves) == 19, 'plus complete source graph')
    for index, edge in enumerate(edges):
        _keys(edge, ('index', 'source', 'destination'))
        _require(_int(edge['index']) == index, 'plus source edge index')
        for side in ('source', 'destination'):
            endpoint = _list(edge[side])
            _require(len(endpoint) == 2, 'plus source endpoint shape')
            identity = _text(endpoint[0]); port = _int(endpoint[1])
            _require(identity in by_id and port < by_id[identity]['outlets' if side == 'source' else 'inlets'],
                'plus source endpoint identity or bounds')
    for leaf in leaves:
        _keys(leaf, ('anchor', 'port', 'varname'))
        anchor = _text(leaf['anchor']); _text(leaf['varname']); port = _int(leaf['port'])
        _require(anchor in by_anchor and port < by_anchor[anchor]['outlets'], 'plus source leaf identity or bounds')
    expected_leaves = [dict(anchor=b['anchor'], port=port,
        varname='__alive_help_leaf_' + b['id'].replace('-', '_') + '_' + str(port))
        for b in boxes for port in range(b['outlets'])]
    _require(_same(leaves, expected_leaves), 'plus complete ordered source leaves')
    projection = dict(document='plus', source_sha256=PLUS_SOURCE, helper_sha256=ROOT_HELPERS,
        basic_anchor='root/obj-2', basic_varname='basic_tab', **views, saved_edges=edges, observer_leaves=leaves)
    _require(_digest(_canonical(_source_normalized(projection))) == PLUS_V8_PROJECTION_SHA256, 'plus pristine projection digest')
    for box in boxes:
        corresponding = [entry for entry in definition['full_inventory'] if entry['anchor'] == box['anchor']]
        _require(len(corresponding) == 1, 'plus corresponding source descriptor')
        entry = corresponding[0]
        for field in PLUS_BOX_FIELDS & PLUS_FULL_FIELDS:
            _require(_same(_source_normalized(box[field]), _source_normalized(entry[field])), 'plus source view correspondence')
        if box['anchor'] in PLUS_V8_NUMERIC_PINS:
            initial = entry.get('initial_numeric')
            _require(type(initial) in (int, float) and math.isfinite(initial) and initial == box['initial_numeric'] and
                _same(entry.get('v8_numeric_representation_policy'), box['v8_numeric_representation_policy']),
                'plus source initial value or policy copy')


def _v8_representation_policy(owner, definition, box, numeric):
    plus = definition['document'] == 'plus'
    name, source, evidence = ('plus', PLUS_SOURCE, PLUS_V8_EVIDENCE) if plus else ('times', GEOMETRY_SOURCE, V8_REPRESENTATION_EVIDENCE)
    numeric_pins = PLUS_V8_NUMERIC_PINS if plus else NUMERIC_REPRESENTATION_PINS
    root_pins = PLUS_V8_ROOT_PINS if plus else V8_ROOT_REPRESENTATION_PINS
    pin = (numeric_pins if numeric else root_pins).get(box['anchor'])
    policy = box.get('v8_numeric_representation_policy' if numeric else 'v8_root_representation_policy')
    _require(pin is not None and type(policy) is dict and owner['document'] == definition['document'] == name
             and owner['source_sha256'] == definition['source_sha256'] == source
             and _int(definition.get('revision'), 1, 2) == owner['revision']
             and _same(definition.get('helper_sha256'), ROOT_HELPERS), 'V8 source or helper binding')
    _require(box.get('maxclass') == ('flonum' if numeric else 'newobj') and
             box.get('runtime_class') == ('flonum' if numeric else 'patcher') and
             _same(box.get('runtime_classes'), ['flonum'] if numeric else ['patcher', 'p']) and
             box.get('source_box_sha256') == pin['source_box_sha256'] and
             box.get('source_text_sha256') == pin['source_text_sha256'] and
             _geometry_vector_digest(box.get('rect')) == pin['saved_rect_sha256'], 'V8 source box binding')
    expected = dict(kind=name + '-v8-' + ('numeric' if numeric else 'root') + '-representation-v1', engine='v8',
        document=name, source_sha256=source, anchor=box['anchor'],
        source_class='flonum' if numeric else 'newobj', runtime_class='number' if numeric else 'jpatcher',
        **pin, helper_sha256=ROOT_HELPERS, evidence=evidence)
    if numeric:
        initial = box.get('initial_numeric')
        _require(type(initial) in (int, float) and math.isfinite(initial) and
                 _geometry_vector_digest([initial, 0, 0, 0]) == pin['initial_numeric_sha256'], 'V8 source default binding')
        expected.update(format_method='getattr', format_attribute='format', format_representation='scalar-number',
            format_value=6, getter_method='getvalueof', getter_representation='scalar-number',
            finite_required=True, initial_equality_action='install')
        if plus:
            expected.pop('format_value')
            expected['format_value_sha256'] = PLUS_V8_FORMAT_SHA256
    else:
        _require(box.get('source_varname') == ('basic_tab' if box['anchor'] == ('root/obj-2' if plus else 'root/obj-4') else 'q_tab') and
                 _int(box.get('saved_incoming_routes'), 0, 0) == _int(box.get('saved_outgoing_routes'), 0, 0) == 0 and
                 _geometry_vector_digest(policy.get('live_rect')) == pin['live_rect_sha256'], 'V8 measured root binding')
        expected.update(source_runtime_class='patcher', saved_rect=box['rect'], live_rect=policy['live_rect'],
            source_varname=box['source_varname'], saved_incoming_routes=0, saved_outgoing_routes=0)
    _require(_same_geometry_fields(policy, expected, () if numeric else ('saved_rect', 'live_rect')),
             'exact V8 representation policy')
    return policy


def _v8_representation_witnesses(proof, owner, definition, request, step):
    plus = definition['document'] == 'plus'
    if plus: _plus_source_projection(owner, definition)
    name, source, evidence = ('plus', PLUS_SOURCE, PLUS_V8_EVIDENCE) if plus else ('times', GEOMETRY_SOURCE, V8_REPRESENTATION_EVIDENCE)
    numeric_pins = PLUS_V8_NUMERIC_PINS if plus else NUMERIC_REPRESENTATION_PINS
    root_pins = PLUS_V8_ROOT_PINS if plus else V8_ROOT_REPRESENTATION_PINS
    boxes = _list(definition.get('boxes'))
    inventory = _list(definition.get('full_inventory'))
    _require(all(type(box) is dict for box in boxes + inventory), 'V8 source inventory')
    numeric = [box for box in boxes if 'v8_numeric_representation_policy' in box]
    roots = [box for box in inventory if 'v8_root_representation_policy' in box]
    if not numeric and not roots:
        _require('v8_representation_witnesses' not in proof, 'unadmitted V8 witnesses')
        return {}
    witness = proof.get('v8_representation_witnesses')
    _require(len(numeric) == 3 and len(roots) == 2 and type(witness) is dict and
             Counter(_text(box.get('anchor')) for box in numeric) == Counter(numeric_pins.keys()) and
             Counter(_text(box.get('anchor')) for box in roots) == Counter(root_pins.keys()),
             'exact five V8 policies and witnesses')
    for selected, numeric_kind in ((numeric, True), (roots, False)):
        for box in selected:
            _v8_representation_policy(owner, definition, box, numeric_kind)
    revision = owner['revision']
    _require(_int(definition.get('lifecycle_owner_inlet'), 0, 5) == revision + (1 if plus else -1) and
             _int(owner.get('inlet'), 0, 5) == definition['lifecycle_owner_inlet'] and step == 'close-' + name + '-r' + str(revision),
             'V8 closing owner')
    def coverage(count):
        return dict(complete=True, status='complete', observed_count=count, complete_count=count, limit=count)
    expected = dict(version=name + '-v8-representation-witnesses-v1', engine='v8', request_id=request,
        operation_request_id=request, step_id=step, action='close', action_document=name, action_revision=revision,
        document=name, revision=revision, source_sha256=source, helper_sha256=ROOT_HELPERS,
        working_path=owner['working_path'], root_is_top_level=True, receipt_tag_observed=False,
        evidence=evidence, inventory_coverage=dict(root=coverage(8),
            numeric=coverage(len(boxes) + len(_list(definition.get('observer_leaves'))))),
        numeric=witness.get('numeric'), roots=witness.get('roots'))
    _require(_same(witness, expected), 'V8 witness source request evidence or inventory binding')
    result = {}
    for field, selected, numeric_kind in (('numeric', numeric, True), ('roots', roots, False)):
        entries = _list(witness[field])
        expected_boxes = {box['anchor']: box for box in selected}
        _require(all(type(row) is dict for row in entries) and len(entries) == len(expected_boxes) and
                 Counter(_text(row.get('anchor')) for row in entries) == Counter(expected_boxes.keys()),
                 'V8 witness multiplicity')
        for row in entries:
            box = expected_boxes[row['anchor']]
            expected_row = dict(anchor=box['anchor'], source_box_sha256=box['source_box_sha256'],
                source_text_sha256=box['source_text_sha256'], source_class='flonum' if numeric_kind else 'newobj',
                actual_runtime_class='number' if numeric_kind else 'jpatcher',
                live_rect=box['rect'] if numeric_kind else box['v8_root_representation_policy']['live_rect'],
                candidate_count=1, candidate_count_complete=True)
            if numeric_kind:
                observation = row.get('value_observation')
                _require(type(observation) is dict and type(observation.get('value')) in (int, float) and
                         math.isfinite(observation['value']), 'finite V8 close getter')
                expected_row.update(geometry_matches=True, receipt_tag_observed=False,
                    format_observation=dict(method='getattr', attribute='format', status='returned', representation='scalar-number', value=6),
                    value_observation=dict(method='getvalueof', status='returned', representation='scalar-number', value=observation['value']))
                if plus:
                    format_observation = row.get('format_observation')
                    _require(type(format_observation) is dict, 'plus finite format observation')
                    value = format_observation.get('value')
                    _require(type(value) in (int, float) and math.isfinite(value) and
                        _geometry_vector_digest([value, 0, 0, 0]) == PLUS_V8_FORMAT_SHA256, 'plus format scalar pin')
                    expected_row['format_observation']['value'] = value
            else:
                expected_row['varname'] = box['source_varname']
            _require(_same_geometry_fields(row, expected_row, ('live_rect',)), 'exact V8 live witness')
            result[box['anchor']] = row
    return result


def _basic_retention(proof, owner, definition, request, step, witnesses):
    _keys(proof, ('version', 'request_id', 'operation_request_id', 'step_id', 'action', 'document', 'revision',
                  'source_sha256', 'working_path', 'basic_varname', 'boxes', 'input_routes', 'output_routes'))
    _require(definition.get('document') == owner['document'] and
             _int(definition.get('revision'), 1, 2) == owner['revision'] and
             definition.get('source_sha256') == owner['source_sha256'] == ROOT_SOURCES[owner['document']] and
             definition.get('working_windows_path') == owner['working_path'] and
             _same(definition.get('helper_sha256'), ROOT_HELPERS), 'Basic source owner binding')
    basic_name = _text(definition.get('basic_varname'))
    basic_anchor = _text(definition.get('basic_anchor'))
    expected = dict(version='arithmetic-basic-retention-v1', request_id=request, operation_request_id=request,
        step_id=step, action='close', document=owner['document'], revision=owner['revision'],
        source_sha256=owner['source_sha256'], working_path=owner['working_path'], basic_varname=basic_name,
        boxes=proof['boxes'], input_routes=proof['input_routes'], output_routes=proof['output_routes'])
    _require(_same(proof, expected), 'Basic request owner path or name binding')
    inventory = _list(definition.get('full_inventory'))
    containers = [box for box in inventory if box.get('anchor') == basic_anchor]
    _require(basic_anchor.count('/') == 1 and len(containers) == 1 and
             containers[0].get('source_varname') == basic_name and containers[0].get('runtime_class') == 'patcher',
             'Basic outer container binding')
    source_boxes = _list(definition.get('boxes'))
    _require(source_boxes and all(type(box) is dict for box in source_boxes), 'Basic source inventory')
    originals, by_name, by_anchor, leaves = {}, {}, {}, []
    for box in source_boxes:
        identity = _text(box.get('id')); anchor = _text(box.get('anchor'))
        name = '__alive_help_' + identity.replace('-', '_')
        _require(identity not in originals and name not in by_name and anchor not in by_anchor and
                 anchor == basic_anchor + '/' + identity, 'Basic source identity')
        _text(box.get('maxclass')); _text(box.get('runtime_class'))
        classes = _list(box.get('runtime_classes'))
        _require(classes and classes[0] == box['runtime_class'] and all(type(value) is str and value for value in classes),
                 'Basic source class descriptor')
        _require(box['maxclass'] != 'message' and not any(key in box for key in
            ('shell_height_policy', 'annotation_geometry_policy', 'numeric_mode_policy', 'annotation_width_policy', 'observer_policy')),
            'unadmitted Basic capability or policy')
        text = _text(box.get('authored_text'), empty=True)
        _require(type(box.get('authored_empty')) is bool and box['authored_empty'] is (not bool(text)) and
                 _sha(box.get('source_text_sha256')) == _digest(text.encode('utf-8')), 'Basic source text or empty binding')
        _sha(box.get('source_box_sha256'))
        _int(box.get('inlets')); outlets = _int(box.get('outlets'))
        for field in ('saved_incoming_routes', 'saved_outgoing_routes'):
            if field in box: _int(box[field])
        _rect(box.get('rect'))
        entries = [entry for entry in inventory if entry.get('anchor') == anchor]
        keys = ('maxclass', 'runtime_class', 'runtime_classes', 'source_box_sha256', 'source_text_sha256',
                'inlets', 'outlets', 'authored_text', 'authored_empty')
        _require(len(entries) == 1, 'Basic source descriptor inventory')
        _rect(entries[0].get('rect'))
        _require(entries[0]['rect'] == box['rect'] and
                 all(_same(entries[0].get(key), box.get(key)) for key in keys), 'Basic source descriptor integrity')
        originals[identity] = box; by_name[name] = box; by_anchor[anchor] = box
        leaves.extend(dict(varname='__alive_help_leaf_' + identity.replace('-', '_') + '_' + str(port), anchor=anchor, port=port)
            for port in range(outlets))
    direct = [entry for entry in inventory if type(entry.get('anchor')) is str and
        entry['anchor'].startswith(basic_anchor + '/') and entry['anchor'].count('/') == basic_anchor.count('/') + 1]
    _require(len(direct) == len(source_boxes) and Counter(entry['anchor'] for entry in direct) == Counter(by_anchor.keys()),
             'complete Basic source descriptors')
    _require(_same(definition.get('observer_leaves'), leaves), 'Basic observer source definition')
    expected_names = set(by_name) | {leaf['varname'] for leaf in leaves}
    _require(len(expected_names) == len(source_boxes) + len(leaves), 'Basic original observer identity collision')
    actual = {}
    for box in _list(proof['boxes']):
        _keys(box, ('varname', 'maxclass', 'rect'))
        name = _text(box['varname']); _text(box['maxclass']); _rect(box['rect'])
        _require(name not in actual and name in expected_names, 'Basic actual identity')
        actual[name] = box
    _require(set(actual) == expected_names, 'complete Basic original observer inventory')
    for name, source in by_name.items():
        live = actual[name]; witness = witnesses.get(source['anchor'])
        _require(live['maxclass'] == (witness['actual_runtime_class'] if witness else source['runtime_class']),
                 'exact Basic original class')
        policy = _observed_geometry(owner, definition, source)
        _require(live['rect'] == source['rect'] or policy is not None and live['rect'] == policy['live_rect'],
                 'exact Basic original geometry')
    for leaf in leaves:
        _require(actual[leaf['varname']]['maxclass'] == 'js', 'Basic observer leaf class')
    expected_routes = Counter()
    for route in _list(definition.get('saved_edges')):
        _require(type(route) is dict, 'Basic source route')
        source, destination = route.get('source'), route.get('destination')
        _require(type(source) is list and len(source) == 2 and type(destination) is list and len(destination) == 2,
                 'Basic source endpoint')
        source_id, destination_id = _text(source[0]), _text(destination[0])
        _require(source_id in originals and destination_id in originals, 'Basic source endpoint identity')
        source_port, destination_port = _int(source[1]), _int(destination[1])
        _require(source_port < originals[source_id]['outlets'] and destination_port < originals[destination_id]['inlets'],
                 'Basic source port bounds')
        source_name = '__alive_help_' + source_id.replace('-', '_')
        destination_name = '__alive_help_' + destination_id.replace('-', '_')
        expected_routes[source_name, source_port, destination_name, destination_port] += 1
    for leaf in leaves:
        source = by_anchor[leaf['anchor']]
        expected_routes['__alive_help_' + source['id'].replace('-', '_'), leaf['port'], leaf['varname'], 0] += 1
    for field in ('input_routes', 'output_routes'):
        observed = Counter()
        for route in _list(proof[field]):
            _keys(route, ('source', 'destination'))
            key = []
            for side in ('source', 'destination'):
                endpoint = route[side]; _keys(endpoint, ('varname', 'port'))
                name, port = _text(endpoint['varname']), _int(endpoint['port'])
                _require(name in expected_names, 'Basic runtime endpoint identity')
                if name in by_name:
                    bound = by_name[name]['outlets' if side == 'source' else 'inlets']
                    _require(port < bound, 'Basic runtime source port bounds')
                key.extend((name, port))
            observed[tuple(key)] += 1
        _require(observed == expected_routes, 'Basic duplicate-sensitive endpoint multiset')


def _root(proof, owner, definition, request, step):
    _keys(proof, ('version', 'request_id', 'step_id', 'document', 'revision', 'source_sha256',
                  'working_path', 'root_is_top_level', 'originals', 'harness', 'input_routes', 'output_routes', 'basic_retention'),
          ('v8_representation_witnesses',))
    _require(proof['version'] == VERSION and _int(proof['request_id'], 1) == request and
             proof['step_id'] == step and proof['document'] == owner['document'] and
             _int(proof['revision'], 1, 2) == owner['revision'] and proof['source_sha256'] == owner['source_sha256']
             and proof['working_path'] == owner['working_path'] and proof['root_is_top_level'] is True, 'root binding')
    witnesses = _v8_representation_witnesses(proof, owner, definition, request, step)
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
        _require(not any(key in definition_box for key in ('shell_height_policy', 'annotation_geometry_policy',
                     'numeric_mode_policy', 'annotation_width_policy', 'observer_policy')), 'unadmitted arithmetic policy')
        witness = witnesses.get(anchor)
        _require((box['maxclass'] == witness['actual_runtime_class'] if witness else box['maxclass'] in classes)
                 and box['varname'] == (definition_box.get('source_varname') or ''),
                 'root original class or name')
        _rect(box['rect'])
        policy = _observed_geometry(owner, definition, definition_box)
        _require(box['rect'] == witness['live_rect'] if witness else
                 box['rect'] == definition_box['rect'] or policy is not None and box['rect'] == policy['live_rect'],
                 'exact arithmetic root geometry')
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
    _basic_retention(proof['basic_retention'], owner, definition, request, step, witnesses)


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
    states = [dict(inlet=i, state='monitoring', request_id=0, step_id='', witness_count=0) for i in range(6)]
    active = None
    returned = set()
    used_requests = set()
    latest_request = 0
    for sequence, event, row in combined:
        channel = _int(row['inlet'], -1, 5)
        kind = row['payload_kind'] if event else row['kind']
        if not event and kind == 'barrier':
            _require(barrier and sequence == len(combined) and channel == -1 and active is None and
                     row['request_id'] == request and row['request_id'] > latest_request and
                     row['step_id'] == 'capture-complete', 'final barrier transition')
            continue
        _require(channel >= 0, 'scored owner inlet')
        state = states[channel]
        if not event and kind == 'arm':
            _require(active is None and state['state'] == 'monitoring' and
                     row['request_id'] not in used_requests and row['request_id'] > latest_request and
                     row['step_id'] == 'close-' + lifecycle['owners'][channel]['document'] + '-r' + str(lifecycle['owners'][channel]['revision']), 'fresh arm')
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
    _require(len(observed_states) == 6, 'observer state count')
    for index, state in enumerate(observed_states):
        _keys(state, ('inlet', 'state', 'request_id', 'step_id', 'witness_count'))
        _require(_int(state['inlet'], 0, 5) == index, 'ordered owner states')
        _int(state['request_id'])
        _int(state['witness_count'], 0, 1)
        _text(state['step_id'], empty=True)
    _require(_same(observed_states, states) and active is None, 'derived observer states')
    last = combined[-1]
    if barrier:
        _require(not last[1] and last[2]['kind'] == 'barrier' and
                 all(state['state'] == 'closed' and state['witness_count'] == 1 for state in states),
                 'final owner lifetime set')
    else:
        _require(not last[1] and last[2]['kind'] == 'close-validated' and last[2]['inlet'] == inlet and
                 last[2]['request_id'] == request and last[2]['step_id'] == step, 'final close boundary')


def _verify_close(work, lifecycle, definitions, helper_sha, command, ack, retained_root=None):
    """Verify a close conjunction without creating or replacing retained evidence."""
    _keys(command, ('command_id', 'op', 'step_id', 'action', 'document', 'action_revision', 'source_sha256'))
    request = _int(command['command_id'], 1)
    revision = _int(command['action_revision'], 1, 2)
    _require(command['op'] == 'operation' and command['action'] == 'close' and
             command['document'] in ROOT_SOURCES and command['step_id'] == 'close-' + command['document'] + '-r' + str(revision),
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
        command = dict(command_id=request, op='operation', step_id='close-' + owner['document'] + '-r' + str(owner['revision']),
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
    _require(type(expected_live) is dict and expected_live == {}, 'expected live owners')
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
