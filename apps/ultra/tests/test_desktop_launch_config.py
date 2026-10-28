import os
from pathlib import Path
import subprocess
import unittest
import tempfile

HELPER = Path(__file__).with_name('desktop_launch_config.sh')

def run_function(function, argument=None, size=None):
    env = os.environ.copy()
    env.pop('ULTRA_TEST_SCREEN_SIZE', None)
    if size is not None:
        env['ULTRA_TEST_SCREEN_SIZE'] = size
    return subprocess.run(['bash', '-c', 'source "$1"; "$2" "${3-}"', 'test',
                           str(HELPER), function, argument or ''], env=env,
                          text=True, capture_output=True)

class DesktopLaunchConfigTest(unittest.TestCase):
    def test_default_and_valid_size(self):
        self.assertEqual(run_function('desktop_screen_size').stdout.strip(), '1280x840')
        self.assertEqual(run_function('desktop_screen_size', size='1600x1000').stdout.strip(), '1600x1000')
        self.assertEqual(run_function('desktop_screen_size', size='3840x2160').stdout.strip(), '3840x2160')

    def test_invalid_size_is_rejected(self):
        for size in ('', '1280x839', '1279x840', '3841x1000', '1600x2161', '1600x1000x24', '1;touch x', 'abc'):
            with self.subTest(size=size):
                self.assertNotEqual(run_function('desktop_screen_size', size=size).returncode, 0)

    def test_restart_binary_is_absolute_canonical_launch_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            executable = Path(directory) / 'alive'
            executable.write_text('#!/bin/sh\nexit 0\n')
            executable.chmod(0o755)
            alias = Path(directory) / 'alias'
            alias.symlink_to(executable)
            actual = run_function('desktop_alive_binary', str(alias))
            self.assertEqual(actual.returncode, 0)
            self.assertEqual(actual.stdout.strip(), str(executable.resolve()))

if __name__ == '__main__': unittest.main()
