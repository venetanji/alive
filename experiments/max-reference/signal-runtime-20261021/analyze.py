#!/usr/bin/env python3
"""Summarize original retained samples without manufacturing missing behavior."""
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def read_rows(path):
    return [json.loads(line) for line in path.read_text().splitlines()]


def summarize(fixture):
    score = json.loads((ROOT / 'fixtures' / (fixture + '.score.json')).read_text())
    rows = read_rows(ROOT / 'results' / (fixture + '.jsonl'))
    assert rows[-1]['selector'] == 'complete'
    assert rows[-1]['atoms'] == [len(score['events'])]
    assert [row['seq'] for row in rows] == list(range(1, len(rows) + 1))
    stimuli = [row['atoms'] for row in rows if row['selector'] == 'stimulus' and row['label'] == '$input']
    assert stimuli == [[event['id'], event['message'], event['destination'], event['inlet']]
                       for event in score['events']]
    captures = [row['atoms'] for row in rows if row['selector'] == 'captured']
    result = dict(channels=score['channels'], message_rows=len(rows), stimuli=len(stimuli), stages={},
                  observations=[row for row in rows if row['label'] not in ['$input', '$harness']])
    for stage, frames, channels in captures:
        path = ROOT / 'results' / (fixture + '-' + stage + '.samples.jsonl')
        samples = read_rows(path)
        assert frames == score['frames'] == len(samples)
        channel_info = score['channels']
        if fixture == 'precision' and stage.startswith('last_'):
            channel_info = [dict(label='phasor1000'), dict(label='cycle1000')]
        assert channels == len(channel_info)
        assert all(row['frame'] == i and len(row['samples']) == channels for i, row in enumerate(samples))
        summaries = []
        for channel in range(channels):
            values = [row['samples'][channel] for row in samples]
            finite = [v for v in values if isinstance(v, (int, float)) and math.isfinite(v)]
            summaries.append(dict(label=channel_info[channel]['label'], first=values[:16], last=values[-4:],
                                  constant=all(v == values[0] for v in values), minimum=min(finite) if finite else None,
                                  maximum=max(finite) if finite else None,
                                  mean=sum(finite)/len(finite) if finite else None,
                                  nonfinite=[dict(frame=i, value=v) for i, v in enumerate(values) if not isinstance(v, (int, float))]))
        result['stages'][stage] = dict(frames=frames, channels=channels, samples=str(path.relative_to(ROOT)),
                                      sha256=hashlib.sha256(path.read_bytes()).hexdigest(), summaries=summaries)
    return result


