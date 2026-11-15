import json, sys, time
from pathlib import Path
sys.path.insert(0,str(Path('apps/ultra/tests').resolve()))
import check_canvas_desktop as ui
import check_alive_desktop as alive
import check_documents_desktop as windows
windows.focus('Alive')
ui.click('Devices detail')
ui.wait_for('Select Pulse Renamed instrument')
ui.click('Select Pulse Renamed instrument')
alive.numeric('Tone base',1200)
alive.select_clip('Harmony')
ui.click('Select Harmony Renamed instrument')
alive.numeric('Tone base',3400)
alive.select_clip('Pulse')
ui.click('Select Pulse Renamed instrument')
alive.wait_value('Tone base',lambda s:float(s)==1200)
alive.select_clip('Harmony')
ui.click('Select Harmony Renamed instrument')
alive.wait_value('Tone base',lambda s:float(s)==3400)
print('PASS two hosted references expose independent authored Tone parameter',flush=True)
