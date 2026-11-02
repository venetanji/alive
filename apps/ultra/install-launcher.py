#!/usr/bin/env python3
"""Select one self-contained local test build for both desktop launchers."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time


def desktop_value(value):
    return str(value).replace('\\', '\\\\').replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')


def exec_argument(value):
    # Exec quoting is parsed after desktop-string escaping; % is a field code.
    quoted = str(value).replace('%', '%%')
    for character in ('\\', '"', '`', '$'):
        quoted = quoted.replace(character, '\\' + character)
    return desktop_value('"' + quoted + '"')


def sha256(path):
    with path.open('rb') as file:
        return hashlib.file_digest(file, 'sha256').hexdigest()


def atomic_write(path, contents):
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=path.name + '.', dir=path.parent)
    try:
        with os.fdopen(descriptor, 'w') as file:
            file.write(contents)
        os.chmod(temporary, 0o644)
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def desktop_contents(current, name):
    alive = name == 'alive'
    return '\n'.join([
        '[Desktop Entry]',
        'Version=1.0',
        'Type=Application',
        'Name=Alive (Test)' if alive else 'Name=Ultra (Latest Build)',
        'GenericName=Music Session Host' if alive else 'GenericName=Audio Patcher',
        'Comment=Open the selected local test build',
        f'Exec=/usr/bin/env -u LD_LIBRARY_PATH {exec_argument(current / "bin" / name)} ' + ('%f' if alive else '%F'),
        f'Path={desktop_value(current)}',
        f'Icon={desktop_value(current / "icon.png")}',
        'Terminal=false',
        'StartupNotify=true',
        *([] if alive else ['StartupWMClass=ultra']),
        'Categories=AudioVideo;Audio;Music;',
        *([] if alive else ['MimeType=application/x-ultra-patch;application/x-max-patch;']),
        'Keywords=Alive;Ultra;Music;Session;' if alive else 'Keywords=Alive;Max;Patcher;Synth;',
        '',
    ])


def snapshot_build(app, builds, build_directory, built_from):
    files = {}
    for name in ('alive', 'ultra', 'libultra_native.so'):
        source = build_directory / name
        if not source.is_file() or (name != 'libultra_native.so' and not os.access(source, os.X_OK)):
            raise ValueError(f'Missing build artifact: {source}. Build both apps first.')
        files[f'bin/{name}'] = source
    files['icon.png'] = app / 'src-tauri/icons/icon.png'
    for name in ('alive', 'ultra'):
        tauri = app.parent / name / 'src-tauri'
        config = json.loads((tauri / 'tauri.conf.json').read_text())
        resources = config['bundle']['resources']
        if not isinstance(resources, dict):
            raise ValueError('The test installer requires explicit resource destination mappings')
        for source, destination in resources.items():
            relative = Path('lib') / config['productName'] / destination
            if relative.is_absolute() or '..' in relative.parts:
                raise ValueError(f'Invalid resource destination: {destination}')
            files[str(relative)] = tauri / source
    for source in files.values():
        if not source.is_file():
            raise ValueError(f'Missing build resource: {source}')

    builds.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.prepare-', dir=builds) as directory:
        staging = Path(directory)
        artifacts = {}
        for relative, source in files.items():
            expected = sha256(source)
            target = staging / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            if sha256(target) != expected or sha256(source) != expected:
                raise ValueError(f'Build changed during installation: {source}; finish building and retry')
            artifacts[relative] = {'sha256': expected, 'bytes': target.stat().st_size}
        digest = hashlib.sha256(json.dumps(artifacts, sort_keys=True).encode()).hexdigest()
        snapshot = builds / f'test-{digest[:20]}'
        if snapshot.exists():
            for relative, artifact in artifacts.items():
                if sha256(snapshot / relative) != artifact['sha256']:
                    raise ValueError(f'Existing snapshot was modified: {snapshot / relative}')
        else:
            root = app.parents[1]
            def git(*arguments):
                result = subprocess.run(['git', '-C', str(root), *arguments], capture_output=True, text=True)
                return result.stdout.strip() if result.returncode == 0 else None
            manifest = {
                'schema': 1,
                'created_utc': datetime.now(timezone.utc).isoformat(),
                'build_directory': str(build_directory),
                'reported_build_commit': built_from,
                'provenance_note': 'Build commit is caller-supplied; checkout context records snapshot creation, not compilation.',
                'checkout_context': {'path': str(root), 'head': git('rev-parse', 'HEAD'),
                                     'tracked_status': git('status', '--short', '--untracked-files=no')},
                'artifacts': artifacts,
            }
            (staging / 'source-build-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
            staging.rename(snapshot)
    return snapshot


@contextmanager
def preserve_desktops(applications):
    previous = {}
    for identifier in ('org.alive.session.test', 'org.alive.ultra.research'):
        path = applications / f'{identifier}.desktop'
        previous[path] = path.read_text() if path.exists() else None
    try:
        yield
    except BaseException:
        for path, contents in previous.items():
            if contents is None:
                path.unlink(missing_ok=True)
            else:
                atomic_write(path, contents)
        raise


def publish_snapshot(applications, current, snapshot):
    for name, identifier in (('alive', 'org.alive.session.test'), ('ultra', 'org.alive.ultra.research')):
        desktop = applications / f'{identifier}.desktop'
        contents = desktop_contents(current, name)
        if desktop.exists() and desktop.read_text() != contents:
            shutil.copy2(desktop, desktop.with_name(f'{desktop.name}.bak.{time.time_ns()}'))
        atomic_write(desktop, contents)
        if shutil.which('desktop-file-validate'):
            subprocess.run(['desktop-file-validate', str(desktop)], check=True)
    mime = applications.parent / 'mime'
    packages = mime / 'packages'
    packages.mkdir(parents=True, exist_ok=True)
    atomic_write(packages / 'org.alive.ultra.research.xml', '''<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="application/x-ultra-patch">
    <comment>Ultra patch</comment>
    <sub-class-of type="application/json"/>
    <glob pattern="*.ultra"/>
  </mime-type>
  <mime-type type="application/x-max-patch">
    <comment>Max patch or help patch</comment>
    <sub-class-of type="application/json"/>
    <glob pattern="*.maxpat"/>
    <glob pattern="*.maxhelp"/>
  </mime-type>
</mime-info>
''')
    if shutil.which('update-mime-database'):
        subprocess.run(['update-mime-database', str(mime)], check=True)
    if shutil.which('update-desktop-database'):
        subprocess.run(['update-desktop-database', str(applications)], check=True)
    # Select both apps only after the complete snapshot and entries are ready.
    temporary = current.with_name(f'.current-test-{time.time_ns()}')
    try:
        temporary.symlink_to(snapshot.relative_to(current.parent), target_is_directory=True)
        os.replace(temporary, current)
    finally:
        temporary.unlink(missing_ok=True)


def install(app, data, arguments):
    selection = data / 'alive'
    current = selection / 'current-test'
    build_directory = Path(arguments.build_dir).expanduser().resolve()
    snapshot = snapshot_build(app, selection / 'builds', build_directory, arguments.built_from)
    applications = data / 'applications'
    applications.mkdir(parents=True, exist_ok=True)
    with preserve_desktops(applications):
        publish_snapshot(applications, current, snapshot)
    print(f'Selected {snapshot}')
    print(f'Artifact hashes and provenance: {snapshot / "source-build-manifest.json"}')
    print('Open Alive (Test) or Ultra (Latest Build) from your app launcher.')
    print('Open .ultra files directly; use Open With Ultra for .maxpat and .maxhelp files.')
    print('Existing windows keep their original build; close and reopen to test this selection.')


def main():
    app = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build-dir', default=str(app / 'src-tauri/target/release'),
                        help='Directory containing the matching alive, ultra and libultra_native.so')
    parser.add_argument('--built-from', help='Known compilation commit (recorded as caller-supplied provenance)')
    arguments = parser.parse_args()
    data = Path(os.environ.get('XDG_DATA_HOME') or Path.home() / '.local/share').expanduser().resolve()
    selection = data / 'alive'
    selection.mkdir(parents=True, exist_ok=True)
    try:
        with (selection / '.install.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            install(app, data, arguments)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(f'Test build selection failed: {error}') from error


if __name__ == '__main__':
    main()
