"""Exact annotation metadata fixtures; no installed source strings or runtime."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from test_numeric import fixture, n


SOURCE='bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61'
HELPERS={
    'helpstarter.js':'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8',
    'helpname.js':'49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa',
    'helpdetails.js':'31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1',
    'helpargs.js':'04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'}
ATTRIBUTES=[
    dict(inlets=1,outlets=0,fontname='Arial',fontsize=13.0,bubble=1,bubbleside=3,
         bubblepoint=0.75,bubbletextmargin=None,linecount=3),
    dict(inlets=1,outlets=1,filename='helpargs.js',ignoreclick=1,
         jsarguments_sha256='c511da579364be932435a248bf3f04254e5c257664551ad10ac69cdc4170a098',
         border=0,parameter_enable=0,outlettype=[''])]
SAVED=[[11,186.5,143,54],[291,296,208.315216,39]]
LIVE=[[11,186.5,143,55],[291,296,208.19552612304688,39]]
TEXT_SHA=['96d3d71a61b0f13d7c759315dc9e49578d5c542d24ac120753d628392a55723d',
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855']


def annotation_fixture():
    d,raw=fixture();d.update(source_sha256=SOURCE,helper_sha256=HELPERS)
    raw['source_sha256']=SOURCE
    for i,(id,cls) in enumerate([('obj-23','comment'),('obj-4','jsui')]):
        b=dict(id=id,anchor='root/obj-2/'+id,maxclass=cls,runtime_class=cls,rect=SAVED[i][:],
               outlets=ATTRIBUTES[i]['outlets'],authored_text='',source_text_sha256=TEXT_SHA[i],
               source_attributes=copy.deepcopy(ATTRIBUTES[i]),saved_incoming_routes=0,saved_outgoing_routes=0)
        b['annotation_geometry_policy']=n.annotation_geometry_policy('int',SOURCE,b,
            [dict(name=k,sha256=v) for k,v in HELPERS.items()])
        d['boxes'].append(b)
        raw['boxes'].append(dict(varname=n.original_varname(b),maxclass=cls,rect=LIVE[i][:]))
    d['observer_leaves']=n.observer_definitions(d)
    raw['boxes'].append(dict(varname='__alive_help_leaf_obj_4_0',maxclass='js',rect=[-100,0,10,10]))
    route=dict(source=dict(varname='__alive_help_obj_4',port=0),
               destination=dict(varname='__alive_help_leaf_obj_4_0',port=0))
    raw['input_routes'].append(route);raw['output_routes'].append(copy.deepcopy(route))
    return d,raw


class AnnotationTests(unittest.TestCase):
    def test_exact_annotations_validate_without_mutating_raw_or_omitting_helper_leaf(self):
        d,raw=annotation_fixture();before=copy.deepcopy(raw);dispositions=[]
        result=n.validate_checkpoint(d,raw,3,'install-int','install',dispositions)
        self.assertEqual(raw,before)
        self.assertEqual([row['live_rect'] for row in dispositions],LIVE)
        self.assertEqual(result['retention']['observer_leaf_cables_retained'],4)
        self.assertEqual(set(result['retention']),{'method','original_basic_boxes_retained',
            'original_basic_cables_retained','observer_leaf_cables_retained','unexpected_basic_cables',
            'input_endpoint_multiset_verified','output_endpoint_multiset_verified','saved_order_observed'})

    def test_profiles_refuse_changed_source_helpers_attributes_routes_and_executable_anchor(self):
        d,raw=annotation_fixture()
        for mutate in [lambda x:x.update(document='float'),lambda x:x.update(source_sha256='0'*64),
                       lambda x:x['helper_sha256'].update({'helpargs.js':'0'*64}),
                       lambda x:x['boxes'][-2]['source_attributes'].update(linecount=4),
                       lambda x:x['boxes'][-2]['source_attributes'].update(fontsize=True),
                       lambda x:x['boxes'][-2].update(source_text_sha256='0'*64),
                       lambda x:x['boxes'][-1]['source_attributes'].update(ignoreclick=0),
                       lambda x:x['boxes'][-1]['source_attributes'].update(jsarguments_sha256='0'*64),
                       lambda x:x['boxes'][-1].update(saved_outgoing_routes=1),
                       lambda x:x['boxes'][-1].update(anchor='root/obj-2/obj-16')]:
            bad=copy.deepcopy(d);mutate(bad)
            with self.assertRaises(ValueError):n.validate_checkpoint(bad,raw,3,'install-int','install')
        bad=copy.deepcopy(d);bad['saved_edges'].append(dict(source=['obj-4',0],destination=['obj-1',0]))
        with self.assertRaises(ValueError):n.validate_checkpoint(bad,raw,3,'install-int','install')

    def test_changed_dimensions_are_exact_and_other_geometry_and_topology_stay_strict(self):
        d,raw=annotation_fixture()
        for index,component,value in [(5,3,55.001),(6,2,208.1955),(5,0,12),(6,3,40),(0,3,21)]:
            bad=copy.deepcopy(raw);bad['boxes'][index]['rect'][component]=value
            with self.assertRaises(ValueError):n.validate_checkpoint(d,bad,3,'install-int','install')

    def test_policy_metadata_cannot_coerce_zero_routes_or_declared_outlets(self):
        d,raw=annotation_fixture()
        for mutate in [lambda x:x['boxes'][-1]['annotation_geometry_policy'].update(saved_incoming_routes=False),
                       lambda x:x['boxes'][-1].update(outlets=True),
                       lambda x:x['boxes'][-1].update(id='obj-16')]:
            bad=copy.deepcopy(d);mutate(bad)
            with self.assertRaises(ValueError):n.validate_checkpoint(bad,raw,3,'install-int','install')
        for mutate in [lambda r:r['input_routes'].pop(),lambda r:r['output_routes'].append(r['output_routes'][-1]),
                       lambda r:r['boxes'][5].update(maxclass='number')]:
            bad=copy.deepcopy(raw);mutate(bad)
            with self.assertRaises(ValueError):n.validate_checkpoint(d,bad,3,'install-int','install')

    def test_sidecar_binds_same_raw_bytes_and_retains_actual_geometry_privately(self):
        d,raw=annotation_fixture()
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'read.json';payload=(json.dumps(raw)+'\n').encode();path.write_bytes(payload)
            with patch.object(n,'verify_private'):
                result=n.extract_checkpoint(Path(tmp),d,path,3,'install-int','install')
            side=Path(tmp)/'geometry-dispositions-read.json';record=json.loads(side.read_text())
            self.assertEqual(record['raw_sha256'],hashlib.sha256(payload).hexdigest())
            self.assertEqual(record['raw_bytes'],len(payload))
            self.assertTrue(record['checkpoint_validated'])
            self.assertEqual(record['request_id'],3)
            self.assertEqual([row['live_rect'] for row in record['geometry_dispositions']],LIVE)
            self.assertEqual(side.stat().st_mode & 0o777,0o600)
            self.assertEqual(path.read_bytes(),payload)
            self.assertEqual((Path(tmp)/'retained-read.json').read_bytes(),payload)
            self.assertNotIn('geometry_dispositions',result)


if __name__=='__main__':unittest.main()
