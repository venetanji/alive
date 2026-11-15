import json, os, sys, time
from pathlib import Path
sys.path.insert(0, str(Path('apps/ultra/tests').resolve()))
import check_canvas_desktop as ui
from gi.repository import Atspi
path=ui.output/'initial.ultra'
ui.wait_for('number.legacy value, object 1')
ui.keys('Control_L','e')
target=ui.wait_for('number.legacy value, object 1')
Atspi.Component.grab_focus(target)
ui.keys('Control_L','a')
ui.keys('4')
ui.keys('2')
ui.keys('Control_L','s')
value=None
for _ in range(100):
    patch=json.loads(path.read_text())
    value=patch['nodes'][0]['params']['value']
    if value==42: break
    time.sleep(.1)
result={'status':'passed' if value==42 else 'failed','diskValue':value,'patch':patch}
(ui.output/'focused-result.json').write_text(json.dumps(result,indent=2)+'\n')
assert value==42, result
print('PASS focused number Save writes 42 to disk',flush=True)
