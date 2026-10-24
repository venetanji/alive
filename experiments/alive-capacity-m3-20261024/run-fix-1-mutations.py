#!/usr/bin/env python3
"""Bounded negative probes against copied verification source only."""
import hashlib
import json
from pathlib import Path
import resource
import shutil
import subprocess
import time

ROOT = Path('/home/venetanji/.codex/worktrees/edd5/alive')
EVIDENCE = Path('/tmp/alive-task13b-evidence')
BASE = EVIDENCE / 'fix-1-final-verify'
OUTPUT = EVIDENCE / 'fix-1-mutations-1'
OUTPUT.mkdir(exist_ok=False)
shutil.copy2(__file__, OUTPUT / 'runner.py')
resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
commands = []
results = []

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run(command, log, timeout):
    commands.append({'argv': command, 'cwd': str(ROOT), 'timeout_seconds': timeout,
                     'log': str(log), 'core_limit_bytes': 0})
    (OUTPUT / 'commands.json').write_text(json.dumps(commands, indent=2))
    started = time.monotonic()
    with log.open('x') as stream:
        try:
            result = subprocess.run(command, cwd=ROOT, stdout=stream,
                                    stderr=subprocess.STDOUT, timeout=timeout)
            code, timed_out = result.returncode, False
        except subprocess.TimeoutExpired:
            code, timed_out = None, True
    item = {'log': str(log), 'returncode': code, 'outer_timeout': timed_out,
            'elapsed_seconds': time.monotonic() - started}
    results.append(item)
    (OUTPUT / 'results.json').write_text(json.dumps(results, indent=2))
    return item

original_command = json.loads((BASE / 'commands.json').read_text())[1]
flags = original_command[1:original_command.index(str(BASE / 'source/tests/alive_session_capacity.cpp'))]
archive = ROOT / 'apps/ultra/build/core/libultra_core_bundle.a'
backend = BASE / 'source/src-tauri/native/backend.cpp'
backend_object = OUTPUT / 'backend.o'
build = run(['c++', *flags, '-c', str(backend), '-o', str(backend_object)],
            OUTPUT / 'backend-build.log', 180)
assert build['returncode'] == 0 and not build['outer_timeout'], build
mutations = [
    ('discarded-action',
     '  if (action) issued = request(f, 3, 0, action_track, action == 2 ? UINT32_MAX : 1, action);',
     '  if (action) issued.request_serial = ++serial;',
     'partitioned(0, 1, {1, 31, 64, 127, 1024});', 'witnessed_action'),
    ('late-reader',
     '    wait_for("reader start", [&] { return go.load(); });',
     '    wait_for("reader start", [&] { return go.load(); });\n'
     '    wait_for("mutated late reader", [&] { return done.load(); });',
     'concurrent_publication();', 'concurrent verification timed out:'),
]
for name, before, after, entry, expected in mutations:
    out = OUTPUT / name
    out.mkdir()
    source = out / 'source'
    shutil.copytree(BASE / 'source', source)
    test = source / 'tests/alive_session_capacity.cpp'
    original = test.read_text()
    assert original.count(before) == 1
    mutated = original.replace(before, after)
    entry_before = '  limits();\n'
    entry_after = ('  if (argc > 1 && std::strcmp(argv[1], "--mutation") == 0) {\n'
                   '    ' + entry + '\n    return 0;\n  }\n' + entry_before)
    assert mutated.count(entry_before) == 1
    test.write_text(mutated.replace(entry_before, entry_after))
    binary = out / 'probe'
    build = run(['c++', *flags, str(test), str(backend_object), str(archive),
                 '-ldl', '-lrt', '-o', str(binary), original_command[-1]],
                out / 'build.log', 180)
    assert build['returncode'] == 0 and not build['outer_timeout'], build
    files = {str(path.relative_to(out)): sha(path) for path in sorted(source.rglob('*')) if path.is_file()}
    files.update({str(backend_object): sha(backend_object), str(archive): sha(archive),
                  str(binary): sha(binary), str(BASE / 'manifest.json'): sha(BASE / 'manifest.json')})
    (out / 'manifest.json').write_text(json.dumps({
        'verification_source_sha256': sha(BASE / 'source/tests/alive_session_capacity.cpp'),
        'mutation': {'before': before, 'after': after},
        'diagnostic_entry': {'before': entry_before, 'after': entry_after},
        'production_sources_modified': False, 'files': files}, indent=2))
    result = run([str(binary), '--mutation'], out / 'probe.log', 45)
    result['expected_assertion_observed'] = expected in (out / 'probe.log').read_text()
    result['expected_sigabrt'] = result['returncode'] == -6
    (OUTPUT / 'results.json').write_text(json.dumps(results, indent=2))
    assert result['expected_sigabrt'] and result['expected_assertion_observed'] and not result['outer_timeout'], result
    print(name, result, flush=True)
(OUTPUT / 'complete.json').write_text(json.dumps({'negative_probes': 2, 'expected_rejections': 2,
    'runner_sha256': sha(OUTPUT / 'runner.py'), 'production_sources_modified': False}, indent=2))
