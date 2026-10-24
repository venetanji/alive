#!/usr/bin/env python3
"""Catch missing/misrouted app binaries before initializing a desktop or audio."""
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[3]
BIN = ROOT / 'apps/ultra/src-tauri/target/release'
env = {key: value for key, value in os.environ.items()
       if key not in ('DISPLAY', 'WAYLAND_DISPLAY')}
env['LD_LIBRARY_PATH'] = str(BIN) + os.pathsep + env.get('LD_LIBRARY_PATH', '')


def run(app, *args):
    return subprocess.run([str(BIN / app), *args], env=env, text=True,
                          capture_output=True, timeout=10)


assert (BIN / 'alive').is_file(), 'Build a separate alive executable'
assert not os.path.samefile(BIN / 'alive', BIN / 'ultra'), 'Alive must have its own entry point'
for app in ('alive', 'ultra'):
    result = run(app, '--help')
    assert result.returncode == 0, result.stderr
    assert f'Usage: {app}' in result.stdout, result.stdout
    result = run(app, '--version')
    assert result.returncode == 0 and result.stdout.startswith(app + ' '), result

for args in [('--unknown',), ('one.alive', 'two.alive'), ('--session-probe',)]:
    result = run('alive', *args)
    assert result.returncode == 2 and 'Usage: alive' in result.stderr, result

result = run('alive', '--session-probe', '/missing-device-test/session.alive', '/unused')
assert result.returncode == 1 and 'Alive session probe failed' in result.stderr, result
assert 'desktop session' not in result.stderr, result.stderr
result = run('alive')
assert result.returncode == 2 and 'Alive needs a Linux desktop session' in result.stderr, result

# The launcher must retain command-line flags and work from any directory.
result = subprocess.run(['bash', str(ROOT / 'apps/alive/run.sh'), '--help'],
                        cwd='/tmp', env=env, text=True, capture_output=True, timeout=10)
assert result.returncode == 0 and 'Usage: alive' in result.stdout, result
print('PASS distinct Alive/Ultra binaries, CLI dispatch, display-free probes and Alive launcher')
