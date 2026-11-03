"""Regression for stale AT-SPI ancestry before native Return-all input."""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest
from chooser_observation import find_web_ancestor, planned_hit_path
import chooser_observation

NAME = 'Return all tracks to Arrangement'

class StaleReturnTargetTests(unittest.TestCase):
    def exercise(self, outcome):
        path = Path(__file__).with_name('check_alive_desktop.py')
        function = next(n for n in ast.parse(path.read_text()).body
                        if isinstance(n, ast.FunctionDef) and n.name == 'native_control_click')
        events=[]; records=[]; ticks=[0.]
        def now(): ticks[0] += .03; return ticks[0]
        class GError(Exception): pass
        class Frame:
            def get_name(self): return 'Alive'
            def get_role_name(self): return 'frame'
            def get_process_id(self): return 2 if outcome == 'wrong_process' else 1
            def get_state_set(self): return SimpleNamespace(contains=lambda _: True)
            def get_child_count(self): return 1
            def get_child_at_index(self, index): return filler1
        frame=Frame()
        class Node:
            def __init__(self, name, role, children=()): self.name, self.role, self.children = name, role, children
            def get_name(self): return self.name
            def get_role_name(self): return self.role
            def get_state_set(self): return SimpleNamespace(contains=lambda _: outcome != 'hidden_doc')
            def get_child_count(self):
                if outcome == 'stale_tree' and self.role == 'filler': raise GError('stale subtree')
                return len(self.children)
            def get_child_at_index(self, index): return self.children[index]
        # This web/leaf pair is the retained local Return-all AT-SPI hit path.
        web=Node('MIDI Arrangement - Alive', 'other' if outcome == 'no_web' else 'document web')
        role = {'local_button': 'button', 'wrong_toggle': 'toggle button',
                'wrong_menu': 'menu item'}.get(outcome, 'push button')
        leaf=Node('Wrong control' if outcome == 'wrong_target' else NAME, role)
        web.children = [leaf, Node(NAME, 'button')] if outcome == 'duplicate_target' else [leaf]
        other_web=Node('Other document', 'document web')
        filler2=Node('', 'filler', [web, other_web] if outcome == 'duplicate_doc' else [web])
        filler1=Node('', 'filler', [filler2])
        def child_at_point(node, *args):
            events.append(('hit',node))
            if outcome == 'incomplete': raise GError('stale hit')
            return filler1 if node is frame else filler2 if node is filler1 else leaf if node is web else None
        component=SimpleNamespace(grab_focus=lambda _: True, get_accessible_at_point=child_at_point)
        class StaleParent:
            def get_role_name(self):
                raise GError('other error' if outcome == 'other_error' else
                    'atspi_error: Object does not exist at path “/org/a11y/atspi/accessible/stale” (1)')
        class Target:
            def get_role_name(self): return 'push button'
            def get_parent(self): return StaleParent()
        control=Target()
        class FakeUI:
            display=1;pid=1
            t=SimpleNamespace(XTestFakeMotionEvent=lambda *args: True,
                XTestFakeButtonEvent=lambda *args: events.append(('button',args[2])) or True)
            x=SimpleNamespace(XFlush=lambda *args: None)
            wait_for=staticmethod(lambda name: control)
            find=staticmethod(lambda name: control)
        def hit(*point): return [1] if outcome == 'offscreen' else [1,200 if outcome == 'wrong_owner' else 100]
        def record(action, **data): records.append((action,data));return data
        rect_calls=[0]; owner_calls=[0]; frame_calls=[0]; replacement=Frame()
        def point(control):
            rect_calls[0] += 1
            if outcome == 'offscreen': return ([-120,-100,20,20],(-110,-90))
            if outcome == 'moving_target' and rect_calls[0] % 2 == 0: return ([11,20,20,20],(21,30))
            return ([10,20,20,20],(20,30))
        def owner():
            owner_calls[0] += 1
            return 200 if outcome == 'owner_changed' and owner_calls[0] > 1 else 100
        def frames():
            frame_calls[0] += 1
            return [replacement if outcome == 'frame_changed' and frame_calls[0] % 2 == 0 else frame]
        namespace={'ui':FakeUI,'windows':SimpleNamespace(scope='Alive',app_frames=frames),
            'MAIN':'Alive','Atspi':SimpleNamespace(Component=component,CoordType=SimpleNamespace(SCREEN=0),
                StateType=SimpleNamespace(SHOWING=1)), 'GLib':SimpleNamespace(GError=GError),
            'time':SimpleNamespace(monotonic=now,sleep=lambda _:None),
            'prepare_workspace_control':lambda _:None,'owned_frame_window':owner,
            'reorder_point':point, 'native_hit_path':hit,
            'find_web_ancestor':find_web_ancestor,
            'find_unique_showing_web':getattr(chooser_observation,'find_unique_showing_web',lambda *a: (None, {'status':'unavailable'})),
            'planned_hit_path':planned_hit_path,'hit_path_owns':lambda hit,name: hit['status']=='complete' and any(x['name']==name for x in hit['path']),
            'input_record':record,'screenshot':lambda _:None}
        exec(compile(ast.Module(body=[function],type_ignores=[]),str(path),'exec'),namespace)
        try: result=namespace['native_control_click'](NAME,'reorder',require_accessible_hit=True)
        except AssertionError: result=None
        return result,events,records
    def test_fresh_frame_hit_reacquires_stale_parent(self):
        result, events, _ = self.exercise('valid')
        self.assertIsNotNone(result)
        self.assertEqual([e for e in events if e[0]=='button'], [('button',1),('button',0)])
        self.assertTrue(all(event[0]=='hit' for event in events[:events.index(('button',1))]))
    def test_retained_local_button_role_is_accepted(self):
        result, events, _ = self.exercise('local_button')
        self.assertIsNotNone(result)
        self.assertEqual([e for e in events if e[0]=='button'], [('button',1),('button',0)])
    def test_wrong_target_owner_process_and_offscreen_are_blocked(self):
        for outcome in ('wrong_target','wrong_owner','wrong_process','offscreen','no_web','incomplete','other_error','wrong_toggle','wrong_menu','duplicate_doc','duplicate_target','hidden_doc','stale_tree','moving_target','owner_changed','frame_changed'):
            with self.subTest(outcome=outcome):
                result,events,records=self.exercise(outcome)
                self.assertIsNone(result)
                self.assertEqual([e for e in events if e[0]=='button'],[])
                self.assertEqual(records[-1][1]['presses'],0)
                self.assertEqual(records[-1][1]['releases'],0)

if __name__ == '__main__': unittest.main(verbosity=2)
