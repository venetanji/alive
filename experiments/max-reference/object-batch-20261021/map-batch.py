#!/usr/bin/env python3
"""Derive a bounded interface map without copying installed patch or prose bodies."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET


BATCH = ['int', 'float', 'flonum', 'slider', 'pack', 'unpack',
         'select', 'route', 'trigger', 'line']
ALIASES = {'int': ['i'], 'float': ['f'], 'select': ['sel'], 'trigger': ['t']}
TRACES = {'int': '04-int', 'float': '05-float', 'flonum': '07-flonum',
          'pack': '08-pack', 'unpack': '09-unpack', 'select': '10-select',
          'route': '11-route', 'trigger': '01-trigger'}

# These descriptions are original implementation notes, not extracted prose.
CONTRACTS = {
    'int': {
        'arguments': [{'name': 'initial', 'type': 'number', 'optional': True,
                       'default': 0, 'effect': 'Initial integer storage; float input is converted.'}],
        'ports': {'inlets': 2, 'outlets': 1,
                  'input': ['0: number stores and emits; bang emits stored value; set stores silently.',
                            '1: number stores silently.'],
                  'output': ['0: integer.']},
        'options': ['send <receiver> publishes stored value to named receivers without outlet output.',
                    'XML describes 32-bit integer storage; overflow has no retained reference case.'],
        'acceptance': ['Negative and positive float conversion; distinguish integer selector.',
                       'Hot/cold inlet, bang and silent set; initial state.',
                       'Explicit symbol/list/invalid-input diagnostics; alias i independently.'],
        'deferred': ['Overflow and nonfinite numbers', 'Named send behavior and receiver ordering'],
        'original_example': 'int 11',
    },
    'float': {
        'arguments': [{'name': 'initial', 'type': 'float', 'optional': True,
                       'default': 0.0, 'effect': 'Initial floating-point storage.'}],
        'ports': {'inlets': 2, 'outlets': 1,
                  'input': ['0: number stores and emits; bang emits; set stores silently.',
                            '1: number stores silently.'],
                  'output': ['0: float.']},
        'options': ['send <receiver> publishes stored value without outlet output.',
                    'XML describes single-precision storage; verify precision against this Max version.'],
        'acceptance': ['Integer-to-float selector conversion, fractions and negative values.',
                       'Hot/cold inlet, bang and silent set; initial state.',
                       'Explicit symbol/list/invalid-input diagnostics; alias f independently.'],
        'deferred': ['Precision, large magnitudes and nonfinite numbers', 'Named send behavior'],
        'original_example': 'float 2.25',
    },
    'flonum': {
        'arguments': [],
        'arguments_caution': 'XML argument row is a template placeholder; no positional argument contract inferred.',
        'ports': {'inlets': 1, 'outlets': 2,
                  'input': ['0: numeric update displays and emits; bang repeats; set updates silently.'],
                  'output': ['0: displayed numeric value.', '1: bang for keyboard Tab navigation.']},
        'options': ['minimum/maximum bound stored, displayed and emitted values; min/max without a number clear bounds.',
                    'cantchange, mouseup and outputonclick affect operation; select gives keyboard focus.',
                    'numdecimalplaces changes display; appearance and parameter metadata stay separate from value state.'],
        'acceptance': ['Float selector, bang, silent set and bounds.',
                       'Drag either side of decimal; typed entry commits; focus and Tab outlet.',
                       'Operate locked with DSP off, and temporary operation while editing.'],
        'deferred': ['Parameter automation and appearance/style parity', 'Full keyboard/accessibility behavior'],
        'original_example': 'UI flonum with minimum=-2.5 and maximum=2.5',
    },
    'slider': {
        'arguments': [],
        'arguments_caution': 'XML argument row is a template placeholder; use attributes, not invented positional arguments.',
        'ports': {'inlets': 1, 'outlets': 1,
                  'input': ['0: numeric input displays/emits; bang repeats; set changes state silently.'],
                  'output': ['0: integer by default; float when floatoutput is enabled.']},
        'options': ['size controls drag range; mult scales and min offsets output.',
                    'Integer mode clamps size below 2 to 2; float mode clamps size below 1 to 1.',
                    'setminmax <low> <high> configures range and enables floatoutput.',
                    'relative changes drag anchoring; orientation can follow geometry or be explicit.',
                    'XML distinguishes bounded drag output from numeric inlet values, which are not bounded before output.'],
        'source_conflicts': ['relative description calls relative mode the default, but its attribute metadata has default value=0.'],
        'acceptance': ['Default integer mode; floatoutput; size/mult/min; silent set.',
                       'Out-of-range inlet versus drag; setminmax and fractional endpoints.',
                       'Locked, edit-mode modifier and DSP-off operation; orientation and relative mode.'],
        'deferred': ['Exact mouse mapping and rounding', 'Parameter mapping and style/appearance parity'],
        'original_example': 'UI slider with size=9, mult=0.25 and min=-1',
    },
    'pack': {
        'arguments': [{'name': 'slots', 'type': 'int|float|symbol[]', 'optional': True,
                       'default': [0, 0], 'effect': 'Each atom fixes one inlet and stored slot type/value.'}],
        'ports': {'inlets': '2 when no arguments; otherwise number of slot arguments', 'outlets': 1,
                  'input': ['0: update and emit stored sequence; bang repeats; set updates silently.',
                            '1..N-1: update corresponding slot silently; lists can update subsequent slots.'],
                  'output': ['0: stored message/list; nth can emit one stored item.']},
        'options': ['Short updates preserve untouched slots; excess items have no available slot.',
                    'Slot type comes from creation arguments and controls numeric/symbol conversion.',
                    'send publishes to named receivers; nth selects an element (index basis not mapped here).'],
        'acceptance': ['Typed slots and hot/cold behavior; initial bang.',
                       'Short and excess lists; numeric/symbol conversion; message selector serialization.',
                       'Silent set and nth index bounds need additional retained Max cases.'],
        'deferred': ['nth index basis/bounds', 'Named send', 'Symbol-first output canonicalization'],
        'original_example': 'pack 3 0.5 amber',
    },
    'unpack': {
        'arguments': [{'name': 'slots', 'type': 'int|float|symbol[]', 'optional': True,
                       'default': [0, 0], 'effect': 'Each argument fixes one output type; defaults to two integer outputs.'}],
        'ports': {'inlets': 1, 'outlets': '2 when no arguments; otherwise number of slot arguments',
                  'input': ['0: distribute received atoms to typed outlets; bang recalls stored items.'],
                  'output': ['0..N-1: corresponding coerced element; delivery order is a separate contract.']},
        'options': ['Extra items exceed the outlet count; short lists and later bang require stored-state verification.',
                    'XML template lists two outlets but argument count controls actual count.'],
        'acceptance': ['Right-to-left output order from ordered Max baseline.',
                       'Integer/float/symbol coercion, short/excess input and later bang.',
                       'Anything selector differs from explicit symbol/list syntax.'],
        'deferred': ['Per-atom int/float trace fidelity', 'All symbol conversion edge cases'],
        'original_example': 'unpack 0 0. pear',
    },
    'select': {
        'arguments': [{'name': 'selectors', 'type': 'int|float|symbol[]', 'optional': True,
                       'default': [0], 'effect': 'One match outlet per selector, plus one unmatched outlet.'}],
        'ports': {'inlets': '1 or 2; single-integer/default second inlet documented; float case conflicts with saved help',
                  'outlets': 'number of selectors + 1 (2 by default)',
                  'input': ['0: compare first message element with selectors.',
                            '1: replace comparison value in documented single-integer/default case.'],
                  'output': ['0..N-1: bang for match, leftmost matching duplicate only.',
                             'N: original unmatched message.']},
        'options': ['matchfloat enables floating comparison; exact is its documented attribute alias.',
                    'fuzzy supplies tolerance when floating comparison is enabled.'],
        'source_conflicts': ['XML restricts right inlet to single int/default; p fuzzy float-selector instance saves two inlets.'],
        'acceptance': ['Integer, float, symbol, bang and list matching; original unmatched selector/payload.',
                       'Single-integer right-inlet replacement; multiple selectors and duplicates.',
                       'matchfloat/exact/fuzzy and single-float port creation require fresh runtime probes.'],
        'deferred': ['Resolve float-selector inlet conflict', 'Fuzzy boundaries and duplicate symbol behavior'],
        'original_example': 'select 4 9 ready',
    },
    'route': {
        'arguments': [{'name': 'selectors', 'type': 'int|float|symbol[]', 'optional': True,
                       'default': [0], 'effect': 'One routed outlet per selector, plus unmatched outlet.'}],
        'ports': {'inlets': 'saved help: number of selectors + 1; XML lists two template inlets',
                  'outlets': 'number of selectors + 1 (2 by default)',
                  'input': ['0: compare selector/first item; extra saved inlets need a measured behavior contract.'],
                  'output': ['0..N-1: matched remainder after removing selector; empty remainder becomes bang.',
                             'N: entire unmatched message.']},
        'options': ['Keep int/float/list message categories distinct from their textual selector spelling.',
                    'Mixed numeric/symbol arguments appear in installed help.'],
        'source_conflicts': ['Saved help has N+1 inlets for N selectors, beyond XML template rows; roles of additional inlets are unmeasured.'],
        'acceptance': ['Selector stripping, empty remainder, mixed numeric/symbol selectors and unmatched message.',
                       'Explicit list versus anything and scalar numeric inputs.',
                       'Resolve extra inlet behavior before claiming route creation/import compatibility.'],
        'deferred': ['Additional inlet roles', 'Type-selector routing and exact float matching'],
        'original_example': 'route open 6 close',
    },
    'trigger': {
        'arguments': [{'name': 'formats_or_constants', 'type': 'int|float|symbol[]', 'optional': True,
                       'default': ['i', 'i'], 'effect': 'Each argument creates one output; i/f/b/l/s select conversion, other atoms supply constants.'}],
        'ports': {'inlets': 1, 'outlets': '2 when no arguments; otherwise argument count',
                  'input': ['0: distribute input synchronously through output conversions/constants.'],
                  'output': ['N-1..0: emit in right-to-left order; downstream processing completes before preceding output.']},
        'options': ['Alias t is present in installed help.',
                    'Typed bang/list/symbol conversions include zero and empty-symbol cases; do not use JavaScript truthiness.'],
        'acceptance': ['Right-to-left order and depth-first downstream behavior.',
                       'i/f/b/l/s formats for numeric, bang, symbol/list/anything input.',
                       'Numeric and symbol constants; defaults; alias t.'],
        'deferred': ['All conversion combinations and empty-symbol interoperability', 'Any format aliases not explicitly tested'],
        'original_example': 'trigger b i f',
    },
    'line': {
        'arguments': [{'name': 'initial', 'type': 'number', 'optional': True, 'default': 0,
                       'effect': 'Initial value; lexical numeric type contributes to output mode.'},
                      {'name': 'grain_ms', 'type': 'number', 'optional': True, 'default': 20,
                       'effect': 'Message output interval; documented argument values below 1 reset to 20.'}],
        'ports': {'inlets': 3, 'outlets': 2,
                  'input': ['0: target or target/time[/grain]; longer sequences schedule target/time pairs.',
                            '1: next duration in milliseconds; documentation consumes this per target.',
                            '2: interval between ramp updates in milliseconds.'],
                  'output': ['0: numeric ramp samples.', '1: completion bang.']},
        'options': ['set updates start value silently and stops current ramp; stop halts output.',
                    'pause preserves pending ramp and keeps current value output; resume continues.',
                    'New target/list replaces pending segments; three-number list supplies persistent grain.',
                    'floatoutput 0/1/2 selects off/on/auto; compatmode enables older behavior.',
                    'Auto float output has documented distance<=1 and step<0.4 conditions; verify rather than infer from initial argument alone.',
                    'clock delegates to named setclock; maxpoints bounds queued points.'],
        'acceptance': ['DSP-independent clock; finite start/target/time/grain score with numeric tolerance.',
                       'Integer/float/auto modes; exact endpoint and completion ordering.',
                       'Interrupted ramp, set/stop, pause/resume, persistent grain and queued segments.'],
        'deferred': ['No retained line message runtime baseline', 'Scheduler priority and exact timing',
                     'setclock', 'Legacy compatmode', 'Long breakpoint lists and maxpoints limits'],
        'original_example': 'line 2. 10',
    },
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source(path, root):
    return {'path': path.relative_to(root).as_posix(), 'sha256': sha256(path)}


def ref_metadata(path, resources):
    root = ET.parse(path).getroot()
    attributes = []
    for item in root.findall('./attributelist/attribute'):
        defaults = item.findall('./attributelist/attribute[@name="default"]')
        enums = item.findall('./attributelist/attribute[@name="enumvals"]/enumlist/enum')
        attributes.append({**item.attrib,
                           'default_lexemes': [x.get('value') for x in defaults],
                           'enum_names': [x.get('name') for x in enums]})
    return {**source(path, resources), 'status': 'installed-xml-inspected',
            'arguments_raw': [dict(x.attrib) for x in root.findall('./objarglist/objarg')],
            'port_templates_raw': {
                'inlets': [dict(x.attrib) for x in root.findall('./inletlist/inlet')],
                'outlets': [dict(x.attrib) for x in root.findall('./outletlist/outlet')]},
            'port_caution': 'INLET_TYPE/OUTLET_TYPE and OBJARG_* are literal template markers, not inferred types.',
            'methods': [{'name': x.get('name'), 'arguments': [dict(a.attrib) for a in x.findall('./arglist/arg')]}
                        for x in root.findall('./methodlist/method')],
            'attributes': attributes}


def token(box):
    words = box.get('text', '').split()
    return words[0] if box.get('maxclass') == 'newobj' and words else box['maxclass']


def help_metadata(path, resources, name):
    root = json.loads(path.read_text(encoding='utf-8-sig'))['patcher']
    counts, dependency_counts = Counter(), Counter()
    basic_tabs, samples, aliases = [], [], set()
    script_references = set()
    total_patchers = total_lines = 0

    def walk(patcher, ancestry):
        nonlocal total_patchers, total_lines
        total_patchers += 1
        total_lines += len(patcher.get('lines', []))
        namespace = patcher.get('classnamespace', 'box')
        for dependency in patcher.get('dependency_cache', []):
            if isinstance(dependency.get('name'), str):
                dependency_counts[dependency['name'].replace('\\', '/').rsplit('/', 1)[-1]] += 1
        for entry in patcher.get('boxes', []):
            box = entry['box']
            name_token = token(box)
            counts[(namespace, name_token)] += 1
            box_path = ancestry + [box.get('id')]
            if name_token in [name] + ALIASES.get(name, []):
                if name_token != name:
                    aliases.add(name_token)
                samples.append({'box_path': box_path, 'token': name_token,
                                'numinlets': box.get('numinlets'), 'numoutlets': box.get('numoutlets'),
                                'outlettype': box.get('outlettype')})
            words = box.get('text', '').split()
            if name_token in {'js', 'jsui'} and len(words) > 1:
                script_references.add(words[1])
            if isinstance(box.get('patcher'), dict):
                if box.get('text', '').strip() == 'p basic':
                    basic_tabs.append({'box_path': box_path,
                                       'direct_boxes': len(box['patcher'].get('boxes', [])),
                                       'direct_tokens': sorted({token(x['box']) for x in box['patcher'].get('boxes', [])})})
                walk(box['patcher'], box_path)

    walk(root, [])
    dependencies = []
    for dep, count in sorted(dependency_counts.items()):
        candidates = sorted(resources.rglob(dep))
        dependencies.append({'name': dep, 'declarations': count,
                             'local_matches': [source(x, resources) for x in candidates],
                             'resolution': 'unique-local-match' if len(candidates) == 1 else 'ambiguous-or-missing'})
    return {**source(path, resources), 'status': 'parsed-static-metadata-only',
            'patchers': total_patchers, 'boxes': sum(counts.values()), 'patchlines': total_lines,
            'tokens': [{'namespace': namespace, 'token': item, 'count': count}
                       for (namespace, item), count in sorted(counts.items())],
            'basic_tabs': basic_tabs, 'saved_target_ports': samples,
            'alias_tokens_present': sorted(aliases),
            'script_file_references': sorted(script_references),
            'declared_dependencies': dependencies,
            'dependency_limit': 'All nested dependency_cache declarations are inspected; script bodies, dynamically loaded assets and transitive code dependencies are not resolved.'}


def trace_metadata(name, reference):
    if name not in TRACES:
        if name == 'slider':
            return {'status': 'existing-max-ui-observation-only',
                    'files': [{'path': '../help-coverage-20261021/results/ui-events.jsonl',
                               'sha256': sha256(reference/'help-coverage-20261021/results/ui-events.jsonl')}],
                    'scope': 'Locked slider emits in existing physical UI probe; no range/coercion oracle.'}
        return {'status': 'no-retained-max-message-baseline', 'files': []}
    fixture = TRACES[name]
    paths = [reference/'fixtures'/f'{fixture}.score.json',
             reference/'manifests'/f'{fixture}.manifest.json',
             reference/'results'/f'{fixture}.jsonl', reference/'expected'/f'{fixture}.json']
    manifest = json.loads(paths[1].read_text())
    expected = json.loads(paths[3].read_text())
    return {'status': 'existing-bounded-max-capture-not-canvas-execution',
            'fixture': fixture, 'max_executed': manifest['max_executed'],
            'scope': json.loads(paths[0].read_text())['question'],
            'expected_status': expected['status'],
            'raw_trace_lines': len(paths[2].read_text().splitlines()),
            'files': [{'path': '../' + p.relative_to(reference).as_posix(), 'sha256': sha256(p)} for p in paths]}


def build(resources):
    reference = Path(__file__).resolve().parent.parent
    objects = []
    for name in BATCH:
        objects.append({'class': name, 'namespace': 'box',
                        'aliases_to_test': ALIASES.get(name, []),
                        'alias_status': ('token present in installed help; runtime equivalence not independently verified'
                                         if ALIASES.get(name) else 'no alias mapped'),
                        'json_maxclass': name if name in {'flonum', 'slider'} else 'newobj',
                        'contract_evidence': 'paraphrased installed XML; saved help port facts and conflicts explicitly separated',
                        'contract': CONTRACTS[name],
                        'reference': ref_metadata(resources/'docs/refpages/max-ref'/f'{name}.maxref.xml', resources),
                        'official_reference': f'https://docs.cycling74.com/reference/{name}/',
                        'installed_help': help_metadata(resources/'help/max'/f'{name}.maxhelp', resources, name),
                        'max_runtime_evidence': trace_metadata(name, reference),
                        'canvas_semantic_status': 'not-implemented-not-executed-by-this-map'})
    return {'schema_version': 1, 'batch_id': 'object-batch-20261021', 'object_count': len(objects),
            'scope': 'Ten next message/control/UI objects; derived local source facts and original implementation notes only.',
            'installed_source': {'environment_manifest': '../manifest.json', 'max_version': '9.1.5 Windows x64'},
            'evidence_boundary': [
                'Reference signatures/defaults are documentation evidence; they do not prove current runtime behavior.',
                'Saved help JSON port counts are source facts; they do not prove extra inlet semantics.',
                'Existing Max traces use original research fixtures and bounded scores, not installed whole-help execution.',
                'No canvas execution, imported help conformance or UI/DSP equivalence is established by this map.',
                'No installed patch bodies, prose, scripts, graphics or media are redistributed.'],
            'implementation_order': [
                {'step': 1, 'objects': [], 'gate': 'DSP-independent typed message executor and lifecycle; preserve bang/int/float/symbol/list/anything, inlet and outlet identity, depth-first ordering.'},
                {'step': 2, 'objects': ['int', 'float', 'trigger'], 'gate': 'Match existing ordered Max scores, add cold-inlet and alias cases; keep unsupported messages explicit.'},
                {'step': 3, 'objects': ['pack', 'unpack'], 'gate': 'Typed slots, hot/cold updates, list width and stored state; right-to-left outlet ordering.'},
                {'step': 4, 'objects': ['select', 'route'], 'gate': 'Resolve saved/documented inlet conflicts; selector type and remainder semantics; explicit options.'},
                {'step': 5, 'objects': ['flonum', 'slider'], 'gate': 'Message behavior first; DSP-off locked controls, editing modifier, ranges, float mode, focus and keyboard.'},
                {'step': 6, 'objects': ['line'], 'gate': 'Create original Max timing oracle, then independent clock, tolerances, completion/interruption/queued behavior.'}],
            'objects': objects}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--resources', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path(__file__).with_name('object-map.json'))
    args = parser.parse_args()
    payload = build(args.resources.resolve())
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + '\n')
    print(json.dumps({'objects': payload['object_count'], 'output': str(args.output),
                      'source_status': 'inspected', 'canvas_semantics': 'not-run'}))


if __name__ == '__main__':
    main()
