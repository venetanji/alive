#!/usr/bin/env python3
"""Keep identities and state-shape facts, never preset data or proprietary code."""
import gzip
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
INSTALL = Path('/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite')
DEFAULTS = INSTALL / 'Resources/Core Library/Defaults'
FILES = ['Instruments/Analog.adv', 'Instruments/Simpler.adv', 'Instruments/Sampler.adv',
         'Audio Effects/Delay.adv', 'Audio Effects/Auto Filter.adv']


def identity(path):
    return dict(path=str(path), bytes=path.stat().st_size,
                sha256=hashlib.sha256(path.read_bytes()).hexdigest())


report = dict(evidence_id='LOCAL-S1', authority='shipped-artifact',
              executable=identity(INSTALL / 'Program/Ableton Live 12 Suite.exe'),
              analog_library=identity(INSTALL / 'Resources/Devices/Pc/Analog_64.dll'), devices=[])
for item in FILES:
    path = DEFAULTS / item
    tree = ET.fromstring(gzip.decompress(path.read_bytes()))
    device = list(tree)[0]
    parameters = []
    def visit(element, prefix):
        if element.find('AutomationTarget') is not None:
            parameters.append(dict(path=prefix, state_fields=[x.tag for x in element]))
        for child in element:
            visit(child, prefix + '/' + child.tag)
    visit(device, device.tag)
    report['devices'].append(dict(**identity(path), class_tag=device.tag,
                                  creator=tree.attrib.get('Creator'),
                                  top_level_fields=[x.tag for x in device],
                                  automatable_state_count=len(parameters),
                                  automatable_state_shapes=parameters))
(ROOT / 'artifact-inventory.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(dict(evidence_id=report['evidence_id'],
                     device_counts={d['class_tag']:d['automatable_state_count'] for d in report['devices']})))
