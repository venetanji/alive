import json
import tempfile
import unittest
from pathlib import Path

from stage_alive_session import stage


class StageSessionTest(unittest.TestCase):
    def test_current_envelope_rebases_instruments_effects_and_audio(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'device.ultra').write_text('{}')
            (root / 'audio.wav').write_bytes(b'bounded WAV fixture')
            score = {'format': 'alive-session-v4', 'tracks': [
                {'chain': {'kind': 'midi', 'instrument': {'path': 'device.ultra'}},
                 'effects': [{'path': 'device.ultra'}]},
                {'chain': {'kind': 'midi', 'instrument': None}},
                {'chain': {'kind': 'audio'}, 'effects': []},
            ], 'sources': [{'kind': 'audio', 'file': {'path': 'audio.wav', 'frames': '12'}}]}
            session = {'format': 'alive-session-v6', 'score': score, 'master': {'gain': 0.5}}
            source, target = root / 'source.alive', root / 'target.alive'
            source.write_text(json.dumps(session))
            stage(source, target)
            staged = json.loads(target.read_text())
            chain = staged['score']['tracks'][0]['chain']
            self.assertEqual(chain['instrument']['path'], str(root / 'device.ultra'))
            self.assertEqual(staged['score']['tracks'][0]['effects'][0]['path'], str(root / 'device.ultra'))
            self.assertIsNone(staged['score']['tracks'][1]['chain']['instrument'])
            self.assertEqual(staged['score']['sources'][0]['file'],
                             {'path': str(root / 'audio.wav'), 'frames': '12'})
            self.assertEqual(staged['master'], {'gain': 0.5})

    def test_unsupported_envelopes_and_scores_are_rejected_without_output(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, target = root / 'source.alive', root / 'target.alive'
            current = {'format': 'alive-session-v4', 'tracks': [], 'sources': []}
            for session in (current, {'format': 'alive-session-v5', 'score': current},
                            {'format': 'alive-session-v6', 'score': {'format': 'alive-session-v3'}}):
                source.write_text(json.dumps(session))
                with self.subTest(format=session['format']), self.assertRaises(ValueError):
                    stage(source, target)
                self.assertFalse(target.exists())

    def test_missing_effect_does_not_write_a_partial_staged_document(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'instrument.ultra').write_text('{}')
            source, target = root / 'source.alive', root / 'target.alive'
            source.write_text(json.dumps({'format': 'alive-session-v6', 'score': {
                'format': 'alive-session-v4', 'sources': [], 'tracks': [{
                    'chain': {'kind': 'midi', 'instrument': {'path': 'instrument.ultra'}},
                    'effects': [{'path': 'missing.ultra'}],
                }],
            }}))
            with self.assertRaises(FileNotFoundError):
                stage(source, target)
            self.assertFalse(target.exists())


if __name__ == '__main__':
    unittest.main()
