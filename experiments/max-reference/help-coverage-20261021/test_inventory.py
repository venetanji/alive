import json
from pathlib import Path
import tempfile
import unittest
import inventory

class InventoryTests(unittest.TestCase):
    def test_namespaces_nested_patchers_and_dependency_paths(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder); p=root/'x.maxhelp'
            p.write_text(json.dumps({'patcher': {'boxes': [
                {'box': {'maxclass':'newobj','text':'line 0.', 'patcher': {
                    'classnamespace':'gen','boxes':[{'box':{'maxclass':'newobj','text':'line 5'}}]}}}],
                'dependency_cache':[{'name':'private/folder/a.js'}]}}))
            row=inventory.inspect_patch(p,root)
            self.assertEqual(row['patchers'],2)
            self.assertEqual(row['class_counts'],[{'namespace':'box','token':'line','count':1},{'namespace':'gen','token':'line','count':1}])
            self.assertEqual(row['dependency_names'],['a.js'])
            self.assertNotIn('private', json.dumps(row))
            self.assertIn('declared-dependencies',row['review_flags'])
    def test_bad_json_is_reported_not_passed(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'bad.maxhelp';p.write_text('{')
            self.assertEqual(inventory.inspect_patch(p,Path(folder))['status'],'parse-failed')
    def test_nested_attribute_metadata_is_not_an_object_attribute(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);d=root/'docs/refpages';d.mkdir(parents=True)
            (d/'slider.maxref.xml').write_text('<c74object name="slider"><attributelist><attribute name="size" type="long"><attributelist><attribute name="default">128</attribute></attributelist></attribute></attributelist></c74object>')
            attrs=inventory.inspect_refs(root)[0]['attributes']
            self.assertEqual([x['name'] for x in attrs],['size'])
            self.assertEqual(attrs[0]['documented_default'],['128'])

if __name__=='__main__':unittest.main()
