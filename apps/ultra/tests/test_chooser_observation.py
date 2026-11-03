import unittest

from chooser_observation import find_unique_showing_web, find_web_ancestor, planned_hit_path, hit_path_owns


class Node:
    def __init__(self, name, role='button', parent=None, child=None):
        self.name, self.role, self.parent, self.child = name, role, parent, child
    def get_name(self): return self.name
    def get_role_name(self): return self.role
    def get_parent(self): return self.parent


class ChooserObservationTest(unittest.TestCase):
    def test_unique_web_traversal_rejects_limits_nulls_and_stale_nodes(self):
        class Branch:
            def __init__(self, role, name='', children=(), showing=True):
                self.role, self.name, self.children, self.showing = role, name, children, showing
            def get_role_name(self): return self.role
            def get_name(self): return self.name
            def get_state_set(self): return self
            def contains(self, state): return self.showing
            def get_child_count(self): return len(self.children)
            def get_child_at_index(self, index): return self.children[index]
        target = Branch('button', 'Return all tracks to Arrangement')
        web = Branch('document web', children=[target])
        root = Branch('frame', children=[Branch('filler', children=[web])])
        name = target.name
        found, result = find_unique_showing_web(root, 1, name)
        self.assertIs(found, web)
        self.assertEqual(result['status'], 'complete')
        for limits, reason in (({'max_nodes': 2}, 'node_limit'), ({'max_depth': 1}, 'depth_limit'),
                               ({'seconds': 0}, 'time_limit')):
            with self.subTest(reason=reason):
                found, result = find_unique_showing_web(root, 1, name, **limits)
                self.assertIsNone(found)
                self.assertEqual(result['reason'], reason)
        for broken in (Branch('frame', children=[None]), Branch('document web', children=[target, target]),
                       Branch('frame', children=[web, Branch('document web', children=[target])])):
            found, result = find_unique_showing_web(broken, 1, name)
            self.assertIsNone(found)
            self.assertEqual(result['status'], 'unavailable')
        root.get_child_count = lambda: (_ for _ in ()).throw(RuntimeError('stale'))
        found, result = find_unique_showing_web(root, 1, name)
        self.assertIsNone(found)
        self.assertEqual(result['status'], 'unavailable')

    def test_unprintable_ancestor_error_keeps_unavailable_decision(self):
        class UnprintableError(Exception):
            def __str__(self):
                raise RuntimeError('exception formatting failed')
        for operation in ('get_role_name', 'get_parent'):
            with self.subTest(operation=operation):
                middle = Node('Transport', 'panel')
                def fail(): raise UnprintableError()
                setattr(middle, operation, fail)
                result, status = find_web_ancestor(Node('button', parent=middle))
                self.assertIsNone(result)
                self.assertEqual(status['status'], 'unavailable')
                self.assertEqual(status['error_type'], 'UnprintableError')
                self.assertEqual(status['nodes'], 2)
                self.assertEqual(status['operation'], operation)
                self.assertIsInstance(status['error_message'], str)
                self.assertGreater(len(status['error_message']), 0)
                self.assertLessEqual(len(status['error_message']), 512)

    def test_second_node_role_and_parent_errors_identify_the_failed_operation(self):
        class Error(Exception):
            pass
        for operation in ('get_role_name', 'get_parent'):
            with self.subTest(operation=operation):
                web = Node('document', 'document web')
                middle = Node('Transport', 'panel', parent=web)
                def fail(): raise Error('Accessible parent unavailable')
                setattr(middle, operation, fail)
                button = Node('Return all tracks to Arrangement', parent=middle)
                result, status = find_web_ancestor(button)
                self.assertIsNone(result)
                self.assertEqual(status, {'status': 'unavailable', 'error_type': 'Error', 'nodes': 2,
                    'operation': operation, 'error_message': 'Accessible parent unavailable'})

    def test_ancestor_error_message_is_bounded_without_changing_unavailable_decision(self):
        node = Node('button')
        def fail(): raise RuntimeError('x' * 1024)
        node.get_parent = fail
        result, status = find_web_ancestor(node)
        self.assertIsNone(result)
        self.assertEqual(status, {'status': 'unavailable', 'error_type': 'RuntimeError', 'nodes': 1,
            'operation': 'get_parent', 'error_message': 'x' * 512})

    def test_complete_ancestor_retains_original_success_metadata(self):
        web = Node('document', 'document web')
        middle = Node('Transport', 'panel', parent=web)
        button = Node('Return all tracks to Arrangement', parent=middle)
        result, status = find_web_ancestor(button)
        self.assertIs(result, web)
        self.assertEqual(status, {'status': 'complete', 'nodes': 3})

    def test_null_parent_retains_original_unavailable_reason(self):
        result, status = find_web_ancestor(Node('button'))
        self.assertIsNone(result)
        self.assertEqual(status, {'status': 'unavailable', 'reason': 'no_web_ancestor', 'nodes': 1})

    def test_ancestor_depth_limit_reports_truncation(self):
        web = Node('document', 'document web')
        middle = Node('middle', parent=web)
        button = Node('button', parent=middle)
        result, status = find_web_ancestor(button, max_nodes=2)
        self.assertIsNone(result)
        self.assertEqual(status['status'], 'truncated')
        self.assertEqual(status['reason'], 'node_limit')
        self.assertEqual(status['nodes'], 2)

    def test_hit_depth_limit_does_not_claim_complete(self):
        leaf = Node('button')
        middle = Node('middle', child=leaf)
        web = Node('document', 'document web', child=middle)
        result = planned_hit_path(web, lambda node: node.child, max_nodes=2)
        self.assertEqual([row['name'] for row in result['path']], ['document', 'middle'])
        self.assertEqual(result['status'], 'truncated')
        self.assertEqual(result['reason'], 'node_limit')

    def test_failure_and_time_budget_are_explicit(self):
        node = Node('document', 'document web')
        def fail(_): raise RuntimeError('unavailable')
        failed = planned_hit_path(node, fail)
        self.assertEqual(failed['status'], 'unavailable')
        self.assertEqual(failed['error_type'], 'RuntimeError')
        ticks = iter([0, 1])
        result, status = find_web_ancestor(node, seconds=.1, clock=lambda: next(ticks))
        self.assertIsNone(result)
        self.assertEqual(status['status'], 'truncated')
        self.assertEqual(status['reason'], 'time_limit')

    def test_complete_path_stops_at_leaf(self):
        leaf = Node('Replace Harmony device')
        web = Node('document', 'document web', child=leaf)
        result = planned_hit_path(web, lambda node: node.child)
        self.assertEqual(result['status'], 'complete')
        self.assertEqual(result['path'][-1]['name'], 'Replace Harmony device')

    def test_only_complete_hit_paths_with_the_target_admit_input(self):
        path = [{'name': 'document', 'role': 'document web'}, {'name': 'Stop Pulse track', 'role': 'push button'}]
        self.assertTrue(hit_path_owns({'status': 'complete', 'path': path}, 'Stop Pulse track'))
        self.assertFalse(hit_path_owns({'status': 'truncated', 'path': path}, 'Stop Pulse track'))
        self.assertFalse(hit_path_owns({'status': 'complete', 'path': path}, 'Return Pulse to Arrangement'))

if __name__ == '__main__':
    unittest.main()
