#!/usr/bin/env python3
"""Focused-draft native scenarios; run only under the private desktop harness."""
import ctypes as C
import json
import os
from pathlib import Path
import re
import time

import check_canvas_desktop as ui
import check_documents_desktop as documents
from gi.repository import Atspi

output = ui.output
path = output / 'initial.ultra'
root_title = path.name + ' - Ultra'
trace = output / 'app.log'


def wait_until(predicate, message):
    for _ in range(120):
        value = predicate()
        if value:
            return value
        time.sleep(.1)
    raise AssertionError(message)


def records():
    lines = trace.read_text(errors='replace').splitlines()
    return [dict(re.findall(r'(event|owner|revision|scope|depth|token|code)=([\w]+)', line))
            for line in lines if line.startswith('ultra-document-trace ')]


def value(number, digits):
    control = ui.wait_for(f'number.legacy value, object {number}')
    assert Atspi.Component.grab_focus(control)
    ui.keys('Control_L', 'a')
    for digit in digits:
        ui.keys(digit)
    observed=Atspi.Text.get_text(control,0,-1)
    assert observed==digits, f'focused number {number} displays {observed!r}, expected {digits!r}'


def root():
    documents.focus(root_title)
    ui.wait_for('Editable patch canvas')


def save_and_wait(expected):
    ui.keys('Control_L', 's')
    wait_until(lambda: json.loads(path.read_text())['nodes'][0]['params']['value'] == expected,
               f'disk root value did not become {expected}')


def cancel_picker():
    def cancel_button():
        for frame in documents.app_frames():
            if frame.get_role_name() not in ('file chooser', 'dialog'):
                continue
            for element in ui.walk(frame):
                if element.get_name() in ('Cancel', '_Cancel') and 'Action' in element.get_interfaces():
                    return element
        return None
    assert Atspi.Action.do_action(wait_until(cancel_button, 'Save As picker did not open'), 0)


def run_save_as():
    root();ui.keys('Control_L', 'e');value(1, '42')
    ui.keys('Control_L', 'Shift_L', 's')
    wait_until(lambda: any(record.get('event') == 'save_begin' and record.get('code') == '1' for record in records()), 'Save As did not start')
    cancel_picker()
    wait_until(lambda: any(record.get('event') == 'save_cancel' for record in records()), 'Save As did not cancel')
    assert json.loads(path.read_text())['nodes'][0]['params']['value'] == 10
    root();save_and_wait(42)
    entries = records();commits = [entry for entry in entries if entry.get('event') == 'commit' and entry.get('code') == '1']
    assert len(commits) == 1, commits
    assert int(commits[0]['revision']) == int(commits[0]['token']) + 1, commits
    (output / 'focused-save-as.json').write_text(json.dumps({'records': entries, 'saved': json.loads(path.read_text())}, indent=2) + '\n')
    print('PASS focused Save As cancellation and subsequent Save', flush=True)


