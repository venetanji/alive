import json
from pathlib import Path
import check_alive_arrangement as a
ui, alive = a.ui, a.alive
try:
    a.windows.focus('Alive')
    ui.wait_for('MIDI source')
    a.arrangement()
    initial=json.loads((ui.output/'initial.alive').read_text())
    ui.click('Select placement '+initial['placements'][0]['id'])
    alive.transport('start')
    alive.numeric('Pulse Arrangement gain', .613)
    assert float(alive.value('Pulse Arrangement gain')) == .613
    assert a.observed(1,'authority',lambda s:s=='arrangement') == 'arrangement'
    a.arrangement()
    a.capture_window(1440,900,'native-arrangement-gain-1440x900.png')
    a.capture_window(1280,800,'native-arrangement-gain-1280x800.png')
    a.session()
    assert float(alive.value('Pulse gain')) == .613
    a.arrangement()
    alive.transport('stop')
    path,saved=a.save('gain-saved.alive')
    assert saved['tracks'][0]['gain']==.613
    expected=json.loads(json.dumps(initial));expected['tracks'][0]['gain']=.613
    for document in [saved,expected]:
        for track in document['tracks']:
            for device in [track['chain']['instrument']]+track.get('effects',[]):
                device['path']=str((ui.output/device['path']).resolve(strict=True))
    assert saved==expected
    details=alive.detail()
    assert details['Audio stream errors']=='0' and details['Rejected commands']=='0'
    (ui.output/'gain-report.json').write_text(json.dumps({'gain':.613,'only_saved_change':'tracks[0].gain','native':details,'executable':str(Path(f'/proc/{ui.pid}/exe').resolve())},indent=2))
    ui.click('Quit Alive');a.exited(ui.pid)
    print('PASS Arrangement live gain shares Session mixer and saves only intended gain',flush=True)
except Exception:
    alive.screenshot('gain-failure.png')
    raise
