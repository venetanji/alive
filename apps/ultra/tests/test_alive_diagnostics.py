"""Exercise scoped diagnostic batching without a desktop or GI runtime."""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest


NAMES = (
    'Audio backend', 'Audio device', 'Audio sample rate', 'Audio buffer frames',
    'Audio callbacks', 'Audio stream errors', 'Audio failed', 'Audio status',
    'Transport playing', 'Absolute frame', 'Rejected commands', 'Native generation',
    'Track 1 active voices', 'Track 2 active voices',
)


class TransientError(Exception):
    pass


class Node:
    def __init__(self, name='', role='label', children=(), pid=None, interfaces=(),
                 description='', contents='', number=None, showing=True):
        self.name, self.role, self.children, self.pid = name, role, list(children), pid
        self.interfaces, self.description = interfaces, description
        self.contents, self.number, self.showing = contents, number, showing
        self.name_error_once = False
        self.children_error_once = False

    def get_name(self):
        if self.name_error_once:
            self.name_error_once = False
            raise TransientError('name temporarily unavailable')
        return self.name

    def get_role_name(self): return self.role
    def get_process_id(self): return self.pid
    def get_child_count(self):
        if self.children_error_once:
            self.children_error_once = False
            raise TransientError('children temporarily unavailable')
        return len(self.children)
    def get_child_at_index(self, index): return self.children[index]
    def get_interfaces(self): return self.interfaces
    def get_description(self): return self.description
    def get_state_set(self): return SimpleNamespace(contains=lambda state: self.showing)


