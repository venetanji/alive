#!/usr/bin/env python3
"""Original input checks for the production Rust preparation/export bridge."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

REPO=Path(__file__).resolve().parents[3]
BINARY=REPO/'apps/ultra/src-tauri/target/debug/examples/help_root_export'


def original():
    return {'version':1,'profile':'ultra-canvas-v1','nodes':[
        {'id':7,'type':'number_int','x':0,'y':0,'params':{'value':3}},
        {'id':8,'type':'multiply','x':100,'y':100,'params':{'rhs':2.5,'numericmode':2}},
        {'id':9,'type':'message_box','x':200,'y':100,'params':{'text':'original $1 $2'}},
    ],'edges':[{'from':7,'outlet':0,'to':9,'inlet':1},{'from':7,'outlet':0,'to':8,'inlet':0}]}


class ProductionExport(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory(prefix='ultra-help-export-')
        self.addCleanup(self.directory.cleanup)
        self.input=Path(self.directory.name)/'authoring.json'
        self.output=Path(self.directory.name)/'native.json'

    def run_export(self,patch,output=None):
        self.input.write_text(json.dumps(patch))
        return subprocess.run([str(BINARY),str(self.input),str(output or self.output)],
            env=dict(os.environ,LD_LIBRARY_PATH=str(REPO/'apps/ultra/build')),
            capture_output=True,text=True,timeout=20,umask=0o022)

    def test_native_text_export_is_owner_only_under_ordinary_umask(self):
        result=self.run_export(original())
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(self.output.stat().st_mode & 0o777,0o600)

    def test_exports_actual_prepared_defaults_modes_text_and_edge_order(self):
        patch=original()
        result=self.run_export(patch)
        self.assertEqual(result.returncode,0,result.stderr)
        native=json.loads(self.output.read_text())
        self.assertEqual(native['schema'],'ultra-production-native-descriptors-v1')
        self.assertEqual([node['id'] for node in native['nodes']],[7,8,9])
        self.assertEqual(native['nodes'][0]['parameters'][:3],[3,-100000,100000])
        self.assertEqual(native['nodes'][1]['parameters'][:2],[2.5,2])
        self.assertEqual(bytes.fromhex(native['nodes'][2]['text_hex']).decode(),'original $1 $2')
        self.assertEqual(native['edges'],patch['edges'])
        for node in native['nodes']:
            self.assertEqual(set(node),{'id','kind','device','count','parameters','text_hex'})
            self.assertEqual(len(node['parameters']),6)
        self.assertNotIn('original',result.stdout)

    def test_invalid_authoring_does_not_create_native_output(self):
        patch=original();patch['nodes'][1]['params']={'rhs':2.5,'numericmode':1}
        result=self.run_export(patch)
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(self.output.exists())

    def test_existing_output_and_worktree_destination_are_refused(self):
        self.output.write_text('original sentinel')
        self.assertNotEqual(self.run_export(original()).returncode,0)
        self.assertEqual(self.output.read_text(),'original sentinel')
        forbidden=REPO/'experiments/max-reference/help-roots-native-20261022/forbidden-native-export.json'
        self.assertFalse(forbidden.exists())
        result=self.run_export(original(),forbidden)
        self.assertNotEqual(result.returncode,0)
        self.assertIn('outside the source worktree',result.stderr)
        self.assertFalse(forbidden.exists())


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--binary',type=Path,default=BINARY)
    args,remaining=parser.parse_known_args()
    BINARY=args.binary.resolve()
    unittest.main(argv=[__file__,*remaining])
