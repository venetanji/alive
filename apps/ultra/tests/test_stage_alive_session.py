import json
import tempfile
import unittest
from pathlib import Path

from stage_alive_session import stage


class StageSessionTest(unittest.TestCase):
    def test_bare_and_envelope_rebase_devices(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'device.ultra').write_text('{}')
            score = {'format': 'alive-session-v2', 'tracks': [{'device': {'path': 'device.ultra'}, 'effects': []}]}
            for session in (score, {'format': 'alive-session-v5', 'score': score, 'master': {'gain': 0.5}}):
                source, target = root / 'source.alive', root / 'target.alive'
                source.write_text(json.dumps(session))
                stage(source, target)
                staged = json.loads(target.read_text())
                staged_score = staged.get('score', staged)
                self.assertEqual(staged_score['tracks'][0]['device']['path'], str(root / 'device.ultra'))
                if 'master' in session:
                    self.assertEqual(staged['master'], {'gain': 0.5})


if __name__ == '__main__':
    unittest.main()
