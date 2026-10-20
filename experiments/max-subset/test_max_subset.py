import copy
import json
from pathlib import Path
import tempfile
import unittest
import max_subset as m

FIXTURES = Path(__file__).parent / 'fixtures'

def patch(boxes=None, lines=None, **extra):
    return {'patcher': {'boxes': boxes or [], 'lines': lines or [], **extra}}

def box(id='a', cls='button', **extra):
    return {'box': {'id': id, 'maxclass': cls, **extra}}

class ImportTests(unittest.TestCase):
    def read(self, value):
        return m.import_bytes(json.dumps(value).encode())

    def test_empty_is_inventory_never_executable(self):
        r = self.read(patch())
        self.assertTrue(r['accepted'])
        self.assertFalse(r['executable'])
        self.assertEqual(r['profile'], 'max-subset-inventory-v1')

    def test_synthetic_golden(self):
        source = (FIXTURES / 'ordered.synthetic.maxpat').read_bytes()
        actual = m.import_bytes(source)
        expected = json.loads((FIXTURES / 'ordered.synthetic.inventory.json').read_text())
        self.assertEqual(actual, expected)
        self.assertEqual(actual['source_text'].encode(), source)
        self.assertEqual(actual['objects'][1]['canonical_class'], 'trigger')
        self.assertEqual([e['order'] for e in actual['edges']], [1, 0])

    def test_unknown_preserved_and_diagnosed(self):
        p = patch([box(future={'nested': 42})], future_root={'x': 1})
        r = self.read(p)
        self.assertEqual(r['source'], p)
        self.assertIn('UNSUPPORTED_ATTRIBUTE', [d['code'] for d in r['diagnostics']])

    def test_refused_families_and_embedded(self):
        for name, code in [('gen~','UNSUPPORTED_GEN'), ('jit.matrix','UNSUPPORTED_JITTER'),
                           ('live.object','UNSUPPORTED_LIVE'), ('js','UNSUPPORTED_SCRIPT'),
                           ('mc.cycle~','UNSUPPORTED_MULTICHANNEL'), ('thirdparty','UNSUPPORTED_CLASS')]:
            r = self.read(patch([box(cls='newobj', text=name)]))
            self.assertIn(code, [d['code'] for d in r['diagnostics']])
            self.assertFalse(r['executable'])
        r = self.read(patch([box(cls='newobj', text='p nested', patcher={'boxes': [], 'lines': []})]))
        self.assertIn('UNSUPPORTED_EMBEDDED_PATCH', [d['code'] for d in r['diagnostics']])

    def test_dependency_inventory_no_resolution(self):
        r = self.read(patch(dependency_cache=[{'name':'foo.mxo', 'type':'iLaX'}]))
        self.assertEqual(r['dependencies'][0]['name'], 'foo.mxo')
        self.assertIn('UNSUPPORTED_DEPENDENCY', [d['code'] for d in r['diagnostics']])

    def test_unsafe_dependency_paths_rejected(self):
        for path in ['../secret', '/etc/passwd', 'C:\\secret', 'https://example.com/a', 'foo/../../x']:
            r = self.read(patch(dependency_cache=[{'name':path}]))
            self.assertFalse(r['accepted'], path)
            self.assertIn('UNSAFE_PATH', [d['code'] for d in r['diagnostics']])

    def test_structural_rejections(self):
        bad = [[], {}, {'patcher': []}, patch([box(), box()]),
               patch([box(numinlets=-1)]), patch([box(patching_rect=[1,2])]),
               patch([box()], [{'patchline': {'source':['a',0], 'destination':['missing',0]}}]),
               patch([box(numoutlets=0)], [{'patchline': {'source':['a',0], 'destination':['a',0]}}]),
               patch([box()], [{'patchline': {'source':['a',True], 'destination':['a',0]}}])]
        for p in bad:
            with self.subTest(p=p):
                self.assertFalse(self.read(p)['accepted'])

    def test_non_json_duplicate_keys_nonfinite_and_limits(self):
        for raw in [b'ampf binary', b'{', b'{"patcher":{},"patcher":{}}',
                    b'{"patcher":{"x":NaN}}', b'{"patcher":{"x":1e999}}',
                    b'[' * 40 + b']' * 40, b' ' * (m.MAX_BYTES + 1)]:
            self.assertFalse(m.import_bytes(raw)['accepted'])
        self.assertFalse(self.read(patch([box(str(i)) for i in range(m.MAX_BOXES+1)]))['accepted'])

    def test_string_braces_do_not_trigger_depth_limit(self):
        self.assertTrue(self.read(patch([box(cls='message', text='['*100)]))['accepted'])

    def test_amxd_is_not_decoded(self):
        self.assertEqual(m.import_bytes(b'ampf')['diagnostics'][0]['code'], 'UNSUPPORTED_AMXD')

    def test_outlettype_validation(self):
        for value in ['signal', [3], ['signal','signal']]:
            self.assertFalse(self.read(patch([box(numoutlets=1, outlettype=value)]))['accepted'])

    def test_root_and_patchline_unknown_fields_diagnosed(self):
        r = self.read(patch([box()], [{'patchline': {'source':['a',0], 'destination':['a',0], 'future':1}}], future=2))
        self.assertEqual(sum(d['code']=='UNSUPPORTED_ATTRIBUTE' for d in r['diagnostics']), 2)

    def test_object_path_refused_but_division_allowed(self):
        for name in ['../external', '/tmp/external', 'C:\\external']:
            self.assertFalse(self.read(patch([box(cls='newobj',text=name)]))['accepted'])
        self.assertTrue(self.read(patch([box(cls='newobj',text='/ 2')]))['accepted'])

    def test_json_keys_are_bounded_valid_strings(self):
        self.assertFalse(self.read(patch(**{'x'*(m.MAX_TEXT+1):1}))['accepted'])
        self.assertFalse(m.import_bytes(b'{"patcher":{"boxes":[],"lines":[],"\\ud800":1}}')['accepted'])

    def test_manifest_schema_and_negative_controls(self):
        try:
            import jsonschema
        except ImportError:
            self.skipTest('Optional jsonschema package is not installed')
        schema = json.loads(Path(__file__).with_name('reference-manifest.schema.json').read_text())
        jsonschema.Draft202012Validator.check_schema(schema)
        validator = jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker())
        example = json.loads((FIXTURES/'ordered.synthetic.manifest.json').read_text())
        validator.validate(example)
        bad = copy.deepcopy(example)
        bad['max_executed'] = True
        self.assertTrue(list(validator.iter_errors(bad)))
        bad = copy.deepcopy(example)
        bad['provenance'] = 'MAX_REFERENCE_CAPTURE'
        self.assertTrue(list(validator.iter_errors(bad)))
        for path in ['../secret','/etc/passwd','C:\\secret','foo/../../x']:
            bad = copy.deepcopy(example)
            bad['files'][0]['path'] = path
            self.assertTrue(list(validator.iter_errors(bad)), path)

    def test_catalog_is_documentation_only(self):
        c = m.load_catalog()
        names = {o['class'] for o in c['objects']}
        self.assertTrue({'button','toggle','number','flonum','message','trigger','pack','unpack','select','route','+','-','*','/','metro','delay','pipe','loadbang','send','receive','cycle~','sig~','line~','*~','gain~','dac~'} <= names)
        for o in c['objects']:
            self.assertEqual(o['evidence_status'], 'DOC_ONLY')
            self.assertFalse(o['max_compatibility_verified'])
            self.assertTrue(o['ports'])
            self.assertTrue(o['docs_url'].startswith('https://docs.cycling74.com/'))
            self.assertTrue(all(x in ['PD','CYCLONE','FAUST','ULTRA'] for x in o['candidate_backends']))

if __name__ == '__main__':
    unittest.main()
