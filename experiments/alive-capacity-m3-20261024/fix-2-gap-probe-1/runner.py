#!/usr/bin/env python3
"""Replay the between-callback ABA trace against exact old/new predicates."""
import hashlib
import json
from pathlib import Path
import re
import resource
import shutil
import subprocess
import time

ROOT = Path('/home/venetanji/.codex/worktrees/edd5/alive')
EVIDENCE = Path('/tmp/alive-task13b-evidence')
BASE = EVIDENCE / 'fix-2-final-verify'
OUTPUT = EVIDENCE / 'fix-2-gap-probe-1'
OUTPUT.mkdir(exist_ok=False)
shutil.copy2(__file__, OUTPUT / 'runner.py')
resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
commands, results = [], []

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

old = subprocess.check_output(['git', 'show', '223dd34:apps/ultra/tests/alive_session_capacity.cpp'], cwd=ROOT, text=True)
current = (BASE / 'source/tests/alive_session_capacity.cpp').read_text()
pattern = r'      if \((during_render && still_rendering[\s\S]*?s\.last_consumed_request > first_live_serial)\) \{'
old_predicate = re.findall(pattern, old)
current_predicate = re.findall(pattern, current)
assert len(old_predicate) == len(current_predicate) == 1
assert 'before_callback == after_callback' not in old_predicate[0]
assert 'before_callback == after_callback' in current_predicate[0]
(OUTPUT / 'checkpoint-test.cpp').write_text(old)
diagnostic = r'''
void between_callback_probe() {
  Fixture f(8, 16, Music::Sustain);
  begin(f);
  const auto first_live_serial = serial;
  request(f, 2, 0);
  const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(10);
  auto wait_for = [&](auto ready) {
    while (!ready()) {
      assert(std::chrono::steady_clock::now() < deadline);
      std::this_thread::yield();
    }
  };
  std::atomic<bool> rendering{false}, producer_active{true}, done{false};
  std::atomic<unsigned> callbacks{0}, phase{0};
  std::thread callback([&] {
    rendering = true;
    phase = 1;
    wait_for([&] { return phase.load() >= 2; });
    assert(ultra_external_render(31, left.data(), right.data()));
    rendering = false;
    ++callbacks;
    phase = 3;
    wait_for([&] { return phase.load() >= 4; });
    rendering = true;
    phase = 5;
    wait_for([&] { return phase.load() >= 6; });
    assert(ultra_external_render(31, left.data(), right.data()));
    rendering = false;
    ++callbacks;
    done = true;
  });
  wait_for([&] { return phase.load() == 1; });
  const auto before_callback = callbacks.load();
  const bool during_render = rendering.load();
  phase = 2;
  wait_for([&] { return phase.load() == 3; });
  assert(!rendering.load() && callbacks.load() == 1);
  AliveSessionStateV3 s{}; s.version = 3; s.struct_bytes = sizeof s;
  assert(alive_session_state_v3(&s));
  assert(!rendering.load() && callbacks.load() == 1 && s.last_consumed_request > first_live_serial);
  phase = 4;
  wait_for([&] { return phase.load() == 5; });
  const bool still_rendering = rendering.load();
  const auto after_callback = callbacks.load();
  const bool credited = PREDICATE;
  std::printf("GAP,rendering_before=%u,rendering_after=%u,callback_before=%u,callback_after=%u,read_between_callbacks=true,credited_overlap=%u\n",
              unsigned(during_render), unsigned(still_rendering), before_callback, after_callback, unsigned(credited));
  phase = 6;
  callback.join();
  assert(!credited);
  alive_session_stop_v3(); render(31);
  ultra_audio_stop(); assert(alive_session_reset());
}
'''

original_command = json.loads((BASE / 'commands.json').read_text())[1]
flags = original_command[1:original_command.index(str(BASE / 'source/tests/alive_session_capacity.cpp'))]
archive = ROOT / 'apps/ultra/build/core/libultra_core_bundle.a'
backend = BASE / 'source/src-tauri/native/backend.cpp'
backend_object = OUTPUT / 'backend.o'
build = run(['c++', *flags, '-c', str(backend), '-o', str(backend_object)], OUTPUT / 'backend-build.log', 180)
assert build['returncode'] == 0 and not build['outer_timeout'], build
for name, predicate, expected_code in [('checkpoint-predicate', old_predicate[0], -6),
                                      ('same-callback-predicate', current_predicate[0], 0)]:
    out = OUTPUT / name
    out.mkdir()
    source = out / 'source'
    shutil.copytree(BASE / 'source', source)
    test = source / 'tests/alive_session_capacity.cpp'
    marker = 'template<class Before> void measure('
    assert current.count(marker) == 1
    amended = current.replace(marker, diagnostic.replace('PREDICATE', predicate) + marker)
    entry = '  if (argc > 1 && std::strcmp(argv[1], "--gap-probe") == 0) { between_callback_probe(); return 0; }\n'
    assert amended.count('  limits();\n') == 1
    test.write_text(amended.replace('  limits();\n', entry + '  limits();\n'))
    binary = out / 'probe'
    build = run(['c++', *flags, str(test), str(backend_object), str(archive), '-ldl', '-lrt', '-o', str(binary), original_command[-1]], out / 'build.log', 180)
    assert build['returncode'] == 0 and not build['outer_timeout'], build
    files = {str(path.relative_to(out)): sha(path) for path in sorted(source.rglob('*')) if path.is_file()}
    files.update({str(backend_object): sha(backend_object), str(archive): sha(archive), str(binary): sha(binary)})
    (out / 'manifest.json').write_text(json.dumps({
        'verification_source_sha256': sha(BASE / 'source/tests/alive_session_capacity.cpp'),
        'predicate': predicate, 'predicate_checkpoint': '223dd34' if expected_code else 'current source',
        'diagnostic_function': diagnostic.replace('PREDICATE', predicate), 'diagnostic_entry': entry,
        'production_sources_modified': False, 'files': files}, indent=2))
    result = run([str(binary), '--gap-probe'], out / 'probe.log', 20)
    log = (out / 'probe.log').read_text()
    result['expected_trace'] = ('read_between_callbacks=true,credited_overlap=' + ('1' if expected_code else '0')) in log
    result['expected_returncode'] = result['returncode'] == expected_code
    (OUTPUT / 'results.json').write_text(json.dumps(results, indent=2))
    assert result['expected_returncode'] and result['expected_trace'] and not result['outer_timeout'], result
    print(name, result, flush=True)
(OUTPUT / 'complete.json').write_text(json.dumps({'checkpoint_rejects_gap_assertion': True,
    'same_callback_accepts_gap_assertion': True, 'runner_sha256': sha(OUTPUT / 'runner.py'),
    'production_sources_modified': False}, indent=2))
