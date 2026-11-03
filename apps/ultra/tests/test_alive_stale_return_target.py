"""Regression for stale AT-SPI ancestry before native Return-all input."""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest
from chooser_observation import find_web_ancestor, planned_hit_path

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
        frame=Frame()
        class Node:
            def __init__(self, name, role): self.name, self.role = name, role
            def get_name(self): return self.name
            def get_role_name(self): return self.role
        web=Node('Alive document', 'other' if outcome == 'no_web' else 'document web')
        leaf=Node('Wrong control' if outcome == 'wrong_target' else NAME, 'push button')
        def child_at_point(node, *args):
            events.append(('hit',node))
            if outcome == 'incomplete': raise GError('stale hit')
            return web if node is frame else leaf if node is web else None
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
        namespace={'ui':FakeUI,'windows':SimpleNamespace(scope='Alive',app_frames=lambda:[frame]),
            'MAIN':'Alive','Atspi':SimpleNamespace(Component=component,CoordType=SimpleNamespace(SCREEN=0),
                StateType=SimpleNamespace(SHOWING=1)), 'GLib':SimpleNamespace(GError=GError),
            'time':SimpleNamespace(monotonic=now,sleep=lambda _:None),
            'prepare_workspace_control':lambda _:None,'owned_frame_window':lambda:100,
            'reorder_point':lambda _:([-120,-100,20,20],(-110,-90)) if outcome == 'offscreen' else ([10,20,20,20],(20,30)), 'native_hit_path':hit,
            'find_web_ancestor':find_web_ancestor,
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
    def test_wrong_target_owner_process_and_offscreen_are_blocked(self):
        for outcome in ('wrong_target','wrong_owner','wrong_process','offscreen','no_web','incomplete','other_error'):
            with self.subTest(outcome=outcome):
                result,events,records=self.exercise(outcome)
                self.assertIsNone(result)
                self.assertEqual([e for e in events if e[0]=='button'],[])
                self.assertEqual(records[-1][1]['presses'],0)
                self.assertEqual(records[-1][1]['releases'],0)

if __name__ == '__main__': unittest.main(verbosity=2)
