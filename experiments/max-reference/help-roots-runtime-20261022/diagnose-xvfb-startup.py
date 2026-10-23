#!/usr/bin/env python3
"""Authorized bounded Xvfb-only startup diagnostic; never runs Max or Wine."""
import importlib.util
import json
import os
from pathlib import Path
import secrets
import signal
import subprocess
import sys
import tempfile
import time

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('help_runner',ROOT/'run-runtime.py')
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)


def sample(row,scope):
    proc=Path('/proc')/str(row['pid'])
    value=dict(pid=row['pid'],expected_start=row['start'])
    try:
        environment=set((proc/'environ').read_bytes().split(b'\0'))
        value.update(environment_readable=True,key_matches={key:(key+'='+expected).encode() in environment
            for key,expected in runner.scope_environment(scope).items()})
    except OSError as error:value.update(environment_readable=False,environment_errno=error.errno)
    try:
        value['observed_start']=runner.process_start(proc)
        value['start_match']=value['observed_start']==row['start']
        value['executable_is_xvfb']=os.readlink(proc/'exe')=='/usr/bin/Xvfb'
    except OSError as error:value['identity_errno']=error.errno
    value['matches_scope']=runner.matches_scope(row,scope)
    return value


def main():
    output=ROOT/'results/xvfb-startup-stress.json'
    if output.exists():raise ValueError('Refuse to overwrite a diagnostic')
    started=time.monotonic();rows=[];deadline=started+28
    def interrupted(signum,frame):raise TimeoutError('Xvfb-only diagnostic exceeded 30 seconds')
    signal.signal(signal.SIGALRM,interrupted);signal.setitimer(signal.ITIMER_REAL,30)
    try:
        with tempfile.TemporaryDirectory(prefix='alive-xvfb-startup-',dir='/home/venetanji/.cache/alive-ultra-evidence') as directory:
            work=Path(directory);work.chmod(0o700)
            display=runner.choose_private_display(':0',os.environ.get('DISPLAY'))
            runner.private_xauthority(work/'private-xauthority',display)
            for index in range(100):
                if time.monotonic()>deadline:break
                scope=dict(capture_id=secrets.token_hex(24),prefix=str(runner.PREFIX),display=display)
                env=dict(os.environ,**runner.scope_environment(scope),WINEDEBUG='-all',WAYLAND_DISPLAY='',
                    WINESERVER=str(runner.WINE.parent/'wineserver'),XAUTHORITY=str(work/'private-xauthority'),
                    LIBGL_ALWAYS_SOFTWARE='1',MESA_LOADER_DRIVER_OVERRIDE='llvmpipe')
                with (work/'xvfb.log').open('ab') as log:
                    process=subprocess.Popen(['Xvfb',display,'-screen','0','1280x900x24','-nolisten','tcp',
                        '-auth',env['XAUTHORITY']],env=env,stdout=log,stderr=log)
                    descriptor=os.pidfd_open(process.pid)
                    result=dict(iteration=index,samples=[])
                    try:
                        row=dict(pid=process.pid,start=runner.process_start(Path('/proc')/str(process.pid)))
                        epoch=time.monotonic()
                        for delay in [0,.01,.05]:
                            remaining=epoch+delay-time.monotonic()
                            if remaining>0:time.sleep(remaining)
                            result['samples'].append(dict(delay_ms=round(delay*1000),**sample(row,scope)))
                    finally:
                        try:signal.pidfd_send_signal(descriptor,signal.SIGTERM)
                        except ProcessLookupError:pass
                        try:process.wait(timeout=.2)
                        except subprocess.TimeoutExpired:
                            signal.pidfd_send_signal(descriptor,signal.SIGKILL);process.wait(timeout=.2)
                        os.close(descriptor)
                        descendants,_=runner.owned(scope)
                        if descendants:runner.stop_owned(descendants,scope)
                        result['direct_child_reaped']=process.poll() is not None
                        result['marker_processes_remaining']=len(runner.scan_environment({runner.CAPTURE_ENV:scope['capture_id']})[0])
                        rows.append(result)
                if result['marker_processes_remaining']:raise RuntimeError('Owned diagnostic descendant remains')
    finally:
        signal.setitimer(signal.ITIMER_REAL,0)
        mismatches=[row for row in rows if any(not sample['matches_scope'] for sample in row['samples'])]
        value=dict(kind='Xvfb-only; no Max/Wine/copied-prefix',launches=len(rows),elapsed_seconds=time.monotonic()-started,
            mismatch_launches=len(mismatches),first_mismatch=None if not mismatches else mismatches[0],
            all_children_reaped=all(row['direct_child_reaped'] for row in rows),
            marker_processes_remaining=sum(row['marker_processes_remaining'] for row in rows),rows=rows)
        runner.write_json(output,value)
        print(json.dumps({key:item for key,item in value.items() if key!='rows'}),flush=True)


if __name__=='__main__':main()
