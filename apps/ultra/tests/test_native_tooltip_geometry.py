import unittest

from native_tooltip_geometry import covering_hover_plan


class CoveringHoverPlanTest(unittest.TestCase):
    def test_positions_real_lower_anchor_near_screen_edge(self):
        target = [888, 689, 45, 23]
        anchor = [742, 718, 290, 14]
        plan = covering_hover_plan(target, anchor, 1600, 1000)
        self.assertEqual(plan, {'shift_y': 266, 'point': (910, 996), 'target': (910, 966)})

    def test_refuses_unusable_or_offscreen_targets(self):
        with self.assertRaises(ValueError):
            covering_hover_plan([888, 689, 45, 23], [742, 680, 290, 10], 1600, 1000)
        with self.assertRaises(ValueError):
            covering_hover_plan([1700, 689, 45, 23], [742, 718, 290, 14], 1600, 1000)


if __name__ == '__main__':
    unittest.main()
