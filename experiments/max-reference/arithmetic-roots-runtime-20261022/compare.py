#!/usr/bin/env python3
"""Compare every arithmetic operation; complete raw inputs remain private."""
from collections import Counter
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
SPEC=importlib.util.spec_from_file_location('arithmetic_capture_contract',ROOT/'run-runtime.py')
runner=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(runner)


def require(condition,label):
    if not condition:raise ValueError(label)


def canonical(value):
    return json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def typed(message,native=False):
    require(type(message) is dict and set(message)==({'selector','atoms','raw_selector'} if native else {'selector','atoms'}),
            'Exact message fields required')
    require(not native or message['raw_selector']=='','Native raw selector mismatch')
    selector=message['selector'];atoms=message['atoms']
    require(selector in {'bang','int','float'} and type(atoms) is list,'Finite typed message required')
    require(len(atoms)==(0 if selector=='bang' else 1),'Scalar atom count mismatch')
    for atom in atoms:
        require(type(atom) is dict and set(atom)=={'tag','value'} and atom['tag']==selector,'Observed scalar tag mismatch')
        value=atom['value']
        require(type(value) in {int,float} and math.isfinite(value),'Finite scalar required')
        require(selector!='int' or value==math.trunc(value),'Integer scalar mismatch')
    return dict(selector=selector,atoms=atoms)


def compare_operations(score,native,journal,snapshots,contexts,ledger):
    coverage=runner.validate_coverage(score,ledger,snapshots)
    require(len(native)==78,'Complete native denominator required')
    require(all(type(r.get('seq')) is int for r in journal) and
            [r.get('seq') for r in journal]==list(range(1,len(journal)+1)),'Contiguous private journal required')
    request_order=[]
    for row in journal:
        request=row.get('request_id')
        require(type(request) is int,'Typed action request required')
        if not request_order or request_order[-1]!=request:request_order.append(request)
    require(request_order==[op['request_id'] for op in ledger],'Exact journal action coverage required')
    by_doc={value['document']:(slot,value) for slot,value in contexts.items()}
    checkpoints=[];output_count=state_count=0
    for step,row,operation in zip(score,native,ledger):
        require(row.get('step_id')==step['step_id'],'Native operation identity mismatch')
        doc=step['document'];slot,context=by_doc[doc];revision=operation['action_revision']
        receipts=[r for r in journal if r['request_id']==operation['request_id']]
        for receipt in receipts:
            require(type(receipt.get('revision')) is int and type(receipt.get('action_revision')) is int,
                    'Typed journal owner revisions required')
            require(receipt.get('kind') in {'stimulus','receipt','step-complete'},'Unexpected journal kind')
            require(all(receipt.get(k)==v for k,v in dict(step_id=step['step_id'],action=step['action'],
                action_document=doc,action_revision=revision,document=doc,revision=revision,
                source_sha256=step['source_sha256']).items()),'Receipt action/source/owner binding mismatch')
            if 'message' in receipt:typed(receipt['message'])
        completes=[r for r in receipts if r['kind']=='step-complete']
        stimuli=[r for r in receipts if r['kind']=='stimulus']
        outputs=[r for r in receipts if r['kind']=='receipt']
        require(len(completes)==1 and receipts[-1] is completes[0],'Unique final action bracket required')
        require(len(stimuli)==int(step['action']=='event'),'Exact stimulus coverage required')
        if step['action']=='event':
            stimulus=stimuli[0]
            require(receipts[0] is stimulus and stimulus.get('anchor')==step['anchor'] and
                    stimulus['message']==step['message'],'Exact original input required')
        else:require(not outputs,'Lifecycle output must be silent')
        if step['action']=='close':
            require(completes[0].get('closed_owner_absence_validated') is True,'Accepted close claim required')
        wanted=[]
        for receipt in row['trace']:
            if receipt['phase']!='output':continue
            require(receipt['document']==slot and receipt['node'] in context['nodes'],'Native output owner mismatch')
            wanted.append((context['anchors'][receipt['node']],receipt['port'],canonical(typed(receipt['message'],True))))
        actual=[]
        for receipt in outputs:
            require(receipt.get('synchronous_dispatch_active') is True,'Output outside synchronous event bracket')
            require(type(receipt.get('port')) is int,'Typed original outlet required')
            actual.append((receipt.get('anchor'),receipt['port'],canonical(typed(receipt['message']))))
        require(Counter(actual)==Counter(wanted),'Exact typed original output multiset mismatch')
        states=[s for s in snapshots if s['operation_request_id']==operation['request_id']]
        require(len(row['snapshots'])==len(states),'Native/Max live checkpoint mismatch')
        if states:
            snapshot=row['snapshots'][0]
            require(type(snapshot['document']) is int and type(snapshot['revision']) is int and
                    snapshot['document']==slot and snapshot['revision']==revision,'Native snapshot owner mismatch')
            native_nodes={node['id']:node for node in snapshot['nodes']}
            expected={context['anchors'][identity]:(native_nodes[identity]['value'],'float' if kind==17 else 'int')
                      for identity,kind in context['nodes'].items() if kind in {17,52}}
            observed=states[0]['numeric_states']
            require(len(expected)==7 and len(observed)==7 and Counter(v.get('anchor') for v in observed)==Counter(expected.keys()),
                    'Exact seven original numeric anchors required')
            for state in observed:
                value,tag=expected[state['anchor']]
                require(type(state.get('value')) in {int,float} and math.isfinite(state['value']) and
                        state['value']==value and state.get('semantic_tag')==tag,'Numeric getter value/class mismatch')
            state_count+=7
        output_count+=len(outputs)
        checkpoints.append(dict(step_id=step['step_id'],document=doc,revision=revision,action=step['action'],
            output_count=len(outputs),numeric_state_count=7 if states else 0,comparison_pass=True,
            native_row_sha256=digest(row),max_action_sha256=digest(receipts),max_checkpoint_sha256=digest(states)))
    require(output_count==141 and state_count==504,'Full output/state denominator required')
    return dict(counts=dict(coverage,outputs=output_count),checkpoints=checkpoints,saved_order_observed=False,
        getter_scalar_tags_observed=False,original_outlet_scalar_tags_observed=True,
        complete_installed_help_qualification_passes_added=0)


