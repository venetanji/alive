"""Collect one unambiguous set of named controls from a scoped frame."""


def scan_scoped_frames(apps, pid, scope, showing):
    frames = []
    for root in apps:
        if root is None:
            return None
        if root.get_process_id() != pid:
            continue
        for index in range(root.get_child_count()):
            frame = root.get_child_at_index(index)
            if frame is None:
                return None
            role = frame.get_role_name()
            if role != 'frame':
                continue
            if frame.get_process_id() != pid:
                return None
            if (frame.get_name().removeprefix('* ') == scope
                    and frame.get_state_set().contains(showing)):
                frames.append(frame)
    return frames


def scan_named_controls(frame, names):
    wanted = set(names)
    found = {}
    pending = [frame]
    while pending:
        node = pending.pop()
        if node is None:
            return None
        name = node.get_name()
        if name in wanted:
            if name in found:
                return None
            found[name] = node
        pending.extend(node.get_child_at_index(index) for index in range(node.get_child_count()))
    return found if len(found) == len(wanted) else None
