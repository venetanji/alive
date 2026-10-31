import ast, hashlib, json, pathlib, subprocess
out = pathlib.Path('/tmp/alive-workspaces-clip-navigation')
base = 'cb079f2b95d5d3d5755db85cf88d8744c4806caa'
helper = 'apps/ultra/tests/alive_workspace_navigation.py'
before = json.loads((out/'red-input-sha256.json').read_text())
after = {name: hashlib.sha256(pathlib.Path(name).read_bytes()).hexdigest() for name in before}
changed = [name for name in before if before[name] != after[name]]
assert changed == [helper], changed
for name in before:
    if '/tests/' in name and name != helper:
        original = subprocess.check_output(['git', 'show', base+':'+name])
        assert pathlib.Path(name).read_bytes() == original, name
ast.parse(pathlib.Path(helper).read_text(), filename=helper)
subprocess.run(['git', 'diff', '--check'], check=True)
(out/'final-input-sha256.json').write_text(json.dumps(after, indent=2)+'\n')
result = {'exit': 0, 'changed_hashed_inputs': changed, 'all_other_harness_fixture_and_native_inputs_unchanged': True, 'original_journey_and_measurement_sources_match_base': True, 'helper_syntax': 'PASS', 'diff_check': 'PASS'}
(out/'verification.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result, indent=2))
