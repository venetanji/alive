#!/usr/bin/env python3
"""Actual release scene-receipt visibility across the supported legacy fallback."""
import json
from pathlib import Path
import check_alive_desktop as alive
from gi.repository import Atspi

ui, windows = alive.ui, alive.windows


def accessible_text():
    rows = []
    for frame in windows.app_frames():
        for node in ui.walk(frame):
            rows.append({'name': node.get_name(),
                         'text': Atspi.Text.get_text(node, 0, -1)
                         if 'Text' in node.get_interfaces() else ''})
    return rows


def run():
    windows.focus(alive.MAIN)
    current = ui.output / 'initial-v3.alive'
    alive.choose_file('Save session as', 'Save Alive Session', current)
    envelope = json.loads(current.read_text())
    fresh = alive.file_score(envelope)
    assert fresh['format'] == 'alive-session-v3'
    fresh['title'] = 'Fresh scene identities'
    fresh['tracks'][0]['slots'][0]['name'] = 'Fresh scene clip'
    fresh_path = ui.output / 'fresh-v3.alive'
    fresh_path.write_text(json.dumps(envelope, indent=2))

    # Same playable legacy / conservative clip-density refusal as the Rust regression.
    legacy = json.loads(Path('apps/alive/examples/two-instruments.alive').read_text())
    legacy.update(title='Legacy fallback', tempo=120, lengthBeats=4)
    for index, track in enumerate(legacy['tracks']):
        track['device']['path'] = str(alive.DEVICE)
        track['automation'] = []
        track['notes'] = [{'beat': index, 'duration': .01, 'pitch': pitch, 'velocity': 80}
                          for pitch in range(40, 60)]
    legacy_path = ui.output / 'legacy-fallback.alive'
    legacy_path.write_text(json.dumps(legacy, indent=2))

    ui.click('Alive audio settings')
    ui.click('Save and start Alive audio')
    ui.click('Close audio settings')
    ui.click('Launch scene 4')
    old_request = alive.wait_value('Scene 4 request', lambda text: 'applied' in text)
    old_prepared = alive.value('Prepared scene 1')
    assert 'Pulse: Clip 1' in old_prepared

    alive.choose_file('Open session', 'Open Alive Session', legacy_path)
    ui.wait_for('Enable clip bank')
    legacy_tree = accessible_text()
    names = {row['name'] for row in legacy_tree}
    assert 'Scene receipts' not in names
    assert 'Prepared scene 1' not in names
    assert 'Scene 4 request' not in names
    assert 'Launch scene 4' not in names

    alive.choose_file('Open session', 'Open Alive Session', fresh_path)
    prepared = alive.value('Prepared scene 1')
    assert 'Pulse: Fresh scene clip' in prepared, prepared
    assert 'Pulse: Clip 1' not in prepared
    old_scene_result = alive.value('Scene 4 request')
    assert old_scene_result == '', old_scene_result
    fresh_tree = accessible_text()
    old_scene = [row['text'] for row in fresh_tree if row['name'] == 'Scene 4 request']
    assert old_scene == [''], old_scene
    # Session installation stops audio; scene admission requires a running driver.
    ui.click('Alive audio settings')
    ui.click('Save and start Alive audio')
    ui.click('Close audio settings')
    ui.click('Launch scene 1')
    fresh_request = alive.wait_value('Scene 1 request', lambda text: 'applied' in text)
    report = {'legacy_disclosure_absent_from_accessibility': True,
              'fresh_prepared_identity': prepared, 'old_request': old_request,
              'fresh_request': fresh_request, 'old_scene_result_cleared': True,
              'legacy_tree': legacy_tree, 'fresh_tree': fresh_tree}
    (ui.output / 'scene-mode-report.json').write_text(json.dumps(report, indent=2))
    ui.click('Quit Alive')
    print(json.dumps(report, indent=2), flush=True)


if __name__ == '__main__':
    try:
        run()
    except Exception:
        alive.screenshot('scene-mode-failure.png')
        (ui.output / 'failure-accessibility.json').write_text(
            json.dumps(accessible_text(), indent=2))
        raise
