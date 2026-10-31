"""Check the shared-device owner fixture without loading desktop resources."""
import ast
import json
from pathlib import Path
import unittest


class ClipsFixtureTests(unittest.TestCase):
    def setUp(self):
        source = Path(__file__).with_name('check_alive_clips.py')
        tree = ast.parse(source.read_text())
        functions = [node for node in tree.body if isinstance(node, ast.FunctionDef)
                     and node.name == 'shared_owner_fixture']
        self.namespace = {'json': json}
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(source), 'exec'), self.namespace)
        root = Path(__file__).resolve().parents[3]
        self.document = json.loads((root / 'apps/alive/examples/two-instruments.alive').read_text())
        utility_session = json.loads((root / 'apps/alive/examples/midi-arrangement.alive').read_text())
        self.utility = utility_session['score']['tracks'][0]['effects'][0]

    def test_shared_owners_fit_three_roots_without_changing_musical_data_or_input(self):
        original = json.loads(json.dumps(self.document))
        fixture = self.namespace['shared_owner_fixture'](self.document)
        self.assertEqual(self.document, original)
        self.assertEqual(fixture['format'], 'alive-session-v6')
        score, previous = fixture['score'], original['score']
        self.assertEqual(score['format'], 'alive-session-v4')
        self.assertEqual(score['tracks'][0], previous['tracks'][0])
        self.assertIsNone(score['tracks'][1]['chain']['instrument'])
        self.assertEqual({key: value for key, value in score['tracks'][1].items() if key != 'chain'},
                         {key: value for key, value in previous['tracks'][1].items() if key != 'chain'})
        for source, before in zip(score['sources'], previous['sources']):
            self.assertEqual({key: value for key, value in source.items() if key != 'automation'},
                             {key: value for key, value in before.items() if key != 'automation'})
        self.assertEqual(score['sources'][0]['automation'], previous['sources'][0]['automation'])
        self.assertEqual(score['sources'][1]['automation'], [])
        self.assertEqual({key: value for key, value in score.items() if key not in ('tracks', 'sources')},
                         {key: value for key, value in previous.items() if key not in ('tracks', 'sources')})
        self.assertEqual(fixture['master'], original['master'])
        self.assertEqual(fixture['launch'], original['launch'])
        for track in score['tracks']:
            effect = {**self.utility, 'instanceId': f"{track['id']}-shared-utility"}
            track['effects'].append(effect)
        self.assertEqual(sum(bool(track['chain']['instrument']) + len(track['effects'])
                             for track in score['tracks']), 3)
        self.assertEqual(score['tracks'][0]['effects'][0]['path'], score['tracks'][1]['effects'][0]['path'])

    def test_only_removed_instrument_lanes_are_stripped_from_harmony_sources(self):
        harmony = self.document['score']['tracks'][1]
        harmony['effects'].append({**self.utility, 'instanceId': 'harmony-utility'})
        effect_lane = {'instanceId': 'harmony-utility', 'key': 'gain', 'enabled': True,
                       'points': [{'beat': 0, 'value': .65}]}
        self.document['score']['sources'][1]['automation'].append(effect_lane)
        extra_source = json.loads(json.dumps(self.document['score']['sources'][1]))
        extra_source['id'] = 'harmony-independent-source'
        self.document['score']['sources'].append(extra_source)
        fixture = self.namespace['shared_owner_fixture'](self.document)
        self.assertEqual(fixture['score']['tracks'][1]['effects'], harmony['effects'])
        for source in fixture['score']['sources'][1:]:
            self.assertEqual(source['automation'], [effect_lane])


if __name__ == '__main__':
    unittest.main()
