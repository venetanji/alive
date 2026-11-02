"""Exercise native input admission without opening a display or desktop app."""
import ast
import ctypes as C
from pathlib import Path
from types import SimpleNamespace
import unittest

from chooser_observation import find_web_ancestor, hit_path_owns, planned_hit_path


class Control:
    def __init__(self, name, parent=None, role='push button'):
        self.name, self.parent, self.role, self.child = name, parent, role, None
    def get_name(self): return self.name
    def get_parent(self): return self.parent
    def get_role_name(self): return self.role
    def get_state_set(self): return self
    def contains(self, state): return state in ('enabled', 'showing', 'sensitive') or state == 'focused' and getattr(self, 'focused', True)


class NativeControlTests(unittest.TestCase):
    def setUp(self):
        source = Path(__file__).with_name('check_alive_desktop.py')
        tree = ast.parse(source.read_text())
        functions = [node for node in tree.body if isinstance(node, ast.FunctionDef) and
                     node.name in ('reorder_point', 'native_control_click', 'reorder_click',
                                   'editor_click', 'device_active_click', 'delete_control')]
        self.events, self.records, self.prepared = [], [], []
        self.clock = 0
        self.rect = SimpleNamespace(x=10, y=20, width=24, height=18)
        self.owner, self.foreign = 100, 200
        self.input_focus, self.deleted = self.owner, False
        self.native_path = [1, self.owner]
        self.web = Control('Pulse - Alive', role='document web')
        self.target = Control('Move Pulse Stereo Utility effect 2 earlier', parent=self.web)
        self.web.child = self.target
        self.ui = SimpleNamespace(display=1,
            wait_for=self.find, find=self.find,
            keys=self.keys,
            t=SimpleNamespace(XTestFakeMotionEvent=self.motion, XTestFakeButtonEvent=self.button),
            x=SimpleNamespace(XFlush=lambda display: self.events.append(('flush',)), XGetInputFocus=self.native_focus))
        self.namespace = {
            'ui': self.ui, 'windows': SimpleNamespace(scope='Alive'), 'MAIN': 'Alive', 'C': C,
            'value': lambda name: 'false', 'wait_value': self.wait_value,
            'time': SimpleNamespace(monotonic=lambda: self.clock, sleep=self.sleep),
            'prepare_workspace_control': self.prepared.append,
            'owned_frame_window': lambda: self.owner,
            'native_hit_path': lambda *point: list(self.native_path),
            'input_record': self.record, 'screenshot': lambda name: self.events.append(('screenshot', name)),
            'find_web_ancestor': find_web_ancestor, 'planned_hit_path': planned_hit_path,
            'hit_path_owns': hit_path_owns, 'sustained_driver': None,
            'GLib': SimpleNamespace(GError=RuntimeError),
            'Atspi': SimpleNamespace(StateType=SimpleNamespace(ENABLED='enabled', SHOWING='showing', SENSITIVE='sensitive', FOCUSED='focused', EXPANDED='expanded'),
                CoordType=SimpleNamespace(SCREEN='screen'), Component=SimpleNamespace(
                    grab_focus=self.focus, get_extents=lambda *args: self.rect,
                    get_accessible_at_point=lambda node, *args: node.child)),
        }
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(source), 'exec'), self.namespace)

    def find(self, name):
        if name == 'Audio details': return Control(name)
        if name != self.target.name or self.deleted:
            raise StopIteration(name)
        return self.target

    def native_focus(self, display, focused, revert):
        C.cast(focused, C.POINTER(C.c_ulong))[0] = self.input_focus
        return True

    def keys(self, *names):
        self.events.append(('keys', *names))
        self.deleted = True

    def wait_value(self, name, predicate):
        status = 'Track removed.' if self.target.name.endswith(' track') else 'Device chain updated.'
        self.assertTrue(predicate(status))
        self.events.append(('ack', name, status))
        return status

    def focus(self, control):
        self.events.append(('focus', control.name))
        return True

    def sleep(self, seconds): self.clock += seconds

    def motion(self, display, screen, x, y, delay):
        self.events.append(('motion', x, y))
        return True

    def button(self, display, number, down, delay):
        self.events.append(('button', number, down))
        return True

    def record(self, action, **fields):
        row = {'action': action, **fields}
        self.records.append(row)
        return row

    def test_reorder_resamples_after_focus_and_layout_before_one_press_release(self):
        original_motion = self.ui.t.XTestFakeMotionEvent
        def scroll_after_motion(*args):
            result = original_motion(*args)
            self.rect = SimpleNamespace(x=70, y=20, width=24, height=18)
            return result
        self.ui.t.XTestFakeMotionEvent = scroll_after_motion
        row = self.namespace['reorder_click'](self.target.name)
        self.assertEqual(self.prepared, [self.target.name])
        self.assertEqual(self.events[0], ('focus', self.target.name))
        self.assertEqual([event for event in self.events if event[0] == 'motion'],
                         [('motion', 22, 29), ('motion', 82, 29)])
        self.assertEqual([event for event in self.events if event[0] == 'button'],
                         [('button', 1, 1), ('button', 1, 0)])
        self.assertEqual(row['final_rect'], [70, 20, 24, 18])
        self.assertTrue(hit_path_owns(row['samples'][-1]['accessible_hit'], self.target.name))
        self.assertEqual((row['presses'], row['releases']), (1, 1))

    def test_foreign_native_target_blocks_all_pointer_buttons(self):
        self.native_path = [1, self.foreign]
        with self.assertRaisesRegex(AssertionError, 'occluded or unavailable'):
            self.namespace['reorder_click'](self.target.name)
        self.assertEqual([event for event in self.events if event[0] == 'button'], [])
        self.assertEqual((self.records[-1]['presses'], self.records[-1]['releases']), (0, 0))
        self.assertEqual(self.records[-1]['samples'][-1]['hit_path'], [1, 200])

    def test_owned_window_with_wrong_accessible_target_blocks_all_pointer_buttons(self):
        self.web.child = Control('Other card editor', parent=self.web)
        with self.assertRaisesRegex(AssertionError, 'occluded or unavailable'):
            self.namespace['reorder_click'](self.target.name)
        self.assertEqual([event for event in self.events if event[0] == 'button'], [])
        row = self.records[-1]
        self.assertEqual(row['samples'][-1]['hit_path'], [1, 100])
        self.assertFalse(hit_path_owns(row['samples'][-1]['accessible_hit'], self.target.name))
        self.assertEqual((row['presses'], row['releases']), (0, 0))

    def test_editor_and_activator_keep_explicit_card_owner_and_sustained_observer(self):
        for helper, target, kind in (
            ('editor_click', 'Edit Harmony Stereo Utility effect 2 in Ultra', 'device editor'),
            ('device_active_click', 'Device active: Harmony Stereo Utility effect 2', 'device active')):
            with self.subTest(helper=helper):
                self.events.clear(); self.records.clear(); self.prepared.clear()
                self.target.name = target
                selected = 'Pulse Subtractive instrument'
                def observe(name, action):
                    self.events.append(('observe', name, selected))
                    return action()
                self.namespace['sustained_driver'] = SimpleNamespace(observer=SimpleNamespace(action=observe))
                callback = self.namespace.get(helper)
                self.assertTrue(callable(callback), 'Missing instance-owned card action helper: ' + helper)
                row = callback('Harmony Stereo Utility effect 2')
                self.assertEqual(row['name'], target)
                self.assertEqual(row['action'], kind + ' click')
                self.assertEqual(self.events[0], ('observe', target, 'Pulse Subtractive instrument'))
                self.assertEqual(self.prepared, [target])
                self.assertTrue(hit_path_owns(row['samples'][-1]['accessible_hit'], target))
                self.assertEqual((row['presses'], row['releases']), (1, 1))

    def test_keyboard_deletion_selects_exact_device_or_track_then_checks_native_and_accessible_focus(self):
        for target, status in (('Select Pulse Stereo Utility effect 1', 'Device chain updated.'),
                               ('Select Harmony track', 'Track removed.')):
            with self.subTest(target=target):
                self.events.clear(); self.records.clear(); self.prepared.clear(); self.deleted = False
                self.target.name = target
                def observe(name, action):
                    self.events.append(('observe', name))
                    return action()
                self.namespace['sustained_driver'] = SimpleNamespace(observer=SimpleNamespace(action=observe))
                callback = self.namespace.get('delete_control')
                self.assertTrue(callable(callback), 'Missing focused keyboard deletion helper')
                row = callback(target, status)
                self.assertEqual([event for event in self.events if event[0] == 'keys'], [('keys', 'Delete')])
                self.assertEqual(self.events[-1], ('ack', 'Session status', status))
                self.assertEqual(self.events[0], ('observe', target))
                self.assertEqual(row['name'], target)
                self.assertEqual(row['input_focus'], self.owner)
                self.assertEqual(row['key'], 'Delete')
                self.assertTrue(hit_path_owns(row['selection']['samples'][-1]['accessible_hit'], target))
                self.assertEqual([event for event in self.events if event[0] == 'focus'], [('focus', target)] * 2)

    def test_keyboard_deletion_emits_no_key_when_playing_or_native_or_accessible_focus_is_wrong(self):
        for failure in ('playing', 'native-focus', 'accessible-focus', 'wrong-accessible-target', 'foreign-native-target'):
            with self.subTest(failure=failure):
                self.setUp()
                self.target.name = 'Select Harmony track'
                if failure == 'playing': self.namespace['value'] = lambda name: 'true'
                if failure == 'native-focus': self.input_focus = self.foreign
                if failure == 'accessible-focus': self.target.focused = False
                if failure == 'wrong-accessible-target': self.web.child = Control('Select Pulse slot 1', parent=self.web)
                if failure == 'foreign-native-target': self.native_path = [1, self.foreign]
                callback = self.namespace.get('delete_control')
                self.assertTrue(callable(callback), 'Missing focused keyboard deletion helper')
                with self.assertRaises(AssertionError): callback(self.target.name, 'Track removed.')
                self.assertEqual([event for event in self.events if event[0] == 'keys'], [])

    def test_keyboard_deletion_rejects_stale_success_when_the_exact_target_remains(self):
        self.target.name = 'Select Pulse Stereo Utility effect 1'
        self.ui.keys = lambda *names: self.events.append(('keys', *names))
        with self.assertRaisesRegex(AssertionError, 'Deleted selection remains available'):
            self.namespace['delete_control'](self.target.name, 'Device chain updated.')
        self.assertEqual([event for event in self.events if event[0] == 'keys'], [('keys', 'Delete')])

    def test_full_cleanup_uses_device_and_track_keyboard_targets_and_keeps_voice_assertions(self):
        source = Path(__file__).with_name('check_alive_desktop.py')
        run = next(node for node in ast.parse(source.read_text()).body if isinstance(node, ast.FunctionDef) and node.name == '_run')
        end = next(i for i, node in enumerate(run.body) if isinstance(node, ast.Assign) and
                   any(isinstance(target, ast.Name) and target.id == 'report' for target in node.targets))
        start = max(i for i, node in enumerate(run.body[:end]) if isinstance(node, ast.Expr) and
                    isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name) and
                    node.value.func.id == 'transport' and node.value.args[0].value == 'stop')
        events = []
        def click(name):
            if name.startswith('Remove '): raise AssertionError('Obsolete native removal control: ' + name)
            events.append(('click', name))
        namespace = {'ui': SimpleNamespace(click=click), 'transport': lambda name: events.append(('transport', name)),
            'select_clip': lambda name: events.append(('source', name)),
            'delete_control': lambda name, status: events.append(('delete', name, status)),
            'choose_file': lambda *args: events.append(('replace', *args)), 'DEVICE': 'instrument.ultra',
            'value': lambda name: events.append(('value', name)) or '0', 'time': SimpleNamespace(sleep=lambda seconds: None)}
        exec(compile(ast.Module(body=run.body[start:end], type_ignores=[]), str(source), 'exec'), namespace)
        self.assertEqual(events, [('transport', 'stop'), ('click', 'Save session'), ('source', 'Pulse'),
            ('delete', 'Select Pulse Stereo Utility effect 1', 'Device chain updated.'), ('value', 'Track 1 active voices'),
            ('source', 'Harmony'), ('replace', 'Replace Harmony device', 'Load Ultra Device', 'instrument.ultra'),
            ('delete', 'Select Harmony track', 'Track removed.'), ('value', 'Track 2 active voices')])


if __name__ == '__main__':
    unittest.main()
