import json,time
import check_alive_desktop as alive
ui=alive.ui
report={'scope':'private software PipeWire; UI readings are interval peaks, not PCM or physical clipping'}
try:
    alive.windows.focus(alive.MAIN)
    ui.click('Start transport')
    deadline=time.monotonic()+12
    left=right=''
    while time.monotonic()<deadline:
        left=alive.value('Master left peak');right=alive.value('Master right peak')
        try:
            if float(left.split()[1])>0 or float(right.split()[1])>0:break
        except (IndexError,ValueError):pass
        time.sleep(.1)
    else: raise AssertionError((left,right,alive.value('Session status')))
    report.update(left=left,right=right,status=alive.value('Master output status'))
    alive.numeric('Master gain',.5)
    report['gain_status']=alive.wait_value('Master output status',lambda s:'Saved target -6.0 dB' in s and 'applied -6.0 dB' in s)
    ui.click('Stop transport')
    report['stop']='clicked'
    (ui.output/'playing-master.json').write_text(json.dumps(report,indent=2))
except Exception:
    alive.screenshot('playing-master-failure.png')
    raise
