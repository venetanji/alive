#!/usr/bin/env python3
"""Real Alive/Tauri journey on the owned Xvfb and software PipeWire server.

ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_desktop.py \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-desktop
Set ALIVE_ENDURANCE_SECONDS=600 for the sustained acceptance run.
"""
import array
import ctypes as C
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import subprocess
import time

import check_canvas_desktop as ui
import check_documents_desktop as windows
from gi.repository import Atspi

MAIN = 'Alive'
DEVICE = Path('apps/ultra/examples/subtractive.ultra').resolve()
operations = []


def screenshot(name):
    root = ui.Gdk.get_default_root_window()
    ui.Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(
        str(ui.output / name), 'png', [], [])


def value(name):
    control = ui.wait_for(name)
    if 'Text' in control.get_interfaces():
        return Atspi.Text.get_text(control, 0, -1)
    return ' '.join(Atspi.Text.get_text(a, 0, -1) for a in ui.walk(control)
                    if 'Text' in a.get_interfaces())


def numeric(name, number):
    ui.text(name, str(number))
    ui.keys('Tab')
    time.sleep(.12)


def wait_value(name, predicate, seconds=8):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        current = value(name)
        if predicate(current):
            return current
        time.sleep(.12)
    screenshot('failed-value.png')
    raise AssertionError(f'{name}: unexpected value {current!r}')


def detail():
    return {name: value(name) for name in (
        'Audio backend', 'Audio device', 'Audio sample rate', 'Audio buffer frames',
        'Audio callbacks', 'Audio stream errors', 'Audio failed', 'Audio status',
        'Transport playing', 'Absolute frame', 'Rejected commands', 'Native generation',
        'Track 1 active voices', 'Track 2 active voices')}


def log(action):
    audio = detail()
    operations.append({'action': action, 'monotonic': time.monotonic(), 'audio': audio})
    (ui.output / 'operations.json').write_text(json.dumps(operations, indent=2))
    assert audio['Audio stream errors'] == '0' and audio['Audio failed'] == 'false', audio
    assert audio['Rejected commands'] == '0', audio


def transport(action):
    ui.click(f'{action.title()} transport')
    wait_value('Transport playing', lambda s: s == str(action == 'start').lower())


def choose_file(button, title, path):
    ui.click(button)
    windows.focus(title)
    root = C.c_ulong(); parent = C.c_ulong(); children = C.POINTER(C.c_ulong)(); count = C.c_uint()
    ui.x.XQueryTree(ui.display, ui.x.XDefaultRootWindow(ui.display), C.byref(root), C.byref(parent), C.byref(children), C.byref(count))
    try:
        for index in range(count.value):
            name = C.c_char_p()
            if ui.x.XFetchName(ui.display, children[index], C.byref(name)) and name.value:
                text = name.value.decode('utf-8', errors='replace')
                ui.x.XFree(name)
                if text == title:
                    ui.x.XResizeWindow(ui.display, children[index], 1000, 740)
                    ui.x.XMoveWindow(ui.display, children[index], 0, 0)
                    ui.x.XFlush(ui.display)
    finally:
        if children: ui.x.XFree(children)
    # GTK can finish its initial focus transition after the X window maps.
    time.sleep(.6)
    windows.focus(title)
    for _ in range(3):
        ui.keys('Control_L', 'l')
        time.sleep(.3)
        try:
            ui.find('Native filename entry')
            break
        except StopIteration:
            continue
    ui.text('Native filename entry', str(path))
    ui.click('Save' if title == 'Save Alive Session' else 'Open')
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if not any(frame.get_name() == title and frame.get_state_set().contains(Atspi.StateType.SHOWING)
                   for frame in windows.app_frames()):
            break
        time.sleep(.1)
    else:
        raise AssertionError('Native file chooser did not finish: ' + title)
    time.sleep(.3)
    windows.focus(MAIN)