def precision_checks(report):
    rows = read_rows(ROOT / 'results/precision.jsonl')
    stages = {stage: read_rows(ROOT / ('results/precision-' + stage + '.samples.jsonl'))
              for stage in report['stages']}
    matches = []
    for stage in ['initial', 'restarted', 'reset']:
        offsets = [0, 1, 63] if stage == 'initial' else [63, 0, 1]
        for name, offset in zip([0, 1, 63], offsets):
            row, = [row for row in rows if row.get('stage') == stage and row['label'] == 'snapshot_offset_' + str(name)]
            observed = row['atoms'][0]
            retained = stages['last_' + stage][offset]['samples'][0]
            error = abs(observed - retained)
            assert row['selector'] == 'float' and error < 3e-8
            matches.append(dict(stage=stage, label=row['label'], actual_offset=offset,
                                observed_float=observed, retained_buffer_float32=retained,
                                absolute_error=error))
    first = stages['initial']
    assert all(row['samples'][:4] == [1, 1, -1, 0] for row in first)
    phasor_last = stages['last_initial'][-1]['samples'][0]
    phasor_restart = stages['restarted'][0]['samples'][4]
    expected_next = (phasor_last + 1000/48000) % 1
    assert abs(phasor_restart - expected_next) < 5e-8
    cycle_restart_error = max(abs(row['samples'][5] - math.cos(2*math.pi*1000*n/48000))
                              for n, row in enumerate(stages['restarted']))
    assert cycle_restart_error < 5e-8
    assert abs(stages['reset'][0]['samples'][4] - .25) < 1e-8
    assert abs(stages['reset'][0]['samples'][5]) < 1e-8
    noise = {stage: [[row['samples'][channel] for row in stages[stage][:16]] for channel in [6, 7]]
             for stage in ['initial', 'reset']}
    counts, = [row for row in rows if row['selector'] == 'automatic_delivery_counts']
    return dict(
        reversed_clip=dict(inputs=[-2, 0, 2], outputs=[1, 1, -1]),
        clip_mode1=dict(input=1.5, output=0),
        snapshot_offset_matches=matches,
        phasor_restart=dict(previous_last=phasor_last, expected_next=expected_next,
                            actual_first=phasor_restart, conclusion='Retains phase across DSP off/on in this fixture.'),
        cycle_restart=dict(previous_last=stages['last_initial'][-1]['samples'][1],
                           actual_first=stages['restarted'][0]['samples'][5],
                           maximum_error_against_phase_zero_cosine=cycle_restart_error,
                           conclusion='Restarts from stored phase offset on DSP start in this fixture.'),
        explicit_reset_first=dict(phasor=stages['reset'][0]['samples'][4], cycle=stages['reset'][0]['samples'][5]),
        noise_first16=noise,
        noise_seed1_reproduces_across_nodes=noise['initial'][0] == noise['initial'][1],
        noise_seed1_reproduces_after_reset=[noise['initial'][i] == noise['reset'][i] for i in [0, 1]],
        noise_seed_conclusion='No deterministic seed contract established; no algorithm or sample equivalence claim.',
        snapshot_automatic_deliveries=json.loads(counts['atoms'][0]),
        snapshot_interval_conclusion='Periodic delivery observed, but no sample timestamps retained; exact interval/vector scheduling unresolved.',
        max_error_rows=[row for row in rows if row['label'] == 'max_error'])


def main():
    report = dict(schema='original-max-signal-summary-v1', evidence='ORIGINAL_MAX_EXECUTED',
                  representation='Frame-indexed values read from Max buffer~ float32 storage; internal DSP precision is not retained.',
                  sample_rate=48000, signal_vector=64, driver='NonRealTime', arithmetic=summarize('arithmetic'))
    if (ROOT / 'results/waves.jsonl').exists():
        report['waves'] = summarize('waves')
        samples = read_rows(ROOT / 'results/waves-initial.samples.jsonl')
        labels = [channel['label'] for channel in report['waves']['channels']]
        checks = {}
        for label, expected in [
            ('cycle1000', lambda n: math.cos(2*math.pi*1000*n/48000)),
            ('cycle1000_phase_quarter', lambda n: math.cos(2*math.pi*(1000*n/48000+.25))),
            ('line_0_to_1_10ms', lambda n: min(1., n/480.)),
        ]:
            channel = labels.index(label)
            checks[label] = max(abs(row['samples'][channel]-expected(n)) for n, row in enumerate(samples))
        report['analytic_max_absolute_error'] = checks
    if (ROOT / 'results/precision.jsonl').exists():
        report['precision'] = summarize('precision')
        report['precision_checks'] = precision_checks(report['precision'])
    (ROOT / 'analysis.json').write_text(json.dumps(report, indent=2) + '\n')
    fixtures = [name for name in ['arithmetic', 'waves', 'precision'] if name in report]
    print(json.dumps(dict(fixtures=fixtures, stages=sum(len(report[name]['stages']) for name in fixtures),
                          message_rows=sum(report[name]['message_rows'] for name in fixtures),
                          stimuli=sum(report[name]['stimuli'] for name in fixtures),
                          retained_frames=sum(stage['frames'] for name in fixtures for stage in report[name]['stages'].values()),
                          analytic_max_absolute_error=report.get('analytic_max_absolute_error'))))


if __name__ == '__main__':
    main()
