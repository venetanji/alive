#!/usr/bin/env python3
"""Stage the current Alive document and its external inputs for desktop tests."""
import json
import sys
from pathlib import Path


def stage(source, target):
    session = json.loads(source.read_text())
    if session.get('format') != 'alive-session-v6' or session.get('score', {}).get('format') != 'alive-session-v4':
        raise ValueError('Desktop fixtures require an alive-session-v6 envelope with a v4 workspace score')
    score = session['score']
    for track in score['tracks']:
        chain = track['chain']
        instrument = chain.get('instrument')
        for device in ([instrument] if instrument else []) + track.get('effects', []):
            device['path'] = str((source.parent / device['path']).resolve(strict=True))
    for source_record in score['sources']:
        if source_record['kind'] == 'audio':
            source_record['file']['path'] = str((source.parent / source_record['file']['path']).resolve(strict=True))
    target.write_text(json.dumps(session, indent=2) + '\n')


if __name__ == '__main__':
    stage(*map(Path, sys.argv[1:]))
