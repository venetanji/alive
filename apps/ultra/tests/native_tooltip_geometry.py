"""Place a real lower hover anchor near the edge of the private X display."""


def covering_hover_plan(target_rect, anchor_rect, screen_width, screen_height):
    tx, ty, tw, th = target_rect
    ax, ay, aw, ah = anchor_rect
    if min(tw, th, aw, ah) < 3:
        raise ValueError('The target and tooltip anchor need visible rectangles')
    target_x, target_y = tx + tw // 2, ty + th // 2
    hover_x = max(ax + 1, min(target_x, ax + aw - 2))
    # The bottom edge can belong to the rack's horizontal scrollbar.
    hover_y = ay + 2
    shift_y = screen_height - 4 - hover_y
    shifted_target = (target_x, target_y + shift_y)
    if (hover_y <= target_y + 15 or not 0 <= hover_x < screen_width or
            not 0 <= shifted_target[0] < screen_width or
            not 0 <= shifted_target[1] < screen_height):
        raise ValueError('The lower hover anchor and target cannot fit the private display')
    return {'shift_y': shift_y, 'point': (hover_x, screen_height - 4), 'target': shifted_target}
