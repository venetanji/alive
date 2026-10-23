#!/usr/bin/env python3
"""Plan by default; an explicit --execute runs the separately authorized capture."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import signal
import secrets
import struct
import subprocess
import sys
import time

sys.dont_write_bytecode=True
from help_runtime import (READBACK_METHODS, ROOT, RESOURCES, build_score, digest, extract_message_states,
                          extract_v8_readback, public_row, readback_target,
                          matches_serialized_message, public_annotation_width_policy, require_digest,
                          require_helpers, snapshot_target, windows_path, write_json)

SOURCE=Path('/home/venetanji/.cache/alive-max-list-20261021/wine-disposable')
ORIGINAL=Path('/home/venetanji/.wine-ableton')
PREFIX=Path('/home/venetanji/.cache/alive-max-help-roots-20261022-wine-disposable')
WINE=Path('/home/venetanji/.local/opt/wine-d2d1-nspa-11.13/bin/wine')
MARKER='.alive-help-roots-disposable'
CAPTURE_ENV='ALIVE_HELP_ROOTS_CAPTURE_ID'
MAX_RELATIVE=Path('drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/Max.exe')


def read(path):
    return json.loads(Path(path).read_text())


def preferences(prefix):
    rows=[]
    for directory in (prefix/'drive_c/users').glob('*/AppData/Roaming/*'):
        if not directory.name.startswith(('Cycling','Ableton')):continue
        for path in sorted(directory.rglob('*')):
            if path.is_file() and not path.is_symlink():
                rows.append([str(path.relative_to(prefix)),digest(path)])
    return rows


def process_start(proc):
    return (proc/'stat').read_text().rsplit(') ',1)[1].split()[19]


def scan_environment(required, proc_root=Path('/proc')):
    rows=[];unreadable=0
    needles={(key+'='+value).encode() for key,value in required.items()}
    for proc in proc_root.glob('[0-9]*'):
        try:
            environment=set((proc/'environ').read_bytes().split(b'\0'))
            if needles.issubset(environment):
                rows.append(dict(pid=int(proc.name),start=process_start(proc)))
        except PermissionError:unreadable+=1
        except (FileNotFoundError,ProcessLookupError):pass
    return rows,unreadable


def scope_environment(scope):
    return {CAPTURE_ENV:scope['capture_id'],'WINEPREFIX':scope['prefix'],'DISPLAY':scope['display']}


def owned(scope):
    return scan_environment(scope_environment(scope))


def matches_scope(row,scope):
    proc=Path('/proc')/str(row['pid'])
    try:
        environment=set((proc/'environ').read_bytes().split(b'\0'))
        return process_start(proc)==row['start'] and all(
            (key+'='+value).encode() in environment for key,value in scope_environment(scope).items())
    except (PermissionError,FileNotFoundError,ProcessLookupError):return False


def signal_owned(row,scope,sig):
    # Bind the signal to this process lifetime before rechecking all ownership fields.
    try:descriptor=os.pidfd_open(row['pid'])
    except (PermissionError,ProcessLookupError):return False
    try:
        if not matches_scope(row,scope):return False
        signal.pidfd_send_signal(descriptor,sig)
        return True
    except (PermissionError,ProcessLookupError):return False
    finally:os.close(descriptor)


def stop_owned(rows,scope):
    for sig in [signal.SIGTERM,signal.SIGKILL]:
        for row in rows:
            signal_owned(row,scope,sig)
        time.sleep(.25)


def display_number(display):
    if not isinstance(display,str) or ':' not in display:return None
    number=display.rsplit(':',1)[1].split('.',1)[0]
    return int(number) if number.isdigit() else None


def choose_private_display(host_display,inherited_display,tmp=Path('/tmp')):
    host=display_number(host_display)
    if host is None:raise ValueError('--host-display must explicitly identify the actual desktop display')
    excluded={host,display_number(inherited_display)}
    for number in range(200,800):
        if number not in excluded and not (tmp/('.X'+str(number)+'-lock')).exists() and not (
                tmp/'.X11-unix'/('X'+str(number))).exists():return ':'+str(number)
    raise RuntimeError('No unused high private display is available')


def private_xauthority(path,display):
    fields=[b'',display[1:].encode(),b'MIT-MAGIC-COOKIE-1',secrets.token_bytes(16)]
    data=struct.pack('!H',65535)+b''.join(struct.pack('!H',len(value))+value for value in fields)
    with Path(path).open('xb') as stream:stream.write(data)
    Path(path).chmod(0o600)


def launch_observation(row,scope):
    proc=Path('/proc')/str(row['pid'])
    value=dict(pid=row['pid'],expected_start=row['start'],observed_start=None,start_match=False,
        environment_readable=False,field_matches=dict(capture_marker=False,prefix=False,display=False))
    try:
        value['observed_start']=process_start(proc)
        value['start_match']=value['observed_start']==row['start']
    except OSError as error:value['identity_errno']=error.errno
    try:
        environment=set((proc/'environ').read_bytes().split(b'\0'))
        value['environment_readable']=True
        value['field_matches']={label:(key+'='+expected).encode() in environment for label,key,expected in [
            ('capture_marker',CAPTURE_ENV,scope['capture_id']),('prefix','WINEPREFIX',scope['prefix']),
            ('display','DISPLAY',scope['display'])]}
    except OSError as error:value['environment_errno']=error.errno
    try:value['executable_path_sha256']=hashlib.sha256(os.readlink(proc/'exe').encode()).hexdigest()
    except OSError as error:value['executable_errno']=error.errno
    value['matches_scope']=matches_scope(row,scope)
    return value


def launched_identity(process,scope,diagnostics=None,timeout=1.0,role='child'):
    if not 0<=timeout<=1:raise ValueError('Startup observation must be bounded to one second')
    started=time.monotonic();deadline=started+timeout
    detail=dict(role=role,pid=process.pid,status='observing',attempts=[])
    if diagnostics is not None:diagnostics.append(detail)
    def refuse(status):
        detail['status']=status
        raise RuntimeError('Launched process ownership was not established: '+status)
    if process.poll() is not None:refuse('child-exited')
    try:row=dict(pid=process.pid,start=process_start(Path('/proc')/str(process.pid)))
    except OSError as error:
        detail['identity_errno']=error.errno;refuse('start-identity-unavailable')
    detail['expected_start']=row['start']
    while True:
        value=launch_observation(row,scope)
        value['elapsed_ms']=round((time.monotonic()-started)*1000,3)
        detail['attempts'].append(value)
        if process.poll() is not None:refuse('child-exited')
        if value['observed_start'] is not None and not value['start_match']:refuse('start-identity-changed')
        if value['start_match'] and value['matches_scope']:
            detail['status']='verified';return row
        remaining=deadline-time.monotonic()
        if remaining<=0:refuse('persistent-scope-mismatch')
        time.sleep(min(.01,remaining))


def wait_xserver(process,identity,scope):
    number=scope['display'][1:];deadline=time.monotonic()+8
    while time.monotonic()<deadline:
        if process.poll() is not None or not matches_scope(identity,scope):
            raise RuntimeError('Owned private X server exited before readiness')
        try:
            lock=Path('/tmp/.X'+number+'-lock').read_text().strip()
            if lock==str(identity['pid']) and Path('/tmp/.X11-unix/X'+number).is_socket():return
        except FileNotFoundError:pass
        time.sleep(.05)
    raise RuntimeError('Owned private X server did not publish its exact PID lock and socket')


def public_loading_diagnostics(rows,config):
    normalize=lambda path:str(path).replace('\\','/').lower()
    known={normalize(document['working_windows_path']):document['working_windows_path'] for document in config['documents']}
    driver=windows_path(Path(config['work'])/'driver.maxpat');known[normalize(driver)]=driver
    builtin={'patcher','js','number','flonum','message','comment','button','toggle','append','prepend','print','inlet','outlet'}
    result=[]
    for row in rows:
        value={key:row[key] for key in ['document','tree_boxes','basic_named','attempts'] if key in row}
        path=row.get('filepath','');value['filepath_sha256']=hashlib.sha256(path.encode()).hexdigest()
        if normalize(path) in known:value['filepath']=known[normalize(path)]
        value['top_boxes']=[]
        for box in row.get('top_boxes',[]):
            item={key:box[key] for key in ['ordinal','basic_named'] if key in box}
            classname=box.get('maxclass','')
            if classname in builtin:item['maxclass']=classname
            else:item['maxclass_sha256']=hashlib.sha256(classname.encode()).hexdigest()
            value['top_boxes'].append(item)
        result.append(value)
    return result


def public_anchor_diagnostics(rows):
    builtin={'patcher','newobj','js','jsui','number','flonum','message','comment','button','toggle',
             'append','prepend','print','inlet','outlet'}
    def rectangle(value):
        if len(value)!=4 or not all(isinstance(number,(int,float)) and not isinstance(number,bool) and
                                   math.isfinite(number) for number in value):
            raise ValueError('Anchor diagnostic rectangle must contain four finite numbers')
        return list(value)
    def classname(value,key,name):
        if name in builtin:value[key]=name
        else:value[key+'_sha256']=hashlib.sha256(name.encode()).hexdigest()
    result=[]
    for row in rows:
        value={key:row[key] for key in ['expected_anchor','expected_id','full_match_count','position_class_match_count']}
        value['expected_rect']=rectangle(row['expected_rect'])
        for key in ['expected_maxclass','expected_runtime_class']:classname(value,key,row[key])
        if 'annotation_width_policy' in row:
            value['annotation_width_policy']=public_annotation_width_policy(row['annotation_width_policy'])
            count=row['annotation_policy_match_count']
            if type(count) is not int or count<0:raise ValueError('Invalid annotation policy match count')
            value['annotation_policy_match_count']=count
        for key in ['full_matches','position_class_matches','candidates']:
            if key not in row:continue
            value[key]=[]
            for candidate in row[key]:
                item=dict(ordinal=candidate['ordinal'],rect=None if candidate['rect'] is None else rectangle(candidate['rect']))
                for field in ['raw_rect','patching_rect','getattr_patching_rect']:
                    if field in candidate:item[field]=None if candidate[field] is None else rectangle(candidate[field])
                for field in ['patching_rect_status','getattr_patching_rect_status']:
                    if field in candidate:
                        if candidate[field] not in {'observed','unavailable','null','threw','malformed'}:
                            raise ValueError('Unexpected anchor geometry observation status')
                        item[field]=candidate[field]
                classname(item,'maxclass',candidate['maxclass']);value[key].append(item)
        result.append(value)
    return result


def wait_json(path,predicate,timeout):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        try:
            value=read(path)
            if predicate(value):return value
        except (FileNotFoundError,json.JSONDecodeError):pass
        time.sleep(.05)
    raise TimeoutError('Finite private command did not complete')


def public_window_diagnostics(raw):
    if raw.get('status') not in {'observed','display-unavailable'} or type(raw.get('truncated')) is not bool:
        raise ValueError('Invalid private window observation')
    result=dict(status=raw['status'],truncated=raw['truncated'],x_errors=[],windows=[])
    for code in raw['x_errors']:
        if type(code) is not int or not 0<=code<=255:raise ValueError('Invalid X error code')
        result['x_errors'].append(code)
    for row in raw['windows']:
        for key in ['window','parent','transient_for']:
            if row[key] is None and key=='transient_for':continue
            if type(row[key]) is not int or row[key]<0:raise ValueError('Invalid X window identity')
        title=row['title']
        if not isinstance(title,str):raise ValueError('Invalid private window title')
        lower=title.lower()
        result['windows'].append(dict(window=row['window'],parent=row['parent'],transient_for=row['transient_for'],
            title_sha256=hashlib.sha256(title.encode()).hexdigest(),title_characters=len(title),
            save_title_token=any(token in lower for token in ['save','saving']),
            saving_disabled_title=lower.endswith('(saving disabled)'),authorization_title_token=any(
                token in lower for token in ['authoriz','licen','trial'])))
    return result


def public_writer_diagnostics(raw):
    result={}
    for key in ['writer_valid','writer_class_is_thispatcher','writer_owner_is_root',
                'writer_owner_path_matches','writer_understands_write','root_is_top_level','root_locked','root_dirty']:
        if key not in raw or (raw[key] is not None and type(raw[key]) is not bool):
            raise ValueError('Invalid private writer observation')
        result[key]=raw[key]
    return result


def diagnose_windows(work,env,scope,identity):
    if not matches_scope(identity,scope):return dict(status='owned-display-unavailable')
    result=subprocess.run([sys.executable,str(ROOT/'diagnose-windows.py'),'--display',scope['display']],
        env=env,capture_output=True,timeout=5,check=True)
    raw=json.loads(result.stdout)
    write_json(work/'private-window-diagnostic.json',raw)
    return public_window_diagnostics(raw)


def execute(args):
    if args.work is None:raise ValueError('--work must identify an existing reviewed private preparation')
    work=args.work.resolve();config=read(work/'config.json')
    readback_method=config.get('readback_method','private-serialization')
    if readback_method not in READBACK_METHODS:raise ValueError('Unknown Message readback method')
    if not args.capture_name or Path(args.capture_name).name!=args.capture_name or args.capture_name in {'.','..'}:
        raise ValueError('Capture name must be one ordinary path component')
    prefix=args.prefix.resolve();output=ROOT/'results'/args.capture_name
    if output.exists():raise ValueError('Refuse to overwrite captured evidence')
    if prefix.exists() or prefix in [SOURCE,ORIGINAL] or prefix.name!=PREFIX.name:
        raise ValueError('Owned prefix must be the new task-specific path')
    if config['work']!=str(work):raise ValueError('Private work identity mismatch')
    manifest=read(ROOT/'preparation-manifest.json')
    if manifest['private_work']!=str(work):raise ValueError('Private preparation seal names a different work directory')
    require_digest(work/'config.json',manifest['private_config_sha256'])
    for artifact in manifest['artifacts']:require_digest(ROOT/artifact['path'],artifact['sha256'])
    for name,expected in config['harness_sha256'].items():
        require_digest(work/name,expected);require_digest(ROOT/name,expected)
    require_digest(work/'driver.maxpat',config['driver_sha256'])
    require_helpers(RESOURCES,config['helpers'])
    if (work/'private-journal.jsonl').exists():raise ValueError('Refuse to reuse a runtime preparation')
    display=choose_private_display(args.host_display,os.environ.get('DISPLAY'))
    scope=dict(capture_id=secrets.token_hex(24),prefix=str(prefix),display=display)
    if scan_environment({'WINEPREFIX':str(prefix)})[0]:raise ValueError('Task prefix already has processes')
    if not hasattr(os,'pidfd_open') or not hasattr(signal,'pidfd_send_signal'):
        raise RuntimeError('Process lifetime bound signaling is unavailable')
    for document in config['documents']:
        require_digest(document['source_path'],document['source_sha256'])
        require_digest(document['pristine_path'],document['source_sha256'])
        require_digest(snapshot_target(document),document['source_sha256'])
        if readback_method=='v8-boxtext':
            path=readback_target(config,document)
            if not path.is_file() or path.stat().st_size!=0:raise ValueError('V8 observation mailbox must start empty')
    output.mkdir(parents=True)
    before=dict(original=preferences(ORIGINAL),source=preferences(SOURCE))
    write_json(output/'preferences-before.json',before)
    session=dict(status='STARTING',work=str(work),prefix=str(prefix),source_prefix=str(SOURCE),
        capture_id=scope['capture_id'],host_display=args.host_display,display=display,
        process_ownership='unique capture environment marker plus exact prefix/display and PID start; pidfd signals',
        launch_diagnostics=[],anchor_diagnostics=[],
        screenshot_count=0,clipboard_actions=0,runtime_invocations=1,
        documents=[{key:document[key] for key in ['document','source_path','source_sha256','pristine_path',
                      'working_path','initial_working_sha256']} for document in config['documents']],
        score_steps=len(build_score()),readback_method=readback_method,
        input_method='programmatic original controls; no physical entry/drag claim')
    if readback_method=='v8-boxtext':session.update(readback_requests=[],saved_order_observed=False)
    write_json(output/'session.json',session)
    xvfb=None;process=None;failure=None;log=None;snapshots=[];command_id=0;launches=[]
    env=dict(os.environ,**scope_environment(scope),WINEDEBUG='-all',WAYLAND_DISPLAY='',
        WINESERVER=str(args.wine.parent/'wineserver'),XAUTHORITY=str(work/'private-xauthority'),
        LIBGL_ALWAYS_SOFTWARE='1',MESA_LOADER_DRIVER_OVERRIDE='llvmpipe')
    def command(value):
        nonlocal command_id
        command_id+=1;value=dict(value,command_id=command_id)
        write_json(work/'command.json',value)
        ack=wait_json(work/'ack.json',lambda a:a.get('command_id')==command_id,5)
        if not ack['success']:raise RuntimeError('Private Max controller refused a command')
        return ack
    def snapshot(document,step_id):
        definition=next(d for d in config['documents'] if d['document']==document)
        path=snapshot_target(definition);previous=path.stat().st_mtime_ns
        ack=command(dict(op='snapshot',document=document,step_id=step_id))
        session.setdefault('serialization_context',[]).append(dict(document=document,step_id=step_id,
            **public_writer_diagnostics(ack.get('snapshot_diagnostics',{}))))
        deadline=time.monotonic()+5
        while time.monotonic()<deadline:
            try:
                stamp=path.stat().st_mtime_ns
                if stamp!=previous:
                    result=extract_message_states(config,document)
                    time.sleep(.05)
                    if stamp==path.stat().st_mtime_ns:
                        retained=work/'snapshots'/(step_id+'-'+document+'.maxhelp')
                        shutil.copyfile(path,retained)
                        path.chmod(0o600);retained.chmod(0o600)
                        snapshots.append(dict(step_id=step_id,document=document,**result))
                        return result
            except (FileNotFoundError,json.JSONDecodeError):pass
            time.sleep(.05)
        try:
            session['serialization_window_diagnostics']=diagnose_windows(work,env,scope,launches[0])
        except Exception as error:
            session['serialization_window_diagnostics']=dict(status='diagnostic-failed',
                error_sha256=hashlib.sha256(str(error).encode()).hexdigest())
        raise RuntimeError('Nonvisual Message serialization capability unavailable')
    def observe(document,step_id):
        if readback_method=='private-serialization':return snapshot(document,step_id)
        definition=next(item for item in config['documents'] if item['document']==document)
        ack=command(dict(op='readback',document=document,step_id=step_id,source_sha256=definition['source_sha256']))
        request_id=ack['command_id']
        session['readback_requests'].append(dict(request_id=request_id,step_id=step_id,document=document,
            source_sha256=definition['source_sha256']))
        wait_json(readback_target(config,definition),lambda value:value.get('request_id')==request_id,5)
        result=extract_v8_readback(config,document,request_id,step_id)
        snapshots.append(result)
        return result
    try:
        subprocess.run(['cp','-a','--reflink=always',str(SOURCE),str(prefix)],check=True,env=env)
        prefix.chmod(0o700)
        (prefix/MARKER).write_text(scope['capture_id']+'\n');(prefix/MARKER).chmod(0o600)
        if any(p.is_symlink() for p in (prefix/'drive_c/users').rglob('*')):
            raise ValueError('Copied user profile contains symlinks')
        if scan_environment({'WINEPREFIX':str(prefix)})[0]:raise ValueError('Task prefix already has processes')
        for document in config['documents']:
            copied=prefix/MAX_RELATIVE.parent/'resources/help/max'/(document['document']+'.maxhelp')
            require_digest(copied,document['source_sha256'])
        session['max_sha256']=digest(prefix/MAX_RELATIVE)
        require_helpers(prefix/MAX_RELATIVE.parent/'resources',config['helpers'])
        session['helpers']=[dict(item,installed_verified=True,copied_verified=True) for item in config['helpers']]
        for name in ['private-journal.jsonl','ack.json','ready.json']:
            (work/name).touch(mode=0o600,exist_ok=False)
        log=(work/'private-runtime.log').open('x')
        (work/'private-runtime.log').chmod(0o600)
        private_xauthority(work/'private-xauthority',display)
        xvfb=subprocess.Popen(['Xvfb',display,'-screen','0','1280x900x24','-nolisten','tcp',
            '-auth',env['XAUTHORITY']],env=env,stdout=log,stderr=log,umask=0o077)
        launches.append(dict(role='xvfb',**launched_identity(xvfb,scope,
            diagnostics=session['launch_diagnostics'],role='xvfb')))
        session['launched_processes']=launches
        write_json(output/'session.json',session)
        wait_xserver(xvfb,launches[-1],scope)
        process=subprocess.Popen([str(args.wine),r'C:\ProgramData\Ableton\Live 12 Suite\Resources\Max\Max.exe',
            windows_path(work/'driver.maxpat')],env=env,stdout=log,stderr=log,umask=0o077)
        launches.append(dict(role='wine-launcher',**launched_identity(process,scope,
            diagnostics=session['launch_diagnostics'],role='wine-launcher')))
        session.update(xvfb_pid=xvfb.pid,launcher_pid=process.pid,launched_processes=launches)
        write_json(output/'session.json',session)
        print(json.dumps(dict(stage='launched',display=display)),flush=True)
        ready=wait_json(work/'ready.json',lambda value:'ready' in value,60)
        session['loading_diagnostics']=public_loading_diagnostics(ready.get('diagnostics',[]),config)
        session['anchor_diagnostics']=public_anchor_diagnostics(ready.get('anchor_diagnostics',[]))
        write_json(output/'session.json',session)
        if not ready['ready']:raise RuntimeError('Private anchor/inventory capability check failed')
        session['capabilities']=ready['capabilities']
        for document in ['append','prepend']:observe(document,'initial')
        if readback_method=='v8-boxtext':
            session.update(initial_message_readback_validated=True,runtime_endpoint_readback_validated=True,
                nonvisual_display_readback='private V8 Message boxtext; no pixel or saved-order claim')
        else:session['nonvisual_display_readback']='private serialized Message text; no pixel claim'
        for event in build_score():
            command(dict(event,op='event'))
            checkpoint=observe(event['document'],event['step_id'])
            if event['ordinal']==0:
                raw=[json.loads(line) for line in (work/'private-journal.jsonl').read_text().splitlines()]
                observed=[row for row in raw if row.get('kind')=='receipt' and row.get('step_id')==event['step_id']
                          and row.get('anchor')=='root/obj-5/obj-5' and row.get('port')==0]
                state=next(value for value in checkpoint['states'] if value['anchor']=='root/obj-5/obj-9')
                if len(observed)!=1 or not matches_serialized_message(observed[0]['message'],state):
                    raise RuntimeError('Readback does not establish actual cold Message content')
                session['cold_message_readback_validated']=True
        command(dict(op='complete',document='prepend',step_id='complete',steps=len(build_score())))
        session['status']='COMPLETE';session['complete']=True
        print(json.dumps(dict(stage='complete',steps=len(build_score()))),flush=True)
    except BaseException as error:
        failure=hashlib.sha256(str(error).encode()).hexdigest()
        session.update(status='FAILED',complete=False,failure_sha256=failure)
        raise
    finally:
        signal.setitimer(signal.ITIMER_REAL,0)
        session['ordinary_quit_requested']=False
        owned_rows,owned_unknown=owned(scope)
        stop_owned(owned_rows,scope)
        for child in [process,xvfb]:
            if child is not None:
                try:child.wait(timeout=3)
                except subprocess.TimeoutExpired:pass
        # Rescan descendants; the marker is mandatory even for a matching display/prefix.
        remaining,_=owned(scope)
        if remaining:stop_owned(remaining,scope)
        remaining,_=owned(scope)
        prefix_after,prefix_unknown=scan_environment({'WINEPREFIX':str(prefix)})
        marker_after,marker_unknown=scan_environment({CAPTURE_ENV:scope['capture_id']})
        if log:log.close()
        protected=[]
        for document in config['documents']:
            protected.append(dict(document=document['document'],
                installed_unchanged=digest(document['source_path'])==document['source_sha256'],
                pristine_unchanged=digest(document['pristine_path'])==document['source_sha256']))
            if readback_method=='v8-boxtext':
                protected[-1]['working_unchanged']=digest(document['working_path'])==document['source_sha256']
        helper_preservation=[dict(name=item['name'],sha256=item['sha256'],
            installed_unchanged=digest(RESOURCES/item['path'])==item['sha256']) for item in config['helpers']]
        after=dict(original=preferences(ORIGINAL),source=preferences(SOURCE))
        write_json(output/'preferences-after.json',after)
        cleanup=dict(owned_capture_after=remaining,prefix_processes_after=prefix_after,marker_processes_after=marker_after,
            signal_scope='capture marker AND prefix AND display AND PID start; pidfd bound',
            display_only_attribution=False,ordinary_quit_requested=False,launched_processes=launches,
            unreadable_process_environments=dict(owned_scan=owned_unknown,prefix_scan=prefix_unknown,marker_scan=marker_unknown),
            preference_file_counts={key:len(value) for key,value in before.items()},
            preferences_unchanged=before==after,source_preservation=protected,
            helper_preservation=helper_preservation,
            prefix_removed=False,xvfb_exited=xvfb is None or xvfb.poll() is not None)
        preserved=before==after and all(row['installed_unchanged'] and row['pristine_unchanged'] for row in protected) and all(
            row['installed_unchanged'] for row in helper_preservation)
        if readback_method=='v8-boxtext':preserved=preserved and all(row['working_unchanged'] for row in protected)
        if preserved and not prefix_after and not marker_after and (prefix/MARKER).is_file() and (
                prefix/MARKER).read_text().strip()==scope['capture_id']:
            shutil.rmtree(prefix);cleanup['prefix_removed']=True
        raw=work/'private-journal.jsonl'
        if raw.exists():
            rows=[public_row(json.loads(line)) for line in raw.read_text().splitlines()]
            (output/'receipts.jsonl').write_text(''.join(json.dumps(row,ensure_ascii=True,allow_nan=False)+'\n' for row in rows))
            session['public_rows']=len(rows);session['private_journal_sha256']=digest(raw)
        write_json(output/'display-states.json',snapshots)
        if (work/'private-runtime.log').exists():
            session['private_log']=dict(sha256=digest(work/'private-runtime.log'),bytes=(work/'private-runtime.log').stat().st_size)
        cleanup_ok=preserved and not remaining and not prefix_after and not marker_after and cleanup['xvfb_exited']
        if not cleanup_ok:session.update(status='FAILED',complete=False,preservation_or_cleanup_failed=True)
        write_json(output/'cleanup.json',cleanup);write_json(output/'session.json',session)
        print(json.dumps(dict(stage='cleaned',preferences_unchanged=before==after,
            prefix_remaining=len(prefix_after),capture_remaining=len(marker_after))),flush=True)
        if not cleanup_ok:
            raise RuntimeError('Capture preservation or owned cleanup failed')
    return output


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute',action='store_true')
    parser.add_argument('--work',type=Path)
    parser.add_argument('--prefix',type=Path,default=PREFIX)
    parser.add_argument('--wine',type=Path,default=WINE)
    parser.add_argument('--host-display',help='Actual host desktop display, explicitly supplied by capture owner')
    parser.add_argument('--timeout-seconds',type=int,default=150,help='Active capture bound before owned cleanup (30-150)')
    parser.add_argument('--capture-name',default='append-prepend-002')
    args=parser.parse_args()
    if not args.execute:
        print(json.dumps(dict(status='PREPARED_NOT_EXECUTED',runtime_started=False,
            requires_explicit_execute=True,steps=len(build_score()),rows=['A1','A2','A3','A4','P1','P2'],
            prefix=str(args.prefix),work=None if args.work is None else str(args.work),
            requires_explicit_host_display=True,private_display_minimum=200,ordinary_quit=False,
            input_method='programmatic controls; physical entry/drag remain unqualified')))
        return
    def interrupted(signum,frame):raise RuntimeError('Controlled capture interrupted for cleanup')
    signal.signal(signal.SIGTERM,interrupted)
    if not 30<=args.timeout_seconds<=150:raise ValueError('Capture timeout must be between 30 and 150 seconds')
    signal.signal(signal.SIGALRM,interrupted)
    signal.setitimer(signal.ITIMER_REAL,args.timeout_seconds)
    try:execute(args)
    finally:signal.setitimer(signal.ITIMER_REAL,0)


if __name__=='__main__':
    main()
