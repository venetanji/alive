"""Process identity and independent cleanup for private desktop journeys."""
import hashlib
from pathlib import Path
import subprocess


def file_identity(path):
    stat = path.stat()
    with path.open('rb') as file:
        digest = hashlib.file_digest(file, 'sha256').hexdigest()
    return {'device': stat.st_dev, 'inode': stat.st_ino, 'sha256': digest}


def process_identity(pid, library_name='libultra_native'):
    proc = Path('/proc') / str(pid)
    executable = proc / 'exe'
    result = {'executable_path': str(executable.resolve()), 'executable': file_identity(executable), 'libraries': []}
    seen = set()
    for line in (proc / 'maps').read_text().splitlines():
        parts = line.split(maxsplit=5)
        if len(parts) != 6 or library_name not in parts[5]:
            continue
        path = Path(parts[5])
        device = tuple(int(part, 16) for part in parts[3].split(':'))
        inode = int(parts[4])
        key = (device, inode)
        if key in seen:
            continue
        seen.add(key)
        identity = file_identity(path)
        if identity['inode'] != inode:
            raise AssertionError(f'mapped library changed while process is running: {path}')
        result['libraries'].append({'path': str(path), 'mapping_device': device, 'mapping_inode': inode, **identity})
    if not result['libraries']:
        raise AssertionError(f'no mapped library matching {library_name}')
    result['libraries'].sort(key=lambda item: item['path'])
    return result


def assert_same_identity(first, second):
    assert first == second, f'launch/restart identity differs: {first!r} != {second!r}'


def stop_recorder(process, timeout=10):
    if process.poll() is not None:
        return
    try:
        process.communicate(b'q\n', timeout=timeout)
    except subprocess.TimeoutExpired:
        process.kill()
        process.communicate()
        raise RuntimeError('recorder did not stop and was killed')


def cleanup_independently(actions):
    errors = []
    for action in actions:
        try:
            action()
        except Exception as error:
            errors.append(repr(error))
    return errors
