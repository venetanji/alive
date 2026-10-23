#!/usr/bin/env python3
"""Dry-run by default. Parent alone may launch a reviewed private preparation."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import subprocess
import sys
import time

sys.dont_write_bytecode=True
import numeric as n
import lifecycle as lifecycle_validation

# Import, rather than reimplement, the audited marker/prefix/display/start/pidfd utilities.
sys.modules.setdefault('help_runtime',n.common)
spec=importlib.util.spec_from_file_location('numeric_audited_ownership',n.PREVIOUS/'run-runtime.py')
safety=importlib.util.module_from_spec(spec);spec.loader.exec_module(safety)
PREFIX=Path.home()/'.cache/alive-max-int-float-20261022-wine-disposable'
MARKER=safety.MARKER


def private_rows(work):
    path=work/'private-journal.jsonl'
    rows=[json.loads(line) for line in path.read_text().splitlines() if line]
    if [r.get('seq') for r in rows]!=list(range(1,len(rows)+1)):
        raise ValueError('Strict globally contiguous journal sequence required')
    return rows


def project_public_journal(rows, validated_closes):
    public=[];published=set()
    for row in rows:
        if ('closed_owner_absence_validated' in row or
                row.get('action')=='close' and row.get('kind')=='step-complete'):
            request=row.get('request_id');accepted=validated_closes.get(request)
            if (type(request) is not int or accepted is None or request in published or
                    row.get('closed_owner_absence_validated') is not True or
                    row.get('kind')!='step-complete' or row.get('action')!='close' or
                    type(row.get('revision')) is not int or type(row.get('action_revision')) is not int or
                    any(row.get(key)!=accepted[key] for key in
                        ['request_id','step_id','action','document','action_revision','source_sha256']) or
                    row.get('action_document')!=accepted['document'] or
                    row.get('revision')!=accepted['action_revision']):
                raise ValueError('Public close requires independently validated owner evidence')
            published.add(request)
        public.append(n.public_receipt(row))
    return public


def execute(args):
    if args.work is None:raise ValueError('Reviewed private preparation required')
    work=args.work.resolve();config=n.verify_private(work)
    prefix=args.prefix.resolve();output=n.ROOT/'results'/args.capture_name
    if not args.capture_name or Path(args.capture_name).name!=args.capture_name or args.capture_name in {'.','..'}:
        raise ValueError('Safe new capture name required')
    if prefix!=PREFIX or prefix.exists() or output.exists():raise ValueError('New exact task prefix and output required')
    if (work/'private-journal.jsonl').exists():raise ValueError('Preparation already used')
    if safety.scan_environment({'WINEPREFIX':str(prefix)})[0]:raise ValueError('Prefix already has processes')
    if not hasattr(os,'pidfd_open') or not hasattr(signal,'pidfd_send_signal'):raise ValueError('pidfd required')
    display=safety.choose_private_display(args.host_display,os.environ.get('DISPLAY'))
    scope=dict(capture_id=secrets.token_hex(24),prefix=str(prefix),display=display)
    env=dict(os.environ,**safety.scope_environment(scope),WINEDEBUG='-all',WAYLAND_DISPLAY='',
        WINESERVER=str(args.wine.parent/'wineserver'),XAUTHORITY=str(work/'private-xauthority'),
        LIBGL_ALWAYS_SOFTWARE='1',MESA_LOADER_DRIVER_OVERRIDE='llvmpipe')
    before=dict(original=safety.preferences(safety.ORIGINAL),source=safety.preferences(safety.SOURCE))
    output.mkdir(parents=True)
    n.write_json(output/'preferences-before.json',before)
    session=dict(schema_version=1,status='STARTING',complete=False,runtime_invocations=1,
        screenshot_count=0,clipboard_actions=0,score_binding=n.score_binding(),preparation_binding=n.preparation_binding(work),work=str(work),prefix=str(prefix),
        source_prefix=str(safety.SOURCE),capture_id=scope['capture_id'],display=display,host_display=args.host_display,
        operation_ledger=[],readback_requests=[],command_requests=[],readback_method='v8-numeric-getvalueof',
        destination_order_witnesses=[],destination_order_failures=[],source_metadata=config['source_metadata'],
        message_prototypes=[dict(document=d['document'],source_sha256=d['source_sha256'],anchor=b['anchor'],
            text_sha256=hashlib.sha256(b['authored_text'].encode()).hexdigest(),text_characters=len(b['authored_text']))
            for d in config['documents'] if d['revision']==1 for b in d['boxes'] if b['maxclass']=='message'],
        process_ownership='capture marker AND prefix AND display AND PID-start; pidfd signals',
        saved_order_observed=False,ordinary_quit_requested=False,launch_diagnostics=[],
        initial_message_prototypes_validated=False,initial_numeric_readback_validated=False,
        numeric_readback_validated=False,numeric_getters_silent_validated=False,
        runtime_endpoint_readback_validated=False,typed_float_dispatch_validated=False,
        synchronous_destination_outputs_validated=False)
    snapshots=[];launches=[];xvfb=None;process=None;log=None;command_id=0;prior={};seen_seq=0;private_requests=[]
    live={};validated_closes={};definitions={(d['document'],d['revision']):d for d in config['documents']}
    def send(value,private=False):
        nonlocal command_id
        command_id+=1;value=dict(value,command_id=command_id)
        record={key:value[key] for key in ['step_id','document','op','revision','action_revision'] if key in value}
        record['request_id']=command_id
        (private_requests if private else session['command_requests']).append(record)
        n.write_json(work/'command.json',value)
        safety.wait_json(work/'ack.json',lambda a:a.get('command_id')==command_id,10)
        payload=(work/'ack.json').read_bytes()
        record.update(n.retain_raw(work/'observations'/('ack-request-'+str(command_id)+'.json'),payload))
        ack=json.loads(payload)
        if type(ack.get('command_id')) is not int or ack['command_id']!=command_id:raise ValueError('Ack request binding mismatch')
        if ack.get('success') is not True:raise ValueError('Private controller refused command')
        return command_id,ack
    def verify_journal(rows,operation):
        for row in rows:
            if row.get('kind')=='harness-error':raise ValueError('Private harness error')
            if (row.get('request_id')!=operation['request_id'] or row.get('step_id')!=operation['step_id'] or
                row.get('action_document')!=operation['document'] or row.get('action_revision')!=operation['action_revision'] or
                row.get('action')!=operation['action']):raise ValueError('Action journal binding mismatch')
            if row.get('kind')=='receipt':
                doc=row.get('document')
                if (doc not in live or row.get('revision')!=live[doc] or
                    row.get('source_sha256')!=n.IDENTITIES[doc]):raise ValueError('Stale or closed-owner receipt')
                definition=definitions[(doc,live[doc])]
                box=next((b for b in definition['boxes'] if b['anchor']==row.get('anchor')),None)
                if box is None or type(row.get('port')) is not int or not 0<=row['port']<box['outlets']:
                    raise ValueError('Nonoriginal receipt endpoint')
            n.public_receipt(row)
        completes=[r for r in rows if r.get('kind')=='step-complete']
        stimuli=[r for r in rows if r.get('kind')=='stimulus']
        if len(completes)!=1 or len(stimuli)!=(1 if operation['action']=='event' else 0):
            raise ValueError('Missing/duplicate action bracket')
        if operation['action']=='event':
            if stimuli[0].get('message')!=operation['message'] or stimuli[0].get('anchor')!=operation['anchor']:
                raise ValueError('Stimulus differs from pinned score')
        elif any(r.get('kind')=='receipt' for r in rows):raise ValueError('Lifecycle emitted unexpected output')
    try:
        subprocess.run(['cp','-a','--reflink=always',str(safety.SOURCE),str(prefix)],check=True,env=env,
                       stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        prefix.chmod(0o700);(prefix/MARKER).write_text(scope['capture_id']+'\n');(prefix/MARKER).chmod(0o600)
        if any(p.is_symlink() for p in (prefix/'drive_c/users').rglob('*')):raise ValueError('Copied profile symlink')
        if safety.scan_environment({'WINEPREFIX':str(prefix)})[0]:raise ValueError('Copied prefix already active')
        for doc,sha in n.IDENTITIES.items():
            n.common.require_digest(prefix/safety.MAX_RELATIVE.parent/'resources/help/max'/(doc+'.maxhelp'),sha)
        n.common.require_helpers(prefix/safety.MAX_RELATIVE.parent/'resources',config['helpers'])
        session['max_sha256']=n.digest(prefix/safety.MAX_RELATIVE)
        for name in ['private-journal.jsonl','ack.json','ready.json']:(work/name).touch(mode=0o600,exist_ok=False)
        log=(work/'private-runtime.log').open('x');(work/'private-runtime.log').chmod(0o600)
        safety.private_xauthority(work/'private-xauthority',display)
        xvfb=subprocess.Popen(['Xvfb',display,'-screen','0','1280x900x24','-nolisten','tcp','-auth',env['XAUTHORITY']],
                              env=env,stdout=log,stderr=log,umask=0o077)
        launches.append(dict(role='xvfb',**safety.launched_identity(xvfb,scope,session['launch_diagnostics'],role='xvfb')))
        safety.wait_xserver(xvfb,launches[-1],scope)
        process=subprocess.Popen([str(args.wine),r'C:\ProgramData\Ableton\Live 12 Suite\Resources\Max\Max.exe',
                                  n.windows_path(work/'driver.maxpat')],env=env,stdout=log,stderr=log,umask=0o077)
        launches.append(dict(role='wine-launcher',**safety.launched_identity(process,scope,session['launch_diagnostics'],role='wine-launcher')))
        ready=safety.wait_json(work/'ready.json',lambda r:'ready' in r,30)
        if ready.get('ready') is not True or ready.get('live_owners')!={} or ready.get('source_roots_opened')!=0:
            raise ValueError('Driver must start without roots')
        for expected in n.timeline(n.load_score()):
            n.verify_private(work)
            command={k:v for k,v in expected.items() if k!='live_owners'}
            request_id,ack=send(dict(command,op='operation'))
            operation=dict(expected,request_id=request_id,checkpoint_request_ids=[],working_paths={})
            if expected['action']=='close':
                # Retained raw ACK/proof validation precedes every public close gate.
                metadata=lifecycle_validation.validate_close(work,config,dict(command,op='operation',command_id=request_id),ack)
                n.retain_raw(work/'observations'/('validated-close-'+str(request_id)+'.json'),
                    (json.dumps(metadata,sort_keys=True)+'\n').encode())
                if ack.get('closed_owner_absence_validated') is not True:
                    raise ValueError('Closed owner absence not proven')
                validated_closes[request_id]=operation
            live=dict(expected['live_owners'])
            rows=private_rows(work);action_rows=[r for r in rows if r['seq']>seen_seq];seen_seq=len(rows)
            verify_journal(action_rows,operation)
            if operation['step_id'] in n.MAIN_EVENTS:
                try:session['destination_order_witnesses'].append(n.destination_witness(operation,action_rows))
                except ValueError as error:
                    session['destination_order_failures'].append(dict(step_id=operation['step_id'],
                        document=operation['document'],revision=operation['action_revision'],
                        failure_sha256=hashlib.sha256(str(error).encode()).hexdigest()))
            if operation['step_id']=='E05':
                target=[r for r in action_rows if r.get('kind')=='receipt' and r.get('document')=='float' and
                        r.get('anchor')==operation['anchor'] and r.get('port')==0]
                if len(target)!=1 or target[0]['message']!=operation['message']:raise ValueError('Typed float dispatch not witnessed')
                session['typed_float_dispatch_validated']=True
            checkpoints=[]
            for doc,revision in live.items():
                definition=definitions[(doc,revision)]
                next_id=command_id+1
                raw_path=work/'observations'/('request-'+str(next_id)+'-'+doc+'-r'+str(revision)+'.json')
                if raw_path.exists():raise ValueError('Raw readback request already exists')
                seq_before=len(private_rows(work))
                request_record=dict(request_id=next_id,operation_request_id=request_id,
                    step_id=operation['step_id'],action=operation['action'],action_document=operation['document'],
                    action_revision=operation['action_revision'],document=doc,revision=revision,
                    source_sha256=definition['source_sha256'],working_path=definition['working_windows_path'],seq_before=seq_before)
                session['readback_requests'].append(request_record)
                read_id,_=send(dict(op='readback',step_id=operation['step_id'],action=operation['action'],
                    operation_request_id=request_id,action_document=operation['document'],action_revision=operation['action_revision'],
                    document=doc,revision=revision,source_sha256=definition['source_sha256'],output_path=n.windows_path(raw_path)))
                safety.wait_json(raw_path,lambda r:r.get('request_id')==read_id,5)
                result=n.extract_checkpoint(work,definition,raw_path,read_id,operation['step_id'],operation['action'],request_record)
                raw=json.loads(raw_path.with_name('retained-'+raw_path.name).read_bytes())
                if (raw.get('operation_request_id')!=request_id or raw.get('action_document')!=operation['document'] or
                    raw.get('action_revision')!=operation['action_revision']):raise ValueError('Checkpoint causing action mismatch')
                initial=operation['action']=='install' and doc==operation['document']
                n.validate_numeric_progress(definition,result,action_rows,prior,initial=initial)
                seq_after=len(private_rows(work))
                if seq_before!=seq_after:raise ValueError('Read-only getter emitted output')
                result.update(operation_request_id=request_id,action_document=operation['document'],
                              action_revision=operation['action_revision'])
                snapshots.append(result);checkpoints.append(result)
                operation['checkpoint_request_ids'].append(read_id);operation['working_paths'][doc]=definition['working_windows_path']
                request_record['seq_after']=seq_after
            n.validate_live_checkpoints(operation,checkpoints)
            session['operation_ledger'].append(n.public_operation(operation))
            n.write_json(output/'session.json',session)
        if len(snapshots)!=102 or sum(len(s['numeric_states']) for s in snapshots)!=612:
            raise ValueError('Finite checkpoint coverage mismatch')
        # This private completion command adds no score/readback/public request row.
        barrier_id,barrier_ack=send(dict(op='lifecycle-barrier',step_id='capture-complete'),private=True)
        lifecycle_validation.validate_barrier(work,config,barrier_ack,live)
        n.retain_raw(work/'lifecycle-completion.json',(json.dumps(dict(request_id=barrier_id,
            command_requests=private_requests,expected_live=live,lifecycle_barrier_validated=True),sort_keys=True)+'\n').encode())
        session.update(status='COMPLETE',complete=True,initial_message_prototypes_validated=True,
            initial_numeric_readback_validated=True,numeric_readback_validated=True,numeric_getters_silent_validated=True,
            runtime_endpoint_readback_validated=True,synchronous_destination_outputs_validated=len(session['destination_order_witnesses'])==21)
    except BaseException as error:
        session.update(status='FAILED',complete=False,failure_sha256=hashlib.sha256(str(error).encode()).hexdigest())
    finally:
        signal.setitimer(signal.ITIMER_REAL,0)
        owned,unknown=safety.owned(scope);safety.stop_owned(owned,scope)
        for child in [process,xvfb]:
            if child is not None:
                try:child.wait(timeout=3)
                except subprocess.TimeoutExpired:pass
        remaining,_=safety.owned(scope)
        if remaining:safety.stop_owned(remaining,scope)
        remaining,_=safety.owned(scope)
        prefix_after,prefix_unknown=safety.scan_environment({'WINEPREFIX':str(prefix)})
        marker_after,marker_unknown=safety.scan_environment({safety.CAPTURE_ENV:scope['capture_id']})
        if log:log.close()
        def unchanged(path,sha):
            try:return n.digest(path)==sha
            except OSError:return False
        protected=[dict(document=d['document'],revision=d['revision'],installed_unchanged=unchanged(d['source_path'],d['source_sha256']),
                        pristine_unchanged=unchanged(d['pristine_path'],d['source_sha256']),
                        working_unchanged=unchanged(d['working_path'],d['source_sha256'])) for d in config['documents']]
        helpers=[dict(name=h['name'],sha256=h['sha256'],installed_unchanged=unchanged(n.common.RESOURCES/h['path'],h['sha256']),
                      private_unchanged=unchanged(work/'helpers'/h['name'],h['sha256'])) for h in config['helpers']]
        after=dict(original=safety.preferences(safety.ORIGINAL),source=safety.preferences(safety.SOURCE))
        n.write_json(output/'preferences-after.json',after)
        preserved=before==after and all(all(r[k] for k in ['installed_unchanged','pristine_unchanged','working_unchanged']) for r in protected)
        preserved=preserved and all(h['installed_unchanged'] and h['private_unchanged'] for h in helpers)
        cleanup=dict(owned_capture_after=remaining,prefix_processes_after=prefix_after,marker_processes_after=marker_after,
            signal_scope='capture marker AND prefix AND display AND PID start; pidfd bound',display_only_attribution=False,
            ordinary_quit_requested=False,launched_processes=launches,preferences_unchanged=before==after,
            unreadable_process_environments=dict(owned_scan=unknown,prefix_scan=prefix_unknown,marker_scan=marker_unknown),
            source_preservation=protected,helper_preservation=helpers,prefix_removed=False,xvfb_exited=xvfb is None or xvfb.poll() is not None)
        if preserved and not remaining and not prefix_after and not marker_after and (prefix/MARKER).is_file() and (prefix/MARKER).read_text().strip()==scope['capture_id']:
            shutil.rmtree(prefix);cleanup['prefix_removed']=True
        if (work/'private-journal.jsonl').exists():
            try:
                session['private_journal_sha256']=n.digest(work/'private-journal.jsonl')
                rows=private_rows(work)
                # Failure cleanup must enforce the same independent close gate.
                public=project_public_journal(rows,validated_closes)
                (output/'receipts.jsonl').write_text(''.join(json.dumps(r,allow_nan=False)+'\n' for r in public))
                session.update(public_rows=len(public))
            except BaseException as error:session.update(status='FAILED',complete=False,journal_failure_sha256=hashlib.sha256(str(error).encode()).hexdigest())
        n.write_json(output/'display-states.json',snapshots)
        if (work/'private-runtime.log').exists():
            session['private_log']=dict(sha256=n.digest(work/'private-runtime.log'),bytes=(work/'private-runtime.log').stat().st_size)
        if not (preserved and not remaining and not prefix_after and not marker_after and cleanup['xvfb_exited'] and cleanup['prefix_removed']):
            session.update(status='FAILED',complete=False,preservation_or_cleanup_failed=True)
        n.write_json(output/'cleanup.json',cleanup);n.write_json(output/'session.json',session)
    if session['complete'] is not True:raise ValueError('Numeric capture failed; inspect hash-only public session')
    return output


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute',action='store_true');parser.add_argument('--work',type=Path)
    parser.add_argument('--prefix',type=Path,default=PREFIX);parser.add_argument('--wine',type=Path,default=safety.WINE)
    parser.add_argument('--host-display');parser.add_argument('--capture-name',default='int-float-001')
    parser.add_argument('--timeout-seconds',type=int,default=150)
    args=parser.parse_args()
    if not args.execute:
        print(json.dumps(dict(status='NOT_EXECUTED',runtime_started=False,score_binding=n.score_binding(),
            requires_explicit_execute=True,requires_explicit_host_display=True,private_display_minimum=200,
            active_bound_seconds=150,ordinary_quit=False,unresolved=['numeric-getter','typed-float','dispose-invalidity','destination-output-order'])))
        return
    if not 30<=args.timeout_seconds<=150:raise ValueError('Active bound must be30..150 seconds')
    def interrupted(signum,frame):raise RuntimeError('Capture interrupted for exact-owned cleanup')
    signal.signal(signal.SIGTERM,interrupted);signal.signal(signal.SIGALRM,interrupted)
    signal.setitimer(signal.ITIMER_REAL,args.timeout_seconds)
    try:execute(args)
    finally:signal.setitimer(signal.ITIMER_REAL,0)


if __name__=='__main__':
    try:main()
    except BaseException as error:
        print(json.dumps(dict(status='FAILED',failure_sha256=hashlib.sha256(str(error).encode()).hexdigest())),file=sys.stderr)
        raise SystemExit(1)
