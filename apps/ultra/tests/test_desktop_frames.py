"""Exercise frame enumeration without opening a native input session."""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest


class FrameEnumerationTest(unittest.TestCase):
    def test_dialog_close_null_child_keeps_other_owned_frames(self):
        source = ast.parse(Path(__file__).with_name('check_documents_desktop.py').read_text())
        function = next(node for node in source.body
                        if isinstance(node, ast.FunctionDef) and node.name == 'app_frames')
        frame = SimpleNamespace(get_role_name=lambda: 'frame')
        root = SimpleNamespace(get_process_id=lambda: 123, get_child_count=lambda: 3,
                               get_child_at_index=lambda index: [None, frame, frame][index])
        unrelated = SimpleNamespace(get_process_id=lambda: 456)
        namespace = {'ui': SimpleNamespace(pid=123, desktop_apps=lambda: [unrelated, root]),
                     'GLib': SimpleNamespace(GError=RuntimeError)}
        exec(compile(ast.Module(body=[function], type_ignores=[]), '<app_frames>', 'exec'), namespace)
        self.assertEqual(namespace['app_frames'](), [frame])


if __name__ == '__main__':
    unittest.main()
