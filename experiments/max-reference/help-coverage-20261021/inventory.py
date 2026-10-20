#!/usr/bin/env python3
"""Read installed help JSON/XML; publish derived metadata, never patch contents.

This is an inventory, not a Max parser, dependency resolver or execution runner.
It never imports scripts, loads externals, opens patchers or starts DSP.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def token(box):
    if box.get('maxclass') == 'newobj':
        words = box.get('text', '').split()
        return words[0] if words else '<empty-newobj>'
    return box.get('maxclass', '<missing-maxclass>')


def review_flags(names, dependencies):
    flags = set()
    for name in names:
        if name in {'js', 'jsui', 'v8', 'v8ui', 'node.script', 'mxj', 'mxj~', 'shell'}:
            flags.add('script-or-managed-code')
        if name in {'dac~', 'ezdac~', 'mc.dac~', 'mc.ezdac~', 'adoutput~', 'plugin~', 'plugout~'}:
            flags.add('audio-output-or-host-routing')
        if name in {'adc~', 'ezadc~', 'mc.adc~', 'mc.ezadc~'}:
            flags.add('audio-input')
        if name in {'udpsend', 'udpreceive', 'tcpclient', 'jit.net.send', 'jit.net.recv', 'maxurl', 'serial', 'midiin', 'midiout'}:
            flags.add('network-midi-or-device-access')
        if name in {'file', 'folder', 'sfplay~', 'sfrecord~', 'record~', 'buffer~', 'opendialog', 'savedialog', 'dropfile', 'text', 'dict', 'coll', 'table', 'pattrstorage'}:
            flags.add('file-or-state-operations')
        if name.startswith(('jit.', 'jxs.', 'gl.', 'mc.', 'gen', 'rnbo', 'live.')):
            flags.add('additional-runtime-family')
    if dependencies:
        flags.add('declared-dependencies')
    return sorted(flags)


def inspect_patch(path, resources):
    relative = path.relative_to(resources).as_posix()
    row = {'path': relative, 'sha256': digest(path), 'bytes': path.stat().st_size,
           'kind': 'help' if path.suffix == '.maxhelp' else 'support-patch',
           'status': 'source-inspected-not-executed'}
    try:
        patch = json.loads(path.read_text(encoding='utf-8-sig'))['patcher']
        classes, fields, dependencies = Counter(), Counter(), set()
        namespaces, basic, patchers, lines, nodes = set(), [], 0, 0, 0

        def walk(p, ancestry):
            nonlocal patchers, lines, nodes
            patchers += 1
            lines += len(p.get('lines', []))
            namespace = p.get('classnamespace', 'box')
            namespaces.add(namespace)
            for dep in p.get('dependency_cache', []):
                if isinstance(dep.get('name'), str):
                    dependencies.add(dep['name'].replace('\\', '/').rsplit('/', 1)[-1])
            for entry in p.get('boxes', []):
                box = entry['box']
                nodes += 1
                classes[(namespace, token(box))] += 1
                fields.update(k for k in box if 'color' in k or k in {
                    'style', 'styles', 'fontname', 'fontsize', 'presentation_rect',
                    'presentation', 'parameter_enable', 'saved_attribute_attributes'})
                if 'patcher' in box:
                    child = ancestry + [box.get('id', '<missing-id>')]
                    if box.get('text', '').strip() == 'p basic':
                        basic.append({'box_path': child, 'direct_boxes': len(box['patcher'].get('boxes', [])),
                                      'direct_tokens': sorted({token(b['box']) for b in box['patcher'].get('boxes', [])})})
                    walk(box['patcher'], child)
        walk(patch, [])
        row.update({'target_filename_stem': path.stem, 'namespaces': sorted(namespaces),
                    'patchers': patchers, 'boxes': nodes, 'patchlines': lines,
                    'class_counts': [{'namespace': ns, 'token': name, 'count': count}
                                     for (ns, name), count in sorted(classes.items())],
                    'basic_tabs': basic, 'appearance_fields': dict(sorted(fields.items())),
                    'dependency_names': sorted(dependencies),
                    'review_flags': review_flags({name for ns, name in classes}, dependencies),
                    'auto_execution': 'not-admitted; static flags are incomplete and not a safety proof'})
    except (ValueError, KeyError, TypeError, UnicodeError) as error:
        row.update({'status': 'parse-failed', 'error_type': type(error).__name__})
    return row


FOCUS = ['button', 'toggle', 'number', 'flonum', 'int', 'float', 'message',
         'slider', 'line', 'line~', 'trigger', 'pack', 'unpack', 'select', 'route',
         'metro', 'delay', 'pipe', 'defer', 'deferlow', 'loadbang', 'send',
         'receive', 'cycle~', 'sig~', '*~', 'gain~', 'dac~']


def inspect_refs(resources):
    rows = []
    for path in sorted((resources/'docs/refpages').rglob('*.maxref.xml')):
        if path.stem.removesuffix('.maxref') not in FOCUS:
            continue
        root = ET.parse(path).getroot()
        attributes = []
        # Nested attribute metadata uses the same XML tag; only direct entries
        # describe the object's attributes.
        for attr in root.findall('./attributelist/attribute'):
            defaults = attr.findall('./attributelist/attribute[@name="default"]')
            attributes.append({'name': attr.get('name'), 'type': attr.get('type'),
                               'size': attr.get('size'),
                               'documented_default': [' '.join(x.itertext()).strip() for x in defaults]})
        rows.append({'path': path.relative_to(resources).as_posix(), 'sha256': digest(path),
                     'class': root.get('name'), 'module': root.get('module'),
                     'methods': [m.get('name') for m in root.findall('./methodlist/method')],
                     'attributes': attributes, 'status': 'documentation-only-not-executed'})
    return rows


def inventory(resources):
    files = sorted(set((resources/'help').rglob('*.maxhelp')) |
                   set((resources/'packages').rglob('*.maxhelp')) |
                   set((resources/'help').rglob('*.maxpat')))
    rows = [inspect_patch(path, resources) for path in files]
    core = [r for r in rows if r['path'].startswith('help/') and r['kind'] == 'help']
    packages = [r for r in rows if r['path'].startswith('packages/')]
    refs = inspect_refs(resources)
    uses = defaultdict(lambda: {'files': 0, 'instances': 0})
    for row in rows:
        for c in row.get('class_counts', []):
            u = uses[(c['namespace'], c['token'])]
            u['files'] += 1
            u['instances'] += c['count']
    summary = {
        'schema_version': 1, 'boundary': 'resources/help and resources/packages/**/*.maxhelp; core help/**/*.maxpat support files',
        'help_files': len(core) + len(packages), 'core_help_files': len(core),
        'package_help_files': len(packages), 'core_support_maxpat_files': len(rows)-len(core)-len(packages),
        'core_domains': dict(sorted(Counter(r['path'].split('/')[1] for r in core).items())),
        'packages': dict(sorted(Counter(r['path'].split('/')[1] for r in packages).items())),
        'parsed_files': sum(r['status'] != 'parse-failed' for r in rows),
        'parse_failures': [r['path'] for r in rows if r['status'] == 'parse-failed'],
        'core_basic_tabs': sum(len(r.get('basic_tabs', [])) for r in core),
        'distinct_namespace_token_pairs': len(uses),
        'coverage': {
            'core_inventory': {'numerator': len(core), 'denominator': len(core), 'percent': 100.0},
            'full_help_conformance': {'numerator': 0, 'denominator': len(core)+len(packages), 'percent': 0.0,
                                      'meaning': 'No installed help file has been run end-to-end in Ultra or compared against Max by this inventory'},
            'object_compatibility_percent': None,
            'note': 'Filenames, tokens, parsed graphs and UI resemblance do not certify object behavior. Aliases and namespaces remain distinct.'},
        'execution_policy': 'Inventory first. No file is admitted automatically; scripts, attributes, branches, dependencies, clocks and expected outputs need explicit case contracts.'}
    return {'summary.json': summary, 'help-files.jsonl': rows,
            'object-usage.jsonl': [{'namespace': ns, 'token': name, **use} for (ns, name), use in sorted(uses.items())],
            'focus-reference.json': refs}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--resources', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for name, value in inventory(args.resources.resolve()).items():
        text = ('\n'.join(json.dumps(row, ensure_ascii=True, separators=(',', ':')) for row in value)
                if name.endswith('.jsonl') else json.dumps(value, indent=2, ensure_ascii=True))
        (args.output/name).write_text(text+'\n')
    print((args.output/'summary.json').read_text())


if __name__ == '__main__':
    main()
