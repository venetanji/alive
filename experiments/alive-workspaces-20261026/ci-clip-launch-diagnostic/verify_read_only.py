import hashlib
import json
from pathlib import Path

OUT = Path('/tmp/alive-workspaces-clip-launch-diagnostic')
ROOT = Path('/home/venetanji/.codex/worktrees/edd5/alive')
before = json.loads((OUT/'before-source-sha256.json').read_text())
after = json.loads((OUT/'after-source-sha256.json').read_text())
assert before == after
for name, identity in before.items():
    data = (ROOT/name).read_bytes()
    assert hashlib.sha256(data).hexdigest() == identity['sha256'], name
    if 'git_blob' in identity:
        assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest() == identity['git_blob'], name
original = Path('/tmp/alive-workspaces-clip-navigation')
old_hashes = json.loads((original/'evidence-sha256.json').read_text())
for name, digest in old_hashes.items():
    assert hashlib.sha256((original/name).read_bytes()).hexdigest() == digest, name
print(json.dumps({'exit': 0, 'pinned_app_test_fixture_native_entries': len(before),
                  'source_and_native_unchanged': True,
                  'retained_original_evidence_files_unchanged': len(old_hashes)}, indent=2))
