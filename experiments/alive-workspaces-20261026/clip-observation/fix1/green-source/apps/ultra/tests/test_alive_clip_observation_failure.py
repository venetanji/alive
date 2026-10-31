"""Exercise the native regression's actual failure wrapper without a desktop."""

import ast
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest


SOURCE = Path(__file__).with_name('check_alive_clip_observation.py')


def execute_failure_wrapper(run, screenshot):
    tree = ast.parse(SOURCE.read_text(), filename=str(SOURCE))
    entrypoint = tree.body[-1]
    assert isinstance(entrypoint, ast.If)
    assert ast.unparse(entrypoint.test) == "__name__ == '__main__'"
    # Execute the source entrypoint itself without importing native GUI dependencies.
    wrapper = ast.Module(body=[entrypoint], type_ignores=[])
    exec(compile(wrapper, str(SOURCE), 'exec'), {
        '__name__': '__main__', 'run': run,
        'alive': SimpleNamespace(screenshot=screenshot),
    })


class ClipObservationFailureTests(unittest.TestCase):
    def test_screenshot_failure_preserves_identical_primary_exception(self):
        primary = AssertionError('original native observation failure')
        captures = []

        def fail_run():
            raise primary

        def fail_screenshot(name):
            captures.append(name)
            raise OSError('diagnostic capture unavailable')

        with self.assertRaises(Exception) as caught:
            execute_failure_wrapper(fail_run, fail_screenshot)
        self.assertIs(caught.exception, primary)
        self.assertEqual(captures, ['clip-observation-failure.png'])

    def test_successful_failure_screenshot_is_retained(self):
        primary = AssertionError('original native observation failure')

        def fail_run():
            raise primary

        with TemporaryDirectory() as directory:
            def screenshot(name):
                Path(directory, name).write_bytes(b'diagnostic capture')

            with self.assertRaises(Exception) as caught:
                execute_failure_wrapper(fail_run, screenshot)
            self.assertIs(caught.exception, primary)
            self.assertEqual(
                Path(directory, 'clip-observation-failure.png').read_bytes(),
                b'diagnostic capture')


if __name__ == '__main__':
    unittest.main()
