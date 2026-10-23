#!/usr/bin/env python3
"""Retain source signatures, hashes and provenance, never installed help bodies."""
import hashlib
import json
import platform
import re
import subprocess
import xml.etree.ElementTree as ET
import xml.parsers.expat
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RESOURCES = Path('/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources')
MAX = RESOURCES.parent / 'Max.exe'
WINE = Path('/home/venetanji/.local/opt/wine-d2d1-nspa-11.13/bin/wine')
PREFIX = Path('/home/venetanji/.cache/alive-max-signal-20261021/wine-disposable')
WORK = PREFIX.parent
FILES = ['sig~', 'plus~', 'minus~', 'times~', 'div~', 'cycle~', 'phasor~', 'noise~',
         'clip~', 'dac~', 'ezdac~', 'gain~', 'line~', 'snapshot~']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n')


def signatures(path):
    root = ET.parse(path).getroot()
    anchors, stack = [], []
    parser = xml.parsers.expat.ParserCreate()

    def start(tag, attributes):
        if len(stack) == 2 and tag in ['inlet', 'outlet', 'objarg', 'method', 'attribute']:
            anchors.append(dict(kind=tag, signature=attributes, line=parser.CurrentLineNumber))
        stack.append(tag)

    parser.StartElementHandler = start
    parser.EndElementHandler = lambda tag: stack.pop()
    parser.Parse(path.read_bytes(), True)
    defaults = {}
    for attr in root.findall('./attributelist/attribute'):
        default = attr.find('./attributelist/attribute[@name="default"]')
        if default is not None:
            defaults[attr.attrib['name']] = default.attrib.get('value')
    return root.attrib['name'], anchors, defaults


def help_ports(patcher, target, anchor='$/patcher'):
    found = []
    for i, entry in enumerate(patcher.get('boxes', [])):
        box = entry['box']
        at = anchor + '/boxes/' + str(i) + '/box'
        text = box.get('text', '')
        if box.get('maxclass') == target or (box.get('maxclass') == 'newobj' and text.split()[:1] == [target]):
            signature = {key: box[key] for key in ['id', 'maxclass', 'text', 'numinlets', 'numoutlets', 'outlettype', 'interpinlet'] if key in box}
            found.append(dict(anchor=at, signature=signature))
        if 'patcher' in box:
            found += help_ports(box['patcher'], target, at + '/patcher')
    return found


def native_provenance():
    executable = Path('/tmp/ultra-canvas-signal-test')
    workspace = ROOT.parents[2]
    source = workspace / 'apps/ultra/tests/canvas_signal_objects_test.cpp'
    pending, seen = [source], set()
    while pending:
        path = pending.pop().resolve()
        if path in seen:
            continue
        seen.add(path)
        for include in re.findall(r'^#include "([^"]+)"', path.read_text(), re.M):
            dependency = (path.parent / include).resolve()
            if dependency.is_file():
                pending.append(dependency)
    capture = ROOT / 'results/native-capture.jsonl'
    return dict(executable=str(executable), executable_sha256=digest(executable),
                compiler=subprocess.check_output(['c++', '--version'], text=True).splitlines()[0],
                compile_command='c++ -std=c++17 -O2 -Wall -Wextra -Werror apps/ultra/tests/canvas_signal_objects_test.cpp -o /tmp/ultra-canvas-signal-test',
                capture_command='/tmp/ultra-canvas-signal-test --capture',
                raw_capture=str(capture.relative_to(ROOT)), raw_capture_sha256=digest(capture),
                sources=[dict(path=str(path.relative_to(workspace)), sha256=digest(path)) for path in sorted(seen)])


