"""Original synthetic numeric capture validation tests; no installed sources."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('numeric', ROOT/'numeric.py')
n = importlib.util.module_from_spec(spec)
if spec.loader and (ROOT/'numeric.py').exists(): spec.loader.exec_module(n)


def fixture():
    boxes = [dict(id='obj-1',anchor='root/obj-2/obj-1',maxclass='number',runtime_class='number',
                  rect=[1,2,30,20],outlets=2,authored_text=''),
             dict(id='obj-3',anchor='root/obj-2/obj-3',maxclass='message',runtime_class='message',
                  rect=[50,2,30,20],outlets=1,authored_text='private fixture')]
    d = dict(document='int',source_sha256='a'*64,revision=1,working_windows_path='Z:/private/int-r1.maxhelp',
             boxes=boxes,saved_edges=[dict(source=['obj-1',0],destination=['obj-3',0])])
    d['observer_leaves'] = n.observer_definitions(d)
    originals = [dict(varname=n.original_varname(b),maxclass=b['maxclass'],rect=b['rect']) for b in boxes]
    leaves = [dict(varname=l['varname'],maxclass='js',rect=[-100,0,10,10]) for l in d['observer_leaves']]
    routes=[dict(source=dict(varname=n.original_varname(boxes[0]),port=0),
                 destination=dict(varname=n.original_varname(boxes[1]),port=0))]
    for l in d['observer_leaves']:
        b=next(b for b in boxes if b['anchor']==l['anchor'])
        routes.append(dict(source=dict(varname=n.original_varname(b),port=l['port']),
                           destination=dict(varname=l['varname'],port=0)))
    raw=dict(success=True,readback_method='v8-numeric-getvalueof',request_id=3,step_id='install-int',action='install',
             document='int',source_sha256='a'*64,revision=1,working_root_path=d['working_windows_path'],
             root_is_top_level=True,saved_order_observed=False,boxes=originals+leaves,
             input_routes=routes,output_routes=copy.deepcopy(routes),
             messages=[dict(anchor=boxes[1]['anchor'],text='private fixture')],
             numeric=[dict(anchor=boxes[0]['anchor'],class_name='number',value=0,
                           getter_representation='scalar-number',getter_method='getvalueof',
                           semantic_tag='int',semantic_tag_basis='number-class')])
    return d,raw


class NumericTests(unittest.TestCase):
    def test_exact_timeline_has_delayed_install_and_revision_live_sets(self):
        score=n.load_score(); matrix=n.timeline(score)
        self.assertEqual(len(matrix),54)
        self.assertEqual(matrix[1]['live_owners'],{'int':1})
        self.assertEqual(matrix[2]['live_owners'],{'int':1,'float':1})
        self.assertEqual(next(r for r in matrix if r['step_id']=='close-float')['live_owners'],{'int':1})
        self.assertEqual(matrix[-1]['live_owners'],{'float':2,'int':2})
        for change in [('revision',True),('revision',0)]:
            bad=copy.deepcopy(score);bad[0][change[0]]=change[1]
            with self.assertRaises(ValueError):n.timeline(bad)

    def test_strict_numeric_messages(self):
        self.assertEqual(n.validate_message(dict(selector='float',atoms=[dict(tag='float',value=0.0)]))['atoms'][0]['tag'],'float')
        for m in [dict(selector='float',atoms=[dict(tag='int',value=7)]),
                  dict(selector='int',atoms=[dict(tag='int',value=True)]),
                  dict(selector='int',atoms=[dict(tag='int',value=1.5)]),
                  dict(selector='float',atoms=[dict(tag='float',value=float('nan'))]),
                  dict(selector='bang',atoms=[dict(tag='int',value=0)])]:
            with self.assertRaises(ValueError):n.validate_message(m)

    def test_checkpoint_full_retention_and_numeric_redaction(self):
        d,raw=fixture(); got=n.validate_checkpoint(d,raw,3,'install-int','install')
        self.assertEqual(got['numeric_states'][0]['value'],0)
        self.assertEqual(got['retention']['observer_leaf_cables_retained'],3)
        self.assertTrue(got['message_states'][0]['prototype_unchanged'])
        self.assertNotIn('private fixture',json.dumps(got))

    def test_refuses_identity_geometry_missing_duplicate_routes_and_changed_prototype(self):
        d,raw=fixture()
        mutations=[lambda r:r.update(revision=2),lambda r:r.update(request_id=True),
                   lambda r:r['boxes'][0]['rect'].__setitem__(2,31),
                   lambda r:r['input_routes'].append(r['input_routes'][0]),
                   lambda r:r['output_routes'].pop(),lambda r:r['boxes'].pop(),
                   lambda r:r['messages'][0].update(text='changed')]
        for mutate in mutations:
            bad=copy.deepcopy(raw);mutate(bad)
            with self.assertRaises(ValueError):n.validate_checkpoint(d,bad,3,'install-int','install')

    def test_refuses_coerced_missing_boolean_nonfinite_getters(self):
        d,raw=fixture()
        for value in [None,True,'0',float('inf'),[],[0,1]]:
            bad=copy.deepcopy(raw);bad['numeric'][0]['value']=value
            with self.assertRaises(ValueError):n.validate_checkpoint(d,bad,3,'install-int','install')
        bad=copy.deepcopy(raw);bad['numeric']=[]
        with self.assertRaises(ValueError):n.validate_checkpoint(d,bad,3,'install-int','install')

    def test_live_checkpoint_inventory_is_nonvacuous(self):
        d,raw=fixture(); row=n.validate_checkpoint(d,raw,3,'install-int','install')
        op=dict(step_id='install-int',action='install',document='int',live_owners={'int':1})
        n.validate_live_checkpoints(op,[row])
        for values in [[],[row,row],[dict(row,document='float')],[dict(row,revision=2)]]:
            with self.assertRaises(ValueError):n.validate_live_checkpoints(op,values)

    def test_raw_bytes_retained_exclusively(self):
        with tempfile.TemporaryDirectory() as tmp:
            data=b'{"original": 1}\n'; path=Path(tmp)/'raw.json'
            got=n.retain_raw(path,data)
            self.assertEqual(path.read_bytes(),data)
            self.assertEqual(path.stat().st_mode & 0o777,0o600)
            self.assertEqual(got['raw_bytes'],len(data))
            with self.assertRaises(FileExistsError):n.retain_raw(path,data)

    def test_custom_source_message_receipt_is_redacted_without_changing_dispatch(self):
        row=dict(kind='receipt',message=dict(selector='fixture-command',atoms=[dict(tag='symbol',value='fixture-name')]))
        got=n.public_receipt(row)
        self.assertTrue(got['message']['selector'].startswith('symbol-sha256:'))
        self.assertTrue(got['message']['atoms'][0]['value'].startswith('symbol-sha256:'))
        self.assertNotIn('fixture-command',json.dumps(got))
        self.assertNotIn('fixture-name',json.dumps(got))
        with self.assertRaises(ValueError):n.validate_message(row['message'])

    def test_numeric_state_tracks_real_ui_outputs_and_silence(self):
        d,raw=fixture();checkpoint=n.validate_checkpoint(d,raw,3,'install-int','install')
        prior={};n.validate_numeric_progress(d,checkpoint,[],prior,initial=True)
        checkpoint['numeric_states'][0]['value']=7
        receipt=dict(kind='receipt',document='int',revision=1,anchor=d['boxes'][0]['anchor'],port=0,
                     message=dict(selector='int',atoms=[dict(tag='int',value=7)]))
        n.validate_numeric_progress(d,checkpoint,[receipt],prior)
        checkpoint['numeric_states'][0]['value']=9
        with self.assertRaises(ValueError):n.validate_numeric_progress(d,checkpoint,[],prior)

    def test_destination_witness_requires_actual_pair_in_synchronous_bracket(self):
        operation=dict(step_id='E08',document='int',action_revision=1,request_id=4)
        rows=[dict(kind='receipt',document='int',revision=1,request_id=4,step_id='E08',seq=i,
                   anchor='root/obj-2/'+anchor,port=0,synchronous_dispatch_active=True,message=message)
              for i,anchor,message in [(2,'obj-21',dict(selector='int',atoms=[dict(tag='int',value=0)])),
                                       (3,'obj-24',dict(selector='bang',atoms=[]))]]
        self.assertEqual(n.destination_witness(operation,rows)['numeric_seq'],2)
        with self.assertRaises(ValueError):n.destination_witness(operation,list(reversed([dict(rows[0],seq=3),dict(rows[1],seq=2)])))
        with self.assertRaises(ValueError):n.destination_witness(operation,rows[:1])
        with self.assertRaises(ValueError):n.destination_witness(operation,[dict(r,synchronous_dispatch_active=False) for r in rows])

    def test_finite_runtime_aliases_do_not_admit_arbitrary_classes(self):
        for token,canonical in [('i','int'),('f','float'),('r','receive'),('p','patcher')]:
            self.assertEqual(n.runtime_classes('newobj',token+' fixture')[0],canonical)
            self.assertIn(token,n.runtime_classes('newobj',token+' fixture'))
        self.assertEqual(n.runtime_classes('number',''),['number'])
        self.assertNotIn('newobj',n.runtime_classes('newobj','i 4'))

    def test_extract_validates_exact_retained_bytes_between_two_protection_checks(self):
        d,raw=fixture()
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'request.json';payload=(json.dumps(raw)+'\n').encode();path.write_bytes(payload)
            checks=[]
            with patch.object(n,'verify_private',side_effect=lambda p:checks.append(p)):
                result=n.extract_checkpoint(Path(tmp),d,path,3,'install-int','install')
            self.assertEqual(checks,[Path(tmp),Path(tmp)])
            self.assertEqual(result['raw_sha256'],__import__('hashlib').sha256(payload).hexdigest())
            self.assertEqual((Path(tmp)/'retained-request.json').read_bytes(),payload)

    def test_timeline_refuses_stale_revision_closed_event_and_unbound_fields(self):
        score=n.load_score()
        for mutate in [lambda s:s[2].update(revision=2),lambda s:s[1].update(document='float',source_sha256=n.IDENTITIES['float']),
                       lambda s:s[0].update(unbound='field'),lambda s:s[1].update(step_id='install-int'),
                       lambda s:s[0].update(source_sha256='0'*64)]:
            bad=copy.deepcopy(score);mutate(bad)
            with self.assertRaises(ValueError):n.timeline(bad)

    def test_public_receipts_refuse_coerced_numeric_atoms(self):
        for tag,value in [('int',True),('float','7'),('unknown-number',None),('symbol',7)]:
            with self.assertRaises(ValueError):
                n.public_receipt(dict(kind='receipt',message=dict(selector='fixture',atoms=[dict(tag=tag,value=value)])))

    def test_checkpoint_keeps_numeric_outlet_one_leaf_and_rejects_duplicate_numeric_anchor(self):
        d,raw=fixture()
        self.assertIn(1,[l['port'] for l in d['observer_leaves'] if l['anchor']==d['boxes'][0]['anchor']])
        raw['numeric'].append(copy.deepcopy(raw['numeric'][0]))
        with self.assertRaises(ValueError):n.validate_checkpoint(d,raw,3,'install-int','install')

    def test_failed_raw_observation_still_has_public_hash_and_after_protection_check(self):
        d,raw=fixture();raw['numeric'][0]['value']=None
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'bad.json';payload=json.dumps(raw).encode();path.write_bytes(payload);record={};checks=[]
            with patch.object(n,'verify_private',side_effect=lambda p:checks.append(p)):
                with self.assertRaises(ValueError):
                    n.extract_checkpoint(Path(tmp),d,path,3,'install-int','install',record)
            self.assertEqual(len(checks),2)
            self.assertEqual(record['raw_bytes'],len(payload))

    def test_public_preparation_manifest_binds_private_config_and_seal(self):
        with tempfile.TemporaryDirectory() as tmp:
            work=Path(tmp);(work/'config.json').write_text('{}');(work/'seal.json').write_text('{}')
            manifest=dict(private_work=str(work),private_config_sha256=n.digest(work/'config.json'),
                          private_seal_sha256=n.digest(work/'seal.json'),score_binding=n.score_binding())
            n.validate_preparation_manifest(work,manifest)
            (work/'seal.json').write_text('{"tampered":true}')
            with self.assertRaises(ValueError):n.validate_preparation_manifest(work,manifest)

    def test_public_ledger_projects_real_operations_to_declared_schema(self):
        expected={'request_id','step_id','action','document','source_sha256','action_revision','live_owners',
                  'checkpoint_request_ids','working_paths'}
        for operation in n.timeline(n.load_score()):
            operation.update(request_id=1,checkpoint_request_ids=[2],working_paths={'int':'Z:/private'})
            self.assertEqual(set(n.public_operation(operation)),expected)

    def test_shell_height_policy_is_exact_source_helper_anchor_and_route_bound(self):
        helpers=[dict(name=name,sha256=sha) for name,sha in n.SHELL_HELPERS.items()]
        for anchor,(cls,rect,text_sha) in n.SHELL_ANCHORS.items():
            b=dict(anchor=anchor,maxclass='newobj',runtime_class=cls,rect=rect,source_text_sha256=text_sha,
                   saved_incoming_routes=0,saved_outgoing_routes=0)
            policy=n.shell_height_policy('int',n.IDENTITIES['int'],b,helpers)
            self.assertEqual(policy['live_rect'],rect[:3]+[22])
            self.assertEqual(policy['helper_sha256'],n.SHELL_HELPERS)
            with self.assertRaises(ValueError):n.shell_height_policy('float',n.IDENTITIES['int'],b,helpers)
            self.assertIsNone(n.shell_height_policy('int',n.IDENTITIES['int'],dict(b,anchor='root/obj-2/obj-16'),helpers))
            for bad in [dict(b,saved_incoming_routes=1),dict(b,rect=rect[:3]+[21]),
                        dict(b,source_text_sha256='0'*64),dict(b,runtime_class='number')]:
                with self.assertRaises(ValueError):n.shell_height_policy('int',n.IDENTITIES['int'],bad,helpers)
            with self.assertRaises(ValueError):n.shell_height_policy('int',n.IDENTITIES['int'],b,helpers[:3])

    def test_basic_checkpoint_refuses_any_shell_policy_field(self):
        d,raw=fixture();d['boxes'][0]['shell_height_policy']={}
        with self.assertRaises(ValueError):n.validate_checkpoint(d,raw,3,'install-int','install')


if __name__=='__main__':unittest.main()
