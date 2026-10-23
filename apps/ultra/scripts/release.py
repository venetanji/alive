#!/usr/bin/env python3
"""Native-host Ultra packaging. No Max installation or DSP regeneration required."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import tarfile
import tempfile
import tomllib
import urllib.request

ROOT = Path(__file__).resolve().parents[3]
APP = ROOT / 'apps/ultra'
TARGETS = {
    'x86_64-unknown-linux-gnu': ('Linux', 'x86_64', 'libultra_native.so', ('deb', 'AppImage')),
    'x86_64-pc-windows-msvc': ('Windows', 'AMD64', 'ultra_native.dll', ('exe',)),
    'aarch64-apple-darwin': ('Darwin', 'arm64', 'libultra_native.dylib', ('dmg',)),
    'x86_64-apple-darwin': ('Darwin', 'x86_64', 'libultra_native.dylib', ('dmg',)),
}
CLOCKWORK = '94b67500c96e105491682ec68741b5018560eab7'
DEPENDENCIES = (
    (f'https://codeload.github.com/samaaron/clockwork/tar.gz/{CLOCKWORK}',
     'experiments/clockwork-faust/.deps', 'clockwork.tar.gz',
     '09063eee6323b656dbe65258955d5387e5053829c9324afe16b257fca04d07ca', f'clockwork-{CLOCKWORK}/CMakeLists.txt'),
    ('https://github.com/grame-cncm/faust/releases/download/2.88.0/faust-2.88.0.tar.gz',
     'experiments/faust-reference/.deps', 'faust.tar.gz',
     'e4e175cf236924b5b7d4784cbb8c50cc01e211159e169655dd9e6d8f92b871d9', 'faust-2.88.0/architecture/faust/dsp/dsp.h'),
)

def run(*args, cwd=ROOT, env=None):
    subprocess.run([str(a) for a in args], cwd=cwd, env=env, check=True)

def digest(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

def validate_version(cargo, tauri, tag=None):
    if cargo != tauri or not re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?', cargo):
        raise ValueError('Cargo and Tauri must have the same supported SemVer version')
    if tag is not None and tag != 'v' + cargo:
        raise ValueError(f'Tag must exactly match committed version v{cargo}')
    return cargo

def version(tag=None):
    cargo = tomllib.loads((APP/'src-tauri/Cargo.toml').read_text())['package']['version']
    tauri = json.loads((APP/'src-tauri/tauri.conf.json').read_text())['version']
    return validate_version(cargo, tauri, tag)

def bundle_config(target):
    system, _, library, _ = TARGETS[target]
    bundle = {'active': True, 'resources': {'../../../LICENSE': 'licenses/Alive-LICENSE', '../THIRD-PARTY.txt': 'licenses/THIRD-PARTY.txt', '../THIRD-PARTY-CRATES.json': 'licenses/THIRD-PARTY-CRATES.json'}, 'icon': ['icons/release/icon.ico', 'icons/release/icon.icns', 'icons/release/128x128.png']}
    if system == 'Darwin':
        # Tauri copies/signs this nested library in Contents/Frameworks.
        bundle['macOS'] = {'frameworks': ['../build/' + library], 'minimumSystemVersion': '14.0'}
    else:
        bundle['resources']['../build/' + library] = library
        if system == 'Linux':
            bundle['linux'] = {'deb': {'depends': ['libwebkit2gtk-4.1-0', 'libgtk-3-0', 'libasound2t64', 'libpipewire-0.3-0']}}
    return {'bundle': bundle}

def prepare_dependencies():
    for url, directory, archive_name, sha, marker in DEPENDENCIES:
        directory = ROOT/directory
        directory.mkdir(parents=True, exist_ok=True)
        archive = directory/archive_name
        if not archive.exists():
            temporary = archive.with_suffix('.partial')
            with urllib.request.urlopen(url, timeout=120) as response, temporary.open('wb') as out:
                shutil.copyfileobj(response, out)
            if digest(temporary) != sha:
                temporary.unlink()
                raise ValueError('Dependency SHA256 mismatch: ' + archive_name)
            temporary.replace(archive)
        if digest(archive) != sha:
            raise ValueError('Cached dependency SHA256 mismatch: ' + archive_name)
        if not (directory/marker).exists():
            with tarfile.open(archive, 'r:gz') as tar:
                tar.extractall(directory, filter='data')
    lock = ROOT/f'experiments/clockwork-faust/.deps/clockwork-{CLOCKWORK}/rust/Cargo.lock'
    if digest(lock) != '1cad43e702066ecb5a1659b7906306f513d71c5b88b6711323ece88b6458c20c':
        raise ValueError('Pinned Clockwork Cargo.lock differs')

def collect_artifacts(bundle, output, target, ver):
    files = []
    for suffix in TARGETS[target][3]:
        matches = list(bundle.glob('**/*.' + suffix))
        if len(matches) != 1:
            raise ValueError(f'Expected exactly one {suffix} package, found {len(matches)}')
        files.append(matches[0])
    output.mkdir(parents=True, exist_ok=True)
    copied = []
    for src in files:
        dst = output/f'Ultra-{ver}-{target}{src.suffix}'
        shutil.copy2(src, dst)
        copied.append(dst)
    (output/f'SHA256SUMS-{target}.txt').write_text(''.join(f'{digest(p)}  {p.name}\n' for p in copied))
    return copied

def verify_packages(bundle, target):
    """Check staged layouts without allowing the build-tree search path to hide errors."""
    system, _, library, _ = TARGETS[target]
    env = os.environ.copy()
    env.pop('LD_LIBRARY_PATH', None)
    env.pop('DYLD_LIBRARY_PATH', None)
    env['PATH'] = os.pathsep.join(p for p in env['PATH'].split(os.pathsep) if Path(p) != APP/'build')
    if system == 'Linux':
        with tempfile.TemporaryDirectory(prefix='ultra-install-') as temporary:
            dest = Path(temporary)
            debs = list(bundle.glob('deb/*.deb'))
            if len(debs) != 1:
                raise ValueError('Expected one DEB to verify')
            run('dpkg-deb', '--extract', debs[0], dest)
            exe = dest/'usr/bin/ultra'
            native = dest/'usr/lib/Ultra Research'/library
            if not exe.is_file() or not native.is_file():
                raise ValueError('DEB is missing its executable or native library')
            loaded = subprocess.check_output(['ldd', str(exe)], env=env, text=True)
            match = re.search(r'libultra_native\.so\s+=>\s+(.+?)\s+\(', loaded)
            if 'not found' in loaded or not match or Path(match.group(1)).resolve() != native.resolve():
                raise ValueError('Installed DEB cannot resolve its own native library: ' + loaded)
            run('python', APP/'scripts/smoke_native.py', native, env=env)
            images = list(bundle.glob('appimage/*.AppImage'))
            if len(images) != 1:
                raise ValueError('Expected one AppImage to verify')
            images[0].chmod(images[0].stat().st_mode | 0o100)
            subprocess.run([str(images[0]), '--appimage-extract'], cwd=dest, env=env, stdout=subprocess.DEVNULL, check=True)
            packaged = dest/'squashfs-root/usr/lib/Ultra Research'/library
            if not packaged.is_file():
                raise ValueError('AppImage lacks its native library')
            run('python', APP/'scripts/smoke_native.py', packaged, env=env)
    elif system == 'Darwin':
        app = bundle/'macos/Ultra Research.app'
        native = app/'Contents/Frameworks'/library
        if not native.is_file():
            raise ValueError('App bundle lacks native framework library')
        linked = subprocess.check_output(['otool', '-L', str(app/'Contents/MacOS/ultra')], text=True)
        if '@rpath/' + library not in linked:
            raise ValueError('App must link its bundled @rpath native library')
        run('python', APP/'scripts/smoke_native.py', native, env=env)
    else:
        # Inspect the actual NSIS payload, not the adjacent development DLL.
        with tempfile.TemporaryDirectory(prefix='ultra-install-') as temporary:
            dest = Path(temporary)
            installers = list(bundle.glob('nsis/*.exe'))
            if len(installers) != 1:
                raise ValueError('Expected one NSIS installer to verify')
            run('7z', 'x', '-y', '-o' + str(dest), installers[0])
            dlls = list(dest.rglob(library))
            if len(dlls) != 1 or not (dlls[0].parent/'ultra.exe').is_file():
                raise ValueError('NSIS payload must place native DLL beside ultra.exe')
            run('python', APP/'scripts/smoke_native.py', dlls[0], env=env)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['check-version', 'build', 'collect'])
    parser.add_argument('--target', choices=TARGETS)
    parser.add_argument('--tag')
    args = parser.parse_args()
    ver = version(args.tag)
    if args.command == 'check-version':
        print(ver)
        return
    if not args.target:
        parser.error('--target is required')
    system, machine, library, _ = TARGETS[args.target]
    if platform.system() != system or platform.machine().lower() != machine.lower():
        raise ValueError('Use the native runner matching the target; cross-compilation is not configured')
    out = APP/'src-tauri/target'/args.target/'release'
    if args.command == 'collect':
        collect_artifacts(out/'bundle', ROOT/'dist/ultra', args.target, ver)
        return
    prepare_dependencies()
    build = APP/'build'
    configure = ['cmake', '-S', APP, '-B', build, '-DCMAKE_BUILD_TYPE=Release', '-DULTRA_BUILD_MERGED_ARCHIVE=OFF']
    if system == 'Windows':
        configure += ['-G', 'Visual Studio 17 2022', '-A', 'x64']
    if system == 'Darwin':
        configure += ['-DCMAKE_OSX_DEPLOYMENT_TARGET=14.0']
    run(*configure)
    run('cmake', '--build', build, '--config', 'Release', '--target', 'ultra_native', '--parallel', os.environ.get('JOBS', '2'))
    env = os.environ.copy()
    env['ULTRA_NATIVE_LIB_DIR'] = str(build)
    env['PATH'] = str(build) + os.pathsep + env['PATH']
    if system == 'Linux':
        env['LD_LIBRARY_PATH'] = str(build)
    elif system == 'Darwin':
        env['DYLD_LIBRARY_PATH'] = str(build)
    # Exercise the real shared-library ABI before building installers.
    run('python', APP/'scripts/smoke_native.py', build/library, env=env)
    out.mkdir(parents=True, exist_ok=True)
    shutil.copy2(build/library, out/library)
    run('cargo', 'test', '--manifest-path', APP/'src-tauri/Cargo.toml', '--release', '--locked', '--target', args.target, env=env)
    # Reuse the existing original icon, not any Max/Ableton assets.
    cli = ['node', APP/'scripts/tooling/node_modules/@tauri-apps/cli/tauri.js']
    run(*cli, 'icon', 'src-tauri/icons/icon.png', '--output', 'src-tauri/icons/release', cwd=APP, env=env)
    config = APP/'src-tauri/tauri.release.generated.json'
    config.write_text(json.dumps(bundle_config(args.target), indent=2) + '\n')
    bundles = {'Linux': 'deb,appimage', 'Darwin': 'app,dmg', 'Windows': 'nsis'}[system]
    run(*cli, 'build', '--target', args.target, '--bundles', bundles, '--config', config, '--', '--locked', cwd=APP, env=env)
    verify_packages(out/'bundle', args.target)

if __name__ == '__main__':
    main()
