"""Regressions for observing short Arrangement states without native injection."""
import copy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from arrangement_observation import ArrangementTrace


REQUEST = {'kind': 'request', 'generation': 1, 'preparationRevision': '7',
           'action': {'kind': 'seek', 'beat': 9.6}}
RECEIPT = {'kind': 'receipt', 'generation': 1,
           'receipt': {'kind': 'seek', 'preparationRevision': '7',
                       'requestSerial': '2', 'status': 'queued'}}


def snapshot(sequence, position, source, placement, *, status='applied', revision='7', serial='2'):
    return {'kind': 'snapshot', 'generation': 1, 'preparationRevision': revision,
            'snapshotSequence': str(sequence),
            'state': {'playing': 1, 'absoluteFrame': str(position + 360000), 'position': str(position)},
            'runtime': {'requests': [{'preparationRevision': revision, 'requestSerial': serial,
                                      'status': status}],
                        'tracks': [{'trackId': 'track-1', 'authority': 'arrangement',
                                    'activeSourceId': source, 'activePlacementId': placement}]}}


class ArrangementObservationTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name, 'app.log')
        self.path.touch()
        self.trace = ArrangementTrace(self.path)

    def append(self, *records):
        with self.path.open('a') as output:
            for record in records:
                output.write('ALIVE_ARRANGEMENT ' + json.dumps(record) + '\n')

    def test_late_reads_cannot_combine_source_and_placement_from_different_snapshots(self):
        self.append(REQUEST, RECEIPT,
                    snapshot(1, 249000, 'other-source', 'authored-placement'),
                    snapshot(2, 250000, 'authored-source', 'other-placement'))
        action = self.trace.wait_action('seek', seconds=.05)
        expected = {'activeSourceId': 'authored-source', 'activePlacementId': 'authored-placement'}
        with self.assertRaisesRegex(AssertionError, 'coherent native track'):
            self.trace.wait_track(action, 'track-1', expected, seconds=.05)
        good = snapshot(3, 251000, 'authored-source', 'authored-placement')
        self.append(good)
        self.assertEqual(self.trace.wait_track(action, 'track-1', expected, seconds=.05), good)

    def test_observation_requires_the_same_generation_preparation_and_applied_request(self):
        expected = {'activeSourceId': 'authored-source', 'activePlacementId': 'authored-placement'}
        wrong_generation = snapshot(1, 249000, 'authored-source', 'authored-placement')
        wrong_generation['generation'] = 2
        self.append(REQUEST, RECEIPT, wrong_generation,
                    snapshot(2, 249000, 'authored-source', 'authored-placement', revision='8'),
                    snapshot(3, 249000, 'authored-source', 'authored-placement', serial='3'),
                    snapshot(4, 249000, 'authored-source', 'authored-placement', status='pending'))
        action = self.trace.wait_action('seek', seconds=.05)
        with self.assertRaisesRegex(AssertionError, 'coherent native track'):
            self.trace.wait_track(action, 'track-1', expected, seconds=.05)
        good = snapshot(5, 250000, 'authored-source', 'authored-placement')
        self.append(good)
        self.assertEqual(self.trace.wait_track(action, 'track-1', expected, seconds=.05), good)

    def test_partial_log_write_and_queued_receipt_do_not_lose_the_apply_snapshot(self):
        good = snapshot(1, 250000, 'authored-source', 'authored-placement')
        self.append(REQUEST, RECEIPT)
        line = 'ALIVE_ARRANGEMENT ' + json.dumps(good) + '\n'
        with self.path.open('a') as output:
            output.write(line[:40])
        action = self.trace.wait_action('seek', seconds=.05)
        with self.path.open('a') as output:
            output.write(line[40:])
        self.assertEqual(self.trace.wait_track(action, 'track-1',
                         {'activeSourceId': 'authored-source'}, seconds=.05), good)

    def test_missing_native_identity_fields_cannot_be_reported_as_gap_silence(self):
        incomplete = snapshot(1, 210000, None, None)
        del incomplete['runtime']['tracks'][0]['activeSourceId']
        del incomplete['runtime']['tracks'][0]['activePlacementId']
        self.append(REQUEST, RECEIPT, incomplete)
        action = self.trace.wait_action('seek', seconds=.05)
        with self.assertRaisesRegex(AssertionError, 'coherent native track'):
            self.trace.wait_track(action, 'track-1',
                                  {'activeSourceId': None, 'activePlacementId': None}, seconds=.05)

    def test_unintended_scene_dispatch_cannot_be_ignored_before_a_later_seek(self):
        self.append({**REQUEST, 'action': {'kind': 'scene', 'slot': 2}}, REQUEST, RECEIPT)
        with self.assertRaisesRegex(AssertionError, 'Unexpected native action'):
            self.trace.wait_action('seek', seconds=.05)

    def test_seek_receipt_must_match_the_requested_beat(self):
        self.append(REQUEST, RECEIPT)
        with self.assertRaisesRegex(AssertionError, 'Unexpected native action'):
            self.trace.wait_action('seek', expected={'kind': 'seek', 'beat': 4.1}, seconds=.05)

    def return_evidence(self, *, target_position=205714, applied_source=None):
        request = {**REQUEST, 'action': {'kind': 'return', 'trackIds': ['track-1']}}
        receipt = copy.deepcopy(RECEIPT)
        receipt['receipt'].update(kind='return', members=[{'trackId': 'track-1', 'trackIndex': 0}])
        pending = snapshot(10, 200000, None, None, status='pending')
        target = 1000000 + target_position - 200000
        pending['state'].update(absoluteFrame='1000000', position='200000')
        pending['runtime']['requests'][0].update(targetFrame=str(target), pendingMask=1, appliedMask=0)
        pending['runtime']['tracks'][0].update(authority='session', activeSlotId=None,
                                               pendingAction='return', pendingSerial='2', pendingFrame=str(target))
        pending['tempo'] = 112
        pending['songLoop'] = {'enabled': True, 'startBeats': 2, 'endBeats': 16}
        pending['gapBounds'] = [{'trackId': 'track-1', 'intervals': [
            {'startFrame': '205714', 'endFrame': '244286'},
            {'startFrame': '308571', 'endFrame': '321429'},
            {'startFrame': '385714', 'endFrame': '411429'}]}]
        pending['runtime']['tracks'].append({'trackId': 'track-2', 'authority': 'session',
                                             'activeSourceId': 'harmony'})
        applied = copy.deepcopy(pending)
        applied['snapshotSequence'] = '11'
        applied['state'].update(absoluteFrame=str(target + 286), position=str(target_position + 286))
        applied['runtime']['requests'][0].update(status='applied', pendingMask=0, appliedMask=1)
        applied['runtime']['tracks'][0].update(authority='arrangement', activeSourceId=applied_source,
                                               pendingAction=None, pendingSerial=None, pendingFrame=None)
        return request, receipt, pending, applied

    def test_return_requires_pending_and_applied_in_the_target_gap_occurrence(self):
        request, receipt, pending, applied = self.return_evidence()
        self.append(request, receipt, pending, applied)
        action = self.trace.wait_action('return', seconds=.05)
        evidence = self.trace.wait_return_gap(action, 'track-1', 'track-2', 'harmony', seconds=.05)
        self.assertEqual(evidence['targetPositionFrame'], 205714)
        self.assertEqual(evidence['gapFrames'], [205714, 244286])
        self.assertEqual(evidence['pending'], pending)
        self.assertEqual(evidence['applied'], applied)

    def test_return_at_loop_end_is_outside_gap_even_when_a_later_gap_is_silent(self):
        request, receipt, pending, applied = self.return_evidence(target_position=411429)
        applied['state']['position'] = '210000'
        self.append(request, receipt, pending, applied)
        action = self.trace.wait_action('return', seconds=.05)
        with self.assertRaisesRegex(AssertionError, 'target outside compiled gap'):
            self.trace.wait_return_gap(action, 'track-1', 'track-2', 'harmony', seconds=.05)

    def test_return_observation_after_target_gap_is_missed_not_a_pass_on_the_next_loop(self):
        request, receipt, pending, applied = self.return_evidence()
        applied['state'].update(absoluteFrame='1400000', position='210000')
        self.append(request, receipt, pending, applied)
        action = self.trace.wait_action('return', seconds=.05)
        with self.assertRaisesRegex(AssertionError, 'gap observation missed'):
            self.trace.wait_return_gap(action, 'track-1', 'track-2', 'harmony', seconds=.05)

    def test_native_source_inside_proven_gap_fails_before_any_later_correct_sample(self):
        request, receipt, pending, applied = self.return_evidence(applied_source='original-source')
        later = copy.deepcopy(applied)
        later['runtime']['tracks'][0]['activeSourceId'] = None
        self.append(request, receipt, pending, applied, later)
        action = self.trace.wait_action('return', seconds=.05)
        with self.assertRaisesRegex(AssertionError, 'native Return mismatch inside gap'):
            self.trace.wait_return_gap(action, 'track-1', 'track-2', 'harmony', seconds=.05)


if __name__ == '__main__':
    unittest.main()
