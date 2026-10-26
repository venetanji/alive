import json
import os
from pathlib import Path
import subprocess

root = Path('/tmp/alive-workspaces-clip-ci-fix/fix1')
commands = [
    ['python3', '-m', 'py_compile', 'apps/ultra/tests/check_alive_clip_observation.py', 'apps/ultra/tests/test_alive_clip_observation_failure.py'],
    ['python3', str(root / 'check_scope.py')],
    ['git', 'diff', '--check'],
]
results = []
for index, command in enumerate(commands):
    environment = dict(os.environ, PYTHONPYCACHEPREFIX=str(root / 'pycache'))
    result = subprocess.run(command, capture_output=True, text=True, env=environment)
    output = result.stdout + result.stderr
    (root / f'cheap-{index}.log').write_text(output)
    results.append({'command': command, 'exit_code': result.returncode, 'output': output})
    print(json.dumps(results[-1]))
(root / 'cheap-checks.json').write_text(json.dumps(results, indent=2) + '\n')
assert all(result['exit_code'] == 0 for result in results)
