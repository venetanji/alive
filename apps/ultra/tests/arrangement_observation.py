"""Read opt-in native evidence; never issue commands or infer renderer state."""
from collections import deque
import json
from pathlib import Path
import time


class ArrangementTrace:
    def __init__(self, path):
        self.path = Path(path)
        self.offset = 0
        self.partial = ''
        self.records = deque()

    def _read(self):
        with self.path.open() as source:
            source.seek(self.offset)
            text = self.partial + source.read()
            self.offset = source.tell()
        lines = text.split('\n')
        self.partial = lines.pop()
        for line in lines:
            if line.startswith('ALIVE_ARRANGEMENT '):
                self.records.append(json.loads(line.removeprefix('ALIVE_ARRANGEMENT ')))

    def checkpoint(self):
        self._read()
        self.records.clear()

    def wait(self, predicate, description, seconds=8):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            self._read()
            while self.records:
                record = self.records.popleft()
                if predicate(record):
                    return record
            time.sleep(.02)
        raise AssertionError('Missing ' + description)

    def wait_action(self, kind, seconds=8, expected=None):
        request = self.wait(lambda r: r['kind'] == 'request',
                            'native ' + kind + ' request', seconds)
        assert request['action']['kind'] == kind and (expected is None or request['action'] == expected), (
            f'Unexpected native action: wanted {expected or kind}, observed {request}')
        receipt = self.wait(lambda r: r['kind'] == 'receipt' and
                            r['generation'] == request['generation'] and
                            r['receipt']['kind'] == kind and
                            r['receipt']['preparationRevision'] == request['preparationRevision'],
                            'native ' + kind + ' receipt', seconds)
        return {'request': request, 'receipt': receipt}

    def wait_track(self, action, track_id, expected, seconds=8):
        request, receipt = action['request'], action['receipt']['receipt']

        def matches(record):
            if (record['kind'] != 'snapshot' or record['generation'] != request['generation'] or
                    record['preparationRevision'] != receipt['preparationRevision']):
                return False
            applied = any(r['preparationRevision'] == receipt['preparationRevision'] and
                          r['requestSerial'] == receipt['requestSerial'] and r['status'] == 'applied'
                          for r in record['runtime']['requests'])
            return applied and any(t['trackId'] == track_id and
                                   all(key in t and t[key] == value for key, value in expected.items())
                                   for t in record['runtime']['tracks'])

        return self.wait(matches, 'coherent native track ' + track_id, seconds)

    def wait_return_gap(self, action, track_id, sibling_id, sibling_source, seconds=8):
        request, receipt = action['request'], action['receipt']['receipt']
        assert request['action'] == {'kind': 'return', 'trackIds': [track_id]}, request
        member = next(m for m in receipt['members'] if m['trackId'] == track_id)
        bit = 1 << member['trackIndex']

        def correlated(record):
            if (record['kind'] != 'snapshot' or record['generation'] != request['generation'] or
                    record['preparationRevision'] != receipt['preparationRevision']):
                return None
            return next((r for r in record['runtime']['requests']
                         if r['requestSerial'] == receipt['requestSerial'] and
                         r['preparationRevision'] == receipt['preparationRevision']), None)

        def track(record, identity):
            return next(t for t in record['runtime']['tracks'] if t['trackId'] == identity)

        pending = self.wait(lambda r: (q := correlated(r)) is not None and q['status'] == 'pending',
                            'pending native Return snapshot', seconds)
        queued = correlated(pending)
        target = int(queued['targetFrame'])
        current = int(pending['state']['absoluteFrame'])
        own = track(pending, track_id)
        assert queued['pendingMask'] & bit and own['pendingAction'] == 'return', pending
        assert own['pendingSerial'] == receipt['requestSerial'] and int(own['pendingFrame']) == target, pending
        assert current <= target, pending
        target_position = int(pending['state']['position']) + target - current
        loop = pending['songLoop']
        if loop['enabled']:
            # Match score compilation's positive frame rounding, including loop wrap.
            begin = int(loop['startBeats'] * 48000 * 60 / pending['tempo'] + .5)
            end = int(loop['endBeats'] * 48000 * 60 / pending['tempo'] + .5)
            if target_position >= end:
                target_position = begin + (target_position - end) % (end - begin)
        gaps = next(g['intervals'] for g in pending['gapBounds'] if g['trackId'] == track_id)
        gap = next(([int(g['startFrame']), int(g['endFrame'])] for g in gaps
                    if int(g['startFrame']) <= target_position < int(g['endFrame'])), None)
        assert gap is not None, f'Return target outside compiled gap: absolute={target}, position={target_position}, gaps={gaps}'
        gap_end_absolute = target + gap[1] - target_position

        def applied_inside_gap(record):
            observed = correlated(record)
            if observed is None or observed['status'] in ('queued', 'pending'):
                return False
            assert observed['status'] == 'applied' and observed['appliedMask'] & bit, observed
            absolute, position = int(record['state']['absoluteFrame']), int(record['state']['position'])
            assert absolute < gap_end_absolute, f'Return gap observation missed: target={target}, gapEnd={gap_end_absolute}, observed={absolute}'
            assert target <= absolute and gap[0] <= position < gap[1], record
            own, sibling = track(record, track_id), track(record, sibling_id)
            silent = all(key in own and own[key] is None for key in
                         ('activeSourceId', 'activePlacementId', 'activeSlotId'))
            assert record['state']['playing'] and own['authority'] == 'arrangement' and silent, (
                f'native Return mismatch inside gap: {json.dumps(record)}')
            assert sibling['authority'] == 'session' and sibling['activeSourceId'] == sibling_source, sibling
            return True

        applied = self.wait(applied_inside_gap, 'applied native Return inside its target gap', seconds)
        return {'request': action, 'targetPositionFrame': target_position,
                'gapFrames': gap, 'gapEndAbsoluteFrame': gap_end_absolute,
                'pending': pending, 'applied': applied}
