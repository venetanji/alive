from pathlib import Path
import hashlib,json,os,subprocess,time
root=Path.cwd()
out=root/'experiments/phase2-20261028/master/correction/root'
out.mkdir(parents=True,exist_ok=True)
deps=root/'experiments/clockwork-faust/.deps'
env=dict(os.environ)
env.update(PATH=str(deps/'cmake-3.31.6-linux-x86_64/bin')+os.pathsep+str(deps/'rust/bin')+os.pathsep+env['PATH'], CARGO_HOME=str(deps/'cargo'), ULTRA_NATIVE_LIB_DIR=str(root/'apps/ultra/build'), LD_LIBRARY_PATH=str(root/'apps/ultra/build'))
for key in ['ALIVE_MASTER_EXPECT_UNAVAILABLE','ALIVE_MASTER_TEST_CHILD','ALIVE_MASTER_DIAGNOSTIC_CHILD']:
 env.pop(key,None)
receipts=[]
def run(name,command,extra=None):
 started=time.monotonic()
 path=out/(name+'.log')
 print('START',name,flush=True)
 current=env.copy()
 current.update(extra or {})
 with path.open('wb') as log:
  result=subprocess.run(command,cwd=root,env=current,stdout=log,stderr=subprocess.STDOUT)
 receipt={'name':name,'command':command,'environmentOverrides':extra or {},'exit':result.returncode,'seconds':round(time.monotonic()-started,3),'log':str(path.relative_to(root)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 receipts.append(receipt)
 (out/'receipt.json').write_text(json.dumps(receipts,indent=2)+'\n')
 print('END',name,'exit',result.returncode,'seconds',receipt['seconds'],flush=True)
 if result.returncode:
  print(path.read_text(errors='replace')[-6000:],flush=True)
  raise SystemExit(result.returncode)
 return path
identity={'integration_base':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'candidate':'7ff950f4ab7eba8b6a354084e948f1a801618e6a','environment':{key:env[key] for key in ['PATH','CARGO_HOME','ULTRA_NATIVE_LIB_DIR','LD_LIBRARY_PATH']},'removedEnvironment':['ALIVE_MASTER_EXPECT_UNAVAILABLE','ALIVE_MASTER_TEST_CHILD','ALIVE_MASTER_DIAGNOSTIC_CHILD'],'tools':{name:subprocess.check_output([name,'--version'],env=env,text=True).splitlines()[0] for name in ['c++','cargo','rustc','cmake']}}
(out/'toolchain.json').write_text(json.dumps(identity,indent=2)+'\n')
run('native-build',['bash','apps/ultra/build.sh','--native-only'])
lib=root/'apps/ultra/build/libultra_native.so'
identity['nativeLibrary']={'path':str(lib),'sha256':hashlib.sha256(lib.read_bytes()).hexdigest()}
(out/'toolchain.json').write_text(json.dumps(identity,indent=2)+'\n')
run('native-suite',['bash','apps/ultra/tests/ci/check-native.sh'])
for product in ['ultra','alive']:
 command=['cargo','test','--manifest-path',f'apps/{product}/src-tauri/Cargo.toml','--release','--locked','--no-run','--message-format=json-render-diagnostics']
 if product=='ultra':command+=['--lib']
 else:command+=['--target-dir',str(root/'apps/ultra/src-tauri/target')]
 compilelog=run(product+'-compile',command)
 binaries=[]
 for line in compilelog.read_text().splitlines():
  try:item=json.loads(line)
  except json.JSONDecodeError:continue
  if item.get('reason')=='compiler-artifact' and item.get('profile',{}).get('test') and item.get('executable'):binaries.append(item['executable'])
 assert len(set(binaries))==1,binaries
 executable=binaries[-1]
 identity[product+'TestBinary']={'path':executable,'sha256':hashlib.sha256(Path(executable).read_bytes()).hexdigest()}
 (out/'toolchain.json').write_text(json.dumps(identity,indent=2)+'\n')
 if product=='ultra':
  log=run('loader-proof',[executable,'--exact','session::native_master::tests::resolves_the_loaded_native_image','--test-threads=1'],{'LD_DEBUG':'libs'})
  expected='calling init: '+str(lib)
  assert expected in log.read_text(), 'Expected corrected native module missing from actual loader trace'
 run(product+'-tests',[executable,'--test-threads=1'])
print('INTEGRATED CHECKS COMPLETE',flush=True)
