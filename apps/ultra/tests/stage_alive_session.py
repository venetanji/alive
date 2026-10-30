#!/usr/bin/env python3
"""Stage a session for desktop tests while retaining its file envelope."""
import json
import sys
from pathlib import Path


def stage(source, target):
    session = json.loads(source.read_text())
    score = session['score'] if session.get('format') in ('alive-session-v5', 'alive-session-v6') else session
    for track in score['tracks']:
        instrument = track.get('device') or track.get('chain', {}).get('instrument')
        for device in ([instrument] if instrument else []) + track.get('effects', []):
            device['path'] = str((source.parent / device['path']).resolve(strict=True))
    target.write_text(json.dumps(session, indent=2) + '\n')


if __name__ == '__main__':
    stage(*map(Path, sys.argv[1:]))
