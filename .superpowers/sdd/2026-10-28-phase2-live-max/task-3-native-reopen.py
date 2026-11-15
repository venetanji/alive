import json, sys
from pathlib import Path
sys.path.insert(0,str(Path('apps/ultra/tests').resolve()))
import check_canvas_desktop as ui
from gi.repository import Atspi
field=ui.wait_for('number.legacy value, object 1')
text=Atspi.Text.get_text(field,0,-1)
(ui.output/'reopen-result.json').write_text(json.dumps({'value':text},indent=2)+'\n')
assert text=='42',repr(text)
print('PASS reopened owner displays 42',flush=True)
import os, subprocess, time
ui.click('File')
item=ui.wait_for('Close Window')
assert Atspi.Action.do_action(item,0)
for _ in range(100):
    try: os.kill(ui.pid,0)
    except ProcessLookupError: break
    time.sleep(.1)
mount=Path(os.environ['XDG_RUNTIME_DIR'])/'doc'
if os.path.ismount(mount):
    subprocess.run(['fusermount3','-u',str(mount)],check=True)
