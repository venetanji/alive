#!/usr/bin/env python3
"""Independent raw-record audit; does not invoke any native process."""
import collections
import json
import math
from pathlib import Path
import sys

p = Path(sys.argv[1])
r = json.loads((p / 'native-session-report.json').read_text())
def records(name):
    return [json.loads(line) for line in (p / name).read_text().splitlines()]
rows = records('sustained-playing.jsonl')
credited = [row for row in rows if row['credited_seconds'] > 1e-10]
invalid = [row for row in credited if not (
    row['running'] and row['previous_running'] and row['action'] == row['previous_action']
    and row['frame'] > row['previous_frame'] and 0 < row['elapsed_seconds'] <= 2.5
    and row['credited_seconds'] <= min(row['elapsed_seconds'], (row['frame'] - row['previous_frame']) / row['rate']) + 1e-8)]
growth = r['pilot_growth']
begin, end, finished, final = (growth[name] for name in ('cycle_begin', 'cycle_end', 'capture_end', 'final'))
actions = records('sustained-actions.jsonl')
cycle_actions = [row for row in actions if begin['monotonic'] <= row['monotonic'] <= end['monotonic']]
categories = collections.Counter(row['control'] for row in cycle_actions)
gaps = collections.Counter(row.get('reason', row.get('kind')) for row in records('sustained-gaps.jsonl'))
epochs = [row for row in records('sustained-epochs.jsonl') if 'epoch_id' in row]
fields = ('native_render_failures', 'invalid_callback_shape', 'cpal_error_total', 'cpal_xrun_reports', 'cpal_non_xrun_reports', 'over_buffer_budget_count')
totals = {name: sum(int(row['metrics'][name]) for row in epochs) for name in fields}
samples = records('sustained-resources.jsonl')
cycle_playing = end['playing_seconds'] - begin['playing_seconds']
fixed_playing = r['playing_seconds_conservative'] - cycle_playing
scale = max(0, 1800 - fixed_playing) / cycle_playing * 1.1
cycle_wall = end['monotonic'] - begin['monotonic']
capture = r['endurance']['supervision']
collector_wall = r['stream_measurement']['wall_seconds']
independent = {
    'wall_seconds': capture['wall_seconds'] - cycle_wall + cycle_wall * scale,
    'collector_wall_seconds': collector_wall - cycle_wall + cycle_wall * scale,
    'audio_bytes': math.ceil(begin['audio_bytes'] + finished['audio_bytes'] - end['audio_bytes'] + (end['audio_bytes'] - begin['audio_bytes']) * scale),
    'metadata_bytes': math.ceil(begin['metadata_bytes'] + final['metadata_bytes'] - end['metadata_bytes'] + (end['metadata_bytes'] - begin['metadata_bytes']) * scale),
    'epoch_attempts': math.ceil(begin['epoch_attempts'] + final['epoch_attempts'] - end['epoch_attempts'] + (end['epoch_attempts'] - begin['epoch_attempts']) * scale),
}
reported = r['projection_1800']
assert all(abs(reported[k] - value) < 1e-5 for k, value in independent.items()), (reported, independent)
assert not invalid, invalid[:3]
assert [int(row['epoch_id']) for row in epochs] == list(range(1, len(epochs) + 1))
assert len(epochs) == r['stream_measurement']['completed_epochs']
assert not any(totals[name] for name in fields[:-1]), totals
assert r['stream_measurement']['complete'] and r['quit_discard_exited']
assert r['stream_measurement']['last_diagnostics']['native_quiescent']
assert capture['complete'] and capture['reason'] == 'requested_stop'
output = {'credited_rows': len(credited), 'invalid_credited_rows': len(invalid),
          'max_credited_gap': max((row['elapsed_seconds'] for row in credited), default=0),
          'playing_target_total': r['playing_seconds_conservative'], 'cycle_window_playing': cycle_playing,
          'fixed_playing': fixed_playing, 'cycles': r['edit_transport_cycles'], 'cycle_actions': len(cycle_actions),
          'actions_per_proven_minute': len(cycle_actions) * 60 / r['playing_seconds_conservative'],
          'action_categories': dict(categories), 'gap_counts': dict(gaps), 'epoch_totals': totals,
          'epoch_count': len(epochs), 'capture': capture, 'collector_wall': collector_wall,
          'setup_tail_wall': collector_wall - cycle_wall, 'cycle_wall': cycle_wall,
          'growth': growth, 'independent_projection': independent, 'reported_projection': reported,
          'resource_rows': len(samples), 'maximum_sample_delay': max((row['sampling_delay'] for row in samples), default=0),
          'maximum_sample_duration': max((row['sampling_duration'] for row in samples), default=0),
          'maximum_missed_cadences': max((row['missed_cadences'] for row in samples), default=0),
          'resource_label_limit': 'action ordinal and playing seconds are unsynchronized best-effort labels; no exact event causality is claimed',
          'physical_underruns': None}
print(json.dumps(output, indent=2))
