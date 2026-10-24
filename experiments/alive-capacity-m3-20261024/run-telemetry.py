from pathlib import Path
import os,json,subprocess
root=Path('/tmp/alive-task13b-evidence');output=root/'telemetry-final-1';output.mkdir()
env=os.environ.copy();env['LD_LIBRARY_PATH']=str(root/'telemetry-binaries')
env['ALIVE_MEASUREMENT_SAMPLES']='1200'
commands=[]
def run(mode,fixture,test):
 env['ALIVE_MEASUREMENT_SESSION']=str(root/(fixture+'.alive'))
 env['ALIVE_MEASUREMENT_OUTPUT']=str(output/'raw')
 command=[str(root/'telemetry-binaries'/mode),'--exact','audio::instrumentation::'+test,'--ignored','--nocapture']
 commands.append({'command':command,'fixture':fixture,'environment':{k:env[k] for k in ('LD_LIBRARY_PATH','ALIVE_MEASUREMENT_SESSION','ALIVE_MEASUREMENT_OUTPUT','ALIVE_MEASUREMENT_SAMPLES')}})
 (output/'commands.json').write_text(json.dumps(commands,indent=2))
 with (output/(fixture+'-'+mode+'-'+test+'.log')).open('x') as stream:
  subprocess.run(command,env=env,stdout=stream,stderr=subprocess.STDOUT,check=True)
for fixture in ('two','four','eight'):
 for mode in ('enabled','disabled'):run(mode,fixture,'native_saved_clip_release_overhead')
run('enabled','two','paired_release_overhead')
(output/'complete.json').write_text(json.dumps({'complete':True,'runs':len(commands)}))
