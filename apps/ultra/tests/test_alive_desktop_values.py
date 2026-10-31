"""Exercise the shared accessibility reader without importing desktop resources."""
import ast
import json
from pathlib import Path
from types import SimpleNamespace
import unittest


class DesktopValueTests(unittest.TestCase):
    def setUp(self):
        source = Path(__file__).with_name('check_alive_desktop.py')
        tree = ast.parse(source.read_text())
        functions = [node for node in tree.body if isinstance(node, ast.FunctionDef)
                     and node.name in ('value', 'wait_value', 'file_score', 'source_score', 'bounded_core_fixture')]
        self.controls, self.reads, self.prepared = {}, [], []

        def get_text(control, start, end):
            self.assertEqual((start, end), (0, len(control.contents)))
            self.reads.append(control.contents)
            return control.contents

        self.namespace = {
            'json': json,
            'prepare_workspace_control': self.prepared.append,
            'ui': SimpleNamespace(wait_for=lambda name: self.controls[name],
                                  walk=lambda control: iter(control.children)),
            'Atspi': SimpleNamespace(
                Text=SimpleNamespace(get_text=get_text, get_character_count=lambda control: len(control.contents)),
                Value=SimpleNamespace(get_current_value=lambda control: control.number)),
        }
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(source), 'exec'), self.namespace)

    def control(self, name, interfaces, contents='', number=None, children=(), description=''):
        self.controls[name] = SimpleNamespace(get_interfaces=lambda: interfaces,
                                              contents=contents, number=number, children=children,
                                              get_description=lambda: description)
        return self.controls[name]

    def test_numeric_values_use_the_value_interface_and_preserve_integer_text(self):
        for number, expected in ((60, '60'), (.713, '0.713'), (0, '0')):
            self.control('Note pitch', ('Value', 'Text'), number=number)
            self.assertEqual(self.namespace['value']('Note pitch'), expected)
        self.assertEqual(self.reads, [])

    def test_text_reads_use_bounded_character_counts_and_keep_empty_values(self):
        for contents in ('Edits play immediately', ''):
            self.control('Musical edit status', ('Text',), contents=contents)
            self.assertEqual(self.namespace['value']('Musical edit status'), contents)
        self.assertEqual(self.reads, ['Edits play immediately', ''])

    def test_container_reads_its_text_children_without_a_description_fallback(self):
        first = self.control('first', ('Text',), contents='Session:')
        second = self.control('second', ('Text',), contents='Cued Clip 1')
        empty = self.control('empty', ('Text',))
        self.control('Runtime', (), children=(first, empty, second))
        self.assertEqual(self.namespace['value']('Runtime'), 'Session: Cued Clip 1')
        self.control('Runtime', (), children=(empty,))
        self.assertEqual(self.namespace['value']('Runtime'), '')

    def test_empty_parent_text_does_not_hide_a_populated_text_child(self):
        child = self.control('callback count', ('Text',), contents='203')
        self.control('Audio callbacks', ('Text',), children=(child,))
        self.assertEqual(self.namespace['value']('Audio callbacks'), '203')

    def test_diagnostic_output_can_use_its_current_value_title_when_text_is_unavailable(self):
        self.control('Audio callbacks', ('Text',), description='203')
        self.assertEqual(self.namespace['value']('Audio callbacks'), '203')
        self.control('Track 2 authority', ('Text',), description='arrangement')
        self.assertEqual(self.namespace['value']('Track 2 authority'), 'arrangement')
        self.control('Clip name', ('Text',), description='Help for an empty name')
        self.assertEqual(self.namespace['value']('Clip name'), '')
        self.control('Audio callbacks', ('Text',))
        self.assertEqual(self.namespace['value']('Audio callbacks'), '')

    def test_missing_control_is_not_replaced_with_an_empty_value(self):
        with self.assertRaises(KeyError):
            self.namespace['value']('Missing control')

    def test_numeric_wait_retries_transient_empty_text_without_masking_invalid_text(self):
        values = iter(('', '203'))
        self.namespace['value'] = lambda name: next(values)
        self.namespace['time'] = SimpleNamespace(monotonic=lambda: 0, sleep=lambda seconds: None)
        self.assertEqual(self.namespace['wait_value']('Audio callbacks', lambda text: int(text) > 0), '203')
        self.namespace['value'] = lambda name: 'invalid callback count'
        with self.assertRaises(ValueError):
            self.namespace['wait_value']('Audio callbacks', lambda text: int(text) > 0)

    def test_empty_text_is_still_an_observable_wait_result(self):
        self.namespace['value'] = lambda name: ''
        self.namespace['time'] = SimpleNamespace(monotonic=lambda: 0, sleep=lambda seconds: None)
        self.assertEqual(self.namespace['wait_value']('Session status', lambda text: text == ''), '')

    def test_file_score_accepts_only_the_current_envelope_and_score(self):
        score = {'format': 'alive-session-v4'}
        self.assertIs(self.namespace['file_score']({'format': 'alive-session-v6', 'score': score}), score)
        for document in (score, {'format': 'alive-session-v5', 'score': score},
                         {'format': 'alive-session-v6', 'score': {'format': 'alive-session-v3'}}):
            with self.subTest(document=document), self.assertRaises(AssertionError):
                self.namespace['file_score'](document)

    def test_bounded_fixture_preserves_current_sources_regions_and_devices_without_mutating_input(self):
        root = Path(__file__).resolve().parents[3]
        session = json.loads((root / 'apps/alive/examples/two-instruments.alive').read_text())
        original = json.loads(json.dumps(session))
        bounded = self.namespace['bounded_core_fixture'](session)
        self.assertEqual(session, original)
        self.assertEqual(bounded['format'], 'alive-session-v6')
        self.assertEqual(bounded['score']['tracks'], original['score']['tracks'])
        self.assertEqual(bounded['score']['placements'], original['score']['placements'])
        for source, previous in zip(bounded['score']['sources'], original['score']['sources']):
            self.assertEqual((source['id'], source['trackId']), (previous['id'], previous['trackId']))
            self.assertEqual(source['automation'], [])
            self.assertEqual(source['notes'], [{**previous['notes'][0], 'beat': 0, 'duration': source['lengthBeats']}])


if __name__ == '__main__':
    unittest.main()
