#!/usr/bin/env python3
"""Original finite numeric comparison fixtures; no installed source or runtime."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


PREFIX = 'root/obj-2/'
MAIN = {8,9,10,11,13,14,16,17,18,19,20,21,22,24,25,27,28,30,32,43,47}
BUS = {1,2,4,6,7,34,36,41,42,44,45,46,48}
FLOAT_EVENTS = {2,5,6,7,*range(19,29),31,32,34,35,38,40,43,44,45,46}
SOURCES = {'int':'a'*64, 'float':'b'*64}
UI = {'obj-16','obj-17','obj-18','obj-20','obj-21','obj-33'}
NODES = {'obj-28','obj-35','obj-9','obj-16','obj-17','obj-18','obj-20',
         'obj-21','obj-22','obj-24','obj-29','obj-30','obj-32','obj-33'}
HELPER_HASHES = {
    'helpstarter.js':'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8',
    'helpname.js':'49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa',
    'helpdetails.js':'31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1',
    'helpargs.js':'04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'}


def scalar(tag, value):
    return dict(selector=tag, atoms=[dict(tag=tag,value=value)])


def bang():
    return dict(selector='bang',atoms=[])


def score_fixture():
    score=[]
    def lifecycle(label,action,document,revision=None):
        row=dict(step_id=label,action=action,document=document,source_sha256=SOURCES[document])
        if revision is not None:row['revision']=revision
        score.append(row)
    lifecycle('install-int','install','int',1)
    for number in range(1,49):
        if number==2:lifecycle('install-float','install','float',1)
        if number==41:lifecycle('close-float','close','float')
        if number==42:lifecycle('reinstall-float','install','float',2)
        if number==45:lifecycle('close-int','close','int')
        if number==46:lifecycle('reinstall-int','install','int',2)
        document='float' if number in FLOAT_EVENTS else 'int'
        message=scalar('float',2.0) if number in (5,15,18) else bang()
        score.append(dict(step_id=f'E{number:02}',action='event',document=document,
            source_sha256=SOURCES[document],anchor=PREFIX+'obj-29',inlet=0,message=message))
    return score


def fixture():
    score=score_fixture();live={};revision={};states={};rows=[];receipts=[];checkpoints=[]
    ledger=[];requests=[];witnesses=[];command=0;seq=0
    custom=dict(selector='symbol-sha256:'+'c'*64,atoms=[dict(tag='symbol',value='symbol-sha256:'+'d'*64)])
    prototypes=[dict(document=d,source_sha256=SOURCES[d],anchor=PREFIX+'obj-29',
                     text_sha256='e'*64,text_characters=12) for d in SOURCES]
    def initial(document):
        anchors=NODES|({'obj-19','obj-23'} if document=='float' else set())
        nodes=[]
        for short in sorted(anchors):
            node=dict(anchor=PREFIX+short,kind=0,value=0,pulses=0,last_message=bang())
            if short in UI:node['kind']=18 if short in ('obj-18','obj-20') else (17 if document=='float' else 52)
            if short=='obj-29':
                node.update(kind=53,message_box=dict(empty=False,generation=0,prototype=custom,
                    arguments=bang(),placeholders=[False]))
            nodes.append(node)
        return dict(document=document,revision=revision[document],text_edit_serial=0,console_dropped=0,nodes=nodes)
    for step in score:
        document=step['document'];action=step['action'];command+=1;opid=command
        if action=='install':
            revision[document]=step['revision'];live[document]=revision[document];states[document]=initial(document)
        elif action=='close':del live[document];del states[document]
        operation=dict(request_id=opid,step_id=step['step_id'],action=action,document=document,
            source_sha256=SOURCES[document],action_revision=revision[document],live_owners=dict(live),
            checkpoint_request_ids=[],working_paths={d:f'Z:/private/{d}-r{r}.maxhelp' for d,r in live.items()})
        trace=[]
        def record(kind,emitter=document,anchor=None,message=None,port=0):
            nonlocal seq
            seq+=1
            row=dict(seq=seq,request_id=opid,step_id=step['step_id'],action=action,
                action_document=document,action_revision=revision[document],document=emitter,
                revision=revision[emitter],source_sha256=SOURCES[emitter],kind=kind)
            if anchor is not None:row.update(anchor=anchor,port=port,message=copy.deepcopy(message))
            if kind=='receipt':row['synchronous_dispatch_active']=True
            if action=='close':row['closed_owner_absence_validated']=True
            receipts.append(row)
            return row
        if action=='event':
            record('stimulus',anchor=step['anchor'],message=step['message'])
            trace.append(dict(ordinal=0,document=document,anchor=step['anchor'],phase='input',port=0,message=step['message']))
            number=int(step['step_id'][1:])
            outputs=[]
            if number in BUS:
                outputs.append((document,'obj-29',custom))
                outputs.extend((d,'obj-32',scalar(document,0)) for d in live)
                outputs.extend((d,'obj-33',scalar(d,0)) for d in live)
            elif number in MAIN:
                outputs=[(document,'obj-21',scalar(document,0)),(document,'obj-24',bang())]
            else:outputs=[(document,'obj-35',bang())]
            destination=[]
            for emitter,short,message in outputs:
                if short in ('obj-21','obj-24'):
                    trace.append(dict(ordinal=len(trace),document=emitter,anchor=PREFIX+short,phase='input',port=0,
                        message=scalar(document,0)))
                trace.append(dict(ordinal=len(trace),document=emitter,anchor=PREFIX+short,phase='output',port=0,message=message))
                row=record('receipt',emitter,PREFIX+short,message)
                if short in ('obj-21','obj-24'):destination.append(row)
            if number in MAIN:
                witnesses.append(dict(step_id=step['step_id'],document=document,revision=revision[document],
                    request_id=opid,numeric_seq=destination[0]['seq'],button_seq=destination[1]['seq'],synchronous=True))
        complete=record('step-complete')
        for observed in live:
            command+=1;operation['checkpoint_request_ids'].append(command)
            request=dict(request_id=command,operation_request_id=opid,step_id=step['step_id'],action=action,
                action_document=document,action_revision=revision[document],document=observed,revision=revision[observed],
                source_sha256=SOURCES[observed],working_path=operation['working_paths'][observed],seq_before=seq,seq_after=seq,
                raw_sha256='f'*64,raw_bytes=256)
            requests.append(request)
            numeric=[]
            for short in sorted(UI):
                cls='slider' if short in ('obj-18','obj-20') else ('flonum' if observed=='float' else 'number')
                numeric.append(dict(anchor=PREFIX+short,class_name=cls,value=0,getter_method='getvalueof',
                    getter_representation='scalar-number',semantic_tag='float' if cls=='flonum' else 'int',
                    semantic_tag_basis={'flonum':'flonum-class','number':'number-class','slider':'source-integer-slider-mode'}[cls],
                    receipt_tag_observed=False))
            checkpoints.append({**{k:v for k,v in request.items() if k not in ('seq_before','seq_after')},
                'readback_method':'v8-numeric-getvalueof',
                'numeric_states':numeric,'message_states':[dict(anchor=PREFIX+'obj-29',text_sha256='e'*64,
                    text_characters=12,prototype_unchanged=True)],
                'retention':dict(method='runtime-object-and-endpoint-inventory',
                    original_basic_boxes_retained=21 if observed=='int' else 23,
                    original_basic_cables_retained=10 if observed=='int' else 12,
                    observer_leaf_cables_retained=20 if observed=='int' else 22,unexpected_basic_cables=0,
                    input_endpoint_multiset_verified=True,output_endpoint_multiset_verified=True,saved_order_observed=False)})
        rows.append(dict(step_id=step['step_id'],action=action,document=document,accepted=True,failed=False,
            templates_unchanged=True,trace_overflow=False,console=[],trace=trace,snapshots=copy.deepcopy(list(states.values()))))
        ledger.append(operation)
    metadata=[]
    for document in SOURCES:
        baseline=next(s for row in rows for s in row['snapshots'] if s['document']==document)
        anchors=[]
        for node in baseline['nodes']:
            short=node['anchor'].rsplit('/',1)[1]
            cls='slider' if short in ('obj-18','obj-20') else ('flonum' if document=='float' else 'number') if short in UI else 'message' if short=='obj-29' else 'newobj'
            anchors.append(dict(anchor=node['anchor'],maxclass=cls,runtime_class=cls,rect=[0,0,1,1],
                outlets=2 if short in UI-{'obj-18','obj-20'} else 1))
        count=len(anchors)
        for number in range(7):
            cls='comment' if number<5 else 'jsui'
            anchors.append(dict(anchor=PREFIX+f'obj-{101+number}',maxclass=cls,runtime_class=cls,
                                rect=[number+10,0,1,1],outlets=0 if cls=='comment' else 1))
        metadata.append(dict(document=document,source_sha256=SOURCES[document],bytes=100,
            full_box_count=25 if document=='int' else 27,basic_box_count=len(anchors),
            basic_cable_count=10 if document=='int' else 12,executable_count=count,
            observer_leaf_cables=sum(a['outlets'] for a in anchors),anchors=anchors))
    session=dict(schema_version=1,status='COMPLETE',complete=True,readback_method='v8-numeric-getvalueof',
        score_binding={},operation_ledger=ledger,readback_requests=requests,source_metadata=metadata,
        message_prototypes=prototypes,destination_order_witnesses=witnesses,saved_order_observed=False)
    for key in ('initial_message_prototypes_validated','initial_numeric_readback_validated','numeric_readback_validated',
                'numeric_getters_silent_validated','runtime_endpoint_readback_validated','typed_float_dispatch_validated',
                'synchronous_destination_outputs_validated'):session[key]=True
    native=dict(schema_version=1,status='NATIVE_SCORED_NOT_MAX_COMPARED',score_sha256='',binary_sha256='1'*64,
        source_identities=SOURCES.copy(),action_count=54,result_count=54,authoring_retained=True,
        all_runtime_gates_pass=True,complete_installed_help_qualification_passes_added=0,rows=rows,
        bundle_file_sha256={d:{name:'2'*64 for name in ('authoring.json','flat.json','import.json','native.json')} for d in SOURCES})
    cleanup=dict(preferences_unchanged=True,owned_capture_after=[],prefix_processes_after=[],marker_processes_after=[],
        prefix_removed=True,xvfb_exited=True,ordinary_quit_requested=False,display_only_attribution=False,
        source_preservation=[dict(document=d,revision=r,installed_unchanged=True,pristine_unchanged=True,working_unchanged=True)
                             for d in SOURCES for r in (1,2)],
        helper_preservation=[dict(name=n,sha256=sha,installed_unchanged=True,private_unchanged=True)
                             for n,sha in HELPER_HASHES.items()])
    return score,native,session,receipts,checkpoints,cleanup


def resequence(data):
    for seq,row in enumerate(data[3],1):row['seq']=seq
    for request in data[2]['readback_requests']:
        complete=next(r for r in data[3] if r['request_id']==request['operation_request_id'] and r['kind']=='step-complete')
        request.update(seq_before=complete['seq'],seq_after=complete['seq'])
    for witness in data[2]['destination_order_witnesses']:
        outputs=[r for r in data[3] if r['request_id']==witness['request_id'] and r['kind']=='receipt']
        witness['numeric_seq']=next(r['seq'] for r in outputs if r['anchor']==PREFIX+'obj-21')
        witness['button_seq']=next(r['seq'] for r in outputs if r['anchor']==PREFIX+'obj-24')


class NumericContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path=Path(__file__).with_name('compare-int-float.py')
        spec=importlib.util.spec_from_file_location('numeric_compare',path)
        cls.compare=importlib.util.module_from_spec(spec);spec.loader.exec_module(cls.compare)

    def validate(self,data):
        score,native,session,receipts,checkpoints,cleanup=data
        timeline=self.compare.model_timeline(score)
        self.compare.validate_native(score,native,timeline)
        self.compare.validate_reference(score,native,session,receipts,checkpoints,cleanup,timeline)
        return timeline

    def run_cli(self,data,binding_override=None,existing_output=False):
        score,native,session,receipts,checkpoints,cleanup=data
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);score_path=root/'score.json';score_path.write_text(json.dumps(score))
            digest=hashlib.sha256(score_path.read_bytes()).hexdigest()
            native['score_sha256']=digest
            session['score_binding']=dict(path='synthetic-score.json',sha256=digest,bytes=score_path.stat().st_size,operations=54)
            if binding_override is not None:session['score_binding'].update(binding_override)
            for name,value in (('native.json',native),('session.json',session),('display-states.json',checkpoints),('cleanup.json',cleanup)):
                (root/name).write_text(json.dumps(value))
            (root/'receipts.jsonl').write_text(''.join(json.dumps(r)+'\n' for r in receipts))
            output=root/'result.json'
            if existing_output:output.write_text(json.dumps(dict(sentinel='preserved')))
            result=subprocess.run([sys.executable,'-B',str(Path(__file__).with_name('compare-int-float.py')),
                '--native',str(root/'native.json'),'--score',str(score_path),'--reference',str(root),
                '--output',str(output)],capture_output=True,text=True)
            return result,json.loads(output.read_text()) if output.exists() else None

    def test_complete_lifecycle_fixture_has_exact_nonvacuous_counts(self):
        data=fixture();timeline=self.validate(data)
        self.assertEqual(len(timeline),54)
        self.assertEqual(sum(len(r['live_owners']) for r in timeline),102)
        result,value=self.run_cli(data)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual((value['checkpoint_count'],value['numeric_state_count'],value['message_prototype_count']), (102,612,102))
        self.assertEqual(len(value['destination_outputs']),21)
        self.assertTrue(value['all_endpoint_values_match'])
        self.assertTrue(value['all_numeric_states_match'])
        self.assertTrue(value['all_destination_outputs_ordered'])
        self.assertTrue(value['native_only_destination_inputs_ordered'])
        self.assertTrue(value['all_comparison_gates_pass'])
        self.assertFalse(value['saved_order_observed'])
        self.assertEqual(value['complete_installed_help_qualification_passes_added'],0)

    def test_coverage_and_method_refusals_happen_before_results(self):
        cases=[lambda d:d[0].pop(),lambda d:d[1]['rows'].reverse(),lambda d:d[4].pop(),
               lambda d:d[4].append(copy.deepcopy(d[4][0])),
               lambda d:d[4][0]['numeric_states'].pop(),lambda d:d[4][0].update(revision=2),
               lambda d:d[4][0].update(readback_method='private-serialization'),
               lambda d:d[2]['operation_ledger'][0].update(live_owners={}),
               lambda d:d[2]['readback_requests'][0].update(seq_after=999),
               lambda d:d[2]['operation_ledger'][0].update(request_id=True),
               lambda d:d[4][0].update(raw_sha256='bad'),lambda d:d[4][0].update(raw_bytes=True),
               lambda d:d[4][0].update(source_sha256='0'*64),
               lambda d:d[4][0]['numeric_states'][0].update(value=None),
               lambda d:d[4][0]['numeric_states'][0].update(value=True),
               lambda d:d[4][0]['numeric_states'][0].update(receipt_tag_observed=True),
               lambda d:d[4][0]['message_states'][0].update(text_sha256='0'*64),
               lambda d:d[4][0]['retention'].update(saved_order_observed=True),
               lambda d:d[4][0]['retention'].update(input_endpoint_multiset_verified=1),
               lambda d:d[5]['source_preservation'].pop(),
               lambda d:d[5]['source_preservation'][0].update(working_unchanged=1)]
        for index,change in enumerate(cases):
            with self.subTest(case=index):
                data=fixture();change(data)
                with self.assertRaises(ValueError):self.validate(data)
                result,value=self.run_cli(data)
                self.assertNotEqual(result.returncode,0)
                self.assertIsNone(value)

    def test_scalar_injection_stays_typed_and_actual_stimulus_is_bound(self):
        data=fixture();stimulus=next(r for r in data[3] if r['kind']=='stimulus')
        stimulus['message']=scalar('int',7)
        with self.assertRaisesRegex(ValueError,'stimulus'):self.validate(data)
        for gate in ('initial_message_prototypes_validated','initial_numeric_readback_validated','numeric_readback_validated',
                     'typed_float_dispatch_validated','numeric_getters_silent_validated','runtime_endpoint_readback_validated'):
            for value in (None,False,1,'true'):
                data=fixture();data[2][gate]=value
                with self.assertRaisesRegex(ValueError,'capability'):self.validate(data)

    def test_custom_message_outputs_are_hashed_and_included_in_endpoint_coverage(self):
        data=fixture();self.validate(data)
        outputs=[r for r in data[3] if r['kind']=='receipt' and r['anchor']==PREFIX+'obj-29']
        self.assertEqual(len(outputs),13)
        data[3].remove(outputs[0])
        resequence(data)
        result,value=self.run_cli(data)
        self.assertEqual(result.returncode,1)
        self.assertFalse(value['all_endpoint_values_match'])
        data=fixture();output=next(r for r in data[3] if r['kind']=='receipt' and r['anchor']==PREFIX+'obj-29')
        output['message']['atoms'][0]['value']='unredacted-original-fixture'
        with self.assertRaisesRegex(ValueError,'message|symbol'):self.validate(data)

    def test_matching_endpoint_streams_cannot_hide_reversed_destination_outputs(self):
        data=fixture();rows=[r for r in data[3] if r['step_id']=='E08' and r['kind']=='receipt']
        rows[0]['anchor'],rows[1]['anchor']=rows[1]['anchor'],rows[0]['anchor']
        rows[0]['message'],rows[1]['message']=rows[1]['message'],rows[0]['message']
        witness=next(r for r in data[2]['destination_order_witnesses'] if r['step_id']=='E08')
        witness['numeric_seq'],witness['button_seq']=witness['button_seq'],witness['numeric_seq']
        result,value=self.run_cli(data)
        self.assertEqual(result.returncode,1,result.stderr)
        self.assertTrue(value['all_endpoint_values_match'])
        self.assertFalse(value['all_destination_outputs_ordered'])

    def test_destination_inputs_are_numeric_before_button_output_conversion(self):
        for document,value in (('int',0),('int',-3),('float',0.0),('float',-3.75)):
            with self.subTest(document=document,value=value):
                numeric=dict(document=document,anchor=PREFIX+'obj-21',phase='input',port=0,
                    ordinal=1,message=scalar(document,value))
                button=dict(document=document,anchor=PREFIX+'obj-24',phase='input',port=0,
                    ordinal=3,message=scalar(document,value))
                self.assertTrue(self.compare.destination_pair([numeric,button],document,'input','ordinal'))
                if document=='float' and value==0:
                    button['message']=scalar('float',-0.0)
                    self.assertFalse(self.compare.destination_pair([numeric,button],document,'input','ordinal'))
                button['message']=bang()
                self.assertFalse(self.compare.destination_pair([numeric,button],document,'input','ordinal'))
                for phase,ordinal in (('output','ordinal'),('receipt','seq')):
                    for row in (numeric,button):row.update(phase=phase,**{ordinal:row['ordinal']})
                    self.assertTrue(self.compare.destination_pair([numeric,button],document,phase,ordinal))
                    button['message']=scalar(document,value)
                    self.assertFalse(self.compare.destination_pair([numeric,button],document,phase,ordinal))
                    button['message']=bang()

    def test_destination_input_faults_fail_without_weakening_other_gates(self):
        def reverse_order(trace,numeric,button):
            first,last=trace.index(numeric),trace.index(button)
            trace[first],trace[last]=trace[last],trace[first]
        changes=[
            ('duplicate-numeric',lambda trace,n,b:trace.append(copy.deepcopy(n))),
            ('duplicate-button',lambda trace,n,b:trace.append(copy.deepcopy(b))),
            ('missing-numeric',lambda trace,n,b:trace.remove(n)),
            ('missing-button',lambda trace,n,b:trace.remove(b)),
            ('reverse-order',reverse_order),
            ('wrong-value',lambda trace,n,b:b.update(message=scalar(n['document'],-7))),
            ('wrong-selector',lambda trace,n,b:b['message'].update(selector='list')),
            ('wrong-mode',lambda trace,n,b:b.update(message=scalar('float' if n['document']=='int' else 'int',0))),
            ('wrong-numeric-mode',lambda trace,n,b:n.update(message=scalar('float' if n['document']=='int' else 'int',0))),
            ('wrong-numeric-destination',lambda trace,n,b:n.update(anchor=PREFIX+'obj-35')),
            ('wrong-button-destination',lambda trace,n,b:b.update(anchor=PREFIX+'obj-35')),
            ('wrong-document',lambda trace,n,b:b.update(document='float' if n['document']=='int' else 'int')),
            ('wrong-numeric-port',lambda trace,n,b:n.update(port=1)),
            ('wrong-button-port',lambda trace,n,b:b.update(port=1)),
            ('button-bang',lambda trace,n,b:b.update(message=bang())),
        ]
        for label in ('E08','E19'):
            for name,change in changes:
                with self.subTest(step=label,change=name):
                    data=fixture();trace=next(r['trace'] for r in data[1]['rows'] if r['step_id']==label)
                    numeric=next(r for r in trace if r['phase']=='input' and r['anchor']==PREFIX+'obj-21')
                    button=next(r for r in trace if r['phase']=='input' and r['anchor']==PREFIX+'obj-24')
                    change(trace,numeric,button)
                    for ordinal,row in enumerate(trace):row['ordinal']=ordinal
                    result,value=self.run_cli(data)
                    self.assertEqual(result.returncode,1,result.stderr)
                    self.assertTrue(value['all_endpoint_values_match'])
                    self.assertTrue(value['all_numeric_states_match'])
                    self.assertTrue(value['all_message_prototypes_unchanged'])
                    self.assertTrue(value['all_destination_outputs_ordered'])
                    self.assertFalse(value['native_only_destination_inputs_ordered'])
                    self.assertFalse(value['all_comparison_gates_pass'])

    def test_destination_input_messages_remain_strictly_validated(self):
        for label in ('E08','E19'):
            for change in (lambda message:message['atoms'][0].update(tag='unknown-number'),
                           lambda message:message['atoms'][0].update(value=float('inf')),
                           lambda message:message['atoms'][0].update(value=True)):
                with self.subTest(step=label,change=change):
                    data=fixture();trace=next(r['trace'] for r in data[1]['rows'] if r['step_id']==label)
                    button=next(r for r in trace if r['phase']=='input' and r['anchor']==PREFIX+'obj-24')
                    change(button['message'])
                    with self.assertRaisesRegex(ValueError,'message|Scalar'):self.validate(data)

    def test_native_destination_output_order_and_bang_remain_required(self):
        for label in ('E08','E19'):
            for numeric_button in (False,True):
                with self.subTest(step=label,numeric_button=numeric_button):
                    data=fixture();trace=next(r['trace'] for r in data[1]['rows'] if r['step_id']==label)
                    numeric=next(r for r in trace if r['phase']=='output' and r['anchor']==PREFIX+'obj-21')
                    button=next(r for r in trace if r['phase']=='output' and r['anchor']==PREFIX+'obj-24')
                    if numeric_button:button['message']=copy.deepcopy(numeric['message'])
                    else:
                        first,last=trace.index(numeric),trace.index(button)
                        trace[first],trace[last]=trace[last],trace[first]
                        for ordinal,row in enumerate(trace):row['ordinal']=ordinal
                    result,value=self.run_cli(data)
                    self.assertEqual(result.returncode,1,result.stderr)
                    self.assertTrue(value['native_only_destination_inputs_ordered'])
                    self.assertFalse(value['all_destination_outputs_ordered'])
                    self.assertFalse(value['all_comparison_gates_pass'])

    def test_unavailable_synchronous_capability_is_unknown_with_values_retained(self):
        data=fixture();data[2]['synchronous_destination_outputs_validated']=False
        data[2]['destination_order_witnesses']=[]
        result,value=self.run_cli(data)
        self.assertEqual(result.returncode,1,result.stderr)
        self.assertTrue(value['all_endpoint_values_match'])
        self.assertTrue(value['all_numeric_states_match'])
        self.assertIsNone(value['all_destination_outputs_ordered'])

    def test_value_mismatch_and_typed_output_mismatch_are_reported_separately(self):
        data=fixture();data[4][0]['numeric_states'][0]['value']=9
        result,value=self.run_cli(data)
        self.assertEqual(result.returncode,1,result.stderr)
        self.assertFalse(value['all_numeric_states_match'])
        self.assertTrue(value['all_endpoint_values_match'])
        data=fixture();output=next(r for r in data[3] if r['step_id']=='E08' and r['kind']=='receipt')
        output['message']=scalar('float',0.0)
        result,value=self.run_cli(data)
        self.assertEqual(result.returncode,1,result.stderr)
        self.assertFalse(value['all_endpoint_values_match'])

    def test_native_snapshot_types_and_reference_method_claims_are_strict(self):
        cases=[lambda d:d[1]['rows'][0]['snapshots'][0].update(text_edit_serial=False),
               lambda d:d[1]['rows'][0]['snapshots'][0]['nodes'][0].pop('last_message'),
               lambda d:d[1]['rows'][0]['snapshots'][0]['nodes'][0].update(kind=True),
               lambda d:d[1]['rows'][0]['snapshots'][0]['nodes'][0].update(kind=999),
               lambda d:d[4][0].update(snapshot_sha256='4'*64),
               lambda d:d[2]['operation_ledger'][0].update(serialized=True)]
        for index,change in enumerate(cases):
            with self.subTest(case=index):
                data=fixture();change(data)
                with self.assertRaises(ValueError):self.validate(data)

    def test_reference_actual_stimulus_preserves_float_zero_sign(self):
        data=fixture()
        step=next(s for s in data[0] if s['step_id']=='E05')
        step['message']['atoms'][0]['value']=0.0
        stimulus=next(r for r in data[3] if r['step_id']=='E05' and r['kind']=='stimulus')
        stimulus['message']['atoms'][0]['value']=-0.0
        with self.assertRaisesRegex(ValueError,'stimulus'):self.validate(data)

    def test_named_receiver_interdocument_order_is_not_a_comparison_requirement(self):
        data=fixture()
        receivers=[r for r in data[3] if r['step_id']=='E02' and r.get('anchor')==PREFIX+'obj-32']
        first,second=copy.deepcopy(receivers[0]),copy.deepcopy(receivers[1])
        first['seq'],second['seq']=second['seq'],first['seq']
        receivers[0].clear();receivers[0].update(second)
        receivers[1].clear();receivers[1].update(first)
        result,value=self.run_cli(data)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertTrue(value['all_endpoint_values_match'])
        self.assertTrue(value['all_destination_outputs_ordered'])

    def test_private_helper_copies_require_exact_boolean_preservation_and_source_hashes(self):
        for value in ('missing',False,None,1,'true'):
            data=fixture();helper=data[5]['helper_preservation'][0]
            if value=='missing':helper.pop('private_unchanged')
            else:helper['private_unchanged']=value
            with self.subTest(value=value):
                with self.assertRaisesRegex(ValueError,'helper'):self.validate(data)
        data=fixture();data[5]['helper_preservation'][0]['sha256']='0'*64
        with self.assertRaisesRegex(ValueError,'helper'):self.validate(data)

    def test_producer_retained_raw_binding_matches_checkpoint_and_request_record(self):
        path=Path(__file__).parents[1]/'int-float-runtime-20261022/numeric.py'
        spec=importlib.util.spec_from_file_location('numeric_producer_for_contract',path)
        producer=importlib.util.module_from_spec(spec);spec.loader.exec_module(producer)
        data=fixture()
        with tempfile.TemporaryDirectory() as directory:
            binding=producer.retain_raw(Path(directory)/'synthetic-observation.json',b'{"synthetic":true}\n')
        data[4][0].update(binding);data[2]['readback_requests'][0].update(binding)
        self.validate(data)
        data[2]['readback_requests'][0]['raw_sha256']='0'*64
        with self.assertRaisesRegex(ValueError,'request'):self.validate(data)

    def test_missing_public_journal_row_cannot_hide_behind_increasing_sequence(self):
        data=fixture()
        data[3].pop(next(i for i,r in enumerate(data[3]) if r['kind']=='receipt' and r['anchor']==PREFIX+'obj-29'))
        with self.assertRaisesRegex(ValueError,'sequence'):self.validate(data)

    def test_cli_binds_exact_score_bytes_and_refuses_overwrite(self):
        for override in (dict(sha256='0'*64),dict(bytes=True),dict(operations='54'),dict(path='')):
            with self.subTest(override=override):
                result,value=self.run_cli(fixture(),binding_override=override)
                self.assertNotEqual(result.returncode,0)
                self.assertIsNone(value)
                self.assertIn('Score artifact',result.stderr)
        result,value=self.run_cli(fixture(),existing_output=True)
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(value,dict(sentinel='preserved'))
        self.assertIn('FileExistsError',result.stderr)

    def test_close_reopen_and_order_witness_fail_closed(self):
        cases=[lambda d:d[2]['destination_order_witnesses'].pop(),
               lambda d:d[2]['destination_order_witnesses'][0].update(synchronous=1),
               lambda d:d[2]['destination_order_witnesses'][0].update(numeric_seq=999),
               lambda d:d[2].update(synchronous_destination_outputs_validated=1),
               lambda d:d[2]['source_metadata'][0]['anchors'].pop(),
               lambda d:d[2]['operation_ledger'][45]['working_paths'].update(float='Z:/private/int-r1.maxhelp')]
        for index,change in enumerate(cases):
            with self.subTest(case=index):
                data=fixture();change(data)
                with self.assertRaises(ValueError):self.validate(data)
        data=fixture()
        complete=next(r for r in data[3] if r['step_id']=='close-float')
        complete['closed_owner_absence_validated']=False
        with self.assertRaisesRegex(ValueError,'close'):self.validate(data)
        data=fixture()
        receiver=next(r for r in data[3] if r['step_id']=='E42' and r.get('document')=='float')
        receiver['revision']=1
        with self.assertRaisesRegex(ValueError,'stale'):self.validate(data)


if __name__=='__main__':unittest.main()
