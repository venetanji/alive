#!/usr/bin/env python3
"""Author a legal eight-track saved-graph fixture without altering existing scores."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

def device(name, identity):
    path = ROOT / 'apps/ultra/examples' / (name + '.ultra')
    patch = json.loads(path.read_text())
    canonical = json.dumps(patch, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
    return {'instanceId': identity, 'sourceSha256': hashlib.sha256(canonical).hexdigest(),
            'bypassed': False, 'path': str(path), 'id': patch['device']['id'],
            'version': patch['device']['version'], 'parameters': {}}

def session(tracks=8, devices=16):
    result = {'format': 'alive-session-v3', 'title': f'{tracks} Independent Tracks', 'tempo': 240,
              'lengthBeats': 8, 'loopEnabled': True, 'tracks': []}
    remaining = devices - tracks
    for index in range(tracks):
        identity = f'capacity-instrument-{index}'
        clips = []
        for slot in range(2):
            clip = {'id': f'capacity-clip-{index}-{slot}', 'name': f'Clip {slot + 1}', 'lengthBeats': 8,
                    'notes': [{'id': f'capacity-note-{index}-{slot}-{voice}', 'beat': 0, 'duration': 8,
                               'pitch': 48 + index + voice * 4 + slot * 12, 'velocity': 80}
                              for voice in range(3)], 'automation': []}
            if index == 0:
                clip['automation'] = [{'instanceId': identity, 'key': 'cutoff', 'enabled': True,
                                       'points': [{'beat': 0, 'value': 1200}, {'beat': 4, 'value': 2600}]}]
            clips.append(clip)
        count = min(2, remaining)
        effects = [device(name, f'capacity-effect-{index}-{position}')
                   for position, name in enumerate(('utility', 'stereo-lowpass')[:count])]
        remaining -= count
        result['tracks'].append({'id': f'capacity-track-{index}',
            'name': ('Pulse', 'Harmony')[index] if index < 2 else f'Track {index + 1}',
            'device': device('subtractive', identity), 'effects': effects,
            'slots': [*clips, None, None], 'defaultClipId': clips[0]['id'],
            'gain': .125, 'mute': False, 'solo': False})
    assert not remaining
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    parser.add_argument('--tracks', type=int, choices=(2, 4, 8), default=8)
    args = parser.parse_args()
    with args.output.open('x') as stream:
        stream.write(json.dumps(session(args.tracks, 6 if args.tracks == 2 else args.tracks * 2), indent=2) + '\n')
