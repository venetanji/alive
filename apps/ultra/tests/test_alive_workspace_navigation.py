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
    def test_seek_opens_transport_options_before_the_existing_action(self):
        calls = []
        class Control:
            def get_state_set(self): return self
            def contains(self, state): return False
        ui = types.SimpleNamespace(click=lambda name: calls.append(name), text=lambda *args: None,
                                   wait_for=lambda name: Control())
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        ui.click('Seek transport')
        self.assertEqual(calls, ['Transport and view options', 'Seek transport'])

    def test_audio_settings_closes_expanded_audio_details_before_click(self):
        calls = []
        class Control:
            def get_state_set(self): return self
            def contains(self, state): return state == 'expanded'
        ui = types.SimpleNamespace(click=lambda name: calls.append(name), text=lambda *args: None,
                                   wait_for=lambda name: Control())
        windows = types.SimpleNamespace(scope='Alive')
        navigation.install(ui, windows, None, None)
        ui.click('Alive audio settings')
        self.assertEqual(calls, ['Audio details', 'Alive audio settings'])

    def test_region_controls_open_clip_detail_before_editing(self):
        calls = []
        class Control:
            def get_state_set(self): return self
            def contains(self, state): return False
        ui = types.SimpleNamespace(click=lambda name: calls.append(name),
                                   text=lambda *args: calls.append(args),
                                   wait_for=lambda name: Control())
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        ui.text('Loop Position', '2')
        self.assertEqual(calls, ['Clip detail', ('Loop Position', '2')])

    def test_source_actions_open_the_source_disclosure_before_activation(self):
        calls = []
        class Control:
            def get_state_set(self): return self
            def contains(self, state): return False
        ui = types.SimpleNamespace(click=lambda name: calls.append(name), text=lambda *args: None,
                                   wait_for=lambda name: Control())
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        ui.click('Make source independent')
        self.assertEqual(calls, ['Clip detail', 'Source / Clip', 'Make source independent'])

    def test_adding_an_effect_closes_diagnostics_before_opening_the_native_chooser(self):
        calls = []
        class Control:
            def get_state_set(self): return self
            def contains(self, state): return state == 'expanded'
        ui = types.SimpleNamespace(click=lambda name: calls.append(name), text=lambda *args: None,
                                   wait_for=lambda name: Control())
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        ui.click('Add effect')
        self.assertEqual(calls, ['Audio details', 'Add effect'])

if __name__ == '__main__':
    unittest.main()
