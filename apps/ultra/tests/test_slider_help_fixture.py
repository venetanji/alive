import ast
from pathlib import Path
import unittest


def load_validator():
    source = Path(__file__).with_name('check_canvas_desktop.py').read_text()
    module = ast.parse(source)
    functions = [node for node in module.body if isinstance(node, ast.FunctionDef) and node.name == 'slider_help_targets']
    if not functions:
        return None
    namespace = {}
    exec(compile(ast.Module(body=functions, type_ignores=[]), '<slider fixture>', 'exec'), namespace)
    return namespace['slider_help_targets']


def fixture():
    nodes = [{'id': i, 'type': 'comment' if i in (1, 2, 3, 4, 5) else 'toggle'} for i in range(1, 22)]
    executable = [node for node in nodes if node['type'] != 'comment']
    executable[3]['type'] = 'slider'
    executable[8]['type'] = 'number_int'
    edges = [{'from': executable[3]['id'], 'outlet': 0, 'to': executable[8]['id'], 'inlet': 0}]
    edges.extend({'from': 6, 'outlet': 0, 'to': 7, 'inlet': 0} for _ in range(9))
    return {'nodes': nodes, 'edges': edges}


class SliderHelpFixtureTest(unittest.TestCase):
    def test_resolves_executable_roles_including_comments(self):
        validate = load_validator()
        self.assertIsNotNone(validate, 'slider help validator is missing')
        self.assertEqual(validate(fixture()), (9, 14))

    def test_rejects_count_type_and_connection_drift(self):
        validate = load_validator()
        self.assertIsNotNone(validate, 'slider help validator is missing')
        for mutation in (
            lambda patch: patch['nodes'].pop(),
            lambda patch: patch['nodes'][8].update(type='toggle'),
            lambda patch: patch['edges'][0].update(to=7),
            lambda patch: patch['edges'].pop(),
        ):
            patch = fixture()
            mutation(patch)
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError):
                validate(patch)

if __name__ == '__main__': unittest.main()
