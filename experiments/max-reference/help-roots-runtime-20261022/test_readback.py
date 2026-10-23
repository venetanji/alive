#!/usr/bin/env python3
"""Synthetic readback validation fixtures; no preparation or target execution."""
from copy import deepcopy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('help_runtime',ROOT/'help_runtime.py')
runtime=importlib.util.module_from_spec(spec);spec.loader.exec_module(runtime)


class ReadbackTests(unittest.TestCase):
    def fixture(self):
        boxes=[dict(id='obj-1',anchor='root/obj-5/obj-1',maxclass='number',runtime_class='number',
                    rect=[10,20,50,20],outlets=1,authored_empty=True,authored_text=''),
               dict(id='obj-2',anchor='root/obj-5/obj-2',maxclass='message',runtime_class='message',
                    rect=[90,20,80,20],outlets=1,authored_empty=False,authored_text='private-sentinel 7')]
        definition=dict(document='append',source_sha256='a'*64,working_windows_path='Z:/private/working/append.maxhelp',
                        boxes=boxes,saved_edges=[dict(source=['obj-1',0],destination=['obj-2',1],order=0)])
        leaves=[dict(varname='__alive_help_leaf_obj_1_0',anchor=boxes[0]['anchor'],port=0),
                dict(varname='__alive_help_leaf_obj_2_0',anchor=boxes[1]['anchor'],port=0)]
        definition['observer_leaves']=leaves
        observed=[dict(varname='__alive_help_'+box['id'].replace('-','_'),maxclass=box['runtime_class'],rect=box['rect']) for box in boxes]
        observed += [dict(varname=leaf['varname'],maxclass='js',rect=[-2000, -2000,100,20]) for leaf in leaves]
        def route(source,port,destination,inlet):
            return dict(source=dict(varname=source,port=port),destination=dict(varname=destination,port=inlet))
        routes=[route('__alive_help_obj_1',0,'__alive_help_obj_2',1),
                route('__alive_help_obj_1',0,leaves[0]['varname'],0),route('__alive_help_obj_2',0,leaves[1]['varname'],0)]
        raw=dict(success=True,readback_method='v8-boxtext',request_id=4,step_id='initial',document='append',
            source_sha256=definition['source_sha256'],working_root_path=definition['working_windows_path'],
            root_is_top_level=True,boxes=observed,messages=[dict(anchor=boxes[1]['anchor'],text='private-sentinel 7')],
            input_routes=deepcopy(routes),output_routes=deepcopy(routes),saved_order_observed=False)
        return definition,raw

    def validate(self,definition,raw,step='initial'):
        return runtime.validate_v8_readback(definition,raw,4,step)

    def test_message_state_method_does_not_relabel_serialization(self):
        value=runtime.public_message_state('',True,readback_method='v8-boxtext')
        self.assertEqual(value['status'],'observed-private-v8-boxtext')
        self.assertEqual(value['live_content'],dict(empty=True,message=None))
        self.assertIn('V8',value['rendering'])
        self.assertEqual(runtime.public_message_state('',True)['status'],'observed-private-serialization')
        self.assertEqual(runtime.public_message_state(None,True,readback_method='v8-boxtext')['status'],'unavailable')

    def test_valid_checkpoint_has_measured_endpoint_retention_and_redacts_text(self):
        definition,raw=self.fixture();value=self.validate(definition,raw)
        self.assertEqual(value['readback_method'],'v8-boxtext')
        self.assertEqual(value['retention'],dict(method='runtime-object-and-endpoint-inventory',
            original_basic_boxes_retained=2,original_basic_cables_retained=1,observer_leaf_cables_retained=2,
            unexpected_basic_cables=0,saved_order_observed=False))
        self.assertNotIn('private-sentinel',json.dumps(value))

    def test_missing_null_nonstring_message_cannot_become_empty(self):
        for text in [None,7,{},[]]:
            definition,raw=self.fixture();raw['messages'][0]['text']=text
            with self.subTest(text=text),self.assertRaises(ValueError):self.validate(definition,raw)
        definition,raw=self.fixture();del raw['messages'][0]['text']
        with self.assertRaises(ValueError):self.validate(definition,raw)
        definition,raw=self.fixture();definition['boxes'][1].update(authored_text='',authored_empty=True)
        raw['messages'][0]['text']='';self.assertTrue(self.validate(definition,raw)['states'][0]['live_content']['empty'])

    def test_initial_authored_equality_precedes_scoring(self):
        definition,raw=self.fixture();raw['messages'][0]['text']='changed-private-sentinel'
        with self.assertRaises(ValueError):self.validate(definition,raw)
        raw['step_id']='cold';value=self.validate(definition,raw,'cold')
        self.assertFalse(value['states'][0]['live_content']['empty'])

    def test_checkpoint_identity_and_original_box_inventory_fail_closed(self):
        for field,value in [('request_id',3),('step_id','wrong'),('document','prepend'),('source_sha256','b'*64),
                ('working_root_path','Z:/private/pristine/append.maxhelp'),('root_is_top_level',False),('saved_order_observed',True)]:
            definition,raw=self.fixture();raw[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):self.validate(definition,raw)
        for change in [dict(varname='wrong'),dict(maxclass='append'),dict(rect=[10,20,51,20])]:
            definition,raw=self.fixture();raw['boxes'][0].update(change)
            with self.subTest(change=change),self.assertRaises(ValueError):self.validate(definition,raw)
        definition,raw=self.fixture();raw['boxes'].append(deepcopy(raw['boxes'][0]))
        with self.assertRaises(ValueError):self.validate(definition,raw)
        definition,raw=self.fixture();raw['messages'][0]['anchor']='root/obj-5/obj-99'
        with self.assertRaises(ValueError):self.validate(definition,raw)

    def test_route_multisets_reject_missing_extra_duplicate_or_unexpected_leaf(self):
        for field in ['input_routes','output_routes']:
            for mutation in ['missing','duplicate','port','unexpected-leaf']:
                definition,raw=self.fixture()
                if mutation=='missing':raw[field].pop(0)
                elif mutation=='duplicate':raw[field].append(deepcopy(raw[field][0]))
                elif mutation=='port':raw[field][0]['destination']['port']=0
                else:raw[field][1]['destination']['varname']='__alive_help_leaf_unexpected'
                with self.subTest(field=field,mutation=mutation),self.assertRaises(ValueError):self.validate(definition,raw)
        definition,raw=self.fixture();definition['saved_edges'].append(deepcopy(definition['saved_edges'][0]))
        for field in ['input_routes','output_routes']:raw[field].append(deepcopy(raw[field][0]))
        self.assertEqual(self.validate(definition,raw)['retention']['original_basic_cables_retained'],2)
        for mutation in ['missing-leaf','extra-leaf','wrong-leaf-class','leaf-output']:
            definition,raw=self.fixture()
            if mutation=='missing-leaf':raw['boxes'].pop()
            elif mutation=='extra-leaf':raw['boxes'].append(dict(varname='__alive_help_leaf_unexpected',maxclass='js',rect=[0,0,1,1]))
            elif mutation=='wrong-leaf-class':raw['boxes'][-1]['maxclass']='v8'
            else:
                for field in ['input_routes','output_routes']:
                    raw[field].append(dict(source=dict(varname=definition['observer_leaves'][0]['varname'],port=0),
                                           destination=dict(varname='__alive_help_obj_2',port=0)))
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):self.validate(definition,raw)

    def test_readback_receipt_exposes_only_bound_request_identity(self):
        value=runtime.public_row(dict(seq=3,kind='readback-request',step_id='initial',document='append',
            value=dict(request_id=4,source_sha256='a'*64,text='private-sentinel',path='private-sentinel')))
        self.assertEqual(value['request_id'],4);self.assertEqual(value['source_sha256'],'a'*64)
        self.assertNotIn('private-sentinel',json.dumps(value))
        for identity in [dict(request_id=True,source_sha256='a'*64),dict(request_id=4,source_sha256='private-sentinel')]:
            with self.assertRaises(ValueError):runtime.public_row(dict(seq=3,kind='readback-request',value=identity))

    def test_only_approved_annotation_keeps_width_exception_without_leaf(self):
        definition,raw=self.fixture();policy=runtime.annotation_width_profile()
        definition['source_sha256']=policy['source_sha256'];raw['source_sha256']=policy['source_sha256']
        annotation=dict(id='obj-4',anchor=policy['anchor'],maxclass='jsui',runtime_class='jsui',rect=policy['saved_rect'],
            outlets=1,filename='helpargs.js',ignoreclick=1,annotation_width_policy=policy,
            observer_policy=policy['observer_policy'],authored_empty=True,authored_text='')
        definition['boxes'].append(annotation)
        raw['boxes'].append(dict(varname='__alive_help_obj_4',maxclass='jsui',rect=[130,195,257.9139709472656,39]))
        self.assertEqual(self.validate(definition,raw)['retention']['original_basic_boxes_retained'],3)
        raw['boxes'][-1]['rect'][3]=40
        with self.assertRaises(ValueError):self.validate(definition,raw)

    def test_private_observation_hash_and_source_bytes_are_checked(self):
        definition,raw=self.fixture()
        with tempfile.TemporaryDirectory() as directory:
            work=Path(directory);(work/'observations').mkdir()
            payload=b'synthetic pinned source'
            definition['source_sha256']=hashlib.sha256(payload).hexdigest();raw['source_sha256']=definition['source_sha256']
            for key in ['source_path','pristine_path','working_path']:
                target=work/(key+'.maxhelp');target.write_bytes(payload);definition[key]=str(target)
            path=work/'observations/append.json';path.write_text(json.dumps(raw))
            definition['readback_path']=str(path)
            config=dict(work=str(work),readback_method='v8-boxtext',documents=[definition])
            value=runtime.extract_v8_readback(config,'append',4,'initial')
            self.assertEqual(value['observation_sha256'],hashlib.sha256(path.read_bytes()).hexdigest())
            self.assertEqual(value['observation_bytes'],path.stat().st_size)
            retained=work/'observations/checkpoint-4-append.json'
            self.assertEqual(retained.read_bytes(),path.read_bytes())
            self.assertEqual(retained.stat().st_mode&0o777,0o600)
            Path(definition['working_path']).write_bytes(b'changed')
            with self.assertRaises(ValueError):runtime.extract_v8_readback(config,'append',4,'initial')

    def test_preparation_method_is_opt_in_with_private_sealed_reader_and_mailbox(self):
        for method in ['private-serialization','v8-boxtext']:
            with self.subTest(method=method),tempfile.TemporaryDirectory() as directory:
                base=Path(directory);harness=base/'harness';harness.mkdir()
                for name in ['controller.js','observer.js','v8-readback.js']:(harness/name).write_bytes((ROOT/name).read_bytes())
                definition,_=self.fixture();source=base/'synthetic.maxhelp';source.write_bytes(b'synthetic source fixture')
                definition.update(source_path=str(source),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest())
                with patch.object(runtime,'ROOT',harness),patch.object(runtime,'source_metadata',return_value=([],[definition])),\
                        patch.object(runtime,'helper_metadata',return_value=[]):
                    args={} if method=='private-serialization' else dict(readback_method=method)
                    config=runtime.prepare_private(base/'private',resources=base,**args)
                self.assertEqual(config['readback_method'],method)
                self.assertEqual(Path(config['documents'][0]['working_path']).read_bytes(),source.read_bytes())
                if method=='v8-boxtext':
                    self.assertIn('v8-readback.js',config['harness_sha256'])
                    mailbox=runtime.readback_target(config,config['documents'][0])
                    self.assertEqual(mailbox.read_bytes(),b'');self.assertEqual(mailbox.stat().st_mode&0o777,0o600)
                    self.assertEqual(mailbox.parent.stat().st_mode&0o777,0o700)
                else:
                    self.assertNotIn('readback_helper_path',config)
                    self.assertNotIn('v8-readback.js',config['harness_sha256'])


if __name__=='__main__':unittest.main()
