import json, sys, time
from pathlib import Path
sys.path.insert(0,str(Path('apps/ultra/tests').resolve()))
import check_canvas_desktop as ui
import check_documents_desktop as windows
from check_instrument_desktop import export_patch, numeric
windows.focus('initial.ultra - Ultra')
expected=json.loads((ui.output/'initial.ultra').read_text())
assert export_patch()==expected
ui.click('Perform instrument')
ui.wait_for('Tone value')
ui.click('New instance')
for _ in range(80):
    titles=[f.get_name().removeprefix('* ') for f in windows.app_frames()]
    others=[t for t in titles if t!='initial.ultra - Ultra' and t.endswith(' - Ultra')]
    if others: break
    time.sleep(.1)
assert len(others)==1,titles
windows.focus(others[0]); assert export_patch()==expected
ui.click('Perform instrument'); numeric('Tone',1200)
second=export_patch(); assert second['device']==expected['device']
windows.focus('initial.ultra - Ultra'); first=export_patch()
assert first['device']==expected['device'] and first['nodes']!=second['nodes']
(ui.output/'reopen-result.json').write_text(json.dumps({'reopened':True,'first':first['device'],'second':second['device'],'independent':True},indent=2))
print('PASS reopened saved metadata and independent Ultra instance',flush=True)
