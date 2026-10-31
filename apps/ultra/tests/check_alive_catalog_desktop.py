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
from chooser_observation import find_web_ancestor, planned_hit_path
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


def bounds(control):
    rect = Atspi.Component.get_extents(control, Atspi.CoordType.SCREEN)
    return [rect.x, rect.y, rect.width, rect.height]


def selected_names():
    return [item.get_name() for item in ui.walk(ui.wait_for('Browser results'))
            if item.get_role_name() in ('list item', 'option')
            and item.get_state_set().contains(Atspi.StateType.SELECTED)]


def descends_from(control, ancestor):
    for _ in range(32):
        if control is None:
            return False
        if control == ancestor:
            return True
        control = control.get_parent()
    return False


def automatic_instrument_admission(library, fixture, original):
    """Exercise cached-file refusal and the compound track history via real UI."""
    ui.click('Insert Audio Track')
    ui.wait_for('Select Audio 2 track')
    ui.click('Select Audio 2 track')
    before = save('catalog-automatic-baseline.alive')
    generation = alive.value('Native generation')
    path = library / 'two.ultra'
    authored = json.dumps(fixture)
    refused = []
    search('Catalog Fixture Two')
    ui.click('Catalog Fixture Two')
    history_state = lambda: {
        name: ui.wait_for(name).get_state_set().contains(Atspi.StateType.ENABLED)
        for name in ['Undo', 'Redo']
    }
    initial_history = history_state()
    for failure in ['missing', 'invalid', 'unsupported']:
        if failure == 'missing':
            path.unlink()
        elif failure == 'invalid':
            path.write_text('invalid saved JSON')
        else:
            changed = json.loads(authored)
            changed['nodes'].append(dict(id=99, type='voice', x=0, y=0, params={}))
            path.write_text(json.dumps(changed))
        try:
            # No refresh: this remains the ready descriptor captured before mutation.
            ui.click('Catalog Fixture Two')
            ui.keys('Return')
            needle = {'missing': 'Cannot open', 'invalid': 'not valid JSON', 'unsupported': 'does not support legacy Voice'}[failure]
            reason = alive.wait_value('Session status', lambda text: needle in text)
            assert ui.wait_for('Select Audio 2 track').get_state_set().contains(Atspi.StateType.PRESSED)
            assert selected_names() == ['Catalog Fixture Two'], selected_names()
            assert history_state() == initial_history
            assert alive.value('Native generation') == generation
            assert save(f'catalog-automatic-refused-{failure}.alive') == before
            refused.append(dict(failure=failure, reason=reason, accepted_score_unchanged=True,
                                native_generation_unchanged=True, selected_track='Audio 2',
                                history_controls=initial_history))
        finally:
            path.write_text(authored)
    ui.click('Catalog Fixture Two')
    ui.keys('Return')
    ui.wait_for('Select MIDI 3 Catalog Fixture Two instrument')
    loaded = save('catalog-automatic-loaded.alive')
    assert len(loaded['tracks']) == 3
    created = loaded['tracks'][2]
    assert created['chain']['instrument'] is not None
    captured = created['chain']['instrument']['instanceId']
    ui.click('Undo')
    ui.wait_for('Select Audio 2 track')
    assert save('catalog-automatic-undone.alive') == before
    ui.click('Redo')
    ui.wait_for('Select MIDI 3 track')
    redone = save('catalog-automatic-redone.alive')
    assert redone == loaded
    assert redone['tracks'][2]['chain']['instrument']['instanceId'] == captured
    # Restore the original empty MIDI fixture for the existing drag/audio journey.
    ui.click('Undo')
    ui.wait_for('Select Audio 2 track')
    ui.click('Undo')
    ui.wait_for('Select MIDI 1 track')
    assert save('catalog-automatic-restored.alive') == original
    if ui.wait_for('Audio details').get_state_set().contains(Atspi.StateType.EXPANDED):
        ui.click('Audio details')
    return dict(refusals=refused, success_track_count=3, compound_undo_redo=True,
                captured_instance_id=captured, original_fixture_restored=True,
                synthetic_ipc=False)


