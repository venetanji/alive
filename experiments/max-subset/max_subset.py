"""Bounded, non-executing .maxpat inventory. Python 3.10+, standard library only."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import sys

MAX_BYTES = 2 * 1024 * 1024
MAX_DEPTH = 32
MAX_NODES = 100_000
MAX_BOXES = 4096
MAX_LINES = 16384
MAX_PORTS = 256
MAX_TEXT = 65536
PROFILE = 'max-subset-inventory-v1'


def load_catalog():
    return json.loads(Path(__file__).with_name('catalog.json').read_text(encoding='utf-8'))


def _nonnegative(value, maximum=MAX_PORTS):
    return type(value) is int and 0 <= value <= maximum


def _unsafe_path(value):
    # Never resolve these names. Reject absolute, traversal, URI and drive paths.
    return (not isinstance(value, str) or '\x00' in value or
            value.startswith(('/', '\\', '~')) or ':' in value or
            '..' in value.replace('\\', '/').split('/'))


def _pairs(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise ValueError('Duplicate JSON key: ' + key)
        obj[key] = value
    return obj


def _decode(raw):
    text = raw.decode('utf-8')
    # Bound parser recursion BEFORE json.loads; braces inside strings do not count.
    depth, quoted, escaped = 0, False, False
    for char in text:
        if quoted:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == '"':
                quoted = False
        elif char == '"':
            quoted = True
        elif char in '[{':
            depth += 1
            if depth > MAX_DEPTH:
                raise ValueError('JSON nesting exceeds limit')
        elif char in ']}':
            depth -= 1
    def reject_constant(value):
        raise ValueError('Non-finite JSON number: ' + value)
    data = json.loads(text, object_pairs_hook=_pairs, parse_constant=reject_constant)
    stack, count = [data], 0
    while stack:
        value = stack.pop()
        count += 1
        if count > MAX_NODES:
            raise ValueError('JSON node count exceeds limit')
        if isinstance(value, dict):
            stack.extend(value.keys())
            stack.extend(value.values())
        elif isinstance(value, list):
            stack.extend(value)
        elif isinstance(value, float) and not math.isfinite(value):
            raise ValueError('Non-finite JSON number')
        elif isinstance(value, str):
            if len(value) > MAX_TEXT:
                raise ValueError('JSON string exceeds limit')
            # Lone surrogate escapes are not valid UTF-8 source strings.
            value.encode('utf-8')
    return text, data


def import_bytes(raw):
    """Return inventory or structured rejection. accepted means structurally inventoried ONLY."""
    result = {'profile': PROFILE, 'accepted': False, 'executable': False,
              'evidence_status': 'UNVERIFIED_SOURCE', 'source_sha256': hashlib.sha256(raw).hexdigest(),
              'source_text': None, 'source': None, 'objects': [], 'edges': [],
              'dependencies': [], 'diagnostics': []}
    def diag(code, path, message, severity='unsupported'):
        result['diagnostics'].append({'code': code, 'path': path, 'severity': severity, 'message': message})
    if len(raw) > MAX_BYTES:
        diag('LIMIT_EXCEEDED', '/', 'Source exceeds 2 MiB limit.', 'error')
        return result
    if raw.startswith(b'ampf'):
        diag('UNSUPPORTED_AMXD', '/', 'AMXD container decoding and execution are not supported.', 'error')
        return result
    try:
        text, source = _decode(raw)
    except (ValueError, UnicodeError, RecursionError) as exc:
        diag('MALFORMED_JSON', '/', str(exc), 'error')
        return result
    result.update(source_text=text, source=source)
    if not isinstance(source, dict) or not isinstance(source.get('patcher'), dict):
        diag('MALFORMED_PATCH', '/', 'Expected an object containing a patcher object.', 'error')
        return result
    p = source['patcher']
    boxes, lines = p.get('boxes'), p.get('lines')
    if not isinstance(boxes, list) or not isinstance(lines, list):
        diag('MALFORMED_PATCH', '/patcher', 'boxes and lines must be arrays.', 'error')
        return result
    if len(boxes) > MAX_BOXES or len(lines) > MAX_LINES:
        diag('LIMIT_EXCEEDED', '/patcher', 'Object or patchline limit exceeded.', 'error')
        return result
    for key in sorted(set(source)-{'patcher'}):
        diag('UNSUPPORTED_ATTRIBUTE', '/'+key, 'Root field preserved, not interpreted.')
    for key in sorted(set(p)-{'boxes','lines','dependency_cache'}):
        diag('UNSUPPORTED_ATTRIBUTE', '/patcher/'+key, 'Patcher field preserved, not interpreted.')
    catalog = load_catalog()
    aliases = {name: o['class'] for o in catalog['objects'] for name in [o['class'], *o['aliases']]}
    structural = {'id','maxclass','text','numinlets','numoutlets','outlettype',
                  'patching_rect','presentation_rect','presentation','patcher'}
    by_id = {}
    for i, wrapper in enumerate(boxes):
        path = f'/patcher/boxes/{i}/box'
        b = wrapper.get('box') if isinstance(wrapper, dict) else None
        if not isinstance(b, dict):
            diag('MALFORMED_BOX', path, 'Expected a box object.', 'error'); continue
        id_, cls = b.get('id'), b.get('maxclass')
        if not isinstance(id_, str) or not id_ or id_ in by_id or not isinstance(cls, str) or not cls:
            diag('MALFORMED_BOX', path, 'Unique nonempty id and maxclass strings required.', 'error'); continue
        by_id[id_] = b
        for key in ('numinlets', 'numoutlets'):
            if key in b and not _nonnegative(b[key]):
                diag('MALFORMED_PORTS', path+'/'+key, 'Port count must be an integer from 0 to 256.', 'error')
        if 'outlettype' in b:
            types = b['outlettype']
            if not (isinstance(types, list) and len(types)<=MAX_PORTS and all(isinstance(t,str) for t in types) and ('numoutlets' not in b or len(types)==b['numoutlets'])):
                diag('MALFORMED_PORTS', path+'/outlettype', 'Expected string array matching declared outlet count.', 'error')
        for key in ('patching_rect','presentation_rect'):
            if key in b:
                rect = b[key]
                if not (isinstance(rect, list) and len(rect)==4 and all(type(v) in (int,float) for v in rect) and rect[2]>=0 and rect[3]>=0):
                    diag('MALFORMED_RECT', path+'/'+key, 'Expected x/y/nonnegative width/height.', 'error')
        if 'presentation' in b and not _nonnegative(b['presentation'], 1):
            diag('MALFORMED_PRESENTATION', path+'/presentation', 'Expected 0 or 1.', 'error')
        text_value = b.get('text', '')
        if not isinstance(text_value, str):
            diag('MALFORMED_TEXT', path+'/text', 'Object text must be a string.', 'error'); text_value = ''
        # Only identify the first lexical token. Do not interpret Max arguments/messages.
        declared = text_value.split(maxsplit=1)[0] if cls == 'newobj' and text_value.strip() else cls
        canonical = aliases.get(declared)
        if canonical is None and _unsafe_path(declared):
            diag('UNSAFE_PATH', path+'/text', 'Unsafe object/abstraction path refused.', 'error')
        if canonical is None:
            code, reason = 'UNSUPPORTED_CLASS', 'Unknown class, abstraction or external; no lookup or loading performed.'
            for prefix, c, r in [('gen', 'UNSUPPORTED_GEN', 'Gen graphs are not supported.'),
                                 ('jit.', 'UNSUPPORTED_JITTER', 'Jitter is not supported.'),
                                 ('live.', 'UNSUPPORTED_LIVE', 'Live host services are not supported.'),
                                 ('mc.', 'UNSUPPORTED_MULTICHANNEL', 'Multichannel wrappers are not supported.')]:
                if declared.startswith(prefix): code, reason = c, r
            if declared in ('js','jsui','v8','v8ui','node.script','jweb','mxj'):
                code, reason = 'UNSUPPORTED_SCRIPT', 'Script/Java/web execution is not supported.'
            diag(code, path, reason)
        if 'patcher' in b:
            diag('UNSUPPORTED_EMBEDDED_PATCH', path+'/patcher', 'Embedded patch retained opaque; not traversed or executed.')
        for key in sorted(set(b)-structural):
            diag('UNSUPPORTED_ATTRIBUTE', path+'/'+key, 'Attribute preserved, not interpreted.')
        if cls == 'newobj' and re.search(r'(^|\s)@\S+', text_value):
            diag('UNSUPPORTED_ATTRIBUTE', path+'/text', 'Inline attributes retained in object text, not interpreted.')
        result['objects'].append({'id': id_, 'source_index': i, 'maxclass': cls,
                                  'declared_class': declared, 'canonical_class': canonical,
                                  'text': text_value, 'ports': {k:b[k] for k in ('numinlets','numoutlets','outlettype') if k in b},
                                  'layout': {k:b[k] for k in ('patching_rect','presentation_rect','presentation') if k in b},
                                  'evidence_status': 'DOC_ONLY' if canonical else 'UNSUPPORTED', 'source': b})
    for i, wrapper in enumerate(lines):
        path = f'/patcher/lines/{i}/patchline'
        line = wrapper.get('patchline') if isinstance(wrapper, dict) else None
        if not isinstance(line, dict):
            diag('MALFORMED_EDGE', path, 'Expected a patchline object.', 'error'); continue
        for endpoint, count_key in [('source','numoutlets'), ('destination','numinlets')]:
            e = line.get(endpoint)
            if not (isinstance(e, list) and len(e)==2 and isinstance(e[0], str) and e[0] in by_id and _nonnegative(e[1],MAX_PORTS-1)):
                diag('MALFORMED_EDGE', path+'/'+endpoint, 'Expected existing object id and nonnegative port index.', 'error')
            elif count_key in by_id[e[0]] and _nonnegative(by_id[e[0]][count_key]) and e[1]>=by_id[e[0]][count_key]:
                diag('MALFORMED_EDGE', path+'/'+endpoint, 'Port index exceeds declared port count.', 'error')
        if 'order' in line and not _nonnegative(line['order'], MAX_LINES):
            diag('MALFORMED_ORDER', path+'/order', 'Order must be a bounded nonnegative integer.', 'error')
        for key in sorted(set(line)-{'source','destination','order'}):
            diag('UNSUPPORTED_ATTRIBUTE', path+'/'+key, 'Patchline field preserved, not interpreted.')
        result['edges'].append({'source_index': i, 'source': line.get('source'), 'destination': line.get('destination'),
                                'order': line.get('order'), 'source_record': line})
    deps = p.get('dependency_cache', [])
    if not isinstance(deps, list):
        diag('MALFORMED_DEPENDENCIES', '/patcher/dependency_cache', 'Expected an array.', 'error')
    else:
        result['dependencies'] = deps
        for i, dep in enumerate(deps):
            path = f'/patcher/dependency_cache/{i}'
            if not isinstance(dep, dict):
                diag('MALFORMED_DEPENDENCY', path, 'Expected a dependency object.', 'error'); continue
            diag('UNSUPPORTED_DEPENDENCY', path, 'Dependency inventoried only; never resolved, fetched or loaded.')
            for key in ('name','bootpath','patcherrelativepath'):
                if key in dep and _unsafe_path(dep[key]):
                    diag('UNSAFE_PATH', path+'/'+key, 'Absolute, traversal, drive, URI or invalid dependency path refused.', 'error')
    result['accepted'] = not any(d['severity']=='error' for d in result['diagnostics'])
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('patch', type=Path, help='Explicit local .maxpat input; no dependency files are opened')
    args = parser.parse_args(argv)
    if args.patch.suffix.lower() != '.maxpat':
        print(json.dumps({'accepted':False, 'executable':False, 'diagnostics':[{'code':'UNSUPPORTED_FORMAT','severity':'error','path':'/','message':'Only .maxpat JSON is accepted; AMXD/opaque formats are unsupported.'}]}))
        return 2
    try:
        # Bounded read, even for a changing file. No inferred paths are used.
        with args.patch.open('rb') as stream:
            result = import_bytes(stream.read(MAX_BYTES+1))
    except OSError as exc:
        print(json.dumps({'accepted':False, 'executable':False, 'diagnostics':[{'code':'READ_ERROR','severity':'error','path':'/','message':str(exc)}]}))
        return 2
    print(json.dumps(result, indent=2, ensure_ascii=True))
    return 0 if result['accepted'] else 2

if __name__ == '__main__':
    sys.exit(main())
