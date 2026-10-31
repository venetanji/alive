"""Installed metadata/refusal acceptance before the real device drop/audio journey.

Run only through check_canvas_desktop.sh's private desktop and software audio.
ALIVE_DEVICE_LIBRARY_PATHS must name an owned temporary fixture directory.
"""
import ctypes as C
import hashlib
import json
import os
from pathlib import Path
import runpy
import time

import check_alive_desktop as alive
from gi.repository import Atspi

ui = alive.ui
ui.find = alive.windows.scoped_find
EXPECTED_LIVE = sorted([
    'Amp', 'Analog', 'Cabinet', 'Collision', 'Corpus', 'Electric', 'Tension',
    'Auto Filter', 'Channel EQ', 'Compressor', 'Delay', 'Drift', 'Drum Buss',
    'Drum Sampler', 'Echo', 'Limiter', 'Redux', 'Reverb', 'Roar',
    'Spectral Resonator', 'Spectral Time', 'Utility',
])


def options():
    return [item.get_name() for item in ui.walk(ui.wait_for('Browser results'))
            if item.get_role_name() == 'list item' or item.get_role_name() == 'option']


def search(text):
    ui.text('Search browser', text)
    time.sleep(.4)


def save(name):
    path = ui.output / name
    alive.choose_file('Save session as', 'Save Alive Session', path)
    return json.loads(path.read_text())['score']


def report_text():
    result = []
    for item in ui.walk(ui.wait_for('Browser results').get_parent().get_parent().get_parent()):
        if 'Text' in item.get_interfaces():
            result.append(Atspi.Text.get_text(item, 0, -1))
    return '\n'.join(result)


def refusal_gestures():
    start = Atspi.Component.get_extents(ui.wait_for('Analog'), Atspi.CoordType.SCREEN)
    end = Atspi.Component.get_extents(ui.wait_for('Select MIDI 1 track'), Atspi.CoordType.SCREEN)
    sx, sy = start.x + start.width // 2, start.y + start.height // 2
    ex, ey = end.x + end.width // 2, end.y + end.height // 2
    ui.t.XTestFakeMotionEvent(ui.display, 0, sx, sy, 0)
    for _ in range(2):
        ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
        ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
        ui.x.XFlush(ui.display)
        time.sleep(.06)
    time.sleep(.2)
    ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
    try:
        for step in range(1, 25):
            ui.t.XTestFakeMotionEvent(ui.display, 0, round(sx + (ex-sx)*step/24), round(sy + (ey-sy)*step/24), 0)
            ui.x.XFlush(ui.display)
            time.sleep(.035)
    finally:
        ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
        ui.x.XFlush(ui.display)
    time.sleep(.3)
    return dict(source='Analog', target='Select MIDI 1 track', start=[sx, sy], end=[ex, ey],
                double_click_interval_seconds=.06, synthetic_ipc=False)


