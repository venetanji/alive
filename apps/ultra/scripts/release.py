#!/usr/bin/env python3
"""Native-host Ultra and Alive packages, sharing the same device runtime."""
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

from notices import validate as validate_notices

ROOT = Path(__file__).resolve().parents[3]
APP = ROOT / 'apps/ultra'
PRODUCTS = {'ultra': ('Ultra Research', 'Ultra'), 'alive': ('Alive', 'Alive')}
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

def install_native_library(source, destination):
    with tempfile.NamedTemporaryFile(dir=destination.parent, prefix=destination.name + '.', delete=False) as staged:
        staged_path = Path(staged.name)
    try:
        shutil.copy2(source, staged_path)
        staged_path.replace(destination)
    finally:
        staged_path.unlink(missing_ok=True)

def validate_version(cargo, tauri, tag=None):
    if cargo != tauri or not re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?', cargo):
        raise ValueError('Cargo and Tauri must have the same supported SemVer version')
    if tag is not None and tag != 'v' + cargo:
        raise ValueError(f'Tag must exactly match committed version v{cargo}')
    return cargo

def version(tag=None):
    versions = set()
    for product in PRODUCTS:
        app = ROOT/'apps'/product
        cargo = tomllib.loads((app/'src-tauri/Cargo.toml').read_text())['package']['version']
        tauri = json.loads((app/'src-tauri/tauri.conf.json').read_text())['version']
        versions.add(validate_version(cargo, tauri, tag))
    if len(versions) != 1:
        raise ValueError('Ultra and Alive must have the same release version')
    return versions.pop()

def bundle_config(target, runtime_names=(), product='ultra'):
    PRODUCTS[product]
    system, _, library, _ = TARGETS[target]
    bundle = {'active': True, 'resources': {'../../../LICENSE': 'licenses/Alive-LICENSE', '../THIRD-PARTY.txt': 'licenses/THIRD-PARTY.txt', '../core/VOICE.txt': 'licenses/Faust-VOICE.txt', '../THIRD-PARTY-CRATES.json': 'licenses/THIRD-PARTY-CRATES.json', 'native/vendor/fast_float/LICENSE-MIT': 'licenses/fast_float-MIT'}, 'icon': ['icons/release/icon.ico', 'icons/release/icon.icns', 'icons/release/128x128.png']}
    bundle['resources'].update({'../../alive/examples/two-instruments.alive': 'alive-session/alive/examples/two-instruments.alive',
                                '../examples/subtractive.ultra': 'alive-session/ultra/examples/subtractive.ultra'})
    if system == 'Darwin':
        # Tauri copies/signs this nested library in Contents/Frameworks.
        bundle['macOS'] = {'frameworks': ['../build/' + library], 'minimumSystemVersion': '14.0'}
    else:
        bundle['resources']['../build/' + library] = library
        for name in runtime_names:
            if Path(name).name != name or not name.lower().endswith('.dll'):
                raise ValueError('Invalid runtime library name')
            bundle['resources']['../build/' + name] = name
        if system == 'Linux':
            bundle['linux'] = {'deb': {'depends': ['libwebkit2gtk-4.1-0', 'libgtk-3-0', 'libasound2t64', 'libpipewire-0.3-0']}}
    if product == 'alive':
        # The shared library's build script also consumes TAURI_CONFIG. Absolute
        # sources keep its different manifest directory from changing resolution.
        resolve = lambda path: str((APP/'src-tauri'/path).resolve())
        bundle['resources'] = {resolve(source): dest for source, dest in bundle['resources'].items()}
        bundle['icon'] = [resolve(path) for path in bundle['icon']]
        if system == 'Darwin':
            bundle['macOS']['frameworks'] = [resolve(path) for path in bundle['macOS']['frameworks']]
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

def collect_artifacts(bundle, output, target, ver, product='ultra'):
    artifact = PRODUCTS[product][1]
    files = []
    for suffix in TARGETS[target][3]:
        matches = list(bundle.glob('**/*.' + suffix))
        if len(matches) != 1:
            raise ValueError(f'Expected exactly one {suffix} package, found {len(matches)}')
        files.append(matches[0])
    output.mkdir(parents=True, exist_ok=True)
    copied = []
    for src in files:
        dst = output/f'{artifact}-{ver}-{target}{src.suffix}'
        shutil.copy2(src, dst)
        copied.append(dst)
    (output/f'SHA256SUMS-{product}-{target}.txt').write_text(''.join(f'{digest(p)}  {p.name}\n' for p in copied))
    return copied

