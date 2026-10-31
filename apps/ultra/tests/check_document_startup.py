#!/usr/bin/env python3
"""Deliver a second file while the real app is still initializing privately."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

assert os.environ.get('ULTRA_TEST_PRIVATE_SESSION') == '1'
assert os.environ.get('XAUTHORITY') and not os.environ.get('WAYLAND_DISPLAY')

binary = Path('apps/ultra/src-tauri/target/release/ultra').resolve()
output = Path(os.environ['ULTRA_TEST_OUTPUT_DIR'])
assert (binary.parent / 'libultra_native.so').is_file(), 'Build the adjacent native library first'
env = {**os.environ, 'LD_LIBRARY_PATH': os.pathsep.join(filter(None,
    [str(binary.parent), os.environ.get('LD_LIBRARY_PATH')]))}


def wait_until(check, description):
    for _ in range(100):
        value = check()
        if value:
            return value
        time.sleep(.1)
    raise AssertionError(description)


def run():
    with tempfile.TemporaryDirectory(prefix='startup-', dir=output) as directory:
        directory = Path(directory)
        blocked = directory / 'initial.ultra'
        os.mkfifo(blocked)
        receiver = directory / 'startup-receiver.ultra'
        receiver.write_text(json.dumps({'version': 1, 'profile': 'ultra-canvas-v1',
                                       'nodes': [], 'edges': []}) + '\n')
        probe = directory / 'secondary-exit-probe.so'
        subprocess.run(['cc', '-shared', '-fPIC', '-O2', '-Wall', '-Wextra', '-Werror',
                        'apps/ultra/tests/secondary_exit_probe.c', '-o', str(probe)], check=True)
        loaded = directory / 'secondary-loaded'
        finalized = directory / 'secondary-finalized'
        secondary_env = {**env, 'LD_PRELOAD': str(probe) + (':' + env['LD_PRELOAD'] if env.get('LD_PRELOAD') else ''),
                         'ULTRA_TEST_LOAD_MARKER': str(loaded), 'ULTRA_TEST_EXIT_MARKER': str(finalized)}
        log = (output / 'startup-app.log').open('w')
        primary = subprocess.Popen([str(binary), str(blocked)], env=env, stdout=log, stderr=log)
        secondary = None
        released = False
        try:
            # File::open waits for the FIFO writer inside initialize, after the
            # single-instance service exists but before main is registered.
            def waiting_for_file():
                assert primary.poll() is None, 'Primary app exited during initialization'
                return Path(f'/proc/{primary.pid}/wchan').read_text().strip() == 'wait_for_partner'
            wait_until(waiting_for_file, 'Primary did not reach the blocked startup file')
            secondary = subprocess.Popen([str(binary), str(receiver)], env=secondary_env,
                                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stdout, stderr = secondary.communicate(timeout=3)
            assert secondary.returncode == 0, stdout + stderr
            assert loaded.exists(), 'Secondary exit probe was not loaded'
            assert not finalized.exists(), 'Secondary ran process finalizers while GUI workers could still be running'
            # The second process must be acknowledged without waiting for setup
            # to finish; file delivery itself runs after setup on the main loop.
            writer = os.open(blocked, os.O_WRONLY | os.O_NONBLOCK)
            os.close(writer)
            released = True
            os.environ['ULTRA_TEST_PID'] = str(primary.pid)
            import check_canvas_desktop as ui
            from gi.repository import Atspi, GLib

            ui.wait_for('Choose a patch file.')
            assert Atspi.Action.do_action(ui.wait_for('OK'), 0)

            def ready_windows():
                frames = {}
                for root in Atspi.get_desktop(0):
                    try:
                        if root.get_process_id() != primary.pid:
                            continue
                        for child in [root.get_child_at_index(i) for i in range(root.get_child_count())]:
                            if child.get_role_name() == 'frame':
                                frames[child.get_name()] = [item.get_name() for item in ui.walk(child)]
                    except GLib.GError:
                        continue
                expected = ('Untitled - Ultra', 'startup-receiver.ultra - Ultra')
                if all('Shared native patch ready.'
                       in frames.get(title, []) for title in expected):
                    assert all('This patch window is closed' not in name
                               for names in frames.values() for name in names)
                    return list(frames)
                return None
            windows = wait_until(ready_windows, 'Both startup documents must retain healthy native graphs')
            # Exercise normal post-startup delivery and canonical-path focus
            # without adding more documents. Only secondary processes preload
            # the exit probe; the primary retains its ordinary shutdown path.
            for iteration in range(32):
                secondary = subprocess.Popen([str(binary), str(receiver)], env=secondary_env,
                                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                stdout, stderr = secondary.communicate(timeout=5)
                assert secondary.returncode == 0, f'Secondary forwarding {iteration}: {stdout}{stderr}'
                assert not finalized.exists(), 'Secondary ran process finalizers during repeated file delivery'
            assert len(loaded.read_text().splitlines()) == 33, 'Every secondary must load the real exit probe'
            assert set(wait_until(ready_windows, 'Repeated forwarding must preserve both native documents')) == set(windows)
            (output / 'startup-result.json').write_text(json.dumps({
                'status': 'passed', 'secondary_acknowledged_before_initialize': True,
                'expected_non_file_alert_dismissed': True, 'windows': windows,
                'repeated_secondary_deliveries': 32, 'secondary_process_finalizers_skipped': True,
                'scope': 'real Tauri startup and single-instance file delivery on private X/DBus'
            }, indent=2) + '\n')
            print('PASS secondary file delivery during initialization preserves main and opens its own window', flush=True)
        finally:
            if not released and primary.poll() is None:
                try:
                    os.close(os.open(blocked, os.O_WRONLY | os.O_NONBLOCK))
                except OSError:
                    pass
            for process in (secondary, primary):
                if process is not None and process.poll() is None:
                    process.terminate()
                    process.wait(timeout=5)
            log.close()


if __name__ == '__main__':
    run()
