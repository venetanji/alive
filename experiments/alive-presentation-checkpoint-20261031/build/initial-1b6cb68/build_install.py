import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

repo = Path('/home/venetanji/.codex/worktrees/phase2-ui/alive')
run = Path(__file__).resolve().parent
native = Path('/tmp/alive-live-publish-native-20261031')
native_hash = '69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90'
cache = Path('/tmp/alive-live-regions-rust-target')
commit = subprocess.check_output(['git', 'rev-parse', sys.argv[1]], cwd=repo, text=True).strip()
source = run / 'source'
archive = run / 'source.tar'
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(name, value):
    (run / name).write_text(json.dumps(value, indent=2) + '\n')


def verify_archive():
    result = {}
    rows = subprocess.check_output(['git', 'ls-tree', '-rz', commit], cwd=repo).split(b'\0')
    for row in rows:
        if not row:
            continue
        meta, name = row.split(b'\t', 1)
        mode, kind, oid = meta.split()
        assert kind == b'blob', os.fsdecode(name)
        relative = os.fsdecode(name)
        path = source / relative
        data = os.fsencode(os.readlink(path)) if mode == b'120000' else path.read_bytes()
        blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        assert blob == oid.decode(), relative
        result[relative] = {'git_blob_sha1': blob, 'sha256': hashlib.sha256(data).hexdigest()}
    return result


assert digest(native / 'libultra_native.so') == native_hash
assert not source.exists() and not archive.exists(), 'Use a fresh publication run directory'
source.mkdir()
subprocess.run(['git', 'archive', '--format=tar', '--output=' + str(archive), commit], cwd=repo, check=True)
subprocess.run(['tar', '-xf', str(archive), '-C', str(source)], check=True)
blobs = verify_archive()
write_json('archive-verification.json', {
    'source_commit': commit, 'archive_tar_sha256': digest(archive),
    'build_source_archive': str(source), 'verified_git_blob_count': len(blobs),
    'pre_build_all_blobs_verified': True,
})
print('Verified fixed source archive:', commit, len(blobs), 'blobs', flush=True)

for proc in Path('/proc').iterdir():
    if not proc.name.isdigit():
        continue
    try:
        mappings = (proc / 'maps').read_text()
    except (PermissionError, FileNotFoundError, ProcessLookupError):
        continue
    assert str(cache) not in mappings, 'Cargo output is mapped by PID ' + proc.name

env = {**os.environ, 'ULTRA_NATIVE_LIB_DIR': str(native),
       'LD_LIBRARY_PATH': str(native), 'CARGO_TARGET_DIR': str(cache)}
commands = []
for app in ['alive', 'ultra']:
    command = ['cargo', 'build', '--manifest-path', str(source / 'apps' / app / 'src-tauri/Cargo.toml'), '--locked']
    commands.append(command)
    with (run / (app + '.log')).open('w') as log:
        subprocess.run(command, cwd=source, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
    print('Built', app, flush=True)
assert verify_archive() == blobs
assert digest(native / 'libultra_native.so') == native_hash
archive_info = json.loads((run / 'archive-verification.json').read_text())
archive_info['post_build_all_blobs_verified'] = True
write_json('archive-verification.json', archive_info)

builds = Path.home() / '.local/share/alive/builds'
destination = builds / commit[:7]
assert not destination.exists(), destination
staging = Path(tempfile.mkdtemp(prefix='.presentation-', dir=builds))
try:
    payload = staging / 'payload'
    (payload / 'bin').mkdir(parents=True)
    for app in ['alive', 'ultra']:
        shutil.copy2(cache / 'debug' / app, payload / 'bin' / app)
        config_root = source / 'apps' / app / 'src-tauri'
        config = json.loads((config_root / 'tauri.conf.json').read_text())
        for origin, relative in config['bundle']['resources'].items():
            target = payload / 'lib' / config['productName'] / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(config_root / origin, target)
    shutil.copy2(native / 'libultra_native.so', payload / 'bin/libultra_native.so')
    shutil.copy2(source / 'apps/ultra/src-tauri/icons/icon.png', payload / 'icon.png')
    selected = {name: item for name, item in blobs.items() if name.startswith((
        'apps/alive/', 'apps/ultra/ui/', 'apps/ultra/src-tauri/', 'apps/ultra/examples/', 'crates/'))}
    manifest = {
        'source_commit': commit,
        'source_tree': subprocess.check_output(['git', 'rev-parse', commit + '^{tree}'], cwd=repo, text=True).strip(),
        'source_git_repository': str(repo), 'source_worktree': str(source),
        'build_source_archive': str(source), 'source_sha256': {name: item['sha256'] for name, item in selected.items()},
        'source_git_blob_sha1': {name: item['git_blob_sha1'] for name, item in selected.items()},
        'archive_tar_sha256': digest(archive), 'verified_archive_blob_count': len(blobs),
        'artifacts': {path.name: digest(path) for path in (payload / 'bin').iterdir()},
        'resources': {str(path.relative_to(payload)): digest(path) for path in (payload / 'lib').rglob('*') if path.is_file()},
        'icon_sha256': digest(payload / 'icon.png'), 'build_commands': commands,
        'build_native_dir': str(native), 'runtime_native_dir': str(native), 'frozen_native_sha256': native_hash,
        'cargo_target_dir': str(cache), 'build_profile': 'dev --locked',
        'installed_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'verification_packet': 'experiments/alive-presentation-checkpoint-20261031',
        'scope': 'Reviewed saved surface checkpoint; presentation authoring, Max import and native hosting remain pending',
    }
    (payload / 'source-build-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    os.replace(payload, destination)
finally:
    shutil.rmtree(staging)

for name, expected in manifest['artifacts'].items():
    assert digest(destination / 'bin' / name) == expected, name
for relative, expected in manifest['resources'].items():
    assert digest(destination / relative) == expected, relative
assert digest(destination / 'icon.png') == manifest['icon_sha256']
write_json('source-build-manifest.json', manifest)
result = {'installed_path': str(destination), 'source_commit': commit,
          'source_count': len(selected), 'resource_count': len(manifest['resources']),
          'artifacts': manifest['artifacts'], 'all_installed_hashes_verified': True}
write_json('install-verification.json', result)
print(json.dumps(result, indent=2), flush=True)
