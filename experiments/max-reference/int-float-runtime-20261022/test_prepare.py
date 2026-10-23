"""Original synthetic preparation in temporary trees; no installed source access."""
from contextlib import contextmanager
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from test_numeric import n, fixture


@contextmanager
def synthetic_preparation():
    with tempfile.TemporaryDirectory() as tmp:
        base=Path(tmp);package=base/'package';package.mkdir(mode=0o700)
        for filename in ['controller.js','observer.js','v8-readback.js','lifecycle-observer.js']:
            (package/filename).write_text('// Original synthetic test harness\noutlets=0;\n')
        resources=base/'resources';(resources/'help/max').mkdir(parents=True,mode=0o700)
        (resources/'help/resources').mkdir(mode=0o700)
        documents=[];helpers=[]
        for name in ['int','float']:
            d,_=fixture();d=copy.deepcopy(d);d['document']=name
            source=resources/'help/max'/(name+'.maxhelp');source.write_text(json.dumps({'original_fixture':name}))
            d.update(source_path=str(source),source_sha256=n.digest(source),basic_varname='basic_tab',full_inventory=[])
            documents.append(d)
        for name in sorted(n.common.HELPER_NAMES):
            path=resources/'help/resources'/name;path.write_text('// Original synthetic pinned helper\n')
            helpers.append(dict(name=name,path='help/resources/'+name,sha256=n.digest(path),bytes=path.stat().st_size))
        work=base/'.cache/alive-ultra-evidence/synthetic'
        with patch.object(n,'ROOT',package),patch.object(n.common,'RESOURCES',resources),\
             patch.object(Path,'home',return_value=base),\
             patch.object(n,'source_metadata',return_value=(documents,[],helpers)):
            yield work,resources,package


class PreparationTests(unittest.TestCase):
    def test_constructs_exact_driver_geometry_and_unquoted_config_arguments(self):
        with synthetic_preparation() as (work,resources,package):
            config=n.prepare_private(work,resources)
            inventory=config['lifecycle']['driver_inventory']
            expected_rects=[[20,20,350,50],[-2000,-2000,300,50],
                            [-2000,-2100,300,50],[-2000,-2130,300,50],
                            [-2000,-2160,300,50],[-2000,-2190,300,50]]
            with self.subTest(field='inventory-geometry'):
                self.assertEqual([entry['rect'] for entry in inventory],expected_rects)
            config_argument=n.windows_path(work/'config.json')
            with self.subTest(field='controller-argument'):
                self.assertEqual(inventory[0]['boxtext'],'js controller.js '+config_argument)
            with self.subTest(field='observer-argument'):
                self.assertEqual(inventory[1]['boxtext'],'v8 lifecycle-observer.js '+config_argument)
            for entry,owner in zip(inventory[2:],config['lifecycle']['owners']):
                self.assertEqual(entry['boxtext'],'receive '+owner['channel'])
            driver=json.loads((work/'driver.maxpat').read_text())['patcher']
            self.assertEqual([item['box']['patching_rect'] for item in driver['boxes']],expected_rects)
            self.assertEqual([item['box']['text'] for item in driver['boxes']],
                             [entry['boxtext'] for entry in inventory])
            self.assertEqual(driver['lines'],[
                dict(patchline=dict(source=['__alive_numeric_lifecycle_receive_'+str(index),0],
                                   destination=['__alive_numeric_lifecycle_observer',index+1]))
                for index in range(4)])

    def test_rejects_unsafe_config_argument_before_creating_preparation(self):
        for suffix in ['synthetic path','synthetic\tpath','synthetic\npath','synthetic"path']:
            with self.subTest(suffix=suffix),synthetic_preparation() as (work,resources,package):
                work=work.with_name(suffix)
                with self.assertRaisesRegex(ValueError,'whitespace-free'):
                    n.prepare_private(work,resources)
                self.assertFalse(work.exists())
                self.assertFalse((package/'preparation-manifest.json').exists())

    def test_creates_four_distinct_pristine_working_pairs_and_four_pinned_helpers(self):
        with synthetic_preparation() as (work,resources,package):
            config=n.prepare_private(work,resources)
            self.assertEqual(len(config['documents']),4)
            lifecycle=config['lifecycle']
            self.assertEqual(lifecycle['version'],'freebang-v1')
            self.assertEqual(len(lifecycle['owners']),4)
            self.assertEqual(len({o['channel'] for o in lifecycle['owners']}),4)
            self.assertEqual([o['inlet'] for o in lifecycle['owners']],list(range(4)))
            driver=json.loads((work/'driver.maxpat').read_text())['patcher']
            self.assertEqual(len(driver['boxes']),6)
            self.assertEqual(len(driver['lines']),4)
            self.assertEqual(len(lifecycle['driver_inventory']),6)
            paths=[]
            for d in config['documents']:
                for key in ['pristine_path','working_path']:
                    path=Path(d[key]);paths.append(path)
                    self.assertEqual(n.digest(path),d['source_sha256'])
                    self.assertEqual(path.stat().st_mode&0o777,0o600)
            self.assertEqual(len({p.stat().st_ino for p in paths}),8)
            self.assertEqual(len(list((work/'helpers').iterdir())),4)
            self.assertEqual(work.stat().st_mode&0o777,0o700)
            self.assertIn('private_config_sha256',json.loads((package/'preparation-manifest.json').read_text()))
            binding=n.preparation_binding(work)
            self.assertEqual(binding['private_config_sha256'],n.digest(work/'config.json'))
            self.assertEqual(binding['private_seal_sha256'],n.digest(work/'seal.json'))
            self.assertEqual(len(binding['package_sha256']),64)
            n.verify_private(work)
            Path(config['documents'][-1]['working_path']).write_text('tampered')
            with self.assertRaises(ValueError):n.verify_private(work)

    def test_public_manifest_prevents_config_plus_private_seal_rewrite(self):
        with synthetic_preparation() as (work,resources,package):
            n.prepare_private(work,resources)
            config=json.loads((work/'config.json').read_text());config['global_name']='changed'
            n.write_json(work/'config.json',config)
            seal=json.loads((work/'seal.json').read_text());seal['files']['config.json']=n.digest(work/'config.json')
            n.write_json(work/'seal.json',seal)
            with self.assertRaises(ValueError):n.verify_private(work)
            with self.assertRaises(ValueError):n.prepare_private(work.with_name('second'),resources)


if __name__=='__main__':unittest.main()
