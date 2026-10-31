import ast
from pathlib import Path
import subprocess
import yaml

base = '6ab77758959d47891ad45dc458f4c9cbe16ff282'
workflow = '.github/workflows/ultra-ci.yml'
original = yaml.safe_load(subprocess.check_output(['git', 'show', f'{base}:{workflow}'], text=True))
current = yaml.safe_load(Path(workflow).read_text())
command = 'python3 apps/ultra/tests/test_alive_clip_observation_failure.py\n'
changed = 0
for job in original['jobs'].values():
    for step in job.get('steps', []):
        if step.get('name') == 'Verify native clip observation boundaries and failure isolation':
            step['run'] = command + step['run']
            changed += 1
assert changed == 1
assert current == original, 'Unexpected workflow or timeout change'
source = 'apps/ultra/tests/check_alive_clip_observation.py'
before = ast.parse(subprocess.check_output(['git', 'show', f'{base}:{source}'], text=True))
after = ast.parse(Path(source).read_text())
assert ast.dump(ast.Module(body=before.body[:-1], type_ignores=[])) == ast.dump(ast.Module(body=after.body[:-1], type_ignores=[])), 'Native regression run behavior changed'
print('PASS YAML parse; routine regression wired; existing workflow/timeouts and native run body unchanged')
