import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

run = Path(__file__).resolve().parent
installed = json.loads((run / 'install-verification.json').read_text())
root = Path(installed['installed_path'])
manifest = json.loads((root / 'source-build-manifest.json').read_text())
previous = json.loads((run / 'previous-install-verification.json').read_text())
applications = Path.home() / '.local/share/applications'
desktop = applications / 'org.alive.session.test.desktop'
research = applications / 'org.alive.ultra.research.desktop'
assert desktop.read_text() == previous['launchers'][desktop.name], 'Alive launcher changed since preflight'
assert research.read_text() == previous['launchers'][research.name], 'Other session launcher changed since preflight'
for name, expected in manifest['artifacts'].items():
    assert hashlib.sha256((root / 'bin' / name).read_bytes()).hexdigest() == expected, name
shutil.copy2(desktop, run / 'launcher-before.desktop')
updates = {
    'Comment': 'Shared saved device surfaces, live controls and waveform tools; verified build ' + manifest['source_commit'][:7],
    'Exec': '/usr/bin/env -u LD_LIBRARY_PATH ' + str(root / 'bin/alive') + ' %f',
    'Path': str(root),
    'Icon': str(root / 'icon.png'),
}
lines = desktop.read_text().splitlines()
found = set()
for index, line in enumerate(lines):
    key = line.split('=', 1)[0]
    if key in updates:
        lines[index] = key + '=' + updates[key]
        found.add(key)
assert found == set(updates), found
handle, name = tempfile.mkstemp(prefix='.alive-launcher-', suffix='.desktop', dir=applications)
temp = Path(name)
try:
    with os.fdopen(handle, 'w') as output:
        output.write('\n'.join(lines) + '\n')
        output.flush()
        os.fsync(output.fileno())
    temp.chmod(desktop.stat().st_mode & 0o777)
    subprocess.run(['desktop-file-validate', str(temp)], check=True)
    os.replace(temp, desktop)
finally:
    if temp.exists():
        temp.unlink()
subprocess.run(['desktop-file-validate', str(desktop)], check=True)
subprocess.run(['update-desktop-database', str(applications)], check=True)
assert research.read_text() == previous['launchers'][research.name]
old = Path(previous['installed_path'])
for name, expected in previous['artifacts'].items():
    assert hashlib.sha256((old / 'bin' / name).read_bytes()).hexdigest() == expected, name
verification = {
    'desktop': str(desktop), 'source_commit': manifest['source_commit'],
    'binary': str(root / 'bin/alive'), 'launcher': desktop.read_text(),
    'desktop_file_validated': True, 'desktop_database_updated': True,
    'previous_install_artifacts_unchanged': True, 'research_launcher_unchanged': True,
    'existing_user_windows_preserved': True,
}
(run / 'launcher-verification.json').write_text(json.dumps(verification, indent=2) + '\n')
print(json.dumps(verification, indent=2))
