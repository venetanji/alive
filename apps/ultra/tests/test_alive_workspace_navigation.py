import sys
import types
import unittest
from unittest.mock import patch

sys.modules.setdefault('gi', types.ModuleType('gi'))
repository = types.ModuleType('gi.repository')
repository.Atspi = types.SimpleNamespace(StateType=types.SimpleNamespace(EXPANDED='expanded', PRESSED='pressed'))
sys.modules.setdefault('gi.repository', repository)
import alive_workspace_navigation as navigation


class NavigationTest(unittest.TestCase):
    def test_apply_closes_expanded_audio_details_before_click(self):
        calls = []
        class Control:
            def get_state_set(self): return self
            def contains(self, state): return state == 'expanded'
        ui = types.SimpleNamespace(click=lambda name: calls.append(name), text=lambda *args: None,
                                   wait_for=lambda name: Control())
        windows = types.SimpleNamespace(scope='Alive')
        navigation.install(ui, windows, None, None)
        ui.click('Prepare / Apply')
        self.assertEqual(calls, ['Audio details', 'Prepare / Apply'])

if __name__ == '__main__':
    unittest.main()
