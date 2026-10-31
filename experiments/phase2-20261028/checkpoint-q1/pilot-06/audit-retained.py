#!/usr/bin/env python3
"""Read-only independent audit of the original retained pilot records."""
import bisect
import collections
import hashlib
import json
import math
from pathlib import Path
import subprocess

p = Path('/home/venetanji/.codex/worktrees/bb01/alive/test-results/task9-pilot-06')
root = Path('/home/venetanji/.codex/worktrees/edd5/alive')
def sha(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()
def records(name):
    with (p / name).open() as f:
        return [json.loads(line) for line in f]
r = json.loads((p / 'native-session-report.json').read_text())
rows = records('sustained-playing.jsonl')
credits = [x for x in rows if x['credited_seconds'] > 0]
gaps = records('sustained-gaps.jsonl')
actions = records('sustained-actions.jsonl')
boundaries = sorted(x['monotonic'] for x in gaps + actions)
invalid = []
crossed = []
for x in credits:
    a, b = x['previous_monotonic'], x['monotonic']
    if not (x['running'] is True and x['previous_running'] is True and x['action'] == x['previous_action'] and x['frame'] > x['previous_frame'] and 0 < x['elapsed_seconds'] <= 2.5 and math.isclose(b-a, x['elapsed_seconds'], abs_tol=1e-8) and x['credited_seconds'] <= min(x['elapsed_seconds'], (x['frame']-x['previous_frame'])/x['rate'])+1e-8):
        invalid.append(x)
    i = bisect.bisect_right(boundaries, a)
    if i < len(boundaries) and boundaries[i] <= b:
        crossed.append(x)
assert not invalid and not crossed
whole = sum(x['credited_seconds'] for x in credits)
growth = r['pilot_growth']
def until(key):
    return sum(x['credited_seconds'] for x in credits if x['monotonic'] <= growth[key]['monotonic'])
for key in ('cycle_begin', 'cycle_end', 'capture_end', 'final'):
    assert math.isclose(until(key), growth[key]['playing_seconds'], abs_tol=1e-8)
assert math.isclose(whole, r['stream_measurement']['playing_seconds_proven'], abs_tol=1e-8)
cycle = until('cycle_end') - until('cycle_begin')
epochs = [x for x in records('sustained-epochs.jsonl') if 'epoch_id' in x]
assert [int(x['epoch_id']) for x in epochs] == list(range(1, 8))
assert all(x['final'] is True and x['state'] == 'finalized' and not x['failed'] for x in epochs)
fields = ('native_render_failures', 'invalid_callback_shape', 'cpal_error_total', 'cpal_xrun_reports', 'cpal_non_xrun_reports', 'over_buffer_budget_count', 'counter_overflow', 'clock_anomaly_count')
totals = {k: sum(int(x['metrics'][k]) for x in epochs) for k in fields}
assert all(int(x['metrics'][k]) == 0 for x in epochs for k in fields)
assert r['stream_measurement']['complete'] and r['stream_measurement']['last_diagnostics']['native_quiescent'] and r['quit_discard_exited']
assert r['endurance']['supervision']['complete'] and r['endurance']['supervision']['reason'] == 'requested_stop'
for key in ('epochs','gaps','actions','resources','playing'):
    entry = r['stream_measurement'][key]; f = Path(entry['path'])
    assert f.stat().st_size == entry['bytes'] and sha(f) == entry['sha256']
manifest = root / '.superpowers/sdd/2026-10-28-phase2-live-max/task9-evidence/candidate-d507866-files.sha256'
for line in manifest.read_text().splitlines():
    digest, name = line.split(maxsplit=1)
    content = subprocess.check_output(['git', 'show', 'd5078669b923f481fc6b84ce3ab34819109199f6:' + name.lstrip('*')], cwd=root)
    assert hashlib.sha256(content).hexdigest() == digest
patch = subprocess.check_output(['git','diff','--binary','f69125cd289365424cd0661975291d8c12a96cac','d5078669b923f481fc6b84ce3ab34819109199f6'], cwd=root)
assert hashlib.sha256(patch).hexdigest() == '30846a45d1a1fe9984bfb52da7c12b2e32ddc3d2280908cb5b7dfd7b5987e833'
identity = r['stream_measurement']['process_identity']
assert sha(Path(identity['executable_path'])) == identity['executable']['sha256'] == '2bfdfb4c260cf32d6ba6749bf0ded2165e2f8b0ca728777db804f49a8c4782b9'
assert sha(Path(identity['libraries'][0]['path'])) == identity['libraries'][0]['sha256'] == '9fd076115b2a914fa2d156dab37b0a1d99676d40634e23f78ba2c50c110062c4'
assert sha(root/'apps/ultra/src-tauri/target/release/ultra') == '9e95b66306b74ad015065bdbe1bfc93acad8b970ef7d091ad2e573320bf773d9'
projection = r['projection_1800']; assert not projection['within_limits'] and not projection['exceeded_limits'] and projection['below_required_headroom'] == ['collector_wall_seconds']
print(json.dumps({'credited_rows':len(credits),'whole_journey_credited_seconds':whole,'target_reported_playing_seconds':r['playing_seconds_conservative'],'cycle_window_credited_seconds':cycle,'cycle_boundary_sums_match':True,'invalid_credit_rows':len(invalid),'crossed_gap_or_action_rows':len(crossed),'maximum_credited_interval':max(x['elapsed_seconds'] for x in credits),'gap_counts':dict(collections.Counter(x.get('reason', x.get('kind')) for x in gaps)),'epochs':[x['epoch_id'] for x in epochs],'epoch_counter_totals':totals,'raw_report_hashes_match':True,'candidate_file_hashes_and_binary_diff_match':True,'pinned_binary_hashes_match':True,'reported_collector_headroom_fraction':projection['headroom_fraction']['collector_wall_seconds'],'reported_within_limits':projection['within_limits']}, indent=2))
