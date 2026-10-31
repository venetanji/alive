import json, os, sys, time
from pathlib import Path
sys.path.insert(0, str(Path.cwd()/'apps/ultra/tests'))
import check_alive_desktop as alive
from gi.repository import Atspi
ui=alive.ui
ui.find=alive.windows.scoped_find
try:
    alive.windows.focus('Alive')
    ui.wait_for('Select MIDI 1 slot 1')
    names={node.get_name() for frame in alive.windows.app_frames() for node in ui.walk(frame)}
    for removed in ('Prepare / Apply','Discard edits','Enable Arrangement','Enable clip bank'):
        assert removed not in names, removed
    ui.click('Devices detail')
    assert ui.wait_for('Load instrument').get_state_set().contains(Atspi.StateType.ENABLED)
    ui.click('Insert Audio Track');ui.wait_for('Select Audio 2 track')
    ui.click('Insert MIDI Track');ui.wait_for('Select MIDI 3 track')
    ui.click('Clip detail');ui.click('Select MIDI 3 slot 1')
    ui.keys('Control_L','Shift_L','m')
    deadline=time.monotonic()+8
    while time.monotonic()<deadline:
        try:
            if ui.numeric_value('Clip End')==4:break
        except (StopIteration,AssertionError):pass
        time.sleep(.1)
    else:raise AssertionError('Installed default did not create a one-bar MIDI clip')
    ui.click('Arrangement workspace');ui.wait_for('Arrangement timeline')
    executable=Path(f'/proc/{ui.pid}/exe').resolve()
    expected=Path(os.environ['ULTRA_TEST_ALIVE_BINARY']).resolve()
    assert executable==expected,(executable,expected)
    library=executable.parent/'libultra_native.so'
    maps=Path(f'/proc/{ui.pid}/maps').read_text()
    assert str(library) in maps, 'Installed process did not load its own native library'
    ui.click('Browse Instruments');ui.click('Subtractive');ui.keys('Return')
    ui.click('Devices detail')
    assert ui.wait_for('Edit selected device in Ultra').get_state_set().contains(Atspi.StateType.ENABLED)
    saved=ui.output/'installed-saved.alive'
    alive.choose_file('Save session as','Save Alive Session',saved)
    document=json.loads(saved.read_text())
    assert document['format']=='alive-session-v6' and document['score']['format']=='alive-session-v4'
    instrument=next(track['chain']['instrument'] for track in document['score']['tracks'] if track['chain'].get('instrument'))
    device=(saved.parent/instrument['path']).resolve(strict=True)
    assert device.is_relative_to(executable.parent.parent), device
    alive.screenshot('installed-default.png')
    (ui.output/'installed-report.json').write_text(json.dumps(dict(binary=str(executable),native_library=str(library),rootless_midi=True,insert_audio=True,insert_midi=True,one_bar_clip=True,arrangement=True,obsolete_controls_absent=True,bundled_instrument=True,device_path=str(device),saved_format=document['format'],synthetic_ipc=False),indent=2)+'\n')
except Exception:
    alive.screenshot('installed-failure.png')
    raise
