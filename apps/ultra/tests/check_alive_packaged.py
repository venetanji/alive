#!/usr/bin/env python3
"""Prove a staged Alive resolves its own default/New template, then renders it."""
import json
import os
from pathlib import Path
import time

import check_alive_desktop as alive
import check_canvas_desktop as ui
import check_documents_desktop as windows


def run():
    source = Path(os.environ['ALIVE_STAGED_SESSION']).resolve(strict=True)
    assert str(source).startswith('/tmp/'), 'Only mutate a disposable staged template'
    binary = Path(f'/proc/{ui.pid}/exe').resolve(strict=True)
    assert binary == Path(os.environ['ULTRA_TEST_ALIVE_BINARY']).resolve(strict=True)
    windows.focus('Alive')
    ui.wait_for('Packaged First Light - Alive')
    document = json.loads(source.read_text())
    document['title'] = 'Packaged New Session'
    source.write_text(json.dumps(document, indent=2) + '\n')
    ui.click('New session')
    ui.wait_for('* Packaged New Session - Alive')
    ui.click('Audio details')
    alive.transport('start')
    alive.wait_value('Track 1 active voices', lambda s: int(s) > 0)
    alive.wait_value('Track 2 active voices', lambda s: int(s) > 0)
    capture = alive.start_capture('packaged-default')
    time.sleep(3)
    audio = alive.finish_capture(capture)
    assert audio['peak'] > 1e-4
    alive.screenshot('packaged-alive.png')
    report = {'binary': str(binary), 'template': str(source),
              'startup_used_packaged_title': True, 'new_reloaded_packaged_title': True,
              'software_audio': audio, 'diagnostics': alive.detail()}
    assert report['diagnostics']['Audio stream errors'] == '0'
    assert report['diagnostics']['Rejected commands'] == '0'
    (ui.output / 'packaged-alive.json').write_text(json.dumps(report, indent=2) + '\n')
    alive.transport('stop')


if __name__ == '__main__':
    run()
