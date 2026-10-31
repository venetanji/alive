"""Actual browser-to-track/chain dragging on the private native desktop harness."""
import json
import os
from pathlib import Path
import time
import check_alive_desktop as alive
from gi.repository import Atspi

ui = alive.ui
ui.find = alive.windows.scoped_find
gestures = []


def drag(source, target, fraction=.5):
    start = Atspi.Component.get_extents(ui.wait_for(source), Atspi.CoordType.SCREEN)
    end = Atspi.Component.get_extents(ui.wait_for(target), Atspi.CoordType.SCREEN)
    assert min(start.width, start.height, end.width, end.height) > 0
    sx, sy = start.x + start.width // 2, start.y + start.height // 2
    ex, ey = round(end.x + end.width * fraction), end.y + end.height // 2
    gestures.append(dict(source=source, target=target, start=[sx, sy], end=[ex, ey], synthetic_ipc=False))
    (ui.output / 'drag-gestures.json').write_text(json.dumps(gestures, indent=2)+'\n')
    ui.t.XTestFakeMotionEvent(ui.display, 0, sx, sy, 0)
    ui.x.XFlush(ui.display)
    time.sleep(.15)
    ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
    ui.x.XFlush(ui.display)
    try:
        for step in range(1, 25):
            ui.t.XTestFakeMotionEvent(ui.display, 0, round(sx + (ex-sx)*step/24), round(sy + (ey-sy)*step/24), 0)
            ui.x.XFlush(ui.display)
            time.sleep(.035)
        time.sleep(.25)
        alive.screenshot(f'drag-hover-{len(gestures)}.png')
    finally:
        ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
        ui.x.XFlush(ui.display)
    time.sleep(.5)


try:
    alive.windows.focus('Alive')
    ui.wait_for('Select MIDI 1 track')
    # No category click or search: the catalog must be populated on a fresh project.
    drag('Subtractive', 'Select MIDI 1 track')
    ui.wait_for('Select MIDI 1 Subtractive instrument')
    drag('Stereo Utility', 'Device chain drop area')
    ui.wait_for('Select MIDI 1 Stereo Utility effect 1')
    drag('Stereo Lowpass', 'Select MIDI 1 Stereo Utility effect 1', .05)
    ui.wait_for('Select MIDI 1 Stereo Lowpass effect 1')
    ui.wait_for('Select MIDI 1 Stereo Utility effect 2')
    alive.screenshot('native-device-chain.png')
    ui.click('Clip detail')
    ui.click('Select MIDI 1 slot 1')
    ui.keys('Control_L', 'Shift_L', 'm')
    ui.click('Add note')
    ui.text('Note 1 duration', '4')
    saved = ui.output / 'dragged-chain.alive'
    alive.choose_file('Save session as', 'Save Alive Session', saved)
    envelope = json.loads(saved.read_text())
    track = envelope['score']['tracks'][0]
    assert track['chain']['instrument'] is not None
    assert [effect['id'] for effect in track['effects']] == ['org.alive.stereo-lowpass', 'org.alive.utility'], track['effects']
    capture = alive.start_capture('dragged-chain')
    ui.click('Start transport')
    ui.click('Launch MIDI 1 Clip 1')
    time.sleep(3)
    ui.click('Stop transport')
    pcm = alive.finish_capture(capture)
    assert pcm['peak'] > .001, pcm
    assert alive.value('Audio stream errors') == '0'
    assert alive.value('Rejected commands') == '0'
    binary = Path(f'/proc/{ui.pid}/exe').resolve()
    assert binary == Path(os.environ['ULTRA_TEST_ALIVE_BINARY']).resolve()
    library = binary.parent / 'libultra_native.so'
    assert str(library) in Path(f'/proc/{ui.pid}/maps').read_text()
    (ui.output / 'device-drop-report.json').write_text(json.dumps(dict(binary=str(binary), native_library=str(library), gestures=gestures, effects=[e['id'] for e in track['effects']], audio=pcm, stream_errors=0, rejected_commands=0, saved_format=envelope['format'], physical_audio=False), indent=2)+'\n')
except Exception:
    alive.screenshot('device-drop-failure.png')
    raise
