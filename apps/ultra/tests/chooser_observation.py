"""Bound chooser observations between synchronous accessibility calls.

An individual external accessibility call can still block beyond the time budget.
"""
import time


def hit_path_owns(result, name):
    """Require a complete observed path containing the intended accessible."""
    return result.get('status') == 'complete' and any(item.get('name') == name for item in result.get('path', ()))


def find_web_ancestor(node, max_nodes=32, seconds=.15, clock=time.monotonic):
    deadline = clock() + seconds
    count = 0
    operation = None
    try:
        while node is not None and count < max_nodes:
            operation = None
            if clock() >= deadline:
                return None, {'status': 'truncated', 'reason': 'time_limit', 'nodes': count}
            count += 1
            operation = 'get_role_name'
            if node.get_role_name() == 'document web':
                return node, {'status': 'complete', 'nodes': count}
            operation = 'get_parent'
            node = node.get_parent()
        if node is None:
            return None, {'status': 'unavailable', 'reason': 'no_web_ancestor', 'nodes': count}
        return None, {'status': 'truncated', 'reason': 'node_limit', 'nodes': count}
    except Exception as error:
        try:
            error_message = str(error)[:512]
        except Exception:
            error_message = '<exception message unavailable>'
        return None, {'status': 'unavailable', 'error_type': type(error).__name__, 'nodes': count,
                      'operation': operation, 'error_message': error_message}


def planned_hit_path(node, child_at_point, max_nodes=32, seconds=.15, clock=time.monotonic):
    deadline = clock() + seconds
    path = []
    try:
        while node is not None and len(path) < max_nodes:
            if clock() >= deadline:
                return {'status': 'truncated', 'reason': 'time_limit', 'path': path}
            path.append({'name': (node.get_name() or '')[:256], 'role': node.get_role_name()})
            child = child_at_point(node)
            if child is None or child == node:
                return {'status': 'complete', 'path': path}
            node = child
        return {'status': 'truncated', 'reason': 'node_limit', 'path': path}
    except Exception as error:
        return {'status': 'unavailable', 'error_type': type(error).__name__, 'path': path}
