import ast
import datetime
import hashlib
import json
from pathlib import Path
import shlex
import subprocess
import sys

ROOT = Path('/home/venetanji/.codex/worktrees/edd5/alive')
OUT = Path('/tmp/alive-workspaces-clip-launch-diagnostic')
PIN = '729dc9a555a389130304fe52b081bae351f814da'


def verify_sources(label):
    entries = subprocess.check_output(['git', 'ls-tree', '-rz', PIN, '--', 'apps'], cwd=ROOT)
    manifest = {}
    for entry in entries.split(b'\0'):
        if not entry:
            continue
        meta, raw_name = entry.split(b'\t', 1)
        _, kind, blob = meta.decode().split()
        if kind != 'blob':
            continue
        name = raw_name.decode()
        data = (ROOT/name).read_bytes()
        actual = hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
        assert actual == blob, name
        manifest[name] = {'git_blob': blob, 'sha256': hashlib.sha256(data).hexdigest()}
    for name, digest in {
        'alive': 'bac50bb1af01c2d15d985d0cf345f21a1efcd6a0be450f0b77870df4356c3260',
        'libultra_native.so': '4c54e3e0a2e7bf2007a56620d1006658e97b86d5f8828e08f13e9ffd3a1e9e70',
    }.items():
        path = ROOT/'apps/ultra/src-tauri/target/release'/name
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        assert actual == digest, str(path)
        manifest[str(path)] = {'sha256': actual}
    (OUT/(label+'-source-sha256.json')).write_text(json.dumps(manifest, indent=2)+'\n')
    return manifest


before = verify_sources('before')
for name in ('diagnostic_driver.py', 'run_diagnostic.py'):
    ast.parse((OUT/name).read_text(), filename=name)
command = ['env', '-u', 'ALIVE_SYSROOT', 'PATH=/usr/bin:/bin', 'ULTRA_TEST_ALIVE=1',
           'ULTRA_TEST_SCRIPT='+str(OUT/'diagnostic_driver.py'), 'PYTHONUNBUFFERED=1',
           'timeout', '--signal=TERM', '--kill-after=10s', '480s',
           'bash', 'apps/ultra/tests/check_canvas_desktop.sh', str(OUT/'original-observed')]
record = {'command': shlex.join(command), 'cwd': str(ROOT), 'source_pin': PIN,
          'start_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'observed_head_at_start': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
          'driver_sha256': hashlib.sha256((OUT/'diagnostic_driver.py').read_bytes()).hexdigest()}
(OUT/'command.json').write_text(json.dumps(record, indent=2)+'\n')
with (OUT/'original-observed.log').open('w') as log:
    result = subprocess.run(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
record.update(exit=result.returncode, end_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
              observed_head_at_end=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip())
after = verify_sources('after')
record['source_binary_manifests_equal'] = before == after
assert before == after
(OUT/'command.json').write_text(json.dumps(record, indent=2)+'\n')
print(json.dumps(record, indent=2))
print((OUT/'original-observed.log').read_text()[-5000:])
sys.exit(result.returncode)
