import ast
import json
from pathlib import Path
import subprocess
import yaml

source = 'apps/ultra/tests/check_alive_desktop.py'
base = ast.parse(subprocess.check_output([
    'git', 'show', '87cb416d0f22d6be65f72bc3c39dd5d3318dc087:' + source], text=True))
current = ast.parse(Path(source).read_text())
original_asserts = [ast.dump(n, include_attributes=False) for n in ast.walk(base) if isinstance(n, ast.Assert)]
current_asserts = [ast.dump(n, include_attributes=False) for n in ast.walk(current) if isinstance(n, ast.Assert)]
assert sorted(original_asserts) == sorted(current_asserts), 'Journey assertion changed'


class RemoveDiagnostics(ast.NodeTransformer):
    def visit_Expr(self, node):
        if isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name) and node.value.func.id == 'checkpoint':
            return None
        return self.generic_visit(node)

    def visit_With(self, node):
        self.generic_visit(node)
        return node.body


old_run = next(n for n in base.body if isinstance(n, ast.FunctionDef) and n.name == 'run')
new_run = next(n for n in current.body if isinstance(n, ast.FunctionDef) and n.name == 'run')
assert ast.dump(old_run, include_attributes=False) == ast.dump(RemoveDiagnostics().visit(new_run), include_attributes=False)
old_capture = next(n for n in base.body if isinstance(n, ast.FunctionDef) and n.name == 'finish_capture')
new_capture = next(n for n in current.body if isinstance(n, ast.FunctionDef) and n.name == 'measured_finish_capture')
new_capture.name = 'finish_capture'
assert ast.dump(old_capture, include_attributes=False) == ast.dump(new_capture, include_attributes=False)
data = yaml.safe_load(Path('.github/workflows/ultra-ci.yml').read_text())
contracts = data['jobs']['contracts']['steps']
check = next(s for s in contracts if s.get('name') == 'Test desktop timing diagnostics without a native desktop')
assert check['run'] == 'python -m unittest discover -s apps/ultra/tests -p test_desktop_timing.py -v'
native = data['jobs']['native']['steps']
journey = next(s for s in native if s.get('name') == 'Exercise the actual Alive desktop session and hosted editor')
assert journey['timeout-minutes'] == 8
original_workflow = yaml.safe_load(subprocess.check_output([
    'git', 'show', '87cb416d0f22d6be65f72bc3c39dd5d3318dc087:.github/workflows/ultra-ci.yml'], text=True))
contracts.remove(check)
journey['timeout-minutes'] = 5
assert data == original_workflow, 'Unrelated workflow behavior changed'
print(json.dumps({'original_assertions_preserved': len(original_asserts),
                  'run_body_preserved': True, 'capture_assertions_and_limits_preserved': True,
                  'workflow_yaml_and_only_targeted_changes': True}, indent=2))