def start_capture(name):
    path = ui.output / (name + '.f32')
    # Older pw-cat writes raw PCM to stdout without accepting --raw.
    raw = ['--raw'] if '--raw' in subprocess.check_output(['pw-cat', '--help'], text=True) else []
    with path.open('wb') as output:
        process = subprocess.Popen([
            'pw-cat', '--record', *raw, '--rate=48000', '--format=f32', '--channels=2',
            '--target=0', '--properties={ node.name = Alive-Session-Capture }', '-'],
            stdout=output, stderr=subprocess.PIPE, text=True)
    for _ in range(50):
        if 'Alive-Session-Capture:input_FL' in subprocess.check_output(['pw-link', '-i'], text=True):
            break
        time.sleep(.1)
    for channel in ('FL', 'FR'):
        subprocess.run(['pw-link', 'Ultra-Software-Output:monitor_' + channel,
                        'Alive-Session-Capture:input_' + channel], check=True)
    return process, path


def finish_capture(capture):
    process, path = capture
    process.terminate()
    stdout, stderr = process.communicate(timeout=8)
    assert not stderr, (stdout or '') + stderr
    peaks, digest, frames, unequal = [], hashlib.sha256(), 0, 0
    with path.open('rb') as stream:
        while block := stream.read(48000 * 2 * 4):
            digest.update(block)
            samples = array.array('f'); samples.frombytes(block)
            assert all(math.isfinite(s) for s in samples), 'Nonfinite captured audio'
            left, right = samples[::2], samples[1::2]
            if frames >= 4096:
                unequal += sum(a != b for a, b in zip(left, right))
            frames += len(left)
            peaks.append(max(map(abs, samples), default=0))
    return {'frames': frames, 'seconds': frames / 48000, 'peak': max(peaks, default=0),
            'one_second_peaks': peaks, 'unequal_stereo_samples_after_setup': unequal,
            'sha256': digest.hexdigest(), 'path': path.name, 'physical_audio': False}


def process_sample():
    parents = {}
    for entry in Path('/proc').iterdir():
        if not entry.name.isdigit():
            continue
        try:
            status = dict(line.split(':', 1) for line in (entry / 'status').read_text().splitlines() if ':' in line)
            parents[int(entry.name)] = (int(status['PPid']), status)
        except (OSError, ValueError, KeyError):
            continue
    descendants = {ui.pid}
    while True:
        expanded = descendants | {pid for pid, (parent, _) in parents.items() if parent in descendants}
        if expanded == descendants:
            break
        descendants = expanded
    result = {'monotonic': time.monotonic(), 'pids': sorted(descendants), 'rss_kib': 0,
              'pss_kib': 0, 'threads': 0, 'fds': 0}
    for pid in descendants:
        try:
            status = parents[pid][1]
            result['rss_kib'] += int(status.get('VmRSS', '0 kB').split()[0])
            result['threads'] += int(status['Threads'])
            result['fds'] += len(list(Path(f'/proc/{pid}/fd').iterdir()))
            for line in Path(f'/proc/{pid}/smaps_rollup').read_text().splitlines():
                if line.startswith('Pss:'):
                    result['pss_kib'] += int(line.split()[1])
        except (OSError, KeyError):
            continue
    return result


def editor_edit(number=950):
    ui.click('Open Pulse editor')
    windows.focus('Pulse - Ultra Hosted Editor')
    ui.wait_for('Hosted Cutoff base')
    numeric('Hosted Cutoff base', number)
    wait_value('Hosted Cutoff base', lambda s: float(s) == number)
    wait_value('Hosted Cutoff effective ownership', lambda s: 'Automation' in s)
    screenshot('hosted-editor.png')
    ui.click('Close hosted editor')
    windows.focus(MAIN)
    wait_value('Transport playing', lambda s: s == 'true')


def check_separate_apps():
    binary = Path(f'/proc/{ui.pid}/exe').resolve(strict=True)
    assert binary.name == 'alive', f'Alive journey launched {binary}'
    patch = ui.output / 'alongside.ultra'
    patch.write_text('{"version":1,"profile":"ultra-canvas-v1","nodes":[],"edges":[]}\n')
    with (ui.output / 'alongside-ultra.log').open('w') as log:
        other = subprocess.Popen([str(binary.with_name('ultra')), str(patch)], stdout=log, stderr=log)
        try:
            deadline = time.monotonic() + 15
            while time.monotonic() < deadline:
                assert other.poll() is None, 'Ultra did not remain a separate application'
                for root in ui.desktop_apps():
                    if root.get_process_id() == other.pid:
                        if any(a.get_name() == 'alongside.ultra - Ultra' for a in ui.walk(root)):
                            assert Path(f'/proc/{other.pid}/exe').resolve().name == 'ultra'
                            windows.focus(MAIN)
                            return {'alive_binary': str(binary), 'ultra_binary': str(binary.with_name('ultra')),
                                    'simultaneous_native_windows': True}
                time.sleep(.1)
            raise AssertionError('Ultra did not open its independent patch window alongside Alive')
        finally:
            other.terminate()
            other.wait(timeout=8)


