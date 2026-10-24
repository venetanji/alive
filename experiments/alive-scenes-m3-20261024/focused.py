import hashlib,json,pathlib,shutil,subprocess,sys
root=pathlib.Path.cwd();out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=False)
source=out/'source';shutil.copytree(root/'apps/ultra/src-tauri/native',source/'src-tauri/native');shutil.copytree(root/'apps/ultra/core',source/'core');(source/'tests').mkdir()
for name in ['alive_session_v3_test.cpp','canvas_callback_guard.hpp']:shutil.copy2(root/'apps/ultra/tests'/name,source/'tests'/name)
policy=source/'src-tauri/native/alive_session_clip_policy.hpp';policy.write_text(policy.read_text().replace('out.features = ALIVE_SESSION_V3_FEATURE_ADMITTED;', 'out.features = ALIVE_SESSION_V3_FEATURE_ADMITTED | ALIVE_SESSION_V3_FEATURE_ATOMIC_TRACK_ACTIONS;'))
commands=[]
def run(cmd,log):
 commands.append(cmd);(out/'commands.json').write_text(json.dumps(commands,indent=2))
 with (out/log).open('w') as f:r=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT)
 return r.returncode
cmd=['c++','-std=c++17','-O2','-Wall','-Wextra','-Werror','-pthread','-DULTRA_ALIVE_SESSION_TEST_TRACE',str(source/'tests/alive_session_v3_test.cpp'),str(source/'src-tauri/native/backend.cpp'),str(root/'apps/ultra/build/core/libultra_core_bundle.a'),'-ldl','-lrt','-Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock','-o',str(out/'probe')]
rc=run(cmd,'build.log')
(out/'manifest.json').write_text(json.dumps({'internal_policy_override':True,'files':{str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file()}},indent=2))
if not rc:rc=run([str(out/'probe'),'--scenes'],'test.log')
print(out,'exit',rc);sys.exit(rc)