def read_json(path):
    return json.loads(Path(path).read_bytes())


def file_digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def pair_readbacks(requests,snapshots):
    require(type(requests) is list and type(snapshots) is list and len(requests)==len(snapshots)==72,
            'Complete private readback/state denominator required')
    identities=[row.get('request_id') for row in requests]
    require(all(type(identity) is int and identity>0 for identity in identities) and
            len(set(identities))==72 and identities==[row.get('request_id') for row in snapshots],
            'Unique private readback/state pairing required')
    return list(zip(requests,snapshots))


def read_native_private(directory):
    directory=Path(directory).absolute()
    repo=ROOT.parents[2]
    require(directory.resolve()==directory and directory!=repo and repo not in directory.parents,
            'Native evidence must remain outside worktree')
    if not hasattr(runner,'n'):runner.load_runtime()
    runner.n._directory(directory)
    names={'binding.json','expectations.json','native.jsonl','stderr.txt','transport.txt'}
    require({path.name for path in directory.iterdir()}==names,'Exact private native artifact inventory required')
    return {name:runner.n.read_private(directory,directory/name) for name in names}


def bind_close_proofs(ledger,proofs):
    closes=[op for op in ledger if op['action']=='close']
    require(len(closes)==len(proofs)==6,'All six scored close proofs required')
    for operation,proof in zip(closes,proofs):
        require(type(proof.get('request_id')) is int and type(proof.get('revision')) is int and
                all(proof.get(key)==value for key,value in dict(request_id=operation['request_id'],
                    step_id=operation['step_id'],document=operation['document'],revision=operation['action_revision'],
                    source_sha256=operation['source_sha256']).items()),'Close proof scored-request binding mismatch')


