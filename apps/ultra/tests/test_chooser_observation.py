import unittest

from chooser_observation import find_web_ancestor, planned_hit_path


class Node:
    def __init__(self, name, role='button', parent=None, child=None):
        self.name, self.role, self.parent, self.child = name, role, parent, child
    def get_name(self): return self.name
    def get_role_name(self): return self.role
    def get_parent(self): return self.parent


class ChooserObservationTest(unittest.TestCase):
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

if __name__ == '__main__':
    unittest.main()