def unfiltered_layout(width, height):
    search('')
    results = ui.wait_for('Browser results')
    assert len(options()) >= 26, options()
    Atspi.Component.grab_focus(results)
    ui.keys('Home')
    time.sleep(.2)
    first_name, last_name = options()[0], options()[-1]
    assert selected_names() == [first_name], selected_names()
    list_bounds = bounds(results)
    first_initial = bounds(ui.wait_for(first_name))
    last_initial = bounds(ui.wait_for(last_name))
    assert not (list_bounds[1] <= last_initial[1] and last_initial[1] + last_initial[3] <= list_bounds[1] + list_bounds[3]), (list_bounds, last_initial)
    ui.keys('End')
    time.sleep(.2)
    assert selected_names() == [last_name], selected_names()
    last_scrolled = bounds(ui.wait_for(last_name))
    list_bounds = bounds(results)
    assert list_bounds[1] <= last_scrolled[1] and last_scrolled[1] + last_scrolled[3] <= list_bounds[1] + list_bounds[3], (list_bounds, last_scrolled)
    assert last_scrolled != last_initial, (last_initial, last_scrolled)

    load = ui.wait_for('Add Effect')  # The last installed candidate is Utility.
    assert last_name == 'Utility', last_name
    load_bounds = bounds(load)
    browser = results.get_parent().get_parent().get_parent()
    footer_text = []
    for item in ui.walk(browser):
        if descends_from(item, results) or 'Text' not in item.get_interfaces() or not Atspi.Text.get_text(item, 0, -1).strip():
            continue
        rect = bounds(item)
        if rect[2] > 0 and rect[3] > 0 and rect[1] >= list_bounds[1] + list_bounds[3]:
            footer_text.append((item, rect))
    descriptions = [(item, rect) for item, rect in footer_text if rect[1] + rect[3] <= load_bounds[1]]
    statuses = [(item, rect) for item, rect in footer_text if rect[1] >= load_bounds[1] + load_bounds[3]]
    assert descriptions and statuses, (list_bounds, load_bounds, [(item.get_name(), rect) for item, rect in footer_text])
    controls = [('description', *descriptions[0]), ('load', load, load_bounds), ('status', *statuses[0])]
    web, _ = find_web_ancestor(load)
    assert web is not None
    hits = []
    for label, control, rect in controls:
        assert rect[0] >= 0 and rect[1] >= 0 and rect[0] + rect[2] <= width and rect[1] + rect[3] <= height, (label, rect)
        assert list_bounds[1] + list_bounds[3] <= rect[1], (label, list_bounds, rect)
        for fraction in [.2, .5, .8]:
            px, py = round(rect[0] + rect[2] * fraction), rect[1] + rect[3] // 2
            hit_nodes = [web]
            def child_at_point(node):
                child = Atspi.Component.get_accessible_at_point(node, px, py, Atspi.CoordType.SCREEN)
                if child is not None:
                    hit_nodes.append(child)
                return child
            hit = planned_hit_path(web, child_at_point)
            assert hit['status'] == 'complete', hit
            assert not any(node['role'] in ('list item', 'option', 'list box') for node in hit['path']), hit
            assert descends_from(hit_nodes[-1], control), (label, hit)
            hits.append(dict(control=label, point=[px, py], hit=hit))

    def capture(name):
        image = ui.Gdk.pixbuf_get_from_window(ui.Gdk.get_default_root_window(), 0, 0, width, height)
        image.savev(str(ui.output / name), 'png', [], [])

    def park_pointer():
        # Native row tooltips can overlap the footer without any list paint leak.
        assert ui.t.XTestFakeMotionEvent(ui.display, 0, width - 100, height - 100, 0)
        ui.x.XFlush(ui.display)
        time.sleep(.3)

    # Scroll without changing selection: any row painted over the footer changes
    # these pixels, even when the footer remains the top accessibility hit target.
    band_top = list_bounds[1] + list_bounds[3] + 1
    band_bottom = max(rect[1] + rect[3] for _, _, rect in controls)
    def footer_pixels():
        image = ui.Gdk.pixbuf_get_from_window(ui.Gdk.get_default_root_window(), list_bounds[0], band_top, list_bounds[2], band_bottom - band_top)
        return bytes(image.get_pixels())

    def settled_footer_pixels():
        # WebKit's native overlay scrollbar fades after selection/scroll activity.
        previous = footer_pixels()
        stable_since = time.monotonic()
        deadline = stable_since + 6
        while time.monotonic() < deadline:
            time.sleep(.15)
            current = footer_pixels()
            if current != previous:
                previous = current
                stable_since = time.monotonic()
            elif time.monotonic() - stable_since >= 2:
                return current
        raise AssertionError('Native footer pixels did not settle before capture')

    park_pointer()
    before_pixels = settled_footer_pixels()
    capture(f'native-catalog-unfiltered-scrolled-{width}x{height}.png')
    assert ui.t.XTestFakeMotionEvent(ui.display, 0, list_bounds[0] + list_bounds[2] // 2, list_bounds[1] + list_bounds[3] // 2, 0)
    for _ in range(40):
        assert ui.t.XTestFakeButtonEvent(ui.display, 4, 1, 0)
        assert ui.t.XTestFakeButtonEvent(ui.display, 4, 0, 0)
    ui.x.XFlush(ui.display)
    time.sleep(.3)
    park_pointer()
    first_scrolled = bounds(ui.wait_for(first_name))
    assert list_bounds[1] <= first_scrolled[1] and first_scrolled[1] + first_scrolled[3] <= list_bounds[1] + list_bounds[3], (list_bounds, first_scrolled)
    assert selected_names() == [last_name], selected_names()
    after_pixels = settled_footer_pixels()
    assert before_pixels == after_pixels, 'Scrolling list rows changed the selected-device footer pixels'
    capture(f'native-catalog-unfiltered-top-{width}x{height}.png')
    return dict(viewport=[width, height], entries=len(options()), list_bounds=list_bounds,
                first=first_name, last=last_name, first_initial=first_initial,
                last_initial=last_initial, last_scrolled=last_scrolled, first_scrolled=first_scrolled,
                footer_controls={label: rect for label, _, rect in controls}, footer_hits=hits,
                scroll_input=dict(keys=['Home', 'End'], pointer_wheel_up=40, synthetic_ipc=False),
                footer_paint_unchanged_on_scroll=True,
                footer_pixel_stability_seconds=2,
                footer_sha256=hashlib.sha256(before_pixels).hexdigest())


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
    unfiltered_captures = []
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
        unfiltered_captures.append(unfiltered_layout(width, height))
        search('Analog')
        ui.click('Analog')
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
        captures=captures, unfiltered_captures=unfiltered_captures, physical_audio=False,
    ), indent=2) + '\n')
    transaction = automatic_instrument_admission(library, fixture, before)
    report_path = ui.output / 'catalog-report.json'
    report = json.loads(report_path.read_text())
    report['automatic_instrument_transaction'] = transaction
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    search('')
    runpy.run_path(str(helper), run_name='__main__')
except Exception:
    alive.screenshot('catalog-failure.png')
    raise
