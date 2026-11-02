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
    def test_visible_empty_device_panel_does_not_toggle_closed_for_detail_alias(self):
        calls = []
        class Control:
            def __init__(self, name): self.name = name
            def get_state_set(self): return self
            def contains(self, state):
                return state == 'visible' and self.name == 'Device chain drop area'
        ui = types.SimpleNamespace(click=calls.append, text=lambda *args: None,
            wait_for=lambda name: Control(name), find=lambda name: Control(name))
        navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        ui.click('Devices detail')
        self.assertEqual(calls, [])

    def test_missing_device_control_does_not_hide_an_already_visible_rack(self):
        calls = []
        class Control:
            def __init__(self, name): self.name = name
            def get_state_set(self): return self
            def contains(self, state):
                return state == 'visible' and self.name == 'Device chain drop area'
        ui = types.SimpleNamespace(click=calls.append, text=lambda *args: None,
            wait_for=lambda name: Control(name), find=lambda name: Control(name))
        prepare = navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, None)
        prepare('Edit Pulse Missing effect 2 in Ultra')
        prepare('Missing parameter base')
        self.assertEqual(calls, [])

    def test_card_editor_and_activator_prepare_their_device_view_without_reselection(self):
        for name in ('Edit Pulse Subtractive instrument in Ultra',
                     'Edit Harmony Stereo Utility effect 2 in Ultra',
                     'Device active: Pulse Stereo Utility effect 1'):
            with self.subTest(name=name):
                calls = []
                observer = object()
                class Control:
                    def __init__(self, name): self.name = name
                    def get_state_set(self): return self
                    def contains(self, state):
                        return state == 'expanded' and self.name == 'Audio details'
                ui = types.SimpleNamespace(click=lambda name, **kwargs: calls.append((name, kwargs)),
                    text=lambda *args: None, wait_for=lambda name: Control(name), find=lambda name: Control(name))
                navigation.install(ui, types.SimpleNamespace(scope='Alive'),
                    lambda name: self.fail('Card actions must retain their own instance owner'), None)
                ui.click(name, observer=observer)
                self.assertEqual(calls, [('Audio details', {}), ('Toggle Device view', {}),
                    (name, {'observer': observer})])

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

    def test_note_preparation_closes_only_open_automation_before_owned_note_input(self):
        cases = (
            (True, False, 1, ['Automation inspector', 'Note inspector']),
            (True, True, 1, ['Automation inspector']),
            (False, False, 1, ['Note inspector']),
            (True, False, 2, ['Automation inspector', 'Note inspector']),
        )
        for automation_open, note_open, edits, disclosures in cases:
            with self.subTest(automation_open=automation_open, note_open=note_open, edits=edits):
                calls = []
                expanded = {'Automation inspector': automation_open, 'Note inspector': note_open}
                class Control:
                    def __init__(self, name): self.name = name
                    def get_state_set(self): return self
                    def contains(self, state):
                        return (state == 'visible' and self.name == 'Source / Clip' or
                                state == 'expanded' and expanded.get(self.name, False))
                def raw_click(name):
                    calls.append(('blind', name))
                    # The open Automation summary covers the underlying Note icon.
                    target = 'Automation inspector' if name == 'Note inspector' and expanded['Automation inspector'] else name
                    expanded[target] = not expanded.get(target, False)
                def owned(name):
                    if name == 'Note inspector' and expanded['Automation inspector']:
                        raise AssertionError('Note disclosure is occluded by Automation')
                    calls.append(('owned', name))
                    expanded[name] = not expanded[name]
                def text(name, value):
                    self.assertTrue(expanded['Note inspector'], 'Note field must be disclosed before editing')
                    self.assertFalse(expanded['Automation inspector'], 'Automation must not cover the Note field')
                    calls.append(('text', name, value))
                ui = types.SimpleNamespace(click=raw_click, text=text,
                    wait_for=lambda name: Control(name), find=lambda name: Control(name))
                navigation.install(ui, types.SimpleNamespace(scope='Alive'), None, owned)
                for value in range(edits):
                    ui.text('Note 1 duration', str(value + 1))
                self.assertEqual(calls, [('owned', name) for name in disclosures] +
                    [('text', 'Note 1 duration', str(value + 1)) for value in range(edits)])
                self.assertEqual(expanded, {'Automation inspector': False, 'Note inspector': True})

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
            def contains(self, state): return state == 'visible' and self.name in ('Source / Clip', 'Cutoff base')
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