class DiagnosticBatchTests(unittest.TestCase):
    def setUp(self):
        tests = Path(__file__).parent
        desktop_tree = ast.parse((tests / 'check_alive_desktop.py').read_text())
        document_tree = ast.parse((tests / 'check_documents_desktop.py').read_text())
        self.controls = {name: Node(name, description='current:' + name) for name in NAMES}
        self.controls['Audio callbacks'].description = '17'
        self.controls['Audio failed'].description = 'false'
        self.controls['Audio stream errors'].description = '0'
        self.controls['Audio sample rate'].interfaces = ('Value',)
        self.controls['Audio sample rate'].number = 48000
        self.controls['Audio status'].interfaces = ('Text',)
        self.controls['Audio status'].contents = 'Running'
        self.frame = Node('Alive', 'frame', self.controls.values(), pid=4242)
        self.other = Node('Settings', 'frame', [Node('Audio callbacks', description='999')], pid=4242)
        self.owned_app = Node('Ultra', 'application', [self.frame, self.other], pid=4242)
        self.foreign_app = Node('Foreign', 'application',
                                [Node('Alive', 'frame', [Node('Audio callbacks', description='888')], pid=7777)], pid=7777)
        self.apps = [self.foreign_app, self.owned_app]
        self.prepared, self.waited = [], []

        def walk(node):
            yield node
            for child in node.children:
                yield from walk(child)

        def wait_for(name):
            self.waited.append(name)
            for node in walk(self.frame):
                if node.get_name() == name:
                    return node
            raise AssertionError('Missing native control: ' + name)

        ui = SimpleNamespace(pid=4242, desktop_apps=lambda: iter(self.apps),
                             wait_for=wait_for, walk=walk)
        atspi = SimpleNamespace(StateType=SimpleNamespace(SHOWING='showing'),
                                Value=SimpleNamespace(get_current_value=lambda node: node.number),
                                Text=SimpleNamespace(get_character_count=lambda node: len(node.contents),
                                                     get_text=lambda node, start, end: node.contents[start:end]))
        documents = {'ui': ui, 'GLib': SimpleNamespace(GError=TransientError)}
        app_frames = next(node for node in document_tree.body if isinstance(node, ast.FunctionDef)
                          and node.name == 'app_frames')
        exec(compile(ast.Module(body=[app_frames], type_ignores=[]), str(tests / 'check_documents_desktop.py'),
                     'exec'), documents)
        self.windows = SimpleNamespace(scope='Alive', app_frames=documents['app_frames'])
        self.namespace = {'ui': ui, 'windows': self.windows, 'Atspi': atspi,
                          'GLib': SimpleNamespace(GError=TransientError), 'MAIN': 'Alive',
                          'prepare_workspace_control': self.prepared.append}
        try:
            from alive_diagnostics import scan_named_controls, scan_scoped_frames
        except ImportError:
            pass
        else:
            self.namespace['scan_named_controls'] = scan_named_controls
            self.namespace['scan_scoped_frames'] = scan_scoped_frames
        functions = [node for node in desktop_tree.body if isinstance(node, ast.FunctionDef)
                     and node.name in ('value', 'detail')]
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(tests / 'check_alive_desktop.py'),
                     'exec'), self.namespace)

    def detail(self): return self.namespace['detail']()

    def test_complete_scoped_read_uses_one_preparation_and_no_per_control_searches(self):
        result = self.detail()
        self.assertEqual(len(result), 14)
        self.assertEqual(result['Audio callbacks'], '17')
        self.assertEqual(result['Audio sample rate'], '48000')
        self.assertEqual(result['Audio status'], 'Running')
        self.assertEqual(self.prepared, ['Audio backend'])
        self.assertEqual(self.waited, [])

    def test_foreign_app_and_other_owned_window_cannot_supply_same_named_control(self):
        self.frame.children.remove(self.controls['Audio callbacks'])
        with self.assertRaisesRegex(AssertionError, 'Missing native control: Audio callbacks'):
            self.detail()
        self.assertEqual(self.waited[:5], list(NAMES[:5]))

    def test_duplicate_scoped_control_uses_full_incumbent_fallback(self):
        self.frame.children.append(Node('Audio callbacks', description='999'))
        result = self.detail()
        self.assertEqual(result['Audio callbacks'], '17')
        self.assertEqual(self.waited, list(NAMES))

    def test_duplicate_matching_frame_uses_full_incumbent_fallback(self):
        self.owned_app.children.append(Node('* Alive', 'frame', self.controls.values(), pid=4242))
        result = self.detail()
        self.assertEqual(result['Audio callbacks'], '17')
        self.assertEqual(self.waited, list(NAMES))

    def test_unreadable_owned_sibling_role_uses_full_incumbent_fallback(self):
        sibling = Node('Alive', 'frame', self.controls.values(), pid=4242)
        def fail(): raise TransientError('owned sibling role temporarily unavailable')
        sibling.get_role_name = fail
        self.owned_app.children.append(sibling)
        result = self.detail()
        self.assertEqual(result['Audio callbacks'], '17')
        self.assertEqual(self.waited, list(NAMES))

    def test_null_owned_child_uses_full_incumbent_fallback(self):
        self.owned_app.children.append(None)
        result = self.detail()
        self.assertEqual(result['Audio callbacks'], '17')
        self.assertEqual(self.waited, list(NAMES))

    def test_owned_child_enumeration_error_uses_full_incumbent_fallback(self):
        self.owned_app.children_error_once = True
        result = self.detail()
        self.assertEqual(result['Audio callbacks'], '17')
        self.assertEqual(self.waited, list(NAMES))

    def test_unknown_application_pid_uses_full_incumbent_fallback(self):
        def fail(): raise TransientError('application pid temporarily unavailable')
        self.foreign_app.get_process_id = fail
        result = self.detail()
        self.assertEqual(result['Audio callbacks'], '17')
        self.assertEqual(self.waited, list(NAMES))

    def test_transient_traversal_error_uses_full_incumbent_fallback(self):
        self.controls['Audio callbacks'].children_error_once = True
        result = self.detail()
        self.assertEqual(result['Audio callbacks'], '17')
        self.assertEqual(self.waited, list(NAMES))

    def test_value_error_propagates_without_fake_success(self):
        self.controls['Audio sample rate'].number = None
        with self.assertRaises(TypeError):
            self.detail()

    def test_consecutive_calls_read_fresh_values(self):
        self.assertEqual(self.detail()['Audio callbacks'], '17')
        self.controls['Audio callbacks'].description = '18'
        self.assertEqual(self.detail()['Audio callbacks'], '18')
        self.assertEqual(self.prepared, ['Audio backend', 'Audio backend'])


if __name__ == '__main__':
    unittest.main()