def verify_notice_resources(package):
    """Require exact committed notices inside the extracted/staged package."""
    notices = {
        'THIRD-PARTY.txt': APP/'THIRD-PARTY.txt',
        'THIRD-PARTY-CRATES.json': APP/'THIRD-PARTY-CRATES.json',
        'Faust-VOICE.txt': APP/'core/VOICE.txt',
    }
    for name, source in notices.items():
        matches = list(package.rglob(name))
        if len(matches) != 1 or digest(matches[0]) != digest(source):
            raise ValueError('Package is missing or has stale notice: ' + name)

def verify_bundled_session(executable, resources, env):
    session = resources/'alive-session/alive/examples/two-instruments.alive'
    if not session.is_file():
        raise ValueError('Package is missing its bundled Alive session')
    with tempfile.TemporaryDirectory(prefix='alive-packaged-session-') as temporary:
        # Run outside both the repository and the installed resource directory.
        run(executable, '--session-probe', session, Path(temporary)/'render', cwd=temporary, env=env)

def extract_deb(package, destination):
    # DEB uses short SysV ar member names. Host ar dialects and Windows text
    # stdout translation must not change the package's compressed bytes.
    with package.open('rb') as container:
        length = package.stat().st_size
        if container.read(8) != b'!<arch>\n':
            raise ValueError('Invalid DEB archive signature')
        data = []
        while container.tell() < length:
            header = container.read(60)
            if len(header) != 60 or header[58:] != b'`\n':
                raise ValueError('Invalid DEB member header')
            try:
                name = header[:16].decode('ascii').rstrip().removesuffix('/')
                size_text = header[48:58].decode('ascii').strip()
                if not size_text.isdecimal():
                    raise ValueError('Invalid DEB member size')
                size = int(size_text)
            except (UnicodeDecodeError, ValueError) as error:
                raise ValueError('Invalid DEB member metadata') from error
            offset = container.tell()
            if offset + size + size % 2 > length:
                raise ValueError('Truncated DEB member')
            if re.fullmatch(r'data\.tar(?:\.(?:gz|xz|bz2))?', name):
                data.append((offset, size))
            container.seek(offset + size + size % 2)
        if len(data) != 1:
            raise ValueError('DEB must contain exactly one supported data archive')
        offset, remaining = data[0]
        container.seek(offset)
        with tempfile.TemporaryFile() as payload:
            while remaining:
                block = container.read(min(remaining, 1024 * 1024))
                if not block:
                    raise ValueError('Truncated DEB data archive')
                payload.write(block)
                remaining -= len(block)
            payload.seek(0)
            with tarfile.open(fileobj=payload, mode='r:*') as archive:
                archive.extractall(destination, filter='data')

def linux_native_path(loaded, package, product, library):
    match = re.search(r'libultra_native\.so\s+=>\s+(.+?)\s+\(', loaded)
    paths = {(package/'usr/lib'/PRODUCTS[product][0]/library).resolve(),
             (package/'usr/lib'/library).resolve()}
    if 'not found' not in loaded and match:
        native = Path(match.group(1)).resolve()
        if native in paths and native.is_file():
            return native
    raise ValueError('Installed package cannot resolve its own native library: ' + loaded)

def verify_linux_payload(dest, library, product, env):
    product_name, _ = PRODUCTS[product]
    resources = dest/'usr/lib'/product_name
    native = resources/library
    exe = dest/'usr/bin'/product
    if not native.is_file() or not exe.is_file():
        raise ValueError(f'{product_name} package lacks its executable or native library')
    other = 'alive' if product == 'ultra' else 'ultra'
    if (dest/'usr/bin'/other).exists():
        raise ValueError('Separate application packages must not own the same executable: ' + other)
    loaded = subprocess.check_output(['ldd', str(exe)], env=env, text=True)
    # linuxdeploy moves linked libraries to usr/lib and patches the AppImage RPATH.
    native = linux_native_path(loaded, dest, product, library)
    desktops = list((dest/'usr/share/applications').glob('*.desktop'))
    if len(desktops) != 1 or not re.search(r'^Exec=' + re.escape(product) + r'(?:\s|$)', desktops[0].read_text(), re.M):
        raise ValueError('Package must launch its own application from its desktop entry')
    run('python', APP/'scripts/smoke_native.py', native, env=env)
    verify_bundled_session(exe, resources, env)

