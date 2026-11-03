"""Bound chooser observations between synchronous accessibility calls.

An individual external accessibility call can still block beyond the time budget.
"""
import time


def hit_path_owns(result, name):
    """Require a complete observed path containing the intended accessible."""
    return result.get('status') == 'complete' and any(item.get('name') == name for item in result.get('path', ()))


def find_unique_showing_web(root, showing, target_name, max_nodes=4096, max_depth=32, seconds=.75, clock=time.monotonic):
    """Require one showing document and one named target in a complete bounded traversal."""
    deadline = clock() + seconds
    pending = [(root, 0, False)]
    count = 0
    found = None
    targets = 0
    try:
        while pending:
            if clock() >= deadline:
                return None, {'status': 'truncated', 'reason': 'time_limit', 'nodes': count}
            if count >= max_nodes:
                return None, {'status': 'truncated', 'reason': 'node_limit', 'nodes': count}
            node, depth, inside_web = pending.pop()
            if node is None:
                return None, {'status': 'unavailable', 'reason': 'null_child', 'nodes': count}
            count += 1
            if node.get_role_name() == 'document web' and node.get_state_set().contains(showing):
                if found is not None:
                    return None, {'status': 'unavailable', 'reason': 'multiple_web_documents', 'nodes': count}
                found = node
                inside_web = True
            if inside_web and node.get_name() == target_name:
                targets += 1
                if targets > 1:
                    return None, {'status': 'unavailable', 'reason': 'multiple_targets', 'nodes': count}
            children = node.get_child_count()
            if children < 0:
                return None, {'status': 'unavailable', 'reason': 'invalid_child_count', 'nodes': count}
            if children and depth >= max_depth:
                return None, {'status': 'truncated', 'reason': 'depth_limit', 'nodes': count}
            if count + len(pending) + children > max_nodes:
                return None, {'status': 'truncated', 'reason': 'node_limit', 'nodes': count}
            for index in range(children):
                if clock() >= deadline:
                    return None, {'status': 'truncated', 'reason': 'time_limit', 'nodes': count}
                pending.append((node.get_child_at_index(index), depth + 1, inside_web))
        if found is None:
            return None, {'status': 'unavailable', 'reason': 'no_showing_web_document', 'nodes': count}
        if targets != 1:
            return None, {'status': 'unavailable', 'reason': 'no_target', 'nodes': count}
        return found, {'status': 'complete', 'nodes': count}
    except Exception as error:
        return None, {'status': 'unavailable', 'error_type': type(error).__name__, 'nodes': count}


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