try:
    alive.windows.focus('Alive')
    ui.wait_for('Select MIDI 1 track')
    ui.wait_for('Catalog Fixture One')
    initial_names = options()
    assert sorted(set(initial_names) - {
        'Subtractive', 'Stereo Lowpass', 'Stereo Utility', 'Catalog Fixture One',
    }) == EXPECTED_LIVE, initial_names
    assert len(initial_names) == 26, initial_names
    before = save('catalog-before.alive')
    generation_before = alive.value('Native generation')
    ui.click('Audio details')
    search('Analog')
    assert options() == ['Analog'], options()
    ui.click('Analog')
    ui.keys('Return')
    refusal_input = refusal_gestures()
    disabled = ui.wait_for('Load Instrument')
    assert not disabled.get_state_set().contains(Atspi.StateType.ENABLED)
    reason = 'Alive native-source ownership and transport admission are pending'
    assert reason in report_text(), report_text()

    helper = Path(__file__).with_name('check_alive_device_drop.py')

    captures = []
    window = alive.owned_frame_window()
    ui.x.XResizeWindow.argtypes = [C.c_void_p, C.c_ulong, C.c_uint, C.c_uint]
    ui.x.XGetWindowAttributes.argtypes = [C.c_void_p, C.c_ulong, C.POINTER(alive.WindowAttributes)]
    for width, height in [(800, 600), (1280, 800)]:
        ui.x.XResizeWindow(ui.display, window, width, height)
        ui.x.XMoveWindow(ui.display, window, 0, 0)
        ui.x.XFlush(ui.display)
        time.sleep(.6)
        attributes = alive.WindowAttributes()
        assert ui.x.XGetWindowAttributes(ui.display, window, C.byref(attributes))
        assert [attributes.width, attributes.height] == [width, height]
        controls = {}
        for name in ['Refresh Library', 'Search browser', 'Analog', 'Load Instrument']:
            control = ui.wait_for(name)
            rect = Atspi.Component.get_extents(control, Atspi.CoordType.SCREEN)
            assert control.get_state_set().contains(Atspi.StateType.SHOWING)
            assert rect.x >= 0 and rect.y >= 0 and rect.x + rect.width <= width and rect.y + rect.height <= height, (name, rect)
            controls[name] = [rect.x, rect.y, rect.width, rect.height]
        reason_nodes = [item for item in ui.walk(ui.wait_for('Browser results').get_parent().get_parent().get_parent())
                        if 'Text' in item.get_interfaces()
                        and reason in Atspi.Text.get_text(item, 0, -1)
                        and item.get_state_set().contains(Atspi.StateType.SHOWING)]
        reason_bounds = [Atspi.Component.get_extents(item, Atspi.CoordType.SCREEN) for item in reason_nodes]
        assert any(rect.width > 0 and rect.height > 0 and rect.x >= 0 and rect.y >= 0
                   and rect.x + rect.width <= width and rect.y + rect.height <= height for rect in reason_bounds), reason_bounds
        controls['unavailable_reason'] = [[rect.x, rect.y, rect.width, rect.height] for rect in reason_bounds]
        image = ui.Gdk.pixbuf_get_from_window(ui.Gdk.get_default_root_window(), 0, 0, width, height)
        image.savev(str(ui.output / f'native-catalog-{width}x{height}.png'), 'png', [], [])
        captures.append(dict(viewport=[width, height], controls=controls))

    # Add a second authored device after indexing, proving refresh invalidates cache.
    library = Path(os.environ['ALIVE_DEVICE_LIBRARY_PATHS'])
    assert library.is_relative_to('/tmp') and library.name.startswith('alive-catalog-')
    fixture = json.loads((library / 'one.ultra').read_text())
    fixture['device'].update(id='org.alive.catalog-fixture-two', name='Catalog Fixture Two')
    (library / 'two.ultra').write_text(json.dumps(fixture))
    search('Catalog Fixture')
    assert options() == ['Catalog Fixture One'], options()
    ui.click('Refresh Library')
    ui.wait_for('Catalog Fixture Two')
    assert options() == ['Catalog Fixture One', 'Catalog Fixture Two'], options()
    search('Analog')
    ui.click('Analog')
    after = save('catalog-after.alive')
    assert after == before, (before, after)
    assert alive.value('Native generation') == generation_before
    assert alive.value('Rejected commands') == '0'
    ui.click('Audio details')
    binary = Path(f'/proc/{ui.pid}/exe').resolve()
    manifest = json.loads((binary.parent.parent / 'source-build-manifest.json').read_text())
    digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
    for name, expected in manifest['artifacts'].items():
        assert digest(binary.parent / name) == expected, name
    native = binary.parent / 'libultra_native.so'
    maps = Path(f'/proc/{ui.pid}/maps').read_text()
    assert str(native) in maps and '.dll' not in maps and '.mxe64' not in maps
    (ui.output / 'catalog-report.json').write_text(json.dumps(dict(
        initial_entries=initial_names, live_candidate_count=22, bundled_count=3,
        initial_user_count=1, refreshed_user_count=2, analog_reason=reason,
        disabled_load=True, blocked_inputs=['Enter', 'double click', 'pointer drag'],
        refusal_input=refusal_input,
        accepted_score_unchanged=True, native_generation=generation_before,
        rejected_commands=0, native_library=str(native), binary=str(binary),
        source_commit=manifest['source_commit'], artifact_hashes=manifest['artifacts'],
        captures=captures, physical_audio=False,
    ), indent=2) + '\n')
    search('')
    runpy.run_path(str(helper), run_name='__main__')
except Exception:
    alive.screenshot('catalog-failure.png')
    raise
