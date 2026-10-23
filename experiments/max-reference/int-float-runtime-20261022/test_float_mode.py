"""Finite float source metadata and read-only mode fixtures, no target access."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from test_numeric import fixture, n
from test_annotations import HELPERS

SOURCE='c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c'
RECTS={'obj-16':[194,230.5,54,23],'obj-17':[265,230.5,54,23],
       'obj-21':[220,330.5,54,23],'obj-33':[117,380.5,54,23]}
ATTRS=dict(inlets=1,outlets=2,format=6,numdecimalplaces=None,fontname='Arial',fontsize=13.0,
           outlettype=['','bang'],parameter_enable=0)
EMPTY='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'


def float_fixture():
    d,raw=fixture();d.update(document='float',source_sha256=SOURCE,helper_sha256=HELPERS)
    raw.update(document='float',source_sha256=SOURCE)
    helpers=[dict(name=k,sha256=v) for k,v in HELPERS.items()]
    for id,rect in RECTS.items():
        b=dict(id=id,anchor='root/obj-2/'+id,maxclass='flonum',runtime_class='flonum',rect=rect[:],
               outlets=2,authored_text='',source_text_sha256=EMPTY,source_attributes=copy.deepcopy(ATTRS))
        b['numeric_mode_policy']=n.numeric_mode_policy('float',SOURCE,b,helpers)
        d['boxes'].append(b)
        raw['boxes'].append(dict(varname=n.original_varname(b),maxclass='number',rect=rect[:]))
        raw['numeric'].append(dict(anchor=b['anchor'],class_name='flonum',value=0,
             getter_representation='scalar-number',getter_method='getvalueof',semantic_tag='float',
             semantic_tag_basis='flonum-class'))
    d['observer_leaves']=n.observer_definitions(d)
    for leaf in d['observer_leaves'][3:]:
        raw['boxes'].append(dict(varname=leaf['varname'],maxclass='js',rect=[-100,0,10,10]))
        b=next(b for b in d['boxes'] if b['anchor']==leaf['anchor'])
        route=dict(source=dict(varname=n.original_varname(b),port=leaf['port']),
                   destination=dict(varname=leaf['varname'],port=0))
        raw['input_routes'].append(route);raw['output_routes'].append(copy.deepcopy(route))
    raw['numeric_modes']=[dict(anchor='root/obj-2/'+id,runtime_class='number',source_class='flonum',
        getter_method='getattr',attribute='format',getter_representation='scalar-number',getter_value=6)
        for id in RECTS]
    return d,raw


class FloatModeTests(unittest.TestCase):
    def test_number_class_requires_exact_source_bound_actual_float_mode(self):
        d,raw=float_fixture();before=copy.deepcopy(raw);modes=[]
        result=n.validate_checkpoint(d,raw,3,'install-int','install',None,modes)
        self.assertEqual(raw,before)
        self.assertEqual(len(modes),4)
        self.assertEqual([m['getter_value'] for m in modes],[6,6,6,6])
        self.assertEqual([v['semantic_tag'] for v in result['numeric_states'][-4:]],['float']*4)
        self.assertEqual(result['retention']['observer_leaf_cables_retained'],11)

    def test_mode_inventory_and_primitive_exact_six_gate_refuse_coercion(self):
        d,raw=float_fixture()
        for value in [None,True,'6',[6],0,6.01,float('nan'),float('inf')]:
            bad=copy.deepcopy(raw);bad['numeric_modes'][0]['getter_value']=value
            with self.assertRaises(ValueError):n.validate_checkpoint(d,bad,3,'install-int','install')
        for mutate in [lambda r:r.pop('numeric_modes'),lambda r:r['numeric_modes'].append(r['numeric_modes'][0]),
                       lambda r:r['numeric_modes'][0].update(getter_representation='singleton-number-array'),
                       lambda r:r['numeric_modes'][0].update(runtime_class='flonum'),
                       lambda r:r['boxes'][5].update(maxclass='flonum')]:
            bad=copy.deepcopy(raw);mutate(bad)
            with self.assertRaises(ValueError):n.validate_checkpoint(d,bad,3,'install-int','install')

    def test_mode_profile_cannot_widen_class_anchor_geometry_or_source_format(self):
        d,raw=float_fixture()
        for mutate in [lambda x:x.update(document='int'),lambda x:x.update(source_sha256='0'*64),
                       lambda x:x['boxes'][-1]['source_attributes'].update(format=0),
                       lambda x:x['boxes'][-1].update(maxclass='number'),
                       lambda x:x['boxes'][-1].update(anchor='root/obj-2/obj-18'),
                       lambda x:x['boxes'][-1].pop('numeric_mode_policy')]:
            bad=copy.deepcopy(d);mutate(bad)
            with self.assertRaises(ValueError):n.validate_checkpoint(bad,raw,3,'install-int','install')
        bad=copy.deepcopy(raw);bad['boxes'][5]['rect'][2]=55
        with self.assertRaises(ValueError):n.validate_checkpoint(d,bad,3,'install-int','install')

    def test_private_sidecar_retains_runtime_mode_without_public_schema_extension(self):
        d,raw=float_fixture()
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'read.json';payload=json.dumps(raw).encode();path.write_bytes(payload)
            with patch.object(n,'verify_private'):
                result=n.extract_checkpoint(Path(tmp),d,path,3,'install-int','install')
            side=json.loads((Path(tmp)/'geometry-dispositions-read.json').read_text())
            self.assertEqual(len(side['numeric_mode_observations']),4)
            self.assertEqual(side['raw_bytes'],len(payload));self.assertEqual(path.read_bytes(),payload)
            self.assertNotIn('numeric_modes',result)

    def test_float_geometry_profiles_remain_distinct_from_int(self):
        helpers=[dict(name=k,sha256=v) for k,v in HELPERS.items()]
        roots=[('root/obj-1','js',[374,27.5,120,20],
                'e9cd2d2ae24129f7ce891e9a5ee418d273b18a0b2641d3f3beb34be09def8ab5'),
               ('root/obj-2','patcher',[10,85,50,20],
                '484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393'),
               ('root/obj-3','patcher',[205,205,50,20],
                'bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a')]
        for anchor,cls,rect,text in roots:
            b=dict(anchor=anchor,maxclass='newobj',runtime_class=cls,rect=rect,
                   source_text_sha256=text,saved_incoming_routes=0,saved_outgoing_routes=0)
            p=n.shell_height_policy('float',SOURCE,b,helpers)
            self.assertIsNotNone(p);self.assertEqual(p['live_rect'],rect[:3]+[22])
            with self.assertRaises(ValueError):n.shell_height_policy('float',n.IDENTITIES['int'],b,helpers)

    def test_three_exact_float_annotations_require_their_own_source_metadata(self):
        helpers=[dict(name=k,sha256=v) for k,v in HELPERS.items()]
        common=dict(inlets=1,outlets=0,fontname='Arial',fontsize=13.0,bubble=1,
                    bubbleside=None,bubblepoint=None,bubbletextmargin=None,linecount=3)
        cases=[('obj-3','comment',[411,156.5,133,54],[411,156.5,133,55],
                'de8dbc68910ee493e95c0bad7d48cf0b12577baa5955cd7d894aa80cae1fb027',common),
               ('obj-5','comment',[14,201.5,143,54],[14,201.5,143,55],
                '96d3d71a61b0f13d7c759315dc9e49578d5c542d24ac120753d628392a55723d',
                dict(common,bubbleside=3,bubblepoint=.75)),
               ('obj-4','jsui',[289,274,190.328094,39],[289,274,190.31402587890625,39],EMPTY,
                dict(inlets=1,outlets=1,filename='helpargs.js',ignoreclick=1,border=0,parameter_enable=0,
                     outlettype=[''],jsarguments_sha256='a6c871ff72c57f35934325de26fba3add81b1df8935af30a164fb9a13117949a'))]
        for id,cls,saved,live,text,attrs in cases:
            b=dict(id=id,anchor='root/obj-2/'+id,maxclass=cls,runtime_class=cls,rect=saved,
                   source_text_sha256=text,source_attributes=attrs,saved_incoming_routes=0,saved_outgoing_routes=0)
            p=n.annotation_geometry_policy('float',SOURCE,b,helpers)
            self.assertIsNotNone(p);self.assertEqual(p['live_rect'],live)
            with self.assertRaises(ValueError):n.annotation_geometry_policy('float',n.IDENTITIES['int'],b,helpers)


if __name__=='__main__':unittest.main()
