"""Original full-denominator fixtures for the Max/native comparison boundary."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parent


class ComparisonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path=ROOT/'compare.py'
        if not path.exists():raise AssertionError('Arithmetic comparison is not implemented')
        spec=importlib.util.spec_from_file_location('arithmetic_comparison',path)
        cls.subject=importlib.util.module_from_spec(spec);spec.loader.exec_module(cls.subject)

    def fixture(self):
        score=json.loads((ROOT/'score.json').read_text());native=[];journal=[];states=[];ledger=[]
        contexts={i:dict(document=doc,anchors={j:'root/test-'+str(j) for j in range(10)},
                         nodes={j:17 if j<7 else 5 for j in range(10)})
                  for i,doc in enumerate(('times','plus','minus'))}
        revisions={};request=0;event=0
        for step in score:
            doc=step['document'];slot=next(i for i,c in contexts.items() if c['document']==doc)
            action=step['action'];request+=1
            if action=='install':revisions[doc]=step['revision']
            op=dict(step,request_id=request,action_revision=revisions[doc],checkpoint_request_ids=[])
            base=dict(request_id=request,step_id=step['step_id'],action=action,action_document=doc,
                      action_revision=revisions[doc],document=doc,revision=revisions[doc],source_sha256=step['source_sha256'])
            traces=[]
            if action=='event':
                journal.append(dict(base,kind='stimulus',anchor=step['anchor'],message=step['message']))
                # Distinct synthetic outputs total 141. This layer consumes a separately verified native score.
                for index in range(3 if event<9 else 2):
                    typed=dict(selector='float',atoms=[dict(tag='float',value=event+index+0.125)])
                    traces.append(dict(document=slot,node=index,phase='output',port=0,
                                       message=dict(typed,raw_selector='')))
                    journal.append(dict(base,kind='receipt',anchor=contexts[slot]['anchors'][index],port=0,
                                        synchronous_dispatch_active=True,message=copy.deepcopy(typed)))
                event+=1
            journal.append(dict(base,kind='step-complete',**({'closed_owner_absence_validated':True} if action=='close' else {})))
            snapshots=[]
            if action!='close':
                nodes=[dict(id=i,value=i+0.125) for i in range(10)]
                snapshots=[dict(document=slot,revision=revisions[doc],nodes=nodes)]
                request+=1;op['checkpoint_request_ids']=[request]
                states.append(dict(base,request_id=request,operation_request_id=base['request_id'],
                                   numeric_states=[dict(anchor=contexts[slot]['anchors'][i],value=i+0.125,
                                                        semantic_tag='float') for i in range(7)]))
            native.append(dict(step_id=step['step_id'],trace=traces,snapshots=snapshots))
            ledger.append(op)
        for seq,row in enumerate(journal,1):row['seq']=seq
        return score,native,journal,states,contexts,ledger

    def compare(self,data):
        return self.subject.compare_operations(*data)

    def test_complete_values_tags_and_empty_checkpoints_match(self):
        result=self.compare(self.fixture())
        self.assertEqual(result['counts']['outputs'],141)
        self.assertEqual(result['counts']['numeric_states'],504)
        self.assertEqual(result['counts']['empty_checkpoints'],6)
        self.assertEqual(len(result['checkpoints']),78)
        self.assertNotIn('value',json.dumps(result))
        self.assertFalse(result['saved_order_observed'])

    def test_observer_callback_order_is_not_claimed_as_saved_order(self):
        data=self.fixture();journal=data[2]
        indices=[i for i,row in enumerate(journal) if row.get('kind')=='receipt' and row['step_id']=='times-A01']
        selected=[journal[i] for i in indices]
        for i,row in zip(indices,reversed(selected)):journal[i]=row
        for seq,row in enumerate(journal,1):row['seq']=seq
        self.assertEqual(self.compare(data)['counts']['outputs'],141)

    def test_count_preserving_wrong_scalar_and_type_fail(self):
        for change in ('value','tag','selector','port','anchor','revision','source_sha256','request_id','synchronous_dispatch_active'):
            data=self.fixture();row=next(r for r in data[2] if r['kind']=='receipt')
            if change=='value':row['message']['atoms'][0]['value']+=1
            elif change=='tag':row['message']['atoms'][0]['tag']='int'
            elif change=='selector':row['message']['selector']='int'
            else:row[change]={'port':1,'anchor':'root/other','revision':2,'source_sha256':'f'*64,
                             'request_id':999,'synchronous_dispatch_active':False}[change]
            with self.subTest(change=change),self.assertRaises(ValueError):self.compare(data)

    def test_every_numeric_state_and_owner_binding_is_required(self):
        for change in ('value','anchor','revision','missing'):
            data=self.fixture();state=data[3][31]
            if change=='value':state['numeric_states'][3]['value']+=1
            elif change=='anchor':state['numeric_states'][3]['anchor']='root/other'
            elif change=='revision':state['revision']=2
            else:state['numeric_states'].pop()
            with self.subTest(change=change),self.assertRaises(ValueError):self.compare(data)

    def test_unscored_receipts_missing_operation_and_duplicate_stimulus_fail(self):
        for change in ('extra','missing','stimulus','empty'):
            data=self.fixture()
            if change=='extra':data[2].append(dict(data[2][1],request_id=999))
            elif change=='missing':data[1].pop()
            elif change=='stimulus':data[2].insert(2,copy.deepcopy(next(r for r in data[2] if r['kind']=='stimulus')))
            else:data[3].append(dict(data[3][0],operation_request_id=data[5][-1]['request_id']))
            for seq,row in enumerate(data[2],1):row['seq']=seq
            with self.subTest(change=change),self.assertRaises(ValueError):self.compare(data)

    def test_private_readback_pairing_refuses_extra_or_reused_states(self):
        states=self.fixture()[3]
        requests=[dict(request_id=state['request_id']) for state in states]
        self.assertEqual(len(self.subject.pair_readbacks(requests,states)),72)
        for changed in (states+[states[0]],states[:-1],states[:-1]+[states[0]]):
            with self.subTest(length=len(changed)),self.assertRaises(ValueError):
                self.subject.pair_readbacks(requests,changed)

    def test_native_evidence_requires_private_regular_external_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);root.chmod(0o700)
            for name in ('binding.json','expectations.json','native.jsonl','stderr.txt','transport.txt'):
                (root/name).write_bytes(b'original synthetic evidence');(root/name).chmod(0o600)
            self.assertEqual(len(self.subject.read_native_private(root)),5)
            (root/'native.jsonl').chmod(0o644)
            with self.assertRaises(ValueError):self.subject.read_native_private(root)
            (root/'native.jsonl').chmod(0o600)
            target=root/'native-target';os.rename(root/'native.jsonl',target)
            (root/'native.jsonl').symlink_to(target)
            with self.assertRaises(ValueError):self.subject.read_native_private(root)
            (root/'native.jsonl').unlink();os.rename(target,root/'native.jsonl')
            root.chmod(0o755)
            with self.assertRaises(ValueError):self.subject.read_native_private(root)

    def test_each_close_proof_is_bound_to_its_scored_request(self):
        ledger=self.fixture()[5]
        proofs=[dict(document=op['document'],revision=op['action_revision'],source_sha256=op['source_sha256'],
                     request_id=op['request_id'],step_id=op['step_id']) for op in ledger if op['action']=='close']
        self.subject.bind_close_proofs(ledger,proofs)
        for key,value in [('request_id',999),('document','other'),('revision',9),('source_sha256','f'*64)]:
            changed=copy.deepcopy(proofs);changed[0][key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):self.subject.bind_close_proofs(ledger,changed)
        with self.assertRaises(ValueError):self.subject.bind_close_proofs(ledger,proofs+[proofs[0]])

    def test_boolean_sequence_and_owner_revisions_refuse(self):
        for target,key in [('journal','seq'),('journal','revision'),('ledger','action_revision'),('state','revision')]:
            data=self.fixture();row={'journal':data[2][0],'ledger':data[5][0],'state':data[3][0]}[target]
            row[key]=True
            with self.subTest(target=target,key=key),self.assertRaises(ValueError):self.compare(data)


if __name__=='__main__':unittest.main()
