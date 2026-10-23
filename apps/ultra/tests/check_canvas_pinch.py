#!/usr/bin/env python3
"""Exercise native GTK trackpad pinch in the actual app on the private display."""
import json
import os
from pathlib import Path
import shlex
import subprocess
import time

assert os.environ.get('ULTRA_TEST_PRIVATE_SESSION') == '1'
assert os.environ.get('XAUTHORITY') and not os.environ.get('WAYLAND_DISPLAY')
output = Path(os.environ['ULTRA_TEST_OUTPUT_DIR'])
binary = Path('apps/ultra/src-tauri/target/release/ultra').resolve()
probe = output / 'canvas-pinch-probe.so'
flags = shlex.split(subprocess.check_output(['pkg-config', '--cflags', '--libs', 'gtk+-3.0'], text=True))
subprocess.run(['cc', '-shared', '-fPIC', '-O2', '-Wall', '-Wextra', '-Werror',
                'apps/ultra/tests/canvas_pinch_probe.c', '-o', str(probe), *flags], check=True)
steps = output / 'pinch-steps.txt'
initial = output / 'pinch.ultra'
initial.write_text('{"version":1,"profile":"ultra-canvas-v1","nodes":[],"edges":[]}\n')
env = {**os.environ, 'LD_LIBRARY_PATH': str(binary.parent),
       'LD_PRELOAD': str(probe), 'ULTRA_TEST_PINCH_STEPS': str(steps)}

with (output / 'pinch-app.log').open('w') as log:
    process = subprocess.Popen([str(binary), str(initial)], env=env, stdout=log, stderr=log)
    os.environ['ULTRA_TEST_PID'] = str(process.pid)
    import check_canvas_desktop as ui
    from gi.repository import Atspi, Gdk

    def zoom():
        control = ui.wait_for('Canvas zoom')
        for node in ui.walk(control):
            if 'Selection' in node.get_interfaces():
                selected = Atspi.Selection.get_selected_child(node, 0)
                if selected:
                    return selected.get_name()
        return None

    def geometry():
        result = {}
        for name in ['Documents', 'Patcher tools', 'Editable patch canvas']:
            rect = Atspi.Component.get_extents(ui.wait_for(name), Atspi.CoordType.SCREEN)
            result[name] = [rect.x, rect.y, rect.width, rect.height]
        return result

    def pinch(scales, end=2, x=500, y=360):
        command = steps.with_suffix('.tmp')
        command.write_text(f'0 {x} {y} 1\n' + ''.join(f'1 {x} {y} {scale}\n' for scale in scales)
                           + f'{end} {x} {y} {scales[-1]}\n')
        command.replace(steps)
        for _ in range(100):
            assert process.poll() is None, 'App exited during pinch'
            if not steps.exists():
                time.sleep(.2)
                return
            time.sleep(.05)
        raise AssertionError('Native pinch probe did not finish')

    try:
        ui.wait_for('Shared native patch ready.')
        before = geometry()
        assert zoom() == '100%', zoom()
        pinch([1.1, 1.5, 2])
        root = Gdk.get_default_root_window()
        Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(
            str(output / 'native-pinch-200.png'), 'png', [], [])
        assert zoom() == '200%', f'Pinch must zoom the canvas to 200%, got {zoom()}'
        assert geometry() == before, 'Pinch moved or resized the editor chrome'
        pinch([1.2], end=3)
        assert zoom() == '240%', zoom()
        pinch([.5])
        assert zoom() == '120%', 'A new gesture must reset the cancelled gesture scale'
        pinch([2], x=20, y=10)
        assert zoom() == '120%', 'Pinching the toolbar must not magnify the page or canvas'
        assert geometry() == before, 'Pinch moved or resized the editor chrome'
        titles = [child.get_name() for app in Atspi.get_desktop(0) if app.get_process_id() == process.pid
                  for child in ui.walk(app) if child.get_role_name() == 'frame']
        assert titles == ['pinch.ultra - Ultra'], 'Zoom must not mark the patch dirty'
        (output / 'pinch-result.json').write_text(json.dumps({
            'status': 'passed', 'chrome': before, 'canvas_zoom': zoom(),
            'cancel_and_restart': True, 'toolbar_pinch_ignored': True,
            'scope': 'actual Tauri/WebKitGTK with synthetic GDK touchpad pinch on private Xvfb'
        }, indent=2) + '\n')
        print('PASS native trackpad pinch zooms only the canvas and preserves toolbar geometry', flush=True)
    finally:
        process.terminate()
        process.wait(timeout=5)