def compare_capture(args):
    runner.load_runtime();n=runner.n;lifecycle=runner.lifecycle_validation
    spec=importlib.util.spec_from_file_location('arithmetic_frozen_native_score',ROOT/'native_score.py')
    scorer=importlib.util.module_from_spec(spec);spec.loader.exec_module(scorer)
    work=args.work.absolute();config=n.verify_private(work);score=n.load_score()
    capture=args.capture.absolute();session=read_json(capture/'session.json');cleanup=read_json(capture/'cleanup.json')
    evidence=read_json(capture/'capture-evidence.json')
    require(evidence.get('operation')=='capture_process_scenario' and
            isinstance(evidence.get('evidence_id'),str) and evidence['evidence_id'].startswith('ev_'),
            'REA capture evidence binding required')
    require(session.get('complete') is True and session.get('status')=='COMPLETE' and session.get('work')==str(work),
            'Complete exact private Max capture required')
    require(evidence.get('session_sha256')==file_digest(capture/'session.json') and
            evidence.get('cleanup_sha256')==file_digest(capture/'cleanup.json'),'REA capture artifact binding mismatch')
    require(session['score_binding']==n.score_binding() and session['preparation_binding']==n.preparation_binding(work),
            'Current sealed Max package required')
    require(session['runner_sha256']==file_digest(ROOT/'run-runtime.py') and
            session['runner_test_sha256']==file_digest(ROOT/'test_runner.py'),'Frozen reviewed runner required')
    require(all(session.get(key) is True for key in ('initial_numeric_readback_validated','numeric_readback_validated',
        'numeric_getters_silent_validated','runtime_endpoint_readback_validated','typed_float_dispatch_validated',
        'lifecycle_barrier_validated')),'All Max capture gates required')
    require(cleanup.get('preferences_unchanged') is True and cleanup.get('prefix_removed') is True and
            cleanup.get('xvfb_exited') is True and all(cleanup.get(key)==[] for key in
            ('owned_capture_after','prefix_processes_after','marker_processes_after')),'Exact preservation and cleanup required')
    for row in cleanup['source_preservation']:
        require(all(row.get(key) is True for key in ('installed_unchanged','pristine_unchanged','working_unchanged')),
                'Every original revision must remain unchanged')
    for row in cleanup['helper_preservation']:
        require(row.get('installed_unchanged') is True and row.get('private_unchanged') is True,'Every helper must remain unchanged')
    native_public=read_json(args.native_public);native_bytes=read_native_private(args.native_private)
    binding=json.loads(native_bytes['binding.json'])
    require(native_public.get('schema')=='arithmetic-native-finite-result-v1' and
            native_public.get('status')=='NATIVE_SCORED_NOT_MAX_COMPARED','Verified native result required')
    require(all(native_public.get(key)==value for key,value in binding.items()) and
            native_public['binding_sha256']==hashlib.sha256(native_bytes['binding.json']).hexdigest(),'Native evidence binding mismatch')
    require(binding['scorer_sha256']==file_digest(ROOT/'native_score.py') and
            binding['transport_module_sha256']==file_digest(scorer.replay.__file__) and
            binding['score_sha256']==file_digest(ROOT/'score.json'),'Frozen native score/source binding mismatch')
    bundle_before=scorer.bundle_hashes(args.bundle_root)
    require(binding['bundle_before_sha256']==binding['bundle_after_sha256']==bundle_before,'Production bundle identity mismatch')
    for name,sha in binding['private_file_sha256'].items():
        require(name in native_bytes and hashlib.sha256(native_bytes[name]).hexdigest()==sha,'Retained private native artifact mismatch')
    bundles={doc:(read_json(args.bundle_root/doc/'import.json'),read_json(args.bundle_root/doc/'native.json')) for doc in n.IDENTITIES}
    wire,contexts=scorer.replay.build_transport(bundles,score,explicit_lifecycle=True)
    require(native_bytes['transport.txt'].decode()==wire,'Exact production transport binding required')
    native=[json.loads(line) for line in native_bytes['native.jsonl'].splitlines()]
    native_result=scorer.verify_results(native,bundles,score,contexts)
    require(native_result['counts']==native_public['counts'] and native_result['gates']==native_public['gates'],
            'Native score replay validation mismatch')
    journal=runner.private_rows(work)
    require(file_digest(work/'private-journal.jsonl')==session['private_journal_sha256'],'Private Max journal binding mismatch')
    snapshots=read_json(work/'private-display-states.json')
    require(file_digest(work/'private-display-states.json')==session['private_snapshots_sha256'],'Private getter binding mismatch')
    definitions={(d['document'],d['revision']):d for d in config['documents']}
    retained=[]
    for request,state in pair_readbacks(session['readback_requests'],snapshots):
        require(request['request_id']==state['request_id'] and request['seq_before']==request['seq_after'],
                'Read-only request binding mismatch')
        definition=definitions[(state['document'],state['revision'])]
        path=work/'observations'/('retained-request-'+str(state['request_id'])+'-'+state['document']+'-r'+str(state['revision'])+'.json')
        payload=n.read_private(work,path)
        require(hashlib.sha256(payload).hexdigest()==request['raw_sha256']==state['raw_sha256'] and
                len(payload)==request['raw_bytes']==state['raw_bytes'],'Exact retained readback required')
        raw=n.parse_json(payload)
        for key in ('operation_request_id','action_document','action_revision'):
            require(raw.get(key)==state[key]==request[key],'Readback causing-action mismatch')
        checked=n.validate_checkpoint(definition,raw,state['request_id'],state['step_id'],state['action'])
        checked.update(raw_sha256=state['raw_sha256'],raw_bytes=state['raw_bytes'],
            **{key:state[key] for key in ('operation_request_id','action_document','action_revision')})
        require(checked==state,'Revalidated checkpoint differs from private snapshot')
        retained.append(checked)
    completion=read_json(work/'lifecycle-completion.json')
    require(completion.get('lifecycle_barrier_validated') is True and completion.get('expected_live')=={},
            'Final all-closed barrier required')
    barrier=read_json(work/'observations'/('ack-request-'+str(completion['request_id'])+'.json'))
    lifecycle.validate_barrier(work,config,barrier,{})
    proofs=[json.loads(n.read_private(work,work/'observations'/
        ('retained-lifecycle-root-'+owner['document']+'-r'+str(owner['revision'])+'.json')))
        for owner in config['lifecycle']['owners']]
    bind_close_proofs(session['operation_ledger'],proofs)
    result=compare_operations(score,native,journal,retained,contexts,session['operation_ledger'])
    require(bundle_before==scorer.bundle_hashes(args.bundle_root),'Production bundles changed during comparison')
    require(native_bytes==read_native_private(args.native_private),'Native evidence changed during comparison')
    require(read_json(capture/'display-states.json')==[runner.public_checkpoint(s) for s in retained],
            'Public checkpoint projection mismatch')
    accepted={op['request_id']:op for op in session['operation_ledger'] if op['action']=='close'}
    projected=[json.loads(line) for line in (capture/'receipts.jsonl').read_text().splitlines()]
    require(projected==runner.project_public_journal(journal,accepted),'Public journal projection mismatch')
    report=dict(schema='arithmetic-max-native-comparison-v1',status='FINITE_ARITHMETIC_COMPARISON',
        all_comparison_gates_pass=True,**result,rea_evidence_id=evidence['evidence_id'],
        score_sha256=file_digest(ROOT/'score.json'),source_identities=n.IDENTITIES,
        comparison_sha256=file_digest(__file__),comparison_test_sha256=file_digest(ROOT/'test_comparison.py'),
        native_public_sha256=file_digest(args.native_public),capture_session_sha256=file_digest(capture/'session.json'),
        native_counts=native_result['counts'],sealed_preparation=session['preparation_binding'])
    with args.public_output.open('x') as stream:stream.write(json.dumps(report,indent=2,allow_nan=False)+'\n')
    return report


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ('work','capture','native-private','native-public','bundle-root','public-output'):
        parser.add_argument('--'+name,type=Path,required=True)
    result=compare_capture(parser.parse_args())
    print(canonical(dict(status=result['status'],counts=result['counts'],all_comparison_gates_pass=True,
                         qualification_passes_added=0)))


if __name__=='__main__':
    try:main()
    except Exception as error:
        print(canonical(dict(status='FAILED',failure_sha256=hashlib.sha256(str(error).encode()).hexdigest())),file=sys.stderr)
        raise SystemExit(1)
