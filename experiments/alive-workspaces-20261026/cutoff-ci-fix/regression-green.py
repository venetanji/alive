import sys,time,json,ctypes as C
from pathlib import Path
sys.path.insert(0,str(Path('apps/ultra/tests').resolve()))
import check_alive_desktop as j
ui,windows=j.ui,j.windows
windows.focus('Alive')
ui.wait_for('Start transport')
source=Path('/tmp/alive-cutoff-ci-fix-20261026/rebased.alive')
j.choose_file('Open session','Open Alive Session',source)
assert j.value('Note 13 pitch')=='81' and j.value('Note 13 beat')=='2.25'
j.transport('start')
assert float(j.value('Cutoff base'))==1333
assert float(j.value('Pulse gain'))==.55
name='Select Pulse Stereo Lowpass effect 2'
j.force_covering_tooltip(name,'Devices detail',kind='device selection')
ui.click(name)
r=ui.Atspi.Component.get_extents(ui.find(name),ui.Atspi.CoordType.SCREEN)
rows=[{'label':'clicked','rect':[r.x,r.y,r.width,r.height]}]
for delay in [.01,.04,.1,.2,.4]:
 time.sleep(delay)
 c=ui.find(name);r=ui.Atspi.Component.get_extents(c,ui.Atspi.CoordType.SCREEN)
 rows.append({'label':str(delay),'rect':[r.x,r.y,r.width,r.height],'states':[s.value_nick for s in c.get_state_set().get_states()],'value':j.value('Cutoff base'),'path':j.native_hit_path(r.x+r.width//2,r.y+r.height//2)})
 (ui.output/'selector.json').write_text(json.dumps(rows,indent=2))
j.screenshot('selector.png')
print(json.dumps(rows,indent=2),flush=True)
assert float(j.value('Cutoff base'))==2000
