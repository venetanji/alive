import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd() / 'apps/ultra/tests'))
import ctypes as C
import json
import time
import check_alive_desktop as alive
from gi.repository import Atspi
ui, windows = alive.ui, alive.windows


def activate(name):
    ui.click(name)


def pointer_activate(name):
    control=ui.wait_for(name)
    rect=Atspi.Component.get_extents(control,Atspi.CoordType.SCREEN)
    ui.t.XTestFakeMotionEvent(ui.display,0,rect.x+rect.width//2,rect.y+rect.height//2,0)
    ui.t.XTestFakeButtonEvent(ui.display,1,1,0)
    ui.t.XTestFakeButtonEvent(ui.display,1,0,0)
    ui.x.XFlush(ui.display)
    time.sleep(.2)


def disclose(name, opened):
    item = ui.wait_for(name)
    if item.get_state_set().contains(Atspi.StateType.EXPANDED) != opened:
        activate(name)


def main_window():
    root = C.c_ulong(); parent = C.c_ulong(); children = C.POINTER(C.c_ulong)(); count = C.c_uint()
    ui.x.XQueryTree(ui.display, ui.x.XDefaultRootWindow(ui.display), C.byref(root), C.byref(parent), C.byref(children), C.byref(count))
    try:
        for index in range(count.value):
            name = C.c_char_p()
            if ui.x.XFetchName(ui.display, children[index], C.byref(name)) and name.value:
                text = name.value.decode('utf-8').removeprefix('* ')
                ui.x.XFree(name)
                if text == 'Alive':
                    return children[index]
    finally:
        if children: ui.x.XFree(children)
    raise AssertionError('No Alive native main window')


def capture(name, width, height):
    xid=main_window()
    ui.x.XMoveWindow(ui.display,xid,0,0)
    ui.x.XResizeWindow(ui.display,xid,width,height)
    ui.x.XFlush(ui.display)
    time.sleep(.35)
    root=ui.Gdk.get_default_root_window()
    ui.Gdk.pixbuf_get_from_window(root,0,0,width,height).savev(str(ui.output/name),'png',[],[])




windows.focus(alive.MAIN)
ui.wait_for('Select Pulse slot 1')
capture('native-session-1440x900.png',1440,900)
capture('native-session-1280x800.png',1280,800)
ui.click('Quit Alive')
