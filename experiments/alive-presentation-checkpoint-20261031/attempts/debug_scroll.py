import check_alive_desktop as alive
import json,time
from gi.repository import Atspi
ui=alive.ui
alive.windows.focus('Alive')
ui.click('Devices detail')
ui.click('Select Pulse track')
window=alive.owned_frame_window()
ui.x.XResizeWindow(ui.display,window,800,600)
ui.x.XFlush(ui.display)
time.sleep(.8)
items=[]
for frame in alive.windows.app_frames():
    for node in ui.walk(frame):
        rect=Atspi.Component.get_extents(node,Atspi.CoordType.SCREEN) if 'Component' in node.get_interfaces() else None
        items.append({'name':node.get_name(),'role':node.get_role_name(),'interfaces':node.get_interfaces(),'bounds':[rect.x,rect.y,rect.width,rect.height] if rect else None})
(ui.output/'tree.json').write_text(json.dumps(items,indent=2))
alive.screenshot('before.png')
ui.t.XTestFakeMotionEvent(ui.display,0,500,350,0)
code=ui.x.XKeysymToKeycode(ui.display,ui.x.XStringToKeysym(b'Shift_L'))
ui.t.XTestFakeKeyEvent(ui.display,code,1,0)
for _ in range(12):
 ui.t.XTestFakeButtonEvent(ui.display,5,1,0)
 ui.t.XTestFakeButtonEvent(ui.display,5,0,0)
ui.t.XTestFakeKeyEvent(ui.display,code,0,0)
ui.x.XFlush(ui.display)
time.sleep(.5)
alive.screenshot('after.png')
rect=Atspi.Component.get_extents(ui.wait_for('Level base'),Atspi.CoordType.SCREEN)
print('Level after shift wheel:',[rect.x,rect.y,rect.width,rect.height])
