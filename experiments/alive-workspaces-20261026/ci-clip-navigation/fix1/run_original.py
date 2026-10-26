import ast
import datetime
import hashlib
import json
from pathlib import Path
import shlex
import subprocess
import sys

ROOT = Path('/home/venetanji/.codex/worktrees/edd5/alive')
OUT = Path('/tmp/alive-workspaces-clip-navigation-fix1')
HELPER = 'apps/ultra/tests/alive_workspace_navigation.py'
BASE = '1194faff81170fe57d7283fac04488233610cfcd'


def verify(label):
    before = json.loads((OUT/'before-input-sha256.json').read_text())
    current = {name: {'sha256': hashlib.sha256((ROOT/name).read_bytes()).hexdigest()}
               for name in before}
    changed = [name for name in before if before[name]['sha256'] != current[name]['sha256']]
    assert changed == [HELPER], changed
    ast.parse((ROOT/HELPER).read_text(), filename=HELPER)
    subprocess.run(['git', 'diff', '--check'], cwd=ROOT, check=True)
    (OUT/(label+'-input-sha256.json')).write_text(json.dumps(current, indent=2)+'\n')
    return current


initial = verify('pre-run')
subprocess.run(['git', 'diff', '--', HELPER], cwd=ROOT,
               stdout=(OUT/'fix.diff').open('w'), check=True)
command = ['env', '-u', 'ALIVE_SYSROOT', 'PATH=/usr/bin:/bin', 'ULTRA_TEST_ALIVE=1',
           'ULTRA_TEST_SCRIPT='+str(ROOT/'apps/ultra/tests/check_alive_observability.py'),
           'PYTHONUNBUFFERED=1', 'timeout', '--signal=TERM', '--kill-after=10s', '480s',
           'bash', 'apps/ultra/tests/check_canvas_desktop.sh', str(OUT/'original')]
record = {'source_base': BASE, 'source_diff': str(OUT/'fix.diff'),
          'command': shlex.join(command), 'cwd': str(ROOT),
          'start_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'instrumentation': 'none; original check_alive_observability.py directly'}
(OUT/'command.json').write_text(json.dumps(record, indent=2)+'\n')
with (OUT/'original.log').open('w') as log:
    result = subprocess.run(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
record.update(exit=result.returncode, end_utc=datetime.datetime.now(datetime.timezone.utc).isoformat())
final = verify('post-run')
assert initial == final
record['input_hashes_unchanged_during_run'] = True
(OUT/'command.json').write_text(json.dumps(record, indent=2)+'\n')
print(json.dumps(record, indent=2))
print((OUT/'original.log').read_text()[-7000:])
sys.exit(result.returncode)
