#!/usr/bin/env python3
"""Exercise only the isolated runner's launch stanza, never JACK or a display."""
import os
import pathlib
import shutil
import subprocess
import tempfile

source = pathlib.Path(__file__).resolve().parents[1]
script = (source / 'tests/check_isolated_desktop.sh').read_text()
# Execute the actual launch stanza without the desktop/audio setup or UI probe.
launch = script.split('cd "$ROOT"\n', 1)[1].split("python3 - <<'PY'", 1)[0]
with tempfile.TemporaryDirectory(prefix='ultra-launch-selection-') as directory:
    root = pathlib.Path(directory)
    app = root / 'apps/ultra'
    release = app / 'src-tauri/target/release'
    release.mkdir(parents=True)
    shutil.copy2(source / 'run.sh', app / 'run.sh')
    for binary in (app / 'ultra', release / 'ultra'):
        binary.write_text('#!/bin/sh\nprintf "%s\\n%s\\n%s\\n" "$0" "$LD_LIBRARY_PATH" "$$" > "$ULTRA_TEST_OUTPUT_DIR/launched"\n')
        binary.chmod(0o755)
    tools = root / 'tools'
    tools.mkdir()
    (tools / 'ldd').write_text('#!/bin/sh\nexit 0\n')
    (tools / 'ldd').chmod(0o755)
    env = dict(os.environ, ROOT=str(root), ULTRA_TEST_OUTPUT_DIR=str(root),
               LD_LIBRARY_PATH='/existing/library', PATH=str(tools) + ':' + os.environ['PATH'])
    result = subprocess.run(['bash', '-euc', 'cd "$ROOT"\n' + launch + '\nwait "$ultra_test_pid"\nprintf "%s" "$ULTRA_TEST_PID"'],
                            env=env, capture_output=True, text=True, check=True)
    binary, libraries, pid = (root / 'launched').read_text().splitlines()
    assert pathlib.Path(binary).resolve() == release / 'ultra', 'Isolated runner launched the stale packaged binary instead of the checked release build'
    assert libraries == str(release) + ':/existing/library', 'Release native library must take precedence'
    assert pid == result.stdout, 'Accessibility probe must target the launched app PID'
print('PASS isolated runner selects the checked release binary and native library, preserving its PID')
