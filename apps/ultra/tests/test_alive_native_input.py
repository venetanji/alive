"""Check the native-input journey's saved-state and input evidence contract."""
import ast
from contextlib import redirect_stdout
import copy
import ctypes as C
import io
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest


class NativeInputJourneyTests(unittest.TestCase):
    def test_foreign_cover_requires_zero_buttons_and_always_restores_its_resources(self):
        source = Path(__file__).with_name('check_alive_native_input.py')
        function = next(node for node in ast.parse(source.read_text()).body
                        if isinstance(node, ast.FunctionDef) and node.name == 'blocked_reorder')
        for outcome in ('blocked', 'admitted', 'unavailable'):
            with self.subTest(outcome=outcome):
                events, records = [], []
                class NativeFunction:
                    def __init__(self, callback): self.callback = callback
                    def __call__(self, *args): return self.callback(*args)
                native = SimpleNamespace(
                    XCreateSimpleWindow=NativeFunction(lambda *args: 200),
                    XDefaultRootWindow=NativeFunction(lambda *args: 1),
                    XMapRaised=NativeFunction(lambda *args: events.append(('map', args[1]))),
                    XDestroyWindow=NativeFunction(lambda *args: events.append(('destroy', args[1]))),
                    XSync=NativeFunction(lambda *args: None))
                def original_button(*args):
                    events.append(('button', args[1], args[2]))
                    return True
                ui = SimpleNamespace(display=1, x=native,
                    t=SimpleNamespace(XTestFakeButtonEvent=original_button),
                    wait_for=lambda name: SimpleNamespace(name=name),
                    Gdk=SimpleNamespace(get_default_root_window=lambda: SimpleNamespace(
                        get_width=lambda: 1200, get_height=lambda: 800)))
                def record(action, **fields):
                    row = {'action': action, **fields}; records.append(row); return row
                name = 'Move Pulse Stereo Utility effect 2 earlier'
                def reorder(target):
                    self.assertEqual(target, name)
                    if outcome == 'unavailable':
                        raise RuntimeError('Accessibility unavailable')
                    if outcome == 'admitted':
                        ui.t.XTestFakeButtonEvent(1, 1, 1, 0)
                        return
                    record('reorder blocked', owner=100, presses=0, releases=0,
                           samples=[{'hit_path': [1, 200]}])
                    raise AssertionError('Native reorder target remains occluded or unavailable: ' + target)
                alive = SimpleNamespace(MAIN='Alive', prepare_workspace_control=lambda name: None,
                    owned_frame_window=lambda: 100, native_inputs=records,
                    reorder_point=lambda control: ([10, 20, 24, 18], (22, 29)),
                    native_hit_path=lambda *point: [1, 200], input_record=record, reorder_click=reorder)
                namespace = {'os': SimpleNamespace(environ={'ULTRA_TEST_PRIVATE_SESSION': '1'}),
                    'windows': SimpleNamespace(scope='Alive'), 'alive': alive, 'ui': ui, 'C': C,
                    'Atspi': SimpleNamespace(Component=SimpleNamespace(grab_focus=lambda control: True))}
                exec(compile(ast.Module(body=[function], type_ignores=[]), str(source), 'exec'), namespace)
                if outcome == 'blocked':
                    row = namespace['blocked_reorder'](name)
                    self.assertEqual(row['button_events'], [])
                    self.assertEqual(row['cover']['hit_path'], [1, 200])
                    self.assertTrue(row['destroyed'])
                elif outcome == 'admitted':
                    with self.assertRaisesRegex(AssertionError, 'admitted a foreign covering window'):
                        namespace['blocked_reorder'](name)
                else:
                    with self.assertRaisesRegex(RuntimeError, 'Accessibility unavailable'):
                        namespace['blocked_reorder'](name)
                self.assertEqual([event for event in events if event[0] in ('map', 'destroy')],
                                 [('map', 200), ('destroy', 200)])
                self.assertIs(ui.t.XTestFakeButtonEvent, original_button)
                if outcome != 'admitted':
                    self.assertEqual([event for event in events if event[0] == 'button'], [])

    def run_journey(self, temporary, events, outcome='success'):
        source = Path(__file__).with_name('check_alive_native_input.py')
        functions = [node for node in ast.parse(source.read_text()).body
                     if isinstance(node, ast.FunctionDef) and node.name != 'blocked_reorder']
        output = Path(temporary)
        root = Path(__file__).resolve().parents[3]
        initial = json.loads((root / 'apps/alive/examples/two-instruments.alive').read_text())
        (output / 'initial.alive').write_text(json.dumps(initial))
        current = copy.deepcopy(initial)
        phase, status = 'negative', 'Ready.'
        rejected = 1 if outcome == 'initial-rejection' else 0
        refusal = ('Workspace playback refused the complete candidate: Complete MIDI envelope exceeds bounded '
                   'preparation policy. (resource 2, observed 20, limit 18). Reduce simultaneous music or simplify chains.')
        inputs = []
        def choose(button, title, path):
            nonlocal current, phase, status, rejected
            events.append((button, path.name))
            if button == 'Save session as':
                path.write_text(json.dumps(current)); status = 'Session saved.'; return
            inputs.append({'action': 'slash location entry', 'scope': title,
                           'ready_before_release': True, 'released': True})
            if button == 'Open session':
                current = json.loads(path.read_text()); phase = 'positive'; status = 'Session ready.'; return
            self.assertEqual(button, 'Add effect')
            effects = current['score']['tracks'][0]['effects']
            if phase == 'negative' and path.name == 'stereo-lowpass.ultra':
                status = 'Wrong refusal.' if outcome == 'wrong-refusal' else refusal
                rejected += 0 if outcome == 'missing-refusal-rejection' else 2 if outcome == 'extra-refusal-rejection' else 1
                if outcome == 'mutated-refusal': current['score']['tracks'][1]['gain'] = .1
                return
            status = 'Device chain updated.'
            if phase == 'positive' and path.name == 'stereo-lowpass.ultra' and outcome == 'unexpected-positive-rejection':
                rejected += 1
            if outcome == 'missing-negative-effect' and phase == 'negative': return
            if outcome == 'missing-positive-effect' and phase == 'positive' and path.name == 'stereo-lowpass.ultra': return
            device = json.loads(path.read_text())['device']
            effects.append({'instanceId': phase + '-' + device['id'], 'id': device['id'],
                'path': path.name, 'bypassed': False,
                'parameters': {'gain': .7} if path.name == 'utility.ultra' else {'cutoff': 1800}})
            if outcome == 'unreleased-slash' and phase == 'positive': inputs[-1]['released'] = False
        def value(name):
            if name == 'Rejected commands': return str(rejected)
            return status if name == 'Session status' else 'false' if name == 'Transport playing' else '0'
        def wait_value(name, predicate):
            actual = value(name)
            self.assertTrue(predicate(actual), name + ': unexpected value ' + repr(actual))
            events.append(('ack', name, actual))
            return actual
        def reorder(name):
            events.append(('reorder', name))
            current['score']['tracks'][0]['effects'].reverse()
            if outcome == 'changed-saved-field' and name.endswith('earlier'):
                current['score']['tracks'][0]['effects'][1]['parameters']['cutoff'] = 1801
            return {'name': name, 'owner': 100, 'presses': 1, 'releases': 1,
                'samples': [{'hit_path': [1, 100], 'accessible_hit': {'status': 'complete',
                    'path': [{'name': name, 'role': 'push button'}]}}]}
        def obsolete(*args): self.fail('The current journey must not require removed path tooltips')
        ui = SimpleNamespace(output=output, pid=999999999,
            click=lambda name: events.append(('click', name)), wait_for=lambda name: SimpleNamespace(name=name),
            keys=lambda key: events.append(('key', key)))
        alive = SimpleNamespace(ui=ui, windows=SimpleNamespace(focus=lambda name: None), MAIN='Alive',
            value=value, wait_value=wait_value, select_clip=lambda name: None, choose_file=choose,
            reorder_click=reorder, covering_reorder_tooltip=obsolete, native_inputs=inputs,
            file_score=lambda session: session['score'], screenshot=lambda name: None,
            detail=lambda: {'Audio stream errors': '0', 'Audio failed': 'false', 'Rejected commands': str(rejected), 'Transport playing': 'false'},
            hit_path_owns=lambda hit, name: hit['status'] == 'complete' and any(row['name'] == name for row in hit['path']))
        helper = next(node for node in ast.parse(source.with_name('check_alive_desktop.py').read_text()).body
                      if isinstance(node, ast.FunctionDef) and node.name == 'bounded_core_fixture')
        helpers = {'json': json, 'file_score': alive.file_score}
        exec(compile(ast.Module(body=[helper], type_ignores=[]), '<bounded-core-fixture>', 'exec'), helpers)
        alive.bounded_core_fixture = helpers['bounded_core_fixture']
        namespace = {'ui': ui, 'windows': alive.windows, 'alive': alive, 'Path': Path, 'json': json,
            'time': SimpleNamespace(monotonic=lambda: 0, sleep=lambda seconds: None),
            'Atspi': SimpleNamespace(Component=SimpleNamespace(grab_focus=lambda control: True)),
            'blocked_reorder': lambda name: {'foreign_window': 200, 'button_events': [],
                'blocked': {'presses': 0, 'releases': 0}, 'destroyed': True}}
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(source), 'exec'), namespace)
        original = Path.cwd()
        try:
            os.chdir(root)
            with redirect_stdout(io.StringIO()): namespace['run']()
        finally:
            os.chdir(original)
        return json.loads((output / 'native-input-report.json').read_text())

    def test_original_refusal_precedes_explicit_positive_fixture_and_complete_roundtrip(self):
        with TemporaryDirectory() as temporary:
            events = []
            report = self.run_journey(temporary, events)
            opened = next(i for i, event in enumerate(events) if event[0] == 'Open session')
            negative_adds = [event for event in events[:opened] if event[0] == 'Add effect']
            positive_adds = [event for event in events[opened:] if event[0] == 'Add effect']
            self.assertEqual(negative_adds, [('Add effect', 'utility.ultra'), ('Add effect', 'stereo-lowpass.ultra')])
            self.assertEqual(positive_adds, negative_adds)
            self.assertEqual(report['effects_after'], report['effects_before'])
            self.assertEqual(report['effects_moved'], list(reversed(report['effects_before'])))
            negative = report['original_admission']
            self.assertIn('(resource 2, observed 20, limit 18)', negative['refusal'])
            self.assertEqual(negative['rejected_commands_before'], 0)
            self.assertEqual(negative['rejected_commands_after'], 1)
            self.assertEqual(negative['expected_rejection_delta'], 1)
            self.assertEqual(report['audio']['Rejected commands'], '1')
            before = json.loads((Path(temporary) / negative['saved_before']).read_text())
            after = json.loads((Path(temporary) / negative['saved_after']).read_text())
            self.assertEqual(before, after)
            self.assertEqual(len(before['score']['tracks']), 2)
            fixture = json.loads((Path(temporary) / report['positive_fixture']['path']).read_text())
            self.assertEqual(len(fixture['score']['tracks']), 1)
            self.assertEqual(len(fixture['score']['sources'][0]['notes']), 1)
            self.assertEqual(fixture['score']['sources'][0]['automation'], [])
            self.assertEqual(fixture['score']['tracks'][0]['effects'], [])
            self.assertEqual({phase: len(rows) for phase, rows in report['slash_entries_by_phase'].items()},
                             {'original_admission': 2, 'positive_fixture_open': 1, 'positive_additions': 2})
            self.assertEqual(len(report['slash_entries']), 5)
            self.assertTrue(all(row['ready_before_release'] and row['released'] for row in report['slash_entries']))
            self.assertEqual(report['foreign_target_block']['button_events'], [])
            self.assertTrue(report['quit_exited'])
            self.assertIn(('key', 'Home'), events)

    def test_wrong_refusal_missing_effect_or_changed_rejected_state_fails_before_positive_fixture(self):
        for outcome, error in (('wrong-refusal', 'Session status'),
                               ('missing-negative-effect', 'Original Utility addition'),
                               ('mutated-refusal', 'Rejected addition changed')):
            with self.subTest(outcome=outcome), TemporaryDirectory() as temporary:
                events = []
                with self.assertRaisesRegex(AssertionError, error): self.run_journey(temporary, events, outcome)
                self.assertFalse(any(event[0] in ('Open session', 'reorder') for event in events))

    def test_positive_missing_effect_changed_saved_field_and_unreleased_slash_are_rejected(self):
        for outcome, error in (('missing-positive-effect', 'Two positive effect additions'),
                               ('changed-saved-field', 'every saved effect field'),
                               ('unreleased-slash', 'Chooser slash')):
            with self.subTest(outcome=outcome), TemporaryDirectory() as temporary:
                with self.assertRaisesRegex(AssertionError, error): self.run_journey(temporary, [], outcome)

    def test_initial_or_inexact_refusal_rejection_count_fails_before_positive_fixture(self):
        for outcome, error in (('initial-rejection', 'Initial rejected command count'),
                               ('missing-refusal-rejection', 'exactly one rejected command'),
                               ('extra-refusal-rejection', 'exactly one rejected command')):
            with self.subTest(outcome=outcome), TemporaryDirectory() as temporary:
                events = []
                with self.assertRaisesRegex(AssertionError, error): self.run_journey(temporary, events, outcome)
                self.assertFalse(any(event[0] in ('Open session', 'reorder') for event in events))

    def test_additional_positive_rejection_fails_after_expected_original_refusal(self):
        with TemporaryDirectory() as temporary:
            events = []
            with self.assertRaisesRegex(AssertionError, 'Unexpected command rejection after original refusal'):
                self.run_journey(temporary, events, 'unexpected-positive-rejection')
            self.assertTrue(any(event[0] == 'Open session' for event in events))


if __name__ == '__main__':
    unittest.main()
