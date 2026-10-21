#!/usr/bin/env python3
"""Install a user desktop entry for this checkout's latest built Ultra."""
import os
from pathlib import Path
import shutil
import subprocess
import time


def desktop_value(value):
    return str(value).replace('\\', '\\\\').replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')


def exec_argument(value):
    # Exec quoting is parsed after desktop-string escaping; % is a field code.
    quoted = str(value).replace('%', '%%')
    for character in ('\\', '"', '`', '$'):
        quoted = quoted.replace(character, '\\' + character)
    return desktop_value('"' + quoted + '"')


def main():
    app = Path(__file__).resolve().parent
    if not os.access(app / 'src-tauri/target/release/ultra', os.X_OK):
        raise SystemExit('Build Ultra first: bash apps/ultra/build.sh')
    applications = Path(os.environ.get('XDG_DATA_HOME') or Path.home() / '.local/share') / 'applications'
    applications.mkdir(parents=True, exist_ok=True)
    desktop = applications / 'org.alive.ultra.research.desktop'
    contents = '\n'.join([
        '[Desktop Entry]',
        'Version=1.0',
        'Type=Application',
        'Name=Ultra (Latest Build)',
        'GenericName=Audio Patcher',
        'Comment=Open the latest built Ultra from the Alive checkout',
        f'Exec=/usr/bin/bash {exec_argument(app / "run.sh")}',
        f'Icon={desktop_value(app / "src-tauri/icons/icon.png")}',
        'Terminal=false',
        'StartupNotify=true',
        'StartupWMClass=ultra',
        'Categories=AudioVideo;Audio;Music;',
        'Keywords=Alive;Max;Patcher;Synth;',
        '',
    ])
    if desktop.exists() and desktop.read_text() != contents:
        shutil.copy2(desktop, desktop.with_name(f'{desktop.name}.bak.{time.time_ns()}'))
    desktop.write_text(contents)
    if shutil.which('update-desktop-database'):
        subprocess.run(['update-desktop-database', str(applications)], check=True)
    print(f'Installed {desktop}')
    print('Open your app launcher and search for Ultra (Latest Build).')
    print('Rebuild with apps/ultra/build.sh, then reopen Ultra to load updates.')


if __name__ == '__main__':
    main()
