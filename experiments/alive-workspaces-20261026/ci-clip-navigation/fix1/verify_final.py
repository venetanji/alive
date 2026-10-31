import ast
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path('/home/venetanji/.codex/worktrees/edd5/alive')
OUT = Path('/tmp/alive-workspaces-clip-navigation-fix1')
HELPER = 'apps/ultra/tests/alive_workspace_navigation.py'
before = json.loads((OUT/'before-input-sha256.json').read_text())
current = {name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in before}
assert [name for name in before if before[name]['sha256'] != current[name]] == [HELPER]
post = json.loads((OUT/'post-run-input-sha256.json').read_text())
assert current == {name: data['sha256'] for name, data in post.items()}
ast.parse((ROOT/HELPER).read_text(), filename=HELPER)
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
assert subprocess.check_output(['git', 'diff', '--cached', '--name-only'], cwd=ROOT) == b''
assert subprocess.check_output(['git', 'show', commit+':'+HELPER], cwd=ROOT) == (ROOT/HELPER).read_bytes()
assert subprocess.check_output(['git', 'diff-tree', '--no-commit-id', '--name-only', '-r', commit], cwd=ROOT, text=True).splitlines() == [HELPER]
subprocess.run(['git', 'diff', '--check'], cwd=ROOT, check=True)
for dirname in ('alive-workspaces-clip-navigation', 'alive-workspaces-clip-launch-diagnostic'):
    retained = Path('/tmp')/dirname
    for name, digest in json.loads((retained/'evidence-sha256.json').read_text()).items():
        assert hashlib.sha256((retained/name).read_bytes()).hexdigest() == digest, name
run = OUT/'original'
report = json.loads((run/'observability-report.json').read_text())
assert report['complete'] and report['completed_epochs'] >= 5 and report['playing_seconds_proven'] > 3
assert not report['sampling_errors']
assert json.loads((run/'observability-final.json').read_text())['complete']
assert json.loads((run/'observability-errors.json').read_text()) == []
for key in ('resources', 'epochs', 'actions'):
    data = Path(report[key]['path']).read_bytes()
    assert len(data) == report[key]['bytes']
    assert hashlib.sha256(data).hexdigest() == report[key]['sha256']
clip = json.loads((run/'native-clips-report.json').read_text())
assert hashlib.sha256((run/clip['audio']['path']).read_bytes()).hexdigest() == clip['audio']['sha256']
assert json.loads((OUT/'command.json').read_text())['exit'] == 0
result = {'exit': 0, 'source_commit': commit, 'pinned_entries': len(current),
          'only_changed_input': HELPER, 'original_journey_and_bounds_preserved': True,
          'native_fixture_and_product_sources_preserved': True, 'index_empty': True,
          'old_evidence_unchanged': True, 'original_report_log_and_capture_integrity': True}
(OUT/'verification.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result, indent=2))
