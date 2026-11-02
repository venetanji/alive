import sys
import types
import unittest
from unittest.mock import patch

sys.modules.setdefault('gi', types.ModuleType('gi'))
repository = types.ModuleType('gi.repository')
repository.Atspi = types.SimpleNamespace(StateType=types.SimpleNamespace(EXPANDED='expanded', PRESSED='pressed', VISIBLE='visible'))
sys.modules.setdefault('gi.repository', repository)
import alive_workspace_navigation as navigation


class NavigationTest(unittest.TestCase):
    def test_clip_launch_prepares_the_visible_option_owner_before_selecting(self):
        for horizontal in (False, True):
            with self.subTest(horizontal=horizontal):
                calls = []
                class Control:
                    def __init__(self, name): self.name = name
                    def get_state_set(self): return self
                    def contains(self, state):
                        return state == 'visible' and (self.name == 'Source / Clip' or
                            horizontal and self.name == 'Toggle Launch options')
                ui = types.SimpleNamespace(click=lambda name: calls.append(('click', name)),
                    text=lambda *args: None, wait_for=lambda name: Control(name), find=lambda name: Control(name))
                navigation.install(ui, types.SimpleNamespace(scope='Alive'), None,
                    lambda name: calls.append(('owned', name)))
                ui.click('Clip Launch Quantization')
                self.assertEqual(calls, [('owned', 'Toggle Launch options' if horizontal else 'Launch'),
                    ('click', 'Clip Launch Quantization')])

    def test_save_opens_its_file_menu_before_the_existing_action(self):
        calls = []
        class Control:
            def get_state_set(self): return self
            def contains(self, state): return False
        ui = types.SimpleNamespace(click=lambda name: calls.append(name), text=lambda *args: None,
                                   wait_for=lambda name: Control())
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        ui.click('Save session')
        self.assertEqual(calls, ['File menu', 'Save session'])

    def test_source_disclosure_uses_owned_input_before_placing_an_arrangement_source(self):
        calls = []
        class Control:
            def __init__(self, name): self.name = name
            def get_state_set(self): return self
            def contains(self, state): return state == 'visible' and self.name == 'Source / Clip'
        ui = types.SimpleNamespace(click=lambda name: calls.append(('blind', name)),
                                   text=lambda *args: None,
                                   wait_for=lambda name: Control(name), find=lambda name: Control(name))
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None,
                           lambda name: calls.append(('owned', name)))
        ui.click('Place source in range')
        self.assertEqual(calls, [('owned', 'Source / Clip'), ('blind', 'Place source in range')])

    def test_diagnostic_disclosure_uses_owned_input_before_reading_voices(self):
        calls = []
        class Control:
            def get_state_set(self): return self
            def contains(self, state): return False
        ui = types.SimpleNamespace(click=lambda name: calls.append(('blind', name)),
                                   text=lambda *args: None, wait_for=lambda name: Control())
        prepare = navigation.install(ui, types.SimpleNamespace(scope='Alive'), None,
                                     lambda name: calls.append(('owned', name)))
        prepare('Track 1 active voices')
        self.assertEqual(calls, [('owned', 'Audio details')])

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
        self.assertEqual(calls, ['Toggle Clip view', ('Loop Position', '2')])

    def test_source_actions_open_the_source_disclosure_before_activation(self):
        calls = []
        class Control:
            def get_state_set(self): return self
            def contains(self, state): return False
        ui = types.SimpleNamespace(click=lambda name: calls.append(name), text=lambda *args: None,
                                   wait_for=lambda name: Control())
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        ui.click('Make source independent')
        self.assertEqual(calls, ['Toggle Clip view', 'Source / Clip', 'Make source independent'])

    def test_original_stop_click_can_record_its_native_input(self):
        calls = []
        observer = object()
        ui = types.SimpleNamespace(click=lambda name, **kwargs: calls.append((name, kwargs)), text=lambda *args: None)
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        ui.click('Stop Pulse track', observer=observer)
        self.assertEqual(calls, [('Stop Pulse track', {'observer': observer})])

    def test_passive_runtime_observation_never_opens_a_disclosure_or_dispatches_input(self):
        def unexpected(*args, **kwargs):
            raise AssertionError('A runtime read must not navigate or activate a control')
        ui = types.SimpleNamespace(click=unexpected, text=unexpected, wait_for=unexpected)
        prepare = navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, unexpected)
        prepare('Pulse clip runtime')
        prepare('Harmony clip runtime')

    def test_add_note_closes_open_source_disclosure_before_real_click(self):
        calls = []
        class Control:
            def __init__(self, name): self.name = name
            def get_state_set(self): return self
            def contains(self, state):
                return (state == 'visible' and self.name == 'Source / Clip') or (state == 'expanded' and self.name == 'Source / Clip')
        ui = types.SimpleNamespace(click=lambda name: calls.append(name), text=lambda *args: None,
                                   wait_for=lambda name: Control(name), find=lambda name: Control(name))
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        ui.click('Add note')
        self.assertEqual(calls, ['Source / Clip', 'Add note'])

    def test_visible_panels_are_not_toggled_closed_when_pressed_state_is_absent(self):
        calls = []
        class Control:
            def __init__(self, name): self.name = name
            def get_state_set(self): return self
            def contains(self, state): return state == 'visible' and self.name in ('Source / Clip', 'Edit selected device in Ultra')
        ui = types.SimpleNamespace(click=lambda name: calls.append(name), text=lambda *args: None,
                                   wait_for=lambda name: Control(name), find=lambda name: Control(name))
        prepare = navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        prepare('MIDI source'); prepare('Cutoff base')
        self.assertNotIn('Toggle Clip view', calls)
        self.assertNotIn('Toggle Device view', calls)

    def test_file_actions_open_file_menu_before_invocation(self):
        calls = []
        class Control:
            def get_state_set(self): return self
            def contains(self, state): return False
        ui = types.SimpleNamespace(click=lambda name: calls.append(name), text=lambda *args: None,
                                   wait_for=lambda name: Control())
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        ui.click('Open session')
        self.assertEqual(calls, ['File menu', 'Open session'])

    def test_legacy_detail_selection_only_opens_an_inactive_independent_view(self):
        calls = []
        class Control:
            def __init__(self, pressed): self.pressed = pressed
            def get_state_set(self): return self
            def contains(self, state): return state == 'pressed' and self.pressed
        controls = {'Toggle Clip view': Control(True), 'Toggle Device view': Control(False)}
        ui = types.SimpleNamespace(click=lambda name: calls.append(name), text=lambda *args: None,
                                   wait_for=lambda name: controls[name])
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        ui.click('Clip detail'); ui.click('Devices detail')
        self.assertEqual(calls, ['Toggle Device view'])

    def test_adding_an_effect_closes_diagnostics_before_opening_the_native_chooser(self):
        calls = []
        class Control:
            def __init__(self, name): self.name = name
            def get_state_set(self): return self
            def contains(self, state): return state == 'expanded' and self.name == 'Audio details'
        ui = types.SimpleNamespace(click=lambda name: calls.append(name), text=lambda *args: None,
                                   wait_for=lambda name: Control(name))
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        ui.click('Add effect')
        self.assertEqual(calls, ['Audio details', 'Add track or device', 'Add effect'])

if __name__ == '__main__':
    unittest.main()