def run():
    windows.focus(MAIN)
    ui.wait_for('Start transport')
    ui.click('Audio details')
    screenshot('session-ready.png')
    assert value('Transport playing') == 'false'
    entrypoints = check_separate_apps()
    if os.environ.get('ALIVE_SMOKE_ONLY') == '1':
        transport('start'); time.sleep(1)
        report = detail(); screenshot('session-playing.png')
        transport('stop')
        (ui.output / 'smoke.json').write_text(json.dumps(report, indent=2))
        return
    ui.click('New session')
    time.sleep(.5)
    # Exercise native device loading twice; each track keeps an independent root.
    choose_file('Replace Pulse device', 'Load Ultra Device', DEVICE)
    choose_file('Replace Harmony device', 'Load Ultra Device', DEVICE)
    # Replacement intentionally clears lanes, so explicitly author both enabled lanes.
    ui.click('Pulse clip')
    numeric('Tempo', 116)
    numeric('Note 1 duration', .75)
    numeric('Note 1 velocity', 83)
    for label, initial, second in [('Cutoff', 900, 3400), ('Level', 62, 78)]:
        ui.click(f'{label} automation enabled')
        ui.click(f'Add {label} point')
        numeric(f'{label} point 1 value', initial)
        ui.click(f'Add {label} point')
        numeric(f'{label} point 2 beat', 4)
        numeric(f'{label} point 2 value', second)
    ui.click('Prepare / Apply')
    time.sleep(.5)
    transport('start')
    capture = start_capture('native-walkthrough')
    numeric('Cutoff base', 1777)
    wait_value('Cutoff effective ownership', lambda s: 'Automation' in s and '1777' not in s)
    numeric('Pulse gain', .55)
    ui.click('Harmony mute'); time.sleep(.3); ui.click('Harmony mute')
    ui.click('Pulse solo'); time.sleep(.3); ui.click('Pulse solo')
    editor_edit()
    editor_edit(1333)
    wait_value('Cutoff base', lambda s: float(s) == 1333)
    screenshot('session-playing.png')
    log('two loaded devices, notes/automation prepared, live base/mixer, editor closed/reopened')
    source = ui.output / 'journey.alive'
    choose_file('Save session as', 'Save Alive Session', source)
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        saved = json.loads(source.read_text())
        if saved['tempo'] == 116 and saved['tracks'][0]['device']['parameters'].get('cutoff') == 1333:
            break
        time.sleep(.1)
    assert saved['tempo'] == 116 and saved['tracks'][0]['gain'] == .55
    assert saved['tracks'][0]['notes'][0]['duration'] == .75
    assert saved['tracks'][0]['notes'][0]['velocity'] == 83
    transport('stop')
    wait_value('Track 1 active voices', lambda s: s == '0')
    wait_value('Track 2 active voices', lambda s: s == '0')
    choose_file('Open session', 'Open Alive Session', source)
    transport('start')
    assert float(value('Cutoff base')) == 1333
    assert float(value('Pulse gain')) == .55
    # Prospective dependency failure must keep the active session and clock running.
    bad = ui.output / 'missing-device.alive'
    broken = json.loads(source.read_text())
    broken['tracks'][0]['device']['path'] = 'missing-device.ultra'
    bad.write_text(json.dumps(broken))
    before = int(value('Absolute frame'))
    choose_file('Open session', 'Open Alive Session', bad)
    time.sleep(.4)
    assert value('Transport playing') == 'true'
    assert int(value('Absolute frame')) > before
    assert float(value('Cutoff base')) == 1333
    log('saved/reopened/playing; missing device rejected preserving session')
    walkthrough = finish_capture(capture)
    assert walkthrough['peak'] > 1e-4
    # Keep a bounded, repeating native workload alive for at least the requested
    # *playing* duration. Paused time is excluded conservatively from the receipt.
    required = float(os.environ.get('ALIVE_ENDURANCE_SECONDS', '0'))
    sustained, samples, cycles, played = None, [], 0, 0.
    if required:
        capture = start_capture('endurance')
        time.sleep(3)
        samples.append(process_sample())
        while played < required:
            started = time.monotonic()
            frame_before = int(value('Absolute frame'))
            numeric('Cutoff base', 700 + cycles % 5 * 200)
            numeric('Pulse gain', .45 + cycles % 3 * .05)
            numeric('Seek beat', cycles % 4 * 2)
            ui.click('Seek transport')
            if cycles % 4 == 0:
                editor_edit(800 + cycles % 5 * 100)
            time.sleep(min(8, max(0, required - played)))
            wait_value('Transport playing', lambda s: s == 'true')
            assert int(value('Absolute frame')) > frame_before, 'Audio frame clock stopped advancing'
            played += time.monotonic() - started
            # Driver metrics reset when Apply restarts I/O. Retain and check
            # every stream before that boundary, rather than only the last one.
            log(f'endurance cycle {cycles + 1} before Stop/possible Apply')
            transport('stop')
            wait_value('Track 1 active voices', lambda s: s == '0')
            wait_value('Track 2 active voices', lambda s: s == '0')
            if cycles % 5 == 0:
                numeric('Cutoff point 2 value', 2600 + cycles % 4 * 200)
                ui.click('Prepare / Apply'); time.sleep(.3)
            transport('start')
            cycles += 1
            if cycles % 3 == 0:
                samples.append(process_sample()); log(f'endurance cycle {cycles}, playing seconds {played:.3f}')
            (ui.output / 'endurance-progress.json').write_text(json.dumps({'playing_seconds': played, 'cycles': cycles, 'required': required}, indent=2))
        samples.append(process_sample())
        sustained = finish_capture(capture)
        assert sustained['seconds'] >= required and sustained['peak'] > 1e-4
    final = detail()
    assert final['Audio stream errors'] == '0' and final['Audio failed'] == 'false', final
    assert final['Rejected commands'] == '0', final
    screenshot('session-endurance.png')
    transport('stop')
    ui.click('Save session')
    # Device removal runs while stopped, after every voice has terminated.
    ui.click('Remove Harmony device'); time.sleep(.4)
    assert value('Track 2 active voices') == '0'
    report = {'kind': 'actual native Tauri application; private Xvfb + software PipeWire loopback',
              'entrypoints': entrypoints,
              'hardware': platform.uname()._asdict(), 'cpu': subprocess.check_output(['lscpu'], text=True),
              'physical_audio': False, 'underruns': 'not exposed by CPAL; no count claimed',
              'walkthrough': walkthrough, 'endurance': sustained,
              'playing_seconds_conservative': played, 'edit_transport_cycles': cycles,
              'process_tree_samples': samples, 'final_audio': final, 'operations': operations}
    (ui.output / 'native-session-report.json').write_text(json.dumps(report, indent=2))
    screenshot('session-device-removed.png')
    ui.click('Quit Alive')
    windows.focus('Unsaved Alive Session')
    ui.click('Cancel')
    windows.focus(MAIN)
    transport('start')
    report['quit_cancel_preserved_session'] = True
    ui.click('Quit Alive')
    windows.focus('Unsaved Alive Session')
    ui.click('Discard')
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        try:
            state = Path(f'/proc/{ui.pid}/stat').read_text().split(') ', 1)[1].split()[0]
            if state == 'Z':
                break
        except FileNotFoundError:
            break
        time.sleep(.1)
    else:
        raise AssertionError('Alive Quit did not exit after Discard')
    report['quit_discard_exited'] = True
    (ui.output / 'native-session-report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2), flush=True)


if __name__ == '__main__':
    try:
        run()
    except Exception:
        try:
            ui.click('Audio details')
        except Exception:
            pass
        nodes = []
        for frame in windows.app_frames():
            for item in ui.walk(frame):
                try:
                    nodes.append({'name': item.get_name(), 'role': item.get_role_name(),
                                  'text': Atspi.Text.get_text(item, 0, -1) if 'Text' in item.get_interfaces() else ''})
                except Exception:
                    continue
        (ui.output / 'journey-failure.json').write_text(json.dumps(nodes, indent=2))
        screenshot('journey-failure.png')
        raise