def main():
    sources = []
    for stem in FILES:
        xml = RESOURCES / 'docs/refpages/msp-ref' / (stem + '.maxref.xml')
        helpfile = RESOURCES / 'help/msp' / (stem + '.maxhelp')
        name, anchors, defaults = signatures(xml)
        sources.append(dict(object=name,
            reference=dict(path=str(xml.relative_to(RESOURCES)), sha256=digest(xml),
                           anchors=anchors, attribute_metadata_defaults=defaults),
            help=dict(path=str(helpfile.relative_to(RESOURCES)), sha256=digest(helpfile),
                      port_signatures=help_ports(json.loads(helpfile.read_text())['patcher'], name))))
    write(ROOT / 'source-inventory.json', dict(schema='installed-max-source-signatures-v1',
        evidence='STATIC_INSTALLED_REFERENCE_NOT_RUNTIME', resource_root=str(RESOURCES), sources=sources,
        limitations=['Signatures can contain template placeholders and incorrect port labels; README records observed conflicts.',
                     'No installed documentation, patch, script or media bodies are redistributed.']))

    target = ('WINEPREFIX=' + str(PREFIX.resolve())).encode()
    remaining = []
    for proc in Path('/proc').glob('[0-9]*'):
        try:
            if target in proc.joinpath('environ').read_bytes().split(b'\0'):
                remaining.append(dict(pid=int(proc.name), comm=proc.joinpath('comm').read_text().strip()))
        except (PermissionError, FileNotFoundError, ProcessLookupError):
            pass
    assert not remaining, 'Owned disposable prefix still has processes'
    runs = []
    for fixture in ['arithmetic', 'waves', 'precision']:
        rows = [json.loads(line) for line in (ROOT / 'results' / (fixture + '.jsonl')).read_text().splitlines()]
        score = json.loads((ROOT / 'fixtures' / (fixture + '.score.json')).read_text())
        settings = {}
        for name in ['sr', 'sigvs', 'iovs', 'overdrive', 'takeover', 'switch']:
            values = [row['atoms'][0] for row in rows if row['label'] == name + '_right' and row['selector'] == 'int']
            settings[name] = values[-1]
        assert settings == dict(sr=48000, sigvs=64, iovs=512, overdrive=0, takeover=0, switch=0)
        drivers = [row['atoms'] for row in rows if row['label'] == 'driver_left' and row['selector'] == 'append'][:9]
        assert drivers[4] == ['NonRealTime']
        session_path = WORK / fixture / 'session.json'
        runs.append(dict(fixture=fixture, evidence='ORIGINAL_MAX_EXECUTED',
            first_message_utc=datetime.fromtimestamp(rows[0]['wall_ms']/1000, timezone.utc).isoformat(),
            last_message_utc=datetime.fromtimestamp(rows[-1]['wall_ms']/1000, timezone.utc).isoformat(),
            raw_rows=len(rows), stimuli=len(score['events']), complete=rows[-1]['selector'] == 'complete',
            settings_after_capture=settings, driver_index=4, driver_menu=drivers,
            session=json.loads(session_path.read_text()),
            external_runtime_log=dict(path=str(WORK / fixture / 'runtime.log'), sha256=digest(WORK / fixture / 'runtime.log'))))
    environment = dict(
        max_version='9.1.5 (3db35fa476d), Windows x64; retained baseline environment identifies version',
        max_version_source='../docs/environment.json', max_executable=str(MAX), max_executable_sha256=digest(MAX),
        wine_executable=str(WINE), wine_executable_sha256=digest(WINE),
        wine_version=subprocess.check_output([str(WINE), '--version'], text=True).strip(),
        host=dict(system=platform.system(), release=platform.release(), architecture=platform.machine()),
        isolation=dict(disposable_prefix=str(PREFIX), original_prefix_launched=False,
                       private_xvfb=True, software_rendering=True, hardware_audio=False,
                       clone_method='cp -a --reflink=always from prior clean disposable list prefix',
                       profile_home_symlinks_replaced_with_empty_directories=True,
                       disposable_prefix_removed=not PREFIX.exists(),
                       exact_prefix_processes_after_cleanup=remaining),
        sample_representation='buffer~ float32; internal signal computation precision not retained', runs=runs)
    if (ROOT / 'results/native-capture.jsonl').exists():
        environment['native_replay'] = native_provenance()
    write(ROOT / 'environment.json', environment)
    paths = [path for path in ROOT.rglob('*') if path.is_file() and path.name != 'manifest.json'
             and '__pycache__' not in path.parts]
    write(ROOT / 'manifest.json', dict(schema='original-max-signal-manifest-v1',
        evidence='ORIGINAL_MAX_EXECUTED', frozen_capture_batch=True,
        files=[dict(path=str(path.relative_to(ROOT)), bytes=path.stat().st_size, sha256=digest(path)) for path in sorted(paths)]))
    print(json.dumps(dict(sources=len(sources), source_files=len(sources)*2, runs=len(runs), manifest_files=len(paths), cleanup='no exact-prefix processes')))


if __name__ == '__main__':
    main()
