import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

import desktop_process_helpers as helpers

class ProcessHelpersTest(unittest.TestCase):
    def test_process_identity_compares_real_launch_and_restart_mappings(self):
        processes = []
        try:
            with tempfile.TemporaryDirectory() as directory:
                alias = Path(directory) / 'alive'
                alias.symlink_to(Path(sys.executable).resolve())
                config = Path(__file__).with_name('desktop_launch_config.sh')
                resolved = subprocess.check_output(['bash', '-c', 'source "$1"; desktop_alive_binary "$2"',
                                                    'test', str(config), str(alias)], text=True).strip()
                for _ in range(2):
                    process = subprocess.Popen([resolved, '-c', 'import time; time.sleep(30)'])
                    processes.append(process)
                    time.sleep(.2)
                first, second = (helpers.process_identity(p.pid, 'libc.so') for p in processes)
                self.assertEqual(first['executable_path'], resolved)
                helpers.assert_same_identity(first, second)
                second['libraries'][0]['sha256'] = 'changed'
                with self.assertRaises(AssertionError):
                    helpers.assert_same_identity(first, second)
        finally:
            for process in processes:
                process.kill()
                process.wait()

    def test_hung_recorder_is_killed_and_cleanup_keeps_original_error(self):
        recorder = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(30)'], stdin=subprocess.PIPE)
        calls = []
        try:
            try:
                raise ValueError('journey failure')
            finally:
                errors = helpers.cleanup_independently([
                    lambda: helpers.stop_recorder(recorder, timeout=.05),
                    lambda: (_ for _ in ()).throw(RuntimeError('cleanup failure')),
                    lambda: calls.append('remaining cleanup'),
                ])
        except ValueError as error:
            self.assertEqual(str(error), 'journey failure')
        else:
            self.fail('original failure was lost')
        finally:
            if recorder.poll() is None:
                recorder.kill()
                recorder.wait()
        self.assertIsNotNone(recorder.poll())
        self.assertEqual(calls, ['remaining cleanup'])
        self.assertEqual(len(errors), 2)

if __name__ == '__main__': unittest.main()