def double_click(name):
    control = ui.wait_for(name);rect = Atspi.Component.get_extents(control, Atspi.CoordType.SCREEN)
    assert ui.t.XTestFakeMotionEvent(ui.display, 0, rect.x + rect.width // 2, rect.y + rect.height // 2, 0)
    for _ in range(2):
        assert ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
        assert ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
        ui.x.XFlush(ui.display);time.sleep(.07)


def titles():
    return [frame.get_name().removeprefix('* ') for frame in documents.app_frames()]


def request_os_close(title):
    class Data(C.Union):
        _fields_=[('bytes',C.c_char*20),('longs',C.c_long*5)]
    class Client(C.Structure):
        _fields_=[('type',C.c_int),('serial',C.c_ulong),('send_event',C.c_int),('display',C.c_void_p),
                  ('window',C.c_ulong),('message_type',C.c_ulong),('format',C.c_int),('data',Data)]
    class Event(C.Union):
        _fields_=[('client',Client),('padding',C.c_long*24)]
    documents.focus(title);focused,revert=C.c_ulong(),C.c_int()
    ui.x.XGetInputFocus(ui.display,C.byref(focused),C.byref(revert))
    ui.x.XInternAtom.argtypes=[C.c_void_p,C.c_char_p,C.c_int];ui.x.XInternAtom.restype=C.c_ulong
    ui.x.XSendEvent.argtypes=[C.c_void_p,C.c_ulong,C.c_int,C.c_long,C.POINTER(Event)]
    event=Event();event.client.type=33;event.client.display=ui.display;event.client.window=focused.value
    event.client.message_type=ui.x.XInternAtom(ui.display,b'WM_PROTOCOLS',0);event.client.format=32
    event.client.data.longs[0]=ui.x.XInternAtom(ui.display,b'WM_DELETE_WINDOW',0)
    assert ui.x.XSendEvent(ui.display,focused.value,0,0,C.byref(event));ui.x.XFlush(ui.display)


def run_child():
    root();double_click('Select or drag p object 3')
    child = wait_until(lambda: next((title for title in titles() if 'boundary' in title and title != root_title), None), 'child window did not open')
    documents.focus(child);assert Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'))
    ui.keys('Control_L', 'e');value(13, '73')
    documents.native_menu('Close Window')
    wait_until(lambda: child not in titles(), 'child did not close')
    entries = records();commits = [entry for entry in entries if entry.get('event') == 'commit' and entry.get('code') == '1']
    assert len(commits) == 1 and int(commits[0]['revision']) == int(commits[0]['token']) + 1, commits
    ack = [entry for entry in entries if entry.get('event') == 'close_ack' and entry.get('code') == '1']
    assert ack and int(ack[-1]['revision']) == int(commits[0]['revision']), entries
    assert entries.index(commits[0]) < entries.index(ack[-1]), entries
    root();ui.keys('Control_L', 's')
    def saved():
        patch = json.loads(path.read_text())
        child_node = next(node for node in patch['nodes'] if node['id'] == 3)
        return patch if child_node['patcher']['nodes'][0]['params']['value'] == 73 else None
    patch = wait_until(saved, 'child value not saved into owner')
    (output / 'focused-child-close.json').write_text(json.dumps({'records': records(), 'saved': patch}, indent=2) + '\n')
    print('PASS focused child close flush, owner revision and Save', flush=True)


def run_linked():
    root();double_click('Select or drag p object 3')
    child=wait_until(lambda:next((title for title in titles() if 'boundary' in title and title!=root_title),None),'child window did not open')
    documents.focus(child);assert Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'))
    ui.keys('Control_L','e');value(13,'73')
    root();assert Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'))
    ui.keys('Control_L','e');value(1,'42');ui.keys('Control_L','s')
    def saved():
        patch=json.loads(path.read_text());nodes=patch['nodes'];child_node=next(node for node in nodes if node['id']==3)
        return patch if nodes[0]['params']['value']==42 and child_node['patcher']['nodes'][0]['params']['value']==73 else None
    patch=wait_until(saved,'linked edits did not both reach disk')
    entries=records();commits=[entry for entry in entries if entry.get('event')=='commit' and entry.get('code')=='1']
    assert len(commits)==2,entries
    assert [int(entry['revision']) for entry in commits]==[1,2],entries
    assert {entry['scope'] for entry in commits}=={'0','3'},entries
    assert all(int(entry['revision'])==int(entry['token'])+1 for entry in commits),entries
    assert next(entry for entry in entries if entry.get('event')=='save_done')['revision']=='2',entries
    (output/'focused-linked.json').write_text(json.dumps({'records':entries,'saved':patch},indent=2)+'\n')
    print('PASS linked root and child edits retain both revisions in saved owner',flush=True)


def run_peer_invalid(reverse=False,save_as=False):
    root();double_click('Select or drag p object 3')
    child=wait_until(lambda:next((title for title in titles() if 'boundary' in title and title!=root_title),None),'child window did not open')
    draft_title,save_title,number=(root_title,child,1) if reverse else (child,root_title,13)
    documents.focus(draft_title);assert Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'))
    ui.keys('Control_L','e');control=ui.wait_for(f'number.legacy value, object {number}');assert Atspi.Component.grab_focus(control)
    ui.keys('Control_L','a');ui.keys('BackSpace')
    assert Atspi.Text.get_text(control,0,-1)=='', 'peer draft was not empty'
    documents.focus(save_title);assert Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'))
    ui.keys('Control_L','Shift_L','s') if save_as else ui.keys('Control_L','s')
    wait_until(lambda:any(entry.get('event') in ('save_begin','save_refused') for entry in records()),'Save result not observed')
    entries=records();assert not any(entry.get('event')=='save_begin' for entry in entries),entries
    documents.focus(draft_title);assert Atspi.Text.get_text(ui.wait_for(f'number.legacy value, object {number}'),0,-1)==''
    assert json.loads(path.read_text())['nodes'][1]['patcher']['nodes'][0]['params']['value']==10
    (output/'peer-invalid.json').write_text(json.dumps({'records':entries},indent=2)+'\n')
    print('PASS root Save refuses a parked invalid child draft',flush=True)


def run_peer_valid(reverse=False):
    root();double_click('Select or drag p object 3')
    child=wait_until(lambda:next((title for title in titles() if 'boundary' in title and title!=root_title),None),'child window did not open')
    draft_title,save_title,number,digits=(root_title,child,1,'42') if reverse else (child,root_title,13,'73')
    documents.focus(draft_title);assert Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'))
    ui.keys('Control_L','e');value(number,digits)
    documents.focus(save_title);assert Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'));ui.keys('Control_L','s')
    def saved():
        patch=json.loads(path.read_text());node=patch['nodes'][0] if reverse else patch['nodes'][1]['patcher']['nodes'][0]
        return patch if node['params']['value']==int(digits) else None
    patch=wait_until(saved,'linked valid draft did not reach disk');entries=records()
    commits=[entry for entry in entries if entry.get('event')=='commit' and entry.get('code')=='1']
    assert len(commits)==1 and commits[0]['revision']=='1',entries
    acks=[entry for entry in entries if entry.get('event')=='save_ack' and entry.get('code')=='1']
    assert {entry['scope'] for entry in acks}=={'0','3'},entries
    begin=next(entry for entry in entries if entry.get('event')=='save_begin')
    assert begin['revision']=='1' and entries.index(commits[0])<entries.index(begin),entries
    assert all(entries.index(ack)<entries.index(begin) for ack in acks),entries
    (output/'peer-valid.json').write_text(json.dumps({'records':entries,'saved':patch},indent=2)+'\n')
    print('PASS linked valid edit admitted once before Save snapshot',flush=True)


def run_overlapping_saves():
    root();double_click('Select or drag p object 3')
    child=wait_until(lambda:next((title for title in titles() if 'boundary' in title and title!=root_title),None),'child window did not open')
    root();ui.keys('Control_L','e');value(1,'42');ui.keys('Control_L','Shift_L','s')
    wait_until(lambda:any(entry.get('event')=='save_begin' and entry.get('code')=='1' for entry in records()),'Save As did not start')
    documents.focus(child);assert Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'));ui.keys('Control_L','s')
    ui.wait_for('A Save is already in progress for this patch',text_content=True)
    assert len([entry for entry in records() if entry.get('event')=='save_begin'])==1,records()
    cancel_picker();wait_until(lambda:any(entry.get('event')=='save_cancel' for entry in records()),'Save As did not cancel')
    documents.focus(child);assert Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'));ui.keys('Control_L','s')
    wait_until(lambda:json.loads(path.read_text())['nodes'][0]['params']['value']==42,'retry Save did not write owner')
    entries=records();assert len([entry for entry in entries if entry.get('event')=='save_begin'])==2,entries
    (output/'overlapping-saves.json').write_text(json.dumps({'records':entries,'saved':json.loads(path.read_text())},indent=2)+'\n')
    print('PASS same-owner concurrent Save refused until picker cancellation',flush=True)


def run_picker_edit():
    root();double_click('Select or drag p object 3')
    child=wait_until(lambda:next((title for title in titles() if 'boundary' in title and title!=root_title),None),'child window did not open')
    root();ui.keys('Control_L','e');value(1,'42');ui.keys('Control_L','Shift_L','s')
    wait_until(lambda:any(entry.get('event')=='save_begin' and entry.get('code')=='1' for entry in records()),'Save As did not start')
    documents.focus(child);assert Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'))
    ui.keys('Control_L','e');value(13,'73');ui.keys('Return')
    wait_until(lambda:any(entry.get('event')=='commit' and entry.get('revision')=='2' for entry in records()),'child edit did not commit while picker open')
    destination=output/'picker-snapshot.ultra';documents.focus('Save Ultra Patch')
    for _ in range(20):
        try:
            documents.scoped_find('Native filename entry');break
        except StopIteration:
            ui.keys('slash')
    ui.text('Native filename entry',str(destination.resolve()));ui.keys('Return')
    patch=wait_until(lambda:json.loads(destination.read_text()) if destination.exists() else None,'Save As did not write snapshot')
    assert patch['nodes'][0]['params']['value']==42 and patch['nodes'][1]['patcher']['nodes'][0]['params']['value']==10,patch
    wait_until(lambda:any(frame.get_name().startswith('* ') and destination.name in frame.get_name() for frame in documents.app_frames()),'newer edit did not remain dirty')
    renamed=wait_until(lambda:next((title for title in titles() if 'boundary' in title and destination.name in title),None),'child title did not follow Save As')
    documents.focus(renamed);assert Atspi.Text.get_text(ui.wait_for('number.legacy value, object 13'),0,-1)=='73'
    entries=records();assert next(entry for entry in entries if entry.get('event')=='save_begin')['revision']=='1',entries
    assert next(entry for entry in entries if entry.get('event')=='save_done')['revision']=='2',entries
    (output/'picker-edit.json').write_text(json.dumps({'records':entries,'saved':patch,'child':73,'dirty':True},indent=2)+'\n')
    print('PASS edit during Save As keeps newer owner dirty',flush=True)


def run_quit():
    root();ui.click('File');ui.wait_for('Quit Ultra');ui.keys('Escape')
    root();ui.keys('Control_L', 'e');value(1, '42');ui.keys('Control_L', 'q')
    documents.focus('Unsaved Patch');ui.click('Cancel');root()
    assert json.loads(path.read_text())['nodes'][0]['params']['value'] == 10
    ui.keys('Control_L', 'q');documents.focus('Unsaved Patch');ui.click('Save')
    wait_until(lambda: json.loads(path.read_text())['nodes'][0]['params']['value'] == 42, 'Quit Save did not persist focused draft')
    entries=records();commits=[entry for entry in entries if entry.get('event')=='commit' and entry.get('code')=='1']
    assert len(commits)==1 and int(commits[0]['revision'])==int(commits[0]['token'])+1, entries
    assert any(entry.get('event')=='quit_prepare' for entry in entries),entries
    acks=[entry for entry in entries if entry.get('event')=='close_ack' and entry.get('code')=='1']
    assert acks and int(acks[0]['revision'])==int(commits[0]['revision']),entries
    assert entries.index(commits[0])<entries.index(acks[0]),entries
    def exited():
        status=Path(f'/proc/{ui.pid}/status')
        return not status.exists() or '\nState:\tZ' in status.read_text()
    wait_until(exited,'Quit did not exit the application')
    (output/'focused-quit.json').write_text(json.dumps({'records':entries,'saved':json.loads(path.read_text())},indent=2)+'\n')
    print('PASS focused Quit Cancel followed by Save',flush=True)


def run_quit_discard():
    root();ui.keys('Control_L','e');value(1,'42');ui.keys('Control_L','q')
    documents.focus('Unsaved Patch');ui.click('Discard')
    def exited():
        status=Path(f'/proc/{ui.pid}/status')
        return not status.exists() or '\nState:\tZ' in status.read_text()
    wait_until(exited,'Quit Discard did not exit the application')
    saved=json.loads(path.read_text());assert saved['nodes'][0]['params']['value']==10
    entries=records();commits=[entry for entry in entries if entry.get('event')=='commit' and entry.get('code')=='1']
    assert len(commits)==1 and int(commits[0]['revision'])==int(commits[0]['token'])+1,entries
    assert any(entry.get('event')=='close_ack' and entry.get('revision')==commits[0]['revision'] for entry in entries),entries
    (output/'focused-quit-discard.json').write_text(json.dumps({'records':entries,'saved':saved},indent=2)+'\n')
    print('PASS focused Quit Discard leaves disk unchanged',flush=True)


def run_close(discard=False):
    root();ui.keys('Control_L','e');value(1,'42');documents.native_menu('Close Window')
    documents.focus('Unsaved Patch')
    if not discard:
        ui.click('Cancel');root();assert json.loads(path.read_text())['nodes'][0]['params']['value']==10
        documents.native_menu('Close Window');documents.focus('Unsaved Patch')
    ui.click('Discard' if discard else 'Save')
    wait_until(lambda:root_title not in titles(),'owner did not close')
    saved=json.loads(path.read_text());assert saved['nodes'][0]['params']['value']==(10 if discard else 42)
    entries=records();commits=[entry for entry in entries if entry.get('event')=='commit' and entry.get('code')=='1']
    acks=[entry for entry in entries if entry.get('event')=='close_ack' and entry.get('code')=='1']
    assert len(commits)==1 and int(commits[0]['revision'])==int(commits[0]['token'])+1,entries
    assert acks and acks[0]['revision']==commits[0]['revision'] and entries.index(commits[0])<entries.index(acks[0]),entries
    (output/'focused-close.json').write_text(json.dumps({'records':entries,'saved':saved},indent=2)+'\n')
    print('PASS focused close '+('Discard' if discard else 'Cancel followed by Save'),flush=True)


def run_reopen():
    root();assert Atspi.Text.get_text(ui.wait_for('number.legacy value, object 1'),0,-1)=='42'
    double_click('Select or drag p object 3')
    child=wait_until(lambda:next((title for title in titles() if 'boundary' in title and title!=root_title),None),'child window did not reopen')
    documents.focus(child)
    assert Atspi.Text.get_text(ui.wait_for('number.legacy value, object 13'),0,-1)=='73'
    (output/'focused-reopen.json').write_text(json.dumps({'root':42,'child':73},indent=2)+'\n')
    print('PASS restarted owner and child display saved values',flush=True)


def run_os_close(invalid=False):
    root();ui.keys('Control_L','e')
    if invalid:
        control=ui.wait_for('number.legacy value, object 1');assert Atspi.Component.grab_focus(control)
        ui.keys('Control_L','a');ui.keys('BackSpace');assert Atspi.Text.get_text(control,0,-1)==''
    else:value(1,'42')
    request_os_close(root_title)
    if invalid:
        wait_until(lambda:any(item.get('event')=='close_ack' and item.get('code')=='0' for item in records()),'invalid OS close not rejected')
        assert root_title in titles();root();assert Atspi.Text.get_text(ui.wait_for('number.legacy value, object 1'),0,-1)==''
        assert json.loads(path.read_text())['nodes'][0]['params']['value']==10
    else:
        documents.focus('Unsaved Patch');ui.click('Save');wait_until(lambda:root_title not in titles(),'OS close did not finish')
        assert json.loads(path.read_text())['nodes'][0]['params']['value']==42
        entries=records();commit=next(item for item in entries if item.get('event')=='commit' and item.get('code')=='1')
        ack=next(item for item in entries if item.get('event')=='close_ack' and item.get('code')=='1')
        assert commit['revision']==ack['revision']=='1' and entries.index(commit)<entries.index(ack),entries
    (output/'focused-os-close.json').write_text(json.dumps({'invalid':invalid,'records':records(),'saved':json.loads(path.read_text())},indent=2)+'\n')
    print('PASS focused X11 WM_DELETE_WINDOW '+('invalid refusal' if invalid else 'Save'),flush=True)


if __name__ == '__main__':
    scenario = os.environ['ULTRA_DRAFT_CASE']
    try:
        {'save-as': run_save_as, 'child': run_child, 'linked': run_linked, 'peer-invalid':run_peer_invalid,
         'peer-invalid-as':lambda:run_peer_invalid(save_as=True), 'peer-invalid-reverse':lambda:run_peer_invalid(reverse=True), 'quit': run_quit,
         'peer-valid':run_peer_valid, 'peer-valid-reverse':lambda:run_peer_valid(True), 'overlap-saves':run_overlapping_saves, 'picker-edit':run_picker_edit,
         'quit-discard': run_quit_discard, 'close': run_close, 'close-discard': lambda:run_close(True), 'reopen':run_reopen,
         'os-close':run_os_close, 'os-close-invalid':lambda:run_os_close(True)}[scenario]()
    finally:
        ui.x.XCloseDisplay(ui.display)
