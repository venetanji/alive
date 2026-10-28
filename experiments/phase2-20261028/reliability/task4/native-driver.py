import json, os, sys, time
from pathlib import Path
sys.path.insert(0,str(Path('apps/ultra/tests').resolve()))
import check_canvas_desktop as ui
import check_documents_desktop as windows
from gi.repository import Atspi
path=ui.output/'initial.ultra'
before=json.loads(path.read_text())
windows.focus('initial.ultra - Ultra')
ui.click('Perform instrument')
ui.text('Device name','Renamed')
ui.click('Package device')
ui.keys('Control_L','s')
for _ in range(100):
    saved=json.loads(path.read_text())
    if saved['device']['name']=='Renamed': break
    time.sleep(.1)
assert saved['device']==dict(before['device'],name='Renamed'),saved['device']
assert saved['nodes']==before['nodes'] and saved['edges']==before['edges']
(ui.output/'metadata-result.json').write_text(json.dumps({'device':saved['device']},indent=2))
print('PASS native rename and save retained metadata and graph',flush=True)