def verify_packages(bundle, target, product='ultra'):
    """Check staged layouts without allowing the build-tree search path to hide errors."""
    system, _, library, _ = TARGETS[target]
    env = os.environ.copy()
    env.pop('LD_LIBRARY_PATH', None)
    env.pop('DYLD_LIBRARY_PATH', None)
    env['PATH'] = os.pathsep.join(p for p in env['PATH'].split(os.pathsep) if Path(p) != APP/'build')
    if system == 'Linux':
        with tempfile.TemporaryDirectory(prefix=product + '-install-') as temporary:
            dest = Path(temporary)
            debs = list(bundle.glob('deb/*.deb'))
            if len(debs) != 1:
                raise ValueError('Expected one DEB to verify')
            extract_deb(debs[0], dest)
            verify_notice_resources(dest)
            verify_linux_payload(dest, library, product, env)
            images = list(bundle.glob('appimage/*.AppImage'))
            if len(images) != 1:
                raise ValueError('Expected one AppImage to verify')
            images[0].chmod(images[0].stat().st_mode | 0o100)
            subprocess.run([str(images[0]), '--appimage-extract'], cwd=dest, env=env, stdout=subprocess.DEVNULL, check=True)
            verify_notice_resources(dest/'squashfs-root')
            verify_linux_payload(dest/'squashfs-root', library, product, env)
    elif system == 'Darwin':
        app = bundle/'macos'/(PRODUCTS[product][0] + '.app')
        verify_notice_resources(app)
        native = app/'Contents/Frameworks'/library
        if not native.is_file():
            raise ValueError('App bundle lacks native framework library')
        exe = app/'Contents/MacOS'/product
        linked = subprocess.check_output(['otool', '-L', str(exe)], text=True)
        if '@rpath/' + library not in linked:
            raise ValueError('App must link its bundled @rpath native library: ' + product)
        run('python', APP/'scripts/smoke_native.py', native, env=env)
        verify_bundled_session(exe, app/'Contents/Resources', env)
    else:
        # Inspect the actual NSIS payload, not the adjacent development DLL.
        with tempfile.TemporaryDirectory(prefix='ultra-install-') as temporary:
            dest = Path(temporary)
            installers = list(bundle.glob('nsis/*.exe'))
            if len(installers) != 1:
                raise ValueError('Expected one NSIS installer to verify')
            run('7z', 'x', '-y', '-o' + str(dest), installers[0])
            verify_notice_resources(dest)
            dlls = list(dest.rglob(library))
            if len(dlls) != 1 or not (dlls[0].parent/(product + '.exe')).is_file():
                raise ValueError('NSIS payload must place native DLL beside ' + product + '.exe')
            runtime_names = (APP/'build/windows-runtime-libraries.txt').read_text().splitlines()
            if not runtime_names or not all((dlls[0].parent/name).is_file() for name in runtime_names):
                raise ValueError('NSIS payload lacks matching MSVC runtime libraries')
            dumpbin = (APP/'build/dumpbin-path.txt').read_text()
            imports = subprocess.check_output([dumpbin, '/DEPENDENTS', str(dlls[0])], text=True)
            for name in re.findall(r'(?im)^\s*((?:msvcp|vcruntime|concrt)[a-z0-9_]*\.dll)\s*$', imports):
                if not (dlls[0].parent/name).is_file():
                    raise ValueError('Unbundled native runtime import: ' + name)
            print(imports)
            run('python', APP/'scripts/smoke_native.py', dlls[0], env=env)
            verify_bundled_session(dlls[0].parent/(product + '.exe'), dlls[0].parent, env)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['check-version', 'build', 'collect'])
    parser.add_argument('--target', choices=TARGETS)
    parser.add_argument('--product', choices=['all', *PRODUCTS], default='all')
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
    products = list(PRODUCTS) if args.product == 'all' else [args.product]
    if args.command == 'collect':
        for product in products:
            out = ROOT/'apps'/product/'src-tauri/target'/args.target/'release'
            collect_artifacts(out/'bundle', ROOT/'dist'/product, args.target, ver, product=product)
        return
    prepare_dependencies()
    validate_notices()
    build = APP/'build'
    configure = ['cmake', '-S', APP, '-B', build, '-DCMAKE_BUILD_TYPE=Release', '-DULTRA_BUILD_MERGED_ARCHIVE=OFF']
    if system == 'Windows':
        configure += ['-G', 'Visual Studio 17 2022', '-A', 'x64']
    if system == 'Darwin':
        configure += ['-DCMAKE_OSX_DEPLOYMENT_TARGET=14.0']
    run(*configure)
    run('cmake', '--build', build, '--config', 'Release', '--target', 'ultra_native', 'ultra-parser-test', '--parallel', os.environ.get('JOBS', '2'))
    run(build/('ultra-parser-test.exe' if system == 'Windows' else 'ultra-parser-test'))
    env = os.environ.copy()
    env['ULTRA_NATIVE_LIB_DIR'] = str(build)
    env['PATH'] = str(build) + os.pathsep + env['PATH']
    if system == 'Linux':
        env['LD_LIBRARY_PATH'] = str(build)
    elif system == 'Darwin':
        env['DYLD_LIBRARY_PATH'] = str(build)
    # Exercise the real shared-library ABI before building installers.
    run('python', APP/'scripts/smoke_native.py', build/library, env=env)
    # Reuse the existing original icon, not any Max/Ableton assets.
    cli = ['node', APP/'scripts/tooling/node_modules/@tauri-apps/cli/tauri.js']
    run(*cli, 'icon', 'src-tauri/icons/icon.png', '--output', 'src-tauri/icons/release', cwd=APP, env=env)
    # tauri-build embeds the default ICO even when running cargo test before bundling.
    if system == 'Windows':
        shutil.copy2(APP/'src-tauri/icons/release/icon.ico', APP/'src-tauri/icons/icon.ico')
    # Cargo prepends its output directory to the loader path. Refresh both
    # tested hosts before tests can resolve an older adjacent native library.
    for product in dict.fromkeys(['ultra', *products]):
        out = ROOT/'apps'/product/'src-tauri/target'/args.target/'release'
        out.mkdir(parents=True, exist_ok=True)
        install_native_library(build/library, out/library)
    run('cargo', 'test', '--manifest-path', APP/'src-tauri/Cargo.toml', '--release', '--locked', '--target', args.target, env=env)
    if 'alive' in products:
        run('cargo', 'test', '--manifest-path', ROOT/'apps/alive/src-tauri/Cargo.toml', '--release', '--locked', '--target', args.target, env=env)
    runtime_names = []
    if system == 'Windows':
        runtime_names = (build/'windows-runtime-libraries.txt').read_text().splitlines()
        if not runtime_names or not all((build/name).is_file() for name in runtime_names):
            raise ValueError('Matching MSVC runtime libraries must be staged')
    bundles = {'Linux': 'deb,appimage', 'Darwin': 'app,dmg', 'Windows': 'nsis'}[system]
    for product in products:
        app = ROOT/'apps'/product
        out = app/'src-tauri/target'/args.target/'release'
        out.mkdir(parents=True, exist_ok=True)
        # Atomic replacement preserves a library mapped by a running developer app.
        install_native_library(build/library, out/library)
        config = app/'src-tauri/tauri.release.generated.json'
        generated = bundle_config(args.target, runtime_names, product)
        if system == 'Linux':
            resources = generated['bundle']['resources']
            resources = {source: dest for source, dest in resources.items() if dest != library}
            # tauri-build skips copying a resource already at its destination.
            resources[str(out/library)] = library
            generated['bundle']['resources'] = resources
        config.write_text(json.dumps(generated, indent=2) + '\n')
        run(*cli, '-v', 'build', '--target', args.target, '--bundles', bundles, '--config', config, '--', '--locked', cwd=app, env=env)
        verify_packages(out/'bundle', args.target, product)

if __name__ == '__main__':
    main()
